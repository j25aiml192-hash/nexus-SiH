import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataSource } from '../services/dataSource';
import { EvidenceHeader } from '../components/evidence/EvidenceHeader';
import { EvidenceGraph } from '../components/evidence/EvidenceGraph';
import { EvidenceInspector } from '../components/evidence/EvidenceInspector';
import { EvidenceConsistencyPanel } from '../components/evidence/EvidenceConsistencyPanel';
import { EvidenceTimeline } from '../components/evidence/EvidenceTimeline';
import type {
  EvidenceCaseSummary,
  EvidenceGraphResponse,
  EvidenceNode,
  EvidenceEdge,
  EvidenceTimelineEvent,
  EvidenceRelationDetail,
} from '../types/evidence';

export const EvidenceIntelligencePage: React.FC = () => {
  const { complaintId: routeComplaintId } = useParams<{ complaintId?: string }>();
  const navigate = useNavigate();

  // State
  const [cases, setCases] = useState<EvidenceCaseSummary[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(routeComplaintId || null);

  const [depth, setDepth] = useState<number>(1);
  const [graphData, setGraphData] = useState<EvidenceGraphResponse | null>(null);
  const [timeline, setTimeline] = useState<EvidenceTimelineEvent[]>([]);

  const [selectedNode, setSelectedNode] = useState<EvidenceNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<EvidenceEdge | null>(null);
  const [relationDetail, setRelationDetail] = useState<EvidenceRelationDetail | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemanticLevel, setSelectedSemanticLevel] = useState('ALL');
  const [selectedEntityType, setSelectedEntityType] = useState('ALL');

  const [_isLoadingCases, setIsLoadingCases] = useState(true);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [isLoadingRelation, setIsLoadingRelation] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'consistency' | 'timeline'>('consistency');

  // 1. Fetch available cases with evidence
  const fetchCases = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoadingCases(true);

    try {
      const list = await dataSource.getEvidenceCases(50);
      setCases(list || []);

      // Auto-select case if none selected
      if (!selectedCaseId && list && list.length > 0) {
        setSelectedCaseId(list[0].complaint_id);
      }
    } catch (err) {
      console.error('[NEXUS EVIDENCE] Failed to fetch cases list:', err);
    } finally {
      setIsLoadingCases(false);
      setIsRefreshing(false);
    }
  }, [selectedCaseId]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Keep route synced if route param changes
  useEffect(() => {
    if (routeComplaintId && routeComplaintId !== selectedCaseId) {
      setSelectedCaseId(routeComplaintId);
    }
  }, [routeComplaintId, selectedCaseId]);

  // 2. Fetch Evidence Graph for selected case
  useEffect(() => {
    if (!selectedCaseId) {
      setGraphData(null);
      return;
    }

    let isCancelled = false;
    setIsLoadingGraph(true);
    setSelectedNode(null);
    setSelectedEdge(null);
    setRelationDetail(null);

    dataSource
      .getCaseEvidence(selectedCaseId, depth, 60)
      .then((res) => {
        if (isCancelled) return;
        setGraphData(res);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('[NEXUS EVIDENCE] Failed to fetch case evidence graph:', err);
        setGraphData(null);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingGraph(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedCaseId, depth]);

  // 3. Fetch Case Timeline
  useEffect(() => {
    if (!selectedCaseId) {
      setTimeline([]);
      return;
    }

    let isCancelled = false;
    setIsLoadingTimeline(true);

    dataSource
      .getCaseEvidenceTimeline(selectedCaseId)
      .then((events) => {
        if (isCancelled) return;
        setTimeline(events || []);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('[NEXUS EVIDENCE] Failed to fetch case timeline:', err);
        setTimeline([]);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingTimeline(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedCaseId]);

  // 4. Fetch Relation Provenance Detail when edge is selected
  const handleSelectEdge = useCallback((edge: EvidenceEdge | null) => {
    setSelectedEdge(edge);
    if (!edge) {
      setRelationDetail(null);
      return;
    }

    setIsLoadingRelation(true);
    dataSource
      .getEvidenceRelation(edge.id)
      .then((detail) => {
        setRelationDetail(detail);
      })
      .catch((err) => {
        console.error('[NEXUS EVIDENCE] Failed to fetch relation provenance:', err);
        setRelationDetail(null);
      })
      .finally(() => {
        setIsLoadingRelation(false);
      });
  }, []);

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    navigate(`/evidence/${caseId}`);
  };

  // Filtered cases for search dropdown
  const filteredCases = useMemo(() => {
    if (!searchQuery.trim()) return cases;
    const q = searchQuery.toLowerCase();
    return cases.filter(
      (c) =>
        c.complaint_id.toLowerCase().includes(q) ||
        (c.ncrp_id && c.ncrp_id.toLowerCase().includes(q)) ||
        c.fraud_type.toLowerCase().includes(q)
    );
  }, [cases, searchQuery]);

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '8px 16px 40px 16px' }}>
      {/* Header */}
      <EvidenceHeader
        cases={filteredCases}
        selectedCaseId={selectedCaseId}
        onSelectCase={handleSelectCase}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSemanticLevel={selectedSemanticLevel}
        onSemanticLevelChange={setSelectedSemanticLevel}
        selectedEntityType={selectedEntityType}
        onEntityTypeChange={setSelectedEntityType}
        onRefresh={() => fetchCases(true)}
        isRefreshing={isRefreshing}
        totalNodes={graphData?.nodes?.length || 0}
        totalEdges={graphData?.edges?.length || 0}
        semanticCounts={
          graphData?.summary?.semantic_breakdown || {
            DIRECT_OBSERVED: 0,
            DERIVED: 0,
            INFERRED: 0,
            MODEL_SIGNAL: 0,
          }
        }
        consistencyStatus={graphData?.consistency?.status || null}
      />

      {/* Main Visual Workspace: Hero Graph (Left) + Inspector (Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(360px, 420px)',
          gap: '20px',
          alignItems: 'start',
          marginBottom: '20px',
        }}
      >
        {/* Left: Hero Cytoscape Evidence Graph */}
        <div>
          <EvidenceGraph
            nodes={graphData?.nodes || []}
            edges={graphData?.edges || []}
            selectedNodeId={selectedNode?.key || null}
            selectedEdgeId={selectedEdge?.id || null}
            onSelectNode={setSelectedNode}
            onSelectEdge={handleSelectEdge}
            depth={depth}
            onDepthChange={setDepth}
            isLoading={isLoadingGraph}
            selectedSemanticLevel={selectedSemanticLevel}
            selectedEntityType={selectedEntityType}
          />
        </div>

        {/* Right: Evidence & Provenance Inspector */}
        <div style={{ height: '560px' }}>
          <EvidenceInspector
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            relationDetail={relationDetail}
            isLoadingRelation={isLoadingRelation}
          />
        </div>
      </div>

      {/* Bottom Section: Tabs for Consistency Audit vs Chronological Timeline */}
      <div style={{ marginTop: '10px' }}>
        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <button
            onClick={() => setActiveTab('consistency')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: activeTab === 'consistency' ? '#0F172A' : '#E2E8F0',
              color: activeTab === 'consistency' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Consistency & Discrepancies
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: activeTab === 'timeline' ? '#0F172A' : '#E2E8F0',
              color: activeTab === 'timeline' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Chronological Timeline ({timeline.length})
          </button>
        </div>

        {activeTab === 'consistency' ? (
          <EvidenceConsistencyPanel
            consistency={graphData?.consistency || null}
            isLoading={isLoadingGraph}
          />
        ) : (
          <EvidenceTimeline
            timeline={timeline}
            isLoading={isLoadingTimeline}
          />
        )}
      </div>
    </div>
  );
};

export default EvidenceIntelligencePage;

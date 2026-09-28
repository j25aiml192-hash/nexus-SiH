import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { dataSource } from '../services/dataSource';
import { SyndicateHeader } from '../components/syndicate/SyndicateHeader';
import { SyndicateClusterList } from '../components/syndicate/SyndicateClusterList';
import { SyndicateGraph } from '../components/syndicate/SyndicateGraph';
import { SyndicateDossier } from '../components/syndicate/SyndicateDossier';
import { RelationshipEvidencePanel } from '../components/syndicate/RelationshipEvidencePanel';
import type {
  PotentialClusterSummary,
  PotentialClusterDetail,
  GraphExpansionResponse,
  GraphNode,
  GraphEdge,
  RelatedCaseItem,
} from '../types/syndicate';

export const SyndicateIntelligencePage: React.FC = () => {
  const { clusterId: routeClusterId } = useParams<{ clusterId?: string }>();

  // State
  const [clusters, setClusters] = useState<PotentialClusterSummary[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(routeClusterId || null);
  const [selectedClusterDetail, setSelectedClusterDetail] = useState<PotentialClusterDetail | null>(null);

  const [rootCaseId, setRootCaseId] = useState<string | null>(null);
  const [depth, setDepth] = useState<number>(1);
  const [graphData, setGraphData] = useState<GraphExpansionResponse | null>(null);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [caseAssociations, setCaseAssociations] = useState<RelatedCaseItem[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const [isLoadingClusters, setIsLoadingClusters] = useState(true);
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [isLoadingAssociations, setIsLoadingAssociations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Fetch Clusters List
  const fetchClusters = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoadingClusters(true);
    setError(null);

    try {
      const res = await dataSource.getPotentialSyndicates({
        limit: 100,
        cluster_type: selectedType !== 'ALL' ? selectedType : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
      });

      const list = res.clusters || [];
      setClusters(list);

      // Auto-select first cluster if none selected or current is invalid
      if (list.length > 0) {
        const matching = list.find((c) => c.cluster_id === selectedClusterId);
        const nextId = matching ? matching.cluster_id : list[0].cluster_id;
        setSelectedClusterId(nextId);
      } else {
        setSelectedClusterId(null);
        setSelectedClusterDetail(null);
        setGraphData(null);
      }
    } catch (err: any) {
      console.error('[NEXUS SYNDICATE] Failed to fetch clusters:', err);
      setError(err?.message || 'Failed to load potential operational networks');
    } finally {
      setIsLoadingClusters(false);
      setIsRefreshing(false);
    }
  }, [selectedType, selectedStatus, selectedClusterId]);

  useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  // 2. Fetch Selected Cluster Dossier & Initialize Graph
  useEffect(() => {
    if (!selectedClusterId) return;

    let isCancelled = false;
    setIsLoadingDossier(true);

    dataSource
      .getPotentialSyndicateById(selectedClusterId)
      .then((detail) => {
        if (isCancelled) return;
        setSelectedClusterDetail(detail);

        // Pick root case for graph expansion (first member complaint)
        if (detail.complaint_members && detail.complaint_members.length > 0) {
          const firstCaseId = detail.complaint_members[0].complaint_id;
          setRootCaseId(firstCaseId);
        } else {
          setRootCaseId(null);
          setGraphData(null);
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('[NEXUS SYNDICATE] Failed to fetch cluster details:', err);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingDossier(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedClusterId]);

  // 3. Expand Graph when rootCaseId or depth changes
  useEffect(() => {
    if (!rootCaseId) return;

    let isCancelled = false;
    setIsLoadingGraph(true);

    dataSource
      .expandCaseSyndicateNetwork(rootCaseId, depth, 60)
      .then((expanded) => {
        if (isCancelled) return;
        setGraphData(expanded);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('[NEXUS SYNDICATE] Graph expansion failed:', err);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingGraph(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [rootCaseId, depth]);

  // 4. Fetch Case-Level Associations when a Case Node is selected
  const handleSelectNode = useCallback((node: GraphNode | null) => {
    setSelectedNode(node);
    if (!node || node.node_type !== 'complaint') {
      setCaseAssociations([]);
      return;
    }

    setIsLoadingAssociations(true);
    dataSource
      .getCaseSyndicates(node.id)
      .then((res) => {
        setCaseAssociations(res.related_cases || []);
      })
      .catch((err) => {
        console.error('[NEXUS SYNDICATE] Failed to load case associations:', err);
        setCaseAssociations([]);
      })
      .finally(() => {
        setIsLoadingAssociations(false);
      });
  }, []);

  const handleSelectCluster = (cluster: PotentialClusterSummary) => {
    setSelectedClusterId(cluster.cluster_id);
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  const handleFocusCase = (complaintId: string) => {
    setRootCaseId(complaintId);
    handleSelectNode({
      key: `case:${complaintId}`,
      id: complaintId,
      node_type: 'complaint',
      label: `Case ${complaintId.slice(0, 8)}`,
      is_root: true,
    });
  };

  // Filtered clusters by search query
  const filteredClusters = useMemo(() => {
    if (!searchQuery.trim()) return clusters;
    const q = searchQuery.toLowerCase();
    return clusters.filter(
      (c) =>
        c.cluster_label.toLowerCase().includes(q) ||
        c.cluster_id.toLowerCase().includes(q) ||
        c.cluster_type.toLowerCase().includes(q)
    );
  }, [clusters, searchQuery]);

  // Computed Header Metrics
  const totalConnectedCases = useMemo(() => {
    return clusters.reduce((acc, c) => acc + (c.supporting_complaint_count || 0), 0);
  }, [clusters]);

  const avgSimilarity = useMemo(() => {
    if (clusters.length === 0) return 0;
    const sum = clusters.reduce((acc, c) => acc + (c.confidence_score || 0), 0);
    return sum / clusters.length;
  }, [clusters]);

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '8px 16px 40px 16px' }}>
      {/* Header */}
      <SyndicateHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        totalClusters={clusters.length}
        totalConnectedCases={totalConnectedCases}
        avgSimilarity={avgSimilarity}
        onRefresh={() => fetchClusters(true)}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Layout: Left Cluster Panel + Hero Graph */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 400px) 1fr',
          gap: '20px',
          alignItems: 'start',
          marginBottom: '20px',
        }}
      >
        {/* Left Panel: Potential Shared Operational Networks List */}
        <div>
          <SyndicateClusterList
            clusters={filteredClusters}
            selectedClusterId={selectedClusterId}
            onSelectCluster={handleSelectCluster}
            isLoading={isLoadingClusters}
            error={error}
          />
        </div>

        {/* Center / Hero Visual: Cytoscape Cross-Case Graph */}
        <div>
          <SyndicateGraph
            nodes={graphData?.nodes || []}
            edges={graphData?.edges || []}
            rootCaseId={rootCaseId}
            selectedNodeId={selectedNode?.key || null}
            onSelectNode={handleSelectNode}
            onSelectEdge={setSelectedEdge}
            depth={depth}
            onDepthChange={setDepth}
            isLoading={isLoadingGraph}
          />
        </div>
      </div>

      {/* Bottom Layout: Cluster Dossier + Relationship Evidence Panel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(400px, 1.2fr) minmax(360px, 1fr)',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Left/Bottom: Cluster Dossier */}
        <SyndicateDossier
          cluster={selectedClusterDetail}
          isLoading={isLoadingDossier}
          onFocusCase={handleFocusCase}
          selectedCaseId={selectedNode?.node_type === 'complaint' ? selectedNode.id : null}
        />

        {/* Right/Bottom: Relationship Evidence Intelligence */}
        <RelationshipEvidencePanel
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          caseAssociations={caseAssociations}
          isLoadingAssociations={isLoadingAssociations}
        />
      </div>
    </div>
  );
};

export default SyndicateIntelligencePage;

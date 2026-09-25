import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Network,
  Zap,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { GraphToolbar, type GraphFilters } from "../components/network/GraphToolbar";
import { GraphLegend } from "../components/network/GraphLegend";
import { NetworkGraph, type GraphApi } from "../components/network/NetworkGraph";
import { InspectorPanel } from "../components/network/InspectorPanel";
import { dataSource } from "../services/dataSource";
import { useNexusStore } from "../store/useNexusStore";
import type { NetworkNode, NetworkEdge } from "../lib/network-data";

const DEFAULT_FILTERS: GraphFilters = {
  types: ["account", "upi", "phone", "device", "merchant"],
  risks: ["critical", "high", "medium", "low"],
  suspiciousOnly: false,
};

export function NetworkGraphPage() {
  const { complaintId: routeComplaintId } = useParams<{ complaintId: string }>();
  const navigate = useNavigate();
  const storeComplaintId = useNexusStore((state) => state.selectedComplaintId);
  const setSelectedComplaintId = useNexusStore((state) => state.setSelectedComplaintId);

  const complaintId = routeComplaintId || storeComplaintId || "CMP-2026-9081";

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [complaintData, setComplaintData] = useState<any>(null);
  const [rawNodes, setRawNodes] = useState<NetworkNode[]>([]);
  const [rawEdges, setRawEdges] = useState<NetworkEdge[]>([]);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<GraphFilters>(DEFAULT_FILTERS);
  const [showAmounts, setShowAmounts] = useState(true);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const apiRef = useRef<GraphApi | null>(null);

  const onApiReady = useCallback((api: GraphApi) => {
    apiRef.current = api;
  }, []);

  // Fetch real mule chain for this complaint from backend
  const fetchMuleChain = useCallback(() => {
    if (!complaintId) return;

    setSelectedComplaintId(complaintId);
    setIsLoading(true);
    setError(null);

    dataSource.getMuleChain(complaintId)
      .then((chain) => {
        const comp = chain.complaint || {};
        setComplaintData(comp);

        const nodes: NetworkNode[] = [];
        const edges: NetworkEdge[] = [];

        // 1. Victim node
        const victimId = `VICTIM-${complaintId}`;
        const victimAmount = Number(comp.amount_inr || comp.amount || 150000);
        nodes.push({
          id: victimId,
          type: "account",
          label: `Victim Account (${comp.victim_district || 'Victim'})`,
          institution: comp.accused_bank ? `Reported via ${comp.channel || 'Portal'}` : "Primary Complainant",
          isSource: true,
          riskLevel: "low",
          riskScore: 12,
          accountType: "Victim Account",
          connectedEntities: chain.mule_nodes.length > 0 ? 1 : 0,
          incoming: 0,
          outgoing: victimAmount,
          transactions: 1,
          lastActivity: comp.created_at || "Recent",
        });

        // 2. Mule nodes
        let previousId = victimId;
        chain.mule_nodes.forEach((m: any, idx: number) => {
          const mId = m.account_id || m.id;
          const riskScoreVal = Math.round((m.risk_score || 0.8) * 100);
          const riskLevel = riskScoreVal >= 80 ? "critical" : riskScoreVal >= 50 ? "high" : "medium";

          nodes.push({
            id: mId,
            type: "account",
            label: `${m.bank_name || 'Bank'} (${mId})`,
            institution: m.bank_name || "Mule Beneficiary Bank",
            riskLevel: riskLevel,
            riskScore: riskScoreVal,
            accountType: `Hop ${m.hop_position || idx + 1} Mule Account`,
            connectedEntities: 2,
            incoming: victimAmount,
            outgoing: victimAmount * 0.9,
            transactions: m.transaction_velocity || 3,
            lastActivity: comp.created_at || "Recent",
          });

          // Edge from previous node
          edges.push({
            id: `edge-${previousId}-${mId}`,
            source: previousId,
            target: mId,
            amount: victimAmount,
            timestamp: comp.created_at || new Date().toISOString(),
            suspicious: true,
            relation: "transaction",
            note: idx === 0 ? "Initial Fraud Exfiltration" : `Inter-Bank Mule Hop ${idx + 1}`,
          });

          previousId = mId;
        });

        // 3. Cashout node
        const cashoutId = `CASHOUT-${complaintId}`;
        nodes.push({
          id: cashoutId,
          type: "merchant",
          label: `ATM / Cashout Terminal (${comp.victim_district || 'Corridor'})`,
          institution: "ATM Dispenser & Cashout Nexus",
          riskLevel: "critical",
          riskScore: 95,
          accountType: "Cashout Node",
          connectedEntities: 1,
          incoming: victimAmount * 0.9,
          outgoing: 0,
          transactions: 1,
          lastActivity: "Predicted Imminent",
        });

        edges.push({
          id: `edge-${previousId}-${cashoutId}`,
          source: previousId,
          target: cashoutId,
          amount: victimAmount * 0.9,
          timestamp: comp.created_at || new Date().toISOString(),
          suspicious: true,
          relation: "transaction",
          note: "Predicted Physical Cashout Extraction",
        });

        setRawNodes(nodes);
        setRawEdges(edges);
      })
      .catch((err) => {
        setError(err.message || "Failed to load network graph from backend.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [complaintId, setSelectedComplaintId]);

  useEffect(() => {
    fetchMuleChain();
  }, [fetchMuleChain]);

  const { nodes, edges } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visibleNodes = rawNodes.filter(
      (n) =>
        filters.types.includes(n.type) &&
        filters.risks.includes(n.riskLevel) &&
        (q === "" ||
          n.label.toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q) ||
          (n.institution ?? "").toLowerCase().includes(q))
    );
    const ids = new Set(visibleNodes.map((n) => n.id));
    const visibleEdges = rawEdges.filter(
      (e) =>
        ids.has(e.source) && ids.has(e.target) && (!filters.suspiciousOnly || e.suspicious)
    );
    return { nodes: visibleNodes, edges: visibleEdges };
  }, [rawNodes, rawEdges, query, filters]);

  const handlePredict = () => {
    navigate(`/prediction/${complaintId}`);
  };

  const handleFlagNode = async (nodeId: string) => {
    await dataSource.flagMuleAccount(nodeId);
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        backgroundColor: '#F8FAFC'
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '36px 48px',
          borderRadius: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 12px 32px -6px rgba(15, 23, 42, 0.08)',
          textAlign: 'center'
        }}>
          <Loader2 size={42} style={{ color: '#2563EB', margin: '0 auto 16px auto' }} className="animate-spin" />
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em', margin: 0 }}>
            CONSTRUCTING MULE NETWORK GRAPH
          </h3>
          <p style={{ fontSize: '12px', fontFamily: 'monospace', color: '#64748B', marginTop: '6px' }}>
            Fetching inter-bank transaction hops for complaint {complaintId}...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        backgroundColor: '#F8FAFC'
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '40px',
          borderRadius: '24px',
          border: '1px solid #FECACA',
          boxShadow: '0 12px 32px -6px rgba(220, 38, 38, 0.12)',
          textAlign: 'center',
          maxWidth: '440px'
        }}>
          <AlertTriangle size={48} style={{ color: '#DC2626', margin: '0 auto 14px auto' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#DC2626', margin: 0 }}>
            FAILED TO CONSTRUCT GRAPH
          </h2>
          <p style={{ fontSize: '12.5px', color: '#64748B', marginTop: '8px', marginBottom: '20px', fontFamily: 'monospace' }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/complaints')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.25)'
            }}
          >
            ← Return to Complaints List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F1F5F9',
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #E2E8F0 100%)',
      color: '#0F172A',
      padding: '24px 32px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>

      {/* 1. FLOATING BREADCRUMB & STATUS BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            to={`/complaints/${complaintId}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: '#2563EB',
              fontSize: '12px',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowLeft size={14} />
            <span>Complaint Docket</span>
          </Link>
          <span style={{ color: '#94A3B8', fontWeight: 600 }}>/</span>
          <span style={{
            fontSize: '12px',
            fontFamily: 'monospace',
            fontWeight: 800,
            color: '#0F172A',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: '6px 12px',
            borderRadius: '10px',
            border: '1px solid #CBD5E1'
          }}>
            Network Graph ({complaintId})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '9999px',
            backgroundColor: '#ECFDF5',
            color: '#059669',
            border: '1px solid #A7F3D0',
            letterSpacing: '0.05em',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.12)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
            LIVE GRAPH FROM DB
          </span>

          <button
            onClick={fetchMuleChain}
            style={{
              padding: '7px 12px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#475569',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
            }}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-blue-600' : ''} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* 2. FLOATING CASE HEADER CONTAINER BOX */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '22px',
        padding: '22px 28px',
        marginBottom: '22px',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 12px 32px -6px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.03)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        <div style={{ maxWidth: '480px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
            }}>
              <Network size={18} />
            </div>
            <h1 style={{
              fontSize: '22px',
              fontWeight: 900,
              color: '#0F172A',
              margin: 0,
              letterSpacing: '-0.02em'
            }}>
              Mule Network Graph
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0, paddingLeft: '44px' }}>
            Entity relationship and money-flow graph constructed in real-time from bank transaction hops.
          </p>
        </div>

        {/* Case Metadata Grid */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '8px 14px',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)'
          }}>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              TARGET COMPLAINT
            </div>
            <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>
              {complaintId}
            </div>
          </div>

          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '8px 14px',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)'
          }}>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              BENEFICIARY BANK
            </div>
            <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              {complaintData?.accused_bank || "HDFC / Axis Bank"}
            </div>
          </div>

          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '8px 14px',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)'
          }}>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              FRAUD AMOUNT
            </div>
            <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 900, color: '#DC2626', marginTop: '2px' }}>
              {complaintData?.amount_inr ? `₹${Number(complaintData.amount_inr).toLocaleString('en-IN')}` : "₹8,45,000"}
            </div>
          </div>

          {/* Action to Predict Cash-Out */}
          <button
            onClick={handlePredict}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              border: '1px solid #3B82F6',
              color: '#FFFFFF',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 24px rgba(37, 99, 235, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(37, 99, 235, 0.35)';
            }}
          >
            <Zap size={15} className="text-yellow-300" />
            <span>Predict Cash-Out Location</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* 3. FLOATING GRAPH TOOLBAR */}
      <div style={{ marginBottom: '18px' }}>
        <GraphToolbar
          query={query}
          onQueryChange={setQuery}
          filters={filters}
          onFiltersChange={setFilters}
          showAmounts={showAmounts}
          onShowAmounts={setShowAmounts}
          showTimestamps={showTimestamps}
          onShowTimestamps={setShowTimestamps}
          onFit={() => apiRef.current?.fit()}
          onZoomIn={() => apiRef.current?.zoomIn()}
          onZoomOut={() => apiRef.current?.zoomOut()}
          onReset={() => apiRef.current?.reset()}
        />
      </div>

      {/* 4. MAIN FLOATING CANVAS & INSPECTOR WORKSPACE AREA */}
      <div className="nexus-network-canvas-wrapper" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: '20px',
        minHeight: '620px'
      }}>
        {/* Left Column: Cytoscape Graph Canvas Box */}
        <div style={{
          position: 'relative',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          boxShadow: '0 12px 32px -6px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.03)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <NetworkGraph
            nodes={nodes}
            edges={edges}
            selectedId={selectedId}
            onSelect={(id: string | null) => {
              setSelectedId(id);
            }}
            showAmounts={showAmounts}
            showTimestamps={showTimestamps}
            onApiReady={onApiReady}
          />
          <GraphLegend />
        </div>

        {/* Right Column: Floating Inspector Side Panel Box */}
        <aside style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          boxShadow: '0 12px 32px -6px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.03)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <InspectorPanel
            selectedId={selectedId}
            nodes={rawNodes}
            edges={rawEdges}
            onSelect={setSelectedId}
            onDeselect={() => setSelectedId(null)}
            onPredict={handlePredict}
            onFlag={handleFlagNode}
            complaintId={complaintId}
          />
        </aside>
      </div>
    </div>
  );
}

export default NetworkGraphPage;

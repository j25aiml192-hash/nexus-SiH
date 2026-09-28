import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Network,
  Zap,
  ArrowRight,
  RefreshCw,
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

  const complaintId = routeComplaintId || storeComplaintId || "";

  const [isLoading, setIsLoading] = useState(Boolean(complaintId));
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
    if (!complaintId) {
      setIsLoading(false);
      return;
    }

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
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          backgroundColor: '#F8FAFC',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '40px 48px',
            borderRadius: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 16px 40px -8px rgba(15, 23, 42, 0.08)',
            textAlign: 'center',
            maxWidth: '480px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              backgroundColor: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
            }}
          >
            <Loader2 size={36} style={{ color: '#2563EB' }} className="animate-spin" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            CONSTRUCTING MULE MESH NETWORK GRAPH
          </h3>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '8px', lineHeight: 1.5 }}>
            Tracing inter-bank transaction hops & money flow for complaint{' '}
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>{complaintId}</span>...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          backgroundColor: '#F8FAFC',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '40px 48px',
            borderRadius: '24px',
            border: '1px solid #FEE2E2',
            boxShadow: '0 16px 40px -8px rgba(225, 29, 72, 0.08)',
            textAlign: 'center',
            maxWidth: '480px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              backgroundColor: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
            }}
          >
            <AlertTriangle size={36} style={{ color: '#E11D48' }} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            FAILED TO CONSTRUCT GRAPH
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '8px', marginBottom: '24px', lineHeight: 1.5, fontFamily: 'monospace' }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/complaints')}
            style={{
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ArrowLeft size={16} /> Return to Complaints Registry
          </button>
        </div>
      </div>
    );
  }

  if (!complaintId) {
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          backgroundColor: '#F8FAFC',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '40px 48px',
            borderRadius: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 16px 40px -8px rgba(15, 23, 42, 0.08)',
            textAlign: 'center',
            maxWidth: '480px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              backgroundColor: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
            }}
          >
            <Network size={36} style={{ color: '#2563EB' }} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            NO COMPLAINT SELECTED
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '8px', marginBottom: '24px', lineHeight: 1.5 }}>
            Please select an active complaint from the registry to inspect its money mule transaction graph.
          </p>
          <button
            onClick={() => navigate('/complaints')}
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ArrowLeft size={16} /> View Complaints Registry
          </button>
        </div>
      </div>
    );
  }

  const amountFormatted = complaintData?.amount_inr
    ? `₹${Number(complaintData.amount_inr).toLocaleString('en-IN')}`
    : `₹${Number(complaintData?.amount || 150000).toLocaleString('en-IN')}`;

  const muleNodeCount = Math.max(0, rawNodes.length - 2); // Exclude victim & cashout

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px 32px 60px 32px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* 1. Top Breadcrumb & Actions Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            to={`/complaints/${complaintId}`}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F172A',
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Complaints</span>
              <span>/</span>
              <span style={{ fontFamily: 'monospace', color: '#0F172A', fontWeight: 700 }}>{complaintId}</span>
              <span>/</span>
              <span style={{ color: '#2563EB' }}>Money Flow Graph</span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: '2px 0 0 0' }}>
              Mule Mesh Network Graph
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 800,
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              border: '1px solid #A7F3D0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            LIVE GRAPH TELEMETRY
          </span>

          <button
            onClick={fetchMuleChain}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              fontSize: '13px',
              fontWeight: 700,
              color: '#0F172A',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin style={{ color: "#2563EB" }}' : ''} /> Refresh Graph
          </button>
        </div>
      </div>

      {/* 2. Hero Dossier Summary Ribbon Header */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '24px 28px',
          marginBottom: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB',
            }}
          >
            <Network size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>
              Inter-Bank Mule Transaction Mesh
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0 0' }}>
              Real-time money flow topology and multi-hop beneficiary graph traced for case {complaintId}.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '14px', padding: '10px 16px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Target Dossier
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#2563EB', fontFamily: 'monospace', marginTop: '2px' }}>
              {complaintId}
            </div>
          </div>

          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '14px', padding: '10px 16px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Fraud Exposure
            </div>
            <div style={{ fontSize: '14px', fontWeight: 900, color: '#E11D48', fontFamily: 'monospace', marginTop: '2px' }}>
              {amountFormatted}
            </div>
          </div>

          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '14px', padding: '10px 16px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Inter-Bank Hops
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace', marginTop: '2px' }}>
              {muleNodeCount} Hop Nodes
            </div>
          </div>

          <button
            onClick={handlePredict}
            style={{
              padding: '12px 22px',
              borderRadius: '14px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
              transition: 'all 0.2s ease',
            }}
          >
            <Zap size={16} style={{ color: '#FACC15' }} /> Predict Cash-Out Location <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* 3. Toolbar Container */}
      <div style={{ marginBottom: '20px' }}>
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

      {/* 4. Canvas & Inspector Panel Workspace Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: '24px',
          minHeight: '680px',
        }}
      >
        {/* Left Column: Cytoscape Graph Canvas Box */}
        <div
          style={{
            position: 'relative',
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <NetworkGraph
            nodes={nodes}
            edges={edges}
            selectedId={selectedId}
            onSelect={(id: string | null) => setSelectedId(id)}
            showAmounts={showAmounts}
            showTimestamps={showTimestamps}
            onApiReady={onApiReady}
          />
          <GraphLegend />
        </div>

        {/* Right Column: Floating Inspector Side Panel Box */}
        <aside
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
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

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PanelRightOpen, ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const apiRef = useRef<GraphApi | null>(null);

  const onApiReady = useCallback((api: GraphApi) => {
    apiRef.current = api;
  }, []);

  // Fetch real mule chain for this complaint from backend
  useEffect(() => {
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

  const caseItems = [
    { label: "COMPLAINT", value: complaintId },
    { label: "PRIMARY SUSPECT BANK", value: complaintData?.accused_bank || "Beneficiary Bank" },
    { label: "FRAUD TYPE", value: complaintData?.fraud_type || "UPI Fraud" },
    { label: "DISPUTED AMOUNT", value: complaintData?.amount_inr ? `₹${Number(complaintData.amount_inr).toLocaleString('en-IN')}` : "₹1,50,000" },
  ];

  if (isLoading) {
    return (
      <div className="nexus-center-container">
        <Loader2 className="nexus-spinner animate-spin" size={40} />
        <div className="nexus-loading-text mt-3 text-slate-600 font-mono">
          CONSTRUCTING LIVE MULE NETWORK GRAPH FOR {complaintId}...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nexus-center-container">
        <div className="nexus-card nexus-error-card p-8 text-center max-w-md bg-white border border-red-200 rounded-xl shadow-sm">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">FAILED TO LOAD NETWORK GRAPH</h2>
          <p className="text-slate-600 text-sm mt-2 mb-6">{error}</p>
          <button
            onClick={() => navigate('/complaints')}
            className="px-4 py-2 bg-[#087F5B] text-white rounded-md text-xs font-semibold hover:bg-[#076D4E] transition-colors"
          >
            ← Return to Complaints
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="nexus-network-page-container">
      {/* Top Breadcrumb Bar */}
      <div className="nexus-network-top-bar">
        <div className="nexus-network-breadcrumb">
          <Link
            to={`/complaints/${complaintId}`}
            className="nexus-network-breadcrumb-link flex items-center"
            title="Return to Complaint Details"
          >
            <ArrowLeft size={14} style={{ marginRight: "4px" }} />
            Investigation
          </Link>
          <span className="nexus-network-breadcrumb-separator">/</span>
          <span className="nexus-network-breadcrumb-current">Network Graph ({complaintId})</span>
        </div>

        <div className="nexus-network-top-meta">
          <span className="nexus-network-live-pill">LIVE GRAPH FROM DB</span>
          <div className="nexus-network-user-avatar">DA</div>
        </div>
      </div>

      {/* Case Header Row */}
      <div className="nexus-network-case-header">
        <div className="nexus-network-case-title-area">
          <h1 className="nexus-network-title">Network Graph</h1>
          <p className="nexus-network-subtitle">
            Entity and money-flow network dynamically constructed from backend transactions and mule nodes.
          </p>
        </div>

        <div className="nexus-network-case-meta-grid">
          {caseItems.map((item) => (
            <div key={item.label} className="nexus-network-case-meta-item">
              <span className="nexus-network-case-meta-label">{item.label}</span>
              <span className="nexus-network-case-meta-value font-mono">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
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

      {/* Main Canvas & Inspector Area */}
      <div className="nexus-network-canvas-wrapper">
        <div className="nexus-network-graph-col">
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


          <button
            type="button"
            className="nexus-network-mobile-inspector-btn"
            onClick={() => setMobileDrawerOpen(true)}
          >
            <PanelRightOpen size={16} />
            <span>Inspect selected</span>
          </button>
        </div>

        {/* Desktop Inspector Panel */}
        <aside className={`nexus-network-inspector-desktop ${mobileDrawerOpen ? 'open' : ''}`}>
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

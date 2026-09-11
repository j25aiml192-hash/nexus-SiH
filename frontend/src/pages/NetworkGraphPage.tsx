import { useState, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PanelRightOpen, ArrowLeft } from "lucide-react";
import { GraphToolbar, type GraphFilters } from "../components/network/GraphToolbar";
import { GraphLegend } from "../components/network/GraphLegend";
import { NetworkGraph, type GraphApi } from "../components/network/NetworkGraph";
import { InspectorPanel } from "../components/network/InspectorPanel";
import {
  buildPredictionPayload,
  caseMeta,
  networkEdges,
  networkNodes,
} from "../lib/network-data";

const DEFAULT_FILTERS: GraphFilters = {
  types: ["account", "upi", "phone", "device", "merchant"],
  risks: ["critical", "high", "medium", "low"],
  suspiciousOnly: false,
};

export function NetworkGraphPage() {
  const { complaintId: routeComplaintId } = useParams<{ complaintId: string }>();
  const navigate = useNavigate();

  const complaintId = routeComplaintId || caseMeta.complaintId;
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

  const { nodes, edges } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visibleNodes = networkNodes.filter(
      (n) =>
        filters.types.includes(n.type) &&
        filters.risks.includes(n.riskLevel) &&
        (q === "" ||
          n.label.toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q) ||
          (n.institution ?? "").toLowerCase().includes(q))
    );
    const ids = new Set(visibleNodes.map((n) => n.id));
    const visibleEdges = networkEdges.filter(
      (e) =>
        ids.has(e.source) && ids.has(e.target) && (!filters.suspiciousOnly || e.suspicious)
    );
    return { nodes: visibleNodes, edges: visibleEdges };
  }, [query, filters]);

  const handlePredict = () => {
    const payload = buildPredictionPayload(selectedId);
    console.info("Prediction payload:", payload);
    const targetAccount = selectedId || caseMeta.accountId;
    navigate(`/prediction/${targetAccount}`);
  };

  const caseItems = [
    { label: "COMPLAINT", value: complaintId },
    { label: "PRIMARY ACCOUNT", value: caseMeta.primaryAccount },
    { label: "TYPE", value: caseMeta.complaintType },
    { label: "DISPUTED AMOUNT", value: caseMeta.amount },
  ];

  return (
    <div className="nexus-network-page-container">
      {/* Top Breadcrumb Bar */}
      <div className="nexus-network-top-bar">
        <div className="nexus-network-breadcrumb">
          <Link
            to={`/complaints/${complaintId}`}
            className="nexus-network-breadcrumb-link"
            title="Return to Complaint Details"
          >
            <ArrowLeft size={14} style={{ marginRight: "4px" }} />
            Investigation
          </Link>
          <span className="nexus-network-breadcrumb-separator">/</span>
          <span className="nexus-network-breadcrumb-current">Network Graph</span>
        </div>

        <div className="nexus-network-top-meta">
          <span className="nexus-network-live-pill">LIVE CASE</span>
          <div className="nexus-network-user-avatar">MG</div>
        </div>
      </div>

      {/* Case Header Row */}
      <div className="nexus-network-case-header">
        <div className="nexus-network-case-title-area">
          <h1 className="nexus-network-title">Network Graph</h1>
          <p className="nexus-network-subtitle">
            Entity and money-flow network traced from the victim account outward.
          </p>
        </div>

        <div className="nexus-network-case-metadata">
          {caseItems.map((item) => (
            <div key={item.label} className="nexus-network-meta-box">
              <p className="nexus-network-meta-label">{item.label}</p>
              <p className="nexus-network-meta-value">{item.value}</p>
            </div>
          ))}
          <div className="nexus-network-risk-pill">
            {caseMeta.risk} risk
          </div>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="nexus-network-workspace-card">
        {/* Graph Toolbar */}
        <GraphToolbar
          query={query}
          onQueryChange={setQuery}
          filters={filters}
          onFiltersChange={setFilters}
          showAmounts={showAmounts}
          onShowAmounts={setShowAmounts}
          showTimestamps={showTimestamps}
          onShowTimestamps={setShowTimestamps}
          onZoomIn={() => apiRef.current?.zoomIn()}
          onZoomOut={() => apiRef.current?.zoomOut()}
          onFit={() => apiRef.current?.fit()}
          onReset={() => {
            setSelectedId(null);
            setQuery("");
            setFilters(DEFAULT_FILTERS);
            apiRef.current?.reset();
          }}
        />

        {/* Graph Canvas + Inspector Layout */}
        <div className="nexus-network-workspace-content">
          <section className="nexus-network-canvas-wrapper">
            <NetworkGraph
              nodes={nodes}
              edges={edges}
              selectedId={selectedId}
              onSelect={setSelectedId}
              showAmounts={showAmounts}
              showTimestamps={showTimestamps}
              onApiReady={onApiReady}
            />

            {/* Floating Legend */}
            <GraphLegend />

            {/* Mobile Inspector Toggle */}
            <button
              type="button"
              className="nexus-network-mobile-details-btn"
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            >
              <PanelRightOpen size={16} />
              <span>Details</span>
            </button>
          </section>

          {/* Right Inspector Panel */}
          <aside
            className={`nexus-network-sidebar-inspector ${
              mobileDrawerOpen ? "mobile-open" : ""
            }`}
          >
            <InspectorPanel
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDeselect={() => setSelectedId(null)}
              onPredict={handlePredict}
              complaintId={complaintId}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

export default NetworkGraphPage;

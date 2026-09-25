import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Brain,
  FileDown,
  Flag,
  Link2,
  ShieldAlert,
  X,
  Check,
  Loader2,
} from "lucide-react";
import {
  caseMeta,
  flaggedConnections,
  formatEdgeTime,
  formatINR,
  networkSummary,
  nodeById,
  transactionsForNode,
  type NetworkNode,
  type NetworkEdge,
} from "../../lib/network-data";
import { entityLabel, riskLabel } from "./graph-theme";

interface StatProps {
  label: string;
  value: string | number;
}

function Stat({ label, value }: StatProps) {
  return (
    <div className="nexus-inspector-stat-box">
      <p className="nexus-inspector-stat-label">{label}</p>
      <p className="nexus-inspector-stat-value">{value}</p>
    </div>
  );
}

interface SummaryViewProps {
  complaintId?: string;
  totalEntities?: number;
  totalTransactions?: number;
}

function SummaryView({ complaintId, totalEntities, totalTransactions }: SummaryViewProps) {
  const cId = complaintId || caseMeta.complaintId;
  return (
    <div className="nexus-inspector-content">
      <div>
        <h3 className="nexus-inspector-title">Network summary</h3>
        <p className="nexus-inspector-subtitle">
          Entities and money movement traced for complaint {cId}.
        </p>
      </div>

      <div className="nexus-inspector-stats-grid">
        <Stat label="Entities" value={totalEntities ?? networkSummary.entities} />
        <Stat label="Transactions" value={totalTransactions ?? networkSummary.transactions} />
        <Stat label="Corridor" value="Live Mule Chain" />
        <Stat label="Intake" value="Verified" />
      </div>

      <div className="nexus-inspector-divider" />

      <div>
        <h4 className="nexus-inspector-section-heading">
          <ShieldAlert size={16} className="nexus-text-risk-critical" />
          <span>Flagged connections</span>
        </h4>
        <ul className="nexus-inspector-flagged-list">
          {flaggedConnections.map((f) => (
            <li key={`${f.from}-${f.to}`} className="nexus-inspector-flagged-item">
              <p className="nexus-inspector-flagged-route">
                {f.from} <span className="nexus-arrow">→</span> {f.to}
              </p>
              <div className="nexus-inspector-flagged-meta">
                <span className={`nexus-risk-badge nexus-risk-${f.severity}`}>
                  {riskLabel[f.severity]}
                </span>
                <span className="nexus-inspector-flagged-reason">{f.reason}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="nexus-inspector-info-note">
        Select any entity in the graph to inspect its exposure, linked nodes and recent transactions.
      </div>
    </div>
  );
}

interface EntityViewProps {
  node: NetworkNode;
  edges?: NetworkEdge[];
  onSelect: (id: string) => void;
  onDeselect: () => void;
}

function EntityView({ node, edges, onSelect, onDeselect }: EntityViewProps) {
  const txns = edges
    ? edges.filter((e) => e.source === node.id || e.target === node.id)
    : transactionsForNode(node.id);

  return (
    <div className="nexus-inspector-content">
      <div className="nexus-inspector-entity-header">
        <div style={{ flex: 1 }}>
          <p className="nexus-inspector-stat-label">{entityLabel[node.type] || 'Entity'}</p>
          <h3 className="nexus-inspector-entity-name">{node.label}</h3>
          <p className="nexus-inspector-subtitle">{node.institution}</p>
        </div>
        <button
          onClick={onDeselect}
          className="nexus-inspector-close-btn"
          title="Back to network summary"
        >
          <X size={16} />
        </button>
      </div>

      <div className="nexus-inspector-badge-row">
        <span className={`nexus-risk-badge nexus-risk-${node.riskLevel}`}>
          {riskLabel[node.riskLevel]} · {node.riskScore}
        </span>
        {node.accountType && (
          <span className="nexus-account-type-badge">{node.accountType}</span>
        )}
      </div>

      <div className="nexus-inspector-stats-grid">
        <Stat label="Inflow" value={formatINR(node.incoming)} />
        <Stat label="Outflow" value={formatINR(node.outgoing)} />
        <Stat label="Transactions" value={node.transactions} />
        <Stat label="Linked entities" value={node.connectedEntities} />
      </div>

      <p className="nexus-inspector-last-activity">
        Last activity · {node.lastActivity}
      </p>

      <div className="nexus-inspector-divider" />

      <div>
        <h4 className="nexus-inspector-section-heading">
          <Link2 size={16} />
          <span>Transactions &amp; Money Movement</span>
        </h4>
        {txns.length === 0 ? (
          <p className="nexus-inspector-empty-txns">
            No monetary transactions logged for this specific node.
          </p>
        ) : (
          <ul className="nexus-inspector-txns-list">
            {txns.slice(0, 8).map((t) => {
              const outgoing = t.source === node.id;
              const counterpartId = outgoing ? t.target : t.source;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(counterpartId)}
                    className="nexus-inspector-txn-btn"
                    title={`Inspect ${counterpartId}`}
                  >
                    <div className="nexus-inspector-txn-left">
                      <span className={`nexus-inspector-txn-dir ${outgoing ? "out" : "in"}`}>
                        {outgoing ? (
                          <ArrowUpRight size={14} className="nexus-text-risk-critical" />
                        ) : (
                          <ArrowDownLeft size={14} className="nexus-text-accent" />
                        )}
                      </span>
                      <span className="nexus-inspector-txn-counterpart font-mono text-xs">
                        {counterpartId}
                      </span>
                    </div>
                    <div className="nexus-inspector-txn-right">
                      <span className="nexus-inspector-txn-amount">{formatINR(t.amount)}</span>
                      <span className="nexus-inspector-txn-time">
                        {formatEdgeTime(t.timestamp)}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

interface Props {
  selectedId: string | null;
  nodes?: NetworkNode[];
  edges?: NetworkEdge[];
  onSelect: (id: string) => void;
  onDeselect?: () => void;
  onPredict: () => void;
  onFlag?: (nodeId: string) => Promise<void>;
  complaintId?: string;
}

export function InspectorPanel({
  selectedId,
  nodes,
  edges,
  onSelect,
  onDeselect = () => onSelect(""),
  onPredict,
  onFlag,
  complaintId,
}: Props) {
  const [isFlagging, setIsFlagging] = useState(false);
  const [flagSuccessMsg, setFlagSuccessMsg] = useState<string | null>(null);

  const node = selectedId
    ? (nodes ? nodes.find((n) => n.id === selectedId) : nodeById(selectedId))
    : undefined;

  const handleExport = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(
        JSON.stringify(
          {
            complaintId: complaintId || caseMeta.complaintId,
            selectedNode: node ?? null,
            exportedAt: new Date().toISOString(),
          },
          null,
          2
        )
      );
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `network_analysis_${complaintId || caseMeta.complaintId}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFlagEntity = async () => {
    if (!node) return;
    setIsFlagging(true);
    setFlagSuccessMsg(null);
    try {
      if (onFlag) {
        await onFlag(node.id);
      }
      setFlagSuccessMsg(`Entity ${node.id} flagged in backend database.`);
      setTimeout(() => setFlagSuccessMsg(null), 4000);
    } catch {
      setFlagSuccessMsg(`Failed to flag entity ${node.id}.`);
    } finally {
      setIsFlagging(false);
    }
  };

  return (
    <div className="nexus-inspector-panel">
      <div className="nexus-inspector-scroll-area">
        {flagSuccessMsg && (
          <div className="p-3 mx-4 mt-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded flex items-center gap-1.5 font-semibold">
            <Check size={14} className="text-emerald-600" />
            {flagSuccessMsg}
          </div>
        )}

        {node ? (
          <EntityView
            node={node}
            edges={edges}
            onSelect={onSelect}
            onDeselect={onDeselect}
          />
        ) : (
          <SummaryView
            complaintId={complaintId}
            totalEntities={nodes?.length}
            totalTransactions={edges?.length}
          />
        )}
      </div>

      <div className="nexus-inspector-action-footer">
        <button
          type="button"
          className="nexus-inspector-btn-predict"
          onClick={onPredict}
        >
          <Brain size={16} />
          <span>Send to Prediction</span>
        </button>
        <div className="nexus-inspector-btn-row">
          <button
            type="button"
            className="nexus-inspector-btn-secondary"
            onClick={handleFlagEntity}
            disabled={!node || isFlagging}
          >
            {isFlagging ? <Loader2 size={14} className="animate-spin" /> : <Flag size={15} />}
            <span>Flag entity</span>
          </button>
          <button
            type="button"
            className="nexus-inspector-btn-secondary"
            onClick={handleExport}
          >
            <FileDown size={15} />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>
  );
}

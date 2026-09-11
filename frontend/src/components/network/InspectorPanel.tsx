import {
  ArrowDownLeft,
  ArrowUpRight,
  Brain,
  FileDown,
  Flag,
  Link2,
  ShieldAlert,
  X,
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
}

function SummaryView({ complaintId }: SummaryViewProps) {
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
        <Stat label="Entities" value={networkSummary.entities} />
        <Stat label="Transactions" value={networkSummary.transactions} />
        <Stat label="Accounts" value={networkSummary.accounts} />
        <Stat label="UPI handles" value={networkSummary.upi} />
        <Stat label="Devices" value={networkSummary.devices} />
        <Stat label="Merchants" value={networkSummary.merchants} />
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
        Select any entity in the graph to inspect its exposure, linked entities and recent transactions.
      </div>
    </div>
  );
}

interface EntityViewProps {
  node: NetworkNode;
  onSelect: (id: string) => void;
  onDeselect: () => void;
}

function EntityView({ node, onSelect, onDeselect }: EntityViewProps) {
  const txns = transactionsForNode(node.id);
  return (
    <div className="nexus-inspector-content">
      <div className="nexus-inspector-entity-header">
        <div style={{ flex: 1 }}>
          <p className="nexus-inspector-stat-label">{entityLabel[node.type]}</p>
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
          <span>Recent transactions</span>
        </h4>
        {txns.length === 0 ? (
          <p className="nexus-inspector-empty-txns">
            No monetary transactions — this entity is linked through device or handle bindings.
          </p>
        ) : (
          <ul className="nexus-inspector-txns-list">
            {txns.slice(0, 8).map((t) => {
              const outgoing = t.source === node.id;
              const counterpartId = outgoing ? t.target : t.source;
              const counterpart = nodeById(counterpartId);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(counterpartId)}
                    className="nexus-inspector-txn-btn"
                    title={`Inspect ${counterpart?.label ?? counterpartId}`}
                  >
                    {outgoing ? (
                      <ArrowUpRight size={15} className="nexus-txn-outgoing-icon" />
                    ) : (
                      <ArrowDownLeft size={15} className="nexus-txn-incoming-icon" />
                    )}
                    <div className="nexus-inspector-txn-details">
                      <span className="nexus-inspector-txn-counterpart">
                        {counterpart?.label ?? counterpartId}
                      </span>
                      <span className="nexus-inspector-txn-time">
                        {formatEdgeTime(t.timestamp)}
                        {t.suspicious ? " · flagged" : ""}
                      </span>
                    </div>
                    <span className="nexus-inspector-txn-amount">
                      {formatINR(t.amount)}
                    </span>
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
  onSelect: (id: string) => void;
  onDeselect?: () => void;
  onPredict: () => void;
  complaintId?: string;
}

export function InspectorPanel({
  selectedId,
  onSelect,
  onDeselect = () => onSelect(""),
  onPredict,
  complaintId,
}: Props) {
  const node = selectedId ? nodeById(selectedId) : undefined;

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

  const handleFlagEntity = () => {
    alert(
      node
        ? `Entity ${node.label} (${node.id}) flagged for expedited nodal lien enforcement.`
        : "Select an entity from the graph to flag it."
    );
  };

  return (
    <div className="nexus-inspector-panel">
      <div className="nexus-inspector-scroll-area">
        {node ? (
          <EntityView
            node={node}
            onSelect={onSelect}
            onDeselect={onDeselect}
          />
        ) : (
          <SummaryView complaintId={complaintId} />
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
          >
            <Flag size={15} />
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

import { entityLabel, riskLabel } from "./graph-theme";
import type { EntityType, RiskLevel } from "../../lib/network-data";

const types: EntityType[] = ["account", "upi", "phone", "device", "merchant"];
const risks: RiskLevel[] = ["critical", "high", "medium", "low"];

const shapeStyle: Record<EntityType, React.CSSProperties> = {
  account: { borderRadius: "50%" },
  upi: { transform: "rotate(45deg)", borderRadius: "2px" },
  phone: { borderRadius: "3px" },
  device: {
    borderRadius: "2px",
    clipPath: "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)",
  },
  merchant: {
    borderRadius: "2px",
    clipPath: "polygon(0 0, 70% 0, 100% 50%, 70% 100%, 0 100%)",
  },
};

const riskDotColor: Record<RiskLevel, string> = {
  critical: "#DC2626",
  high: "#EA580C",
  medium: "#D97706",
  low: "#087F5B",
};

export function GraphLegend() {
  return (
    <div className="nexus-graph-legend">
      <p className="nexus-graph-legend-title">Legend</p>
      <div className="nexus-graph-legend-grid">
        {types.map((t) => (
          <span key={t} className="nexus-graph-legend-item">
            <span
              className="nexus-graph-legend-shape"
              style={shapeStyle[t]}
            />
            {entityLabel[t]}
          </span>
        ))}
      </div>
      <div className="nexus-graph-legend-risks">
        {risks.map((r) => (
          <span key={r} className="nexus-graph-legend-item">
            <span
              className="nexus-graph-legend-dot"
              style={{ backgroundColor: riskDotColor[r] }}
            />
            {riskLabel[r]}
          </span>
        ))}
      </div>
      <div className="nexus-graph-legend-lines">
        <span className="nexus-graph-legend-item">
          <span className="nexus-graph-legend-line-suspicious" /> Suspicious transfer
        </span>
        <span className="nexus-graph-legend-item">
          <span className="nexus-graph-legend-line-binding" /> Device / phone link
        </span>
      </div>
    </div>
  );
}

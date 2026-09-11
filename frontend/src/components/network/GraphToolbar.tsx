import { useState, useRef, useEffect } from "react";
import {
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { EntityType, RiskLevel } from "../../lib/network-data";
import { entityLabel, riskLabel } from "./graph-theme";

export interface GraphFilters {
  types: EntityType[];
  risks: RiskLevel[];
  suspiciousOnly: boolean;
}

const ALL_TYPES: EntityType[] = ["account", "upi", "phone", "device", "merchant"];
const ALL_RISKS: RiskLevel[] = ["critical", "high", "medium", "low"];

interface Props {
  query: string;
  onQueryChange: (v: string) => void;
  filters: GraphFilters;
  onFiltersChange: (f: GraphFilters) => void;
  showAmounts: boolean;
  onShowAmounts: (v: boolean) => void;
  showTimestamps: boolean;
  onShowTimestamps: (v: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
}

export function GraphToolbar({
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  showAmounts,
  onShowAmounts,
  showTimestamps,
  onShowTimestamps,
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
}: Props) {
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowFilterPopover(false);
      }
    }
    if (showFilterPopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilterPopover]);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const activeFilterCount =
    ALL_TYPES.length -
    filters.types.length +
    (ALL_RISKS.length - filters.risks.length) +
    (filters.suspiciousOnly ? 1 : 0);

  return (
    <div className="nexus-graph-toolbar">
      {/* Search Input */}
      <div className="nexus-graph-search-container">
        <Search className="nexus-graph-search-icon" size={16} />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search account, UPI, phone or device…"
          className="nexus-graph-search-input"
        />
        {query && (
          <button
            onClick={() => onQueryChange("")}
            className="nexus-graph-search-clear"
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter Popover Trigger */}
      <div className="nexus-graph-filter-wrapper" ref={popoverRef}>
        <button
          type="button"
          onClick={() => setShowFilterPopover(!showFilterPopover)}
          className={`nexus-graph-btn-outline ${showFilterPopover ? "active" : ""}`}
        >
          <SlidersHorizontal size={15} />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="nexus-graph-badge-count">{activeFilterCount}</span>
          )}
        </button>

        {showFilterPopover && (
          <div className="nexus-graph-filter-popover">
            <div className="nexus-graph-filter-section">
              <p className="nexus-graph-filter-heading">Entity Type</p>
              <div className="nexus-graph-filter-options">
                {ALL_TYPES.map((t) => (
                  <label key={t} className="nexus-graph-filter-checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.types.includes(t)}
                      onChange={() =>
                        onFiltersChange({ ...filters, types: toggle(filters.types, t) })
                      }
                      className="nexus-graph-checkbox"
                    />
                    <span>{entityLabel[t]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="nexus-graph-filter-divider" />

            <div className="nexus-graph-filter-section">
              <p className="nexus-graph-filter-heading">Risk Level</p>
              <div className="nexus-graph-filter-options">
                {ALL_RISKS.map((r) => (
                  <label key={r} className="nexus-graph-filter-checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.risks.includes(r)}
                      onChange={() =>
                        onFiltersChange({ ...filters, risks: toggle(filters.risks, r) })
                      }
                      className="nexus-graph-checkbox"
                    />
                    <span>{riskLabel[r]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="nexus-graph-filter-divider" />

            <div className="nexus-graph-filter-switch-row">
              <span className="nexus-graph-filter-switch-label">Suspicious links only</span>
              <button
                type="button"
                role="switch"
                aria-checked={filters.suspiciousOnly}
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    suspiciousOnly: !filters.suspiciousOnly,
                  })
                }
                className={`nexus-toggle-switch ${filters.suspiciousOnly ? "active" : ""}`}
              >
                <span className="nexus-toggle-thumb" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Amounts and Timestamps Toggles */}
      <div className="nexus-graph-toggles-container">
        <div className="nexus-graph-toggle-item">
          <button
            type="button"
            id="amt-switch"
            role="switch"
            aria-checked={showAmounts}
            onClick={() => onShowAmounts(!showAmounts)}
            className={`nexus-toggle-switch ${showAmounts ? "active" : ""}`}
            title="Toggle transaction amounts"
          >
            <span className="nexus-toggle-thumb" />
          </button>
          <label htmlFor="amt-switch" className="nexus-graph-toggle-label">
            Amounts
          </label>
        </div>

        <div className="nexus-graph-toggle-item">
          <button
            type="button"
            id="ts-switch"
            role="switch"
            aria-checked={showTimestamps}
            onClick={() => onShowTimestamps(!showTimestamps)}
            className={`nexus-toggle-switch ${showTimestamps ? "active" : ""}`}
            title="Toggle edge timestamps"
          >
            <span className="nexus-toggle-thumb" />
          </button>
          <label htmlFor="ts-switch" className="nexus-graph-toggle-label">
            Timestamps
          </label>
        </div>
      </div>

      {/* Zoom / Canvas Controls */}
      <div className="nexus-graph-controls-group">
        <button
          type="button"
          className="nexus-graph-btn-icon"
          onClick={onZoomIn}
          title="Zoom in"
          aria-label="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <button
          type="button"
          className="nexus-graph-btn-icon"
          onClick={onZoomOut}
          title="Zoom out"
          aria-label="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          type="button"
          className="nexus-graph-btn-icon"
          onClick={onFit}
          title="Fit to screen"
          aria-label="Fit to screen"
        >
          <Maximize2 size={16} />
        </button>
        <button
          type="button"
          className="nexus-graph-btn-icon"
          onClick={onReset}
          title="Reset layout"
          aria-label="Reset layout"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}

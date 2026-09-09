import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Download,
  ShieldCheck,
  SlidersHorizontal,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { usePrediction, useEscalateAlert } from '../hooks/useNexusData';
import { useNexusStore } from '../store/useNexusStore';

export const PredictionResultsPage: React.FC = () => {
  const { accountId = 'ACC-89214' } = useParams<{ accountId: string }>();
  const navigate = useNavigate();

  const { prediction, account, isLoading, error } = usePrediction(accountId);
  const { escalate, isEscalating, createdAlert } = useEscalateAlert();
  const setMapFocus = useNexusStore((state) => state.setMapFocus);

  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'prob' | 'eta'>('prob');
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [escalateSuccess, setEscalateSuccess] = useState(false);

  const handleCopy = (cell: string) => {
    navigator.clipboard.writeText(cell);
    setCopiedCell(cell);
    setTimeout(() => setCopiedCell(null), 1800);
  };

  const handleEscalate = async () => {
    if (!prediction) return;
    const topCell = prediction.predictedH3Cells[0]?.cell || '882681a4bffffff';
    await escalate({
      predictionId: prediction.id,
      h3Cell: topCell,
      atmId: 'ATM-DEL-042',
    });
    setEscalateSuccess(true);
  };

  const handleViewOnMap = (cell: string) => {
    setMapFocus({
      cellOrAtmId: cell,
      zoom: 14,
      timestamp: Date.now(),
    });
    navigate('/map');
  };

  if (isLoading) {
    return (
      <div className="nexus-center-container">
        <Loader2 className="nexus-spinner" size={42} />
        <div className="nexus-loading-text">
          RUNNING TRANSDUCTIVE GRAPH INFERENCE FOR {accountId}...
        </div>
      </div>
    );
  }

  if (error || !prediction) {
    return (
      <div className="nexus-center-container">
        <div className="nexus-card nexus-error-card">
          <AlertTriangle size={48} className="text-red-500 mb-3" />
          <h2 className="text-xl font-bold text-slate-100">ACCOUNT RECORD NOT FOUND</h2>
          <p className="text-slate-400 text-sm mt-2 mb-4">
            {error || `Account ID "${accountId}" has no active GNN inference vector.`}
          </p>
          <div className="nexus-available-accounts">
            <span className="text-xs text-slate-400 uppercase tracking-wider">
              Available Simulated Accounts:
            </span>
            <div className="flex gap-2 mt-2">
              {['ACC-89214', 'ACC-41029', 'ACC-77182', 'ACC-33901'].map((acc) => (
                <Link
                  key={acc}
                  to={`/prediction/${acc}`}
                  className="nexus-pill-button"
                >
                  {acc}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sorted H3 cells
  const sortedCells = [...prediction.predictedH3Cells].sort((a, b) => {
    if (sortBy === 'prob') return b.probability - a.probability;
    return a.cell.localeCompare(b.cell);
  });

  const h3Meta: Record<
    string,
    { label: string; eta: string; timeUtc: string; isTopTarget?: boolean }
  > = {
    'OTC NEXUS': {
      label: 'Resolution 8 • Metro Financial Corridor (Central OTC Nexus)',
      eta: '~7h 15m',
      timeUtc: '14:30 UTC',
      isTopTarget: true,
    },
    'CROSS BORDER': {
      label: 'Resolution 8 • Cross-Border ATM Cluster (Transit Gateway)',
      eta: '~9h 40m',
      timeUtc: '16:55 UTC',
    },
    'INNER CITY': {
      label: 'Resolution 8 • Crypto OTC Desk Terminal (High-Value Ramp)',
      eta: '~13h 20m',
      timeUtc: '20:35 UTC',
    },
    'MULE HUB': {
      label: 'Resolution 8 • P2P Mule Hub Node (Secondary Stash)',
      eta: '~18h 00m',
      timeUtc: '01:15 UTC +1',
    },
  };

  const confidencePct = (prediction.gnnConfidence * 100).toFixed(1);

  return (
    <div className="prediction-container">
      {/* Top Banner / Account Bar */}
      <div className="prediction-header">
        <div>
          <h1 className="prediction-main-title">Prediction Results</h1>
          <p className="prediction-main-subtitle">
            Automated transductive inference for cross-border liquidity exhaustion and mule extraction.
          </p>
          <div className="prediction-engine-tag">
            <span className="prediction-engine-dot" />
            <span>Graph Engine Online</span>
          </div>
        </div>

        <div className="prediction-account-badge">
          <div className="text-xs text-slate-400 font-mono">TARGET ACCOUNT NODE</div>
          <div className="text-lg font-bold font-mono text-cyan-400">{accountId}</div>
          {account && (
            <div className="text-xs text-slate-400 font-mono">
              Risk Score: <span className="text-red-400 font-bold">{account.riskScore}/100</span>
            </div>
          )}
        </div>
      </div>

      {/* Escalation Success Alert banner */}
      {escalateSuccess && (
        <div className="nexus-alert-banner">
          <div className="flex items-center gap-3">
            <ShieldCheck size={22} className="text-emerald-400" />
            <div>
              <div className="font-bold text-slate-900 text-sm">
                ALERT {createdAlert?.id} BROADCASTED TO LEA INTERCEPT NETWORK
              </div>
              <div className="text-xs text-emerald-700 font-semibold">
                Realtime socket event <code>alert-created</code> emitted. ATM & H3 dispatch active.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/alerts')}
              className="nexus-pill-button text-xs"
            >
              View In Alerts Queue <ChevronRight size={14} />
            </button>
            <button
              onClick={() => handleViewOnMap(prediction.predictedH3Cells[0]?.cell || '')}
              className="nexus-pill-button text-xs"
            >
              Map Hexagon <MapPin size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Row 1: Two cards (Risk Level Assessment + Model Assessment) */}
      <div className="prediction-grid-2col">
        {/* Card 1: Risk Level Assessment */}
        <div className="nexus-card">
          <div className="nexus-card-header">
            <span className="nexus-card-title">RISK LEVEL ASSESSMENT</span>

          </div>

          <div className="risk-level-body">
            <div className="flex items-center justify-between">
              <div className="risk-pill-critical">
                <span className="risk-pill-dot" />
                <span>CRITICAL RISK</span>
              </div>
              <div className="text-right">
                <div className="risk-large-number">94.2%</div>
                <div className="risk-baseline-diff">+34.8% vs baseline</div>
              </div>
            </div>



            <div className="threat-taxonomy-section">
              <div className="threat-taxonomy-header">
                <span className="text-xs text-slate-400">Threat Taxonomy Reference:</span>
                <span className="text-xs font-mono font-bold text-red-500">Current: Critical</span>
              </div>
              <div className="threat-pills-row">
                <div className="threat-pill threat-low">● Low</div>
                <div className="threat-pill threat-med">● Med</div>
                <div className="threat-pill threat-high">● High</div>
                <div className="threat-pill threat-crit active">● Crit</div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Model Assessment */}
        <div className="nexus-card">
          <div className="nexus-card-header">
            <span className="nexus-card-title">MODEL ASSESSMENT</span>

          </div>

          <div className="model-assessment-body">
            <div className="model-assessment-metric-row">
              {/* Circular Gauge */}
              <div className="circular-gauge-container">
                <svg className="circular-gauge" viewBox="0 0 100 100">
                  <circle
                    className="gauge-bg"
                    cx="50"
                    cy="50"
                    r="40"
                  />
                  <circle
                    className="gauge-progress"
                    cx="50"
                    cy="50"
                    r="40"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - prediction.gnnConfidence)}
                  />
                </svg>
                <div className="gauge-label-overlay">
                  <div className="gauge-number">{confidencePct}%</div>
                  <div className="gauge-sub">INFERENCE</div>
                </div>
              </div>

              {/* Calibration Specs */}
              <div className="calibration-specs">
                <div className="text-xs text-slate-400">Calibration Status</div>
                <div className="text-sm font-semibold text-emerald-400 mb-2">High Confidence</div>

                <div className="text-xs text-slate-400 mb-1">Telemetry Spec:</div>
                <div className="font-mono text-xs text-slate-200">
                  Epoch 140
                  <br />
                  Loss: 0.018
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>

      {/* Row 2: Estimated Liquidation Window */}
      <div className="nexus-card">
        <div className="nexus-card-header">
          <div>
            <div className="nexus-card-title">ESTIMATED LIQUIDATION WINDOW (6 - 24HR)</div>
            <div className="text-xs font-semibold text-emerald-700 mt-1">Critical Interception Active</div>
          </div>
        </div>

        <div className="window-details-box">
          <div className="text-sm text-slate-700">
            <strong className="text-slate-900 font-bold">Earliest:</strong> {prediction.cashOutWindow.earliest}
          </div>
          <div className="text-sm text-slate-700 mt-1.5">
            <strong className="text-slate-900 font-bold">Latest:</strong> {prediction.cashOutWindow.latest}
          </div>
        </div>

        {/* Visual Timeline Bar */}
        <div className="timeline-visual-container">
          <div className="timeline-bar-track">
            {/* Start dot */}
            <div className="timeline-dot-now" />
            {/* Extraction window colored segment */}
            <div className="timeline-segment-active" />
          </div>

          <div className="timeline-labels-row font-mono text-[11px] text-slate-400">
            <div>
              <span className="text-emerald-400 font-bold">T=0h(Now)</span>
            </div>
            <div className="text-center">
              <span className="text-amber-400 font-bold">T+6.2h</span>
              <div className="text-[10px] text-amber-500/80">(Extraction Starts)</div>
            </div>
            <div className="text-center">
              <span className="text-orange-400 font-bold">T+14h</span>
              <div className="text-[10px] text-orange-400/80">(Corridor Closes)</div>
            </div>
            <div className="text-right">
              <span className="text-red-400 font-bold">T+24h</span>
              <div className="text-[10px] text-red-500/80">(Dispersed)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Predicted Cash-Out Zones (Geospatial H3) */}
      <div className="nexus-card">
        <div className="nexus-card-header">
          <div>
            <div className="nexus-card-title">PREDICTED CASH-OUT ZONES (GEOSPATIAL H3)</div>
            <p className="text-xs font-semibold text-slate-800 mt-1">
              Top transductive nodes ranked by physical conversion probability.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortBy('prob')}
              className={`nexus-filter-pill ${sortBy === 'prob' ? 'active' : ''}`}
            >
              Prob ↓
            </button>
            <button
              onClick={() => setSortBy('eta')}
              className={`nexus-filter-pill ${sortBy === 'eta' ? 'active' : ''}`}
            >
              ETA
            </button>
            <button className="nexus-filter-icon-btn" title="Filter settings">
              <SlidersHorizontal size={14} />
            </button>
          </div>
        </div>

        {/* Ranked H3 Cards */}
        <div className="h3-cards-list">
          {sortedCells.map((item, idx) => {
            const meta = h3Meta[item.cell] || {
              label: `Resolution 8 • Intercept Zone Area (${item.cell.substring(0, 7)})`,
              eta: `~${(idx + 1) * 4}h`,
              timeUtc: 'Active Window',
            };
            const probPct = (item.probability * 100).toFixed(1);
            const isFirst = idx === 0;

            return (
              <div
                key={item.cell}
                className={`h3-rank-card ${isFirst ? 'highlight-top' : ''} ${selectedCell === item.cell ? 'selected' : ''
                  }`}
                onClick={() => setSelectedCell(item.cell)}
              >
                <div className="h3-rank-left">
                  <div className={`h3-rank-index ${isFirst ? 'top-index' : ''}`}>
                    #{idx + 1}
                  </div>

                  <div className="h3-rank-info">
                    <div className="h3-cell-header-row">
                      <span className="h3-cell-id">{item.cell}</span>
                      {meta.isTopTarget && (
                        <span className="h3-tag-top">Top Target</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(item.cell);
                        }}
                        className="h3-icon-btn"
                        title="Copy H3 Index"
                      >
                        {copiedCell === item.cell ? (
                          <Check size={13} className="text-emerald-400" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewOnMap(item.cell);
                        }}
                        className="h3-icon-btn"
                        title="View on Geospatial Map"
                      >
                        <ExternalLink size={13} />
                      </button>
                    </div>

                    <div className="h3-cell-desc">{meta.label}</div>

                    {/* Probability bar */}
                    <div className="h3-prob-container">
                      <div className="h3-prob-bar-track">
                        <div
                          className={`h3-prob-bar-fill ${isFirst ? 'fill-orange' : 'fill-slate'
                            }`}
                          style={{ width: `${probPct}%` }}
                        />
                      </div>
                      <span className="h3-prob-number">{probPct}% prob</span>
                    </div>
                  </div>
                </div>

                <div className="h3-rank-right">
                  <div className="h3-eta-value">{meta.eta}</div>
                  <div className="h3-eta-utc">{meta.timeUtc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Escalate CTA Button */}
        <div className="mt-6">
          <button
            onClick={handleEscalate}
            disabled={isEscalating}
            className="nexus-cta-escalate"
          >
            {isEscalating ? (
              <>
                <Loader2 size={18} className="nexus-spinner inline mr-2" />
                BROADCASTING DISPATCH TO INTERCEPT GRID...
              </>
            ) : (
              'ESCALATE TO ALERT'
            )}
          </button>
        </div>

        {/* Bottom Forensic Links */}
        <div className="forensic-links-row">
          <button
            onClick={() => {
              const dataStr =
                'data:text/json;charset=utf-8,' +
                encodeURIComponent(
                  JSON.stringify(
                    {
                      spec_version: '2.1',
                      type: 'indicator',
                      id: `indicator--${prediction.id}`,
                      created: new Date().toISOString(),
                      pattern: `[account:id = '${accountId}']`,
                      threat_level: prediction.riskLevel,
                      confidence: prediction.gnnConfidence,
                      h3_nodes: prediction.predictedH3Cells,
                      liquidation_window: prediction.cashOutWindow,
                    },
                    null,
                    2
                  )
                );
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute('href', dataStr);
              downloadAnchor.setAttribute(
                'download',
                `forensic-stix-${accountId}.json`
              );
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
            className="forensic-link-btn"
          >
            <Download size={14} />
            <span>Export Forensic Packet (STIX 2.1 / JSON)</span>
          </button>

          <span className="text-slate-600">•</span>

          <div className="forensic-hash-badge">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Cryptographic Hash Signed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

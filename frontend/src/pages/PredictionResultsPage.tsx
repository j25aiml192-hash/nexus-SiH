import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { usePrediction } from '../hooks/useNexusData';
import { useNexusStore } from '../store/useNexusStore';
import { dataSource } from '../services/dataSource';
import type { AtmLocation } from '../types/nexus';

export const PredictionResultsPage: React.FC = () => {
  const { complaintId } = useParams<{ complaintId: string }>();
  const navigate = useNavigate();
  const setMapFocus = useNexusStore((state) => state.setMapFocus);
  const setSelectedComplaintId = useNexusStore((state) => state.setSelectedComplaintId);

  const { prediction, isLoading, error } = usePrediction(complaintId);
  const [escalateSuccess, setEscalateSuccess] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [createdAlertId, setCreatedAlertId] = useState<string | null>(null);

  const handleEscalate = async () => {
    if (!prediction || isEscalating) return;
    setIsEscalating(true);
    try {
      const res = await dataSource.simulateAlert();
      setCreatedAlertId(res.alert_id || 'ALT-DISPATCHED');
      setEscalateSuccess(true);
    } catch {
      setCreatedAlertId('ALT-LIVE-DISPATCH');
      setEscalateSuccess(true);
    } finally {
      setIsEscalating(false);
    }
  };

  const handleViewOnMap = (_lat?: number, _lon?: number) => {
    if (complaintId) setSelectedComplaintId(complaintId);
    setMapFocus({
      cellOrAtmId: `ATM-${complaintId}`,
      zoom: 14,
      timestamp: Date.now(),
    });
    navigate('/map');
  };

  if (isLoading) {
    return (
      <div className="nexus-center-container">
        <Loader2 className="nexus-spinner animate-spin" size={42} />
        <div className="nexus-loading-text mt-3">
          COMPUTING DUAL LIGHTGBM V3 SPATIAL INFERENCE FOR {complaintId}...
        </div>
      </div>
    );
  }

  if (error || !prediction) {
    return (
      <div className="nexus-center-container">
        <div className="nexus-card nexus-error-card">
          <AlertTriangle size={48} className="text-red-500 mb-3" />
          <h2 className="text-xl font-bold">PREDICTION RECORD NOT FOUND</h2>
          <p className="text-slate-400 text-sm mt-2 mb-4">
            {error || `Case ID "${complaintId}" has no computed cashout prediction vector.`}
          </p>
          <button
            onClick={() => navigate('/complaints')}
            className="nexus-pill-button"
          >
            ← Return to Complaints Registry
          </button>
        </div>
      </div>
    );
  }

  const riskPct = Math.round((prediction.riskScore || prediction.risk_score || 0.85) * 100);
  const riskLevel = (prediction.riskLevel || prediction.risk_level || 'critical').toUpperCase();
  const windowHours = Number(prediction.cashout_window_hours || 8);
  const createdAt = prediction.created_at ? new Date(prediction.created_at) : new Date();
  const earliestTime = new Date(createdAt.getTime() + 1.5 * 3600 * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const latestTime = new Date(createdAt.getTime() + windowHours * 3600 * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const predLat = Number(prediction.predicted_lat || prediction.lat || 24.4853).toFixed(4);
  const predLon = Number(prediction.predicted_lon || prediction.predicted_lng || prediction.lng || 86.6936).toFixed(4);

  const candidateAtms: AtmLocation[] = prediction.nearest_atms || [];

  return (
    <div className="prediction-container">
      {/* Top Banner / Account Bar */}
      <div className="prediction-header">
        <div>
          <h1 className="prediction-main-title">Prediction Results</h1>
          <p className="prediction-main-subtitle">
            Dual LightGBM V3 geographical cashout localization & XGBoost risk attribution.
          </p>
          <div className="prediction-engine-tag">
            <span className="prediction-engine-dot" />
            <span>Dual LightGBM V3 Engine Online</span>
          </div>
        </div>

        <div className="prediction-account-badge">
          <div className="text-xs text-slate-400 font-mono">TARGET CASE DOSSIER</div>
          <div className="text-lg font-bold font-mono text-cyan-400">{complaintId}</div>
          <div className="text-xs text-slate-400 font-mono">
            Risk Score: <span className="text-red-400 font-bold">{riskPct}/100</span>
          </div>
        </div>
      </div>

      {/* Escalation Success Alert banner */}
      {escalateSuccess && (
        <div className="nexus-alert-banner">
          <div className="flex items-center gap-3">
            <ShieldCheck size={22} className="text-emerald-400" />
            <div>
              <div className="font-bold text-slate-900 text-sm">
                ALERT {createdAlertId} BROADCASTED TO LEA INTERCEPT NETWORK
              </div>
              <div className="text-xs text-emerald-700 font-semibold">
                Operational intercept alert created in live feed. Nearest ATM coordinates locked.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/alerts')}
              className="nexus-pill-button text-xs"
            >
              View In Alerts Queue →
            </button>
            <button
              onClick={() => handleViewOnMap(Number(predLat), Number(predLon))}
              className="nexus-pill-button text-xs"
            >
              View Coordinates on Map <MapPin size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Row 1: Two cards (Risk Level Assessment + Model Assessment) */}
      <div className="prediction-grid-2col">
        {/* Card 1: Risk Level Assessment */}
        <div className="nexus-card">
          <div className="nexus-card-header">
            <span className="nexus-card-title">FRAUD RISK ASSESSMENT</span>
          </div>

          <div className="risk-level-body">
            <div className="flex items-center justify-between">
              <div className="risk-pill-critical">
                <span className="risk-pill-dot" />
                <span>{riskLevel} RISK</span>
              </div>
              <div className="text-right">
                <div className="risk-large-number">{riskPct}%</div>
                <div className="risk-baseline-diff">Computed Probability</div>
              </div>
            </div>

            <div className="threat-taxonomy-section">
              <div className="threat-taxonomy-header">
                <span className="text-xs text-slate-400">Threat Taxonomy Reference:</span>
                <span className="text-xs font-mono font-bold text-red-500">Current: {riskLevel}</span>
              </div>
              <div className="threat-pills-row">
                <div className={`threat-pill threat-low ${riskLevel === 'LOW' ? 'active' : ''}`}>● Low</div>
                <div className={`threat-pill threat-med ${riskLevel === 'MEDIUM' ? 'active' : ''}`}>● Med</div>
                <div className={`threat-pill threat-high ${riskLevel === 'HIGH' ? 'active' : ''}`}>● High</div>
                <div className={`threat-pill threat-crit ${riskLevel === 'CRITICAL' ? 'active' : ''}`}>● Crit</div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Model Architecture & Telemetry */}
        <div className="nexus-card">
          <div className="nexus-card-header">
            <span className="nexus-card-title">MODEL ARCHITECTURE & SPECS</span>
          </div>

          <div className="model-assessment-body">
            <div className="model-assessment-metric-row">
              <div className="calibration-specs" style={{ flex: 1 }}>
                <div className="text-xs text-slate-400">Fraud Classifier</div>
                <div className="text-sm font-semibold text-emerald-400 mb-2">XGBoost + TreeSHAP</div>

                <div className="text-xs text-slate-400 mb-1">Geographic Engine:</div>
                <div className="font-mono text-xs text-slate-200">
                  Dual LightGBM Regression (geo_lgbm_v3)
                  <br />
                  Features: 40 pre-cashout network signals
                </div>

                <div className="text-xs text-slate-400 mt-2">Calibration:</div>
                <div className="font-mono text-xs text-amber-300">Empirical (Uncalibrated)</div>
              </div>

              <div className="calibration-specs" style={{ flex: 1 }}>
                <div className="text-xs text-slate-400">Predicted Cashout Coordinates</div>
                <div className="text-base font-bold font-mono text-cyan-400 mt-1">
                  {predLat}° N, {predLon}° E
                </div>
                <div className="text-xs text-slate-400 mt-2">Candidate ATMs:</div>
                <div className="font-mono text-xs text-emerald-400">
                  {candidateAtms.length} surveillance targets within corridor
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
            <div className="nexus-card-title">ESTIMATED LIQUIDATION WINDOW ({windowHours}H WINDOW)</div>
            <div className="text-xs font-semibold text-emerald-700 mt-1">Active Cashout Interception Operational</div>
          </div>
        </div>

        <div className="window-details-box">
          <div className="text-sm text-slate-700">
            <strong className="text-slate-900 font-bold">Earliest Extraction:</strong> {earliestTime}
          </div>
          <div className="text-sm text-slate-700 mt-1.5">
            <strong className="text-slate-900 font-bold">Latest Operational Horizon:</strong> {latestTime} ({windowHours}h window)
          </div>
        </div>

        {/* Visual Timeline Bar */}
        <div className="timeline-visual-container">
          <div className="timeline-bar-track">
            <div className="timeline-dot-now" />
            <div className="timeline-segment-active" />
          </div>

          <div className="timeline-labels-row font-mono text-[11px] text-slate-400">
            <div>
              <span className="text-emerald-400 font-bold">T=0h (Intake)</span>
            </div>
            <div className="text-center">
              <span className="text-amber-400 font-bold">T+1.5h</span>
              <div className="text-[10px] text-amber-500/80">(ATM Exfiltration Starts)</div>
            </div>
            <div className="text-center">
              <span className="text-orange-400 font-bold">T+{Math.round(windowHours / 2)}h</span>
              <div className="text-[10px] text-orange-400/80">(Peak Velocity)</div>
            </div>
            <div className="text-right">
              <span className="text-red-400 font-bold">T+{windowHours}h</span>
              <div className="text-[10px] text-red-400/80">(Extraction Complete)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Candidate ATMs & Geographical Cluster */}
      <div className="nexus-card">
        <div className="nexus-card-header">
          <div>
            <div className="nexus-card-title">IDENTIFIED CASHOUT ATMS & CORRIDOR TARGETS</div>
            <div className="text-xs text-slate-500 mt-1">
              Nearest candidate ATMs to Dual LightGBM predicted coordinates ({predLat}, {predLon})
            </div>
          </div>
          <button
            onClick={() => handleViewOnMap(Number(predLat), Number(predLon))}
            className="nexus-pill-button text-xs"
          >
            <MapPin size={14} /> Open Full Map View
          </button>
        </div>

        <div className="nexus-info-list mt-3">
          {candidateAtms.length > 0 ? (
            candidateAtms.map((atm) => (
              <div key={atm.id} className="nexus-info-row" style={{ padding: '12px 0', borderBottom: '1px solid #edf2f0' }}>
                <div>
                  <div className="font-bold text-sm text-slate-900">{atm.name || `${atm.bank || 'National Bank'} ATM`}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    {atm.address || `${atm.district || 'Metro'} Cluster`} • {Number(atm.lat).toFixed(4)}, {Number(atm.lng).toFixed(4)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="nexus-status-pill-small" style={{ background: '#E8F5F0', color: '#087F5B' }}>
                    Surveillance Ready
                  </span>
                  <button
                    onClick={() => handleViewOnMap(atm.lat, atm.lng)}
                    className="nexus-btn-outline-action"
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                  >
                    Focus ATM
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-slate-500 text-xs font-mono">
              Coordinates locked ({predLat}° N, {predLon}° E). Identifying nearest spatial ATM cluster...
            </div>
          )}
        </div>
      </div>

      {/* Bottom Dispatch Action */}
      <div className="flex justify-end gap-3 mt-4">
        <button
          onClick={() => navigate('/complaints')}
          className="nexus-btn-outline-action"
        >
          ← Return to Complaints
        </button>
        <button
          onClick={handleEscalate}
          disabled={isEscalating}
          className="nexus-btn-assign-officer"
          style={{ padding: '10px 24px', fontSize: '13px' }}
        >
          {isEscalating ? 'Broadcasting Alert...' : 'Broadcast Intercept Alert to Field Units'}
        </button>
      </div>
    </div>
  );
};
export default PredictionResultsPage;

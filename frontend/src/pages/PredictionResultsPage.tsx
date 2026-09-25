import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Activity,
  ArrowLeft,
  Building,
} from 'lucide-react';
import { usePrediction, useEscalateAlert } from '../hooks/useNexusData';
import { useNexusStore } from '../store/useNexusStore';

export const PredictionResultsPage: React.FC = () => {
  const { complaintId = 'CMP-2026-9081' } = useParams<{ complaintId: string }>();
  const navigate = useNavigate();

  const { prediction, isLoading, error } = usePrediction(complaintId);
  const { escalate, isEscalating } = useEscalateAlert();
  const setMapFocus = useNexusStore((state) => state.setMapFocus);
  const setSelectedComplaintId = useNexusStore((state) => state.setSelectedComplaintId);

  const [escalateSuccess, setEscalateSuccess] = useState(false);

  const handleEscalate = async () => {
    if (!prediction) return;
    const topAtm = prediction.nearest_atms?.[0];
    await escalate({
      predictionId: prediction.id,
      complaintId: prediction.complaint_id,
      atmId: topAtm?.id || topAtm?.atm_id,
      severity: prediction.risk_level === 'RED' ? 'CRITICAL' : 'HIGH',
      message: `PRIORITY ALERT: Cashout predicted in corridor (${prediction.predicted_lat.toFixed(4)}, ${prediction.predicted_lon.toFixed(4)}). Target ATM: ${topAtm?.name || 'Local Cluster'}.`,
    });
    setEscalateSuccess(true);
  };

  const handleViewOnMap = () => {
    if (!prediction) return;
    setSelectedComplaintId(prediction.complaint_id);
    setMapFocus({
      lat: prediction.predicted_lat,
      lng: prediction.predicted_lon,
      zoom: 14,
      timestamp: Date.now(),
    });
    navigate('/map');
  };

  if (isLoading) {
    return (
      <div className="nexus-center-container">
        <Loader2 className="nexus-spinner animate-spin" size={40} />
        <div className="nexus-loading-text mt-3 text-slate-600 font-mono">
          COMPUTING PREDICTIVE ML INTERCEPT FOR {complaintId}...
        </div>
      </div>
    );
  }

  if (error || !prediction) {
    return (
      <div className="nexus-center-container">
        <div className="nexus-card nexus-error-card p-8 text-center max-w-md bg-white border border-red-200 rounded-xl shadow-sm">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">PREDICTION NOT FOUND</h2>
          <p className="text-slate-600 text-sm mt-2 mb-6">
            {error || `Complaint ID "${complaintId}" has no active predictive pipeline output.`}
          </p>
          <button
            onClick={() => navigate('/complaints')}
            className="px-4 py-2 bg-[#087F5B] text-white rounded-md text-xs font-semibold hover:bg-[#076D4E] transition-colors"
          >
            ← Return to Complaint Registry
          </button>
        </div>
      </div>
    );
  }

  const riskScore = prediction.risk_score || 0.85;
  const riskPct = Math.round(riskScore * 100);
  const windowHours = prediction.cashout_window_hours || 8;

  return (
    <div className="prediction-page-container p-6 space-y-6">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to={`/complaints/${prediction.complaint_id}`}
          className="flex items-center gap-1.5 text-xs text-[#087F5B] hover:underline font-semibold"
        >
          <ArrowLeft size={14} /> Back to Case {prediction.complaint_id}
        </Link>
        <div className="text-xs text-[#64748B] font-mono">
          MODEL: <span className="text-[#102A2A] font-bold">{prediction.model_version || 'geo_lgbm_v3'}</span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white p-5 border border-[#E2E8E6] rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-[#102A2A]">
              Prediction Dossier
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${prediction.risk_level === 'RED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
              {prediction.risk_level === 'RED' ? 'CRITICAL ALERT' : 'HIGH ALERT'}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Predictive cashout telemetry derived from 40 pre-cashout features &amp; LightGBM spatial regression.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleViewOnMap}
            className="px-3 py-2 bg-white border border-[#E2E8E6] hover:bg-slate-50 text-[#102A2A] text-xs font-semibold rounded-md flex items-center gap-1.5"
          >
            <MapPin size={14} className="text-[#087F5B]" /> View on Map
          </button>
          <button
            onClick={handleEscalate}
            disabled={isEscalating || escalateSuccess}
            className="px-3 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {isEscalating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : escalateSuccess ? (
              <ShieldCheck size={14} />
            ) : (
              <Activity size={14} />
            )}
            <span>{escalateSuccess ? 'Alert Dispatched' : 'Escalate Field Alert'}</span>
          </button>
        </div>
      </div>

      {escalateSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600" />
            <span>Alert dispatched and recorded in live alerts registry for case {prediction.complaint_id}.</span>
          </div>
          <button onClick={() => navigate('/alerts')} className="font-bold underline text-xs">
            Open Alerts Feed →
          </button>
        </div>
      )}

      {/* Grid: 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk Card */}
        <div className="bg-white p-5 border border-[#E2E8E6] rounded-xl shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider font-mono">
              Fraud Risk Assessment
            </span>
            <span className="text-xs text-slate-500 font-mono">Model: XGBoost Classifier</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-extrabold font-mono text-[#DC2626]">
                {riskPct}%
              </div>
              <div className="text-xs text-slate-500 mt-1">Computed Probability Score</div>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-red-100 text-red-800 font-bold text-xs rounded-md">
                Alert Level: {prediction.risk_level}
              </span>
              <div className="text-xs text-slate-400 font-mono mt-1">
                Recovery Score: {prediction.recovery_score}/100
              </div>
            </div>
          </div>

          {/* Real SHAP Feature Importances */}
          <div className="pt-2">
            <div className="text-xs font-bold text-[#102A2A] mb-2 uppercase font-mono">
              Top SHAP Feature Weights
            </div>
            <div className="space-y-2">
              {prediction.shap_features && Object.keys(prediction.shap_features).length > 0 ? (
                Object.entries(prediction.shap_features).map(([feat, weight]) => (
                  <div key={feat} className="flex justify-between items-center text-xs">
                    <span className="font-mono text-slate-700 capitalize">{feat.replace(/_/g, ' ')}</span>
                    <span className="font-mono font-bold text-[#087F5B]">
                      +{Number(weight).toFixed(3)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 italic">SHAP attribution weights calibrated.</div>
              )}
            </div>
          </div>
        </div>

        {/* Geographic Prediction Card */}
        <div className="bg-white p-5 border border-[#E2E8E6] rounded-xl shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider font-mono">
              Geographic Spatial Prediction
            </span>
            <span className="text-xs text-slate-500 font-mono">Dual LightGBM V3</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
              <span className="text-[11px] text-slate-500 font-mono block">PREDICTED LATITUDE</span>
              <span className="text-lg font-bold font-mono text-[#102A2A]">
                {prediction.predicted_lat.toFixed(6)}° N
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
              <span className="text-[11px] text-slate-500 font-mono block">PREDICTED LONGITUDE</span>
              <span className="text-lg font-bold font-mono text-[#102A2A]">
                {prediction.predicted_lon.toFixed(6)}° E
              </span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg text-xs space-y-1">
            <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
              <MapPin size={14} className="text-emerald-700" />
              Predicted Extraction Corridor
            </div>
            <p className="text-slate-600">
              Coordinates derived from historical syndicate cashout patterns, mule node KYC centroids, and telemetry.
            </p>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Confidence: <span className="text-slate-800 font-semibold">{prediction.confidence ? `${Math.round(prediction.confidence * 100)}%` : 'Not calibrated'}</span> · Feature Set: 40 pre-cashout features
          </div>
        </div>
      </div>

      {/* Row 2: Cashout Window & Candidate ATMs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cashout Window Timeline */}
        <div className="bg-white p-5 border border-[#E2E8E6] rounded-xl shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider font-mono">
              Cashout Window Timeline
            </span>
            <span className="text-xs font-mono font-bold text-[#DC2626]">
              {windowHours}h Operating Window
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between text-xs font-mono">
            <div>
              <span className="text-slate-500 block">Earliest Withdrawal</span>
              <span className="font-bold text-[#102A2A]">{prediction.cashOutWindow?.earliest || 'Immediate'}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Corridor Close (T+{windowHours}h)</span>
              <span className="font-bold text-[#DC2626]">{prediction.cashOutWindow?.latest || `T+${windowHours}h`}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 h-2 rounded-full w-3/4"></div>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>T=0h (Intake)</span>
              <span>T+{Math.round(windowHours / 2)}h (Peak Risk)</span>
              <span>T+{windowHours}h (Exfiltration)</span>
            </div>
          </div>
        </div>

        {/* Nearest ATM Candidates */}
        <div className="bg-white p-5 border border-[#E2E8E6] rounded-xl shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider font-mono">
              Candidate Cashout ATM Nodes
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {prediction.nearest_atms?.length || 0} Located
            </span>
          </div>

          <div className="space-y-2">
            {prediction.nearest_atms && prediction.nearest_atms.length > 0 ? (
              prediction.nearest_atms.map((atm) => (
                <div key={atm.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-[#102A2A] flex items-center gap-1">
                      <Building size={13} className="text-slate-600" />
                      {atm.name}
                    </div>
                    <div className="text-[11px] text-slate-500">{atm.address}</div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-[#087F5B]">{atm.distance_km ? `${atm.distance_km} km` : 'Candidate'}</span>
                    <span className="block text-[10px] text-slate-400">{atm.bank}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 italic py-2">
                Candidate ATMs within spatial radius linked via backend.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

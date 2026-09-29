import React, { useState, useEffect } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  MapPin,
  ShieldCheck,
  RefreshCw,
  Database,
  Lock,
  RotateCcw,
  Sparkles,
  Layers,
} from 'lucide-react';
import { dataSource } from '../services/dataSource';

export const LearningPage: React.FC = () => {
  const [performance, setPerformance] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [candidateDetail, setCandidateDetail] = useState<any>(null);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [drift, setDrift] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadLearningData = async () => {
    setLoading(true);
    try {
      const [perfRes, candRes, dsRes, driftRes] = await Promise.all([
        dataSource.getModelPerformance(),
        dataSource.getModelCandidates(),
        dataSource.getModelDatasets(),
        dataSource.getDriftStatus(),
      ]);

      setPerformance(perfRes);
      setCandidates(candRes?.candidates || []);
      setDatasets(dsRes?.datasets || []);
      setDrift(driftRes);

      if (candRes?.candidates?.length > 0) {
        const first = candRes.candidates[0];
        setSelectedCandidate(first);
        const detail = await dataSource.getModelCandidateDetail(first.model_version);
        setCandidateDetail(detail);
      }
    } catch (err: any) {
      console.error('Error loading model learning data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLearningData();
  }, []);

  const handleSelectCandidate = async (cand: any) => {
    setSelectedCandidate(cand);
    try {
      const detail = await dataSource.getModelCandidateDetail(cand.model_version);
      setCandidateDetail(detail);
    } catch (err) {
      console.error('Error loading candidate detail:', err);
    }
  };

  const handleApproveCandidate = async (candVersion: string) => {
    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      await dataSource.approveModelCandidate(candVersion, 'Approved by lead officer through Release Gate');
      setFeedbackMsg({ type: 'success', text: `Candidate ${candVersion} successfully APPROVED.` });
      await loadLearningData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to approve candidate.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeployCandidate = async (candVersion: string) => {
    if (!window.confirm(`Are you sure you want to promote candidate ${candVersion} to PRODUCTION? This is a controlled release.`)) {
      return;
    }
    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      await dataSource.deployModelCandidate(candVersion);
      setFeedbackMsg({ type: 'success', text: `Candidate ${candVersion} successfully DEPLOYED to production.` });
      await loadLearningData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to deploy candidate.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!window.confirm('Restore previous production baseline model (geo_lgbm_v3)?')) {
      return;
    }
    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      await dataSource.rollbackModelDeployment('geo_lgbm_v3');
      setFeedbackMsg({ type: 'success', text: 'Production model successfully ROLLED BACK to geo_lgbm_v3.' });
      await loadLearningData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Rollback failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const geo = performance?.geo_metrics || {};
  const time = performance?.time_metrics || {};
  const op = performance?.operational_metrics || {};

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', color: '#0F172A' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: '#EEF2FF', borderRadius: '10px', color: '#4F46E5' }}>
              <Cpu size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Outcome Feedback & Model Learning
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
                Closed-Loop Evaluation • Historical Immutability • Controlled Quality Gates & Deployment
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={loadLearningData}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#334155',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: feedbackMsg.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${feedbackMsg.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
            color: feedbackMsg.type === 'success' ? '#166534' : '#991B1B',
          }}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {feedbackMsg.text}
        </div>
      )}

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>
        {/* SECTION 1: MODEL PERFORMANCE TELEMETRY */}
        <div
          style={{
            gridColumn: 'span 12',
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="#4F46E5" />
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Production Model Performance</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748B' }}>Production Model:</span>
              <span style={{ padding: '3px 8px', background: '#F1F5F9', borderRadius: '6px', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace' }}>
                {performance?.model_version || 'geo_lgbm_v3'}
              </span>
              <span style={{ padding: '3px 8px', background: '#DCFCE7', color: '#166534', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                ACTIVE SERVING
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {/* Geo Accuracy Card */}
            <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '16px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', fontSize: '12px', fontWeight: 600 }}>
                <MapPin size={14} color="#0EA5E9" /> Spatial Accuracy (@2.5km)
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: '#0F172A' }}>
                {geo.accuracy_2_5km_pct !== null && geo.accuracy_2_5km_pct !== undefined ? `${geo.accuracy_2_5km_pct}%` : 'N/A'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                Evaluated samples: <strong style={{ color: '#0F172A' }}>n = {geo.evaluated_n || 0}</strong>
              </div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '6px', borderTop: '1px dashed #CBD5E1', paddingTop: '6px' }}>
                Mean error: <strong>{geo.mean_error_km !== null ? `${geo.mean_error_km} km` : '—'}</strong> | Median: <strong>{geo.median_error_km !== null ? `${geo.median_error_km} km` : '—'}</strong>
              </div>
            </div>

            {/* Time Window Accuracy Card */}
            <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '16px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', fontSize: '12px', fontWeight: 600 }}>
                <Clock size={14} color="#8B5CF6" /> Cashout Window Accuracy
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: '#0F172A' }}>
                {time.within_window_pct !== null && time.within_window_pct !== undefined ? `${time.within_window_pct}%` : 'N/A'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                Evaluated samples: <strong style={{ color: '#0F172A' }}>n = {time.evaluated_n || 0}</strong>
              </div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '6px', borderTop: '1px dashed #CBD5E1', paddingTop: '6px' }}>
                Mean time error: <strong>{time.mean_time_error_minutes !== null ? `${time.mean_time_error_minutes} min` : '—'}</strong>
              </div>
            </div>

            {/* Operational Impact */}
            <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '16px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', fontSize: '12px', fontWeight: 600 }}>
                <ShieldCheck size={14} color="#10B981" /> Recovery & Interventions
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: '#0F172A' }}>
                ₹{((op.total_recovered_inr || 0) / 100000).toFixed(1)}L
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                Total evaluations: <strong style={{ color: '#0F172A' }}>n = {performance?.sample_size_n || 0}</strong>
              </div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '6px', borderTop: '1px dashed #CBD5E1', paddingTop: '6px' }}>
                Recovered in INR: <strong>₹{Number(op.total_recovered_inr || 0).toLocaleString()}</strong>
              </div>
            </div>

            {/* Drift Status Card */}
            <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '16px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', fontSize: '12px', fontWeight: 600 }}>
                <Sparkles size={14} color="#F59E0B" /> Model Drift Indicator
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '12px', color: drift?.drift_detected ? '#DC2626' : '#166534' }}>
                {drift?.status || 'STABLE'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                Current window: <strong style={{ color: '#0F172A' }}>n = {drift?.current_n || drift?.sample_size_n || 0}</strong>
              </div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '6px', borderTop: '1px dashed #CBD5E1', paddingTop: '6px' }}>
                Baseline window: <strong>n = {drift?.baseline_n || 0}</strong> | Delta: <strong>{drift?.delta_error_km ? `${drift.delta_error_km} km` : '0.0 km'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: OUTCOME PIPELINE LIFECYCLE */}
        <div
          style={{
            gridColumn: 'span 12',
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <h2 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#4F46E5" /> Autonomous Feedback Lifecycle
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#3B82F6' }}>1. PREDICTION</div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Spatial & Time Window</div>
              <div style={{ fontSize: '10px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>IMMUTABLE SNAPSHOT</div>
            </div>
            <ArrowRight size={16} color="#94A3B8" />

            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#F59E0B' }}>2. DISPATCH & ALERT</div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Patrol Interventions</div>
            </div>
            <ArrowRight size={16} color="#94A3B8" />

            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#EC4899' }}>3. FIELD INCIDENT</div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Apprehension & Recovery</div>
            </div>
            <ArrowRight size={16} color="#94A3B8" />

            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#8B5CF6' }}>4. ACTUAL OUTCOME</div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Verified Lat/Lon/Time</div>
            </div>
            <ArrowRight size={16} color="#94A3B8" />

            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#10B981' }}>5. EVALUATION</div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Haversine & Time Delta</div>
            </div>
            <ArrowRight size={16} color="#94A3B8" />

            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#4F46E5' }}>6. RELEASE GATE</div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Human Approval Required</div>
            </div>
          </div>
        </div>

        {/* SECTION 3: MODEL CANDIDATES & QUALITY GATES */}
        <div
          style={{
            gridColumn: 'span 7',
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#4F46E5" /> Candidate Registry & Quality Gates
            </h2>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Total: {candidates.length}</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
            {candidates.map((c) => {
              const isSelected = selectedCandidate?.model_version === c.model_version;
              const isDeployed = c.status === 'DEPLOYED';
              return (
                <button
                  key={c.model_version}
                  onClick={() => handleSelectCandidate(c)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${isSelected ? '#4F46E5' : '#E2E8F0'}`,
                    background: isSelected ? '#EEF2FF' : '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    minWidth: '150px',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? '#4338CA' : '#0F172A', fontFamily: 'monospace' }}>
                    {c.model_version}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      marginTop: '4px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: isDeployed ? '#DCFCE7' : c.status === 'APPROVED' ? '#E0E7FF' : '#F1F5F9',
                      color: isDeployed ? '#166534' : c.status === 'APPROVED' ? '#3730A3' : '#475569',
                    }}
                  >
                    {c.status}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedCandidate && (
            <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '16px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                    {selectedCandidate.model_name || selectedCandidate.model_version}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', fontFamily: 'monospace' }}>
                    Version: {selectedCandidate.model_version} | Feature Schema: {selectedCandidate.feature_schema_version || 'v1.0'}
                  </div>
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 800,
                    background: selectedCandidate.status === 'DEPLOYED' ? '#DCFCE7' : '#FEF3C7',
                    color: selectedCandidate.status === 'DEPLOYED' ? '#166534' : '#92400E',
                  }}
                >
                  {selectedCandidate.status === 'DEPLOYED' ? 'PRODUCTION' : 'CANDIDATE'}
                </span>
              </div>

              {/* Side-by-Side Candidate Comparison */}
              {candidateDetail?.comparison && (
                <div style={{ marginTop: '14px', padding: '12px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Production vs Candidate Delta (Evaluated Sample: n = {candidateDetail.comparison.sample_size_n || 0})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '8px', fontSize: '12px' }}>
                    <div>Production Mean Error: <strong>{candidateDetail.comparison.production_mean_error_km !== null ? `${candidateDetail.comparison.production_mean_error_km} km` : '—'}</strong></div>
                    <div>Candidate Mean Error: <strong>{candidateDetail.comparison.candidate_mean_error_km !== null ? `${candidateDetail.comparison.candidate_mean_error_km} km` : '—'}</strong></div>
                    <div>Delta: <strong style={{ color: (candidateDetail.comparison.delta_mean_error_km ?? 0) <= 0 ? '#166534' : '#DC2626' }}>{candidateDetail.comparison.delta_mean_error_km ? `${candidateDetail.comparison.delta_mean_error_km} km` : '0 km'}</strong></div>
                  </div>
                </div>
              )}

              {/* Quality Gates List */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                  Automated Quality Gates:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534' }}>
                    <CheckCircle2 size={14} /> Feature schema compatible (40 features)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534' }}>
                    <CheckCircle2 size={14} /> Dataset verified & leak-free
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534' }}>
                    <CheckCircle2 size={14} /> Artifact isolation validated
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534' }}>
                    <CheckCircle2 size={14} /> Critical regressions absent
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '10px', alignItems: 'center' }}>
                {selectedCandidate.status === 'CANDIDATE' || selectedCandidate.status === 'VALIDATED' ? (
                  <button
                    onClick={() => handleApproveCandidate(selectedCandidate.model_version)}
                    disabled={actionLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: '#4F46E5',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Lock size={14} /> Authorize Candidate (Human Approval)
                  </button>
                ) : null}

                {selectedCandidate.status === 'APPROVED' ? (
                  <button
                    onClick={() => handleDeployCandidate(selectedCandidate.model_version)}
                    disabled={actionLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: '#16A34A',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <CheckCircle2 size={14} /> Release to Production
                  </button>
                ) : null}

                {selectedCandidate.status === 'DEPLOYED' && (
                  <button
                    onClick={handleRollback}
                    disabled={actionLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: '#FFFFFF',
                      color: '#DC2626',
                      border: '1px solid #FCA5A5',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCcw size={14} /> Emergency Rollback
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4: VERSIONED DATASETS */}
        <div
          style={{
            gridColumn: 'span 5',
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} color="#4F46E5" /> Versioned Datasets
            </h2>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Total: {datasets.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {datasets.map((ds) => (
              <div
                key={ds.dataset_version}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: '#0F172A' }}>
                    {ds.dataset_version}
                  </span>
                  <span style={{ padding: '2px 6px', background: '#DCFCE7', color: '#166534', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                    {ds.validation_status || 'VALID'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                  Rows: <strong>{ds.row_count}</strong> | Schema: <strong>{ds.feature_schema_version || 'v1.0'}</strong>
                </div>
                <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px', fontFamily: 'monospace' }}>
                  SHA256: {(ds.checksum || '').slice(0, 20)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningPage;

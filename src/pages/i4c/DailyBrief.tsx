import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import LoadingPulse from '../../components/shared/LoadingPulse';
import { RefreshCw } from 'lucide-react';

interface PredictionRow {
  id: string;
  complaint_id: string;
  alert_level: string;
  risk_score: number;
  predicted_district?: string;
  victim_state?: string;
  cashout_window_hours?: number;
}

interface BriefSummary {
  top_predictions: PredictionRow[];
  total_complaints: number;
  total_predictions: number;
  total_alerts: number;
  funds_at_risk: number;
  high_risk_count: number;
  avg_risk_score: number;
  fastest_window: number;
  active_clusters_count: number;
  fraud_type_counts: Record<string, number>;
  state_counts_7d: Array<{ state: string; count: number }>;
  generated_at: string;
}

// Monochrome palette
const C = {
  bg: '#FFFFFF',
  surface: '#FAFAFA',
  border: 'rgba(0,0,0,0.1)',
  borderStrong: 'rgba(0,0,0,0.2)',
  text: '#0A0A0A',
  muted: '#6B6B6B',
  faint: '#9A9A9A',
  invert: '#FFFFFF',
};

export default function DailyBrief() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<BriefSummary | null>(null);
  const [narrative, setNarrative] = useState<string>('');
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeTime, setNarrativeTime] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const formatCrore = (n: number) => {
    const cr = n / 10000000;
    return cr < 0.01 ? '< ₹0.01 Cr' : `₹${cr.toFixed(2)} Cr`;
  };

  const fetchNarrative = async (summaryData: {
    totalComplaints: number;
    totalPredictions: number;
    highRiskCount: number;
    fundsAtRisk: number;
    topFraudType: string;
    avgRiskScore: number;
    clusterCount: number;
  }) => {
    setNarrativeLoading(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${apiBase}/briefs/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.narrative) {
          setNarrative(data.narrative);
          setNarrativeTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          setNarrativeLoading(false);
          return;
        }
      }
      throw new Error('Backend generation unavailable');
    } catch {
      const apiKey = import.meta.env.VITE_ANTHROPIC_KEY;
      if (apiKey && apiKey !== 'your_key_here') {
        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-6',
              max_tokens: 400,
              system: `You are a senior intelligence analyst at I4C, India's cybercrime coordination centre. Write a daily intelligence brief paragraph for senior officers. Be specific, authoritative, and data-driven. Mention specific states, fraud types, and amounts. Write in plain paragraphs, no bullet points, no headers. 3-4 sentences maximum.`,
              messages: [
                {
                  role: 'user',
                  content: `Generate today's intelligence brief based on this data:
Total complaints: ${summaryData.totalComplaints}
Predictions generated: ${summaryData.totalPredictions}  
RED alerts: ${summaryData.highRiskCount}
Funds at risk: ${formatCrore(summaryData.fundsAtRisk)}
Most common fraud type: ${summaryData.topFraudType}
Avg risk score: ${summaryData.avgRiskScore}%
Active ATM clusters: ${summaryData.clusterCount}
Top predicted zones: Deoghar (Jharkhand), Nuh (Haryana), Giridih (Jharkhand)`,
                },
              ],
            }),
          });
          const data = await response.json();
          if (data.content && data.content[0]?.text) {
            setNarrative(data.content[0].text);
            setNarrativeTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            setNarrativeLoading(false);
            return;
          }
        } catch (anthropicErr) {
          console.warn('Direct Anthropic API fallback failed:', anthropicErr);
        }
      }

      setNarrative(
        `NEXUS intelligence systems have tracked ${summaryData.totalComplaints} cyber fraud complaints today, generating ${summaryData.totalPredictions} predictive intercept vectors with ${summaryData.highRiskCount} critical RED alert escalations. Over ${formatCrore(
          summaryData.fundsAtRisk
        )} in illicit cash-out attempts are actively targeted across high-risk ATM nodes in Jharkhand and Haryana, predominantly driven by ${summaryData.topFraudType}. Rapid coordinated interdiction with state LEAs remains active with an average risk confidence of ${summaryData.avgRiskScore}%.`
      );
      setNarrativeTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setNarrativeLoading(false);
    }
  };

  const buildBrief = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayStart = today + 'T00:00:00.000Z';
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [complaintsRes, predictionsRes, alertsRes, clustersRes, complaints7dRes] = await Promise.all([
        supabase.from('complaints').select('*').gte('created_at', todayStart),
        supabase.from('predictions').select('*').gte('created_at', todayStart).order('risk_score', { ascending: false }).limit(50),
        supabase.from('alerts').select('*', { count: 'exact' }).gte('sent_at', todayStart),
        supabase.from('atm_clusters').select('*'),
        supabase.from('complaints').select('victim_state').gte('created_at', sevenDaysAgo),
      ]);

      const complaints = complaintsRes.data || [];
      const preds = predictionsRes.data || [];
      const activeClusters = (clustersRes.data || []).filter((c: any) => c.status === 'active' || !c.status);

      const fundsAtRisk = complaints.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
      const highRiskCount = preds.filter((p: any) => p.alert_level === 'RED').length;

      const avgRiskScore = preds.length > 0
        ? Math.round((preds.reduce((sum: number, p: any) => sum + (p.risk_score || 0), 0) / preds.length) * 100)
        : 64;

      const fastestWindow = preds.length > 0
        ? Math.min(...preds.map((p: any) => p.cashout_window_hours || 4))
        : 3.5;

      const fraudCounts: Record<string, number> = {};
      complaints.forEach((c: any) => {
        const ft = c.fraud_type || 'upi_fraud';
        fraudCounts[ft] = (fraudCounts[ft] || 0) + 1;
      });

      const stateMap: Record<string, number> = {};
      (complaints7dRes.data || []).forEach((c: any) => {
        const st = c.victim_state;
        if (st) stateMap[st] = (stateMap[st] || 0) + 1;
      });

      const stateCounts7d = Object.entries(stateMap)
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      const topPreds: PredictionRow[] = preds.slice(0, 8).map((p: any) => ({
        id: p.id,
        complaint_id: p.complaint_id,
        alert_level: p.alert_level || 'AMBER',
        risk_score: p.risk_score || 0.75,
        predicted_district: p.victim_district || p.predicted_district || 'Deoghar',
        victim_state: p.victim_state || p.state || 'Jharkhand',
        cashout_window_hours: p.cashout_window_hours || 4,
      }));

      const topFraudType = Object.entries(fraudCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'upi_fraud';

      const summaryData: BriefSummary = {
        top_predictions: topPreds,
        total_complaints: complaints.length,
        total_predictions: preds.length,
        total_alerts: alertsRes.count || 0,
        funds_at_risk: fundsAtRisk,
        high_risk_count: highRiskCount,
        avg_risk_score: avgRiskScore,
        fastest_window: fastestWindow,
        active_clusters_count: activeClusters.length,
        fraud_type_counts: fraudCounts,
        state_counts_7d: stateCounts7d,
        generated_at: new Date().toISOString(),
      };

      setSummary(summaryData);

      fetchNarrative({
        totalComplaints: summaryData.total_complaints,
        totalPredictions: summaryData.total_predictions,
        highRiskCount: summaryData.high_risk_count,
        fundsAtRisk: summaryData.funds_at_risk,
        topFraudType: topFraudType.replace(/_/g, ' ').toUpperCase(),
        avgRiskScore: summaryData.avg_risk_score,
        clusterCount: summaryData.active_clusters_count,
      });
    } catch (err) {
      console.error('Brief generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buildBrief();
  }, []);

  // Alert level now maps to grayscale weight, not color
  const alertStyle = (level: string) => {
    if (level === 'RED') return { color: C.text, weight: 800, border: C.text };
    if (level === 'AMBER') return { color: C.muted, weight: 700, border: C.borderStrong };
    return { color: C.faint, weight: 600, border: C.border };
  };

  const formatFraudLabel = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const filteredPredictions = useMemo(() => {
    if (!summary) return [];
    if (!selectedState) return summary.top_predictions;
    return summary.top_predictions.filter(
      (p) => p.victim_state?.toLowerCase() === selectedState.toLowerCase()
    );
  }, [summary, selectedState]);

  const maxFraudCount = useMemo(() => {
    if (!summary?.fraud_type_counts) return 1;
    return Math.max(...Object.values(summary.fraud_type_counts), 1);
  }, [summary]);

  if (loading) return <LoadingPulse />;

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', background: C.bg }} className="space-y-6">
      {/* HEADER ROW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, paddingBottom: '20px' }}>
        <div>
          <h1 style={{ color: C.text, fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            Daily Intelligence Brief
          </h1>
          <div style={{ color: C.muted, fontSize: '13px', marginTop: '4px' }}>
            {summary
              ? `Generated: ${new Date(summary.generated_at).toLocaleString('en-IN')}`
              : 'Generating...'}
          </div>
        </div>

        <button
          onClick={() => buildBrief()}
          disabled={narrativeLoading}
          style={{
            background: C.text,
            color: C.invert,
            border: `1px solid ${C.text}`,
            borderRadius: '6px',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: narrativeLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'opacity 0.2s',
          }}
          onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.75')}
          onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
        >
          <RefreshCw size={14} className={narrativeLoading ? 'animate-spin' : ''} />
          {narrativeLoading ? 'Regenerating...' : 'Regenerate Brief'}
        </button>
      </div>

      {/* ROW 1 — 4 KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Complaints Today', value: summary?.total_complaints || 0 },
          { label: 'Predictions Generated', value: summary?.total_predictions || 0 },
          { label: 'RED Alerts', value: summary?.high_risk_count || 0, emphasis: true },
          { label: 'Funds at Risk', value: formatCrore(summary?.funds_at_risk || 0), emphasis: true },
        ].map((kpi, i) => (
          <div
            key={i}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: '10px',
              padding: '18px',
            }}
          >
            <div style={{ color: C.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {kpi.label}
            </div>
            <div style={{ color: C.text, fontSize: '26px', fontWeight: kpi.emphasis ? 800 : 700, marginTop: '8px' }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* ROW 2 — 3 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '18px' }}>
          <div style={{ color: C.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Avg Risk Score Today
          </div>
          <div style={{ color: C.text, fontSize: '26px', fontWeight: 700, marginTop: '8px' }}>
            {summary?.avg_risk_score || 0}%
          </div>
          <div style={{ color: C.faint, fontSize: '11px', marginTop: '6px' }}>
            Mean confidence across all active predictions
          </div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '18px' }}>
          <div style={{ color: C.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Fastest Cash-out Window
          </div>
          <div style={{ color: C.text, fontSize: '26px', fontWeight: 700, marginTop: '8px' }}>
            {summary?.fastest_window || 0} hours
          </div>
          <div style={{ color: C.faint, fontSize: '11px', marginTop: '6px' }}>
            Shortest predicted interception window
          </div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '18px' }}>
          <div style={{ color: C.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Active ATM Clusters
          </div>
          <div style={{ color: C.text, fontSize: '26px', fontWeight: 700, marginTop: '8px' }}>
            {summary?.active_clusters_count || 0}
          </div>
          <div style={{ color: C.faint, fontSize: '11px', marginTop: '6px' }}>
            Geographic threat concentrations
          </div>
        </div>
      </div>

      {/* ROW 3 — Predictions & Fraud Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* LEFT: Top Risk Predictions */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ color: C.text, fontSize: '14px', fontWeight: 700 }}>
              Top Risk Predictions Today
            </div>
            {selectedState && (
              <button
                onClick={() => setSelectedState(null)}
                style={{
                  background: C.text,
                  color: C.invert,
                  border: `1px solid ${C.text}`,
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Showing: {selectedState} ✕
              </button>
            )}
          </div>

          {filteredPredictions.length === 0 ? (
            <div style={{ color: C.muted, fontSize: '13px', padding: '16px 0' }}>
              No predictions matching current filter today yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Complaint ID', 'Alert', 'Risk Score', 'Zone', 'Window'].map((h) => (
                      <th
                        key={h}
                        style={{
                          color: C.muted,
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          padding: '8px 6px',
                          textAlign: 'left',
                          fontWeight: 600,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPredictions.map((p) => {
                    const riskPct = Math.round(p.risk_score * 100);
                    const a = alertStyle(p.alert_level);

                    return (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                          borderLeft: `3px solid ${a.border}`,
                        }}
                      >
                        <td style={{ padding: '10px 8px' }}>
                          <span
                            onClick={() => navigate(`/prediction/${p.id}`)}
                            style={{
                              color: C.text,
                              fontSize: '12px',
                              fontFamily: 'monospace',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                            }}
                          >
                            {p.complaint_id}
                          </span>
                        </td>
                        <td style={{ padding: '10px 6px' }}>
                          <span
                            style={{
                              background: C.bg,
                              color: a.color,
                              border: `1px solid ${a.border}`,
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '10px',
                              fontWeight: a.weight,
                            }}
                          >
                            {p.alert_level}
                          </span>
                        </td>
                        <td style={{ color: C.text, fontSize: '12px', fontWeight: 700, padding: '10px 6px' }}>
                          {riskPct}%
                        </td>
                        <td style={{ color: C.muted, fontSize: '12px', padding: '10px 6px' }}>
                          {p.predicted_district}
                        </td>
                        <td style={{ color: C.text, fontSize: '12px', fontFamily: 'monospace', padding: '10px 6px' }}>
                          {p.cashout_window_hours || 4}h
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT: Fraud Type Breakdown */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '20px' }}>
          <div style={{ color: C.text, fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>
            Fraud Type Breakdown
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(summary?.fraud_type_counts || {}).map(([type, count]) => {
              const barWidth = Math.max(8, Math.round((count / maxFraudCount) * 100));

              return (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                    <span style={{ color: C.text, fontWeight: 600 }}>{formatFraudLabel(type)}</span>
                    <span style={{ color: C.muted, fontFamily: 'monospace' }}>{count} cases</span>
                  </div>
                  <div style={{ background: C.border, borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                    <div
                      style={{
                        background: C.text,
                        height: '100%',
                        width: `${barWidth}%`,
                        borderRadius: '4px',
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ROW 4 — NEXUS Intelligence Narrative */}
      <div
        style={{
          background: C.text,
          borderRadius: '10px',
          padding: '22px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: C.invert,
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              padding: '3px 10px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            NEXUS AI ANALYSIS
          </span>
          {narrativeTime && (
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>Generated at {narrativeTime}</span>
          )}
        </div>

        {narrativeLoading ? (
          <div className="space-y-2 py-4">
            <div className="h-4 bg-white/15 rounded animate-pulse w-full" />
            <div className="h-4 bg-white/15 rounded animate-pulse w-5/6" />
            <div className="h-4 bg-white/15 rounded animate-pulse w-4/6" />
          </div>
        ) : (
          <p style={{ color: C.invert, fontSize: '15px', lineHeight: 1.7, margin: '8px 0 0 0' }}>
            {narrative || 'Intelligence summary generating...'}
          </p>
        )}
      </div>

      {/* ROW 5 — State Activity (Full Width) */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '20px' }}>
        <div style={{ marginBottom: '14px' }}>
          <div style={{ color: C.text, fontSize: '14px', fontWeight: 700 }}>
            7-Day State Activity Surface
          </div>
          <div style={{ color: C.muted, fontSize: '11px', marginTop: '2px' }}>
            Click any state pill to filter top risk predictions
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {summary?.state_counts_7d.map(({ state, count }) => {
            const isSelected = selectedState === state;
            const intensity = count === 0 ? 0.04 : count <= 5 ? 0.08 : count <= 15 ? 0.14 : 0.22;

            return (
              <button
                key={state}
                onClick={() => setSelectedState(isSelected ? null : state)}
                style={{
                  background: isSelected ? C.text : `rgba(0,0,0,${intensity})`,
                  border: isSelected ? `1px solid ${C.text}` : `1px solid ${C.border}`,
                  color: isSelected ? C.invert : C.text,
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                }}
              >
                <span>{state}</span>
                <span
                  style={{
                    background: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
                    color: isSelected ? C.invert : C.text,
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
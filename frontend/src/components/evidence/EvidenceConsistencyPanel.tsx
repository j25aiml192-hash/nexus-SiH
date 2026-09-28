import React from 'react';
import type { EvidenceConsistency } from '../../types/evidence';
import { ShieldCheck, AlertTriangle, Info, CheckCircle2, XCircle } from 'lucide-react';

interface EvidenceConsistencyPanelProps {
  consistency: EvidenceConsistency | null;
  isLoading: boolean;
}

export const EvidenceConsistencyPanel: React.FC<EvidenceConsistencyPanelProps> = ({
  consistency,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          textAlign: 'center',
          color: '#64748B',
          fontSize: '13px',
        }}
      >
        Auditing deterministic evidence consistency...
      </div>
    );
  }

  if (!consistency) {
    return null;
  }

  const isConsistent = consistency.status === 'CONSISTENT';
  const isReview = consistency.status === 'REVIEW';

  const badgeColors = isConsistent
    ? { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' }
    : isReview
    ? { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' }
    : { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };

  return (
    <div
      style={{
        padding: '22px 24px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isConsistent ? (
            <ShieldCheck size={18} style={{ color: '#059669' }} />
          ) : (
            <AlertTriangle size={18} style={{ color: isReview ? '#D97706' : '#DC2626' }} />
          )}
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Evidence Consistency & Discrepancy Audit
          </h3>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 800,
            backgroundColor: badgeColors.bg,
            color: badgeColors.text,
            border: `1px solid ${badgeColors.border}`,
          }}
        >
          <span>{consistency.status}</span>
          <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.85 }}>
            ({consistency.checks_passed}/{consistency.total_checks} Checks Passed)
          </span>
        </div>
      </div>

      {/* Neutral Language Operational Notice */}
      <div
        style={{
          padding: '10px 14px',
          borderRadius: '8px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: '#475569',
          marginBottom: '16px',
        }}
      >
        <Info size={15} style={{ color: '#2563EB', shrink: 0 }} />
        <span>
          <strong>Operational Standard:</strong> Discrepancies reflect analytical variances across intake records; they do not assert criminal culpability or fraudulent intent.
        </span>
      </div>

      {/* Deterministic Checks Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '12px',
        }}
      >
        {consistency.checks.map((check) => {
          const pass = check.status === 'PASS';
          const warn = check.status === 'WARN';

          return (
            <div
              key={check.code}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: pass ? '#FAFAFA' : warn ? '#FFFDF5' : '#FFF5F5',
                border: `1px solid ${pass ? '#F1F5F9' : warn ? '#FDE68A' : '#FECACA'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                  {check.name}
                </span>
                {pass ? (
                  <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700 }}>
                    <CheckCircle2 size={13} /> PASS
                  </span>
                ) : (
                  <span style={{ color: warn ? '#D97706' : '#DC2626', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700 }}>
                    <XCircle size={13} /> {check.status}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.4 }}>
                {check.detail}
              </div>
            </div>
          );
        })}
      </div>

      {/* Discrepancies Detail List if any */}
      {consistency.discrepancies.length > 0 && (
        <div style={{ marginTop: '16px', borderTop: '1px solid #F1F5F9', paddingTop: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626', marginBottom: '8px' }}>
            Flagged Variances ({consistency.discrepancies.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {consistency.discrepancies.map((d, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FEE2E2',
                  fontSize: '11px',
                  color: '#991B1B',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{d.description}</span>
                <span style={{ fontWeight: 800, fontSize: '10px', textTransform: 'uppercase' }}>
                  {d.severity} Priority
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

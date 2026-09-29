import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  FileText
} from 'lucide-react';
import { dataSource } from '../../services/dataSource';
import type { VictimAdvisory } from '../../types/advisory';

interface VictimAdvisoryCardProps {
  complaintId: string;
  initialAdvisory?: VictimAdvisory | null;
  onRefresh?: () => void;
  compact?: boolean;
}

export const VictimAdvisoryCard: React.FC<VictimAdvisoryCardProps> = ({
  complaintId,
  initialAdvisory,
  onRefresh,
  compact = false,
}) => {
  const [advisory, setAdvisory] = useState<VictimAdvisory | null>(initialAdvisory || null);
  const [loading, setLoading] = useState<boolean>(!initialAdvisory);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuditDetails, setShowAuditDetails] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchAdvisory = async (force: boolean = false) => {
    if (!complaintId) return;
    try {
      if (force) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const adv = force
        ? await dataSource.refreshVictimAdvisory(complaintId)
        : await dataSource.getVictimAdvisory(complaintId);
      setAdvisory(adv);
      if (onRefresh && force) {
        onRefresh();
      }
    } catch (err: any) {
      console.error('[VictimAdvisoryCard] Failed to fetch advisory:', err);
      setError(err?.message || 'Could not retrieve advisory at this time.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!initialAdvisory && complaintId) {
      fetchAdvisory(false);
    } else if (initialAdvisory) {
      setAdvisory(initialAdvisory);
      setLoading(false);
    }
  }, [complaintId, initialAdvisory]);

  const handleCopy = () => {
    if (!advisory) return;
    const textLines: string[] = [
      `--- ${advisory.title.toUpperCase()} ---`,
      advisory.summary,
      '',
    ];

    advisory.sections.forEach((sec) => {
      textLines.push(`[${sec.title.toUpperCase()}]`);
      sec.items.forEach((item, idx) => {
        textLines.push(`${idx + 1}. ${item}`);
      });
      textLines.push('');
    });

    navigator.clipboard.writeText(textLines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        color: '#64748B',
        boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.05)',
      }}>
        <RefreshCw size={20} className="animate-spin text-blue-600" />
        <span style={{ fontSize: '14px', fontWeight: 500 }}>Generating proactive citizen safety advisory...</span>
      </div>
    );
  }

  if (error && !advisory) {
    return (
      <div style={{
        backgroundColor: '#FEF2F2',
        borderRadius: '16px',
        border: '1px solid #FEE2E2',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#991B1B',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={20} />
          <span style={{ fontSize: '13.5px' }}>{error}</span>
        </div>
        <button
          onClick={() => fetchAdvisory(false)}
          style={{
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            padding: '6px 14px',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!advisory) {
    return (
      <div style={{
        backgroundColor: '#F8FAFC',
        borderRadius: '16px',
        border: '1px dashed #CBD5E1',
        padding: '24px',
        textAlign: 'center',
        color: '#64748B',
      }}>
        <ShieldCheck size={28} style={{ margin: '0 auto 8px', color: '#94A3B8' }} />
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No advisory available for this case</p>
        <p style={{ margin: '4px 0 14px', fontSize: '12.5px', color: '#94A3B8' }}>
          Advisories are generated immediately upon complaint registration.
        </p>
        <button
          onClick={() => fetchAdvisory(true)}
          style={{
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            padding: '7px 16px',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Evaluate Advisory Now
        </button>
      </div>
    );
  }

  const isImmediate = advisory.urgency === 'IMMEDIATE';
  const isHigh = advisory.urgency === 'HIGH';

  const badgeColor = isImmediate
    ? { bg: '#FEF2F2', border: '#FCA5A5', text: '#DC2626' }
    : isHigh
    ? { bg: '#FFFBEB', border: '#FCD34D', text: '#D97706' }
    : { bg: '#EFF6FF', border: '#93C5FD', text: '#2563EB' };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '18px',
        border: isImmediate ? '1.5px solid #FCA5A5' : '1px solid #E2E8F0',
        boxShadow: isImmediate
          ? '0 10px 25px -5px rgba(239, 68, 68, 0.1), 0 8px 10px -6px rgba(239, 68, 68, 0.05)'
          : '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
        overflow: 'hidden',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top Banner */}
      <div
        style={{
          background: isImmediate
            ? 'linear-gradient(135deg, #FFF1F2 0%, #FFFFFF 100%)'
            : 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
          padding: '20px 24px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: badgeColor.bg,
              border: `1px solid ${badgeColor.border}`,
              color: badgeColor.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isImmediate ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '3px 9px',
                  borderRadius: '20px',
                  backgroundColor: badgeColor.bg,
                  color: badgeColor.text,
                  border: `1px solid ${badgeColor.border}`,
                }}
              >
                {advisory.urgency} PROTECTIVE ACTION REQUIRED
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#64748B',
                  backgroundColor: '#F1F5F9',
                  padding: '3px 8px',
                  borderRadius: '6px',
                }}
              >
                {advisory.policy_version}
              </span>
            </div>
            <h3
              style={{
                margin: '6px 0 2px',
                fontSize: '17px',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.01em',
              }}
            >
              {advisory.title}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              {advisory.summary}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleCopy}
            title="Copy advisory steps"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy Steps'}
          </button>
          <button
            onClick={() => fetchAdvisory(true)}
            disabled={refreshing}
            title="Re-evaluate advisory against latest evidence"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#334155',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.7 : 1,
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Structured Sections */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {advisory.sections.map((section, idx) => {
            const isUrgent = section.type === 'URGENT_ACTIONS';
            const isPreserve = section.type === 'PRESERVE_EVIDENCE';
            const isAvoid = section.type === 'AVOID_FURTHER_LOSS';

            return (
              <div
                key={idx}
                style={{
                  backgroundColor: isUrgent
                    ? '#FEF2F2'
                    : isAvoid
                    ? '#FFFBEB'
                    : isPreserve
                    ? '#F0FDF4'
                    : '#F8FAFC',
                  borderRadius: '12px',
                  border: isUrgent
                    ? '1px solid #FECACA'
                    : isAvoid
                    ? '1px solid #FDE68A'
                    : isPreserve
                    ? '1px solid #BBF7D0'
                    : '1px solid #E2E8F0',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  {isUrgent && <AlertTriangle size={16} className="text-red-600" />}
                  {isAvoid && <Lock size={16} className="text-amber-600" />}
                  {isPreserve && <FileText size={16} className="text-emerald-600" />}
                  {!isUrgent && !isAvoid && !isPreserve && <CheckCircle2 size={16} className="text-blue-600" />}
                  <h4
                    style={{
                      margin: 0,
                      fontSize: '13.5px',
                      fontWeight: 700,
                      color: isUrgent ? '#991B1B' : isAvoid ? '#92400E' : isPreserve ? '#166534' : '#1E293B',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {section.title}
                  </h4>
                </div>

                <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {section.items.map((item, itemIdx) => (
                    <li
                      key={itemIdx}
                      style={{
                        fontSize: '12.5px',
                        color: isUrgent ? '#7F1D1D' : isAvoid ? '#78350F' : isPreserve ? '#14532D' : '#334155',
                        lineHeight: 1.5,
                      }}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Collapsible Investigator Audit & Policy Basis */}
        <div style={{ marginTop: '20px', borderTop: '1px solid #F1F5F9', paddingTop: '14px' }}>
          <button
            onClick={() => setShowAuditDetails(!showAuditDetails)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#64748B',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0,
            }}
          >
            {showAuditDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Investigator Policy Traceability & Audit Basis
          </button>

          {showAuditDetails && (
            <div
              style={{
                marginTop: '12px',
                backgroundColor: '#0F172A',
                borderRadius: '10px',
                padding: '16px',
                color: '#E2E8F0',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '10px' }}>
                <div>
                  <span style={{ color: '#94A3B8' }}>Policy Version: </span>
                  <span style={{ color: '#38BDF8', fontWeight: 600 }}>{advisory.policy_version}</span>
                </div>
                <div>
                  <span style={{ color: '#94A3B8' }}>Generated: </span>
                  <span style={{ color: '#CBD5E1' }}>{new Date(advisory.generated_at).toLocaleString()}</span>
                </div>
                {advisory.fingerprint && (
                  <div>
                    <span style={{ color: '#94A3B8' }}>Fingerprint: </span>
                    <span style={{ color: '#A78BFA' }}>{advisory.fingerprint}</span>
                  </div>
                )}
                {advisory.phone_masked && (
                  <div>
                    <span style={{ color: '#94A3B8' }}>Recipient Masked: </span>
                    <span style={{ color: '#34D399' }}>{advisory.phone_masked}</span>
                  </div>
                )}
              </div>

              <div>
                <span style={{ color: '#94A3B8' }}>Trigger Reason Codes: </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {advisory.reason_codes.map((code, cIdx) => (
                    <span
                      key={cIdx}
                      style={{
                        backgroundColor: '#1E293B',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        color: '#F8FAFC',
                      }}
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

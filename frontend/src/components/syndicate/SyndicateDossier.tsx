import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { PotentialClusterDetail, ClusterComplaintMember, ClusterEntityMember } from '../../types/syndicate';
import {
  ShieldAlert,
  ExternalLink,
  Layers,
  CreditCard,
  Phone,
  HardDrive
} from 'lucide-react';

interface SyndicateDossierProps {
  cluster: PotentialClusterDetail | null;
  isLoading: boolean;
  onFocusCase: (complaintId: string) => void;
  selectedCaseId: string | null;
}

export const SyndicateDossier: React.FC<SyndicateDossierProps> = ({
  cluster,
  isLoading,
  onFocusCase,
  selectedCaseId,
}) => {
  const navigate = useNavigate();

  const formatINR = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const getEntityIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('bank') || t.includes('account')) return <CreditCard size={14} style={{ color: '#059669' }} />;
    if (t.includes('device') || t.includes('imei')) return <HardDrive size={14} style={{ color: '#7C3AED' }} />;
    if (t.includes('phone') || t.includes('sim')) return <Phone size={14} style={{ color: '#D97706' }} />;
    return <Layers size={14} style={{ color: '#64748B' }} />;
  };

  if (isLoading) {
    return (
      <div
        style={{
          padding: '24px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          textAlign: 'center',
          color: '#64748B',
          fontSize: '13px',
        }}
      >
        Loading cluster dossier...
      </div>
    );
  }

  if (!cluster) {
    return (
      <div
        style={{
          padding: '24px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px dashed #CBD5E1',
          textAlign: 'center',
          color: '#64748B',
          fontSize: '13px',
        }}
      >
        Select a Potential Network to inspect connected cases and supporting infrastructure.
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {/* Dossier Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
          paddingBottom: '16px',
          borderBottom: '1px solid #F1F5F9',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                textTransform: 'uppercase',
              }}
            >
              {cluster.cluster_type.replace(/_/g, ' ')}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: cluster.status === 'candidate' ? '#0284C7' : '#059669',
                textTransform: 'uppercase',
              }}
            >
              ● {cluster.status}
            </span>
          </div>

          <h2
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#0F172A',
              margin: '6px 0 2px 0',
              letterSpacing: '-0.01em',
            }}
          >
            {cluster.cluster_label}
          </h2>
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            Identifier: <code style={{ fontFamily: 'monospace', color: '#334155' }}>{cluster.cluster_id}</code>
          </div>
        </div>

        {/* Structural Similarity Score (Neutral Labeling) */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Structural Similarity
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
            {Math.round(cluster.confidence_score * 100)}%
          </div>
          <div style={{ fontSize: '11px', color: '#64748B' }}>Deterministic Graph Score</div>
        </div>
      </div>

      {/* Authoritative vs Potential Isolation Banner */}
      <div
        style={{
          margin: '16px 0',
          padding: '12px 14px',
          borderRadius: '10px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
        }}
      >
        <ShieldAlert size={16} style={{ color: '#0284C7', shrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.4 }}>
          <strong>Potential Shared Operational Network:</strong> Inferred from recurring accounts, devices, and spatial-temporal overlap across Truth Graph evidence. This cluster does not automatically modify or confirm the authoritative syndicate registry.
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
          marginBottom: '20px',
        }}
      >
        <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Member Cases</div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
            {cluster.supporting_complaint_count}
          </div>
        </div>

        <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Shared Entities</div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
            {cluster.supporting_entity_count}
          </div>
        </div>

        <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Total Exposure</div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
            {formatINR(cluster.total_exposure_inr)}
          </div>
        </div>

        <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Discovered</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
            {cluster.detected_at
              ? new Date(cluster.detected_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Recent'}
          </div>
        </div>
      </div>

      {/* Connected Cases Section */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Connected Member Cases ({cluster.complaint_members?.length || 0})
          </h3>
          <span style={{ fontSize: '11px', color: '#64748B' }}>Click to focus in graph</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
          {cluster.complaint_members?.map((member: ClusterComplaintMember) => {
            const isSelected = member.complaint_id === selectedCaseId;

            return (
              <div
                key={member.membership_id || member.complaint_id}
                onClick={() => onFocusCase(member.complaint_id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                  border: isSelected ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                      {member.ncrp_id || `Case ${member.complaint_id.slice(0, 8)}`}
                    </span>
                    {member.fraud_type && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#EEF2FF',
                          color: '#4F46E5',
                        }}
                      >
                        {member.fraud_type.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    {formatINR(member.amount_inr)} • {member.victim_state || 'State Registered'} • Evidence: {member.evidence_basis || 'Correlated'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/prediction/${member.complaint_id}`);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#2563EB',
                      cursor: 'pointer',
                    }}
                    title="Open Case Prediction / Detail"
                  >
                    <span>Open Case</span>
                    <ExternalLink size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Supporting Infrastructure Entities */}
      <div>
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: '0 0 10px 0' }}>
          Supporting Infrastructure Entities ({cluster.entity_members?.length || 0})
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
          {cluster.entity_members?.map((ent: ClusterEntityMember) => (
            <div
              key={ent.membership_id || ent.entity_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getEntityIcon(ent.entity_type)}
                <div>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                    {ent.masked_value || ent.canonical_reference || ent.entity_id.slice(0, 10)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Type: {ent.entity_type} • Basis: {ent.evidence_basis || 'Shared Link'}
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#059669',
                  backgroundColor: '#ECFDF5',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {Math.round((ent.confidence || 0.8) * 100)}% Match
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

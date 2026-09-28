import React from 'react';
import type { PotentialClusterSummary } from '../../types/syndicate';
import { Network, Database, Layers, Calendar, AlertCircle } from 'lucide-react';

interface SyndicateClusterListProps {
  clusters: PotentialClusterSummary[];
  selectedClusterId: string | null;
  onSelectCluster: (cluster: PotentialClusterSummary) => void;
  isLoading: boolean;
  error: string | null;
}

export const SyndicateClusterList: React.FC<SyndicateClusterListProps> = ({
  clusters,
  selectedClusterId,
  onSelectCluster,
  isLoading,
  error,
}) => {
  // Format currency helper
  const formatINR = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  // Similarity tier categorizer
  const getSimilarityTier = (score: number) => {
    if (score >= 0.7) {
      return { label: 'STRONG', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
    }
    if (score >= 0.5) {
      return { label: 'MODERATE', color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD' };
    }
    if (score >= 0.25) {
      return { label: 'EMERGING', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };
    }
    return { label: 'WEAK', color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' };
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '16px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          minHeight: '360px',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="animate-spin" style={{ color: '#2563EB' }}>
          <Network size={28} />
        </div>
        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
          Scanning cross-case correlations...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '24px 16px',
          backgroundColor: '#FEF2F2',
          borderRadius: '12px',
          border: '1px solid #FCA5A5',
          textAlign: 'center',
          color: '#991B1B',
        }}
      >
        <AlertCircle size={24} style={{ margin: '0 auto 8px auto' }} />
        <div style={{ fontSize: '14px', fontWeight: 700 }}>Unable to load potential networks</div>
        <div style={{ fontSize: '12px', color: '#B91C1C', marginTop: '4px' }}>{error}</div>
      </div>
    );
  }

  if (clusters.length === 0) {
    return (
      <div
        style={{
          padding: '36px 20px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px dashed #CBD5E1',
          textAlign: 'center',
        }}
      >
        <Layers size={32} style={{ color: '#94A3B8', margin: '0 auto 12px auto' }} />
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
          No Potential Networks Discovered
        </div>
        <p style={{ fontSize: '12px', color: '#64748B', marginTop: '6px', maxWidth: '280px', margin: '6px auto 0 auto' }}>
          No cross-case clusters match the current criteria. As complaints ingest shared infrastructure, potential networks will appear here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#64748B',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          padding: '0 4px',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Discovered Potential Networks ({clusters.length})</span>
        <span>Structural Confidence</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '680px', overflowY: 'auto' }}>
        {clusters.map((cluster) => {
          const isSelected = cluster.cluster_id === selectedClusterId;
          const tier = getSimilarityTier(cluster.confidence_score);

          return (
            <div
              key={cluster.cluster_id}
              onClick={() => onSelectCluster(cluster)}
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                border: isSelected ? '1.5px solid #059669' : '1px solid #E2E8F0',
                boxShadow: isSelected
                  ? '0 4px 12px rgba(5, 150, 105, 0.08)'
                  : '0 1px 3px rgba(0,0,0,0.02)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Header row: Cluster identifier & confidence tier */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: isSelected ? '#065F46' : '#0F172A',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={cluster.cluster_label}
                  >
                    {cluster.cluster_label}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    Potential Shared Operational Network
                  </div>
                </div>

                <div
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: tier.bg,
                    border: `1px solid ${tier.border}`,
                    color: tier.color,
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {Math.round(cluster.confidence_score * 100)}% {tier.label}
                </div>
              </div>

              {/* Members info strip */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: isSelected ? '1px solid #D1FAE5' : '1px solid #F1F5F9',
                  fontSize: '12px',
                  color: '#475569',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Database size={13} style={{ color: '#2563EB' }} />
                  <span style={{ fontWeight: 600 }}>{cluster.supporting_complaint_count}</span>
                  <span style={{ color: '#64748B' }}>Cases</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Network size={13} style={{ color: '#7C3AED' }} />
                  <span style={{ fontWeight: 600 }}>{cluster.supporting_entity_count}</span>
                  <span style={{ color: '#64748B' }}>Entities</span>
                </div>

                {cluster.total_exposure_inr > 0 && (
                  <div style={{ marginLeft: 'auto', fontWeight: 700, color: '#0F172A' }}>
                    {formatINR(cluster.total_exposure_inr)}
                  </div>
                )}
              </div>

              {/* Status and timestamp footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                  fontSize: '11px',
                  color: '#94A3B8',
                }}
              >
                <span
                  style={{
                    textTransform: 'uppercase',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    color: cluster.status === 'candidate' ? '#0284C7' : '#059669',
                  }}
                >
                  ● {cluster.status}
                </span>

                {cluster.last_updated_at && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={11} />
                    {new Date(cluster.last_updated_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';
import { Search, RotateCw, Filter, Shield, Network, AlertCircle } from 'lucide-react';

interface SyndicateHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedType: string;
  onTypeChange: (t: string) => void;
  selectedStatus: string;
  onStatusChange: (s: string) => void;
  totalClusters: number;
  totalConnectedCases: number;
  avgSimilarity: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const SyndicateHeader: React.FC<SyndicateHeaderProps> = ({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedStatus,
  onStatusChange,
  totalClusters,
  totalConnectedCases,
  avgSimilarity,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Top Banner: Title & Authoritative Registry Notice */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <Network size={20} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#0F172A',
                  letterSpacing: '-0.02em',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                Syndicate Intelligence
              </h1>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0 0' }}>
                Cross-case operational relationships & structural infrastructure intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Isolation Indicator for Authoritative vs Potential */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              fontSize: '12px',
              color: '#475569',
            }}
          >
            <Shield size={14} style={{ color: '#0284C7' }} />
            <span style={{ fontWeight: 600 }}>Authoritative Registry:</span>
            <span
              style={{
                backgroundColor: '#E0F2FE',
                color: '#0369A1',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '11px',
              }}
            >
              Strictly Isolated
            </span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
            title="Refresh Potential Networks"
          >
            <RotateCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Potential Networks
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
            {totalClusters}
          </div>
        </div>

        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Correlated Cases
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>
            {totalConnectedCases}
          </div>
        </div>

        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Avg Structural Similarity
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
            {Math.round(avgSimilarity * 100)}%
          </div>
        </div>

        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#F8FAFC',
            borderRadius: '10px',
            border: '1px dashed #CBD5E1',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} style={{ color: '#0284C7', shrink: 0 }} />
          <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.3 }}>
            <strong>Investigative Warning:</strong> Inferred clusters represent shared criminal infrastructure, not legal declarations.
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94A3B8',
            }}
          />
          <input
            type="text"
            placeholder="Search by network label, case ID, or entity..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              color: '#0F172A',
              backgroundColor: '#F8FAFC',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} style={{ color: '#64748B' }} />
            <select
              value={selectedType}
              onChange={(e) => onTypeChange(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                backgroundColor: '#FFFFFF',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Network Types</option>
              <option value="POTENTIAL_SHARED_INFRASTRUCTURE">Shared Infrastructure</option>
              <option value="STRUCTURAL_SIMILARITY">Structural Similarity</option>
              <option value="GEOGRAPHIC_CORRIDOR">Geographic Corridor</option>
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                backgroundColor: '#FFFFFF',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="candidate">Candidate</option>
              <option value="under_review">Under Review</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

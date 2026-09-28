import React from 'react';
import type { EvidenceCaseSummary, SemanticLevel } from '../../types/evidence';
import {
  FileCheck2,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface EvidenceHeaderProps {
  cases: EvidenceCaseSummary[];
  selectedCaseId: string | null;
  onSelectCase: (caseId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedSemanticLevel: string;
  onSemanticLevelChange: (level: string) => void;
  selectedEntityType: string;
  onEntityTypeChange: (type: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  totalNodes: number;
  totalEdges: number;
  semanticCounts: Record<SemanticLevel, number>;
  consistencyStatus: 'CONSISTENT' | 'REVIEW' | 'DISCREPANCY' | null;
}

export const EvidenceHeader: React.FC<EvidenceHeaderProps> = ({
  cases,
  selectedCaseId,
  onSelectCase,
  searchQuery,
  onSearchChange,
  selectedSemanticLevel,
  onSemanticLevelChange,
  selectedEntityType,
  onEntityTypeChange,
  onRefresh,
  isRefreshing,
  totalNodes,
  totalEdges,
  semanticCounts,
  consistencyStatus,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '20px 24px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {/* Top row: Title, Subtitle, Consistency Badge, Refresh */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #DBEAFE',
            }}
          >
            <FileCheck2 size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: '#0F172A',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                Evidence Intelligence
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                }}
              >
                TRUTH GRAPH PROVENANCE
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              Deterministic evidence verification, observation provenance, and relational consistency auditing.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Consistency Badge */}
          {consistencyStatus && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor:
                  consistencyStatus === 'CONSISTENT'
                    ? '#ECFDF5'
                    : consistencyStatus === 'REVIEW'
                    ? '#FFFBEB'
                    : '#FEF2F2',
                color:
                  consistencyStatus === 'CONSISTENT'
                    ? '#059669'
                    : consistencyStatus === 'REVIEW'
                    ? '#D97706'
                    : '#DC2626',
                border: `1px solid ${
                  consistencyStatus === 'CONSISTENT'
                    ? '#A7F3D0'
                    : consistencyStatus === 'REVIEW'
                    ? '#FDE68A'
                    : '#FECACA'
                }`,
              }}
            >
              {consistencyStatus === 'CONSISTENT' ? (
                <ShieldCheck size={14} />
              ) : (
                <AlertTriangle size={14} />
              )}
              <span>{consistencyStatus}</span>
            </div>
          )}

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              fontSize: '12px',
              fontWeight: 600,
              color: '#334155',
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Refresh Evidence Graph"
          >
            <RefreshCw
              size={14}
              style={{
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              }}
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Second row: Quick Stats Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Active Nodes</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
            {totalNodes}
          </div>
        </div>

        <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Direct Observed</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
            {semanticCounts.DIRECT_OBSERVED || 0}
          </div>
        </div>

        <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Derived Facts</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#4F46E5', marginTop: '2px' }}>
            {semanticCounts.DERIVED || 0}
          </div>
        </div>

        <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Inferred / Model</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#D97706', marginTop: '2px' }}>
            {(semanticCounts.INFERRED || 0) + (semanticCounts.MODEL_SIGNAL || 0)}
          </div>
        </div>

        <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Total Evidence Links</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>
            {totalEdges}
          </div>
        </div>
      </div>

      {/* Third row: Case Selector, Search, Semantic Level Filter, Entity Filter */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {/* Case Selector Dropdown */}
        <div style={{ minWidth: '260px', flex: 1 }}>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedCaseId || ''}
              onChange={(e) => onSelectCase(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 34px 9px 12px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                color: '#0F172A',
                fontWeight: 600,
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="" disabled>
                Select a Case to Inspect Evidence...
              </option>
              {cases.map((c) => (
                <option key={c.complaint_id} value={c.complaint_id}>
                  {c.ncrp_id || `Case ${c.complaint_id.slice(0, 8)}`} — {c.fraud_type.replace(/_/g, ' ')} ({c.relation_count} links)
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748B',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        {/* Search Input for Manual Case ID or Keyword */}
        <div style={{ minWidth: '220px', flex: 1, position: 'relative' }}>
          <Search
            size={14}
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
            placeholder="Search entity or case ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 34px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              color: '#0F172A',
            }}
          />
        </div>

        {/* Semantic Level Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={14} style={{ color: '#64748B' }} />
          <select
            value={selectedSemanticLevel}
            onChange={(e) => onSemanticLevelChange(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Semantic Levels</option>
            <option value="DIRECT_OBSERVED">Direct Observed (Fact)</option>
            <option value="DERIVED">Derived (Computed)</option>
            <option value="INFERRED">Inferred (Topological)</option>
            <option value="MODEL_SIGNAL">Model Signal (AI Output)</option>
          </select>
        </div>

        {/* Entity Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} style={{ color: '#64748B' }} />
          <select
            value={selectedEntityType}
            onChange={(e) => onEntityTypeChange(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Entity Types</option>
            <option value="complaint">Complaint</option>
            <option value="bank_account">Bank Account</option>
            <option value="phone">Phone / SIM</option>
            <option value="device">Device / Hardware</option>
            <option value="ip_address">IP / Subnet</option>
          </select>
        </div>
      </div>
    </div>
  );
};

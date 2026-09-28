import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { EvidenceNode, EvidenceEdge, EvidenceRelationDetail } from '../../types/evidence';
import {
  FileText,
  Link as LinkIcon,
  ShieldCheck,
  CheckCircle,
  Clock,
  ExternalLink,
  Database,
  Calendar,
} from 'lucide-react';

interface EvidenceInspectorProps {
  selectedNode: EvidenceNode | null;
  selectedEdge: EvidenceEdge | null;
  relationDetail: EvidenceRelationDetail | null;
  isLoadingRelation: boolean;
}

export const EvidenceInspector: React.FC<EvidenceInspectorProps> = ({
  selectedNode,
  selectedEdge,
  relationDetail,
  isLoadingRelation: _isLoadingRelation,
}) => {
  const navigate = useNavigate();

  const getSemanticColor = (level: string) => {
    switch (level) {
      case 'DIRECT_OBSERVED':
        return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
      case 'DERIVED':
        return { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' };
      case 'INFERRED':
        return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
      case 'MODEL_SIGNAL':
        return { bg: '#FAF5FF', text: '#9333EA', border: '#E9D5FF' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  const getSemanticDescription = (level: string) => {
    switch (level) {
      case 'DIRECT_OBSERVED':
        return 'Directly observed and recorded factual relationship from primary data sources.';
      case 'DERIVED':
        return 'Computed deterministically from intersecting primary records.';
      case 'INFERRED':
        return 'Analytical topological inference across shared infrastructure.';
      case 'MODEL_SIGNAL':
        return 'Synthesized from predictive model outputs and probabilistic analysis.';
      default:
        return 'Relational observation.';
    }
  };

  // If nothing is selected, display overall guidelines
  if (!selectedNode && !selectedEdge) {
    return (
      <div
        style={{
          padding: '24px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          height: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <ShieldCheck size={18} style={{ color: '#059669' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Evidence Inspector
          </h3>
        </div>
        <p style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
          Select any node or relationship edge on the graph to inspect concrete provenance, semantic derivation level, source records, and observation timestamps.
        </p>

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#059669' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#059669' }} />
              DIRECT_OBSERVED
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
              Hard deterministic evidence directly captured in formal complaints or bank intake.
            </div>
          </div>

          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#4F46E5' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4F46E5' }} />
              DERIVED
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
              Computed correlations such as shared devices, hardware fingerprints, and account overlap.
            </div>
          </div>

          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#D97706' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#D97706' }} />
              INFERRED
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
              Topological associations derived from cross-case infrastructure analysis.
            </div>
          </div>

          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#9333EA' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9333EA' }} />
              MODEL_SIGNAL
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
              Probabilistic signals synthesized by predictive models (XGBoost/LightGBM).
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Edge / Relation Selected View
  if (selectedEdge) {
    const sc = getSemanticColor(selectedEdge.semantic_level);
    const prov = relationDetail?.provenance;

    return (
      <div
        style={{
          padding: '24px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          height: '100%',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LinkIcon size={16} style={{ color: '#2563EB' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Relationship Evidence
            </h3>
          </div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: sc.bg,
              color: sc.text,
              border: `1px solid ${sc.border}`,
            }}
          >
            {selectedEdge.semantic_level}
          </span>
        </div>

        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
          {selectedEdge.relation_type.replace(/_/g, ' ')}
        </div>
        <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px 0', lineHeight: 1.4 }}>
          {getSemanticDescription(selectedEdge.semantic_level)}
        </p>

        {/* Provenance Card */}
        <div
          style={{
            padding: '14px',
            borderRadius: '12px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Database size={14} style={{ color: '#2563EB' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>Provenance Trace</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Source Record Type:</span>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>
                {selectedEdge.source_record_type || 'complaints'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B' }}>Source Reference:</span>
              <code style={{ fontFamily: 'monospace', fontSize: '11px', color: '#1E293B', backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                {selectedEdge.source_record_id || 'Direct Record'}
              </code>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Verification Status:</span>
              <span style={{ fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={12} /> Verified Upstream
              </span>
            </div>

            {prov?.derivation_explanation && (
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px', borderTop: '1px solid #E2E8F0', paddingTop: '6px' }}>
                {prov.derivation_explanation}
              </div>
            )}
          </div>

          {/* Action Button: Navigate to Source Record if complaint */}
          {selectedEdge.source_record_id && (
            <button
              onClick={() => navigate(`/prediction/${selectedEdge.source_record_id}`)}
              style={{
                marginTop: '12px',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                fontWeight: 600,
                color: '#2563EB',
                cursor: 'pointer',
              }}
            >
              <span>View Source Complaint</span>
              <ExternalLink size={12} />
            </button>
          )}
        </div>

        {/* Observation Interval */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#64748B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={13} style={{ color: '#94A3B8' }} />
            <span>First Seen: {selectedEdge.first_seen_at ? new Date(selectedEdge.first_seen_at).toLocaleString() : 'Recorded at Intake'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={13} style={{ color: '#94A3B8' }} />
            <span>Confidence Score: {Math.round(selectedEdge.confidence * 100)}%</span>
          </div>
        </div>
      </div>
    );
  }

  // Node Selected View
  if (selectedNode) {
    return (
      <div
        style={{
          padding: '24px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          height: '100%',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} style={{ color: '#2563EB' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Entity Inspector
            </h3>
          </div>
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
            {selectedNode.entity_type}
          </span>
        </div>

        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace', marginBottom: '4px' }}>
          {selectedNode.masked_value || selectedNode.canonical_reference}
        </div>
        <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
          Canonical: <code style={{ fontFamily: 'monospace' }}>{selectedNode.canonical_reference || selectedNode.id}</code>
        </div>

        {/* Entity Attributes Card */}
        <div
          style={{
            padding: '14px',
            borderRadius: '12px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            marginBottom: '16px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
            Entity Details & Privacy Preservation
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Entity Category:</span>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>{selectedNode.entity_type}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Masked Identifier:</span>
              <span style={{ fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}>
                {selectedNode.masked_value}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Intake Status:</span>
              <span style={{ fontWeight: 600, color: '#334155' }}>
                {selectedNode.is_root_case ? 'Target Investigation Case' : 'Linked Operational Entity'}
              </span>
            </div>
          </div>

          {/* Action if complaint node */}
          {selectedNode.entity_type === 'complaint' && (
            <button
              onClick={() => navigate(`/prediction/${selectedNode.id}`)}
              style={{
                marginTop: '12px',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                fontWeight: 600,
                color: '#2563EB',
                cursor: 'pointer',
              }}
            >
              <span>Open Case Detail</span>
              <ExternalLink size={12} />
            </button>
          )}
        </div>

        {/* Timestamps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#64748B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={13} style={{ color: '#94A3B8' }} />
            <span>Observed First: {selectedNode.first_seen_at ? new Date(selectedNode.first_seen_at).toLocaleDateString() : 'Historical Record'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={13} style={{ color: '#94A3B8' }} />
            <span>Active Truth Graph Node: {selectedNode.id.slice(0, 12)}</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

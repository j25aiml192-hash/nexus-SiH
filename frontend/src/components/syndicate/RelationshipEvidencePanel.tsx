import React from 'react';
import type { GraphNode, GraphEdge, RelatedCaseItem } from '../../types/syndicate';
import {
  CreditCard,
  HardDrive,
  Clock,
  Link as LinkIcon,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

interface RelationshipEvidencePanelProps {
  selectedNode: GraphNode | null;
  selectedEdge: GraphEdge | null;
  caseAssociations: RelatedCaseItem[];
  isLoadingAssociations: boolean;
}

export const RelationshipEvidencePanel: React.FC<RelationshipEvidencePanelProps> = ({
  selectedNode,
  selectedEdge,
  caseAssociations,
  isLoadingAssociations,
}) => {
  // If nothing is selected, display overall evidence explanation
  if (!selectedNode && !selectedEdge) {
    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <ShieldCheck size={18} style={{ color: '#059669' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Relationship Evidence Intelligence
          </h3>
        </div>
        <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
          Select any case node, shared entity node, or connecting edge on the graph to inspect the exact explainable evidence linking cross-case operations.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px',
            marginTop: '16px',
          }}
        >
          <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
              <CreditCard size={14} style={{ color: '#059669' }} /> Shared Bank Accounts
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
              Deterministic account & UPI matches across independent victim reports.
            </div>
          </div>

          <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
              <HardDrive size={14} style={{ color: '#7C3AED' }} /> Shared Hardware
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
              IMEI and physical device fingerprints logged in fraud authentication.
            </div>
          </div>

          <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
              <Clock size={14} style={{ color: '#2563EB' }} /> Spatial-Temporal
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
              Concurrent withdrawal bursts within shared 5km cashout corridors.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Edge Selected View
  if (selectedEdge) {
    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <LinkIcon size={16} style={{ color: '#2563EB' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Relationship Edge Inspection
          </h3>
        </div>

        <div
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            marginBottom: '14px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Relationship Type
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
            {selectedEdge.edge_type.replace(/_/g, ' ')}
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px', display: 'flex', gap: '8px' }}>
            <span>Source: <code style={{ fontFamily: 'monospace' }}>{selectedEdge.source}</code></span>
            <span>→</span>
            <span>Target: <code style={{ fontFamily: 'monospace' }}>{selectedEdge.target}</code></span>
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
          <strong>Evidence Basis:</strong> Cross-case graph link identified via shared entity occurrences in both complaints. Weight: {selectedEdge.weight}.
        </div>
      </div>
    );
  }

  // Node Selected View (Case Node)
  if (selectedNode?.node_type === 'complaint') {
    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: selectedNode.is_root ? '#EFF6FF' : '#F1F5F9',
                color: selectedNode.is_root ? '#1D4ED8' : '#475569',
              }}
            >
              {selectedNode.is_root ? 'Root Case Node' : 'Correlated Case Node'}
            </span>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '6px 0 0 0' }}>
              {selectedNode.label}
            </h3>
            <div style={{ fontSize: '11px', color: '#64748B' }}>UUID: {selectedNode.id}</div>
          </div>

          {selectedNode.fraud_type && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#EEF2FF',
                color: '#4F46E5',
              }}
            >
              {selectedNode.fraud_type.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {/* Case Direct Correlations */}
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' }}>
            Direct Cross-Case Relationships ({caseAssociations.length})
          </h4>

          {isLoadingAssociations ? (
            <div style={{ fontSize: '12px', color: '#64748B', padding: '12px' }}>Loading case relationships...</div>
          ) : caseAssociations.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#64748B', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
              No additional direct cross-case relations returned for this complaint.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {caseAssociations.map((assoc, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>
                      {assoc.ncrp_id || assoc.complaint_id.slice(0, 8)}
                    </span>
                    <span style={{ color: '#64748B', marginLeft: '6px' }}>
                      ({assoc.fraud_type?.replace(/_/g, ' ') || 'Fraud'})
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                    Shared {assoc.shared_entity?.entity_type || 'Infrastructure'}: {assoc.shared_entity?.masked_value || assoc.shared_entity?.canonical_reference || 'Match'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Node Selected View (Entity Node)
  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <CheckCircle size={16} style={{ color: '#059669' }} />
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
          Shared Infrastructure Evidence
        </h3>
      </div>

      <div
        style={{
          padding: '12px 14px',
          borderRadius: '10px',
          backgroundColor: '#F0FDF4',
          border: '1px solid #A7F3D0',
          marginBottom: '12px',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>
          {selectedNode?.entity_type || 'Infrastructure Entity'}
        </div>
        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace', marginTop: '2px' }}>
          {selectedNode?.masked_value || selectedNode?.label}
        </div>
        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
          Canonical Reference: {selectedNode?.canonical_reference || selectedNode?.id}
        </div>
      </div>

      <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
        <strong>Privacy Notice:</strong> All identifiers are masked adhering to LEA data standards. This entity appeared in multiple reported cases across the Truth Graph.
      </div>
    </div>
  );
};

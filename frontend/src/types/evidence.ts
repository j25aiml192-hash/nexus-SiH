/**
 * NEXUS Phase 4A: Evidence Intelligence UI Types
 * Direct mappings to Truth Graph, Provenance, Consistency, and Timeline contracts.
 */

export type SemanticLevel = 'DIRECT_OBSERVED' | 'DERIVED' | 'INFERRED' | 'MODEL_SIGNAL';

export interface EvidenceCaseSummary {
  complaint_id: string;
  ncrp_id: string | null;
  fraud_type: string;
  amount_inr: number;
  victim_state: string | null;
  relation_count: number;
  entity_count_est: number;
  first_seen_at: string;
  last_seen_at: string;
}

export interface EvidenceNode {
  key: string;
  id: string;
  node_type: 'complaint' | 'entity' | string;
  entity_type: string;
  label: string;
  masked_value: string;
  canonical_reference: string | null;
  is_root_case?: boolean;
  first_seen_at?: string;
  last_seen_at?: string;
  metadata?: Record<string, any>;
}

export interface EvidenceEdge {
  key: string;
  id: string;
  source: string;
  target: string;
  source_entity_id: string;
  target_entity_id: string;
  relation_type: string;
  semantic_level: SemanticLevel;
  confidence: number;
  source_record_type: string;
  source_record_id: string;
  evidence_metadata?: Record<string, any>;
  first_seen_at?: string;
  last_seen_at?: string;
}

export interface ConsistencyCheck {
  code: string;
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  detail: string;
}

export interface ConsistencyDiscrepancy {
  code: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

export interface EvidenceConsistency {
  status: 'CONSISTENT' | 'REVIEW' | 'DISCREPANCY';
  checks_passed: number;
  total_checks: number;
  checks: ConsistencyCheck[];
  discrepancies: ConsistencyDiscrepancy[];
  summary_note?: string;
}

export interface EvidenceSummaryMetrics {
  total_nodes: number;
  total_edges: number;
  semantic_breakdown: Record<SemanticLevel, number>;
  entity_types: Record<string, number>;
}

export interface EvidenceGraphResponse {
  complaint_id: string;
  complaint: Record<string, any> | null;
  depth: number;
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  summary: EvidenceSummaryMetrics;
  consistency: EvidenceConsistency;
}

export interface EvidenceTimelineEvent {
  id: string;
  event_type: string;
  title: string;
  timestamp: string;
  category: 'OBSERVATION' | 'EVIDENCE' | 'MODEL' | 'AUTONOMY';
  semantic_level: SemanticLevel;
  source_type: string;
  source_id: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface RelationProvenance {
  source_record_type: string;
  source_record_id: string;
  derivation_explanation: string;
  first_seen_at?: string;
  last_seen_at?: string;
  created_at?: string;
  is_provenance_verified: boolean;
}

export interface EvidenceRelationDetail {
  relation_id: string;
  relation_type: string;
  semantic_level: SemanticLevel;
  confidence: number;
  complaint_id: string | null;
  source_entity: Record<string, any> | null;
  target_entity: Record<string, any> | null;
  provenance: RelationProvenance;
  evidence_metadata: Record<string, any>;
}

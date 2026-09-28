/**
 * NEXUS Phase 3B: Syndicate Intelligence UI Types
 * Direct mappings to Phase 3A Syndicate DNA & Cross-Case Intelligence Engine contracts.
 */

export interface PotentialClusterSummary {
  cluster_id: string;
  cluster_label: string;
  cluster_type: string;
  status: 'candidate' | 'under_review' | 'dismissed' | string;
  confidence_score: number;
  supporting_entity_count: number;
  supporting_complaint_count: number;
  total_exposure_inr: number;
  summary_metadata: Record<string, any>;
  detected_at: string;
  last_updated_at: string;
}

export interface ClusterComplaintMember {
  membership_id: string;
  complaint_id: string;
  ncrp_id: string | null;
  fraud_type: string | null;
  amount_inr: number;
  victim_state: string | null;
  evidence_basis: string;
  confidence: number;
  joined_at: string;
}

export interface ClusterEntityMember {
  membership_id: string;
  entity_id: string;
  entity_type: string;
  canonical_reference: string | null;
  masked_value: string | null;
  evidence_basis: string;
  confidence: number;
  joined_at: string;
}

export interface PotentialClusterDetail extends PotentialClusterSummary {
  complaint_members: ClusterComplaintMember[];
  entity_members: ClusterEntityMember[];
}

export interface ClustersListResponse {
  total: number;
  limit: number;
  offset: number;
  clusters: PotentialClusterSummary[];
}

export interface RelatedCaseItem {
  complaint_id: string;
  ncrp_id: string | null;
  fraud_type: string | null;
  amount_inr: number;
  shared_entity: {
    entity_type: string;
    canonical_reference: string | null;
    masked_value: string | null;
  };
}

export interface CaseSyndicatesResponse {
  complaint_id: string;
  clusters_count: number;
  clusters: PotentialClusterSummary[];
  related_cases_count: number;
  related_cases: RelatedCaseItem[];
}

export interface GraphNode {
  key: string;
  id: string;
  node_type: 'complaint' | 'entity' | string;
  label: string;
  fraud_type?: string;
  amount_inr?: number;
  is_root?: boolean;
  entity_type?: string;
  canonical_reference?: string;
  masked_value?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  edge_type: 'APPEARED_IN' | 'SHARED_INFRASTRUCTURE' | string;
  weight: number;
}

export interface GraphExpansionResponse {
  root_complaint_id: string;
  depth: number;
  total_nodes: number;
  total_edges: number;
  total_cases: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

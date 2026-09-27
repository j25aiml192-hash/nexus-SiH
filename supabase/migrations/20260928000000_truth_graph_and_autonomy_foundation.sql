-- =============================================================================
-- NEXUS PLATFORM: PHASE 1 — TRUTH GRAPH & AUTONOMY DATA FOUNDATION MIGRATION
-- Migration: 20260928000000_truth_graph_and_autonomy_foundation.sql
-- Description:
--   Additive schema establishing the data foundation for:
--   1. Multimodal Truth Graph (Entities & Relations with provenance)
--   2. Inferred Networks / Potential Clusters (Distinct from authoritative syndicates)
--   3. Autonomy Events & Audit Trail (Idempotent event outbox, structured reason codes)
--   4. Victim Advisory Persistence (Safe masked phone references, deterministic templates)
--   5. Prediction Outcome Evaluation (Additive metrics without overwriting predictions)
--
-- Safety Guarantees:
--   - Non-destructive: No ALTER TABLE DROP or destructive modifications to existing tables.
--   - Authoritative `syndicates` table is NOT modified or overloaded.
--   - Sensitive identifiers are stored via deterministic fingerprint hashes and masked values.
-- =============================================================================

-- 1. TRUTH GRAPH ENTITIES
CREATE TABLE IF NOT EXISTS public.truth_graph_entities (
    entity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN (
        'phone', 'bank_account', 'upi_id', 'device', 'ip_subnet', 
        'wallet', 'complaint', 'transaction', 'atm', 'cashout_event', 'infrastructure'
    )),
    canonical_reference TEXT UNIQUE NOT NULL,
    raw_fingerprint_hash TEXT NOT NULL,
    masked_value TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TRUTH GRAPH RELATIONS
CREATE TABLE IF NOT EXISTS public.truth_graph_relations (
    relation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_entity_id UUID NOT NULL REFERENCES public.truth_graph_entities(entity_id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES public.truth_graph_entities(entity_id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL CHECK (relation_type IN (
        'SHARED_DEVICE', 'SHARED_IP', 'SHARED_ACCOUNT', 'SENT_FUNDS_TO', 
        'RECEIVED_FUNDS_FROM', 'APPEARED_IN_COMPLAINT', 'USED_INFRASTRUCTURE', 
        'GEOGRAPHIC_PROXIMITY', 'TEMPORAL_PROXIMITY', 'ASSOCIATED_WITH'
    )),
    semantic_level TEXT NOT NULL DEFAULT 'DIRECT_OBSERVED' CHECK (semantic_level IN (
        'DIRECT_OBSERVED', 'DERIVED', 'INFERRED', 'MODEL_SIGNAL'
    )),
    complaint_id TEXT,
    source_record_type TEXT NOT NULL,
    source_record_id TEXT NOT NULL,
    confidence NUMERIC NOT NULL DEFAULT 1.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    evidence_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_truth_relation UNIQUE (source_entity_id, target_entity_id, relation_type, source_record_id)
);

-- 3. INFERRED POTENTIAL NETWORK CLUSTERS (SEPARATED FROM AUTHORITATIVE SYNDICATES)
CREATE TABLE IF NOT EXISTS public.potential_network_clusters (
    cluster_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_label TEXT NOT NULL,
    cluster_type TEXT NOT NULL DEFAULT 'POTENTIAL_SHARED_INFRASTRUCTURE' CHECK (cluster_type IN (
        'POTENTIAL_SHARED_INFRASTRUCTURE', 'STRUCTURAL_SIMILARITY', 
        'GEOGRAPHIC_CORRIDOR', 'OPERATIONAL_CLUSTER'
    )),
    status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN (
        'candidate', 'under_review', 'confirmed_syndicate', 'dismissed'
    )),
    confidence_score NUMERIC NOT NULL DEFAULT 0.5 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    supporting_entity_count INTEGER NOT NULL DEFAULT 0,
    supporting_complaint_count INTEGER NOT NULL DEFAULT 0,
    total_exposure_inr NUMERIC NOT NULL DEFAULT 0.0,
    summary_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. POTENTIAL NETWORK CLUSTER MEMBERS
CREATE TABLE IF NOT EXISTS public.potential_network_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID NOT NULL REFERENCES public.potential_network_clusters(cluster_id) ON DELETE CASCADE,
    member_type TEXT NOT NULL CHECK (member_type IN ('entity', 'complaint')),
    entity_id UUID REFERENCES public.truth_graph_entities(entity_id) ON DELETE CASCADE,
    complaint_id TEXT,
    evidence_basis TEXT NOT NULL,
    confidence NUMERIC NOT NULL DEFAULT 1.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    evidence_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_cluster_member UNIQUE (cluster_id, member_type, entity_id, complaint_id)
);

-- 5. AUTONOMY EVENT OUTBOX (IDEMPOTENT EVENT PERSISTENCE)
CREATE TABLE IF NOT EXISTS public.autonomy_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL CHECK (event_type IN (
        'complaint_ingested', 'voice_complaint_submitted', 'evidence_updated',
        'evidence_discrepancy_detected', 'transaction_added', 'account_linked',
        'prediction_generated', 'prediction_updated', 'operational_window_approaching',
        'alert_created', 'alert_acknowledged', 'incident_resolved', 'outcome_recorded'
    )),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    complaint_id TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN (
        'pending', 'processing', 'processed', 'failed', 'ignored'
    )),
    idempotency_key TEXT UNIQUE NOT NULL,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. AUTONOMY AUDIT LOG (STRUCTURED REASONING & HUMAN APPROVAL TRACKING)
CREATE TABLE IF NOT EXISTS public.autonomy_audit_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id TEXT,
    trigger_event_id UUID REFERENCES public.autonomy_events(event_id) ON DELETE SET NULL,
    trigger_event_type TEXT NOT NULL,
    action_type TEXT NOT NULL,
    decision_factors JSONB NOT NULL DEFAULT '{"reason_codes": []}'::jsonb,
    action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    approval_status TEXT NOT NULL DEFAULT 'not_required' CHECK (approval_status IN (
        'not_required', 'pending_approval', 'approved', 'rejected'
    )),
    approved_by TEXT,
    approval_notes TEXT,
    executed_at TIMESTAMPTZ,
    execution_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. VICTIM PROACTIVE ADVISORIES
CREATE TABLE IF NOT EXISTS public.victim_advisories (
    advisory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id TEXT NOT NULL,
    phone_number_masked TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('SMS', 'WHATSAPP', 'VOICE', 'PORTAL')),
    advisory_type TEXT NOT NULL,
    advisory_version TEXT NOT NULL DEFAULT 'v1.0',
    advisory_text TEXT NOT NULL,
    delivery_status TEXT NOT NULL DEFAULT 'queued' CHECK (delivery_status IN (
        'queued', 'sent', 'delivered', 'failed'
    )),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. PREDICTION OUTCOME EVALUATIONS (GROUND TRUTH COMPARISON)
CREATE TABLE IF NOT EXISTS public.model_evaluations (
    eval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id TEXT NOT NULL,
    complaint_id TEXT NOT NULL,
    incident_id TEXT,
    predicted_lat NUMERIC,
    predicted_lon NUMERIC,
    predicted_h3 TEXT,
    predicted_time_start TIMESTAMPTZ,
    predicted_time_end TIMESTAMPTZ,
    actual_lat NUMERIC,
    actual_lon NUMERIC,
    actual_h3 TEXT,
    actual_cashout_at TIMESTAMPTZ,
    distance_error_km NUMERIC,
    time_error_minutes NUMERIC,
    geo_correct_2_5km BOOLEAN,
    time_correct_window BOOLEAN,
    evaluation_status TEXT NOT NULL DEFAULT 'pending' CHECK (evaluation_status IN (
        'pending', 'partial', 'evaluated'
    )),
    evaluated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE & QUERY EFFICIENCY
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_truth_entities_type_ref ON public.truth_graph_entities(entity_type, canonical_reference);
CREATE INDEX IF NOT EXISTS idx_truth_entities_hash ON public.truth_graph_entities(raw_fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_truth_relations_source ON public.truth_graph_relations(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_truth_relations_target ON public.truth_graph_relations(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_truth_relations_complaint ON public.truth_graph_relations(complaint_id);
CREATE INDEX IF NOT EXISTS idx_truth_relations_type ON public.truth_graph_relations(relation_type);
CREATE INDEX IF NOT EXISTS idx_network_clusters_status ON public.potential_network_clusters(status);
CREATE INDEX IF NOT EXISTS idx_network_members_cluster ON public.potential_network_members(cluster_id);
CREATE INDEX IF NOT EXISTS idx_network_members_entity ON public.potential_network_members(entity_id);
CREATE INDEX IF NOT EXISTS idx_autonomy_events_status ON public.autonomy_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_autonomy_events_idempotency ON public.autonomy_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_autonomy_audit_complaint ON public.autonomy_audit_log(complaint_id);
CREATE INDEX IF NOT EXISTS idx_victim_advisories_complaint ON public.victim_advisories(complaint_id);
CREATE INDEX IF NOT EXISTS idx_model_evaluations_prediction ON public.model_evaluations(prediction_id);
CREATE INDEX IF NOT EXISTS idx_model_evaluations_complaint ON public.model_evaluations(complaint_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE public.truth_graph_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truth_graph_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.potential_network_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.potential_network_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomy_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomy_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.victim_advisories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_evaluations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view data
CREATE POLICY "allow_read_truth_entities" ON public.truth_graph_entities FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_read_truth_relations" ON public.truth_graph_relations FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_read_network_clusters" ON public.potential_network_clusters FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_read_network_members" ON public.potential_network_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_read_autonomy_events" ON public.autonomy_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_read_autonomy_audit" ON public.autonomy_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_read_victim_advisories" ON public.victim_advisories FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_read_model_evaluations" ON public.model_evaluations FOR SELECT TO authenticated USING (true);

-- Allow service role full write access
CREATE POLICY "allow_all_truth_entities_service" ON public.truth_graph_entities FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_truth_relations_service" ON public.truth_graph_relations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_network_clusters_service" ON public.potential_network_clusters FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_network_members_service" ON public.potential_network_members FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_autonomy_events_service" ON public.autonomy_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_autonomy_audit_service" ON public.autonomy_audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_victim_advisories_service" ON public.victim_advisories FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_model_evaluations_service" ON public.model_evaluations FOR ALL TO service_role USING (true) WITH CHECK (true);

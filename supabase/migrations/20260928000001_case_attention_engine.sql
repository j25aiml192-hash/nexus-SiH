-- =============================================================================
-- NEXUS PLATFORM: PHASE 2B — AUTONOMOUS CASE ATTENTION ENGINE MIGRATION
-- Migration: 20260928000001_case_attention_engine.sql
-- Description:
--   Additive schema establishing persistent operational case attention states.
--   Enables deterministic prioritization of active cases requiring investigator
--   action based on multi-factor weighted signals and explainable reason codes.
--
-- Safety Guarantees:
--   - Non-destructive: No ALTER TABLE DROP or destructive modifications.
--   - Does NOT modify or overwrite ML risk scores or model evaluations.
--   - Deterministic single active state per complaint with auditable history.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.case_attention_state (
    attention_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id TEXT UNIQUE NOT NULL,
    attention_score NUMERIC NOT NULL DEFAULT 0.0 CHECK (attention_score >= 0.0 AND attention_score <= 100.0),
    attention_level TEXT NOT NULL DEFAULT 'LOW' CHECK (attention_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    reason_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    decision_factors JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_event_id TEXT,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    policy_version TEXT NOT NULL DEFAULT 'phase2b-v1',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- INDEXES FOR WORK QUEUE PERFORMANCE & FILTERING
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_case_attention_score ON public.case_attention_state(attention_score DESC);
CREATE INDEX IF NOT EXISTS idx_case_attention_level ON public.case_attention_state(attention_level);
CREATE INDEX IF NOT EXISTS idx_case_attention_complaint ON public.case_attention_state(complaint_id);
CREATE INDEX IF NOT EXISTS idx_case_attention_active ON public.case_attention_state(active);
CREATE INDEX IF NOT EXISTS idx_case_attention_calc_at ON public.case_attention_state(calculated_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE public.case_attention_state ENABLE ROW LEVEL SECURITY;

-- Allow authenticated investigators to view attention states
CREATE POLICY "allow_read_case_attention" ON public.case_attention_state 
    FOR SELECT TO authenticated USING (true);

-- Allow service role full management access
CREATE POLICY "allow_all_case_attention_service" ON public.case_attention_state 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

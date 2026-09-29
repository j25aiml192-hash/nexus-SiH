-- NEXUS Phase 7: Outcome Feedback + Model Learning Schema Extensions
-- Additive extensions to model_evaluations and new model registry and dataset tables

-- 1. Additive columns to public.model_evaluations
ALTER TABLE IF EXISTS public.model_evaluations
    ADD COLUMN IF NOT EXISTS model_version TEXT DEFAULT 'geo_lgbm_v3',
    ADD COLUMN IF NOT EXISTS evaluation_version TEXT DEFAULT 'v1.0',
    ADD COLUMN IF NOT EXISTS outcome_source TEXT DEFAULT 'incident',
    ADD COLUMN IF NOT EXISTS actual_outcome TEXT,
    ADD COLUMN IF NOT EXISTS amount_recovered NUMERIC(14, 2) DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Model Registry table
CREATE TABLE IF NOT EXISTS public.model_registry (
    model_id TEXT PRIMARY KEY,
    model_name TEXT NOT NULL,
    model_version TEXT UNIQUE NOT NULL,
    model_type TEXT NOT NULL,
    artifact_reference TEXT NOT NULL,
    feature_schema_version TEXT NOT NULL DEFAULT 'v1.0',
    dataset_version TEXT,
    evaluation_version TEXT NOT NULL DEFAULT 'v1.0',
    metrics JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'CANDIDATE',
    parent_model_version TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    deployed_at TIMESTAMPTZ,
    retired_at TIMESTAMPTZ,
    rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_model_reg_version ON public.model_registry(model_version);
CREATE INDEX IF NOT EXISTS idx_model_reg_status ON public.model_registry(status);

-- 3. Model Datasets table
CREATE TABLE IF NOT EXISTS public.model_datasets (
    dataset_id TEXT PRIMARY KEY,
    dataset_version TEXT UNIQUE NOT NULL,
    dataset_type TEXT NOT NULL,
    feature_schema_version TEXT NOT NULL DEFAULT 'v1.0',
    label_definition TEXT NOT NULL,
    evaluation_config_version TEXT NOT NULL DEFAULT 'v1.0',
    source_reference TEXT NOT NULL,
    row_count INTEGER NOT NULL DEFAULT 0,
    validation_status TEXT NOT NULL DEFAULT 'VALID',
    split_config JSONB NOT NULL DEFAULT '{}',
    checksum TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_ds_version ON public.model_datasets(dataset_version);

-- RLS Policies
ALTER TABLE public.model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_read_model_registry" ON public.model_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_all_model_registry_service" ON public.model_registry FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "allow_read_model_datasets" ON public.model_datasets FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_all_model_datasets_service" ON public.model_datasets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- NEXUS Phase 5 — Supabase/PostgreSQL Production Migration
-- action_recommendations table
-- =============================================================================
-- Additive migration: does NOT modify any existing table.
-- Run with Supabase service-role key or via Supabase SQL Editor.
-- Safe to run multiple times (all statements use IF NOT EXISTS).
-- =============================================================================

-- 1. ENUM TYPES
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE action_status AS ENUM (
        'PROPOSED',
        'PENDING_APPROVAL',
        'APPROVED',
        'EXECUTING',
        'COMPLETED',
        'REJECTED',
        'EXPIRED',
        'CANCELLED',
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE action_priority AS ENUM (
        'CRITICAL',
        'HIGH',
        'MEDIUM',
        'LOW'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE action_category AS ENUM (
        'SAFE_AUTOMATIC',
        'HUMAN_APPROVAL_REQUIRED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;


-- 2. TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS action_recommendations (
    -- Primary key
    action_id           TEXT PRIMARY KEY DEFAULT 'ACT-' || upper(substr(md5(gen_random_uuid()::text), 1, 10)),

    -- Case linkage
    complaint_id        TEXT NOT NULL,

    -- Action identity
    action_type         TEXT NOT NULL,
    priority            action_priority NOT NULL DEFAULT 'MEDIUM',
    status              action_status NOT NULL DEFAULT 'PROPOSED',
    policy_version      TEXT NOT NULL DEFAULT 'phase5-v1',

    -- Policy rationale (JSON arrays/objects)
    reason_codes        JSONB NOT NULL DEFAULT '[]',
    decision_factors    JSONB NOT NULL DEFAULT '{}',
    supporting_evidence JSONB NOT NULL DEFAULT '[]',

    -- Approval control
    approval_required   BOOLEAN NOT NULL DEFAULT FALSE,

    -- Actor tracking
    requested_by        TEXT,
    approved_by         TEXT,
    approved_at         TIMESTAMPTZ,
    rejected_by         TEXT,
    rejected_at         TIMESTAMPTZ,

    -- Lifecycle timestamps
    execution_started_at TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    failure_reason      TEXT,
    expires_at          TIMESTAMPTZ,

    -- Idempotency
    idempotency_key     TEXT NOT NULL UNIQUE,

    -- Event tracing
    trigger_event_id    TEXT,

    -- Immutable audit log (append-only JSONB array)
    history             JSONB NOT NULL DEFAULT '[]',

    -- Standard audit timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraint: consequential actions must explicitly be approval_required
    CONSTRAINT consequential_must_require_approval CHECK (
        action_type NOT IN (
            'REQUEST_FUND_FREEZE', 'ISSUE_LIEN_RECOMMENDATION',
            'REQUEST_ACCOUNT_RESTRICTION', 'REQUEST_FIELD_DISPATCH',
            'REQUEST_LEGAL_ESCALATION', 'REQUEST_INTERSTATE_ESCALATION', 'CLOSE_CASE'
        ) OR approval_required = TRUE
    )
);


-- 3. INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_action_rec_complaint
    ON action_recommendations (complaint_id);

CREATE INDEX IF NOT EXISTS idx_action_rec_status
    ON action_recommendations (status);

CREATE INDEX IF NOT EXISTS idx_action_rec_priority
    ON action_recommendations (priority);

CREATE INDEX IF NOT EXISTS idx_action_rec_expires
    ON action_recommendations (expires_at)
    WHERE status IN ('PROPOSED', 'PENDING_APPROVAL');

CREATE INDEX IF NOT EXISTS idx_action_rec_created
    ON action_recommendations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_action_rec_complaint_status
    ON action_recommendations (complaint_id, status);

CREATE INDEX IF NOT EXISTS idx_action_rec_complaint_created
    ON action_recommendations (complaint_id, created_at DESC);


-- 4. UPDATED_AT AUTO-TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_action_rec_updated_at ON action_recommendations;

CREATE TRIGGER trg_action_rec_updated_at
    BEFORE UPDATE ON action_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();


-- 5. ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE action_recommendations ENABLE ROW LEVEL SECURITY;

-- Service role (backend API): full access
CREATE POLICY IF NOT EXISTS "service_role_full_access"
    ON action_recommendations
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

-- Authenticated users: read-only access to all recommendations
CREATE POLICY IF NOT EXISTS "authenticated_read_own"
    ON action_recommendations
    FOR SELECT
    TO authenticated
    USING (TRUE);

-- Authenticated users: CANNOT insert, update, delete directly
-- (All writes go through the service-role backend API)


-- 6. APPROVAL IMMUTABILITY RULE
-- =============================================================================
-- Prevent approval_required from being set to FALSE after creation
-- (consequential actions can never have approval downgraded)

CREATE OR REPLACE FUNCTION prevent_approval_downgrade()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.approval_required = TRUE AND NEW.approval_required = FALSE THEN
        RAISE EXCEPTION 'approval_required cannot be downgraded from TRUE to FALSE on action_id=%', OLD.action_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_approval_downgrade ON action_recommendations;

CREATE TRIGGER trg_prevent_approval_downgrade
    BEFORE UPDATE ON action_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION prevent_approval_downgrade();


-- 7. COMMENT DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE action_recommendations IS
'NEXUS Phase 5 — Action Policy Engine. Stores deterministic, idempotent investigator
 action recommendations. Consequential actions (fund_freeze, dispatch, lien, etc.)
 require explicit HUMAN approval. No external system is called automatically.';

COMMENT ON COLUMN action_recommendations.idempotency_key IS
'SHA-256 fingerprint: complaint_id + action_type + policy_version + state_fingerprint.
 Prevents event-loop amplification and duplicate recommendations.';

COMMENT ON COLUMN action_recommendations.approval_required IS
'TRUE for all HUMAN_APPROVAL_REQUIRED actions. Cannot be downgraded after creation.
 Approval is ONLY granted via explicit POST /autonomy/actions/{id}/approve.';

COMMENT ON COLUMN action_recommendations.history IS
'Append-only JSONB audit trail. Each entry: {at, from_status, to_status, actor, notes}.
 Never modified in place — only appended.';


-- =============================================================================
-- VERIFICATION QUERY (run after migration to confirm)
-- =============================================================================
-- SELECT
--     table_name,
--     column_name,
--     data_type
-- FROM information_schema.columns
-- WHERE table_name = 'action_recommendations'
-- ORDER BY ordinal_position;
--
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'action_recommendations';
--
-- SELECT policyname, cmd, roles, qual
-- FROM pg_policies
-- WHERE tablename = 'action_recommendations';
-- =============================================================================

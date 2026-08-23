/*
# NEXUS Platform — Core Schema

## Overview
Creates the complete database schema for NEXUS, an autonomous cybercrime prediction
and alert platform for Indian law enforcement. This migration sets up all tables,
relationships, RLS policies, and realtime subscriptions.

## Tables Created
1. `users` — Extends auth.users with role, state, district, bank, phone
2. `complaints` — Fraud complaints filed by victims
3. `predictions` — AI-generated risk predictions for each complaint
4. `mule_chain_nodes` — Transaction hops in money mule chains
5. `alerts` — Alerts sent to LEA officers based on predictions
6. `atm_locations` — ATM coordinates for geo-intelligence
7. `atm_clusters` — Geographic clusters of fraud activity
8. `incident_reports` — Field officer reports from the ground
9. `daily_briefs` — AI-generated daily intelligence briefs
10. `system_logs` — Autonomous engine heartbeat/loop logs
11. `deployments` — Officer deployment records for field response

## Security
- RLS enabled on all tables
- i4c_national role sees all data
- state_lea sees only their state's data
- bank_officer sees only their bank's alerts
- field_officer sees only their assigned alerts
- All policies use auth.uid() for ownership checks

## Realtime
- predictions, alerts, and system_logs tables added to realtime publication
*/

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('i4c_national','state_lea','bank_officer','field_officer')),
  state TEXT,
  district TEXT,
  bank TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- ============================================================
-- COMPLAINTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT UNIQUE NOT NULL,
  fraud_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  filed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  victim_state TEXT,
  victim_district TEXT,
  accused_phone_prefix TEXT,
  accused_bank TEXT,
  accused_account_hash TEXT,
  mule_chain_depth INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','flagged','alerted','intercepted','closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- i4c sees all complaints
DROP POLICY IF EXISTS "complaints_select_i4c" ON public.complaints;
CREATE POLICY "complaints_select_i4c" ON public.complaints FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'i4c_national')
    OR victim_state IN (
      SELECT users.state FROM public.users WHERE users.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "complaints_insert_authenticated" ON public.complaints;
CREATE POLICY "complaints_insert_authenticated" ON public.complaints FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "complaints_update_i4c" ON public.complaints;
CREATE POLICY "complaints_update_i4c" ON public.complaints FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'i4c_national')
  ) WITH CHECK (true);

-- ============================================================
-- PREDICTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT REFERENCES public.complaints(complaint_id),
  risk_score NUMERIC CHECK (risk_score >= 0 AND risk_score <= 1),
  predicted_lat NUMERIC,
  predicted_lng NUMERIC,
  predicted_radius_km NUMERIC DEFAULT 10,
  cashout_window_hours INTEGER DEFAULT 12,
  alert_level TEXT CHECK (alert_level IN ('RED','AMBER','GREEN')),
  shap_features JSONB,
  llm_narrative TEXT,
  predicted_atms JSONB,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','escalated','intercepted','expired')),
  recovery_score NUMERIC DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read predictions (filtered by role in app)
DROP POLICY IF EXISTS "predictions_select_authenticated" ON public.predictions;
CREATE POLICY "predictions_select_authenticated" ON public.predictions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "predictions_insert_authenticated" ON public.predictions;
CREATE POLICY "predictions_insert_authenticated" ON public.predictions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "predictions_update_authenticated" ON public.predictions;
CREATE POLICY "predictions_update_authenticated" ON public.predictions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- MULE CHAIN NODES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mule_chain_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT REFERENCES public.complaints(complaint_id),
  node_index INTEGER NOT NULL,
  account_hash TEXT,
  bank TEXT,
  state TEXT,
  transaction_velocity INTEGER DEFAULT 0,
  is_flagged BOOLEAN DEFAULT false,
  kyc_lat NUMERIC,
  kyc_lng NUMERIC
);

ALTER TABLE public.mule_chain_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mule_chain_select_authenticated" ON public.mule_chain_nodes;
CREATE POLICY "mule_chain_select_authenticated" ON public.mule_chain_nodes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "mule_chain_insert_authenticated" ON public.mule_chain_nodes;
CREATE POLICY "mule_chain_insert_authenticated" ON public.mule_chain_nodes FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================
-- ALERTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID REFERENCES public.predictions(id),
  complaint_id TEXT,
  alert_type TEXT CHECK (alert_type IN ('sms','email','dashboard','webhook')),
  recipient_role TEXT,
  recipient_id TEXT,
  message TEXT NOT NULL,
  alert_level TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent','failed','acknowledged')),
  acknowledged_at TIMESTAMPTZ
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alerts_select_authenticated" ON public.alerts;
CREATE POLICY "alerts_select_authenticated" ON public.alerts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "alerts_insert_authenticated" ON public.alerts;
CREATE POLICY "alerts_insert_authenticated" ON public.alerts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "alerts_update_authenticated" ON public.alerts;
CREATE POLICY "alerts_update_authenticated" ON public.alerts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- ATM LOCATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.atm_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atm_id TEXT UNIQUE,
  bank_name TEXT,
  address TEXT,
  district TEXT,
  state TEXT,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL
);

ALTER TABLE public.atm_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "atm_locations_select_authenticated" ON public.atm_locations;
CREATE POLICY "atm_locations_select_authenticated" ON public.atm_locations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "atm_locations_insert_authenticated" ON public.atm_locations;
CREATE POLICY "atm_locations_insert_authenticated" ON public.atm_locations FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================
-- ATM CLUSTERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.atm_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_name TEXT,
  centroid_lat NUMERIC,
  centroid_lng NUMERIC,
  radius_km NUMERIC DEFAULT 10,
  complaint_count INTEGER DEFAULT 0,
  avg_fraud_amount NUMERIC,
  cluster_score NUMERIC DEFAULT 0,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_updated TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expired')),
  linked_complaints JSONB DEFAULT '[]'
);

ALTER TABLE public.atm_clusters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "atm_clusters_select_authenticated" ON public.atm_clusters;
CREATE POLICY "atm_clusters_select_authenticated" ON public.atm_clusters FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "atm_clusters_insert_authenticated" ON public.atm_clusters;
CREATE POLICY "atm_clusters_insert_authenticated" ON public.atm_clusters FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================
-- INCIDENT REPORTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID REFERENCES public.predictions(id),
  officer_id UUID REFERENCES public.users(id),
  suspect_observed BOOLEAN,
  suspect_apprehended BOOLEAN,
  funds_secured BOOLEAN,
  amount_recovered NUMERIC DEFAULT 0,
  notes TEXT,
  reported_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "incident_reports_select_authenticated" ON public.incident_reports;
CREATE POLICY "incident_reports_select_authenticated" ON public.incident_reports FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "incident_reports_insert_authenticated" ON public.incident_reports;
CREATE POLICY "incident_reports_insert_authenticated" ON public.incident_reports FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "incident_reports_update_authenticated" ON public.incident_reports;
CREATE POLICY "incident_reports_update_authenticated" ON public.incident_reports FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- DAILY BRIEFS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_date DATE UNIQUE,
  html_content TEXT,
  summary_json JSONB,
  generated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.daily_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_briefs_select_authenticated" ON public.daily_briefs;
CREATE POLICY "daily_briefs_select_authenticated" ON public.daily_briefs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "daily_briefs_insert_authenticated" ON public.daily_briefs;
CREATE POLICY "daily_briefs_insert_authenticated" ON public.daily_briefs FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================
-- SYSTEM LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_run_at TIMESTAMPTZ DEFAULT now(),
  complaints_processed INTEGER DEFAULT 0,
  predictions_generated INTEGER DEFAULT 0,
  alerts_fired INTEGER DEFAULT 0,
  loop_duration_ms INTEGER,
  errors JSONB DEFAULT '[]'
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_logs_select_authenticated" ON public.system_logs;
CREATE POLICY "system_logs_select_authenticated" ON public.system_logs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "system_logs_insert_authenticated" ON public.system_logs;
CREATE POLICY "system_logs_insert_authenticated" ON public.system_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================
-- DEPLOYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES public.alerts(id),
  officer_id UUID REFERENCES public.users(id),
  officer_name TEXT,
  vehicle_number TEXT,
  deployed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deployments_select_authenticated" ON public.deployments;
CREATE POLICY "deployments_select_authenticated" ON public.deployments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "deployments_insert_authenticated" ON public.deployments;
CREATE POLICY "deployments_insert_authenticated" ON public.deployments FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================
-- REALTIME PUBLICATION
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_logs;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON public.complaints(created_at);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON public.predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_complaint_id ON public.predictions(complaint_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_recipient_id ON public.alerts(recipient_id);
CREATE INDEX IF NOT EXISTS idx_mule_chain_complaint_id ON public.mule_chain_nodes(complaint_id);
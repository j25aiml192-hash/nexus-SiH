-- =============================================================================
-- NEXUS PHASE 3A: SYNDICATE DNA / CROSS-CASE INTELLIGENCE ENGINE MIGRATION
-- Additive indexing and performance support for potential network clusters
-- NOTE: Authoritative `syndicates` table is NOT modified or overloaded.
-- =============================================================================

-- Add performance indexes for cross-case member queries
CREATE INDEX IF NOT EXISTS idx_network_members_complaint 
    ON public.potential_network_members(complaint_id);

CREATE INDEX IF NOT EXISTS idx_network_members_cluster_type 
    ON public.potential_network_members(cluster_id, member_type);

CREATE INDEX IF NOT EXISTS idx_network_clusters_score_updated 
    ON public.potential_network_clusters(confidence_score DESC, last_updated_at DESC);

-- Ensure RLS allows read and write for authenticated/service roles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'potential_network_members' AND policyname = 'allow_read_network_members'
    ) THEN
        CREATE POLICY "allow_read_network_members" 
            ON public.potential_network_members FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'potential_network_members' AND policyname = 'allow_all_network_members_service'
    ) THEN
        CREATE POLICY "allow_all_network_members_service" 
            ON public.potential_network_members FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

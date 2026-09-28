"""
NEXUS PHASE 3A: SYNDICATE DNA / CROSS-CASE INTELLIGENCE ENGINE
=============================================================
Autonomous cross-case intelligence engine for discovering Potential Shared
Operational Networks across active cases using concrete Truth Graph evidence.

CRITICAL ARCHITECTURAL CONSTRAINTS:
1. SEMANTIC SEPARATION:
   - Discovers "Potential Shared Operational Networks" ONLY.
   - NEVER modifies, writes to, or masquerades as the authoritative `syndicates` table.
   - Never infers or asserts criminal guilt, culpability, or attribution.
2. DETERMINISTIC & EXPLAINABLE:
   - Uses centralized `syndicate_dna_policy.py`.
   - Every relationship is traceable down to specific shared entities or patterns.
3. SCALABILITY:
   - Uses Truth Graph entity indexing for candidate search to prevent O(N^2) scans.
4. PRIVACY:
   - Masked and canonical identifiers only; raw credentials/PINs are never exposed.
"""

from typing import Dict, Any, List, Optional, Set, Tuple
import datetime
import logging
import uuid
import networkx as nx

from db import repo
from core.autonomy.syndicate_dna_policy import (
    compute_structural_similarity,
    SYNDICATE_DNA_POLICY_VERSION,
    SIMILARITY_THRESHOLD_EMERGING,
    SIMILARITY_THRESHOLD_MODERATE,
    SIMILARITY_THRESHOLD_STRONG,
)

logger = logging.getLogger("nexus.autonomy.syndicate_dna_engine")


class SyndicateDNAEngine:
    """
    Autonomous cross-case analysis engine that identifies and clusters
    structurally connected cases into Potential Shared Operational Networks.
    """

    def __init__(self):
        self.policy_version = SYNDICATE_DNA_POLICY_VERSION

    def correlate_case(
        self,
        complaint_id: str,
        trigger_event: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Analyzes an active case against candidate cases connected via Truth Graph entities.
        Creates or updates Potential Shared Operational Network clusters idempotently.
        """
        cid = str(complaint_id)
        case_a = repo.get_complaint_by_id(cid)
        if not case_a:
            logger.debug(f"[Syndicate DNA] Complaint {cid} not found; skipping correlation.")
            return {
                "complaint_id": cid,
                "correlated_cases_count": 0,
                "clusters_updated": [],
                "status": "complaint_not_found",
            }

        # Ensure canonical UUID is used for all graph expansion and cluster operations
        cid = str(case_a.get("complaint_id") or cid)

        # 1. Fetch Truth Graph for Case A
        tg_a = repo.get_truth_graph_for_complaint(cid)
        entities_a = tg_a.get("entities", []) if tg_a else []
        pred_a = repo.get_prediction_by_complaint(cid)

        # 2. Extract Candidate Cases via Shared Infrastructure Entities (O(K) search, NOT O(N^2))
        candidate_case_ids: Set[str] = set()
        shared_entities_map: Dict[str, List[Dict[str, Any]]] = {}

        for ent in entities_a:
            etype = ent.get("entity_type", "").lower()
            eid = ent.get("entity_id")
            # Only connect via concrete operational identifiers
            if etype in ("bank_account", "device", "device_fingerprint", "phone", "phone_number", "ip_address", "ip_subnet"):
                cross_info = repo.get_entity_cross_case_links(eid)
                linked = cross_info.get("linked_complaints", []) if isinstance(cross_info, dict) else cross_info
                for other_cid in linked:
                    other_cid_str = str(other_cid)
                    if other_cid_str != cid:
                        candidate_case_ids.add(other_cid_str)
                        if other_cid_str not in shared_entities_map:
                            shared_entities_map[other_cid_str] = []
                        shared_entities_map[other_cid_str].append(ent)

        if not candidate_case_ids:
            return {
                "complaint_id": cid,
                "correlated_cases_count": 0,
                "clusters_updated": [],
                "status": "no_candidates_found",
            }

        clusters_updated: List[str] = []
        correlations: List[Dict[str, Any]] = []

        # 3. Evaluate Structural Similarity for Each Candidate Pair (bounded to 50 candidates)
        candidates_to_evaluate = sorted(list(candidate_case_ids))[:50]
        for cand_cid in candidates_to_evaluate:
            case_b = repo.get_complaint_by_id(cand_cid)
            if not case_b:
                continue

            tg_b = repo.get_truth_graph_for_complaint(cand_cid)
            entities_b = tg_b.get("entities", []) if tg_b else []
            pred_b = repo.get_prediction_by_complaint(cand_cid)
            shared_ents = shared_entities_map.get(cand_cid, [])

            sim_result = compute_structural_similarity(
                case_a=case_a,
                case_b=case_b,
                entities_a=entities_a,
                entities_b=entities_b,
                shared_entities=shared_ents,
                prediction_a=pred_a,
                prediction_b=pred_b,
                context={"trigger_event": trigger_event},
            )

            # Qualify as a potential shared operational network if emerging threshold is met
            if sim_result["structural_similarity"] >= SIMILARITY_THRESHOLD_EMERGING or len(shared_ents) > 0:
                correlations.append({
                    "target_case_id": cand_cid,
                    "similarity": sim_result,
                })

                # 4. Inferred Cluster Assignment / Consolidation
                # Find if any cluster already contains either complaint or their connecting entities
                shared_eids = [e["entity_id"] for e in shared_ents if e.get("entity_id")]
                existing_cluster_id = repo.find_existing_cluster_for_entities_or_complaints(
                    entity_ids=shared_eids,
                    complaint_ids=[cid, cand_cid],
                )

                if existing_cluster_id:
                    cluster_id = existing_cluster_id
                    cluster = repo.get_potential_network_cluster_by_id(cluster_id)
                else:
                    # Create new Potential Operational Network Cluster candidate
                    top_entity_type = shared_ents[0].get("entity_type", "INFRA").upper() if shared_ents else "STRUCTURAL"
                    cluster_label = f"POTENTIAL-NET-{top_entity_type[:6]}-{cid[:6].upper()}"
                    cluster = repo.create_potential_network_cluster(
                        cluster_label=cluster_label,
                        cluster_type="POTENTIAL_SHARED_INFRASTRUCTURE",
                        status="candidate",
                        confidence_score=sim_result["structural_similarity"],
                        summary_metadata={
                            "policy_version": self.policy_version,
                            "initial_seed_cases": [cid, cand_cid],
                            "initial_relationship_strength": sim_result["relationship_strength"],
                        },
                    )
                    cluster_id = cluster["cluster_id"]

                if cluster_id not in clusters_updated:
                    clusters_updated.append(cluster_id)

                # 5. Add Members Idempotently
                # Member A
                repo.add_potential_network_member(
                    cluster_id=cluster_id,
                    member_type="complaint",
                    complaint_id=cid,
                    evidence_basis=f"SIMILARITY_{sim_result['relationship_strength']}",
                    confidence=sim_result["structural_similarity"],
                    evidence_metadata={
                        "related_case_id": cand_cid,
                        "relationship_types": sim_result["relationship_types"],
                        "contributions": sim_result["similarity_contributions"],
                    },
                )
                # Member B
                repo.add_potential_network_member(
                    cluster_id=cluster_id,
                    member_type="complaint",
                    complaint_id=cand_cid,
                    evidence_basis=f"SIMILARITY_{sim_result['relationship_strength']}",
                    confidence=sim_result["structural_similarity"],
                    evidence_metadata={
                        "related_case_id": cid,
                        "relationship_types": sim_result["relationship_types"],
                        "contributions": sim_result["similarity_contributions"],
                    },
                )
                # Connecting Entity Members
                for ent in shared_ents:
                    repo.add_potential_network_member(
                        cluster_id=cluster_id,
                        member_type="entity",
                        entity_id=ent["entity_id"],
                        evidence_basis=f"SHARED_{ent.get('entity_type', 'INFRASTRUCTURE').upper()}",
                        confidence=1.0,
                        evidence_metadata={
                            "canonical_reference": ent.get("canonical_reference"),
                            "masked_value": ent.get("masked_value"),
                            "entity_type": ent.get("entity_type"),
                        },
                    )

                # 6. Update Cluster Summary Counts & Exposure
                all_members = repo.get_potential_network_members(cluster_id)
                comp_members = [m for m in all_members if m.get("member_type") == "complaint"]
                ent_members = [m for m in all_members if m.get("member_type") == "entity"]

                tot_exposure = 0.0
                for cm in comp_members:
                    comp_obj = repo.get_complaint_by_id(cm["complaint_id"]) if cm.get("complaint_id") else None
                    if comp_obj:
                        tot_exposure += float(comp_obj.get("amount_inr") or 0.0)

                existing_conf = float((cluster or {}).get("confidence_score") or 0.5)
                max_conf = max(existing_conf, sim_result["structural_similarity"])

                repo.update_potential_network_cluster(
                    cluster_id=cluster_id,
                    updates={
                        "supporting_entity_count": len(ent_members),
                        "supporting_complaint_count": len(comp_members),
                        "total_exposure_inr": tot_exposure,
                        "confidence_score": max_conf,
                    },
                )

        # 7. Record Structured Audit Log
        if correlations:
            repo.create_autonomy_audit_log(
                trigger_event_type=trigger_event.get("event_type") if trigger_event else "cross_case_correlation",
                action_type="CORRELATE_POTENTIAL_NETWORK",
                decision_factors={
                    "complaint_id": cid,
                    "correlated_cases_count": len(correlations),
                    "clusters_updated": clusters_updated,
                    "top_relationship_types": [c["similarity"]["relationship_types"] for c in correlations[:3]],
                },
                complaint_id=cid,
                trigger_event_id=trigger_event.get("event_id") if trigger_event else None,
                action_payload={"status": "completed", "clusters_updated": clusters_updated},
                requires_approval=False,
                approval_status="not_required",
            )

        return {
            "complaint_id": cid,
            "correlated_cases_count": len(correlations),
            "clusters_updated": clusters_updated,
            "correlations": correlations,
            "status": "processed",
        }

    def get_cluster_details(self, cluster_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves full details of a Potential Shared Operational Network cluster,
        including members, relationship evidence, and connected cases.
        """
        cluster = repo.get_potential_network_cluster_by_id(cluster_id)
        if not cluster:
            return None

        members = repo.get_potential_network_members(cluster_id)
        complaint_members: List[Dict[str, Any]] = []
        entity_members: List[Dict[str, Any]] = []

        for m in members:
            m_type = m.get("member_type")
            if m_type == "complaint":
                cid = m.get("complaint_id")
                comp = repo.get_complaint_by_id(cid) if cid else None
                complaint_members.append({
                    "membership_id": m.get("id"),
                    "complaint_id": cid,
                    "ncrp_id": comp.get("ncrp_id") if comp else None,
                    "fraud_type": comp.get("fraud_type") if comp else None,
                    "amount_inr": comp.get("amount_inr") if comp else 0.0,
                    "status": comp.get("status") if comp else None,
                    "evidence_basis": m.get("evidence_basis"),
                    "confidence": m.get("confidence"),
                    "evidence_metadata": m.get("evidence_metadata", {}),
                    "joined_at": m.get("joined_at"),
                })
            elif m_type == "entity":
                eid = m.get("entity_id")
                ent = repo.get_truth_entity_by_id(eid) if eid else None
                entity_members.append({
                    "membership_id": m.get("id"),
                    "entity_id": eid,
                    "entity_type": ent.get("entity_type") if ent else "unknown",
                    "canonical_reference": ent.get("canonical_reference") if ent else None,
                    "masked_value": ent.get("masked_value") if ent else None,
                    "evidence_basis": m.get("evidence_basis"),
                    "confidence": m.get("confidence"),
                    "joined_at": m.get("joined_at"),
                })

        return {
            "cluster_id": cluster["cluster_id"],
            "cluster_label": cluster.get("cluster_label"),
            "cluster_type": cluster.get("cluster_type"),
            "status": cluster.get("status"),
            "confidence_score": cluster.get("confidence_score"),
            "supporting_complaint_count": len(complaint_members),
            "supporting_entity_count": len(entity_members),
            "total_exposure_inr": cluster.get("total_exposure_inr", 0.0),
            "summary_metadata": cluster.get("summary_metadata", {}),
            "detected_at": cluster.get("detected_at"),
            "last_updated_at": cluster.get("last_updated_at"),
            "complaint_members": complaint_members,
            "entity_members": entity_members,
        }

    def get_case_syndicates(self, complaint_id: str) -> Dict[str, Any]:
        """
        Retrieves all Potential Shared Operational Networks and direct structural
        correlations for a given case.
        """
        cid = str(complaint_id)
        clusters = repo.get_potential_network_clusters_for_complaint(cid)
        tg = repo.get_truth_graph_for_complaint(cid)
        entities = tg.get("entities", []) if tg else []

        related_cases: List[Dict[str, Any]] = []
        seen_case_ids: Set[str] = set()

        for ent in entities:
            eid = ent.get("entity_id")
            if not eid:
                continue
            cross = repo.get_entity_cross_case_links(eid)
            linked = cross.get("linked_complaints", []) if isinstance(cross, dict) else cross
            for other_cid in linked:
                other_cid_str = str(other_cid)
                if other_cid_str != cid and other_cid_str not in seen_case_ids:
                    seen_case_ids.add(other_cid_str)
                    other_comp = repo.get_complaint_by_id(other_cid_str)
                    related_cases.append({
                        "complaint_id": other_cid_str,
                        "ncrp_id": other_comp.get("ncrp_id") if other_comp else None,
                        "fraud_type": other_comp.get("fraud_type") if other_comp else None,
                        "amount_inr": other_comp.get("amount_inr") if other_comp else 0.0,
                        "shared_entity": {
                            "entity_type": ent.get("entity_type"),
                            "canonical_reference": ent.get("canonical_reference"),
                            "masked_value": ent.get("masked_value"),
                        },
                    })

        return {
            "complaint_id": cid,
            "clusters_count": len(clusters),
            "clusters": clusters,
            "related_cases_count": len(related_cases),
            "related_cases": related_cases,
        }

    def expand_case_network(
        self,
        complaint_id: str,
        depth: int = 1,
        max_nodes: int = 50,
    ) -> Dict[str, Any]:
        """
        Performs bounded relationship traversal (depth 1 or depth 2) starting from
        the target case, returning a NetworkX-derived graph structure.
        """
        cid = str(complaint_id)
        target_comp = repo.get_complaint_by_id(cid)
        if not target_comp:
            return {"nodes": [], "edges": [], "depth": depth, "total_cases": 0}

        graph = nx.Graph()
        visited_cases: Set[str] = {cid}
        current_layer_cases: List[str] = [cid]

        # Add root case node
        graph.add_node(
            f"case:{cid}",
            id=cid,
            node_type="complaint",
            label=target_comp.get("ncrp_id") or cid[:8],
            fraud_type=target_comp.get("fraud_type"),
            amount_inr=target_comp.get("amount_inr", 0.0),
            is_root=True,
        )

        actual_depth = min(2, max(1, depth))

        for current_d in range(actual_depth):
            next_layer_cases: List[str] = []
            for case_in_layer in current_layer_cases:
                tg = repo.get_truth_graph_for_complaint(case_in_layer)
                ents = tg.get("entities", []) if tg else []

                for ent in ents:
                    eid = ent.get("entity_id")
                    etype = ent.get("entity_type", "")
                    if etype.lower() == "complaint":
                        continue

                    ent_node_id = f"entity:{eid}"
                    if not graph.has_node(ent_node_id):
                        if graph.number_of_nodes() >= max_nodes:
                            break
                        graph.add_node(
                            ent_node_id,
                            id=eid,
                            node_type="entity",
                            entity_type=etype,
                            canonical_reference=ent.get("canonical_reference"),
                            masked_value=ent.get("masked_value"),
                            label=ent.get("masked_value") or ent.get("canonical_reference"),
                        )

                    # Edge between case and entity
                    graph.add_edge(
                        f"case:{case_in_layer}",
                        ent_node_id,
                        edge_type="APPEARED_IN",
                        weight=1.0,
                    )

                    # Find other cases connected via this entity
                    cross = repo.get_entity_cross_case_links(eid)
                    linked = cross.get("linked_complaints", []) if isinstance(cross, dict) else cross
                    for nbr_cid in linked:
                        nbr_cid_str = str(nbr_cid)
                        nbr_node_id = f"case:{nbr_cid_str}"

                        if not graph.has_node(nbr_node_id):
                            if graph.number_of_nodes() >= max_nodes:
                                break
                            nbr_comp = repo.get_complaint_by_id(nbr_cid_str)
                            graph.add_node(
                                nbr_node_id,
                                id=nbr_cid_str,
                                node_type="complaint",
                                label=nbr_comp.get("ncrp_id") if nbr_comp else nbr_cid_str[:8],
                                fraud_type=nbr_comp.get("fraud_type") if nbr_comp else None,
                                amount_inr=nbr_comp.get("amount_inr", 0.0) if nbr_comp else 0.0,
                                is_root=False,
                            )

                        graph.add_edge(
                            nbr_node_id,
                            ent_node_id,
                            edge_type="SHARED_INFRASTRUCTURE",
                            weight=1.0,
                        )

                        if nbr_cid_str not in visited_cases:
                            visited_cases.add(nbr_cid_str)
                            next_layer_cases.append(nbr_cid_str)

            current_layer_cases = next_layer_cases

        # Build output structure
        nodes = []
        for n_id, attrs in graph.nodes(data=True):
            node_dict = dict(attrs)
            node_dict["key"] = n_id
            nodes.append(node_dict)

        edges = []
        for u, v, attrs in graph.edges(data=True):
            edge_dict = dict(attrs)
            edge_dict["source"] = u
            edge_dict["target"] = v
            edges.append(edge_dict)

        total_cases = len([n for n in nodes if n.get("node_type") == "complaint"])

        return {
            "root_complaint_id": cid,
            "depth": actual_depth,
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "total_cases": total_cases,
            "nodes": nodes,
            "edges": edges,
        }

    def get_clusters_list(
        self,
        limit: int = 50,
        offset: int = 0,
        cluster_type: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Returns a paginated list of Potential Shared Operational Network clusters.
        """
        all_clusters = repo.get_potential_network_clusters(limit=limit + offset, status=status)
        if cluster_type:
            all_clusters = [c for c in all_clusters if c.get("cluster_type") == cluster_type]

        paginated = all_clusters[offset : offset + limit]
        return {
            "total": len(all_clusters),
            "limit": limit,
            "offset": offset,
            "clusters": paginated,
        }


# Singleton instance
syndicate_dna_engine = SyndicateDNAEngine()

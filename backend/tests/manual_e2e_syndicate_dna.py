"""
NEXUS PHASE 3A: SYNDICATE DNA / CROSS-CASE INTELLIGENCE ENGINE E2E VERIFICATION
=============================================================================
Demonstrates live end-to-end cross-case correlation:
1. Create Case A
2. Create Case B sharing deterministic infrastructure
3. Emit/process relevant events through CaseWatcher
4. Verify relationship discovered & explainable evidence
5. Verify potential cluster created with complaint & entity members
6. Create unrelated Case C with different infrastructure
7. Verify Case C does NOT get incorrectly linked
8. Expand Case A network to depth 2 (discovering Case D linked via Case B)
9. Verify bounded traversal constraints
10. Verify authoritative `syndicates` table remains untouched
11. End with: SUCCESS: NEXUS PHASE 3A SYNDICATE DNA E2E VERIFIED
"""

import os
import sys
import uuid
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from db import repo
from core.autonomy.case_watcher import case_watcher
from core.autonomy.syndicate_dna_engine import syndicate_dna_engine


def run_manual_e2e():
    print("=" * 70)
    print("NEXUS PHASE 3A: SYNDICATE DNA / CROSS-CASE INTELLIGENCE ENGINE E2E")
    print("=" * 70)

    # Baseline check: Authoritative Syndicates table
    conn = repo.get_connection()
    c = conn.cursor()
    c.execute("SELECT count(*) FROM syndicates")
    syndicates_count_initial = c.fetchone()[0]
    conn.close()
    print(f"\n[Baseline Audit] Authoritative `syndicates` table record count: {syndicates_count_initial}")

    # 1. Create Case A
    suffix = uuid.uuid4().hex[:6].upper()
    cid_a = str(uuid.uuid4())
    ncrp_a = f"NCRP-DNA-{suffix}-A"
    c_a = repo.create_complaint({
        "complaint_id": cid_a,
        "ncrp_id": ncrp_a,
        "fraud_type": "UPI_FRAUD",
        "amount_inr": 350000.0,
        "victim_state": "Maharashtra",
        "victim_district": "Mumbai City",
        "channel": "UPI",
        "status": "active",
    })
    print(f"\n[1] Case A created: {cid_a} | NCRP: {ncrp_a}")

    # 2. Create Case B sharing a deterministic bank account entity
    cid_b = str(uuid.uuid4())
    ncrp_b = f"NCRP-DNA-{suffix}-B"
    c_b = repo.create_complaint({
        "complaint_id": cid_b,
        "ncrp_id": ncrp_b,
        "fraud_type": "UPI_FRAUD",
        "amount_inr": 420000.0,
        "victim_state": "Maharashtra",
        "victim_district": "Pune",
        "channel": "UPI",
        "status": "active",
    })
    print(f"[2] Case B created: {cid_b} | NCRP: {ncrp_b}")

    # Resolve shared bank account in Truth Graph
    shared_account_num = f"SBI-998877{suffix}-INDIA"
    ent_account = repo.create_or_get_truth_entity("bank_account", shared_account_num)
    ent_acc_id = ent_account["entity_id"]

    comp_a_ent = repo.create_or_get_truth_entity("complaint", cid_a)
    comp_b_ent = repo.create_or_get_truth_entity("complaint", cid_b)

    repo.create_truth_relation(
        source_entity_id=ent_acc_id,
        target_entity_id=comp_a_ent["entity_id"],
        relation_type="APPEARED_IN_COMPLAINT",
        complaint_id=cid_a,
        source_record_type="complaints",
        source_record_id=f"{cid_a}_{ent_acc_id}",
    )
    repo.create_truth_relation(
        source_entity_id=ent_acc_id,
        target_entity_id=comp_b_ent["entity_id"],
        relation_type="APPEARED_IN_COMPLAINT",
        complaint_id=cid_b,
        source_record_type="complaints",
        source_record_id=f"{cid_b}_{ent_acc_id}",
    )
    print(f" -> Shared infrastructure linked: Bank Account {ent_account['masked_value']} ({ent_account['canonical_reference']})")

    # 3. Emit autonomy event & run CaseWatcher
    print("\n[3] Emitting autonomy event & processing via CaseWatcher...")
    evt = repo.create_autonomy_event(
        event_type="evidence_updated",
        entity_type="complaint",
        entity_id=cid_a,
        complaint_id=cid_a,
        payload={"evidence_type": "bank_account", "action": "linked"},
        idempotency_key=f"evt:e2e:dna:{cid_a}",
    )
    case_watcher.run_cycle(batch_size=10)

    # 4. Verify cross-case correlation discovered
    res_a = syndicate_dna_engine.correlate_case(cid_a)
    print(f"\n[4] Case A correlation evaluated: Status = {res_a['status']} | Discovered cases = {res_a['correlated_cases_count']}")
    assert res_a["correlated_cases_count"] >= 1
    assert len(res_a["clusters_updated"]) > 0

    cluster_id = res_a["clusters_updated"][0]
    cluster_details = syndicate_dna_engine.get_cluster_details(cluster_id)
    print(f"\n[5] Potential Shared Operational Network Cluster:")
    print(f" -> Cluster ID:     {cluster_details['cluster_id']}")
    print(f" -> Cluster Label:  {cluster_details['cluster_label']}")
    print(f" -> Cluster Type:   {cluster_details['cluster_type']}")
    print(f" -> Status:         {cluster_details['status']}")
    print(f" -> Confidence:     {cluster_details['confidence_score']:.2f}")
    print(f" -> Member Cases:   {cluster_details['supporting_complaint_count']}")
    print(f" -> Member Entities: {cluster_details['supporting_entity_count']}")
    print(f" -> Total Exposure: INR {cluster_details['total_exposure_inr']:,.2f}")

    assert cluster_details["supporting_complaint_count"] >= 2
    assert cluster_details["supporting_entity_count"] >= 1

    # Verify explainable evidence
    comp_ids_in_cluster = {m["complaint_id"] for m in cluster_details["complaint_members"]}
    assert cid_a in comp_ids_in_cluster
    assert cid_b in comp_ids_in_cluster

    # 6. Create unrelated Case C
    cid_c = str(uuid.uuid4())
    ncrp_c = f"NCRP-DNA-{suffix}-C"
    c_c = repo.create_complaint({
        "complaint_id": cid_c,
        "ncrp_id": ncrp_c,
        "fraud_type": "JOB_OFFER_SCAM",
        "amount_inr": 25000.0,
        "victim_state": "Karnataka",
        "victim_district": "Bengaluru Urban",
        "channel": "NETBANKING",
        "status": "active",
    })
    unrelated_account = f"HDFC-ISOLATED-{suffix}"
    ent_c_acc = repo.create_or_get_truth_entity("bank_account", unrelated_account)
    comp_c_ent = repo.create_or_get_truth_entity("complaint", cid_c)
    repo.create_truth_relation(
        source_entity_id=ent_c_acc["entity_id"],
        target_entity_id=comp_c_ent["entity_id"],
        relation_type="APPEARED_IN_COMPLAINT",
        complaint_id=cid_c,
        source_record_type="complaints",
        source_record_id=f"{cid_c}_{ent_c_acc['entity_id']}",
    )
    print(f"\n[6] Unrelated Case C created: {cid_c} | NCRP: {ncrp_c}")

    res_c = syndicate_dna_engine.correlate_case(cid_c)
    print(f" -> Case C correlation count: {res_c['correlated_cases_count']}")
    assert res_c["correlated_cases_count"] == 0, "Case C must not link to Case A or B!"

    # 7. Add Case D linked to Case B via Device to test 2-hop bounded expansion
    cid_d = str(uuid.uuid4())
    ncrp_d = f"NCRP-DNA-{suffix}-D"
    c_d = repo.create_complaint({
        "complaint_id": cid_d,
        "ncrp_id": ncrp_d,
        "fraud_type": "UPI_FRAUD",
        "amount_inr": 180000.0,
        "victim_state": "Maharashtra",
        "channel": "UPI",
        "status": "active",
    })
    shared_device = f"DEV-IMEI-{suffix}-9988"
    ent_device = repo.create_or_get_truth_entity("device", shared_device)
    comp_d_ent = repo.create_or_get_truth_entity("complaint", cid_d)

    repo.create_truth_relation(
        source_entity_id=ent_device["entity_id"],
        target_entity_id=comp_b_ent["entity_id"],
        relation_type="APPEARED_IN_COMPLAINT",
        complaint_id=cid_b,
        source_record_type="complaints",
        source_record_id=f"{cid_b}_{ent_device['entity_id']}",
    )
    repo.create_truth_relation(
        source_entity_id=ent_device["entity_id"],
        target_entity_id=comp_d_ent["entity_id"],
        relation_type="APPEARED_IN_COMPLAINT",
        complaint_id=cid_d,
        source_record_type="complaints",
        source_record_id=f"{cid_d}_{ent_device['entity_id']}",
    )
    print(f"\n[7] Case D created and linked to Case B via Device {ent_device['masked_value']}")

    # 8. Test Bounded Graph Expansion
    print("\n[8] Testing Bounded Graph Expansion:")
    exp_d1 = syndicate_dna_engine.expand_case_network(cid_a, depth=1)
    case_ids_d1 = {n["id"] for n in exp_d1["nodes"] if n.get("node_type") == "complaint"}
    print(f" -> Depth 1 from Case A: Found {len(case_ids_d1)} cases {case_ids_d1}")
    assert cid_a in case_ids_d1
    assert cid_b in case_ids_d1
    assert cid_d not in case_ids_d1, "Depth 1 must NOT traverse beyond 1 hop!"
    assert cid_c not in case_ids_d1

    exp_d2 = syndicate_dna_engine.expand_case_network(cid_a, depth=2)
    case_ids_d2 = {n["id"] for n in exp_d2["nodes"] if n.get("node_type") == "complaint"}
    print(f" -> Depth 2 from Case A: Found {len(case_ids_d2)} cases {case_ids_d2}")
    assert cid_a in case_ids_d2
    assert cid_b in case_ids_d2
    assert cid_d in case_ids_d2, "Depth 2 must discover Case D connected via Case B!"
    assert cid_c not in case_ids_d2, "Unrelated Case C must NEVER be linked!"

    # 9. Verify Authoritative Syndicates table is untouched
    conn = repo.get_connection()
    c = conn.cursor()
    c.execute("SELECT count(*) FROM syndicates")
    syndicates_count_final = c.fetchone()[0]
    conn.close()
    print(f"\n[9] Authoritative Syndicates record check: {syndicates_count_initial} -> {syndicates_count_final}")
    assert syndicates_count_initial == syndicates_count_final, "Authoritative syndicates table must remain strictly untouched!"

    # 10. Privacy check
    for n in exp_d2["nodes"]:
        if n.get("node_type") == "entity":
            assert n.get("masked_value") is not None
            assert n.get("canonical_reference") is not None

    print("\n" + "=" * 70)
    print("SUCCESS: NEXUS PHASE 3A SYNDICATE DNA E2E VERIFIED")
    print("=" * 70)


if __name__ == "__main__":
    run_manual_e2e()

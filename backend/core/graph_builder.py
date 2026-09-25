import networkx as nx
from db.supabase_client import supabase
from db import repo


def build_graph(complaint_id: str):
    complaint = repo.get_complaint_by_id(complaint_id)
    if not complaint:
        try:
            complaints_res = supabase.table("complaints").select("*").eq("complaint_id", complaint_id).single().execute()
            complaint = complaints_res.data
        except Exception:
            complaint = None
    
    if not complaint:
        print(f"complaint with id {complaint_id} not found")
        return None

    chain_info = repo.get_mule_chain(complaint_id)
    mule_data = chain_info.get("mule_nodes") or []
    if not mule_data:
        try:
            mule_res = supabase.table("mule_chain_nodes").select("*").eq("complaint_id", complaint_id).execute()
            mule_data = mule_res.data or []
        except Exception:
            mule_data = []
    
    graph = nx.DiGraph()
    victim_node = f"victim:{complaint_id}"
    graph.add_node(
        victim_node,
        type="victim",
        state=complaint.get("victim_state"),
        district=complaint.get("victim_district"),
    )

    previous_node = victim_node
    for idx, mule in enumerate(mule_data):
        node_idx = mule.get("node_index") if mule.get("node_index") is not None else mule.get("hop_position", idx)
        mule_node = f"mule:{node_idx}"
        graph.add_node(
            mule_node,
            type="mule",
            account_hash=mule.get("account_hash") or mule.get("account_id"),
            bank=mule.get("bank") or mule.get("bank_name"),
            state=mule.get("state"),
            transaction_velocity=(
                mule.get("transaction_velocity") or 0
            ),
            lat=mule.get("kyc_lat"),
            lng=mule.get("kyc_lng"),
        )
        graph.add_edge(
            previous_node,
            mule_node
        )

        previous_node = mule_node
    cashout_node = f"cashout:{complaint_id}"
    graph.add_node(
        cashout_node,
        type="cashout"
    )
    graph.add_edge(
        previous_node,
        cashout_node
    )
    
    chain_depth = len(mule_data)

    transaction_velocity = sum(
        mule.get("transaction_velocity") or 0
        for mule in mule_data
    )
    
    predicted_lat = None
    predicted_lng = None

    if mule_data:
        last_mule = mule_data[-1]

        predicted_lat = last_mule.get("kyc_lat")
        predicted_lng = last_mule.get("kyc_lng") if last_mule.get("kyc_lng") is not None else last_mule.get("kyc_lon")

    return {
        "complaint": complaint,
        "mule_nodes": mule_data,
        "graph": graph,
        "chain_depth": chain_depth,
        "transaction_velocity": transaction_velocity,
        "predicted_lat": predicted_lat,
        "predicted_lng": predicted_lng,
    }
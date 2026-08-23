import networkx as nx
from db.supabase_client import supabase


def build_graph(complaint_id: str):
    complaints_res = supabase.table("complaints").select("*").eq("complaint_id", complaint_id).single().execute()
    complaint = complaints_res.data
    
    if not complaint:
        print("ERROR1")
        return

    mule_res = supabase.table("mule_chain_nodes").select("*").eq("complaint_id", complaint_id).execute()
    mule_data = mule_res.data or []
    
    graph = nx.DiGraph()
    victim_node = f"victim:{complaint_id}"
    graph.add_node(
        victim_node,
        type="victim",
        state=complaint.get("victim_state"),
        district=complaint.get("victim_district"),
    )

    previous_node = victim_node
    for mule in mule_data:
        mule_node = f"mule:{mule["node_index"]}"
        graph.add_node(
            mule_node,
            type="mule",
            account_hash=mule.get("account_hash"),
            bank=mule.get("bank"),
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
        predicted_lng = last_mule.get("kyc_lng")

    return {
        "complaint": complaint,
        "mule_nodes": mule_data,
        "graph": graph,
        "chain_depth": chain_depth,
        "transaction_velocity": transaction_velocity,
        "predicted_lat": predicted_lat,
        "predicted_lng": predicted_lng,
    }
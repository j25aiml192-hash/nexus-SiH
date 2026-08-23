from db.supabase_client import supabase
from core.pipeline import run_pipeline

# complaint = {
#     "complaint_id": "CMP-0001",
#     "fraud_type": "digital_arrest",
#     "amount": 250000,
#     "filed_at": "2026-08-23T14:30:00+05:30",
#     "victim_state": "Uttar Pradesh",
#     "victim_district": "Ghaziabad",
#     "accused_phone_prefix": "0651",
#     "accused_bank": "State Bank Of India",
#     "accused_account_hash": "a8f31c92e71d4b6f",
#     "mule_chain_depth": 3,
#     "status": "pending"
# }

# mule_nodes = [

#     {
#         "complaint_id": "CMP-0001",
#         "node_index": 0,
#         "account_hash": "mule_a8f31c",
#         "bank": "State Bank Of India",
#         "state": "Uttar Pradesh",
#         "transaction_velocity": 12,
#         "is_flagged": True,
#         "kyc_lat": 27.1767,
#         "kyc_lng": 78.0081
#     },

#     {
#         "complaint_id": "CMP-0001",
#         "node_index": 1,
#         "account_hash": "mule_b72d91",
#         "bank": "Punjab National Bank",
#         "state": "Rajasthan",
#         "transaction_velocity": 18,
#         "is_flagged": True,
#         "kyc_lat": 27.2150,
#         "kyc_lng": 77.4977
#     },

#     {
#         "complaint_id": "CMP-0001",
#         "node_index": 2,
#         "account_hash": "mule_c91e42",
#         "bank": "State Bank Of India",
#         "state": "Rajasthan",
#         "transaction_velocity": 25,
#         "is_flagged": True,
#         "kyc_lat": 27.1780,
#         "kyc_lng": 77.4400
#     }

# ]

# supabase.table("complaints").insert(complaint).execute()

# supabase.table("mule_chain_nodes").insert(mule_nodes).execute()

# print(predict("CMP-0001"))
run_pipeline("CMP-0001")

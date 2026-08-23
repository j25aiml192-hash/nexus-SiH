from db.supabase_client import supabase


response = supabase.table("atm_locations").select("*").execute()

print("Supabase connection successful!")
print("Rows:", len(response.data))  
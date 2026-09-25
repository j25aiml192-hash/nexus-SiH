import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

class DummySupabaseTable:
    def select(self, *args, **kwargs): return self
    def eq(self, *args, **kwargs): return self
    def single(self, *args, **kwargs): return self
    def execute(self, *args, **kwargs): raise Exception("Supabase not configured")
    def upsert(self, *args, **kwargs): return self
    def insert(self, *args, **kwargs): return self

class DummySupabaseClient:
    def table(self, name: str):
        return DummySupabaseTable()

try:
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    else:
        supabase = DummySupabaseClient()
except Exception:
    supabase = DummySupabaseClient()
import os
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

logger = logging.getLogger("nexus.db")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
NEXUS_ENV = os.getenv("NEXUS_ENV", "development").strip().lower()

class DummySupabaseTable:
    def __init__(self, table_name: str = ""):
        self.table_name = table_name

    def select(self, *args, **kwargs): return self
    def eq(self, *args, **kwargs): return self
    def in_(self, *args, **kwargs): return self
    def order(self, *args, **kwargs): return self
    def limit(self, *args, **kwargs): return self
    def single(self, *args, **kwargs): return self
    def upsert(self, *args, **kwargs): return self
    def insert(self, *args, **kwargs): return self
    def update(self, *args, **kwargs): return self
    def delete(self, *args, **kwargs): return self

    def execute(self, *args, **kwargs):
        if NEXUS_ENV == "production":
            error_msg = (
                f"[PRODUCTION ERROR] Supabase query executed on table '{self.table_name}' "
                f"but Supabase is unconfigured or unreachable. Silent fallback is disabled in production."
            )
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        raise RuntimeError(f"Supabase not configured in development (table: {self.table_name})")

class DummySupabaseClient:
    def table(self, name: str):
        return DummySupabaseTable(name)

# Initialize Supabase client
if NEXUS_ENV == "production":
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        error_msg = (
            "[PRODUCTION ERROR] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in production environment. "
            "Real database connection is required."
        )
        logger.error(error_msg)
        # In production, do not create silent fallback
        supabase = DummySupabaseClient()
    else:
        try:
            supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
            logger.info("Connected to Supabase in production mode.")
        except Exception as e:
            logger.error(f"[PRODUCTION ERROR] Failed to initialize Supabase client: {e}")
            raise RuntimeError(f"Failed to connect to Supabase in production: {e}") from e
else:
    # Development / local mode with graceful fallback
    try:
        if SUPABASE_URL and SUPABASE_SERVICE_KEY:
            supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        else:
            supabase = DummySupabaseClient()
    except Exception as e:
        logger.warning(f"Could not initialize Supabase client in development: {e}")
        supabase = DummySupabaseClient()
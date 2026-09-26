import os
import sys
import unittest
from unittest.mock import patch

# Configure production environment
os.environ["NEXUS_ENV"] = "production"
os.environ["FRONTEND_ORIGIN"] = "https://nexus-rouge-nu.vercel.app"
os.environ["ENABLE_AUTOSIM"] = "false"
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app
from db import repo


class TestProductionWiring(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.origin = "https://nexus-rouge-nu.vercel.app"

    def test_health_endpoint(self):
        r = self.client.get("/health", headers={"Origin": self.origin})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers.get("access-control-allow-origin"), self.origin)
        self.assertEqual(r.json(), {"status": "ok"})

    def test_complaints_list_production(self):
        r = self.client.get("/complaints/list", headers={"Origin": self.origin})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers.get("access-control-allow-origin"), self.origin)
        data = r.json()
        self.assertIsInstance(data, list)

    def test_predictions_heatmap_production(self):
        r = self.client.get("/predictions/heatmap", headers={"Origin": self.origin})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers.get("access-control-allow-origin"), self.origin)
        data = r.json()
        self.assertIsInstance(data, list)

    def test_alerts_feed_production(self):
        r = self.client.get("/alerts/feed", headers={"Origin": self.origin})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers.get("access-control-allow-origin"), self.origin)
        data = r.json()
        self.assertIsInstance(data, list)

    def test_dashboard_stats_production(self):
        r = self.client.get("/dashboard/stats", headers={"Origin": self.origin})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers.get("access-control-allow-origin"), self.origin)
        data = r.json()
        self.assertIn("kpis", data)
        self.assertIn("riskBreakdown", data)

    def test_complaints_fails_safely_without_silent_fallback(self):
        with patch("db.supabase_client.supabase.table", side_effect=RuntimeError("Supabase connection timeout")):
            r = self.client.get("/complaints/list", headers={"Origin": self.origin})
            self.assertEqual(r.status_code, 500)
            self.assertEqual(r.headers.get("access-control-allow-origin"), self.origin)
            self.assertIn("Database query error", r.json().get("detail", ""))


if __name__ == "__main__":
    unittest.main()

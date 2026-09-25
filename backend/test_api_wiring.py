import requests
import json

BASE = "http://127.0.0.1:8000"

import traceback

def test(name, fn):
    try:
        fn()
        print(f"PASS: {name}")
    except Exception as e:
        print(f"FAIL: {name} -> {e}")
        traceback.print_exc()

def t_complaints():
    r = requests.get(f"{BASE}/complaints/list")
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    data = r.json()
    assert len(data) > 0, "No complaints returned"
    print(f"  Total complaints: {len(data)}")

def t_complaint_detail():
    r = requests.get(f"{BASE}/complaints/CMP-2026-9081")
    assert r.status_code == 200
    assert r.json()["complaint_id"] == "CMP-2026-9081"

def t_prediction():
    r = requests.get(f"{BASE}/predictions/CMP-2026-9081")
    assert r.status_code == 200
    p = r.json()
    assert "predicted_lat" in p and "predicted_lon" in p
    print(f"  CMP-9081 coords: {p['predicted_lat']}, {p['predicted_lon']}")
    r2 = requests.get(f"{BASE}/predictions/CMP-2026-8821")
    assert r2.status_code == 200
    p2 = r2.json()
    print(f"  CMP-8821 coords: {p2['predicted_lat']}, {p2['predicted_lon']}")
    assert (p["predicted_lat"], p["predicted_lon"]) != (p2["predicted_lat"], p2["predicted_lon"]), "Stale prediction coordinates!"

def t_mule():
    r = requests.get(f"{BASE}/mule/CMP-2026-9081")
    assert r.status_code == 200
    chain = r.json()
    assert "nodes" in chain and "edges" in chain
    print(f"  Mule nodes: {len(chain['nodes'])}, edges: {len(chain['edges'])}")

def t_heatmap():
    r = requests.get(f"{BASE}/predictions/heatmap")
    assert r.status_code == 200
    pts = r.json()
    assert len(pts) > 0
    print(f"  Heatmap points: {len(pts)}")

def t_atms():
    r = requests.get(f"{BASE}/atms/")
    assert r.status_code == 200
    atms = r.json()
    assert len(atms) > 0
    print(f"  Total ATMs: {len(atms)}")

def t_alerts_and_assign():
    r = requests.get(f"{BASE}/alerts/feed")
    assert r.status_code == 200
    alerts = r.json()
    assert len(alerts) > 0
    aid = alerts[0]["alert_id"]
    r_assign = requests.post(f"{BASE}/alerts/{aid}/assign", json={"officer_name": "Inspector Vikram Rao"})
    assert r_assign.status_code == 200
    assert r_assign.json()["assigned_officer"] == "Inspector Vikram Rao"

def t_incidents():
    r = requests.get(f"{BASE}/incidents/list")
    assert r.status_code == 200
    incs = r.json()
    assert len(incs) > 0
    iid = incs[0]["incident_id"]
    r_auth = requests.post(f"{BASE}/incidents/{iid}/authorize", json={"officer_name": "Superintendent Sharma"})
    assert r_auth.status_code == 200
    r_note = requests.post(f"{BASE}/incidents/{iid}/notes", json={"note": "Tactical freeze initiated under Sec 102."})
    assert r_note.status_code == 200

def t_dashboard():
    r = requests.get(f"{BASE}/dashboard/stats")
    assert r.status_code == 200
    stats = r.json()
    assert "kpis" in stats and "riskBreakdown" in stats
    safe_kpis = str(stats['kpis']).encode('ascii', 'ignore').decode('ascii')
    print(f"  KPIs: {safe_kpis}")

def t_ingest():
    import uuid
    cid = f"CMP-TEST-{uuid.uuid4().hex[:6].upper()}"
    payload = {
        "complaint_id": cid,
        "victim_name": "Rohan Deshmukh",
        "fraud_type": "investment",
        "amount": 250000.0,
        "victim_lat": 18.5204,
        "victim_lon": 73.8567,
        "bank": "HDFC",
        "account_number": "ACC-MULE-8831",
        "ifsc": "HDFC0001234",
        "description": "Telegram fake trading task fraud with mule diversion."
    }
    r = requests.post(f"{BASE}/complaints/ingest", json=payload)
    assert r.status_code == 200, f"Ingest failed: {r.status_code} {r.text}"
    res = r.json()
    print(f"  Ingest response: {res.get('complaint_id')}, risk: {res.get('risk_score')}")

if __name__ == "__main__":
    test("Complaints List", t_complaints)
    test("Complaint Detail", t_complaint_detail)
    test("Prediction Differences", t_prediction)
    test("Mule Chain", t_mule)
    test("Heatmap Points", t_heatmap)
    test("ATMs", t_atms)
    test("Alerts & Assign", t_alerts_and_assign)
    test("Incidents Workflow", t_incidents)
    test("Dashboard Stats", t_dashboard)
    test("Live Ingest Pipeline", t_ingest)

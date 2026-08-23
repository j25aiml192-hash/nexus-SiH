import os
import anthropic
from dotenv import load_dotenv
load_dotenv()

def generate_narrative(complaint: dict, prediction: dict, location: dict) -> str:
    try:
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        system = (
            "You are an intelligence analyst at I4C, India's cybercrime "
            "coordination centre. Write a 3-sentence alert for a state police "
            "officer. Be specific. Use exact numbers. Name the district and "
            "time window. No jargon. No bullet points. Plain paragraph only."
        )
        user = (
            f"Fraud type: {complaint.get('fraud_type')}. "
            f"Amount: Rs {complaint.get('amount')}. "
            f"Risk score: {prediction.get('risk_score', 0):.2f}. "
            f"Alert level: {prediction.get('alert_level')}. "
            f"Predicted cash-out district: {location.get('predicted_district')}, "
            f"{location.get('predicted_state')}. "
            f"Cash-out window: {prediction.get('cashout_window_hours')} hours. "
            f"Mule hops: {prediction.get('mule_chain_depth', 2)}."
        )
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=200,
            system=system,
            messages=[{"role": "user", "content": user}]
        )
        return response.content[0].text
    except Exception as e:
        print(f"Narrator error: {e}")
        return (
            f"High-risk {complaint.get('fraud_type')} case. "
            f"Predicted cash-out in {location.get('predicted_district')} "
            f"within {prediction.get('cashout_window_hours')} hours. "
            f"Risk score: {prediction.get('risk_score', 0):.2f}. "
            f"Deploy ATM surveillance immediately."
        )

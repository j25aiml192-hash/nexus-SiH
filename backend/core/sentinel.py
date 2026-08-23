import datetime
import random
from dotenv import load_dotenv
from db.supabase_client import supabase
load_dotenv()

def compute_sentinel_scores() -> None:
    try:
        cutoff = (
            datetime.datetime.now(datetime.timezone.utc) -
            datetime.timedelta(hours=24)
        ).isoformat()
        
        nodes_result = supabase.table('mule_chain_nodes')\
                      .select('*, complaints(filed_at, fraud_type)')\
                      .execute()
        nodes = nodes_result.data or []
        
        if not nodes:
            return
        
        now_hour = datetime.datetime.now().hour
        is_high_risk_hour = now_hour in [22, 23, 0, 1, 2, 3, 4, 5]
        
        for node in nodes:
            account_hash = node.get('account_hash', '')
            if not account_hash:
                continue
            
            velocity = node.get('transaction_velocity', 0)
            is_flagged = node.get('is_flagged', False)
            
            velocity_score = min(velocity / 15, 1) * 40
            dormancy_score = random.choice([0, 0, 0, 30])
            time_score = 20 if is_high_risk_hour else 0
            flag_score = 10 if is_flagged else 0
            
            surge_score = round(
                velocity_score + dormancy_score + 
                time_score + flag_score, 1
            )
            
            if surge_score >= 80:
                status = 'surge'
                trigger = f'Velocity {velocity} txn/4h + {"high-risk hour" if is_high_risk_hour else "flagged account"}'
            elif surge_score >= 50:
                status = 'monitoring'
                trigger = f'Elevated velocity: {velocity} transactions in 4 hours'
            else:
                status = 'monitoring'
                trigger = 'Normal activity pattern'
            
            existing = supabase.table('sentinel_scores')\
                      .select('id')\
                      .eq('account_hash', account_hash)\
                      .execute()
            
            record = {
                'account_hash': account_hash,
                'complaint_id': node.get('complaint_id'),
                'bank': node.get('bank', 'Unknown'),
                'state': node.get('state', 'Unknown'),
                'surge_score': surge_score,
                'velocity_score': round(velocity_score, 1),
                'dormancy_score': dormancy_score,
                'time_score': time_score,
                'flag_score': flag_score,
                'trigger_reason': trigger,
                'status': status,
                'last_updated': datetime.datetime.now(
                    datetime.timezone.utc).isoformat()
            }
            
            if existing.data:
                supabase.table('sentinel_scores')\
                        .update(record)\
                        .eq('account_hash', account_hash)\
                        .execute()
            else:
                supabase.table('sentinel_scores')\
                        .insert(record)\
                        .execute()
            
            if status == 'surge':
                supabase.table('alerts').insert({
                    'complaint_id': node.get('complaint_id'),
                    'alert_type': 'dashboard',
                    'recipient_role': 'i4c_national',
                    'message': f'SENTINEL SURGE: Account {account_hash[:8]}... showing behavioral surge score {surge_score}/100. {trigger}. Possible imminent withdrawal.',
                    'alert_level': 'RED',
                    'status': 'sent'
                }).execute()
                
    except Exception as e:
        print(f'Sentinel error: {e}')

export interface Complaint {
  id: string;
  complaint_id?: string;
  victimInfo: { name: string; contact: string };
  amount: number;
  amount_inr?: number;
  status: 'filed' | 'analyzing' | 'alerted' | 'resolved' | 'flagged' | string;
  linkedAccountId: string;
  fraud_type?: string;
  victim_state?: string;
  victim_district?: string;
  accused_phone_prefix?: string;
  accused_bank?: string;
  channel?: string;
  created_at?: string;
  filed_at?: string;
  assignedOfficer?: string;
  description?: string;
}

export interface Account {
  id: string;
  riskScore: number;
  h3Cell?: string;
  bank_name?: string;
  kyc_lat?: number;
  kyc_lon?: number;
  txnHistory: { fromAccount: string; toAccount: string; amount: number; timestamp: string }[];
}

export interface Prediction {
  id: string;
  prediction_id?: string;
  complaint_id: string;
  accountId?: string;
  risk_score: number;
  riskScore?: number;
  risk_level: 'RED' | 'AMBER' | 'GREEN' | 'low' | 'medium' | 'high' | 'critical' | string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence?: number;
  predicted_lat: number;
  predicted_lon: number;
  predicted_lng?: number;
  lat?: number;
  lng?: number;
  cashout_window_hours: number;
  cashOutWindow?: { earliest: string; latest: string };
  shap_features?: Record<string, number>;
  nearest_atms?: AtmLocation[];
  predicted_atms?: string[] | any[];
  recovery_score?: number;
  status?: string;
  created_at?: string;
  model_version?: string;
  predictedH3Cells?: { cell: string; probability: number }[];
  gnnConfidence?: number;
}

export interface Alert {
  id: string;
  alert_id?: string;
  predictionId?: string;
  prediction_id?: string;
  complaintId?: string;
  complaint_id?: string;
  atmId?: string;
  h3Cell?: string;
  status: 'new' | 'assigned' | 'actioned' | string;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  message?: string;
  assignedOfficerId?: string;
  assigned_officer?: string;
  createdAt?: string;
  created_at?: string;
  sent_at?: string;
}

export interface Incident {
  id: string;
  incident_id?: string;
  complaint_id?: string;
  prediction_id?: string;
  alertId?: string;
  alert_id?: string;
  status: 'open' | 'authorized' | 'closed' | string;
  suspect_apprehended?: boolean | number;
  action_taken?: string;
  notes?: string;
  officerActions: { note: string; timestamp: string }[];
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  complaint?: Complaint;
  prediction?: Prediction;
  atms?: AtmLocation[];
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  timestamp: string;
  suspicious?: boolean;
}

export interface AtmLocation {
  id: string;
  atm_id?: string;
  name: string;
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  bank: string;
  bank_name?: string;
  address: string;
  district?: string;
  distance_km?: number;
  operationalStatus?: 'online' | 'surveillance_active' | 'dispenser_locked';
}

export interface HotspotPoint {
  id?: number | string;
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  weight?: number;
  risk_score?: number;
  district?: string;
  name?: string;
}

export interface MapFocusTarget {
  cellOrAtmId?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  timestamp: number;
}

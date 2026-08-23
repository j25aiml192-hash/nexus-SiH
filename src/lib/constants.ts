export const FRAUD_TYPES = [
  { value: 'upi_fraud', label: 'UPI Fraud' },
  { value: 'investment_scam', label: 'Investment Scam' },
  { value: 'digital_arrest', label: 'Digital Arrest' },
  { value: 'vishing', label: 'Vishing / OTP Fraud' },
  { value: 'job_fraud', label: 'Fake Job Offer' },
  { value: 'loan_fraud', label: 'Fake Loan App' },
  { value: 'romance_scam', label: 'Romance Scam' },
];

export const ALERT_LEVELS = { RED: 'RED', AMBER: 'AMBER', GREEN: 'GREEN' } as const;

export const ALERT_COLORS: Record<string, string> = {
  RED: '#DC2626',
  AMBER: '#D97706',
  GREEN: '#16A34A',
};

export const ROLES = {
  I4C_NATIONAL: 'i4c_national',
  STATE_LEA: 'state_lea',
  BANK_OFFICER: 'bank_officer',
  FIELD_OFFICER: 'field_officer',
} as const;

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
];

export const HIGH_RISK_DISTRICTS = [
  { district: 'Deoghar', state: 'Jharkhand', riskScore: 0.91 },
  { district: 'Giridih', state: 'Jharkhand', riskScore: 0.88 },
  { district: 'Nuh', state: 'Haryana', riskScore: 0.85 },
  { district: 'Mathura', state: 'Uttar Pradesh', riskScore: 0.79 },
  { district: 'Bharatpur', state: 'Rajasthan', riskScore: 0.76 },
];

export const STATE_CENTROIDS: Record<string, { lat: number; lng: number; zoom: number }> = {
  'Andhra Pradesh': { lat: 15.9129, lng: 79.74, zoom: 7 },
  'Arunachal Pradesh': { lat: 28.218, lng: 94.7278, zoom: 7 },
  'Assam': { lat: 26.2006, lng: 92.9376, zoom: 7 },
  'Bihar': { lat: 25.0961, lng: 85.3131, zoom: 7 },
  'Chhattisgarh': { lat: 21.2787, lng: 81.8663, zoom: 7 },
  'Goa': { lat: 15.2993, lng: 74.124, zoom: 8 },
  'Gujarat': { lat: 23.0225, lng: 72.5714, zoom: 7 },
  'Haryana': { lat: 29.0588, lng: 76.0856, zoom: 7 },
  'Himachal Pradesh': { lat: 31.1048, lng: 77.1734, zoom: 7 },
  'Jharkhand': { lat: 23.6102, lng: 85.2799, zoom: 7 },
  'Karnataka': { lat: 15.3173, lng: 75.7139, zoom: 7 },
  'Kerala': { lat: 10.8505, lng: 76.2711, zoom: 7 },
  'Madhya Pradesh': { lat: 22.9734, lng: 78.6569, zoom: 7 },
  'Maharashtra': { lat: 19.7515, lng: 75.7139, zoom: 6 },
  'Manipur': { lat: 24.8037, lng: 93.9383, zoom: 8 },
  'Meghalaya': { lat: 25.467, lng: 91.3662, zoom: 8 },
  'Mizoram': { lat: 23.1645, lng: 92.9376, zoom: 8 },
  'Nagaland': { lat: 26.1584, lng: 94.5624, zoom: 8 },
  'Odisha': { lat: 20.9517, lng: 85.0985, zoom: 7 },
  'Punjab': { lat: 31.1471, lng: 75.3412, zoom: 7 },
  'Rajasthan': { lat: 27.0238, lng: 74.2179, zoom: 6 },
  'Sikkim': { lat: 27.533, lng: 88.5122, zoom: 8 },
  'Tamil Nadu': { lat: 11.1271, lng: 78.6569, zoom: 7 },
  'Telangana': { lat: 18.1124, lng: 79.0193, zoom: 7 },
  'Tripura': { lat: 23.9408, lng: 91.9882, zoom: 8 },
  'Uttar Pradesh': { lat: 26.8467, lng: 80.9462, zoom: 6 },
  'Uttarakhand': { lat: 30.0668, lng: 79.0193, zoom: 7 },
  'West Bengal': { lat: 22.9868, lng: 87.855, zoom: 7 },
  'Andaman and Nicobar Islands': { lat: 11.7401, lng: 92.6586, zoom: 7 },
  'Chandigarh': { lat: 30.7333, lng: 76.7794, zoom: 11 },
  'Dadra and Nagar Haveli and Daman and Diu': { lat: 20.2724, lng: 73.0163, zoom: 9 },
  'Delhi': { lat: 28.7041, lng: 77.1025, zoom: 10 },
  'Jammu and Kashmir': { lat: 33.7782, lng: 76.5762, zoom: 7 },
  'Ladakh': { lat: 34.1526, lng: 77.577, zoom: 7 },
  'Puducherry': { lat: 11.9416, lng: 79.8083, zoom: 10 },
};

export const FRAUD_TYPE_DESCRIPTIONS: Record<string, string> = {
  upi_fraud: 'Look for individuals making multiple rapid ATM withdrawals, checking phone between each transaction. May appear nervous, use multiple cards or UPI apps.',
  investment_scam: 'Look for groups gathering near ATMs promising high returns. Suspects may show fake trading apps on phones. Victims often visibly distressed.',
  digital_arrest: 'Victim may be on active phone call, appearing coerced. Suspects operate remotely — look for victims attempting large withdrawals under duress.',
  vishing: 'Look for victims receiving OTP requests over phone near ATM. Suspects may be on call guiding victim through withdrawal process.',
  job_fraud: 'Look for victims attempting to deposit money for "job registration". Suspects may be nearby coordinating via phone.',
  loan_fraud: 'Look for victims checking multiple loan apps on phone. Suspects may operate from nearby location processing fake loan documents.',
  romance_scam: 'Victim may appear emotionally distressed. Look for individuals coordinating transfers via messaging apps near ATM.',
};

export interface SeedPrediction {
  id: string;
  complaint_id: string;
  risk_score: number;
  predicted_lat: number;
  predicted_lng: number;
  predicted_radius_km: number;
  cashout_window_hours: number;
  alert_level: 'RED' | 'AMBER' | 'GREEN';
  shap_features: Record<string, number>;
  llm_narrative: string;
  predicted_atms: Array<{ atm_id: string; bank_name: string; address: string; lat: number; lng: number }>;
  status: 'active' | 'escalated' | 'intercepted' | 'expired';
  recovery_score: number;
  created_at: string;
  updated_at: string;
}

export const SEED_PREDICTIONS: SeedPrediction[] = [
  {
    id: 'seed-1',
    complaint_id: 'NC-2026-0001',
    risk_score: 0.94,
    predicted_lat: 24.48,
    predicted_lng: 86.69,
    predicted_radius_km: 8,
    cashout_window_hours: 6,
    alert_level: 'RED',
    shap_features: {
      mule_chain_depth: 0.32,
      transaction_velocity: 0.28,
      accused_phone_prefix_risk: 0.18,
      district_history: 0.12,
      amount_anomaly: 0.08,
    },
    llm_narrative: 'High-confidence UPI fraud detected in Deoghar, Jharkhand. Victim transferred ₹4.2L across 3 mule accounts within 45 minutes. Transaction velocity pattern matches known syndicate operating from Deoghar-Giridih corridor. Predicted cash-out at 2 ATMs near Tower Chowk within 6 hours. Immediate field deployment recommended.',
    predicted_atms: [
      { atm_id: 'ATM-SBI-001', bank_name: 'SBI', address: 'Tower Chowk, Deoghar', lat: 24.48, lng: 86.69 },
      { atm_id: 'ATM-HDFC-014', bank_name: 'HDFC', address: 'Bompas Town, Deoghar', lat: 24.47, lng: 86.70 },
    ],
    status: 'active',
    recovery_score: 72,
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed-2',
    complaint_id: 'NC-2026-0002',
    risk_score: 0.89,
    predicted_lat: 28.10,
    predicted_lng: 76.99,
    predicted_radius_km: 10,
    cashout_window_hours: 4,
    alert_level: 'RED',
    shap_features: {
      mule_chain_depth: 0.30,
      transaction_velocity: 0.25,
      accused_phone_prefix_risk: 0.20,
      district_history: 0.15,
      amount_anomaly: 0.10,
    },
    llm_narrative: 'Investment scam detected in Nuh, Haryana. Victim lost ₹8.5L in fake trading app. Mule chain depth of 4 hops detected — funds split across 6 accounts. Nuh district flagged as high-risk origin. Cash-out likely at ATM clusters near Nuh town center within 4 hours. Deploy field teams immediately.',
    predicted_atms: [
      { atm_id: 'ATM-ICICI-022', bank_name: 'ICICI', address: 'Nuh Town Center', lat: 28.10, lng: 76.99 },
      { atm_id: 'ATM-PNB-007', bank_name: 'PNB', address: 'Firozpur Jhirka Road', lat: 28.11, lng: 76.98 },
    ],
    status: 'active',
    recovery_score: 45,
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed-3',
    complaint_id: 'NC-2026-0003',
    risk_score: 0.86,
    predicted_lat: 24.19,
    predicted_lng: 86.30,
    predicted_radius_km: 9,
    cashout_window_hours: 8,
    alert_level: 'AMBER',
    shap_features: {
      mule_chain_depth: 0.26,
      transaction_velocity: 0.24,
      accused_phone_prefix_risk: 0.16,
      district_history: 0.20,
      amount_anomaly: 0.14,
    },
    llm_narrative: 'Digital arrest fraud in Giridih, Jharkhand. Victim coerced into transferring ₹2.1L while on call with fake CBI officer. Mule chain depth 3, funds moved to 2 accounts in Jharkhand. Giridih-Deoghar corridor shows recurring pattern. Cash-out window estimated 8 hours at rural ATMs.',
    predicted_atms: [
      { atm_id: 'ATM-BOI-003', bank_name: 'BOI', address: 'Giridih Main Road', lat: 24.19, lng: 86.30 },
      { atm_id: 'ATM-CAN-011', bank_name: 'Canara', address: 'Hazaribagh Road, Giridih', lat: 24.20, lng: 86.31 },
    ],
    status: 'active',
    recovery_score: 60,
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed-4',
    complaint_id: 'NC-2026-0004',
    risk_score: 0.78,
    predicted_lat: 27.49,
    predicted_lng: 77.67,
    predicted_radius_km: 12,
    cashout_window_hours: 10,
    alert_level: 'AMBER',
    shap_features: {
      mule_chain_depth: 0.22,
      transaction_velocity: 0.20,
      accused_phone_prefix_risk: 0.14,
      district_history: 0.18,
      amount_anomaly: 0.16,
    },
    llm_narrative: 'Vishing fraud in Mathura, Uttar Pradesh. Victim shared OTP, lost ₹1.8L. Two-hop mule chain detected. Mathura district shows moderate fraud history. Cash-out likely at highway ATMs on NH-19 within 10 hours. Monitor 3 ATM locations.',
    predicted_atms: [
      { atm_id: 'ATM-SBI-089', bank_name: 'SBI', address: 'NH-19, Mathura', lat: 27.49, lng: 77.67 },
      { atm_id: 'ATM-AXIS-045', bank_name: 'Axis', address: 'Vrindavan Road', lat: 27.50, lng: 77.66 },
    ],
    status: 'active',
    recovery_score: 55,
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed-5',
    complaint_id: 'NC-2026-0005',
    risk_score: 0.75,
    predicted_lat: 27.21,
    predicted_lng: 77.49,
    predicted_radius_km: 10,
    cashout_window_hours: 14,
    alert_level: 'AMBER',
    shap_features: {
      mule_chain_depth: 0.18,
      transaction_velocity: 0.22,
      accused_phone_prefix_risk: 0.12,
      district_history: 0.16,
      amount_anomaly: 0.12,
    },
    llm_narrative: 'Fake job offer fraud in Bharatpur, Rajasthan. Victim paid ₹95K as "registration fee". Mule chain depth 2, funds in single account. Bharatpur shows rising fraud trend. Cash-out window 14 hours — moderate urgency. Monitor 2 ATM locations near railway station.',
    predicted_atms: [
      { atm_id: 'ATM-SBI-156', bank_name: 'SBI', address: 'Bharatpur Railway Station', lat: 27.21, lng: 77.49 },
      { atm_id: 'ATM-HDFC-078', bank_name: 'HDFC', address: 'Mathura Road, Bharatpur', lat: 27.22, lng: 77.50 },
    ],
    status: 'active',
    recovery_score: 50,
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed-6',
    complaint_id: 'NC-2026-0006',
    risk_score: 0.62,
    predicted_lat: 19.076,
    predicted_lng: 72.8777,
    predicted_radius_km: 15,
    cashout_window_hours: 24,
    alert_level: 'GREEN',
    shap_features: {
      mule_chain_depth: 0.10,
      transaction_velocity: 0.14,
      accused_phone_prefix_risk: 0.08,
      district_history: 0.06,
      amount_anomaly: 0.10,
    },
    llm_narrative: 'Romance scam detected in Mumbai, Maharashtra. Victim transferred ₹35K over 2 weeks. Single-hop transfer, low velocity. No immediate cash-out risk — funds likely remain in mule account. Flag for monitoring, no urgent field deployment needed.',
    predicted_atms: [
      { atm_id: 'ATM-ICICI-201', bank_name: 'ICICI', address: 'Andheri West, Mumbai', lat: 19.076, lng: 72.8777 },
    ],
    status: 'active',
    recovery_score: 88,
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'seed-7',
    complaint_id: 'NC-2026-0007',
    risk_score: 0.71,
    predicted_lat: 28.7041,
    predicted_lng: 77.1025,
    predicted_radius_km: 11,
    cashout_window_hours: 12,
    alert_level: 'AMBER',
    shap_features: {
      mule_chain_depth: 0.16,
      transaction_velocity: 0.18,
      accused_phone_prefix_risk: 0.12,
      district_history: 0.10,
      amount_anomaly: 0.14,
    },
    llm_narrative: 'Fake loan app fraud in Delhi. Victim paid ₹15K "processing fee" for non-existent loan. Two-hop mule chain, moderate velocity. Delhi NCR shows high fraud volume but lower per-case severity. Monitor 3 ATMs in South Delhi area.',
    predicted_atms: [
      { atm_id: 'ATM-SBI-300', bank_name: 'SBI', address: 'Connaught Place, Delhi', lat: 28.7041, lng: 77.1025 },
      { atm_id: 'ATM-HDFC-112', bank_name: 'HDFC', address: 'Saket, Delhi', lat: 28.70, lng: 77.10 },
    ],
    status: 'active',
    recovery_score: 65,
    created_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: 'seed-8',
    complaint_id: 'NC-2026-0008',
    risk_score: 0.91,
    predicted_lat: 24.48,
    predicted_lng: 86.69,
    predicted_radius_km: 7,
    cashout_window_hours: 3,
    alert_level: 'RED',
    shap_features: {
      mule_chain_depth: 0.34,
      transaction_velocity: 0.30,
      accused_phone_prefix_risk: 0.16,
      district_history: 0.14,
      amount_anomaly: 0.06,
    },
    llm_narrative: 'Critical UPI fraud in Deoghar, Jharkhand — second incident today. Victim lost ₹6.8L across 5 mule accounts in 30 minutes. Transaction pattern matches syndicate linked to NC-2026-0001. Cash-out imminent at Tower Chowk ATMs — 3 hours remaining. Immediate interception required.',
    predicted_atms: [
      { atm_id: 'ATM-SBI-001', bank_name: 'SBI', address: 'Tower Chowk, Deoghar', lat: 24.48, lng: 86.69 },
      { atm_id: 'ATM-HDFC-014', bank_name: 'HDFC', address: 'Bompas Town, Deoghar', lat: 24.47, lng: 86.70 },
      { atm_id: 'ATM-ICICI-033', bank_name: 'ICICI', address: 'Court Road, Deoghar', lat: 24.49, lng: 86.68 },
    ],
    status: 'escalated',
    recovery_score: 25,
    created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
];

export interface SeedMuleNode {
  id: string;
  complaint_id: string;
  node_index: number;
  account_hash: string;
  bank: string;
  state: string;
  transaction_velocity: number;
  is_flagged: boolean;
  kyc_lat: number;
  kyc_lng: number;
}

export const SEED_MULE_CHAINS: Record<string, SeedMuleNode[]> = {
  'NC-2026-0001': [
    { id: 'mn-1', complaint_id: 'NC-2026-0001', node_index: 0, account_hash: 'VICTIM-7a3f', bank: 'SBI', state: 'Jharkhand', transaction_velocity: 0, is_flagged: false, kyc_lat: 24.48, kyc_lng: 86.69 },
    { id: 'mn-2', complaint_id: 'NC-2026-0001', node_index: 1, account_hash: 'MULE-b82c', bank: 'HDFC', state: 'Jharkhand', transaction_velocity: 12, is_flagged: true, kyc_lat: 24.47, kyc_lng: 86.70 },
    { id: 'mn-3', complaint_id: 'NC-2026-0001', node_index: 2, account_hash: 'MULE-c91d', bank: 'ICICI', state: 'Jharkhand', transaction_velocity: 8, is_flagged: true, kyc_lat: 24.49, kyc_lng: 86.68 },
    { id: 'mn-4', complaint_id: 'NC-2026-0001', node_index: 3, account_hash: 'CASHOUT-e44f', bank: 'PNB', state: 'Jharkhand', transaction_velocity: 15, is_flagged: true, kyc_lat: 24.48, kyc_lng: 86.69 },
  ],
  'NC-2026-0002': [
    { id: 'mn-5', complaint_id: 'NC-2026-0002', node_index: 0, account_hash: 'VICTIM-2b1e', bank: 'SBI', state: 'Haryana', transaction_velocity: 0, is_flagged: false, kyc_lat: 28.10, kyc_lng: 76.99 },
    { id: 'mn-6', complaint_id: 'NC-2026-0002', node_index: 1, account_hash: 'MULE-3f8a', bank: 'Axis', state: 'Haryana', transaction_velocity: 18, is_flagged: true, kyc_lat: 28.11, kyc_lng: 76.98 },
    { id: 'mn-7', complaint_id: 'NC-2026-0002', node_index: 2, account_hash: 'MULE-4c2b', bank: 'HDFC', state: 'Delhi', transaction_velocity: 10, is_flagged: true, kyc_lat: 28.70, kyc_lng: 77.10 },
    { id: 'mn-8', complaint_id: 'NC-2026-0002', node_index: 3, account_hash: 'MULE-5d9e', bank: 'ICICI', state: 'Rajasthan', transaction_velocity: 6, is_flagged: false, kyc_lat: 27.21, kyc_lng: 77.49 },
    { id: 'mn-9', complaint_id: 'NC-2026-0002', node_index: 4, account_hash: 'CASHOUT-6e1f', bank: 'PNB', state: 'Haryana', transaction_velocity: 22, is_flagged: true, kyc_lat: 28.10, kyc_lng: 76.99 },
  ],
  'NC-2026-0008': [
    { id: 'mn-10', complaint_id: 'NC-2026-0008', node_index: 0, account_hash: 'VICTIM-9f2a', bank: 'SBI', state: 'Jharkhand', transaction_velocity: 0, is_flagged: false, kyc_lat: 24.48, kyc_lng: 86.69 },
    { id: 'mn-11', complaint_id: 'NC-2026-0008', node_index: 1, account_hash: 'MULE-a13b', bank: 'HDFC', state: 'Jharkhand', transaction_velocity: 25, is_flagged: true, kyc_lat: 24.47, kyc_lng: 86.70 },
    { id: 'mn-12', complaint_id: 'NC-2026-0008', node_index: 2, account_hash: 'MULE-b24c', bank: 'ICICI', state: 'Jharkhand', transaction_velocity: 20, is_flagged: true, kyc_lat: 24.49, kyc_lng: 86.68 },
    { id: 'mn-13', complaint_id: 'NC-2026-0008', node_index: 3, account_hash: 'MULE-c35d', bank: 'PNB', state: 'Jharkhand', transaction_velocity: 18, is_flagged: true, kyc_lat: 24.48, kyc_lng: 86.69 },
    { id: 'mn-14', complaint_id: 'NC-2026-0008', node_index: 4, account_hash: 'MULE-d46e', bank: 'Axis', state: 'Jharkhand', transaction_velocity: 14, is_flagged: true, kyc_lat: 24.47, kyc_lng: 86.70 },
    { id: 'mn-15', complaint_id: 'NC-2026-0008', node_index: 5, account_hash: 'CASHOUT-e57f', bank: 'Canara', state: 'Jharkhand', transaction_velocity: 30, is_flagged: true, kyc_lat: 24.48, kyc_lng: 86.69 },
  ],
};

export const SEED_ALERTS = [
  { id: 'alert-1', prediction_id: 'seed-1', complaint_id: 'NC-2026-0001', alert_type: 'dashboard', recipient_role: 'state_lea', recipient_id: null, message: 'RED alert: ₹4.2L UPI fraud — Deoghar, Jharkhand. Cash-out at Tower Chowk ATM within 6h.', alert_level: 'RED', sent_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), status: 'sent', acknowledged_at: null },
  { id: 'alert-2', prediction_id: 'seed-2', complaint_id: 'NC-2026-0002', alert_type: 'dashboard', recipient_role: 'state_lea', recipient_id: null, message: 'RED alert: ₹8.5L investment scam — Nuh, Haryana. 4-hop mule chain. Cash-out within 4h.', alert_level: 'RED', sent_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), status: 'sent', acknowledged_at: null },
  { id: 'alert-3', prediction_id: 'seed-3', complaint_id: 'NC-2026-0003', alert_type: 'sms', recipient_role: 'state_lea', recipient_id: null, message: 'AMBER alert: ₹2.1L digital arrest fraud — Giridih, Jharkhand. Cash-out within 8h.', alert_level: 'AMBER', sent_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), status: 'acknowledged', acknowledged_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
  { id: 'alert-4', prediction_id: 'seed-8', complaint_id: 'NC-2026-0008', alert_type: 'dashboard', recipient_role: 'state_lea', recipient_id: null, message: 'RED alert: ₹6.8L UPI fraud — Deoghar, Jharkhand. Second incident. Cash-out within 3h!', alert_level: 'RED', sent_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(), status: 'sent', acknowledged_at: null },
  { id: 'alert-5', prediction_id: 'seed-4', complaint_id: 'NC-2026-0004', alert_type: 'dashboard', recipient_role: 'state_lea', recipient_id: null, message: 'AMBER alert: ₹1.8L vishing fraud — Mathura, UP. Cash-out at NH-19 ATMs within 10h.', alert_level: 'AMBER', sent_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), status: 'sent', acknowledged_at: null },
];

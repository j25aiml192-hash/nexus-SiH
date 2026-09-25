import type {
  Prediction,
  Account,
  Alert,
  Incident,
  Complaint,
  AtmLocation,
  HotspotPoint,
} from '../../types/nexus';

export interface IncidentDetailResult {
  incident: Incident;
  alert?: Alert;
  prediction?: Prediction;
  account?: Account;
  complaint?: Complaint;
  atms?: AtmLocation[];
}

export interface CreateAlertParams {
  predictionId?: string;
  complaintId?: string;
  message?: string;
  severity?: string;
  h3Cell?: string;
  atmId?: string;
}

export interface MuleChainResult {
  complaint_id: string;
  complaint: Complaint;
  mule_nodes: Array<{
    id: string;
    account_id: string;
    bank_name: string;
    bank?: string;
    risk_score: number;
    hop_position: number;
    parent_account_id?: string;
    kyc_lat?: number;
    kyc_lng?: number;
    kyc_lon?: number;
    transaction_velocity?: number;
  }>;
  transactions: Array<{
    transaction_id: string;
    sender_account_id: string;
    receiver_account_id: string;
    amount_inr: number;
    channel: string;
    created_at: string;
  }>;
}

export interface DashboardStatsResult {
  openComplaints: number;
  totalComplaints: number;
  activeAlerts: number;
  highestAlertRisk: string;
  incidentsInProgress: number;
  incidentsClosedToday: number;
  totalFundsAtRisk: string;
  totalFundsFrozen: string;
  priorityAlerts: Array<{
    id?: string;
    alert_id?: string;
    complaint_id: string;
    complaintId?: string;
    message: string;
    severity: string;
    created_at: string;
    risk_score: number;
    cashout_window_hours: number;
    amount_inr: number;
    accused_bank?: string;
  }>;
  liveActivity: Array<{
    type: 'complaint' | 'prediction' | 'alert' | 'officer' | 'incident';
    ref_id: string;
    title: string;
    subtitle: string;
    badge: string;
    created_at: string;
  }>;
  riskBreakdown: {
    totalActiveCases: number;
    breakdown: Array<{
      level: string;
      count: number;
      percentage: number;
      color: string;
    }>;
  };
}

export interface IDataSource {
  // Complaints
  getComplaints(search?: string, status?: string): Promise<Complaint[]>;
  getComplaintById(id: string): Promise<Complaint | null>;
  createComplaint(data: Partial<Complaint>): Promise<{ status: string; complaint_id: string; complaint: Complaint; prediction?: Prediction }>;

  // Accounts & Graph
  getAccountById(accountId: string): Promise<Account | null>;
  getMuleChain(complaintId: string): Promise<MuleChainResult>;
  flagMuleAccount(accountId: string, reason?: string): Promise<{ status: string; account_id: string; message: string }>;

  // Predictions
  getPrediction(complaintId: string): Promise<Prediction | null>;
  getPredictionByComplaint(complaintId: string): Promise<Prediction | null>;
  getAllPredictions(): Promise<Prediction[]>;

  // Alerts
  createAlert(params: CreateAlertParams): Promise<Alert>;
  simulateAlert(): Promise<Alert>;
  getAlerts(): Promise<Alert[]>;
  getAlertById(alertId: string): Promise<Alert | null>;
  assignOfficer(
    alertId: string,
    officerId: string
  ): Promise<{ alert: Alert; incident: Incident }>;

  // Incidents
  getIncidents(): Promise<Incident[]>;
  getIncidentById(incidentId: string): Promise<Incident | null>;
  getIncidentDetail(incidentId: string): Promise<IncidentDetailResult | null>;
  addOfficerNote(incidentId: string, note: string): Promise<Incident>;
  authorizeIncident(incidentId: string): Promise<Incident>;

  // Geospatial / Map assets
  getAtmLocations(): Promise<AtmLocation[]>;
  getHistoricalHotspots(): Promise<HotspotPoint[]>;

  // Dashboard Aggregates
  getDashboardStats(timeframe?: string): Promise<DashboardStatsResult>;
}

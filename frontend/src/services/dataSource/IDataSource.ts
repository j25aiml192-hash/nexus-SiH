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
}

export interface CreateAlertParams {
  predictionId: string;
  h3Cell: string;
  atmId?: string;
}

export interface IDataSource {
  // Complaints
  getComplaints(): Promise<Complaint[]>;
  getComplaintById(id: string): Promise<Complaint | null>;

  // Accounts
  getAccountById(accountId: string): Promise<Account | null>;

  // Predictions
  getPrediction(accountId: string): Promise<Prediction | null>;
  getAllPredictions(): Promise<Prediction[]>;

  // Alerts
  createAlert(params: CreateAlertParams): Promise<Alert>;
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
}

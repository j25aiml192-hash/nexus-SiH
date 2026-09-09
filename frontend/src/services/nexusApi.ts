/**
 * Backward compatibility facade delegating to IDataSource
 */
import { dataSource } from './dataSource';
import type {
  Prediction,
  Account,
  Alert,
  Incident,
  AtmLocation,
  HotspotPoint,
} from '../types/nexus';
import type { IncidentDetailResult, CreateAlertParams } from './dataSource';

export const nexusApi = {
  getPrediction: (accountId: string): Promise<Prediction | null> =>
    dataSource.getPrediction(accountId),

  getAllPredictions: (): Promise<Prediction[]> =>
    dataSource.getAllPredictions(),

  getAccount: (accountId: string): Promise<Account | null> =>
    dataSource.getAccountById(accountId),

  getAlerts: (): Promise<Alert[]> =>
    dataSource.getAlerts(),

  escalateToAlert: (params: CreateAlertParams): Promise<Alert> =>
    dataSource.createAlert(params),

  assignAlertToOfficer: (
    alertId: string,
    officerId: string
  ): Promise<{ alert: Alert; incident: Incident }> =>
    dataSource.assignOfficer(alertId, officerId),

  getIncidents: (): Promise<Incident[]> =>
    dataSource.getIncidents(),

  getIncidentDetail: (incidentId: string): Promise<IncidentDetailResult | null> =>
    dataSource.getIncidentDetail(incidentId),

  addOfficerNote: (incidentId: string, note: string): Promise<Incident> =>
    dataSource.addOfficerNote(incidentId, note),

  authorizeIncident: (incidentId: string): Promise<Incident> =>
    dataSource.authorizeIncident(incidentId),

  getAtmLocations: (): Promise<AtmLocation[]> =>
    dataSource.getAtmLocations(),

  getHistoricalHotspots: (): Promise<HotspotPoint[]> =>
    dataSource.getHistoricalHotspots(),
};

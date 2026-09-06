import type {
  Prediction,
  Account,
  Alert,
  Incident,
  Complaint,
  AtmLocation,
  HotspotPoint,
} from '../../types/nexus';
import type {
  IDataSource,
  IncidentDetailResult,
  CreateAlertParams,
} from './IDataSource';
import { useNexusStore } from '../../store/useNexusStore';
import { realtimeClient } from '../realtime';

const delay = (ms = 160) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockDataSource implements IDataSource {
  async getComplaints(): Promise<Complaint[]> {
    await delay(120);
    return useNexusStore.getState().complaints;
  }

  async getComplaintById(id: string): Promise<Complaint | null> {
    await delay(100);
    const complaint = useNexusStore.getState().complaints.find((c) => c.id === id);
    return complaint || null;
  }

  async getAccountById(accountId: string): Promise<Account | null> {
    await delay(140);
    const account = useNexusStore.getState().getAccountById(accountId);
    return account || null;
  }

  async getPrediction(accountId: string): Promise<Prediction | null> {
    await delay(160);
    const prediction = useNexusStore.getState().getPredictionByAccountId(accountId);
    return prediction || null;
  }

  async getAllPredictions(): Promise<Prediction[]> {
    await delay(120);
    return useNexusStore.getState().predictions;
  }

  async createAlert(params: CreateAlertParams): Promise<Alert> {
    await delay(180);
    const id = `ALT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAlert: Alert = {
      id,
      predictionId: params.predictionId,
      h3Cell: params.h3Cell,
      atmId: params.atmId || 'ATM-DEL-042',
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    useNexusStore.getState().addAlert(newAlert);
    realtimeClient.emitAlertCreated(newAlert);
    return newAlert;
  }

  async getAlerts(): Promise<Alert[]> {
    await delay(120);
    return useNexusStore.getState().alerts;
  }

  async getAlertById(alertId: string): Promise<Alert | null> {
    await delay(100);
    const alert = useNexusStore.getState().getAlertById(alertId);
    return alert || null;
  }

  async assignOfficer(
    alertId: string,
    officerId: string
  ): Promise<{ alert: Alert; incident: Incident }> {
    await delay(180);
    const store = useNexusStore.getState();
    store.updateAlert(alertId, {
      status: 'assigned',
      assignedOfficerId: officerId,
    });

    const updatedAlert = store.getAlertById(alertId)!;

    let incident = store.incidents.find((i) => i.alertId === alertId);
    if (!incident) {
      incident = {
        id: `INC-${Math.floor(4000 + Math.random() * 5000)}`,
        alertId: alertId,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        officerActions: [
          {
            note: `Incident opened via manual triage. Assigned to Officer ${officerId}.`,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
          },
        ],
      };
      store.addIncident(incident);
    }

    realtimeClient.emitIncidentUpdated(incident);
    return { alert: updatedAlert, incident };
  }

  async getIncidents(): Promise<Incident[]> {
    await delay(120);
    return useNexusStore.getState().incidents;
  }

  async getIncidentById(incidentId: string): Promise<Incident | null> {
    await delay(100);
    const incident = useNexusStore.getState().getIncidentById(incidentId);
    return incident || null;
  }

  async getIncidentDetail(incidentId: string): Promise<IncidentDetailResult | null> {
    await delay(180);
    const store = useNexusStore.getState();
    const incident = store.getIncidentById(incidentId);
    if (!incident) return null;

    const alert = store.getAlertById(incident.alertId);
    let prediction: Prediction | undefined;
    let account: Account | undefined;
    let complaint: Complaint | undefined;

    if (alert) {
      prediction = store.predictions.find((p) => p.id === alert.predictionId);
      if (prediction) {
        account = store.getAccountById(prediction.accountId);
        complaint = store.getComplaintByAccountId(prediction.accountId);
      }
    }

    return { incident, alert, prediction, account, complaint };
  }

  async addOfficerNote(incidentId: string, note: string): Promise<Incident> {
    await delay(150);
    const store = useNexusStore.getState();
    store.addOfficerAction(incidentId, note);
    const updated = store.getIncidentById(incidentId)!;
    realtimeClient.emitIncidentUpdated(updated);
    return updated;
  }

  async authorizeIncident(incidentId: string): Promise<Incident> {
    await delay(200);
    const store = useNexusStore.getState();
    store.authorizeIncident(incidentId);
    const updated = store.getIncidentById(incidentId)!;
    realtimeClient.emitIncidentUpdated(updated);
    return updated;
  }

  async getAtmLocations(): Promise<AtmLocation[]> {
    await delay(90);
    return useNexusStore.getState().atmLocations;
  }

  async getHistoricalHotspots(): Promise<HotspotPoint[]> {
    await delay(90);
    return useNexusStore.getState().historicalHotspots;
  }
}

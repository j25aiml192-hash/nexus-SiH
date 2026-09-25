/**
 * OFFLINE DEMO ONLY DATA SOURCE (FALLBACK STUB)
 * Notice: Production application strictly uses ApiDataSource.
 */
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
  MuleChainResult,
  DashboardStatsResult,
} from './IDataSource';
import { useNexusStore } from '../../store/useNexusStore';

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockDataSource implements IDataSource {
  async getComplaints(): Promise<Complaint[]> {
    await delay();
    return useNexusStore.getState().complaints;
  }

  async getComplaintById(id: string): Promise<Complaint | null> {
    await delay();
    const complaint = useNexusStore.getState().complaints.find((c) => c.id === id);
    return complaint || null;
  }

  async createComplaint(data: Partial<Complaint>): Promise<{ status: string; complaint_id: string; complaint: Complaint; prediction?: Prediction }> {
    await delay();
    const cid = data.complaint_id || `CMP-${Date.now()}`;
    const comp: Complaint = {
      id: cid,
      complaint_id: cid,
      victimInfo: { name: 'Complainant', contact: '+91-9800000000' },
      amount: data.amount || 50000,
      status: 'flagged',
      linkedAccountId: 'ACC-MULE-1',
    };
    return { status: 'created', complaint_id: cid, complaint: comp };
  }

  async getAccountById(accountId: string): Promise<Account | null> {
    await delay();
    return useNexusStore.getState().getAccountById(accountId) || null;
  }

  async getMuleChain(complaintId: string): Promise<MuleChainResult> {
    await delay();
    return {
      complaint_id: complaintId,
      complaint: {
        id: complaintId,
        victimInfo: { name: 'Complainant', contact: '+91-9800000000' },
        amount: 150000,
        status: 'flagged',
        linkedAccountId: 'ACC-MULE-1',
      },
      mule_nodes: [],
      transactions: [],
    };
  }

  async flagMuleAccount(accountId: string): Promise<{ status: string; account_id: string; message: string }> {
    await delay();
    return { status: 'flagged', account_id: accountId, message: 'Entity flagged in demo store.' };
  }

  async getPrediction(complaintId: string): Promise<Prediction | null> {
    return this.getPredictionByComplaint(complaintId);
  }

  async getPredictionByComplaint(complaintId: string): Promise<Prediction | null> {
    await delay();
    return useNexusStore.getState().predictions.find((p) => p.complaint_id === complaintId) || null;
  }

  async getAllPredictions(): Promise<Prediction[]> {
    await delay();
    return useNexusStore.getState().predictions;
  }

  async createAlert(params: CreateAlertParams): Promise<Alert> {
    await delay();
    const newAlert: Alert = {
      id: `ALT-${Date.now()}`,
      complaintId: params.complaintId,
      status: 'new',
      severity: params.severity || 'HIGH',
      message: params.message || 'Alert generated',
    };
    useNexusStore.getState().addAlert(newAlert);
    return newAlert;
  }

  async simulateAlert(): Promise<Alert> {
    return this.createAlert({ message: 'Simulated alert' });
  }

  async getAlerts(): Promise<Alert[]> {
    await delay();
    return useNexusStore.getState().alerts;
  }

  async getAlertById(alertId: string): Promise<Alert | null> {
    await delay();
    return useNexusStore.getState().getAlertById(alertId) || null;
  }

  async assignOfficer(alertId: string, officerId: string): Promise<{ alert: Alert; incident: Incident }> {
    await delay();
    const alert = useNexusStore.getState().getAlertById(alertId);
    const updatedAlert: Alert = alert
      ? { ...alert, status: 'assigned', assignedOfficerId: officerId }
      : { id: alertId, status: 'assigned', assignedOfficerId: officerId, h3Cell: '882681a4bffffff' };
    
    useNexusStore.getState().updateAlert(alertId, { status: 'assigned', assignedOfficerId: officerId });

    const newInc: Incident = {
      id: `INC-${alertId.replace('ALT-', '')}`,
      alertId,
      status: 'open',
      officerActions: [{ note: `Assigned to ${officerId}`, timestamp: new Date().toISOString() }],
    };
    useNexusStore.getState().addIncident(newInc);
    return { alert: updatedAlert, incident: newInc };
  }

  async getIncidents(): Promise<Incident[]> {
    await delay();
    return useNexusStore.getState().incidents;
  }

  async getIncidentById(incidentId: string): Promise<Incident | null> {
    await delay();
    return useNexusStore.getState().getIncidentById(incidentId) || null;
  }

  async getIncidentDetail(incidentId: string): Promise<IncidentDetailResult | null> {
    await delay();
    const incident = useNexusStore.getState().getIncidentById(incidentId);
    if (!incident) return null;
    return { incident };
  }

  async addOfficerNote(incidentId: string, note: string): Promise<Incident> {
    await delay();
    useNexusStore.getState().addOfficerAction(incidentId, note);
    return useNexusStore.getState().getIncidentById(incidentId)!;
  }

  async authorizeIncident(incidentId: string): Promise<Incident> {
    await delay();
    useNexusStore.getState().authorizeIncident(incidentId);
    return useNexusStore.getState().getIncidentById(incidentId)!;
  }

  async getAtmLocations(): Promise<AtmLocation[]> {
    await delay();
    return useNexusStore.getState().atmLocations;
  }

  async getHistoricalHotspots(): Promise<HotspotPoint[]> {
    await delay();
    return useNexusStore.getState().historicalHotspots;
  }

  async getDashboardStats(): Promise<DashboardStatsResult> {
    await delay();
    return {
      openComplaints: 0,
      totalComplaints: 0,
      activeAlerts: 0,
      highestAlertRisk: 'LOW',
      incidentsInProgress: 0,
      incidentsClosedToday: 0,
      totalFundsAtRisk: '₹0',
      totalFundsFrozen: '₹0',
      priorityAlerts: [],
      liveActivity: [],
      riskBreakdown: { totalActiveCases: 0, breakdown: [] },
    };
  }
}

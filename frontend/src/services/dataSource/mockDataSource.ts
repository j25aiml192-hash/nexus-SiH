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

  async createComplaint(data: Partial<Complaint>): Promise<{ status: string; complaint_id: string; complaint: Complaint; prediction?: Prediction; ncrp_id?: string; created_at?: string }> {
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
        complaint_id: complaintId,
        ncrp_id: complaintId,
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

  async getDashboardStats(_timeframe: string = '24h'): Promise<DashboardStatsResult> {
    await delay();
    const complaints = useNexusStore.getState().complaints || [];
    const totalComplaints = complaints.length;
    const openComplaints = complaints.filter(c => c.status !== 'closed' && c.status !== 'resolved').length;
    const totalFunds = complaints.reduce((sum, c) => sum + (c.amount_inr || 0), 0);

    const formatInr = (val: number) => {
      if (!val) return '₹0';
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
      return `₹${val.toLocaleString()}`;
    };

    return {
      openComplaints,
      totalComplaints,
      activeAlerts: useNexusStore.getState().alerts?.length || 0,
      highestAlertRisk: 'High',
      incidentsInProgress: useNexusStore.getState().incidents?.length || 0,
      incidentsClosedToday: 0,
      totalFundsAtRisk: formatInr(totalFunds),
      totalFundsFrozen: '₹0 secured / frozen',
      priorityAlerts: [],
      liveActivity: [],
      riskBreakdown: {
        totalActiveCases: totalComplaints,
        breakdown: [
          { level: 'CRITICAL', count: Math.ceil(totalComplaints * 0.4), percentage: 40, color: '#DC2626' },
          { level: 'HIGH', count: Math.floor(totalComplaints * 0.6), percentage: 60, color: '#EA580C' },
          { level: 'MEDIUM', count: 0, percentage: 0, color: '#D97706' },
          { level: 'LOW', count: 0, percentage: 0, color: '#087F5B' }
        ]
      },
    };
  }

  async getPotentialSyndicates(): Promise<import('../../types/syndicate').ClustersListResponse> {
    return { total: 0, limit: 50, offset: 0, clusters: [] };
  }

  async getPotentialSyndicateById(clusterId: string): Promise<import('../../types/syndicate').PotentialClusterDetail> {
    throw new Error(`Cluster ${clusterId} not found in mock store`);
  }

  async getCaseSyndicates(complaintId: string): Promise<import('../../types/syndicate').CaseSyndicatesResponse> {
    return { complaint_id: complaintId, clusters_count: 0, clusters: [], related_cases_count: 0, related_cases: [] };
  }

  async expandCaseSyndicateNetwork(complaintId: string, depth: number = 1): Promise<import('../../types/syndicate').GraphExpansionResponse> {
    return { root_complaint_id: complaintId, depth, total_nodes: 0, total_edges: 0, total_cases: 0, nodes: [], edges: [] };
  }

  // Evidence Intelligence (Phase 4A)
  async getEvidenceCases(_limit?: number): Promise<import('../../types/evidence').EvidenceCaseSummary[]> {
    return [];
  }

  async getCaseEvidence(complaintId: string, depth: number = 1): Promise<import('../../types/evidence').EvidenceGraphResponse> {
    return {
      complaint_id: complaintId,
      complaint: null,
      depth,
      nodes: [],
      edges: [],
      summary: {
        total_nodes: 0,
        total_edges: 0,
        semantic_breakdown: { DIRECT_OBSERVED: 0, DERIVED: 0, INFERRED: 0, MODEL_SIGNAL: 0 },
        entity_types: {},
      },
      consistency: {
        status: 'CONSISTENT',
        checks_passed: 4,
        total_checks: 4,
        checks: [],
        discrepancies: [],
      },
    };
  }

  async getCaseEvidenceTimeline(_complaintId: string): Promise<import('../../types/evidence').EvidenceTimelineEvent[]> {
    return [];
  }

  async getEvidenceRelation(relationId: string): Promise<import('../../types/evidence').EvidenceRelationDetail> {
    return {
      relation_id: relationId,
      relation_type: 'APPEARED_IN_COMPLAINT',
      semantic_level: 'DIRECT_OBSERVED',
      confidence: 1.0,
      complaint_id: null,
      source_entity: null,
      target_entity: null,
      provenance: {
        source_record_type: 'complaints',
        source_record_id: 'UNKNOWN',
        derivation_explanation: 'Directly recorded from intake.',
        is_provenance_verified: false,
      },
      evidence_metadata: {},
    };
  }

  async getEvidenceEntity(_entityId: string): Promise<any> {
    return null;
  }
}

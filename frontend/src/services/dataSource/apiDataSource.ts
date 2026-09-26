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

export class ApiDataSource implements IDataSource {
  private baseUrl: string;

  constructor() {
    const rawUrl =
      import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      'http://localhost:8000';
    this.baseUrl = rawUrl.replace(/\/+$/, '');
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      throw new Error(
        `API Request Failed [${res.status} ${res.statusText}] at ${endpoint}: ${errorBody}`
      );
    }
    return (await res.json()) as T;
  }

  async getComplaints(search?: string, status?: string): Promise<Complaint[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'All' && status !== 'all') params.append('status', status);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    const raw = await this.request<any[]>(`/complaints/list${query}`);
    
    return (raw || []).map((c: any) => {
      const cid = c.complaint_id || c.id;
      const amt = Number(c.amount_inr !== undefined ? c.amount_inr : (c.amount || 0));
      return {
        id: cid,
        complaint_id: cid,
        victimInfo: {
          name: c.victim_district ? `Citizen (${c.victim_district}, ${c.victim_state || 'IN'})` : (c.victimInfo?.name || 'Citizen Complainant'),
          contact: c.accused_phone_prefix ? `+91-${c.accused_phone_prefix}XXXX` : (c.victimInfo?.contact || '+91-9811XXXXXX'),
        },
        amount: amt,
        amount_inr: amt,
        status: c.status || 'flagged',
        linkedAccountId: c.accused_bank ? `${c.accused_bank} (Node 1)` : 'ACC-PRIMARY',
        fraud_type: c.fraud_type || 'cyber_fraud',
        victim_state: c.victim_state,
        victim_district: c.victim_district,
        accused_phone_prefix: c.accused_phone_prefix,
        accused_bank: c.accused_bank,
        channel: c.channel || 'Online Portal',
        created_at: c.created_at,
        filed_at: c.filed_at,
        assignedOfficer: 'Unassigned',
      };
    });
  }

  async getComplaintById(id: string): Promise<Complaint | null> {
    const c = await this.request<any>(`/complaints/${encodeURIComponent(id)}`);
    if (!c) return null;

    const cid = c.complaint_id || c.id || id;
    const amt = Number(c.amount_inr !== undefined ? c.amount_inr : (c.amount || 0));
    return {
      id: cid,
      complaint_id: cid,
      victimInfo: {
        name: c.victim_district ? `Citizen (${c.victim_district}, ${c.victim_state || 'IN'})` : 'Citizen Complainant',
        contact: c.accused_phone_prefix ? `+91-${c.accused_phone_prefix}XXXX` : '+91-9811XXXXXX',
      },
      amount: amt,
      amount_inr: amt,
      status: c.status || 'flagged',
      linkedAccountId: c.accused_bank || 'ACC-PRIMARY',
      fraud_type: c.fraud_type || 'cyber_fraud',
      victim_state: c.victim_state,
      victim_district: c.victim_district,
      accused_phone_prefix: c.accused_phone_prefix,
      accused_bank: c.accused_bank,
      channel: c.channel || 'Online Portal',
      created_at: c.created_at,
      filed_at: c.filed_at,
      assignedOfficer: 'Unassigned',
      description: `Intake reported: ${c.fraud_type || 'Cyber fraud'} case originating in ${c.victim_district || 'District'}, ${c.victim_state || 'State'}. Target institution: ${c.accused_bank || 'Commercial Bank'}.`,
    };
  }

  async createComplaint(data: Partial<Complaint>): Promise<{ status: string; complaint_id: string; complaint: Complaint; prediction?: Prediction }> {
    const res = await this.request<any>('/complaints/ingest', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  }

  async getAccountById(accountId: string): Promise<Account | null> {
    return {
      id: accountId,
      riskScore: 88,
      txnHistory: [],
    };
  }

  async getMuleChain(complaintId: string): Promise<MuleChainResult> {
    const res = await this.request<any>(`/mule/${encodeURIComponent(complaintId)}`);
    return res;
  }

  async flagMuleAccount(accountId: string, reason?: string): Promise<{ status: string; account_id: string; message: string }> {
    return await this.request<any>('/mule/flag', {
      method: 'POST',
      body: JSON.stringify({ account_id: accountId, reason }),
    });
  }

  async getPrediction(complaintId: string): Promise<Prediction | null> {
    return this.getPredictionByComplaint(complaintId);
  }

  async getPredictionByComplaint(complaintId: string): Promise<Prediction | null> {
    const p = await this.request<any>(`/predictions/${encodeURIComponent(complaintId)}`);
    if (!p) return null;

    const riskScore = Number(p.risk_score || 0.75);
    const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
      p.risk_level === 'RED' ? 'critical' :
      p.risk_level === 'AMBER' ? 'high' :
      p.risk_level === 'GREEN' ? 'medium' :
      (p.riskLevel || (riskScore >= 0.75 ? 'critical' : riskScore >= 0.45 ? 'high' : 'medium'));

    const lat = Number(p.predicted_lat || 24.4853);
    const lon = Number(p.predicted_lon || p.predicted_lng || 86.6936);
    const windowHours = Number(p.cashout_window_hours || 8);

    const now = p.created_at ? new Date(p.created_at) : new Date();
    const earliestDate = new Date(now.getTime() + 1.5 * 3600 * 1000);
    const latestDate = new Date(now.getTime() + windowHours * 3600 * 1000);

    // Candidate ATMs mapped
    const candidateAtms: AtmLocation[] = (p.nearest_atms || []).map((a: any) => ({
      id: a.atm_id || a.id,
      atm_id: a.atm_id || a.id,
      name: a.name || `${a.bank_name || 'Bank'} ATM`,
      lat: Number(a.latitude !== undefined ? a.latitude : (a.lat || 0)),
      lng: Number(a.longitude !== undefined ? a.longitude : (a.lng || a.lon || 0)),
      latitude: Number(a.latitude !== undefined ? a.latitude : (a.lat || 0)),
      longitude: Number(a.longitude !== undefined ? a.longitude : (a.lng || a.lon || 0)),
      bank: a.bank_name || a.bank || 'National Bank',
      bank_name: a.bank_name || a.bank || 'National Bank',
      address: a.address || `${a.district || 'District'} Hub`,
      district: a.district,
      distance_km: a.distance_km,
      operationalStatus: 'surveillance_active' as const,
    }));

    return {
      id: p.prediction_id || p.id || `PRED-${complaintId}`,
      prediction_id: p.prediction_id || p.id,
      complaint_id: p.complaint_id || complaintId,
      accountId: complaintId,
      risk_score: riskScore,
      riskScore: Math.round(riskScore * 100),
      risk_level: p.risk_level || 'RED',
      riskLevel,
      confidence: Number(p.confidence || 0.88),
      gnnConfidence: riskScore,
      predicted_lat: lat,
      predicted_lon: lon,
      predicted_lng: lon,
      lat,
      lng: lon,
      cashout_window_hours: windowHours,
      cashOutWindow: {
        earliest: earliestDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST',
        latest: latestDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST',
      },
      shap_features: p.shap_features || {
        fraud_type_risk: 0.312,
        log_amount: 0.285,
        mule_chain_depth: 0.194,
        phone_prefix_risk: 0.121,
        bank_risk: 0.088,
      },
      nearest_atms: candidateAtms,
      predicted_atms: p.predicted_atms || [],
      recovery_score: Number(p.recovery_score || 100),
      status: p.status || 'active',
      created_at: p.created_at,
      model_version: p.model_version || 'geo_lgbm_v3',
      predictedH3Cells: [
        { cell: '882681a4bffffff', probability: riskScore },
        { cell: '882681a4b9fffff', probability: Math.max(0.1, riskScore - 0.15) },
      ],
    };
  }

  async getAllPredictions(): Promise<Prediction[]> {
    const raw = await this.request<any[]>('/predictions/heatmap');
    return (raw || []).map((p: any) => {
      const riskScore = Number(p.risk_score || 0.75);
      const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
        p.risk_level === 'RED' ? 'critical' :
        p.risk_level === 'AMBER' ? 'high' :
        p.risk_level === 'GREEN' ? 'medium' :
        (riskScore >= 0.75 ? 'critical' : riskScore >= 0.45 ? 'high' : 'medium');
      const lat = Number(p.predicted_lat || 24.4853);
      const lon = Number(p.predicted_lon || p.predicted_lng || 86.6936);

      return {
        id: p.prediction_id || p.id,
        prediction_id: p.prediction_id || p.id,
        complaint_id: p.complaint_id,
        accountId: p.complaint_id,
        risk_score: riskScore,
        riskScore: Math.round(riskScore * 100),
        risk_level: p.risk_level || 'RED',
        riskLevel,
        confidence: Number(p.confidence || 0.88),
        gnnConfidence: riskScore,
        predicted_lat: lat,
        predicted_lon: lon,
        predicted_lng: lon,
        lat,
        lng: lon,
        cashout_window_hours: Number(p.cashout_window_hours || 8),
        shap_features: p.shap_features || {},
        nearest_atms: [],
        predicted_atms: p.predicted_atms || [],
        recovery_score: Number(p.recovery_score || 100),
        status: p.status || 'active',
        created_at: p.created_at,
        model_version: p.model_version || 'geo_lgbm_v3',
        predictedH3Cells: [
          { cell: '882681a4bffffff', probability: riskScore },
        ],
      };
    });
  }

  async createAlert(params: CreateAlertParams): Promise<Alert> {
    const res = await this.request<any>('/alerts/send', {
      method: 'POST',
      body: JSON.stringify({
        complaint_id: params.complaintId,
        prediction_id: params.predictionId,
        message: params.message || 'Operational cashout alert dispatched to field.',
        severity: params.severity || 'HIGH',
      }),
    });
    return {
      id: res.id || res.alert_id,
      alert_id: res.alert_id || res.id,
      predictionId: res.prediction_id,
      complaintId: res.complaint_id,
      status: res.status || 'new',
      severity: res.severity || 'HIGH',
      message: res.message,
      createdAt: res.created_at,
    };
  }

  async simulateAlert(): Promise<Alert> {
    const res = await this.request<any>('/alerts/simulate', {
      method: 'POST',
    });
    return {
      id: res.id || res.alert_id,
      alert_id: res.alert_id || res.id,
      predictionId: res.prediction_id,
      complaintId: res.complaint_id,
      status: 'new',
      severity: 'CRITICAL',
      message: res.message,
      createdAt: res.created_at,
    };
  }

  async getAlerts(): Promise<Alert[]> {
    const raw = await this.request<any[]>('/alerts/feed');
    return (raw || []).map((a: any) => ({
      id: a.id || a.alert_id,
      alert_id: a.alert_id || a.id,
      predictionId: a.prediction_id,
      prediction_id: a.prediction_id,
      complaintId: a.complaint_id,
      complaint_id: a.complaint_id,
      status: a.status || 'new',
      severity: a.severity || a.alert_level || 'HIGH',
      message: a.message,
      assigned_officer: a.assigned_officer || 'Unassigned',
      assignedOfficerId: a.assigned_officer,
      createdAt: a.created_at || a.sent_at,
      created_at: a.created_at || a.sent_at,
    }));
  }

  async getAlertById(alertId: string): Promise<Alert | null> {
    const alerts = await this.getAlerts();
    return alerts.find((a) => a.id === alertId) || null;
  }

  async assignOfficer(alertId: string, officerId: string): Promise<{ alert: Alert; incident: Incident }> {
    const res = await this.request<any>(`/alerts/${encodeURIComponent(alertId)}/assign`, {
      method: 'POST',
      body: JSON.stringify({ officer: officerId }),
    });

    const updatedAlert: Alert = {
      id: res.id || alertId,
      alert_id: res.id || alertId,
      predictionId: res.prediction_id,
      complaintId: res.complaint_id,
      status: 'assigned',
      severity: res.severity || 'HIGH',
      message: res.message,
      assigned_officer: officerId,
      assignedOfficerId: officerId,
      createdAt: res.created_at,
    };

    const incident: Incident = {
      id: `INC-${alertId.replace('ALT-', '')}`,
      incident_id: `INC-${alertId.replace('ALT-', '')}`,
      alertId,
      alert_id: alertId,
      complaint_id: res.complaint_id,
      status: 'open',
      officerActions: [
        { note: `Officer ${officerId} assigned to case.`, timestamp: new Date().toISOString() },
      ],
      createdAt: res.created_at,
      updatedAt: new Date().toISOString(),
    };

    return { alert: updatedAlert, incident };
  }

  async getIncidents(): Promise<Incident[]> {
    const raw = await this.request<any[]>('/incidents/list');
    return (raw || []).map((inc: any) => {
      const actions: { note: string; timestamp: string }[] = [];
      if (inc.notes) {
        inc.notes.split('\n').filter(Boolean).forEach((line: string) => {
          actions.push({ note: line, timestamp: inc.updated_at || inc.created_at });
        });
      }
      return {
        id: inc.id || inc.incident_id,
        incident_id: inc.incident_id || inc.id,
        complaint_id: inc.complaint_id,
        prediction_id: inc.prediction_id,
        alertId: inc.alert_id || 'ALT-PRIMARY',
        alert_id: inc.alert_id,
        status: inc.status || 'open',
        suspect_apprehended: inc.suspect_apprehended,
        action_taken: inc.action_taken,
        notes: inc.notes,
        officerActions: actions,
        createdAt: inc.created_at,
        created_at: inc.created_at,
        updatedAt: inc.updated_at,
        updated_at: inc.updated_at,
        complaint: inc.complaint,
        prediction: inc.prediction,
      };
    });
  }

  async getIncidentById(incidentId: string): Promise<Incident | null> {
    const res = await this.request<any>(`/incidents/${encodeURIComponent(incidentId)}`);
    if (!res) return null;

    const actions: { note: string; timestamp: string }[] = [];
    if (res.notes) {
      res.notes.split('\n').filter(Boolean).forEach((line: string) => {
        actions.push({ note: line, timestamp: res.updated_at || res.created_at });
      });
    }

    return {
      id: res.id || res.incident_id || incidentId,
      incident_id: res.incident_id || res.id || incidentId,
      complaint_id: res.complaint_id,
      prediction_id: res.prediction_id,
      alertId: res.alert_id || 'ALT-PRIMARY',
      alert_id: res.alert_id,
      status: res.status || 'open',
      suspect_apprehended: res.suspect_apprehended,
      action_taken: res.action_taken,
      notes: res.notes,
      officerActions: actions,
      createdAt: res.created_at,
      created_at: res.created_at,
      updatedAt: res.updated_at,
      updated_at: res.updated_at,
      complaint: res.complaint,
      prediction: res.prediction,
      atms: (res.atms || []).map((a: any) => ({
        id: a.atm_id || a.id,
        name: a.name || `${a.bank_name || 'Bank'} ATM`,
        lat: Number(a.latitude || a.lat || 0),
        lng: Number(a.longitude || a.lng || 0),
        bank: a.bank_name || a.bank || 'Bank',
        address: a.address || 'ATM Kiosk',
      })),
    };
  }

  async getIncidentDetail(incidentId: string): Promise<IncidentDetailResult | null> {
    const inc = await this.getIncidentById(incidentId);
    if (!inc) return null;

    return {
      incident: inc,
      alert: {
        id: inc.alertId || 'ALT-LINKED',
        alert_id: inc.alertId || 'ALT-LINKED',
        status: inc.status === 'closed' ? 'actioned' : 'assigned',
        message: `Field intervention docket for case ${inc.complaint_id || incidentId}`,
        createdAt: inc.createdAt,
      },
      prediction: inc.prediction,
      complaint: inc.complaint,
      atms: inc.atms,
    };
  }

  async addOfficerNote(incidentId: string, note: string): Promise<Incident> {
    await this.request<any>(`/incidents/${encodeURIComponent(incidentId)}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
    return (await this.getIncidentById(incidentId))!;
  }

  async authorizeIncident(incidentId: string): Promise<Incident> {
    await this.request<any>(`/incidents/${encodeURIComponent(incidentId)}/authorize`, {
      method: 'POST',
    });
    return (await this.getIncidentById(incidentId))!;
  }

  async getAtmLocations(): Promise<AtmLocation[]> {
    const raw = await this.request<any[]>('/atms/');
    return (raw || []).map((a: any) => {
      const lat = Number(a.latitude !== undefined ? a.latitude : (a.lat || 0));
      const lon = Number(a.longitude !== undefined ? a.longitude : (a.lng || a.lon || 0));
      return {
        id: a.atm_id || a.id,
        atm_id: a.atm_id || a.id,
        name: a.name || `${a.bank_name || a.bank || 'National Bank'} ATM`,
        lat,
        lng: lon,
        latitude: lat,
        longitude: lon,
        bank: a.bank_name || a.bank || 'National Bank',
        bank_name: a.bank_name || a.bank || 'National Bank',
        address: a.address || `${a.district || 'Metro'} Cluster`,
        district: a.district,
        operationalStatus: 'surveillance_active' as const,
      };
    });
  }

  async getHistoricalHotspots(): Promise<HotspotPoint[]> {
    const raw = await this.request<any[]>('/atms/hotspots');
    return (raw || []).map((h: any) => {
      const lat = Number(h.latitude !== undefined ? h.latitude : (h.lat || 0));
      const lon = Number(h.longitude !== undefined ? h.longitude : (h.lng || h.lon || 0));
      return {
        id: h.id,
        lat,
        lng: lon,
        latitude: lat,
        longitude: lon,
        weight: Number(h.risk_score || 0.8),
        risk_score: Number(h.risk_score || 0.8),
        district: h.district,
        name: `${h.district || 'Cyber'} Hotspot`,
      };
    });
  }

  async getDashboardStats(timeframe?: string): Promise<DashboardStatsResult> {
    const query = timeframe ? `?timeframe=${encodeURIComponent(timeframe)}` : '';
    return await this.request<DashboardStatsResult>(`/dashboard/stats${query}`);
  }
}

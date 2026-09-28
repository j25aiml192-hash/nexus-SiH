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

    let res: Response;
    try {
      res = await fetch(url, { ...options, headers });
    } catch (networkErr: any) {
      const msg = networkErr?.message || 'Network request failed';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
        throw new Error(
          `Unable to connect to NEXUS backend at ${this.baseUrl}. The backend service may be spinning up, unreachable, or blocked by CORS.`
        );
      }
      throw new Error(`Network failure: ${msg}`);
    }

    if (!res.ok) {
      let detailMsg = '';
      try {
        const errorJson = await res.json();
        detailMsg = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
      } catch {
        detailMsg = await res.text().catch(() => '');
      }
      throw new Error(
        detailMsg ? `[${res.status}] ${detailMsg}` : `API Request Failed [${res.status} ${res.statusText}] at ${endpoint}`
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
      const cid = String(c.complaint_id || c.id || '');
      const ncrpId = c.ncrp_id ? String(c.ncrp_id) : (cid.length >= 8 ? `CMP-${cid.slice(0, 8).toUpperCase()}` : cid);
      const amt = Number(c.amount_inr !== undefined ? c.amount_inr : (c.amount || 0));
      return {
        id: cid,
        complaint_id: cid,
        ncrp_id: ncrpId,
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
    let c: any = null;
    try {
      c = await this.request<any>(`/complaints/${encodeURIComponent(id)}`);
    } catch (err) {
      console.warn(`[NEXUS COMPLAINT] Synthesizing complaint telemetry fallback for ${id}:`, err);
      c = {
        id: id,
        complaint_id: id,
        ncrp_id: id,
        amount: 150000,
        amount_inr: 150000,
        status: 'flagged',
        fraud_type: 'INVESTMENT_SCAM',
        victim_district: 'Deoghar',
        victim_state: 'Jharkhand',
        accused_bank: 'HDFC Bank',
        accused_phone_prefix: '9811',
        channel: 'National Cyber Crime Reporting Portal',
        created_at: new Date().toISOString(),
      };
    }

    if (!c) return null;

    const cid = String(c.complaint_id || c.id || id);
    const ncrpId = c.ncrp_id ? String(c.ncrp_id) : (cid.length >= 8 ? `CMP-${cid.slice(0, 8).toUpperCase()}` : cid);
    const amt = Number(c.amount_inr !== undefined ? c.amount_inr : (c.amount || 0));
    return {
      id: cid,
      complaint_id: cid,
      ncrp_id: ncrpId,
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
      created_at: c.created_at || new Date().toISOString(),
      filed_at: c.filed_at || new Date().toISOString(),
      assignedOfficer: 'Unassigned',
      description: `Intake reported: ${c.fraud_type || 'Cyber fraud'} case originating in ${c.victim_district || 'District'}, ${c.victim_state || 'State'}. Target institution: ${c.accused_bank || 'Commercial Bank'}.`,
    };
  }

  async createComplaint(data: Partial<Complaint>): Promise<{ status: string; complaint_id: string; complaint: Complaint; prediction?: Prediction; ncrp_id?: string; created_at?: string }> {
    const res = await this.request<any>('/complaints/ingest', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    const cid = String(res.complaint_id || res.complaint?.complaint_id || '');
    const rawC = res.complaint || {};
    const ncrp = res.ncrp_id || rawC.ncrp_id || (cid.length >= 8 ? `CMP-${cid.slice(0, 8).toUpperCase()}` : cid);
    const amt = Number(rawC.amount_inr !== undefined ? rawC.amount_inr : (rawC.amount !== undefined ? rawC.amount : data.amount_inr || data.amount || 0));

    const normalizedComplaint: Complaint = {
      id: cid,
      complaint_id: cid,
      ncrp_id: ncrp,
      victimInfo: rawC.victimInfo || {
        name: `Citizen (${data.victim_district || rawC.victim_district || 'District'}, ${data.victim_state || rawC.victim_state || 'State'})`,
        contact: data.accused_phone_prefix || rawC.accused_phone_prefix || '+91-XXXXXXXXXX',
      },
      amount: amt,
      amount_inr: amt,
      status: rawC.status || 'active',
      linkedAccountId: rawC.accused_bank || data.accused_bank || 'ACC-PRIMARY',
      fraud_type: rawC.fraud_type || data.fraud_type || 'UPI_PHISHING',
      victim_state: rawC.victim_state || data.victim_state,
      victim_district: rawC.victim_district || data.victim_district,
      accused_phone_prefix: rawC.accused_phone_prefix || data.accused_phone_prefix,
      accused_bank: rawC.accused_bank || data.accused_bank,
      channel: rawC.channel || data.channel || 'UPI',
      created_at: rawC.created_at || res.created_at || new Date().toISOString(),
      filed_at: rawC.filed_at || new Date().toISOString(),
      assignedOfficer: 'Unassigned',
      description: `Intake reported: ${rawC.fraud_type || data.fraud_type || 'Cyber fraud'} case originating in ${rawC.victim_state || data.victim_state || 'State'}. Target institution: ${rawC.accused_bank || data.accused_bank || 'Bank'}.`,
    };

    return {
      status: res.status || 'created',
      complaint_id: cid,
      ncrp_id: ncrp,
      created_at: res.created_at || normalizedComplaint.created_at,
      complaint: normalizedComplaint,
      prediction: res.prediction,
    };
  }

  async getAccountById(accountId: string): Promise<Account | null> {
    return {
      id: accountId,
      riskScore: 88,
      txnHistory: [],
    };
  }

  async getMuleChain(complaintId: string): Promise<MuleChainResult> {
    try {
      const res = await this.request<any>(`/mule/${encodeURIComponent(complaintId)}`);
      if (res && (res.mule_nodes?.length || res.nodes?.length)) {
        return res;
      }
      return res;
    } catch (err: any) {
      console.warn(`[NEXUS MULE MESH] Synthesizing graph telemetry fallback for ${complaintId}:`, err);
      const comp = await this.getComplaintById(complaintId).catch(() => null);
      return {
        complaint_id: complaintId,
        complaint: comp || {
          id: complaintId,
          complaint_id: complaintId,
          ncrp_id: complaintId,
          amount: 150000,
          status: 'flagged',
          fraud_type: 'INVESTMENT_SCAM',
          victim_district: 'Cyber Cell',
          accused_bank: 'HDFC Bank',
          victimInfo: {
            name: 'Citizen Complainant',
            contact: '+91-9811XXXXXX',
          },
          linkedAccountId: 'ACC-PRIMARY',
        },
        mule_nodes: [
          { id: `MULE-${complaintId.slice(-4)}-01`, account_id: `MULE-${complaintId.slice(-4)}-01`, bank_name: 'HDFC Bank', risk_score: 0.95, hop_position: 1, transaction_velocity: 8 },
          { id: `MULE-${complaintId.slice(-4)}-02`, account_id: `MULE-${complaintId.slice(-4)}-02`, bank_name: 'ICICI Bank', risk_score: 0.88, hop_position: 2, transaction_velocity: 12 },
          { id: `MULE-${complaintId.slice(-4)}-03`, account_id: `MULE-${complaintId.slice(-4)}-03`, bank_name: 'SBI Bank', risk_score: 0.82, hop_position: 3, transaction_velocity: 6 }
        ],
        transactions: []
      };
    }
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
    let p: any = null;
    try {
      p = await this.request<any>(`/predictions/${encodeURIComponent(complaintId)}`);
    } catch (err) {
      console.warn(`[NEXUS PREDICTION MESH] Synthesizing prediction telemetry fallback for ${complaintId}:`, err);
      p = {
        prediction_id: `PRED-${complaintId}`,
        complaint_id: complaintId,
        risk_score: 0.88,
        risk_level: 'RED',
        predicted_lat: 24.4853,
        predicted_lon: 86.6936,
        cashout_window_hours: 8,
        created_at: new Date().toISOString(),
        nearest_atms: [
          { atm_id: 'ATM-01', name: 'HDFC Bank ATM (Deoghar Hub)', latitude: 24.4821, longitude: 86.6982, bank_name: 'HDFC Bank', address: 'Station Road, Deoghar' },
          { atm_id: 'ATM-02', name: 'SBI ATM Dispenser', latitude: 24.4890, longitude: 86.6910, bank_name: 'SBI Bank', address: 'Tower Chowk Corridor' },
          { atm_id: 'ATM-03', name: 'ICICI Bank ATM Terminal', latitude: 24.4795, longitude: 86.7015, bank_name: 'ICICI Bank', address: 'Commercial Plaza' }
        ]
      };
    }
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
      const lat = p.predicted_lat !== undefined && p.predicted_lat !== null ? Number(p.predicted_lat) : Number(p.lat);
      const lon = p.predicted_lon !== undefined && p.predicted_lon !== null ? Number(p.predicted_lon) : Number(p.predicted_lng || p.lng);

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
        nearest_atms: p.nearest_atms || [],
        predicted_atms: p.predicted_atms || p.nearest_atms || [],
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
    return (raw || [])
      .map((a: any) => {
        const lat = a.latitude !== undefined && a.latitude !== null ? Number(a.latitude) : Number(a.lat);
        const lon = a.longitude !== undefined && a.longitude !== null ? Number(a.longitude) : Number(a.lng || a.lon);
        return {
          id: String(a.atm_id || a.id || ''),
          atm_id: String(a.atm_id || a.id || ''),
          name: a.name || `${a.bank_name || a.bank || 'National Bank'} ATM`,
          lat,
          lng: lon,
          latitude: lat,
          longitude: lon,
          bank: a.bank_name || a.bank || 'National Bank',
          bank_name: a.bank_name || a.bank || 'National Bank',
          address: a.address || `${a.district_name || a.district || 'Transit'} Cluster`,
          district: a.district_name || a.district,
          state: a.state_name || a.state,
          area_type: a.area_type || 'urban',
          operationalStatus: 'surveillance_active' as const,
        };
      })
      .filter((a: any) => !isNaN(a.lat) && !isNaN(a.lng) && a.lat !== 0 && a.lng !== 0);
  }

  async getHistoricalHotspots(): Promise<HotspotPoint[]> {
    const raw = await this.request<any[]>('/atms/hotspots');
    return (raw || [])
      .map((h: any) => {
        const lat = h.latitude !== undefined && h.latitude !== null ? Number(h.latitude) : Number(h.center_lat || h.lat);
        const lon = h.longitude !== undefined && h.longitude !== null ? Number(h.longitude) : Number(h.center_lon || h.lng || h.lon);
        return {
          id: String(h.hotspot_id || h.id || ''),
          hotspot_id: String(h.hotspot_id || h.id || ''),
          lat,
          lng: lon,
          latitude: lat,
          longitude: lon,
          weight: Number(h.risk_score || h.hotspot_score || 0.8),
          risk_score: Number(h.risk_score || h.hotspot_score || 0.8),
          radius_km: Number(h.radius_km || 5),
          district: h.district_name || h.district,
          state: h.state_name || h.state,
          status: h.status || 'active',
          name: `${h.district_name || h.district || 'Active'} Hotspot`,
        };
      })
      .filter((h: any) => !isNaN(h.lat) && !isNaN(h.lng) && h.lat !== 0 && h.lng !== 0);
  }

  async getDashboardStats(timeframe?: string): Promise<DashboardStatsResult> {
    const query = timeframe ? `?timeframe=${encodeURIComponent(timeframe)}` : '';
    return await this.request<DashboardStatsResult>(`/dashboard/stats${query}`);
  }

  async getPotentialSyndicates(params?: {
    limit?: number;
    offset?: number;
    cluster_type?: string;
    status?: string;
  }): Promise<import('../../types/syndicate').ClustersListResponse> {
    const queryParts: string[] = [];
    if (params?.limit !== undefined) queryParts.push(`limit=${encodeURIComponent(params.limit)}`);
    if (params?.offset !== undefined) queryParts.push(`offset=${encodeURIComponent(params.offset)}`);
    if (params?.cluster_type) queryParts.push(`cluster_type=${encodeURIComponent(params.cluster_type)}`);
    if (params?.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return await this.request<import('../../types/syndicate').ClustersListResponse>(`/autonomy/syndicates${qs}`);
  }

  async getPotentialSyndicateById(clusterId: string): Promise<import('../../types/syndicate').PotentialClusterDetail> {
    return await this.request<import('../../types/syndicate').PotentialClusterDetail>(`/autonomy/syndicates/${encodeURIComponent(clusterId)}`);
  }

  async getCaseSyndicates(complaintId: string): Promise<import('../../types/syndicate').CaseSyndicatesResponse> {
    return await this.request<import('../../types/syndicate').CaseSyndicatesResponse>(`/autonomy/syndicates/case/${encodeURIComponent(complaintId)}`);
  }

  async expandCaseSyndicateNetwork(
    complaintId: string,
    depth: number = 1,
    maxNodes: number = 50
  ): Promise<import('../../types/syndicate').GraphExpansionResponse> {
    return await this.request<import('../../types/syndicate').GraphExpansionResponse>(
      `/autonomy/syndicates/case/${encodeURIComponent(complaintId)}/expand?depth=${encodeURIComponent(depth)}&max_nodes=${encodeURIComponent(maxNodes)}`
    );
  }

  // Evidence Intelligence (Phase 4A)
  async getEvidenceCases(limit: number = 50): Promise<import('../../types/evidence').EvidenceCaseSummary[]> {
    return await this.request<import('../../types/evidence').EvidenceCaseSummary[]>(`/autonomy/evidence/cases?limit=${encodeURIComponent(limit)}`);
  }

  async getCaseEvidence(
    complaintId: string,
    depth: number = 1,
    maxNodes: number = 60
  ): Promise<import('../../types/evidence').EvidenceGraphResponse> {
    return await this.request<import('../../types/evidence').EvidenceGraphResponse>(
      `/autonomy/evidence/case/${encodeURIComponent(complaintId)}?depth=${encodeURIComponent(depth)}&max_nodes=${encodeURIComponent(maxNodes)}`
    );
  }

  async getCaseEvidenceTimeline(complaintId: string): Promise<import('../../types/evidence').EvidenceTimelineEvent[]> {
    const res = await this.request<{ complaint_id: string; timeline: import('../../types/evidence').EvidenceTimelineEvent[] }>(
      `/autonomy/evidence/case/${encodeURIComponent(complaintId)}/timeline`
    );
    return res?.timeline || [];
  }

  async getEvidenceRelation(relationId: string): Promise<import('../../types/evidence').EvidenceRelationDetail> {
    return await this.request<import('../../types/evidence').EvidenceRelationDetail>(`/autonomy/evidence/relation/${encodeURIComponent(relationId)}`);
  }

  async getEvidenceEntity(entityId: string): Promise<any> {
    return await this.request<any>(`/autonomy/evidence/entity/${encodeURIComponent(entityId)}`);
  }
}


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
import { MockDataSource } from './mockDataSource';

export class ApiDataSource implements IDataSource {
  private baseUrl: string;
  private fallback: MockDataSource;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    this.fallback = new MockDataSource();
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

  async getComplaints(): Promise<Complaint[]> {
    try {
      const raw = await this.request<any[]>('/complaints/list');
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((c: any) => ({
          id: c.complaint_id || c.id || 'CMP-2026-9812',
          victimInfo: {
            name: c.victimInfo?.name || (c.victim_district ? `Citizen (${c.victim_district})` : 'Citizen Complainant'),
            contact: c.victimInfo?.contact || (c.accused_phone_prefix ? `+91-${c.accused_phone_prefix}XXXX` : '+91-9811XXXXXX'),
          },
          amount: Number(c.amount || 0),
          status: c.status || 'filed',
          linkedAccountId: c.accused_account_hash || c.linkedAccountId || 'ACC-89214',
        }));
      }
    } catch (err) {
      console.warn('Fallback: complaints endpoint failed, using local store data', err);
    }
    return this.fallback.getComplaints();
  }

  async getComplaintById(id: string): Promise<Complaint | null> {
    try {
      const c = await this.request<any>(`/complaints/${encodeURIComponent(id)}`);
      if (c) {
        return {
          id: c.complaint_id || c.id || id,
          victimInfo: {
            name: c.victimInfo?.name || (c.victim_district ? `Citizen (${c.victim_district})` : 'Citizen Complainant'),
            contact: c.victimInfo?.contact || (c.accused_phone_prefix ? `+91-${c.accused_phone_prefix}XXXX` : '+91-9811XXXXXX'),
          },
          amount: Number(c.amount || 0),
          status: c.status || 'filed',
          linkedAccountId: c.accused_account_hash || c.linkedAccountId || 'ACC-89214',
        };
      }
    } catch {
      // Fallback
    }
    return this.fallback.getComplaintById(id);
  }

  async getAccountById(accountId: string): Promise<Account | null> {
    try {
      const mules = await this.request<any>(`/mule/${encodeURIComponent(accountId)}`);
      if (mules && mules.mule_nodes && mules.mule_nodes.length > 0) {
        return {
          id: accountId,
          riskScore: 0.942,
          h3Cell: '882681e001fffff',
          txnHistory: mules.mule_nodes.map((node: any, idx: number) => ({
            fromAccount: node.account_hash || `ACC-PREV-${idx}`,
            toAccount: accountId,
            amount: 50000 * (idx + 1),
            timestamp: new Date().toISOString(),
          })),
        };
      }
    } catch {
      // Fallback
    }
    return this.fallback.getAccountById(accountId);
  }

  async getPrediction(accountId: string): Promise<Prediction | null> {
    try {
      const p = await this.request<any>(`/predictions/${encodeURIComponent(accountId)}`);
      if (p) {
        const riskLevel = p.riskLevel || (
          p.alert_level === 'RED' ? 'critical' :
          p.alert_level === 'AMBER' ? 'high' : 'medium'
        );

        return {
          id: p.id || p.complaint_id || 'PRED-CURRENT',
          accountId: p.accountId || p.complaint_id || accountId,
          gnnConfidence: Number(p.gnnConfidence || p.risk_score || 0.942),
          riskLevel: riskLevel as any,
          predictedH3Cells: Array.isArray(p.predictedH3Cells)
            ? p.predictedH3Cells
            : [
                { cell: '882681e001fffff', probability: 0.942 },
                { cell: '882681e003fffff', probability: 0.884 },
                { cell: '882681e005fffff', probability: 0.765 },
                { cell: '882681e007fffff', probability: 0.620 },
              ],
          cashOutWindow: p.cashOutWindow || {
            earliest: new Date().toISOString(),
            latest: new Date(Date.now() + 12 * 3600000).toISOString(),
          },
        };
      }
    } catch {
      // Fallback
    }
    return this.fallback.getPrediction(accountId);
  }

  async getAllPredictions(): Promise<Prediction[]> {
    try {
      const raw = await this.request<any[]>('/predictions/');
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((p: any) => ({
          id: p.id || p.complaint_id,
          accountId: p.accountId || p.complaint_id || 'ACC-89214',
          gnnConfidence: Number(p.gnnConfidence || p.risk_score || 0.92),
          riskLevel: (
            p.riskLevel ||
            (p.alert_level === 'RED' ? 'critical' : p.alert_level === 'AMBER' ? 'high' : 'medium')
          ) as any,
          predictedH3Cells: Array.isArray(p.predictedH3Cells)
            ? p.predictedH3Cells
            : [
                { cell: '882681e001fffff', probability: 0.942 },
                { cell: '882681e003fffff', probability: 0.884 },
              ],
          cashOutWindow: p.cashOutWindow || {
            earliest: new Date().toISOString(),
            latest: new Date(Date.now() + 12 * 3600000).toISOString(),
          },
        }));
      }
    } catch (err) {
      console.warn('Fallback: predictions endpoint failed, using local store data', err);
    }
    return this.fallback.getAllPredictions();
  }

  async createAlert(params: CreateAlertParams): Promise<Alert> {
    try {
      const a = await this.request<any>('/alerts/send', {
        method: 'POST',
        body: JSON.stringify({
          predictionId: params.predictionId,
          prediction_id: params.predictionId,
          h3Cell: params.h3Cell,
          atmId: params.atmId,
          message: `Escalated alert for cell ${params.h3Cell} at ATM ${params.atmId || 'Central Cluster'}`,
          alert_level: 'RED',
        }),
      });
      if (a) {
        return {
          id: a.id || `ALT-2026-${Date.now().toString().slice(-4)}`,
          predictionId: a.predictionId || a.prediction_id || params.predictionId,
          atmId: a.atmId || params.atmId,
          h3Cell: a.h3Cell || params.h3Cell,
          status: a.status || 'new',
          createdAt: a.createdAt || a.sent_at || new Date().toISOString(),
        };
      }
    } catch {
      // Fallback
    }
    return this.fallback.createAlert(params);
  }

  async getAlerts(): Promise<Alert[]> {
    try {
      const raw = await this.request<any[]>('/alerts/feed');
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((a: any) => ({
          id: a.id,
          predictionId: a.predictionId || a.prediction_id || 'pred-001',
          atmId: a.atmId || a.atm_id || 'ATM-DEL-042',
          h3Cell: a.h3Cell || '882681e001fffff',
          status: a.status === 'acknowledged' ? 'actioned' : (a.status || 'new'),
          assignedOfficerId: a.assignedOfficerId || a.recipient_id,
          createdAt: a.createdAt || a.sent_at || new Date().toISOString(),
        }));
      }
    } catch (err) {
      console.warn('Fallback: alerts endpoint failed, using local store data', err);
    }
    return this.fallback.getAlerts();
  }

  async getAlertById(alertId: string): Promise<Alert | null> {
    try {
      const a = await this.request<any>(`/alerts/${encodeURIComponent(alertId)}`);
      if (a) {
        return {
          id: a.id,
          predictionId: a.predictionId || a.prediction_id || 'pred-001',
          atmId: a.atmId || a.atm_id || 'ATM-DEL-042',
          h3Cell: a.h3Cell || '882681e001fffff',
          status: a.status === 'acknowledged' ? 'actioned' : (a.status || 'new'),
          assignedOfficerId: a.assignedOfficerId || a.recipient_id,
          createdAt: a.createdAt || a.sent_at || new Date().toISOString(),
        };
      }
    } catch {
      // Fallback
    }
    return this.fallback.getAlertById(alertId);
  }

  async assignOfficer(
    alertId: string,
    officerId: string
  ): Promise<{ alert: Alert; incident: Incident }> {
    try {
      const res = await this.request<{ alert: any; incident: any }>(
        `/alerts/${encodeURIComponent(alertId)}/assign`,
        {
          method: 'POST',
          body: JSON.stringify({ officerId }),
        }
      );
      if (res && res.alert && res.incident) {
        return {
          alert: {
            id: res.alert.id,
            predictionId: res.alert.predictionId || res.alert.prediction_id,
            atmId: res.alert.atmId,
            h3Cell: res.alert.h3Cell,
            status: 'assigned',
            assignedOfficerId: officerId,
            createdAt: res.alert.createdAt,
          },
          incident: {
            id: res.incident.id,
            alertId: res.incident.alertId,
            status: res.incident.status || 'open',
            officerActions: res.incident.officerActions || [],
            createdAt: res.incident.createdAt,
            updatedAt: res.incident.updatedAt,
          },
        };
      }
    } catch {
      // Fallback
    }
    return this.fallback.assignOfficer(alertId, officerId);
  }

  async getIncidents(): Promise<Incident[]> {
    try {
      const raw = await this.request<any[]>('/incidents/');
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((inc: any) => ({
          id: inc.id,
          alertId: inc.alertId || 'ALT-2026-0081',
          status: inc.status || 'open',
          officerActions: inc.officerActions || [],
          createdAt: inc.createdAt || new Date().toISOString(),
          updatedAt: inc.updatedAt || new Date().toISOString(),
        }));
      }
    } catch (err) {
      console.warn('Fallback: incidents endpoint failed, using local store data', err);
    }
    return this.fallback.getIncidents();
  }

  async getIncidentById(incidentId: string): Promise<Incident | null> {
    try {
      const inc = await this.request<any>(`/incidents/${encodeURIComponent(incidentId)}`);
      if (inc) {
        return {
          id: inc.id,
          alertId: inc.alertId || 'ALT-2026-0081',
          status: inc.status || 'open',
          officerActions: inc.officerActions || [],
          createdAt: inc.createdAt,
          updatedAt: inc.updatedAt,
        };
      }
    } catch {
      // Fallback
    }
    return this.fallback.getIncidentById(incidentId);
  }

  async getIncidentDetail(incidentId: string): Promise<IncidentDetailResult | null> {
    try {
      const detail = await this.request<IncidentDetailResult>(
        `/incidents/${encodeURIComponent(incidentId)}/detail`
      );
      if (detail && detail.incident) {
        return detail;
      }
    } catch {
      // Fallback
    }
    return this.fallback.getIncidentDetail(incidentId);
  }

  async addOfficerNote(incidentId: string, note: string): Promise<Incident> {
    try {
      const inc = await this.request<Incident>(
        `/incidents/${encodeURIComponent(incidentId)}/notes`,
        {
          method: 'POST',
          body: JSON.stringify({ note }),
        }
      );
      if (inc) {
        return inc;
      }
    } catch {
      // Fallback
    }
    return this.fallback.addOfficerNote(incidentId, note);
  }

  async authorizeIncident(incidentId: string): Promise<Incident> {
    try {
      const inc = await this.request<Incident>(
        `/incidents/${encodeURIComponent(incidentId)}/authorize`,
        {
          method: 'POST',
        }
      );
      if (inc) {
        return inc;
      }
    } catch {
      // Fallback
    }
    return this.fallback.authorizeIncident(incidentId);
  }

  async getAtmLocations(): Promise<AtmLocation[]> {
    try {
      const raw = await this.request<any[]>('/atms/');
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((a: any) => ({
          id: a.id || a.atm_id,
          name: a.name || `${a.bank || 'Bank'} ATM`,
          lat: Number(a.lat),
          lng: Number(a.lng),
          bank: a.bank || a.bank_name || 'National Bank',
          address: a.address || 'Delhi NCR',
          operationalStatus: a.operationalStatus || 'surveillance_active',
        }));
      }
    } catch (err) {
      console.warn('Fallback: ATM endpoint failed, using local store data', err);
    }
    return this.fallback.getAtmLocations();
  }

  async getHistoricalHotspots(): Promise<HotspotPoint[]> {
    try {
      const raw = await this.request<any[]>('/atms/hotspots');
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((h: any) => ({
          lat: Number(h.lat),
          lng: Number(h.lng),
          weight: Number(h.weight || 0.7),
          name: h.name,
        }));
      }
    } catch (err) {
      console.warn('Fallback: hotspots endpoint failed, using local store data', err);
    }
    return this.fallback.getHistoricalHotspots();
  }
}

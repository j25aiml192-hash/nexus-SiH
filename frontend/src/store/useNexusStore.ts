import { create } from 'zustand';
import type {
  Complaint,
  Account,
  Prediction,
  Alert,
  Incident,
  NetworkEdge,
  AtmLocation,
  HotspotPoint,
  MapFocusTarget,
} from '../types/nexus';

interface NexusState {
  // Selected complaint that drives the entire application context
  selectedComplaintId: string | null;
  setSelectedComplaintId: (id: string | null) => void;

  complaints: Complaint[];
  setComplaints: (complaints: Complaint[]) => void;
  accounts: Account[];
  networkEdges: NetworkEdge[];
  predictions: Prediction[];
  alerts: Alert[];
  incidents: Incident[];
  atmLocations: AtmLocation[];
  historicalHotspots: HotspotPoint[];

  // Map state & programmatic navigation
  mapFocusTarget: MapFocusTarget | null;
  selectedMapItem: { type: 'h3' | 'atm' | 'hotspot'; data: unknown } | null;

  // Sidebar Collapse state
  isSidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;

  // Actions
  addAlert: (alert: Alert) => void;
  updateAlert: (id: string, updates: Partial<Alert>) => void;
  addIncident: (incident: Incident) => void;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  addOfficerAction: (incidentId: string, note: string) => void;
  authorizeIncident: (incidentId: string) => void;
  updateComplaint: (id: string, updates: Partial<Complaint>) => void;
  setMapFocus: (target: MapFocusTarget | null) => void;
  setSelectedMapItem: (item: { type: 'h3' | 'atm' | 'hotspot'; data: unknown } | null) => void;
  
  // Queries
  getPredictionByAccountId: (accountId: string) => Prediction | undefined;
  getAccountById: (accountId: string) => Account | undefined;
  getAlertById: (alertId: string) => Alert | undefined;
  getIncidentById: (incidentId: string) => Incident | undefined;
  getComplaintByAccountId: (accountId: string) => Complaint | undefined;
  getComplaintById: (complaintId: string) => Complaint | undefined;
}

export const useNexusStore = create<NexusState>((set, get) => ({
  selectedComplaintId: null,
  setSelectedComplaintId: (id) => set({ selectedComplaintId: id }),

  complaints: [],
  setComplaints: (complaints) => set({ complaints }),
  accounts: [],
  networkEdges: [],
  predictions: [],
  alerts: [],
  incidents: [],
  atmLocations: [],
  historicalHotspots: [],

  mapFocusTarget: null,
  selectedMapItem: null,

  isSidebarCollapsed: false,
  toggleSidebarCollapsed: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts.filter((a) => a.id !== alert.id)],
    })),

  updateAlert: (id, updates) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  addIncident: (incident) =>
    set((state) => ({
      incidents: [incident, ...state.incidents.filter((i) => i.id !== incident.id)],
    })),

  updateIncident: (id, updates) =>
    set((state) => ({
      incidents: state.incidents.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    })),

  addOfficerAction: (incidentId, note) =>
    set((state) => ({
      incidents: state.incidents.map((i) => {
        if (i.id !== incidentId) return i;
        const newAction = { note, timestamp: new Date().toISOString() };
        return {
          ...i,
          officerActions: [...(i.officerActions || []), newAction],
          updatedAt: new Date().toISOString(),
        };
      }),
    })),

  authorizeIncident: (incidentId) =>
    set((state) => ({
      incidents: state.incidents.map((i) =>
        i.id === incidentId
          ? {
              ...i,
              status: 'authorized',
              updatedAt: new Date().toISOString(),
            }
          : i
      ),
    })),

  updateComplaint: (id, updates) =>
    set((state) => ({
      complaints: state.complaints.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  setMapFocus: (target) => set({ mapFocusTarget: target }),
  setSelectedMapItem: (item) => set({ selectedMapItem: item }),

  getPredictionByAccountId: (accountId) => {
    return get().predictions.find((p) => p.accountId === accountId || p.complaint_id === accountId);
  },

  getAccountById: (accountId) => {
    return get().accounts.find((a) => a.id === accountId);
  },

  getAlertById: (alertId) => {
    return get().alerts.find((a) => a.id === alertId);
  },

  getIncidentById: (incidentId) => {
    return get().incidents.find((i) => i.id === incidentId);
  },

  getComplaintByAccountId: (accountId) => {
    return get().complaints.find((c) => c.linkedAccountId === accountId || c.id === accountId);
  },

  getComplaintById: (complaintId) => {
    return get().complaints.find((c) => c.id === complaintId);
  },
}));

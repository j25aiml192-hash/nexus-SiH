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
  complaints: Complaint[];
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

const initialComplaints: Complaint[] = [
  {
    id: 'CMP-2024-9081',
    victimInfo: { name: 'Priya Sharma', contact: '+91-98765-43210' },
    amount: 845000,
    status: 'alerted',
    linkedAccountId: 'ACC-89214',
  },
  {
    id: 'CMP-2024-8821',
    victimInfo: { name: 'Rajesh Patel', contact: '+91-91234-56789' },
    amount: 450000,
    status: 'analyzing',
    linkedAccountId: 'ACC-41029',
  },
  {
    id: 'CMP-2024-7412',
    victimInfo: { name: 'Sunita Rao', contact: '+91-99887-76655' },
    amount: 220000,
    status: 'filed',
    linkedAccountId: 'ACC-77182',
  },
  {
    id: 'CMP-2024-6309',
    victimInfo: { name: 'Vikram Malhotra', contact: '+91-94433-22110' },
    amount: 1200000,
    status: 'resolved',
    linkedAccountId: 'ACC-33901',
  },
];

const initialAccounts: Account[] = [
  {
    id: 'ACC-89214',
    riskScore: 94,
    h3Cell: '882681a4bffffff',
    txnHistory: [
      { fromAccount: 'VICTIM-CMP-9081', toAccount: 'ACC-89214', amount: 845000, timestamp: '2026-09-05T08:12:00Z' },
      { fromAccount: 'ACC-89214', toAccount: 'MULE-GATE-01', amount: 280000, timestamp: '2026-09-05T08:35:00Z' },
      { fromAccount: 'ACC-89214', toAccount: 'MULE-GATE-02', amount: 310000, timestamp: '2026-09-05T08:44:00Z' },
      { fromAccount: 'ACC-89214', toAccount: 'CRYPTO-RAMP-X', amount: 255000, timestamp: '2026-09-05T08:52:00Z' },
    ],
  },
  {
    id: 'ACC-41029',
    riskScore: 82,
    h3Cell: '882681a4b9fffff',
    txnHistory: [
      { fromAccount: 'VICTIM-CMP-8821', toAccount: 'ACC-41029', amount: 450000, timestamp: '2026-09-05T09:20:00Z' },
      { fromAccount: 'ACC-41029', toAccount: 'MULE-GATE-03', amount: 400000, timestamp: '2026-09-05T09:45:00Z' },
    ],
  },
  {
    id: 'ACC-77182',
    riskScore: 68,
    h3Cell: '882681a5c1fffff',
    txnHistory: [
      { fromAccount: 'VICTIM-CMP-7412', toAccount: 'ACC-77182', amount: 220000, timestamp: '2026-09-05T07:11:00Z' },
    ],
  },
  {
    id: 'ACC-33901',
    riskScore: 24,
    h3Cell: '882681a74dfffff',
    txnHistory: [
      { fromAccount: 'VICTIM-CMP-6309', toAccount: 'ACC-33901', amount: 1200000, timestamp: '2026-09-04T16:00:00Z' },
    ],
  },
];

const initialPredictions: Prediction[] = [
  {
    id: 'PRED-ACC-89214',
    accountId: 'ACC-89214',
    gnnConfidence: 0.920,
    riskLevel: 'critical',
    predictedH3Cells: [
      { cell: '882681a4bffffff', probability: 0.942 },
      { cell: '882681a4b9fffff', probability: 0.887 },
      { cell: '882681a5c1fffff', probability: 0.764 },
      { cell: '882681a74dfffff', probability: 0.618 },
    ],
    cashOutWindow: {
      earliest: 'Today, 13:45 UTC (in 6.2h)',
      latest: 'Tomorrow, 07:30 UTC (in 23.8h)',
    },
  },
  {
    id: 'PRED-ACC-41029',
    accountId: 'ACC-41029',
    gnnConfidence: 0.845,
    riskLevel: 'high',
    predictedH3Cells: [
      { cell: '882681a4b9fffff', probability: 0.887 },
      { cell: '882681a4bffffff', probability: 0.730 },
      { cell: '882681a74dfffff', probability: 0.540 },
    ],
    cashOutWindow: {
      earliest: 'Today, 15:00 UTC (in 7.5h)',
      latest: 'Tomorrow, 10:00 UTC (in 26.5h)',
    },
  },
  {
    id: 'PRED-ACC-77182',
    accountId: 'ACC-77182',
    gnnConfidence: 0.690,
    riskLevel: 'medium',
    predictedH3Cells: [
      { cell: '882681a5c1fffff', probability: 0.764 },
      { cell: '882681a74dfffff', probability: 0.618 },
    ],
    cashOutWindow: {
      earliest: 'Today, 18:00 UTC (in 10.5h)',
      latest: 'Tomorrow, 14:00 UTC (in 30.5h)',
    },
  },
  {
    id: 'PRED-ACC-33901',
    accountId: 'ACC-33901',
    gnnConfidence: 0.320,
    riskLevel: 'low',
    predictedH3Cells: [
      { cell: '882681a74dfffff', probability: 0.350 },
    ],
    cashOutWindow: {
      earliest: 'Tomorrow, 09:00 UTC',
      latest: 'Day after tomorrow, 18:00 UTC',
    },
  },
];

const initialAlerts: Alert[] = [
  {
    id: 'ALT-9041',
    predictionId: 'PRED-ACC-89214',
    atmId: 'ATM-DEL-042',
    h3Cell: '882681a4bffffff',
    status: 'new',
    createdAt: '2026-09-05T14:32:00Z',
  },
  {
    id: 'ALT-8890',
    predictionId: 'PRED-ACC-41029',
    atmId: 'ATM-DEL-019',
    h3Cell: '882681a4b9fffff',
    status: 'assigned',
    assignedOfficerId: 'OFF-6412',
    createdAt: '2026-09-05T13:10:00Z',
  },
  {
    id: 'ALT-8120',
    predictionId: 'PRED-ACC-77182',
    atmId: 'ATM-NOI-007',
    h3Cell: '882681a5c1fffff',
    status: 'actioned',
    assignedOfficerId: 'OFF-3389',
    createdAt: '2026-09-05T10:45:00Z',
  },
];

const initialIncidents: Incident[] = [
  {
    id: 'INC-4029',
    alertId: 'ALT-8890',
    status: 'open',
    createdAt: '2026-09-05T13:12:00Z',
    updatedAt: '2026-09-05T13:30:00Z',
    officerActions: [
      { note: 'Tactical field unit dispatched to ATM-DEL-019. CCTV intercept operational.', timestamp: '2026-09-05 13:15:20 UTC' },
      { note: 'Lead investigator contacted nodal bank officer to freeze ATM cash cartridge buffer.', timestamp: '2026-09-05 13:30:11 UTC' },
    ],
  },
  {
    id: 'INC-3810',
    alertId: 'ALT-8120',
    status: 'authorized',
    createdAt: '2026-09-05T10:50:00Z',
    updatedAt: '2026-09-05T11:45:00Z',
    officerActions: [
      { note: 'Perimeter lockdown verified. Mule runner intercepted at card insertion stage.', timestamp: '2026-09-05 11:10:00 UTC' },
      { note: 'Emergency Section 102 CrPC asset freeze issued for ₹220,000.', timestamp: '2026-09-05 11:45:00 UTC' },
    ],
  },
];

const initialNetworkEdges: NetworkEdge[] = [
  { id: 'EDGE-1', source: 'VICTIM-CMP-9081', target: 'ACC-89214', amount: 845000, timestamp: '2026-09-05T08:12:00Z' },
  { id: 'EDGE-2', source: 'ACC-89214', target: 'MULE-GATE-01', amount: 280000, timestamp: '2026-09-05T08:35:00Z' },
  { id: 'EDGE-3', source: 'ACC-89214', target: 'MULE-GATE-02', amount: 310000, timestamp: '2026-09-05T08:44:00Z' },
  { id: 'EDGE-4', source: 'ACC-89214', target: 'CRYPTO-RAMP-X', amount: 255000, timestamp: '2026-09-05T08:52:00Z' },
];

const initialAtmLocations: AtmLocation[] = [
  {
    id: 'ATM-DEL-042',
    name: 'Metro Financial Corridor (Central OTC Nexus)',
    lat: 28.6289,
    lng: 77.2065,
    bank: 'SBI Commercial Branch',
    address: 'Connaught Place Radial 3, New Delhi',
    h3Cell: '882681a4bffffff',
    operationalStatus: 'surveillance_active',
  },
  {
    id: 'ATM-DEL-019',
    name: 'Cross-Border ATM Cluster (Transit Gateway)',
    lat: 28.6142,
    lng: 77.2185,
    bank: 'HDFC Bank Express',
    address: 'Barakhamba Road Interchange, New Delhi',
    h3Cell: '882681a4b9fffff',
    operationalStatus: 'online',
  },
  {
    id: 'ATM-NOI-007',
    name: 'Crypto OTC Desk Terminal (High-Value Ramp)',
    lat: 28.5703,
    lng: 77.3218,
    bank: 'ICICI Cyber Hub',
    address: 'Sector 18 Commercial Complex, Noida',
    h3Cell: '882681a5c1fffff',
    operationalStatus: 'dispenser_locked',
  },
  {
    id: 'ATM-GUR-088',
    name: 'P2P Mule Hub Node (Secondary Stash)',
    lat: 28.4595,
    lng: 77.0266,
    bank: 'Axis Bank DLF Branch',
    address: 'DLF Cyber City Gateway, Gurugram',
    h3Cell: '882681a74dfffff',
    operationalStatus: 'online',
  },
  {
    id: 'ATM-DEL-101',
    name: 'Railway Junction Transit Kiosk',
    lat: 28.6415,
    lng: 77.2198,
    bank: 'Punjab National Bank',
    address: 'Pahar Ganj Exit Gate, New Delhi',
    h3Cell: '882681a4bffffff',
    operationalStatus: 'online',
  },
];

const initialHistoricalHotspots: HotspotPoint[] = [
  { lat: 28.6289, lng: 77.2065, weight: 0.95, name: 'Connaught Place Mule Hotspot' },
  { lat: 28.6142, lng: 77.2185, weight: 0.88, name: 'Barakhamba Transit Hub' },
  { lat: 28.5703, lng: 77.3218, weight: 0.75, name: 'Noida Sector 18 Financial Cluster' },
  { lat: 28.4595, lng: 77.0266, weight: 0.62, name: 'Gurugram Cyber Hub Corridor' },
  { lat: 28.6415, lng: 77.2198, weight: 0.82, name: 'New Delhi Railway Nexus' },
  { lat: 28.5355, lng: 77.3910, weight: 0.58, name: 'Greater Noida Express Corridor' },
];

export const useNexusStore = create<NexusState>((set, get) => ({
  complaints: initialComplaints,
  accounts: initialAccounts,
  networkEdges: initialNetworkEdges,
  predictions: initialPredictions,
  alerts: initialAlerts,
  incidents: initialIncidents,
  atmLocations: initialAtmLocations,
  historicalHotspots: initialHistoricalHotspots,

  mapFocusTarget: null,
  selectedMapItem: null,

  addAlert: (alert) => {
    set((state) => {
      // Prepend so newest alert comes first
      const exists = state.alerts.some((a) => a.id === alert.id);
      if (exists) return state;
      return { alerts: [alert, ...state.alerts] };
    });
  },

  updateAlert: (id, updates) => {
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
  },

  addIncident: (incident) => {
    set((state) => {
      const exists = state.incidents.some((i) => i.id === incident.id);
      if (exists) return state;
      return { incidents: [incident, ...state.incidents] };
    });
  },

  updateIncident: (id, updates) => {
    set((state) => ({
      incidents: state.incidents.map((inc) =>
        inc.id === id ? { ...inc, ...updates, updatedAt: new Date().toISOString() } : inc
      ),
    }));
  },

  addOfficerAction: (incidentId, note) => {
    set((state) => ({
      incidents: state.incidents.map((inc) => {
        if (inc.id !== incidentId) return inc;
        const newAction = {
          note,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        };
        return {
          ...inc,
          officerActions: [...inc.officerActions, newAction],
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  },

  authorizeIncident: (incidentId) => {
    const incident = get().incidents.find((i) => i.id === incidentId);
    if (!incident) return;

    // First update incident to 'authorized'
    get().updateIncident(incidentId, { status: 'authorized' });

    // Link traversal: find linked alert -> prediction -> account -> complaint
    const linkedAlert = get().alerts.find((a) => a.id === incident.alertId);
    if (linkedAlert) {
      const linkedPred = get().predictions.find((p) => p.id === linkedAlert.predictionId);
      if (linkedPred) {
        const linkedComplaint = get().complaints.find((c) => c.linkedAccountId === linkedPred.accountId);
        if (linkedComplaint) {
          get().updateComplaint(linkedComplaint.id, { status: 'resolved' });
        }
      }
    }

    // After a short delay, update incident status to 'closed'
    setTimeout(() => {
      get().updateIncident(incidentId, { status: 'closed' });
    }, 2500);
  },

  updateComplaint: (id, updates) => {
    set((state) => ({
      complaints: state.complaints.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  },

  setMapFocus: (target) => {
    set({ mapFocusTarget: target });
  },

  setSelectedMapItem: (item) => {
    set({ selectedMapItem: item });
  },

  getPredictionByAccountId: (accountId) => {
    return get().predictions.find((p) => p.accountId === accountId);
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
    return get().complaints.find((c) => c.linkedAccountId === accountId);
  },

  getComplaintById: (complaintId) => {
    return get().complaints.find((c) => c.id === complaintId);
  },
}));

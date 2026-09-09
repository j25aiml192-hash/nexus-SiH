export interface Complaint {
  id: string;
  victimInfo: { name: string; contact: string };
  amount: number;
  status: 'filed' | 'analyzing' | 'alerted' | 'resolved';
  linkedAccountId: string;
}

export interface Account {
  id: string;
  riskScore: number;
  h3Cell: string;
  txnHistory: { fromAccount: string; toAccount: string; amount: number; timestamp: string }[];
}

export interface Prediction {
  id: string;
  accountId: string;
  gnnConfidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  predictedH3Cells: { cell: string; probability: number }[];
  cashOutWindow: { earliest: string; latest: string };
}

export interface Alert {
  id: string;
  predictionId: string;
  atmId?: string;
  h3Cell: string;
  status: 'new' | 'assigned' | 'actioned';
  assignedOfficerId?: string;
  createdAt?: string;
}

export interface Incident {
  id: string;
  alertId: string;
  officerActions: { note: string; timestamp: string }[];
  status: 'open' | 'authorized' | 'closed';
  createdAt?: string;
  updatedAt?: string;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  timestamp: string;
}

export interface AtmLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  bank: string;
  address: string;
  h3Cell?: string;
  operationalStatus: 'online' | 'surveillance_active' | 'dispenser_locked';
}

export interface HotspotPoint {
  lat: number;
  lng: number;
  weight: number;
  name?: string;
}

export interface MapFocusTarget {
  cellOrAtmId?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  timestamp: number;
}

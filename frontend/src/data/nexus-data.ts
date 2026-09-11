export interface PriorityAlert {
  id: string;
  account: string;
  complaintId: string;
  bankBranch: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  riskScore: number;
  cashOutTimeRemaining: string;
}

export interface LiveActivityItem {
  id: string;
  title: string;
  refId: string;
  subtitle: string;
  badge: 'INTAKE' | 'HIGH' | 'CRITICAL' | 'ACTIVE' | 'CLOSED' | 'MEDIUM';
  timeAgo: string;
  type: 'complaint' | 'prediction' | 'alert' | 'officer' | 'incident';
}

export interface RiskLevelStat {
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  count: number;
  percentage: number;
  color: string;
}

export const DASHBOARD_STATS = {
  openComplaints: 124,
  openComplaintsTrend: '+12% from last week',
  activeAlerts: 38,
  highestAlertRisk: 'Critical',
  incidentsInProgress: 7,
  incidentsClosedToday: 24,
  totalFundsAtRisk: '₹18.4 Cr',
  totalFundsFrozen: '₹6.2 Cr',
  shift: 'SHIFT 02',
  systemStatus: 'SYSTEM LIVE',
  subtitle: 'Real-time intelligence across complaints, predictions, alerts and incidents.',
  operationalOverview: 'OPERATIONAL OVERVIEW - SHIFT 02 · WHAT IS HAPPENING, WHAT IS RISKY, WHAT TO ACT ON',
};

export const PRIORITY_ALERTS: PriorityAlert[] = [
  {
    id: 'A7845',
    account: 'A/C #7845..',
    complaintId: '#C1023',
    bankBranch: 'HDFC · Andheri E',
    riskLevel: 'CRITICAL',
    riskScore: 92,
    cashOutTimeRemaining: '2h left CASH-OUT',
  },
  {
    id: 'A3390',
    account: 'A/C #3390..',
    complaintId: '#C0987',
    bankBranch: 'ICICI · Pune Camp',
    riskLevel: 'HIGH',
    riskScore: 78,
    cashOutTimeRemaining: '5h left CASH-OUT',
  },
  {
    id: 'A5567',
    account: 'A/C #5567..',
    complaintId: '#C0911',
    bankBranch: 'SBI · Noida S-62',
    riskLevel: 'HIGH',
    riskScore: 76,
    cashOutTimeRemaining: '8h left CASH-OUT',
  },
  {
    id: 'A2210',
    account: 'A/C #2210..',
    complaintId: '#C0890',
    bankBranch: 'Axis · Salt Lake',
    riskLevel: 'MEDIUM',
    riskScore: 61,
    cashOutTimeRemaining: '12h left CASH-OUT',
  },
];

export const LIVE_ACTIVITY_ITEMS: LiveActivityItem[] = [
  {
    id: 'act-1',
    title: 'New complaint filed',
    refId: '#C1023',
    subtitle: 'Filed by Officer R. Sharma',
    badge: 'INTAKE',
    timeAgo: '2 min ago',
    type: 'complaint',
  },
  {
    id: 'act-2',
    title: 'Prediction generated',
    refId: '#C1023',
    subtitle: 'Layer-2 mule cluster identified · 6 accounts',
    badge: 'HIGH',
    timeAgo: '5 min ago',
    type: 'prediction',
  },
  {
    id: 'act-3',
    title: 'Alert escalated',
    refId: '#A7845',
    subtitle: 'Risk score 92 · cash-out window closing',
    badge: 'CRITICAL',
    timeAgo: '12 min ago',
    type: 'alert',
  },
  {
    id: 'act-4',
    title: 'Officer assigned',
    refId: '#C0987',
    subtitle: 'Assigned to A. Verma · Cyber Cell North',
    badge: 'ACTIVE',
    timeAgo: '18 min ago',
    type: 'officer',
  },
  {
    id: 'act-5',
    title: 'Incident closed',
    refId: '#I0456',
    subtitle: '₹12.4 L frozen · recovery filed',
    badge: 'CLOSED',
    timeAgo: '32 min ago',
    type: 'incident',
  },
  {
    id: 'act-6',
    title: 'Prediction generated',
    refId: '#C0911',
    subtitle: 'Outflow path scored across 3 banks',
    badge: 'MEDIUM',
    timeAgo: '41 min ago',
    type: 'prediction',
  },
  {
    id: 'act-7',
    title: 'New complaint filed',
    refId: '#C1022',
    subtitle: 'Filed by Officer S. Nair',
    badge: 'INTAKE',
    timeAgo: '56 min ago',
    type: 'complaint',
  },
];

export const RISK_LEVEL_BREAKDOWN = {
  totalActiveCases: 274,
  breakdown: [
    { level: 'CRITICAL' as const, count: 14, percentage: 5, color: '#DC2626' },
    { level: 'HIGH' as const, count: 46, percentage: 17, color: '#EA580C' },
    { level: 'MEDIUM' as const, count: 98, percentage: 36, color: '#D97706' },
    { level: 'LOW' as const, count: 116, percentage: 42, color: '#087F5B' },
  ],
};

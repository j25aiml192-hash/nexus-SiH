/**
 * NEXUS — Network Graph mock data layer.
 *
 * This module provides the node and edge data model for cybercrime network investigations.
 */

export type EntityType = "account" | "upi" | "phone" | "device" | "merchant";
export type RiskLevel = "critical" | "high" | "medium" | "low";

export interface NetworkNode {
  id: string;
  type: EntityType;
  label: string;
  /** Bank / operator / vendor sub-label */
  institution?: string;
  isSource?: boolean;
  riskLevel: RiskLevel;
  riskScore: number;
  accountType?: string;
  connectedEntities: number;
  incoming: number;
  outgoing: number;
  transactions: number;
  lastActivity: string;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  timestamp: string;
  suspicious?: boolean;
  /** Non-monetary link (device / phone / upi binding) */
  relation?: "transaction" | "binding";
  note?: string;
}

export interface CaseMeta {
  complaintId: string;
  accountId: string;
  primaryAccount: string;
  complaintType: string;
  amount: string;
  risk: string;
}

export interface FlaggedConnection {
  from: string;
  to: string;
  reason: string;
  severity: RiskLevel;
}

export const caseMeta: CaseMeta = {
  complaintId: "C1030",
  accountId: "ACC-4821",
  primaryAccount: "XXXX 4821",
  complaintType: "UPI Fraud",
  amount: "₹4.8L",
  risk: "Critical",
};

const t = (d: string) => `2026-09-${d}`;

export const networkNodes: NetworkNode[] = [
  {
    id: "ACC-4821",
    type: "account",
    label: "XXXX 4821",
    institution: "HDFC · Andheri E",
    isSource: true,
    riskLevel: "critical",
    riskScore: 91,
    accountType: "Victim Account",
    connectedEntities: 6,
    incoming: 0,
    outgoing: 480000,
    transactions: 6,
    lastActivity: "06 Sep 2026, 10:42",
  },
  {
    id: "ACC-1937",
    type: "account",
    label: "XXXX 1937",
    institution: "ICICI · Pune Camp",
    riskLevel: "high",
    riskScore: 82,
    accountType: "Mule Account",
    connectedEntities: 5,
    incoming: 320000,
    outgoing: 280000,
    transactions: 8,
    lastActivity: "06 Sep 2026, 10:31",
  },
  {
    id: "ACC-6640",
    type: "account",
    label: "XXXX 6640",
    institution: "SBI · Noida S-62",
    riskLevel: "high",
    riskScore: 76,
    accountType: "Layer-2 Mule",
    connectedEntities: 4,
    incoming: 210000,
    outgoing: 185000,
    transactions: 6,
    lastActivity: "06 Sep 2026, 09:58",
  },
  {
    id: "ACC-2210",
    type: "account",
    label: "XXXX 2210",
    institution: "Axis · Salt Lake",
    riskLevel: "medium",
    riskScore: 61,
    accountType: "Linked Account",
    connectedEntities: 3,
    incoming: 65000,
    outgoing: 65000,
    transactions: 4,
    lastActivity: "06 Sep 2026, 09:18",
  },
  {
    id: "ACC-5567",
    type: "account",
    label: "XXXX 5567",
    institution: "Kotak · Indore",
    riskLevel: "high",
    riskScore: 74,
    accountType: "Layer-2 Mule",
    connectedEntities: 3,
    incoming: 148000,
    outgoing: 120000,
    transactions: 5,
    lastActivity: "06 Sep 2026, 08:47",
  },
  {
    id: "ACC-8814",
    type: "account",
    label: "XXXX 8814",
    institution: "PNB · Jaipur",
    riskLevel: "low",
    riskScore: 34,
    accountType: "Linked Account",
    connectedEntities: 2,
    incoming: 42000,
    outgoing: 19900,
    transactions: 3,
    lastActivity: "05 Sep 2026, 22:10",
  },
  {
    id: "ACC-3390",
    type: "account",
    label: "XXXX 3390",
    institution: "ICICI · Pune Camp",
    riskLevel: "high",
    riskScore: 78,
    accountType: "Cash-out Account",
    connectedEntities: 3,
    incoming: 96000,
    outgoing: 96000,
    transactions: 4,
    lastActivity: "06 Sep 2026, 07:36",
  },
  {
    id: "ACC-7045",
    type: "account",
    label: "XXXX 7045",
    institution: "Yes Bank · Surat",
    riskLevel: "medium",
    riskScore: 55,
    accountType: "Linked Account",
    connectedEntities: 2,
    incoming: 58000,
    outgoing: 22000,
    transactions: 3,
    lastActivity: "05 Sep 2026, 19:04",
  },
  {
    id: "ACC-9123",
    type: "account",
    label: "XXXX 9123",
    institution: "BOB · Nagpur",
    riskLevel: "low",
    riskScore: 28,
    accountType: "Linked Account",
    connectedEntities: 1,
    incoming: 15000,
    outgoing: 0,
    transactions: 1,
    lastActivity: "05 Sep 2026, 16:22",
  },
  {
    id: "ACC-4402",
    type: "account",
    label: "XXXX 4402",
    institution: "IDFC · Kochi",
    riskLevel: "medium",
    riskScore: 58,
    accountType: "Linked Account",
    connectedEntities: 2,
    incoming: 71000,
    outgoing: 40000,
    transactions: 3,
    lastActivity: "05 Sep 2026, 14:11",
  },
  {
    id: "ACC-6178",
    type: "account",
    label: "XXXX 6178",
    institution: "Union · Bhopal",
    riskLevel: "high",
    riskScore: 71,
    accountType: "Cash-out Account",
    connectedEntities: 2,
    incoming: 88000,
    outgoing: 88000,
    transactions: 3,
    lastActivity: "06 Sep 2026, 06:19",
  },
  {
    id: "ACC-2984",
    type: "account",
    label: "XXXX 2984",
    institution: "Canara · Trichy",
    riskLevel: "low",
    riskScore: 31,
    accountType: "Linked Account",
    connectedEntities: 1,
    incoming: 24000,
    outgoing: 0,
    transactions: 2,
    lastActivity: "04 Sep 2026, 21:55",
  },
  {
    id: "UPI-1",
    type: "upi",
    label: "rahul.k@okaxis",
    institution: "UPI handle",
    riskLevel: "high",
    riskScore: 69,
    accountType: "UPI ID",
    connectedEntities: 3,
    incoming: 0,
    outgoing: 210000,
    transactions: 5,
    lastActivity: "06 Sep 2026, 10:12",
  },
  {
    id: "UPI-2",
    type: "upi",
    label: "sk.pay@ybl",
    institution: "UPI handle",
    riskLevel: "medium",
    riskScore: 52,
    accountType: "UPI ID",
    connectedEntities: 2,
    incoming: 0,
    outgoing: 96000,
    transactions: 3,
    lastActivity: "06 Sep 2026, 08:02",
  },
  {
    id: "UPI-3",
    type: "upi",
    label: "quickpay@ibl",
    institution: "UPI handle",
    riskLevel: "low",
    riskScore: 30,
    accountType: "UPI ID",
    connectedEntities: 1,
    incoming: 0,
    outgoing: 22000,
    transactions: 2,
    lastActivity: "05 Sep 2026, 18:40",
  },
  {
    id: "UPI-4",
    type: "upi",
    label: "m.verma@okhdfc",
    institution: "UPI handle",
    riskLevel: "medium",
    riskScore: 47,
    accountType: "UPI ID",
    connectedEntities: 1,
    incoming: 0,
    outgoing: 40000,
    transactions: 2,
    lastActivity: "05 Sep 2026, 13:28",
  },
  {
    id: "PH-9821",
    type: "phone",
    label: "98XXXX21",
    institution: "Registered mobile",
    riskLevel: "high",
    riskScore: 66,
    accountType: "Phone Number",
    connectedEntities: 3,
    incoming: 0,
    outgoing: 0,
    transactions: 0,
    lastActivity: "06 Sep 2026, 10:42",
  },
  {
    id: "DEV-219",
    type: "device",
    label: "D-219",
    institution: "Android · shared",
    riskLevel: "critical",
    riskScore: 88,
    accountType: "Device Fingerprint",
    connectedEntities: 4,
    incoming: 0,
    outgoing: 0,
    transactions: 0,
    lastActivity: "06 Sep 2026, 10:33",
  },
  {
    id: "DEV-556",
    type: "device",
    label: "D-556",
    institution: "iOS · single use",
    riskLevel: "medium",
    riskScore: 49,
    accountType: "Device Fingerprint",
    connectedEntities: 2,
    incoming: 0,
    outgoing: 0,
    transactions: 0,
    lastActivity: "05 Sep 2026, 20:15",
  },
  {
    id: "MER-11",
    type: "merchant",
    label: "SwiftKart Retail",
    institution: "Merchant · online",
    riskLevel: "medium",
    riskScore: 57,
    accountType: "Merchant",
    connectedEntities: 2,
    incoming: 132000,
    outgoing: 0,
    transactions: 4,
    lastActivity: "06 Sep 2026, 07:11",
  },
];

export const networkEdges: NetworkEdge[] = [
  { id: "E1", source: "ACC-4821", target: "ACC-1937", amount: 120000, timestamp: t("06T09:52"), suspicious: true, note: "High-risk transaction pattern" },
  { id: "E2", source: "ACC-1937", target: "ACC-6640", amount: 85000, timestamp: t("06T10:31"), suspicious: true, note: "Common device detected" },
  { id: "E3", source: "ACC-4821", target: "ACC-6640", amount: 96000, timestamp: t("06T09:58") },
  { id: "E4", source: "ACC-2210", target: "ACC-1937", amount: 65000, timestamp: t("06T09:18") },
  { id: "E5", source: "ACC-6640", target: "ACC-5567", amount: 78000, timestamp: t("06T08:47"), suspicious: true, note: "Rapid layered transfer" },
  { id: "E6", source: "ACC-4821", target: "ACC-2210", amount: 48000, timestamp: t("05T22:31") },
  { id: "E7", source: "ACC-5567", target: "ACC-3390", amount: 62000, timestamp: t("06T07:36"), suspicious: true, note: "Cash-out within 20 min" },
  { id: "E8", source: "ACC-1937", target: "ACC-8814", amount: 42000, timestamp: t("05T22:10") },
  { id: "E9", source: "ACC-4821", target: "ACC-7045", amount: 58000, timestamp: t("05T19:04") },
  { id: "E10", source: "ACC-7045", target: "ACC-9123", amount: 15000, timestamp: t("05T16:22") },
  { id: "E11", source: "ACC-6640", target: "ACC-4402", amount: 71000, timestamp: t("05T14:11") },
  { id: "E12", source: "ACC-4402", target: "ACC-6178", amount: 40000, timestamp: t("06T06:19"), suspicious: true, note: "Structuring below threshold" },
  { id: "E13", source: "ACC-6178", target: "ACC-3390", amount: 34000, timestamp: t("06T06:44") },
  { id: "E14", source: "ACC-5567", target: "ACC-2984", amount: 24000, timestamp: t("04T21:55") },
  { id: "E15", source: "ACC-1937", target: "MER-11", amount: 62000, timestamp: t("06T07:11") },
  { id: "E16", source: "ACC-3390", target: "MER-11", amount: 70000, timestamp: t("06T07:52"), suspicious: true, note: "Merchant used for value transfer" },
  { id: "E17", source: "UPI-1", target: "ACC-1937", amount: 110000, timestamp: t("06T10:12"), suspicious: true, note: "Handle reused across mules" },
  { id: "E18", source: "UPI-1", target: "ACC-6640", amount: 100000, timestamp: t("06T09:40") },
  { id: "E19", source: "UPI-2", target: "ACC-5567", amount: 58000, timestamp: t("06T08:02") },
  { id: "E20", source: "UPI-2", target: "ACC-3390", amount: 38000, timestamp: t("06T08:20") },
  { id: "E21", source: "UPI-3", target: "ACC-7045", amount: 22000, timestamp: t("05T18:40") },
  { id: "E22", source: "UPI-4", target: "ACC-4402", amount: 40000, timestamp: t("05T13:28") },
  { id: "E23", source: "ACC-4821", target: "UPI-1", amount: 158000, timestamp: t("06T10:22"), suspicious: true, note: "Beneficiary added minutes before debit" },
  { id: "E24", source: "PH-9821", target: "ACC-4821", amount: 0, timestamp: t("06T10:42"), relation: "binding", note: "Registered mobile" },
  { id: "E25", source: "PH-9821", target: "UPI-1", amount: 0, timestamp: t("06T10:12"), relation: "binding", note: "Handle bound to phone" },
  { id: "E26", source: "DEV-219", target: "ACC-1937", amount: 0, timestamp: t("06T10:33"), relation: "binding", suspicious: true, note: "Shared device fingerprint" },
  { id: "E27", source: "DEV-219", target: "ACC-6640", amount: 0, timestamp: t("06T10:29"), relation: "binding", suspicious: true, note: "Shared device fingerprint" },
  { id: "E28", source: "DEV-219", target: "ACC-5567", amount: 0, timestamp: t("06T08:41"), relation: "binding" },
  { id: "E29", source: "DEV-556", target: "ACC-2210", amount: 0, timestamp: t("05T20:15"), relation: "binding" },
];

export const flaggedConnections: FlaggedConnection[] = [
  { from: "XXXX 4821", to: "XXXX 1937", reason: "High-risk transaction pattern", severity: "critical" },
  { from: "XXXX 1937", to: "XXXX 6640", reason: "Common device detected", severity: "high" },
  { from: "XXXX 5567", to: "XXXX 3390", reason: "Cash-out within 20 minutes", severity: "high" },
  { from: "XXXX 4402", to: "XXXX 6178", reason: "Structuring below reporting threshold", severity: "medium" },
];

export const networkSummary = {
  entities: networkNodes.length,
  transactions: networkEdges.filter((e) => e.relation !== "binding").length,
  accounts: networkNodes.filter((n) => n.type === "account").length,
  upi: networkNodes.filter((n) => n.type === "upi").length,
  phones: networkNodes.filter((n) => n.type === "phone").length,
  devices: networkNodes.filter((n) => n.type === "device").length,
  merchants: networkNodes.filter((n) => n.type === "merchant").length,
};

export const nodeById = (id: string) => networkNodes.find((n) => n.id === id);

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatCompactINR(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${Math.round(amount / 1000)}K`;
  return `₹${amount}`;
}

export function formatEdgeTime(timestamp: string): string {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-GB", { month: "short" });
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${day} ${month} ${time}`;
}

/** Transactions touching a node, newest first. */
export function transactionsForNode(nodeId: string): NetworkEdge[] {
  return networkEdges
    .filter((e) => e.relation !== "binding" && (e.source === nodeId || e.target === nodeId))
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

/** Payload handed to the Prediction stage of the NEXUS workflow. */
export function buildPredictionPayload(selectedId?: string | null) {
  return {
    complaintId: caseMeta.complaintId,
    accountId: selectedId ?? caseMeta.accountId,
    nodes: networkNodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      riskLevel: n.riskLevel,
      riskScore: n.riskScore,
    })),
    edges: networkEdges.map((e) => ({
      source: e.source,
      target: e.target,
      transactionAmount: e.amount,
      timestamp: e.timestamp,
      suspicious: Boolean(e.suspicious),
    })),
  };
}

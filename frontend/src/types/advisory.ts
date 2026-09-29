export interface AdvisorySection {
  type: string;
  title: string;
  items: string[];
}

export interface VictimAdvisory {
  complaint_id: string;
  advisory_id: string;
  urgency: 'IMMEDIATE' | 'HIGH' | 'STANDARD';
  title: string;
  summary: string;
  sections: AdvisorySection[];
  reason_codes: string[];
  sources?: Array<{ signal: string; value: any }>;
  policy_version: string;
  fingerprint?: string;
  generated_at: string;
  status: string;
  channel?: string;
  phone_masked?: string;
}

export interface AdvisoryHistoryResponse {
  complaint_id: string;
  count: number;
  advisories: VictimAdvisory[];
}

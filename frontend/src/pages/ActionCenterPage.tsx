import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShieldCheck, ShieldX, Clock, AlertTriangle, CheckCircle2,
  XCircle, Loader2, RefreshCw, ChevronRight, Eye, Send,
  Bot, User, Lock, Unlock, Info, ChevronDown, ChevronUp
} from 'lucide-react';

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface ActionRecommendation {
  action_id: string;
  complaint_id: string;
  action_type: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: string;
  policy_version: string;
  reason_codes: string[];
  decision_factors: Record<string, any>;
  supporting_evidence: Array<{ source_type: string; description: string }>;
  approval_required: boolean;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  expires_at?: string;
  history: Array<{ at: string; from_status?: string; to_status: string; actor: string; notes?: string }>;
  created_at: string;
  complaint?: Record<string, any>;
  attention?: Record<string, any>;
  prediction?: Record<string, any>;
}

interface CopilotResponse {
  complaint_id: string;
  intent: string;
  sections: Record<string, string>;
  sources: Array<{ type: string; id: string; field?: string }>;
  disclaimer: string;
  copilot_version: string;
  generated_at: string;
}

interface CopilotMessage {
  role: 'user' | 'copilot';
  text: string;
  sections?: Record<string, string>;
  sources?: Array<{ type: string; id: string; field?: string }>;
  intent?: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.detail || `API error ${res.status}`);
  }
  return res.json();
}

async function fetchActions(params: { status?: string; priority?: string; complaint_id?: string; limit?: number }): Promise<{ actions: ActionRecommendation[]; count: number }> {
  const q = new URLSearchParams();
  if (params.status) q.append('status', params.status);
  if (params.priority) q.append('priority', params.priority);
  if (params.complaint_id) q.append('complaint_id', params.complaint_id);
  q.append('limit', String(params.limit || 50));
  return apiFetch(`/autonomy/actions?${q.toString()}`);
}

async function fetchActionDetail(actionId: string): Promise<ActionRecommendation> {
  return apiFetch(`/autonomy/actions/${actionId}`);
}

async function approveAction(actionId: string, approvedBy: string, notes?: string) {
  return apiFetch(`/autonomy/actions/${actionId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approved_by: approvedBy, notes }),
  });
}

async function rejectAction(actionId: string, rejectedBy: string, reason?: string) {
  return apiFetch(`/autonomy/actions/${actionId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ rejected_by: rejectedBy, reason }),
  });
}

async function cancelAction(actionId: string, cancelledBy: string, reason?: string) {
  return apiFetch(`/autonomy/actions/${actionId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ cancelled_by: cancelledBy, reason }),
  });
}

async function fetchCopilotSummary(complaintId: string): Promise<CopilotResponse> {
  return apiFetch(`/autonomy/copilot/${complaintId}`);
}

async function askCopilot(complaintId: string, question: string): Promise<CopilotResponse> {
  return apiFetch(`/autonomy/copilot/${complaintId}/ask`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  CRITICAL: { color: '#ff3b30', bg: 'rgba(255,59,48,0.10)', border: 'rgba(255,59,48,0.35)', label: 'CRITICAL' },
  HIGH:     { color: '#ff9500', bg: 'rgba(255,149,0,0.10)',  border: 'rgba(255,149,0,0.35)',  label: 'HIGH' },
  MEDIUM:   { color: '#007aff', bg: 'rgba(0,122,255,0.08)',  border: 'rgba(0,122,255,0.25)',  label: 'MEDIUM' },
  LOW:      { color: '#34c759', bg: 'rgba(52,199,89,0.08)',  border: 'rgba(52,199,89,0.25)',  label: 'LOW' },
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  PROPOSED:         { color: '#007aff', icon: <Clock size={13} />, label: 'Proposed' },
  PENDING_APPROVAL: { color: '#ff9500', icon: <AlertTriangle size={13} />, label: 'Pending Approval' },
  APPROVED:         { color: '#34c759', icon: <CheckCircle2 size={13} />, label: 'Approved' },
  EXECUTING:        { color: '#5856d6', icon: <Loader2 size={13} className="spin" />, label: 'Executing' },
  COMPLETED:        { color: '#34c759', icon: <CheckCircle2 size={13} />, label: 'Completed' },
  REJECTED:         { color: '#ff3b30', icon: <XCircle size={13} />, label: 'Rejected' },
  EXPIRED:          { color: '#8e8e93', icon: <Clock size={13} />, label: 'Expired' },
  CANCELLED:        { color: '#8e8e93', icon: <XCircle size={13} />, label: 'Cancelled' },
  FAILED:           { color: '#ff3b30', icon: <XCircle size={13} />, label: 'Failed' },
};

const SOURCE_ICONS: Record<string, string> = {
  complaint: '📋',
  prediction: '🤖',
  attention: '🎯',
  truth_graph: '🕸️',
  truth_graph_relation: '🔗',
  syndicate_dna: '🧬',
  audit_log: '📝',
  action_recommendation: '⚡',
  evidence: '🔍',
  incident: '🚨',
};

const TERMINAL_STATUSES = new Set(['COMPLETED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'FAILED']);
const ACTIVE_FILTER_STATUSES = ['PROPOSED', 'PENDING_APPROVAL'];

// ---------------------------------------------------------------------------
// SUB-COMPONENTS
// ---------------------------------------------------------------------------

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.MEDIUM;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 10px', borderRadius: '20px', fontSize: '10px',
      fontWeight: 800, letterSpacing: '0.08em',
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PROPOSED;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
      fontWeight: 600, color: cfg.color,
      background: `${cfg.color}12`, border: `1px solid ${cfg.color}30`,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function ApprovalGateBanner({ approvalRequired }: { approvalRequired: boolean }) {
  if (!approvalRequired) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px', borderRadius: '10px', marginBottom: '14px',
        background: 'rgba(52,199,89,0.08)', border: '1.5px solid rgba(52,199,89,0.30)',
      }}>
        <Unlock size={15} color="#34c759" />
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#34c759', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Analytical Recommendation
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
            Safe automatic action — no human approval required before execution.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 14px', borderRadius: '10px', marginBottom: '14px',
      background: 'rgba(255,59,48,0.08)', border: '2px solid rgba(255,59,48,0.45)',
    }}>
      <Lock size={15} color="#ff3b30" />
      <div>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#ff3b30', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          ⚠ Consequential Action — Explicit Investigator Approval Required
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
          This action will NOT execute automatically. It requires an explicit, authorised approval click below.
          Page load does NOT approve anything.
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  action,
  isSelected,
  onClick,
}: {
  action: ActionRecommendation;
  isSelected: boolean;
  onClick: () => void;
}) {
  const pcfg = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.MEDIUM;
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', padding: '14px 16px',
        background: isSelected ? 'rgba(0,122,255,0.10)' : 'rgba(255,255,255,0.03)',
        border: isSelected ? '1.5px solid rgba(0,122,255,0.45)' : '1.5px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', cursor: 'pointer', marginBottom: '8px',
        transition: 'all 0.15s ease',
        borderLeft: `4px solid ${pcfg.border}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
            <PriorityBadge priority={action.priority} />
            {action.approval_required && (
              <span style={{ fontSize: '10px', color: '#ff3b30', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Lock size={10} /> APPROVAL REQUIRED
              </span>
            )}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: '4px', wordBreak: 'break-word' }}>
            {action.action_type.replace(/_/g, ' ')}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
            {action.complaint_id.slice(0, 16)}…
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', flexShrink: 0 }}>
          <StatusBadge status={action.status} />
          <ChevronRight size={14} color="rgba(255,255,255,0.3)" />
        </div>
      </div>
    </button>
  );
}

function ReasonCodeChip({ code }: { code: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px',
      background: 'rgba(88,86,214,0.13)', border: '1px solid rgba(88,86,214,0.30)',
      borderRadius: '20px', fontSize: '11px', color: '#a78bfa', fontWeight: 600,
      marginRight: '6px', marginBottom: '6px',
    }}>
      {code.replace(/_/g, ' ')}
    </span>
  );
}

function EvidenceItem({ item }: { item: { source_type: string; description: string } }) {
  const icon = SOURCE_ICONS[item.source_type] || '📌';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '10px 12px', borderRadius: '8px', marginBottom: '8px',
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>
          {item.source_type.replace(/_/g, ' ')}
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
          {item.description}
        </div>
      </div>
    </div>
  );
}

function HistoryTimeline({ history }: { history: ActionRecommendation['history'] }) {
  return (
    <div>
      {(history || []).map((entry, i) => {
        const cfg = STATUS_CONFIG[entry.to_status] || STATUS_CONFIG.PROPOSED;
        return (
          <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${cfg.color}18`, border: `1.5px solid ${cfg.color}40`,
            }}>
              {cfg.icon}
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: cfg.color }}>
                {entry.to_status}
                {entry.from_status && <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> ← {entry.from_status}</span>}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                {entry.actor} · {new Date(entry.at).toLocaleString()}
              </div>
              {entry.notes && (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '3px', fontStyle: 'italic' }}>
                  {entry.notes}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// APPROVAL MODAL
// ---------------------------------------------------------------------------

function ApprovalModal({
  action,
  mode,
  onClose,
  onDone,
}: {
  action: ActionRecommendation;
  mode: 'approve' | 'reject' | 'cancel';
  onClose: () => void;
  onDone: () => void;
}) {
  const [actorName, setActorName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const modeConfig = {
    approve: { label: 'Approve Action', color: '#34c759', icon: <ShieldCheck size={18} />, verb: 'Approve' },
    reject:  { label: 'Reject Action',  color: '#ff3b30', icon: <ShieldX size={18} />,    verb: 'Reject' },
    cancel:  { label: 'Cancel Action',  color: '#ff9500', icon: <XCircle size={18} />,     verb: 'Cancel' },
  }[mode];

  const handleSubmit = async () => {
    if (!actorName.trim()) { setError('You must identify yourself.'); return; }
    setLoading(true); setError('');
    try {
      if (mode === 'approve') await approveAction(action.action_id, actorName.trim(), notes);
      else if (mode === 'reject') await rejectAction(action.action_id, actorName.trim(), notes);
      else await cancelAction(action.action_id, actorName.trim(), notes);
      onDone();
    } catch (e: any) {
      setError(e.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
    }} onClick={onClose}>
      <div style={{
        background: '#141821', border: `2px solid ${modeConfig.color}40`,
        borderRadius: '18px', padding: '28px', maxWidth: '480px', width: '100%',
        boxShadow: `0 24px 80px ${modeConfig.color}20`,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <span style={{ color: modeConfig.color }}>{modeConfig.icon}</span>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'rgba(255,255,255,0.92)' }}>{modeConfig.label}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
              {action.action_type.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        {mode === 'approve' && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
            background: 'rgba(255,59,48,0.08)', border: '1.5px solid rgba(255,59,48,0.35)',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#ff3b30', marginBottom: '4px' }}>
              ⚠ This is an explicit, auditable approval of a consequential action.
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              Your name will be permanently recorded in the audit trail.
              This action will proceed to READY_FOR_EXTERNAL_EXECUTION.
              No external system is automatically called in Phase 5.
            </div>
          </div>
        )}

        <label style={{ display: 'block', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Your Name / Badge ID *
          </div>
          <input
            value={actorName}
            onChange={e => setActorName(e.target.value)}
            placeholder="e.g. Rajan Sharma / NEX-4409-OF"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.9)', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
            }}
            autoFocus
          />
        </label>

        <label style={{ display: 'block', marginBottom: '18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Notes (optional)
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Reason, context, or case reference..."
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.9)', fontSize: '13px', outline: 'none',
              resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
            }}
          />
        </label>

        {error && <div style={{ color: '#ff3b30', fontSize: '12px', marginBottom: '14px', background: 'rgba(255,59,48,0.08)', padding: '8px 12px', borderRadius: '8px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '11px', borderRadius: '10px', cursor: 'pointer',
            background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600,
          }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading || !actorName.trim()} style={{
            flex: 2, padding: '11px', borderRadius: '10px', cursor: loading ? 'wait' : 'pointer',
            background: actorName.trim() ? modeConfig.color : 'rgba(255,255,255,0.1)',
            border: 'none', color: actorName.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
            fontSize: '13px', fontWeight: 700, opacity: loading ? 0.7 : 1,
            transition: 'all 0.15s ease',
          }}>
            {loading ? 'Processing…' : `Confirm ${modeConfig.verb}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// COPILOT PANEL
// ---------------------------------------------------------------------------

function CopilotPanel({ complaintId }: { complaintId: string | null }) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const QUICK_QUESTIONS = [
    'What is happening in this case?',
    'Why is attention high?',
    'What changed recently?',
    'Which cases are related?',
    'What action is recommended?',
    'What needs approval?',
  ];

  const addMessage = (msg: CopilotMessage) => {
    setMessages(prev => [...prev, msg]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // Auto-load summary when complaintId changes
  useEffect(() => {
    if (!complaintId) return;
    setMessages([]);
    setInitialLoading(true);
    fetchCopilotSummary(complaintId)
      .then(resp => {
        addMessage({
          role: 'copilot',
          text: Object.values(resp.sections || {}).join('\n'),
          sections: resp.sections,
          sources: resp.sources,
          intent: resp.intent,
          timestamp: resp.generated_at,
        });
      })
      .catch(err => {
        addMessage({
          role: 'copilot',
          text: `Unable to load case summary: ${err.message}`,
          timestamp: new Date().toISOString(),
        });
      })
      .finally(() => setInitialLoading(false));
  }, [complaintId]);

  const sendQuestion = async (question: string) => {
    if (!complaintId || !question.trim()) return;
    const q = question.trim();
    addMessage({ role: 'user', text: q, timestamp: new Date().toISOString() });
    setInput('');
    setLoading(true);
    try {
      const resp = await askCopilot(complaintId, q);
      addMessage({
        role: 'copilot',
        text: Object.values(resp.sections || {}).filter(v => v).join('\n\n'),
        sections: resp.sections,
        sources: resp.sources,
        intent: resp.intent,
        timestamp: resp.generated_at,
      });
    } catch (e: any) {
      addMessage({ role: 'copilot', text: `Error: ${e.message}`, timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  if (!complaintId) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', padding: '28px', textAlign: 'center',
      }}>
        <Bot size={32} color="rgba(255,255,255,0.2)" style={{ marginBottom: '12px' }} />
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>
          Select an action to activate the Investigator Copilot for its case.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.08)',
      borderRadius: '16px', display: 'flex', flexDirection: 'column', height: '560px',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
          background: 'linear-gradient(135deg, #5856d6, #007aff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Bot size={17} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Investigator Copilot</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
            Read-only · Grounded in NEXUS records · {complaintId.slice(0, 12)}…
          </div>
        </div>
        {(loading || initialLoading) && <Loader2 size={15} color="#5856d6" className="spin" style={{ marginLeft: 'auto' }} />}
      </div>

      {/* Quick questions */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {QUICK_QUESTIONS.map(q => (
          <button key={q} onClick={() => sendQuestion(q)} disabled={loading || initialLoading} style={{
            padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(88,86,214,0.30)',
            background: 'rgba(88,86,214,0.08)', color: '#a78bfa', fontSize: '10px', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {messages.length === 0 && !initialLoading && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>
            Ask a question about case {complaintId.slice(0, 12)}…
          </div>
        )}
        {initialLoading && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
              background: 'linear-gradient(135deg, #5856d6, #007aff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={14} color="#fff" />
            </div>
            <div style={{ background: 'rgba(88,86,214,0.08)', borderRadius: '12px', padding: '12px 14px',
              border: '1px solid rgba(88,86,214,0.20)', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              Loading case summary…
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
              background: msg.role === 'user' ? 'rgba(0,122,255,0.2)' : 'linear-gradient(135deg, #5856d6, #007aff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {msg.role === 'user' ? <User size={14} color="#007aff" /> : <Bot size={14} color="#fff" />}
            </div>
            <div style={{ maxWidth: '82%' }}>
              <div style={{
                background: msg.role === 'user' ? 'rgba(0,122,255,0.12)' : 'rgba(255,255,255,0.04)',
                border: msg.role === 'user' ? '1px solid rgba(0,122,255,0.25)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', padding: '10px 14px',
              }}>
                {msg.sections ? (
                  Object.entries(msg.sections).filter(([, v]) => v).map(([key, val]) => (
                    <div key={key} style={{ marginBottom: '8px' }}>
                      {key !== 'summary' && (
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
                          letterSpacing: '0.06em', marginBottom: '3px' }}>
                          {key.replace(/_/g, ' ')}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.78)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                        {val}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                    {msg.text}
                  </div>
                )}
                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
                      letterSpacing: '0.08em', marginBottom: '4px' }}>Sources</div>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {msg.sources.slice(0, 6).map((s, si) => (
                        <span key={si} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
                          color: 'rgba(255,255,255,0.45)' }}>
                          {SOURCE_ICONS[s.type] || '📌'} {s.type.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '4px',
                textAlign: msg.role === 'user' ? 'right' : 'left', paddingLeft: msg.role === 'copilot' ? '4px' : 0 }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Disclaimer */}
      <div style={{ padding: '6px 16px', borderTop: '1px solid rgba(255,255,255,0.05)',
        fontSize: '9px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: 1.4 }}>
        Copilot is read-only. All answers are derived from NEXUS records. Inferred relationships are labeled.
        Copilot cannot approve, execute, or modify any record.
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuestion(input); } }}
          placeholder="Ask about this case… (Enter to send)"
          rows={2}
          disabled={loading || initialLoading}
          style={{
            flex: 1, padding: '9px 12px', borderRadius: '10px', resize: 'none',
            background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.85)', fontSize: '12px', outline: 'none',
            fontFamily: 'inherit', lineHeight: 1.4,
          }}
        />
        <button onClick={() => sendQuestion(input)} disabled={loading || initialLoading || !input.trim()} style={{
          padding: '9px 14px', borderRadius: '10px', border: 'none',
          background: input.trim() ? '#5856d6' : 'rgba(255,255,255,0.07)',
          color: input.trim() ? '#fff' : 'rgba(255,255,255,0.25)', cursor: input.trim() ? 'pointer' : 'default',
          fontSize: '12px', fontWeight: 700, transition: 'all 0.15s', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DETAIL PANEL
// ---------------------------------------------------------------------------

function ActionDetailPanel({
  actionId,
  onActionUpdated,
}: {
  actionId: string;
  onActionUpdated: () => void;
}) {
  const [action, setAction] = useState<ActionRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'approve' | 'reject' | 'cancel' | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showFactors, setShowFactors] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await fetchActionDetail(actionId);
      setAction(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [actionId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>
      <Loader2 size={24} className="spin" />
    </div>
  );

  if (error) return (
    <div style={{ padding: '24px', color: '#ff3b30', background: 'rgba(255,59,48,0.07)', borderRadius: '12px', fontSize: '13px' }}>
      {error}
    </div>
  );

  if (!action) return null;

  const isTerminal = TERMINAL_STATUSES.has(action.status);
  const canApprove = action.approval_required && !isTerminal && (action.status === 'PROPOSED' || action.status === 'PENDING_APPROVAL');
  const canReject = !isTerminal;
  const canCancel = !isTerminal;

  const taxonomy_description: Record<string, string> = {
    REFRESH_CASE_ANALYSIS: 'Re-evaluate all analytical signals and update cached state.',
    RECHECK_EVIDENCE: 'Re-synchronize Truth Graph entities and re-run consistency checks.',
    UPDATE_ATTENTION: 'Recalculate case attention score based on latest signals.',
    UPDATE_CROSS_CASE_RELATIONSHIPS: 'Re-run cross-case correlation to detect newly shared entities.',
    PREPARE_INVESTIGATOR_BRIEF: 'Synthesize current signals into a structured investigator briefing.',
    PREPARE_ALERT_DRAFT: 'Generate a draft operational alert for investigator review.',
    REQUEST_REVIEW: 'Flag case for manual investigator review.',
    ISSUE_LIEN_RECOMMENDATION: 'Prepare formal lien recommendation for authorized investigator approval.',
    REQUEST_FUND_FREEZE: 'Prepare fund freeze request for authorized investigator approval.',
    REQUEST_ACCOUNT_RESTRICTION: 'Prepare account restriction for authorized investigator approval.',
    REQUEST_FIELD_DISPATCH: 'Prepare field dispatch recommendation for authorized investigator approval.',
    REQUEST_LEGAL_ESCALATION: 'Prepare legal escalation for authorized investigator approval.',
    REQUEST_INTERSTATE_ESCALATION: 'Prepare inter-state escalation for authorized investigator approval.',
    CLOSE_CASE: 'Prepare case closure for authorized investigator approval.',
    PREPARE_VICTIM_ADVISORY_DRAFT: 'Prepare a draft citizen safety advisory for review.',
  };

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      {modal && (
        <ApprovalModal
          action={action}
          mode={modal}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); load(); onActionUpdated(); }}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'rgba(255,255,255,0.95)', marginBottom: '6px' }}>
              {action.action_type.replace(/_/g, ' ')}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <PriorityBadge priority={action.priority} />
              <StatusBadge status={action.status} />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                Policy {action.policy_version}
              </span>
            </div>
          </div>
          <button onClick={load} style={{
            padding: '7px 10px', borderRadius: '8px', border: '1.5px solid rgba(255,255,255,0.12)',
            background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
          }}>
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Case reference */}
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>
          Case: {action.complaint_id}
        </div>
        {action.expires_at && !isTerminal && (
          <div style={{ fontSize: '11px', color: '#ff9500', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={11} /> Expires: {new Date(action.expires_at).toLocaleString()}
          </div>
        )}
      </div>

      {/* Approval Gate Banner */}
      <ApprovalGateBanner approvalRequired={action.approval_required} />

      {/* Description */}
      {taxonomy_description[action.action_type] && (
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.62)', lineHeight: 1.6, marginBottom: '18px',
          padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.07)' }}>
          {taxonomy_description[action.action_type]}
        </div>
      )}

      {/* Reason Codes */}
      {action.reason_codes?.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
            letterSpacing: '0.06em', marginBottom: '8px' }}>
            Policy Signals
          </div>
          <div>{action.reason_codes.map(rc => <ReasonCodeChip key={rc} code={rc} />)}</div>
        </div>
      )}

      {/* Supporting Evidence */}
      {action.supporting_evidence?.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
            letterSpacing: '0.06em', marginBottom: '8px' }}>
            Supporting Evidence
          </div>
          {action.supporting_evidence.map((ev, i) => <EvidenceItem key={i} item={ev} />)}
        </div>
      )}

      {/* Decision Factors Collapsible */}
      {action.decision_factors && Object.keys(action.decision_factors).length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <button onClick={() => setShowFactors(!showFactors)} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)', cursor: 'pointer',
            fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Decision Factors
            {showFactors ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showFactors && (
            <div style={{ marginTop: '8px', padding: '12px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              {Object.entries(action.decision_factors).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>{k.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Context: Attention & Prediction */}
      {(action.attention || action.prediction) && (
        <div style={{ marginBottom: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {action.attention && (
            <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,149,0,0.07)',
              border: '1px solid rgba(255,149,0,0.20)' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#ff9500', textTransform: 'uppercase',
                letterSpacing: '0.06em', marginBottom: '6px' }}>Attention</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#ff9500' }}>{action.attention.attention_level || '—'}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '3px' }}>
                Score: {Number(action.attention.attention_score || 0).toFixed(1)}/100
              </div>
            </div>
          )}
          {action.prediction && (
            <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,59,48,0.07)',
              border: '1px solid rgba(255,59,48,0.20)' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#ff3b30', textTransform: 'uppercase',
                letterSpacing: '0.06em', marginBottom: '6px' }}>Risk</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#ff3b30' }}>
                {Number(action.prediction.risk_score || 0).toFixed(0)}%
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '3px' }}>
                {action.prediction.risk_level || '—'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {!isTerminal && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
          {canApprove && (
            <button id={`approve-btn-${action.action_id}`} onClick={() => setModal('approve')} style={{
              flex: 1, minWidth: '120px', padding: '12px 16px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #34c759, #30a847)', color: '#fff',
              fontSize: '13px', fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 16px rgba(52,199,89,0.25)',
            }}>
              <ShieldCheck size={15} /> Approve
            </button>
          )}
          {canReject && (
            <button id={`reject-btn-${action.action_id}`} onClick={() => setModal('reject')} style={{
              flex: 1, minWidth: '120px', padding: '12px 16px', borderRadius: '12px',
              border: '2px solid rgba(255,59,48,0.40)', background: 'rgba(255,59,48,0.08)',
              color: '#ff3b30', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              <ShieldX size={15} /> Reject
            </button>
          )}
          {canCancel && (
            <button id={`cancel-btn-${action.action_id}`} onClick={() => setModal('cancel')} style={{
              padding: '12px 16px', borderRadius: '12px',
              border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              <XCircle size={14} /> Cancel
            </button>
          )}
        </div>
      )}

      {isTerminal && (
        <div style={{ padding: '12px 16px', borderRadius: '12px', marginBottom: '18px',
          background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.10)',
          display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Info size={15} color="rgba(255,255,255,0.35)" />
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
            This action is in a terminal state ({action.status}) and cannot be modified.
          </div>
        </div>
      )}

      {/* Audit History Collapsible */}
      {action.history?.length > 0 && (
        <div>
          <button onClick={() => setShowHistory(!showHistory)} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)', cursor: 'pointer',
            fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: showHistory ? '10px' : '0',
          }}>
            <span>Audit History ({action.history.length})</span>
            {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showHistory && <HistoryTimeline history={action.history} />}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN PAGE
// ---------------------------------------------------------------------------

export const ActionCenterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initComplaintId = searchParams.get('complaint_id') || undefined;

  const [actions, setActions] = useState<ActionRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterComplaintId, setFilterComplaintId] = useState(initComplaintId || '');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedAction = actions.find(a => a.action_id === selectedActionId);
  const copilotComplaintId = selectedAction?.complaint_id || null;

  const loadActions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true); else setLoading(true);
    setError('');
    try {
      const params: any = { limit: 100 };
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (filterComplaintId.trim()) params.complaint_id = filterComplaintId.trim();
      const data = await fetchActions(params);
      setActions(data.actions || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false); setIsRefreshing(false);
    }
  }, [filterStatus, filterPriority, filterComplaintId]);

  useEffect(() => { loadActions(); }, [loadActions]);

  // Stats
  const stats = {
    total: actions.length,
    critical: actions.filter(a => a.priority === 'CRITICAL').length,
    pendingApproval: actions.filter(a => a.approval_required && ACTIVE_FILTER_STATUSES.includes(a.status)).length,
    safe: actions.filter(a => !a.approval_required && ACTIVE_FILTER_STATUSES.includes(a.status)).length,
  };

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '8px 16px 40px', fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'rgba(255,255,255,0.95)', margin: 0, letterSpacing: '-0.5px' }}>
              ⚡ Action Center
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.40)', margin: '6px 0 0' }}>
              Action Policy Engine · Human Approval Control Plane · Investigator Copilot
            </p>
          </div>
          <button onClick={() => loadActions(true)} disabled={isRefreshing} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 16px', borderRadius: '10px',
            border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>
            <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '18px' }}>
          {[
            { label: 'Total', value: stats.total, color: '#007aff' },
            { label: 'Critical Priority', value: stats.critical, color: '#ff3b30' },
            { label: 'Awaiting Approval', value: stats.pendingApproval, color: '#ff9500' },
            { label: 'Safe Automatic', value: stats.safe, color: '#34c759' },
          ].map(s => (
            <div key={s.label} style={{
              padding: '14px 16px', borderRadius: '12px',
              background: `${s.color}0c`, border: `1.5px solid ${s.color}25`,
            }}>
              <div style={{ fontSize: '22px', fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '3px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center',
        padding: '12px 16px', borderRadius: '12px',
        background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.07)',
      }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{
          padding: '7px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.07)',
          border: '1.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)',
          fontSize: '12px', cursor: 'pointer',
        }}>
          <option value="">All Statuses</option>
          {['PROPOSED','PENDING_APPROVAL','APPROVED','EXECUTING','COMPLETED','REJECTED','EXPIRED','CANCELLED','FAILED'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
          ))}
        </select>

        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{
          padding: '7px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.07)',
          border: '1.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)',
          fontSize: '12px', cursor: 'pointer',
        }}>
          <option value="">All Priorities</option>
          {['CRITICAL','HIGH','MEDIUM','LOW'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <input
          value={filterComplaintId}
          onChange={e => setFilterComplaintId(e.target.value)}
          placeholder="Filter by Case ID…"
          style={{
            flex: 1, minWidth: '180px', padding: '7px 12px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.85)', fontSize: '12px', outline: 'none',
          }}
        />

        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
          {actions.length} recommendation{actions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr minmax(300px, 400px)', gap: '16px', alignItems: 'start' }}>

        {/* LEFT: Action List */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.07)',
          borderRadius: '16px', padding: '14px', maxHeight: '80vh', overflowY: 'auto',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', paddingLeft: '2px' }}>
            Recommendations
          </div>

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
              <Loader2 size={22} color="rgba(255,255,255,0.25)" className="spin" />
            </div>
          )}

          {error && (
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,59,48,0.07)',
              border: '1px solid rgba(255,59,48,0.20)', color: '#ff3b30', fontSize: '12px' }}>
              {error}
            </div>
          )}

          {!loading && !error && actions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 16px' }}>
              <Eye size={28} color="rgba(255,255,255,0.15)" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>
                No Action Recommendations
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', lineHeight: 1.5 }}>
                The Action Policy Engine has not generated any recommendations yet,
                or none match the current filters.
              </div>
            </div>
          )}

          {!loading && actions.map(action => (
            <ActionCard
              key={action.action_id}
              action={action}
              isSelected={action.action_id === selectedActionId}
              onClick={() => setSelectedActionId(action.action_id)}
            />
          ))}
        </div>

        {/* CENTER: Detail Panel */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.07)',
          borderRadius: '16px', padding: '20px', maxHeight: '80vh', overflowY: 'auto',
        }}>
          {!selectedActionId ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '100%', minHeight: '300px', textAlign: 'center' }}>
              <ShieldCheck size={40} color="rgba(255,255,255,0.12)" style={{ marginBottom: '16px' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>
                Select a Recommendation
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', lineHeight: 1.5, maxWidth: '260px' }}>
                Select an action from the list to view its rationale, evidence, and approval controls.
              </div>
            </div>
          ) : (
            <ActionDetailPanel
              key={selectedActionId}
              actionId={selectedActionId}
              onActionUpdated={loadActions}
            />
          )}
        </div>

        {/* RIGHT: Copilot */}
        <CopilotPanel complaintId={copilotComplaintId} />
      </div>
    </div>
  );
};

export default ActionCenterPage;

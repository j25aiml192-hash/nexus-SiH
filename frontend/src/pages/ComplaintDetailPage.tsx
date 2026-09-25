import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  UserPlus,
  MoreHorizontal,
  Activity,
  FileText,
  RefreshCw,
  MapPin,
  Check,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { dataSource } from '../services/dataSource';
import { useNexusStore } from '../store/useNexusStore';
import type { Complaint } from '../types/nexus';

export const ComplaintDetailPage: React.FC = () => {
  const { complaintId } = useParams<{ complaintId: string }>();
  const navigate = useNavigate();
  const setSelectedComplaintId = useNexusStore((state: any) => state.setSelectedComplaintId);

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interactive notes state
  const [notes, setNotes] = useState<Array<{ id: string; author: string; timestamp: string; text: string }>>([
    {
      id: 'note-init',
      author: 'Demo Analyst',
      timestamp: '10:30 AM',
      text: 'Case received via portal. Automated mule chain extraction initiated.',
    },
  ]);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [currentStatus, setCurrentStatus] = useState('Under Investigation');
  const [assignedOfficer, setAssignedOfficer] = useState('Unassigned');
  const [showAssignOfficerModal, setShowAssignOfficerModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showMoreActionsModal, setShowMoreActionsModal] = useState(false);

  useEffect(() => {
    if (!complaintId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    dataSource.getComplaintById(complaintId)
      .then((res) => {
        if (!isMounted) return;
        if (!res) {
          setError(`Complaint record "${complaintId}" does not exist in the NEXUS database.`);
        } else {
          setComplaint(res);
          setSelectedComplaintId(res.id);
          setAssignedOfficer(res.assignedOfficer || 'Unassigned');
          setCurrentStatus(
            res.status === 'resolved' ? 'Resolved' :
            res.status === 'flagged' ? 'Under Investigation' :
            res.status === 'alerted' ? 'Under Investigation' : 'New'
          );
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to retrieve complaint from backend.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [complaintId, setSelectedComplaintId]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const note = {
      id: `note-${Date.now()}`,
      author: 'Demo Analyst',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      text: newNoteText.trim(),
    };
    setNotes((prev) => [note, ...prev]);
    setNewNoteText('');
    setShowAddNoteModal(false);
  };

  const handleAssignOfficerSelect = (officer: string) => {
    setAssignedOfficer(officer);
    setShowAssignOfficerModal(false);
  };

  const handleStatusSelect = (status: string) => {
    setCurrentStatus(status);
    setShowStatusModal(false);
  };

  const handleViewOnMap = () => {
    if (!complaint) return;
    setSelectedComplaintId(complaint.id);
    navigate('/map');
  };

  if (isLoading) {
    return (
      <div className="nexus-center-container">
        <Loader2 className="nexus-spinner animate-spin" size={42} />
        <div className="nexus-loading-text mt-3">
          FETCHING COMPLAINT DOSSIER {complaintId} FROM NEXUS BACKEND...
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="nexus-center-container">
        <div className="nexus-card nexus-error-card">
          <AlertTriangle size={48} className="text-red-500 mb-3" />
          <h2 className="text-xl font-bold">COMPLAINT NOT FOUND</h2>
          <p className="text-slate-500 text-sm mt-2 mb-4">
            {error || `Complaint ID "${complaintId}" does not exist in the active case ledger.`}
          </p>
          <button
            onClick={() => navigate('/complaints')}
            className="nexus-btn-assign-officer"
          >
            ← Return to Complaints List
          </button>
        </div>
      </div>
    );
  }

  const amountVal = Number(complaint.amount || complaint.amount_inr || 0);
  const formattedAmount =
    amountVal >= 10000000 ? `₹${(amountVal / 10000000).toFixed(2)} Cr` :
    amountVal >= 100000 ? `₹${(amountVal / 100000).toFixed(1)} L` :
    `₹${amountVal.toLocaleString('en-IN')}`;

  const reportedDate = complaint.created_at ? new Date(complaint.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent';
  const primaryAcc = complaint.linkedAccountId || (complaint.accused_bank ? `${complaint.accused_bank} Acc` : 'ACC-PRIMARY-01');

  return (
    <div className="nexus-page-container">
      {/* 1. Top Back-link + Breadcrumb Navigation */}
      <div className="nexus-detail-top-nav">
        <button
          onClick={() => navigate('/complaints')}
          className="nexus-back-link"
        >
          <ArrowLeft size={14} /> Back to complaints
        </button>
        <div className="nexus-breadcrumbs">
          <Link to="/complaints" className="nexus-breadcrumb-link">Complaints</Link>
          <span style={{ margin: '0 6px', color: '#94A3B8' }}>/</span>
          <span className="nexus-breadcrumb-current">{complaint.id}</span>
        </div>
      </div>

      {/* 2. Header Row: Title, Subtitle, Status Pill & Action Buttons */}
      <div className="nexus-detail-header">
        <div>
          <h1 className="nexus-detail-title">
            Complaint {complaint.id}
          </h1>
          <div className="nexus-detail-subtitle">
            {complaint.fraud_type || 'Cyber Fraud'} · Reported {reportedDate}
          </div>
        </div>

        <div className="nexus-detail-header-actions">
          <span className="nexus-status-pill-under-investigation">
            {currentStatus}
          </span>
          <button
            onClick={() => setShowAssignOfficerModal(true)}
            className="nexus-btn-assign-officer"
          >
            <UserPlus size={15} /> Assign Officer
          </button>
          <button
            onClick={() => setShowMoreActionsModal(true)}
            className="nexus-btn-outline-action"
            title="More actions"
          >
            <MoreHorizontal size={16} /> More actions
          </button>
        </div>
      </div>

      {/* 3. 8-Box Metadata Overview Grid */}
      <div className="nexus-metadata-grid">
        <div className="nexus-metadata-box">
          <span className="nexus-metadata-label">COMPLAINT ID</span>
          <span className="nexus-metadata-val mono">{complaint.id}</span>
        </div>

        <div className="nexus-metadata-box">
          <span className="nexus-metadata-label">COMPLAINT TYPE</span>
          <span className="nexus-metadata-val">{complaint.fraud_type || 'Impersonation'}</span>
        </div>

        <div className="nexus-metadata-box">
          <span className="nexus-metadata-label">REPORTED ON</span>
          <span className="nexus-metadata-val mono" style={{ fontSize: '12.5px', fontWeight: 500 }}>
            {reportedDate}
          </span>
        </div>

        <div className="nexus-metadata-box">
          <span className="nexus-metadata-label">PRIMARY BENEFICIARY</span>
          <span className="nexus-metadata-val mono">{primaryAcc}</span>
        </div>

        <div className="nexus-metadata-box">
          <span className="nexus-metadata-label">AMOUNT</span>
          <span className="nexus-metadata-val mono">{formattedAmount}</span>
        </div>

        <div className="nexus-metadata-box">
          <span className="nexus-metadata-label">RISK</span>
          <span
            className="nexus-metadata-val"
            style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span
              style={{
                width: '3px',
                height: '14px',
                backgroundColor: '#DC2626',
                borderRadius: '2px',
                display: 'inline-block',
              }}
            ></span>
            CRITICAL
          </span>
        </div>

        <div className="nexus-metadata-box">
          <span className="nexus-metadata-label">STATUS</span>
          <span className="nexus-status-pill-small">{currentStatus}</span>
        </div>

        <div className="nexus-metadata-box">
          <span className="nexus-metadata-label">VICTIM LOCATION</span>
          <span className="nexus-metadata-val" style={{ fontSize: '13px', fontWeight: 500 }}>
            {complaint.victim_district || complaint.victim_state || 'Delhi NCR'}
          </span>
        </div>
      </div>

      {/* 4. Two-Column Layout */}
      <div className="nexus-detail-main-layout">
        {/* Left Column */}
        <div className="nexus-detail-left-col">
          {/* Card: Complaint Details */}
          <div className="nexus-box-card">
            <h3 className="nexus-box-title">Complaint Details</h3>

            <div className="nexus-detail-keyval-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="nexus-keyval-row">
                  <span className="nexus-keyval-key">Complainant / Victim</span>
                  <span className="nexus-keyval-val">{complaint.victimInfo?.name || 'Citizen Victim'}</span>
                </div>
                <div className="nexus-keyval-row">
                  <span className="nexus-keyval-key">Incident jurisdiction</span>
                  <span className="nexus-keyval-val mono">{complaint.victim_district || 'District Cyber Cell'}</span>
                </div>
                <div className="nexus-keyval-row">
                  <span className="nexus-keyval-key">Accused beneficiary bank</span>
                  <span className="nexus-keyval-val mono">{complaint.accused_bank || 'HDFC Bank'}</span>
                </div>
                <div className="nexus-keyval-row">
                  <span className="nexus-keyval-key">Channel</span>
                  <span className="nexus-keyval-val mono">{complaint.channel || '1930 Helpline'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="nexus-keyval-row">
                  <span className="nexus-keyval-key">Complaint category</span>
                  <span className="nexus-keyval-val">{complaint.fraud_type || 'UPI Fraud'}</span>
                </div>
                <div className="nexus-keyval-row">
                  <span className="nexus-keyval-key">Reported channel</span>
                  <span className="nexus-keyval-val">{complaint.channel || 'National Cybercrime Portal'}</span>
                </div>
                <div className="nexus-keyval-row">
                  <span className="nexus-keyval-key">Reported amount</span>
                  <span className="nexus-keyval-val mono">{formattedAmount}</span>
                </div>
                <div className="nexus-keyval-row">
                  <span className="nexus-keyval-key">Assigned officer</span>
                  <span className="nexus-keyval-val">{assignedOfficer}</span>
                </div>
              </div>
            </div>

            <div className="nexus-detail-description">
              <span className="nexus-detail-description-label">DESCRIPTION</span>
              <p className="nexus-detail-description-text">
                {complaint.description || `Victim reported unauthorized transfer of ${formattedAmount} diverted through rapid multi-hop accounts. First hop beneficiary identified in ${complaint.accused_bank || 'nodal bank'}. Interception recommended.`}
              </p>
            </div>
          </div>

          {/* Card: Case Activity Timeline */}
          <div className="nexus-box-card">
            <h3 className="nexus-box-title">Case Activity</h3>

            <div className="nexus-timeline-list">
              {[
                { time: '10:00 AM', title: 'Complaint Intake', description: `Complaint filed and ingested into NEXUS database with ID ${complaint.id}.` },
                { time: '10:05 AM', title: 'ML Fraud Inference', description: 'Dual LightGBM and XGBoost cashout location and risk vector computed.' },
                { time: '10:12 AM', title: 'Mule Graph Constructed', description: 'Immediate inter-bank transfer hops traced to beneficiary network.' }
              ].map((event, idx) => (
                <div key={idx} className="nexus-timeline-item">
                  <div className="nexus-timeline-node">
                    <span className="nexus-timeline-dot"></span>
                    {idx < 2 && <span className="nexus-timeline-line"></span>}
                  </div>

                  <div className="nexus-timeline-content">
                    <div className="nexus-timeline-header">
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{event.time}</span>
                      <span>{event.title}</span>
                    </div>
                    <div className="nexus-timeline-desc">
                      {event.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Tactical Notes */}
          <div className="nexus-box-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 className="nexus-box-title" style={{ margin: 0 }}>Investigator Log Notes</h3>
              <button
                onClick={() => setShowAddNoteModal(true)}
                className="nexus-btn-assign-officer"
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                + Add Note
              </button>
            </div>

            <div className="nexus-timeline-list">
              {notes.map((n) => (
                <div key={n.id} className="nexus-timeline-item">
                  <div className="nexus-timeline-node">
                    <span className="nexus-timeline-dot" style={{ backgroundColor: '#0F9D72' }}></span>
                  </div>
                  <div className="nexus-timeline-content">
                    <div className="nexus-timeline-header">
                      <span style={{ fontFamily: 'var(--font-mono)', color: '#087F5B' }}>{n.author}</span>
                      <span style={{ color: '#94A3B8', fontSize: '11px' }}>{n.timestamp}</span>
                    </div>
                    <div className="nexus-timeline-desc">{n.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="nexus-detail-right-col">
          {/* Card: Case Actions */}
          <div className="nexus-box-card">
            <h3 className="nexus-box-title">Case Actions</h3>

            <div className="nexus-case-actions-list">
              <button
                onClick={() => setShowAssignOfficerModal(true)}
                className="nexus-case-action-btn-primary"
              >
                <UserPlus size={16} />
                <span>Assign Officer</span>
              </button>

              <button
                onClick={() => navigate(`/prediction/${complaint.id}`)}
                className="nexus-case-action-btn"
              >
                <Activity size={16} style={{ color: '#087F5B' }} />
                <span>Run Prediction</span>
              </button>

              <button
                onClick={() => navigate(`/complaints/${complaint.id}/network`)}
                className="nexus-case-action-btn"
              >
                <Activity size={16} style={{ color: '#64748B' }} />
                <span>View Network Graph</span>
              </button>

              <button
                onClick={handleViewOnMap}
                className="nexus-case-action-btn"
              >
                <MapPin size={16} style={{ color: '#64748B' }} />
                <span>View on Map</span>
              </button>

              <button
                onClick={() => setShowAddNoteModal(true)}
                className="nexus-case-action-btn"
              >
                <FileText size={16} style={{ color: '#64748B' }} />
                <span>Add Note</span>
              </button>

              <button
                onClick={() => setShowStatusModal(true)}
                className="nexus-case-action-btn"
              >
                <RefreshCw size={16} style={{ color: '#64748B' }} />
                <span>Update Status</span>
              </button>
            </div>
          </div>

          {/* Card: Case Information */}
          <div className="nexus-box-card">
            <h3 className="nexus-box-title">Case Information</h3>

            <div className="nexus-info-list">
              <div className="nexus-info-row">
                <span className="nexus-info-key">Created</span>
                <span className="nexus-info-val" style={{ fontFamily: 'var(--font-mono)' }}>
                  {reportedDate}
                </span>
              </div>

              <div className="nexus-info-row">
                <span className="nexus-info-key">Assigned Officer</span>
                <span className="nexus-info-val">{assignedOfficer}</span>
              </div>

              <div className="nexus-info-row">
                <span className="nexus-info-key">Priority</span>
                <span className="nexus-info-val" style={{ color: '#DC2626', fontWeight: 700 }}>Critical</span>
              </div>

              <div className="nexus-info-row">
                <span className="nexus-info-key">Target Bank</span>
                <span className="nexus-info-val">{complaint.accused_bank || 'HDFC Bank'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Assign Officer */}
      {showAssignOfficerModal && (
        <div className="nexus-modal-overlay">
          <div className="nexus-modal-dialog">
            <div className="nexus-modal-header">
              <h3 className="nexus-modal-title">Assign Investigating Officer</h3>
              <button
                onClick={() => setShowAssignOfficerModal(false)}
                className="nexus-modal-close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="nexus-modal-body">
              <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '14px' }}>
                Select an investigating officer from the Cybercrime Division roster:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['Inspector Vikram Rao', 'Inspector Rajesh Sharma', 'Sub-Inspector Anjali Verma', 'Inspector Priya Deshmukh'].map((off) => (
                  <button
                    key={off}
                    onClick={() => handleAssignOfficerSelect(off)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: assignedOfficer === off ? '#E8F5F0' : '#FFFFFF',
                      border: assignedOfficer === off ? '1px solid #087F5B' : '1px solid #E2E8E6',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: assignedOfficer === off ? '#087F5B' : '#102A2A',
                    }}
                  >
                    <span>{off}</span>
                    {assignedOfficer === off && <Check size={16} color="#087F5B" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Note */}
      {showAddNoteModal && (
        <div className="nexus-modal-overlay">
          <div className="nexus-modal-dialog">
            <div className="nexus-modal-header">
              <h3 className="nexus-modal-title">Add Case Note</h3>
              <button
                onClick={() => setShowAddNoteModal(false)}
                className="nexus-modal-close"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddNote}>
              <div className="nexus-modal-body">
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Enter case note or investigation update..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #E2E8E6',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                  autoFocus
                />
              </div>
              <div className="nexus-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  className="nexus-btn-outline-action"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newNoteText.trim()}
                  className="nexus-btn-assign-officer"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Update Status */}
      {showStatusModal && (
        <div className="nexus-modal-overlay">
          <div className="nexus-modal-dialog">
            <div className="nexus-modal-header">
              <h3 className="nexus-modal-title">Update Complaint Status</h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="nexus-modal-close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="nexus-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['Under Investigation', 'New', 'Resolved'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusSelect(st)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: currentStatus === st ? '#E8F5F0' : '#FFFFFF',
                      border: currentStatus === st ? '1px solid #087F5B' : '1px solid #E2E8E6',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: currentStatus === st ? '#087F5B' : '#102A2A',
                    }}
                  >
                    <span>{st}</span>
                    {currentStatus === st && <Check size={16} color="#087F5B" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: More Actions */}
      {showMoreActionsModal && (
        <div className="nexus-modal-overlay">
          <div className="nexus-modal-dialog">
            <div className="nexus-modal-header">
              <h3 className="nexus-modal-title">More Actions</h3>
              <button
                onClick={() => setShowMoreActionsModal(false)}
                className="nexus-modal-close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="nexus-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => {
                  alert('Lien freeze request dispatched to nodal officer.');
                  setShowMoreActionsModal(false);
                }}
                className="nexus-case-action-btn"
                style={{ textAlign: 'left' }}
              >
                Mark Lien Freeze on Primary Account
              </button>
              <button
                onClick={() => {
                  alert('Case dossier export initialized.');
                  setShowMoreActionsModal(false);
                }}
                className="nexus-case-action-btn"
                style={{ textAlign: 'left' }}
              >
                Export Case Dossier PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ComplaintDetailPage;

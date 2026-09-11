import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  UserPlus,
  MoreHorizontal,
  Activity,
  FileText,
  RefreshCw,
  Check,
  X,
} from 'lucide-react';
import { getComplaintById, COMPLAINTS_DATA, type ComplaintDetail } from '../data/complaints-data';
import { useNexusStore } from '../store/useNexusStore';
import { NetworkGraphNavigation } from '../components/network/NetworkGraphNavigation';

export const ComplaintDetailPage: React.FC = () => {
  const { complaintId } = useParams<{ complaintId: string }>();
  const navigate = useNavigate();

  // Zustand Store Integration
  const updateComplaintInStore = useNexusStore((state) => state.updateComplaint);
  const storeComplaints = useNexusStore((state) => state.complaints);

  // Find complaint in COMPLAINTS_DATA or fallback to C1030
  const complaint: ComplaintDetail =
    (complaintId && getComplaintById(complaintId)) ||
    COMPLAINTS_DATA[0];

  // Also check if existing in Zustand store
  const storeMatch = storeComplaints.find((c) => c.id === complaint.id || c.id === complaintId);

  // Local state for interactive page elements
  const [notes, setNotes] = useState(complaint.notes || []);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [currentStatus, setCurrentStatus] = useState(complaint.status);
  const [assignedOfficer, setAssignedOfficer] = useState(complaint.assignedOfficer);
  const [showAssignOfficerModal, setShowAssignOfficerModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showMoreActionsModal, setShowMoreActionsModal] = useState(false);

  // Handlers
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const note = {
      id: `note-${Date.now()}`,
      author: 'Tanya Mishra (Analyst)',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      text: newNoteText.trim(),
    };
    setNotes([note, ...notes]);
    setNewNoteText('');
    setShowAddNoteModal(false);
  };

  const handleOfficerSelect = (officer: string) => {
    setAssignedOfficer(officer);
    setShowAssignOfficerModal(false);
  };

  const handleStatusSelect = (status: 'Under Investigation' | 'New' | 'Resolved') => {
    setCurrentStatus(status);
    setShowStatusModal(false);

    // Sync status change with Zustand store if record exists
    if (storeMatch) {
      const mappedStatus =
        status === 'Under Investigation'
          ? 'analyzing'
          : status === 'Resolved'
          ? 'resolved'
          : 'filed';
      updateComplaintInStore(storeMatch.id, { status: mappedStatus });
    }
  };

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
            {complaint.complaintType} · Reported {complaint.reportedOn}
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
          <span className="nexus-metadata-val">{complaint.complaintType}</span>
        </div>

        <div className="nexus-metadata-box">
          <span className="nexus-metadata-label">REPORTED ON</span>
          <span className="nexus-metadata-val mono" style={{ fontSize: '12.5px', fontWeight: 500 }}>
            {complaint.reportedOn}
          </span>
        </div>

        <div className="nexus-metadata-box">
          <span className="nexus-metadata-label">PRIMARY ACCOUNT</span>
          <span className="nexus-metadata-val mono">{complaint.primaryAccount}</span>
        </div>

        <div className="nexus-metadata-box">
          <span className="nexus-metadata-label">AMOUNT</span>
          <span className="nexus-metadata-val mono">{complaint.amountFormatted}</span>
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
            {complaint.risk}
          </span>
        </div>

        <div className="nexus-metadata-box">
          <span className="nexus-metadata-label">STATUS</span>
          <span className="nexus-status-pill-small">{currentStatus}</span>
        </div>

        <div className="nexus-metadata-box">
          <span className="nexus-metadata-label">LAST UPDATED</span>
          <span className="nexus-metadata-val" style={{ fontSize: '13px', fontWeight: 500 }}>
            {complaint.lastUpdated}
          </span>
        </div>
      </div>

      {/* 4. Two-Column Layout: Left (Complaint Details, Timeline, Related) & Right (Actions, Case Info) */}
      <div className="nexus-detail-main-layout">
        {/* Left Column */}
        <div className="nexus-detail-left-col">
          {/* Card: Complaint Details */}
          <div className="nexus-box-card">
            <h3 className="nexus-box-title">Complaint Details</h3>

            <div className="nexus-detail-keyval-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="nexus-keyval-row">
                  <span className="nexus-keyval-key">Reported by</span>
                  <span className="nexus-keyval-val">{complaint.reportedBy}</span>
                </div>
                <div className="nexus-keyval-row">
                  <span className="nexus-keyval-key">Incident date</span>
                  <span className="nexus-keyval-val mono">{complaint.incidentDate}</span>
                </div>
                <div className="nexus-keyval-row">
                  <span className="nexus-keyval-key">Transaction reference</span>
                  <span className="nexus-keyval-val mono">{complaint.transactionReference}</span>
                </div>
                <div className="nexus-keyval-row">
                  <span className="nexus-keyval-key">Primary account</span>
                  <span className="nexus-keyval-val mono">{complaint.primaryAccount}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="nexus-keyval-row">
                  <span className="nexus-keyval-key">Complaint category</span>
                  <span className="nexus-keyval-val">{complaint.complaintType}</span>
                </div>
                <div className="nexus-keyval-row">
                  <span className="nexus-keyval-key">Reported channel</span>
                  <span className="nexus-keyval-val">{complaint.reportedChannel}</span>
                </div>
                <div className="nexus-keyval-row">
                  <span className="nexus-keyval-key">Reported amount</span>
                  <span className="nexus-keyval-val mono">₹{complaint.amount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="nexus-detail-description">
              <span className="nexus-detail-description-label">DESCRIPTION</span>
              <p className="nexus-detail-description-text">
                {complaint.description}
              </p>
            </div>
          </div>

          {/* Card: Case Activity Timeline */}
          <div className="nexus-box-card">
            <h3 className="nexus-box-title">Case Activity</h3>

            <div className="nexus-timeline-list">
              {complaint.timeline.map((event, idx) => (
                <div key={idx} className="nexus-timeline-item">
                  <div className="nexus-timeline-node">
                    <span className="nexus-timeline-dot"></span>
                    {idx < complaint.timeline.length - 1 && (
                      <span className="nexus-timeline-line"></span>
                    )}
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

          {/* Card: Related Information */}
          <div className="nexus-box-card">
            <h3 className="nexus-box-title">Related Information</h3>

            <div className="nexus-info-list">
              <div className="nexus-info-row">
                <span className="nexus-info-key">Primary Account</span>
                <span className="nexus-info-val" style={{ fontFamily: 'var(--font-mono)' }}>
                  {complaint.primaryAccount}
                </span>
              </div>

              <div className="nexus-info-row">
                <span className="nexus-info-key">Linked Accounts</span>
                <span className="nexus-info-val">{complaint.linkedAccountsCount} linked accounts</span>
              </div>

              <div className="nexus-info-row">
                <span className="nexus-info-key">Transactions</span>
                <span className="nexus-info-val">{complaint.relatedTransactionsCount} related transactions</span>
              </div>

              <div className="nexus-info-row">
                <span className="nexus-info-key">Network</span>
                <button
                  onClick={() => navigate(`/complaints/${complaint.id}/network`)}
                  className="nexus-info-link"
                >
                  View Network Graph &gt;
                </button>
              </div>

              <div className="nexus-info-row">
                <span className="nexus-info-key">Prediction</span>
                <button
                  onClick={() => navigate('/prediction/ACC-89214')}
                  className="nexus-info-link"
                >
                  Run Prediction &gt;
                </button>
              </div>
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
                onClick={() => navigate('/prediction/ACC-89214')}
                className="nexus-case-action-btn"
              >
                <Activity size={16} style={{ color: '#64748B' }} />
                <span>Run Prediction</span>
              </button>

              <NetworkGraphNavigation complaintId={complaint.id} />

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
                  {complaint.reportedOn}
                </span>
              </div>

              <div className="nexus-info-row">
                <span className="nexus-info-key">Assigned Officer</span>
                <span className="nexus-info-val">{assignedOfficer}</span>
              </div>

              <div className="nexus-info-row">
                <span className="nexus-info-key">Priority</span>
                <span className="nexus-info-val">Critical</span>
              </div>

              <div className="nexus-info-row">
                <span className="nexus-info-key">SLA</span>
                <span className="nexus-info-val">{complaint.sla}</span>
              </div>

              <div className="nexus-info-row">
                <span className="nexus-info-key">Last Updated</span>
                <span className="nexus-info-val">{complaint.lastUpdated}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: Assign Officer Modal */}
      {showAssignOfficerModal && (
        <div className="nexus-modal-overlay">
          <div className="nexus-modal-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#102A2A', margin: 0 }}>
                Reassign Investigation Officer
              </h3>
              <button
                onClick={() => setShowAssignOfficerModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['A. Sharma', 'A. Verma', 'S. Nair', 'R. Iyer', 'P. Deshmukh', 'Unassigned'].map((officer) => (
                <button
                  key={officer}
                  onClick={() => handleOfficerSelect(officer)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: assignedOfficer === officer ? '1px solid #087F5B' : '1px solid #E2E8E6',
                    backgroundColor: assignedOfficer === officer ? '#E8F5EE' : '#FFFFFF',
                    color: assignedOfficer === officer ? '#087F5B' : '#102A2A',
                    fontWeight: assignedOfficer === officer ? 700 : 500,
                  }}
                >
                  <span>{officer}</span>
                  {assignedOfficer === officer && <Check size={14} />}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAssignOfficerModal(false)}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  color: '#64748B',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8E6',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Update Status Modal */}
      {showStatusModal && (
        <div className="nexus-modal-overlay">
          <div className="nexus-modal-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#102A2A', margin: 0 }}>
                Update Complaint Status
              </h3>
              <button
                onClick={() => setShowStatusModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(['Under Investigation', 'New', 'Resolved'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusSelect(status)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: currentStatus === status ? '1px solid #087F5B' : '1px solid #E2E8E6',
                    backgroundColor: currentStatus === status ? '#E8F5EE' : '#FFFFFF',
                    color: currentStatus === status ? '#087F5B' : '#102A2A',
                    fontWeight: currentStatus === status ? 700 : 500,
                  }}
                >
                  <span>{status}</span>
                  {currentStatus === status && <Check size={14} />}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowStatusModal(false)}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  color: '#64748B',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8E6',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Add Note Modal */}
      {showAddNoteModal && (
        <div className="nexus-modal-overlay">
          <div className="nexus-modal-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#102A2A', margin: 0 }}>
                Add Investigation Note
              </h3>
              <button
                onClick={() => setShowAddNoteModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddNote}>
              <textarea
                rows={4}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Record investigative action, bank nodal response, or suspect mule observation..."
                className="nexus-form-input"
                style={{ resize: 'vertical' }}
                autoFocus
              />
              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    color: '#64748B',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8E6',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="nexus-btn-assign-officer"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: More Actions Modal */}
      {showMoreActionsModal && (
        <div className="nexus-modal-overlay">
          <div className="nexus-modal-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#102A2A', margin: 0 }}>
                More Actions
              </h3>
              <button
                onClick={() => setShowMoreActionsModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
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
                  alert('Case dossier PDF generated.');
                  setShowMoreActionsModal(false);
                }}
                className="nexus-case-action-btn"
                style={{ textAlign: 'left' }}
              >
                Export Case Dossier (PDF)
              </button>
              <button
                onClick={() => {
                  navigate('/map');
                  setShowMoreActionsModal(false);
                }}
                className="nexus-case-action-btn"
                style={{ textAlign: 'left', color: '#087F5B', fontWeight: 700 }}
              >
                View Geospatial Mule Track
              </button>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowMoreActionsModal(false)}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  color: '#64748B',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8E6',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Footer Banner */}
      <footer className="nexus-demonstration-footer">
        NEXUS · RESTRICTED OPERATIONAL USE · ALL IDENTIFIERS MASKED · DEMONSTRATION DATA
      </footer>
    </div>
  );
};

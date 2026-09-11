import React from 'react';
import { FilePlus, Bell, Map, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickActionsCardProps {
  onNewComplaint?: () => void;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({ onNewComplaint }) => {
  const navigate = useNavigate();

  return (
    <div className="nexus-box-card">
      <div className="nexus-box-card-header">
        <div>
          <h3 className="nexus-box-title">Quick Actions</h3>
          <p className="nexus-box-subtitle">Shift 02 duty shortcuts</p>
        </div>
      </div>

      <div className="nexus-quick-actions-grid space-y-2.5 mt-3">
        <button
          onClick={() => {
            if (onNewComplaint) onNewComplaint();
            else navigate('/complaints?action=new');
          }}
          className="nexus-quick-btn-primary w-full flex items-center justify-center gap-2"
        >
          <FilePlus size={16} />
          <span>New Complaint</span>
        </button>

        <button
          onClick={() => navigate('/alerts')}
          className="nexus-quick-btn-secondary w-full flex items-center justify-center gap-2"
        >
          <Bell size={16} className="text-[#64748B]" />
          <span>View Alerts</span>
        </button>

        <button
          onClick={() => navigate('/map')}
          className="nexus-quick-btn-secondary w-full flex items-center justify-center gap-2"
        >
          <Map size={16} className="text-[#64748B]" />
          <span>Geospatial Map</span>
        </button>

        <button
          onClick={() => navigate('/incidents')}
          className="nexus-quick-btn-secondary w-full flex items-center justify-center gap-2"
        >
          <ShieldAlert size={16} className="text-[#64748B]" />
          <span>View Incidents</span>
        </button>
      </div>
    </div>
  );
};

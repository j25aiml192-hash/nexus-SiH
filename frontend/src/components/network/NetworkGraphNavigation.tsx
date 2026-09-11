import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Share2 } from "lucide-react";

export interface NetworkGraphNavigationProps {
  complaintId: string;
  className?: string;
  label?: string;
  children?: ReactNode;
}

export const NetworkGraphNavigation = ({
  complaintId,
  className = "nexus-case-action-btn",
  label = "View Network",
  children,
}: NetworkGraphNavigationProps) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate(`/complaints/${complaintId}/network`);
  };

  return (
    <button
      type="button"
      onClick={handleNavigate}
      className={className}
      title={`Open Network Graph for Complaint ${complaintId}`}
    >
      {children || (
        <>
          <Share2 size={16} style={{ color: "#64748B" }} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};

import React from 'react';
import type { EvidenceTimelineEvent } from '../../types/evidence';
import {
  Clock,
  FileText,
  Link as LinkIcon,
  Cpu,
  Shield,
} from 'lucide-react';

interface EvidenceTimelineProps {
  timeline: EvidenceTimelineEvent[];
  isLoading: boolean;
}

export const EvidenceTimeline: React.FC<EvidenceTimelineProps> = ({
  timeline,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div
        style={{
          padding: '24px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          textAlign: 'center',
          color: '#64748B',
          fontSize: '13px',
        }}
      >
        Loading chronological evidence timeline...
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px dashed #CBD5E1',
          textAlign: 'center',
          color: '#64748B',
          fontSize: '13px',
        }}
      >
        No historical evidence events recorded for this complaint.
      </div>
    );
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'OBSERVATION':
        return <FileText size={14} style={{ color: '#059669' }} />;
      case 'EVIDENCE':
        return <LinkIcon size={14} style={{ color: '#2563EB' }} />;
      case 'MODEL':
        return <Cpu size={14} style={{ color: '#9333EA' }} />;
      case 'AUTONOMY':
        return <Shield size={14} style={{ color: '#4F46E5' }} />;
      default:
        return <Clock size={14} style={{ color: '#64748B' }} />;
    }
  };

  const getSemanticBadge = (level: string) => {
    switch (level) {
      case 'DIRECT_OBSERVED':
        return { bg: '#ECFDF5', text: '#059669', label: 'Direct Observed' };
      case 'DERIVED':
        return { bg: '#EEF2FF', text: '#4F46E5', label: 'Derived' };
      case 'INFERRED':
        return { bg: '#FFFBEB', text: '#D97706', label: 'Inferred' };
      case 'MODEL_SIGNAL':
        return { bg: '#FAF5FF', text: '#9333EA', label: 'Model Signal' };
      default:
        return { bg: '#F1F5F9', text: '#475569', label: level };
    }
  };

  return (
    <div
      style={{
        padding: '22px 24px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} style={{ color: '#2563EB' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Chronological Evidence Timeline ({timeline.length} Events)
          </h3>
        </div>
        <span style={{ fontSize: '11px', color: '#64748B' }}>
          Real chronological sequence from intake through current intelligence
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
        {/* Left vertical timeline bar */}
        <div
          style={{
            position: 'absolute',
            left: '19px',
            top: '12px',
            bottom: '12px',
            width: '2px',
            backgroundColor: '#E2E8F0',
            zIndex: 1,
          }}
        />

        {timeline.map((event) => {
          const sem = getSemanticBadge(event.semantic_level);

          return (
            <div
              key={event.id}
              style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #F1F5F9',
                marginLeft: '6px',
              }}
            >
              {/* Category Icon Squircle */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                {getCategoryIcon(event.category)}
              </div>

              {/* Event Content */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                      {event.title}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: sem.bg,
                        color: sem.text,
                      }}
                    >
                      {sem.label}
                    </span>
                  </div>

                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Recent'}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', lineHeight: 1.4 }}>
                  {event.description}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', fontSize: '11px', color: '#94A3B8' }}>
                  <span>Source: {event.source_type}</span>
                  {event.source_id && (
                    <span>ID: <code style={{ fontFamily: 'monospace' }}>{event.source_id.slice(0, 14)}</code></span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

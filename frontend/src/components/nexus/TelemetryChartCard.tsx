import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';

export const TelemetryChartCard: React.FC = () => {
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      
      {/* CHART CANVAS WRAPPER */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '220px',
        backgroundColor: '#F8FAFC',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '16px 16px 8px 16px',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        <svg
          style={{ width: '100%', height: '160px' }}
          viewBox="0 0 500 140"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="figmaChartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Dotted Grid Lines */}
          <line x1="0" y1="35" x2="500" y2="35" stroke="#CBD5E1" strokeDasharray="4 4" strokeOpacity="0.6" />
          <line x1="0" y1="70" x2="500" y2="70" stroke="#CBD5E1" strokeDasharray="4 4" strokeOpacity="0.6" />
          <line x1="0" y1="105" x2="500" y2="105" stroke="#CBD5E1" strokeDasharray="4 4" strokeOpacity="0.6" />

          {/* Area Fill */}
          <path
            d="M 0,115 Q 60,85 120,95 T 240,65 Q 300,20 360,45 T 440,95 T 500,30 L 500,140 L 0,140 Z"
            fill="url(#figmaChartGradient)"
          />

          {/* Smooth Blue Stroke Line */}
          <path
            d="M 0,115 Q 60,85 120,95 T 240,65 Q 300,20 360,45 T 440,95 T 500,30"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Data Node 1: Critical Peak Spike at 14:00 (Red Dot) */}
          <g
            onMouseEnter={() => setHoveredPoint('spike')}
            onMouseLeave={() => setHoveredPoint(null)}
            style={{ cursor: 'pointer' }}
          >
            <circle cx="265" cy="50" r="14" fill="#EF4444" fillOpacity="0.2" className="animate-ping" />
            <circle cx="265" cy="50" r="6" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2.5" />
          </g>

          {/* Data Node 2: 20:00 Sub Node (Blue Dot) */}
          <circle cx="395" cy="65" r="4.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />

          {/* Data Node 3: NOW Live Node (Emerald Green Dot) */}
          <g>
            <circle cx="496" cy="30" r="8" fill="#10B981" fillOpacity="0.25" />
            <circle cx="496" cy="30" r="5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
          </g>
        </svg>

        {/* Floating Tooltip Callout on Peak Spike Hover */}
        {hoveredPoint === 'spike' && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '240px',
            transform: 'translateX(-50%)',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '6px 10px',
            borderRadius: '8px',
            fontSize: '11px',
            fontFamily: 'monospace',
            fontWeight: 700,
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            zIndex: 10,
            whiteSpace: 'nowrap'
          }}>
            14:00 • Peak Cashout Spike (+142%)
          </div>
        )}

        {/* X-AXIS TIME LABELS MATCHING FIGMA SPEC */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#64748B',
          marginTop: '6px',
          padding: '0 4px'
        }}>
          <span>00:00</span>
          <span>04:00</span>
          <span>08:00</span>
          <span>12:00</span>
          <span>16:00</span>
          <span>20:00</span>
          <span style={{ color: '#2563EB', fontWeight: 800 }}>NOW</span>
        </div>
      </div>

      {/* BOTTOM INSIGHT SUMMARY FOOTER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        marginTop: '10px',
        padding: '0 4px'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontWeight: 700, fontFamily: 'monospace' }}>
          <ArrowUpRight size={14} />
          Peak Extraction Spike detected at 14:00 (+142%)
        </span>
        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94A3B8' }}>
          Updated 2s ago
        </span>
      </div>

    </div>
  );
};

export default TelemetryChartCard;

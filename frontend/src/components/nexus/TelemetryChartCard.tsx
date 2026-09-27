import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';

interface TelemetryPoint {
  time: string;
  val: number;
  label: string;
  isPeak?: boolean;
  isNow?: boolean;
}

interface TelemetryChartCardProps {
  activeTab?: 'flow' | 'volume' | 'risk';
}

export const TelemetryChartCard: React.FC<TelemetryChartCardProps> = ({ activeTab = 'flow' }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Dynamic datasets for the 3 operational telemetry tabs
  const datasets: Record<'flow' | 'volume' | 'risk', {
    title: string;
    alertMsg: string;
    strokeColor: string;
    fillGradient: [string, string];
    points: TelemetryPoint[];
  }> = {
    flow: {
      title: 'Transaction Flow Velocity',
      alertMsg: 'Peak Extraction Spike detected at 14:00 (+142%)',
      strokeColor: '#3B82F6',
      fillGradient: ['#2563EB', '#3B82F6'],
      points: [
        { time: '00:00', val: 24, label: '24 txns/h' },
        { time: '04:00', val: 38, label: '38 txns/h' },
        { time: '08:00', val: 42, label: '42 txns/h' },
        { time: '12:00', val: 85, label: '85 txns/h' },
        { time: '14:00', val: 142, label: 'Peak Extraction Spike: 142 txns/h', isPeak: true },
        { time: '16:00', val: 110, label: '110 txns/h' },
        { time: '20:00', val: 68, label: '68 txns/h' },
        { time: 'NOW', val: 94, label: '94 txns/h (Live Stream)', isNow: true }
      ]
    },
    volume: {
      title: 'NCRP Complaint Ingestion Rate',
      alertMsg: 'Surge in Digital Arrest & UPI Phishing Ingestion at 16:00 (+98 cases/h)',
      strokeColor: '#8B5CF6',
      fillGradient: ['#7C3AED', '#8B5CF6'],
      points: [
        { time: '00:00', val: 12, label: '12 NCRP cases' },
        { time: '04:00', val: 18, label: '18 cases' },
        { time: '08:00', val: 35, label: '35 cases' },
        { time: '12:00', val: 62, label: '62 cases' },
        { time: '14:00', val: 78, label: '78 cases' },
        { time: '16:00', val: 98, label: 'Peak Intake Surge: 98 cases/h', isPeak: true },
        { time: '20:00', val: 54, label: '54 cases' },
        { time: 'NOW', val: 84, label: '84 live intakes', isNow: true }
      ]
    },
    risk: {
      title: 'Mule Network Risk Index',
      alertMsg: 'High-Velocity Mule Corridor Active in Deoghar ATM Cluster (94% Risk)',
      strokeColor: '#EF4444',
      fillGradient: ['#DC2626', '#EF4444'],
      points: [
        { time: '00:00', val: 45, label: '45% Baseline Risk' },
        { time: '04:00', val: 52, label: '52% Risk Index' },
        { time: '08:00', val: 60, label: '60% Risk Index' },
        { time: '12:00', val: 94, label: 'Critical Mule Spike: 94% Risk', isPeak: true },
        { time: '14:00', val: 89, label: '89% High Risk' },
        { time: '16:00', val: 82, label: '82% High Risk' },
        { time: '20:00', val: 70, label: '70% Risk Index' },
        { time: 'NOW', val: 91, label: '91% Live Risk Score', isNow: true }
      ]
    }
  };

  const currentData = datasets[activeTab] || datasets.flow;
  const points = currentData.points;

  // Viewport dimensions
  const width = 500;
  const height = 140;
  const paddingY = 20;

  const maxVal = Math.max(...points.map((p) => p.val)) * 1.12;
  const minVal = Math.min(...points.map((p) => p.val)) * 0.8;

  const getCoords = (idx: number, val: number) => {
    const x = (idx / (points.length - 1)) * (width - 40) + 20;
    const y = height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);
    return { x, y };
  };

  const coords = points.map((p, i) => getCoords(i, p.val));

  // Generate smooth SVG curve path (cubic bezier)
  const buildPath = () => {
    if (coords.length === 0) return '';
    let d = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) / 2;
      const cp2y = p1.y;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
    }
    return d;
  };

  const linePath = buildPath();
  const areaPath = `${linePath} L ${coords[coords.length - 1].x},${height} L ${coords[0].x},${height} Z`;

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {/* CHART CANVAS WRAPPER */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '220px',
        backgroundColor: '#F8FAFC',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '16px 16px 8px 16px',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        <svg
          style={{ width: '100%', height: '160px', overflow: 'visible' }}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`chartGradient-${activeTab}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={currentData.fillGradient[0]} stopOpacity="0.35" />
              <stop offset="70%" stopColor={currentData.fillGradient[1]} stopOpacity="0.08" />
              <stop offset="100%" stopColor={currentData.fillGradient[1]} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Dotted Grid Lines */}
          <line x1="0" y1="30" x2={width} y2="30" stroke="#CBD5E1" strokeDasharray="4 4" strokeOpacity="0.5" />
          <line x1="0" y1="65" x2={width} y2="65" stroke="#CBD5E1" strokeDasharray="4 4" strokeOpacity="0.5" />
          <line x1="0" y1="100" x2={width} y2="100" stroke="#CBD5E1" strokeDasharray="4 4" strokeOpacity="0.5" />

          {/* Area Fill */}
          <path
            d={areaPath}
            fill={`url(#chartGradient-${activeTab})`}
            style={{ transition: 'all 0.4s ease-in-out' }}
          />

          {/* Smooth Stroke Line */}
          <path
            d={linePath}
            fill="none"
            stroke={currentData.strokeColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            style={{ transition: 'all 0.4s ease-in-out' }}
          />

          {/* Data Node Points */}
          {coords.map((pt, idx) => {
            const p = points[idx];
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Clean Static Highlight Ring on Hover */}
                {isHovered && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={10}
                    fill={p.isPeak ? '#EF4444' : p.isNow ? '#10B981' : currentData.strokeColor}
                    fillOpacity={0.25}
                  />
                )}

                {/* Core Dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 7 : p.isPeak ? 6 : p.isNow ? 5.5 : 4.5}
                  fill={p.isPeak ? '#DC2626' : p.isNow ? '#10B981' : currentData.strokeColor}
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  style={{ transition: 'all 0.2s ease' }}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Callout */}
        {hoveredIndex !== null && coords[hoveredIndex] && (
          <div
            style={{
              position: 'absolute',
              top: `${Math.max(8, coords[hoveredIndex].y - 28)}px`,
              left: `${coords[hoveredIndex].x}px`,
              transform: 'translateX(-50%)',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 700,
              boxShadow: '0 8px 20px rgba(15, 23, 42, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              zIndex: 30,
              whiteSpace: 'nowrap',
              pointerEvents: 'none'
            }}
          >
            {points[hoveredIndex].time} • {points[hoveredIndex].label}
          </div>
        )}

        {/* X-AXIS TIME LABELS */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#64748B',
          marginTop: '6px',
          padding: '0 8px'
        }}>
          {points.map((p, idx) => (
            <span
              key={idx}
              style={{
                color: p.isNow ? '#10B981' : p.isPeak ? '#DC2626' : '#64748B',
                fontWeight: p.isNow || p.isPeak ? 800 : 500
              }}
            >
              {p.time}
            </span>
          ))}
        </div>
      </div>

      {/* INSIGHT SUMMARY FOOTER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        marginTop: '12px',
        padding: '0 4px'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: currentData.strokeColor, fontWeight: 700, fontFamily: 'monospace' }}>
          <ArrowUpRight size={15} />
          {currentData.alertMsg}
        </span>
        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94A3B8' }}>
          Updated 2s ago
        </span>
      </div>
    </div>
  );
};

export default TelemetryChartCard;


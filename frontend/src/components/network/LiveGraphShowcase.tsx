import React, { useState, useEffect } from 'react';
import { User, Building2, Landmark, Store } from 'lucide-react';

export interface TopologyPreset {
  id: string;
  nodes: Array<{
    id: string;
    type: 'victim' | 'mule' | 'merchant' | 'cashout';
    x: number; // percentage position 0-100
    y: number; // percentage position 0-100
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    amount: string;
  }>;
}

export const PRESET_TOPOLOGIES: TopologyPreset[] = [
  // 1. Single-Hop Direct Cashout (Top-Left -> Bottom-Right Diagonal Flow)
  {
    id: 'topo-1',
    nodes: [
      { id: 'v1', type: 'victim', x: 22, y: 25 },
      { id: 'c1', type: 'cashout', x: 78, y: 75 },
    ],
    edges: [
      { id: 'e1', source: 'v1', target: 'c1', amount: '₹1.4L' },
    ],
  },
  // 2. Multi-Tier Mule Cascade (Bottom-Left -> Top-Center -> Bottom-Right Zigzag)
  {
    id: 'topo-2',
    nodes: [
      { id: 'v2', type: 'victim', x: 15, y: 75 },
      { id: 'm2_1', type: 'mule', x: 42, y: 25 },
      { id: 'm2_2', type: 'mule', x: 68, y: 75 },
      { id: 'c2', type: 'cashout', x: 88, y: 32 },
    ],
    edges: [
      { id: 'e2_1', source: 'v2', target: 'm2_1', amount: '₹8.4L' },
      { id: 'e2_2', source: 'm2_1', target: 'm2_2', amount: '₹8.4L' },
      { id: 'e2_3', source: 'm2_2', target: 'c2', amount: '₹4.2L' },
    ],
  },
  // 3. UPI Vishing Intercept (Top-Right -> Center -> Bottom-Left Reversed Flow)
  {
    id: 'topo-4',
    nodes: [
      { id: 'v4', type: 'victim', x: 80, y: 22 },
      { id: 'm4_1', type: 'mule', x: 48, y: 58 },
      { id: 'c4', type: 'cashout', x: 18, y: 78 },
    ],
    edges: [
      { id: 'e4_1', source: 'v4', target: 'm4_1', amount: '₹4.8L' },
      { id: 'e4_2', source: 'm4_1', target: 'c4', amount: '₹4.8L' },
    ],
  },
  // 4. Digital Arrest Syndicate Mesh (Top-Center -> Diagonal Steps)
  {
    id: 'topo-5',
    nodes: [
      { id: 'v5', type: 'victim', x: 48, y: 16 },
      { id: 'm5_1', type: 'mule', x: 82, y: 40 },
      { id: 'm5_2', type: 'merchant', x: 22, y: 65 },
      { id: 'c5', type: 'cashout', x: 75, y: 84 },
    ],
    edges: [
      { id: 'e5_1', source: 'v5', target: 'm5_1', amount: '₹18.5L' },
      { id: 'e5_2', source: 'm5_1', target: 'm5_2', amount: '₹18.5L' },
      { id: 'e5_3', source: 'm5_2', target: 'c5', amount: '₹9.25L' },
    ],
  },
  // 5. AEPS Regional Cashout Ring (Bottom-Right -> Top-Center -> Bottom-Left V-Shape)
  {
    id: 'topo-6',
    nodes: [
      { id: 'v6', type: 'victim', x: 82, y: 75 },
      { id: 'm6_1', type: 'mule', x: 48, y: 30 },
      { id: 'c6', type: 'cashout', x: 18, y: 72 },
    ],
    edges: [
      { id: 'e6_1', source: 'v6', target: 'm6_1', amount: '₹3.1L' },
      { id: 'e6_2', source: 'm6_1', target: 'c6', amount: '₹3.1L' },
    ],
  },
  // 6. Inter-State Investment Scam Mesh (Center-Left -> Bottom -> Top-Right Curve)
  {
    id: 'topo-7',
    nodes: [
      { id: 'v7', type: 'victim', x: 16, y: 45 },
      { id: 'm7_1', type: 'mule', x: 45, y: 80 },
      { id: 'm7_2', type: 'mule', x: 72, y: 20 },
      { id: 'c7', type: 'cashout', x: 88, y: 65 },
    ],
    edges: [
      { id: 'e7_1', source: 'v7', target: 'm7_1', amount: '₹6.2L' },
      { id: 'e7_2', source: 'm7_1', target: 'm7_2', amount: '₹6.2L' },
      { id: 'e7_3', source: 'm7_2', target: 'c7', amount: '₹6.2L' },
    ],
  },
];

export const LiveGraphShowcase: React.FC<{
  autoRotateIntervalMs?: number;
  className?: string;
  variant?: 'glass' | 'card';
}> = ({ className = '' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const activeTopo = PRESET_TOPOLOGIES[currentIndex];

  // Dynamic Refresh: Slower edge formation (2.0s per edge line + 2.5s hold after completion)
  useEffect(() => {
    const totalDurationMs = activeTopo.edges.length * 2050 + 2500;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % PRESET_TOPOLOGIES.length);
    }, totalDurationMs);

    return () => clearTimeout(timer);
  }, [currentIndex, activeTopo]);

  return (
    <div
      key={currentIndex}
      className={className}
      style={{
        width: '100%',
        height: '480px',
        backgroundColor: 'transparent',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* Dynamic Keyframes CSS for slow sequential edge & node building */}
      <style>{`
        @keyframes nexusNodePop {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0);
          }
          70% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.15);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes nexusSlowDrawLine {
          0% {
            stroke-dashoffset: 1200;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }

        @keyframes nexusPillFade {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      {/* SVG Edge Lines (Starts at Source Node Outer Rim, Ends at Target Node Outer Rim) */}
      <svg
        viewBox="0 0 1000 480"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, overflow: 'visible', zIndex: 1 }}
      >
        {activeTopo.edges.map((edge, edgeIdx) => {
          const srcNode = activeTopo.nodes.find((n) => n.id === edge.source);
          const tgtNode = activeTopo.nodes.find((n) => n.id === edge.target);

          if (!srcNode || !tgtNode) return null;

          const lineDelay = edgeIdx * 2.05 + 0.3;
          const pillDelay = edgeIdx * 2.05 + 1.95;

          // Convert percentage positions to 1000x480 viewBox coordinates
          const x1 = srcNode.x * 10;
          const y1 = srcNode.y * 4.8;
          const x2 = tgtNode.x * 10;
          const y2 = tgtNode.y * 4.8;

          const dx = x2 - x1;
          const dy = y2 - y1;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Node radii: 32px for victim/cashout (64px diameter), 28px for mule/merchant (56px diameter)
          const r1 = (srcNode.type === 'victim' || srcNode.type === 'cashout') ? 32 : 28;
          const r2 = (tgtNode.type === 'victim' || tgtNode.type === 'cashout') ? 32 : 28;

          // Vector math: Start line at source node outer rim, end line at target node outer rim
          const startX = dist > 0 ? x1 + (dx / dist) * r1 : x1;
          const startY = dist > 0 ? y1 + (dy / dist) * r1 : y1;
          const endX = dist > 0 ? x2 - (dx / dist) * r2 : x2;
          const endY = dist > 0 ? y2 - (dy / dist) * r2 : y2;

          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;

          return (
            <g key={edge.id}>
              {/* Solid Bolder Black Edge Line - Starts & ends EXACTLY at outer node circle rims */}
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke="#000000"
                strokeWidth="3.2"
                strokeLinecap="round"
                style={{
                  strokeDasharray: '1200',
                  strokeDashoffset: '1200',
                  animation: `nexusSlowDrawLine 2.0s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                  animationDelay: `${lineDelay}s`,
                }}
              />

              {/* Bolder Black Amount Badge centered on line */}
              <foreignObject
                x={midX - 32}
                y={midY - 14}
                width="64"
                height="28"
                style={{ overflow: 'visible' }}
              >
                <div
                  style={{
                    backgroundColor: '#000000',
                    color: '#FFFFFF',
                    borderRadius: '14px',
                    padding: '3px 8px',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    fontFamily: "'Space Grotesk', sans-serif",
                    textAlign: 'center',
                    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.25)',
                    whiteSpace: 'nowrap',
                    opacity: 0,
                    animation: `nexusPillFade 0.4s ease forwards`,
                    animationDelay: `${pillDelay}s`,
                  }}
                >
                  {edge.amount}
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>

      {/* Larger Pure Black Nodes centered 100% precisely on (x%, y%) */}
      {activeTopo.nodes.map((node, nodeIdx) => {
        const isVictim = node.type === 'victim';
        const isCashout = node.type === 'cashout';
        const isMerchant = node.type === 'merchant';

        // Node 0 pops up at 0.1s, subsequent nodes pop up as incoming line completes
        const nodeDelay = nodeIdx === 0 ? 0.1 : (nodeIdx - 1) * 2.05 + 1.95;

        const labelText = isVictim ? 'Victim' : isCashout ? 'Cashout' : isMerchant ? 'Merchant' : 'Mule';

        return (
          <div
            key={node.id}
            style={{
              position: 'absolute',
              left: `${node.x}%`,
              top: `${node.y}%`,
              width: 0,
              height: 0,
              zIndex: 10,
            }}
          >
            {/* Pure Black Node Circle centered 100% at (x%, y%) */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: isVictim || isCashout ? '64px' : '56px',
                height: isVictim || isCashout ? '64px' : '56px',
                borderRadius: '50%',
                backgroundColor: 'transparent',
                color: '#000000ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 22px rgba(0, 0, 0, 0.4)',
                border: 'none',
                opacity: 0,
                animation: `nexusNodePop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`,
                animationDelay: `${nodeDelay}s`,
              }}
            >
              {isVictim ? (
                <User size={30} />
              ) : isCashout ? (
                <Landmark size={30} />
              ) : isMerchant ? (
                <Store size={26} />
              ) : (
                <Building2 size={26} />
              )}
            </div>

            {/* Bolder Text Label Positioned Absolutely Below Circle (Never Offsets Circle Center) */}
            <div
              style={{
                position: 'absolute',
                top: isVictim || isCashout ? '38px' : '34px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '13px',
                fontWeight: 800,
                color: '#000000',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
                textShadow: '0 1px 4px rgba(255, 255, 255, 0.95)',
                opacity: 0,
                animation: `nexusNodePop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`,
                animationDelay: `${nodeDelay}s`,
              }}
            >
              {labelText}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LiveGraphShowcase;

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Core, ElementDefinition } from 'cytoscape';
import type { GraphNode, GraphEdge } from '../../types/syndicate';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Layers, Network } from 'lucide-react';

interface SyndicateGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  rootCaseId?: string | null;
  selectedNodeId: string | null;
  onSelectNode: (node: GraphNode | null) => void;
  onSelectEdge: (edge: GraphEdge | null) => void;
  depth: number;
  onDepthChange: (depth: number) => void;
  isLoading: boolean;
}

export const SyndicateGraph: React.FC<SyndicateGraphProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onSelectEdge,
  depth,
  onDepthChange,
  isLoading,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [layoutMode, setLayoutMode] = useState<'cose' | 'concentric'>('cose');

  // Zoom / Pan actions
  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit(undefined, 30);
  const handleReset = () => {
    cyRef.current?.reset();
    cyRef.current?.fit(undefined, 30);
  };

  // Node Color & Shape resolver
  const getNodeColor = useCallback((n: GraphNode) => {
    if (n.node_type === 'complaint') {
      return n.is_root ? '#2563EB' : '#0284C7';
    }
    // Entity types
    const etype = (n.entity_type || '').toLowerCase();
    if (etype.includes('bank') || etype.includes('account')) return '#059669'; // Emerald
    if (etype.includes('device') || etype.includes('imei')) return '#7C3AED'; // Violet
    if (etype.includes('phone') || etype.includes('sim')) return '#D97706'; // Amber
    if (etype.includes('ip') || etype.includes('subnet')) return '#0D9488'; // Teal
    return '#64748B'; // Slate
  }, []);

  const getNodeShape = useCallback((n: GraphNode) => {
    if (n.node_type === 'complaint') {
      return 'round-rectangle';
    }
    const etype = (n.entity_type || '').toLowerCase();
    if (etype.includes('bank') || etype.includes('account')) return 'ellipse';
    if (etype.includes('device')) return 'round-hexagon';
    if (etype.includes('phone')) return 'round-tag';
    return 'diamond';
  }, []);

  // Initialize and update Cytoscape
  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container || isLoading) return;

    (async () => {
      try {
        const cytoscape = (await import('cytoscape')).default;
        if (cancelled) return;

        const elements: ElementDefinition[] = [
          ...nodes.map((n) => ({
            data: {
              id: n.key,
              label: n.label || (n.node_type === 'complaint' ? `Case ${n.id.slice(0, 8)}` : 'Entity'),
              nodeType: n.node_type,
              color: getNodeColor(n),
              shape: getNodeShape(n),
              isRoot: n.is_root ? 1 : 0,
              rawNode: n,
            },
          })),
          ...edges.map((e, idx) => ({
            data: {
              id: `edge_${idx}_${e.source}_${e.target}`,
              source: e.source,
              target: e.target,
              label: e.edge_type === 'SHARED_INFRASTRUCTURE' ? 'Shared Infra' : 'Observed',
              edgeType: e.edge_type,
              color: e.edge_type === 'SHARED_INFRASTRUCTURE' ? '#059669' : '#94A3B8',
              style: e.edge_type === 'SHARED_INFRASTRUCTURE' ? 'solid' : 'dashed',
              width: e.edge_type === 'SHARED_INFRASTRUCTURE' ? 2.5 : 1.5,
              rawEdge: e,
            },
          })),
        ];

        cyRef.current?.destroy();
        const cy = cytoscape({
          container,
          elements,
          minZoom: 0.2,
          maxZoom: 3.0,
          wheelSensitivity: 0.25,
          style: [
            {
              selector: 'node',
              style: {
                'background-color': 'data(color)',
                label: 'data(label)',
                'font-size': '11px',
                'font-weight': 700,
                'text-valign': 'bottom',
                'text-margin-y': 6,
                color: '#0F172A',
                shape: 'data(shape)' as any,
                width: 38,
                height: 38,
                'border-width': 2,
                'border-color': '#FFFFFF',
              },
            },
            {
              selector: 'node[isRoot = 1]',
              style: {
                width: 52,
                height: 52,
                'font-size': '13px',
                'border-width': 4,
                'border-color': '#93C5FD',
                'background-color': '#1D4ED8',
              },
            },
            {
              selector: 'node:selected',
              style: {
                'border-width': 4,
                'border-color': '#F59E0B',
              },
            },
            {
              selector: 'edge',
              style: {
                width: 'data(width)',
                'line-color': 'data(color)',
                'line-style': 'data(style)' as any,
                'curve-style': 'bezier',
                label: 'data(label)',
                'font-size': '9px',
                'font-weight': 600,
                color: '#64748B',
                'text-background-color': '#FFFFFF',
                'text-background-opacity': 0.85,
                'text-background-padding': '2px',
                'text-rotation': 'autorotate',
                'target-arrow-shape': 'triangle',
                'target-arrow-color': 'data(color)',
                'arrow-scale': 0.8,
              },
            },
          ],
          layout: {
            name: layoutMode,
            animate: false,
            padding: 40,
            ...(layoutMode === 'cose'
              ? {
                  nodeRepulsion: () => 6000,
                  idealEdgeLength: () => 120,
                  edgeElasticity: () => 100,
                }
              : {}),
          },
        });

        // Click on node
        cy.on('tap', 'node', (evt) => {
          const raw = evt.target.data('rawNode');
          onSelectNode(raw || null);
          onSelectEdge(null);
        });

        // Click on edge
        cy.on('tap', 'edge', (evt) => {
          const raw = evt.target.data('rawEdge');
          onSelectEdge(raw || null);
          onSelectNode(null);
        });

        // Click on background
        cy.on('tap', (evt) => {
          if (evt.target === cy) {
            onSelectNode(null);
            onSelectEdge(null);
          }
        });

        cyRef.current = cy;
      } catch (err) {
        console.error('[NEXUS SYNDICATE GRAPH] Cytoscape load failed:', err);
      }
    })();

    return () => {
      cancelled = true;
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [nodes, edges, isLoading, layoutMode, getNodeColor, getNodeShape, onSelectNode, onSelectEdge]);

  useEffect(() => {
    if (!cyRef.current) return;
    if (selectedNodeId) {
      cyRef.current.nodes().unselect();
      cyRef.current.$id(selectedNodeId).select();
    } else {
      cyRef.current.nodes().unselect();
    }
  }, [selectedNodeId]);

  return (
    <div
      style={{
        position: 'relative',
        height: '520px',
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {/* Top Floating Controls Bar */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        {/* Left: Depth Expansion Switcher */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FFFFFF',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid #CBD5E1',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          }}
        >
          <button
            onClick={() => onDepthChange(1)}
            style={{
              padding: '6px 12px',
              borderRadius: '7px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: depth === 1 ? '#0F172A' : 'transparent',
              color: depth === 1 ? '#FFFFFF' : '#64748B',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Depth 1: Directly connected cases & shared infrastructure"
          >
            Depth 1 (Direct)
          </button>
          <button
            onClick={() => onDepthChange(2)}
            style={{
              padding: '6px 12px',
              borderRadius: '7px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: depth === 2 ? '#0F172A' : 'transparent',
              color: depth === 2 ? '#FFFFFF' : '#64748B',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Depth 2: Extended 2-hop cross-case infrastructure network"
          >
            Depth 2 (Extended)
          </button>
        </div>

        {/* Right: Zoom / Fit & Layout Controls */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FFFFFF',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid #CBD5E1',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          }}
        >
          <button
            onClick={() => setLayoutMode(layoutMode === 'cose' ? 'concentric' : 'cose')}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#F1F5F9',
              color: '#334155',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Switch between Force-Directed and Concentric layouts"
          >
            {layoutMode === 'cose' ? 'Force' : 'Concentric'}
          </button>

          <button
            onClick={handleZoomIn}
            style={{
              padding: '6px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#334155',
              cursor: 'pointer',
            }}
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={handleZoomOut}
            style={{
              padding: '6px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#334155',
              cursor: 'pointer',
            }}
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={handleFit}
            style={{
              padding: '6px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#334155',
              cursor: 'pointer',
            }}
            title="Fit to Screen"
          >
            <Maximize2 size={16} />
          </button>
          <button
            onClick={handleReset}
            style={{
              padding: '6px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#334155',
              cursor: 'pointer',
            }}
            title="Reset View"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Graph Visual Canvas */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          opacity: isLoading ? 0.3 : 1,
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255,255,255,0.7)',
            zIndex: 5,
          }}
        >
          <div className="animate-spin" style={{ color: '#2563EB' }}>
            <Network size={28} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
            Expanding cross-case topology (Depth {depth})...
          </span>
        </div>
      )}

      {/* Empty Graph Overlay */}
      {!isLoading && nodes.length === 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <Layers size={36} style={{ color: '#CBD5E1' }} />
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
            Select a Potential Network to View Cross-Case Topology
          </div>
          <p style={{ fontSize: '12px', color: '#64748B', maxWidth: '340px' }}>
            Select a network cluster card on the left or enter a case identifier to visualize how complaints connect through shared banking, phone, or device infrastructure.
          </p>
        </div>
      )}

      {/* Bottom Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
          padding: '6px 12px',
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(4px)',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          fontSize: '11px',
          color: '#475569',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          zIndex: 10,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#1D4ED8' }} />
          Root Case
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#0284C7' }} />
          Connected Case
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#059669' }} />
          Bank Account
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#7C3AED' }} />
          Device
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#D97706' }} />
          Phone
        </span>
      </div>
    </div>
  );
};

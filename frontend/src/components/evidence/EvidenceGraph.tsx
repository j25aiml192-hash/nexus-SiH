import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Core, ElementDefinition } from 'cytoscape';
import type { EvidenceNode, EvidenceEdge } from '../../types/evidence';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Layers, Network } from 'lucide-react';

interface EvidenceGraphProps {
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (node: EvidenceNode | null) => void;
  onSelectEdge: (edge: EvidenceEdge | null) => void;
  depth: number;
  onDepthChange: (depth: number) => void;
  isLoading: boolean;
  selectedSemanticLevel: string;
  selectedEntityType: string;
}

export const EvidenceGraph: React.FC<EvidenceGraphProps> = ({
  nodes,
  edges,
  selectedNodeId: _selectedNodeId,
  selectedEdgeId: _selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  depth,
  onDepthChange,
  isLoading,
  selectedSemanticLevel,
  selectedEntityType,
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
  const getNodeColor = useCallback((n: EvidenceNode) => {
    if (n.is_root_case || n.entity_type === 'complaint') {
      return n.is_root_case ? '#1E40AF' : '#2563EB'; // Royal Blue
    }
    const etype = (n.entity_type || '').toLowerCase();
    if (etype.includes('bank') || etype.includes('account')) return '#059669'; // Emerald
    if (etype.includes('device') || etype.includes('imei')) return '#7C3AED'; // Violet
    if (etype.includes('phone') || etype.includes('sim')) return '#D97706'; // Amber
    if (etype.includes('ip') || etype.includes('subnet')) return '#0D9488'; // Teal
    return '#64748B'; // Slate
  }, []);

  const getNodeShape = useCallback((n: EvidenceNode) => {
    if (n.is_root_case || n.entity_type === 'complaint') {
      return 'round-rectangle';
    }
    const etype = (n.entity_type || '').toLowerCase();
    if (etype.includes('bank') || etype.includes('account')) return 'ellipse';
    if (etype.includes('device')) return 'round-hexagon';
    if (etype.includes('phone')) return 'round-tag';
    if (etype.includes('ip')) return 'diamond';
    return 'round-rectangle';
  }, []);

  // Edge styling based on Semantic Level
  const getEdgeStyle = useCallback((e: EvidenceEdge) => {
    switch (e.semantic_level) {
      case 'DIRECT_OBSERVED':
        return { color: '#059669', style: 'solid', width: 2.5, opacity: 1.0 };
      case 'DERIVED':
        return { color: '#4F46E5', style: 'solid', width: 2.0, opacity: 0.9 };
      case 'INFERRED':
        return { color: '#D97706', style: 'dashed', width: 1.8, opacity: 0.85 };
      case 'MODEL_SIGNAL':
        return { color: '#9333EA', style: 'dotted', width: 1.8, opacity: 0.85 };
      default:
        return { color: '#94A3B8', style: 'solid', width: 1.5, opacity: 0.7 };
    }
  }, []);

  // Filtered nodes and edges based on active filters
  const filteredNodes = nodes.filter((n) => {
    if (selectedEntityType !== 'ALL' && n.entity_type !== selectedEntityType && !n.is_root_case) {
      return false;
    }
    return true;
  });

  const nodeKeySet = new Set(filteredNodes.map((n) => n.key));

  const filteredEdges = edges.filter((e) => {
    if (selectedSemanticLevel !== 'ALL' && e.semantic_level !== selectedSemanticLevel) {
      return false;
    }
    return nodeKeySet.has(e.source) && nodeKeySet.has(e.target);
  });

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
          ...filteredNodes.map((n) => ({
            data: {
              id: n.key,
              label: n.label || (n.node_type === 'complaint' ? `Case ${n.id.slice(0, 8)}` : 'Entity'),
              nodeType: n.entity_type,
              color: getNodeColor(n),
              shape: getNodeShape(n),
              isRoot: n.is_root_case ? 1 : 0,
              rawNode: n,
            },
          })),
          ...filteredEdges.map((e, idx) => {
            const st = getEdgeStyle(e);
            return {
              data: {
                id: `edge_${idx}_${e.source}_${e.target}`,
                source: e.source,
                target: e.target,
                label: e.relation_type.replace(/_/g, ' '),
                semanticLevel: e.semantic_level,
                color: st.color,
                style: st.style,
                width: st.width,
                opacity: st.opacity,
                rawEdge: e,
              },
            };
          }),
        ];

        // Destroy previous instance
        if (cyRef.current) {
          cyRef.current.destroy();
          cyRef.current = null;
        }

        const cy = cytoscape({
          container,
          elements,
          style: [
            {
              selector: 'node',
              style: {
                label: 'data(label)',
                'background-color': 'data(color)',
                shape: 'data(shape)' as any,
                color: '#0F172A',
                'font-size': '11px',
                'font-weight': 600,
                'font-family': 'Inter, system-ui, -apple-system, sans-serif',
                'text-valign': 'bottom',
                'text-margin-y': 6,
                width: 38,
                height: 38,
                'border-width': 2,
                'border-color': '#FFFFFF',
                'transition-property': 'background-color, border-color, width, height',
                'transition-duration': 0.2,
              },
            },
            {
              selector: 'node[isRoot = 1]',
              style: {
                width: 48,
                height: 48,
                'border-width': 3,
                'border-color': '#93C5FD',
                'font-weight': 800,
                'font-size': '12px',
              },
            },
            {
              selector: 'edge',
              style: {
                width: 'data(width)',
                'line-color': 'data(color)',
                'line-style': 'data(style)' as any,
                'line-opacity': 'data(opacity)' as any,
                'curve-style': 'bezier',
                'target-arrow-shape': 'triangle',
                'target-arrow-color': 'data(color)',
                'arrow-scale': 0.8,
                label: 'data(label)',
                'font-size': '9px',
                'font-weight': 600,
                color: '#64748B',
                'text-rotation': 'autorotate',
                'text-margin-y': -8,
                'text-background-opacity': 0.85,
                'text-background-color': '#FFFFFF',
                'text-background-padding': '2px',
                'text-background-shape': 'roundrectangle' as any,
              },
            },
            {
              selector: 'node:selected',
              style: {
                'border-width': 3,
                'border-color': '#2563EB',
                'underlay-color': '#93C5FD',
                'underlay-padding': 4,
                'underlay-opacity': 0.5,
              },
            },
            {
              selector: 'edge:selected',
              style: {
                width: 4,
                'line-color': '#2563EB',
                'target-arrow-color': '#2563EB',
                color: '#2563EB',
                'font-weight': 700,
              },
            },
          ],
          layout:
            layoutMode === 'cose'
              ? {
                  name: 'cose',
                  animate: false,
                  nodeRepulsion: () => 450000,
                  idealEdgeLength: () => 110,
                  gravity: 0.25,
                  padding: 40,
                }
              : {
                  name: 'concentric',
                  animate: false,
                  concentric: (node: any) => (node.data('isRoot') ? 2 : 1),
                  levelWidth: () => 1,
                  padding: 40,
                },
          userZoomingEnabled: true,
          userPanningEnabled: true,
          boxSelectionEnabled: false,
        });

        // Event Listeners
        cy.on('tap', 'node', (evt) => {
          const raw = evt.target.data('rawNode');
          onSelectNode(raw || null);
          onSelectEdge(null);
        });

        cy.on('tap', 'edge', (evt) => {
          const raw = evt.target.data('rawEdge');
          onSelectEdge(raw || null);
          onSelectNode(null);
        });

        cy.on('tap', (evt) => {
          if (evt.target === cy) {
            onSelectNode(null);
            onSelectEdge(null);
          }
        });

        cyRef.current = cy;
      } catch (err) {
        console.error('[NEXUS EVIDENCE GRAPH] Cytoscape load error:', err);
      }
    })();

    return () => {
      cancelled = true;
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [filteredNodes, filteredEdges, layoutMode, getNodeColor, getNodeShape, getEdgeStyle, isLoading, onSelectNode, onSelectEdge]);

  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        height: '560px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Floating Toolbar */}
      <div
        style={{
          position: 'absolute',
          top: '14px',
          left: '14px',
          right: '14px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}
      >
        {/* Semantic Level Legend Bar */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '6px 12px',
            backgroundColor: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(6px)',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '3px', backgroundColor: '#059669', borderRadius: '2px' }} />
            <span style={{ color: '#059669' }}>Direct Observed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '3px', backgroundColor: '#4F46E5', borderRadius: '2px' }} />
            <span style={{ color: '#4F46E5' }}>Derived</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '2px', borderTop: '2px dashed #D97706' }} />
            <span style={{ color: '#D97706' }}>Inferred</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '2px', borderTop: '2px dotted #9333EA' }} />
            <span style={{ color: '#9333EA' }}>Model Signal</span>
          </div>
        </div>

        {/* Graph Expansion Controls & Layout Mode */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(6px)',
            padding: '4px 6px',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
          }}
        >
          {/* Depth 1 vs Depth 2 Control */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#F1F5F9',
              borderRadius: '6px',
              padding: '2px',
            }}
          >
            <button
              onClick={() => onDepthChange(1)}
              style={{
                padding: '4px 8px',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: 700,
                border: 'none',
                backgroundColor: depth === 1 ? '#FFFFFF' : 'transparent',
                color: depth === 1 ? '#2563EB' : '#64748B',
                boxShadow: depth === 1 ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
              }}
              title="Depth 1: Direct case-linked evidence"
            >
              Depth 1
            </button>
            <button
              onClick={() => onDepthChange(2)}
              style={{
                padding: '4px 8px',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: 700,
                border: 'none',
                backgroundColor: depth === 2 ? '#FFFFFF' : 'transparent',
                color: depth === 2 ? '#2563EB' : '#64748B',
                boxShadow: depth === 2 ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
              }}
              title="Depth 2: Expands one additional evidence hop"
            >
              Depth 2
            </button>
          </div>

          {/* Layout mode switcher */}
          <button
            onClick={() => setLayoutMode(layoutMode === 'cose' ? 'concentric' : 'cose')}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              cursor: 'pointer',
            }}
            title="Switch graph layout algorithm"
          >
            {layoutMode === 'cose' ? 'Force Layout' : 'Concentric'}
          </button>
        </div>
      </div>

      {/* Bottom Floating Navigation Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: '14px',
          right: '14px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          backgroundColor: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(6px)',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
        }}
      >
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
          title="Fit View"
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

      {/* Visual Canvas Container */}
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
            Tracing Truth Graph evidence (Depth {depth})...
          </span>
        </div>
      )}

      {/* Empty State Overlay */}
      {!isLoading && filteredNodes.length === 0 && (
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
            No Evidence Records to Display
          </div>
          <p style={{ fontSize: '12px', color: '#64748B', maxWidth: '340px' }}>
            Select an active case from the dropdown or search an identifier to visualize its concrete Truth Graph evidence.
          </p>
        </div>
      )}
    </div>
  );
};

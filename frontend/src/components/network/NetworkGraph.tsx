import { useEffect, useRef, useState } from "react";
import type { Core, ElementDefinition } from "cytoscape";
import {
  formatCompactINR,
  formatEdgeTime,
  type NetworkEdge,
  type NetworkNode,
} from "../../lib/network-data";
import { entityShape, riskColor, token } from "./graph-theme";
import { Loader2, AlertTriangle, Network } from "lucide-react";

export interface GraphApi {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  reset: () => void;
}

interface Props {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showAmounts: boolean;
  showTimestamps: boolean;
  onApiReady?: (api: GraphApi) => void;
}

function edgeLabel(e: NetworkEdge, amounts: boolean, times: boolean) {
  const parts: string[] = [];
  if (e.relation === "binding") {
    if (amounts) parts.push("linked");
  } else if (amounts) parts.push(formatCompactINR(e.amount));
  if (times) parts.push(formatEdgeTime(e.timestamp));
  return parts.join("  ·  ");
}

export function NetworkGraph({
  nodes,
  edges,
  selectedId,
  onSelect,
  showAmounts,
  showTimestamps,
  onApiReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Build / rebuild the graph when the visible element set changes.
  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    (async () => {
      try {
        const cytoscape = (await import("cytoscape")).default;
        if (cancelled) return;

        const elements: ElementDefinition[] = [
          ...nodes.map((n) => ({
            data: {
              id: n.id,
              label: n.label,
              sub: n.institution ?? "",
              risk: n.riskLevel,
              color: riskColor(n.riskLevel),
              shape: entityShape[n.type],
              size: n.isSource ? 74 : 34 + Math.round(n.riskScore / 3),
              source_node: n.isSource ? 1 : 0,
            },
          })),
          ...edges.map((e) => ({
            data: {
              id: e.id,
              source: e.source,
              target: e.target,
              label: edgeLabel(e, showAmounts, showTimestamps),
              width: e.relation === "binding" ? 1.4 : 1.4 + Math.min(4, e.amount / 45000),
              style: e.relation === "binding" ? "dashed" : "solid",
              color: e.suspicious ? riskColor("critical") : token("--border"),
              arrow: e.relation === "binding" ? "none" : "triangle",
            },
          })),
        ];

        cyRef.current?.destroy();
        const cy = cytoscape({
          container,
          elements,
          minZoom: 0.25,
          maxZoom: 2.5,
          wheelSensitivity: 0.25,
          style: [
            {
              selector: "node",
              style: {
                "background-color": "data(color)",
                "background-opacity": 0.14,
                "border-width": 2,
                "border-color": "data(color)",
                shape: "data(shape)" as never,
                width: "data(size)",
                height: "data(size)",
                label: "data(label)",
                "font-family": "Google Sans Flex, sans-serif",
                "font-size": 11,
                "font-weight": 500,
                color: token("--foreground"),
                "text-valign": "bottom",
                "text-margin-y": 6,
                "text-wrap": "wrap",
                "text-max-width": "110px",
                "transition-property": "border-width, background-opacity, opacity",
                "transition-duration": 150,
              },
            },
            {
              selector: "node[source_node = 1]",
              style: { "border-width": 4, "background-opacity": 0.24, "font-weight": 700 },
            },
            {
              selector: "edge",
              style: {
                width: "data(width)",
                "line-color": "data(color)",
                "line-style": "data(style)" as never,
                "target-arrow-color": "data(color)",
                "target-arrow-shape": "data(arrow)" as never,
                "arrow-scale": 0.9,
                "curve-style": "bezier",
                label: "data(label)",
                "font-family": "Google Sans Flex, monospace",
                "font-size": 9,
                color: token("--muted-foreground"),
                "text-background-color": token("--surface"),
                "text-background-opacity": 0.9,
                "text-background-padding": "2px",
                "text-rotation": "autorotate",
                "transition-property": "opacity, width",
                "transition-duration": 150,
              },
            },
            { selector: ".dimmed", style: { opacity: 0.12 } },
            { selector: "node.highlighted", style: { "border-width": 5 } },
            { selector: "edge.highlighted", style: { opacity: 1, width: 3.2 } },
          ],
          layout: {
            name: "cose",
            animate: false,
            padding: 60,
            nodeRepulsion: () => 12000,
            idealEdgeLength: () => 150,
            nodeDimensionsIncludeLabels: true,
          } as never,
        });

        cy.on("tap", "node", (evt) => onSelect(evt.target.id() as string));
        cy.on("tap", (evt) => {
          if (evt.target === cy) onSelect(null);
        });

        cyRef.current = cy;
        setStatus("ready");
        onApiReady?.({
          zoomIn: () => cy.zoom({ level: cy.zoom() * 1.25, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }),
          zoomOut: () => cy.zoom({ level: cy.zoom() / 1.25, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }),
          fit: () => cy.fit(undefined, 60),
          reset: () => {
            cy.elements().removeClass("dimmed highlighted");
            cy.layout({ name: "cose", animate: false, padding: 60 } as never).run();
            cy.fit(undefined, 60);
          },
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nodes, edges, showAmounts, showTimestamps, onSelect, onApiReady]);

  useEffect(() => () => cyRef.current?.destroy(), []);

  // Highlight the selected node's immediate neighbourhood.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().removeClass("dimmed highlighted");
    if (!selectedId) return;
    const node = cy.getElementById(selectedId);
    if (node.empty()) return;
    const hood = node.closedNeighborhood();
    cy.elements().difference(hood).addClass("dimmed");
    hood.addClass("highlighted");
  }, [selectedId, nodes, edges]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "520px" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {status !== "ready" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            backgroundColor: "#FFFFFF",
            fontSize: "13px",
            color: "#64748B",
          }}
        >
          {status === "loading" ? (
            <>
              <Loader2 size={20} className="nexus-spin" />
              <span>Building network graph…</span>
            </>
          ) : (
            <>
              <AlertTriangle size={20} color="#DC2626" />
              <span>Graph could not be rendered.</span>
            </>
          )}
        </div>
      )}
      {status === "ready" && nodes.length === 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            backgroundColor: "#FFFFFF",
            fontSize: "13px",
            color: "#64748B",
          }}
        >
          <Network size={22} />
          <span>No entities match the current filters.</span>
        </div>
      )}
    </div>
  );
}

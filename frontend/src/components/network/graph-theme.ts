import type { RiskLevel, EntityType } from "../../lib/network-data";

/**
 * Cytoscape needs concrete color strings, so design tokens are read from
 * CSS custom properties at runtime with static fallbacks matching the NEXUS theme.
 */
const FALLBACK: Record<string, string> = {
  "--risk-critical": "#DC2626",
  "--risk-high": "#EA580C",
  "--risk-medium": "#D97706",
  "--risk-low": "#087F5B",
  "--foreground": "#102A2A",
  "--muted-foreground": "#64748B",
  "--border": "#E2E8E6",
  "--surface": "#FFFFFF",
  "--primary": "#087F5B",
};

export function token(name: string): string {
  if (typeof window === "undefined") return FALLBACK[name] ?? "#000";
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || FALLBACK[name] || "#000";
}

export const riskColor = (risk: RiskLevel) => {
  switch (risk) {
    case "critical":
      return token("--risk-critical");
    case "high":
      return token("--risk-high");
    case "medium":
      return token("--risk-medium");
    case "low":
      return token("--risk-low");
    default:
      return token("--muted-foreground");
  }
};

export const entityShape: Record<EntityType, string> = {
  account: "ellipse",
  upi: "round-diamond",
  phone: "round-rectangle",
  device: "round-hexagon",
  merchant: "round-tag",
};

export const entityLabel: Record<EntityType, string> = {
  account: "Bank account",
  upi: "UPI handle",
  phone: "Phone number",
  device: "Device",
  merchant: "Merchant",
};

export const riskLabel: Record<RiskLevel, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

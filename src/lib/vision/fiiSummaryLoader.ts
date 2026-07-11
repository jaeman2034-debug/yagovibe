/**
 * RC4-3 M3 — Load pilot / bound fii_summary.json for Coach UI
 */

import {
  FII_SUMMARY_SCHEMA,
  type FiiSummaryDocument,
} from "@/lib/vision/fiiSummaryTypes";

export const VISION_PILOT_MATCH_ID = "vision-pilot-pass01-clip-002" as const;

export const FII_SUMMARY_PILOT_FIXTURE =
  "/fixtures/vision/rc4_m2_fii_summary_clip_002.json" as const;

export function shouldUseFiiSummaryPilot(matchId?: string): boolean {
  if (import.meta.env.VITE_VISION_FII_PILOT === "1") return true;
  return matchId?.trim() === VISION_PILOT_MATCH_ID;
}

export function isFiiSummaryDocument(raw: unknown): raw is FiiSummaryDocument {
  if (!raw || typeof raw !== "object") return false;
  const doc = raw as FiiSummaryDocument;
  return (
    doc.schemaVersion === FII_SUMMARY_SCHEMA &&
    Array.isArray(doc.playerFii) &&
    doc.teamFii != null &&
    doc.matchSummary != null &&
    doc.coachInsights != null
  );
}

export async function loadFiiSummaryFromUrl(url: string): Promise<FiiSummaryDocument> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`fii_summary fetch failed: ${res.status}`);
  }
  const data: unknown = await res.json();
  if (!isFiiSummaryDocument(data)) {
    throw new Error("invalid fii_summary schema");
  }
  return data;
}

export async function loadFiiSummaryPilotFixture(): Promise<FiiSummaryDocument> {
  return loadFiiSummaryFromUrl(FII_SUMMARY_PILOT_FIXTURE);
}

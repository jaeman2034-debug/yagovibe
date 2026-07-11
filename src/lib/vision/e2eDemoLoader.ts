/**
 * RC4-6 M6 — Load E2E demo summary fixture
 */

import {
  E2E_DEMO_SCHEMA,
  type E2EDemoSummary,
} from "@/lib/vision/e2eDemoTypes";

export const E2E_DEMO_FIXTURE = "/fixtures/vision/rc4_6_e2e_demo_summary.json" as const;

export function isE2EDemoSummary(raw: unknown): raw is E2EDemoSummary {
  if (!raw || typeof raw !== "object") return false;
  const doc = raw as E2EDemoSummary;
  return (
    doc.schemaVersion === E2E_DEMO_SCHEMA &&
    Array.isArray(doc.steps) &&
    doc.gates != null &&
    typeof doc.pilotMatchId === "string"
  );
}

export async function loadE2EDemoSummary(): Promise<E2EDemoSummary> {
  const res = await fetch(E2E_DEMO_FIXTURE, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`e2e demo summary fetch failed: ${res.status}`);
  }
  const data: unknown = await res.json();
  if (!isE2EDemoSummary(data)) {
    throw new Error("invalid e2e demo summary schema");
  }
  return data;
}

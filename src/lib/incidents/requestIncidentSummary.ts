/**
 * ✅ COMMIT 14: Incident Summary 요청
 */

const functionsOrigin =
  import.meta.env.VITE_FUNCTIONS_ORIGIN ||
  "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

export async function requestIncidentSummary(input: {
  tenantId: string;
  from: string;
  to: string;
}) {
  const response = await fetch(`${functionsOrigin}/incidentSummary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}


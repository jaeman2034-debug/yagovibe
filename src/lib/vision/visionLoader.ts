/**
 * Vision v6-3 — load & normalize vision_result.json
 */

import type { VisionResult, VisionResultJson } from "@/lib/vision/visionTypes";
import { VISION_RESULT_SCHEMA_VERSION } from "@/lib/vision/visionTypes";

function pick<T>(snake: T | undefined, camel: T | undefined): T | undefined {
  return camel ?? snake;
}

function sortPlayerFii(entries: VisionResult["playerFii"]): VisionResult["playerFii"] {
  return [...entries].sort((a, b) => {
    const ra = a.rank ?? Number.POSITIVE_INFINITY;
    const rb = b.rank ?? Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra - rb;
    return b.fii - a.fii;
  });
}

/** Colab snake_case / camelCase → normalized VisionResult */
export function normalizeVisionResult(
  raw: VisionResultJson,
  sourcePath?: string
): VisionResult {
  const playerFii = pick(raw.player_fii, raw.playerFii) ?? [];
  const ballProgression = pick(raw.ball_progression, raw.ballProgression) ?? null;
  const pressureZone = pick(raw.pressure_zone, raw.pressureZone) ?? null;
  const teamCompactness = pick(raw.team_compactness, raw.teamCompactness) ?? null;
  const tacticalReport = pick(raw.tactical_report, raw.tacticalReport) ?? null;

  return {
    schemaVersion:
      raw.schemaVersion ??
      raw.schema_version ??
      VISION_RESULT_SCHEMA_VERSION,
    playerFii: sortPlayerFii(playerFii),
    playmaker: raw.playmaker ?? null,
    ballProgression,
    pressureZone,
    teamCompactness,
    tacticalReport,
    meta: {
      matchId: pick(raw.match_id, raw.matchId),
      teamId: pick(raw.team_id, raw.teamId),
      generatedAt: pick(raw.generated_at, raw.generatedAt),
      sourcePath,
    },
  };
}

/**
 * Fetch vision_result.json from URL or public path.
 * @param path — absolute URL or site-relative path (e.g. `/fixtures/vision_result.json`)
 */
export async function loadVisionResult(path: string): Promise<VisionResult> {
  const trimmed = path.trim();
  if (!trimmed) {
    throw new Error("vision_result path is required");
  }

  const url =
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
      ? trimmed
      : `/${trimmed.replace(/^\.?\//, "")}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load vision_result.json (${res.status}): ${url}`);
  }

  const raw = (await res.json()) as VisionResultJson;
  return normalizeVisionResult(raw, url);
}

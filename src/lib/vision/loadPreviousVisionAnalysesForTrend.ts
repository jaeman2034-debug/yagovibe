/**
 * VOC-012 — load previous visionAnalysis docs via visionMatchIndex (no new index/CF)
 */

import { collection, getDocs, type Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  getLatestVisionAnalysis,
  type VisionAnalysisRecord,
} from "@/lib/vision/visionFirestore";
import {
  MATCH_FLOW_TREND_MAX_K,
  type PreviousMatchPlayerFii,
} from "@/lib/vision/matchFlowTrendFromPlayerFii";

function timestampToMs(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    return (value as Timestamp).toMillis();
  }
  return null;
}

type IndexRow = {
  matchId: string;
  completedAtMs: number;
  analysisId: string | null;
};

function isCompletedIndex(data: Record<string, unknown>): boolean {
  const status = typeof data.status === "string" ? data.status : "";
  if (status !== "completed") return false;
  const analysisId =
    (typeof data.analysisId === "string" && data.analysisId.trim()) ||
    (typeof data.latestAnalysisId === "string" && data.latestAnalysisId.trim()) ||
    "";
  return Boolean(analysisId) || data.hasVision === true;
}

/**
 * List completed visionMatchIndex rows for team, exclude current, sort desc, take maxK.
 * Client-side sort — no composite Firestore index.
 */
export async function listPreviousMatchIdsForTrend(input: {
  teamId: string;
  currentMatchId: string;
  maxK?: number;
}): Promise<IndexRow[]> {
  const teamId = input.teamId.trim();
  const currentMatchId = input.currentMatchId.trim();
  const maxK = input.maxK ?? MATCH_FLOW_TREND_MAX_K;
  if (!teamId || !currentMatchId) return [];

  const col = collection(db, "teams", teamId, "visionMatchIndex");
  const snap = await getDocs(col);
  const rows: IndexRow[] = [];

  for (const docSnap of snap.docs) {
    const matchId = docSnap.id.trim();
    if (!matchId || matchId === currentMatchId) continue;
    const data = docSnap.data() as Record<string, unknown>;
    if (!isCompletedIndex(data)) continue;

    const analysisId =
      (typeof data.analysisId === "string" && data.analysisId.trim()) ||
      (typeof data.latestAnalysisId === "string" && data.latestAnalysisId.trim()) ||
      null;

    const completedAtMs =
      timestampToMs(data.analysisCompletedAt) ??
      timestampToMs(data.updatedAt) ??
      0;

    rows.push({ matchId, completedAtMs, analysisId });
  }

  rows.sort((a, b) => b.completedAtMs - a.completedAtMs);
  return rows.slice(0, maxK);
}

export async function loadPreviousVisionAnalysesForTrend(input: {
  teamId: string;
  currentMatchId: string;
  maxK?: number;
}): Promise<PreviousMatchPlayerFii[]> {
  const indexRows = await listPreviousMatchIdsForTrend(input);
  const out: PreviousMatchPlayerFii[] = [];

  for (const row of indexRows) {
    let record: VisionAnalysisRecord | null = null;
    try {
      record = await getLatestVisionAnalysis(input.teamId.trim(), row.matchId);
    } catch {
      record = null;
    }
    if (!record?.playerFii?.length) continue;
    out.push({
      matchId: row.matchId,
      playerFii: record.playerFii,
      completedAtMs: row.completedAtMs || record.createdAtMs || 0,
    });
  }

  return out;
}

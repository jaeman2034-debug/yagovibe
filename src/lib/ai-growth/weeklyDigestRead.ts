import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { WeeklyDigestDoc } from "@/lib/ai-growth/weeklyDigestTypes";

function mapDigestDoc(data: Record<string, unknown>): WeeklyDigestDoc | null {
  if (data.schemaVersion !== 1) return null;
  const summaryRaw = data.summary as Record<string, unknown> | undefined;
  if (!summaryRaw) return null;

  const growthRaw = summaryRaw.growth as Record<string, unknown> | undefined;
  const summary: WeeklyDigestDoc["summary"] = {
    scoreCurrent: summaryRaw.scoreCurrent != null ? Number(summaryRaw.scoreCurrent) : null,
    scorePrevious: summaryRaw.scorePrevious != null ? Number(summaryRaw.scorePrevious) : null,
    delta: summaryRaw.delta != null ? Number(summaryRaw.delta) : null,
    strengths: Array.isArray(summaryRaw.strengths) ? summaryRaw.strengths.map(String) : [],
    improvements: Array.isArray(summaryRaw.improvements) ? summaryRaw.improvements.map(String) : [],
    nextTraining: Array.isArray(summaryRaw.nextTraining) ? summaryRaw.nextTraining.map(String) : [],
    ...(growthRaw
      ? {
          growth: {
            ovrBefore: growthRaw.ovrBefore != null ? Number(growthRaw.ovrBefore) : null,
            ovrAfter: growthRaw.ovrAfter != null ? Number(growthRaw.ovrAfter) : null,
            ovrDelta: growthRaw.ovrDelta != null ? Number(growthRaw.ovrDelta) : null,
            newBadges: Array.isArray(growthRaw.newBadges) ? growthRaw.newBadges.map(String) : [],
            focusRecommendation:
              typeof growthRaw.focusRecommendation === "string"
                ? growthRaw.focusRecommendation
                : null,
            nextGoal: typeof growthRaw.nextGoal === "string" ? growthRaw.nextGoal : null,
            timelineDelta:
              growthRaw.timelineDelta != null ? Number(growthRaw.timelineDelta) : null,
          },
        }
      : {}),
  };

  return {
    schemaVersion: 1,
    playerId: String(data.playerId ?? ""),
    playerName: String(data.playerName ?? ""),
    weekKey: String(data.weekKey ?? ""),
    weekStartMs: Number(data.weekStartMs ?? 0),
    weekEndMs: Number(data.weekEndMs ?? 0),
    summary,
    latestSessionId: String(data.latestSessionId ?? ""),
    latestSharePath: typeof data.latestSharePath === "string" ? data.latestSharePath : null,
    sessionCount: Number(data.sessionCount ?? 0),
    createdAt: Number(data.createdAt ?? 0),
  };
}

function pickLatestDigest(docs: WeeklyDigestDoc[]): WeeklyDigestDoc | null {
  if (!docs.length) return null;
  return [...docs].sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0] ?? null;
}

/** 인덱스 없이 팀 digest 전체 스캔 (Pilot N≪ — index 빌드·쿼리 실패 fallback) */
async function loadLatestWeeklyDigestByClientScan(
  teamId: string,
  playerId?: string
): Promise<WeeklyDigestDoc | null> {
  const snap = await getDocs(collection(db, "teams", teamId, "weeklyDigests"));
  const mapped = snap.docs
    .map((doc) => mapDigestDoc(doc.data() as Record<string, unknown>))
    .filter((d): d is WeeklyDigestDoc => d !== null);
  const pool = playerId ? mapped.filter((d) => d.playerId === playerId) : mapped;
  return pickLatestDigest(pool);
}

export async function loadLatestWeeklyDigestForPlayer(
  teamId: string,
  playerId: string
): Promise<WeeklyDigestDoc | null> {
  try {
    const constraints: QueryConstraint[] = [
      where("playerId", "==", playerId),
      orderBy("weekKey", "desc"),
      limit(1),
    ];
    const snap = await getDocs(
      query(collection(db, "teams", teamId, "weeklyDigests"), ...constraints)
    );
    if (!snap.empty) {
      return mapDigestDoc(snap.docs[0]!.data() as Record<string, unknown>);
    }
  } catch (error) {
    console.warn("[weeklyDigestRead] indexed query failed, using client scan", error);
  }
  return loadLatestWeeklyDigestByClientScan(teamId, playerId);
}

/** playerId miss 시 roster 표시명으로 최신 digest 탐색 */
export async function loadLatestWeeklyDigestForChild(
  teamId: string,
  playerUid: string,
  rosterPlayerName?: string
): Promise<WeeklyDigestDoc | null> {
  const byPlayerId = await loadLatestWeeklyDigestForPlayer(teamId, playerUid);
  if (byPlayerId) return byPlayerId;

  const name = rosterPlayerName?.trim();
  if (!name) return null;

  try {
    const snap = await getDocs(
      query(
        collection(db, "teams", teamId, "weeklyDigests"),
        orderBy("weekKey", "desc"),
        limit(16)
      )
    );
    for (const doc of snap.docs) {
      const mapped = mapDigestDoc(doc.data() as Record<string, unknown>);
      if (mapped?.playerName.trim() === name) return mapped;
    }
  } catch (error) {
    console.warn("[weeklyDigestRead] name fallback query failed, using client scan", error);
  }

  const scanned = await loadLatestWeeklyDigestByClientScan(teamId);
  if (scanned?.playerName.trim() === name) return scanned;
  return null;
}

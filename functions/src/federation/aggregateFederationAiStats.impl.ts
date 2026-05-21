/**
 * aiGenerationLogs → 일별 집계 (federations/{slug}/aiStats/daily/{YYYY-MM-DD})
 */

import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { normalizePlacement } from "./aiPlacementNormalization";

type LogEvent = "generation_complete" | "content_applied" | "user_edit_saved";

type AiLogDoc = {
  event?: string;
  recommendedUse?: string;
  finalAppliedUse?: string;
  isUserEdited?: boolean;
  selectedTone?: string;
  selectedVariantIndex?: number;
  createdAt?: Timestamp;
};

function isFederationManagerDoc(doc: Record<string, unknown> | undefined, uid: string): boolean {
  if (!doc || !uid) return false;
  const ownerUid = String(doc.ownerUid || doc.ownerId || "");
  if (ownerUid && ownerUid === uid) return true;
  const adminIds = Array.isArray(doc.adminIds) ? doc.adminIds : [];
  const adminUids = Array.isArray(doc.adminUids) ? doc.adminUids : [];
  const roles = doc.roles as Record<string, unknown> | undefined;
  const roleAdmins = Array.isArray(roles?.admins) ? (roles.admins as unknown[]) : [];
  const roleEditors = Array.isArray(roles?.editors) ? (roles.editors as unknown[]) : [];
  return [...adminIds, ...adminUids, ...roleAdmins, ...roleEditors].includes(uid);
}

/** Asia/Seoul 달력일의 [start, end) (UTC 인스턴트) */
export function seoulDayBounds(dateStr: string): { start: Date; end: Date } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) throw new Error("invalid dateStr");
  const start = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function seoulYesterdayDateString(now = new Date()): string {
  const todayStr = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const [y, mo, d] = todayStr.split("-").map((x) => Number(x));
  const noon = new Date(
    `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00+09:00`
  );
  const yest = new Date(noon.getTime() - 86400000);
  return yest.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

function normalizeTone(t: unknown): "official" | "community" | "marketing" | "unknown" {
  const s = String(t || "").toLowerCase().trim();
  if (s === "official" || s === "community" || s === "marketing") return s;
  return "unknown";
}

export type NormalizedPlacementStatsWire = {
  recommendedCount: Record<string, number>;
  finalCount: Record<string, number>;
  matchedCount: Record<string, number>;
};

export type FederationAiDailyStatsWire = {
  ok: true;
  federationSlug: string;
  date: string;
  totalLogs: number;
  eventCounts: Record<LogEvent, number>;
  /** 양쪽 정규화 값이 모두 known일 때만 1건으로 카운트 */
  placementEvaluated: number;
  /** normalizePlacement(recommended) === normalizePlacement(final) */
  correctPlacement: number;
  /** 이벤트 전체 중 isUserEdited */
  editedCount: number;
  contentAppliedCount: number;
  /** content_applied 중 사용자 수정 적용 비율 계산용 */
  userEditedAmongApplied: number;
  toneCount: Record<"official" | "community" | "marketing" | "unknown", number>;
  variantIndexCount: Record<0 | 1 | 2, number>;
  normalizedPlacementStats: NormalizedPlacementStatsWire;
  aggregatedAt: string;
};

function bumpCount(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

export async function aggregateFederationAiStatsForDate(
  federationSlug: string,
  dateStr: string
): Promise<FederationAiDailyStatsWire> {
  const slug = String(federationSlug || "").trim();
  if (!slug) throw new Error("federationSlug required");

  const { start, end } = seoulDayBounds(dateStr);
  const db = getFirestore();
  const logsRef = db.collection(`federations/${slug}/aiGenerationLogs`);
  const snap = await logsRef
    .where("createdAt", ">=", Timestamp.fromDate(start))
    .where("createdAt", "<", Timestamp.fromDate(end))
    .get();

  const eventCounts: Record<LogEvent, number> = {
    generation_complete: 0,
    content_applied: 0,
    user_edit_saved: 0,
  };
  const toneCount = {
    official: 0,
    community: 0,
    marketing: 0,
    unknown: 0,
  };
  const variantIndexCount: Record<0 | 1 | 2, number> = { 0: 0, 1: 0, 2: 0 };

  let placementEvaluated = 0;
  let correctPlacement = 0;
  let editedCount = 0;
  let contentAppliedCount = 0;
  let userEditedAmongApplied = 0;

  const normalizedPlacementStats: NormalizedPlacementStatsWire = {
    recommendedCount: {},
    finalCount: {},
    matchedCount: {},
  };

  snap.docs.forEach((doc) => {
    const row = doc.data() as AiLogDoc;
    const ev = String(row.event || "") as LogEvent;
    if (ev === "generation_complete" || ev === "content_applied" || ev === "user_edit_saved") {
      eventCounts[ev]++;
    }

    if (row.isUserEdited === true) editedCount++;

    if (ev === "content_applied") {
      contentAppliedCount++;
      if (row.isUserEdited === true) userEditedAmongApplied++;
    }

    const rec = String(row.recommendedUse || "").trim();
    const fin = String(row.finalAppliedUse || "").trim();
    const normalizedRecommended = normalizePlacement(rec);
    const normalizedFinal = normalizePlacement(fin);

    if (normalizedRecommended !== "unknown") {
      bumpCount(normalizedPlacementStats.recommendedCount, normalizedRecommended);
    }
    if (normalizedFinal !== "unknown") {
      bumpCount(normalizedPlacementStats.finalCount, normalizedFinal);
    }

    const isPlacementComparable =
      normalizedRecommended !== "unknown" && normalizedFinal !== "unknown";

    if (isPlacementComparable) {
      placementEvaluated++;
      if (normalizedRecommended === normalizedFinal) {
        correctPlacement++;
        bumpCount(normalizedPlacementStats.matchedCount, normalizedRecommended);
      }
    }

    const tone = normalizeTone(row.selectedTone);
    if (ev === "generation_complete" || ev === "content_applied" || ev === "user_edit_saved") {
      toneCount[tone]++;
    }

    const vi = row.selectedVariantIndex;
    if (
      (ev === "generation_complete" || ev === "content_applied") &&
      typeof vi === "number" &&
      vi >= 0 &&
      vi <= 2
    ) {
      variantIndexCount[vi as 0 | 1 | 2]++;
    }
  });

  const out: Omit<FederationAiDailyStatsWire, "ok"> = {
    federationSlug: slug,
    date: dateStr,
    totalLogs: snap.size,
    eventCounts,
    placementEvaluated,
    correctPlacement,
    editedCount,
    contentAppliedCount,
    userEditedAmongApplied,
    toneCount,
    variantIndexCount,
    normalizedPlacementStats,
    aggregatedAt: new Date().toISOString(),
  };

  await db.doc(`federations/${slug}/aiStats/daily/${dateStr}`).set(
    {
      ...out,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );

  return { ok: true, ...out };
}

export async function handleAggregateFederationAiStats(request: CallableRequest<any>) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const federationSlug = String((request.data as any)?.federationSlug || "").trim();
  let dateStr = String((request.data as any)?.date || "").trim();
  if (!federationSlug) {
    throw new HttpsError("invalid-argument", "federationSlug가 필요합니다.");
  }
  if (!dateStr) {
    dateStr = seoulYesterdayDateString();
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new HttpsError("invalid-argument", "date는 YYYY-MM-DD 형식이어야 합니다.");
  }

  const db = getFirestore();
  const fedSnap = await db.doc(`federations/${federationSlug}`).get();
  if (!fedSnap.exists) throw new HttpsError("not-found", "협회를 찾을 수 없습니다.");
  if (!isFederationManagerDoc(fedSnap.data() as Record<string, unknown> | undefined, uid)) {
    throw new HttpsError("permission-denied", "집계 권한이 없습니다.");
  }

  try {
    const result = await aggregateFederationAiStatsForDate(federationSlug, dateStr);
    logger.info("[aggregateFederationAiStats] done", { federationSlug, dateStr, totalLogs: result.totalLogs });
    return result;
  } catch (e: any) {
    logger.error("[aggregateFederationAiStats] failed", e);
    throw new HttpsError("internal", e?.message || String(e));
  }
}

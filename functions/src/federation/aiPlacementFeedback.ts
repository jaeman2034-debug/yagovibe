/**
 * aiStats 일별 집계 → 최근 N일 배치 정확도 스냅샷 → 휴리스틱 bias
 */

import { getFirestore } from "firebase-admin/firestore";
import type { NormalizedPlacement } from "./aiPlacementNormalization";
import type { PlacementHeuristicAdjustment } from "./aiPlacementScoring";

export interface PlacementFeedbackSnapshot {
  /** 슬롯별 풀링 정확도 (matched 합 / recommended 합), 문서 없는 날은 제외 */
  accuracyByPlacement: Partial<Record<NormalizedPlacement, number>>;
}

const SCORED_PLACEMENTS: NormalizedPlacement[] = [
  "intro_section",
  "activity_section",
  "general_post",
  "market_post",
  "hero_banner",
  "unknown",
];

/** 서울 기준 오늘부터 i일 전 날짜 문자열 (i=1 → 어제) */
export function getLastNDatesSeoul(n: number, now = new Date()): string[] {
  const dates: string[] = [];
  const todayStr = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const [y, mo, d] = todayStr.split("-").map((x) => Number(x));
  const noonTodaySeoul = new Date(
    `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00+09:00`
  );
  for (let i = 1; i <= n; i++) {
    const day = new Date(noonTodaySeoul.getTime() - i * 86400000);
    dates.push(day.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }));
  }
  return dates;
}

export function buildPlacementFeedbackFromPooledStats(
  pooledRecommended: Record<string, number>,
  pooledMatched: Record<string, number>
): PlacementFeedbackSnapshot {
  const accuracyByPlacement: Partial<Record<NormalizedPlacement, number>> = {};
  for (const k of SCORED_PLACEMENTS) {
    const tot = pooledRecommended[k] ?? 0;
    if (tot > 0) {
      accuracyByPlacement[k] = (pooledMatched[k] ?? 0) / tot;
    }
  }
  return { accuracyByPlacement };
}

export function derivePlacementAdjustment(
  snapshot: PlacementFeedbackSnapshot
): PlacementHeuristicAdjustment {
  const get = (k: NormalizedPlacement): number | undefined => snapshot.accuracyByPlacement[k];

  const intro = get("intro_section");
  const activity = get("activity_section");
  const general = get("general_post");
  const market = get("market_post");

  return {
    introBias: intro !== undefined && intro < 0.55 ? -0.08 : 0,
    activityBias: activity !== undefined && activity < 0.55 ? 0.08 : 0,
    generalBias: general !== undefined && general < 0.5 ? 0.05 : 0,
    marketBias: market !== undefined && market < 0.5 ? 0.05 : 0,
  };
}

/** 최근 `days`일(서울, 어제부터) aiStats/daily를 읽어 풀링 정확도 계산 */
export async function loadPlacementFeedbackSnapshot(
  federationSlug: string,
  days = 7
): Promise<PlacementFeedbackSnapshot> {
  const slug = String(federationSlug || "").trim();
  if (!slug) {
    return { accuracyByPlacement: {} };
  }

  const db = getFirestore();
  const dateStrs = getLastNDatesSeoul(days);
  const pooledRecommended: Record<string, number> = {};
  const pooledMatched: Record<string, number> = {};

  for (const dateStr of dateStrs) {
    const snap = await db.doc(`federations/${slug}/aiStats/daily/${dateStr}`).get();
    if (!snap.exists) continue;
    const nps = snap.data()?.normalizedPlacementStats as
      | {
          recommendedCount?: Record<string, number>;
          matchedCount?: Record<string, number>;
        }
      | undefined;
    if (!nps?.recommendedCount) continue;

    for (const [k, raw] of Object.entries(nps.recommendedCount)) {
      const t = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(t) || t <= 0) continue;
      pooledRecommended[k] = (pooledRecommended[k] ?? 0) + t;
      const mRaw = nps.matchedCount?.[k];
      const m = typeof mRaw === "number" ? mRaw : Number(mRaw);
      if (Number.isFinite(m) && m >= 0) {
        pooledMatched[k] = (pooledMatched[k] ?? 0) + m;
      }
    }
  }

  return buildPlacementFeedbackFromPooledStats(pooledRecommended, pooledMatched);
}

export async function loadPlacementHeuristicAdjustment(
  federationSlug: string,
  days = 7
): Promise<PlacementHeuristicAdjustment> {
  const snapshot = await loadPlacementFeedbackSnapshot(federationSlug, days);
  return derivePlacementAdjustment(snapshot);
}

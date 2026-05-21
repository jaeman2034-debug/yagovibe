/**
 * 허브 `ActivityFeed`용 클라이언트 랭킹 (activities 문서 + 허브 컨텍스트)
 *
 * - 글로벌: `extra.hubScore` 또는 `computeActivityHubScoreStored` 폴백
 * - 개인화: 선호 종목 / 거리
 */

import type { SportType } from "@/context/HubContext";
import { normalizeSportId } from "@/constants/sports";
import { computeActivityHubScoreStored } from "@/utils/activityHubScore";
import { getDistanceKm, isValidLatLng, type LatLng } from "@/utils/geo";

export interface HubActivityRankContext {
  preferredSports: SportType[];
  activeSport: SportType;
  userLocation: LatLng | null;
}

export type HubActivityFeedRankable = {
  timestamp?: number;
  extra?: Record<string, unknown>;
};

function readExtraNum(extra: Record<string, unknown> | undefined, key: string): number {
  const v = extra?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/**
 * 단일 카드 점수 (높을수록 위에 노출)
 */
export function scoreHubActivityFeedItem(
  item: HubActivityFeedRankable,
  ctx: HubActivityRankContext
): number {
  const ts = typeof item.timestamp === "number" && Number.isFinite(item.timestamp) ? item.timestamp : Date.now();
  const ext = item.extra;

  let score: number;
  if (ext && typeof ext.hubScore === "number" && Number.isFinite(ext.hubScore)) {
    score = ext.hubScore;
  } else {
    score = computeActivityHubScoreStored({
      createdAtMillis: ts,
      likeCount: readExtraNum(ext, "activityLikeCount"),
      commentCount: readExtraNum(ext, "activityCommentCount"),
      feedbackReportCount: readExtraNum(ext, "feedbackReportCount"),
      feedbackHideCount: readExtraNum(ext, "feedbackHideCount"),
      feedbackNotInterestedCount: readExtraNum(ext, "feedbackNotInterestedCount"),
    });
  }

  const sportRaw = ext && typeof ext.sport === "string" ? ext.sport : "";
  const sid = normalizeSportId(sportRaw);
  if (sid) {
    const active = ctx.activeSport ? normalizeSportId(ctx.activeSport) : null;
    if (active && active === sid) {
      score += 28;
    } else if (ctx.preferredSports.some((p) => normalizeSportId(p) === sid)) {
      score += 14;
    }
  }

  const lat = ext && typeof ext.listingLat === "number" ? ext.listingLat : undefined;
  const lng = ext && typeof ext.listingLng === "number" ? ext.listingLng : undefined;
  if (
    ctx.userLocation &&
    isValidLatLng(ctx.userLocation) &&
    lat != null &&
    lng != null &&
    isValidLatLng({ lat, lng })
  ) {
    const km = getDistanceKm(ctx.userLocation, { lat, lng });
    if (km < 5) score += 8;
    else if (km < 15) score += 3;
  }

  return score;
}

/**
 * activities 소스 배열만 재정렬 (원본 불변)
 */
export function rankHubActivities<T extends HubActivityFeedRankable>(
  items: T[],
  ctx: HubActivityRankContext
): T[] {
  return [...items].sort((a, b) => {
    const da = scoreHubActivityFeedItem(a, ctx);
    const db = scoreHubActivityFeedItem(b, ctx);
    if (db !== da) return db - da;
    return (b.timestamp || 0) - (a.timestamp || 0);
  });
}

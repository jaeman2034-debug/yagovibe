/**
 * 종목 허브 팀 탭 — 공개 팀 발견(추천 팀)
 * recruit 피드와 분리된 엔티티 목록용
 */

import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeSportId, type SportId } from "@/constants/sports";
import { getTeamSummary } from "@/services/teamSummaryService";
import type { TeamSummary } from "@/types/teamSummary";
import { toDate } from "@/utils/timeUtils";
import { getTeamCoverPhotoUrl } from "@/lib/team/resolveTeamPublicProfile";

export type RecommendedTeamRow = {
  id: string;
  name: string;
  region?: string;
  logoUrl?: string;
  /** 공개 허브 히어로와 동일 우선순위(meta → flat aiProfile → teamBranding) */
  coverPhotoUrl?: string;
  memberCount: number;
  /** 상단 코너 배지 */
  badgeLabel?: string;
  /** 시즌 요약 경기 수 */
  matches?: number;
  /** 최근 14일 내 기록된 경기 여부 */
  hasRecentMatch?: boolean;
  /** 한 줄 추천 근거 */
  recommendReason: string;
  /** 게임 티어 느낌 라벨 */
  tierLabel: string;
};

function sportTypesForQuery(canonical: SportId): string[] {
  const set = new Set<string>([canonical]);
  if (canonical === "soccer") {
    set.add("football");
    set.add("futsal");
  }
  return Array.from(set).slice(0, 10);
}

function badgeFromHeuristics(memberCount: number, hasRecent: boolean): string | undefined {
  if (hasRecent) return "🔥 활동 활발";
  if (memberCount >= 18) return "⭐ 인기 길드";
  if (memberCount >= 10) return "👥 성장 중";
  if (memberCount >= 5) return "모집 중";
  return undefined;
}

function tierFromMembers(mc: number): string {
  if (mc >= 22) return "골드 클럽";
  if (mc >= 14) return "실버 크루";
  return "브론즈 스쿼드";
}

function daysSinceMatch(summary: TeamSummary | null): number | null {
  if (!summary?.lastMatchAt) return null;
  const d = toDate(summary.lastMatchAt);
  return (Date.now() - d.getTime()) / 86400000;
}

function buildRecommendReason(args: {
  region?: string;
  memberCount: number;
  matches: number;
  hasRecentMatch: boolean;
}): string {
  const { region, memberCount, matches, hasRecentMatch } = args;
  if (hasRecentMatch) return "🔥 최근 경기가 열린 팀";
  if (matches >= 5) return "🏆 시즌 경기가 쌓인 팀";
  if (memberCount >= 18) return "👥 함께 뛰는 동료가 많은 팀";
  if (memberCount >= 10) return "👥 빠르게 성장 중인 팀";
  if (region) return `📍 ${region}에서 활동 중`;
  return "✨ 이번 주 추천 팀";
}

function enrichWithSummary(row: Omit<RecommendedTeamRow, "recommendReason" | "tierLabel">, summary: TeamSummary | null): RecommendedTeamRow {
  const matches = summary?.matches ?? 0;
  const since = daysSinceMatch(summary);
  const hasRecentMatch = since != null && since <= 14;
  const recommendReason = buildRecommendReason({
    region: row.region,
    memberCount: row.memberCount,
    matches,
    hasRecentMatch,
  });
  const tierLabel = tierFromMembers(row.memberCount);
  return {
    ...row,
    matches,
    hasRecentMatch,
    recommendReason,
    tierLabel,
    badgeLabel: badgeFromHeuristics(row.memberCount, hasRecentMatch),
  };
}

function scoreForRanking(r: RecommendedTeamRow): number {
  const m = r.memberCount;
  const g = r.matches ?? 0;
  const bump = r.hasRecentMatch ? 24 : 0;
  return m * 2 + g + bump;
}

/**
 * 종목에 맞는 공개 팀 후보 → 요약 병합 후 정렬
 */
export async function fetchRecommendedTeamsForSport(
  sportSlug: string,
  options?: { max?: number }
): Promise<RecommendedTeamRow[]> {
  const max = Math.min(options?.max ?? 12, 20);
  const canonical = normalizeSportId(sportSlug) ?? ("soccer" as SportId);
  const inVals = sportTypesForQuery(canonical);
  if (inVals.length === 0) return [];

  try {
    const q = query(collection(db, "teams"), where("sportType", "in", inVals), limit(40));
    const snap = await getDocs(q);
    const base: Omit<RecommendedTeamRow, "recommendReason" | "tierLabel" | "matches" | "hasRecentMatch">[] = [];

    for (const d of snap.docs) {
      const data = d.data() as Record<string, unknown>;
      const st = data.status;
      if (st === "archived" || st === "deleted" || st === "inactive") continue;

      const nameRaw = data.name;
      const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
      if (!name) continue;

      const mc = data.memberCount;
      let memberCount = 0;
      if (typeof mc === "number" && Number.isFinite(mc)) memberCount = mc;
      else if (typeof mc === "string" && mc.trim()) {
        const p = parseInt(mc, 10);
        if (Number.isFinite(p)) memberCount = p;
      }

      const region = typeof data.region === "string" && data.region.trim() ? data.region.trim() : undefined;
      const logoUrl =
        (typeof data.logoUrl === "string" && data.logoUrl.trim() && data.logoUrl) ||
        (typeof data.logo === "string" && data.logo.trim() && data.logo) ||
        undefined;

      const coverPhotoUrl =
        getTeamCoverPhotoUrl({
          aiProfile: data.aiProfile,
          teamBranding: data.teamBranding,
        }) ?? undefined;

      base.push({
        id: d.id,
        name,
        region,
        logoUrl,
        coverPhotoUrl,
        memberCount,
      });
    }

    base.sort((a, b) => b.memberCount - a.memberCount);
    const pool = base.slice(0, Math.max(max, 12));

    const summaries = await Promise.all(pool.map((r) => getTeamSummary(r.id)));
    const enriched = pool.map((row, i) => enrichWithSummary(row, summaries[i]));
    enriched.sort((a, b) => scoreForRanking(b) - scoreForRanking(a));
    return enriched.slice(0, max);
  } catch (err) {
    console.warn("[fetchRecommendedTeamsForSport] 조회 실패 (인덱스·규칙 확인):", err);
    return [];
  }
}

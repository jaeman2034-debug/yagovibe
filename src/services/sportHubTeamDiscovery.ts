/**
 * 종목 허브 팀 탭 — 공개 팀 발견(추천 팀)
 * - `teams` 발견 목록
 * - + 협회 CMS 「홈페이지 연결」(federations/.../teams.platformTeamId) Join
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeSportId, type SportId } from "@/constants/sports";
import { getTeamSummary } from "@/services/teamSummaryService";
import type { TeamSummary } from "@/types/teamSummary";
import { toDate } from "@/utils/timeUtils";
import { getTeamCoverPhotoUrl } from "@/lib/team/resolveTeamPublicProfile";
import { normalizeTeamSearchKey } from "@/services/federationOperatingService";

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
  /**
   * 실제 Tier/rank/grade 가 있을 때만 설정.
   * 멤버 수 기반 mock(브론즈 스쿼드 등)은 넣지 않음.
   */
  tierLabel: string | null;
  /** 실제 Tier 없을 때 UI 「신규팀」 배지 */
  isNewTeam?: boolean;
  /** federation CMS homepage link vs generic discovery */
  source?: "federation" | "discovery";
  federationSlug?: string;
  federationName?: string;
};

function sportTypesForQuery(canonical: SportId): string[] {
  const set = new Set<string>([canonical]);
  if (canonical === "soccer") {
    set.add("football");
    set.add("futsal");
  }
  return Array.from(set).slice(0, 10);
}

/** 플랫폼 팀 문서가 현재 종목 허브와 맞는지 (야구 허브에 축구팀 노출 방지) */
function teamDocMatchesCanonical(data: Record<string, unknown>, canonical: SportId): boolean {
  const allowed = new Set(sportTypesForQuery(canonical).map((s) => s.toLowerCase()));
  const raw = [data.sportType, data.sport, data.primarySport]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim().toLowerCase());
  if (raw.length === 0) {
    // 레거시 축구 문서만 sportType 없이 허용 — 타 종목은 반드시 일치
    return canonical === "soccer";
  }
  return raw.some((r) => {
    const n = normalizeSportId(r);
    return allowed.has(r) || (n != null && allowed.has(n));
  });
}

function badgeFromHeuristics(memberCount: number, hasRecent: boolean): string | undefined {
  if (hasRecent) return "🔥 활동 활발";
  if (memberCount >= 18) return "⭐ 인기 길드";
  if (memberCount >= 10) return "👥 성장 중";
  if (memberCount >= 5) return "모집 중";
  return undefined;
}

/**
 * 향후 Tier 계산용 (활동·경기·승률·운영점수 등).
 * 현재는 호출하지 않음 — mock 브론즈/실버/골드 자동 표시 금지.
 */
export function tierFromMembers_RESERVED_FOR_FUTURE(mc: number): string {
  if (mc >= 22) return "골드 클럽";
  if (mc >= 14) return "실버 크루";
  return "브론즈 스쿼드";
}

/** Firestore teams.tier | rank | grade 등 실값만 인정 */
function resolveRealTierLabel(data: Record<string, unknown>): string | null {
  const candidates = [data.tier, data.rank, data.grade, data.tierLabel, data.teamTier];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
    if (typeof c === "number" && Number.isFinite(c)) return String(c);
  }
  return null;
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

function enrichWithSummary(
  row: Omit<RecommendedTeamRow, "recommendReason" | "matches" | "hasRecentMatch">,
  summary: TeamSummary | null
): RecommendedTeamRow {
  const matches = summary?.matches ?? 0;
  const since = daysSinceMatch(summary);
  const hasRecentMatch = since != null && since <= 14;
  const isFed = row.source === "federation";
  const recommendReason = isFed
    ? row.federationName
      ? `🏛 ${row.federationName} 홈페이지 연결`
      : "🏛 협회 홈페이지 연결 완료"
    : buildRecommendReason({
        region: row.region,
        memberCount: row.memberCount,
        matches,
        hasRecentMatch,
      });
  const tierLabel = row.tierLabel ?? null;
  const isNewTeam = !tierLabel;
  return {
    ...row,
    matches,
    hasRecentMatch,
    recommendReason,
    tierLabel,
    isNewTeam,
    badgeLabel: isFed
      ? "협회 연결"
      : badgeFromHeuristics(row.memberCount, hasRecentMatch),
  };
}

function rowFromTeamDoc(
  id: string,
  data: Record<string, unknown>,
  extra?: Partial<RecommendedTeamRow>
): Omit<RecommendedTeamRow, "recommendReason" | "matches" | "hasRecentMatch"> | null {
  if (data.isDeleted === true) return null;
  const st = data.status;
  if (st === "archived" || st === "deleted" || st === "inactive") return null;

  const nameRaw = data.name;
  const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
  if (!name) return null;

  const mc = data.memberCount;
  let memberCount = 0;
  if (typeof mc === "number" && Number.isFinite(mc)) memberCount = mc;
  else if (typeof mc === "string" && mc.trim()) {
    const p = parseInt(mc, 10);
    if (Number.isFinite(p)) memberCount = p;
  }

  const region =
    typeof data.region === "string" && data.region.trim() ? data.region.trim() : undefined;
  const logoUrl =
    (typeof data.logoUrl === "string" && data.logoUrl.trim() && data.logoUrl) ||
    (typeof data.logo === "string" && data.logo.trim() && data.logo) ||
    undefined;

  const coverPhotoUrl =
    getTeamCoverPhotoUrl({
      aiProfile: data.aiProfile,
      teamBranding: data.teamBranding,
    }) ?? undefined;

  const realTier = resolveRealTierLabel(data);

  return {
    id,
    name,
    region,
    logoUrl,
    coverPhotoUrl,
    memberCount,
    source: "discovery",
    tierLabel: realTier,
    isNewTeam: !realTier,
    ...extra,
    // extra 가 tier 를 덮어쓰지 않도록: 명시적 tier 없으면 문서 실값 유지
    ...(extra?.tierLabel !== undefined
      ? { tierLabel: extra.tierLabel, isNewTeam: !extra.tierLabel }
      : {}),
  };
}

/**
 * 협회 CMS에서 platformTeamId 로 홈페이지 연결한 플랫폼 팀 목록.
 * Path: federations/{slug}/teams/{id}.platformTeamId → teams/{platformTeamId}
 */
async function fetchFederationLinkedPlatformTeams(
  canonical: SportId
): Promise<Omit<RecommendedTeamRow, "recommendReason" | "matches" | "hasRecentMatch">[]> {
  const out: Omit<RecommendedTeamRow, "recommendReason" | "matches" | "hasRecentMatch">[] = [];
  const seen = new Set<string>();

  let federationDocs: { slug: string; name: string }[] = [];
  try {
    const fedSnap = await getDocs(query(collection(db, "federations"), limit(30)));
    federationDocs = fedSnap.docs
      .map((d) => {
        const data = d.data() as Record<string, unknown>;
        const branding =
          data.branding && typeof data.branding === "object"
            ? (data.branding as Record<string, unknown>)
            : {};
        const sport = String(data.sport || data.sportType || data.sportKey || "")
          .toLowerCase()
          .trim();
        const name =
          String(data.name || branding.name || d.id).trim() || d.id;
        return { slug: d.id, name, sport };
      })
      .filter((f) => {
        if (canonical === "soccer") {
          // soccer hub: football / soccer / 미지정(노원 등) 포함
          return (
            !f.sport ||
            f.sport === "soccer" ||
            f.sport === "football" ||
            f.sport === "futsal" ||
            f.slug.includes("football") ||
            f.slug.includes("soccer")
          );
        }
        // 타 종목: sport 미지정 협회는 제외 (축구 협회 폴백으로 야구 허브가 오염되던 버그)
        return f.sport === canonical || f.sport.includes(canonical);
      })
      .map(({ slug, name }) => ({ slug, name }));
  } catch (e) {
    console.warn("[fetchFederationLinkedPlatformTeams] federations list failed", e);
    // nowon-football 폴백은 축구 허브에서만
    federationDocs =
      canonical === "soccer" ? [{ slug: "nowon-football", name: "노원구축구협회" }] : [];
  }

  if (federationDocs.length === 0 && canonical === "soccer") {
    federationDocs = [{ slug: "nowon-football", name: "노원구축구협회" }];
  }

  for (const fed of federationDocs.slice(0, 8)) {
    try {
      const teamsSnap = await getDocs(
        query(collection(db, "federations", fed.slug, "teams"), limit(120))
      );
      const platformIds: { platformTeamId: string; fedTeamName: string }[] = [];
      for (const d of teamsSnap.docs) {
        const data = d.data() as Record<string, unknown>;
        const pid =
          typeof data.platformTeamId === "string" ? data.platformTeamId.trim() : "";
        if (!pid || seen.has(pid)) continue;
        platformIds.push({
          platformTeamId: pid,
          fedTeamName: String(data.name || "").trim(),
        });
      }

      await Promise.all(
        platformIds.map(async ({ platformTeamId, fedTeamName }) => {
          if (seen.has(platformTeamId)) return;
          try {
            const snap = await getDoc(doc(db, "teams", platformTeamId));
            if (!snap.exists()) return;
            const data = snap.data() as Record<string, unknown>;
            if (!teamDocMatchesCanonical(data, canonical)) return;
            const row = rowFromTeamDoc(snap.id, data, {
              source: "federation",
              federationSlug: fed.slug,
              federationName: fed.name,
              // 협회 표시명이 더 친숙하면 우선
              name:
                fedTeamName ||
                (typeof data.name === "string" ? data.name.trim() : "") ||
                "팀",
            });
            if (!row) return;
            seen.add(platformTeamId);
            out.push(row);
          } catch (err) {
            console.warn("[fetchFederationLinkedPlatformTeams] team get failed", platformTeamId, err);
          }
        })
      );
    } catch (e) {
      console.warn("[fetchFederationLinkedPlatformTeams] fed teams failed", fed.slug, e);
    }
  }

  return out;
}

function scoreForRanking(r: RecommendedTeamRow): number {
  const m = r.memberCount;
  const g = r.matches ?? 0;
  const bump = r.hasRecentMatch ? 24 : 0;
  return m * 2 + g + bump;
}

/**
 * 종목에 맞는 공개 팀 후보 → 요약 병합 후 정렬
 * 협회 홈페이지 연결(platformTeamId) 팀을 앞에 노출한다.
 */
export async function fetchRecommendedTeamsForSport(
  sportSlug: string,
  options?: { max?: number }
): Promise<RecommendedTeamRow[]> {
  const max = Math.min(options?.max ?? 16, 24);
  const canonical = normalizeSportId(sportSlug) ?? ("soccer" as SportId);
  const inVals = sportTypesForQuery(canonical);
  if (inVals.length === 0) return [];

  try {
    const federationLinked = await fetchFederationLinkedPlatformTeams(canonical);

    const q = query(collection(db, "teams"), where("sportType", "in", inVals), limit(60));
    const snap = await getDocs(q);
    const discovery: Omit<RecommendedTeamRow, "recommendReason" | "matches" | "hasRecentMatch">[] =
      [];
    const linkedIds = new Set(federationLinked.map((t) => t.id));

    // 협회 연결명과 표기만 다른 중복(예: 상계FC vs 상계 FC)은 발견 목록에서 제외
    const linkedNameKeys = new Set(
      federationLinked.map((t) => normalizeTeamSearchKey(t.name)).filter(Boolean)
    );

    for (const d of snap.docs) {
      if (linkedIds.has(d.id)) continue;
      const row = rowFromTeamDoc(d.id, d.data() as Record<string, unknown>, {
        source: "discovery",
      });
      if (!row) continue;
      if (linkedNameKeys.has(normalizeTeamSearchKey(row.name))) continue;
      discovery.push(row);
    }

    discovery.sort((a, b) => b.memberCount - a.memberCount);
    federationLinked.sort((a, b) => a.name.localeCompare(b.name, "ko"));

    // 협회 연결 팀 우선 + 일반 발견 팀
    const pool = [
      ...federationLinked,
      ...discovery.slice(0, Math.max(max, 12)),
    ].slice(0, Math.max(max + federationLinked.length, max));

    const summaries = await Promise.all(pool.map((r) => getTeamSummary(r.id)));
    const enriched = pool.map((row, i) => enrichWithSummary(row, summaries[i]));

    const fed = enriched.filter((r) => r.source === "federation");
    const rest = enriched
      .filter((r) => r.source !== "federation")
      .sort((a, b) => scoreForRanking(b) - scoreForRanking(a));

    return [...fed, ...rest].slice(0, Math.max(max, fed.length));
  } catch (err) {
    console.warn("[fetchRecommendedTeamsForSport] 조회 실패 (인덱스·규칙 확인):", err);
    return [];
  }
}

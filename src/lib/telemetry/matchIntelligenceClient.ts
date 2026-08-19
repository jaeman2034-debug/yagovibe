import { parseCoachFieldsFromProfile } from "./coachClient";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { db, functions } from "@/lib/firebase";
import type {
  CoachingInsightsClient,
  ComparisonWinnerSideClient,
  MatchComparisonClient,
  MatchIntelligenceSummaryClient,
  PlayerProfileClient,
  PlayerRatingClient,
  PlayerRatingsSummaryClient,
  XThreatSummaryClient,
} from "./matchIntelligenceTypes";

type CallableSummaryResponse = {
  ok: boolean;
  summary: Record<string, unknown> | null;
};

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseWinnerSide(v: unknown): ComparisonWinnerSideClient | undefined {
  if (v === "self" || v === "opponent" || v === "tie") return v;
  return undefined;
}

function parseComparisonSide(raw: unknown): MatchComparisonClient["self"] | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const uid = str(r.uid);
  if (!uid) return null;
  return {
    uid,
    overall: num(r.overall) ?? 50,
    xThreat: num(r.xThreat) ?? 0,
    attack: num(r.attack) ?? 50,
    control: num(r.control) ?? 50,
    passing: num(r.passing) ?? 50,
    finishing: num(r.finishing) ?? 50,
    touches: num(r.touches) ?? 0,
    shots: num(r.shots) ?? 0,
    goals: num(r.goals) ?? 0,
    possessionContribution: num(r.possessionContribution) ?? 0,
  };
}

function parseMatchComparison(raw: unknown): MatchComparisonClient | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (num(r.version) !== 1) return null;
  const self = parseComparisonSide(r.self);
  const opponent = parseComparisonSide(r.opponent);
  if (!self || !opponent) return null;
  const w = r.winner;
  const winner: MatchComparisonClient["winner"] = {};
  if (w && typeof w === "object") {
    const wr = w as Record<string, unknown>;
    winner.overall = parseWinnerSide(wr.overall);
    winner.xThreat = parseWinnerSide(wr.xThreat);
    winner.attack = parseWinnerSide(wr.attack);
    winner.control = parseWinnerSide(wr.control);
    winner.passing = parseWinnerSide(wr.passing);
    winner.finishing = parseWinnerSide(wr.finishing);
    winner.touches = parseWinnerSide(wr.touches);
    winner.shots = parseWinnerSide(wr.shots);
    winner.goals = parseWinnerSide(wr.goals);
    winner.possessionContribution = parseWinnerSide(wr.possessionContribution);
  }
  return { version: 1, self, opponent, winner };
}

function parseCoaching(raw: unknown): CoachingInsightsClient | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (num(r.version) !== 1) return null;
  const strengths = Array.isArray(r.strengths)
    ? r.strengths.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  const weaknesses = Array.isArray(r.weaknesses)
    ? r.weaknesses.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  const recommendations = Array.isArray(r.recommendations)
    ? r.recommendations.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  const focusArea = str(r.focusArea) || "General";
  if (strengths.length === 0 && weaknesses.length === 0 && recommendations.length === 0) {
    return null;
  }
  return { version: 1, strengths, weaknesses, recommendations, focusArea };
}

export function parseMatchIntelligenceSummary(raw: unknown): MatchIntelligenceSummaryClient | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const matchId = str(s.matchId);
  if (!matchId) return null;

  const playerTouches = Array.isArray(s.playerTouches)
    ? s.playerTouches
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const r = row as Record<string, unknown>;
          const playerUid = str(r.playerUid);
          if (!playerUid) return null;
          return {
            playerUid,
            kickAttempts: num(r.kickAttempts) ?? 0,
            goals: num(r.goals) ?? 0,
            avgKickPower: num(r.avgKickPower),
            avgKickDistance: num(r.avgKickDistance),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
    : [];

  const passSequences = (() => {
    const ps = s.passSequences;
    if (!ps || typeof ps !== "object") return { chains: [] as { chainId: string; passCount: number; playerUids: string[] }[] };
    const raw = ps as Record<string, unknown>;
    const chains = Array.isArray(raw.chains)
      ? raw.chains
          .map((row) => {
            if (!row || typeof row !== "object") return null;
            const r = row as Record<string, unknown>;
            const chainId = str(r.chainId);
            const playerUids = Array.isArray(r.playerUids)
              ? r.playerUids.filter((u): u is string => typeof u === "string")
              : [];
            return {
              chainId: chainId || "pass",
              passCount: num(r.passCount) ?? 1,
              playerUids,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x != null)
      : [];
    return { chains };
  })();

  const xThreat = ((): XThreatSummaryClient | null => {
    const xt = s.xThreat;
    if (!xt || typeof xt !== "object") return null;
    const r = xt as Record<string, unknown>;
    if (num(r.version) !== 1) return null;
    const byPlayer = Array.isArray(r.byPlayer)
      ? r.byPlayer
          .map((row) => {
            if (!row || typeof row !== "object") return null;
            const p = row as Record<string, unknown>;
            const uid = str(p.uid);
            if (!uid) return null;
            return {
              uid,
              generated: num(p.generated) ?? 0,
              received: num(p.received) ?? 0,
              netContribution: num(p.netContribution) ?? 0,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x != null)
      : [];
    return {
      version: 1,
      gridCols: num(r.gridCols) ?? 10,
      gridRows: num(r.gridRows) ?? 6,
      matchTotal: num(r.matchTotal) ?? 0,
      byPlayer,
    };
  })();

  const playerRatings = ((): PlayerRatingsSummaryClient | null => {
    const pr = s.playerRatings;
    if (!pr || typeof pr !== "object") return null;
    const r = pr as Record<string, unknown>;
    if (num(r.version) !== 1) return null;
    const players = Array.isArray(r.players)
      ? r.players
          .map((row) => {
            if (!row || typeof row !== "object") return null;
            const p = row as Record<string, unknown>;
            const uid = str(p.uid);
            if (!uid) return null;
            const badges = Array.isArray(p.badges)
              ? p.badges.filter((b): b is string => typeof b === "string")
              : [];
            return {
              uid,
              attack: num(p.attack) ?? 50,
              control: num(p.control) ?? 50,
              passing: num(p.passing) ?? 50,
              finishing: num(p.finishing) ?? 50,
              overall: num(p.overall) ?? 50,
              badges,
            } satisfies PlayerRatingClient;
          })
          .filter((x): x is PlayerRatingClient => x != null)
      : [];
    return { version: 1, players };
  })();

  const possessionSegments = Array.isArray(s.possessionSegments)
    ? s.possessionSegments
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const r = row as Record<string, unknown>;
          return {
            teamId: str(r.teamId) || "unknown",
            startAtMs: num(r.startAtMs) ?? 0,
            endAtMs: num(r.endAtMs) ?? 0,
            actorUid: str(r.actorUid) || null,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
    : [];

  const comparison = parseMatchComparison(s.comparison);
  const coaching = parseCoaching(s.coaching);

  return {
    matchId,
    sessionId: str(s.sessionId),
    mode: str(s.mode) || "5v5",
    eventCount: num(s.eventCount) ?? 0,
    matchDurationMs: num(s.matchDurationMs),
    possessionSegments,
    playerTouches,
    passSequences,
    xThreat,
    playerRatings,
    comparison,
    coaching,
  };
}

export function pickMyPlayerRating(
  summary: MatchIntelligenceSummaryClient,
  myUid: string,
): PlayerRatingClient | null {
  return summary.playerRatings?.players.find((p) => p.uid === myUid) ?? null;
}

export function pickMyXThreat(
  summary: MatchIntelligenceSummaryClient,
  myUid: string,
): { generated: number; received: number; netContribution: number } | null {
  const row = summary.xThreat?.byPlayer.find((p) => p.uid === myUid);
  if (!row) return null;
  return {
    generated: row.generated,
    received: row.received,
    netContribution: row.netContribution,
  };
}

export function parsePlayerProfile(uid: string, raw: unknown): PlayerProfileClient | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const coach = parseCoachFieldsFromProfile(d);
  return {
    playerId: str(d.playerId) || uid,
    matchesPlayed: num(d.matchesPlayed) ?? 0,
    totalTouches: num(d.totalTouches) ?? 0,
    goals: num(d.goals) ?? 0,
    kickAttemptCount: num(d.kickAttemptCount) ?? 0,
    goalConversion: num(d.goalConversion) ?? 0,
    avgTouchesPerMatch: num(d.avgTouchesPerMatch) ?? 0,
    avgKickPower: num(d.avgKickPower),
    avgKickDistance: num(d.avgKickDistance),
    possessionContribution: num(d.possessionContribution) ?? 0,
    lastMatchId: str(d.lastMatchId) || null,
    avgOverall: num(d.avgOverall),
    avgAttack: num(d.avgAttack),
    avgControl: num(d.avgControl),
    avgPassing: num(d.avgPassing),
    avgFinishing: num(d.avgFinishing),
    bestOverall: num(d.bestOverall),
    avgXThreatPerMatch: num(d.avgXThreatPerMatch),
    totalXThreatGenerated: num(d.totalXThreatGenerated),
    passCompletionRate: num(d.passCompletionRate),
    totalPassChains: num(d.totalPassChains),
    totalInterceptions: num(d.totalInterceptions),
    seasonPoints: num(d.seasonPoints),
    seasonTier: str(d.seasonTier) || null,
    seasonRank: str(d.seasonRank) || null,
    seasonWins: num(d.seasonWins),
    seasonLosses: num(d.seasonLosses),
    seasonMatches: num(d.seasonMatches),
    lastSeasonDelta: num(d.lastSeasonDelta),
    lastSeasonRankBefore: str(d.lastSeasonRankBefore) || null,
    lastSeasonPromoted: d.lastSeasonPromoted === true ? true : d.lastSeasonPromoted === false ? false : null,
    coachFocusArea: coach.coachFocusArea,
    coachFocusSince: coach.coachFocusSince,
    coachStreak: coach.coachStreak,
    coachLastRecommendation: coach.coachLastRecommendation,
  };
}

export type IntelligenceFetchErrorCode =
  | "permission-denied"
  | "not-found"
  | "unauthenticated"
  | "network"
  | "unknown";

export class IntelligenceFetchError extends Error {
  code: IntelligenceFetchErrorCode;
  constructor(code: IntelligenceFetchErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

function mapCallableError(e: unknown): IntelligenceFetchError {
  const err = e as { code?: string; message?: string };
  const msg = typeof err?.message === "string" ? err.message : "요청에 실패했습니다.";
  if (err?.code === "functions/permission-denied") {
    return new IntelligenceFetchError("permission-denied", msg || "이 매치 참가자만 조회할 수 있습니다.");
  }
  if (err?.code === "functions/not-found") {
    return new IntelligenceFetchError("not-found", msg || "매치 텔레메트리를 찾을 수 없습니다.");
  }
  if (err?.code === "functions/unauthenticated") {
    return new IntelligenceFetchError("unauthenticated", msg || "로그인이 필요합니다.");
  }
  return new IntelligenceFetchError("unknown", msg);
}

export async function callGetMatchIntelligenceSummary(
  matchId: string,
): Promise<MatchIntelligenceSummaryClient> {
  const fn = httpsCallable<{ matchId: string }, CallableSummaryResponse>(
    functions,
    "getMatchIntelligenceSummary",
  );
  try {
    const res = await fn({ matchId: matchId.trim() });
    const parsed = parseMatchIntelligenceSummary(res.data?.summary);
    if (!parsed) {
      throw new IntelligenceFetchError("not-found", "인사이트 데이터가 비어 있습니다.");
    }
    return parsed;
  } catch (e) {
    if (e instanceof IntelligenceFetchError) throw e;
    throw mapCallableError(e);
  }
}

export async function fetchPlayerProfile(uid: string): Promise<PlayerProfileClient | null> {
  const id = uid.trim();
  if (!id) return null;
  const snap = await getDoc(doc(db, "playerProfiles", id));
  if (!snap.exists()) return null;
  return parsePlayerProfile(id, snap.data());
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Client-side mirror of server possession contribution (v0). */
export function computePossessionContributionClient(
  playerUid: string,
  segments: { startAtMs: number; endAtMs: number; actorUid?: string | null }[],
  matchDurationMs: number | null,
): number {
  if (!playerUid || segments.length === 0) return 0;
  const spanEnd = matchDurationMs ?? segments[segments.length - 1]?.endAtMs ?? 0;
  const spanStart = segments[0]?.startAtMs ?? 0;
  const totalMs = Math.max(0, spanEnd - spanStart);
  if (totalMs <= 0) return 0;
  let playerMs = 0;
  for (const s of segments) {
    if (s.actorUid === playerUid) {
      playerMs += Math.max(0, s.endAtMs - s.startAtMs);
    }
  }
  return Math.min(1, playerMs / totalMs);
}

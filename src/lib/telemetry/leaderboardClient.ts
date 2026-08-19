import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type {
  LeaderboardEntryClient,
  LeaderboardScopeClient,
  LeaderboardsClient,
  LeaderboardsResultClient,
  WeeklyBadgeIdClient,
  WeeklyMetaClient,
} from "./leaderboardTypes";

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseScope(raw: unknown): LeaderboardScopeClient {
  const s = str(raw).toLowerCase();
  if (s === "friends" || s === "weekly") return s;
  return "global";
}

function parseBadge(raw: unknown): WeeklyBadgeIdClient | null {
  const s = str(raw);
  if (s === "weekly_winner" || s === "weekly_top3" || s === "weekly_top10") return s;
  return null;
}

function parseWeeklyMeta(raw: unknown): WeeklyMetaClient | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const countdownRaw = r.countdown;
  const countdown =
    countdownRaw && typeof countdownRaw === "object"
      ? {
          days: num((countdownRaw as Record<string, unknown>).days) ?? 0,
          hours: num((countdownRaw as Record<string, unknown>).hours) ?? 0,
          label: str((countdownRaw as Record<string, unknown>).label) || "Ends soon",
        }
      : { days: 0, hours: 0, label: "Ends soon" };

  const rank = num(r.currentUserRank);
  return {
    weekKey: str(r.weekKey),
    countdown,
    currentUserRank: rank != null && rank > 0 ? rank : null,
    badge: parseBadge(r.badge),
    challenge: str(r.challenge) || "Enter Weekly Top 10",
  };
}

function parseEntry(raw: unknown): LeaderboardEntryClient | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const uid = str(r.uid);
  if (!uid) return null;
  return {
    uid,
    score: num(r.score) ?? 0,
    displayName: str(r.displayName) || `Player ${uid.slice(0, 6)}`,
    archetype: str(r.archetype) || "Engine",
    rank: num(r.rank) ?? 0,
  };
}

function parseEntries(raw: unknown): LeaderboardEntryClient[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseEntry).filter((x): x is LeaderboardEntryClient => x != null);
}

export function parseLeaderboards(raw: unknown): LeaderboardsClient | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (num(r.version) !== 1) return null;
  return {
    version: 1,
    scope: parseScope(r.scope),
    topOVR: parseEntries(r.topOVR),
    topXThreat: parseEntries(r.topXThreat),
    bestFinisher: parseEntries(r.bestFinisher),
    bestPlaymaker: parseEntries(r.bestPlaymaker),
    seasonRP: parseEntries(r.seasonRP),
    weeklyRP: parseEntries(r.weeklyRP),
  };
}

export async function callGetLeaderboards(
  scope: LeaderboardScopeClient = "global",
): Promise<LeaderboardsResultClient> {
  const fn = httpsCallable<
    { scope?: LeaderboardScopeClient },
    { ok: boolean; leaderboards: unknown; weeklyMeta?: unknown }
  >(functions, "getLeaderboards");
  const res = await fn({ scope });
  return {
    leaderboards: parseLeaderboards(res.data?.leaderboards),
    weeklyMeta: parseWeeklyMeta(res.data?.weeklyMeta),
  };
}

export const ARCHETYPE_LABEL_KO: Record<string, string> = {
  Finisher: "피니셔",
  Playmaker: "플레이메이커",
  Engine: "엔진",
  "Ball Winner": "볼 하이저",
  "Threat Creator": "위협 창출",
  Controller: "컨트롤러",
};

export function labelArchetype(id: string): string {
  return ARCHETYPE_LABEL_KO[id] ?? id;
}

export function weeklyBadgeLabel(badge: WeeklyBadgeIdClient | null): string {
  if (badge === "weekly_winner") return "Winner";
  if (badge === "weekly_top3") return "Top 3";
  if (badge === "weekly_top10") return "Top 10";
  return "Unranked";
}

export function weeklyBadgeEmoji(badge: WeeklyBadgeIdClient | null): string {
  if (badge === "weekly_winner") return "🥇";
  if (badge === "weekly_top3") return "🥈";
  if (badge === "weekly_top10") return "🏅";
  return "";
}

export function weeklyBadgeEmojiForRank(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank <= 3) return "🥈";
  if (rank <= 10) return "🏅";
  return "";
}

export function weeklyChallengeLabelKo(challenge: string): string {
  const map: Record<string, string> = {
    "Enter Weekly Top 10": "Weekly Top 10 진입",
    "Reach Top 3": "Top 3 도전",
    "Push for #1": "1위 도전",
    "Defend #1": "1위 수비",
  };
  return map[challenge] ?? challenge;
}

/**
 * J3-4 — Team Avatar Ranking read-only projection (playerGrowthAvatar team scope)
 */
import {
  computeSeasonJourneyDelta30d,
} from "@/lib/ai-growth/seasonJourneyView";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";

export const TEAM_AVATAR_RANKING_COACH_MAX_ROWS = 20;

export type TeamAvatarRankingRow = {
  rank: number;
  playerId: string;
  playerName: string;
  ovr: number;
  level: number;
  badgeCount: number;
  delta30d: number | null;
  delta30dLabel: string;
  isFocusPlayer: boolean;
};

export type TeamAvatarRankingView = {
  teamLabel: string;
  rankedCount: number;
  topThree: TeamAvatarRankingRow[];
  focusPlayer: TeamAvatarRankingRow | null;
  focusRankLabel: string;
  rows: TeamAvatarRankingRow[];
};

export type TeamAvatarRankingAvatarInput = {
  playerId: string;
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
  timeline: PlayerGrowthTimeline | null;
};

function formatSignedDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

function sortRankingInputs(inputs: TeamAvatarRankingAvatarInput[]): TeamAvatarRankingAvatarInput[] {
  return [...inputs].sort((a, b) => {
    const ovrDiff = b.avatar.ovr - a.avatar.ovr;
    if (ovrDiff !== 0) return ovrDiff;

    const levelDiff = b.avatar.level - a.avatar.level;
    if (levelDiff !== 0) return levelDiff;

    const badgeDiff = b.avatar.badges.length - a.avatar.badges.length;
    if (badgeDiff !== 0) return badgeDiff;

    return a.playerId.localeCompare(b.playerId);
  });
}

function toRankingRow(
  input: TeamAvatarRankingAvatarInput,
  rank: number,
  focusPlayerId?: string
): TeamAvatarRankingRow {
  const delta30d = computeSeasonJourneyDelta30d(
    input.avatar.ovr,
    input.timeline?.points ?? []
  );

  return {
    rank,
    playerId: input.playerId,
    playerName: input.playerName,
    ovr: input.avatar.ovr,
    level: input.avatar.level,
    badgeCount: input.avatar.badges.length,
    delta30d,
    delta30dLabel: delta30d != null ? formatSignedDelta(delta30d) : "—",
    isFocusPlayer: focusPlayerId != null && input.playerId === focusPlayerId,
  };
}

export function buildTeamAvatarRankingView(input: {
  teamName: string;
  avatars: TeamAvatarRankingAvatarInput[];
  focusPlayerId?: string;
  maxCoachRows?: number;
}): TeamAvatarRankingView {
  const sorted = sortRankingInputs(input.avatars);
  const rows = sorted.map((entry, index) =>
    toRankingRow(entry, index + 1, input.focusPlayerId)
  );
  const maxCoachRows = input.maxCoachRows ?? TEAM_AVATAR_RANKING_COACH_MAX_ROWS;
  const focusPlayer = rows.find((row) => row.isFocusPlayer) ?? null;

  return {
    teamLabel: input.teamName,
    rankedCount: rows.length,
    topThree: rows.slice(0, 3),
    focusPlayer,
    focusRankLabel: focusPlayer
      ? `팀 ${focusPlayer.rank}위 / ${rows.length}명`
      : rows.length > 0
        ? `팀 ${rows.length}명`
        : "—",
    rows: rows.slice(0, maxCoachRows),
  };
}

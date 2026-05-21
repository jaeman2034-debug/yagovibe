/**
 * team_games.playParticipation → 시뮬용 출전 가중·쿼터 길이
 */
import type { TeamGame } from "@/types/teamGame";
import type { PlayPlayerStatsDoc } from "@/utils/playerStats";

export type LineupSimSource = "actual" | "roster" | "fallback";

export type LineupPickContext = {
  lineupSource: LineupSimSource;
  /** 비어 있으면 전 로스터 균등(로스터 모드와 동일) */
  weightByMember: Map<string, { w: number; snapshotPosition?: string }>;
};

const DEFAULT_QUARTER_PLAN = [15, 15, 15, 15] as const;

export function normalizeQuarterMinutePlan(raw: number[] | undefined): number[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...DEFAULT_QUARTER_PLAN];
  }
  const cleaned = raw
    .map((x) => Math.round(Number(x)))
    .filter((x) => Number.isFinite(x) && x > 0)
    .map((x) => Math.max(5, Math.min(45, x)));
  return cleaned.length > 0 ? cleaned : [...DEFAULT_QUARTER_PLAN];
}

/** 쿼터 경계(누적 분) — 시뮬 총 시간에 맞게 스케일 */
export function scaledQuarterEnds(quarterPlan: readonly number[], simTotalMinutes: number): number[] {
  const plan = normalizeQuarterMinutePlan([...quarterPlan]);
  const sum = plan.reduce((a, b) => a + b, 0) || 60;
  const scale = Math.max(12, simTotalMinutes) / sum;
  const ends: number[] = [];
  let acc = 0;
  for (const q of plan) {
    acc += q * scale;
    ends.push(Math.round(acc));
  }
  return ends;
}

export function minuteToQuarter(minute: number, ends: readonly number[]): number | undefined {
  if (!ends.length) return undefined;
  for (let i = 0; i < ends.length; i++) {
    if (minute <= ends[i]) return i + 1;
  }
  return ends.length;
}

function clampW(x: number): number {
  return Math.max(0.08, Math.min(1.55, x));
}

/**
 * 특정 팀에 대해 출전 맵 생성
 * - playParticipation.entries 있으면 actual
 * - 로스터가 비었으면 fallback
 */
export function buildLineupPickContextForTeam(
  teamId: string,
  game: TeamGame | null | undefined,
  roster: readonly PlayPlayerStatsDoc[],
  simTotalMinutes: number
): LineupPickContext {
  if (!roster.length) {
    return { lineupSource: "fallback", weightByMember: new Map() };
  }

  const entries = game?.playParticipation?.byTeam?.[teamId]?.entries;
  if (!entries?.length) {
    return { lineupSource: "roster", weightByMember: new Map() };
  }

  const totalM = Math.max(24, simTotalMinutes);
  const map = new Map<string, { w: number; snapshotPosition?: string }>();

  for (const e of entries) {
    const mid = typeof e.memberId === "string" ? e.memberId.trim() : "";
    if (!mid) continue;
    let raw = 0.55;
    const mp = e.minutesPlayed;
    const qp = e.quartersPlayed;
    if (typeof mp === "number" && Number.isFinite(mp) && mp >= 0) {
      raw = mp / Math.max(totalM, 1);
    } else if (typeof qp === "number" && Number.isFinite(qp) && qp > 0) {
      raw = qp / 4;
    }
    /** 출전 많을수록↑, 로스터독점 방지 블렌드 */
    const blended = clampW(0.18 + raw * 1.08);
    const snap = typeof e.snapshotPosition === "string" ? e.snapshotPosition.trim() : "";
    map.set(mid, {
      w: blended,
      snapshotPosition: snap || undefined,
    });
  }

  return { lineupSource: "actual", weightByMember: map };
}

export function resolveActorPosition(actor: PlayPlayerStatsDoc, snapshot?: string): string {
  const s = snapshot?.trim();
  if (s) return s;
  return actor.mainPosition ?? "—";
}

/** 하이라이트 멤버가 실제 출전표에 포함·가중되어 있는지 */
export function highlightUsedActualParticipation(
  lineup: LineupPickContext,
  highlightMemberId: string | undefined
): boolean {
  const h = highlightMemberId?.trim();
  if (!h || lineup.lineupSource !== "actual") return false;
  const row = lineup.weightByMember.get(h);
  return !!row && row.w >= 0.28;
}

import type { MatchmakingMode } from "@/lib/matchmaking/types";
import type { TeamId } from "./teamMatchTypes";
import { getLiveFieldLayout, type FieldLayoutMode } from "@/lib/live/liveFieldLayout";

export type TeamSpawnSlot = {
  team: TeamId;
  role: string;
  x: number;
  y: number;
};

/** 5v5 landscape — 좌(A) / 우(B) */
const TEAM_A_5V5_LAND: Omit<TeamSpawnSlot, "team">[] = [
  { role: "GK", x: 0.08, y: 0.5 },
  { role: "LB", x: 0.22, y: 0.28 },
  { role: "CB", x: 0.22, y: 0.5 },
  { role: "RB", x: 0.22, y: 0.72 },
  { role: "ST", x: 0.38, y: 0.5 },
];

const TEAM_B_5V5_LAND: Omit<TeamSpawnSlot, "team">[] = [
  { role: "GK", x: 0.92, y: 0.5 },
  { role: "LB", x: 0.78, y: 0.72 },
  { role: "CB", x: 0.78, y: 0.5 },
  { role: "RB", x: 0.78, y: 0.28 },
  { role: "ST", x: 0.62, y: 0.5 },
];

/** 5v5 portrait — A=HOME 아래, B=AWAY 위 */
const TEAM_A_5V5_PORT: Omit<TeamSpawnSlot, "team">[] = [
  { role: "GK", x: 0.5, y: 0.88 },
  { role: "LB", x: 0.22, y: 0.76 },
  { role: "CB", x: 0.5, y: 0.76 },
  { role: "RB", x: 0.78, y: 0.76 },
  { role: "ST", x: 0.5, y: 0.66 },
];

const TEAM_B_5V5_PORT: Omit<TeamSpawnSlot, "team">[] = [
  { role: "GK", x: 0.5, y: 0.12 },
  { role: "LB", x: 0.78, y: 0.24 },
  { role: "CB", x: 0.5, y: 0.24 },
  { role: "RB", x: 0.22, y: 0.24 },
  { role: "ST", x: 0.5, y: 0.34 },
];

const TEAM_A_8V8_LAND: Omit<TeamSpawnSlot, "team">[] = [
  { role: "GK", x: 0.07, y: 0.5 },
  { role: "D1", x: 0.18, y: 0.25 },
  { role: "D2", x: 0.18, y: 0.5 },
  { role: "D3", x: 0.18, y: 0.75 },
  { role: "M1", x: 0.32, y: 0.35 },
  { role: "M2", x: 0.32, y: 0.65 },
  { role: "F1", x: 0.42, y: 0.35 },
  { role: "F2", x: 0.42, y: 0.65 },
];

const TEAM_B_8V8_LAND: Omit<TeamSpawnSlot, "team">[] = TEAM_A_8V8_LAND.map((s) => ({
  ...s,
  x: 1 - s.x,
  y: s.y,
}));

const TEAM_A_8V8_PORT: Omit<TeamSpawnSlot, "team">[] = [
  { role: "GK", x: 0.5, y: 0.9 },
  { role: "D1", x: 0.2, y: 0.78 },
  { role: "D2", x: 0.4, y: 0.78 },
  { role: "D3", x: 0.6, y: 0.78 },
  { role: "M1", x: 0.3, y: 0.66 },
  { role: "M2", x: 0.7, y: 0.66 },
  { role: "F1", x: 0.35, y: 0.56 },
  { role: "F2", x: 0.65, y: 0.56 },
];

const TEAM_B_8V8_PORT: Omit<TeamSpawnSlot, "team">[] = TEAM_A_8V8_PORT.map((s) => ({
  ...s,
  y: 1 - s.y,
}));

function pickFormation(
  layoutMode: FieldLayoutMode,
  modeId: MatchmakingMode,
): { a: Omit<TeamSpawnSlot, "team">[]; b: Omit<TeamSpawnSlot, "team">[] } {
  const port = layoutMode === "portrait";
  if (modeId === "8v8") {
    return port
      ? { a: TEAM_A_8V8_PORT, b: TEAM_B_8V8_PORT }
      : { a: TEAM_A_8V8_LAND, b: TEAM_B_8V8_LAND };
  }
  return port
    ? { a: TEAM_A_5V5_PORT, b: TEAM_B_5V5_PORT }
    : { a: TEAM_A_5V5_LAND, b: TEAM_B_5V5_LAND };
}

function toWorldSlots(layoutMode: FieldLayoutMode, modeId: MatchmakingMode): TeamSpawnSlot[] {
  const layout = getLiveFieldLayout(layoutMode);
  const { w, h } = layout;
  const { a, b } = pickFormation(layoutMode, modeId);
  const mapSide = (team: TeamId, slots: Omit<TeamSpawnSlot, "team">[]): TeamSpawnSlot[] =>
    slots.map((s) => ({
      team,
      role: s.role,
      x: s.x * w,
      y: s.y * h,
    }));
  return [...mapSide("A", a), ...mapSide("B", b)];
}

/** 세션 참가 uid → 팀·스폰 (DEV 2명이면 A HOME / B AWAY) */
export function assignTeamSpawns(
  playerUids: string[],
  mode: MatchmakingMode,
  fieldLayoutMode: FieldLayoutMode = "landscape",
): Record<string, TeamSpawnSlot & { x: number; y: number }> {
  const slots = toWorldSlots(fieldLayoutMode, mode);
  const sorted = [...new Set(playerUids.filter(Boolean))].sort();
  const out: Record<string, TeamSpawnSlot & { x: number; y: number }> = {};

  const teamASlots = slots.filter((s) => s.team === "A");
  const teamBSlots = slots.filter((s) => s.team === "B");

  sorted.forEach((uid, i) => {
    const team: TeamId = i % 2 === 0 ? "A" : "B";
    const pool = team === "A" ? teamASlots : teamBSlots;
    const slotIndex = Math.floor(i / 2) % pool.length;
    const slot = pool[slotIndex] ?? pool[0];
    out[uid] = { ...slot };
  });

  return out;
}

export function defaultTeamBallPosition(fieldLayoutMode: FieldLayoutMode = "landscape"): {
  x: number;
  y: number;
} {
  const layout = getLiveFieldLayout(fieldLayoutMode);
  return { x: layout.w / 2, y: layout.h / 2 };
}

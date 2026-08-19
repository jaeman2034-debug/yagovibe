/**
 * J3-1 — Mission System read-only projection
 * SoT: playerGrowthAvatar + playerGrowthHistory (today session metrics)
 */
import { buildAvatarGrowthRecommendations } from "@/lib/ai-growth/avatarGrowthRecommendationEngine";
import type { GrowthStatAxis } from "@/lib/ai-growth/avatarGrowthRecommendationTypes";
import { badgeMetaById } from "@/lib/ai-growth/avatarGrowthEngine";
import type { GrowthAvatarLevel } from "@/lib/ai-growth/growthAvatarLevel";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { PlayerGrowthSessionDoc } from "@/lib/ai-growth/playerGrowthHistoryTypes";

const LEVEL_UP_OVR_TARGET: Record<GrowthAvatarLevel, number | null> = {
  1: 75,
  2: 80,
  3: 85,
  4: 90,
  5: null,
};

export type MissionId =
  | "MISSION_VISION"
  | "MISSION_PRESSURE"
  | "MISSION_RECOVERY"
  | "MISSION_OVR";

export type MissionSlice = {
  id: MissionId;
  label: string;
  current: number;
  target: number;
  progress: number;
  completed: boolean;
  reward: string;
};

export type MissionSystemView = {
  todayMission: MissionSlice;
  progress: number;
  reward: string;
  nextMission: MissionSlice | null;
  missions: MissionSlice[];
  completedCount: number;
  totalCount: number;
};

type TodayMetrics = {
  scanCount: number;
  pressureResistanceCount: number;
  recoveryCount: number;
};

function computeProgress(current: number, target: number): number {
  if (target <= 0) return 100;
  return Math.min(100, Math.floor((current / target) * 100));
}

export function isSessionToday(generatedAt: number, now = Date.now()): boolean {
  const sessionDate = new Date(generatedAt);
  const today = new Date(now);
  return (
    sessionDate.getFullYear() === today.getFullYear() &&
    sessionDate.getMonth() === today.getMonth() &&
    sessionDate.getDate() === today.getDate()
  );
}

export function aggregateTodaySessionMetrics(
  sessions: PlayerGrowthSessionDoc[],
  now = Date.now()
): TodayMetrics {
  let scanCount = 0;
  let pressureResistanceCount = 0;
  let recoveryCount = 0;

  for (const session of sessions) {
    if (!isSessionToday(session.generatedAt, now)) continue;
    scanCount += session.metrics.scanCount ?? 0;
    pressureResistanceCount += session.metrics.pressureResistanceCount ?? 0;
    recoveryCount += session.metrics.recoveryCount ?? 0;
  }

  return { scanCount, pressureResistanceCount, recoveryCount };
}

function missionIdForPrimaryStat(stat: GrowthStatAxis): MissionId {
  if (stat === "vision") return "MISSION_VISION";
  if (stat === "pressure") return "MISSION_PRESSURE";
  return "MISSION_RECOVERY";
}

function buildMissionSlice(
  id: MissionId,
  avatar: PlayerGrowthAvatarDoc,
  todayMetrics: TodayMetrics
): MissionSlice {
  switch (id) {
    case "MISSION_VISION": {
      const current = todayMetrics.scanCount;
      const target = 3;
      return {
        id,
        label: "시야 확보 3회",
        current,
        target,
        progress: computeProgress(current, target),
        completed: current >= target,
        reward: "+ Avatar XP 30",
      };
    }
    case "MISSION_PRESSURE": {
      const current = todayMetrics.pressureResistanceCount;
      const target = 2;
      return {
        id,
        label: "압박 탈출 2회",
        current,
        target,
        progress: computeProgress(current, target),
        completed: current >= target,
        reward: "+ Avatar XP 30",
      };
    }
    case "MISSION_RECOVERY": {
      const current = avatar.recovery;
      const target = 80;
      return {
        id,
        label: "Recovery 80 달성",
        current,
        target,
        progress: computeProgress(current, target),
        completed: current >= target,
        reward: badgeMetaById("recovery_runner").labelKo,
      };
    }
    case "MISSION_OVR": {
      const level = avatar.level as GrowthAvatarLevel;
      const target = LEVEL_UP_OVR_TARGET[level] ?? avatar.ovr;
      const current = avatar.ovr;
      return {
        id,
        label: `OVR ${target} 달성`,
        current,
        target,
        progress: computeProgress(current, target),
        completed: current >= target,
        reward: "+ Avatar XP 50",
      };
    }
  }
}

const MISSION_ORDER: MissionId[] = [
  "MISSION_VISION",
  "MISSION_PRESSURE",
  "MISSION_RECOVERY",
  "MISSION_OVR",
];

export function buildMissionSystemView(input: {
  avatar: PlayerGrowthAvatarDoc;
  todaySessions: PlayerGrowthSessionDoc[];
  now?: number;
}): MissionSystemView {
  const { avatar, todaySessions, now = Date.now() } = input;
  const todayMetrics = aggregateTodaySessionMetrics(todaySessions, now);
  const missions = MISSION_ORDER.map((id) => buildMissionSlice(id, avatar, todayMetrics));

  const bundle = buildAvatarGrowthRecommendations(avatar, 4);
  const preferredId = missionIdForPrimaryStat(bundle.primaryStat);
  const todayMission = missions.find((m) => m.id === preferredId) ?? missions[0]!;

  const nextMission =
    missions.find((m) => m.id !== todayMission.id && !m.completed) ??
    missions.find((m) => !m.completed && m.id !== todayMission.id) ??
    null;

  const completedCount = missions.filter((m) => m.completed).length;

  return {
    todayMission,
    progress: todayMission.progress,
    reward: todayMission.reward,
    nextMission,
    missions,
    completedCount,
    totalCount: missions.length,
  };
}

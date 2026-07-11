/**
 * Vision v6-5 — build PlayerIntelligenceView (no Firestore I/O)
 */

import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import { formatGrowthTimelineScoreChain } from "@/lib/ai-growth/growthTimelineDisplay";
import { canShowGrowthTimelineChart } from "@/lib/ai-growth/growthTimelineDisplay";
import { analyzeVisionResultFromData } from "@/lib/vision/visionService";
import {
  findPlayerFiiEntry,
  isIdentityPlaymaker,
  resolvePlayerIdentity,
  type ResolvedPlayerIdentity,
} from "@/lib/vision/playerIdentityResolver";
import type {
  PlayerIntelligencePersona,
  PlayerIntelligenceView,
} from "@/lib/vision/playerIntelligenceTypes";
import {
  VISION_ANALYSIS_FIRESTORE_SCHEMA_VERSION,
  type VisionResult,
} from "@/lib/vision/visionTypes";

export type BuildPlayerIntelligenceInput = {
  teamId: string;
  playerId: string;
  teamName: string;
  playerName: string;
  persona: PlayerIntelligencePersona;
  matchId?: string | null;
  matchLabel?: string | null;
  trackId?: string;
  uid?: string;
  memberId?: string;
  visionResult?: VisionResult | null;
  growthAvatar?: PlayerGrowthAvatarDoc | null;
  timeline?: PlayerGrowthTimeline | null;
  visionResultSchemaVersion?: string;
  firestoreSchemaVersion?: number;
};

function buildVersion(input: BuildPlayerIntelligenceInput): PlayerIntelligenceView["version"] {
  const schemaNum =
    input.firestoreSchemaVersion ?? VISION_ANALYSIS_FIRESTORE_SCHEMA_VERSION;
  return {
    visionEngine: "Vision Engine v6.2",
    schema: `Schema v${schemaNum}`,
    detectionModel: "YOLO11",
    trackingModel: "ByteTrack",
    fiiEngine: "FII v2",
  };
}

function growthTrendLabel(timeline: PlayerGrowthTimeline | null | undefined): string | null {
  if (!timeline || !canShowGrowthTimelineChart(timeline)) return null;
  return formatGrowthTimelineScoreChain(timeline.points.map((p) => p.score));
}

export function buildPlayerIntelligenceView(
  input: BuildPlayerIntelligenceInput
): PlayerIntelligenceView {
  const identity: ResolvedPlayerIdentity = resolvePlayerIdentity({
    teamId: input.teamId,
    playerId: input.playerId,
    uid: input.uid,
    memberId: input.memberId,
    trackId: input.trackId,
  });
  identity.displayName = input.playerName.trim() || identity.displayName;

  const avatar = input.growthAvatar ?? null;
  const visionResult = input.visionResult ?? null;
  const hasVision = Boolean(visionResult);
  const coachSummary = hasVision ? analyzeVisionResultFromData(visionResult!) : null;
  const fiiEntry = hasVision
    ? findPlayerFiiEntry(visionResult!.playerFii, identity)
    : null;
  const playmakerHit = hasVision
    ? isIdentityPlaymaker(visionResult!.playmaker, identity)
    : false;

  const recommendation =
    coachSummary?.recommendation?.trim() ||
    visionResult?.tacticalReport?.recommendations?.[0]?.trim() ||
    "경기·훈련 데이터가 쌓이면 맞춤 코칭 포인트가 표시됩니다.";

  const headline = fiiEntry
    ? `${input.playerName} · FII ${fiiEntry.fii}${fiiEntry.rank != null ? ` (팀 ${fiiEntry.rank}위)` : ""}`
    : avatar
      ? `${input.playerName} · OVR ${avatar.ovr}`
      : `${input.playerName} · Player Intelligence`;

  return {
    identity,
    persona: input.persona,
    matchId: input.matchId?.trim() || null,
    summary: {
      playerName: input.playerName.trim() || "선수",
      teamName: input.teamName.trim() || "팀",
      matchLabel: input.matchLabel?.trim() || null,
      headline,
    },
    growth: {
      ovr: avatar?.ovr ?? null,
      level: avatar?.level ?? null,
      sessionCount: avatar?.sessionCount ?? 0,
      trendLabel: growthTrendLabel(input.timeline),
      badgeCount: avatar?.badges?.length ?? 0,
    },
    fii: {
      score: fiiEntry?.fii ?? null,
      rank: fiiEntry?.rank ?? null,
      rankTotal: hasVision ? visionResult!.playerFii.length : null,
      axes: fiiEntry?.axes ?? null,
    },
    vision: {
      hasAnalysis: hasVision,
      forwardPassRate: coachSummary?.forwardPassRate ?? null,
      bestPressureZone: coachSummary?.bestPressureZone ?? null,
      compactness: coachSummary?.compactness ?? null,
      tacticalSummary: visionResult?.tacticalReport?.summary?.trim() || null,
      tacticalStrengths: visionResult?.tacticalReport?.strengths?.filter(Boolean) ?? [],
    },
    playmaker: {
      isPlaymaker: playmakerHit,
      contributionLabel: playmakerHit
        ? "이번 경기 팀 Playmaker로 분석되었습니다."
        : visionResult?.playmaker
          ? "팀 Playmaker는 다른 선수입니다."
          : "Playmaker 데이터 없음",
      score: playmakerHit ? (visionResult?.playmaker?.score ?? null) : null,
    },
    avatar: {
      tier: avatar?.tier ?? null,
      visionStat: avatar?.vision ?? null,
      pressureStat: avatar?.pressure ?? null,
      recoveryStat: avatar?.recovery ?? null,
    },
    recommendation,
    version: buildVersion(input),
  };
}

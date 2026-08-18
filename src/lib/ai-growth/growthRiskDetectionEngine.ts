import { buildAvatarGrowthRecommendations } from "@/lib/ai-growth/avatarGrowthRecommendationEngine";
import type { AvatarGrowthRecommendation } from "@/lib/ai-growth/avatarGrowthRecommendationTypes";
import {
  ATTENDANCE_RISK_THRESHOLD_PCT,
  buildGrowthRiskId,
  RECOVERY_RISK_THRESHOLD,
  STAGNATION_MIN_POINTS,
  type GrowthRiskSignal,
  type GrowthRiskType,
} from "@/lib/ai-growth/growthRiskTypes";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import { formatWeeklyOvrLine } from "@/lib/ai-growth/weeklyGrowthDigestEngine";

export type GrowthRiskDetectionInput = {
  avatar: PlayerGrowthAvatarDoc;
  timeline: PlayerGrowthTimeline | null;
  attendanceRatePct: number | null;
};

export type GrowthRiskAnalysisResult = {
  risks: GrowthRiskSignal[];
  recommendations: AvatarGrowthRecommendation[];
  ovrLine: string | null;
  recoveryValue: number;
  recoveryTarget: number;
};

function scoreFromPoint(point: { ovr?: number; score: number }): number {
  return point.ovr ?? point.score;
}

function detectStagnation(timeline: PlayerGrowthTimeline | null): GrowthRiskSignal | null {
  const points = timeline?.points ?? [];
  if (points.length < STAGNATION_MIN_POINTS) return null;

  const last5 = points.slice(-STAGNATION_MIN_POINTS);
  const scores = last5.map(scoreFromPoint);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max - min !== 0) return null;

  const chain = scores.join(" · ");
  return {
    id: buildGrowthRiskId("STAGNATION"),
    type: "STAGNATION",
    severity: "caution",
    emoji: "📊",
    title: "성장 정체 감지",
    body: "최근 5회 동안 성장 변화가 없습니다.",
    detail: chain,
  };
}

function detectDecline(avatar: PlayerGrowthAvatarDoc): GrowthRiskSignal | null {
  const delta = avatar.weeklyDeltaOvr;
  if (delta == null || delta >= 0) return null;

  const after = avatar.ovr;
  const before = after - delta;
  return {
    id: buildGrowthRiskId("DECLINE"),
    type: "DECLINE",
    severity: "warning",
    emoji: "📉",
    title: "성장 하락 감지",
    body: "최근 성장 점수가 감소했습니다.",
    detail: `OVR ${before} → ${after}`,
  };
}

function detectRecoveryLow(avatar: PlayerGrowthAvatarDoc): GrowthRiskSignal | null {
  const recovery = avatar.recovery;
  if (recovery >= RECOVERY_RISK_THRESHOLD) return null;

  return {
    id: buildGrowthRiskId("RECOVERY_LOW"),
    type: "RECOVERY_LOW",
    severity: "warning",
    emoji: "⚠️",
    title: "Recovery 집중 관리 필요",
    body: `Recovery ${recovery} — 목표 ${RECOVERY_RISK_THRESHOLD}`,
    detail: `${recovery} / 목표 ${RECOVERY_RISK_THRESHOLD}`,
  };
}

function detectAttendanceLow(attendanceRatePct: number | null): GrowthRiskSignal | null {
  if (attendanceRatePct == null || attendanceRatePct >= ATTENDANCE_RISK_THRESHOLD_PCT) return null;

  return {
    id: buildGrowthRiskId("ATTENDANCE_LOW"),
    type: "ATTENDANCE_LOW",
    severity: "caution",
    emoji: "📅",
    title: "훈련 참여 부족",
    body: `최근 출석률 ${attendanceRatePct}%`,
    detail: `목표 ${ATTENDANCE_RISK_THRESHOLD_PCT}% 이상`,
  };
}

const RISK_PRIORITY: Record<GrowthRiskType, number> = {
  DECLINE: 1,
  RECOVERY_LOW: 2,
  STAGNATION: 3,
  ATTENDANCE_LOW: 4,
};

function linkRecommendationsToRisks(
  avatar: PlayerGrowthAvatarDoc,
  risks: GrowthRiskSignal[]
): AvatarGrowthRecommendation[] {
  if (risks.length === 0) return [];

  const bundle = buildAvatarGrowthRecommendations(avatar, 5);
  const out: AvatarGrowthRecommendation[] = [];

  const hasRecoveryRisk = risks.some((r) => r.type === "RECOVERY_LOW");
  const hasDecline = risks.some((r) => r.type === "DECLINE");

  if (hasRecoveryRisk || hasDecline) {
    const focus = bundle.recommendations.find((r) => r.kind === "training_focus");
    if (focus) out.push(focus);
  }

  if (hasRecoveryRisk) {
    const recoveryBadge = bundle.recommendations.find(
      (r) => r.kind === "badge" && r.stat === "recovery"
    );
    if (recoveryBadge) out.push(recoveryBadge);
  }

  for (const rec of bundle.recommendations) {
    if (out.length >= 3) break;
    if (out.some((x) => x.id === rec.id)) continue;
    out.push(rec);
  }

  return out.slice(0, 3);
}

/** Sprint D-5.4 — Risk Rules Engine */
export function analyzeGrowthRisks(input: GrowthRiskDetectionInput): GrowthRiskAnalysisResult {
  const risks: GrowthRiskSignal[] = [];

  const decline = detectDecline(input.avatar);
  if (decline) risks.push(decline);

  const recovery = detectRecoveryLow(input.avatar);
  if (recovery) risks.push(recovery);

  const stagnation = detectStagnation(input.timeline);
  if (stagnation) risks.push(stagnation);

  const attendance = detectAttendanceLow(input.attendanceRatePct);
  if (attendance) risks.push(attendance);

  risks.sort((a, b) => RISK_PRIORITY[a.type] - RISK_PRIORITY[b.type]);

  const delta = input.avatar.weeklyDeltaOvr ?? null;
  const ovrLine =
    delta != null && delta < 0
      ? formatWeeklyOvrLine({
          ovrBefore: input.avatar.ovr - delta,
          ovrAfter: input.avatar.ovr,
          ovrDelta: delta,
          newBadges: [],
          focusRecommendation: null,
          nextGoal: null,
          timelineDelta: delta,
        })
      : null;

  return {
    risks,
    recommendations: linkRecommendationsToRisks(input.avatar, risks),
    ovrLine,
    recoveryValue: input.avatar.recovery,
    recoveryTarget: RECOVERY_RISK_THRESHOLD,
  };
}

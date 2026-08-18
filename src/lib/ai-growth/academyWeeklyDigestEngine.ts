import type { AcademyAttendanceDigest } from "@/lib/ai-growth/academyAttendanceIntelligenceTypes";
import type { AcademyWeeklyDigest, AcademyWeeklyDigestAiSummary } from "@/lib/ai-growth/academyWeeklyDigestTypes";
import type {
  TeamGrowthIntelligenceResult,
  TeamPlayerGrowthRow,
} from "@/lib/ai-growth/teamGrowthIntelligenceTypes";
import type { TeamWeeklyDigest } from "@/lib/ai-growth/teamWeeklyDigestTypes";

export type AcademyWeeklyDigestInput = {
  academyName: string;
  teamIntelligence: TeamGrowthIntelligenceResult;
  /** F-1 multi-team 확장용 — 파일럿 기본 1 */
  teamCount?: number;
  /** F-2.1-d — 출석 운영 요약 연동 */
  attendanceDigest?: AcademyAttendanceDigest | null;
};

function formatSignedDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function aggregateAvgOvrDelta(rows: TeamPlayerGrowthRow[]): number | null {
  const deltas = rows
    .map((row) => row.avatar.weeklyDeltaOvr)
    .filter((value): value is number => typeof value === "number");
  if (deltas.length === 0) return null;
  return Math.round(deltas.reduce((sum, value) => sum + value, 0) / deltas.length);
}

function buildAcademyWeeklyAiSummary(
  academyName: string,
  teamCount: number,
  weeklyDigest: TeamWeeklyDigest,
  avgOvrDelta: number | null,
  attendanceDigest?: AcademyAttendanceDigest | null
): AcademyWeeklyDigestAiSummary {
  const name = academyName.trim() || "아카데미";
  const paragraphs: string[] = [];

  paragraphs.push(
    `${name} 아카데미는 ${weeklyDigest.weekLabel}에 ${weeklyDigest.trackedPlayers}명의 성장을 추적했습니다.`,
    `소속 팀 ${teamCount}개 · 등록 ${weeklyDigest.rosterCount}명 기준으로 평균 OVR ${weeklyDigest.avgOvr}, 평균 Level ${weeklyDigest.avgLevel}입니다.`
  );

  if (avgOvrDelta !== null && avgOvrDelta !== 0) {
    paragraphs.push(`이번 주 아카데미 평균 OVR 변화는 ${formatSignedDelta(avgOvrDelta)}입니다.`);
  }

  if (weeklyDigest.newBadges.length > 0) {
    paragraphs.push(
      `신규 배지 ${weeklyDigest.newBadges.length}건: ${weeklyDigest.newBadges.join(", ")}.`
    );
  }

  if (weeklyDigest.riskPlayerCount > 0) {
    const names = weeklyDigest.riskPlayers.slice(0, 3).map((player) => player.playerName);
    paragraphs.push(
      `위험 선수 ${weeklyDigest.riskPlayerCount}명(${names.join(", ")})에 대한 코치 개입이 필요합니다.`
    );
  } else {
    paragraphs.push("이번 주 아카데미 전체에 즉시 대응이 필요한 위험 신호는 없습니다.");
  }

  if (weeklyDigest.focusTraining) {
    paragraphs.push(`다음 주 아카데미 집중 훈련: ${weeklyDigest.focusTraining}.`);
  }

  if (attendanceDigest && attendanceDigest.summaryLines.length > 0) {
    paragraphs.push(
      `출석 운영: ${attendanceDigest.summaryLines.join(" · ")}.`
    );
  }

  const fullText = paragraphs.join("\n\n");
  return { paragraphs, fullText };
}

/** Sprint F-1.2 — E-1.2 TeamWeeklyDigest → 아카데미 주간 요약 롤업 */
export function buildAcademyWeeklyDigest(
  input: AcademyWeeklyDigestInput
): AcademyWeeklyDigest | null {
  const { teamIntelligence } = input;
  const weeklyDigest = teamIntelligence.weeklyDigest;
  if (!weeklyDigest) return null;

  const teamCount = input.teamCount ?? 1;
  const academyName = input.academyName.trim() || "아카데미";
  const avgOvrDelta = aggregateAvgOvrDelta(teamIntelligence.players);
  const summary = buildAcademyWeeklyAiSummary(
    academyName,
    teamCount,
    weeklyDigest,
    avgOvrDelta,
    input.attendanceDigest
  );

  return {
    weekKey: weeklyDigest.weekKey,
    weekLabel: weeklyDigest.weekLabel,
    academyName,
    teamCount,
    trackedPlayers: weeklyDigest.trackedPlayers,
    rosterCount: weeklyDigest.rosterCount,
    avgOvr: weeklyDigest.avgOvr,
    avgLevel: weeklyDigest.avgLevel,
    avgOvrDelta,
    riskPlayerCount: weeklyDigest.riskPlayerCount,
    newBadges: weeklyDigest.newBadges,
    focusTraining: weeklyDigest.focusTraining,
    summary,
  };
}

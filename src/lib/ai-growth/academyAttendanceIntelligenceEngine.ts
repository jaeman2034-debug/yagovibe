import type {
  AcademyAttendanceAiSummary,
  AcademyAttendanceDigest,
  AcademyAttendanceIntelligenceResult,
  AcademyAttendanceKpi,
  AcademyAttendanceRiskPlayer,
} from "@/lib/ai-growth/academyAttendanceIntelligenceTypes";
import {
  buildAcademyAttendanceKpi,
  buildPlayerAttendanceMetrics,
  type PlayerSessionAttendance,
} from "@/lib/ai-growth/academyAttendanceMetrics";
import { buildAcademyAttendanceRiskPlayers } from "@/lib/ai-growth/academyAttendanceRiskEngine";

export type AcademyAttendanceIntelligenceInput = {
  academyName: string;
  players: Array<{
    playerId: string;
    playerName: string;
    sessions: PlayerSessionAttendance[];
  }>;
};

function buildAttendanceDigest(
  academyName: string,
  kpi: AcademyAttendanceKpi,
  atRiskPlayers: AcademyAttendanceRiskPlayer[]
): AcademyAttendanceDigest {
  const guardianFollowUpNeeded = atRiskPlayers.length > 0;
  const summaryLines: string[] = [];

  if (kpi.avgAttendanceRatePct !== null) {
    summaryLines.push(`평균 출석률 ${kpi.avgAttendanceRatePct}%`);
  }
  if (atRiskPlayers.length > 0) {
    summaryLines.push(`위험 선수 ${atRiskPlayers.length}명`);
  }
  if (kpi.consecutiveAbsencePlayerCount > 0) {
    summaryLines.push(`연속 결석 ${kpi.consecutiveAbsencePlayerCount}명`);
  }
  if (guardianFollowUpNeeded) {
    summaryLines.push("보호자 확인 필요");
  }

  return {
    headline: "이번 주 아카데미 운영 요약",
    avgAttendanceRatePct: kpi.avgAttendanceRatePct,
    atRiskPlayerCount: atRiskPlayers.length,
    consecutiveAbsencePlayerCount: kpi.consecutiveAbsencePlayerCount,
    guardianFollowUpNeeded,
    summaryLines,
  };
}

function buildAttendanceAiSummary(
  academyName: string,
  kpi: AcademyAttendanceKpi,
  atRiskPlayers: AcademyAttendanceRiskPlayer[],
  digest: AcademyAttendanceDigest
): AcademyAttendanceAiSummary {
  const name = academyName.trim() || "아카데미";
  const paragraphs: string[] = [];

  if (kpi.playersWithData === 0) {
    paragraphs.push(
      `${name} 아카데미의 최근 출석 기록이 없습니다.`,
      "세션 출석을 기록하면 출석 인텔리전스가 생성됩니다."
    );
    return { paragraphs, fullText: paragraphs.join("\n\n") };
  }

  paragraphs.push(
    `${name} 아카데미는 최근 ${kpi.playersWithData}명의 출석 데이터를 추적 중입니다.`
  );

  if (kpi.avgAttendanceRatePct !== null) {
    paragraphs.push(`평균 출석률은 ${kpi.avgAttendanceRatePct}%입니다.`);
  }

  if (atRiskPlayers.length > 0) {
    const names = atRiskPlayers.slice(0, 3).map((player) => player.playerName);
    paragraphs.push(
      `${names.join(", ")} 선수에게 출석 위험 신호가 감지되었습니다. 보호자 확인과 개별 연락이 권장됩니다.`
    );
  } else {
    paragraphs.push("현재 즉시 대응이 필요한 출석 위험 선수는 없습니다.");
  }

  if (digest.guardianFollowUpNeeded) {
    paragraphs.push("보호자 확인이 필요한 케이스가 있습니다.");
  }

  const fullText = paragraphs.join("\n\n");
  return { paragraphs, fullText };
}

function buildEmptyAttendanceIntelligence(
  academyName: string,
  rosterCount: number
): AcademyAttendanceIntelligenceResult {
  const kpi: AcademyAttendanceKpi = {
    avgAttendanceRatePct: null,
    avgLateRatePct: null,
    avgAbsentRatePct: null,
    atRiskPlayerCount: 0,
    consecutiveAbsencePlayerCount: 0,
    playersWithData: 0,
  };
  const digest: AcademyAttendanceDigest = {
    headline: "이번 주 아카데미 운영 요약",
    avgAttendanceRatePct: null,
    atRiskPlayerCount: 0,
    consecutiveAbsencePlayerCount: 0,
    guardianFollowUpNeeded: false,
    summaryLines: [
      rosterCount > 0
        ? `등록 ${rosterCount}명 · 출석 기록 대기 중`
        : "출석 기록 대기 중",
    ],
  };
  const aiSummary = buildAttendanceAiSummary(academyName, kpi, [], digest);

  return {
    headline: "출석 인텔리전스",
    kpi,
    atRiskPlayers: [],
    digest,
    aiSummary,
    isEmpty: true,
  };
}

/** Sprint F-2.1-a — 아카데미 출석 인텔리전스 */
export function buildAcademyAttendanceIntelligence(
  input: AcademyAttendanceIntelligenceInput
): AcademyAttendanceIntelligenceResult | null {
  if (input.players.length === 0) return null;

  const metrics = input.players
    .map((player) =>
      buildPlayerAttendanceMetrics({
        playerId: player.playerId,
        playerName: player.playerName,
        sessions: player.sessions,
      })
    )
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (metrics.length === 0) {
    return buildEmptyAttendanceIntelligence(input.academyName, input.players.length);
  }

  const atRiskPlayers = buildAcademyAttendanceRiskPlayers(metrics);
  const kpi: AcademyAttendanceKpi = {
    ...buildAcademyAttendanceKpi(metrics),
    atRiskPlayerCount: atRiskPlayers.length,
  };
  const digest = buildAttendanceDigest(input.academyName, kpi, atRiskPlayers);
  const aiSummary = buildAttendanceAiSummary(
    input.academyName,
    kpi,
    atRiskPlayers,
    digest
  );

  return {
    headline: "출석 인텔리전스",
    kpi,
    atRiskPlayers,
    digest,
    aiSummary,
  };
}

import type { GrowthScoreResult } from "@/lib/ai-growth/growthScore";
import { pickPrimaryStrengths } from "@/lib/ai-growth/growthScore";
import { scoreToGrowthLetterGrade } from "@/lib/ai-growth/growthLetterGrade";

export type ParentDeliveryShareMessage = {
  title: string;
  /** 카카오 피드 description · Web Share text */
  summary: string;
  /** 클립보드용 전체 문구 */
  clipText: string;
  strengths: string[];
  scoreLine: string | null;
};

/** Parent Delivery MVP — 학부모 전달용 공유 문구 (수동 카카오·링크 복사) */
export function buildParentDeliveryShareMessage(input: {
  playerName: string;
  shareUrl: string;
  growthScore: GrowthScoreResult | null;
}): ParentDeliveryShareMessage {
  const name = input.playerName.trim() || "선수";
  const title = `${name} 선수 성장 리포트`;

  const overall = input.growthScore?.snapshot.overall ?? null;
  const letter =
    overall !== null && overall > 0 ? scoreToGrowthLetterGrade(overall) : null;
  const scoreLine =
    overall !== null && overall > 0
      ? letter
        ? `${overall}점 (${letter})`
        : `${overall}점`
      : null;

  const strengths =
    input.growthScore != null ? pickPrimaryStrengths(input.growthScore.dimensions) : [];

  const strengthBlock =
    strengths.length > 0
      ? ["강점", ...strengths.map((s) => `✓ ${s}`)].join("\n")
      : "코치가 확인한 이번 훈련 성장 리포트입니다.";

  const summaryParts = [
    title,
    scoreLine ? scoreLine : null,
    strengthBlock,
    "상세 보기",
    input.shareUrl,
  ].filter(Boolean) as string[];

  const summary = summaryParts.join("\n\n");
  const clipText = summary;

  return {
    title,
    summary,
    clipText,
    strengths,
    scoreLine,
  };
}

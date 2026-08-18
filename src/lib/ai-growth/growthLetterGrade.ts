/** Sprint 8B-2 — Growth Score(0~100) → 학부모·PDF용 등급 배지 */

export const GROWTH_LETTER_GRADES = ["A+", "A", "A-", "B+", "B"] as const;

export type GrowthLetterGrade = (typeof GROWTH_LETTER_GRADES)[number];

export function scoreToGrowthLetterGrade(score: number): GrowthLetterGrade | null {
  if (!Number.isFinite(score) || score <= 0) return null;
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 75) return "B+";
  return "B";
}

const LETTER_HINT_KO: Record<GrowthLetterGrade, string> = {
  "A+": "또래 대비 매우 우수한 성장 신호가 관찰되었습니다.",
  A: "안정적으로 높은 성장 구간에 있습니다.",
  "A-": "평균 이상의 성장 흐름이 이어지고 있습니다.",
  "B+": "꾸준히 성장하는 구간입니다.",
  B: "핵심 습관을 쌓아가는 단계입니다.",
};

export function growthLetterGradeHint(grade: GrowthLetterGrade): string {
  return LETTER_HINT_KO[grade];
}

/** PDF 인라인 배지 (html-to-pdf) */
export function growthLetterGradePdfBadgeHtml(
  grade: GrowthLetterGrade,
  size: "hero" | "detail" = "detail",
): string {
  const styles: Record<GrowthLetterGrade, { bg: string; fg: string; border: string }> = {
    "A+": { bg: "#059669", fg: "#ffffff", border: "#047857" },
    A: { bg: "#10b981", fg: "#ffffff", border: "#059669" },
    "A-": { bg: "#d1fae5", fg: "#064e3b", border: "#6ee7b7" },
    "B+": { bg: "#3b82f6", fg: "#ffffff", border: "#2563eb" },
    B: { bg: "#f1f5f9", fg: "#334155", border: "#cbd5e1" },
  };
  const s = styles[grade];
  const fontSize = size === "hero" ? "52px" : "28px";
  const pad = size === "hero" ? "10px 22px" : "6px 14px";
  return `<span style="display:inline-block;padding:${pad};border-radius:12px;font-size:${fontSize};font-weight:900;letter-spacing:0.02em;background:${s.bg};color:${s.fg};border:2px solid ${s.border};">${grade}</span>`;
}

export function formatScoreWithLetterGrade(score: number | null): string {
  if (score === null) return "관찰 데이터 없음";
  const letter = scoreToGrowthLetterGrade(score);
  if (!letter) return String(score);
  return `${score}점 · ${letter}`;
}

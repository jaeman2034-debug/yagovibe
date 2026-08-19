/** Sprint P1 — FII · GEV · SCAN · PRESS 용어 설명 (VOC Pain #1 대응) */

export type YagoGlossaryTermId = "FII" | "GEV" | "SCAN" | "PRESS";

export type YagoGlossaryExample = {
  headline: string;
  body: string;
};

export type YagoGlossaryEntry = {
  id: YagoGlossaryTermId;
  label: string;
  fullName: string;
  /** 설명 본문 (줄바꿈 `\n` 허용) */
  body: string;
  example?: YagoGlossaryExample;
  /** PDF 각주 한 줄 — e.g. "FII = Football Intelligence Index" */
  pdfFootnote: string;
};

export const P1_GLOSSARY_TERM_IDS: YagoGlossaryTermId[] = ["FII", "GEV", "SCAN", "PRESS"];

export const YAGO_GLOSSARY: Record<YagoGlossaryTermId, YagoGlossaryEntry> = {
  FII: {
    id: "FII",
    label: "FII",
    fullName: "Football Intelligence Index",
    body: [
      "축구 이해도와 경기 판단 능력을",
      "종합 평가한 점수입니다.",
      "",
      "높을수록 상황 판단과",
      "경기 운영 능력이 좋습니다.",
    ].join("\n"),
    pdfFootnote: "FII = Football Intelligence Index",
  },
  GEV: {
    id: "GEV",
    label: "GEV",
    fullName: "Game Event Vocabulary",
    body: [
      "경기 중 발생한 주요 행동을",
      "AI가 분석한 이벤트입니다.",
      "",
      "예)",
      "압박",
      "패스",
      "공간 창출",
      "전환",
    ].join("\n"),
    pdfFootnote: "GEV = Game Event Vocabulary",
  },
  SCAN: {
    id: "SCAN",
    label: "SCAN",
    fullName: "SCAN",
    body: [
      "공을 받기 전",
      "주변 상황을 확인하는 행동입니다.",
      "",
      "높을수록 시야 활용 능력이 좋습니다.",
    ].join("\n"),
    example: {
      headline: "SCAN 88점",
      body: "공을 받기 전\n주변을 자주 확인함",
    },
    pdfFootnote: "SCAN = 공을 받기 전 주변 상황 확인 행동",
  },
  PRESS: {
    id: "PRESS",
    label: "PRESS",
    fullName: "PRESS",
    body: [
      "상대에게 압박을 가하는 능력입니다.",
      "",
      "높을수록 수비 적극성이 높습니다.",
    ].join("\n"),
    pdfFootnote: "PRESS = 상대에게 압박을 가하는 능력",
  },
};

/** Growth Score dimension key → glossary term */
export function glossaryTermFromGrowthDimensionKey(key: string): YagoGlossaryTermId | null {
  if (key === "SCAN") return "SCAN";
  if (key === "PRESS_RESIST" || key === "PRESS") return "PRESS";
  return null;
}

export function getGlossaryEntry(id: YagoGlossaryTermId): YagoGlossaryEntry {
  return YAGO_GLOSSARY[id];
}

export function buildGlossaryPdfFootnoteHtml(termIds: YagoGlossaryTermId[]): string {
  const lines = termIds.map((id) => `* ${YAGO_GLOSSARY[id].pdfFootnote}`);
  return lines.join("<br/>");
}

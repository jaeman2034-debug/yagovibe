type VoiceLogRow = {
  text?: string;
  intent?: string;
  keyword?: string;
  resultCount?: number;
};

/** Voice dashboard — local summary without OpenAI. */
export function buildVoiceLogSummary(rows: VoiceLogRow[]): string {
  if (!rows.length) return "표시할 로그가 없습니다.";
  const byIntent: Record<string, number> = {};
  const keywords: Record<string, number> = {};
  let resultSum = 0;
  let resultN = 0;
  for (const r of rows) {
    const intent = r.intent || "미확인";
    byIntent[intent] = (byIntent[intent] || 0) + 1;
    const kw = (r.keyword || "").trim();
    if (kw) keywords[kw] = (keywords[kw] || 0) + 1;
    if (typeof r.resultCount === "number") {
      resultSum += r.resultCount;
      resultN += 1;
    }
  }
  const topIntent = Object.entries(byIntent).sort((a, b) => b[1] - a[1])[0];
  const topKw = Object.entries(keywords).sort((a, b) => b[1] - a[1])[0];
  const avgResult = resultN ? (resultSum / resultN).toFixed(1) : "-";
  return [
    `총 ${rows.length}건`,
    topIntent ? `상위 intent: ${topIntent[0]} (${topIntent[1]}건)` : "",
    topKw ? `상위 keyword: ${topKw[0]} (${topKw[1]}회)` : "",
    `평균 검색 결과 수: ${avgResult}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

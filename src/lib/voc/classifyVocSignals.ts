/** Heuristic Pain / Request / Value tags (Interview Table v1 · I-2.3 seed) */

const PAIN_KEYWORDS = [
  "어렵",
  "불편",
  "복잡",
  "전문 용어",
  "fii",
  "gev",
  "2v1",
  "찾기",
  "매주",
  "부담",
];

const REQUEST_KEYWORDS = [
  "추가",
  "원해",
  "원함",
  "발송",
  "카카오",
  "자동",
  "dashboard",
  "월",
  "쉬운",
];

const VALUE_KEYWORDS = [
  "좋",
  "유용",
  "신뢰",
  "검증",
  "한눈",
  "이해",
  "도움",
  "trust",
];

function matchAny(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((k) => lower.includes(k.toLowerCase()));
}

export function classifyVocFromText(positiveText: string, painText: string, requestText: string) {
  const painPoints = [
    ...new Set([
      ...matchAny(painText, PAIN_KEYWORDS),
      ...(painText.trim() ? ["사용자 Pain"] : []),
    ]),
  ].filter(Boolean);

  const featureRequests = [
    ...new Set([
      ...matchAny(requestText, REQUEST_KEYWORDS),
      ...(requestText.trim() ? ["Feature Request"] : []),
    ]),
  ].filter(Boolean);

  const positiveSignals = [
    ...new Set([
      ...matchAny(positiveText, VALUE_KEYWORDS),
      ...(positiveText.trim() ? ["Positive Signal"] : []),
    ]),
  ].filter(Boolean);

  return {
    painPoints: painPoints.slice(0, 5),
    featureRequests: featureRequests.slice(0, 5),
    positiveSignals: positiveSignals.slice(0, 5),
    signals: {
      pain: painText.trim().length > 0,
      request: requestText.trim().length > 0,
      value: positiveText.trim().length > 0,
    },
  };
}

/** STT transcript → Q3/Q4/Q5 draft (simple split) */
export function draftFieldsFromTranscript(transcript: string): {
  positiveText: string;
  painText: string;
  requestText: string;
} {
  const lines = transcript
    .split(/[\n。]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const painLines = lines.filter((l) => /불편|어렵|아쉽|부담|복잡/.test(l));
  const requestLines = lines.filter((l) => /추가|원해|있으면|발송|기능/.test(l));
  const valueLines = lines.filter(
    (l) => /좋|유용|도움|신뢰|편리|만족/.test(l) && !painLines.includes(l)
  );

  const used = new Set([...painLines, ...requestLines, ...valueLines]);
  const rest = lines.filter((l) => !used.has(l));

  return {
    positiveText: [...valueLines, ...rest.slice(0, 2)].join("\n").trim(),
    painText: painLines.join("\n").trim(),
    requestText: requestLines.join("\n").trim(),
  };
}

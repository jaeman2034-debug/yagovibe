import diff_match_patch from "diff-match-patch";
import type { ReactNode } from "react";

/** CJS 패키지: 실제 생성자는 default(diff_match_patch). named `DiffMatchPatch`는 없음 → Vite에서 "not a constructor" */
type DmpApi = {
  diff_main: (a: string, b: string) => [number, string][];
  diff_cleanupSemantic: (diffs: [number, string][]) => void;
};
const DiffMatchPatchCtor = diff_match_patch as unknown as new () => DmpApi;

/**
 * diff_main(ai, current) 기준:
 * - AI 열: 첫 문자열에 나오는 토큰(-1 삭제분, 0 공통)만 렌더, -1은 강조
 * - 현재 열: 두 번째 문자열에 나오는 토큰(0 공통, 1 추가분), 1은 강조
 */
export function buildTextDiffSegments(
  aiText: string,
  currentText: string
): { ai: Array<{ text: string; changed: boolean }>; current: Array<{ text: string; changed: boolean }> } {
  const a = aiText ?? "";
  const b = currentText ?? "";
  if (a === b) {
    return {
      ai: [{ text: a, changed: false }],
      current: [{ text: b, changed: false }],
    };
  }
  const dmp = new DiffMatchPatchCtor();
  const diffs = dmp.diff_main(a, b);
  dmp.diff_cleanupSemantic(diffs);

  const ai: Array<{ text: string; changed: boolean }> = [];
  const current: Array<{ text: string; changed: boolean }> = [];

  for (const [op, text] of diffs) {
    if (op === 0) {
      if (text) {
        ai.push({ text, changed: false });
        current.push({ text, changed: false });
      }
    } else if (op === -1) {
      if (text) ai.push({ text, changed: true });
    } else if (op === 1) {
      if (text) current.push({ text, changed: true });
    }
  }

  if (ai.length === 0) ai.push({ text: "", changed: false });
  if (current.length === 0) current.push({ text: "", changed: false });

  return { ai, current };
}

export function renderDiffHighlightedLine(
  segments: Array<{ text: string; changed: boolean }>,
  keyPrefix: string,
  markClass: string
): ReactNode[] {
  return segments.flatMap((seg, i) => {
    if (!seg.text) return [];
    if (seg.changed) {
      return [
        <mark key={`${keyPrefix}-${i}`} className={markClass}>
          {seg.text}
        </mark>,
      ];
    }
    return [<span key={`${keyPrefix}-${i}`}>{seg.text}</span>];
  });
}

import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type TeamPublicSelectionField = "intro" | "oneLine" | "joinMessage";

/** AI 개선 프리셋 — 서버 프롬프트에 반영 */
export type TeamPublicImprovementStyle = "natural" | "recruiting" | "short" | "serious";

export type ImproveTeamPublicTextSelectionPayload = {
  teamId: string;
  field: TeamPublicSelectionField;
  fullText: string;
  selectionStart: number;
  selectionEnd: number;
  /** 옵션: 클라이언트 톤 힌트 (서버가 팀 메타로 덮어쓸 수 있음) */
  tone?: string;
  /** 개선 스타일 (기본 natural) */
  style?: TeamPublicImprovementStyle;
};

export type ImproveTeamPublicTextSelectionResult = {
  ok?: boolean;
  improvedText?: string;
  source?: "openai" | "template";
};

const ALLOWED_STYLES: readonly TeamPublicImprovementStyle[] = ["natural", "recruiting", "short", "serious"];

/** Callable은 `undefined` 필드 직렬화에 민감할 수 있어, 정의된 키만 보낸다. */
function toCallableData(payload: ImproveTeamPublicTextSelectionPayload): Record<string, unknown> {
  const { teamId, field, fullText, selectionStart, selectionEnd, tone, style } = payload;
  const data: Record<string, unknown> = {
    teamId,
    field,
    fullText,
    selectionStart,
    selectionEnd,
  };
  if (typeof tone === "string" && tone.trim()) {
    data.tone = tone.trim();
  }
  if (typeof style === "string" && (ALLOWED_STYLES as readonly string[]).includes(style)) {
    data.style = style;
  }
  return data;
}

export async function improveTeamPublicTextSelectionCallable(
  payload: ImproveTeamPublicTextSelectionPayload
): Promise<ImproveTeamPublicTextSelectionResult> {
  const fn = httpsCallable<
    Record<string, unknown>,
    ImproveTeamPublicTextSelectionResult
  >(functions, "improveTeamPublicTextSelection");
  const result = await fn(toCallableData(payload));
  return result.data ?? {};
}

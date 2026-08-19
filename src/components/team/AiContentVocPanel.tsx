/**
 * Priority 1-1 — AI 초안 VOC (좋아요 / 수정 필요)
 * 공개 페이지에 사용하지 않음 · 관리자 CMS 전용
 */
import { useRef, useState } from "react";
import { Loader2, ThumbsUp, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { callableErrorMessage } from "@/lib/errors/callableErrorMessage";
import { submitAiFeedbackCallable } from "@/lib/team/submitAiFeedbackClient";
import type { AiContentFeatureType } from "@/lib/team/aiContentPromptVersions";
import { track } from "@/lib/analytics";

export type AiContentVocPanelProps = {
  teamId: string;
  featureType: AiContentFeatureType;
  promptVersion: string;
  generatedAtIso: string;
  regenerateCount: number;
  /** AI 초안 이후 관리자가 텍스트를 수정했는지 */
  edited: boolean;
  dark?: boolean;
  className?: string;
};

export function AiContentVocPanel({
  teamId,
  featureType,
  promptVersion,
  generatedAtIso,
  regenerateCount,
  edited,
  dark = false,
  className,
}: AiContentVocPanelProps) {
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [needsEditMode, setNeedsEditMode] = useState(false);
  const [comment, setComment] = useState("");
  /** React state busy만으로는 더블클릭 레이스가 남을 수 있어 ref로 1회 가드 */
  const submittingRef = useRef(false);

  if (submitted) {
    return (
      <p
        className={cn(
          "rounded-lg border px-3 py-2 text-[11px]",
          dark
            ? "border-emerald-800/50 bg-emerald-950/30 text-emerald-100"
            : "border-emerald-200 bg-emerald-50 text-emerald-900",
          className
        )}
      >
        피드백을 저장했어요. 품질 개선에 반영됩니다.
      </p>
    );
  }

  const submit = async (rating: "good" | "needs_edit") => {
    if (!teamId || busy || submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    try {
      await submitAiFeedbackCallable({
        teamId,
        featureType,
        rating,
        edited,
        regenerateCount,
        comment: rating === "needs_edit" ? comment : undefined,
        promptVersion,
        generatedAt: generatedAtIso,
      });
      setSubmitted(true);
      setNeedsEditMode(false);
      // 다른 Callable의 잔여 오류 토스트와 섞이지 않게 정리
      toast.dismiss();
      toast.success(rating === "good" ? "좋아요로 저장했어요." : "수정 필요로 저장했어요.");
      void track("team_ai_content_voc", {
        team_id: teamId,
        feature: featureType,
        rating,
        prompt_version: promptVersion,
        edited,
        regenerate_count: regenerateCount,
      });
    } catch (e: unknown) {
      console.error("[AiContentVocPanel] submitAiFeedback failed", {
        featureType,
        promptVersion,
        rating,
        err: e,
      });
      toast.error(
        `피드백 저장 실패: ${callableErrorMessage(e) || "잠시 후 다시 시도해 주세요."}`
      );
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border px-3 py-2.5",
        dark ? "border-slate-600/80 bg-slate-900/40" : "border-slate-200 bg-slate-50/80",
        className
      )}
      role="group"
      aria-label="AI 결과 피드백"
    >
      <p className={cn("text-[11px] font-medium", dark ? "text-slate-300" : "text-gray-700")}>
        이번 AI 초안은 어떠셨나요?
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          disabled={busy}
          onClick={() => void submit("good")}
        >
          {busy && !needsEditMode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
          좋아요
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          disabled={busy}
          onClick={() => setNeedsEditMode(true)}
        >
          <PencilLine className="h-3.5 w-3.5" />
          수정 필요
        </Button>
      </div>
      {needsEditMode ? (
        <div className="space-y-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="의견(선택) — 어떤 점이 아쉬웠는지 적어 주세요"
            maxLength={500}
            rows={2}
            disabled={busy}
            className={cn("text-xs", dark ? "border-slate-600 bg-slate-950/60 text-slate-100" : "")}
          />
          <div className="flex justify-end gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              disabled={busy}
              onClick={() => {
                setNeedsEditMode(false);
                setComment("");
              }}
            >
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              disabled={busy}
              onClick={() => void submit("needs_edit")}
            >
              {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              제출
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

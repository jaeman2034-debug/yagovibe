/**
 * RC5-4 — Coach / Parent VOC form
 */

import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { callSubmitVisionPilotFeedback } from "@/lib/academy/academyVisionPilotCallables";

type Props = {
  teamId: string;
  matchId: string;
  persona: "coach" | "parent";
  playerId?: string;
  variant?: "light" | "dark";
};

export function VisionPilotVocForm({
  teamId,
  matchId,
  persona,
  playerId,
  variant = "dark",
}: Props) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isDark = variant === "dark";

  async function handleSubmit() {
    if (!comment.trim()) {
      toast.message("한 줄 이상 피드백을 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await callSubmitVisionPilotFeedback({
        teamId,
        matchId,
        persona,
        rating,
        comment: comment.trim(),
        playerId,
      });
      toast.success("피드백이 저장되었습니다. 감사합니다!");
      setComment("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "피드백 저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const title = persona === "coach" ? "Coach VOC" : "Parent VOC";

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        isDark ? "border-violet-500/35 bg-violet-950/40" : "border-violet-200 bg-white"
      )}
      data-testid={`vision-pilot-voc-${persona}`}
    >
      <p className={cn("text-sm font-black", isDark ? "text-white" : "text-violet-950")}>{title}</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className="p-0.5"
            aria-label={`${n}점`}
            onClick={() => setRating(n)}
          >
            <Star
              className={cn(
                "h-5 w-5",
                n <= rating ? "fill-amber-400 text-amber-400" : "text-gray-400"
              )}
            />
          </button>
        ))}
      </div>
      <textarea
        className={cn(
          "mt-3 w-full rounded-lg border px-3 py-2 text-xs",
          isDark
            ? "border-violet-500/40 bg-violet-950/60 text-violet-50 placeholder:text-violet-400"
            : "border-violet-200 bg-violet-50/50 text-violet-950"
        )}
        rows={3}
        placeholder={
          persona === "coach"
            ? "예: 선수 분석이 빠르다. Timeline이 도움이 된다."
            : "예: 아이의 성장 포인트를 쉽게 이해했다."
        }
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button
        type="button"
        size="sm"
        className="mt-2 text-xs font-bold"
        disabled={submitting}
        onClick={() => void handleSubmit()}
      >
        {submitting ? "저장 중…" : "피드백 제출"}
      </Button>
    </div>
  );
}

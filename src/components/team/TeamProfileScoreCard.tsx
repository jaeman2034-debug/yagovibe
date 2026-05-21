import { useEffect, useRef, useState } from "react";
import { ChevronRight, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TeamProfileScoreResult, TeamProfileSuggestionField } from "@/lib/team/profileScore";
import { requestTeamProfileAiImprove } from "@/lib/team/teamProfileEditEvents";

const FIELD_IDS: Record<TeamProfileSuggestionField, string> = {
  intro: "team-public-edit-intro",
  oneLine: "team-public-edit-oneLine",
  joinMessage: "team-public-edit-joinMessage",
};

export type TeamProfileScoreCardProps = {
  result: TeamProfileScoreResult;
  dark: boolean;
  /** 해당 입력으로 스크롤·포커스 */
  onJumpToField?: (field: TeamProfileSuggestionField) => void;
};

function severityStyles(sev: "low" | "medium" | "high", dark: boolean) {
  if (sev === "high")
    return dark
      ? "border-amber-500/40 bg-amber-950/30 text-amber-100"
      : "border-amber-200 bg-amber-50 text-amber-950";
  if (sev === "medium")
    return dark
      ? "border-slate-500/60 bg-slate-800/50 text-slate-100"
      : "border-indigo-200 bg-indigo-50/80 text-indigo-950";
  return dark ? "border-slate-600/50 bg-slate-800/30 text-slate-200" : "border-gray-200 bg-gray-50 text-gray-800";
}

function jumpToField(field: TeamProfileSuggestionField) {
  const id = FIELD_IDS[field];
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  if (el instanceof HTMLTextAreaElement) {
    el.focus();
    const len = el.value.length;
    if (len > 0) el.setSelectionRange(len, len);
  }
}

export function TeamProfileScoreCard({ result, dark, onJumpToField }: TeamProfileScoreCardProps) {
  const prevScoreRef = useRef<number | null>(null);
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null);

  useEffect(() => {
    const cur = result.score;
    if (prevScoreRef.current === null) {
      prevScoreRef.current = cur;
      return;
    }
    const d = cur - prevScoreRef.current;
    prevScoreRef.current = cur;
    if (d === 0) return;
    setDelta({ value: d, key: Date.now() });
    const t = window.setTimeout(() => setDelta(null), d > 0 ? 2800 : 2400);
    return () => window.clearTimeout(t);
  }, [result.score]);

  const handleJump = (field?: TeamProfileSuggestionField) => {
    if (!field) return;
    if (onJumpToField) onJumpToField(field);
    else jumpToField(field);
  };

  const handleAiImprove = (field: TeamProfileSuggestionField) => {
    requestTeamProfileAiImprove({ field, selectAll: true });
  };

  return (
    <section
      className={cn(
        "rounded-xl border p-4 shadow-sm",
        dark ? "border-slate-600/80 bg-slate-800/40 text-slate-100" : "border-indigo-200/80 bg-white/90 text-gray-900"
      )}
      aria-label="팀 프로필 완성도"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide opacity-80">팀 프로필 완성도</div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-3xl font-bold tabular-nums">{result.score}</span>
            <span className="text-sm font-medium opacity-80">/ 100</span>
            {delta ? (
              <span
                key={delta.key}
                className={cn(
                  "inline-block text-sm font-bold tabular-nums animate-profile-score-delta",
                  delta.value > 0
                    ? dark
                      ? "text-emerald-400"
                      : "text-emerald-600"
                    : dark
                      ? "text-amber-400"
                      : "text-amber-600"
                )}
              >
                {delta.value > 0 ? `+${delta.value}` : delta.value}
              </span>
            ) : null}
          </div>
        </div>
        <div className="min-w-[120px] flex-1 sm:max-w-[200px]">
          <div
            className={cn("h-2 overflow-hidden rounded-full", dark ? "bg-slate-700" : "bg-indigo-100")}
            role="progressbar"
            aria-valuenow={result.score}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500 ease-out",
                result.score >= 75
                  ? "bg-emerald-500"
                  : result.score >= 50
                    ? "bg-indigo-500"
                    : "bg-amber-500"
              )}
              style={{ width: `${result.score}%` }}
            />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] opacity-75">
            <span>기본 {result.sections.basicInfo}</span>
            <span>활동 {result.sections.activityClarity}</span>
            <span>모집 {result.sections.recruiting}</span>
            <span>분위기 {result.sections.personality}</span>
          </div>
        </div>
      </div>

      {result.suggestions.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {result.suggestions.map((item) => {
            const field = item.targetField;
            const hasTarget = Boolean(field);
            const isAiImprove = item.actionType === "ai_improve";
            const isAiGenerate = item.actionType === "ai_generate";

            return (
              <li
                key={item.id}
                className={cn(
                  "flex flex-col gap-2 rounded-lg border px-3 py-2.5 text-sm",
                  severityStyles(item.severity, dark)
                )}
              >
                <div className="min-w-0">
                  <div className="font-semibold leading-snug">{item.title}</div>
                  <p className="mt-0.5 text-xs leading-relaxed opacity-90">{item.description}</p>
                </div>
                {hasTarget && field ? (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={cn(
                        "h-8 gap-1 text-xs",
                        dark ? "border-white/20 bg-slate-900/40 text-slate-100 hover:bg-slate-900/70" : ""
                      )}
                      onClick={() => handleJump(field)}
                    >
                      {item.actionLabel ?? "해당 항목으로 이동"}
                      <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
                    </Button>
                    {isAiImprove ? (
                      <Button
                        type="button"
                        size="sm"
                        className={cn(
                          "h-8 gap-1.5 text-xs font-semibold",
                          dark
                            ? "bg-violet-600 text-white hover:bg-violet-500"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                        )}
                        onClick={() => handleAiImprove(field)}
                      >
                        <Wand2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        AI로 보강
                      </Button>
                    ) : null}
                    {isAiGenerate ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 gap-1 text-xs"
                        onClick={() => handleAiImprove(field)}
                      >
                        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        AI 초안
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p
          className={cn(
            "mt-4 rounded-lg border px-3 py-2 text-sm",
            dark ? "border-emerald-500/30 bg-emerald-950/25 text-emerald-50" : "border-emerald-200 bg-emerald-50/90 text-emerald-950"
          )}
        >
          지금 입력만으로도 프로필이 잘 정리되어 있어요. 저장 후에도 언제든 다듬을 수 있어요.
        </p>
      )}
    </section>
  );
}

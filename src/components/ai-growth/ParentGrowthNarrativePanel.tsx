/**
 * CV-1 I12-2 — Parent Home Growth Narrative (read-only)
 */
import { useEffect } from "react";
import { MessageSquareText } from "lucide-react";
import {
  buildParentGrowthNarrative,
  buildParentGrowthRecentChangeLine,
  isParentGrowthNarrativeEmpty,
} from "@/lib/ai-growth/parentGrowthNarrativeEngine";
import { logJ0ParentCriticalPath } from "@/lib/ai-growth/j0ParentCriticalPathLog";
import type { ParentHomeGrowthSummarySlice } from "@/lib/ai-growth/parentHomeGrowthCardV2Types";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import { cn } from "@/lib/utils";

type Props = {
  teamId: string;
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
  growthSummary: ParentHomeGrowthSummarySlice;
  className?: string;
};

export function ParentGrowthNarrativePanel({
  teamId,
  playerName,
  avatar,
  growthSummary,
  className,
}: Props) {
  const input = { playerName, avatar, growthSnapshot: growthSummary };
  const isEmpty = isParentGrowthNarrativeEmpty(input);

  useEffect(() => {
    logJ0ParentCriticalPath(
      "narrative_render",
      isEmpty ? "empty" : "success",
      { teamId, playerId: avatar.playerId }
    );
  }, [teamId, avatar.playerId, isEmpty]);

  if (isEmpty) {
    return (
      <section
        className={cn(
          "mt-3 rounded-xl border border-dashed border-indigo-200 bg-white/70 px-3 py-3",
          className
        )}
        data-testid="i12-growth-narrative-empty"
        aria-label="AI 성장 해설"
      >
        <p className="text-xs font-bold text-indigo-900">AI 성장 해설</p>
        <p className="mt-1.5 text-sm leading-relaxed text-indigo-800">
          훈련 기록이 쌓이면 보호자 친화적인 성장 해설이 표시됩니다.
        </p>
      </section>
    );
  }

  const narrative = buildParentGrowthNarrative(input);
  const recentChange = buildParentGrowthRecentChangeLine(
    growthSummary,
    avatar.weeklyDeltaOvr ?? null
  );

  return (
    <section
      className={cn(
        "mt-3 rounded-xl border border-indigo-200 bg-gradient-to-br from-white via-indigo-50/40 to-violet-50/50 px-3 py-3",
        className
      )}
      data-testid="i12-growth-narrative"
      aria-label="AI 성장 해설"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-black text-indigo-950">
        <MessageSquareText className="h-4 w-4 text-indigo-600" aria-hidden />
        AI 성장 해설
      </h3>

      <div className="mt-2.5" data-testid="i12-growth-narrative-summary">
        {narrative.summary.split("\n\n").map((paragraph, index) => (
          <p key={index} className="text-sm leading-relaxed text-indigo-950">
            {paragraph}
          </p>
        ))}
      </div>

      {recentChange ? (
        <div className="mt-3 rounded-lg border border-indigo-100 bg-white/90 px-2.5 py-2">
          <p className="text-[10px] font-semibold text-indigo-700">최근 변화</p>
          <p
            className="mt-0.5 text-sm leading-relaxed text-indigo-950"
            data-testid="i12-growth-narrative-recent-change"
          >
            {recentChange}
          </p>
        </div>
      ) : null}

      {narrative.strengths.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-indigo-700">강점</p>
          <ul
            className="mt-1 space-y-1 text-sm leading-relaxed text-indigo-950"
            data-testid="i12-growth-narrative-strengths"
          >
            {narrative.strengths.map((line) => (
              <li key={line} className="flex gap-1.5">
                <span className="text-indigo-400" aria-hidden>
                  ·
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {narrative.focusAreas.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-indigo-700">다음 성장 포인트</p>
          <ul
            className="mt-1 space-y-1 text-sm leading-relaxed text-indigo-900"
            data-testid="i12-growth-narrative-focus"
          >
            {narrative.focusAreas.map((line) => (
              <li key={line} className="flex gap-1.5">
                <span className="text-violet-400" aria-hidden>
                  →
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-2.5 text-[9px] text-indigo-600/90">
        playerGrowthAvatar · read-only · I12-2 Growth Narrative
      </p>
    </section>
  );
}

import { Target } from "lucide-react";
import { buildAvatarGrowthRecommendations } from "@/lib/ai-growth/avatarGrowthRecommendationEngine";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import { cn } from "@/lib/utils";

type Props = {
  avatar: PlayerGrowthAvatarDoc;
  className?: string;
  maxItems?: number;
  variant?: "parent" | "profile";
};

/** Sprint D-5.1 — 성장 추천 (훈련 집중 + 다음 목표) */
export function GrowthRecommendationSection({
  avatar,
  className,
  maxItems = 5,
  variant = "parent",
}: Props) {
  const bundle = buildAvatarGrowthRecommendations(avatar, maxItems);
  const focus = bundle.recommendations.find((r) => r.kind === "training_focus");
  const goals = bundle.recommendations.filter((r) => r.kind !== "training_focus");

  if (goals.length === 0 && !focus) {
    return (
      <p
        className={cn(
          "rounded-lg border border-dashed border-violet-200 bg-white/60 px-3 py-2 text-xs text-violet-800",
          className
        )}
        data-testid="growth-recommendation-empty"
      >
        모든 성장 목표를 달성했어요! 🎉
      </p>
    );
  }

  return (
    <div
      className={cn("rounded-xl border border-violet-200 bg-white/80 px-3 py-2.5", className)}
      data-testid={
        variant === "profile" ? "player-growth-profile-goals" : "parent-home-next-goals"
      }
    >
      <p className="flex items-center gap-1.5 text-xs font-bold text-violet-950">
        <Target className="h-3.5 w-3.5 text-violet-600" aria-hidden />
        {variant === "profile" ? "성장 추천" : "다음 목표"}
      </p>

      {focus ? (
        <p
          className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2.5 py-2 text-xs font-medium text-indigo-950"
          data-testid="growth-recommendation-focus"
        >
          {focus.emoji} {focus.detail}
        </p>
      ) : null}

      {goals.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {goals.map((rec) => (
            <li
              key={rec.id}
              className="text-xs text-violet-900"
              data-testid={`growth-recommendation-${rec.id}`}
            >
              <span className="font-semibold">
                {rec.emoji} {rec.title}
              </span>
              <span className="mt-0.5 block whitespace-pre-line text-violet-800">{rec.detail}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

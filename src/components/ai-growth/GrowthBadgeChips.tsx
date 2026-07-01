import { badgeMetaById } from "@/lib/ai-growth/avatarGrowthEngine";
import type { GrowthBadgeId } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import { cn } from "@/lib/utils";

type Props = {
  badgeIds: GrowthBadgeId[];
  className?: string;
  size?: "sm" | "md";
  emptyLabel?: string;
};

/** Sprint D-4.3 — 획득 배지 칩 목록 */
export function GrowthBadgeChips({
  badgeIds,
  className,
  size = "md",
  emptyLabel,
}: Props) {
  if (badgeIds.length === 0) {
    if (!emptyLabel) return null;
    return (
      <p className={cn("text-xs text-violet-700/80", className)} data-testid="growth-badge-empty">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul
      className={cn("flex flex-wrap gap-1.5", className)}
      data-testid="growth-badge-chips"
      aria-label="획득 배지"
    >
      {badgeIds.map((id) => {
        const meta = badgeMetaById(id);
        return (
          <li
            key={id}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 font-semibold text-amber-950",
              size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
            )}
            data-testid={`growth-badge-chip-${id}`}
            title={meta.descriptionKo}
          >
            <span aria-hidden>{meta.emoji}</span>
            {meta.labelKo}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * J2-4 — Parent Home Badge Collection (read-only)
 */
import { Trophy } from "lucide-react";
import { GrowthBadgeChips } from "@/components/ai-growth/GrowthBadgeChips";
import { buildCollectionView } from "@/lib/ai-growth/collectionView";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import { cn } from "@/lib/utils";

type Props = {
  avatar: PlayerGrowthAvatarDoc;
  className?: string;
};

const RARITY_TONE: Record<string, string> = {
  일반: "border-violet-200 bg-violet-50 text-violet-800",
  희귀: "border-indigo-300 bg-indigo-50 text-indigo-900",
  골드: "border-amber-300 bg-amber-50 text-amber-950",
  훈련: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export function CollectionPanel({ avatar, className }: Props) {
  const view = buildCollectionView(avatar);

  return (
    <section
      className={cn(
        "mt-3 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/90 via-white to-yellow-50/60 px-3 py-3",
        className
      )}
      data-testid="j2-collection-panel"
      aria-label="배지 컬렉션"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-black text-amber-950">
          <Trophy className="h-4 w-4 text-amber-600" aria-hidden />
          Collection
        </h3>
        <span
          className="rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-xs font-black tabular-nums text-amber-950"
          data-testid="j2-collection-count"
        >
          {view.countLabel}
        </span>
      </div>

      {view.showRecentUnlock ? (
        <div
          className="mt-3 rounded-lg border border-amber-300 bg-amber-100/50 px-3 py-2"
          data-testid="j2-collection-recent"
        >
          <p className="text-[10px] font-semibold text-amber-900">최근 획득</p>
          <GrowthBadgeChips
            className="mt-1"
            badgeIds={avatar.lastUnlockedBadges ?? []}
            size="sm"
          />
        </div>
      ) : null}

      <div className="mt-3" data-testid="j2-collection-acquired">
        <p className="text-[10px] font-semibold text-amber-800">획득 배지</p>
        {view.acquiredBadges.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {view.acquiredBadges.map((badge) => (
              <li
                key={badge.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white/80 px-2.5 py-1.5 text-xs"
              >
                <span className="font-semibold text-amber-950">
                  {badge.emoji} {badge.labelKo}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                    RARITY_TONE[badge.rarity] ?? RARITY_TONE.일반
                  )}
                >
                  {badge.rarity}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-sm text-amber-800">아직 획득한 배지가 없습니다.</p>
        )}
      </div>

      {view.lockedBadges.length > 0 ? (
        <div className="mt-3" data-testid="j2-collection-locked">
          <p className="text-[10px] font-semibold text-amber-700">미획득</p>
          <ul className="mt-2 space-y-1.5">
            {view.lockedBadges.map((badge) => (
              <li
                key={badge.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-amber-200 bg-white/50 px-2.5 py-1.5 text-xs opacity-80"
              >
                <span className="text-amber-900">
                  {badge.emoji} {badge.labelKo}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                    RARITY_TONE[badge.rarity] ?? RARITY_TONE.일반
                  )}
                >
                  {badge.rarity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

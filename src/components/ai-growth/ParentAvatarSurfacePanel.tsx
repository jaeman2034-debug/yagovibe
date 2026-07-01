/**
 * CV-1 I12-1 — Parent Avatar Surface (playerGrowthAvatar read-only)
 */
import { AVATAR_TIER_LABELS, badgeMetaById } from "@/lib/ai-growth/avatarGrowthEngine";
import { growthLevelLabel } from "@/lib/ai-growth/growthAvatarLevel";
import {
  buildParentAvatarSurfaceView,
  PARENT_AVATAR_SURFACE_MAX_BADGES,
} from "@/lib/ai-growth/parentAvatarSurfaceView";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import { cn } from "@/lib/utils";

type Props = {
  avatar: PlayerGrowthAvatarDoc;
  className?: string;
};

export function ParentAvatarSurfacePanel({ avatar, className }: Props) {
  const view = buildParentAvatarSurfaceView(avatar);
  const tierMeta = AVATAR_TIER_LABELS[view.tier];

  return (
    <section
      className={cn(
        "rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/80 px-3 py-3",
        className
      )}
      data-testid="i12-parent-avatar-surface"
      aria-label="아바타 현재 상태"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-800">
        현재 상태 (I12-1)
      </p>

      <div className="mt-2 flex flex-wrap items-end gap-3">
        <div data-testid="i12-avatar-level">
          <p className="text-[10px] font-medium text-indigo-700">Level</p>
          <p className="text-lg font-black text-indigo-950">
            {growthLevelLabel(view.level as 1 | 2 | 3 | 4 | 5)}
          </p>
        </div>
        <div data-testid="i12-avatar-tier">
          <p className="text-[10px] font-medium text-indigo-700">Tier</p>
          <p className="text-lg font-black text-amber-900">
            {tierMeta.emoji} {tierMeta.labelKo}
          </p>
        </div>
        <div data-testid="i12-avatar-ovr">
          <p className="text-[10px] font-medium text-indigo-700">OVR</p>
          <p className="text-2xl font-black tabular-nums text-indigo-950">{view.ovr}</p>
        </div>
      </div>

      <dl
        className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"
        data-testid="i12-avatar-axis"
      >
        <div className="rounded-lg border border-indigo-100 bg-white/90 px-2 py-2">
          <dt className="font-medium text-indigo-700">Vision</dt>
          <dd className="text-base font-bold tabular-nums text-gray-900">{view.vision}</dd>
        </div>
        <div className="rounded-lg border border-indigo-100 bg-white/90 px-2 py-2">
          <dt className="font-medium text-indigo-700">Pressure</dt>
          <dd className="text-base font-bold tabular-nums text-gray-900">{view.pressure}</dd>
        </div>
        <div className="rounded-lg border border-indigo-100 bg-white/90 px-2 py-2">
          <dt className="font-medium text-indigo-700">Recovery</dt>
          <dd className="text-base font-bold tabular-nums text-gray-900">{view.recovery}</dd>
        </div>
      </dl>

      {view.topBadgeIds.length > 0 ? (
        <ul
          className="mt-3 flex flex-wrap gap-1.5"
          data-testid="i12-avatar-badges"
          aria-label={`대표 배지 최대 ${PARENT_AVATAR_SURFACE_MAX_BADGES}개`}
        >
          {view.topBadgeIds.map((id) => {
            const meta = badgeMetaById(id);
            return (
              <li
                key={id}
                className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-950"
              >
                {meta.emoji} {meta.labelKo}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-[11px] text-indigo-700" data-testid="i12-avatar-badges">
          대표 배지 없음
        </p>
      )}

      <p className="mt-2 text-[9px] text-indigo-600/90">
        playerGrowthAvatar · read-only · I11 Avatar SoT
      </p>
    </section>
  );
}

import { AVATAR_TIER_LABELS, badgeMetaById } from "@/lib/ai-growth/avatarGrowthEngine";
import { GrowthBadgeChips } from "@/components/ai-growth/GrowthBadgeChips";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import { cn } from "@/lib/utils";

export type PlayerGrowthAvatarCardProps = {
  playerName: string;
  avatar: PlayerGrowthAvatarDoc | null;
  loading?: boolean;
  /** compact: 멤버 목록 · inline: 헤더 요약 */
  variant?: "compact" | "inline" | "full";
  className?: string;
};

export function PlayerGrowthAvatarCard({
  playerName,
  avatar,
  loading = false,
  variant = "compact",
  className,
}: PlayerGrowthAvatarCardProps) {
  const name = playerName.trim() || "선수";

  if (loading) {
    return (
      <div className={cn("text-[10px] text-sky-700", className)} aria-busy="true">
        성장 프로필 불러오는 중…
      </div>
    );
  }

  if (!avatar) {
    if (variant === "full") {
      return (
        <div
          className={cn(
            "rounded-xl border border-dashed border-sky-200 bg-sky-50/40 px-4 py-3 text-xs text-sky-800",
            className
          )}
        >
          {name}님의 OVR·배지 데이터가 없습니다. AI Growth에서 코치 검증 후 OVR 동기화를 실행하세요.
        </div>
      );
    }
    return null;
  }

  const tierMeta = AVATAR_TIER_LABELS[avatar.tier] ?? AVATAR_TIER_LABELS.starter;
  const primaryBadge = avatar.badges[0] ? badgeMetaById(avatar.badges[0]) : null;

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50/80 px-4 py-3",
          className
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-700">최근 Growth</p>
        <div className="mt-1 flex flex-wrap items-end gap-3">
          <div>
            <p className="text-lg font-bold text-gray-900">{name}</p>
            <p className="text-2xl font-black tabular-nums text-sky-950">
              OVR {avatar.ovr}
              <span className="ml-2 text-sm font-bold text-indigo-800">
                {tierMeta.emoji} {tierMeta.labelKo}
              </span>
            </p>
          </div>
          {primaryBadge ? (
            <p className="text-sm font-medium text-sky-900">
              {primaryBadge.emoji} {primaryBadge.labelKo}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (variant === "full") {
    return (
      <div
        className={cn(
          "rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-indigo-50/50 px-4 py-4",
          className
        )}
      >
        <p className="text-sm font-semibold text-sky-950">Avatar Growth</p>
        <p className="mt-2 text-lg font-bold text-gray-900">{name}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="text-3xl font-black tabular-nums text-sky-950">OVR {avatar.ovr}</p>
          <p className="text-sm font-bold text-indigo-800">
            {tierMeta.emoji} {tierMeta.labelKo} Tier
          </p>
        </div>
        {avatar.badges.length > 0 ? (
          <div className="mt-3" data-testid="avatar-growth-owned-badges">
            <p className="text-xs font-bold text-sky-950">🥇 보유 배지</p>
            <GrowthBadgeChips className="mt-1.5" badgeIds={avatar.badges} size="sm" />
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-sky-100 bg-white px-2 py-2">
            <p className="text-[10px] text-gray-500">👁 Vision</p>
            <p className="text-lg font-bold text-sky-950">{avatar.vision}</p>
          </div>
          <div className="rounded-lg border border-sky-100 bg-white px-2 py-2">
            <p className="text-[10px] text-gray-500">🛡 Pressure</p>
            <p className="text-lg font-bold text-sky-950">{avatar.pressure}</p>
          </div>
          <div className="rounded-lg border border-sky-100 bg-white px-2 py-2">
            <p className="text-[10px] text-gray-500">⚡ Recovery</p>
            <p className="text-lg font-bold text-sky-950">{avatar.recovery}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-w-[7.5rem] rounded-lg border border-sky-100 bg-sky-50/90 px-2.5 py-2 text-left",
        className
      )}
    >
      <p className="text-[10px] font-semibold tabular-nums text-sky-900">OVR {avatar.ovr}</p>
      <p className="text-[10px] font-bold text-indigo-800">
        {tierMeta.labelKo} {tierMeta.emoji}
      </p>
      {primaryBadge ? (
        <p className="mt-0.5 truncate text-[10px] text-sky-800">
          {primaryBadge.emoji} {primaryBadge.labelKo}
        </p>
      ) : null}
      <p className="mt-1 text-[9px] tabular-nums text-gray-600">
        👁 {avatar.vision} · 🛡 {avatar.pressure} · ⚡ {avatar.recovery}
      </p>
    </div>
  );
}

import type { PlayPlayerStatsDoc } from "@/utils/playerStats";
import { PLAY_STAT_KEYS } from "@/utils/playerStats";
import {
  deriveAvatarCondition,
  participationInfluenceShort,
  sumRecentGrowthPoints,
  type ParticipationHint,
} from "@/lib/play/avatarDailyStatus";
import StatBar from "./StatBar";
import SuperStrikerBadge from "./SuperStrikerBadge";

type Props = {
  player: PlayPlayerStatsDoc;
  highlight?: boolean;
  /** 메인 허브: 더 큰 OVR 타이포 + 등장 모션 */
  hero?: boolean;
  /** 선택 경기 `team_games` 출전 스냅샷 · 없으면 로스터만 */
  participationHint?: ParticipationHint;
  superBadgeCount?: number;
};

export default function PlayerCard({ player, highlight, hero, participationHint, superBadgeCount }: Props) {
  const pos = player.mainPosition ?? "MF";
  const num = player.number ?? "—";
  const condition = deriveAvatarCondition(player);
  const growthSum = sumRecentGrowthPoints(player.recentGrowth);
  const participation = participationInfluenceShort(participationHint ?? { hasLinkedGame: false });

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm ${
        highlight
          ? hero
            ? "border-indigo-500 shadow-xl shadow-indigo-500/25 ring-[3px] ring-indigo-300/70"
            : "border-indigo-400 ring-2 ring-indigo-200/80"
          : "border-gray-200"
      }`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-200/40 to-violet-200/30 blur-2xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            {highlight ? "나의 메인 카드" : "선수 카드"}
          </p>
          <h3 className={`mt-1 truncate font-bold text-gray-900 ${hero ? "text-2xl sm:text-3xl" : "text-xl"}`}>
            {player.displayName}
          </h3>
          <div className="mt-2">
            <SuperStrikerBadge count={superBadgeCount} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 font-semibold text-indigo-800">{pos}</span>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-mono text-gray-800">No. {num}</span>
            <span className="inline-flex animate-play-badge-sparkle rounded-full bg-violet-50 px-2.5 py-0.5 font-semibold text-violet-900 ring-1 ring-violet-200/80">
              Lv.{player.level}
            </span>
          </div>
        </div>
        <div
          className={`flex shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-center text-white shadow-inner sm:min-w-[120px] ${
            hero ? "animate-play-glow-pulse px-8 py-5" : "px-6 py-4"
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-100">OVR</p>
          <p
            className={`font-black tabular-nums leading-none ${hero ? "animate-play-ovr-pop text-5xl sm:text-6xl" : "text-4xl"}`}
          >
            {player.ovr}
          </p>
        </div>
      </div>

      {highlight ? (
        <div className="relative mt-4 overflow-hidden rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50 via-orange-50/90 to-rose-50/80 px-3 py-2.5 shadow-sm ring-1 ring-amber-100/80">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-900">오늘의 상태</p>
          <dl className="mt-2 space-y-1.5 text-[13px] font-semibold text-gray-900">
            <div className="flex items-center justify-between gap-2 border-b border-amber-100/80 pb-1.5">
              <dt className="text-gray-600">컨디션</dt>
              <dd className="tabular-nums">
                {condition.labelKo}
                {condition.arrow ? <span className="ml-1">{condition.arrow}</span> : null}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-amber-100/80 pb-1.5">
              <dt className="text-gray-600">최근 성장</dt>
              <dd className="tabular-nums text-indigo-800">
                {growthSum > 0 ? "+" : ""}
                {growthSum}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-gray-600">출전 영향력</dt>
              <dd className="text-right text-[12px] leading-tight text-gray-900">{participation.labelKo}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div className="relative mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PLAY_STAT_KEYS.map((k) => (
          <StatBar
            key={k}
            statKey={k}
            value={player.stats[k]}
            pulse={(player.recentGrowth[k] ?? 0) > 0}
          />
        ))}
      </div>
    </div>
  );
}

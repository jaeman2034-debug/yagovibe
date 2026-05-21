import type { PlaySixStats } from "@/utils/playerStats";
import { PLAY_STAT_LABELS_KO, normalizeStat } from "@/utils/playerStats";

type Props = {
  statKey: keyof PlaySixStats;
  value: number;
  max?: number;
  /** 최근 성장으로 올랐을 때 막대 펄스 */
  pulse?: boolean;
};

export default function StatBar({ statKey, value, max = 5, pulse }: Props) {
  const v = normalizeStat(value);
  const pct = Math.min(100, (v / max) * 100);
  const label = PLAY_STAT_LABELS_KO[statKey];
  return (
    <div className={`space-y-1 ${pulse ? "rounded-lg ring-1 ring-indigo-200/60" : ""}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={`tabular-nums ${pulse ? "font-bold text-indigo-700" : "text-indigo-600"}`}>{v}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100/80">
        <div
          className={`h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-500 ${
            pulse ? "animate-play-stat-pulse shadow-sm shadow-indigo-400/40" : ""
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

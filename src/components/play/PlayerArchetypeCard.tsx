import { Loader2 } from "lucide-react";
import type { PlayerArchetypesClient } from "@/lib/telemetry/playerTrendTypes";

const ARCHETYPE_LABEL_KO: Record<string, string> = {
  Finisher: "피니셔",
  Playmaker: "플레이메이커",
  Engine: "엔진",
  "Ball Winner": "볼 하이저",
  "Threat Creator": "위협 창출",
  Controller: "컨트롤러",
};

const BADGE_LABEL_KO: Record<string, string> = {
  "Clinical Finisher": "결정적 마무리",
  Playmaker: "플레이메이커",
  Engine: "엔진",
  "Ball Winner": "볼 하이저",
  "Threat Creator": "위협 창출",
  Controller: "컨트롤러",
  "Peak Performer": "피크 퍼포머",
};

function labelArchetype(id: string): string {
  return ARCHETYPE_LABEL_KO[id] ?? id;
}

function labelBadge(b: string): string {
  return BADGE_LABEL_KO[b] ?? b;
}

type Props = {
  archetypes: PlayerArchetypesClient | null;
  loading?: boolean;
  error?: string | null;
  className?: string;
};

export function PlayerArchetypeCard({ archetypes, loading, error, className = "" }: Props) {
  if (loading) {
    return (
      <div className={`rounded-xl border border-violet-500/20 bg-violet-950/20 px-4 py-5 ${className}`}>
        <div className="flex items-center justify-center gap-2 text-sm text-violet-100/90">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          플레이 스타일 분석 중…
        </div>
      </div>
    );
  }

  if (error) {
    return null;
  }

  if (!archetypes) {
    return (
      <div className={`rounded-xl border border-white/10 bg-black/20 px-4 py-3 ${className}`}>
        <p className="text-xs text-slate-500">경기 데이터가 쌓이면 플레이 유형이 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-violet-500/25 bg-gradient-to-b from-violet-950/35 to-[#070b14]/80 px-3.5 py-3 ${className}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-violet-400/90">플레이 유형</p>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <div>
          <p className="text-[10px] text-slate-500">주 유형</p>
          <p className="text-lg font-bold text-white">{labelArchetype(archetypes.primary)}</p>
        </div>
        {archetypes.secondary ? (
          <div>
            <p className="text-[10px] text-slate-500">부 유형</p>
            <p className="text-sm font-semibold text-violet-200">{labelArchetype(archetypes.secondary)}</p>
          </div>
        ) : null}
      </div>

      {archetypes.badges.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {archetypes.badges.map((b) => (
            <span
              key={b}
              className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-100"
            >
              {labelBadge(b)}
            </span>
          ))}
        </div>
      ) : null}

      {archetypes.explain.length > 0 ? (
        <ul className="mt-2 space-y-0.5 text-[11px] text-slate-400">
          {archetypes.explain.map((line) => (
            <li key={line}>· {line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

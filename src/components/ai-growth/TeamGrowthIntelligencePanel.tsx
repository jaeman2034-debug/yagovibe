import { BarChart3, Brain, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useTeamGrowthIntelligence,
  type TeamGrowthIntelligenceEmptyReason,
} from "@/hooks/useTeamGrowthIntelligence";
import type { TeamCoachRecommendation } from "@/lib/ai-growth/teamGrowthIntelligenceTypes";
import { TeamWeeklyGrowthDigestCard } from "@/components/ai-growth/TeamWeeklyGrowthDigestCard";

function emptyMessage(reason: TeamGrowthIntelligenceEmptyReason | null): string {
  switch (reason) {
    case "no_roster":
      return "등록된 선수가 없습니다. 아카데미 명단에 선수를 추가하세요.";
    case "no_tracked_players":
      return "아직 성장 데이터가 저장된 선수가 없습니다. Step5에서 훈련 리포트를 저장하면 팀 인텔리전스가 생성됩니다.";
    case "load_error":
      return "팀 성장 인텔리전스를 불러오지 못했습니다.";
    default:
      return "팀 성장 데이터를 준비 중입니다.";
  }
}

function CoachRecRow({ rec }: { rec: TeamCoachRecommendation }) {
  return (
    <div
      className="rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-2.5"
      data-testid={`team-coach-rec-${rec.id}`}
    >
      <p className="text-sm font-bold text-sky-950">
        <span aria-hidden>{rec.emoji}</span> {rec.title}
      </p>
      <p className="mt-0.5 text-xs text-sky-900">{rec.detail}</p>
      {rec.affectedPlayerNames.length > 0 ? (
        <p className="mt-1 text-[11px] text-sky-800">
          대상: {rec.affectedPlayerNames.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

type Props = {
  teamId: string;
  teamName: string;
  className?: string;
};

/** Sprint E-1 — 코치 팀 성장 인텔리전스 패널 */
export function TeamGrowthIntelligencePanel({ teamId, teamName, className }: Props) {
  const { data, loading, emptyReason } = useTeamGrowthIntelligence(teamId, teamName);

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-900",
          className
        )}
        data-testid="team-growth-intelligence-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        팀 성장 인텔리전스 분석 중…
      </div>
    );
  }

  if (!data) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-dashed border-sky-300 bg-gradient-to-b from-sky-50/70 to-white p-4",
          className
        )}
        data-testid="team-growth-intelligence-empty"
        aria-label="팀 성장 인텔리전스"
      >
        <div className="flex items-start gap-2">
          <BarChart3 className="mt-0.5 h-5 w-5 text-sky-600" aria-hidden />
          <div>
            <h2 className="text-base font-bold text-sky-950">팀 성장 인텔리전스</h2>
            <p className="mt-2 text-sm leading-relaxed text-sky-900">{emptyMessage(emptyReason)}</p>
          </div>
        </div>
      </section>
    );
  }

  const { snapshot, atRiskPlayers, weeklyDigest, coachRecommendations, aiSummary } = data;

  return (
    <section
      className={cn(
        "space-y-4 rounded-2xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 via-white to-cyan-50/90 p-4 shadow-sm sm:p-5",
        className
      )}
      data-testid="team-growth-intelligence-panel"
      aria-label="팀 성장 인텔리전스"
    >
      <div>
        <h2 className="flex items-center gap-1.5 text-lg font-black text-sky-950">
          <BarChart3 className="h-5 w-5 text-sky-600" aria-hidden />
          팀 성장 인텔리전스
        </h2>
        <p className="mt-0.5 text-xs text-sky-800">{teamName}</p>
      </div>

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        data-testid="team-growth-snapshot"
      >
        <div className="rounded-xl border border-sky-200 bg-white/90 px-3 py-2 text-center">
          <p className="text-[10px] font-medium text-sky-700">추적 선수</p>
          <p className="text-lg font-black tabular-nums text-sky-950">
            {snapshot.trackedCount}
            <span className="text-xs font-normal text-sky-700"> / {snapshot.rosterCount}</span>
          </p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-white/90 px-3 py-2 text-center">
          <p className="text-[10px] font-medium text-sky-700">평균 OVR</p>
          <p className="text-lg font-black tabular-nums text-sky-950">{snapshot.avgOvr}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-white/90 px-3 py-2 text-center">
          <p className="text-[10px] font-medium text-sky-700">평균 Level</p>
          <p className="text-lg font-black tabular-nums text-sky-950">{snapshot.avgLevel}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-white/90 px-3 py-2 text-center">
          <p className="text-[10px] font-medium text-sky-700">위험 선수</p>
          <p className="text-lg font-black tabular-nums text-amber-700">{atRiskPlayers.length}</p>
        </div>
      </div>

      {weeklyDigest ? (
        <TeamWeeklyGrowthDigestCard digest={weeklyDigest} />
      ) : null}

      {coachRecommendations.length > 0 ? (
        <div data-testid="team-coach-recommendations">
          <h3 className="text-sm font-bold text-sky-950">코치 권장 훈련</h3>
          <div className="mt-2 space-y-2">
            {coachRecommendations.map((rec) => (
              <CoachRecRow key={rec.id} rec={rec} />
            ))}
          </div>
        </div>
      ) : null}

      <div
        className="rounded-xl border border-violet-200 bg-violet-50/60 p-3"
        data-testid="team-growth-ai-summary"
      >
        <h3 className="flex items-center gap-1 text-sm font-bold text-violet-950">
          <Brain className="h-4 w-4 text-violet-600" aria-hidden />
          AI 팀 성장 요약
        </h3>
        <div className="mt-2 space-y-2">
          {aiSummary.paragraphs.map((paragraph, index) => (
            <p key={index} className="text-sm leading-relaxed text-violet-950">
              {paragraph}
            </p>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-violet-600">
          Avatar · 위험 분석 · 추천 엔진 기반 팀 요약
        </p>
      </div>
    </section>
  );
}

import type { ReactNode } from "react";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { usePostMatchInsight } from "@/hooks/usePostMatchInsight";
import { useEntitlements } from "@/hooks/useEntitlements";
import { YagoProPaywallStrip } from "@/components/me/YagoProPaywallStrip";
import {
  formatInt,
  formatMatchDuration,
  formatNumber,
  formatPercent,
  formatRatingBadge,
  formatRatingScore,
} from "@/lib/telemetry/matchIntelligenceFormat";
import type { ComparisonWinnerSideClient } from "@/lib/telemetry/matchIntelligenceTypes";
import { labelCoachFocusArea } from "@/lib/telemetry/coachClient";
import { registerContextualTriggerCandidate } from "@/hooks/usePaywallTrigger";

type Props = {
  matchId?: string;
  myUid: string;
  /** true when match phase is ended */
  enabled: boolean;
  className?: string;
};

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-left">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-400/90">{children}</p>
  );
}

function winnerCellClass(side: "self" | "opp", winner?: ComparisonWinnerSideClient): string {
  const isWin =
    (side === "self" && winner === "self") || (side === "opp" && winner === "opponent");
  if (!isWin) return "font-mono text-sm font-bold tabular-nums text-white/90";
  return "font-mono text-sm font-bold tabular-nums text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.55)]";
}

function ComparisonRow({
  label,
  selfValue,
  oppValue,
  winner,
}: {
  label: string;
  selfValue: string;
  oppValue: string;
  winner?: ComparisonWinnerSideClient;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_3.5rem] items-center gap-2 border-b border-white/5 py-1.5 last:border-b-0">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`text-right ${winnerCellClass("self", winner)}`}>{selfValue}</span>
      <span className={`text-right ${winnerCellClass("opp", winner)}`}>{oppValue}</span>
    </div>
  );
}

function labelFocusArea(focusArea: string): string {
  const map: Record<string, string> = {
    Passing: "패스",
    Control: "볼 컨트롤",
    Finishing: "마무리",
    Attack: "공격",
    xThreat: "공격 위협",
    Possession: "점유 유지",
    General: "종합",
  };
  return map[focusArea] ?? focusArea;
}

function CoachBulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-1.5 space-y-1">
      {items.map((line) => (
        <li key={line} className="flex gap-2 text-xs leading-relaxed text-slate-200">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400/80" aria-hidden />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

export function PostMatchInsightCard({ matchId, myUid, enabled, className = "" }: Props) {
  const insight = usePostMatchInsight(matchId, myUid, enabled && Boolean(matchId?.trim()));
  const entitlements = useEntitlements(myUid, enabled && Boolean(myUid?.trim()));

  useEffect(() => {
    if (!enabled || entitlements.data?.isPro) return;
    registerContextualTriggerCandidate("post_match");
  }, [enabled, entitlements.data?.isPro]);

  if (!enabled || !matchId?.trim()) {
    return (
      <div className={`rounded-xl border border-white/10 bg-black/30 px-3 py-4 text-center ${className}`}>
        <p className="text-xs text-slate-500">매치 ID 없음 — 인사이트를 표시할 수 없습니다.</p>
      </div>
    );
  }

  if (insight.status === "loading" || insight.status === "idle") {
    return (
      <div className={`rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-4 py-5 ${className}`}>
        <div className="flex items-center justify-center gap-2 text-sm text-cyan-100/90">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          경기 인사이트 분석 중…
        </div>
      </div>
    );
  }

  if (insight.status === "error") {
    return (
      <div className={`rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-4 text-left ${className}`}>
        <SectionTitle>경기 인사이트</SectionTitle>
        <p className="mt-2 text-sm text-rose-200">
          {insight.errorCode === "permission-denied"
            ? "이 매치 참가자만 인사이트를 볼 수 있습니다."
            : insight.errorMessage ?? "인사이트를 불러오지 못했습니다."}
        </p>
      </div>
    );
  }

  if (insight.status === "empty" || !insight.summary) {
    return (
      <div className={`rounded-xl border border-amber-500/25 bg-amber-950/15 px-4 py-4 text-left ${className}`}>
        <SectionTitle>경기 인사이트</SectionTitle>
        <p className="mt-2 text-sm text-amber-100/90">
          {insight.errorMessage ?? "텔레메트리 동기화 중입니다. 잠시 후 다시 확인해 주세요."}
        </p>
      </div>
    );
  }

  const { summary, myTouch, myXThreat, myRating, profile, profileLoading } = insight;
  const xThreat = summary.xThreat;
  const passChains = summary.passSequences.chains.length;
  const goals = myTouch?.goals ?? 0;
  const kickAttempts = myTouch?.kickAttempts ?? 0;
  const totalTouches = kickAttempts + goals;
  const matchGoalConversion = kickAttempts > 0 ? Math.min(1, goals / kickAttempts) : 0;

  return (
    <div className={`space-y-3 text-left ${className}`}>
      <div className="rounded-xl border border-cyan-500/25 bg-gradient-to-b from-cyan-950/40 to-[#070b14]/80 px-3.5 py-3">
        <SectionTitle>경기 요약</SectionTitle>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricCell label="경기 시간" value={formatMatchDuration(summary.matchDurationMs)} />
          <MetricCell label="이벤트" value={formatInt(summary.eventCount)} />
          <MetricCell label="점유 구간" value={formatInt(summary.possessionSegments.length)} />
          <MetricCell label="패스 체인" value={formatInt(passChains)} />
        </div>
        <p className="mt-2 text-[10px] text-slate-500">
          {summary.mode.toUpperCase()} · {summary.matchId.slice(0, 8)}…
        </p>
      </div>

      {xThreat ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 px-3.5 py-3">
          <SectionTitle>공격 가치 (xThreat)</SectionTitle>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricCell label="경기 xT" value={formatNumber(xThreat.matchTotal, 2)} />
            <MetricCell
              label="내 기여"
              value={formatNumber(myXThreat?.netContribution ?? null, 2)}
            />
            <MetricCell label="생성" value={formatNumber(myXThreat?.generated ?? null, 2)} />
            <MetricCell label="수신" value={formatNumber(myXThreat?.received ?? null, 2)} />
          </div>
          <p className="mt-2 text-[10px] text-slate-500">
            {xThreat.gridCols}×{xThreat.gridRows} 존 그리드 · 패스·슈팅·골 기반
          </p>
        </div>
      ) : null}

      {myRating ? (
        <div className="rounded-xl border border-rose-500/25 bg-rose-950/15 px-3.5 py-3">
          <SectionTitle>경기 레이팅</SectionTitle>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-black tabular-nums text-white">
              {formatRatingScore(myRating.overall)}
            </span>
            <span className="text-xs text-slate-400">OVR</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricCell label="공격" value={formatRatingScore(myRating.attack)} />
            <MetricCell label="볼 컨트롤" value={formatRatingScore(myRating.control)} />
            <MetricCell label="패스" value={formatRatingScore(myRating.passing)} />
            <MetricCell label="마무리" value={formatRatingScore(myRating.finishing)} />
          </div>
          {myRating.badges.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {myRating.badges.map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-100"
                >
                  {formatRatingBadge(b)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {summary.comparison ? (
        <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 px-3.5 py-3">
          <div className="flex items-center justify-between gap-2">
            <SectionTitle>You vs Opponent</SectionTitle>
            <div className="grid grid-cols-2 gap-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              <span className="text-right text-cyan-300/90">YOU</span>
              <span className="text-right text-rose-300/90">OPP</span>
            </div>
          </div>
          <div className="mt-2">
            <ComparisonRow
              label="OVR"
              selfValue={formatRatingScore(summary.comparison.self.overall)}
              oppValue={formatRatingScore(summary.comparison.opponent.overall)}
              winner={summary.comparison.winner.overall}
            />
            <ComparisonRow
              label="xT"
              selfValue={formatNumber(summary.comparison.self.xThreat, 1)}
              oppValue={formatNumber(summary.comparison.opponent.xThreat, 1)}
              winner={summary.comparison.winner.xThreat}
            />
            <ComparisonRow
              label="ATT"
              selfValue={formatRatingScore(summary.comparison.self.attack)}
              oppValue={formatRatingScore(summary.comparison.opponent.attack)}
              winner={summary.comparison.winner.attack}
            />
            <ComparisonRow
              label="CTRL"
              selfValue={formatRatingScore(summary.comparison.self.control)}
              oppValue={formatRatingScore(summary.comparison.opponent.control)}
              winner={summary.comparison.winner.control}
            />
            <ComparisonRow
              label="PASS"
              selfValue={formatRatingScore(summary.comparison.self.passing)}
              oppValue={formatRatingScore(summary.comparison.opponent.passing)}
              winner={summary.comparison.winner.passing}
            />
            <ComparisonRow
              label="FIN"
              selfValue={formatRatingScore(summary.comparison.self.finishing)}
              oppValue={formatRatingScore(summary.comparison.opponent.finishing)}
              winner={summary.comparison.winner.finishing}
            />
            <ComparisonRow
              label="TOUCH"
              selfValue={formatInt(summary.comparison.self.touches)}
              oppValue={formatInt(summary.comparison.opponent.touches)}
              winner={summary.comparison.winner.touches}
            />
            <ComparisonRow
              label="SHOT"
              selfValue={formatInt(summary.comparison.self.shots)}
              oppValue={formatInt(summary.comparison.opponent.shots)}
              winner={summary.comparison.winner.shots}
            />
            <ComparisonRow
              label="GOAL"
              selfValue={formatInt(summary.comparison.self.goals)}
              oppValue={formatInt(summary.comparison.opponent.goals)}
              winner={summary.comparison.winner.goals}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
          <SectionTitle>You vs Opponent</SectionTitle>
          <p className="mt-2 text-xs text-slate-500">Comparison unavailable</p>
        </div>
      )}

      {summary.coaching ? (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 px-3.5 py-3">
          <SectionTitle>AI Coach</SectionTitle>
          <div className="mt-3 space-y-3">
            {summary.coaching.strengths.length > 0 ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-400/90">강점</p>
                <CoachBulletList items={summary.coaching.strengths} />
              </div>
            ) : null}
            {summary.coaching.weaknesses.length > 0 ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-400/90">약점</p>
                <CoachBulletList items={summary.coaching.weaknesses} />
              </div>
            ) : null}
            {summary.coaching.recommendations.length > 0 ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-400/90">추천</p>
                <CoachBulletList items={summary.coaching.recommendations} />
              </div>
            ) : null}
          </div>
          <div className="mt-3 rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-300/80">다음 포커스</p>
            <p className="mt-0.5 text-sm font-bold text-white">{labelFocusArea(summary.coaching.focusArea)}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
          <SectionTitle>AI Coach</SectionTitle>
          <p className="mt-2 text-xs text-slate-500">Coaching unavailable</p>
        </div>
      )}

      {profile && profile.lastMatchId === matchId?.trim() && profile.coachFocusArea ? (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-3.5 py-3">
          <SectionTitle>Coach Progress</SectionTitle>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300/70">Focus</p>
              <p className="mt-0.5 text-sm font-bold text-white">
                {labelCoachFocusArea(
                  (profile.coachFocusArea as "Passing" | "Control" | "Finishing" | "Threat Creation" | "Possession" | "General") ??
                    "General",
                )}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300/70">Streak</p>
              <p className="mt-0.5 font-mono text-lg font-black tabular-nums text-cyan-100">
                {formatInt(profile.coachStreak ?? 0)}
              </p>
            </div>
            {profile.coachLastRecommendation?.target ? (
              <div className="col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300/70">Goal</p>
                <p className="mt-0.5 text-sm font-bold text-white">{profile.coachLastRecommendation.target}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {profile && profile.lastMatchId === matchId?.trim() && profile.lastSeasonDelta != null ? (
        <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 px-3.5 py-3">
          <SectionTitle>Season Progress</SectionTitle>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className={`font-mono text-lg font-black tabular-nums ${
                profile.lastSeasonDelta >= 0 ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {profile.lastSeasonDelta >= 0 ? "+" : ""}
              {profile.lastSeasonDelta} RP
            </span>
            <span className="text-sm font-bold text-white">{profile.seasonRank ?? "Bronze III"}</span>
          </div>
          {profile.lastSeasonPromoted && profile.lastSeasonRankBefore ? (
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-amber-300">
              PROMOTED → {profile.seasonRank}
            </p>
          ) : null}
          {profile.seasonPoints != null ? (
            <p className="mt-1 text-[10px] text-slate-500">{formatInt(profile.seasonPoints)} RP total</p>
          ) : null}
        </div>
      ) : profileLoading ? (
        <div className="rounded-xl border border-violet-500/20 bg-violet-950/10 px-3.5 py-3">
          <SectionTitle>Season Progress</SectionTitle>
          <div className="mt-2 flex items-center gap-2 text-xs text-violet-200/80">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            시즌 RP 동기화 중…
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-violet-500/25 bg-violet-950/15 px-3.5 py-3">
        <SectionTitle>내 활동</SectionTitle>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricCell label="터치" value={formatInt(totalTouches)} />
          <MetricCell label="슈팅" value={formatInt(kickAttempts)} />
          <MetricCell label="골" value={formatInt(goals)} />
          <MetricCell label="골 전환율" value={formatPercent(matchGoalConversion, 0)} />
          <MetricCell label="슈팅 파워" value={formatNumber(myTouch?.avgKickPower ?? null, 0)} />
          <MetricCell label="볼 거리" value={formatNumber(myTouch?.avgKickDistance ?? null, 1)} />
          <MetricCell
            label="점유 기여"
            value={formatPercent(insight.myPossessionContribution, 0)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 px-3.5 py-3">
        <SectionTitle>프로필 누적</SectionTitle>
        {profileLoading && !profile ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-100/80">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            프로필 동기화 중…
          </div>
        ) : profile ? (
          <>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <MetricCell label="경기 수" value={formatInt(profile.matchesPlayed)} />
              <MetricCell label="총 터치" value={formatInt(profile.totalTouches)} />
              <MetricCell label="경기당 터치" value={formatNumber(profile.avgTouchesPerMatch, 1)} />
              <MetricCell label="누적 골" value={formatInt(profile.goals)} />
              <MetricCell label="평균 파워" value={formatNumber(profile.avgKickPower, 0)} />
              <MetricCell label="평균 거리" value={formatNumber(profile.avgKickDistance, 1)} />
              <MetricCell label="골 전환율" value={formatPercent(profile.goalConversion, 0)} />
              <MetricCell
                label="점유 기여"
                value={formatPercent(profile.possessionContribution, 0)}
              />
            </div>
            {profile.avgOverall != null && profile.avgOverall > 0 ? (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MetricCell label="평균 OVR" value={formatRatingScore(profile.avgOverall)} />
                <MetricCell label="최고 OVR" value={formatRatingScore(profile.bestOverall)} />
                <MetricCell
                  label="평균 xT/경기"
                  value={formatNumber(profile.avgXThreatPerMatch, 2)}
                />
                <MetricCell
                  label="패스 성공률"
                  value={formatPercent(profile.passCompletionRate, 0)}
                />
              </div>
            ) : null}
          </>
        ) : (
          <p className="mt-2 text-xs text-slate-400">
            프로필이 아직 생성되지 않았습니다. 다음 경기 후 다시 확인해 주세요.
          </p>
        )}
      </div>

      <YagoProPaywallStrip
        surface="post_match"
        trigger="post_match"
        isPro={entitlements.data?.isPro}
        uid={myUid}
        className="mt-1"
      />
    </div>
  );
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { PlayPlayerStatsDoc } from "@/utils/playerStats";
import type { SimMatchEvent, SimulateMatchMeta, SimulateMatchResult } from "@/lib/play/simulation";
import {
  buildPlayerEventLog,
  buildRivalRosterFromAwayPower,
  buildRosterLineupContext,
  buildSimGrowthComparison,
  calculatePlayerImpact,
  deriveActionRates,
  simulateMatch,
} from "@/lib/play/simulation";
import { extractHighlightMomentSequence } from "@/lib/play/extractAvatarMoments";
import {
  HIGHLIGHT_PLAY_STYLE_LABEL_KO,
  highlightPlayStyleFromImpact,
  parseHighlightPlayStyleKey,
  styleShiftSuffix,
} from "@/lib/play/highlightPlayStyle";
import { resolveHomeMatchAwards } from "@/lib/play/matchAwards";
import { getTeamSimDigestState, recordPlaySimDigest } from "@/lib/play/simDigestStorage";
import MomentReplayBlock from "@/components/team/play/MomentReplayBlock";
import { buildLineupPickContextForTeam, normalizeQuarterMinutePlan } from "@/lib/play/teamGameParticipation";
import type { TeamGame } from "@/types/teamGame";
import { getTeamGame } from "@/services/teamGameService";
import { runLightTeamSimulation } from "@/utils/teamPlaySimulation";
import { compactMomentKo } from "@/lib/play/momentFormatKo";
import { computeEnhancedPlayTabMvpFromEvents, deterministicPlaySimKnobs } from "@/lib/play/playTabCanonicalMvp";

type Props = {
  open: boolean;
  onClose: () => void;
  teamName: string;
  roster: readonly PlayPlayerStatsDoc[];
  /** 현재 플레이 컨텍스트 팀 (출전 매핑 키) */
  teamId?: string | null;
  /** `team_games` 문서와 연결되면 출전 필드(playParticipation) 사용 */
  linkedMatchGameId?: string | null;
  highlightMemberId?: string | null;
};

function badgeSourceKo(source: SimulateMatchMeta["homeLineupSource"]): string {
  if (source === "actual") return "실제 라인업·출전 반영됨";
  if (source === "fallback") return "폴백 라인업";
  return "로스터 기반 시뮬레이션";
}

function labelEventKo(e: SimMatchEvent): string {
  const who = e.displayName || "선수";
  const sideKo = e.side === "home" ? "우리" : "상대";
  const slot = e.position ? ` (${e.position})` : "";

  if (e.type === "block") return `${who} 슛 차단 블록${slot} · ${sideKo}`;
  if (e.type === "save") return `${who} 슛 세이브${slot} · ${sideKo}`;
  if (e.type === "pass") {
    return e.success ? `${who} 패스 성공${slot} · ${sideKo}` : `${who} 패스 차단감각${slot} · ${sideKo}`;
  }
  if (e.type === "dribble") {
    return e.success ? `${who} 드리블 돌파${slot} · ${sideKo}` : `${who} 드리블 압박${slot} · ${sideKo}`;
  }
  if (e.type === "shot") {
    if (e.blocked) return `${who} 슛 차단당함${slot} · ${sideKo}`;
    if (!e.success) return `${who} 슛 빗나감${slot} · ${sideKo}`;
    if (e.goal) return `${who} 골 ⚽${slot} · ${sideKo}`;
    return `${who} 유효슛${slot} · ${sideKo}`;
  }
  return `${who}${slot}`;
}

type MetricSnap = {
  passPct: number;
  shotPct: number;
  touch: number;
};

function deltaMark(before: number, after: number): string {
  if (after > before) return " 🔼";
  if (after < before) return " 🔽";
  return " ─";
}

function resolveHighlightId(roster: readonly PlayPlayerStatsDoc[], hint?: string | null): string {
  const h = typeof hint === "string" ? hint.trim() : "";
  if (h && roster.some((p) => p.memberId === h)) return h;
  return roster[0]?.memberId ?? "";
}

export default function PlaySimulationModal({
  open,
  onClose,
  teamName,
  roster,
  teamId = null,
  linkedMatchGameId = null,
  highlightMemberId = null,
}: Props) {
  const [bundle, setBundle] = useState<{
    homeName: string;
    awayName: string;
    sim: SimulateMatchResult;
    awayPower: number;
    highlightId: string;
  } | null>(null);

  /** 연결 매치 문서 로딩: undefined 로딩, null 연결 안 함 또는 없음 */
  const [linkedGame, setLinkedGame] = useState<TeamGame | null | undefined>(undefined);

  const legacyPreview = useMemo(() => runLightTeamSimulation(teamName || "우리 팀", roster, "RIVAL FC", 340), [teamName, roster]);

  const [consecutivePair, setConsecutivePair] = useState<{
    prev: MetricSnap | null;
    curr: MetricSnap | null;
  }>({ prev: null, curr: null });

  useEffect(() => {
    if (!open) setConsecutivePair({ prev: null, curr: null });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!linkedMatchGameId?.trim()) {
      setLinkedGame(null);
      return;
    }
    let cancel = false;
    setLinkedGame(undefined);
    void getTeamGame(linkedMatchGameId.trim()).then((g) => {
      if (!cancel) setLinkedGame(g);
    });
    return () => {
      cancel = true;
    };
  }, [open, linkedMatchGameId]);

  const roll = useCallback(() => {
    const tid = typeof teamId === "string" ? teamId.trim() : "";
    const mid = linkedMatchGameId?.trim() ?? "";
    const knobs = tid && mid ? deterministicPlaySimKnobs(tid, mid, roster) : null;
    const awayPower = knobs?.awayPower ?? 280 + Math.floor(Math.random() * 160);
    const rivals = buildRivalRosterFromAwayPower("rival-ai", roster, awayPower);

    const qPlan = normalizeQuarterMinutePlan(linkedGame?.playParticipation?.quarterMinutePlan);
    const minutesFromSchedule = Math.max(42, Math.min(96, qPlan.reduce((a, b) => a + b, 0) || 60));

    const homeLineupPick = tid
      ? buildLineupPickContextForTeam(tid, linkedGame ?? null, roster, minutesFromSchedule)
      : buildRosterLineupContext();

    let sim: SimulateMatchResult;
    if (rivals.length === 0) {
      const hmId = typeof highlightMemberId === "string" ? highlightMemberId.trim() : "";
      sim = {
        scoreHome: legacyPreview.homeGoals,
        scoreAway: legacyPreview.awayGoals,
        events: [],
        meta: {
          homeLineupSource:
            homeLineupPick.lineupSource === "actual"
              ? "actual"
              : homeLineupPick.lineupSource === "fallback"
                ? "fallback"
                : "roster",
          awayLineupSource: "roster",
          quarterMinutesNormalized: qPlan,
          highlightHadActualWeights:
            !!hmId &&
            homeLineupPick.lineupSource === "actual" &&
            (homeLineupPick.weightByMember.get(hmId)?.w ?? 0) >= 0.28,
          totalMinutes: minutesFromSchedule,
        },
      };
    } else {
      sim = simulateMatch({
        homeRoster: roster,
        awayRoster: rivals,
        homeLineupPick,
        awayLineupPick: buildRosterLineupContext(),
        minutes: minutesFromSchedule,
        quarterMinutePlan: linkedGame?.playParticipation?.quarterMinutePlan,
        highlightMemberId,
        rng: knobs?.rng ?? Math.random,
      });
    }

    const highlightId = resolveHighlightId(roster, highlightMemberId);
    setBundle({
      homeName: teamName.trim() || "우리 팀",
      awayName: "RIVAL FC",
      sim,
      awayPower,
      highlightId,
    });
  }, [
    highlightMemberId,
    legacyPreview.awayGoals,
    legacyPreview.homeGoals,
    linkedGame,
    linkedMatchGameId,
    roster,
    teamId,
    teamName,
  ]);

  useEffect(() => {
    if (!open) return;
    if (linkedMatchGameId?.trim() && linkedGame === undefined) return;
    roll();
  }, [open, roll, linkedMatchGameId, linkedGame]);

  useLayoutEffect(() => {
    if (!open || !bundle) return;
    const hp = roster.find((p) => p.memberId === bundle.highlightId);
    if (!hp) return;

    const rates = deriveActionRates(hp.stats);
    const imp = calculatePlayerImpact(bundle.highlightId, bundle.sim.events);
    const touch =
      imp.passOk + imp.passFail + imp.dribbleOk + imp.dribbleFail + imp.shots + imp.blocks + imp.saves;
    const passTotal = imp.passOk + imp.passFail;
    const passEmp = passTotal > 0 ? Math.round((imp.passOk / passTotal) * 100) : 0;
    const shotTotal = imp.shots;
    const shotEmp = shotTotal > 0 ? Math.round((imp.shotsOnTarget / shotTotal) * 100) : 0;
    const curr: MetricSnap = {
      passPct: passEmp,
      shotPct: shotEmp,
      touch,
    };

    setConsecutivePair((old) => ({
      prev: old.curr,
      curr,
    }));

    const tid = teamId?.trim();
    if (tid) {
      const st = highlightPlayStyleFromImpact(imp);
      recordPlaySimDigest(tid, {
        matchId: linkedMatchGameId?.trim() || "unlinked",
        modeledPassPct: Math.round(rates.passSuccess * 100),
        modeledShotPct: Math.round(rates.shotQuality * 100),
        touchCount: touch,
        highlightPlayStyle: st.key,
      });
    }
  }, [open, bundle, roster, teamId, linkedMatchGameId]);

  const momentSeq = useMemo(() => {
    if (!bundle?.highlightId) return [];
    return extractHighlightMomentSequence(bundle.sim.events, bundle.highlightId);
  }, [bundle]);

  const crossPrior = useMemo(() => {
    const tid = teamId?.trim();
    if (!tid || !bundle) return null;
    const curId = linkedMatchGameId?.trim() || "unlinked";
    const { prior } = getTeamSimDigestState(tid);
    if (!prior || prior.matchId === curId) return null;
    return prior;
  }, [teamId, linkedMatchGameId, bundle, consecutivePair.curr]);

  const momentPlaybackKeyStable = useMemo(() => {
    if (!bundle?.highlightId) return "";
    return `${bundle.highlightId}-${bundle.sim.events.length}-${momentSeq.map((e) => `${e.minute}-${e.type}`).join("|")}`;
  }, [bundle, momentSeq]);

  const homeAwards = useMemo(() => {
    if (!bundle?.sim.events.length) return { mvp: null, momentKing: null } as const;
    const base = resolveHomeMatchAwards(bundle.sim.events);
    const tid = teamId?.trim();
    const mid = linkedMatchGameId?.trim();
    const enhancedMvp =
      tid && mid
        ? computeEnhancedPlayTabMvpFromEvents(bundle.sim.events, roster, tid, linkedGame ?? null)
        : null;
    return {
      mvp:
        enhancedMvp != null
          ? {
              playerId: enhancedMvp.memberId,
              displayName: enhancedMvp.displayName,
              score: enhancedMvp.scoreModel,
            }
          : base.mvp,
      momentKing: base.momentKing,
    };
  }, [bundle, teamId, linkedMatchGameId, roster, linkedGame]);

  const highlightStyleCurrent = useMemo(() => {
    if (!bundle?.highlightId || !bundle.sim.events.length) return null;
    const imp = calculatePlayerImpact(bundle.highlightId, bundle.sim.events);
    return highlightPlayStyleFromImpact(imp);
  }, [bundle]);

  const priorStyleKey = useMemo(() => {
    if (!crossPrior?.highlightPlayStyle) return null;
    return parseHighlightPlayStyleKey(crossPrior.highlightPlayStyle);
  }, [crossPrior?.highlightPlayStyle]);

  if (!open) return null;
  if ((linkedMatchGameId?.trim() && linkedGame === undefined) || !bundle) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-950/40">
        <p className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-lg">
          {linkedMatchGameId?.trim() && linkedGame === undefined ? "경기 데이터 불러오는 중…" : "매치 준비 중…"}
        </p>
      </div>
    );
  }

  const { sim, homeName, awayName, highlightId } = bundle;
  const myEvents = highlightId ? buildPlayerEventLog(highlightId, sim.events) : [];
  const impact = highlightId ? calculatePlayerImpact(highlightId, sim.events) : null;
  const highlightPlayer =
    roster.find((p) => p.memberId === highlightId) ?? roster.find((p) => p.memberId === impact?.memberId) ?? roster[0];
  const growthRows = highlightPlayer ? buildSimGrowthComparison(highlightPlayer) : [];

  const extraLines =
    impact && (impact.blocks > 0 || impact.saves > 0)
      ? [`블록 ${impact.blocks} · 세이브 ${impact.saves}`]
      : [];

  const mySummaryLines =
    impact != null
      ? [
          `${impact.passOk}회 패스 성공 · ${impact.passFail}회 실패`,
          `${impact.dribbleOk}회 드리블 성공 · ${impact.dribbleFail}회 압박`,
          `슛 시도 ${impact.shots} · 유효 ${impact.shotsOnTarget}${impact.goals > 0 ? ` · 골 ${impact.goals}` : ""} ⚽️`,
          ...extraLines,
        ].join("\n")
      : "";

  const hasMyAction =
    !!impact &&
    impact.passOk +
      impact.passFail +
      impact.dribbleOk +
      impact.dribbleFail +
      impact.shots +
      impact.goals +
      impact.blocks +
      impact.saves >
      0;

  const myRatesLive = highlightPlayer ? deriveActionRates(highlightPlayer.stats) : null;

  const showMoment =
    momentSeq.length > 0 &&
    (momentSeq.length >= 2 || momentSeq.some((e) => e.type === "shot" && e.goal));
  const shortMatchId = (id: string) => (id.length > 10 ? `${id.slice(0, 6)}…` : id);
  const currModelPass = myRatesLive ? Math.round(myRatesLive.passSuccess * 100) : null;
  const currModelShot = myRatesLive ? Math.round(myRatesLive.shotQuality * 100) : null;
  const currTouch = consecutivePair.curr?.touch ?? null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center p-4 sm:items-center">
      <button type="button" className="absolute inset-0 bg-gray-950/55 backdrop-blur-[2px]" aria-label="닫기" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="play-sim-title"
        className="relative z-[111] flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-indigo-200/90 bg-white shadow-2xl"
      >
        <div className="shrink-0 space-y-2 border-b border-indigo-100 bg-white p-6 pb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">플레이 시뮬</p>
          <h3 id="play-sim-title" className="text-2xl font-black tracking-tight text-gray-900">
            이벤트 스냅샷 매치
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black ${
                sim.meta.homeLineupSource === "actual"
                  ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200"
                  : "bg-gray-100 text-gray-800 ring-1 ring-gray-200"
              }`}
            >
              {badgeSourceKo(sim.meta.homeLineupSource)}
            </span>
            {linkedMatchGameId?.trim() ? (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">경기 연결됨</span>
            ) : (
              <span className="text-[10px] font-semibold text-gray-400">경기 미선택 · 로스터만 사용</span>
            )}
          </div>
          <p className="text-xs leading-relaxed text-gray-600">
            카드·출전 배율·포지션 편향이 패스·드리블·슛·블록·세이브 로그로 이어져요.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6 pt-4">
          <section>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">경기 결과</p>
            <div className="mt-3 rounded-2xl bg-gradient-to-r from-indigo-700 to-violet-800 px-4 py-5 text-center text-white shadow-inner">
              <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                <span className="truncate text-left">{homeName}</span>
                <span className="tabular-nums text-xl font-black sm:text-2xl">
                  {sim.scoreHome} : {sim.scoreAway}
                </span>
                <span className="truncate text-right">{awayName}</span>
              </div>
              <p className="mt-2 text-[10px] font-medium text-indigo-100/90">
                전력 변수 {bundle.awayPower} · 총 {sim.meta.totalMinutes}분 분할{" "}
                {sim.meta.quarterMinutesNormalized.join("/")} (쿼터 분·스케일)
              </p>
            </div>
          </section>

          {sim.events.length > 0 && (homeAwards.mvp != null || homeAwards.momentKing != null) ? (
            <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50/90 p-4 shadow-inner ring-1 ring-amber-100">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-900">이 경기 시상 (우리 팀 로그 기준)</p>
              {homeAwards.mvp ? (
                <p className="mt-2 text-lg font-black tracking-tight text-gray-950">
                  <span aria-hidden className="mr-1">
                    🏆
                  </span>
                  MVP · {homeAwards.mvp.displayName}
                </p>
              ) : null}
              {homeAwards.momentKing ? (
                <p
                  className={`font-bold text-amber-950 ${
                    homeAwards.mvp != null && homeAwards.momentKing.playerId === homeAwards.mvp.playerId ? "mt-1.5 text-sm" : "mt-2 text-sm"
                  }`}
                >
                  <span aria-hidden className="mr-1">
                    🔥
                  </span>
                  MOMENT KING · {homeAwards.momentKing.displayName}
                </p>
              ) : null}
              {homeAwards.mvp != null &&
              homeAwards.momentKing != null &&
              homeAwards.mvp.playerId === homeAwards.momentKing.playerId ? (
                <p className="mt-2 text-[11px] leading-relaxed text-amber-900/85">
                  같은 선수에게 MVP와 순간 폭발력이 함께 걸린 하이라이트예요 · 팀 채널로 자랑해 보세요.
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-orange-50/80 p-4 shadow-inner">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-rose-600">내 아바타 활약</p>
            {!highlightPlayer || !impact ? (
              <p className="mt-2 text-sm font-medium text-rose-950/85">카드가 필요해요. 플레이 탭에서 먼저 카드를 선택해 주세요.</p>
            ) : (
              <>
                <p className="mt-1 text-lg font-black text-gray-900">{impact.displayName}</p>
                <p className="mt-2 rounded-lg bg-white/80 px-3 py-2 text-[11px] font-semibold text-rose-900/98 ring-1 ring-rose-100">
                  {sim.meta.highlightHadActualWeights
                    ? "선택된 경기(team_games 출전 필드) 기준으로 활동량이 조정되었어요."
                    : "카드 라인업(플레이 탭 로스터) 기준입니다. 해당 경기에 출전 행만 있으면 가중치가 올라가요."}
                </p>
                {hasMyAction ? (
                  <pre className="mt-3 whitespace-pre-wrap font-sans text-sm font-semibold leading-relaxed text-rose-950/95">
                    {mySummaryLines}
                  </pre>
                ) : (
                  <p className="mt-3 text-sm font-semibold text-rose-950/90">
                    이번 매치에서는 공이 많이 들어오지 않았어요. 한 번 더 돌려보면 내 캐릭터가 더 자주 활약합니다.
                  </p>
                )}
                {myRatesLive ? (
                  <p className="mt-3 text-[11px] leading-relaxed text-rose-900/85">
                    모델 기준 패스 연결 성공 가능성 약 {(myRatesLive.passSuccess * 100).toFixed(0)}%, 슛 품질 판정 약 {(myRatesLive.shotQuality * 100).toFixed(0)}%
                  </p>
                ) : null}
                {highlightStyleCurrent ? (
                  <p className="mt-2 text-[11px] font-bold leading-relaxed text-rose-950/92">
                    이번 경기 플레이 성향 · <span className="text-indigo-800">{highlightStyleCurrent.labelKo}</span>
                  </p>
                ) : null}
                {showMoment && impact ? (
                  <MomentReplayBlock
                    sequence={momentSeq}
                    fallbackName={impact.displayName}
                    formatAction={compactMomentKo}
                    playbackKey={momentPlaybackKeyStable}
                    stepMs={1000}
                    startOnButton
                  />
                ) : null}
                {myEvents.length > 0 && (
                  <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-[11px] font-semibold text-rose-950/95">
                    {myEvents.slice(0, 10).map((e, idx) => (
                      <li key={`${e.minute}-${e.type}-${idx}`} className="tabular-nums">
                        {String(e.minute).padStart(2, "0")}
                        분
                        {e.quarter != null ? `·Q${e.quarter}` : ""} · {labelEventKo(e)}
                      </li>
                    ))}
                    {myEvents.length > 10 ? <li className="text-rose-800/75">외 {myEvents.length - 10}개 이벤트…</li> : null}
                  </ul>
                )}
              </>
            )}
          </section>

          {growthRows.length > 0 && (
            <section className="rounded-xl border border-emerald-100 bg-emerald-50/85 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">성장 체감 (모델)</p>
              <p className="mt-1 text-[11px] text-emerald-900/85">recentGrowth 역산 카드와 지금 카드를 비교한 추정 성공 가능성입니다.</p>
              <ul className="mt-3 space-y-2 text-sm font-bold text-emerald-950">
                {growthRows.map((row) => {
                  const up = row.afterPct > row.beforePct ? " 🔼" : row.afterPct < row.beforePct ? " 🔽" : " ─";
                  return (
                    <li key={row.label} className="flex justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 shadow-sm">
                      <span className="text-xs font-semibold text-emerald-800">{row.label}</span>
                      <span className="tabular-nums text-xs">
                        {row.beforePct}% → {row.afterPct}%{up}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {consecutivePair.prev && consecutivePair.curr ? (
            <section className="rounded-xl border border-sky-100 bg-sky-50/90 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-sky-800">직전 재실행 대비 (로그)</p>
              <p className="mt-1 text-[11px] text-sky-900/85">방금 연속으로 돌린 시뮬에서 내 이벤트 비율이 어떻게 달라졌는지 보여요.</p>
              <ul className="mt-3 space-y-2 text-sm font-bold text-sky-950">
                <li className="flex justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 shadow-sm">
                  <span className="text-xs font-semibold text-sky-800">패스 성공 비율</span>
                  <span className="tabular-nums text-xs">
                    {consecutivePair.prev.passPct}% → {consecutivePair.curr.passPct}%
                    {deltaMark(consecutivePair.prev.passPct, consecutivePair.curr.passPct)}
                  </span>
                </li>
                <li className="flex justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 shadow-sm">
                  <span className="text-xs font-semibold text-sky-800">슛 유효 비율</span>
                  <span className="tabular-nums text-xs">
                    {consecutivePair.prev.shotPct}% → {consecutivePair.curr.shotPct}%
                    {deltaMark(consecutivePair.prev.shotPct, consecutivePair.curr.shotPct)}
                  </span>
                </li>
                <li className="flex justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 shadow-sm">
                  <span className="text-xs font-semibold text-sky-800">참여 이벤트</span>
                  <span className="tabular-nums text-xs">
                    {consecutivePair.prev.touch} → {consecutivePair.curr.touch}
                    {deltaMark(consecutivePair.prev.touch, consecutivePair.curr.touch)}
                  </span>
                </li>
              </ul>
            </section>
          ) : null}

          {crossPrior &&
          currModelPass != null &&
          currModelShot != null &&
          currTouch != null ? (
            <section className="rounded-xl border border-violet-100 bg-violet-50/90 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-violet-800">이전 경기 시뮬 vs 이번</p>
              <p className="mt-1 text-[11px] text-violet-900/85">
                직전 연결 경기(
                <span className="font-mono font-semibold">{shortMatchId(crossPrior.matchId)}</span>) 마지막 스냅샷과 비교한 값이에요.
              </p>
              <ul className="mt-3 space-y-2 text-sm font-bold text-violet-950">
                <li className="flex justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 shadow-sm">
                  <span className="text-xs font-semibold text-violet-800">패스 성공 가능성 (모델)</span>
                  <span className="tabular-nums text-xs">
                    {crossPrior.modeledPassPct}% → {currModelPass}%
                    {deltaMark(crossPrior.modeledPassPct, currModelPass)}
                  </span>
                </li>
                <li className="flex justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 shadow-sm">
                  <span className="text-xs font-semibold text-violet-800">슛 품질 (모델)</span>
                  <span className="tabular-nums text-xs">
                    {crossPrior.modeledShotPct}% → {currModelShot}%
                    {deltaMark(crossPrior.modeledShotPct, currModelShot)}
                  </span>
                </li>
                <li className="flex justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 shadow-sm">
                  <span className="text-xs font-semibold text-violet-800">참여 이벤트 (로그)</span>
                  <span className="tabular-nums text-xs">
                    {crossPrior.touchCount} → {currTouch}
                    {deltaMark(crossPrior.touchCount, currTouch)}
                  </span>
                </li>
                {highlightStyleCurrent && priorStyleKey ? (
                  <li className="flex justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 shadow-sm">
                    <span className="text-xs font-semibold text-violet-800">플레이 성향 (로그 스냅샷)</span>
                    <span className="text-right text-xs font-black leading-snug">
                      <span>{HIGHLIGHT_PLAY_STYLE_LABEL_KO[priorStyleKey]}</span>
                      {" → "}
                      <span className="text-violet-950">{highlightStyleCurrent.labelKo}</span>
                      {styleShiftSuffix(priorStyleKey, highlightStyleCurrent.key)}
                    </span>
                  </li>
                ) : null}
                {highlightStyleCurrent && crossPrior && !priorStyleKey ? (
                  <li className="rounded-lg bg-white/65 px-3 py-2 text-[11px] font-semibold leading-relaxed text-violet-900/95">
                    이전 경기 저장분에는 플레이 성향 필드가 없어요 · 앞으로 이 기기에서 쌓이면 여기에서 비교돼요.
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}

          <section>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">전체 이벤트 타임라인</p>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">{sim.events.length}</span>
            </div>
            <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/80 pr-2">
              {sim.events.length === 0 ? (
                <p className="p-4 text-sm text-gray-600">레거시 전력 결과만 존재해요 · 라인업을 채워 다시 실행해 보세요.</p>
              ) : (
                <ol className="space-y-1.5 px-4 py-3 text-[11px] font-semibold text-gray-800">
                  {sim.events.map((e, idx) => (
                    <li key={`evt-${idx}-${e.minute}-${e.type}`} className="leading-snug tabular-nums">
                      <span className="text-gray-400">{String(e.minute).padStart(2, "0")}분</span>
                      {e.quarter != null ? <span className="text-gray-400">·Q{e.quarter}</span> : null} · {labelEventKo(e)}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2 pb-2">
            <button
              type="button"
              onClick={() => roll()}
              className="rounded-xl border border-indigo-200 bg-indigo-50 py-3 text-sm font-bold text-indigo-900 hover:bg-indigo-100"
            >
              한 판 더
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-bold text-white shadow-md hover:from-indigo-500 hover:to-violet-500"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

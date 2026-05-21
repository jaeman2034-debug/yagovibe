import { useState } from "react";
import type { PlayTabMvpBanner } from "@/lib/play/playTabCanonicalMvp";
import type { SimMatchEvent } from "@/lib/play/simulation";
import { compactMomentKo } from "@/lib/play/momentFormatKo";
import MomentReplayBlock from "./MomentReplayBlock";

type Source = "live" | "recent";

type Props = {
  mvp: PlayTabMvpBanner;
  matchHint?: string;
  source: Source;
  /** 나 vs MVP — 로그인·카드 없으면 me null */
  myMetrics: PlayTabMvpBanner | null;
  mvpMetrics: PlayTabMvpBanner;
  momentSequence: readonly SimMatchEvent[];
  playbackKey: string;
};

function cmpRow(label: string, me: string, they: string) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1 rounded-lg bg-white/70 px-3 py-2 text-[12px] ring-1 ring-amber-100/90">
      <span className="font-semibold text-gray-700">{label}</span>
      <span className="text-right font-bold tabular-nums text-indigo-900">{me}</span>
      <span className="text-right font-black tabular-nums text-amber-950">{they}</span>
    </div>
  );
}

export default function PlayTabMvpPanel({
  mvp,
  matchHint,
  source,
  myMetrics,
  mvpMetrics,
  momentSequence,
  playbackKey,
}: Props) {
  const [open, setOpen] = useState(false);

  const inf = (row: PlayTabMvpBanner) =>
    row.influenceDenominator > 0 ? `${row.influenceRank}위/${row.influenceDenominator}명` : "—";

  const titleEyebrow = source === "recent" ? "최근 MVP" : "이번 경기 MVP";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-300/90 shadow-[0_16px_40px_-12px_rgba(245,158,11,0.55)] ring-1 ring-amber-200/60">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-1/4 top-0 h-48 w-[150%] animate-play-glow-pulse bg-gradient-to-r from-amber-400/25 via-orange-400/20 to-rose-400/25 blur-2xl"
      />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative z-[1] w-full rounded-t-2xl px-5 pb-4 pt-4 text-left ring-1 ring-white/80 transition hover:bg-amber-50/40"
        aria-expanded={open}
        aria-controls="play-tab-mvp-detail"
        id="play-tab-mvp-trigger"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-950/90">{titleEyebrow}</p>
            {source === "recent" ? (
              <p className="mt-1 text-[10px] font-semibold text-amber-900/80">직전 공식 스냅샷 유지 · 로스터 변경 시 재계산과 다를 수 있어요</p>
            ) : null}
            {matchHint ? (
              <p className="mt-1 truncate text-[10px] font-semibold text-amber-900/75">{matchHint}</p>
            ) : null}
            <p className="mt-2 flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-gray-950" aria-hidden>
                🏆
              </span>
              <span className="truncate text-2xl font-black tracking-tight text-gray-950">{mvp.displayName}</span>
              <span className="rounded-full bg-amber-200/90 px-2.5 py-0.5 text-xs font-bold text-amber-950 ring-1 ring-amber-300/80">
                {mvp.mainPosition}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="rounded-xl bg-white/80 px-3 py-2 text-right shadow-inner ring-1 ring-amber-100/90">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800/80">공식 점수</p>
              <p className="mt-0.5 text-xs font-black tabular-nums text-amber-950">{mvp.scoreModel}</p>
            </div>
            <span className="text-[10px] font-bold text-amber-900/90">
              {open ? "▲ 접기" : "▼ MVP 하이라이트 · 나와 비교"}
            </span>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-white/75 px-3 py-2 ring-1 ring-amber-100/90">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500">골</dt>
            <dd className="mt-0.5 font-black text-gray-950">⚽ {mvp.goals}골</dd>
          </div>
          <div className="rounded-lg bg-white/75 px-3 py-2 ring-1 ring-amber-100/90">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500">슛 성공(로그)</dt>
            <dd className="mt-0.5 font-black text-gray-950">🎯 {mvp.shotSuccessPct}%</dd>
          </div>
          <div className="rounded-lg bg-white/75 px-3 py-2 ring-1 ring-amber-100/90">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500">출전 영향력</dt>
            <dd className="mt-0.5 font-black text-gray-950">🔥 {inf(mvp)}</dd>
          </div>
        </dl>
      </button>

      <div id="play-tab-mvp-detail" className="relative border-t border-amber-200/70 bg-gradient-to-b from-amber-50/50 to-white/95 px-5 py-4">
        {!open ? (
          <p className="text-center text-[11px] font-medium text-amber-950/75">카드를 눌러 MVP의 MOMENT만 재생하고, 내 기록과 비교해 보세요.</p>
        ) : (
          <div className="space-y-5">
            {myMetrics ? (
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500">나 vs MVP</p>
                <div className="mt-2 mb-2 grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  <span />
                  <span className="text-right text-indigo-700">나</span>
                  <span className="text-right text-amber-900">MVP</span>
                </div>
                <div className="space-y-1.5">
                  {cmpRow("골", `${myMetrics.goals}`, `${mvpMetrics.goals}`)}
                  {cmpRow("슛 성공률", `${myMetrics.shotSuccessPct}%`, `${mvpMetrics.shotSuccessPct}%`)}
                  {cmpRow("이벤트 참여(터치)", `${myMetrics.eventTouches}`, `${mvpMetrics.eventTouches}`)}
                  {cmpRow("출전 영향력", inf(myMetrics), inf(mvpMetrics))}
                  {cmpRow("공식 점수", `${myMetrics.scoreModel}`, `${mvpMetrics.scoreModel}`)}
                </div>
              </div>
            ) : (
              <p className="rounded-lg bg-indigo-50/90 px-3 py-2 text-[11px] font-medium text-indigo-950 ring-1 ring-indigo-100">
                로그인 후 내 카드가 있으면 MVP와 지표 비교가 열려요.
              </p>
            )}

            {momentSequence.length > 0 ? (
              <MomentReplayBlock
                sequence={momentSequence}
                fallbackName={mvp.displayName}
                formatAction={compactMomentKo}
                playbackKey={`${playbackKey}-mvp-moment`}
                stepMs={1000}
                startOnButton
              />
            ) : (
              <p className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-[11px] font-medium text-amber-950">
                이 스냅샷에서 MVP의 공격 이벤트가 비어 있어요 · 다른 경기를 선택해 보세요.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

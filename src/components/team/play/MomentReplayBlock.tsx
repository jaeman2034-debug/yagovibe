import { useEffect, useState } from "react";
import type { SimMatchEvent } from "@/lib/play/simulation";

type Props = {
  sequence: readonly SimMatchEvent[];
  fallbackName: string;
  formatAction: (e: SimMatchEvent) => string;
  /** bundle이 바뀔 때마다 넘겨 재생을 리셋 */
  playbackKey: string;
  /** 한 줄 간격(ms). 기본 1000 */
  stepMs?: number;
  /**
   * true: 마운트 후 ▶ 재생 클릭 시에만 자동 한 줄씩(기본)
   * false: 예전처럼 바로 자동 재생
   */
  startOnButton?: boolean;
};

export default function MomentReplayBlock({
  sequence,
  fallbackName,
  formatAction,
  playbackKey,
  stepMs = 1000,
  startOnButton = true,
}: Props) {
  const [revealed, setRevealed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hasStarted, setHasStarted] = useState(!startOnButton);

  useEffect(() => {
    setPaused(false);
    const immediate = !startOnButton && sequence.length > 0;
    setHasStarted(!startOnButton);
    setRevealed(immediate ? 1 : 0);
  }, [playbackKey, sequence.length, startOnButton]);

  useEffect(() => {
    if (!sequence.length || paused) return;
    if (startOnButton && !hasStarted) return;
    if (revealed >= sequence.length) return;
    const t = window.setTimeout(() => setRevealed((n) => n + 1), stepMs);
    return () => clearTimeout(t);
  }, [sequence.length, revealed, paused, stepMs, hasStarted, startOnButton]);

  if (!sequence.length) return null;

  const visible = sequence.slice(0, revealed);
  const showList = !startOnButton || hasStarted;

  const handlePlay = () => {
    setPaused(false);
    setHasStarted(true);
    setRevealed(sequence.length > 0 ? 1 : 0);
  };

  return (
    <div className="mt-3 rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-yellow-50/90 p-3 ring-1 ring-amber-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-900">MOMENT · 하이라이트</p>
        <div className="flex flex-wrap justify-end gap-1.5">
          {startOnButton && hasStarted ? (
            <>
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="rounded-md border border-amber-300/90 bg-white px-2 py-0.5 text-[10px] font-bold text-amber-950 hover:bg-amber-50"
              >
                {paused ? "재생" : "일시정지"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaused(false);
                  setRevealed(1);
                }}
                className="rounded-md border border-amber-400/80 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-950 hover:bg-amber-200/90"
              >
                처음부터
              </button>
            </>
          ) : null}
        </div>
      </div>

      {startOnButton && !hasStarted ? (
        <button
          type="button"
          onClick={handlePlay}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-400 bg-gradient-to-r from-amber-100 to-yellow-100 py-3 text-sm font-black text-amber-950 shadow-inner ring-1 ring-amber-200/80 transition hover:from-amber-200/90 hover:to-yellow-50"
        >
          <span className="text-lg" aria-hidden>
            ▶
          </span>
          MOMENT 재생
          <span className="text-[11px] font-semibold text-amber-800/90">({sequence.length}줄 · {stepMs / 1000}초 간격)</span>
        </button>
      ) : null}

      {showList ? (
        <ul className="mt-2 space-y-2 text-[11px] font-bold text-amber-950/95">
          {visible.map((e, idx) => {
            const latest = idx === visible.length - 1;
            return (
              <li
                key={`${playbackKey}-${e.minute}-${e.type}-${idx}`}
                className={`tabular-nums leading-snug transition-all duration-300 ${
                  latest
                    ? "rounded-lg bg-white/90 px-2 py-1.5 font-black text-amber-950 shadow-sm ring-2 ring-amber-300/95"
                    : "opacity-72"
                }`}
              >
                <span className="text-amber-800/85">{String(e.minute).padStart(2, "0")}&apos;</span>{" "}
                {e.displayName || fallbackName} → {formatAction(e)}
              </li>
            );
          })}
        </ul>
      ) : null}

      {showList ? (
        <p className="mt-2 text-[10px] font-medium text-amber-900/70">
          {revealed >= sequence.length ? (
            <>종료{!paused && hasStarted ? " · 「처음부터」로 다시 볼 수 있어요" : ""}</>
          ) : (
            <>
              재생 중… {revealed}/{sequence.length}
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}

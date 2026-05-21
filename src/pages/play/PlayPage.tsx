import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type ShotResult = {
  id: number;
  success: boolean;
  accuracy: number;
  xpGain: number;
};

const MAX_SHOTS = 5;
const DAILY_XP_CAP = 300;

export default function PlayPage() {
  const navigate = useNavigate();
  const [xp, setXp] = useState(240);
  const [power, setPower] = useState(20);
  const [shots, setShots] = useState<ShotResult[]>([]);
  const [floatingXp, setFloatingXp] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragNow, setDragNow] = useState<{ x: number; y: number } | null>(null);
  const pitchRef = useRef<HTMLDivElement | null>(null);

  const successCount = useMemo(() => shots.filter((s) => s.success).length, [shots]);
  const avgAccuracy = useMemo(() => {
    if (shots.length === 0) return 0;
    return Math.round(shots.reduce((acc, cur) => acc + cur.accuracy, 0) / shots.length);
  }, [shots]);
  const progressPct = Math.min((xp / DAILY_XP_CAP) * 100, 100);

  const shootByPower = (shotPower: number, direction: { x: number; y: number }) => {
    if (shots.length >= MAX_SHOTS) return;
    // 수직(위쪽) 성분이 강할수록 정확도 보정
    const directionBonus = Math.max(0, Math.min(15, Math.round((direction.y / 160) * 15)));
    const accuracy = Math.max(
      40,
      Math.min(99, Math.round(shotPower + directionBonus + (Math.random() * 20 - 10)))
    );
    const success = accuracy >= 70;
    const xpGain = success ? 20 : 5;
    const next = [...shots, { id: Date.now(), success, accuracy, xpGain }];
    setShots(next);

    setXp((prev) => Math.min(DAILY_XP_CAP, prev + xpGain));
    setFloatingXp(xpGain);
    window.setTimeout(() => setFloatingXp(null), 850);
  };

  const beginDrag = (clientX: number, clientY: number) => {
    if (shots.length >= MAX_SHOTS) return;
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
    setDragNow({ x: clientX, y: clientY });
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    if (!dragStart) return;
    setDragNow({ x: clientX, y: clientY });
    const dx = clientX - dragStart.x;
    const dy = dragStart.y - clientY; // 위로 갈수록 +
    const dist = Math.min(160, Math.hypot(dx, dy));
    const nextPower = Math.max(20, Math.min(100, Math.round((dist / 160) * 100)));
    setPower(nextPower);
  };

  const endDrag = () => {
    if (!isDragging || !dragStart || !dragNow) {
      setIsDragging(false);
      setDragStart(null);
      setDragNow(null);
      return;
    }
    const dx = dragNow.x - dragStart.x;
    const dy = dragStart.y - dragNow.y;
    if (Math.hypot(dx, dy) >= 18) {
      shootByPower(power, { x: dx, y: dy });
    }
    setIsDragging(false);
    setDragStart(null);
    setDragNow(null);
  };

  const resetRound = () => {
    setShots([]);
    setPower(60);
  };

  return (
    <div className="mx-auto w-full max-w-none md:max-w-3xl bg-slate-950 px-4 pb-8 pt-4 text-white">
      <header className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold"
        >
          ← 뒤로
        </button>
        <h1 className="text-base font-black">플레이</h1>
        <button type="button" className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold">
          ⚙ 설정
        </button>
      </header>

      <section className="relative mb-4 rounded-2xl bg-white/10 p-4">
        <p className="text-xs font-semibold text-blue-200">🏆 현재 상태 HUD</p>
        <p className="mt-1 text-sm font-bold">
          XP: {xp} / {DAILY_XP_CAP}
        </p>
        <div className="mt-2 h-2 w-full rounded-full bg-white/20">
          <div
            className="h-2 rounded-full bg-cyan-400 transition-[width] duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-semibold text-amber-300">🔥 오늘 보너스: +20 XP</p>
        {floatingXp !== null && (
          <p className="pointer-events-none absolute right-4 top-3 text-sm font-black text-emerald-300 animate-pulse">
            +{floatingXp} XP
          </p>
        )}
      </section>

      <section className="mb-4 rounded-2xl border border-white/15 bg-gradient-to-b from-emerald-900/40 to-slate-900 p-4">
        <p className="mb-2 text-xs font-semibold text-slate-200">🎯 게임 영역</p>
        <div
          ref={pitchRef}
          className="relative h-48 touch-none rounded-xl border border-white/10 bg-green-900/30"
          onMouseDown={(e) => beginDrag(e.clientX, e.clientY)}
          onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (!t) return;
            beginDrag(t.clientX, t.clientY);
          }}
          onTouchMove={(e) => {
            const t = e.touches[0];
            if (!t) return;
            moveDrag(t.clientX, t.clientY);
          }}
          onTouchEnd={endDrag}
        >
          <div className="absolute left-1/2 top-3 -translate-x-1/2 text-2xl">🥅</div>
          <div className="absolute left-1/2 top-16 -translate-x-1/2 text-xl">🎯</div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-3xl">⚽</div>
          {isDragging && dragStart && dragNow && (
            <>
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                <line
                  x1={`${((dragStart.x - (pitchRef.current?.getBoundingClientRect().left ?? 0)) /
                    (pitchRef.current?.getBoundingClientRect().width ?? 1)) *
                    100}%`}
                  y1={`${((dragStart.y - (pitchRef.current?.getBoundingClientRect().top ?? 0)) /
                    (pitchRef.current?.getBoundingClientRect().height ?? 1)) *
                    100}%`}
                  x2={`${((dragNow.x - (pitchRef.current?.getBoundingClientRect().left ?? 0)) /
                    (pitchRef.current?.getBoundingClientRect().width ?? 1)) *
                    100}%`}
                  y2={`${((dragNow.y - (pitchRef.current?.getBoundingClientRect().top ?? 0)) /
                    (pitchRef.current?.getBoundingClientRect().height ?? 1)) *
                    100}%`}
                  stroke="rgba(34,211,238,0.95)"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              </svg>
              <p className="absolute left-3 top-3 rounded bg-cyan-400/15 px-2 py-1 text-[11px] font-bold text-cyan-200">
                드래그 중 · 파워 {power}
              </p>
            </>
          )}
          <p className="absolute bottom-2 right-3 text-[10px] text-white/70">드래그로 방향·힘 조절</p>
        </div>
      </section>

      <section className="mb-4 rounded-2xl bg-white/10 p-4">
        <p className="mb-2 text-xs font-semibold text-slate-200">⚡ 파워 게이지</p>
        <input
          type="range"
          min={20}
          max={100}
          value={power}
          onChange={(e) => setPower(Number(e.target.value))}
          className="w-full accent-cyan-400"
        />
      </section>

      <section className="mb-4 rounded-2xl bg-white/10 p-4">
        <p className="text-xs font-semibold text-slate-200">📊 결과</p>
        <p className="mt-1 text-sm">슛 성공: {successCount} / {shots.length || 0}</p>
        <p className="text-sm">정확도: {avgAccuracy}%</p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled
          className="rounded-xl bg-cyan-500/70 py-3 text-sm font-black text-slate-950 opacity-70"
        >
          드래그로 슛
        </button>
        <button
          type="button"
          onClick={resetRound}
          className="rounded-xl border border-white/20 bg-white/5 py-3 text-sm font-bold"
        >
          다시 하기
        </button>
      </div>
    </div>
  );
}

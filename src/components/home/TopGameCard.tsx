import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type TopGameCardProps = {
  stage: "NEW" | "ACTIVE";
  xp?: number;
  xpCap?: number;
  titleNew?: string;
  subtitleNew?: string;
  titleActive?: string;
  newBonusText?: string;
  activeHintText?: string;
  activeBonusText?: string;
  primaryLabelNew?: string;
  primaryLabelActive?: string;
  onPrimaryClick?: () => void;
};

export default function TopGameCard({
  stage,
  xp = 0,
  xpCap = 300,
  titleNew = "아바타 시작",
  subtitleNew = "첫 플레이 시 +20 XP",
  titleActive = "이번 주 진행도",
  newBonusText = "오늘 보너스 있음",
  activeHintText = "현재 XP",
  activeBonusText = "오늘 보너스 있음",
  primaryLabelNew = "지금 시작",
  primaryLabelActive = "🎮 XP 얻기",
  onPrimaryClick,
}: TopGameCardProps) {
  const navigate = useNavigate();
  const prevXpRef = useRef<number>(Math.max(0, xp));
  const displayedXpRef = useRef<number>(Math.max(0, xp));
  const [displayedXp, setDisplayedXp] = useState<number>(Math.max(0, xp));
  const [xpGainToast, setXpGainToast] = useState<number>(0);

  const currentXp = Math.max(0, xp);

  useEffect(() => {
    const from = prevXpRef.current;
    const to = currentXp;
    prevXpRef.current = to;

    if (to > from) {
      setXpGainToast(to - from);
      const toastTimer = window.setTimeout(() => setXpGainToast(0), 1300);
      return () => window.clearTimeout(toastTimer);
    }
    return;
  }, [currentXp]);

  useEffect(() => {
    const from = displayedXpRef.current;
    const to = currentXp;
    if (from === to) return;

    const durationMs = 550;
    const startedAt = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (to - from) * eased);
      displayedXpRef.current = next;
      setDisplayedXp(next);
      if (t < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [currentXp]);
  const handlePrimary = () => {
    if (typeof onPrimaryClick === "function") {
      onPrimaryClick();
      return;
    }
    navigate("/play");
  };

  if (stage === "NEW") {
    return (
      <div className="mb-4 w-full rounded-2xl bg-white p-4 shadow">
        <h2 className="mb-1 text-lg font-bold">{titleNew}</h2>
        <p className="text-sm font-semibold text-gray-700">{subtitleNew}</p>
        <p className="mb-3 mt-1 text-xs font-bold text-amber-600">🔥 {newBonusText}</p>

        <button
          type="button"
          onClick={handlePrimary}
          className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white"
        >
          {primaryLabelNew}
        </button>
      </div>
    );
  }

  const safeCap = Math.max(1, xpCap);
  // "300 남음" 같은 거대한 숫자 대신, 지금 누르면 얻을 수 있는 단기 목표를 강조.
  const remainingXp = Math.max(0, safeCap - currentXp);
  const actionableXp = Math.max(0, Math.min(60, remainingXp));
  const percent = Math.min((displayedXp / safeCap) * 100, 100);

  return (
    <div className="relative mb-4 w-full rounded-2xl bg-white p-4 shadow">
      <h2 className="mb-2 text-lg font-bold">{titleActive}</h2>

      <p className="mb-1 text-sm font-bold text-blue-700">🔥 오늘 +{actionableXp} XP 가능</p>
      <p className="mb-2 text-xs text-gray-500">
        {activeHintText}: {currentXp} XP · 목표: {safeCap} XP
      </p>

      <div className="mb-3 h-2 w-full rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-blue-500 transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mb-3 text-xs font-bold text-amber-600">🔥 {activeBonusText}</p>

      {xpGainToast > 0 && (
        <div className="pointer-events-none absolute right-4 top-3 rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-600 shadow-sm animate-pulse">
          +{xpGainToast} XP
        </div>
      )}

      <button
        type="button"
        onClick={handlePrimary}
        className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white"
      >
        {primaryLabelActive}
      </button>
    </div>
  );
}

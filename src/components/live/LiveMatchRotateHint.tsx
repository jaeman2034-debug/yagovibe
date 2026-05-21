import { useEffect, useState } from "react";
import { shouldShowRotateOverlay } from "@/lib/live/liveFieldLayout";

/** 모바일 가로 화면 — 세로 플레이 안내 */
export function LiveMatchRotateHint() {
  const [show, setShow] = useState(() => shouldShowRotateOverlay());

  useEffect(() => {
    const onResize = () => setShow(shouldShowRotateOverlay());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#070b14]/90 p-6 backdrop-blur-sm">
      <div className="max-w-xs rounded-2xl border border-cyan-500/30 bg-[#070b14] px-5 py-6 text-center shadow-xl">
        <p className="text-3xl" aria-hidden>
          📱
        </p>
        <p className="mt-3 text-base font-bold text-white">세로로 돌려주세요</p>
        <p className="mt-2 text-sm text-slate-400">1v1 라이브 매치는 세로 화면에 최적화되어 있습니다.</p>
      </div>
    </div>
  );
}

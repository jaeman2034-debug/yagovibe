import { useEffect, useState } from "react";
import { readLiveMatchBootstrapProbe } from "@/lib/live/liveMatchDevDebug";

/** DEV: Phaser bootstrap 상태를 화면에 표시 (검은 화면 디버그) */
export function LiveMatchBootstrapHud() {
  const [probe, setProbe] = useState(() => readLiveMatchBootstrapProbe());

  useEffect(() => {
    const id = window.setInterval(() => setProbe(readLiveMatchBootstrapProbe()), 800);
    return () => window.clearInterval(id);
  }, []);

  if (!import.meta.env.DEV) return null;

  const ok = probe.canvasW > 0 && probe.canvasH > 0 && probe.bridgeType === "object" && probe.sceneReady;

  return (
    <div
      className={`pointer-events-none absolute right-2 top-14 z-[90] max-w-[11rem] rounded-lg border px-2 py-1 font-mono text-[9px] leading-snug ${
        ok
          ? "border-emerald-500/40 bg-emerald-950/90 text-emerald-100"
          : "border-rose-500/50 bg-rose-950/90 text-rose-100"
      }`}
    >
      <p className="font-bold">{ok ? "Phaser OK" : "Phaser FAIL"}</p>
      <p>
        canvas {probe.canvasW}×{probe.canvasH}
      </p>
      <p>bridge {probe.bridgeType}</p>
      <p>scene {probe.sceneReady ? "ready" : "no"}</p>
      <p className="text-[8px] opacity-80">__LIVE_BOOTSTRAP__()</p>
    </div>
  );
}

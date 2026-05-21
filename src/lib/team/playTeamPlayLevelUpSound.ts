/**
 * 팀 플레이 HUD — 레벨업 짧은 침 (Web Audio, 외부 파일 없음)
 * 사용자 제스처 이후 호출 전제 — play().catch 수준으로 실패 무시
 */

const EPS = 0.001;

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new AC();
  }
  return sharedCtx;
}

/** C5 → E5 → G5, 약 0.32s — 반복 청취 피로 낮은 짧은 상승음 */
export function playTeamPlayLevelUpSound(): void {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  void (async () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
    } catch {
      return;
    }

    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99];
    const step = 0.075;
    const noteDur = 0.095;
    const totalEnd = now + (freqs.length - 1) * step + noteDur + 0.04;

    const master = ctx.createGain();
    master.gain.setValueAtTime(EPS, now);
    master.gain.linearRampToValueAtTime(0.2, now + 0.02);
    master.gain.exponentialRampToValueAtTime(EPS, totalEnd);
    master.connect(ctx.destination);

    for (let i = 0; i < freqs.length; i++) {
      const t0 = now + i * step;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freqs[i], t0);
      g.gain.setValueAtTime(EPS, t0);
      g.gain.exponentialRampToValueAtTime(0.42, t0 + 0.018);
      g.gain.exponentialRampToValueAtTime(EPS, t0 + noteDur);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + noteDur + 0.02);
    }
  })();
}

/**
 * 미니슛 — 짧은 효과음 (Web Audio, 외부 파일 없음)
 * `playTeamPlayLevelUpSound`와 동일하게 사용자 제스처 이후 호출 전제.
 * 킥은 슛 파워(0~1)에 연동해 피치·타격감을 바꾼다. 골은 킥 세기에 살짝 묶어 보상감을 맞춘다.
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

function skipForReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

async function resumeCtx(ctx: AudioContext): Promise<boolean> {
  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    return true;
  } catch {
    return false;
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function connectToDestination(
  ctx: AudioContext,
  node: AudioNode
): void {
  const dest = ctx.destination;
  const Panner = (
    ctx as unknown as { createStereoPanner?: () => StereoPannerNode }
  ).createStereoPanner;
  if (typeof Panner === "function") {
    const pan = Panner.call(ctx);
    pan.pan.value = (Math.random() - 0.5) * 0.35;
    node.connect(pan);
    pan.connect(dest);
  } else {
    node.connect(dest);
  }
}

/** 짧은 화이트 노이즈 버스트 (킥·골 텍스처용) */
function playNoiseBurst(
  ctx: AudioContext,
  startAt: number,
  duration: number,
  opts: { gainPeak: number; freq?: number; Q?: number }
): void {
  const len = Math.max(2, Math.ceil(ctx.sampleRate * duration));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(opts.freq ?? 1200, startAt);
  bp.Q.setValueAtTime(opts.Q ?? 0.85, startAt);
  const g = ctx.createGain();
  g.gain.setValueAtTime(EPS, startAt);
  g.gain.linearRampToValueAtTime(opts.gainPeak, startAt + 0.004);
  g.gain.exponentialRampToValueAtTime(EPS, startAt + duration);
  src.connect(bp);
  bp.connect(g);
  connectToDestination(ctx, g);
  src.start(startAt);
  src.stop(startAt + duration + 0.02);
}

/**
 * 슛 릴리즈 — 파워에 따라 저역 스윕·초저역 ‘팡’·짧은 노이즈 어택
 * @param power 0~1, 드래그 세기(클수록 타이트하고 큼)
 */
export function playMiniShotKick(power?: number): void {
  if (skipForReducedMotion()) return;
  const p = clamp01(power ?? 0.55);
  void (async () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (!(await resumeCtx(ctx))) return;

    const now = ctx.currentTime;
    /** 발–공 접촉 순간(2~4ms 급 어택) */
    playNoiseBurst(ctx, now, 0.0035, {
      gainPeak: 0.16 + p * 0.11,
      freq: 2800 + p * 700,
      Q: 9,
    });

    const startHz = 175 + p * 115;
    const endHz = 72 + p * 35;
    const peak = 0.14 + p * 0.2;
    const dur = 0.075 + p * 0.035;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(startHz, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endHz), now + dur * 0.85);
    g.gain.setValueAtTime(EPS, now);
    g.gain.linearRampToValueAtTime(peak, now + 0.01 + p * 0.006);
    g.gain.exponentialRampToValueAtTime(EPS, now + dur + 0.02);
    osc.connect(g);
    connectToDestination(ctx, g);
    osc.start(now);
    osc.stop(now + dur + 0.05);

    playNoiseBurst(ctx, now, 0.028 + p * 0.012, {
      gainPeak: 0.04 + p * 0.07,
      freq: 900 + p * 600,
      Q: 1.1,
    });

    const sub = ctx.createOscillator();
    const sg = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(58 + p * 22, now);
    sg.gain.setValueAtTime(EPS, now);
    sg.gain.linearRampToValueAtTime(0.07 + p * 0.1, now + 0.018);
    sg.gain.exponentialRampToValueAtTime(EPS, now + 0.11 + p * 0.04);
    sub.connect(sg);
    connectToDestination(ctx, sg);
    sub.start(now);
    sub.stop(now + 0.16);
  })();
}

export type MiniShotGoalSoundOpts = {
  /** 직전 슛 파워(0~1) — 클수록 골 연출을 약간 키움 */
  kickStrength?: number;
};

/** 골 — 아르페지오 + 짧은 노이즈 ‘터짐’ */
export function playMiniShotGoal(opts?: MiniShotGoalSoundOpts): void {
  if (skipForReducedMotion()) return;
  const s = clamp01(opts?.kickStrength ?? 0.6);
  void (async () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (!(await resumeCtx(ctx))) return;

    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99];
    const step = 0.048;
    const noteDur = 0.075 + s * 0.02;
    const totalEnd = now + (freqs.length - 1) * step + noteDur + 0.04;
    const masterGain = 0.16 + s * 0.12;

    const master = ctx.createGain();
    master.gain.setValueAtTime(EPS, now);
    master.gain.linearRampToValueAtTime(masterGain, now + 0.012);
    master.gain.exponentialRampToValueAtTime(EPS, totalEnd);
    connectToDestination(ctx, master);

    for (let i = 0; i < freqs.length; i++) {
      const t0 = now + i * step;
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freqs[i], t0);
      og.gain.setValueAtTime(EPS, t0);
      og.gain.exponentialRampToValueAtTime(0.38 + s * 0.08, t0 + 0.012);
      og.gain.exponentialRampToValueAtTime(EPS, t0 + noteDur);
      osc.connect(og);
      og.connect(master);
      osc.start(t0);
      osc.stop(t0 + noteDur + 0.025);
    }

    playNoiseBurst(ctx, now + 0.02, 0.085 + s * 0.025, {
      gainPeak: 0.07 + s * 0.05,
      freq: 1400 + s * 800,
      Q: 0.7,
    });

    /** ~80ms 뒤 얇은 공간감(에코 / 관객 느낌) */
    const echoAt = now + 0.08;
    playNoiseBurst(ctx, echoAt, 0.098, {
      gainPeak: 0.035 + s * 0.028,
      freq: 520 + s * 280,
      Q: 0.45,
    });
    const echoOsc = ctx.createOscillator();
    const echoG = ctx.createGain();
    echoOsc.type = "sine";
    echoOsc.frequency.setValueAtTime(392 * (0.98 + s * 0.04), echoAt);
    echoG.gain.setValueAtTime(EPS, echoAt);
    echoG.gain.linearRampToValueAtTime(0.05 + s * 0.04, echoAt + 0.025);
    echoG.gain.exponentialRampToValueAtTime(EPS, echoAt + 0.18);
    echoOsc.connect(echoG);
    connectToDestination(ctx, echoG);
    echoOsc.start(echoAt);
    echoOsc.stop(echoAt + 0.2);
  })();
}

/**
 * 연속 골(2+) — 메인 골 효과음 직후 얹는 짧은 하모닉 악센트
 * `streak`는 이번 슛까지의 연속 골 수(2 이상일 때만 재생)
 */
export function playMiniShotStreakAccent(streak: number): void {
  if (skipForReducedMotion() || streak < 2) return;
  void (async () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (!(await resumeCtx(ctx))) return;

    const nBlips = Math.min(streak - 1, 4);
    const vol = Math.min(0.12, 0.048 + streak * 0.014);
    const tStart = ctx.currentTime + 0.076;

    for (let i = 0; i < nBlips; i++) {
      const t = tStart + i * 0.042;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(622 + i * 130 + Math.min(streak, 6) * 8, t);
      g.gain.setValueAtTime(EPS, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.005);
      g.gain.exponentialRampToValueAtTime(EPS, t + 0.072);
      osc.connect(g);
      connectToDestination(ctx, g);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  })();
}

/** 미스 — 이중 톤 비트 + 아래로 가라앉는 긴장 톤 */
export function playMiniShotMiss(): void {
  if (skipForReducedMotion()) return;
  void (async () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (!(await resumeCtx(ctx))) return;

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(EPS, now);
    master.gain.linearRampToValueAtTime(0.12, now + 0.025);
    master.gain.exponentialRampToValueAtTime(EPS, now + 0.26);
    connectToDestination(ctx, master);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(158, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.2);
    g.gain.setValueAtTime(EPS, now);
    g.gain.linearRampToValueAtTime(0.55, now + 0.02);
    g.gain.exponentialRampToValueAtTime(EPS, now + 0.2);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.24);

    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(153, now);
    osc2.frequency.exponentialRampToValueAtTime(91, now + 0.2);
    g2.gain.setValueAtTime(EPS, now);
    g2.gain.linearRampToValueAtTime(0.45, now + 0.022);
    g2.gain.exponentialRampToValueAtTime(EPS, now + 0.2);
    osc2.connect(g2);
    g2.connect(master);
    osc2.start(now);
    osc2.stop(now + 0.24);

    playNoiseBurst(ctx, now, 0.04, { gainPeak: 0.03, freq: 400, Q: 2 });
  })();
}

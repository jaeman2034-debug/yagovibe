/** 클라이언트 전용 XP 체험 — 저장·Functions 없음 */

export type XpTrialReason = "move" | "kick";

let trialXp = 0;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((fn) => fn());
}

export function getPlaygroundTrialXp(): number {
  return trialXp;
}

export function resetPlaygroundTrialXp(): void {
  trialXp = 0;
  notify();
}

export function addPlaygroundTrialXp(amount: number, _reason: XpTrialReason): void {
  if (amount <= 0) return;
  trialXp += amount;
  notify();
}

export function subscribePlaygroundTrialXp(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

let lastMoveAwardAt = 0;

/** 이동 시 디바운스 +1 */
export function tryAwardMoveTrialXp(): void {
  const now = Date.now();
  if (now - lastMoveAwardAt < 700) return;
  lastMoveAwardAt = now;
  addPlaygroundTrialXp(1, "move");
}

export function awardKickTrialXp(): void {
  addPlaygroundTrialXp(5, "kick");
}

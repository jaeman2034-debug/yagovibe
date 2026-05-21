/** React 터치/키보드 → Phaser 씬 공유 입력 (단일 플레이어 MVP) */

type Store = {
  moveX: number;
  moveY: number;
  kickRequested: boolean;
};

const store: Store = { moveX: 0, moveY: 0, kickRequested: false };

export function resetPlaygroundInput(): void {
  store.moveX = 0;
  store.moveY = 0;
  store.kickRequested = false;
}

export function setPlaygroundMove(x: number, y: number): void {
  const len = Math.hypot(x, y);
  if (len > 1) {
    store.moveX = x / len;
    store.moveY = y / len;
  } else {
    store.moveX = x;
    store.moveY = y;
  }
}

export function clearPlaygroundMove(): void {
  store.moveX = 0;
  store.moveY = 0;
}

export function requestPlaygroundKick(): void {
  store.kickRequested = true;
}

export function consumePlaygroundKickRequest(): boolean {
  if (!store.kickRequested) return false;
  store.kickRequested = false;
  return true;
}

export function getPlaygroundMove(): { x: number; y: number } {
  return { x: store.moveX, y: store.moveY };
}

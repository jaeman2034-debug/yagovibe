/** /playground — auto demo vs manual play (React ↔ Phaser) */

export type PlaygroundControlMode = "auto" | "manual";

let mode: PlaygroundControlMode = "auto";
const listeners = new Set<(mode: PlaygroundControlMode) => void>();

export function getPlaygroundControlMode(): PlaygroundControlMode {
  return mode;
}

export function setPlaygroundControlMode(next: PlaygroundControlMode): void {
  if (mode === next) return;
  mode = next;
  listeners.forEach((fn) => fn(mode));
}

export function resetPlaygroundControlMode(): void {
  mode = "auto";
}

export function clearPlaygroundControlModeListeners(): void {
  listeners.clear();
}

export function subscribePlaygroundControlMode(
  cb: (mode: PlaygroundControlMode) => void,
): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

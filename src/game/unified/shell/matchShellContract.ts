/**
 * TRACK 9A Phase C-2 — immersive 1v1 shell + overlay/phaser layering contract.
 * Gameplay modules must not import UI; React shell only.
 */

/** Canonical Phaser parent class (`.live-match-phaser-host` kept as CSS alias) */
export const MATCH_PHASER_HOST_CLASS = "match-phaser-host";

/** @deprecated alias — use MATCH_PHASER_HOST_CLASS; still applied in CSS for legacy selectors */
export const MATCH_PHASER_HOST_LEGACY_CLASS = "live-match-phaser-host";

/** ResizeObserver waits until host has non-zero layout box */
export const MATCH_PHASER_MIN_HOST_PX = 8;

/** z-index within ImmersiveMatchShell (not global app chrome) */
export const MATCH_SHELL_LAYERS = {
  phaser: 0,
  overlay: 10,
  overlayBanner: 20,
  devStrip: 100,
} as const;

export type MatchShellLayer = keyof typeof MATCH_SHELL_LAYERS;

export function matchPhaserHostClassName(extra?: string): string {
  return [MATCH_PHASER_HOST_CLASS, MATCH_PHASER_HOST_LEGACY_CLASS, extra]
    .filter(Boolean)
    .join(" ");
}

/** Phaser host: display-only; pointer-events none — overlays own hit targets */
export const MATCH_PHASER_HOST_STYLE = {
  zIndex: MATCH_SHELL_LAYERS.phaser,
  pointerEvents: "none" as const,
};

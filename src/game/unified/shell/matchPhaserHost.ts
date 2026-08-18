import { MATCH_PHASER_MIN_HOST_PX } from "./matchShellContract";

/** Inline canvas fixes — complements match-phaser-host.css vs mobile.css */
export function applyMatchPhaserCanvasStyles(host: HTMLElement): void {
  const canvas = host.querySelector("canvas");
  if (!canvas) return;
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.maxWidth = "none";
  canvas.style.maxHeight = "none";
  canvas.style.display = "block";
}

export function isMatchPhaserHostSized(host: HTMLElement): boolean {
  return host.clientWidth >= MATCH_PHASER_MIN_HOST_PX && host.clientHeight >= MATCH_PHASER_MIN_HOST_PX;
}

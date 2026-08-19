import type { MatchOfflineGameConfig } from "@/game/unified/matchGameBootstrap";

/** MatchGameCanvas — Phaser owns gameplay; React only supplies mount box + mode */
export type MatchGameCanvasProps = {
  className?: string;
  sport?: MatchOfflineGameConfig["sport"];
  mode: MatchOfflineGameConfig["mode"];
};

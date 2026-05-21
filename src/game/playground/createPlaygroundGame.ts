import Phaser from "phaser";
import { PlaygroundScene } from "./PlaygroundScene";
import { resetPlaygroundInput } from "./playgroundInput";
import { resetPlaygroundTrialXp } from "./playgroundXpTrial";

export type PlaygroundGameHandle = {
  game: Phaser.Game;
  destroy: () => void;
};

export function createPlaygroundGame(parent: HTMLElement): PlaygroundGameHandle {
  resetPlaygroundInput();
  resetPlaygroundTrialXp();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#070b14",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [PlaygroundScene],
    audio: { noAudio: true },
    fps: { target: 60, forceSetTimeOut: true },
  });

  return {
    game,
    destroy: () => {
      resetPlaygroundInput();
      game.destroy(true);
    },
  };
}

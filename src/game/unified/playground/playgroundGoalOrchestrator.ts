import {
  detectPlaygroundBallInGoal,
  startPlaygroundGoalCelebration,
  triggerPlaygroundGoalFeedback,
} from "@/game/unified/modules/goal";
import {
  playgroundPitchLayout,
  readPlaygroundBallCenter,
  resetPlaygroundActorsAfterGoal,
} from "./playgroundActorOps";
import { PLAYGROUND_BALL_RADIUS, PLAYGROUND_GOAL_COOLDOWN_MS } from "./playgroundSceneConstants";

export type PlaygroundGoalDeps = {
  scene: Phaser.Scene;
  player: Phaser.Physics.Arcade.Sprite;
  ball: Phaser.Physics.Arcade.Sprite;
  goalFlash: Phaser.GameObjects.Graphics;
  goalLabel: Phaser.GameObjects.Text;
  isAutoDemo: () => boolean;
  onDemoRestart: () => void;
};

export class PlaygroundGoalOrchestrator {
  goalCooldownMs = 0;
  goalCelebrating = false;
  goalFlashTimer: Phaser.Time.TimerEvent | null = null;
  goalDebugLastLogAt = 0;

  constructor(private readonly deps: PlaygroundGoalDeps) {}

  tickCooldown(frameMs: number): void {
    this.goalCooldownMs = Math.max(0, this.goalCooldownMs - frameMs);
  }

  isInsideGoal(ballX: number, ballY: number): boolean {
    return detectPlaygroundBallInGoal(ballX, ballY, playgroundPitchLayout(), PLAYGROUND_BALL_RADIUS);
  }

  logGoalDebugNearMouth(): void {
    if (!import.meta.env.DEV) return;
    const now = Date.now();
    if (now - this.goalDebugLastLogAt < 900) return;
    const { x, y } = readPlaygroundBallCenter(this.deps.ball);
    const layout = playgroundPitchLayout();
    const nearBottom = y >= layout.h - layout.margin - 48;
    if (!nearBottom) return;
    this.goalDebugLastLogAt = now;
    console.log("[playground] near bottom goal", {
      ball: { x, y },
      sprite: { x: this.deps.ball.x, y: this.deps.ball.y },
      inGoal: this.isInsideGoal(x, y),
      celebrating: this.goalCelebrating,
      cooldownMs: this.goalCooldownMs,
    });
  }

  tryHandleGoal(): void {
    if (this.goalCelebrating) return;
    if (!this.deps.isAutoDemo() && this.goalCooldownMs > 0) return;
    const { x, y } = readPlaygroundBallCenter(this.deps.ball);
    if (!this.isInsideGoal(x, y)) return;
    if (import.meta.env.DEV) {
      console.log("[playground] HANDLE GOAL", { x, y });
    }
    this.handleGoal();
  }

  handleGoal(): void {
    if (this.goalCelebrating) return;
    if (!this.deps.isAutoDemo() && this.goalCooldownMs > 0) return;
    this.goalCelebrating = true;
    this.goalCooldownMs = PLAYGROUND_GOAL_COOLDOWN_MS;

    console.info("[playground] goal", readPlaygroundBallCenter(this.deps.ball));

    triggerPlaygroundGoalFeedback();

    this.deps.ball.setVelocity(0, 0);
    const body = this.deps.ball.body as Phaser.Physics.Arcade.Body | null;
    body?.setVelocity(0, 0);

    this.goalFlashTimer?.remove();
    this.goalFlashTimer = startPlaygroundGoalCelebration({
      scene: this.deps.scene,
      flash: this.deps.goalFlash,
      label: this.deps.goalLabel,
      ballX: this.deps.ball.x,
      ballY: this.deps.ball.y,
      onCelebrationEnd: () => {
        resetPlaygroundActorsAfterGoal(this.deps.player, this.deps.ball);
        this.goalCelebrating = false;
        if (this.deps.isAutoDemo()) {
          this.deps.onDemoRestart();
        }
      },
    });
  }
}

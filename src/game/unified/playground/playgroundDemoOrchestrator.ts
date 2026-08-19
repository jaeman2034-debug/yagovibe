import {
  createInitialDemoMachine,
  DEMO_1V1_SETUP,
  DEMO_1V1_TIMINGS,
  PRACTICE_1V1_SETUP,
  type DemoSetupPositions,
  DEMO_IDLE_MS,
  demoRestartAfterGoal,
  tickDemoMachine,
  type DemoAction,
  type DemoMachine,
} from "@/game/unified/modules/demo";
import { KICK_RANGE } from "@/lib/physics/physicsConstants";
import { clearPlaygroundAimGuide, drawPlaygroundDemoAimGuide, type PlaygroundRenderHandles } from "@/game/unified/render";
import { applyPlaygroundSpawnSetup } from "./playgroundActorOps";
import { performPlaygroundKick, type PlaygroundKickDeps } from "./playgroundKickOrchestrator";
import { PLAYGROUND_PLAYER_SPEED } from "./playgroundSceneConstants";

export type PlaygroundDemoDeps = {
  player: Phaser.Physics.Arcade.Sprite;
  ball: Phaser.Physics.Arcade.Sprite;
  aimGuide: Phaser.GameObjects.Graphics;
  isPracticeMode: () => boolean;
  kickDeps: () => PlaygroundKickDeps;
  goalCelebrating: () => boolean;
};

export class PlaygroundDemoOrchestrator {
  machine: DemoMachine = createInitialDemoMachine();

  constructor(private readonly deps: PlaygroundDemoDeps) {}

  resetMachine(idleMs = DEMO_IDLE_MS): void {
    this.machine = { state: "idle", timerMs: idleMs };
  }

  restartAfterGoal(): void {
    this.machine = demoRestartAfterGoal();
  }

  private bottomGoalCenter(): { x: number; y: number } {
    return { ...DEMO_1V1_SETUP.goalTarget };
  }

  private spawnSetup(): DemoSetupPositions {
    return this.deps.isPracticeMode() ? PRACTICE_1V1_SETUP : DEMO_1V1_SETUP;
  }

  setupPositions(): void {
    applyPlaygroundSpawnSetup(this.deps.player, this.deps.ball, this.spawnSetup());
  }

  private drawDemoAimGuide(handles: PlaygroundRenderHandles): void {
    const goal = this.bottomGoalCenter();
    drawPlaygroundDemoAimGuide(handles, this.deps.player.x, this.deps.player.y, goal.x, goal.y);
  }

  private executeDemoKick(): void {
    performPlaygroundKick(this.deps.kickDeps(), "drag", this.bottomGoalCenter());
  }

  private forceDemoGoal(onGoal: () => void): void {
    const target = this.bottomGoalCenter();
    console.info("[playground] forceDemoGoal", target);
    this.deps.ball.setPosition(target.x, target.y);
    const body = this.deps.ball.body as Phaser.Physics.Arcade.Body | null;
    body?.reset(target.x, target.y);
    body?.setVelocity(0, 0);
    onGoal();
  }

  private applyAction(action: DemoAction, onGoal: () => void): void {
    const handles: PlaygroundRenderHandles = { aimGuide: this.deps.aimGuide };
    switch (action.type) {
      case "setup_positions":
        this.setupPositions();
        break;
      case "set_player_velocity":
        this.deps.player.setVelocity(action.vx, action.vy);
        break;
      case "stop_player":
        this.deps.player.setVelocity(0, 0);
        break;
      case "show_aim_guide":
        this.drawDemoAimGuide(handles);
        break;
      case "clear_aim_guide":
        clearPlaygroundAimGuide(handles);
        break;
      case "kick_toward_goal":
        this.executeDemoKick();
        break;
      case "force_goal":
        this.forceDemoGoal(onGoal);
        break;
      case "transition":
        if (import.meta.env.DEV) {
          console.info("[playground] auto-demo state", action.next);
        }
        break;
    }
  }

  update(frameMs: number, onGoal: () => void): void {
    const result = tickDemoMachine(
      this.machine,
      {
        frameMs,
        goalCelebrating: this.deps.goalCelebrating(),
        playerX: this.deps.player.x,
        playerY: this.deps.player.y,
        ballX: this.deps.ball.x,
        ballY: this.deps.ball.y,
        kickRange: KICK_RANGE,
        playerSpeed: PLAYGROUND_PLAYER_SPEED,
      },
      DEMO_1V1_TIMINGS,
    );
    this.machine = result.machine;
    for (const action of result.actions) {
      this.applyAction(action, onGoal);
    }
  }
}

import Phaser from "phaser";
import {
  clearPlaygroundMove,
  consumePlaygroundKickRequest,
  getPlaygroundMove,
} from "./playgroundInput";
import { awardKickTrialXp, tryAwardMoveTrialXp } from "./playgroundXpTrial";

const WORLD_W = 1400;
const WORLD_H = 1000;
const PLAYER_SPEED = 200;
const KICK_RANGE = 52;
const KICK_FORCE = 420;
const BALL_DRAG = 280;
const BALL_MAX_SPEED = 520;

export class PlaygroundScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private ball!: Phaser.Physics.Arcade.Sprite;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private lastPos = { x: 0, y: 0 };
  private facing = { x: 0, y: 1 };
  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super({ key: "PlaygroundScene" });
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#070b14");
    this.drawPitch();
    this.createTextures();
    this.walls = this.physics.add.staticGroup();
    this.buildWalls();

    this.ball = this.physics.add.sprite(WORLD_W / 2 + 40, WORLD_H / 2, "pg-ball");
    this.ball.setCircle(10);
    this.ball.setBounce(0.72);
    this.ball.setDrag(BALL_DRAG);
    this.ball.setMaxVelocity(BALL_MAX_SPEED);
    this.ball.setDepth(2);

    this.player = this.physics.add.sprite(WORLD_W / 2, WORLD_H / 2, "pg-player");
    this.player.setCircle(14);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(3);
    this.player.setMaxVelocity(PLAYER_SPEED);

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.ball, this.walls);
    this.physics.add.collider(this.player, this.ball);

    this.physics.world.setBounds(32, 32, WORLD_W - 64, WORLD_H - 64);

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    if (this.input.keyboard) {
      this.keys = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
        SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      }) as PlaygroundScene["keys"];
    }

    this.lastPos = { x: this.player.x, y: this.player.y };
    this.registry.set("playgroundReady", true);
  }

  private drawPitch(): void {
    const g = this.add.graphics();
    g.fillStyle(0x0a1628, 1);
    g.fillRect(0, 0, WORLD_W, WORLD_H);

    g.lineStyle(1, 0x1e3a5f, 0.55);
    const grid = 80;
    for (let x = 0; x <= WORLD_W; x += grid) {
      g.lineBetween(x, 0, x, WORLD_H);
    }
    for (let y = 0; y <= WORLD_H; y += grid) {
      g.lineBetween(0, y, WORLD_W, y);
    }

    g.lineStyle(3, 0x22d3ee, 0.35);
    g.strokeRect(48, 48, WORLD_W - 96, WORLD_H - 96);

    g.lineStyle(2, 0xa78bfa, 0.25);
    g.strokeCircle(WORLD_W / 2, WORLD_H / 2, 70);

    g.lineStyle(2, 0x22d3ee, 0.2);
    g.strokeRect(WORLD_W / 2 - 120, 48, 240, 80);
    g.strokeRect(WORLD_W / 2 - 120, WORLD_H - 128, 240, 80);

    g.setDepth(0);
  }

  private createTextures(): void {
    if (!this.textures.exists("pg-player")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x22d3ee, 1);
      g.fillCircle(16, 16, 14);
      g.lineStyle(2, 0xa78bfa, 0.9);
      g.strokeCircle(16, 16, 14);
      g.generateTexture("pg-player", 32, 32);
      g.destroy();
    }
    if (!this.textures.exists("pg-ball")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xf8fafc, 1);
      g.fillCircle(10, 10, 9);
      g.lineStyle(1, 0x94a3b8, 1);
      g.strokeCircle(10, 10, 9);
      g.generateTexture("pg-ball", 20, 20);
      g.destroy();
    }
  }

  private buildWalls(): void {
    const t = 24;
    const segments: [number, number, number, number][] = [
      [WORLD_W / 2, 24, WORLD_W, t],
      [WORLD_W / 2, WORLD_H - 24, WORLD_W, t],
      [24, WORLD_H / 2, t, WORLD_H],
      [WORLD_W - 24, WORLD_H / 2, t, WORLD_H],
    ];
    for (const [x, y, w, h] of segments) {
      const wall = this.add.rectangle(x, y, w, h, 0x0f172a, 0);
      this.physics.add.existing(wall, true);
      this.walls.add(wall);
    }
  }

  private resolveMoveVector(): { x: number; y: number } {
    const touch = getPlaygroundMove();
    let mx = touch.x;
    let my = touch.y;

    if (Math.hypot(mx, my) < 0.15 && this.keys) {
      mx = 0;
      my = 0;
      if (this.keys.A.isDown) mx -= 1;
      if (this.keys.D.isDown) mx += 1;
      if (this.keys.W.isDown) my -= 1;
      if (this.keys.S.isDown) my += 1;
      const len = Math.hypot(mx, my);
      if (len > 1) {
        mx /= len;
        my /= len;
      }
    }

    return { x: mx, y: my };
  }

  private tryKick(): void {
    const dx = this.ball.x - this.player.x;
    const dy = this.ball.y - this.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > KICK_RANGE) return;

    let fx = this.facing.x;
    let fy = this.facing.y;
    if (Math.hypot(fx, fy) < 0.1) {
      fx = dx / (dist || 1);
      fy = dy / (dist || 1);
    }

    this.ball.setVelocity(fx * KICK_FORCE, fy * KICK_FORCE);
    awardKickTrialXp();
    this.cameras.main.shake(80, 0.002);
  }

  update(): void {
    const { x: mx, y: my } = this.resolveMoveVector();
    this.player.setVelocity(mx * PLAYER_SPEED, my * PLAYER_SPEED);

    if (Math.hypot(mx, my) > 0.1) {
      this.facing = { x: mx, y: my };
    }

    const moved = Math.hypot(this.player.x - this.lastPos.x, this.player.y - this.lastPos.y);
    if (moved > 6) {
      tryAwardMoveTrialXp();
      this.lastPos = { x: this.player.x, y: this.player.y };
    }

    if (consumePlaygroundKickRequest()) {
      this.tryKick();
    } else if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      this.tryKick();
    }
  }

  shutdown(): void {
    clearPlaygroundMove();
    this.registry.set("playgroundReady", false);
  }
}

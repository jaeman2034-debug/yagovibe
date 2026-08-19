import Phaser from "phaser";
import type { MatchmakingMode } from "@/lib/matchmaking/types";
import {
  detectFieldLayoutMode,
  getCameraViewInsets,
  getLandscapeGoals,
  getLiveFieldLayout,
  getPortraitGoals,
  type FieldLayoutMode,
  type LiveFieldLayout,
} from "@/lib/live/liveFieldLayout";
import type { TeamMatchGameConfig } from "@/game/team/createTeamMatchGame";
import { consumePendingTeamMatchBridge } from "@/game/team/teamMatchSceneBridge";
import { auth } from "@/lib/firebase";
import type { TeamMatchBridge } from "@/lib/team/teamMatchBridge";
import { assignTeamSpawns, defaultTeamBallPosition } from "@/lib/team/teamMatchPositions";
import {
  integrateTeamBall,
  TEAM_KICK_RANGE,
  type KinematicPlayerSample,
} from "@/lib/team/teamMatchBall";
import {
  buildPassPlayersFromTeamBridge,
  tickTeamMatchPossessionTelemetry,
} from "@/lib/telemetry/possessionTelemetry";
import { commitHostTeamGoal, TEAM_GOAL_COOLDOWN_MS } from "@/lib/team/teamMatchGoal";
import { tryApplyTeamKickToBridge } from "@/lib/team/teamMatchKick";
import type { TeamId } from "@/lib/team/teamMatchTypes";
import { clearTeamMatchMove } from "@/lib/team/teamMatchInput";
import { syncTeamMatchDevDebug } from "@/lib/team/teamMatchDevDebug";
import {
  emitMatchEndedTelemetry,
  emitMatchStartedTelemetry,
  isMatchEndedEmitted,
} from "@/lib/telemetry/matchTelemetryHost";

const PLAYER_SPEED = 200;
const PLAYER_RADIUS = 14;
const BALL_RADIUS = 10;
type PlayerEntry = {
  uid: string;
  team: TeamId;
  isLocal: boolean;
  /** local만 bridge.moveInput 공유 · remote는 독립 {0,0} */
  moveInput: { x: number; y: number };
  sprite: Phaser.Physics.Arcade.Sprite | Phaser.GameObjects.Sprite;
};

function finiteCoord(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export class TeamMatchScene extends Phaser.Scene {
  private sessionId = "";
  /** Firebase Auth uid — remote puppet·RTDB self 필터 SoT */
  private authUid = "";
  private myUid = "";
  private hostUid = "";
  private mode: MatchmakingMode = "5v5";
  private playerUids: string[] = [];
  private field!: LiveFieldLayout;
  private fieldLayoutMode: FieldLayoutMode = "landscape";
  private players = new Map<string, PlayerEntry>();
  /** puppet 대상 uid — authUid 제외, spawn 시 고정 */
  private remoteUids: string[] = [];
  private localPlayerUid = "";
  private localPlayer: Phaser.Physics.Arcade.Sprite | null = null;
  private ball!: Phaser.GameObjects.Arc;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private remoteApplyLogAt = 0;
  /** TeamMatchView bridgeRef — init({ bridge }) SoT */
  private bridge: TeamMatchBridge | null = null;
  private didLogBridgeUpdate = false;
  /** bridge.authUid === hostUid — ball authority */
  private isHostAuthority = false;
  private teamGoalCooldownMs = 0;

  constructor() {
    super({ key: "TeamMatchScene" });
  }

  init(data?: { bridge?: TeamMatchBridge }): void {
    this.bridge = data?.bridge ?? consumePendingTeamMatchBridge();
    if (import.meta.env.DEV) {
      console.log("[TEAM BRIDGE REF] scene init", {
        bridgeId: this.bridge?.id,
        sessionId: this.bridge?.sessionId,
        authUid: this.bridge?.authUid,
      });
    }
  }

  create(): void {
    try {
      this.runCreate();
    } catch (e) {
      console.error("[TEAM CREATE] failed", e);
      this.drawFallbackErrorLabel(e);
    }
  }

  private runCreate(): void {
    const scaleW = this.scale.width;
    const scaleH = this.scale.height;
    console.log("[TEAM CREATE]", { scaleW, scaleH });

    const cfg = this.registry.get("teamMatchConfig") as TeamMatchGameConfig | undefined;
    if (!cfg?.sessionId?.trim()) {
      console.error("[TEAM CREATE] missing teamMatchConfig in registry");
      return;
    }

    this.sessionId = cfg.sessionId.trim();
    this.myUid = cfg.myUid;
    this.hostUid = cfg.hostUid;
    this.mode = cfg.mode;
    this.playerUids = [...cfg.playerUids];

    this.fieldLayoutMode =
      (this.registry.get("fieldLayoutMode") as FieldLayoutMode | undefined) ??
      detectFieldLayoutMode(scaleW, scaleH);
    this.field = getLiveFieldLayout(this.fieldLayoutMode);

    if (!this.bridge) {
      this.bridge = consumePendingTeamMatchBridge();
    }
    const bridge = this.bridge;
    if (!bridge || bridge.sessionId !== this.sessionId) {
      console.error("[TEAM CREATE] bridge missing — init({ bridge }) required", {
        sessionId: this.sessionId.slice(0, 8),
        sceneHasBridge: Boolean(bridge),
      });
      return;
    }
    this.playerUids = bridge.playerUids.length ? [...bridge.playerUids] : this.playerUids;
    this.myUid = bridge.myUid || this.myUid;
    this.hostUid = bridge.hostUid || this.hostUid;
    this.authUid = bridge.authUid || auth.currentUser?.uid?.trim() || this.myUid;
    this.isHostAuthority = Boolean(
      bridge.hostUid && bridge.authUid && bridge.authUid === bridge.hostUid,
    );
    if (
      import.meta.env.DEV &&
      this.authUid &&
      bridge.myUid &&
      this.authUid !== bridge.myUid
    ) {
      console.warn("[TEAM AUTH] bridge.myUid !== auth.uid", {
        authUid: this.authUid.slice(0, 8),
        bridgeMyUid: bridge.myUid.slice(0, 8),
      });
    }
    if (import.meta.env.DEV) {
      const reg = this.registry.get("teamMatchBridgeInstance") as TeamMatchBridge | undefined;
      console.log("[TEAM BRIDGE REF] scene create", {
        bridgeId: bridge.id,
        sessionId: bridge.sessionId,
        authUid: bridge.authUid,
        initSame: reg === bridge,
      });
    }

    console.log("[TEAM FIELD]", {
      mode: this.fieldLayoutMode,
      w: this.field.w,
      h: this.field.h,
      margin: this.field.margin,
      sessionId: this.sessionId.slice(0, 8),
      players: this.playerUids.length,
    });

    this.applyWorldAndCameraBounds();
    this.createTextures();
    this.drawPitch();
    this.walls = this.physics.add.staticGroup();
    this.buildWalls();

    const spawns = assignTeamSpawns(this.playerUids, this.mode, this.fieldLayoutMode);
    console.log("[TEAM SPAWN]", {
      uids: this.playerUids.map((u) => u.slice(0, 8)),
      spawns: Object.fromEntries(
        Object.entries(spawns).map(([uid, s]) => [uid.slice(0, 8), { x: s.x, y: s.y, team: s.team }]),
      ),
    });

    const localUid = bridge.authUid || this.authUid || bridge.myUid;
    for (const uid of this.playerUids) {
      const slot = spawns[uid];
      if (!slot) continue;
      const isLocal = uid === localUid;
      const team = slot.team;
      const x = finiteCoord(slot.x, this.field.w / 2);
      const y = finiteCoord(slot.y, this.field.h / 2);
      this.spawnPlayer(uid, team, x, y, isLocal, bridge);
    }

    this.localPlayerUid = localUid;
    this.remoteUids = this.playerUids.filter((u) => u !== localUid);

    if (import.meta.env.DEV && this.playerUids.length >= 2) {
      const [a, b] = this.playerUids;
      const sa = bridge.snapshot.players[a];
      const sb = bridge.snapshot.players[b];
      if (sa && sb && sa === sb) {
        console.error("[TEAM SPAWN] snapshot players share same object ref", {
          a: a.slice(0, 8),
          b: b.slice(0, 8),
        });
      }
    }

    const ballPos = bridge.snapshot.ball ?? defaultTeamBallPosition(this.fieldLayoutMode);
    this.ball = this.add.circle(
      finiteCoord(ballPos.x, this.field.w / 2),
      finiteCoord(ballPos.y, this.field.h / 2),
      BALL_RADIUS,
      0xffffff,
      1,
    );
    this.ball.setDepth(5);

    this.scale.on("resize", this.onResizeFit, this);
    this.scale.refresh();
    this.fitCameraToField();
    this.time.delayedCall(80, () => this.fitCameraToField());
    this.time.delayedCall(250, () => this.fitCameraToField());

    console.info("[TeamMatchScene] create ok", {
      mode: this.mode,
      fieldLayout: this.fieldLayoutMode,
      spawned: this.players.size,
      local: Boolean(this.localPlayer),
      zoom: this.cameras.main.zoom,
    });

    if (this.isHostAuthority && bridge) {
      emitMatchStartedTelemetry(bridge, {
        playerUids: bridge.playerUids,
        hostUid: bridge.hostUid,
        startedAt: bridge.snapshot.meta.startedAt,
        mode: bridge.mode,
      });
    }
  }

  private drawFallbackErrorLabel(e: unknown): void {
    const msg = e instanceof Error ? e.message : String(e);
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, `TeamMatchScene error\n${msg}`, {
        fontSize: "14px",
        color: "#fca5a5",
        align: "center",
      })
      .setOrigin(0.5);
  }

  update(_time: number, delta: number): void {
    const registryBridge = this.registry.get("teamMatchBridgeInstance") as
      | TeamMatchBridge
      | undefined;
    if (registryBridge?.sessionId === this.sessionId) {
      this.bridge = registryBridge;
    }
    const bridge = this.bridge;
    if (!bridge || bridge.sessionId !== this.sessionId) return;

    if (!this.didLogBridgeUpdate) {
      this.didLogBridgeUpdate = true;
      if (import.meta.env.DEV) {
        console.log("[TEAM BRIDGE REF] scene update", {
          bridgeId: bridge.id,
          sessionId: bridge.sessionId,
          authUid: bridge.authUid,
        });
        syncTeamMatchDevDebug(bridge, {
          sceneBridgeId: bridge.id,
          hookMyUid: bridge.authUid,
          sortedUids: bridge.playerUids,
        });
      }
    }

    if (bridge.kickRequested) {
      this.applyKickPhaseB(bridge);
      bridge.kickRequested = false;
    }

    this.applyLocalMovementOnly(bridge);
    this.applyRemotePuppetsOnly(bridge);

    if (this.isHostAuthority && bridge.snapshot.meta.phase === "playing") {
      this.teamGoalCooldownMs = Math.max(0, this.teamGoalCooldownMs - delta);
      const playerSamples = this.collectHostPlayerBallSamples(bridge);
      const ballBefore = {
        x: bridge.snapshot.ball.x,
        y: bridge.snapshot.ball.y,
      };
      const scored = integrateTeamBall(
        bridge.snapshot.ball,
        delta / 1000,
        this.field,
        playerSamples,
      );
      tickTeamMatchPossessionTelemetry(
        bridge,
        ballBefore,
        bridge.snapshot.ball,
        buildPassPlayersFromTeamBridge(bridge.snapshot.players),
        this.field,
      );
      if (scored && this.teamGoalCooldownMs <= 0) {
        commitHostTeamGoal(bridge, scored, this.fieldLayoutMode);
        this.teamGoalCooldownMs = TEAM_GOAL_COOLDOWN_MS;
      }
    }

    this.syncBallFromSnapshot(bridge);
  }

  /** Host ball step — 로컬 sprite + RTDB snapshot.players */
  private collectHostPlayerBallSamples(bridge: TeamMatchBridge): KinematicPlayerSample[] {
    const authUid = (bridge.authUid || this.authUid).trim();
    const samples: KinematicPlayerSample[] = [];

    for (const [uid, entry] of this.players) {
      if (entry.isLocal && uid === authUid && entry.sprite instanceof Phaser.Physics.Arcade.Sprite) {
        const body = entry.sprite.body as Phaser.Physics.Arcade.Body;
        samples.push({
          x: entry.sprite.x,
          y: entry.sprite.y,
          vx: body?.velocity.x ?? 0,
          vy: body?.velocity.y ?? 0,
        });
        continue;
      }
      const net = bridge.snapshot.players[uid];
      if (!net || !Number.isFinite(net.x) || !Number.isFinite(net.y)) continue;
      samples.push({
        x: net.x,
        y: net.y,
        vx: typeof net.vx === "number" ? net.vx : 0,
        vy: typeof net.vy === "number" ? net.vy : 0,
      });
    }
    return samples;
  }

  private syncBallFromSnapshot(bridge: TeamMatchBridge): void {
    if (!this.ball) return;
    this.ball.setPosition(
      finiteCoord(bridge.snapshot.ball.x, this.field.w / 2),
      finiteCoord(bridge.snapshot.ball.y, this.field.h / 2),
    );
  }

  shutdown(): void {
    const bridge = this.bridge;
    if (bridge && this.isHostAuthority && !isMatchEndedEmitted(bridge)) {
      emitMatchEndedTelemetry(bridge, { finalScore: { ...bridge.snapshot.score } });
    }
    clearTeamMatchMove(this.sessionId, this.bridge);
    this.scale.off("resize", this.onResizeFit, this);
  }

  private onResizeFit(): void {
    this.fieldLayoutMode = detectFieldLayoutMode(this.scale.width, this.scale.height);
    this.field = getLiveFieldLayout(this.fieldLayoutMode);
    this.applyWorldAndCameraBounds();
    this.fitCameraToField();
  }

  private applyWorldAndCameraBounds(): void {
    const { w, h } = this.field;
    this.physics.world.setBounds(0, 0, w, h, true);
    this.cameras.main.setBounds(0, 0, w, h);
  }

  private fitCameraToField(): void {
    const cam = this.cameras.main;
    const { w, h } = this.field;
    const gameW = Math.max(1, this.scale.width);
    const gameH = Math.max(1, this.scale.height);

    cam.stopFollow();
    cam.setBounds(0, 0, w, h);
    cam.setViewport(0, 0, gameW, gameH);
    cam.setScroll(0, 0);

    let zoom: number;
    if (this.field.mode === "portrait") {
      const { top, bottom, centerBiasY } = getCameraViewInsets(this.field);
      const usableH = Math.max(1, gameH - top - bottom);
      zoom = Math.min(gameW / w, usableH / h);
      cam.setZoom(Math.max(0.05, zoom));
      cam.centerOn(w / 2, h / 2 + centerBiasY);
    } else {
      zoom = Math.min(gameW / w, gameH / h) * 0.92;
      cam.setZoom(Math.max(0.05, zoom));
      cam.centerOn(w / 2, h / 2);
    }

    if (import.meta.env.DEV) {
      console.log("[TEAM CAMERA]", { gameW, gameH, zoom: cam.zoom, scrollX: cam.scrollX, scrollY: cam.scrollY });
    }
  }

  private createTextures(): void {
    const mk = (key: string, color: number) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillCircle(16, 16, 14);
      g.generateTexture(key, 32, 32);
      g.destroy();
    };
    mk("tm-player-a", 0x3b82f6);
    mk("tm-player-b", 0xf472b6);
  }

  /**
   * local physics sprite 하나에만 velocity.
   * setPosition / players.forEach / snapshot.players 좌표 반영 금지.
   */
  private applyLocalMovementOnly(bridge: TeamMatchBridge): void {
    const localUid = bridge.authUid || this.authUid;
    if (!localUid) return;

    const entry = this.players.get(localUid);
    if (!entry || entry.uid !== localUid || !entry.isLocal) return;

    const sprite = entry.sprite;
    if (!(sprite instanceof Phaser.Physics.Arcade.Sprite)) return;

    this.localPlayer = sprite;
    this.localPlayerUid = localUid;

    const { x: mx, y: my } = bridge.moveInput;
    const hasInput = Math.hypot(mx, my) > 0.05;
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(mx * PLAYER_SPEED, my * PLAYER_SPEED);
    bridge.localPose = {
      x: sprite.x,
      y: sprite.y,
      vx: body.velocity.x,
      vy: body.velocity.y,
    };

    if (import.meta.env.DEV && hasInput) {
      const remoteUid = this.remoteUids[0];
      const remoteSprite = remoteUid ? this.players.get(remoteUid)?.sprite : undefined;
      console.log("[TEAM PLAYER UPDATE]", {
        action: "setVelocityOnly",
        localUid: localUid.slice(0, 8),
        remoteUid: remoteUid?.slice(0, 8) ?? null,
        spriteName: sprite.name,
        remoteSpriteName: remoteSprite?.name ?? null,
        touchedRemoteSprite: false,
        remoteSetPosition: false,
      });
    }
  }

  /** Phase B — Host 로컬 킥 (Guest는 RTDB kickRequests → Hook relay) */
  private applyKickPhaseB(bridge: TeamMatchBridge): void {
    if (!this.isHostAuthority) {
      if (import.meta.env.DEV) {
        console.warn("[TEAM KICK] applyKick skipped — not host authority", {
          authUid: bridge.authUid.slice(0, 8),
          hostUid: bridge.hostUid.slice(0, 8),
        });
      }
      return;
    }

    const kicker = this.localPlayer;
    if (!kicker) {
      if (import.meta.env.DEV) {
        console.warn("[TEAM KICK] applyKick skipped — localPlayer null");
      }
      return;
    }

    const applied = tryApplyTeamKickToBridge(
      bridge,
      bridge.authUid,
      kicker.x,
      kicker.y,
      bridge.moveInput,
    );
    if (!applied) {
      if (import.meta.env.DEV) {
        const dist = Math.hypot(
          bridge.snapshot.ball.x - kicker.x,
          bridge.snapshot.ball.y - kicker.y,
        );
        console.log("[TEAM KICK] scene out of range", {
          dist: Math.round(dist),
          range: TEAM_KICK_RANGE,
        });
      }
      return;
    }

    this.syncBallFromSnapshot(bridge);
    this.cameras.main.shake(60, 0.002);

    if (import.meta.env.DEV) {
      const ball = bridge.snapshot.ball;
      console.log("[TEAM KICK] scene host applied", {
        uid: bridge.authUid.slice(0, 8),
        vx: Math.round(ball.vx),
        vy: Math.round(ball.vy),
        x: Math.round(ball.x),
        y: Math.round(ball.y),
      });
    }
  }

  private spawnPlayer(
    uid: string,
    team: TeamId,
    x: number,
    y: number,
    isLocal: boolean,
    bridge: TeamMatchBridge,
  ): void {
    const tex = team === "A" ? "tm-player-a" : "tm-player-b";
    if (!this.textures.exists(tex)) {
      console.error("[TEAM SPAWN] missing texture", tex);
      return;
    }
    if (isLocal) {
      const sprite = this.physics.add.sprite(x, y, tex);
      sprite.setCollideWorldBounds(true);
      sprite.setDepth(10);
      sprite.setCircle(PLAYER_RADIUS);
      sprite.name = `local-${uid.slice(0, 8)}`;
      this.localPlayer = sprite;
      this.localPlayerUid = uid;
      this.players.set(uid, {
        uid,
        team,
        isLocal: true,
        moveInput: bridge.moveInput,
        sprite,
      });
      return;
    }
    const sprite = this.add.sprite(x, y, tex);
    sprite.name = `remote-${uid.slice(0, 8)}`;
    sprite.setDepth(8);
    this.players.set(uid, {
      uid,
      team,
      isLocal: false,
      moveInput: { x: 0, y: 0 },
      sprite,
    });
  }

  private applyRemotePuppetsOnly(bridge: TeamMatchBridge): void {
    const authUid = bridge.authUid || this.authUid;
    if (!authUid) return;

    for (const remoteUid of this.remoteUids) {
      if (!remoteUid || remoteUid === authUid) continue;

      const net = bridge.remoteNetPose[remoteUid];
      if (!net) continue;

      const entry = this.players.get(remoteUid);
      if (!entry || entry.uid !== remoteUid || entry.isLocal) continue;

      const localSprite = this.localPlayer;
      const remoteSprite = entry.sprite;
      if (!remoteSprite || remoteSprite === localSprite) continue;
      if (remoteSprite instanceof Phaser.Physics.Arcade.Sprite) continue;

      const distToLocal = Math.hypot(net.x - bridge.localPose.x, net.y - bridge.localPose.y);
      if (distToLocal < 12) {
        if (import.meta.env.DEV) {
          console.log("[REMOTE APPLY] echo skip", {
            remoteUid: remoteUid.slice(0, 8),
            x: Math.round(net.x),
            y: Math.round(net.y),
          });
        }
        continue;
      }

      const tx = finiteCoord(net.x, remoteSprite.x);
      const ty = finiteCoord(net.y, remoteSprite.y);
      const prevX = remoteSprite.x;
      const prevY = remoteSprite.y;
      remoteSprite.setPosition(tx, ty);

      if (import.meta.env.DEV) {
        const moved = Math.hypot(tx - prevX, ty - prevY) > 0.5;
        const now = Date.now();
        if (moved && now - this.remoteApplyLogAt > 400) {
          this.remoteApplyLogAt = now;
          console.log("[REMOTE APPLY]", {
            authUid: authUid.slice(0, 8),
            remoteUid: remoteUid.slice(0, 8),
            isSelf: remoteUid === authUid,
            spriteName: remoteSprite.name,
            localSpriteName: localSprite?.name ?? null,
            sameSpriteRef: remoteSprite === localSprite,
            x: Math.round(tx),
            y: Math.round(ty),
          });
        }
      }
    }
  }

  private drawPitch(): void {
    const { w, h, margin } = this.field;
    const g = this.add.graphics();
    g.fillStyle(0x0a1628, 1);
    g.fillRect(0, 0, w, h);

    g.lineStyle(1, 0x1e3a5f, 0.45);
    for (let x = 0; x <= w; x += 80) g.lineBetween(x, 0, x, h);
    for (let y = 0; y <= h; y += 80) g.lineBetween(0, y, w, y);

    g.lineStyle(3, 0x22d3ee, 0.35);
    g.strokeRect(margin, margin, w - margin * 2, h - margin * 2);
    g.lineStyle(2, 0xa78bfa, 0.25);
    g.strokeCircle(w / 2, h / 2, this.field.mode === "portrait" ? 52 : 64);

    if (this.field.mode === "portrait") {
      g.lineStyle(2, 0x475569, 0.7);
      g.lineBetween(margin, h / 2, w - margin, h / 2);
    } else {
      g.lineStyle(2, 0x475569, 0.7);
      g.lineBetween(w / 2, margin, w / 2, h - margin);
    }

    this.drawGoals(g);
    g.setDepth(0);

    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px",
      fontStyle: "bold",
      color: "#94a3b8",
    };
    if (this.field.mode === "portrait") {
      const goals = getPortraitGoals(this.field);
      this.add.text(w / 2, goals.topLineY + 6, "AWAY", labelStyle).setOrigin(0.5, 0).setDepth(1);
      this.add.text(w / 2, goals.bottomLineY - 6, "HOME", labelStyle).setOrigin(0.5, 1).setDepth(1);
    } else {
      this.add.text(margin + 8, h / 2 - 8, "HOME", labelStyle).setOrigin(0, 0.5).setDepth(1);
      this.add.text(w - margin - 8, h / 2 - 8, "AWAY", labelStyle).setOrigin(1, 0.5).setDepth(1);
    }
  }

  private drawGoals(g: Phaser.GameObjects.Graphics): void {
    const { goalDepth, goalMouth } = this.field;

    if (this.field.mode === "portrait") {
      const pg = getPortraitGoals(this.field);
      const gLeft = pg.centerX - pg.halfMouth;
      const mouthW = pg.halfMouth * 2;
      const topBack = pg.topLineY - pg.depth;
      const bottomFront = pg.bottomLineY;
      g.fillStyle(0x0ea5e9, 0.22);
      g.fillRect(gLeft, topBack, mouthW, pg.depth);
      g.fillRect(gLeft, bottomFront, mouthW, pg.depth);
      g.lineStyle(5, 0xf8fafc, 1);
      g.strokeRect(gLeft, topBack, mouthW, pg.depth);
      g.strokeRect(gLeft, bottomFront, mouthW, pg.depth);
      g.lineStyle(3, 0xfbbf24, 0.9);
      g.strokeLineShape(new Phaser.Geom.Line(gLeft, pg.topLineY, gLeft + mouthW, pg.topLineY));
      g.strokeLineShape(
        new Phaser.Geom.Line(gLeft, pg.bottomLineY, gLeft + mouthW, pg.bottomLineY),
      );
      return;
    }

    const lg = getLandscapeGoals(this.field);
    const goalH = goalMouth;
    const goalY = lg.centerY - lg.halfMouth;
    const leftBack = lg.leftLineX - lg.depth;
    const rightFront = lg.rightLineX;
    g.fillStyle(0x0ea5e9, 0.22);
    g.fillRect(leftBack, goalY, goalDepth, goalH);
    g.fillRect(rightFront, goalY, goalDepth, goalH);
    g.lineStyle(5, 0xf8fafc, 1);
    g.strokeRect(leftBack, goalY, goalDepth, goalH);
    g.strokeRect(rightFront, goalY, goalDepth, goalH);
    g.lineStyle(3, 0xfbbf24, 0.9);
    g.strokeLineShape(new Phaser.Geom.Line(lg.leftLineX, goalY, lg.leftLineX, goalY + goalH));
    g.strokeLineShape(new Phaser.Geom.Line(lg.rightLineX, goalY, lg.rightLineX, goalY + goalH));
  }

  /** LiveMatchScene과 동일 — 빈 texture static sprite 금지 */
  private addWall(x: number, y: number, bw: number, bh: number): void {
    const wall = this.add.rectangle(x, y, bw, bh, 0x0f172a, 0);
    this.physics.add.existing(wall, true);
    this.walls.add(wall);
  }

  private buildWalls(): void {
    const { w, h, margin, goalMouth } = this.field;
    const t = 16;

    if (this.field.mode === "portrait") {
      const pg = getPortraitGoals(this.field);
      const gLeft = pg.centerX - pg.halfMouth;
      const gRight = pg.centerX + pg.halfMouth;
      const topBack = pg.topLineY - pg.depth;
      const botBack = pg.bottomLineY + pg.depth;
      const topY = topBack - t / 2;
      const botY = botBack + t / 2;
      const topSegW = gLeft - margin;
      if (topSegW > 0) this.addWall(margin + topSegW / 2, topY, topSegW, t);
      const topSegW2 = w - margin - gRight;
      if (topSegW2 > 0) this.addWall(gRight + topSegW2 / 2, topY, topSegW2, t);
      if (topSegW > 0) this.addWall(margin + topSegW / 2, botY, topSegW, t);
      if (topSegW2 > 0) this.addWall(gRight + topSegW2 / 2, botY, topSegW2, t);
      const sideTop = topBack - t / 2;
      const sideBot = botBack + t / 2;
      const sideH = sideBot - sideTop;
      const sideCy = (sideTop + sideBot) / 2;
      this.addWall(margin - t / 2, sideCy, t, sideH);
      this.addWall(w - margin + t / 2, sideCy, t, sideH);
      return;
    }

    const innerW = w - margin * 2;
    const goalHalfH = goalMouth / 2;
    const goalTop = h / 2 - goalHalfH;
    const goalBottom = h / 2 + goalHalfH;
    this.addWall(w / 2, margin - t / 2, innerW, t);
    this.addWall(w / 2, h - margin - t / 2, innerW, t);
    const leftSegH = goalTop - margin;
    if (leftSegH > 0) this.addWall(margin - t / 2, margin + leftSegH / 2, t, leftSegH);
    const leftLowH = h - margin - goalBottom;
    if (leftLowH > 0) this.addWall(margin - t / 2, goalBottom + leftLowH / 2, t, leftLowH);
    const rightX = w - margin;
    if (leftSegH > 0) this.addWall(rightX + t / 2, margin + leftSegH / 2, t, leftSegH);
    if (leftLowH > 0) this.addWall(rightX + t / 2, goalBottom + leftLowH / 2, t, leftLowH);
  }
}

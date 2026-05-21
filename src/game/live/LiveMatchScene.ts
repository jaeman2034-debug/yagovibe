import Phaser from "phaser";
import { auth } from "@/lib/firebase";
import { commitHostMatchState, getLiveMatchBridge } from "@/lib/live/liveMatchBridge";
import {
  isBridgeLobbyReady,
  isGoalCelebration,
  pickAdvancedMatch,
} from "@/lib/live/liveMatchLobby";
import {
  clearLiveMatchMove,
  consumeLiveMatchKick,
} from "@/lib/live/liveMatchInput";
import {
  detectFieldLayoutMode,
  getCameraViewInsets,
  getLandscapeGoals,
  defaultBallPosition,
  getLiveFieldLayout,
  getPortraitGoals,
  clampBallInPlayArea,
  sanitizeBallCoords,
  spawnForPlayerIndex,
  type FieldLayoutMode,
  type LiveFieldLayout,
} from "@/lib/live/liveFieldLayout";
import type { LiveMatchGameConfig } from "@/game/live/createLiveMatchGame";
import {
  LIVE_MATCH_TIMING,
  resolveOpponentUid,
  type LiveMatchPhase,
  type LiveMatchSnapshot,
  type LivePlayerState,
} from "@/lib/live/liveMatchTypes";
import type { LiveMatchBridge } from "@/lib/live/liveMatchBridge";
import { isOpponentPoseEchoingOwn } from "@/lib/live/liveRtdbDiagnostics";

const PLAYER_SPEED = 210;
const KICK_RANGE = 54;
const KICK_FORCE = 360;
/** 벽·사이드라인 collider 반사 (과도한 감쇠 0.12는 공이 벽에 붙음) */
const BALL_BOUNCE = 0.82;
const PLAYER_BOUNCE = 0.05;
const BALL_DRAG = 680;
const BALL_MAX_SPEED = 420;
const BALL_STOP_SPEED = 22;
const BALL_LINEAR_DAMP = 0.88;
const BALL_RADIUS = 11;
const LERP = 0.22;

export class LiveMatchScene extends Phaser.Scene {
  private sessionId = "";
  private myUid = "";
  private opponentUid = "";
  private isHost = false;
  private playerIndex: 0 | 1 = 0;
  private localPlayer!: Phaser.Physics.Arcade.Sprite;
  /** 네트워크 puppet — Arcade body 없음 (local과 body 공유·충돌 밀림 방지) */
  private remotePlayer!: Phaser.GameObjects.Sprite;
  private ball!: Phaser.Physics.Arcade.Sprite;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private goalZones!: Phaser.Physics.Arcade.StaticGroup;
  private goalTriggered = false;
  private pendingGoalMatch: LiveMatchSnapshot["match"] | null = null;
  private remoteLerp = { x: 0, y: 0 };
  private ballLerp = { x: 0, y: 0, vx: 0, vy: 0 };
  private facing = { x: 1, y: 0 };
  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
  };
  private matchClock = 0;
  private countdownLeft = 0;
  private countdownEndsAt = 0;
  private ballFrozenForGoal = false;
  private kickoffGuardMs = 0;
  private advanceGoalLogMs = 0;
  private postGoalHandled = false;
  private goalCelebrationTimer: Phaser.Time.TimerEvent | null = null;
  private prevHostPhase: LiveMatchPhase = "lobby";
  private lastCameraPhase: LiveMatchPhase | null = null;
  /** DEV: LOCAL/REMOTE pose 로그 스로틀 */
  private poseDebugAt = 0;
  private poseDebugKey = "";
  private remoteApplyLogAt = 0;
  /** DEV: 입력 없을 때 local 스프라이트가 움직이면 경고 */
  private localDriftProbe = { x: 0, y: 0, hadInput: false };
  /** DEV: `[UPDATE]` 스로틀 */
  private updateDiagLogAt = 0;
  private field!: LiveFieldLayout;
  private readonly onResizeFit = () => {
    this.applyWorldAndCameraBounds();
    this.fitCameraToField();
  };

  constructor() {
    super({ key: "LiveMatchScene" });
  }

  init(): void {
    /* ownership은 create()에서 registry+bridge로 확정 (init 시점엔 bridge 미설정일 수 있음) */
  }

  /** registry(캔버스 props) + bridge — sessionId/playerIndex 오염 방지 */
  private bindSessionOwnership(bridge: LiveMatchBridge | null): void {
    const cfg = this.registry.get("liveMatchConfig") as LiveMatchGameConfig | undefined;
    if (cfg?.sessionId) {
      this.sessionId = cfg.sessionId;
    }
    if (cfg?.myUid) {
      this.myUid = cfg.myUid;
      this.isHost = cfg.isHost;
      this.playerIndex = cfg.playerIndex;
    }
    if (bridge) {
      const sid = (this.sessionId || cfg?.sessionId || bridge.sessionId || "").trim();
      if (sid) {
        this.sessionId = sid;
        if (!bridge.sessionId?.trim() || bridge.sessionId !== sid) {
          bridge.sessionId = sid;
        }
      }
      this.myUid = bridge.myUid;
      this.opponentUid = bridge.opponentUid;
      this.isHost = bridge.isHost;
      this.playerIndex = bridge.playerIndex;
    }
    if (import.meta.env.DEV && bridge && bridge.opponentUid === bridge.myUid) {
      console.error("[liveMatch] opponentUid === myUid (input ownership broken)");
    }
  }

  private refreshOwnershipFromBridge(bridge: LiveMatchBridge): void {
    this.myUid = bridge.myUid;
    this.opponentUid = bridge.opponentUid;
    this.isHost = bridge.isHost;
    this.playerIndex = bridge.playerIndex;
  }

  /** Phaser 씬 ↔ React RTDB bridge (로그·입력 경로 디버그용) */
  private get bridge(): LiveMatchBridge | null {
    return getLiveMatchBridge();
  }

  /** slot0=cyan, slot1=pink — playerIndex에 따라 local/remote 텍스처 매핑 */
  private textureKeyForSlot(slot: 0 | 1): string {
    return slot === 0 ? "lm-player-local" : "lm-player-remote";
  }

  private localTextureKey(): string {
    return this.textureKeyForSlot(this.playerIndex);
  }

  private remoteTextureKey(): string {
    return this.textureKeyForSlot(this.playerIndex === 0 ? 1 : 0);
  }

  private colorRoleForTexture(texKey: string | undefined): "cyan" | "pink" | "?" {
    if (texKey === "lm-player-local") return "cyan";
    if (texKey === "lm-player-remote") return "pink";
    return "?";
  }

  private placeRemoteSprite(x: number, y: number): void {
    const puppet = this.remotePlayer;
    if (!puppet || puppet === this.localPlayer) {
      if (import.meta.env.DEV) {
        console.error("[liveMatch] placeRemoteSprite blocked — target is localPlayer");
      }
      return;
    }
    puppet.setPosition(x, y);
  }

  /** localPlayer / remotePlayer / physics body alias 검사 */
  private logPlayerRefCheck(context: string): void {
    if (!import.meta.env.DEV) return;
    const same = this.localPlayer === this.remotePlayer;
    const sameBody = Boolean(
      this.localPlayer?.body &&
        (this.remotePlayer as Phaser.Physics.Arcade.Sprite).body &&
        this.localPlayer.body === (this.remotePlayer as Phaser.Physics.Arcade.Sprite).body,
    );
    console.log("REF CHECK", same, context);
    console.log("PLAYER REFS", {
      same,
      sameBody,
      playerIndex: this.playerIndex,
      localTex: this.localPlayer?.texture?.key,
      remoteTex: this.remotePlayer?.texture?.key,
      localColor: this.colorRoleForTexture(this.localPlayer?.texture?.key),
      remoteColor: this.colorRoleForTexture(this.remotePlayer?.texture?.key),
      localPos: {
        x: Math.round(this.localPlayer?.x ?? 0),
        y: Math.round(this.localPlayer?.y ?? 0),
      },
      remotePos: {
        x: Math.round(this.remotePlayer?.x ?? 0),
        y: Math.round(this.remotePlayer?.y ?? 0),
      },
    });
    if (same || sameBody) {
      console.error("[liveMatch] sprite/body alias — local and remote share reference");
    }
  }

  /** DEV: sprite·pose 객체 참조 공유 여부 (update 상단) */
  private assertInputAndPoseSeparation(bridge: LiveMatchBridge): void {
    if (!import.meta.env.DEV) return;
    if (this.localPlayer === this.remotePlayer) {
      console.error("[liveMatch] SAME PLAYER REF — localPlayer === remotePlayer");
    }
    if (this.remoteLerp === (bridge.localPose as unknown as typeof this.remoteLerp)) {
      console.error("[liveMatch] SAME POSE REF — remoteLerp aliases bridge.localPose");
    }
  }

  /** DEV: 콘솔 필터 `[REMOTE APPLY]` — NET / LOCAL / PUPPET 분리 확인 */
  private logRemoteApplyDiag(bridge: LiveMatchBridge): void {
    if (!import.meta.env.DEV) return;
    const now = Date.now();
    if (now - this.remoteApplyLogAt < 350) return;
    this.remoteApplyLogAt = now;

    const net = bridge.opponentNetworkPose;
    const lx = this.localPlayer?.x ?? 0;
    const ly = this.localPlayer?.y ?? 0;
    console.log("[REMOTE APPLY]", {
      NET: net
        ? {
            x: Math.round(net.x),
            y: Math.round(net.y),
            vx: Math.round(net.vx ?? 0),
            vy: Math.round(net.vy ?? 0),
            networkUid: net.networkUid?.slice(0, 8),
          }
        : null,
      LOCAL: { x: Math.round(lx), y: Math.round(ly) },
      PUPPET: {
        x: Math.round(this.remotePlayer?.x ?? 0),
        y: Math.round(this.remotePlayer?.y ?? 0),
      },
      posesEqual:
        !!net &&
        Math.abs((net.x ?? 0) - lx) < 2 &&
        Math.abs((net.y ?? 0) - ly) < 2,
      playerIndex: this.playerIndex,
    });
  }

  private syncRemoteNetworkPuppet(snap: LiveMatchSnapshot, bridge: LiveMatchBridge): void {
    if (snap.match.phase === "playing") {
      this.logRemoteApplyDiag(bridge);
    }

    const me = auth.currentUser?.uid?.trim() || bridge.myUid;
    const oppUid = resolveOpponentUid(me, bridge.playerUids) ?? bridge.opponentUid;
    if (!oppUid || oppUid === me) {
      if (import.meta.env.DEV) {
        console.error("[liveMatch] REMOTE READ blocked", { me, oppUid, playerUids: bridge.playerUids });
      }
      return;
    }

    // RTDB onValue 전용 채널 우선 (snapshot·hostPublish와 분리)
    const net = bridge.opponentNetworkPose;
    if (net?.networkUid && net.networkUid !== oppUid) {
      if (import.meta.env.DEV) {
        console.error("[liveMatch] opponentNetworkPose uid mismatch — skip puppet", {
          expected: oppUid.slice(0, 8),
          got: net.networkUid.slice(0, 8),
        });
      }
      return;
    }
    // snapshot.players merge는 RTDB echo·호스트 캐시 오염 가능 — puppet은 onValue 채널만
    if (!net) return;
    const raw = net;

    // echo 판정은 RTDB snapshot이 아니라 physics local 좌표 기준 (merge 지연·오염 방지)
    const ownPose: LivePlayerState = {
      x: this.localPlayer.x,
      y: this.localPlayer.y,
      vx: bridge.localPose.vx,
      vy: bridge.localPose.vy,
      ready: true,
      connected: true,
      lastSeen: Date.now(),
    };

    if (isOpponentPoseEchoingOwn(ownPose, raw)) {
      if (import.meta.env.DEV) {
        console.warn("[liveMatch] syncRemote skipped — opponent pose echoes own (RTDB slot)");
      }
      return;
    }

    const opponent: LivePlayerState = {
      x: raw.x,
      y: raw.y,
      vx: raw.vx ?? 0,
      vy: raw.vy ?? 0,
      ready: Boolean(raw.ready),
      connected: raw.connected !== false,
      lastSeen: raw.lastSeen ?? Date.now(),
    };

    const distToLocal = Math.hypot(opponent.x - this.localPlayer.x, opponent.y - this.localPlayer.y);
    const localMoving = Math.hypot(bridge.localPose.vx, bridge.localPose.vy) > 12;
    const oppStill = Math.hypot(opponent.vx, opponent.vy) < 8;
    if (localMoving && oppStill && distToLocal < 18) {
      return;
    }

    if (import.meta.env.DEV) {
      const own = snap.players[me];
      if (own && Math.hypot(own.x - opponent.x, own.y - opponent.y) < 2) {
        const moving = Math.hypot(bridge.localPose.vx, bridge.localPose.vy) > 8;
        if (moving) {
          console.warn("[liveMatch] REMOTE READ ≈ own pose (RTDB slot or read key bug)", {
            me: me.slice(0, 8),
            oppUid: oppUid.slice(0, 8),
          });
        }
      }
    }

    const targetX = opponent.x;
    const targetY = opponent.y;
    this.remoteLerp.x += (targetX - this.remoteLerp.x) * LERP;
    this.remoteLerp.y += (targetY - this.remoteLerp.y) * LERP;
    this.placeRemoteSprite(this.remoteLerp.x, this.remoteLerp.y);

    if (import.meta.env.DEV) {
      const localMoving = Math.hypot(bridge.localPose.vx, bridge.localPose.vy) > 8;
      const oppMoving = Math.hypot(opponent.vx, opponent.vy) > 8;
      const posesEqual =
        Math.abs(raw.x - this.localPlayer.x) < 2 && Math.abs(raw.y - this.localPlayer.y) < 2;
      if (posesEqual && localMoving && !oppMoving) {
        console.warn(
          "[liveMatch] [REMOTE APPLY] posesEqual — RTDB slot echo (check Firebase players/*)",
        );
      }
    }

    this.logPoseDebug(bridge, snap, oppUid, opponent);
  }

  /** playing 중 이동 시 LOCAL(스프라이트) vs REMOTE(RTDB 읽기) 좌표 분리 확인 */
  private logPoseDebug(
    bridge: LiveMatchBridge,
    snap: LiveMatchSnapshot,
    oppUid: string,
    opponent: LivePlayerState,
  ): void {
    if (!import.meta.env.DEV) return;
    if (snap.match.phase !== "playing") return;
    const moving =
      Math.hypot(bridge.localPose.vx, bridge.localPose.vy) > 8 ||
      Math.hypot(opponent.vx ?? 0, opponent.vy ?? 0) > 8;
    if (!moving) return;

    const lx = Math.round(this.localPlayer.x);
    const ly = Math.round(this.localPlayer.y);
    const rx = Math.round(opponent.x);
    const ry = Math.round(opponent.y);
    const key = `${lx}:${ly}:${rx}:${ry}`;
    const now = Date.now();
    if (key === this.poseDebugKey && now - this.poseDebugAt < 450) return;
    this.poseDebugKey = key;
    this.poseDebugAt = now;

    const rsx = Math.round(this.remotePlayer.x);
    const rsy = Math.round(this.remotePlayer.y);
    console.log("LOCAL POS", bridge.myUid.slice(0, 8), lx, ly);
    console.log("REMOTE RTDB", oppUid.slice(0, 8), rx, ry);
    console.log("REMOTE SPRITE", rsx, rsy);
    if (lx === rx && ly === ry) {
      console.warn("[liveMatch] LOCAL ≈ REMOTE RTDB (read slot bug)");
    }
    if (Math.hypot(lx - rsx, ly - rsy) < 4) {
      console.warn("[liveMatch] LOCAL ≈ REMOTE SPRITE (alias or remote sync on local)");
    }
    if (Math.hypot(rsx - rx, rsy - ry) > 24) {
      console.warn("[liveMatch] REMOTE SPRITE ≠ RTDB (puppet not following network)");
    }
  }

  private applyLocalPlayerInput(playing: boolean): void {
    console.log("[LOCAL INPUT]", {
      playerIndex: this.playerIndex,
      moveInput: this.bridge?.moveInput,
      localX: this.localPlayer?.x,
      localY: this.localPlayer?.y,
    });
    if (this.localPlayer === this.remotePlayer) {
      console.error("[liveMatch] localPlayer === remotePlayer");
      return;
    }
    const body = this.localPlayer.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    if (!playing) {
      body.setVelocity(0, 0);
      return;
    }
    const { x: mx, y: my } = this.resolveMove();
    const hasInput = Math.hypot(mx, my) > 0.12;
    console.log("[SET VELOCITY]", {
      playerIndex: this.playerIndex,
      mx,
      my,
    });
    body.setVelocity(mx * PLAYER_SPEED, my * PLAYER_SPEED);
    if (hasInput) this.facing = { x: mx, y: my };

    if (import.meta.env.DEV && playing && !hasInput) {
      const dx = this.localPlayer.x - this.localDriftProbe.x;
      const dy = this.localPlayer.y - this.localDriftProbe.y;
      if (!this.localDriftProbe.hadInput && Math.hypot(dx, dy) > 5) {
        console.warn("[liveMatch] LOCAL DRIFT without input — not remote sync path", {
          dx: Math.round(dx),
          dy: Math.round(dy),
          localColor: this.colorRoleForTexture(this.localPlayer.texture?.key),
          remoteColor: this.colorRoleForTexture(this.remotePlayer.texture?.key),
        });
      }
    }
    this.localDriftProbe = {
      x: this.localPlayer.x,
      y: this.localPlayer.y,
      hadInput: hasInput,
    };

    if (import.meta.env.DEV && (Math.abs(mx) > 0.1 || Math.abs(my) > 0.1)) {
      const bridge = getLiveMatchBridge();
      if (bridge?.snapshot.match.phase === "playing") {
        console.log(
          "LOCAL POS",
          this.myUid.slice(0, 8),
          Math.round(this.localPlayer.x),
          Math.round(this.localPlayer.y),
        );
      }
    }
  }

  create(): void {
    const bridge = getLiveMatchBridge();
    if (!bridge) {
      console.error("[LiveMatchScene] create without bridge — abort");
      return;
    }
    this.bindSessionOwnership(bridge);
    const mode: FieldLayoutMode =
      bridge.fieldLayout.mode ??
      (this.registry.get("fieldLayoutMode") as FieldLayoutMode | undefined) ??
      detectFieldLayoutMode();
    this.field = bridge.fieldLayout ?? getLiveFieldLayout(mode);

    const { w, h } = this.field;
    this.cameras.main.setBackgroundColor("#070b14");
    this.drawPitch();
    this.createTextures();
    this.walls = this.physics.add.staticGroup();
    this.buildWalls();
    this.goalZones = this.physics.add.staticGroup();
    this.buildGoalZones();

    const spawnLocal = this.spawnFor(this.playerIndex);
    const spawnRemote = this.spawnFor(this.playerIndex === 0 ? 1 : 0);

    const ballCenter = defaultBallPosition(this.field);
    this.ball = this.physics.add.sprite(ballCenter.x, ballCenter.y, "lm-ball");
    this.ball.setCircle(BALL_RADIUS);
    this.ball.setDepth(10);
    this.ball.setAlpha(1);

    const localTex = this.localTextureKey();
    const remoteTex = this.remoteTextureKey();

    this.localPlayer = this.physics.add.sprite(spawnLocal.x, spawnLocal.y, localTex);
    this.localPlayer.setCircle(14);
    this.localPlayer.setCollideWorldBounds(false);
    this.localPlayer.setBounce(PLAYER_BOUNCE);
    this.localPlayer.setDepth(3);

    this.remotePlayer = this.add.sprite(spawnRemote.x, spawnRemote.y, remoteTex);
    this.remotePlayer.setDepth(3);
    this.remoteLerp = { x: spawnRemote.x, y: spawnRemote.y };
    this.ballLerp = { x: ballCenter.x, y: ballCenter.y, vx: 0, vy: 0 };

    this.applyWorldAndCameraBounds();

    this.physics.add.collider(this.localPlayer, this.walls);

    this.localPlayer.setName("lm-local");
    this.remotePlayer.setName("lm-remote");
    const localBody = this.localPlayer.body as Phaser.Physics.Arcade.Body;
    localBody.moves = true;
    localBody.setImmovable(false);

    this.logPlayerRefCheck("create");
    this.localDriftProbe = { x: this.localPlayer.x, y: this.localPlayer.y, hadInput: false };

    if (import.meta.env.DEV) {
      console.info("[liveMatch] ownership", {
        myUid: this.myUid.slice(0, 8),
        opponentUid: this.opponentUid.slice(0, 8),
        playerIndex: this.playerIndex,
        localColor: this.colorRoleForTexture(localTex),
        remoteColor: this.colorRoleForTexture(remoteTex),
        isHost: this.isHost,
      });
    }

    if (this.isHost) {
      this.configureHostBallPhysics();
      this.physics.world.setFPS(60);
      this.physics.add.collider(this.ball, this.walls);
      this.setupGoalOverlaps();
      // 플레이어↔공: Arcade collider 제거 — 슛은 applyKick만 (이중 impulse 방지)
    } else {
      this.ball.disableBody(false, true);
    }

    this.fitCameraToField();
    this.scale.on("resize", this.onResizeFit);

    if (this.input.keyboard) {
      this.keys = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
        SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      }) as LiveMatchScene["keys"];
    }

    const bridgeAfterCreate = getLiveMatchBridge();
    if (bridgeAfterCreate) {
      const placed = this.ballCoordsFromSnapshot(bridgeAfterCreate.snapshot.ball);
      this.ball.setPosition(placed.x, placed.y);
      this.ballLerp = { x: placed.x, y: placed.y, vx: 0, vy: 0 };
    }

    this.registry.set("liveMatchReady", true);
  }

  private spawnFor(index: 0 | 1): { x: number; y: number } {
    return spawnForPlayerIndex(this.field, index);
  }

  private applyWorldAndCameraBounds(): void {
    const { w, h, margin } = this.field;
    // 카메라·월드 메타는 전체 필드, 물리 벽은 cyan 라인(margin) static collider가 담당
    this.physics.world.setBounds(0, 0, w, h, true);
    this.cameras.main.setBounds(0, 0, w, h);
  }

  /** portrait: HUD inset만 반영해 zoom — setViewport letterbox(하단 dead space) 제거 */
  private fitCameraToField(): void {
    const cam = this.cameras.main;
    const { w, h } = this.field;
    const gameW = this.scale.width;
    const gameH = this.scale.height;
    if (gameW <= 0 || gameH <= 0) return;

    cam.stopFollow();
    cam.setBounds(0, 0, w, h);
    cam.setViewport(0, 0, gameW, gameH);

    if (this.field.mode === "portrait") {
      const phase = getLiveMatchBridge()?.snapshot.match.phase;
      const ended = phase === "ended";
      const { top, bottom, centerBiasY } = ended
        ? { top: getCameraViewInsets(this.field).top, bottom: 0, centerBiasY: 0 }
        : getCameraViewInsets(this.field);
      const usableH = Math.max(1, gameH - top - bottom);
      const zoomX = gameW / w;
      const zoomY = usableH / h;
      cam.setZoom(Math.min(zoomX, zoomY));
      cam.centerOn(w / 2, h / 2 + centerBiasY);
    } else {
      cam.setZoom(Math.min(gameW / w, gameH / h) * 0.92);
      cam.centerOn(w / 2, h / 2);
    }
  }

  private ballCoordsFromSnapshot(b: LiveMatchSnapshot["ball"]): { x: number; y: number } {
    const { x, y } = sanitizeBallCoords(b, this.field);
    return { x, y };
  }

  private centerBallState(): { x: number; y: number } {
    return defaultBallPosition(this.field);
  }

  private drawPitch(): void {
    const { w, h, margin } = this.field;
    const g = this.add.graphics();
    g.fillStyle(0x0a1628, 1);
    g.fillRect(0, 0, w, h);

    g.lineStyle(1, 0x1e3a5f, 0.5);
    for (let x = 0; x <= w; x += 80) g.lineBetween(x, 0, x, h);
    for (let y = 0; y <= h; y += 80) g.lineBetween(0, y, w, y);

    g.lineStyle(3, 0x22d3ee, 0.35);
    g.strokeRect(margin, margin, w - margin * 2, h - margin * 2);
    g.lineStyle(2, 0xa78bfa, 0.25);
    g.strokeCircle(w / 2, h / 2, this.field.mode === "portrait" ? 52 : 64);

    this.drawGoals(g);
    g.setDepth(0);

    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      fontStyle: "bold",
      color: "#94a3b8",
    };
    if (this.field.mode === "portrait") {
      const goals = getPortraitGoals(this.field);
      this.add.text(w / 2, goals.topLineY + 4, "AWAY", labelStyle).setOrigin(0.5, 0).setDepth(1);
      this.add.text(w / 2, goals.bottomLineY - 4, "HOME", labelStyle).setOrigin(0.5, 1).setDepth(1);
    } else {
      this.add.text(margin + 8, h / 2 - 8, "HOME", labelStyle).setOrigin(0, 0.5).setDepth(1);
      this.add
        .text(w - margin - 8, h / 2 - 8, "AWAY", labelStyle)
        .setOrigin(1, 0.5)
        .setDepth(1);
    }
  }

  private drawGoals(g: Phaser.GameObjects.Graphics): void {
    const { w, h, margin, goalDepth, goalMouth } = this.field;

    if (this.field.mode === "portrait") {
      const pg = getPortraitGoals(this.field);
      const gLeft = pg.centerX - pg.halfMouth;
      const mouthW = pg.halfMouth * 2;
      const topBack = pg.topLineY - pg.depth;
      const bottomFront = pg.bottomLineY;
      g.fillStyle(0x0ea5e9, 0.2);
      g.fillRect(gLeft, topBack, mouthW, pg.depth);
      g.fillRect(gLeft, bottomFront, mouthW, pg.depth);
      g.lineStyle(1, 0x64748b, 0.45);
      for (let i = 1; i < 5; i++) {
        const x = gLeft + (mouthW * i) / 5;
        g.lineBetween(x, topBack, x, pg.topLineY);
        g.lineBetween(x, bottomFront, x, bottomFront + pg.depth);
      }
      g.lineStyle(5, 0xf8fafc, 1);
      g.strokeRect(gLeft, topBack, mouthW, pg.depth);
      g.strokeRect(gLeft, bottomFront, mouthW, pg.depth);
      g.lineStyle(3, 0xfbbf24, 0.85);
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
    g.fillStyle(0x0ea5e9, 0.2);
    g.fillRect(leftBack, goalY, goalDepth, goalH);
    g.fillRect(rightFront, goalY, goalDepth, goalH);
    g.lineStyle(1, 0x64748b, 0.45);
    for (let i = 1; i < 5; i++) {
      const y = goalY + (goalH * i) / 5;
      g.lineBetween(leftBack, y, margin, y);
      g.lineBetween(rightFront, y, w - margin, y);
    }
    g.lineStyle(5, 0xf8fafc, 1);
    g.strokeRect(leftBack, goalY, goalDepth, goalH);
    g.strokeRect(rightFront, goalY, goalDepth, goalH);
    g.lineStyle(3, 0xfbbf24, 0.85);
    g.strokeLineShape(new Phaser.Geom.Line(lg.leftLineX, goalY, lg.leftLineX, goalY + goalH));
    g.strokeLineShape(new Phaser.Geom.Line(lg.rightLineX, goalY, lg.rightLineX, goalY + goalH));
  }

  private createTextures(): void {
    if (!this.textures.exists("lm-player-local")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x22d3ee, 1);
      g.fillCircle(16, 16, 14);
      g.generateTexture("lm-player-local", 32, 32);
      g.destroy();
    }
    if (!this.textures.exists("lm-player-remote")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xf472b6, 1);
      g.fillCircle(16, 16, 14);
      g.generateTexture("lm-player-remote", 32, 32);
      g.destroy();
    }
    if (!this.textures.exists("lm-ball")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(12, 12, 10);
      g.lineStyle(3, 0x0f172a, 1);
      g.strokeCircle(12, 12, 10);
      g.lineStyle(2, 0x94a3b8, 0.9);
      g.strokeCircle(12, 12, 6);
      g.generateTexture("lm-ball", 24, 24);
      g.destroy();
    }
  }

  /** 호스트만 Arcade로 공 시뮬레이션 (비호스트는 RTDB 위치만 표시) */
  private configureHostBallPhysics(): void {
    this.ball.setBounce(BALL_BOUNCE, BALL_BOUNCE);
    this.ball.setDrag(BALL_DRAG);
    this.ball.setMaxVelocity(BALL_MAX_SPEED);
    // 골대 개구부는 walls에만 gap — world bounds(사각형)는 골 진입을 막음
    this.ball.setCollideWorldBounds(false);

    const body = this.ball.body as Phaser.Physics.Arcade.Body;
    body.setCircle(BALL_RADIUS);
    body.setBounce(BALL_BOUNCE, BALL_BOUNCE);
    body.setDamping(true);
    body.setDrag(BALL_DRAG, BALL_DRAG);
    body.setMaxVelocity(BALL_MAX_SPEED);
    body.setCollideWorldBounds(false);
  }

  private addWall(x: number, y: number, bw: number, bh: number): void {
    const wall = this.add.rectangle(x, y, bw, bh, 0x0f172a, 0);
    this.physics.add.existing(wall, true);
    this.walls.add(wall);
  }

  /** 플레이 영역 벽 — 골문 구간은 비움(세로: 상·하 / 가로: 좌·우) */
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

  /** 골 판정 — 페인트된 골망 영역과 동일, overlap만 (좌표 추측·벽 충돌과 분리) */
  private buildGoalZones(): void {
    if (this.field.mode === "portrait") {
      const pg = getPortraitGoals(this.field);
      const mouthW = pg.halfMouth * 2;
      const topCy = pg.topLineY - pg.depth / 2;
      const botCy = pg.bottomLineY + pg.depth / 2;
      this.addGoalZone(pg.centerX, topCy, mouthW, pg.depth, "b");
      this.addGoalZone(pg.centerX, botCy, mouthW, pg.depth, "a");
      return;
    }

    const lg = getLandscapeGoals(this.field);
    const mouthH = lg.halfMouth * 2;
    this.addGoalZone(lg.leftLineX - lg.depth / 2, lg.centerY, lg.depth, mouthH, "b");
    this.addGoalZone(lg.rightLineX + lg.depth / 2, lg.centerY, lg.depth, mouthH, "a");
  }

  private addGoalZone(x: number, y: number, zw: number, zh: number, scorer: "a" | "b"): void {
    const zone = this.add.zone(x, y, zw, zh);
    zone.setData("scorer", scorer);
    zone.setDepth(2);
    this.physics.add.existing(zone, true);
    this.goalZones.add(zone);
  }

  private setupGoalOverlaps(): void {
    this.physics.add.overlap(
      this.ball,
      this.goalZones,
      (_ball, zoneObj) => {
        const zone = zoneObj as Phaser.GameObjects.Zone;
        const scorer = zone.getData("scorer") as "a" | "b";
        this.registerGoal(scorer);
      },
      () =>
        this.phase() === "playing" &&
        !this.goalTriggered &&
        !this.ballFrozenForGoal &&
        this.kickoffGuardMs <= 0,
      this,
    );
  }

  private registerGoal(scorer: "a" | "b"): void {
    if (!this.isHost || this.goalTriggered || this.phase() !== "playing" || this.kickoffGuardMs > 0) {
      return;
    }
    const bridge = getLiveMatchBridge();
    if (!bridge) return;

    this.goalTriggered = true;
    this.postGoalHandled = false;
    this.goalCelebrationTimer?.remove();
    console.log("[liveMatch] GOAL DETECTED", { scorer, isHost: this.isHost });
    const snap = bridge.snapshot.match;
    const match: LiveMatchSnapshot["match"] = {
      ...snap,
      phase: "goal",
      scoreA: scorer === "a" ? snap.scoreA + 1 : snap.scoreA,
      scoreB: scorer === "b" ? snap.scoreB + 1 : snap.scoreB,
      goalResetAt: Date.now() + LIVE_MATCH_TIMING.goalCelebrationMs,
    };
    this.pendingGoalMatch = match;
    const ballPayload = {
      x: this.ball.x,
      y: this.ball.y,
      vx: 0,
      vy: 0,
      ownerUid: null as string | null,
    };
    commitHostMatchState(bridge.sessionId, { match, ball: ballPayload });
    bridge.snapshot.match = match;
    bridge.snapshot.ball = ballPayload;
    this.freezeBallForGoal();

    this.goalCelebrationTimer = this.time.delayedCall(
      LIVE_MATCH_TIMING.goalCelebrationMs,
      () => this.forcePostGoalCountdown(),
    );
  }

  /** update 루프 phase 깜빡임과 무관하게 골 후 countdown (호스트) */
  private forcePostGoalCountdown(): void {
    if (!this.isHost || this.postGoalHandled) return;
    const bridge = getLiveMatchBridge();
    if (!bridge) return;

    const snap = bridge.snapshot.match;
    if (snap.phase === "countdown" || snap.phase === "playing" || snap.phase === "ended") {
      this.postGoalHandled = true;
      return;
    }

    this.postGoalHandled = true;
    this.resetKickoff(snap);
    const match = {
      ...snap,
      phase: "countdown" as const,
      goalResetAt: 0,
      scoreA: snap.scoreA,
      scoreB: snap.scoreB,
    };
    const center = this.centerBallState();
    const ballPayload = {
      x: center.x,
      y: center.y,
      vx: 0,
      vy: 0,
      ownerUid: null as string | null,
    };
    commitHostMatchState(bridge.sessionId, { match, ball: ballPayload });
    bridge.snapshot.match = match;
    bridge.snapshot.ball = ballPayload;
    this.armCountdown(2);
    this.prevHostPhase = "countdown";
    console.log("[liveMatch] RESET KICKOFF → COUNTDOWN (delayedCall)");
  }

  /**
   * 골 후 전환 — goalResetAt(벽시계) + goalTriggered.
   * phase가 playing으로 깜빡여도 축하 타이머가 매 프레임 리셋되지 않음.
   */
  private advanceHostGoalSequence(
    match: LiveMatchSnapshot["match"],
    bridge: NonNullable<ReturnType<typeof getLiveMatchBridge>>,
  ): LiveMatchSnapshot["match"] {
    try {
      const endsAt = Math.max(match.goalResetAt, bridge.snapshot.match.goalResetAt);
      const celebrating =
        this.goalTriggered || isGoalCelebration(match) || isGoalCelebration(bridge.snapshot.match);

      if (!celebrating && endsAt <= 0) return match;

      if (!this.goalTriggered && endsAt > 0) {
        this.goalTriggered = true;
      }

      const now = Date.now();
      if (now - this.advanceGoalLogMs > 900) {
        this.advanceGoalLogMs = now;
        console.log("[liveMatch] ADVANCE GOAL START", {
          goalTriggered: this.goalTriggered,
          endsAt,
          now,
          leftMs: endsAt > 0 ? endsAt - now : 0,
          phase: match.phase,
          bridgePhase: bridge.snapshot.match.phase,
        });
      }

      const scores = {
        scoreA: Math.max(match.scoreA, bridge.snapshot.match.scoreA),
        scoreB: Math.max(match.scoreB, bridge.snapshot.match.scoreB),
      };

      if (endsAt > 0 && Date.now() < endsAt) {
        this.freezeBallForGoal();
        return { ...match, ...scores, phase: "goal", goalResetAt: endsAt };
      }

      if (match.phase === "countdown" || match.phase === "playing") {
        return { ...match, ...scores, goalResetAt: 0 };
      }

      if (this.postGoalHandled) {
        return { ...match, ...scores, phase: "countdown" as const, goalResetAt: 0 };
      }
      this.postGoalHandled = true;
      this.goalCelebrationTimer?.remove();
      this.goalCelebrationTimer = null;
      this.resetKickoff(match);
      console.log("[liveMatch] RESET KICKOFF → COUNTDOWN");
      const next = {
        ...match,
        ...scores,
        phase: "countdown" as const,
        goalResetAt: 0,
      };
      bridge.snapshot.match = next;
      return next;
    } catch (err) {
      console.error("[liveMatch] ADVANCE GOAL FAILED", err);
      return match;
    }
  }

  /** 호스트: 속도 감쇠만 (경계·골은 walls + goal zone overlap) */
  private dampenHostBall(): void {
    if (!this.isHost || !this.ball.body) return;

    const body = this.ball.body as Phaser.Physics.Arcade.Body;
    if (!body.moves) return;

    let vx = body.velocity.x * BALL_LINEAR_DAMP;
    let vy = body.velocity.y * BALL_LINEAR_DAMP;
    const speed = Math.hypot(vx, vy);
    if (speed < BALL_STOP_SPEED) {
      vx = 0;
      vy = 0;
    }
    body.setVelocity(vx, vy);
    this.clampHostBallInPlayArea();
  }

  /** 사이드라인 밖 탈출 시 위치·속도 보정 (Arcade 터널링·코너 갭 대비) */
  private clampHostBallInPlayArea(): void {
    if (!this.isHost || !this.ball.body) return;
    const body = this.ball.body as Phaser.Physics.Arcade.Body;
    const clamped = clampBallInPlayArea(
      {
        x: this.ball.x,
        y: this.ball.y,
        vx: body.velocity.x,
        vy: body.velocity.y,
      },
      this.field,
      BALL_RADIUS,
      BALL_BOUNCE,
    );
    if (!clamped.clamped) return;
    this.ball.setPosition(clamped.x, clamped.y);
    body.reset(clamped.x, clamped.y);
    body.setVelocity(clamped.vx, clamped.vy);
  }

  private setBallSimulation(active: boolean): void {
    if (!this.isHost || !this.ball.body) return;
    const body = this.ball.body as Phaser.Physics.Arcade.Body;
    if (active && !this.ballFrozenForGoal) {
      body.moves = true;
      body.setImmovable(false);
      return;
    }
    body.setVelocity(0, 0);
    body.setAcceleration(0, 0);
    body.moves = false;
    body.setImmovable(true);
  }

  private resolveMove(): { x: number; y: number } {
    const bridge = getLiveMatchBridge();
    const touch = bridge?.moveInput ?? { x: 0, y: 0 };
    let mx = touch.x;
    let my = touch.y;
    if (Math.hypot(mx, my) < 0.12 && this.keys) {
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

  private phase(): LiveMatchPhase {
    return getLiveMatchBridge()?.snapshot.match.phase ?? "lobby";
  }

  private canPlay(): boolean {
    const p = this.phase();
    return p === "playing" || p === "goal";
  }

  /** 슛만 허용 — 플레이어 몸 밀기(collider) 대신 근접 시 밀어냄 */
  private separatePlayerFromBall(player: Phaser.Physics.Arcade.Sprite): void {
    const dx = this.ball.x - player.x;
    const dy = this.ball.y - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    const minDist = BALL_RADIUS + 16;
    if (dist >= minDist) return;
    const push = (minDist - dist) * 0.85;
    this.ball.setPosition(this.ball.x + (dx / dist) * push, this.ball.y + (dy / dist) * push);
  }

  /** 슛 방향: 1) kicker→ball (공이 밀려 나가는 방향) 2) 로컬 조이스틱 보조만 */
  private kickDirection(kicker: Phaser.GameObjects.Sprite): { x: number; y: number } {
    const dx = this.ball.x - kicker.x;
    const dy = this.ball.y - kicker.y;
    const dist = Math.hypot(dx, dy);
    const isLocalKicker = kicker === this.localPlayer;

    let fx: number;
    let fy: number;

    if (dist > 6) {
      fx = dx / dist;
      fy = dy / dist;
    } else if (isLocalKicker) {
      const move = this.resolveMove();
      if (Math.hypot(move.x, move.y) > 0.12) {
        fx = move.x;
        fy = move.y;
      } else {
        fx = this.facing.x;
        fy = this.facing.y;
        const fl = Math.hypot(fx, fy);
        if (fl < 0.1) {
          return { x: 1, y: 0 };
        }
        fx /= fl;
        fy /= fl;
      }
    } else {
      return { x: dx / (dist || 1), y: dy / (dist || 1) };
    }

    if (isLocalKicker && dist > 6) {
      const move = this.resolveMove();
      if (Math.hypot(move.x, move.y) > 0.2) {
        const blend = 0.3;
        fx = fx * (1 - blend) + move.x * blend;
        fy = fy * (1 - blend) + move.y * blend;
        const len = Math.hypot(fx, fy) || 1;
        fx /= len;
        fy /= len;
      }
    }

    return { x: fx, y: fy };
  }

  private applyKick(kicker: Phaser.GameObjects.Sprite): void {
    if (this.phase() !== "playing" || this.ballFrozenForGoal) return;
    const dx = this.ball.x - kicker.x;
    const dy = this.ball.y - kicker.y;
    const dist = Math.hypot(dx, dy);
    if (dist > KICK_RANGE) return;

    const { x: fx, y: fy } = this.kickDirection(kicker);
    this.ball.setVelocity(fx * KICK_FORCE, fy * KICK_FORCE);
    const body = this.ball.body as Phaser.Physics.Arcade.Body | null;
    if (body?.moves) {
      body.setVelocity(fx * KICK_FORCE, fy * KICK_FORCE);
    }

    const bridge = getLiveMatchBridge();
    if (bridge) bridge.snapshot.ball.ownerUid = kicker === this.localPlayer ? this.myUid : bridge.opponentUid;
    this.cameras.main.shake(60, 0.002);
  }

  private tryLocalKick(): void {
    if (this.phase() !== "playing") return;
    if (consumeLiveMatchKick() || (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.SPACE))) {
      if (this.isHost) this.applyKick(this.localPlayer);
      else {
        const bridge = getLiveMatchBridge();
        if (bridge) bridge.wantsKick = true;
      }
    }
  }

  private processRemoteKick(wantsKick: boolean | undefined, remote: Phaser.GameObjects.Sprite): void {
    if (!this.isHost || !wantsKick || this.phase() !== "playing" || this.kickoffGuardMs > 0) return;
    this.applyKick(remote);
    const bridge = getLiveMatchBridge();
    if (bridge) bridge.pendingClearOpponentKick = true;
  }

  private freezeBallForGoal(): void {
    if (!this.isHost || !this.ball.body) return;
    this.ballFrozenForGoal = true;
    this.ball.setVelocity(0, 0);
    const body = this.ball.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAcceleration(0, 0);
    this.setBallSimulation(false);
    const bridge = getLiveMatchBridge();
    if (bridge) {
      bridge.snapshot.ball = {
        ...bridge.snapshot.ball,
        x: this.ball.x,
        y: this.ball.y,
        vx: 0,
        vy: 0,
      };
    }
  }

  private unfreezeBallPhysics(): void {
    if (!this.isHost || !this.ball.body) return;
    this.ballFrozenForGoal = false;
    this.ball.setVelocity(0, 0);
    (this.ball.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  private cappedFrameMs(delta: number): number {
    return Math.min(Math.max(delta, 0), 50);
  }

  private armCountdown(seconds: number): void {
    const sec = Math.max(0.5, seconds);
    this.countdownLeft = sec;
    this.countdownEndsAt = Date.now() + sec * 1000;
  }

  private resetKickoff(_match: LiveMatchSnapshot["match"]): void {
    const s0 = this.spawnFor(0);
    const s1 = this.spawnFor(1);
    this.localPlayer.setPosition(
      this.playerIndex === 0 ? s0.x : s1.x,
      this.playerIndex === 0 ? s0.y : s1.y,
    );
    const localBody = this.localPlayer.body as Phaser.Physics.Arcade.Body | null;
    localBody?.setVelocity(0, 0);
    this.remotePlayer.setPosition(this.playerIndex === 0 ? s1.x : s0.x, this.playerIndex === 0 ? s1.y : s0.y);
    this.remoteLerp = {
      x: this.playerIndex === 0 ? s1.x : s0.x,
      y: this.playerIndex === 0 ? s1.y : s0.y,
    };
    const center = this.centerBallState();
    this.ball.setPosition(center.x, center.y);
    this.ball.setVelocity(0, 0);
    this.ballLerp = { x: center.x, y: center.y, vx: 0, vy: 0 };
    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body | null;
    if (ballBody) {
      ballBody.setVelocity(0, 0);
      ballBody.reset(center.x, center.y);
    }
    this.setBallSimulation(false);
    this.ballFrozenForGoal = true;
    this.pendingGoalMatch = null;
    this.kickoffGuardMs = 1800;
    const bridge = getLiveMatchBridge();
    if (bridge) {
      bridge.snapshot.ball = { x: center.x, y: center.y, vx: 0, vy: 0, ownerUid: null };
    }
  }

  private buildHostPublish(
    match: LiveMatchSnapshot["match"],
    players: Record<string, LivePlayerState>,
  ): void {
    const bridge = getLiveMatchBridge();
    if (!bridge) return;
    const frozen = match.phase === "goal" || match.phase === "countdown" || match.phase === "lobby";
    const center = this.centerBallState();
    const ballCoords = frozen
      ? { x: center.x, y: center.y, vx: 0, vy: 0 }
      : sanitizeBallCoords(
          {
            x: this.ball.x,
            y: this.ball.y,
            vx: this.ball.body?.velocity.x ?? 0,
            vy: this.ball.body?.velocity.y ?? 0,
          },
          this.field,
        );
    if (frozen) {
      this.ball.setPosition(center.x, center.y);
      this.ballLerp = { x: center.x, y: center.y, vx: 0, vy: 0 };
    }
    bridge.hostPublish = {
      players,
      ball: {
        x: ballCoords.x,
        y: ballCoords.y,
        vx: ballCoords.vx,
        vy: ballCoords.vy,
        ownerUid: frozen ? null : bridge.snapshot.ball.ownerUid,
      },
      match,
    };
  }

  update(_time: number, delta: number): void {
    const bridge = getLiveMatchBridge();
    if (!bridge) return;

    if (import.meta.env.DEV) {
      const now = Date.now();
      const phase = bridge.snapshot.match.phase;
      const mi = bridge.moveInput;
      const hasMove = Math.hypot(mi.x, mi.y) > 0.12;
      if (phase === "playing" && (hasMove || now - this.updateDiagLogAt >= 400)) {
        this.updateDiagLogAt = now;
        console.log("[UPDATE]", {
          playerIndex: this.playerIndex,
          phase,
          local: {
            x: this.localPlayer?.x,
            y: this.localPlayer?.y,
          },
          remote: {
            x: this.remotePlayer?.x,
            y: this.remotePlayer?.y,
          },
          moveInput: mi,
          opponentNetworkPose: bridge.opponentNetworkPose
            ? {
                x: bridge.opponentNetworkPose.x,
                y: bridge.opponentNetworkPose.y,
                networkUid: bridge.opponentNetworkPose.networkUid?.slice(0, 8),
              }
            : null,
        });
      }
    }

    if (bridge.snapshot.match.phase === "playing") {
      this.assertInputAndPoseSeparation(bridge);
    }

    const frameMs = this.cappedFrameMs(delta);
    const dt = frameMs / 1000;
    this.refreshOwnershipFromBridge(bridge);
    const snap = bridge.snapshot;
    const opponent =
      bridge.opponentUid && bridge.opponentUid !== this.myUid
        ? snap.players[bridge.opponentUid]
        : undefined;
    const remoteKick = (opponent as LivePlayerState & { wantsKick?: boolean })?.wantsKick;

    if (!this.isHost) {
      const { x: bx, y: by } = this.ballCoordsFromSnapshot(snap.ball);
      const ballSynced = snap.match.phase !== "playing";
      if (ballSynced) {
        this.ball.setPosition(bx, by);
        this.ballLerp.x = bx;
        this.ballLerp.y = by;
      } else {
        this.ballLerp.x += (bx - this.ballLerp.x) * LERP;
        this.ballLerp.y += (by - this.ballLerp.y) * LERP;
        this.ball.setPosition(this.ballLerp.x, this.ballLerp.y);
      }
    }

    let match = { ...snap.match };
    const hostPhaseBefore = match.phase;

    if (match.phase !== this.lastCameraPhase) {
      const prev = this.lastCameraPhase;
      this.lastCameraPhase = match.phase;
      if (match.phase === "ended" || prev === "ended") {
        this.fitCameraToField();
      }
    }

    if (this.isHost) {
      if (this.pendingGoalMatch) {
        match = this.pendingGoalMatch;
        bridge.snapshot.match = match;
        this.pendingGoalMatch = null;
      }

      const beforePostGoal = match.phase;
      match = this.advanceHostGoalSequence(match, bridge);
      if (match.phase === "countdown" && beforePostGoal !== "countdown") {
        this.armCountdown(2);
        const ballPayload = {
          x: this.ball.x,
          y: this.ball.y,
          vx: 0,
          vy: 0,
          ownerUid: null as string | null,
        };
        commitHostMatchState(bridge.sessionId, { match, ball: ballPayload });
        bridge.snapshot.match = match;
        bridge.snapshot.ball = ballPayload;
      }

      if (this.kickoffGuardMs > 0) {
        this.kickoffGuardMs = Math.max(0, this.kickoffGuardMs - frameMs);
      }

      if (match.phase === "lobby" && isBridgeLobbyReady(bridge)) {
        match = { ...match, phase: "countdown" };
        this.armCountdown(3);
        commitHostMatchState(bridge.sessionId, { match });
      }

      if (match.phase === "countdown") {
        if (this.prevHostPhase !== "countdown") {
          this.armCountdown(this.countdownLeft > 0 ? this.countdownLeft : 2);
        }
        this.countdownLeft = Math.max(0, (this.countdownEndsAt - Date.now()) / 1000);
        const countdownDone = this.countdownEndsAt > 0 && Date.now() >= this.countdownEndsAt;
        if (countdownDone) {
          this.resetKickoff(match);
          match = {
            ...match,
            phase: "playing",
            startedAt: Date.now(),
            timeRemainingMs: LIVE_MATCH_TIMING.matchDurationMs,
            goalResetAt: 0,
          };
          this.matchClock = LIVE_MATCH_TIMING.matchDurationMs;
          this.countdownEndsAt = 0;
          this.unfreezeBallPhysics();
          this.kickoffGuardMs = Math.max(this.kickoffGuardMs, 600);
          this.goalTriggered = false;
          console.log("[liveMatch] COUNTDOWN → PLAYING");
        }
      }

      if (match.phase === "playing") {
        if (this.matchClock <= 0 && match.timeRemainingMs > 0) {
          this.matchClock = match.timeRemainingMs;
        }
        this.matchClock = Math.max(0, this.matchClock - frameMs);
        match.timeRemainingMs = this.matchClock;
        if (this.matchClock <= 0) match = { ...match, phase: "ended" };
      }

      if (isGoalCelebration(match) || this.goalTriggered) {
        this.freezeBallForGoal();
      } else if (match.phase === "playing" && this.kickoffGuardMs <= 0) {
        this.ballFrozenForGoal = false;
      }

      const oppDisconnected =
        opponent &&
        opponent.connected === false &&
        Date.now() - opponent.lastSeen > LIVE_MATCH_TIMING.reconnectGraceMs;
      if (oppDisconnected && match.phase !== "ended") {
        match = { ...match, phase: "ended" };
      }

      const simActive = match.phase === "playing" && !this.ballFrozenForGoal;
      this.setBallSimulation(simActive);

      if (simActive) {
        this.processRemoteKick(remoteKick, this.remotePlayer);
        this.separatePlayerFromBall(this.localPlayer);
        this.dampenHostBall();
      } else if (match.phase === "playing") {
        this.clampHostBallInPlayArea();
      }

      if (match.phase !== hostPhaseBefore) {
        const ballPayload = {
          x: this.ball.x,
          y: this.ball.y,
          vx: 0,
          vy: 0,
          ownerUid: null as string | null,
        };
        commitHostMatchState(bridge.sessionId, {
          match,
          ball: ballPayload,
        });
        bridge.snapshot.match = match;
        bridge.snapshot.ball = ballPayload;
      }
      this.prevHostPhase = match.phase;
    }

    const playing = match.phase === "playing";
    this.applyLocalPlayerInput(playing);
    if (playing) this.tryLocalKick();

    if (import.meta.env.DEV && playing) {
      const moving = Math.hypot(bridge.localPose.vx, bridge.localPose.vy) > 8;
      if (moving) {
        const now = Date.now();
        if (now - this.poseDebugAt > 900) {
          this.logPlayerRefCheck("playing");
        }
      }
    }

    bridge.localPose = {
      x: this.localPlayer.x,
      y: this.localPlayer.y,
      vx: this.localPlayer.body?.velocity.x ?? 0,
      vy: this.localPlayer.body?.velocity.y ?? 0,
    };
    if (this.isHost) {
      bridge.snapshot.match = match;
    } else {
      bridge.snapshot.match = pickAdvancedMatch(bridge.snapshot.match, match);
    }

    if (this.isHost) {
      const players: Record<string, LivePlayerState> = {};
      const [a, b] = bridge.playerUids;
      const me = bridge.myUid;
      const oppUid = resolveOpponentUid(me, bridge.playerUids) ?? bridge.opponentUid;
      const localState: LivePlayerState = {
        x: this.localPlayer.x,
        y: this.localPlayer.y,
        vx: bridge.localPose.vx,
        vy: bridge.localPose.vy,
        ready:
          bridge.localReady === true ||
          snap.players[me]?.ready === true ||
          bridge.snapshot.players[me]?.ready === true,
        connected: true,
        lastSeen: Date.now(),
      };
      const oppSnap = oppUid && oppUid !== me ? snap.players[oppUid] : undefined;
      const remoteState: LivePlayerState = oppSnap
        ? {
            x: oppSnap.x,
            y: oppSnap.y,
            vx: oppSnap.vx ?? 0,
            vy: oppSnap.vy ?? 0,
            ready: oppSnap.ready ?? false,
            connected: oppSnap.connected ?? true,
            lastSeen: oppSnap.lastSeen ?? Date.now(),
          }
        : {
            x: this.remoteLerp.x,
            y: this.remoteLerp.y,
            vx: 0,
            vy: 0,
            ready: opponent?.ready ?? false,
            connected: opponent?.connected ?? true,
            lastSeen: opponent?.lastSeen ?? Date.now(),
          };
      players[a] = me === a ? localState : remoteState;
      players[b] = me === b ? localState : remoteState;
      this.buildHostPublish(match, players);
    }

    // 로컬 physics/input 이후 RTDB puppet 반영 (body 밀림·프레임 순서 버그 방지)
    this.syncRemoteNetworkPuppet(bridge.snapshot, bridge);
  }

  shutdown(): void {
    this.goalCelebrationTimer?.remove();
    this.goalCelebrationTimer = null;
    this.scale.off("resize", this.onResizeFit);
    const sid = getLiveMatchBridge()?.sessionId;
    clearLiveMatchMove(sid);
    this.registry.set("liveMatchReady", false);
  }
}

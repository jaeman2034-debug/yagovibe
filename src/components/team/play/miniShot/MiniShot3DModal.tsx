import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MINI_SHOT3D,
  MINI_SHOT_GOAL_LOOK_AT,
  MINI_SHOT_PLAYER_DEFAULT_POSITION,
  applyAimNoise,
  isBallInGoal,
  isBallInGoalDepthMiss,
  mapMiniShot3dParams,
  type MiniShot3DInput,
  type MiniShot3DResult,
} from "@/lib/team/miniShot3d";
import { TRACK } from "@/lib/analytics";
import { persistMiniShotSessionEnd } from "@/lib/team/persistMiniShotSession";
import {
  bumpMiniShotComboMul,
  getComboLabel,
} from "@/lib/team/miniShotCombo";
import {
  getMiniShotPerfectLabel,
  isMiniShotPerfectAccuracy,
} from "@/lib/team/miniShotPerfect";
import { getMiniShotStreakLabel } from "@/lib/team/miniShotStreak";
import {
  getGoalZone,
  getZoneLabel,
  getZoneScore,
  type MiniShotGoalZone,
} from "@/lib/team/miniShotZone";
import {
  getComboMultiplier,
  getRandomTargetMotion,
  getRandomTargetSize,
  getShotGrade,
  getTargetMotionXpMultiplier,
  getTargetSizeXpMultiplier,
  getXpByGrade,
  type ShotGrade,
  type TargetMotion,
  type TargetSize,
} from "@/lib/team/miniShotShotGrade";
import {
  buildTargetMission,
  missionDifficultyLabelKo,
  type TargetMission,
} from "@/lib/team/miniShotMission";
import { useMiniShotDailyChallenge } from "@/hooks/useMiniShotDailyChallenge";
import { useMiniShotDailyStreak } from "@/hooks/useMiniShotDailyStreak";
import { useMiniShotSuperBadge } from "@/hooks/useMiniShotSuperBadge";
import { claimMiniShotDailyRewardOnce } from "@/services/miniShotDailyRewardService";
import {
  playMiniShotGoal,
  playMiniShotKick,
  playMiniShotMiss,
  playMiniShotStreakAccent,
} from "@/lib/team/miniShotSounds";
import MiniShotLeaderboardPanel from "@/components/team/play/miniShot/MiniShotLeaderboardPanel";
import MiniShotGoalNet from "@/components/team/play/miniShot/MiniShotGoalNet";
import MiniShotPlayer from "@/components/team/play/miniShot/MiniShotPlayer";

/** 결과 표시 후 이 시간이 지나면 조준 단계로 자동 리셋 (연속 플레이) */
const RESULT_TO_RESET_MS = 1000;

/** 한 모달 세션당 슛 횟수 — 끝나면 세션 요약(`sessionEnd`) */
const MINI_SHOT_SESSION_SHOTS = 5;

function miniShotSessionMotivation(goals: number, total: number): string {
  if (goals === total) return "전부 골이에요 — 완벽한 라운드!";
  if (goals >= Math.ceil(total * 0.6)) return "좋은 성적이에요. 한 번 더 도전해 보세요!";
  if (goals >= 1) return "다음 라운드에서 더 넣을 수 있어요.";
  return "괜찮아요. 다시 도전하면 됩니다!";
}

/** 정규화된 드래그 길이가 이보다 작으면 슛 없음 (너무 짧은 터치는 무시) */
const MIN_DRAG_LEN_NORM = 0.035;

const _yAxis = new THREE.Vector3(0, 1, 0);
const _lateralQuat = new THREE.Quaternion();

const CAMERA_BASE = new THREE.Vector3(2.8, 2.2, 4.2);

/** 공기 저항 — 프레임마다 곱함 (체감용, dt 보정 없음) */
const MINI_SHOT_AIR_DRAG = 0.985;

/** 첫 N프레임은 감쇠 생략 → 킥 직후 힘이 안 죽게 */
const MINI_SHOT_DRAG_SKIP_FRAMES = 2;

/** 슛 직후 초기 속도 배율 (킥 스냅) */
const MINI_SHOT_KICK_SPEED_MULT = 1.09;

/** 출발 시 공 위치 미세 지터 (직선만 나오는 느낌 완화) */
const MINI_SHOT_VEL_JITTER = 0.012;

const KICK_PITCH_RAD = -0.25;
const KICK_RECOVER_MS = 100;

function FixedCameraRig({
  flying,
  kickNonce,
  goalNonce,
  resetGen,
}: {
  flying: boolean;
  kickNonce: number;
  goalNonce: number;
  /** 세션 초기화 시 카메라 임펄스 상태 리셋 */
  resetGen: number;
}) {
  const { camera } = useThree();
  const lookTarget = useRef(
    new THREE.Vector3(
      MINI_SHOT_PLAYER_DEFAULT_POSITION.x,
      1.05,
      MINI_SHOT_PLAYER_DEFAULT_POSITION.z
    )
  );
  const kickShake = useRef(0);
  const goalPulse = useRef(0);
  const prevKickNonce = useRef(0);
  const prevGoalNonce = useRef(0);
  const prefersReducedMotionRef = useRef(false);

  useLayoutEffect(() => {
    prefersReducedMotionRef.current =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useLayoutEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 56;
    }
    camera.updateProjectionMatrix();
  }, [camera]);

  useEffect(() => {
    if (kickNonce > prevKickNonce.current) {
      kickShake.current = Math.max(kickShake.current, 0.26);
      prevKickNonce.current = kickNonce;
    }
  }, [kickNonce]);

  useEffect(() => {
    if (goalNonce > prevGoalNonce.current) {
      goalPulse.current = Math.max(goalPulse.current, 0.42);
      prevGoalNonce.current = goalNonce;
    }
  }, [goalNonce]);

  useEffect(() => {
    prevKickNonce.current = 0;
    prevGoalNonce.current = 0;
    kickShake.current = 0;
    goalPulse.current = 0;
  }, [resetGen]);

  useFrame(() => {
    let bx: number;
    let by: number;
    let bz: number;
    if (flying) {
      bx = CAMERA_BASE.x;
      by = CAMERA_BASE.y;
      bz = CAMERA_BASE.z;
    } else {
      const t = performance.now() * 0.001;
      bx = CAMERA_BASE.x + Math.sin(t) * 0.02;
      by = CAMERA_BASE.y + Math.cos(t) * 0.02;
      bz = CAMERA_BASE.z;
    }

    const ks = kickShake.current;
    if (!prefersReducedMotionRef.current && ks > 0.002) {
      bx += (Math.random() - 0.5) * ks * 2.2;
      by += (Math.random() - 0.5) * ks * 2.2;
      bz += (Math.random() - 0.5) * ks * 0.65;
      kickShake.current *= 0.88;
    } else if (prefersReducedMotionRef.current && ks > 0.002) {
      kickShake.current *= 0.88;
    }

    const gp = goalPulse.current;
    if (!prefersReducedMotionRef.current && gp > 0.002) {
      bz -= gp * 0.55;
      bx += (Math.random() - 0.5) * gp * 0.12;
      goalPulse.current *= 0.9;
    } else if (prefersReducedMotionRef.current && gp > 0.002) {
      goalPulse.current *= 0.9;
    }

    camera.position.set(bx, by, bz);
    camera.lookAt(lookTarget.current);
  });

  return null;
}

/** 슛 전 idle: 미세 흔들림·긴장감 — 공 비행 중에는 고정. 릴리즈 직후 짧은 킥 피치(손맛). */
function MiniShotPlayerAimPresentation({ flying, children }: { flying: boolean; children: ReactNode }) {
  const offsetRef = useRef<THREE.Group>(null);
  const kickRef = useRef<THREE.Group>(null);
  const prevFlyingRef = useRef(false);
  const kickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!flying) {
      if (kickTimerRef.current != null) {
        clearTimeout(kickTimerRef.current);
        kickTimerRef.current = null;
      }
      const k = kickRef.current;
      if (k) k.rotation.x = 0;
      prevFlyingRef.current = false;
      return;
    }

    if (!prevFlyingRef.current) {
      const k = kickRef.current;
      if (k) k.rotation.x = KICK_PITCH_RAD;
      if (kickTimerRef.current != null) clearTimeout(kickTimerRef.current);
      kickTimerRef.current = setTimeout(() => {
        kickTimerRef.current = null;
        const kk = kickRef.current;
        if (kk) kk.rotation.x = 0;
      }, KICK_RECOVER_MS);
    }
    prevFlyingRef.current = true;
  }, [flying]);

  useFrame(() => {
    const g = offsetRef.current;
    if (!g) return;
    if (flying) {
      g.position.set(0, 0, 0);
      g.rotation.set(0, 0, 0);
      return;
    }
    const t = performance.now() * 0.002;
    g.position.set(0, Math.sin(t) * 0.01, 0);
    g.rotation.x = -0.12 + Math.sin(t) * 0.02;
    g.rotation.y = 0;
    g.rotation.z = 0;
  });

  return (
    <group ref={offsetRef}>
      <group ref={kickRef}>{children}</group>
    </group>
  );
}

function GroundAndGoal({ flying }: { flying: boolean }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, -6]}>
        <planeGeometry args={[48, 48]} />
        <meshStandardMaterial color="#1d4a2f" roughness={0.92} metalness={0.02} />
      </mesh>
      <MiniShotPlayerAimPresentation flying={flying}>
        <MiniShotPlayer silhouetteOnly />
      </MiniShotPlayerAimPresentation>
      <group position={[0, 0, -13]}>
        <MiniShotGoalNet />
        {/** 앞 프레임 z≈0, 뒤 프레임 z=-0.15 로 깊이감 */}
        <mesh castShadow receiveShadow position={[-1.95, 1.1, 0]}>
          <boxGeometry args={[0.22, 2.35, 0.35]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.55} metalness={0.04} />
        </mesh>
        <mesh castShadow receiveShadow position={[1.95, 1.1, 0]}>
          <boxGeometry args={[0.22, 2.35, 0.35]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.55} metalness={0.04} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 2.35, 0]}>
          <boxGeometry args={[4.2, 0.22, 0.35]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.55} metalness={0.04} />
        </mesh>
        <mesh castShadow receiveShadow position={[-1.95, 1.1, -0.15]}>
          <boxGeometry args={[0.2, 2.32, 0.28]} />
          <meshStandardMaterial color="#64748b" roughness={0.58} metalness={0.05} />
        </mesh>
        <mesh castShadow receiveShadow position={[1.95, 1.1, -0.15]}>
          <boxGeometry args={[0.2, 2.32, 0.28]} />
          <meshStandardMaterial color="#64748b" roughness={0.58} metalness={0.05} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 2.35, -0.15]}>
          <boxGeometry args={[4.15, 0.2, 0.28]} />
          <meshStandardMaterial color="#64748b" roughness={0.58} metalness={0.05} />
        </mesh>
        <mesh position={[0, 1.1, -0.45]}>
          <boxGeometry args={[3.9, 2.2, 0.08]} />
          <meshStandardMaterial color="#94a3b8" opacity={0.35} transparent roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

function MiniShotBall({
  flying,
  shotVelocity,
  celebrateGoal,
  ballScaleMul = 1,
  shotAccuracy = 0,
  /** 이번 비행 슬로모(슛 직전 콤보 스냅샷) */
  flightComboMul = 1,
  /** 조준/대기 시 최신 콤보로 공 색(비행 중은 flight만 사용) */
  comboTintMul = 1,
  onFlightEnd,
}: {
  flying: boolean;
  shotVelocity: THREE.Vector3 | null;
  /** 골 직후 잠깐 스케일·발광 연출 */
  celebrateGoal?: boolean;
  /** 연속 골 3+ 시 기본 크기(예: 1.2) */
  ballScaleMul?: number;
  /** 이번 슛 정확도 0~1 (퍼펙트 골 슬로모) */
  shotAccuracy?: number;
  flightComboMul?: number;
  comboTintMul?: number;
  onFlightEnd: (goal: boolean, goalHitPos?: THREE.Vector3) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const pos = useRef(MINI_SHOT3D.ballStart.clone());
  const vel = useRef(new THREE.Vector3());
  const t0 = useRef(0);
  const ended = useRef(false);
  const active = useRef(false);
  const flightFrameRef = useRef(0);
  /** 퍼펙트 골 시 300ms 월드타임 슬로모 종료 시각 */
  const perfectSlowMoUntilRef = useRef(0);
  const perfectGlowRef = useRef(false);

  const notifyFlightEnd = useCallback(
    (goal: boolean, goalHitPos?: THREE.Vector3) => {
      if (ended.current) return;
      ended.current = true;
      active.current = false;
      onFlightEnd(goal, goalHitPos);
    },
    [onFlightEnd]
  );

  useEffect(() => {
    if (flying && shotVelocity && shotVelocity.lengthSq() > 1e-4) {
      pos.current.copy(MINI_SHOT3D.ballStart);
      vel.current.copy(shotVelocity);
      vel.current.x += (Math.random() - 0.5) * MINI_SHOT_VEL_JITTER;
      vel.current.z += (Math.random() - 0.5) * MINI_SHOT_VEL_JITTER * 0.35;
      flightFrameRef.current = 0;
      t0.current = performance.now() / 1000;
      ended.current = false;
      active.current = true;
      perfectSlowMoUntilRef.current = 0;
      perfectGlowRef.current = false;
      if (meshRef.current) {
        meshRef.current.position.copy(pos.current);
        meshRef.current.rotation.set(0, 0, 0);
      }
      return;
    }
    if (!flying && !shotVelocity) {
      active.current = false;
      ended.current = false;
      flightFrameRef.current = 0;
      pos.current.copy(MINI_SHOT3D.ballStart);
      vel.current.set(0, 0, 0);
      perfectSlowMoUntilRef.current = 0;
      perfectGlowRef.current = false;
      if (meshRef.current) {
        meshRef.current.position.copy(pos.current);
        meshRef.current.rotation.set(0, 0, 0);
      }
    }
  }, [flying, shotVelocity]);

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (!active.current && !flying) {
      mesh.rotation.y += 0.02;
      perfectGlowRef.current = false;
      return;
    }

    if (!active.current || ended.current) return;

    const mayPerfect = isMiniShotPerfectAccuracy(shotAccuracy);
    const inGoalStart = isBallInGoal(pos.current);

    let dtMul = 1;
    if (
      mayPerfect &&
      perfectSlowMoUntilRef.current > 0 &&
      performance.now() < perfectSlowMoUntilRef.current &&
      inGoalStart
    ) {
      dtMul = flightComboMul >= 2 ? 0.3 : 0.4;
    }

    const capped = Math.min(dt * dtMul, 0.055);
    flightFrameRef.current += 1;

    vel.current.y -= MINI_SHOT3D.gravity * capped;
    if (flightFrameRef.current > MINI_SHOT_DRAG_SKIP_FRAMES) {
      vel.current.multiplyScalar(MINI_SHOT_AIR_DRAG);
    }
    pos.current.addScaledVector(vel.current, capped);
    mesh.position.copy(pos.current);

    const inGoalAfter = isBallInGoal(pos.current);
    if (inGoalAfter && mayPerfect && perfectSlowMoUntilRef.current === 0) {
      perfectSlowMoUntilRef.current = performance.now() + 300;
    }

    if (inGoalAfter) {
      if (mayPerfect) {
        if (perfectSlowMoUntilRef.current > 0 && performance.now() >= perfectSlowMoUntilRef.current) {
          perfectGlowRef.current = false;
          perfectSlowMoUntilRef.current = 0;
          notifyFlightEnd(true, pos.current.clone());
          return;
        }
        perfectGlowRef.current = true;
        return;
      }
      notifyFlightEnd(true);
      return;
    }

    perfectGlowRef.current = false;

    if (isBallInGoalDepthMiss(pos.current)) {
      notifyFlightEnd(false);
      return;
    }

    const floor = MINI_SHOT3D.ballRadius * 0.35;
    if (pos.current.y < floor) {
      notifyFlightEnd(false);
      return;
    }

    if (pos.current.z < -19.5) {
      notifyFlightEnd(false);
      return;
    }

    if (performance.now() / 1000 - t0.current > MINI_SHOT3D.maxFlightSec) {
      notifyFlightEnd(false);
    }
  });

  useFrame(() => {
    const mesh = meshRef.current;
    const mat = materialRef.current;
    if (!mesh) return;
    const mul = ballScaleMul;
    if (celebrateGoal) {
      const pulse = 1.18 + Math.sin(performance.now() * 0.009) * 0.05;
      mesh.scale.setScalar(mul * pulse);
      if (mat) {
        mat.emissive.set("#333300");
        mat.emissiveIntensity = 0.75 + Math.sin(performance.now() * 0.011) * 0.2;
      }
      return;
    }
    mesh.scale.setScalar(mul);
    if (mat) {
      if (perfectGlowRef.current) {
        mat.emissive.set("#ffff66");
        mat.emissiveIntensity = 1.2;
      } else if (comboTintMul >= 2) {
        mat.color.set("#ff6600");
        mat.emissive.set("#331100");
        mat.emissiveIntensity = 0.55;
      } else {
        mat.color.set("#fde047");
        mat.emissive.set("#333300");
        mat.emissiveIntensity = 0.5;
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      castShadow
      receiveShadow
      position={[MINI_SHOT3D.ballStart.x, MINI_SHOT3D.ballStart.y, MINI_SHOT3D.ballStart.z]}
    >
      <sphereGeometry args={[MINI_SHOT3D.ballRadius, 28, 28]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#fde047"
        roughness={0.38}
        metalness={0.08}
        emissive="#333300"
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight
        castShadow
        position={[6, 14, 8]}
        intensity={1.8}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.4}
        shadow-camera-far={48}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.00015}
        shadow-normalBias={0.025}
      />
    </>
  );
}

function MiniShotCanvas({
  flying,
  shotVelocity,
  celebrateGoal,
  ballScaleMul,
  shotAccuracy,
  flightComboMul,
  comboTintMul,
  camKickNonce,
  camGoalNonce,
  camResetGen,
  onFlightEnd,
}: {
  flying: boolean;
  shotVelocity: THREE.Vector3 | null;
  celebrateGoal?: boolean;
  ballScaleMul?: number;
  shotAccuracy: number;
  flightComboMul: number;
  comboTintMul: number;
  camKickNonce: number;
  camGoalNonce: number;
  camResetGen: number;
  onFlightEnd: (goal: boolean, goalHitPos?: THREE.Vector3) => void;
}) {
  return (
    <Canvas
      className="block h-full min-h-0 w-full min-w-0 touch-none"
      style={{ width: "100%", height: "100%", display: "block" }}
      shadows={{ type: THREE.PCFSoftShadowMap }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
      camera={{ fov: 54, near: 0.1, far: 80 }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <color attach="background" args={["#0f172a"]} />
      <FixedCameraRig
        flying={flying}
        kickNonce={camKickNonce}
        goalNonce={camGoalNonce}
        resetGen={camResetGen}
      />
      <Lights />
      <Suspense fallback={null}>
        <GroundAndGoal flying={flying} />
        <MiniShotBall
          flying={flying}
          shotVelocity={shotVelocity}
          celebrateGoal={celebrateGoal}
          ballScaleMul={ballScaleMul}
          shotAccuracy={shotAccuracy}
          flightComboMul={flightComboMul}
          comboTintMul={comboTintMul}
          onFlightEnd={onFlightEnd}
        />
      </Suspense>
    </Canvas>
  );
}

type Phase = "aim" | "flying" | "result" | "sessionEnd";

function zoneNameKo(zone: MiniShotGoalZone): string {
  if (zone.row === 0 && zone.col === 0) return "좌상단";
  if (zone.row === 0 && zone.col === 1) return "중앙상단";
  if (zone.row === 0 && zone.col === 2) return "우상단";
  if (zone.row === 1 && zone.col === 0) return "좌하단";
  if (zone.row === 1 && zone.col === 1) return "중앙하단";
  return "우하단";
}

function sameZone(a: MiniShotGoalZone, b: MiniShotGoalZone): boolean {
  return a.row === b.row && a.col === b.col;
}

function getTargetCenter(zone: MiniShotGoalZone): { x: number; y: number } {
  const box = MINI_SHOT3D.goalBox;
  const zoneWidth = (box.max.x - box.min.x) / 3;
  const zoneHeight = (box.max.y - box.min.y) / 2;
  const x = box.min.x + zoneWidth * zone.col + zoneWidth / 2;
  const y = zone.row === 0 ? box.max.y - zoneHeight / 2 : box.min.y + zoneHeight / 2;
  return { x, y };
}

function calculateDistance(hitX: number, hitY: number, targetX: number, targetY: number): number {
  const dx = hitX - targetX;
  const dy = hitY - targetY;
  return Math.sqrt(dx * dx + dy * dy);
}

function targetSizeLabelKo(size: TargetSize): string {
  if (size === "LARGE") return "LARGE";
  if (size === "MEDIUM") return "MEDIUM";
  return "SMALL";
}

function targetMotionLabelKo(motion: TargetMotion): string {
  if (motion === "STATIC") return "STATIC";
  if (motion === "HORIZONTAL") return "HORIZONTAL";
  return "VERTICAL";
}

function createTargetProfile(): { size: TargetSize; motion: TargetMotion } {
  const size = getRandomTargetSize();
  const motion = getRandomTargetMotion(size);
  return { size, motion };
}

const SUPER_CHALLENGE_STREAK_DAYS = 7;
const HUD_LINE_HEIGHT = 1.6;
const INITIAL_TARGET_PROFILE = createTargetProfile();

type Props = MiniShot3DInput & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (r: MiniShot3DResult) => void;
  teamId?: string;
  /** 랭킹 패널 하이라이트·순위용 */
  viewerUid?: string | null;
};

export default function MiniShot3DModal(props: Props) {
  const { open, onOpenChange, ovr, shoot, pass, onResult } = props;
  const [phase, setPhase] = useState<Phase>("aim");
  const [flying, setFlying] = useState(false);
  const [shotVelocity, setShotVelocity] = useState<THREE.Vector3 | null>(null);
  const [resultGoal, setResultGoal] = useState<boolean | null>(null);
  const [sessionGoals, setSessionGoals] = useState(0);
  /** 완료 슛 수 UI용 (`finishFlight`마다 +1) */
  const [sessionShotsDone, setSessionShotsDone] = useState(0);
  /** 종료된 슛 수(한 결과당 +1). 타이머에서 동기 판단 */
  const sessionShotCountRef = useRef(0);
  /** 세션 골 수(TRACK·타이머용 동기) */
  const sessionGoalsRef = useRef(0);
  /** 세션 정확도 합(슛당 lastAccuracy 누적 → 종료 시 평균) */
  const sessionAccuracySumRef = useRef(0);
  /** 현재 라운드 연속 골(미스 시 0) */
  const goalStreakRef = useRef(0);
  /** 이번 세션 최대 연속 골 */
  const maxGoalStreakRef = useRef(0);
  /** 결과 오버레이 — 직전 슛까지의 연속 골 수 */
  const [resultStreak, setResultStreak] = useState(0);
  /** 세션 요약용 최대 연속 골 */
  const [sessionMaxStreak, setSessionMaxStreak] = useState(0);
  /** 카메라 킥/골 임펄스 nonce — `beginFreshSession`에서 0으로 리셋 */
  const [camKickNonce, setCamKickNonce] = useState(0);
  const [camGoalNonce, setCamGoalNonce] = useState(0);
  const [camResetGen, setCamResetGen] = useState(0);
  const lastPower = useRef(0);
  const lastAccuracy = useRef(0);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const params = mapMiniShot3dParams({ ovr, shoot, pass });
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const reported = useRef(false);
  const playSnapRef = useRef({ ovr, shoot, pass, teamId: props.teamId });
  playSnapRef.current = { ovr, shoot, pass, teamId: props.teamId };
  /** 결과 오버레이 최소 유지 중 — 배경·ESC 닫기 차단 */
  const resultHoldRef = useRef(false);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 세션 누적 점수(골당 기본점 + 연속 보너스) / Firestore 전달 */
  const sessionRunningScoreRef = useRef(0);
  /** 세션 누적 스트립 XP 보너스(골당 streak×2×콤보) */
  const sessionStreakXpBonusRef = useRef(0);
  /** Firestore/Callable 멱등용 세션 키 (`beginFreshSession`에서 갱신) */
  const miniShotSessionKeyRef = useRef("");
  /** 퍼펙트 누적 콤보 배율(1 시작, 퍼펙트마다 +0.5, 최대 3) */
  const comboMulRef = useRef(1);
  const maxComboMulRef = useRef(1);
  const streakPopupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sessionTotalScore, setSessionTotalScore] = useState(0);
  /** NICE / HOT / ON FIRE — 0.5초 센터 팝업 */
  const [streakPopup, setStreakPopup] = useState<string | null>(null);
  /** 현재 비행 중 슛의 정확도(0~1) — 퍼펙트 슬로모·판정 */
  const [flightAccuracy, setFlightAccuracy] = useState(0);
  /** UI·공 연출 — 세션 콤보 배율 (골 processing 직후 갱신) */
  const [displayComboMul, setDisplayComboMul] = useState(1);
  /** 슛 직전 스냅샷(이번 비행 슬로모·공 색) */
  const [flightComboMul, setFlightComboMul] = useState(1);
  const [resultZoneLabel, setResultZoneLabel] = useState<string | null>(null);
  const [resultZoneBaseScore, setResultZoneBaseScore] = useState<number | null>(null);
  const [lastGrade, setLastGrade] = useState<ShotGrade | null>(null);
  const [gainedXp, setGainedXp] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const comboCountRef = useRef(0);
  const [currentTargetSize, setCurrentTargetSize] = useState<TargetSize>(INITIAL_TARGET_PROFILE.size);
  const [currentTargetMotion, setCurrentTargetMotion] = useState<TargetMotion>(INITIAL_TARGET_PROFILE.motion);
  const [movingTargetOffset, setMovingTargetOffset] = useState({ x: 0, y: 0 });
  const [mission, setMission] = useState<TargetMission>(() => buildTargetMission(0));
  const missionRef = useRef<TargetMission>(mission);
  missionRef.current = mission;
  const [missionClears, setMissionClears] = useState(0);
  const missionClearsRef = useRef(0);
  missionClearsRef.current = missionClears;
  const { challenge: dailyChallenge, alreadyClaimed } = useMiniShotDailyChallenge(
    props.teamId,
    open,
    props.viewerUid
  );
  const { streakDays } = useMiniShotDailyStreak(props.viewerUid, open);
  const { badge: superBadge } = useMiniShotSuperBadge(props.viewerUid, open);
  const isSuperChallenge = streakDays >= SUPER_CHALLENGE_STREAK_DAYS;
  const [dailyHits, setDailyHits] = useState(0);
  const [dailyCleared, setDailyCleared] = useState(false);
  const [dailyPerfectDone, setDailyPerfectDone] = useState(false);
  const dailyHitsRef = useRef(0);
  dailyHitsRef.current = dailyHits;
  const dailyClearedRef = useRef(dailyCleared);
  dailyClearedRef.current = dailyCleared;
  const dailyPerfectDoneRef = useRef(dailyPerfectDone);
  dailyPerfectDoneRef.current = dailyPerfectDone;
  const effectiveDailyChallenge =
    dailyChallenge == null
      ? null
      : isSuperChallenge
        ? {
            ...dailyChallenge,
            title: "🔥 SUPER CHALLENGE",
            targetZone: { row: 0 as const, col: 0 as const },
            requiredHits: 3,
            rewardScore: dailyChallenge.rewardScore * 2,
            rewardXp: dailyChallenge.rewardXp * 2,
          }
        : dailyChallenge;

  const clearAutoCloseTimer = useCallback(() => {
    if (autoCloseTimerRef.current != null) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  }, []);

  const forceClose = useCallback(() => {
    resultHoldRef.current = false;
    clearAutoCloseTimer();
    onOpenChange(false);
  }, [clearAutoCloseTimer, onOpenChange]);

  /** 세션 통계 초기화 후 1번째 슛 조준 (모달 오픈 · 다시 도전 공통) */
  const beginFreshSession = useCallback(() => {
    clearAutoCloseTimer();
    resultHoldRef.current = false;
    setPhase("aim");
    setFlying(false);
    setShotVelocity(null);
    setResultGoal(null);
    setSessionGoals(0);
    setSessionShotsDone(0);
    sessionShotCountRef.current = 0;
    sessionGoalsRef.current = 0;
    sessionAccuracySumRef.current = 0;
    goalStreakRef.current = 0;
    maxGoalStreakRef.current = 0;
    setSessionMaxStreak(0);
    setResultStreak(0);
    sessionRunningScoreRef.current = 0;
    sessionStreakXpBonusRef.current = 0;
    comboMulRef.current = 1;
    maxComboMulRef.current = 1;
    setSessionTotalScore(0);
    setDisplayComboMul(1);
    setFlightComboMul(1);
    setResultZoneLabel(null);
    setResultZoneBaseScore(null);
    setLastGrade(null);
    setGainedXp(0);
    setComboCount(0);
    setComboMultiplier(1);
    comboCountRef.current = 0;
    const profile = createTargetProfile();
    setCurrentTargetSize(profile.size);
    setCurrentTargetMotion(profile.motion);
    setMovingTargetOffset({ x: 0, y: 0 });
    setMission(buildTargetMission(0));
    missionClearsRef.current = 0;
    setMissionClears(0);
    setDailyHits(0);
    dailyHitsRef.current = 0;
    setDailyCleared(alreadyClaimed);
    dailyClearedRef.current = alreadyClaimed;
    setDailyPerfectDone(false);
    dailyPerfectDoneRef.current = false;
    if (streakPopupTimerRef.current != null) {
      clearTimeout(streakPopupTimerRef.current);
      streakPopupTimerRef.current = null;
    }
    setStreakPopup(null);
    setFlightAccuracy(0);
    reported.current = false;
    dragStart.current = null;
    miniShotSessionKeyRef.current =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    setCamKickNonce(0);
    setCamGoalNonce(0);
    setCamResetGen((g) => g + 1);
    const snap = playSnapRef.current;
    const tid = typeof snap.teamId === "string" ? snap.teamId.trim() : "";
    TRACK("MINI_SHOT_PLAY", {
      ovr: snap.ovr,
      shoot: snap.shoot,
      pass: snap.pass,
      ...(tid ? { team_id: tid } : {}),
    });
  }, [clearAutoCloseTimer]);

  const retrySession = useCallback(() => {
    beginFreshSession();
    const snap = playSnapRef.current;
    const tid = typeof snap.teamId === "string" ? snap.teamId.trim() : "";
    TRACK("MINI_SHOT_SESSION_RETRY", {
      ovr: snap.ovr,
      ...(tid ? { team_id: tid } : {}),
    });
  }, [beginFreshSession]);

  /** 결과 후 조준으로 돌아가 연속 플레이 (모달은 열린 채 유지) */
  const resetRound = useCallback(() => {
    clearAutoCloseTimer();
    resultHoldRef.current = false;
    setPhase("aim");
    setFlying(false);
    setShotVelocity(null);
    setResultGoal(null);
    reported.current = false;
    dragStart.current = null;
    const profile = createTargetProfile();
    setCurrentTargetSize(profile.size);
    setCurrentTargetMotion(profile.motion);
    setMovingTargetOffset({ x: 0, y: 0 });
    const snap = playSnapRef.current;
    const tid = typeof snap.teamId === "string" ? snap.teamId.trim() : "";
    TRACK("MINI_SHOT_PLAY", {
      ovr: snap.ovr,
      shoot: snap.shoot,
      pass: snap.pass,
      ...(tid ? { team_id: tid } : {}),
    });
  }, [clearAutoCloseTimer]);

  const handleDialogOpenChange = useCallback(
    (next: boolean) => {
      if (!next && phase === "flying") return;
      if (!next && phase === "result" && resultHoldRef.current) return;
      if (!next) clearAutoCloseTimer();
      onOpenChange(next);
    },
    [phase, clearAutoCloseTimer, onOpenChange]
  );

  useEffect(() => {
    if (!open) {
      resultHoldRef.current = false;
      clearAutoCloseTimer();
      return;
    }
    beginFreshSession();
  }, [open, clearAutoCloseTimer, beginFreshSession]);

  useEffect(() => {
    return () => {
      if (streakPopupTimerRef.current != null) {
        clearTimeout(streakPopupTimerRef.current);
        streakPopupTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setDailyHits(0);
    dailyHitsRef.current = 0;
    setDailyCleared(alreadyClaimed);
    dailyClearedRef.current = alreadyClaimed;
    setDailyPerfectDone(false);
    dailyPerfectDoneRef.current = false;
  }, [dailyChallenge?.id, alreadyClaimed, isSuperChallenge]);

  useEffect(() => {
    if (currentTargetMotion === "STATIC" || !open) {
      setMovingTargetOffset({ x: 0, y: 0 });
      return;
    }
    const tickMs = currentTargetSize === "SMALL" ? 140 : currentTargetSize === "MEDIUM" ? 180 : 220;
    const maxX = currentTargetSize === "SMALL" ? 6 : currentTargetSize === "MEDIUM" ? 10 : 14;
    const maxY = currentTargetSize === "SMALL" ? 4 : currentTargetSize === "MEDIUM" ? 7 : 10;
    const step = currentTargetSize === "SMALL" ? 3.4 : currentTargetSize === "MEDIUM" ? 2.6 : 2;
    const timer = setInterval(() => {
      setMovingTargetOffset((prev) => {
        if (currentTargetMotion === "HORIZONTAL") {
          const nx = THREE.MathUtils.clamp(prev.x + (Math.random() * 2 - 1) * step, -maxX, maxX);
          return { x: nx, y: 0 };
        }
        const ny = THREE.MathUtils.clamp(prev.y + (Math.random() * 2 - 1) * step, -maxY, maxY);
        return { x: 0, y: ny };
      });
    }, tickMs);
    return () => clearInterval(timer);
  }, [currentTargetMotion, currentTargetSize, open]);

  const finishFlight = useCallback(
    (goal: boolean, goalHitPos?: THREE.Vector3) => {
      if (reported.current) return;
      reported.current = true;
      sessionShotCountRef.current += 1;
      sessionAccuracySumRef.current += lastAccuracy.current;
      setSessionShotsDone(sessionShotCountRef.current);

      const isPerfect = goal && isMiniShotPerfectAccuracy(lastAccuracy.current);
      let shotGrade: ShotGrade = "MISS";
      let gradeXp = 0;
      let comboNow = comboCountRef.current;
      let comboMulNow = 1;
      let targetSizeXpMul = 1;
      let targetMotionXpMul = 1;

      let streakNow = 0;
      if (goal) {
        goalStreakRef.current += 1;
        streakNow = goalStreakRef.current;
        maxGoalStreakRef.current = Math.max(maxGoalStreakRef.current, streakNow);
        setSessionMaxStreak(maxGoalStreakRef.current);
        setSessionGoals((g) => {
          const n = g + 1;
          sessionGoalsRef.current = n;
          return n;
        });
        if (isPerfect) {
          comboMulRef.current = bumpMiniShotComboMul(comboMulRef.current, true);
        }
      } else {
        goalStreakRef.current = 0;
        comboMulRef.current = 1;
        setDisplayComboMul(1);
        setFlightComboMul(1);
        setResultStreak(0);
        setResultZoneLabel(null);
        setResultZoneBaseScore(null);
        setLastGrade("MISS");
        setGainedXp(0);
        setComboCount(0);
        setComboMultiplier(1);
        comboCountRef.current = 0;
      }
      if (goal) {
        setResultStreak(streakNow);
      }

      setFlying(false);
      setResultGoal(goal);
      setPhase("result");
      const payload: MiniShot3DResult = {
        goal,
        power: lastPower.current,
        accuracy: lastAccuracy.current,
        ...(isPerfect ? { perfect: true } : {}),
      };
      onResult(payload);
      const tid =
        typeof playSnapRef.current.teamId === "string" ? playSnapRef.current.teamId.trim() : "";
      const comboMulForTrack = goal ? comboMulRef.current : 1;
      TRACK("MINI_SHOT_RESULT", {
        goal,
        power: payload.power,
        accuracy: payload.accuracy,
        shot_index: sessionShotCountRef.current,
        goal_streak: goal ? streakNow : 0,
        perfect_shot: isPerfect,
        combo_mul: comboMulForTrack,
        ...(tid ? { team_id: tid } : {}),
      });
      if (goal) {
        const mul = comboMulRef.current;
        maxComboMulRef.current = Math.max(maxComboMulRef.current, mul);

        const zone: MiniShotGoalZone =
          goalHitPos != null
            ? getGoalZone(goalHitPos, MINI_SHOT3D.goalBox)
            : ({ row: 1, col: 1 } as const);
        const targetCenterBase = getTargetCenter(missionRef.current.targetZone);
        const targetCenter = {
          x: targetCenterBase.x + movingTargetOffset.x,
          y: targetCenterBase.y + movingTargetOffset.y,
        };
        const hitPos = goalHitPos ?? new THREE.Vector3(targetCenter.x, targetCenter.y, MINI_SHOT3D.goalBox.max.z);
        const distance = calculateDistance(hitPos.x, hitPos.y, targetCenter.x, targetCenter.y);
        shotGrade = getShotGrade(distance, currentTargetSize);
        if (shotGrade === "PERFECT") {
          comboCountRef.current += 1;
        } else {
          comboCountRef.current = 0;
        }
        comboNow = comboCountRef.current;
        comboMulNow = getComboMultiplier(comboNow);
        targetSizeXpMul = getTargetSizeXpMultiplier(currentTargetSize);
        targetMotionXpMul = getTargetMotionXpMultiplier(currentTargetMotion);
        gradeXp = Math.round(getXpByGrade(shotGrade) * comboMulNow * targetSizeXpMul * targetMotionXpMul);
        setLastGrade(shotGrade);
        setGainedXp(gradeXp);
        setComboCount(comboNow);
        setComboMultiplier(comboMulNow);
        const zoneBaseScore = getZoneScore(zone);
        const zoneLabel = getZoneLabel(zone);
        const gain = Math.round(zoneBaseScore * mul);
        let missionCleared = false;

        sessionRunningScoreRef.current += gain;
        sessionStreakXpBonusRef.current += Math.round(streakNow * 2 * mul) + gradeXp;
        setSessionTotalScore(sessionRunningScoreRef.current);
        setDisplayComboMul(mul);
        setResultZoneBaseScore(zoneBaseScore);
        setResultZoneLabel(zoneLabel);

        const missionNow = missionRef.current;
        const matched = sameZone(zone, missionNow.targetZone);
        const nextHits = matched ? missionNow.currentHits + 1 : 0;
        if (nextHits >= missionNow.requiredHits) {
          // 미션 클리어: 즉시 보상 후 다음 미션으로 교체
          missionCleared = true;
          sessionRunningScoreRef.current += missionNow.reward;
          sessionStreakXpBonusRef.current += missionNow.reward;
          setSessionTotalScore(sessionRunningScoreRef.current);
          setStreakPopup(`MISSION CLEAR 🎯 +${missionNow.reward}`);
          if (streakPopupTimerRef.current != null) {
            clearTimeout(streakPopupTimerRef.current);
          }
          streakPopupTimerRef.current = setTimeout(() => {
            setStreakPopup(null);
            streakPopupTimerRef.current = null;
          }, 500);
          playMiniShotGoal({ kickStrength: THREE.MathUtils.clamp(lastPower.current * 2, 0, 1) });
          setCamGoalNonce((n) => n + 3);
          const nextClears = missionClearsRef.current + 1;
          missionClearsRef.current = nextClears;
          setMissionClears(nextClears);
          setMission(buildTargetMission(nextClears, missionNow.targetZone));
        } else {
          setMission({ ...missionNow, currentHits: nextHits });
        }

        const activeDaily = effectiveDailyChallenge;
        if (activeDaily && !dailyClearedRef.current) {
          const dailyMatched = sameZone(zone, activeDaily.targetZone);
          const nextDailyHits = dailyMatched ? dailyHitsRef.current + 1 : 0;
          dailyHitsRef.current = nextDailyHits;
          setDailyHits(nextDailyHits);
          const nextPerfectDone = dailyPerfectDoneRef.current || isPerfect;
          if (isPerfect) {
            setDailyPerfectDone(true);
            dailyPerfectDoneRef.current = true;
          }
          const clearReady =
            nextDailyHits >= activeDaily.requiredHits && (!isSuperChallenge || nextPerfectDone);
          if (clearReady) {
            // 중복 수령 방지: 서버 트랜잭션으로 1회만 보상 지급.
            dailyClearedRef.current = true;
            setDailyCleared(true);
            const tid = typeof playSnapRef.current.teamId === "string" ? playSnapRef.current.teamId.trim() : "";
            if (tid) {
              void claimMiniShotDailyRewardOnce({
                teamId: tid,
                dailyId: activeDaily.id,
                rewardXp: activeDaily.rewardXp,
                rewardScore: activeDaily.rewardScore,
                accuracy: lastAccuracy.current,
                sessionScore: sessionRunningScoreRef.current,
              }).then((res) => {
                if (!res.granted) {
                  setStreakPopup("DAILY 이미 수령");
                  if (streakPopupTimerRef.current != null) {
                    clearTimeout(streakPopupTimerRef.current);
                  }
                  streakPopupTimerRef.current = setTimeout(() => {
                    setStreakPopup(null);
                    streakPopupTimerRef.current = null;
                  }, 700);
                  return;
                }
                sessionRunningScoreRef.current += activeDaily.rewardScore;
                setSessionTotalScore(sessionRunningScoreRef.current);
                setStreakPopup(
                  res.superBadgeGranted
                    ? "🏆 SUPER STRIKER 획득!"
                    : res.streakBonusXp > 0
                    ? `${isSuperChallenge ? "SUPER CLEAR 🔥" : "DAILY CLEAR 🏆"} +${activeDaily.rewardScore} · ${res.streakDays}일 연속 +${res.streakBonusXp}XP`
                    : `${isSuperChallenge ? "SUPER CLEAR 🔥" : "DAILY CLEAR 🏆"} +${activeDaily.rewardScore}`
                );
                if (streakPopupTimerRef.current != null) {
                  clearTimeout(streakPopupTimerRef.current);
                }
                streakPopupTimerRef.current = setTimeout(() => {
                  setStreakPopup(null);
                  streakPopupTimerRef.current = null;
                }, 700);
                playMiniShotGoal({ kickStrength: THREE.MathUtils.clamp(lastPower.current * 2, 0, 1) });
                setCamGoalNonce((n) => n + (isSuperChallenge ? 5 : 3));
              });
            }
          }
        }

        let labelText = "";
        if (!missionCleared) {
          if (mul > 1) {
            labelText = getComboLabel(streakNow, mul);
          }
          if (!labelText && isPerfect) {
            labelText = getMiniShotPerfectLabel();
          }
          if (!labelText) {
            labelText = getMiniShotStreakLabel(streakNow);
          }
        }
        if (labelText) {
          setStreakPopup(labelText);
          if (streakPopupTimerRef.current != null) {
            clearTimeout(streakPopupTimerRef.current);
          }
          streakPopupTimerRef.current = setTimeout(() => {
            setStreakPopup(null);
            streakPopupTimerRef.current = null;
          }, 500);
        }

        const topCorner = zone.row === 0 && (zone.col === 0 || zone.col === 2);
        const zoneBoost = topCorner ? 1.8 : zone.row === 0 ? 1.3 : 1;
        const kickStr = THREE.MathUtils.clamp(lastPower.current * mul * zoneBoost, 0, 1);
        playMiniShotGoal({ kickStrength: kickStr });
        playMiniShotStreakAccent(streakNow);
        setCamGoalNonce((n) => n + (isPerfect ? 2 : 1) + (mul >= 2 ? 1 : 0) + (zone.row === 0 ? 2 : 0));
      } else {
        setLastGrade("MISS");
        setGainedXp(0);
        setComboCount(0);
        setComboMultiplier(1);
        comboCountRef.current = 0;
        playMiniShotMiss();
      }
      TRACK("MINI_SHOT_GRADE_RESULT", {
        grade: shotGrade,
        gained_xp: gradeXp,
        combo_count: comboNow,
        combo_multiplier: comboMulNow,
        target_size: currentTargetSize,
        target_size_xp_mul: targetSizeXpMul,
        target_motion: currentTargetMotion,
        target_motion_xp_mul: targetMotionXpMul,
        goal,
        shot_index: sessionShotCountRef.current,
      });
    },
    [currentTargetMotion, currentTargetSize, movingTargetOffset.x, movingTargetOffset.y, onResult]
  );

  useEffect(() => {
    if (phase !== "result" || !open) {
      resultHoldRef.current = false;
      return;
    }
    resultHoldRef.current = true;
    clearAutoCloseTimer();
    autoCloseTimerRef.current = setTimeout(() => {
      autoCloseTimerRef.current = null;
      if (sessionShotCountRef.current >= MINI_SHOT_SESSION_SHOTS) {
        resultHoldRef.current = false;
        setFlying(false);
        setShotVelocity(null);
        setResultGoal(null);
        reported.current = false;
        dragStart.current = null;
        setPhase("sessionEnd");
        const snap = playSnapRef.current;
        const tid = typeof snap.teamId === "string" ? snap.teamId.trim() : "";
        const goals = sessionGoalsRef.current;
        const shots = MINI_SHOT_SESSION_SHOTS;
        const successPct =
          shots > 0 ? Math.round((goals / shots) * 100) : 0;
        const avgAccuracy =
          shots > 0 ? sessionAccuracySumRef.current / shots : 0;
        TRACK("MINI_SHOT_SESSION_END", {
          goals,
          shots,
          score: sessionRunningScoreRef.current,
          success_pct: successPct,
          max_goal_streak: maxGoalStreakRef.current,
          max_combo_mul: maxComboMulRef.current,
          streak_xp_bonus: sessionStreakXpBonusRef.current,
          daily_cleared: dailyCleared,
          ovr: snap.ovr,
          ...(tid ? { team_id: tid } : {}),
        });
        void persistMiniShotSessionEnd({
          sessionKey: miniShotSessionKeyRef.current,
          teamId: tid || undefined,
          goals,
          shots,
          score: sessionRunningScoreRef.current,
          successPct,
          avgAccuracy,
          ovr: snap.ovr,
          streakXpBonus: sessionStreakXpBonusRef.current,
        });
      } else {
        resetRound();
      }
    }, RESULT_TO_RESET_MS);
    return () => clearAutoCloseTimer();
  }, [phase, open, clearAutoCloseTimer, resetRound]);

  const tryFireShot = useCallback(
    (clientX: number, clientY: number) => {
      if (phaseRef.current !== "aim" || !dragStart.current || !overlayRef.current) return;
      const rect = overlayRef.current.getBoundingClientRect();
      const minDim = Math.max(80, Math.min(rect.width, rect.height));
      const dx = (clientX - dragStart.current.x) / minDim;
      const dy = (clientY - dragStart.current.y) / minDim;
      dragStart.current = null;
      const len = Math.hypot(dx, dy);
      if (len < MIN_DRAG_LEN_NORM) return;

      const ball = MINI_SHOT3D.ballStart;
      const goalX = MINI_SHOT_GOAL_LOOK_AT.x;
      const goalZ = MINI_SHOT_GOAL_LOOK_AT.z;
      const base = new THREE.Vector3(goalX - ball.x, 0, goalZ - ball.z);
      if (base.lengthSq() < 1e-6) base.set(0, 0, -1);
      base.normalize();

      const lateral = THREE.MathUtils.clamp(dx * 0.55, -0.42, 0.42);
      _lateralQuat.setFromAxisAngle(_yAxis, lateral);
      base.applyQuaternion(_lateralQuat);

      const lift = THREE.MathUtils.clamp(0.14 + (-dy) * 0.38, 0.08, 0.48);
      base.y = lift;
      base.normalize();

      const power = THREE.MathUtils.clamp(len * 1.28, 0.12, 1);
      const { dir, appliedRad } = applyAimNoise(base, params.aimNoiseMaxRad);
      const speed =
        THREE.MathUtils.lerp(params.speedMin, params.speedMax, power) * MINI_SHOT_KICK_SPEED_MULT;
      const vel = dir.multiplyScalar(speed);

      lastPower.current = power;
      const accDenom = Math.max(1e-6, params.aimNoiseMaxRad);
      lastAccuracy.current = THREE.MathUtils.clamp(power * (1 - Math.min(1, appliedRad / accDenom)), 0, 1);
      setFlightAccuracy(lastAccuracy.current);
      setFlightComboMul(comboMulRef.current);

      playMiniShotKick(power);
      setCamKickNonce((n) => n + 1);
      setShotVelocity(vel.clone());
      setFlying(true);
      setPhase("flying");
    },
    [params.aimNoiseMaxRad, params.speedMax, params.speedMin]
  );

  useEffect(() => {
    if (!open || phase !== "aim") return;
    const onWinPointerEnd = (e: PointerEvent) => {
      if (!dragStart.current) return;
      tryFireShot(e.clientX, e.clientY);
    };
    window.addEventListener("pointerup", onWinPointerEnd);
    window.addEventListener("pointercancel", onWinPointerEnd);
    return () => {
      window.removeEventListener("pointerup", onWinPointerEnd);
      window.removeEventListener("pointercancel", onWinPointerEnd);
    };
  }, [open, phase, tryFireShot]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (phase !== "aim") return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    tryFireShot(e.clientX, e.clientY);
    const t = e.currentTarget as HTMLElement;
    if (t.hasPointerCapture?.(e.pointerId)) t.releasePointerCapture(e.pointerId);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] max-w-lg flex-col overflow-hidden border-slate-700 bg-slate-900 p-0 text-slate-50 sm:max-w-xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="shrink-0 border-b border-slate-700/80 p-5 pb-4">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-lg text-white">미니 슛</DialogTitle>
            <DialogDescription className="text-sm text-slate-400">
              {MINI_SHOT_SESSION_SHOTS}번 슛 · 드래그로 방향과 힘을 정합니다. 매 슛 결과 후 자동으로 다음 조준으로
              넘어가요.
            </DialogDescription>
            <p className="text-xs font-bold text-cyan-200/95">
              <span style={{ color: "#4FC3F7", lineHeight: HUD_LINE_HEIGHT }}>
                🎯 TARGET: {zoneNameKo(mission.targetZone)} ({mission.currentHits}/{mission.requiredHits}) · 보상 +
                {mission.reward}
              </span>
            </p>
            <p className="text-[10px] font-semibold text-cyan-300/85">
              난이도 {missionDifficultyLabelKo(mission.difficulty)} · 클리어 {missionClears}
            </p>
            <p className="text-[10px] font-bold text-amber-200/90">
              🎯 {targetSizeLabelKo(currentTargetSize)} TARGET · XP x
              {getTargetSizeXpMultiplier(currentTargetSize).toFixed(1)}
            </p>
            <p className="text-[10px] font-bold text-violet-200/90">
              🌀 {targetMotionLabelKo(currentTargetMotion)} · XP x
              {getTargetMotionXpMultiplier(currentTargetMotion).toFixed(1)}
            </p>
            {effectiveDailyChallenge ? (
              <p
                className="text-[10px] font-semibold"
                style={{ color: "#111827", lineHeight: HUD_LINE_HEIGHT }}
              >
                <span style={{ color: "#FF6B6B" }}>{isSuperChallenge ? "🔥 SUPER CHALLENGE ACTIVE" : "📅 DAILY"}</span>
                : {zoneNameKo(effectiveDailyChallenge.targetZone)} ({dailyHits}/{effectiveDailyChallenge.requiredHits}) ·
                보상 +{effectiveDailyChallenge.rewardScore}
                {isSuperChallenge ? ` · PERFECT ${dailyPerfectDone ? "완료" : "필요"}` : ""}
                {dailyCleared ? " · CLEAR" : ""}
              </p>
            ) : null}
            <p
              className="text-[10px] font-black"
              style={{ color: "#FFA726", lineHeight: HUD_LINE_HEIGHT }}
            >
              🔥 DAILY STREAK: {streakDays}일
            </p>
            {superBadge.achieved ? (
              <p
                className="text-[10px] font-black"
                style={{ color: "#111827", lineHeight: HUD_LINE_HEIGHT }}
              >
                🏆 {superBadge.title} · {superBadge.count}회
              </p>
            ) : null}
          </DialogHeader>
        </div>

        <div className="relative isolate aspect-[4/3] w-full min-h-[200px] shrink-0 overflow-hidden bg-slate-950 sm:min-h-[240px]">
          <div className="absolute inset-0 min-h-0 min-w-0">
            <MiniShotCanvas
              flying={flying}
              shotVelocity={shotVelocity}
              celebrateGoal={phase === "result" && resultGoal === true}
              ballScaleMul={resultStreak >= 3 ? 1.2 : 1}
              shotAccuracy={flightAccuracy}
              flightComboMul={flightComboMul}
              comboTintMul={flying ? flightComboMul : displayComboMul}
              camKickNonce={camKickNonce}
              camGoalNonce={camGoalNonce}
              camResetGen={camResetGen}
              onFlightEnd={finishFlight}
            />
          </div>
          {phase === "aim" ? (
            <div
              ref={overlayRef}
              className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={(e) => {
                dragStart.current = null;
                const t = e.currentTarget as HTMLElement;
                if (t.hasPointerCapture?.(e.pointerId)) t.releasePointerCapture(e.pointerId);
              }}
            />
          ) : null}
          {phase === "aim" ? (
            <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-xs font-semibold text-white/80">
              드래그 후 손을 떼면 슛
            </p>
          ) : null}
          {phase === "flying" ? (
            <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-xs font-medium text-amber-200/90">
              …
            </p>
          ) : null}
          {phase === "result" && resultGoal !== null ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/35">
              <p className="rounded-xl bg-slate-900/90 px-6 py-4 text-lg font-black text-white shadow-xl ring-1 ring-white/15">
                {resultGoal ? "GOAL!" : "MISS"}
              </p>
              {lastGrade ? (
                <p
                  className={`rounded-lg px-4 py-2 text-sm font-black ring-1 ${
                    lastGrade === "PERFECT"
                      ? "bg-yellow-300/95 text-yellow-950 ring-yellow-200/70"
                      : lastGrade === "GOOD"
                        ? "bg-lime-300/95 text-lime-950 ring-lime-100/70"
                        : lastGrade === "OK"
                          ? "bg-orange-300/95 text-orange-950 ring-orange-100/70"
                          : "bg-red-300/95 text-red-950 ring-red-100/70"
                  }`}
                >
                  {lastGrade === "PERFECT" && "🔥 PERFECT"}
                  {lastGrade === "GOOD" && "👍 GOOD"}
                  {lastGrade === "OK" && "🙂 OK"}
                  {lastGrade === "MISS" && "❌ MISS"}
                </p>
              ) : null}
              {gainedXp > 0 ? (
                <p className="animate-mini-shot-streak-pop rounded-md bg-cyan-400/90 px-3 py-1 text-xs font-black text-slate-950">
                  +{gainedXp} XP
                </p>
              ) : null}
              {comboCount > 1 ? (
                <p className="rounded-md bg-orange-400/90 px-3 py-1 text-xs font-black text-orange-950 ring-1 ring-orange-200/80">
                  🔥 COMBO x{comboCount} ({comboMultiplier.toFixed(1)}x)
                </p>
              ) : null}
              <p className="rounded-md bg-violet-300/90 px-3 py-1 text-xs font-black text-violet-950 ring-1 ring-violet-100/80">
                🎯 {targetSizeLabelKo(currentTargetSize)} TARGET ({getTargetSizeXpMultiplier(currentTargetSize).toFixed(1)}
                x XP)
              </p>
              <p className="rounded-md bg-fuchsia-300/90 px-3 py-1 text-xs font-black text-fuchsia-950 ring-1 ring-fuchsia-100/80">
                🌀 {targetMotionLabelKo(currentTargetMotion)} ({getTargetMotionXpMultiplier(currentTargetMotion).toFixed(1)}
                x XP)
              </p>
              {resultGoal && resultZoneLabel ? (
                <p className="rounded-lg bg-slate-900/85 px-4 py-2 text-xs font-bold text-cyan-200 ring-1 ring-cyan-400/40">
                  {resultZoneLabel}
                  {resultZoneBaseScore != null ? (
                    <span className="ml-1 text-cyan-100/90">({resultZoneBaseScore}점 존)</span>
                  ) : null}
                </p>
              ) : null}
              <p className="text-[11px] font-medium text-white/70">
                {sessionShotsDone >= MINI_SHOT_SESSION_SHOTS
                  ? `${Math.round(RESULT_TO_RESET_MS / 100) / 10}초 뒤 라운드 결과로 넘어가요`
                  : `${Math.round(RESULT_TO_RESET_MS / 100) / 10}초 뒤 자동으로 다시 조준해요`}
              </p>
            </div>
          ) : null}
          {phase === "sessionEnd" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 px-5 text-center sm:gap-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/90">라운드 결과</p>
              <p className="text-2xl font-black leading-tight text-white sm:text-3xl">
                {MINI_SHOT_SESSION_SHOTS}번 중{" "}
                <span className="text-emerald-400">{sessionGoals}</span>골 성공!
              </p>
              <div className="space-y-1 text-sm text-white/85">
                <p>
                  총 슛 <span className="font-bold text-white">{MINI_SHOT_SESSION_SHOTS}</span> · 성공{" "}
                  <span className="font-bold text-emerald-300">{sessionGoals}</span> (
                  {MINI_SHOT_SESSION_SHOTS > 0
                    ? Math.round((sessionGoals / MINI_SHOT_SESSION_SHOTS) * 100)
                    : 0}
                  %)
                </p>
                <p>
                  점수 <span className="font-bold text-amber-200">{sessionTotalScore}</span>점
                  <span className="text-white/50"> (존 점수 × 콤보)</span>
                </p>
                <p className="pt-1 text-xs text-slate-300">
                  {miniShotSessionMotivation(sessionGoals, MINI_SHOT_SESSION_SHOTS)}
                </p>
                {sessionGoals === MINI_SHOT_SESSION_SHOTS ? (
                  <p className="pt-1 text-xs font-bold text-violet-300">퍼펙트 라운드 — 5슛 전부 골!</p>
                ) : null}
                {sessionMaxStreak >= 2 ? (
                  <p className="text-[11px] text-amber-200/90">
                    이 라운드 최대 <span className="font-bold text-amber-100">{sessionMaxStreak}연속</span> 골
                  </p>
                ) : null}
                <p className="text-[11px] text-cyan-200/85">
                  현재 미션: {zoneNameKo(mission.targetZone)} {mission.currentHits}/{mission.requiredHits}
                </p>
                <p className="text-[11px] text-cyan-300/75">
                  난이도 {missionDifficultyLabelKo(mission.difficulty)} · 클리어 {missionClears}
                </p>
                {effectiveDailyChallenge ? (
                  <p className="text-[11px] text-fuchsia-200/85">
                    {isSuperChallenge ? "슈퍼: " : "데일리: "}
                    {zoneNameKo(effectiveDailyChallenge.targetZone)} {dailyHits}/{effectiveDailyChallenge.requiredHits}
                    {isSuperChallenge ? ` · PERFECT ${dailyPerfectDone ? "완료" : "필요"}` : ""}
                    {dailyCleared ? " · CLEAR" : ""}
                  </p>
                ) : null}
                <p className="text-[11px] font-semibold text-amber-200/90">🔥 연속 클리어 {streakDays}일</p>
                {superBadge.achieved ? (
                  <p className="text-[11px] font-semibold text-yellow-200/90">
                    🏆 {superBadge.title} · {superBadge.description} · 누적 {superBadge.count}회
                  </p>
                ) : null}
              </div>
              <MiniShotLeaderboardPanel
                teamId={typeof props.teamId === "string" ? props.teamId : undefined}
                viewerUid={props.viewerUid ?? undefined}
                enabled
              />
              {/* sessionEnd 액션은 하단 푸터에 단일 노출 (중복 CTA 제거) */}
            </div>
          ) : null}
          {streakPopup ? (
            <div className="pointer-events-none absolute inset-0 z-[35] flex items-center justify-center">
              <p
                className={`animate-mini-shot-streak-pop rounded-2xl border bg-slate-950/95 px-8 py-5 text-center text-2xl font-black uppercase tracking-wide shadow-[0_0_40px_rgba(251,191,36,0.35)] ring-2 sm:text-3xl ${
                  streakPopup.startsWith("PERFECT")
                    ? "border-violet-400/80 text-violet-100 ring-violet-500/50"
                    : streakPopup.includes("INSANE") ||
                        streakPopup.includes("COMBO") ||
                        streakPopup.includes("POWER")
                      ? "border-orange-500/80 text-orange-100 ring-orange-500/50"
                      : "border-amber-400/70 text-amber-100 ring-amber-500/40"
                }`}
              >
                {streakPopup}
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 flex-col gap-3 border-t border-slate-700/80 bg-slate-900/95 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="w-full max-w-none text-[11px] leading-snug text-slate-500 sm:max-w-[55%]">
            {phase === "sessionEnd" ? (
              <>
                {MINI_SHOT_SESSION_SHOTS}슛 중 {sessionGoals}골 · 성공률{" "}
                {MINI_SHOT_SESSION_SHOTS > 0
                  ? Math.round((sessionGoals / MINI_SHOT_SESSION_SHOTS) * 100)
                  : 0}
                % · 점수 {sessionTotalScore}점
                {sessionMaxStreak >= 2 ? (
                  <>
                    {" "}
                    · 최대 {sessionMaxStreak}연속
                  </>
                ) : null}
              </>
            ) : (
              <>
                세션 진행 {sessionShotsDone}/{MINI_SHOT_SESSION_SHOTS}슛 · 골 {sessionGoals} · 스탯 슛 {shoot} · 패스{" "}
                {pass} · OVR {ovr}
              </>
            )}
          </p>
          <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
            {phase === "sessionEnd" ? (
              <>
                <Button type="button" className="font-bold" onClick={retrySession}>
                  다시 도전
                </Button>
                <Button type="button" variant="secondary" onClick={forceClose}>
                  닫기
                </Button>
              </>
            ) : phase === "result" ? (
              <Button type="button" className="font-bold" onClick={forceClose}>
                닫기
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={() => handleDialogOpenChange(false)}>
                취소
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

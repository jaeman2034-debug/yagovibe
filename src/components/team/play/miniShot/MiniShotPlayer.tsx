import {
  Suspense,
  Component,
  type ErrorInfo,
  type ReactNode,
  useMemo,
  useLayoutEffect,
  useEffect,
} from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import MiniShotPlayerSilhouette from "./MiniShotPlayerSilhouette";
import {
  MINI_SHOT3D,
  MINI_SHOT_GOAL_LOOK_AT,
  MINI_SHOT_PLAYER_DEFAULT_POSITION,
  MINI_SHOT_PLAYER_FACING_YAW_OFFSET,
  MINI_SHOT_PLAYER_HEIGHT_PER_BALL_DIAM,
  MINI_SHOT_PLAYER_PRESENTATION_YAW_NUDGE,
} from "@/lib/team/miniShot3d";

/**
 * `public/` 기준 경로 → 브라우저에서 fetch할 절대 경로 (`vite.config`의 `base` 반영)
 * 예: `models/player.glb` 또는 `/models/player.glb` → 배포 루트 기준 동일 리소스
 */
export function miniShotPublicFileUrl(absoluteOrRelative: string): string {
  const path = absoluteOrRelative.trim().replace(/^\/+/, "");
  const base = import.meta.env.BASE_URL;
  if (!base || base === "/") return `/${path}`;
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${path}`;
}

/**
 * Vite 기준: `public/models/player.glb` → `useGLTF`에 넣는 URL과 동일해야 함
 * 확인: `${location.origin}${MINI_SHOT_PLAYER_GLB_URL}` 직접 열어 200·다운로드 여부
 */
export const MINI_SHOT_PLAYER_GLB_URL = miniShotPublicFileUrl("models/player.glb");

useGLTF.preload(MINI_SHOT_PLAYER_GLB_URL);

/** 파이프만 검증할 때 — CORS 허용되는 공개 샘플 (에셋 없을 때) */
const ASTRONAUT_TEST_GLTF_URL = "https://modelviewer.dev/shared-assets/models/Astronaut.glb";

/**
 * 최종 GLB URL (우선순위: props → `VITE_MINI_SHOT_PLAYER_GLB_URL` → 테스트 플래그 → 로컬 기본)
 *
 * `.env.local` 예:
 * - `VITE_MINI_SHOT_PLAYER_GLB_URL=https://…` (임의 URL)
 * - 또는 `VITE_MINI_SHOT_GLTF_TEST=astronaut` (Astronaut 샘플)
 */
export function resolveMiniShotPlayerGlbUrl(override?: string): string {
  if (typeof override === "string" && override.trim() !== "") {
    const o = override.trim();
    if (o.startsWith("http://") || o.startsWith("https://")) return o;
    if (o.startsWith("//")) return o;
    return miniShotPublicFileUrl(o);
  }
  const fromEnv = import.meta.env.VITE_MINI_SHOT_PLAYER_GLB_URL;
  if (typeof fromEnv === "string" && fromEnv.trim() !== "") {
    const e = fromEnv.trim();
    if (e.startsWith("http://") || e.startsWith("https://")) return e;
    if (e.startsWith("//")) return e;
    return miniShotPublicFileUrl(e);
  }
  const test = import.meta.env.VITE_MINI_SHOT_GLTF_TEST;
  if (test === "astronaut" || test === "1") return ASTRONAUT_TEST_GLTF_URL;
  return MINI_SHOT_PLAYER_GLB_URL;
}

const DEFAULT_ROTATION: [number, number, number] = [0, 0, 0];
const DEFAULT_POSITION: [number, number, number] = [
  MINI_SHOT_PLAYER_DEFAULT_POSITION.x,
  MINI_SHOT_PLAYER_DEFAULT_POSITION.y,
  MINI_SHOT_PLAYER_DEFAULT_POSITION.z,
];
const DEFAULT_BALL_DIAMETER = MINI_SHOT3D.ballRadius * 2;

/** 실루엣 메시 최대 높이(대략, 발~머리) — 포즈·비율 바꾸면 같이 맞출 것 */
const MINI_SHOT_SILHOUETTE_REF_HEIGHT = 1.5;

/** `position` 기준 XZ에서 골대(`MINI_SHOT_GOAL_LOOK_AT`)를 바라보는 Y 회전 — `Math.atan2(dir.x, dir.z)` */
function miniShotYawTowardGoal(position: readonly [number, number, number]): number {
  const dir = new THREE.Vector3(
    MINI_SHOT_GOAL_LOOK_AT.x - position[0],
    0,
    MINI_SHOT_GOAL_LOOK_AT.z - position[2]
  );
  return (
    Math.atan2(dir.x, dir.z) +
    MINI_SHOT_PLAYER_FACING_YAW_OFFSET +
    MINI_SHOT_PLAYER_PRESENTATION_YAW_NUDGE
  );
}

function mergePlayerRotation(
  rotation: readonly [number, number, number],
  position: readonly [number, number, number]
): [number, number, number] {
  const yaw = miniShotYawTowardGoal(position);
  return [rotation[0], rotation[1] + yaw, rotation[2]];
}

function resolveMiniShotPlayerTargetHeightWorld(params: {
  autoFitHeight?: number;
  ballDiameter: number;
  heightPerBallDiam: number;
}): number {
  const { autoFitHeight, ballDiameter, heightPerBallDiam } = params;
  if (autoFitHeight != null && autoFitHeight > 0) return autoFitHeight;
  return ballDiameter * heightPerBallDiam;
}

type GltfInnerProps = {
  url: string;
  rotation: [number, number, number];
  ballDiameter: number;
  heightPerBallDiam: number;
  autoFitHeight?: number;
};

/**
 * 피벗·바닥·오토핏 측정 로직을 바꿀 때마다 1 증가 → `useMemo`가 같은 scene/url에서도 클론을 다시 만들게 함(HMR·고착 방지).
 */
const MINI_SHOT_GLTF_PREPARE_REVISION = 10;

type PreparedRoot = {
  root: THREE.Object3D;
  /** false면 GLB 대신 실루엣(과대·오배치로 화면 가장자리 하얀 면이 생길 때) */
  gltfSane: boolean;
};

function prepareMiniShotPlayerRoot(scene: THREE.Object3D, targetHeightWorld: number): PreparedRoot {
  const c = scene.clone();
  c.scale.set(1, 1, 1);
  c.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      // 스키닝·잘못된 바운딩 AABB로 통째로 컬링되는 경우 완화(미니슛 단일 캐릭터만)
      o.frustumCulled = false;
    }
    if (o instanceof THREE.SkinnedMesh && o.skeleton) {
      o.skeleton.update();
    }
  });
  c.updateMatrixWorld(true);

  const alignBox = new THREE.Box3().setFromObject(c, true);
  if (!alignBox.isEmpty()) {
    const alignCenter = new THREE.Vector3();
    alignBox.getCenter(alignCenter);
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console -- 바닥 정렬 전 AABB
      console.log("[MiniShot] GLB 정렬 전 center", alignCenter.x, alignCenter.y, alignCenter.z);
      // eslint-disable-next-line no-console
      console.log("[MiniShot] GLB 정렬 전 min.y", alignBox.min.y);
    }
    // AABB center로 XZ 밀지 않음(옆으로 밀려 “벽”처럼 보일 수 있음) → 바닥(y=0)만 맞춤
    c.position.set(0, -alignBox.min.y, 0);
    c.updateMatrixWorld(true);
  }

  if (import.meta.env.DEV) {
    const verify = new THREE.Box3().setFromObject(c, true);
    if (!verify.isEmpty()) {
      const vc = new THREE.Vector3();
      verify.getCenter(vc);
      // eslint-disable-next-line no-console
      console.log("[MiniShot] GLB 정렬 후 center", vc.x, vc.y, vc.z, "min.y", verify.min.y);
    }
  }

  // 단일 기준: 목표 키(월드) = 공지름×배수 → AABB 높이 `max.y - min.y` 로만 균일 스케일
  c.updateMatrixWorld(true);
  const fitBox = new THREE.Box3().setFromObject(c, true);
  if (!fitBox.isEmpty()) {
    const height = fitBox.max.y - fitBox.min.y;
    const spanX = fitBox.max.x - fitBox.min.x;
    const spanZ = fitBox.max.z - fitBox.min.z;
    const fallback = Math.max(spanX, spanZ, 1e-8);
    const denom = height > 1e-5 ? height : fallback;
    if (denom > 1e-8 && denom < 1e6) {
      const uniformScale = targetHeightWorld / denom;
      if (Number.isFinite(uniformScale) && uniformScale > 0) {
        c.scale.setScalar(uniformScale);
        c.updateMatrixWorld(true);
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log("[MiniShot] GLB 스케일(공 기준·단일)", {
            targetH: targetHeightWorld,
            height: Number(height.toFixed(4)),
            denom: Number(denom.toFixed(4)),
            uniformScale: Number(uniformScale.toFixed(4)),
          });
        }
      }
    }
  }

  let maxPrepared = 0;
  const boxPrecise = new THREE.Box3().setFromObject(c, true);
  if (!boxPrecise.isEmpty()) {
    const s = new THREE.Vector3();
    boxPrecise.getSize(s);
    maxPrepared = Math.max(maxPrepared, s.x, s.y, s.z);
  }
  const boxLoose = new THREE.Box3().setFromObject(c);
  if (!boxLoose.isEmpty()) {
    const s = new THREE.Vector3();
    boxLoose.getSize(s);
    maxPrepared = Math.max(maxPrepared, s.x, s.y, s.z);
  }
  const approxOnScreen = maxPrepared;
  const gltfSane =
    Number.isFinite(approxOnScreen) && approxOnScreen > 0.2 && approxOnScreen < 8;
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console -- 스케일 튜닝(루트 월드 AABB 최대 변)
    console.log(
      "[MiniShot] 추정 최종 큰변(루트 AABB):",
      approxOnScreen.toFixed(3),
      "(gltfSane:",
      gltfSane,
      ")"
    );
  }
  if (import.meta.env.DEV && !gltfSane) {
    // eslint-disable-next-line no-console -- GLB 자동 실루엣 전환 이유
    console.warn(
      "[MiniShot] GLB 바운딩 비정상(추정 화면 크기",
      approxOnScreen.toFixed(2),
      ") → 실루엣 폴백."
    );
  }

  return { root: c, gltfSane };
}

function MiniShotPlayerGltfInner({
  url,
  rotation,
  ballDiameter,
  heightPerBallDiam,
  autoFitHeight,
}: GltfInnerProps) {
  const { scene } = useGLTF(url);

  const targetHeightWorld = resolveMiniShotPlayerTargetHeightWorld({
    autoFitHeight,
    ballDiameter,
    heightPerBallDiam,
  });

  const { root, gltfSane } = useMemo(
    () => prepareMiniShotPlayerRoot(scene, targetHeightWorld),
    [scene, url, targetHeightWorld, MINI_SHOT_GLTF_PREPARE_REVISION]
  );

  useLayoutEffect(() => {
    if (!import.meta.env.DEV || !gltfSane) return;
    // eslint-disable-next-line no-console -- 최종 스케일·Three 객체 반영 여부 확인
    console.log("🔥 [MiniShot] 목표 키(월드):", targetHeightWorld);
    // eslint-disable-next-line no-console -- primitive는 `root` 클론 사용 (원본 scene과 다를 수 있음)
    console.log("[MiniShot] scene.scale (원본 GLTF):", scene.scale.x, scene.scale.y, scene.scale.z);
    // eslint-disable-next-line no-console
    console.log("[MiniShot] root.scale (렌더 클론):", root.scale.x, root.scale.y, root.scale.z);
    const w = new THREE.Vector3();
    root.getWorldScale(w);
    // eslint-disable-next-line no-console
    console.log("root world scale:", w.x, w.y, w.z);
    // eslint-disable-next-line no-console -- 미니슛 GLB 파이프 확인용
    console.debug(`[MiniShot] GLB 표시 OK: ${url}`);
  }, [url, scene, root, gltfSane, targetHeightWorld]);

  if (!gltfSane) {
    return <MiniShotPlayerSilhouette />;
  }

  return (
    <group rotation={rotation}>
      <primitive object={root} />
    </group>
  );
}

type BoundaryProps = { children: ReactNode; fallback: ReactNode; glbUrl: string };

type BoundaryState = { hasError: boolean };

class MiniShotGltfErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    if (import.meta.env.DEV) {
      const u = this.props.glbUrl;
      // eslint-disable-next-line no-console -- 폴백 원인 확인용
      const openHint =
        u.startsWith("http://") || u.startsWith("https://")
          ? `원격: 브라우저에서 직접 열기 → ${u}`
          : `로컬: ${typeof window !== "undefined" ? window.location.origin : ""}${u}`;
      console.warn(
        `[MiniShot] GLB 로드 실패 → 실루엣 폴백\n  url: ${u}\n  점검: ${openHint} · public/models/player.glb · VITE_MINI_SHOT_GLTF_TEST=astronaut`,
        error
      );
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export type MiniShotPlayerProps = {
  glbUrl?: string;
  /** 오일러 각; Y는 `position`→골대(`MINI_SHOT_GOAL_LOOK_AT`) 바라보는 Yaw에 더해짐 */
  rotation?: [number, number, number];
  /** 월드 기준 캐릭터 루트 위치 (실루엣 폴백 동일 적용) */
  position?: [number, number, number];
  /** 월드 단위 공 지름. 기본 `MINI_SHOT3D`와 동일 */
  ballDiameter?: number;
  /** 캐릭터 목표 키 = 공 지름 × 이 값(기본 `MINI_SHOT_PLAYER_HEIGHT_PER_BALL_DIAM`) */
  playerHeightPerBallDiameter?: number;
  /**
   * 지정 시 공 기준 대신 이 월드 높이로 AABB 맞춤(디버그·튜닝).
   */
  autoFitHeight?: number;
  /**
   * true면 GLB를 아예 로드하지 않고 실루엣만 표시.
   * GLB가 과스케일·피벗 오류로 화면 가장자리에 하얀 덩어리만 보일 때 임시로 사용.
   */
  silhouetteOnly?: boolean;
};

/**
 * GLB 정적 포즈(애니 없음) 우선, 실패·로딩 중에는 기존 실루엣.
 * 기본: `public/models/player.glb` — 없으면 폴백만 보임(정상).
 * 검증: `.env`에 `VITE_MINI_SHOT_GLTF_TEST=astronaut` 또는 `VITE_MINI_SHOT_PLAYER_GLB_URL=…`
 */
export default function MiniShotPlayer({
  glbUrl: glbUrlProp,
  rotation = DEFAULT_ROTATION,
  position = DEFAULT_POSITION,
  ballDiameter = DEFAULT_BALL_DIAMETER,
  playerHeightPerBallDiameter = MINI_SHOT_PLAYER_HEIGHT_PER_BALL_DIAM,
  autoFitHeight,
  silhouetteOnly = false,
}: MiniShotPlayerProps) {
  const targetHeightWorld = resolveMiniShotPlayerTargetHeightWorld({
    autoFitHeight,
    ballDiameter,
    heightPerBallDiam: playerHeightPerBallDiameter,
  });
  const silhouetteGroupScale = targetHeightWorld / MINI_SHOT_SILHOUETTE_REF_HEIGHT;
  const rotationTowardGoal = useMemo(
    () => mergePlayerRotation(rotation, position),
    [
      position[0],
      position[1],
      position[2],
      rotation[0],
      rotation[1],
      rotation[2],
      MINI_SHOT_PLAYER_FACING_YAW_OFFSET,
      MINI_SHOT_PLAYER_PRESENTATION_YAW_NUDGE,
    ]
  );

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const y = rotationTowardGoal[1];
    // eslint-disable-next-line no-console -- 시선·offset 튜닝 확인
    console.log(
      "[MiniShot] player.rotation.y:",
      y.toFixed(4),
      "rad (",
      THREE.MathUtils.radToDeg(y).toFixed(1),
      "°) | FACING_YAW_OFFSET:",
      MINI_SHOT_PLAYER_FACING_YAW_OFFSET,
      "PRESENTATION_NUDGE:",
      MINI_SHOT_PLAYER_PRESENTATION_YAW_NUDGE
    );
  }, [rotationTowardGoal, MINI_SHOT_PLAYER_FACING_YAW_OFFSET, MINI_SHOT_PLAYER_PRESENTATION_YAW_NUDGE]);

  if (silhouetteOnly) {
    return (
      <group position={position}>
        <group scale={silhouetteGroupScale} rotation={rotationTowardGoal}>
          <MiniShotPlayerSilhouette />
        </group>
      </group>
    );
  }

  const resolvedUrl = resolveMiniShotPlayerGlbUrl(glbUrlProp);
  const fallback = (
    <group position={position}>
      <group scale={silhouetteGroupScale} rotation={rotationTowardGoal}>
        <MiniShotPlayerSilhouette />
      </group>
    </group>
  );

  return (
    <Suspense fallback={fallback}>
      <MiniShotGltfErrorBoundary fallback={fallback} glbUrl={resolvedUrl}>
        <group position={position}>
          <MiniShotPlayerGltfInner
            url={resolvedUrl}
            rotation={rotationTowardGoal}
            ballDiameter={ballDiameter}
            heightPerBallDiam={playerHeightPerBallDiameter}
            autoFitHeight={autoFitHeight}
          />
        </group>
      </MiniShotGltfErrorBoundary>
    </Suspense>
  );
}

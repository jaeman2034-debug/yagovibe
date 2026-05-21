import * as THREE from "three";

/** `MiniShotPlayer` 기본 월드 위치 — 카메라·yaw 기준과 동기 (공은 발 앵커 기준) */
/** z 양(+)로 골반·무게중심을 공 쪽(−Z)으로 — 킥 준비 체감 */
export const MINI_SHOT_PLAYER_DEFAULT_POSITION = new THREE.Vector3(-0.35, -0.08, 0.05);

const MINI_SHOT_BALL_RADIUS = 0.22;

/**
 * `MiniShotPlayerSilhouette` 왼다리(지지발)와 동일: `LegLimbChain` cleat 중심 월드 좌표.
 * hip·thigh/calf·cleatY·toeLocalZ·rootRotation 이 바뀌면 여기도 맞출 것.
 */
function miniShotPlantFootCleatWorld(): THREE.Vector3 {
  const legX = 0.14;
  const hipY = 0.72;
  const leftLegZ = 0.05;
  const thighH = 0.28;
  const calfH = 0.42;
  const cleatYLocal = -thighH - calfH + 0.03;
  const toeLocalZ = 0.06;
  const cleatLocal = new THREE.Vector3(0, cleatYLocal, toeLocalZ);
  cleatLocal.applyEuler(new THREE.Euler(0.1, 0, 0, "XYZ"));
  return new THREE.Vector3(-legX, hipY, leftLegZ).add(cleatLocal);
}

const _plantFoot = miniShotPlantFootCleatWorld();
/** 접촉·킥 타이밍용: cleat 중심 + 사용자 튜닝 (X/Z), Y는 지면·깔림 방지 + 살짝 리프트 */
const _ballStartY = Math.max(_plantFoot.y + MINI_SHOT_BALL_RADIUS + 0.02, 0.36) + 0.01;

/** 월드 단위 — 카메라·판정과 동기 */
export const MINI_SHOT3D = {
  ballRadius: MINI_SHOT_BALL_RADIUS,
  /** 발(지지발 cleat) 기준 — 앞(−Z) 우선, X는 몸 중심선 쪽: `foot.x+0.03`, `foot.z-0.23` */
  ballStart: new THREE.Vector3(_plantFoot.x + 0.03, _ballStartY, _plantFoot.z - 0.23),
  /** 골 판정 AABB (공 중심) */
  goalBox: new THREE.Box3(new THREE.Vector3(-1.85, 0.12, -13.95), new THREE.Vector3(1.85, 2.25, -12.05)),
  gravity: 6.2,
  maxFlightSec: 7,
} as const;

/** 플레이어 시선·바디 Yaw 타깃 XZ (월드) — 골대 쪽 중앙 근처 */
export const MINI_SHOT_GOAL_LOOK_AT = { x: 0, z: -13 } as const;

/**
 * `Math.atan2(goal.x - px, goal.z - pz)` 뒤에 더할 보정(라디안).
 * 실루엣·기본 축이 맞으면 **0** — 어긋나면 `Math.PI`, `±Math.PI/2` 중 하나만 골라 쓰면 됨.
 */
export const MINI_SHOT_PLAYER_FACING_YAW_OFFSET = 0;

/** 연출: 골·공 쪽 시선을 살짝 과장(라디안) — `atan2` 뒤에 더함 */
export const MINI_SHOT_PLAYER_PRESENTATION_YAW_NUDGE = 0.08;

/**
 * 미니슛 캐릭터 AABB 높이(월드) ≈ 공 지름 × 이 값 — **유일한 체감 튜닝 노브**.
 * 대략 4.8(귀여움) ~ 5.2(자연) ~ 5.8(피파 느낌). `MiniShotPlayer`의 `playerHeightPerBallDiameter`로 덮어쓸 수 있음.
 */
export const MINI_SHOT_PLAYER_HEIGHT_PER_BALL_DIAM = 5.2;

export type MiniShot3DInput = {
  ovr: number;
  shoot: number;
  pass: number;
};

export type MiniShot3DResult = {
  goal: boolean;
  power: number;
  accuracy: number;
  /** 정확도 임계 이상 골 */
  perfect?: boolean;
};

export function mapMiniShot3dParams(input: MiniShot3DInput): {
  speedMin: number;
  speedMax: number;
  aimNoiseMaxRad: number;
} {
  const ovr = Number.isFinite(input.ovr) ? input.ovr : 60;
  const shoot = Number.isFinite(input.shoot) ? input.shoot : 3;
  const pass = Number.isFinite(input.pass) ? input.pass : 3;
  const o = THREE.MathUtils.clamp((Math.min(98, Math.max(30, ovr)) - 30) / 68, 0, 1);
  const s = THREE.MathUtils.clamp(shoot, 1, 5);
  const p = THREE.MathUtils.clamp(pass, 1, 5);
  const speedMin = 5.5 + o * 1.8;
  const speedMax = 11 + ((s - 1) / 4) * 9 + o * 2.5;
  const aimNoiseMaxRad = Math.max(0.025, 0.16 - ((p - 1) / 4) * 0.12 - o * 0.04);
  return { speedMin, speedMax, aimNoiseMaxRad };
}

/** 슛 방향에 수직축 기준 소량 회전 편차 (패스 = 편차 상한) */
export function applyAimNoise(
  dir: THREE.Vector3,
  aimNoiseMaxRad: number
): { dir: THREE.Vector3; appliedRad: number } {
  const d = dir.clone().normalize();
  if (d.lengthSq() < 1e-6) {
    return { dir: new THREE.Vector3(0, 0.2, -1).normalize(), appliedRad: aimNoiseMaxRad };
  }
  const up = Math.abs(d.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const axis = new THREE.Vector3().crossVectors(up, d).normalize();
  const maxR = aimNoiseMaxRad;
  const applied = (Math.random() * 2 - 1) * maxR;
  const q = new THREE.Quaternion().setFromAxisAngle(axis, applied);
  const out = d.applyQuaternion(q).normalize();
  return { dir: out, appliedRad: Math.abs(applied) };
}

export function isBallInGoal(position: THREE.Vector3): boolean {
  return MINI_SHOT3D.goalBox.containsPoint(position);
}

/**
 * 골대 Z 깊이 구간(전·후면 사이)에 들어왔는데 골 AABB 밖이면 포스트·크로스바 등으로 MISS.
 * `isBallInGoal`보다 뒤에서 호출.
 */
export function isBallInGoalDepthMiss(position: THREE.Vector3): boolean {
  const b = MINI_SHOT3D.goalBox;
  if (position.z > b.max.z || position.z < b.min.z) return false;
  return !b.containsPoint(position);
}

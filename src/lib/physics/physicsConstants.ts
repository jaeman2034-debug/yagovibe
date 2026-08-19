/** 1v1 · 5v5 · 8v8 공통 ball/kick 상수 (LiveMatchScene SoT 정렬) */

export const BALL_RADIUS = 11;

export const KICK_RANGE = 54;
export const KICK_FORCE = 360;

/** 사이드라인·endline 반사 (Arcade collider + kinematic wall) */
export const BALL_WALL_BOUNCE = 0.82;

export const BALL_MAX_SPEED = 420;

/** Phaser host `dampenHostBall` 정지 임계 */
export const BALL_STOP_SPEED_ARCADE = 22;

/** Kinematic `integrateBall` 정지 임계 */
export const BALL_STOP_SPEED = 2;

/** 호스트 Arcade 프레임당 속도 배율 */
export const BALL_LINEAR_DAMP = 0.88;

/** Kinematic: `pow(BALL_FRICTION_EXP_BASE, dtSec * 60)` */
export const BALL_FRICTION_EXP_BASE = 0.94;

export const BALL_DRAG_ARCADE = 680;
export const BALL_BOUNCE_ARCADE = BALL_WALL_BOUNCE;

export const KICK_CLOSE_DIST = 6;
export const KICK_MOVE_INPUT_MIN = 0.12;
export const KICK_STICK_INPUT_MIN = 0.2;
export const KICK_DIRECTION_BLEND = 0.3;

/** 5v5 kinematic — 플레이어 원 반경 (TeamMatchScene PLAYER_RADIUS) */
export const PLAYER_RADIUS_KINEMATIC = 14;
/** ball–player 겹침 분리 최소 거리 */
export const PLAYER_BALL_MIN_SEP = BALL_RADIUS + PLAYER_RADIUS_KINEMATIC;
/** 드리블/밀기 접촉 반경 (minSep보다 약간 큼) */
export const PLAYER_BALL_DRIBBLE_DIST = PLAYER_BALL_MIN_SEP + 14;
/** 접촉 시 공에 더해지는 속도 (플레이어 이동 방향) */
export const DRIBBLE_PUSH_STRENGTH = 240;

/** @deprecated — use KICK_RANGE */
export const TEAM_KICK_RANGE = KICK_RANGE;
/** @deprecated — use KICK_FORCE */
export const TEAM_KICK_FORCE = KICK_FORCE;

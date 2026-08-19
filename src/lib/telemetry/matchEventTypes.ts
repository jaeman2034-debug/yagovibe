/**
 * Live match telemetry — event taxonomy (TRACK 1 + TRACK 2 Phase 2 contract).
 * @see docs/TRACK2_PHASE2_TELEMETRY_CONTRACT.md
 * @see docs/YAGO_SPORTS_MASTER_ARCHITECTURE.md §5
 */

export const MATCH_EVENT_SCHEMA_VERSION = 1 as const;

export type MatchEventSchemaVersion = typeof MATCH_EVENT_SCHEMA_VERSION;

export type MatchMode = "1v1" | "5v5" | "8v8";

export type MatchTeamSide = "A" | "B";

/** Canonical event types — keep in sync with functions/src/telemetry/matchEventTypes.ts */
export const MATCH_EVENT_TYPES = [
  "MATCH_STARTED",
  "MATCH_ENDED",
  "MOVE_INPUT",
  "BALL_TOUCH",
  "KICK_ATTEMPT",
  "PASS_ATTEMPT",
  "PASS_COMPLETE",
  "PASS_SUCCESS",
  "SHOT_ATTEMPT",
  "SHOT_ON_TARGET",
  "GOAL",
  "BALL_LOST",
  "OUT_OF_PLAY",
  "TURNOVER",
  "PRESS_EVENT",
  "POSITION_SAMPLE",
  "DECISION_EVENT",
  "INTERCEPTION",
  "DEFENSIVE_RECOVERY",
] as const;

export type MatchEventType = (typeof MATCH_EVENT_TYPES)[number];

export function isMatchEventType(value: string): value is MatchEventType {
  return (MATCH_EVENT_TYPES as readonly string[]).includes(value);
}

export function isMatchMode(value: string): value is MatchMode {
  return value === "1v1" || value === "5v5" || value === "8v8";
}

export type Vec2 = { x: number; y: number };

export type BallLossReason = "dispossessed" | "bad_touch" | "out_of_bounds" | "unknown";

export type OutOfPlaySide = "left" | "right" | "top" | "bottom";

export type OutOfPlayRestart = "throw_in" | "goal_kick" | "corner" | "unknown";

export type MatchEventPayloadByType = {
  MATCH_STARTED: {
    mode: MatchMode;
    playerUids: string[];
    startedAt: number;
    hostUid: string;
  };
  MATCH_ENDED: {
    winner: MatchTeamSide | "draw";
    finalScore: { teamA: number; teamB: number };
    durationMs: number;
  };
  MOVE_INPUT: {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    pressure?: boolean;
  };
  BALL_TOUCH: {
    ball: Vec2;
    player?: Vec2;
    dist?: number;
  };
  KICK_ATTEMPT: {
    playerUid: string;
    teamId: MatchTeamSide;
    ballX: number;
    ballY: number;
    power: number;
    distanceToBall: number;
    directionX: number;
    directionY: number;
    clockMs: number;
    mode: MatchMode;
  };
  PASS_ATTEMPT: {
    fromUid: string;
    teamId: MatchTeamSide;
    ball: Vec2;
    dirX: number;
    dirY: number;
    clockMs: number;
    targetUid?: string;
    passId?: string;
    distance?: number;
    to?: Vec2;
  };
  PASS_COMPLETE: {
    fromUid: string;
    toUid: string;
    teamId: MatchTeamSide;
    passId?: string;
    chainId?: string;
    ball?: Vec2;
    from?: Vec2;
    to?: Vec2;
    receivedAtMs?: number;
  };
  /** @deprecated use PASS_COMPLETE — kept for ingest alias */
  PASS_SUCCESS: {
    fromUid?: string;
    toUid?: string;
    teamId?: MatchTeamSide;
    passId?: string;
    chainId?: string;
    ball?: Vec2;
    receivedAtMs?: number;
  };
  SHOT_ATTEMPT: {
    dirX: number;
    dirY: number;
    xgProxy?: number;
  };
  SHOT_ON_TARGET: {
    teamId?: MatchTeamSide;
  };
  GOAL: {
    scoringTeam: MatchTeamSide;
    scorerUid?: string;
    scoreBefore: { teamA: number; teamB: number };
    scoreAfter: { teamA: number; teamB: number };
    clockMs: number;
  };
  BALL_LOST: {
    reason: BallLossReason;
    ball: Vec2;
    lastTouchUid?: string;
    teamId?: MatchTeamSide;
  };
  OUT_OF_PLAY: {
    side: OutOfPlaySide;
    ball: Vec2;
    restartType?: OutOfPlayRestart;
  };
  TURNOVER: {
    reason?: string;
    fromTeam?: MatchTeamSide;
    toTeam?: MatchTeamSide;
  };
  PRESS_EVENT: {
    radius?: number;
    targetCount?: number;
  };
  POSITION_SAMPLE: {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    roleSlot?: string;
    ball?: Vec2;
    sampleSeq?: number;
  };
  DECISION_EVENT: {
    choice?: string;
    quality?: number;
  };
  INTERCEPTION: {
    interceptorUid: string;
    teamId: MatchTeamSide;
    ball: Vec2;
    fromUid?: string;
    zoneId?: string;
    /** legacy */
    passerUid?: string;
  };
  DEFENSIVE_RECOVERY: {
    compactnessProxy?: number;
  };
};

export type MatchEventPayload<T extends MatchEventType = MatchEventType> = MatchEventPayloadByType[T];

/** Client → Functions append batch item */
export type MatchEventEnvelope<T extends MatchEventType = MatchEventType> = {
  schemaVersion: MatchEventSchemaVersion;
  type: T;
  matchId: string;
  sessionId: string;
  /** ms since match clock origin (host) */
  atMs: number;
  /** Date.now() at emit */
  wallTime: number;
  actorUid?: string;
  teamId?: MatchTeamSide;
  mode: MatchMode;
  payload: MatchEventPayload<T>;
};

export type MatchEventIndexDoc = {
  schemaVersion: MatchEventSchemaVersion;
  matchId: string;
  sessionId: string;
  mode: MatchMode;
  playerUids: string[];
  hostUid?: string;
  eventCount: number;
  firstEventAtMs?: number;
  lastEventAtMs?: number;
  updatedAt: unknown;
};

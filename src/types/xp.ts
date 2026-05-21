/**
 * XP ledger: Firestore `xpLogs/{logId}` (writes via Cloud Functions / Admin SDK).
 * Designed for on-device games, scheduled/offline activity ingestion, and future integrations.
 */

import type { Timestamp } from "firebase/firestore";

/** Broad channel for routing, analytics, and rule policy. */
export type XpGrantChannel =
  | "game"
  | "activity"
  | "offline_sync"
  | "integration"
  | "admin";

/**
 * Fine-grained source for idempotency keys and product analytics.
 * Extend without breaking older clients (unknown values tolerated at read time).
 */
export type XpSourceKind =
  | "mini_game"
  | "scheduled_match_rsvp"
  | "match_attendance"
  | "team_activity"
  | "invite_accepted"
  | "daily_login"
  | "wearable_sync"
  | "manual_adjustment"
  | string;

/** Optional correlation for dedupe / support (no PII required). */
export interface XpLogContext {
  teamId?: string;
  activityId?: string;
  matchId?: string;
  gameSessionId?: string;
  /** Stable client- or server-generated id for cross-service tracing */
  correlationId?: string;
}

/**
 * Single immutable XP event. `idempotencyKey` must be unique per uid + source
 * (e.g. `game_miniShot_2026-05-13_uid_sessionId`).
 */
export interface XpLogDoc {
  schemaVersion: number;
  uid: string;
  /** Positive grant or negative adjustment */
  deltaXp: number;
  channel: XpGrantChannel;
  sourceKind: XpSourceKind;
  idempotencyKey: string;
  context?: XpLogContext;
  /** Optional human-readable reason for admin / support */
  reasonCode?: string;
  createdAt: Timestamp;
}

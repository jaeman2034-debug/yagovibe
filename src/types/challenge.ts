import type { Timestamp } from "firebase/firestore";

/** PR-9 / PR-10B — `docs/architecture/pr-9-async-challenge.md`, `pr-10b-dribble-challenge.md` */

export type ChallengeScoringType = "high_score";

export type ChallengeMode = "pk" | "dribble";

export interface ChallengeTemplateDoc {
  slug: string;
  title: string;
  mode: ChallengeMode;
  scoringType: ChallengeScoringType;
  isActive: boolean;
  schemaVersion: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/** PK 시도 부가 수치 — Firestore rules: 각 0..10, goals≤shotsTaken(동시 존재 시), durationMs≤10분 */
export interface PkChallengeSubmissionMetadata {
  shotsTaken?: number;
  goals?: number;
  durationMs?: number;
}

/** PR-10B — cones + 시간만 (MVP, touches 미사용) — rules: 둘 다 필수, 상한 검증 */
export interface DribbleChallengeSubmissionMetadata {
  conesCleared: number;
  durationMs: number;
}

/** @deprecated `PkChallengeSubmissionMetadata` */
export type ChallengeSubmissionMetadata = PkChallengeSubmissionMetadata;

export interface ChallengeSubmissionDoc {
  schemaVersion: number;
  challengeId: string;
  uid: string;
  avatarId?: string;
  score: number;
  rulesVersion: string;
  metadata: PkChallengeSubmissionMetadata | DribbleChallengeSubmissionMetadata;
  createdAt: Timestamp;
}

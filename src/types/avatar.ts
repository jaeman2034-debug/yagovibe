/**
 * Canonical avatar document: Firestore `avatars/{uid}` (doc id === Auth uid).
 * 1:1 with platform identity; separate from legacy `users/{uid}/gameAvatar/*` paths.
 */

import type { Timestamp } from "firebase/firestore";

/** Cosmetic / onboarding choices (expandable). */
export interface AvatarAppearance {
  /** Preset or future part-composite id */
  stylePresetId?: string;
  bodyType?: string;
  hair?: string;
  face?: string;
  skinTone?: string;
  outfit?: string;
  shoes?: string;
  accessories?: string[];
}

/** Progression slice stored on avatar (server may mirror to XP aggregates). */
export interface AvatarProgression {
  level: number;
  xp: number;
  stamina?: number;
}

/** Sport-flavoured stats; keys may grow per mini-game / profile. */
export interface AvatarStats {
  shooting?: number;
  passing?: number;
  dribbling?: number;
  defense?: number;
  speed?: number;
  [key: string]: number | undefined;
}

export interface AvatarDoc {
  schemaVersion: number;
  uid: string;
  displayName?: string;
  /** 1~99, 저지 가슴 배번. 미설정 시 필드 생략 가능 */
  jerseyNumber?: number | null;
  appearance: AvatarAppearance;
  progression: AvatarProgression;
  stats: AvatarStats;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

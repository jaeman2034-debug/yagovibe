/**
 * 게임 레이어 (아바타 / Progression) — Firestore 스키마 타입 초안
 *
 * 원칙:
 * - MVP: 유저 1명 = 대표 아바타 1명 (`users/{uid}/gameAvatar/default`)
 * - XP·스탯·랭킹 반영 구간은 서버(Callable + Admin SDK)만 쓰기
 * - Mini-Shot 등 기존 소스는 ledger에 기록 후 progression 반영(추후 Callable로 이전)
 *
 * 경로는 firestore.rules 와 반드시 동기화할 것.
 */

import type { Timestamp } from "firebase/firestore";

/** `users/{uid}/gameAvatar/default` — 표현만; 스탯은 progression 쪽 */
export interface GameAvatarProfileDoc {
  schemaVersion: 1;
  nickname: string;
  /** 프리셋 ID 또는 추후 파츠 조합 */
  visualPresetId?: string;
  primarySport?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** `users/{uid}/gameProgression/summary` — 본인 조회 전용 권장 */
export interface GameProgressionSummaryDoc {
  schemaVersion: 1;
  totalXp: number;
  level: number;
  /** 소수·정수 모두 가능; 서버가만 갱신 */
  stats: {
    accuracy: number;
    power: number;
    stamina: number;
    speed: number;
    /** 종목 확장 시 추가 */
    [key: string]: number;
  };
  /** 배지 코드 목록(중복 없음) — 서버만 수정 */
  badgeCodes?: string[];
  lastEventAt?: Timestamp;
  updatedAt: Timestamp;
}

export type GameLedgerSource = "miniShotDaily" | "simulation" | "training" | "adminGrant";

/**
 * `users/{uid}/gameLedger/{eventId}`
 * idempotency: eventId = `${source}_${stableKey}` (예: miniShotDaily_20260506_teamId)
 */
export interface GameLedgerEntryDoc {
  schemaVersion: 1;
  source: GameLedgerSource;
  /** 적용된 XP (서버 계산 결과) */
  deltaXp: number;
  /** 스탯 델타 (선택) */
  statDeltas?: Partial<GameProgressionSummaryDoc["stats"]>;
  /** 클라가 보낸 원본 요약 (감사용, 위조 방지는 Callable에서 검증) */
  payload?: Record<string, unknown>;
  teamId?: string;
  createdAt: Timestamp;
}

/** `gameLeaderboards/{boardId}/entries/{uid}` — 랭킹용 공개 스냅샷 */
export interface GameLeaderboardEntryDoc {
  schemaVersion: 1;
  boardId: string;
  uid: string;
  /** 정렬 기준 (보드마다 다름) */
  score: number;
  level: number;
  displayName?: string;
  avatarPresetId?: string;
  updatedAt: Timestamp;
}

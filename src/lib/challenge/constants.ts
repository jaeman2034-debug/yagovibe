/** PR-9A — 템플릿 문서 ID (버전 접미, 규칙 마이그레이션 시 새 id) */
export const PK_CHALLENGE_TEMPLATE_ID = "pk_challenge_v1" as const;

/** 제출 시 rulesVersion — 점수 비교·재현성 (문서 schemaVersion 과 별개) */
export const PK_RULES_VERSION = "pk_rules_v1" as const;

/** PR-10B — 드리블 템플릿 (단일 모드 확장) */
export const DRIBBLE_CHALLENGE_TEMPLATE_ID = "dribble_challenge_v1" as const;

export const DRIBBLE_RULES_VERSION = "dribble_rules_v1" as const;

/** 친구 최고점 조회·비교 UI 상한 — 모든 async 챌린지 공통 */
export const CHALLENGE_FRIEND_SCORE_QUERY_LIMIT = 10 as const;

/** @deprecated `CHALLENGE_FRIEND_SCORE_QUERY_LIMIT` 사용 */
export const PK_FRIEND_SCORE_QUERY_LIMIT = CHALLENGE_FRIEND_SCORE_QUERY_LIMIT;

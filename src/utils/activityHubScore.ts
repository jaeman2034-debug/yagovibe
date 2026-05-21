/**
 * `activities.hubScore` — 사용자 비의존(글로벌) 정렬용 점수
 *
 * - 인기: like / comment
 * - 신뢰·리스크: 선택
 * - 네거티브: 신고/숨김/관심없음 집계(activities 필드) 가중 감점
 * - 시간: `exp(-λ·hours)` 감쇠 + 작성 직후 explore 부스트
 *
 * Cloud Functions `activityHubScoreFormula.ts`와 상수·공식 동기 유지.
 */

/** 시간당 감쇠 λ (경과 시간 = hour) */
export const ACTIVITY_HUB_DECAY_LAMBDA = 0.05;

export const ACTIVITY_HUB_EXPLORE_BOOST_MAX_HOURS = 2;
export const ACTIVITY_HUB_EXPLORE_BOOST = 5;

/** `activities.feedback*` 카운트 1건당 감점 (글로벌 노출 조절) */
export const ACTIVITY_HUB_PENALTY_PER_REPORT = 20;
export const ACTIVITY_HUB_PENALTY_PER_HIDE = 8;
export const ACTIVITY_HUB_PENALTY_PER_NOT_INTERESTED = 12;

export interface ActivityHubScoreInput {
  createdAtMillis: number;
  likeCount?: number;
  commentCount?: number;
  authorTrustScore?: number;
  riskScore?: number;
  feedbackReportCount?: number;
  feedbackHideCount?: number;
  feedbackNotInterestedCount?: number;
  nowMs?: number;
}

function readNonNegInt(n: unknown): number {
  if (typeof n === "number" && Number.isFinite(n) && n >= 0) {
    return Math.min(1_000_000, Math.floor(n));
  }
  return 0;
}

/**
 * Firestore에 저장할 hubScore (동일 입력이면 동일 출력)
 */
export function computeActivityHubScoreStored(input: ActivityHubScoreInput): number {
  const now = typeof input.nowMs === "number" && Number.isFinite(input.nowMs) ? input.nowMs : Date.now();
  const ms =
    typeof input.createdAtMillis === "number" && Number.isFinite(input.createdAtMillis)
      ? input.createdAtMillis
      : now;

  const hours = Math.max(0, (now - ms) / (1000 * 60 * 60));

  const likes = typeof input.likeCount === "number" && Number.isFinite(input.likeCount) ? input.likeCount : 0;
  const comments =
    typeof input.commentCount === "number" && Number.isFinite(input.commentCount) ? input.commentCount : 0;

  let base = likes * 4 + comments * 7;

  const t = input.authorTrustScore;
  if (typeof t === "number" && Number.isFinite(t)) {
    base += Math.min(100, Math.max(0, t)) * 0.25;
  }
  const r = input.riskScore;
  if (typeof r === "number" && Number.isFinite(r)) {
    base -= Math.min(100, Math.max(0, r)) * 1.2;
  }

  const reports = readNonNegInt(input.feedbackReportCount);
  const hides = readNonNegInt(input.feedbackHideCount);
  const notInterested = readNonNegInt(input.feedbackNotInterestedCount);
  base -=
    reports * ACTIVITY_HUB_PENALTY_PER_REPORT +
    hides * ACTIVITY_HUB_PENALTY_PER_HIDE +
    notInterested * ACTIVITY_HUB_PENALTY_PER_NOT_INTERESTED;

  const baseClamped = Math.max(0, base);
  const decay = Math.exp(-ACTIVITY_HUB_DECAY_LAMBDA * hours);
  let s = baseClamped * decay;

  if (hours < ACTIVITY_HUB_EXPLORE_BOOST_MAX_HOURS) {
    s += ACTIVITY_HUB_EXPLORE_BOOST;
  }

  return Math.round(Math.max(0, s) * 1000) / 1000;
}

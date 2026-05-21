/**
 * 클라이언트 `src/utils/activityHubScore.ts`와 동일 공식 (Functions 전용 복제)
 */

export const ACTIVITY_HUB_DECAY_LAMBDA = 0.05;
export const ACTIVITY_HUB_EXPLORE_BOOST_MAX_HOURS = 2;
export const ACTIVITY_HUB_EXPLORE_BOOST = 5;
export const ACTIVITY_HUB_PENALTY_PER_REPORT = 20;
export const ACTIVITY_HUB_PENALTY_PER_HIDE = 8;
export const ACTIVITY_HUB_PENALTY_PER_NOT_INTERESTED = 12;

function readNonNegInt(n: unknown): number {
  if (typeof n === "number" && Number.isFinite(n) && n >= 0) {
    return Math.min(1000000, Math.floor(n));
  }
  return 0;
}

export function computeActivityHubScoreStoredFn(a: {
  createdAtMillis: number;
  likeCount?: number;
  commentCount?: number;
  authorTrustScore?: number;
  riskScore?: number;
  feedbackReportCount?: number;
  feedbackHideCount?: number;
  feedbackNotInterestedCount?: number;
  nowMs?: number;
}): number {
  const now = typeof a.nowMs === "number" && Number.isFinite(a.nowMs) ? a.nowMs : Date.now();
  const ms =
    typeof a.createdAtMillis === "number" && Number.isFinite(a.createdAtMillis) ? a.createdAtMillis : now;

  const hours = Math.max(0, (now - ms) / (1000 * 60 * 60));

  const likes = typeof a.likeCount === "number" && Number.isFinite(a.likeCount) ? a.likeCount : 0;
  const comments = typeof a.commentCount === "number" && Number.isFinite(a.commentCount) ? a.commentCount : 0;

  let base = likes * 4 + comments * 7;

  const t = a.authorTrustScore;
  if (typeof t === "number" && Number.isFinite(t)) {
    base += Math.min(100, Math.max(0, t)) * 0.25;
  }
  const r = a.riskScore;
  if (typeof r === "number" && Number.isFinite(r)) {
    base -= Math.min(100, Math.max(0, r)) * 1.2;
  }

  const reports = readNonNegInt(a.feedbackReportCount);
  const hides = readNonNegInt(a.feedbackHideCount);
  const notInterested = readNonNegInt(a.feedbackNotInterestedCount);
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

interface ScoreInput {
  likesCount?: number;
  commentsCount?: number;
  createdAt?: any;
  score?: number;
}

/**
 * 인기 점수 계산:
 * 기본 상호작용 점수(score)가 있으면 사용하고,
 * 없으면 likes/comments로 계산한 뒤 시간 감쇠를 적용한다.
 */
export function calcScore(post: ScoreInput): number {
  const likeWeight = 1;
  const commentWeight = 2;
  const decayPerHour = 0.1;

  const interactionScore =
    typeof post.score === "number"
      ? post.score
      : (post.likesCount ?? 0) * likeWeight + (post.commentsCount ?? 0) * commentWeight;

  const createdAtMillis =
    typeof post.createdAt?.toDate === "function"
      ? post.createdAt.toDate().getTime()
      : typeof post.createdAt === "number"
        ? post.createdAt
        : Date.now();

  const ageHours = Math.max(0, (Date.now() - createdAtMillis) / (1000 * 60 * 60));
  return interactionScore - ageHours * decayPerHour;
}


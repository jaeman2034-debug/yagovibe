/**
 * 🔥 마켓 게시글 랭킹 점수 계산 유틸리티
 * 
 * 점수 공식:
 * rankScore = chatCount * 100 + likesCount * 10 + views
 * 
 * 가중치:
 * - 채팅: 100점 (가장 높은 가치 - 실제 거래 의도)
 * - 좋아요: 10점 (관심도)
 * - 조회수: 1점 (노출)
 */

/**
 * 🔥 랭킹 점수 계산
 * 
 * @param chatCount - 채팅 수
 * @param likesCount - 좋아요 수
 * @param views - 조회수
 * @returns 랭킹 점수
 */
export function calculateRankScore(
  chatCount: number = 0,
  likesCount: number = 0,
  views: number = 0
): number {
  return chatCount * 100 + likesCount * 10 + views;
}

/**
 * 🔥 게시글 데이터에서 랭킹 점수 계산
 * 
 * @param post - 게시글 데이터
 * @returns 랭킹 점수
 */
export function getPostRankScore(post: {
  chatCount?: number;
  likesCount?: number;
  views?: number;
  viewCount?: number; // 레거시 필드
  likeCount?: number; // 레거시 필드
}): number {
  const chatCount = post.chatCount || 0;
  const likesCount = post.likesCount || post.likeCount || 0; // 레거시 호환
  const views = post.views || post.viewCount || 0; // 레거시 호환
  
  return calculateRankScore(chatCount, likesCount, views);
}

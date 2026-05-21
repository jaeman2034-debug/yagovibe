/**
 * 🔥 마켓 게시글 랭킹 점수 갱신 서비스
 * 
 * 조회수/좋아요/채팅 생성 시 rankScore 자동 갱신
 * - 트랜잭션으로 원자적 업데이트
 * - Cloud Functions에서도 사용 가능
 */

import { doc, runTransaction, increment, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calculateRankScore } from "@/utils/marketRanking";

/**
 * 🔥 조회수 증가 및 rankScore 갱신
 * 
 * @param postId - 게시글 ID
 * @returns 조회수 증가 여부
 */
export async function incrementPostViews(postId: string): Promise<boolean> {
  try {
    const postRef = doc(db, "market", postId);
    
    await runTransaction(db, async (transaction) => {
      const postSnap = await transaction.get(postRef);
      
      if (!postSnap.exists()) {
        throw new Error(`게시글을 찾을 수 없습니다: ${postId}`);
      }
      
      const postData = postSnap.data();
      const currentViews = postData.views || postData.viewCount || 0;
      const currentLikesCount = postData.likesCount || postData.likeCount || 0;
      const currentChatCount = postData.chatCount || 0;
      
      // 조회수 증가
      const newViews = currentViews + 1;
      
      // rankScore 재계산
      const newRankScore = calculateRankScore(
        currentChatCount,
        currentLikesCount,
        newViews
      );
      
      // 업데이트
      transaction.update(postRef, {
        views: increment(1),
        rankScore: newRankScore,
        updatedAt: new Date(),
      });
    });
    
    return true;
  } catch (error) {
    console.error("❌ [incrementPostViews] 조회수 증가 실패:", error);
    return false;
  }
}

/**
 * 🔥 좋아요 증가 및 rankScore 갱신
 * 
 * @param postId - 게시글 ID
 * @returns 좋아요 증가 여부
 */
export async function incrementPostLikes(postId: string): Promise<boolean> {
  try {
    const postRef = doc(db, "market", postId);
    
    await runTransaction(db, async (transaction) => {
      const postSnap = await transaction.get(postRef);
      
      if (!postSnap.exists()) {
        throw new Error(`게시글을 찾을 수 없습니다: ${postId}`);
      }
      
      const postData = postSnap.data();
      const currentViews = postData.views || postData.viewCount || 0;
      const currentLikesCount = postData.likesCount || postData.likeCount || 0;
      const currentChatCount = postData.chatCount || 0;
      
      // 좋아요 증가
      const newLikesCount = currentLikesCount + 1;
      
      // rankScore 재계산
      const newRankScore = calculateRankScore(
        currentChatCount,
        newLikesCount,
        currentViews
      );
      
      // 업데이트
      transaction.update(postRef, {
        likesCount: increment(1),
        rankScore: newRankScore,
        updatedAt: new Date(),
      });
    });
    
    return true;
  } catch (error) {
    console.error("❌ [incrementPostLikes] 좋아요 증가 실패:", error);
    return false;
  }
}

/**
 * 🔥 좋아요 취소 및 rankScore 갱신
 * 
 * @param postId - 게시글 ID
 * @returns 좋아요 취소 여부
 */
export async function decrementPostLikes(postId: string): Promise<boolean> {
  try {
    const postRef = doc(db, "market", postId);
    
    await runTransaction(db, async (transaction) => {
      const postSnap = await transaction.get(postRef);
      
      if (!postSnap.exists()) {
        throw new Error(`게시글을 찾을 수 없습니다: ${postId}`);
      }
      
      const postData = postSnap.data();
      const currentViews = postData.views || postData.viewCount || 0;
      const currentLikesCount = Math.max(0, (postData.likesCount || postData.likeCount || 0) - 1);
      const currentChatCount = postData.chatCount || 0;
      
      // rankScore 재계산
      const newRankScore = calculateRankScore(
        currentChatCount,
        currentLikesCount,
        currentViews
      );
      
      // 업데이트
      transaction.update(postRef, {
        likesCount: increment(-1),
        rankScore: newRankScore,
        updatedAt: new Date(),
      });
    });
    
    return true;
  } catch (error) {
    console.error("❌ [decrementPostLikes] 좋아요 취소 실패:", error);
    return false;
  }
}

/**
 * 🔥 채팅 생성 시 rankScore 갱신
 * 
 * @param postId - 게시글 ID
 * @returns 채팅 카운트 증가 여부
 */
export async function incrementPostChatCount(postId: string): Promise<boolean> {
  try {
    const postRef = doc(db, "market", postId);
    
    await runTransaction(db, async (transaction) => {
      const postSnap = await transaction.get(postRef);
      
      if (!postSnap.exists()) {
        throw new Error(`게시글을 찾을 수 없습니다: ${postId}`);
      }
      
      const postData = postSnap.data();
      const currentViews = postData.views || postData.viewCount || 0;
      const currentLikesCount = postData.likesCount || postData.likeCount || 0;
      const currentChatCount = postData.chatCount || 0;
      
      // 채팅 카운트 증가
      const newChatCount = currentChatCount + 1;
      
      // rankScore 재계산 (채팅은 100점 가중치)
      const newRankScore = calculateRankScore(
        newChatCount,
        currentLikesCount,
        currentViews
      );
      
      // 업데이트
      transaction.update(postRef, {
        chatCount: increment(1),
        rankScore: newRankScore,
        updatedAt: new Date(),
      });
    });
    
    return true;
  } catch (error) {
    console.error("❌ [incrementPostChatCount] 채팅 카운트 증가 실패:", error);
    return false;
  }
}

/**
 * 🔥 게시글 생성 시 초기 rankScore 설정
 * 
 * @param postId - 게시글 ID
 */
export async function initializePostRankScore(postId: string): Promise<void> {
  try {
    const postRef = doc(db, "market", postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      throw new Error(`게시글을 찾을 수 없습니다: ${postId}`);
    }
    
    const postData = postSnap.data();
    
    // 이미 rankScore가 있으면 스킵
    if (postData.rankScore !== undefined) {
      return;
    }
    
    // 초기 rankScore 계산 (모두 0)
    const initialRankScore = calculateRankScore(0, 0, 0);
    
    await runTransaction(db, async (transaction) => {
      transaction.update(postRef, {
        views: 0,
        likesCount: 0,
        chatCount: 0,
        rankScore: initialRankScore,
      });
    });
    
    console.log(`✅ [initializePostRankScore] 초기 rankScore 설정: ${postId}`);
  } catch (error) {
    console.error("❌ [initializePostRankScore] 초기화 실패:", error);
  }
}

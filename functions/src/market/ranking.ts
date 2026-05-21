/**
 * 🔥 마켓 게시글 랭킹 점수 갱신 (Cloud Functions)
 * 
 * 서버 사이드에서 rankScore 자동 갱신
 * - 채팅 생성 시
 * - 조회수 증가 시 (클라이언트에서 호출)
 * - 좋아요 시 (클라이언트에서 호출)
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * 🔥 랭킹 점수 계산
 */
function calculateRankScore(
  chatCount: number = 0,
  likesCount: number = 0,
  views: number = 0
): number {
  return chatCount * 100 + likesCount * 10 + views;
}

/**
 * 🔥 채팅방 생성 시 rankScore 갱신
 */
export const onChatRoomCreated = functions.firestore
  .document("chatRooms/{chatRoomId}")
  .onCreate(async (snap, context) => {
    const chatData = snap.data();
    const postId = chatData.postId;
    
    if (!postId) {
      console.log("⚠️ [onChatRoomCreated] postId 없음, 스킵");
      return;
    }
    
    try {
      const postRef = db.collection("marketPosts").doc(postId);
      const postSnap = await postRef.get();
      
      if (!postSnap.exists) {
        console.log(`⚠️ [onChatRoomCreated] 게시글 없음: ${postId}`);
        return;
      }
      
      const postData = postSnap.data();
      const currentChatCount = postData?.chatCount || 0;
      const currentLikesCount = postData?.likesCount || postData?.likeCount || 0;
      const currentViews = postData?.views || postData?.viewCount || 0;
      
      // 채팅 카운트 증가
      const newChatCount = currentChatCount + 1;
      
      // rankScore 재계산
      const newRankScore = calculateRankScore(
        newChatCount,
        currentLikesCount,
        currentViews
      );
      
      await postRef.update({
        chatCount: admin.firestore.FieldValue.increment(1),
        rankScore: newRankScore,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log(`✅ [onChatRoomCreated] rankScore 갱신: ${postId} (${currentChatCount} → ${newChatCount}, 점수: ${newRankScore})`);
    } catch (error: any) {
      console.error(`❌ [onChatRoomCreated] rankScore 갱신 실패: ${postId}`, error);
    }
  });

/**
 * 🔥 게시글 생성 시 초기 rankScore 설정
 */
export const onMarketPostCreated = functions.firestore
  .document("marketPosts/{postId}")
  .onCreate(async (snap, context) => {
    const postData = snap.data();
    const postId = context.params.postId;
    
    // 이미 rankScore가 있으면 스킵
    if (postData.rankScore !== undefined) {
      return;
    }
    
    try {
      const initialRankScore = calculateRankScore(0, 0, 0);
      
      await snap.ref.update({
        views: 0,
        likesCount: 0,
        chatCount: 0,
        rankScore: initialRankScore,
      });
      
      console.log(`✅ [onMarketPostCreated] 초기 rankScore 설정: ${postId}`);
    } catch (error: any) {
      console.error(`❌ [onMarketPostCreated] 초기화 실패: ${postId}`, error);
    }
  });

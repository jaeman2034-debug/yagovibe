/**
 * 🔥 새 게시물 30분 부스트 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 게시물 생성 시 30분 부스트 적용
 * - 이미지 품질 ≥90점 조건
 * - 1회 채팅 발생 시 정상화
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";

const BOOST_DURATION_MS = 30 * 60 * 1000; // 30분
const BOOST_WEIGHT = 0.8; // +80% (강화)
const MIN_IMAGE_QUALITY = 95; // 🔥 94 → 95로 상향 (최종)

/**
 * 새 게시물 생성 시 30분 부스트 적용
 */
export const onNewPostCreated = onDocumentCreated(
  {
    document: "market/{postId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const post = event.data?.data();
    if (!post) return;

    const postId = event.params.postId;
    const createdAt = post.createdAt?.toDate() || new Date();
    const boostEndTime = new Date(createdAt.getTime() + BOOST_DURATION_MS);

    // 이미지 품질 체크
    const imageQuality = post.imageQuality || 0;
    if (imageQuality < MIN_IMAGE_QUALITY) {
      logger.info("[onNewPostCreated] 이미지 품질 미달, 부스트 미적용:", {
        postId,
        imageQuality,
      });
      return;
    }

    // 🔥 부스트 어뷰징 체크 (24h 3회 초과 또는 정지 중)
    const authorId = post.authorId;
    if (authorId) {
      // 사용자 정지 상태 확인
      const userRef = db.collection("users").doc(authorId);
      const userSnap = await userRef.get();
      
      if (userSnap.exists) {
        const userData = userSnap.data() as any;
        const suspendedUntil = userData.suspendedUntil?.toDate?.() || 
          (userData.suspendedUntil?.seconds ? 
            new Date(userData.suspendedUntil.seconds * 1000) : null);

        // 정지 중이면 부스트 제외
        if (suspendedUntil && suspendedUntil > new Date()) {
          logger.info("[onNewPostCreated] 정지 중 사용자, 부스트 미적용:", {
            postId,
            authorId,
            suspendedUntil: suspendedUntil.toISOString(),
          });
          await db.collection("market").doc(postId).update({
            boostBlocked: true,
            boostBlockReason: "USER_SUSPENDED",
            updatedAt: FieldValue.serverTimestamp(),
          });
          return;
        }

        // 24시간 내 부스트 횟수 체크
        const twentyFourHoursAgo = Timestamp.fromDate(
          new Date(Date.now() - 24 * 60 * 60 * 1000)
        );

        const recentBoostedPosts = await db
          .collection("market")
          .where("authorId", "==", authorId)
          .where("boostActive", "==", true)
          .where("boostStartTime", ">=", twentyFourHoursAgo)
          .get();

        if (recentBoostedPosts.size >= 3) {
          logger.info("[onNewPostCreated] 24h 3회 초과, 부스트 미적용:", {
            postId,
            authorId,
            boostCount: recentBoostedPosts.size,
          });
          await db.collection("market").doc(postId).update({
            boostBlocked: true,
            boostBlockReason: "FREQUENT_POSTING_24H",
            updatedAt: FieldValue.serverTimestamp(),
          });
          return;
        }
      }
    }

    // 부스트 정보 저장
    await db.collection("market").doc(postId).update({
      boostActive: true,
      boostWeight: BOOST_WEIGHT,
      boostStartTime: Timestamp.fromDate(createdAt),
      boostEndTime: Timestamp.fromDate(boostEndTime),
      boostChatCount: 0, // 채팅 발생 횟수
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info("[onNewPostCreated] 30분 부스트 적용:", {
      postId,
      boostEndTime: boostEndTime.toISOString(),
      imageQuality,
    });
  }
);

/**
 * 채팅 발생 시 부스트 정상화 체크
 */
export const onChatCreated = onDocumentCreated(
  {
    document: "chatRooms/{chatRoomId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const chat = event.data?.data();
    if (!chat) return;

    const postId = chat.postId;
    if (!postId) return;

    const postRef = db.collection("market").doc(postId);
    const postSnap = await postRef.get();

    if (!postSnap.exists) return;

    const post = postSnap.data() as any;

    // 부스트 활성 상태이고 첫 채팅인 경우
    if (post.boostActive && post.boostChatCount === 0) {
      // 채팅 카운트 증가
      await postRef.update({
        boostChatCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });

      logger.info("[onChatCreated] 부스트 게시물 첫 채팅 발생:", {
        postId,
        chatRoomId: event.params.chatRoomId,
      });

      // 부스트는 유지하되, 정상화 플래그 추가 (선택적)
      // 실제로는 부스트를 유지하는 것이 더 나을 수 있음
    }
  }
);

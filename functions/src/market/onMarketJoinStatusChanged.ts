/**
 * 🔥 매칭 참여 상태 변경 감지 (Cloud Function)
 * 
 * 역할:
 * - marketJoins 문서 상태 변경 감지
 * - 승인/거절 시 자동 알림 발송
 * - FCM + 인앱 이중 발송
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { admin as firebaseAdmin } from "../firebaseAdmin";
import { notifyMarketJoin } from "./notifyMarketJoin";
import { once, buildIdempotencyKey } from "../utils/idempotency";
import { connectChatRoom, disconnectChatRoom, connectRecruitGroup, disconnectRecruitGroup } from "./chatRoomService";
import { sendApprovalNotification, sendCancellationNotification } from "./notificationService";
import { log, logError, logMetric } from "../utils/logger";

const db = firebaseAdmin.firestore();

/**
 * 매칭 참여 상태 변경 감지
 * 
 * 트리거: marketJoins/{joinId} 문서 업데이트
 */
export const onMarketJoinStatusChanged = onDocumentUpdated(
  {
    document: "marketJoins/{joinId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    const joinId = event.params.joinId as string;

    if (!before || !after) {
      logger.info("[onMarketJoinStatusChanged] 데이터 없음:", { joinId });
      return;
    }

    // 🔥 상태 변경이 없으면 무시
    if (before.status === after.status) {
      logger.info("[onMarketJoinStatusChanged] 상태 변경 없음:", { joinId });
      return;
    }

    const postId = after.postId;
    const userId = after.userId;
    const newStatus = after.status;
    const oldStatus = before.status;

    logger.info("[onMarketJoinStatusChanged] 상태 변경 감지:", {
      joinId,
      postId,
      userId,
      oldStatus,
      newStatus,
    });

    try {
      // 🔥 게시글 정보 조회
      const postRef = db.doc(`market/${postId}`);
      const postSnap = await postRef.get();

      if (!postSnap.exists) {
        logger.warn("[onMarketJoinStatusChanged] 게시글 없음:", { postId });
        return;
      }

      const post = postSnap.data()!;
      const postTitle = post.title || "매칭";

      // 🔥 승인 시 currentPeople 증가 + 알림 발송 + 시스템 메시지 발송 (중복 방지)
      // 🔥 currentPeople 변경은 서버(Cloud Function)만 처리 (보안 강화)
      if (newStatus === "approved" && oldStatus === "pending") {
        // 🔥 Idempotency 키 생성 (중복 실행 방지)
        const idempotencyKey = buildIdempotencyKey("approved", postId, userId, joinId);
        
        // 🔥 멱등성 보장: 한 번만 실행
        await once(idempotencyKey, async () => {
          // 🔥 0. 인원 초과 체크 (race condition 방어 - 이중 체크)
          const beforeCurrentPeople = post.currentPeople || 0;
          const maxPeople = post.people || 0;
          
          // 🔥 인원 초과 시 자동 거절로 롤백
          if (maxPeople > 0 && beforeCurrentPeople >= maxPeople) {
            logger.warn("[onMarketJoinStatusChanged] 인원 초과로 자동 거절:", {
              postId,
              beforeCurrentPeople,
              maxPeople,
              joinId,
            });
            
            // 자동 거절로 롤백
            await db.doc(`marketJoins/${joinId}`).update({
              status: "rejected",
              rejectedReason: "FULL_AUTO",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            // 자동 거절 알림 발송
            await notifyMarketJoin(userId, {
              type: "JOIN_REJECTED_FULL",
              title: "매칭 참여 자동 거절",
              body: `"${postTitle}" 매칭이 모집 인원이 마감되어 자동 거절되었습니다.`,
              postId,
            });
            
            return; // 여기서 종료
          }
          
          // 🔥 인원수 증가
          const newCurrentPeople = beforeCurrentPeople + 1;
          const shouldClose = maxPeople > 0 && newCurrentPeople >= maxPeople;
          
          await postRef.update({
            currentPeople: newCurrentPeople,
            ...(shouldClose && {
              status: "done",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          logger.info("[onMarketJoinStatusChanged] 인원수 증가 완료:", {
            postId,
            beforeCurrentPeople,
            afterCurrentPeople: newCurrentPeople,
            shouldClose,
          });

        // 🔥 1. 채팅방 연결 (모집 단체방만 서버에서 처리)
        // 🔥 모집은 단체방: recruit_{postId} 형식
        // 🔥 중고거래는 클라이언트에서 buildChatRoomId로 처리 (서버 스킵)
        const isRecruit = post.category === "recruit" || post.type === "recruit" || post.category === "match";
        const chatRoomId = isRecruit
          ? await connectRecruitGroup({
              postId,
              userId,
              authorId: post.authorId,
              postTitle,
            })
          : null; // 🔥 중고거래는 클라이언트에서 처리하므로 서버에서는 스킵

        if (!chatRoomId) {
          logger.warn("[onMarketJoinStatusChanged] 채팅방 연결 실패 (계속 진행):", { postId, userId });
        } else {
          logger.info("[onMarketJoinStatusChanged] 채팅방 연결 완료:", { chatRoomId, postId, userId });
        }

        // 🔥 2. 시스템 메시지 발송 (중복 방지)
        if (chatRoomId) {
          try {
            const chatRoomRef = db.doc(`chatRooms/${chatRoomId}`);
            const messagesRef = chatRoomRef.collection("messages");
          
            // 🔥 같은 시스템 메시지가 이미 있는지 확인
            const existingMsgSnap = await messagesRef
              .where("type", "==", "system")
              .where("systemType", "==", "JOIN_APPROVED")
              .where("metadata.postId", "==", postId)
              .where("metadata.approvedUserId", "==", userId)
              .limit(1)
              .get();

            if (existingMsgSnap.empty) {
              await messagesRef.add({
                text: `🎉 "${postTitle}" 모집에 승인되었습니다!\n호스트와 일정을 조율하세요.`,
                type: "system",
                systemType: "JOIN_APPROVED",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                metadata: {
                  postId,
                  postTitle,
                  approvedUserId: userId,
                  idempotencyKey,
                },
              });
              
              // 채팅방 lastMessage 업데이트
              await chatRoomRef.update({
                lastMessage: `🎉 "${postTitle}" 모집에 승인되었습니다!`,
                lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              
              logger.info("[onMarketJoinStatusChanged] 시스템 메시지 발송 완료:", { chatRoomId });
            } else {
              logger.info("[onMarketJoinStatusChanged] 시스템 메시지 이미 존재 (중복 방지):", { chatRoomId });
            }
          } catch (msgError: any) {
            logger.error("[onMarketJoinStatusChanged] 시스템 메시지 발송 실패:", {
              chatRoomId,
              error: msgError.message,
            });
            // 시스템 메시지 실패해도 알림은 발송
          }
        }
        
        // 🔥 3. 알림 발송 (완성본 세트)
        const hostName =
          typeof post.authorName === "string" ? post.authorName.trim() : "";
        await sendApprovalNotification({
          userId,
          postId,
          postTitle,
          chatRoomId: chatRoomId || undefined,
          idempotencyKey,
          hostId: typeof post.authorId === "string" ? post.authorId : undefined,
          hostName: hostName || undefined,
          hostPhotoUrl:
            typeof post.authorPhotoUrl === "string"
              ? post.authorPhotoUrl.trim()
              : undefined,
          teamId: typeof post.teamId === "string" ? post.teamId : undefined,
          teamName:
            typeof post.teamName === "string" ? post.teamName.trim() : undefined,
        });

        // 🔥 4. 운영 로그 기록
        try {
          await db.collection("_marketJoinLogs").add({
            type: "APPROVED",
            joinId,
            postId,
            userId,
            postAuthorId: post.authorId,
            chatRoomId,
            idempotencyKey,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (logError: any) {
          logger.warn("[onMarketJoinStatusChanged] 로그 기록 실패 (무시):", {
            idempotencyKey,
            error: logError.message,
          });
        }
        }); // once() 종료
      }

      // 🔥 자동 거절 시 알림 발송 (FULL)
      if (
        newStatus === "rejected" &&
        oldStatus === "pending" &&
        after.rejectedReason === "FULL_AUTO"
      ) {
        await notifyMarketJoin(userId, {
          type: "JOIN_REJECTED_FULL",
          title: "매칭 참여 자동 거절",
          body: `"${postTitle}" 매칭이 모집 인원이 마감되어 자동 거절되었습니다.`,
          postId,
        });
      }

      // 🔥 수동 거절 시 알림 발송
      if (
        newStatus === "rejected" &&
        oldStatus === "pending" &&
        after.rejectedReason !== "FULL_AUTO"
      ) {
        await notifyMarketJoin(userId, {
          type: "JOIN_REJECTED",
          title: "매칭 참여 거절",
          body: `"${postTitle}" 매칭 참여가 거절되었습니다.`,
          postId,
        });
      }

      // 🔥 취소 시 처리 (pending/approved → cancelled_by_user / cancelled_by_author, 멱등성 적용)
      // 🔥 pending 취소도 처리하여 currentPeople 감소 보장
      if (
        (oldStatus === "pending" || oldStatus === "approved") &&
        (newStatus === "cancelled_by_user" || newStatus === "cancelled_by_author")
      ) {
        const cancelIdempotencyKey = buildIdempotencyKey("cancel", postId, userId, joinId);
        
        await once(cancelIdempotencyKey, async () => {
          await handleApprovedCancel({
            joinId,
            postId,
            userId,
            postAuthorId: post.authorId,
            postTitle,
            newStatus,
          });
        });
      }
    } catch (error: any) {
      logger.error("[onMarketJoinStatusChanged] 알림 발송 실패:", {
        joinId,
        error: error.message,
        stack: error.stack,
      });
      // 알림 실패해도 메인 로직은 계속 진행 (Fail-safe)
    }
  }
);

/**
 * 🔥 승인 취소 처리 (공통 로직)
 * 
 * 역할:
 * - currentPeople 감소
 * - 모집 상태 복구 (open)
 * - 시스템 메시지 발송
 * - 알림 생성
 * - 로그 기록
 */
export async function handleApprovedCancel(params: {
  joinId: string;
  postId: string;
  userId: string;
  postAuthorId: string;
  postTitle: string;
  newStatus: string;
}): Promise<void> {
  const { joinId, postId, userId, postAuthorId, postTitle, newStatus } = params;

  try {
    logger.info("[handleApprovedCancel] 승인 취소 처리 시작:", {
      joinId,
      postId,
      userId,
      newStatus,
    });

    // 🔥 1. 게시글 정보 조회 및 인원수 감소
    const postRef = db.doc(`market/${postId}`);
    const postSnap = await postRef.get();

    if (!postSnap.exists) {
      logger.warn("[handleApprovedCancel] 게시글 없음:", { postId });
      return;
    }

    const post = postSnap.data()!;
    const beforeCurrentPeople = post.currentPeople || 0;
    const maxPeople = post.people || 0;
    const nextCurrentPeople = Math.max(0, beforeCurrentPeople - 1);

    // 🔥 인원수 감소 및 상태 복구
    await postRef.update({
      currentPeople: nextCurrentPeople,
      // 인원이 max보다 작아지면 open으로 복구
      status: nextCurrentPeople < maxPeople ? "active" : post.status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("[handleApprovedCancel] 인원수 감소 완료:", {
      postId,
      beforeCurrentPeople,
      afterCurrentPeople: nextCurrentPeople,
    });

    // 🔥 2. 채팅방에서 참여자 제거 및 시스템 메시지 발송 (타입 분기)
    // 🔥 게시글 정보 조회 (모집/거래 구분) - 이미 위에서 조회했으므로 재사용
    const isRecruit = post.category === "recruit" || post.type === "recruit" || post.category === "match";
    
    if (isRecruit) {
      // 🔥 모집 단체방: disconnectRecruitGroup 사용
      await disconnectRecruitGroup({
        postId,
        userId,
      });
      
      // 🔥 시스템 메시지 발송 (모집 단체방)
      const chatRoomId = `recruit_${postId}`;
      const chatRoomRef = db.doc(`chatRooms/${chatRoomId}`);
      const chatRoomSnap = await chatRoomRef.get();
      
      if (chatRoomSnap.exists) {
        const existingData = chatRoomSnap.data();
        const existingMembers = existingData?.members || [];
        const willAuthorRemain = existingMembers.includes(postAuthorId) && existingMembers.length > 1;
        
        if (willAuthorRemain) {
        try {
          const messagesRef = chatRoomRef.collection("messages");
          await messagesRef.add({
            text: `⚠️ "${postTitle}" 참여가 취소되었습니다.`,
            type: "system",
            systemType: "JOIN_CANCELLED",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            metadata: {
              postId,
              postTitle,
              cancelledUserId: userId,
              cancelledBy: newStatus === "cancelled_by_user" ? "user" : "author",
            },
          });

          // 채팅방 lastMessage 업데이트
          await chatRoomRef.update({
            lastMessage: `⚠️ "${postTitle}" 참여가 취소되었습니다.`,
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          logger.info("[handleApprovedCancel] 시스템 메시지 발송 완료 (모집 단체방):", { chatRoomId });
        } catch (msgError: any) {
          logger.error("[handleApprovedCancel] 시스템 메시지 발송 실패:", {
            chatRoomId,
            error: msgError.message,
          });
        }
      } else {
        logger.info("[handleApprovedCancel] 작성자가 채팅방에 없어서 시스템 메시지 스킵 (모집 단체방):", { chatRoomId });
      }
      } else {
        logger.info("[handleApprovedCancel] 채팅방 없음 (스킵, 모집 단체방):", { chatRoomId });
      }
    } else {
      // 🔥 중고거래: 기존 로직 유지 (하위 호환)
      const chatRoomId = `${postId}_${userId}_${postAuthorId}`;
      const chatRoomRef = db.doc(`chatRooms/${chatRoomId}`);
      const chatRoomSnap = await chatRoomRef.get();

      if (chatRoomSnap.exists) {
        const existingData = chatRoomSnap.data();
        const existingParticipants = existingData?.participants || [];
        
        // 🔥 작성자가 아직 채팅방에 남아있는지 확인 (arrayRemove 전에 체크)
        const willAuthorRemain = existingParticipants.includes(postAuthorId) && 
                                 existingParticipants.length > 1;
        
        // 🔥 채팅방에서 참여자 제거 (arrayRemove 사용)
        if (existingParticipants.includes(userId)) {
          await chatRoomRef.update({
            participants: admin.firestore.FieldValue.arrayRemove(userId),
          });
          logger.info("[handleApprovedCancel] 채팅방에서 참여자 제거 (중고거래):", { chatRoomId, userId });
        } else {
          logger.info("[handleApprovedCancel] 참여자가 이미 채팅방에 없음 (중고거래):", { chatRoomId, userId });
        }

        // 🔥 3. 시스템 메시지 발송 (작성자가 남아있는 경우만)
        if (willAuthorRemain) {
          try {
            const messagesRef = chatRoomRef.collection("messages");
            await messagesRef.add({
              text: `⚠️ "${postTitle}" 참여가 취소되었습니다.`,
              type: "system",
              systemType: "JOIN_CANCELLED",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              metadata: {
                postId,
                postTitle,
                cancelledUserId: userId,
                cancelledBy: newStatus === "cancelled_by_user" ? "user" : "author",
              },
            });

            // 채팅방 lastMessage 업데이트
            await chatRoomRef.update({
              lastMessage: `⚠️ "${postTitle}" 참여가 취소되었습니다.`,
              lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            logger.info("[handleApprovedCancel] 시스템 메시지 발송 완료 (중고거래):", { chatRoomId });
          } catch (msgError: any) {
            logger.error("[handleApprovedCancel] 시스템 메시지 발송 실패:", {
              chatRoomId,
              error: msgError.message,
            });
          }
        } else {
          logger.info("[handleApprovedCancel] 작성자가 채팅방에 없어서 시스템 메시지 스킵 (중고거래):", { chatRoomId });
        }
      } else {
        logger.info("[handleApprovedCancel] 채팅방 없음 (스킵, 중고거래):", { chatRoomId });
      }
    }

    // 🔥 4. 알림 발송 (완성본 세트)
    const cancelIdempotencyKey = buildIdempotencyKey("cancel_noti", postId, userId, joinId);
    await sendCancellationNotification({
      userId,
      postId,
      postTitle,
      reason: newStatus === "cancelled_by_user" ? "사용자 취소" : "작성자 취소",
      idempotencyKey: cancelIdempotencyKey,
    });

    // 🔥 5. 운영 로그 기록
    try {
      await db.collection("_marketJoinLogs").add({
        type: "CANCELLED",
        joinId,
        postId,
        userId,
        postAuthorId,
        cancelledBy: newStatus === "cancelled_by_user" ? "user" : "author",
        beforeCurrentPeople,
        afterCurrentPeople: nextCurrentPeople,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      logger.info("[handleApprovedCancel] 운영 로그 기록 완료:", { joinId });
    } catch (logError: any) {
      logger.warn("[handleApprovedCancel] 로그 기록 실패 (무시):", {
        joinId,
        error: logError.message,
      });
    }

    logger.info("[handleApprovedCancel] 승인 취소 처리 완료:", {
      joinId,
      postId,
      userId,
    });
  } catch (error: any) {
    logger.error("[handleApprovedCancel] 승인 취소 처리 실패:", {
      joinId,
      postId,
      userId,
      error: error.message,
      stack: error.stack,
    });
    // 에러 발생해도 메인 로직은 계속 진행 (Fail-safe)
  }
}

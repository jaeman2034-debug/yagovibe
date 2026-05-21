/**
 * 🔥 채팅방 연결 서비스 (실전급 설계)
 * 
 * 역할:
 * - 승인 시 채팅방 자동 생성/연결
 * - 취소 시 채팅방 접근 차단
 * - 중복 방 생성 완전 차단
 */

import * as admin from "firebase-admin";
import { admin as firebaseAdmin } from "../firebaseAdmin";
import { logger } from "firebase-functions/v2";
import { log, logError } from "../utils/logger";

const db = firebaseAdmin.firestore();

/**
 * 🔥 P0-1: 모집 단체방 연결 (승인 시) - 트랜잭션 기반 idempotent 생성
 * 
 * 핵심 원칙:
 * - 서버가 유일한 생성자 (idempotent)
 * - 트랜잭션으로 중복 생성 방지
 * - 없으면 생성, 있으면 멤버만 추가
 * 
 * @param postId - 게시글 ID (roomId로 사용)
 * @param userId - 참여자 UID
 * @param authorId - 작성자 UID
 * @param postTitle - 게시글 제목 (선택)
 */
export async function connectRecruitGroup({
  postId,
  userId,
  authorId,
  postTitle,
}: {
  postId: string;
  userId: string;
  authorId: string;
  postTitle?: string;
}): Promise<string | null> {
  try {
    log("RECRUIT_GROUP_CONNECT_START", { postId, userId, authorId });

    // 🔥 roomId = recruit_${postId} (deterministic, trade와 충돌 방지)
    const roomId = `recruit_${postId}`;
    const roomRef = db.doc(`chatRooms/${roomId}`);

    // 🔥 게시글 정보 조회 (postSnapshot용)
    const postRef = db.doc(`market/${postId}`);
    const postSnap = await postRef.get();
    const postData = postSnap.exists ? postSnap.data() : null;

    // 🔥 P0-1: 트랜잭션으로 중복 생성 방지 (레이스 컨디션 완전 차단)
    let isNewRoom = false;
    let existingMembers: string[] = [];

    await db.runTransaction(async (transaction) => {
      const roomSnap = await transaction.get(roomRef);

      if (!roomSnap.exists) {
        // 🔥 1) 방 없으면 생성 (postSnapshot 포함)
        isNewRoom = true;
        
        const roomData: any = {
          postId,
          type: "recruit_group",
          authorId,
          // 🔥 participants와 members 둘 다 추가 (호환성)
          participants: [authorId, userId],
          members: [authorId, userId],
          roles: {
            [authorId]: "host",
            [userId]: "member",
          },
          status: "active", // 🔥 P1-2: 방 상태 필드 통일
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastMessage: postTitle
            ? `🎉 "${postTitle}" 모집에 승인되었습니다!`
            : "참여가 승인되었습니다.",
          lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
          unreadCount: {
            [authorId]: 0,
            [userId]: 0,
          },
        };

        // 🔥 P0-2: postSnapshot 추가 (모집글 삭제되어도 표시 가능)
        if (postData) {
          roomData.postSnapshot = {
            postId,
            authorId: postData.authorId || authorId,
            title: postData.title || postTitle || "무제",
            category: postData.category || "",
            location: postData.location || "",
            time: postData.time || "",
            maxPeople: postData.people || 0,
            currentPeople: postData.currentPeople || 0,
            status: postData.status === "done" ? "CLOSED" : "OPEN",
            imageUrl: postData.images?.[0] || postData.imageUrl || "",
            // 🔥 postDeletedAt은 모집글 삭제 시 서버에서 업데이트
            postDeletedAt: null,
          };
        } else {
          roomData.postSnapshot = null;
        }

        transaction.set(roomRef, roomData);
        log("RECRUIT_GROUP_CREATE", { roomId, postId, userId, authorId, hasPostSnapshot: !!roomData.postSnapshot });
      } else {
        // 🔥 2) 이미 있으면 멤버 추가 + postSnapshot 업데이트
        const existingData = roomSnap.data()!;
        existingMembers = existingData?.members || [];

        const updateData: any = {};

        if (!existingMembers.includes(userId)) {
          // 🔥 participants와 members 둘 다 업데이트 (호환성)
          updateData.participants = admin.firestore.FieldValue.arrayUnion(userId);
          updateData.members = admin.firestore.FieldValue.arrayUnion(userId);
          updateData[`roles.${userId}`] = "member";
          updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        }

        // 🔥 P0-2: postSnapshot 업데이트 (게시글 정보 변경 반영)
        if (postData) {
          updateData.postSnapshot = {
            postId,
            authorId: postData.authorId || authorId,
            title: postData.title || postTitle || "무제",
            category: postData.category || "",
            location: postData.location || "",
            time: postData.time || "",
            maxPeople: postData.people || 0,
            currentPeople: postData.currentPeople || 0,
            status: postData.status === "done" ? "CLOSED" : "OPEN",
            imageUrl: postData.images?.[0] || postData.imageUrl || "",
            // 🔥 기존 postDeletedAt 유지 (없으면 null)
            postDeletedAt: existingData?.postSnapshot?.postDeletedAt || null,
          };
        }

        if (Object.keys(updateData).length > 0) {
          transaction.update(roomRef, updateData);
          log("RECRUIT_GROUP_MEMBER_ADDED", { roomId, postId, userId, isNewMember: !existingMembers.includes(userId) });
        } else {
          log("RECRUIT_GROUP_MEMBER_EXISTS", { roomId, postId, userId });
        }
      }
    });

    // 🔥 트랜잭션 완료 후 알림 발송 (트랜잭션 외부에서 처리)
    if (!isNewRoom && !existingMembers.includes(userId)) {
      // 🔥 새 멤버 입장 알림 (기존 멤버들에게)
      try {
        const { sendNotification } = await import("./notificationService");
        
        // 🔥 새 멤버를 제외한 기존 멤버들에게 알림
        const existingMembersWithoutNew = existingMembers.filter((uid: string) => uid !== userId);
        
        await Promise.all(
          existingMembersWithoutNew.map((memberUid: string) =>
            sendNotification({
              userId: memberUid,
              type: "new_member",
              title: "새 멤버 입장",
              body: `새 멤버가 참여했습니다.`,
              link: `/app/chat/${roomId}`,
            }).catch((err) => {
              logError("RECRUIT_GROUP_NOTIFICATION_FAILED", err, { postId, userId, memberUid });
            })
          )
        );
      } catch (notifError: any) {
        logError("RECRUIT_GROUP_NOTIFICATION_FAILED", notifError, { postId, userId });
      }
    }

    return roomId;
  } catch (error: any) {
    // 🔥 트랜잭션 실패 시 재시도 가능하도록 에러 로깅
    logError("RECRUIT_GROUP_CONNECT_FAILED", error, { postId, userId, authorId });
    
    // 🔥 트랜잭션 충돌 시 재시도 가능하도록 null 반환 (상위에서 재시도 가능)
    if (error.code === 10) { // ABORTED
      logger.warn("[connectRecruitGroup] 트랜잭션 충돌, 재시도 가능:", { postId, userId });
    }
    
    // 실패해도 메인 로직은 계속 진행
    return null;
  }
}

/**
 * 🔥 채팅방 연결 (승인 시) - 기존 함수 (중고거래용, 하위 호환)
 * 
 * @param postId - 게시글 ID
 * @param userId - 참여자 UID
 * @param authorId - 작성자 UID
 * @param postTitle - 게시글 제목 (선택)
 */
/**
 * 🔥 중고거래 채팅방 연결 (사용 중단)
 * 
 * ⚠️ 주의: 중고거래는 클라이언트에서 buildChatRoomId를 사용하여 처리하므로
 * 이 함수는 더 이상 사용되지 않습니다.
 * 
 * 모집글은 connectRecruitGroup을 사용하세요.
 */
export async function connectChatRoom({
  postId,
  userId,
  authorId,
  postTitle,
}: {
  postId: string;
  userId: string;
  authorId: string;
  postTitle?: string;
}): Promise<string | null> {
  // 🔥 중고거래는 클라이언트에서 처리하므로 서버에서는 스킵
  logger.warn("[connectChatRoom] 이 함수는 더 이상 사용되지 않습니다. 중고거래는 클라이언트에서 처리됩니다.", {
    postId,
    userId,
    authorId,
  });
  return null;
}

/**
 * 🔥 채팅방 접근 차단 (취소/거절 시)
 * 
 * @param postId - 게시글 ID
 * @param userId - 참여자 UID
 */
/**
 * 🔥 중고거래 채팅방 연결 해제 (사용 중단)
 * 
 * ⚠️ 주의: 중고거래는 클라이언트에서 처리하므로
 * 이 함수는 더 이상 사용되지 않습니다.
 * 
 * 모집글은 disconnectRecruitGroup을 사용하세요.
 */
export async function disconnectChatRoom({
  postId,
  userId,
}: {
  postId: string;
  userId: string;
}): Promise<void> {
  // 🔥 중고거래는 클라이언트에서 처리하므로 서버에서는 스킵
  logger.warn("[disconnectChatRoom] 이 함수는 더 이상 사용되지 않습니다. 중고거래는 클라이언트에서 처리됩니다.", {
    postId,
    userId,
  });
  return;
}

/**
 * 🔥 모집 단체방에서 참여자 제거 (취소 시)
 * 
 * @param postId - 게시글 ID (roomId로 사용)
 * @param userId - 제거할 참여자 UID
 */
export async function disconnectRecruitGroup({
  postId,
  userId,
}: {
  postId: string;
  userId: string;
}): Promise<void> {
  try {
    log("RECRUIT_GROUP_DISCONNECT_START", { postId, userId });

    // 🔥 roomId = recruit_${postId}
    const roomId = `recruit_${postId}`;
    const roomRef = db.doc(`chatRooms/${roomId}`);
    const roomSnap = await roomRef.get();

    if (!roomSnap.exists) {
      logger.info("[disconnectRecruitGroup] 채팅방 없음 (스킵):", { roomId, userId });
      return;
    }

    const existingData = roomSnap.data();
    const existingMembers = existingData?.members || [];

    // 🔥 members와 participants에서 제거
    if (existingMembers.includes(userId)) {
      await roomRef.update({
        participants: admin.firestore.FieldValue.arrayRemove(userId),
        members: admin.firestore.FieldValue.arrayRemove(userId),
        [`roles.${userId}`]: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      log("RECRUIT_GROUP_MEMBER_REMOVED", { roomId, postId, userId });
    } else {
      logger.info("[disconnectRecruitGroup] 참여자가 이미 채팅방에 없음:", { roomId, userId });
    }
  } catch (error: any) {
    logError("RECRUIT_GROUP_DISCONNECT_FAILED", error, { postId, userId });
    // 실패해도 메인 로직은 계속 진행
  }
}

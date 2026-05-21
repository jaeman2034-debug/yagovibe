/**
 * 🔥 마켓 알림 서비스 v1
 * 
 * 마켓 관련 알림 생성 및 관리
 */

import { createNoti } from "@/lib/notifications/service";
import type { NotificationType } from "@/types/notification";

/**
 * 🔥 채팅 메시지 수신 알림 생성
 */
export async function notifyChatMessage(params: {
  recipientId: string; // 메시지를 받는 사람
  senderId: string; // 메시지를 보낸 사람
  chatRoomId: string;
  postId?: string;
  messagePreview?: string; // 메시지 미리보기
  /** 채팅방 진입 시 해당 메시지로 스크롤/하이라이트 */
  messageId?: string;
}): Promise<string> {
  return createNoti({
    userId: params.recipientId,
    type: "MARKET_CHAT_MESSAGE" as NotificationType,
    title: "새 메시지가 도착했습니다",
    body: params.messagePreview || "새로운 메시지를 확인해보세요",
    target: {
      screen: "chat",
      id: params.chatRoomId,
    },
    priority: "high",
    payload: {
      chatRoomId: params.chatRoomId,
      postId: params.postId,
      senderId: params.senderId,
      ...(params.messageId ? { messageId: params.messageId } : {}),
    },
  });
}

/**
 * 🔥 거래 완료 요청 알림 생성
 */
export async function notifyTransactionComplete(params: {
  buyerId: string; // 구매자에게 알림
  sellerId: string; // 판매자 ID (참조용)
  postId: string;
  postTitle?: string;
}): Promise<string> {
  return createNoti({
    userId: params.buyerId,
    type: "MARKET_TRANSACTION_COMPLETE" as NotificationType,
    title: "거래가 완료되었습니다",
    body: params.postTitle 
      ? `"${params.postTitle}" 거래가 완료되었습니다. 리뷰를 남겨주세요!`
      : "거래가 완료되었습니다. 리뷰를 남겨주세요!",
    target: {
      screen: "trade",
      id: params.postId,
    },
    priority: "high",
    payload: {
      postId: params.postId,
      sellerId: params.sellerId,
    },
  });
}

/**
 * 🔥 찜한 글 업데이트 알림 생성
 */
export async function notifyPostUpdated(params: {
  userId: string; // 찜한 사용자
  postId: string;
  postTitle?: string;
  updateType?: "price" | "status" | "description"; // 업데이트 유형
}): Promise<string> {
  let title = "찜한 상품이 업데이트되었습니다";
  let body = params.postTitle 
    ? `"${params.postTitle}" 상품 정보가 변경되었습니다`
    : "찜한 상품 정보가 변경되었습니다";

  // 업데이트 유형에 따른 메시지
  if (params.updateType === "price") {
    title = "찜한 상품 가격이 변경되었습니다";
    body = params.postTitle 
      ? `"${params.postTitle}" 가격이 변경되었습니다`
      : "찜한 상품 가격이 변경되었습니다";
  } else if (params.updateType === "status") {
    title = "찜한 상품 상태가 변경되었습니다";
    body = params.postTitle 
      ? `"${params.postTitle}" 상태가 변경되었습니다`
      : "찜한 상품 상태가 변경되었습니다";
  }

  return createNoti({
    userId: params.userId,
    type: "MARKET_POST_UPDATED" as NotificationType,
    title,
    body,
    target: {
      screen: "trade",
      id: params.postId,
    },
    priority: "normal",
    payload: {
      postId: params.postId,
      updateType: params.updateType,
    },
  });
}

/**
 * 🔥 내 글에 찜하기 알림 생성
 */
export async function notifyPostLiked(params: {
  authorId: string; // 글 작성자
  postId: string;
  postTitle?: string;
  likerId?: string; // 찜한 사람 ID (옵션)
}): Promise<string> {
  return createNoti({
    userId: params.authorId,
    type: "MARKET_POST_LIKED" as NotificationType,
    title: "누군가 내 상품을 찜했습니다",
    body: params.postTitle 
      ? `"${params.postTitle}" 상품을 찜한 사람이 있습니다`
      : "내 상품을 찜한 사람이 있습니다",
    target: {
      screen: "trade",
      id: params.postId,
    },
    priority: "low",
    payload: {
      postId: params.postId,
      likerId: params.likerId,
    },
  });
}

/**
 * 🔥 공지 기반 대화 타입 정의
 * Step 1: 공지 대화 자동 생성
 */

import type { Timestamp } from "firebase/firestore";

/**
 * 공지 기반 대화 스레드
 * 경로: /associations/{associationId}/noticeConversations/{conversationId}
 * 
 * conversationId = noticeId (1:1 매핑)
 */
export interface NoticeConversation {
  id: string;
  noticeId: string;              // 🔑 핵심 연결
  noticeTitle: string;            // 스냅샷 (변경 대비)
  status: "OPEN" | "CLOSED";
  createdAt: Timestamp;
  lastMessageAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * 대화 메시지
 * 경로: /associations/{associationId}/noticeConversations/{conversationId}/messages/{messageId}
 */
export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderType: "USER" | "ADMIN" | "SYSTEM";
  senderId: string | null;        // USER/ADMIN일 때 uid, SYSTEM일 때 null
  senderName?: string;            // 표시용 이름
  content: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}


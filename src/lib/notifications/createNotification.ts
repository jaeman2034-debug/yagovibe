/**
 * 🔔 알림 생성 유틸리티 (YAGO 알림 시스템)
 * 
 * 사용법:
 * ```ts
 * await createNotification({
 *   userId: 'user123',
 *   type: 'CHAT_MESSAGE',
 *   title: '새 메시지',
 *   message: '홍길동님이 메시지를 보냈습니다',
 *   target: { screen: 'chat', id: 'chatRoom123' },
 *   priority: 'high',
 *   payload: { chatRoomId: 'chatRoom123', senderId: 'sender123' }
 * });
 * ```
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Notification, NotificationType } from "@/types/notification";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  target?: Notification['target'];
  priority?: 'high' | 'normal' | 'low';
  payload?: Record<string, any>;
  actorId?: string;
  actorName?: string;
  actorPhotoUrl?: string;
  teamId?: string;
  teamName?: string;
  /** 채팅방 입장 시 해당 방 알림만 읽음 처리 */
  relatedChatId?: string;
  /** 운영 추적용(회비 등) */
  correlationId?: string;
  // 하위 호환성
  link?: string;
}

/**
 * 알림 생성
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<string> {
  try {
    const notificationRef = collection(db, "notifications");
    
    const notification: Omit<Notification, 'id'> = {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      target: params.target,
      priority: params.priority || 'normal',
      isRead: false,
      createdAt: serverTimestamp(),
      ...(params.payload && { payload: params.payload }),
      ...(params.actorId && { actorId: params.actorId }),
      ...(params.actorName && { actorName: params.actorName }),
      ...(params.actorPhotoUrl && { actorPhotoUrl: params.actorPhotoUrl }),
      ...(params.teamId && { teamId: params.teamId }),
      ...(params.teamName && { teamName: params.teamName }),
      ...(params.correlationId && { correlationId: params.correlationId }),
      ...(params.relatedChatId && { relatedChatId: params.relatedChatId }),
      // 하위 호환성
      ...(params.link && { link: params.link }),
    };
    
    const docRef = await addDoc(notificationRef, notification);
    
    console.log(`✅ [createNotification] 알림 생성: ${docRef.id}`, {
      type: params.type,
      userId: params.userId,
      target: params.target,
      correlationId: params.correlationId,
    });
    
    return docRef.id;
  } catch (error) {
    console.error("❌ [createNotification] 알림 생성 실패:", error);
    throw error;
  }
}

/**
 * 🔥 채팅방 읽음 처리 완전판 (lastReadAt 기반)
 * 
 * 역할:
 * - 방 진입/스크롤 하단 도달 시 자동 호출
 * - lastReadAt 업데이트 (읽음의 진실, SSOT)
 * - unreadCount 0으로 설정 (성능 캐시)
 * - 충돌 없는 안전한 업데이트 (setDoc merge)
 * 
 * 설계 원칙:
 * - lastReadAt이 읽음의 진실(SSOT)
 * - unreadCount는 파생값(성능 캐시)
 * - setDoc(merge) 사용으로 failed-precondition 완전 제거
 */

import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";

/**
 * 🔥 채팅방 읽음 처리 완전판 (충돌 없는 버전)
 * 
 * @param roomId 채팅방 ID
 * @param uid 사용자 ID
 */
export async function markRoomRead(roomId: string, uid: string): Promise<void> {
  const roomRef = doc(db, "chatRooms", roomId);
  
  try {
    // 🔥 방 존재 여부 확인 (선택적 - 없으면 조용히 종료)
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) {
      return; // 방이 없으면 조용히 종료 (에러 아님)
    }
    
    const room = roomSnap.data() as any;
    const lastMessageAt = room.lastMessageAt;
    const currentLastReadAt = room.lastReadAt || {};
    const myLastReadAt = currentLastReadAt[uid];
    
    // 🔥 읽음 처리 조건:
    // 1. lastMessageAt이 없으면 (메시지가 없으면) 무조건 읽음 처리 (채팅방 진입)
    // 2. lastMessageAt이 있고, 내가 읽은 시간이 마지막 메시지보다 이전이면 읽음 처리
    const shouldMarkRead = !lastMessageAt || 
      !myLastReadAt || 
      (myLastReadAt.toMillis && lastMessageAt.toMillis && myLastReadAt.toMillis() < lastMessageAt.toMillis());
    
    if (shouldMarkRead) {
      // 🔥 setDoc(merge) 사용으로 failed-precondition 완전 제거
      // merge: true로 기존 필드 보존하면서 부분 업데이트
      await setDoc(
        roomRef,
        {
          lastReadAt: {
            ...currentLastReadAt,
            [uid]: serverTimestamp(),
          },
          [`unreadCount.${uid}`]: 0,
          // 🔥 디버깅용 (선택적)
          lastReadAtUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error: any) {
    // 🔥 권한 없으면 조용히 처리
    if (error.code === "not-found" || error.code === "permission-denied") {
      return;
    }
    
    // 🔥 예상치 못한 에러만 로그 출력
    console.error("❌ [markRoomRead] 읽음 처리 실패:", { 
      roomId, 
      uid, 
      error: error.message || error 
    });
    // 🔥 에러를 throw하지 않음 (읽음 처리 실패해도 채팅은 정상 작동)
  }
}

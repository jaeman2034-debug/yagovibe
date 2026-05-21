/**
 * 🔥 채팅방 접근 권한 가드 훅
 * 
 * 역할:
 * - market 매칭 채팅방: marketJoins의 approved 상태 확인
 * - 일반 채팅방: participants 배열 확인
 */

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 채팅방 접근 권한 확인
 * @param userId - 현재 사용자 ID
 * @param chatRoomId - 채팅방 ID (형식: {postId}_{userId}_{authorId} 또는 일반 채팅방 ID)
 * @returns 승인 여부
 */
export async function canEnterChat(
  userId: string,
  chatRoomId: string
): Promise<boolean> {
  if (!userId || !chatRoomId) {
    return false;
  }

  try {
    // 1. 채팅방 정보 조회
    const roomRef = doc(db, "chatRooms", chatRoomId);
    const roomSnap = await roomRef.get();

    if (!roomSnap.exists()) {
      console.warn("⚠️ [canEnterChat] 채팅방이 존재하지 않습니다:", chatRoomId);
      return false;
    }

    const roomData = roomSnap.data();

    // 🔥 2단계: 채팅방 타입별 권한 검증
    const roomType = roomData?.type;
    const members = roomData?.members || roomData?.participants || [];
    
    // 🔥 모집 단체방 (teamRecruit_${postId} 형식)
    if (roomType === "recruit_group" || chatRoomId.startsWith("teamRecruit_") || chatRoomId.startsWith("recruit_")) {
      // 🔥 모집 단체방: members 배열 확인 (실서비스 안정성)
      const isMember = Array.isArray(members) && members.includes(userId);
      
      if (!isMember) {
        // 🔥 추가 검증: marketJoins에서 승인 상태 확인
        let postId = roomData?.postId;
        if (!postId) {
          // chatRoomId에서 postId 추출
          if (chatRoomId.startsWith("teamRecruit_")) {
            postId = chatRoomId.replace("teamRecruit_", "");
          } else if (chatRoomId.startsWith("recruit_")) {
            postId = chatRoomId.replace("recruit_", "");
          }
        }
        
        if (postId) {
          const joinId = `${postId}_${userId}`;
          const joinRef = doc(db, "marketJoins", joinId);
          const joinSnap = await joinRef.get();
          
          if (joinSnap.exists()) {
            const joinData = joinSnap.data();
            const isApproved = joinData?.status === "approved";
            
            console.log("🔍 [canEnterChat] 모집 단체방 권한 확인 (marketJoins):", {
              chatRoomId,
              postId,
              joinId,
              status: joinData?.status,
              isApproved,
            });
            
            return isApproved;
          }
        }
        
        console.warn("⚠️ [canEnterChat] 모집 단체방 멤버가 아닙니다:", {
          chatRoomId,
          userId,
          members,
        });
        return false;
      }
      
      console.log("✅ [canEnterChat] 모집 단체방 멤버 확인:", {
        chatRoomId,
        userId,
        members,
      });
      return true;
    }
    
    // 🔥 중고거래 채팅방 (productId 존재)
    if (roomData?.productId) {
      // 🔥 중고거래 채팅방: members 배열 확인
      const isMember = Array.isArray(members) && members.includes(userId);
      
      if (isMember) {
        console.log("✅ [canEnterChat] 중고거래 채팅방 멤버 확인:", {
          chatRoomId,
          userId,
          members,
        });
        return true;
      }
      
      // 🔥 하위 호환: participants 배열 확인
      const participants = roomData?.participants || [];
      const isParticipant = Array.isArray(participants) && participants.includes(userId);
      
      console.log("🔍 [canEnterChat] 중고거래 채팅방 권한 확인:", {
        chatRoomId,
        participants,
        userId,
        isParticipant,
      });
      
      return isParticipant;
    }
    
    // 🔥 일반 채팅방: members 또는 participants 배열 확인
    const isMember = Array.isArray(members) && members.includes(userId);
    const participants = roomData?.participants || [];
    const isParticipant = Array.isArray(participants) && participants.includes(userId);
    
    const hasAccess = isMember || isParticipant;
    
    console.log("🔍 [canEnterChat] 일반 채팅방 권한 확인:", {
      chatRoomId,
      members,
      participants,
      userId,
      hasAccess,
    });
    
    return hasAccess;
  } catch (error: any) {
    console.error("❌ [canEnterChat] 권한 확인 실패:", error);
    return false;
  }
}

/**
 * 채팅방 접근 권한 확인 훅
 */
export function useChatGuard(userId: string | null, chatRoomId: string | null) {
  const [allowed, setAllowed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !chatRoomId) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    canEnterChat(userId, chatRoomId)
      .then((result) => {
        setAllowed(result);
        setLoading(false);
      })
      .catch((err: any) => {
        console.error("❌ [useChatGuard] 권한 확인 실패:", err);
        setError(err.message);
        setAllowed(false);
        setLoading(false);
      });
  }, [userId, chatRoomId]);

  return { allowed, loading, error };
}

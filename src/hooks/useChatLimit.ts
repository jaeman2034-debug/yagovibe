/**
 * 🔥 채팅 제한 훅 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 미인증 사용자 채팅 3회 제한
 * - 인증 상태 확인
 */

import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";

interface ChatLimitResult {
  canChat: boolean;
  remainingChats: number;
  isVerified: boolean;
  limit: number;
}

const MAX_CHATS_FOR_UNVERIFIED = 0; // 미인증 사용자 채팅 0회 (읽기만 가능)

/**
 * 사용자 인증 상태 확인
 */
async function checkUserVerification(uid: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (!userDoc.exists()) return false;

    const userData = userDoc.data();
    const trustTier = userData.trustTier;
    const faceToFaceVerified = userData.faceToFaceVerified === true;
    const realNameVerified = userData.realNameVerified === true;

    // 🔥 verified 이상이면 인증된 것으로 간주
    if (trustTier === "verified" || trustTier === "host") {
      return true;
    }

    // 🔥 대면 또는 실명 인증이 있으면 인증된 것으로 간주
    if (faceToFaceVerified || realNameVerified) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("❌ [useChatLimit] 인증 상태 확인 실패:", error);
    return false;
  }
}

/**
 * 오늘 보낸 채팅 메시지 수 계산
 */
async function getTodayChatCount(uid: string): Promise<number> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 🔥 모든 채팅방에서 오늘 보낸 메시지 수 집계
    const chatRoomsSnap = await getDocs(
      query(
        collection(db, "chatRooms"),
        where("participants", "array-contains", uid)
      )
    );

    let totalCount = 0;

    for (const chatRoomDoc of chatRoomsSnap.docs) {
      const messagesSnap = await getDocs(
        query(
          collection(db, "chatRooms", chatRoomDoc.id, "messages"),
          where("senderId", "==", uid),
          where("createdAt", ">=", todayStart)
        )
      );

      totalCount += messagesSnap.size;
    }

    return totalCount;
  } catch (error) {
    console.error("❌ [useChatLimit] 오늘 채팅 수 계산 실패:", error);
    return 0;
  }
}

/**
 * 채팅 제한 확인 훅
 */
export function useChatLimit(): ChatLimitResult {
  const { user } = useAuth();
  const [canChat, setCanChat] = useState(true);
  const [remainingChats, setRemainingChats] = useState(MAX_CHATS_FOR_UNVERIFIED);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLimit = async () => {
      if (!user?.uid) {
        setCanChat(false);
        setRemainingChats(0);
        setIsVerified(false);
        setLoading(false);
        return;
      }

      try {
        // 🔥 인증 상태 확인
        const verified = await checkUserVerification(user.uid);
        setIsVerified(verified);

        if (verified) {
          // 🔥 인증된 사용자는 제한 없음
          setCanChat(true);
          setRemainingChats(Infinity);
        } else {
          // 🔥 미인증 사용자는 오늘 보낸 채팅 수 확인
          const todayChatCount = await getTodayChatCount(user.uid);
          const remaining = Math.max(0, MAX_CHATS_FOR_UNVERIFIED - todayChatCount);

          setRemainingChats(remaining);
          setCanChat(remaining > 0);
        }
      } catch (error) {
        console.error("❌ [useChatLimit] 채팅 제한 확인 실패:", error);
        setCanChat(false);
        setRemainingChats(0);
      } finally {
        setLoading(false);
      }
    };

    checkLimit();
  }, [user?.uid]);

  return {
    canChat,
    remainingChats: isVerified ? Infinity : remainingChats,
    isVerified,
    limit: MAX_CHATS_FOR_UNVERIFIED,
  };
}

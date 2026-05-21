/**
 * 🔥 차단 필터 훅
 * 
 * 역할:
 * - 차단된 사용자 메시지 필터링
 * - 실시간 차단 목록 구독
 * - Trade/Recruit 공통
 */

import { useEffect, useState, useMemo } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 차단 필터 훅
 */
export function useBlockFilter(myUid: string | null, messages: any[]) {
  const [blocks, setBlocks] = useState<Record<string, any>>({});

  // 🔥 실시간 차단 목록 구독
  useEffect(() => {
    if (!myUid) {
      setBlocks({});
      return;
    }

    const blockRef = doc(db, "blocks", myUid);
    const unsubscribe = onSnapshot(
      blockRef,
      (snap) => {
        const data = snap.data();
        setBlocks(data?.blocked || {});
      },
      (error) => {
        console.error("❌ [useBlockFilter] 차단 목록 구독 실패:", error);
        setBlocks({});
      }
    );

    return () => unsubscribe();
  }, [myUid]);

  // 🔥 차단된 사용자 메시지 필터링
  const filteredMessages = useMemo(() => {
    if (!myUid || Object.keys(blocks).length === 0) {
      return messages;
    }

    return messages.filter((msg) => {
      // 시스템 메시지는 항상 표시
      if (!msg.senderId || msg.type === "system") {
        return true;
      }

      // 차단된 사용자 메시지 숨김
      return !blocks[msg.senderId];
    });
  }, [messages, blocks, myUid]);

  return {
    filteredMessages,
    blocks,
    isBlocked: (uid: string) => !!blocks[uid],
  };
}

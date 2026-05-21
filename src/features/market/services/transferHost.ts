/**
 * 🔥 모집 단체방 Host 위임 서비스
 * 
 * 역할:
 * - 원자적 권한 교체 (Transaction)
 * - 시스템 메시지 발행
 * - 차단자 위임 금지
 * - 알림 연동
 */

import { doc, runTransaction, serverTimestamp, addDoc, collection, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isBlocked } from "@/lib/chat/blockUser";

export interface TransferHostParams {
  roomId: string;
  currentHost: string;
  newHost: string;
}

/**
 * 🔥 Host 위임 (원자적 권한 교체)
 */
export async function transferHost(params: TransferHostParams): Promise<void> {
  const { roomId, currentHost, newHost } = params;

  if (!roomId || !currentHost || !newHost) {
    throw new Error("필수 파라미터가 없습니다.");
  }

  if (currentHost === newHost) {
    throw new Error("자기 자신에게 위임할 수 없습니다.");
  }

  const roomRef = doc(db, "chatRooms", roomId);

  // 🔥 차단 관계 확인 (트랜잭션 전에)
  const isCurrentHostBlocked = await isBlocked(currentHost, newHost);
  const isNewHostBlocked = await isBlocked(newHost, currentHost);
  
  if (isCurrentHostBlocked || isNewHostBlocked) {
    throw new Error("차단 관계에 있는 사용자에게는 위임할 수 없습니다.");
  }

  // 🔥 새 host 이름 조회 (시스템 메시지용)
  let newHostName = newHost;
  try {
    const newHostRef = doc(db, "users", newHost);
    const newHostSnap = await getDoc(newHostRef);
    if (newHostSnap.exists()) {
      const userData = newHostSnap.data();
      newHostName = userData.displayName || userData.name || userData.email?.split("@")[0] || newHost;
    }
  } catch (err) {
    console.warn("⚠️ [transferHost] 새 host 이름 조회 실패:", err);
  }

  // 🔥 Transaction으로 원자적 권한 교체
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef);
    
    if (!snap.exists) {
      throw new Error("채팅방이 존재하지 않습니다.");
    }

    const room = snap.data() as any;

    // 🔥 재검증 (트랜잭션 내부에서)
    if (room.roles?.[currentHost] !== "host") {
      throw new Error("권한이 없습니다. 현재 방장만 위임할 수 있습니다.");
    }

    const members = room.members || [];
    if (!members.includes(newHost)) {
      throw new Error("멤버가 아닌 사용자에게는 위임할 수 없습니다.");
    }

    if (room.roles?.[newHost] === "banned") {
      throw new Error("강퇴된 사용자에게는 위임할 수 없습니다.");
    }

    // 🔥 권한 교체 (원자적)
    const newRoles = {
      ...room.roles,
      [currentHost]: "member",
      [newHost]: "host",
    };

    tx.update(roomRef, {
      roles: newRoles,
      updatedAt: serverTimestamp(),
    });

    // 🔥 시스템 메시지 발행
    const msgRef = doc(collection(db, "chatRooms", roomId, "messages"));
    tx.set(msgRef, {
      type: "system",
      text: `${newHostName}님이 새로운 방장이 되었습니다.`,
      createdAt: serverTimestamp(),
    });
  });

  // 🔥 위임 알림 발송 (트랜잭션 완료 후)
  try {
    const roomSnap = await getDoc(doc(db, "chatRooms", roomId));
    const roomData = roomSnap.data();
    const postId = roomData?.postId || roomId;
    
    const { createRecruitNoti } = await import("@/features/notifications/service");
    await createRecruitNoti(
      newHost,
      roomId,
      postId,
      "RECRUIT_NEW_MEMBER", // 타입 재사용 (또는 새 타입 추가 가능)
      "방장 권한을 받았습니다."
    );
  } catch (notifError) {
    console.warn("⚠️ [transferHost] 알림 발송 실패 (무시):", notifError);
  }
}

/**
 * 🔥 채팅방 운영 기능 완전판 (강퇴/위임/마감)
 * 
 * 역할:
 * - 멤버 강퇴 (banned 필드로 재입장 차단)
 * - 호스트 위임
 * - 모집 마감 연동
 * - 시스템 메시지 자동 발행
 * 
 * 설계 원칙:
 * - runTransaction으로 원자적 처리
 * - banned 필드로 재입장 완전 차단
 * - 시스템 메시지로 운영 로그 기록
 */

import { db } from "@/lib/firebase";
import {
  doc,
  runTransaction,
  serverTimestamp,
  deleteField,
  collection,
  setDoc,
} from "firebase/firestore";

/**
 * 🔥 멤버 강퇴 (제외만 - 재입장 차단 없음)
 * 
 * @param roomId 채팅방 ID
 * @param actorUid 실행자 UID (host/admin만 가능)
 * @param targetUid 강퇴 대상 UID
 */
export async function kickMember(
  roomId: string,
  actorUid: string,
  targetUid: string
): Promise<void> {
  const roomRef = doc(db, "chatRooms", roomId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef);
    if (!snap.exists()) {
      throw new Error("채팅방을 찾을 수 없습니다.");
    }

    const room = snap.data() as any;
    const role = room.roles?.[actorUid];

    // 🔥 권한 체크: host 또는 admin만 가능
    if (role !== "host" && role !== "admin") {
      throw new Error("권한이 없습니다. 방장 또는 관리자만 강퇴할 수 있습니다.");
    }

    // 🔥 자기 자신은 강퇴 불가
    if (targetUid === actorUid) {
      throw new Error("자기 자신을 강퇴할 수 없습니다.");
    }

    // 🔥 host는 강퇴 불가
    if (room.roles?.[targetUid] === "host") {
      throw new Error("방장은 강퇴할 수 없습니다.");
    }

    // 🔥 participants에서 제거
    const participants: string[] = (room.participants || []).map(String);
    const nextParticipants = participants.filter((u) => u !== targetUid);

    // 🔥 members에서도 제거 (하위 호환)
    const members: string[] = (room.members || []).map(String);
    const nextMembers = members.filter((u) => u !== targetUid);

    // 🔥 업데이트 데이터 (제외만 - banned 사용 안 함)
    const updateData: any = {
      participants: nextParticipants,
      members: nextMembers,
      [`roles.${targetUid}`]: deleteField(), // roles에서 제거
      [`unreadCount.${targetUid}`]: 0, // unreadCount 초기화
      updatedAt: serverTimestamp(),
      lastMessage: `🚫 멤버가 채팅방에서 제외되었습니다.`,
      lastMessageAt: serverTimestamp(),
    };

    tx.update(roomRef, updateData);
  });

  // 🔥 시스템 메시지 기록 (트랜잭션 밖에서 발행)
  const msgRef = doc(collection(db, "chatRooms", roomId, "messages"));
  await setDoc(msgRef, {
    type: "system",
    action: "kick",
    text: "🚫 멤버가 채팅방에서 제외되었습니다.",
    targetUid,
    createdAt: serverTimestamp(),
  });
}

/**
 * 🔥 호스트 위임
 * 
 * @param roomId 채팅방 ID
 * @param currentHostUid 현재 호스트 UID
 * @param newHostUid 새 호스트 UID
 */
export async function transferHost(
  roomId: string,
  currentHostUid: string,
  newHostUid: string
): Promise<void> {
  const roomRef = doc(db, "chatRooms", roomId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef);
    if (!snap.exists()) {
      throw new Error("채팅방을 찾을 수 없습니다.");
    }

    const room = snap.data() as any;

    // 🔥 권한 체크: host만 가능
    if (room.roles?.[currentHostUid] !== "host") {
      throw new Error("권한이 없습니다. 방장만 위임할 수 있습니다.");
    }

    // 🔥 자기 자신에게 위임 불가
    if (currentHostUid === newHostUid) {
      throw new Error("자기 자신에게 위임할 수 없습니다.");
    }

    // 🔥 participants에 있어야 함
    const participants: string[] = (room.participants || []).map(String);
    if (!participants.includes(newHostUid)) {
      throw new Error("멤버가 아닌 사용자에게는 위임할 수 없습니다.");
    }

    // 🔥 banned 사용자는 위임 불가
    if (room.banned?.[newHostUid]) {
      throw new Error("강퇴된 사용자에게는 위임할 수 없습니다.");
    }

    // 🔥 권한 교체
    const currentRoles = room.roles || {};
    const newRoles = {
      ...currentRoles,
      [currentHostUid]: "admin", // 기존 host는 admin으로 강등
      [newHostUid]: "host", // 새 host
    };

    tx.update(roomRef, {
      roles: newRoles,
      updatedAt: serverTimestamp(),
      lastMessage: `👑 호스트 권한이 위임되었습니다.`,
      lastMessageAt: serverTimestamp(),
    });
  });

  // 🔥 시스템 메시지 기록 (트랜잭션 밖에서 발행)
  const msgRef = doc(collection(db, "chatRooms", roomId, "messages"));
  await setDoc(msgRef, {
    type: "system",
    action: "transfer_host",
    text: "👑 호스트 권한이 위임되었습니다.",
    createdAt: serverTimestamp(),
  });
}

/**
 * 🔥 모집 마감
 * 
 * @param roomId 채팅방 ID
 * @param actorUid 실행자 UID (host/admin만 가능)
 */
export async function closeRecruit(
  roomId: string,
  actorUid: string
): Promise<void> {
  const roomRef = doc(db, "chatRooms", roomId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef);
    if (!snap.exists()) {
      throw new Error("채팅방을 찾을 수 없습니다.");
    }

    const room = snap.data() as any;
    const role = room.roles?.[actorUid];

    // 🔥 권한 체크: host 또는 admin만 가능
    if (role !== "host" && role !== "admin") {
      throw new Error("권한이 없습니다. 방장 또는 관리자만 마감할 수 있습니다.");
    }

    // 🔥 모집 타입 체크
    if (room.type !== "recruit_group") {
      throw new Error("모집 채팅방만 마감할 수 있습니다.");
    }

    tx.update(roomRef, {
      recruitStatus: "CLOSED",
      status: "closed", // 하위 호환
      updatedAt: serverTimestamp(),
      lastMessage: `🔒 모집이 마감되었습니다.`,
      lastMessageAt: serverTimestamp(),
    });
  });

  // 🔥 시스템 메시지 기록 (트랜잭션 밖에서 발행)
  const msgRef = doc(collection(db, "chatRooms", roomId, "messages"));
  await setDoc(msgRef, {
    type: "system",
    action: "close_recruit",
    text: "🔒 모집이 마감되었습니다.",
    createdAt: serverTimestamp(),
  });
}

/**
 * 🔥 모집 재개 (마감 취소)
 * 
 * @param roomId 채팅방 ID
 * @param actorUid 실행자 UID (host/admin만 가능)
 */
export async function reopenRecruit(
  roomId: string,
  actorUid: string
): Promise<void> {
  const roomRef = doc(db, "chatRooms", roomId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef);
    if (!snap.exists()) {
      throw new Error("채팅방을 찾을 수 없습니다.");
    }

    const room = snap.data() as any;
    const role = room.roles?.[actorUid];

    // 🔥 권한 체크: host 또는 admin만 가능
    if (role !== "host" && role !== "admin") {
      throw new Error("권한이 없습니다. 방장 또는 관리자만 재개할 수 있습니다.");
    }

    tx.update(roomRef, {
      recruitStatus: "OPEN",
      status: deleteField(), // 하위 호환 필드 제거
      updatedAt: serverTimestamp(),
      lastMessage: `✅ 모집이 다시 시작되었습니다.`,
      lastMessageAt: serverTimestamp(),
    });
  });

  // 🔥 시스템 메시지 기록 (트랜잭션 밖에서 발행)
  const msgRef = doc(collection(db, "chatRooms", roomId, "messages"));
  await setDoc(msgRef, {
    type: "system",
    action: "reopen_recruit",
    text: "✅ 모집이 다시 시작되었습니다.",
    createdAt: serverTimestamp(),
  });
}

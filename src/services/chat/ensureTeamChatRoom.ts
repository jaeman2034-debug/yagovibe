/**
 * 🔥 팀 채팅방 자동 생성/보장 서비스
 * 
 * 역할:
 * - 팀 채팅방이 없으면 자동 생성
 * - 있으면 기존 채팅방 반환
 * - 팀 멤버 전원 자동 참여
 * - 이후 팀 가입/탈퇴 시 멤버 동기화 (Cloud Function에서 처리)
 */

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export interface TeamChatRoom {
  id: string;
  type: "team";
  teamId: string;
  name: string;
  members: string[];
  createdBy: string;
  createdAt: any;
  lastMessage: string;
  lastMessageAt: any;
  unreadCount?: Record<string, number>;
}

/**
 * 팀 채팅방 생성 또는 조회 (보장 함수)
 * 
 * @param teamId 팀 ID
 * @returns 채팅방 ID
 */
export async function ensureTeamChatRoom(teamId: string): Promise<string> {
  if (!teamId) {
    throw new Error("팀 ID가 필요합니다.");
  }

  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error("로그인이 필요합니다.");
  }

  console.log("🔍 [ensureTeamChatRoom] 팀 채팅방 확인 시작:", { teamId, userId });

  // 1️⃣ 기존 팀 채팅방 검색
  const chatRoomsQuery = query(
    collection(db, "chatRooms"),
    where("teamId", "==", teamId),
    where("type", "==", "team")
  );

  const existingRooms = await getDocs(chatRoomsQuery);

  if (!existingRooms.empty) {
    // 기존 채팅방이 있으면 반환
    const existingRoom = existingRooms.docs[0];
    const roomData = existingRoom.data();
    const roomId = existingRoom.id;

    console.log("✅ [ensureTeamChatRoom] 기존 채팅방 발견:", {
      roomId,
      memberCount: roomData.members?.length || 0,
    });

    // 사용자가 멤버에 없으면 추가
    if (!roomData.members?.includes(userId)) {
      console.log("➕ [ensureTeamChatRoom] 사용자를 멤버에 추가:", userId);
      
      // 채팅방 members 배열 업데이트
      const roomRef = doc(db, "chatRooms", roomId);
      const { updateDoc } = await import("firebase/firestore");
      await updateDoc(roomRef, {
        members: [...(roomData.members || []), userId],
      });
      
      console.log("✅ [ensureTeamChatRoom] 멤버 추가 완료 (Cloud Function이 최종 동기화)");
    }

    return roomId;
  }

  // 2️⃣ 새 팀 채팅방 생성
  console.log("🆕 [ensureTeamChatRoom] 새 채팅방 생성 시작");

  // 팀 정보 조회
  const teamRef = doc(db, "teams", teamId);
  const teamSnap = await getDoc(teamRef);

  if (!teamSnap.exists()) {
    throw new Error("팀을 찾을 수 없습니다.");
  }

  const teamData = teamSnap.data();
  const teamName = teamData.name || "팀";

  // 팀 멤버 목록 조회
  const membersRef = collection(db, "teams", teamId, "members");
  const membersSnap = await getDocs(membersRef);

  const memberIds: string[] = [];

  // ownerUid 추가
  if (teamData.ownerUid && !memberIds.includes(teamData.ownerUid)) {
    memberIds.push(teamData.ownerUid);
  }

  // owners 배열 추가
  if (teamData.owners && Array.isArray(teamData.owners)) {
    teamData.owners.forEach((uid: string) => {
      if (!memberIds.includes(uid)) {
        memberIds.push(uid);
      }
    });
  }

  // members 서브컬렉션에서 멤버 추가
  membersSnap.docs.forEach((memberDoc) => {
    const memberUid = memberDoc.id;
    if (!memberIds.includes(memberUid)) {
      memberIds.push(memberUid);
    }
  });

  // 현재 사용자도 추가 (없는 경우)
  if (!memberIds.includes(userId)) {
    memberIds.push(userId);
  }

  console.log("👥 [ensureTeamChatRoom] 팀 멤버 목록:", {
    memberCount: memberIds.length,
    members: memberIds,
  });

  // 채팅방 생성
  const roomData = {
    type: "team" as const,
    teamId,
    name: `${teamName} 채팅`,
    members: memberIds,
    createdBy: userId,
    createdAt: serverTimestamp(),
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
    unreadCount: memberIds.reduce((acc, uid) => {
      acc[uid] = 0;
      return acc;
    }, {} as Record<string, number>),
  };

  const roomRef = await addDoc(collection(db, "chatRooms"), roomData);
  const roomId = roomRef.id;

  console.log("✅ [ensureTeamChatRoom] 팀 채팅방 생성 완료:", {
    roomId,
    teamId,
    teamName,
    memberCount: memberIds.length,
  });

  return roomId;
}

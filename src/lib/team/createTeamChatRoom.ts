/**
 * 🔥 팀 채팅방 자동 생성
 * 
 * 역할:
 * - 팀 채팅방이 없으면 자동 생성
 * - 있으면 기존 채팅방 반환
 */

import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface TeamChatRoom {
  id: string;
  teamId: string;
  type: "team";
  name: string;
  members: string[];
  createdBy: string;
  createdAt: any;
}

/**
 * 팀 채팅방 생성 또는 조회
 */
export async function ensureTeamChatRoom(
  teamId: string,
  userId: string
): Promise<string> {
  // 1. 기존 팀 채팅방 검색
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
    
    // 사용자가 멤버에 없으면 추가
    if (!roomData.members?.includes(userId)) {
      await setDoc(
        doc(db, "chatRooms", existingRoom.id),
        {
          members: [...(roomData.members || []), userId],
        },
        { merge: true }
      );
    }
    
    return existingRoom.id;
  }

  // 2. 새 팀 채팅방 생성
  const teamRef = doc(db, "teams", teamId);
  const teamSnap = await getDoc(teamRef);
  
  if (!teamSnap.exists()) {
    throw new Error("팀을 찾을 수 없습니다.");
  }

  const teamData = teamSnap.data();
  const teamName = teamData.name || "팀 채팅";

  // 팀 멤버 목록 조회
  const membersRef = collection(db, "teams", teamId, "members");
  const membersSnap = await getDocs(membersRef);
  
  const memberIds = [userId]; // 생성자 포함
  membersSnap.docs.forEach((memberDoc) => {
    const memberUid = memberDoc.id;
    if (!memberIds.includes(memberUid)) {
      memberIds.push(memberUid);
    }
  });

  // ownerUid도 추가
  if (teamData.ownerUid && !memberIds.includes(teamData.ownerUid)) {
    memberIds.push(teamData.ownerUid);
  }

  // 채팅방 ID: team_{teamId}
  const chatRoomId = `team_${teamId}`;
  const chatRoomRef = doc(db, "chatRooms", chatRoomId);

  await setDoc(chatRoomRef, {
    teamId,
    type: "team",
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
  });

  console.log("✅ [ensureTeamChatRoom] 팀 채팅방 생성 완료:", {
    chatRoomId,
    teamId,
    memberCount: memberIds.length,
  });

  return chatRoomId;
}

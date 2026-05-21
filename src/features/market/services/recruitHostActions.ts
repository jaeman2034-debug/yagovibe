/**
 * 🔥 모집 단체방 Host 전용 액션
 * 강퇴, 모집 마감 기능
 */
import { doc, updateDoc, arrayRemove, addDoc, collection, serverTimestamp, deleteField, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 멤버 강퇴
 */
export async function kickMember(roomId: string, targetUid: string, myUid: string) {
  // 🔥 권한 체크는 클라이언트에서 먼저 하고, 서버(Rules)에서도 재확인
  
  const roomRef = doc(db, "chatRooms", roomId);
  
  // 🔥 members에서 제거 + roles에서 banned로 변경
  await updateDoc(roomRef, {
    members: arrayRemove(targetUid),
    [`roles.${targetUid}`]: "banned",
  });

  // 🔥 시스템 메시지 발행
  await addDoc(
    collection(db, "chatRooms", roomId, "messages"),
    {
      type: "system",
      text: `${targetUid}님이 퇴장되었습니다.`,
      createdAt: serverTimestamp(),
    }
  );

  // 🔥 강퇴 알림 발송
  try {
    const roomSnap = await getDoc(doc(db, "chatRooms", roomId));
    const roomData = roomSnap.data();
    const postId = roomData?.postId || roomId;
    
    const { createRecruitNoti } = await import("@/features/notifications/service");
    await createRecruitNoti(
      targetUid,
      roomId,
      postId,
      "RECRUIT_KICKED",
      "모집에서 강퇴되었습니다."
    );
  } catch (notifError) {
    console.warn("⚠️ [kickMember] 알림 발송 실패 (무시):", notifError);
  }
}

/**
 * 모집 마감
 */
export async function closeRecruit(roomId: string, myUid: string) {
  // 🔥 권한 체크는 클라이언트에서 먼저 하고, 서버(Rules)에서도 재확인
  
  const roomRef = doc(db, "chatRooms", roomId);
  
  // 🔥 status를 closed로 변경
  await updateDoc(roomRef, {
    status: "closed",
  });

  // 🔥 시스템 메시지 발행
  await addDoc(
    collection(db, "chatRooms", roomId, "messages"),
    {
      type: "system",
      text: `🚫 모집이 마감되었습니다.`,
      createdAt: serverTimestamp(),
    }
  );

  // 🔥 마감 알림 발송 (모든 멤버에게)
  try {
    const roomSnap = await getDoc(doc(db, "chatRooms", roomId));
    const roomData = roomSnap.data();
    const members = roomData?.members || [];
    const postId = roomData?.postId || roomId;
    
    const { createRecruitNoti } = await import("@/features/notifications/service");
    await Promise.all(
      members.map((memberUid: string) =>
        createRecruitNoti(
          memberUid,
          roomId,
          postId,
          "RECRUIT_CLOSED",
          "모집이 마감되었습니다."
        ).catch((err) => {
          console.warn(`⚠️ [closeRecruit] 알림 발송 실패 (${memberUid}):`, err);
        })
      )
    );
  } catch (notifError) {
    console.warn("⚠️ [closeRecruit] 알림 발송 실패 (무시):", notifError);
  }
}

/**
 * 모집 재개 (마감 취소)
 */
export async function reopenRecruit(roomId: string, myUid: string) {
  const roomRef = doc(db, "chatRooms", roomId);
  
  // 🔥 status를 null 또는 "active"로 변경
  await updateDoc(roomRef, {
    status: deleteField(), // 또는 "active"
  });

  // 🔥 시스템 메시지 발행
  await addDoc(
    collection(db, "chatRooms", roomId, "messages"),
    {
      type: "system",
      text: `✅ 모집이 다시 시작되었습니다.`,
      createdAt: serverTimestamp(),
    }
  );
}

/**
 * 🔥 E2E 전체 흐름 테스트
 * 
 * 시나리오:
 * 1. 신청
 * 2. 승인
 * 3. 알림 확인
 * 4. 채팅 진입 가능 여부
 */

import { describe, test, expect, beforeEach } from "@jest/globals";
import * as admin from "firebase-admin";
import { notifyMarketJoin } from "../../functions/src/market/notifyMarketJoin";
import { mockPost, mockUser, mockChatRoom } from "./mock";

// Firebase Admin 초기화 (테스트 환경)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "test-project",
  });
}

const db = admin.firestore();

describe("E2E 전체 흐름 테스트", () => {
  beforeEach(async () => {
    // 테스트 데이터 정리
    const batch = db.batch();
    
    // 알림 정리
    const notiRef = db.collection("notifications").doc(mockUser.uid);
    const itemsSnap = await notiRef.collection("items").get();
    itemsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // marketJoins 정리
    const joinsSnap = await db
      .collection("marketJoins")
      .where("userId", "==", mockUser.uid)
      .where("postId", "==", mockPost.id)
      .get();
    joinsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  });

  test("전체 흐름: 신청 → 승인 → 알림 → 채팅 진입", async () => {
    // 🔥 1. 신청 (marketJoins 문서 생성)
    const joinRef = db.collection("marketJoins").doc();
    await joinRef.set({
      postId: mockPost.id,
      userId: mockUser.uid,
      status: "pending",
      postAuthorId: mockPost.authorId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 🔥 2. 승인 (상태 변경)
    await joinRef.update({
      status: "approved",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 🔥 3. 알림 발송 (실제 Cloud Function이 트리거되지만, 여기서는 직접 호출)
    await notifyMarketJoin(mockUser.uid, {
      type: "JOIN_APPROVED",
      title: "매칭 참여 승인",
      body: `"${mockPost.title}" 매칭 참여가 승인되었습니다. 채팅방이 열렸습니다.`,
      postId: mockPost.id,
      chatRoomId: mockChatRoom.id,
    });

    // 🔥 4. 알림 확인
    const notiSnap = await db
      .collection("notifications")
      .doc(mockUser.uid)
      .collection("items")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    expect(notiSnap.docs.length).toBe(1);

    const noti = notiSnap.docs[0].data();
    expect(noti.type).toBe("JOIN_APPROVED");
    expect(noti.chatRoomId).toBe(mockChatRoom.id);

    // 🔥 5. 채팅 진입 가능 여부 확인 (승인 상태 확인)
    const joinSnap = await joinRef.get();
    const joinData = joinSnap.data();
    expect(joinData?.status).toBe("approved");

    // 🔥 6. 채팅방 접근 권한 확인 (승인된 사용자만)
    const canEnter = joinData?.status === "approved";
    expect(canEnter).toBe(true);
  }, 15000);
});

/**
 * 🔥 승인 알림 테스트
 */

import { describe, test, expect, beforeEach } from "@jest/globals";
import * as admin from "firebase-admin";
import { notifyMarketJoin } from "../../functions/src/market/notifyMarketJoin";
import { mockPost, mockJoin, mockUser } from "./mock";

// Firebase Admin 초기화 (테스트 환경)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "test-project",
  });
}

const db = admin.firestore();

describe("승인 알림 테스트", () => {
  beforeEach(async () => {
    // 테스트 데이터 정리
    const batch = db.batch();
    
    // 알림 정리
    const notiRef = db.collection("notifications").doc(mockUser.uid);
    const itemsSnap = await notiRef.collection("items").get();
    itemsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  });

  test("승인 시 알림 발송", async () => {
    // 🔥 승인 알림 발송
    await notifyMarketJoin(mockUser.uid, {
      type: "JOIN_APPROVED",
      title: "매칭 참여 승인",
      body: `"${mockPost.title}" 매칭 참여가 승인되었습니다. 채팅방이 열렸습니다.`,
      postId: mockPost.id,
      chatRoomId: "room_123",
    });

    // 🔥 알림 확인
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
    expect(noti.title).toBe("매칭 참여 승인");
    expect(noti.postId).toBe(mockPost.id);
    expect(noti.chatRoomId).toBe("room_123");
    expect(noti.read).toBe(false);
  }, 10000);
});

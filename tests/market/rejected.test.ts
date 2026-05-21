/**
 * 🔥 FULL 자동거절 알림 테스트
 */

import { describe, test, expect, beforeEach } from "@jest/globals";
import * as admin from "firebase-admin";
import { notifyMarketJoin } from "../../functions/src/market/notifyMarketJoin";
import { mockPost, mockUser } from "./mock";

// Firebase Admin 초기화 (테스트 환경)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "test-project",
  });
}

const db = admin.firestore();

describe("FULL 자동거절 알림 테스트", () => {
  beforeEach(async () => {
    // 테스트 데이터 정리
    const batch = db.batch();
    
    const notiRef = db.collection("notifications").doc(mockUser.uid);
    const itemsSnap = await notiRef.collection("items").get();
    itemsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  });

  test("FULL 거절 알림 발송", async () => {
    // 🔥 FULL 거절 알림 발송
    await notifyMarketJoin(mockUser.uid, {
      type: "JOIN_REJECTED_FULL",
      title: "매칭 참여 자동 거절",
      body: `"${mockPost.title}" 매칭이 모집 인원이 마감되어 자동 거절되었습니다.`,
      postId: mockPost.id,
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
    expect(noti.type).toBe("JOIN_REJECTED_FULL");
    expect(noti.title).toBe("매칭 참여 자동 거절");
    expect(noti.postId).toBe(mockPost.id);
    expect(noti.chatRoomId).toBeUndefined();
    expect(noti.read).toBe(false);
  }, 10000);
});

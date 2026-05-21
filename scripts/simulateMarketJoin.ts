/**
 * 🔥 매칭 참여 시뮬레이션 스크립트
 * 
 * 사용법:
 * ```bash
 * ts-node scripts/simulateMarketJoin.ts
 * ```
 */

import * as admin from "firebase-admin";
import { notifyMarketJoin } from "../functions/src/market/notifyMarketJoin";

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * 시뮬레이션 실행
 */
async function simulate() {
  const userId = process.env.TEST_USER_ID || "test_user_123";
  const postId = process.env.TEST_POST_ID || "test_post_456";

  console.log("🔥 매칭 참여 시뮬레이션 시작");
  console.log("=".repeat(50));

  try {
    // 🔥 1. 게시글 정보 조회
    console.log("\n1️⃣ 게시글 정보 조회");
    const postSnap = await db.doc(`market/${postId}`).get();
    if (!postSnap.exists) {
      console.error("❌ 게시글을 찾을 수 없습니다:", postId);
      return;
    }
    const post = postSnap.data()!;
    console.log("✅ 게시글:", post.title);

    // 🔥 2. 참여 신청 (marketJoins 문서 생성)
    console.log("\n2️⃣ 참여 신청");
    const joinRef = db.collection("marketJoins").doc();
    await joinRef.set({
      postId,
      userId,
      status: "pending",
      postAuthorId: post.authorId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("✅ 참여 신청 완료:", joinRef.id);

    // 🔥 3. 승인 (상태 변경)
    console.log("\n3️⃣ 승인 처리");
    await joinRef.update({
      status: "approved",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("✅ 승인 완료");

    // 🔥 4. 알림 발송
    console.log("\n4️⃣ 알림 발송");
    const chatRoomId = `${postId}_${userId}_${post.authorId}`;
    await notifyMarketJoin(userId, {
      type: "JOIN_APPROVED",
      title: "매칭 참여 승인",
      body: `"${post.title}" 매칭 참여가 승인되었습니다. 채팅방이 열렸습니다.`,
      postId,
      chatRoomId,
    });
    console.log("✅ 알림 발송 완료");

    // 🔥 5. 알림 목록 확인
    console.log("\n5️⃣ 알림 목록 확인");
    const notiSnap = await db
      .collection("notifications")
      .doc(userId)
      .collection("items")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    console.log(`✅ 알림 개수: ${notiSnap.docs.length}`);
    notiSnap.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`  ${index + 1}. [${data.type}] ${data.title}`);
      console.log(`     ${data.body}`);
      console.log(`     읽음: ${data.read ? "✅" : "❌"}`);
    });

    // 🔥 6. 채팅 진입 가능 여부 확인
    console.log("\n6️⃣ 채팅 진입 가능 여부 확인");
    const joinSnap = await joinRef.get();
    const joinData = joinSnap.data();
    const canEnter = joinData?.status === "approved";
    console.log(`✅ 채팅 진입 가능: ${canEnter ? "✅" : "❌"}`);

    console.log("\n" + "=".repeat(50));
    console.log("✅ 시뮬레이션 완료");
  } catch (error: any) {
    console.error("❌ 시뮬레이션 실패:", error.message);
    console.error(error.stack);
  }
}

// 실행
simulate()
  .then(() => {
    console.log("\n✅ 스크립트 종료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 스크립트 실패:", error);
    process.exit(1);
  });

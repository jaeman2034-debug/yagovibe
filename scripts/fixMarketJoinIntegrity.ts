/**
 * 🔥 매칭 참여 시스템 데이터 정합 보정 스크립트
 * 
 * 역할:
 * - market.currentPeople를 실제 approved + pending 개수로 재계산
 * - currentPeople > people인 경우 강제 정상화
 * - status 자동 조정 (마감/오픈)
 * 
 * 사용법:
 * ```bash
 * npx ts-node scripts/fixMarketJoinIntegrity.ts
 * ```
 * 
 * 또는 Node.js:
 * ```bash
 * node scripts/fixMarketJoinIntegrity.js
 * ```
 */

import * as admin from "firebase-admin";
import * as path from "path";

// Firebase 초기화
const serviceAccount = require(path.join(__dirname, "../serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

interface FixResult {
  postId: string;
  before: {
    currentPeople: number;
    people: number;
    status: string;
  };
  after: {
    currentPeople: number;
    people: number;
    status: string;
  };
  fixed: boolean;
  issues: string[];
}

async function main() {
  console.log("🔥 [fixMarketJoinIntegrity] 데이터 정합 보정 시작...");

  // 🔥 모집/매칭 게시글만 대상
  const postsSnap = await db
    .collection("market")
    .where("category", "in", ["recruit", "match"])
    .get();

  console.log(`📊 전체 게시글: ${postsSnap.size}개`);

  const results: FixResult[] = [];
  let fixedCount = 0;

  for (const postDoc of postsSnap.docs) {
    const postId = postDoc.id;
    const post = postDoc.data() as any;

    const before = {
      currentPeople: post.currentPeople || 0,
      people: post.people || 0,
      status: post.status || "active",
    };

    // 🔥 실제 신청 수 집계 (approved + pending)
    const [approvedSnap, pendingSnap] = await Promise.all([
      db
        .collection("marketJoins")
        .where("postId", "==", postId)
        .where("status", "==", "approved")
        .get(),
      db
        .collection("marketJoins")
        .where("postId", "==", postId)
        .where("status", "==", "pending")
        .get(),
    ]);

    const approvedCount = approvedSnap.size;
    const pendingCount = pendingSnap.size;
    const actualCurrentPeople = approvedCount + pendingCount; // pending도 포함

    const maxPeople = before.people || 0;
    const issues: string[] = [];

    // 🔥 문제 진단
    if (before.currentPeople !== actualCurrentPeople) {
      issues.push(
        `currentPeople 불일치: DB=${before.currentPeople}, 실제=${actualCurrentPeople}`
      );
    }

    if (before.currentPeople > maxPeople && maxPeople > 0) {
      issues.push(
        `currentPeople(${before.currentPeople}) > people(${maxPeople}) - 마감 초과`
      );
    }

    // 🔥 상태 결정
    let nextStatus = before.status;
    if (maxPeople > 0 && actualCurrentPeople >= maxPeople) {
      if (nextStatus !== "done") {
        issues.push(`마감 상태인데 status가 'done'이 아님: ${nextStatus}`);
        nextStatus = "done";
      }
    } else if (actualCurrentPeople < maxPeople && nextStatus === "done") {
      // 마감 해제 가능
      nextStatus = "active";
    }

    // 🔥 수정 필요 여부
    const needsFix =
      before.currentPeople !== actualCurrentPeople ||
      before.currentPeople > maxPeople ||
      nextStatus !== before.status;

    const after = {
      currentPeople: Math.min(actualCurrentPeople, maxPeople > 0 ? maxPeople : actualCurrentPeople), // 마감 초과 방지
      people: maxPeople,
      status: nextStatus,
    };

    if (needsFix) {
      // 🔥 업데이트
      await postDoc.ref.update({
        currentPeople: after.currentPeople,
        status: after.status,
        fixedAt: admin.firestore.FieldValue.serverTimestamp(),
        fixedBy: "fixMarketJoinIntegrity",
      });

      fixedCount++;
      console.log(`✅ [${fixedCount}] ${postId}: ${before.currentPeople}/${before.people} → ${after.currentPeople}/${after.people} (${issues.length}개 문제)`);
    }

    results.push({
      postId,
      before,
      after,
      fixed: needsFix,
      issues,
    });

    // 진행률 출력
    if (results.length % 50 === 0) {
      console.log(`📊 진행률: ${results.length}/${postsSnap.size} (수정: ${fixedCount})`);
    }
  }

  // 🔥 결과 요약
  console.log("\n" + "=".repeat(60));
  console.log("📊 보정 완료 요약");
  console.log("=".repeat(60));
  console.log(`전체 게시글: ${results.length}개`);
  console.log(`수정된 게시글: ${fixedCount}개`);
  console.log(`정상 게시글: ${results.length - fixedCount}개`);

  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  console.log(`발견된 문제: ${totalIssues}개`);

  // 🔥 문제가 있는 게시글 목록
  const problematic = results.filter((r) => r.issues.length > 0);
  if (problematic.length > 0) {
    console.log("\n⚠️ 문제가 있는 게시글:");
    problematic.slice(0, 10).forEach((r) => {
      console.log(`  - ${r.postId}: ${r.issues.join(", ")}`);
    });
    if (problematic.length > 10) {
      console.log(`  ... 외 ${problematic.length - 10}개`);
    }
  }

  console.log("\n✅ 보정 완료!");
}

main()
  .then(() => {
    console.log("✅ 스크립트 완료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 스크립트 실패:", error);
    process.exit(1);
  });

/**
 * 🔥 매칭 참여 시스템 데이터 정합 보정 스크립트 (최종 운영용)
 * 
 * 역할:
 * - market.currentPeople를 실제 approved + pending 개수로 재계산
 * - currentPeople > people인 경우 강제 정상화
 * - status 자동 조정 (마감/오픈)
 * 
 * 원칙:
 * > currentPeople = "approved + pending 개수"
 * > UI는 이 값만 신뢰
 * 
 * 사용법:
 * ```bash
 * npx ts-node scripts/fixMarketJoinIntegrity_FINAL.ts
 * ```
 */

import admin from "firebase-admin";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createRequire } from "module";

// ESM에서 __dirname 사용
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Firebase 초기화 (functions 폴더 방식과 동일)
if (!admin.apps.length) {
  try {
    // serviceAccountKey.json이 있으면 사용
    const serviceAccountPath = path.join(__dirname, "../functions/serviceAccountKey.json");
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase Admin 초기화 완료 (serviceAccountKey.json 사용)");
  } catch (error: any) {
    // serviceAccountKey.json이 없으면 기본 인증 사용 (환경 변수 또는 기본 인증)
    console.log("⚠️ serviceAccountKey.json을 찾을 수 없습니다. 기본 인증을 사용합니다.");
    console.log("⚠️ 오류:", error.message);
    admin.initializeApp();
    console.log("✅ Firebase Admin 초기화 완료 (기본 인증 사용)");
  }
}

// 🔥 Emulator 연결 방지 (프로덕션 Firestore 사용)
process.env.FIRESTORE_EMULATOR_HOST = "";

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
  console.log("📋 원칙: currentPeople = approved + pending 개수");

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
      people: post.people || 0, // 🔥 필드명: people (max 아님)
      status: post.status || "active",
    };

    // 🔥 실제 신청 수 집계 (approved + pending)
    const [approvedSnap, pendingSnap] = await Promise.all([
      db
        .collection("marketJoins") // 🔥 컬렉션명: marketJoins (applications 아님)
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
        `currentPeople 불일치: DB=${before.currentPeople}, 실제=${actualCurrentPeople} (approved=${approvedCount}, pending=${pendingCount})`
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
        fixedBy: "fixMarketJoinIntegrity_FINAL",
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
  console.log("📋 원칙 확인: currentPeople = approved + pending 개수");
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

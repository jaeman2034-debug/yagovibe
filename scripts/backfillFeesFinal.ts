#!/usr/bin/env node
// scripts/backfillFeesFinal.ts
// 🔄 회비 데이터 마이그레이션 스크립트 (최종 완성본 - 생성만)
//
// 원칙:
// - 레거시 데이터 수정/삭제 금지
// - 신 시스템 doc만 생성
// - 100% Idempotent (있으면 skip)
//
// 사용법:
//   npx ts-node scripts/backfillFeesFinal.ts --teamId=xxx --months=12 --dryRun
//   npx ts-node scripts/backfillFeesFinal.ts --teamId=xxx --months=6 --dryRun=false

import * as admin from "firebase-admin";

// Firebase Admin 초기화
if (!admin.apps.length) {
  try {
    const serviceAccount = require("../functions/serviceAccountKey.json");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("❌ serviceAccountKey.json을 찾을 수 없습니다.");
    console.error("   Firebase Console에서 서비스 계정 키를 다운로드하세요.");
    process.exit(1);
  }
}

const db = admin.firestore();

// CLI 인자 파싱
const args = process.argv.slice(2);
const params: Record<string, any> = {};
args.forEach((arg) => {
  const [key, value] = arg.split("=");
  if (key.startsWith("--")) {
    params[key.slice(2)] = value === "false" ? false : value === "true" ? true : value;
  }
});

const teamId = params.teamId;
const months = parseInt(params.months || "12", 10);
const dryRun = params.dryRun !== false; // 기본값: true

console.log("🔄 회비 데이터 마이그레이션 시작 (생성만)");
console.log(`   - teamId: ${teamId || "모든 팀"}`);
console.log(`   - months: ${months}개월`);
console.log(`   - dryRun: ${dryRun ? "테스트 모드" : "실제 실행"}`);
console.log("");

// 월 유틸 함수
function ym(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function prevYm(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return ym(d);
}

// 월 목록 생성
const now = new Date();
const monthList: string[] = [];
for (let i = 0; i < months; i++) {
  const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
  const month = ym(date);
  monthList.push(month);
}

console.log(`📅 마이그레이션 대상 월: ${monthList.join(", ")}`);
console.log("");

async function backfillFees() {
  try {
    // 1️⃣ 팀 목록 조회
    let teamsQuery: admin.firestore.Query<admin.firestore.DocumentData> = db.collection("teams");
    
    if (teamId) {
      teamsQuery = teamsQuery.where(admin.firestore.FieldPath.documentId(), "==", teamId);
    }

    const teamsSnap = await teamsQuery.get();

    if (teamsSnap.empty) {
      console.log("⚠️ 팀이 없습니다.");
      return;
    }

    console.log(`👥 총 ${teamsSnap.size}개 팀 발견`);
    console.log("");

    const results = {
      teamsProcessed: 0,
      feesCreated: 0,
      feesSkipped: 0,
      errors: [] as string[],
    };

    // 2️⃣ 각 팀별 처리
    for (const teamDoc of teamsSnap.docs) {
      const currentTeamId = teamDoc.id;
      const teamData = teamDoc.data();

      console.log(`📦 팀 처리 중: ${currentTeamId} (${teamData.name || "이름 없음"})`);

      // enableNewFeeSystem=true인 팀만 처리
      if (teamData.enableNewFeeSystem !== true) {
        console.log(`   ⏭️ 새 시스템 비활성화, 스킵`);
        continue;
      }

      try {
        // 활성 회원 조회 (status 필드 사용)
        const membersSnap = await db
          .collection("teams")
          .doc(currentTeamId)
          .collection("members")
          .where("status", "==", "active")
          .get();

        if (membersSnap.empty) {
          console.log(`   ⚠️ 활성 회원 없음`);
          continue;
        }

        console.log(`   👥 활성 회원: ${membersSnap.size}명`);

        const baseAmount = Number(teamData.feeBaseAmount ?? 20000);

        // 3️⃣ 각 월별 처리
        for (const month of monthList) {
          console.log(`   📅 월 처리 중: ${month}`);

          // 월별 헤더 확인/생성
          const feeMonthRef = db
            .collection("teams")
            .doc(currentTeamId)
            .collection("fees")
            .doc(month);

          const feeMonthDoc = await feeMonthRef.get();

          if (!feeMonthDoc.exists && !dryRun) {
            await feeMonthRef.set({
              month,
              baseAmount,
              status: "open",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`      ✅ 월별 헤더 생성`);
          }

          // 이전 월 계산
          const prevMonth = prevYm(month);

          // 4️⃣ 각 회원별 fee 항목 생성
          const batch = db.batch();
          let batchCount = 0;
          let monthCreatedCount = 0;

          for (const memberDoc of membersSnap.docs) {
            const memberId = memberDoc.id;
            const memberData = memberDoc.data();

            // 면제자는 제외
            if (memberData.feePlan === "exempt") {
              continue;
            }

            // 이미 존재하는지 확인 (Idempotent)
            const feePaymentRef = feeMonthRef.collection("payments").doc(memberId);
            const feePaymentExists = await feePaymentRef.get();

            if (feePaymentExists.exists) {
              results.feesSkipped++;
              continue;
            }

            // 이월 금액 계산 (계산형)
            let carryOverAmount = 0;
            if (prevMonth) {
              const prevMonthFeeDoc = await db
                .collection("teams")
                .doc(currentTeamId)
                .collection("fees")
                .doc(prevMonth)
                .collection("payments")
                .doc(memberId)
                .get();

              if (prevMonthFeeDoc.exists) {
                const prevData = prevMonthFeeDoc.data()!;
                const prevStatus = prevData.status || "unpaid";
                if (prevStatus !== "paid") {
                  const prevDue = Number(prevData.dueAmount ?? prevData.amount ?? 0);
                  const prevPaid = Number(prevData.paidAmount ?? 0);
                  carryOverAmount = Math.max(0, prevDue - prevPaid);
                }
              }
            }

            const dueAmount = baseAmount + carryOverAmount;

            // fee 항목 생성 (method: "import"로 표시)
            const feePaymentData = {
              teamId: currentTeamId,
              memberId,
              memberName: memberData.name || "이름 없음",
              month,
              dueAmount,
              baseAmount,
              carryOverAmount: Math.max(0, carryOverAmount),
              amount: dueAmount, // 호환성
              paidAmount: 0,
              status: "unpaid",
              method: "import", // 마이그레이션 표시
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            if (!dryRun) {
              batch.set(feePaymentRef, feePaymentData);
              batchCount++;
              monthCreatedCount++;
              results.feesCreated++;

              // 배치 제한 체크
              if (batchCount >= 500) {
                await batch.commit();
                batchCount = 0;
              }
            } else {
              // 테스트 모드: 로그만
              console.log(`      🧪 테스트: ${memberData.name} (${dueAmount}원)`);
              monthCreatedCount++;
              results.feesCreated++;
            }
          }

          // 남은 배치 커밋
          if (batchCount > 0 && !dryRun) {
            await batch.commit();
          }

          console.log(`      ✅ ${monthCreatedCount}개 fee 항목 ${dryRun ? "테스트" : "생성"}`);
        }

        results.teamsProcessed++;

      } catch (teamError: any) {
        const errorMsg = `팀 ${currentTeamId} 처리 실패: ${teamError.message}`;
        console.error(`   ❌ ${errorMsg}`);
        results.errors.push(errorMsg);
      }

      console.log("");
    }

    // 결과 출력
    console.log("✅ 마이그레이션 완료");
    console.log(`   - 처리된 팀: ${results.teamsProcessed}개`);
    console.log(`   - 생성된 fee: ${results.feesCreated}개`);
    console.log(`   - 스킵된 fee: ${results.feesSkipped}개`);
    if (results.errors.length > 0) {
      console.log(`   - 에러: ${results.errors.length}개`);
      results.errors.forEach((err) => console.log(`     - ${err}`));
    }

    if (dryRun) {
      console.log("");
      console.log("🧪 테스트 모드 완료. 실제 마이그레이션을 실행하려면:");
      console.log(`   npx ts-node scripts/backfillFeesFinal.ts --teamId=${teamId || "ALL"} --months=${months} --dryRun=false`);
    }

  } catch (error: any) {
    console.error("❌ 마이그레이션 실패:", error);
    process.exit(1);
  }
}

// 실행
backfillFees().then(() => {
  process.exit(0);
});


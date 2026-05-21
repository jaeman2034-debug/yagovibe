#!/usr/bin/env node
// scripts/backfillFees.js
// 🔄 회비 데이터 마이그레이션 스크립트 (CLI)
//
// 사용법:
//   node scripts/backfillFees.js --teamId=xxx --months=12 --dryRun
//   node scripts/backfillFees.js --teamId=xxx --months=6 --dryRun=false

const admin = require("firebase-admin");
const readline = require("readline");

// Firebase Admin 초기화
if (!admin.apps.length) {
  const serviceAccount = require("../functions/serviceAccountKey.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// CLI 인자 파싱
const args = process.argv.slice(2);
const params = {};
args.forEach((arg) => {
  const [key, value] = arg.split("=");
  if (key.startsWith("--")) {
    params[key.slice(2)] = value === "false" ? false : value === "true" ? true : value;
  }
});

const teamId = params.teamId;
const months = parseInt(params.months || "12", 10);
const dryRun = params.dryRun !== false; // 기본값: true

console.log("🔄 회비 데이터 마이그레이션 시작");
console.log(`   - teamId: ${teamId || "모든 팀"}`);
console.log(`   - months: ${months}개월`);
console.log(`   - dryRun: ${dryRun ? "테스트 모드" : "실제 실행"}`);
console.log("");

// 월 목록 생성
const now = new Date();
const monthList = [];
for (let i = 0; i < months; i++) {
  const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  monthList.push(month);
}

console.log(`📅 마이그레이션 대상 월: ${monthList.join(", ")}`);
console.log("");

async function backfillFees() {
  try {
    // 1️⃣ 팀 목록 조회
    let teamsQuery = db.collection("teams");
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
      errors: [],
    };

    // 2️⃣ 각 팀별 처리
    for (const teamDoc of teamsSnap.docs) {
      const currentTeamId = teamDoc.id;
      const teamData = teamDoc.data();

      console.log(`📦 팀 처리 중: ${currentTeamId} (${teamData.name || "이름 없음"})`);

      // enableNewFeeSystem 플래그 확인
      if (!teamData.enableNewFeeSystem) {
        console.log(`   ⏭️ 새 시스템 비활성화, 스킵`);
        continue;
      }

      try {
        // 활성 회원 조회
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

        const baseAmount = teamData.defaultMonthlyFee || 20000;

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
              teamId: currentTeamId,
              baseAmount,
              status: "open",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`      ✅ 월별 헤더 생성`);
          }

          // 이전 월 계산
          const [year, monthNum] = month.split("-").map(Number);
          const prevMonthDate = new Date(year, monthNum - 2, 1);
          const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

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

            // 이미 존재하는지 확인
            const feeMemberRef = feeMonthRef.collection("members").doc(memberId);
            const feeMemberExists = await feeMemberRef.get();

            if (feeMemberExists.exists) {
              results.feesSkipped++;
              continue;
            }

            // 이월 금액 계산 (간단 버전)
            let carryOverAmount = 0;
            if (prevMonth) {
              const prevMonthFeeDoc = await db
                .collection("teams")
                .doc(currentTeamId)
                .collection("fees")
                .doc(prevMonth)
                .collection("members")
                .doc(memberId)
                .get();

              if (prevMonthFeeDoc.exists) {
                const prevData = prevMonthFeeDoc.data();
                const prevDue = prevData.dueAmount || 0;
                const prevPaid = prevData.paidAmount || 0;
                carryOverAmount = Math.max(0, prevDue - prevPaid);
              }
            }

            const dueAmount = baseAmount + carryOverAmount;

            // fee 항목 생성
            const feeMemberData = {
              teamId: currentTeamId,
              memberId,
              memberName: memberData.name || "이름 없음",
              month,
              dueAmount,
              baseAmount,
              carryOverAmount,
              paidAmount: 0,
              status: "unpaid",
              method: "import", // 마이그레이션 표시
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            if (!dryRun) {
              batch.set(feeMemberRef, feeMemberData);
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

      } catch (teamError) {
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
      console.log(`   node scripts/backfillFees.js --teamId=${teamId || "ALL"} --months=${months} --dryRun=false`);
    }

  } catch (error) {
    console.error("❌ 마이그레이션 실패:", error);
    process.exit(1);
  }
}

// 실행
backfillFees().then(() => {
  process.exit(0);
});


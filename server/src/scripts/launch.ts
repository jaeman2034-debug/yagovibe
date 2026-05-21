/**
 * 🔥 Launch Script - 론치 전 체크리스트
 * 
 * Week8 핵심: 오픈 전 필수 조건 검증
 */

import { prisma } from "../data/prisma";

/**
 * 론치 전 체크리스트 검증
 */
async function preflight(): Promise<void> {
  console.log("🚀 Starting launch preflight check...\n");

  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 스토리 확인
  const storyCount = await prisma.story.count({
    where: { status: "PUBLISHED" },
  });
  if (storyCount < 5) {
    errors.push(`스토리 부족: ${storyCount}개 (최소 5개 필요)`);
  } else {
    console.log(`✅ 스토리: ${storyCount}개`);
  }

  // 2. 구장 확인
  const groundCount = await prisma.ground.count();
  if (groundCount < 1) {
    errors.push(`구장 없음: ${groundCount}개 (최소 1개 필요)`);
  } else {
    console.log(`✅ 구장: ${groundCount}개`);
  }

  // 3. 협회 데이터 확인
  const leagueCount = await prisma.league.count();
  if (leagueCount < 2) {
    warnings.push(`협회 리그 부족: ${leagueCount}개 (권장 2개 이상)`);
  } else {
    console.log(`✅ 협회 리그: ${leagueCount}개`);
  }

  // 4. 팀 확인
  const teamCount = await prisma.team.count();
  if (teamCount < 1) {
    warnings.push(`팀 없음: ${teamCount}개 (권장 1개 이상)`);
  } else {
    console.log(`✅ 팀: ${teamCount}개`);
  }

  // 5. DB 연결 확인
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(`✅ DB 연결: 정상`);
  } catch (error) {
    errors.push(`DB 연결 실패: ${error instanceof Error ? error.message : "Unknown"}`);
  }

  // 6. 실험 설정 확인
  const expCount = await prisma.experiment.count();
  if (expCount < 1) {
    warnings.push(`AB 실험 없음: ${expCount}개 (권장 1개 이상)`);
  } else {
    console.log(`✅ AB 실험: ${expCount}개`);
  }

  // 결과 출력
  console.log("\n" + "=".repeat(50));
  if (errors.length > 0) {
    console.error("❌ 론치 불가능:");
    errors.forEach((e) => console.error(`  - ${e}`));
    throw new Error("Preflight check failed");
  }

  if (warnings.length > 0) {
    console.warn("⚠️  경고:");
    warnings.forEach((w) => console.warn(`  - ${w}`));
  }

  console.log("\n✅ READY TO LAUNCH!");
  console.log("=".repeat(50));
}

/**
 * 모니터 지표 기준 확인
 */
async function checkMetrics(): Promise<void> {
  console.log("\n📊 Checking monitor metrics...\n");

  const date = new Date().toISOString().split("T")[0];
  const kpi = await prisma.dailyKpi.findFirst({
    where: { date },
    orderBy: { createdAt: "desc" },
  });

  if (!kpi) {
    console.warn("⚠️  오늘 KPI 데이터 없음");
    return;
  }

  const metrics = {
    storyCtr: kpi.storyCtr >= 0.02,
    bookingCr: kpi.bookingCr >= 0.15,
    payFail: kpi.payFail <= 5,
    seedRate: kpi.seedRate <= 0.1,
  };

  console.log(`Story CTR: ${(kpi.storyCtr * 100).toFixed(2)}% (목표: ≥2%) ${metrics.storyCtr ? "✅" : "❌"}`);
  console.log(`Booking CR: ${(kpi.bookingCr * 100).toFixed(2)}% (목표: ≥15%) ${metrics.bookingCr ? "✅" : "❌"}`);
  console.log(`Pay Fail: ${kpi.payFail}건 (목표: ≤5건) ${metrics.payFail ? "✅" : "❌"}`);
  console.log(`Seed Rate: ${(kpi.seedRate * 100).toFixed(2)}% (목표: ≤10%) ${metrics.seedRate ? "✅" : "❌"}`);

  const allPassed = Object.values(metrics).every((v) => v);
  if (!allPassed) {
    console.warn("\n⚠️  일부 지표가 목표치 미달");
  } else {
    console.log("\n✅ 모든 지표 목표치 달성");
  }
}

// 실행
async function main() {
  try {
    await preflight();
    await checkMetrics();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Launch preflight failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { preflight, checkMetrics };

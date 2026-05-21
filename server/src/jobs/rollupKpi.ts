/**
 * 🔥 Rollup KPI Job - Daily KPI 롤업 배치
 * 
 * Week2 핵심: Daily KPI 롤업 테이블 자동 계산
 */

import { prisma } from "../data/prisma";

type Raw = {
  eventName: string;
  payload: any;
};

/**
 * 안전한 숫자 계산 (NaN/Infinity 방지)
 */
function safe(v: number, d = 0): number {
  return isFinite(v) && !isNaN(v) ? v : d;
}

/**
 * 특정 날짜/지역의 KPI 롤업 계산
 */
export async function rollupKpi(
  date: string,
  region: string
): Promise<void> {
  const startOfDay = new Date(`${date}T00:00:00Z`);
  const endOfDay = new Date(`${date}T23:59:59Z`);

  // 해당 날짜의 이벤트 로그 집계
  const logs = await prisma.eventLog.findMany({
    where: {
      region,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Raw 데이터 변환
  const raws: Raw[] = logs.map((l) => ({
    eventName: l.eventName,
    payload: (() => {
      try {
        return JSON.parse(l.payload || "{}");
      } catch {
        return {};
      }
    })(),
  }));

  // ---- Story 지표 ----
  const storyImp = raws.filter((r) => r.eventName === "story_impression").length;
  const storyClick = raws.filter((r) => r.eventName === "story_click").length;
  const storyCtr = safe((storyClick / storyImp) * 100);

  // ---- Booking 지표 ----
  const reserveCreate = raws.filter((r) => r.eventName === "reserve_create").length;
  const paySuccess = raws.filter((r) => r.eventName === "payment_success").length;
  const payFail = raws.filter((r) => r.eventName === "payment_fail").length;
  const bookingCr = safe((paySuccess / reserveCreate) * 100);

  // ---- Revenue 계산 ----
  const revenue = raws
    .filter((r) => r.eventName === "payment_success")
    .reduce((sum, r) => sum + (r.payload?.amount || r.payload?.metadata?.amount || 0), 0);

  // ---- Health 지표 ----
  const totalEvents = raws.length;
  const seedCount = raws.filter((r) => r.payload?.from === "seed").length;
  const seedRate = safe((seedCount / totalEvents) * 100);

  const offlineCount = raws.filter((r) => r.payload?.network === "offline").length;
  const offlineRate = safe((offlineCount / totalEvents) * 100);

  const apiError = raws.filter((r) => r.eventName === "api_error").length;

  // Story Fill Rate (활성 스토리 수 / 5)
  const activeStories = await prisma.story.count({
    where: {
      region,
      status: "PUBLISHED",
      startAt: { lte: endOfDay },
      endAt: { gte: startOfDay },
    },
  });
  const storyFillRate = Math.min(safe((activeStories / 5) * 100), 100);

  // DailyKpi 저장 또는 업데이트
  await prisma.dailyKpi.upsert({
    where: {
      date_region: {
        date,
        region,
      },
    },
    create: {
      id: `kpi_${date}_${region}`,
      date,
      region,
      storyImp,
      storyClick,
      storyCtr,
      bookingStart: reserveCreate,
      paymentSuccess: paySuccess,
      paymentFail: payFail,
      bookingCr,
      revenue: BigInt(revenue),
      seedRate,
      offlineRate,
      apiError,
      storyFillRate,
    },
    update: {
      storyImp,
      storyClick,
      storyCtr,
      bookingStart: reserveCreate,
      paymentSuccess: paySuccess,
      paymentFail: payFail,
      bookingCr,
      revenue: BigInt(revenue),
      seedRate,
      offlineRate,
      apiError,
      storyFillRate,
    },
  });

  console.log(
    `[ROLLUP_KPI] ${date} ${region}: ${storyImp} imp, ${storyClick} click, ${storyCtr.toFixed(2)}% CTR, ${revenue}원`
  );
}

/**
 * 어제 날짜의 모든 지역 KPI 롤업
 */
export async function rollupYesterdayAllRegions(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = yesterday.toISOString().split("T")[0];

  const regions = [
    "seoul",
    "busan",
    "daegu",
    "incheon",
    "gwangju",
    "daejeon",
    "ulsan",
    "gyeonggi",
    "gangwon",
    "jeju",
  ];

  const results = await Promise.allSettled(
    regions.map((r) => rollupKpi(date, r))
  );

  const success = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(`[ROLLUP_ALL] ${date}: ${success} success, ${failed} failed`);
}

/**
 * 특정 기간의 KPI 롤업
 */
export async function rollupDateRange(
  startDate: string,
  endDate: string,
  region: string
): Promise<void> {
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = d.toISOString().split("T")[0];
    await rollupKpi(date, region);
  }
}

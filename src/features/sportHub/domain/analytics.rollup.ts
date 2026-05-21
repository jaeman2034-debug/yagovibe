/**
 * 🔥 Analytics Rollup - Daily 롤업 계산
 * 
 * Raw Events → Daily Aggregate
 */

import type { CompleteEvent, DailyKpi, FunnelAnalysis, FunnelStep } from "./analytics.types";
import type { Region } from "./region.types";

/**
 * Daily KPI 계산 (확정 스펙)
 */
export function calculateDailyKpi(
  events: CompleteEvent[],
  date: string,
  region: Region,
  storySlotCount: number = 5
): DailyKpi {
  const totalEvents = events.length;

  // Story
  const storyImp = events.filter((e) => e.eventName === "story_impression").length;
  const storyClick = events.filter((e) => e.eventName === "story_click").length;
  const storyCtr = storyImp > 0 ? (storyClick / storyImp) * 100 : 0;

  // Booking
  const bookingStart = events.filter((e) => e.eventName === "reserve_create").length;
  const paymentSuccess = events.filter((e) => e.eventName === "payment_success").length;
  const paymentFail = events.filter((e) => e.eventName === "payment_fail").length;
  const bookingCr = bookingStart > 0 ? (paymentSuccess / bookingStart) * 100 : 0;

  // Revenue
  const revenue = events
    .filter((e) => e.eventName === "payment_success")
    .reduce((sum, e) => {
      const amount = (e as any).metadata?.amount || 0;
      return sum + amount;
    }, 0);

  // Health
  const seedCount = events.filter((e) => e.from === "seed").length;
  const seedRate = totalEvents > 0 ? seedCount / totalEvents : 0;
  
  const offlineCount = events.filter((e) => e.network === "offline").length;
  const offlineRate = totalEvents > 0 ? offlineCount / totalEvents : 0;
  
  const apiError = events.filter((e) => e.eventName === "api_error").length;
  
  // Story Fill Rate (5/5 기준)
  const activeStories = new Set(
    events
      .filter((e) => e.eventName === "story_impression")
      .map((e) => (e as any).metadata?.storyId)
      .filter(Boolean)
  ).size;
  const storyFillRate = Math.min(activeStories / storySlotCount, 1.0);

  // AB
  const activeTests = new Set(
    events
      .filter((e) => e.experimentKey)
      .map((e) => e.experimentKey)
      .filter(Boolean)
  ).size;
  
  // 승자 결정된 비율 (실제로는 AB 실험 결과에서 계산)
  const winRate = 0; // TODO: AB 실험 결과에서 계산

  return {
    date,
    region,
    story: {
      imp: storyImp,
      click: storyClick,
      ctr: Math.round(storyCtr * 100) / 100,
    },
    booking: {
      start: bookingStart,
      success: paymentSuccess,
      fail: paymentFail,
      cr: Math.round(bookingCr * 100) / 100,
    },
    revenue,
    health: {
      seedRate: Math.round(seedRate * 10000) / 100, // 백분율
      offlineRate: Math.round(offlineRate * 10000) / 100, // 백분율
      apiError,
      storyFillRate: Math.round(storyFillRate * 100) / 100,
    },
    ab: {
      activeTests,
      winRate,
    },
    // 추가 지표
    community: {
      teamJoinRequest: events.filter((e) => e.eventName === "team_join_request").length,
      teamJoinApproved: events.filter((e) => e.eventName === "team_join_approved").length,
      leagueMatchCreated: events.filter((e) => e.eventName === "league_match_created").length,
    },
    hub: {
      view: events.filter((e) => e.eventName === "hub_view").length,
      viewUnique: new Set(
        events
          .filter((e) => e.eventName === "hub_view")
          .map((e) => e.userId || e.sessionId)
      ).size,
    },
  };
}

/**
 * Funnel 분석 계산
 */
export function calculateFunnel(
  events: CompleteEvent[],
  region: Region,
  date: string
): FunnelAnalysis {
  const stepOrder: FunnelStep[] = [
    "hub_view",
    "story_impression",
    "story_click",
    "ground_view",
    "slot_select",
    "reserve_create",
    "payment_success",
  ];

  const stepCounts = stepOrder.map((step) => {
    const count = events.filter((e) => e.eventName === step).length;
    return { step, count };
  });

  const steps = stepCounts.map((current, index) => {
    const previousCount = index > 0 ? stepCounts[index - 1].count : current.count;
    const conversionRate =
      previousCount > 0 ? (current.count / previousCount) * 100 : 0;

    return {
      step: current.step,
      count: current.count,
      conversionRate,
    };
  });

  const firstStepCount = stepCounts[0].count;
  const lastStepCount = stepCounts[stepCounts.length - 1].count;
  const totalConversion =
    firstStepCount > 0 ? (lastStepCount / firstStepCount) * 100 : 0;

  return {
    region,
    date,
    steps,
    totalConversion,
  };
}

/**
 * 지역별 Daily KPI 집계
 */
export function aggregateDailyKpiByRegion(
  events: CompleteEvent[],
  date: string
): Map<Region, DailyKpi> {
  const regionMap = new Map<Region, CompleteEvent[]>();

  // 지역별 이벤트 그룹화
  for (const event of events) {
    if (!regionMap.has(event.region)) {
      regionMap.set(event.region, []);
    }
    regionMap.get(event.region)!.push(event);
  }

  // 지역별 KPI 계산
  const result = new Map<Region, DailyKpi>();
  for (const [region, regionEvents] of regionMap) {
    result.set(region, calculateDailyKpi(regionEvents, date, region));
  }

  return result;
}

/**
 * 시간대별 롤업 (시간별 집계)
 */
export type HourlyKpi = {
  hour: number; // 0-23
  date: string;
  region: Region;
} & Omit<DailyKpi, "date" | "region">;

export function calculateHourlyKpi(
  events: CompleteEvent[],
  date: string,
  region: Region
): HourlyKpi[] {
  const hourlyEvents = new Map<number, CompleteEvent[]>();

  // 시간별 이벤트 그룹화
  for (const event of events) {
    const hour = new Date(event.at).getHours();
    if (!hourlyEvents.has(hour)) {
      hourlyEvents.set(hour, []);
    }
    hourlyEvents.get(hour)!.push(event);
  }

  // 시간별 KPI 계산
  const result: HourlyKpi[] = [];
  for (const [hour, hourEvents] of hourlyEvents) {
    const dailyKpi = calculateDailyKpi(hourEvents, date, region);
    result.push({
      hour,
      date,
      region,
      ...dailyKpi,
    });
  }

  return result.sort((a, b) => a.hour - b.hour);
}

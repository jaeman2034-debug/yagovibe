/**
 * 🔥 Admin Dashboard Route - 대시보드 v2 통합 API
 * 
 * Week6 핵심: KPI 관제 + AB 실험 모니터 + 정산 관리 + 위험 알림
 */

import { Router } from "express";
import { prisma } from "../data/prisma";

const router = Router();

/**
 * GET /api/admin/dashboard/summary
 * 메인 요약 (KPI + 위험 신호)
 */
router.get("/summary", async (req, res) => {
  try {
    const region = (req.query.region as string) || "seoul";
    const date =
      (req.query.date as string) ||
      new Date().toISOString().split("T")[0]; // 오늘 날짜

    // KPI 조회
    const kpi = await prisma.dailyKpi.findUnique({
      where: {
        date_region: {
          date,
          region,
        },
      },
    });

    // 위험 신호: CTR이 낮은 스토리
    const lowCtrStories = await prisma.story.findMany({
      where: {
        region,
        status: "PUBLISHED",
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    // 최근 이벤트 로그에서 CTR 계산 (간단 버전)
    const recentLogs = await prisma.eventLog.findMany({
      where: {
        eventName: { in: ["story_impression", "story_click"] },
        region,
        createdAt: {
          gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000), // 최근 24시간
        },
      },
      take: 1000,
    });

    const impressions = recentLogs.filter(
      (l) => l.eventName === "story_impression"
    ).length;
    const clicks = recentLogs.filter((l) => l.eventName === "story_click")
      .length;
    const currentCtr = impressions > 0 ? clicks / impressions : 0;

    res.json({
      kpi: kpi
        ? {
            ...kpi,
            createdAt: kpi.createdAt.toISOString(),
          }
        : null,
      risk: {
        lowCtrStories: lowCtrStories.map((s) => s.id),
        apiError: kpi?.apiError || 0,
        currentCtr: currentCtr,
        isLowCtr: currentCtr < 0.01, // 1% 미만
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /admin/dashboard/summary]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/dashboard/experiments
 * AB 실험 모니터
 */
router.get("/experiments", async (req, res) => {
  try {
    const exps = await prisma.experiment.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 각 실험의 통계 조회
    const view = await Promise.all(
      exps.map(async (e) => {
        const stats = await prisma.experimentStat.findMany({
          where: { expId: e.id },
        });

        const variantA = stats.find((s) => s.variant === "A");
        const variantB = stats.find((s) => s.variant === "B");

        const impA = variantA?.imp || 0;
        const clickA = variantA?.click || 0;
        const impB = variantB?.imp || 0;
        const clickB = variantB?.click || 0;

        const ctrA = impA > 0 ? clickA / impA : 0;
        const ctrB = impB > 0 ? clickB / impB : 0;

        const uplift = ctrA > 0 ? (ctrB - ctrA) / ctrA : 0;

        return {
          id: e.id,
          status: e.status,
          winner: e.winner,
          startedAt: e.startedAt.toISOString(),
          endedAt: e.endedAt?.toISOString() || null,
          stats: {
            A: {
              imp: impA,
              click: clickA,
              ctr: ctrA,
            },
            B: {
              imp: impB,
              click: clickB,
              ctr: ctrB,
            },
          },
          uplift: uplift,
          totalImp: impA + impB,
          totalClick: clickA + clickB,
        };
      })
    );

    res.json(view);
  } catch (error) {
    console.error("[GET /admin/dashboard/experiments]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/dashboard/settlements
 * 정산 관제
 */
router.get("/settlements", async (req, res) => {
  try {
    const ownerId = req.query.ownerId as string | undefined;
    const region = req.query.region as string | undefined;
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (ownerId) where.ownerId = ownerId;
    if (region) where.region = region;
    if (status) where.status = status;

    const items = await prisma.settlementItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const total = items.reduce((sum, item) => sum + item.net, 0);
    const ready = items.filter((i) => i.status === "READY").length;
    const settled = items.filter((i) => i.status === "SETTLED").length;
    const hold = items.filter((i) => i.status === "HOLD").length;

    res.json({
      summary: {
        total,
        ready,
        settled,
        hold,
        totalCount: items.length,
      },
      items: items.map((item) => ({
        ...item,
        usedAt: item.usedAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /admin/dashboard/settlements]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/dashboard/health
 * 헬스 체크 (스토리 채움률, 오프라인률, 시드률)
 */
router.get("/health", async (req, res) => {
  try {
    const region = (req.query.region as string) || "seoul";
    const date =
      (req.query.date as string) ||
      new Date().toISOString().split("T")[0];

    const kpi = await prisma.dailyKpi.findUnique({
      where: {
        date_region: {
          date,
          region,
        },
      },
    });

    // 실시간 스토리 채움률 계산
    const activeStories = await prisma.story.count({
      where: {
        region,
        status: "PUBLISHED",
        startAt: { lte: new Date() },
        endAt: { gte: new Date() },
      },
    });

    const storyFillRate = activeStories >= 5 ? 1.0 : activeStories / 5;

    res.json({
      storyFillRate: kpi?.storyFillRate ?? storyFillRate,
      offlineRate: kpi?.offlineRate ?? 0,
      seedRate: kpi?.seedRate ?? 0,
      apiError: kpi?.apiError ?? 0,
      activeStories,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /admin/dashboard/health]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/dashboard/stories
 * 스토리 현황 (관제용)
 */
router.get("/stories", async (req, res) => {
  try {
    const region = (req.query.region as string) || "seoul";

    const stories = await prisma.story.findMany({
      where: { region },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const byStatus = {
      PUBLISHED: stories.filter((s) => s.status === "PUBLISHED").length,
      DRAFT: stories.filter((s) => s.status === "DRAFT").length,
      EXPIRED: stories.filter((s) => s.status === "EXPIRED").length,
      REJECTED: stories.filter((s) => s.status === "REJECTED").length,
    };

    res.json({
      summary: {
        total: stories.length,
        ...byStatus,
      },
      stories: stories.map((s) => ({
        ...s,
        startAt: s.startAt ? s.startAt.toISOString() : null,
        endAt: s.endAt ? s.endAt.toISOString() : null,
        createdAt: s.createdAt ? s.createdAt.toISOString() : null,
        updatedAt: s.updatedAt ? s.updatedAt.toISOString() : null,
      })),
    });
  } catch (error) {
    console.error("[GET /admin/dashboard/stories]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/dashboard/activity
 * 플랫폼 활동 통계 (CTR과 분리된 레이어)
 */
router.get("/activity", async (req, res) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 오늘의 활동 로그 조회
    const todayLogs = await prisma.activityLog.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // DAU 계산 (고유 사용자 수)
    const uniqueUsers = new Set(
      todayLogs.filter((log) => log.userId).map((log) => log.userId)
    );
    const dau = uniqueUsers.size;

    // 총 페이지뷰
    const pageViews = todayLogs.filter((log) => log.event === "PAGE_VIEW").length;

    // 이벤트별 카운트
    const eventCounts: Record<string, number> = {};
    todayLogs.forEach((log: any) => {
      const event = log.event || "unknown";
      eventCounts[event] = (eventCounts[event] || 0) + 1;
    });

    // 기능별 클릭 TOP5
    const topEvents = Object.entries(eventCounts)
      .filter(([event]) => event !== "PAGE_VIEW") // 페이지뷰 제외
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([event, count]) => ({ event, count }));

    // 종목 선택 분포
    const sportSelects = todayLogs.filter((log: any) => {
      return log.event === "SPORT_SELECTED" || log.event === "SPORT_SELECT";
    });
    const sportDistribution: Record<string, number> = {};
    sportSelects.forEach((log: any) => {
      try {
        const meta = log.meta ? JSON.parse(log.meta) : {};
        const sportType = meta.sportType || "unknown";
        sportDistribution[sportType] = (sportDistribution[sportType] || 0) + 1;
      } catch {
        // meta 파싱 실패 시 무시
      }
    });

    // 팀 활동
    const teamJoins = todayLogs.filter((log: any) => log.event === "TEAM_JOIN").length;
    const teamCreateClicks = todayLogs.filter(
      (log: any) => log.event === "TEAM_CREATE_CLICK"
    ).length;
    const teamViews = todayLogs.filter((log: any) => log.event === "TEAM_VIEW").length;

    // 마켓 활동
    const marketViews = todayLogs.filter((log: any) => log.event === "MARKET_VIEW").length;
    const marketItemClicks = todayLogs.filter(
      (log: any) => log.event === "MARKET_ITEM_CLICK"
    ).length;

    // 커뮤니케이션
    const chatOpens = todayLogs.filter((log: any) => log.event === "CHAT_OPEN").length;
    const notiClicks = todayLogs.filter((log: any) => log.event === "NOTI_CLICK").length;

    // 검색
    const searches = todayLogs.filter((log: any) => log.event === "SEARCH").length;

    res.json({
      date,
      summary: {
        dau, // 오늘 활성 유저
        pageViews, // 총 페이지뷰
        totalEvents: todayLogs.length, // 총 이벤트 수
      },
      topEvents, // 기능별 클릭 TOP5
      sportDistribution, // 종목 선택 분포
      team: {
        joins: teamJoins,
        createClicks: teamCreateClicks,
        views: teamViews,
      },
      market: {
        views: marketViews,
        itemClicks: marketItemClicks,
      },
      communication: {
        chatOpens,
        notiClicks,
      },
      search: {
        count: searches,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /admin/dashboard/activity]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/dashboard/funnel
 * 전환 퍼널 분석 (투자자/대표용 핵심 지표)
 * 
 * 퍼널 단계:
 * 1. SPORT_SELECTED (종목 선택)
 * 2. story_impression (스토리 노출)
 * 3. story_click (스토리 클릭)
 * 4. TEAM_VIEW / MARKET_VIEW (핵심 페이지 진입)
 * 5. TEAM_JOIN (핵심 행동)
 */
router.get("/funnel", async (req, res) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const range = (req.query.range as string) || "today";
    
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 오늘의 ActivityLog 조회
    const todayActivityLogs = await prisma.activityLog.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // 오늘의 EventLog 조회 (story_impression, story_click)
    const todayEventLogs = await prisma.eventLog.findMany({
      where: {
        eventName: { in: ["story_impression", "story_click"] },
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // 퍼널 단계별 카운트
    const sportSelected = todayActivityLogs.filter(
      (log) => log.event === "SPORT_SELECTED" || log.event === "SPORT_SELECT"
    ).length;

    const storyImpressions = todayEventLogs.filter(
      (log) => log.eventName === "story_impression"
    ).length;

    const storyClicks = todayEventLogs.filter(
      (log) => log.eventName === "story_click"
    ).length;

    const teamViews = todayActivityLogs.filter(
      (log) => log.event === "TEAM_VIEW"
    ).length;

    const marketViews = todayActivityLogs.filter(
      (log) => log.event === "MARKET_VIEW"
    ).length;

    const teamJoins = todayActivityLogs.filter(
      (log) => log.event === "TEAM_JOIN"
    ).length;

    // 핵심 페이지 진입 (TEAM_VIEW + MARKET_VIEW)
    const activationViews = teamViews + marketViews;

    // KPI 계산
    const ctr = storyImpressions > 0 ? storyClicks / storyImpressions : 0;
    const activationRate = sportSelected > 0 ? activationViews / sportSelected : 0;
    const deepConversion = storyClicks > 0 ? teamJoins / storyClicks : 0;

    // 종목별 분포 (SPORT_SELECTED의 meta.sportType 기반)
    const sportDistribution: Record<string, {
      selected: number;
      impressions: number;
      clicks: number;
      views: number;
      joins: number;
    }> = {};

    todayActivityLogs
      .filter((log) => log.event === "SPORT_SELECTED" || log.event === "SPORT_SELECT")
      .forEach((log: any) => {
        try {
          const meta = log.meta ? JSON.parse(log.meta) : {};
          const sportType = meta.sportType || "unknown";
          if (!sportDistribution[sportType]) {
            sportDistribution[sportType] = {
              selected: 0,
              impressions: 0,
              clicks: 0,
              views: 0,
              joins: 0,
            };
          }
          sportDistribution[sportType].selected++;
        } catch {
          // meta 파싱 실패 시 무시
        }
      });

    // 종목별 스토리 로그 매핑 (region 기반으로 추정, 정확도는 향후 개선)
    todayEventLogs.forEach((log: any) => {
      // EventLog에는 sportType이 없으므로, ActivityLog의 SPORT_SELECTED와 시간 기반으로 매핑
      // 현재는 전체 집계만 제공 (향후 sessionId/userId 기반으로 정확도 개선)
    });

    // 낮은 CTR 스토리 Top5 (storyId별 CTR 계산)
    const storyStats: Record<string, { impressions: number; clicks: number }> = {};
    todayEventLogs.forEach((log: any) => {
      try {
        const payload = JSON.parse(log.payload || "{}");
        const storyId = payload.storyId || "unknown";
        if (!storyStats[storyId]) {
          storyStats[storyId] = { impressions: 0, clicks: 0 };
        }
        if (log.eventName === "story_impression") {
          storyStats[storyId].impressions++;
        } else if (log.eventName === "story_click") {
          storyStats[storyId].clicks++;
        }
      } catch {
        // payload 파싱 실패 시 무시
      }
    });

    const lowCtrStories = Object.entries(storyStats)
      .map(([storyId, stats]) => ({
        storyId,
        impressions: stats.impressions,
        clicks: stats.clicks,
        ctr: stats.impressions > 0 ? stats.clicks / stats.impressions : 0,
      }))
      .filter((s) => s.impressions >= 3) // 최소 3회 노출 이상만
      .sort((a, b) => a.ctr - b.ctr) // CTR 낮은 순
      .slice(0, 5);

    // 자동 코멘트 생성
    const comments = [];
    if (ctr > 0) {
      comments.push(`오늘 스토리 CTR ${(ctr * 100).toFixed(1)}%`);
    }
    if (activationRate > 0) {
      comments.push(`종목선택 대비 팀/마켓 조회 전환 ${(activationRate * 100).toFixed(1)}%`);
    }
    if (deepConversion > 0) {
      comments.push(`스토리 클릭 대비 팀 가입 전환 ${(deepConversion * 100).toFixed(1)}%`);
    }
    const summaryComment = comments.length > 0 ? comments.join(", ") : "데이터 수집 중";

    res.json({
      date,
      range,
      funnel: {
        step1_sportSelected: sportSelected,
        step2_storyImpression: storyImpressions,
        step3_storyClick: storyClicks,
        step4_activationViews: activationViews, // TEAM_VIEW + MARKET_VIEW
        step5_teamJoin: teamJoins,
      },
      kpi: {
        ctr: ctr, // story_click / story_impression
        activationRate: activationRate, // (TEAM_VIEW + MARKET_VIEW) / SPORT_SELECTED
        deepConversion: deepConversion, // TEAM_JOIN / story_click
      },
      sportDistribution,
      lowCtrStories,
      summaryComment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /admin/dashboard/funnel]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;

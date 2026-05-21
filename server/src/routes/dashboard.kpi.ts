/**
 * 🔥 Dashboard KPI Route - Daily KPI 롤업
 * 
 * Week2 핵심: Daily KPI 롤업 테이블
 */

import { Router } from "express";
import { prisma } from "../data/prisma";

const router = Router();

/**
 * GET /api/admin/dashboard/kpi
 * Daily KPI 조회
 */
router.get("/kpi", async (req, res) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const region = (req.query.region as string) || "seoul";

    // DailyKpi 조회 또는 생성
    let kpi = await prisma.dailyKpi.findUnique({
      where: {
        date_region: {
          date,
          region,
        },
      },
    });

    // 없으면 기본값 반환 (실제로는 롤업 배치에서 생성)
    if (!kpi) {
      kpi = {
        id: "",
        date,
        region,
        storyImp: 0,
        storyClick: 0,
        storyCtr: 0,
        bookingStart: 0,
        paymentSuccess: 0,
        paymentFail: 0,
        bookingCr: 0,
        revenue: BigInt(0),
        seedRate: 0,
        offlineRate: 0,
        apiError: 0,
        storyFillRate: 0,
        createdAt: new Date(),
      };
    }

    res.json({
      date: kpi.date,
      region: kpi.region,
      story: {
        imp: kpi.storyImp,
        click: kpi.storyClick,
        ctr: kpi.storyCtr,
      },
      booking: {
        start: kpi.bookingStart,
        success: kpi.paymentSuccess,
        fail: kpi.paymentFail,
        cr: kpi.bookingCr,
      },
      revenue: Number(kpi.revenue),
      health: {
        seedRate: kpi.seedRate,
        offlineRate: kpi.offlineRate,
        apiError: kpi.apiError,
        storyFillRate: kpi.storyFillRate,
      },
    });
  } catch (error) {
    console.error("[GET /admin/dashboard/kpi]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/admin/dashboard/kpi/rollup
 * Daily KPI 롤업 계산 (배치)
 * 
 * 실제 구현: cron job으로 매일 실행
 */
router.post("/kpi/rollup", async (req, res) => {
  try {
    const date = (req.body.date as string) || new Date().toISOString().split("T")[0];
    const region = (req.body.region as string) || "seoul";

    // 해당 날짜의 이벤트 로그 집계
    const startOfDay = new Date(`${date}T00:00:00Z`);
    const endOfDay = new Date(`${date}T23:59:59Z`);

    const events = await prisma.eventLog.findMany({
      where: {
        region,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // 집계 계산
    const storyImp = events.filter((e) => e.eventName === "story_impression").length;
    const storyClick = events.filter((e) => e.eventName === "story_click").length;
    const storyCtr = storyImp > 0 ? (storyClick / storyImp) * 100 : 0;

    const bookingStart = events.filter((e) => e.eventName === "reserve_create").length;
    const paymentSuccess = events.filter((e) => e.eventName === "payment_success").length;
    const paymentFail = events.filter((e) => e.eventName === "payment_fail").length;
    const bookingCr = bookingStart > 0 ? (paymentSuccess / bookingStart) * 100 : 0;

    // Revenue 계산
    const revenueEvents = events.filter((e) => e.eventName === "payment_success");
    const revenue = revenueEvents.reduce((sum, e) => {
      try {
        const payload = JSON.parse(e.payload);
        return sum + (payload.metadata?.amount || 0);
      } catch {
        return sum;
      }
    }, 0);

    // Health 지표
    const totalEvents = events.length;
    const seedCount = events.filter((e) => {
      try {
        const payload = JSON.parse(e.payload);
        return payload.from === "seed";
      } catch {
        return false;
      }
    }).length;
    const seedRate = totalEvents > 0 ? (seedCount / totalEvents) * 100 : 0;

    const offlineCount = events.filter((e) => {
      try {
        const payload = JSON.parse(e.payload);
        return payload.network === "offline";
      } catch {
        return false;
      }
    }).length;
    const offlineRate = totalEvents > 0 ? (offlineCount / totalEvents) * 100 : 0;

    const apiError = events.filter((e) => e.eventName === "api_error").length;

    // Story Fill Rate (활성 스토리 수 / 5)
    const activeStories = await prisma.story.count({
      where: {
        region,
        status: "PUBLISHED",
        startAt: { lte: endOfDay },
        endAt: { gte: startOfDay },
      },
    });
    const storyFillRate = Math.min((activeStories / 5) * 100, 100);

    // DailyKpi 저장 또는 업데이트
    await prisma.dailyKpi.upsert({
      where: {
        date_region: {
          date,
          region,
        },
      },
      create: {
        date,
        region,
        storyImp,
        storyClick,
        storyCtr,
        bookingStart,
        paymentSuccess,
        paymentFail,
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
        bookingStart,
        paymentSuccess,
        paymentFail,
        bookingCr,
        revenue: BigInt(revenue),
        seedRate,
        offlineRate,
        apiError,
        storyFillRate,
      },
    });

    res.json({
      ok: true,
      date,
      region,
      message: "Daily KPI 롤업 완료",
    });
  } catch (error) {
    console.error("[POST /admin/dashboard/kpi/rollup]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/dashboard/kpi/trend
 * KPI 트렌드 조회 (최근 N일)
 */
router.get("/kpi/trend", async (req, res) => {
  try {
    const region = (req.query.region as string) || "seoul";
    const days = parseInt((req.query.days as string) || "7", 10);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

    const kpis = await prisma.dailyKpi.findMany({
      where: {
        region,
        date: {
          gte: startDate.toISOString().split("T")[0],
          lte: endDate.toISOString().split("T")[0],
        },
      },
      orderBy: { date: "asc" },
    });

    res.json({
      region,
      days,
      kpis: kpis.map((k) => ({
        date: k.date,
        story: {
          imp: k.storyImp,
          click: k.storyClick,
          ctr: k.storyCtr,
        },
        booking: {
          start: k.bookingStart,
          success: k.paymentSuccess,
          fail: k.paymentFail,
          cr: k.bookingCr,
        },
        revenue: Number(k.revenue),
        health: {
          seedRate: k.seedRate,
          offlineRate: k.offlineRate,
          apiError: k.apiError,
          storyFillRate: k.storyFillRate,
        },
      })),
    });
  } catch (error) {
    console.error("[GET /admin/dashboard/kpi/trend]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/dashboard/summary
 * 대시보드 요약 (특정 날짜/지역)
 */
router.get("/summary", async (req, res) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const region = (req.query.region as string) || "seoul";

    const kpi = await prisma.dailyKpi.findUnique({
      where: {
        date_region: {
          date,
          region,
        },
      },
    });

    if (!kpi) {
      return res.json({
        date,
        region,
        story: { imp: 0, click: 0, ctr: 0 },
        booking: { start: 0, success: 0, fail: 0, cr: 0 },
        revenue: 0,
        health: { seedRate: 0, offlineRate: 0, apiError: 0, storyFillRate: 0 },
      });
    }

    res.json({
      date: kpi.date,
      region: kpi.region,
      story: {
        imp: kpi.storyImp,
        click: kpi.storyClick,
        ctr: kpi.storyCtr,
      },
      booking: {
        start: kpi.bookingStart,
        success: kpi.paymentSuccess,
        fail: kpi.paymentFail,
        cr: kpi.bookingCr,
      },
      revenue: Number(kpi.revenue),
      health: {
        seedRate: kpi.seedRate,
        offlineRate: kpi.offlineRate,
        apiError: kpi.apiError,
        storyFillRate: kpi.storyFillRate,
      },
    });
  } catch (error) {
    console.error("[GET /admin/dashboard/summary]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;

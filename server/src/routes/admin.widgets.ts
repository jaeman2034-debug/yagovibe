/**
 * 🔥 Admin Widgets Route - 운영 대시보드 v2 핵심 위젯 6종
 * 
 * Week8 핵심: 매일 봐야 할 6개 위젯 + 계산식 + 임계값 + 대응 액션
 */

import { Router } from "express";
import { prisma } from "../data/prisma";

const router = Router();

/**
 * GET /api/admin/widgets/all
 * 6개 위젯 통합 조회
 */
router.get("/all", async (req, res) => {
  try {
    const region = (req.query.region as string) || "seoul";
    const date =
      (req.query.date as string) ||
      new Date().toISOString().split("T")[0];

    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // KPI 조회
    const kpi = await prisma.dailyKpi.findUnique({
      where: {
        date_region: {
          date,
          region,
        },
      },
    });

    const kpiYesterday = await prisma.dailyKpi.findUnique({
      where: {
        date_region: {
          date: yesterdayStr,
          region,
        },
      },
    });

    // 활성 스토리
    const activeStories = await prisma.story.findMany({
      where: {
        region,
        status: "PUBLISHED",
        startAt: { lte: new Date() },
        endAt: { gte: new Date() },
      },
    });

    // 24시간 이내 생성된 스토리
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const freshStories = activeStories.filter(
      (s) => new Date(s.createdAt) >= oneDayAgo
    );

    // 팀 수
    const teamCount = await prisma.team.count({
      where: { region },
    });

    // 오늘 가입한 팀 멤버
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayJoins = await prisma.teamMember.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // AB 실험
    const exp = await prisma.experiment.findUnique({
      where: { id: "hub_story_cta" },
    });

    const expStats = exp
      ? await prisma.experimentStat.findMany({
          where: { expId: exp.id },
        })
      : [];

    const variantA = expStats.find((s) => s.variant === "A");
    const variantB = expStats.find((s) => s.variant === "B");

    const impA = variantA?.imp || 0;
    const clickA = variantA?.click || 0;
    const impB = variantB?.imp || 0;
    const clickB = variantB?.click || 0;

    const ctrA = impA > 0 ? clickA / impA : 0;
    const ctrB = impB > 0 ? clickB / impB : 0;
    const totalImp = impA + impB;
    const uplift = ctrA > 0 ? (ctrB - ctrA) / ctrA : 0;

    // 실험 시작일로부터 경과일
    const expAgeDays = exp
      ? (Date.now() - new Date(exp.startedAt).getTime()) /
        (1000 * 60 * 60 * 24)
      : 0;

    // 예상 남은 일수 (표본 3000 기준)
    const remainingDays =
      totalImp < 3000
        ? Math.ceil((3000 - totalImp) / (totalImp / Math.max(expAgeDays, 1)))
        : 0;

    // 최근 24시간 이벤트 로그 (퍼널 계산용)
    const recentLogs = await prisma.eventLog.findMany({
      where: {
        region,
        createdAt: {
          gte: oneDayAgo,
        },
      },
      take: 10000,
    });

    const groundViews = recentLogs.filter(
      (l) => l.eventName === "ground_view"
    ).length;
    const slotViews = recentLogs.filter((l) => l.eventName === "slot_view")
      .length;
    const reserveCreates = recentLogs.filter(
      (l) => l.eventName === "reserve_create"
    ).length;
    const paymentSuccess = recentLogs.filter(
      (l) => l.eventName === "payment_success"
    ).length;

    // 취소율 계산
    const cancellations = recentLogs.filter(
      (l) => l.eventName === "reservation_cancel"
    ).length;
    const cancelRate =
      paymentSuccess + cancellations > 0
        ? cancellations / (paymentSuccess + cancellations)
        : 0;

    // 객단가 계산
    const revenue = Number(kpi?.revenue ?? BigInt(0));
    const avgOrderValue =
      paymentSuccess > 0 ? revenue / paymentSuccess : 0;

    const revenueYesterday = Number(kpiYesterday?.revenue ?? BigInt(0));
    const revenueChange =
      revenueYesterday > 0
        ? ((revenue - revenueYesterday) / revenueYesterday) * 100
        : 0;

    // 위젯 1: Story Health
    const storyCtr = kpi?.storyCtr ?? 0;
    const fillRate = activeStories.length >= 5 ? 1.0 : activeStories.length / 5;
    const freshRate =
      activeStories.length > 0
        ? freshStories.length / activeStories.length
        : 0;

    const widget1 = {
      name: "Story Health",
      metrics: {
        ctr: {
          value: storyCtr,
          target: 0.025,
          status: storyCtr >= 0.025 ? "정상" : storyCtr >= 0.02 ? "주의" : "위험",
          action:
            storyCtr < 0.02
              ? "타이틀 1개 교체"
              : storyCtr < 0.025
              ? "모니터링"
              : "유지",
        },
        fillRate: {
          value: fillRate,
          target: 1.0,
          status:
            fillRate >= 1.0 ? "정상" : fillRate >= 0.8 ? "주의" : "위험",
          action:
            fillRate < 1.0
              ? "운영 픽 즉시 투입"
              : "유지",
        },
        freshRate: {
          value: freshRate,
          target: 0.4,
          status: freshRate >= 0.4 ? "정상" : freshRate >= 0.3 ? "주의" : "위험",
          action:
            freshRate < 0.3
              ? "협회/팀 모집 자동 생성 점검"
              : freshRate < 0.4
              ? "모니터링"
              : "유지",
        },
      },
    };

    // 위젯 2: Booking Funnel
    const viewToSlot = groundViews > 0 ? slotViews / groundViews : 0;
    const reserveCr = slotViews > 0 ? reserveCreates / slotViews : 0;
    const payCr = reserveCreates > 0 ? paymentSuccess / reserveCreates : 0;

    const widget2 = {
      name: "Booking Funnel",
      metrics: {
        viewToSlot: {
          value: viewToSlot,
          target: 0.35,
          status:
            viewToSlot >= 0.35 ? "정상" : viewToSlot >= 0.25 ? "주의" : "위험",
          action:
            viewToSlot < 0.25
              ? "구장 슬롯 가시성 개선"
              : viewToSlot < 0.35
              ? "모니터링"
              : "유지",
        },
        reserveCr: {
          value: reserveCr,
          target: 0.22,
          status: reserveCr >= 0.22 ? "정상" : reserveCr >= 0.15 ? "주의" : "위험",
          action:
            reserveCr < 0.15
              ? "가격/시간 가시성 개선"
              : reserveCr < 0.22
              ? "모니터링"
              : "유지",
        },
        payCr: {
          value: payCr,
          target: 0.95,
          status: payCr >= 0.95 ? "정상" : payCr >= 0.9 ? "주의" : "위험",
          action:
            payCr < 0.9
              ? "웹훅·락 로그 점검"
              : payCr < 0.95
              ? "모니터링"
              : "유지",
        },
      },
    };

    // 위젯 3: Revenue Pulse
    const widget3 = {
      name: "Revenue Pulse",
      metrics: {
        todayRevenue: {
          value: revenue,
          target: 0,
          status: "정상",
          action: "유지",
        },
        revenueChange: {
          value: revenueChange,
          target: 0,
          status:
            revenueChange >= 0
              ? "정상"
              : revenueChange >= -15
              ? "주의"
              : "위험",
          action:
            revenueChange < -15
              ? "할인 중단"
              : revenueChange < 0
              ? "모니터링"
              : "유지",
        },
        cancelRate: {
          value: cancelRate,
          target: 0.08,
          status: cancelRate <= 0.08 ? "정상" : cancelRate <= 0.12 ? "주의" : "위험",
          action:
            cancelRate > 0.12
              ? "환불 정책 UI 강조"
              : cancelRate > 0.08
              ? "모니터링"
              : "유지",
        },
        avgOrderValue: {
          value: avgOrderValue,
          target: 0,
          status: "정상",
          action: "유지",
        },
      },
    };

    // 위젯 4: AB Radar
    const widget4 = {
      name: "AB Radar",
      metrics: {
        sample: {
          value: totalImp,
          target: 3000,
          status: totalImp >= 3000 ? "정상" : totalImp >= 2000 ? "주의" : "위험",
          action: totalImp < 2000 ? "실험 계속" : "유지",
        },
        ctrA: {
          value: ctrA,
          target: 0,
          status: "정상",
          action: "유지",
        },
        ctrB: {
          value: ctrB,
          target: 0,
          status: "정상",
          action: "유지",
        },
        uplift: {
          value: uplift,
          target: 0.1,
          status: uplift >= 0.1 ? "정상" : uplift >= 0.05 ? "주의" : "위험",
          action:
            uplift >= 0.1
              ? "자동 WIN 확인"
              : uplift < -0.1
              ? "실험 중단"
              : "실험 계속",
        },
        remainingDays: {
          value: remainingDays,
          target: 0,
          status: "정상",
          action: "유지",
        },
      },
      experiment: {
        id: exp?.id,
        status: exp?.status,
        winner: exp?.winner,
        ageDays: Math.floor(expAgeDays),
      },
    };

    // 위젯 5: Community Engine
    const widget5 = {
      name: "Community Engine",
      metrics: {
        teamCount: {
          value: teamCount,
          target: 20,
          status: teamCount >= 20 ? "정상" : teamCount >= 10 ? "주의" : "위험",
          action:
            teamCount < 10
              ? "운영팀 3개 시드 생성"
              : teamCount < 20
              ? "모니터링"
              : "유지",
        },
        todayJoins: {
          value: todayJoins,
          target: 5,
          status: todayJoins >= 5 ? "정상" : todayJoins >= 2 ? "주의" : "위험",
          action:
            todayJoins < 2
              ? "모집 스토리 2개 추가"
              : todayJoins < 5
              ? "모니터링"
              : "유지",
        },
        recruitStoryCtr: {
          value: 0, // TODO: 모집 스토리 CTR 계산
          target: 0.02,
          status: "정상",
          action: "유지",
        },
      },
    };

    // 위젯 6: System Guard
    const payFail = kpi?.payFail ?? 0;
    const offlineRate = kpi?.offlineRate ?? 0;
    const apiError = kpi?.apiError ?? 0;

    const widget6 = {
      name: "System Guard",
      metrics: {
        payFail: {
          value: payFail,
          target: 5,
          status: payFail <= 5 ? "정상" : payFail <= 10 ? "주의" : "위험",
          action:
            payFail > 10
              ? "PG 재시도/락 로그 점검"
              : payFail > 5
              ? "모니터링"
              : "유지",
        },
        offlineRate: {
          value: offlineRate,
          target: 0.12,
          status: offlineRate <= 0.12 ? "정상" : offlineRate <= 0.2 ? "주의" : "위험",
          action:
            offlineRate > 0.2
              ? "캐시 TTL 축소"
              : offlineRate > 0.12
              ? "모니터링"
              : "유지",
        },
        apiError: {
          value: apiError,
          target: 50,
          status: apiError <= 50 ? "정상" : apiError <= 100 ? "주의" : "위험",
          action:
            apiError > 100
              ? "API 엔드포인트 점검"
              : apiError > 50
              ? "모니터링"
              : "유지",
        },
      },
    };

    res.json({
      date,
      region,
      widgets: {
        storyHealth: widget1,
        bookingFunnel: widget2,
        revenuePulse: widget3,
        abRadar: widget4,
        communityEngine: widget5,
        systemGuard: widget6,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /admin/widgets/all]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;

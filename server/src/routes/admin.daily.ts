/**
 * 🔥 Admin Daily Route - 매일 확인용 간편 API
 * 
 * Week8 핵심: 운영자가 매일 30분 안에 확인할 수 있는 통합 API
 */

import { Router } from "express";
import { prisma } from "../data/prisma";

const router = Router();

/**
 * GET /api/admin/daily/check
 * 매일 30분 체크리스트용 통합 API
 */
router.get("/check", async (req, res) => {
  try {
    const region = (req.query.region as string) || "seoul";
    const date =
      (req.query.date as string) ||
      new Date().toISOString().split("T")[0];

    // KPI 조회
    const kpi = await prisma.dailyKpi.findUnique({
      where: {
        date_region: {
          date,
          region,
        },
      },
    });

    // 활성 스토리 수
    const activeStories = await prisma.story.count({
      where: {
        region,
        status: "PUBLISHED",
        startAt: { lte: new Date() },
        endAt: { gte: new Date() },
      },
    });

    // AB 실험 현황
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

    const ctrA =
      variantA && variantA.imp > 0 ? variantA.click / variantA.imp : 0;
    const ctrB =
      variantB && variantB.imp > 0 ? variantB.click / variantB.imp : 0;

    // 위젯 6개 계산
    const widgets = {
      storyCtr: {
        value: kpi?.storyCtr ?? 0,
        target: 0.02, // 2%
        status:
          (kpi?.storyCtr ?? 0) >= 0.02
            ? "정상"
            : (kpi?.storyCtr ?? 0) >= 0.015
            ? "주의"
            : "위험",
        action:
          (kpi?.storyCtr ?? 0) < 0.015
            ? "즉시 저CTR 스토리 2개 교체"
            : (kpi?.storyCtr ?? 0) < 0.02
            ? "1개 교체 후 모니터링"
            : "유지",
      },
      bookingCr: {
        value: kpi?.bookingCr ?? 0,
        target: 0.15, // 15%
        status:
          (kpi?.bookingCr ?? 0) >= 0.15
            ? "정상"
            : (kpi?.bookingCr ?? 0) >= 0.1
            ? "주의"
            : "위험",
        action:
          (kpi?.bookingCr ?? 0) < 0.1
            ? "결제 플로우 점검"
            : (kpi?.bookingCr ?? 0) < 0.15
            ? "결제 시작 화면 문구 단순화"
            : "유지",
      },
      payFail: {
        value: kpi?.payFail ?? 0,
        target: 5,
        status:
          (kpi?.payFail ?? 0) <= 5
            ? "정상"
            : (kpi?.payFail ?? 0) <= 10
            ? "주의"
            : "위험",
        action:
          (kpi?.payFail ?? 0) > 10
            ? "결제 작업 중단, 원인 분류"
            : (kpi?.payFail ?? 0) > 5
            ? "LOCK 해제 로직 점검"
            : "유지",
      },
      seedRate: {
        value: kpi?.seedRate ?? 0,
        target: 0.1, // 10%
        status:
          (kpi?.seedRate ?? 0) <= 0.1
            ? "정상"
            : (kpi?.seedRate ?? 0) <= 0.2
            ? "주의"
            : "위험",
        action:
          (kpi?.seedRate ?? 0) > 0.2
            ? "협회 동기화 확인 + 운영 스토리 즉시 추가"
            : (kpi?.seedRate ?? 0) > 0.1
            ? "협회 API 상태 확인"
            : "유지",
      },
      storyFillRate: {
        value: activeStories >= 5 ? 1.0 : activeStories / 5,
        target: 1.0, // 100%
        status:
          activeStories >= 5
            ? "정상"
            : activeStories >= 4
            ? "주의"
            : "위험",
        action:
          activeStories < 4
            ? "즉시 seed로 채우기"
            : activeStories < 5
            ? "운영 스토리 1개 추가"
            : "유지",
      },
      revenue: {
        value: Number(kpi?.revenue ?? BigInt(0)),
        target: 0, // 전일 대비 비교
        status: "정상", // 전일 대비는 별도 계산 필요
        action: "유지",
      },
    };

    // AB 실험 현황
    const abStatus = exp
      ? {
          id: exp.id,
          status: exp.status,
          winner: exp.winner,
          ctrA: ctrA,
          ctrB: ctrB,
          totalImp: (variantA?.imp || 0) + (variantB?.imp || 0),
          uplift: ctrA > 0 ? (ctrB - ctrA) / ctrA : 0,
        }
      : null;

    res.json({
      date,
      region,
      widgets,
      abStatus,
      activeStories,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /admin/daily/check]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;

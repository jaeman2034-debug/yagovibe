/**
 * 🔥 Admin Experiment Route - AB 테스트 관리 API
 * 
 * Week5 핵심: 실험 대시보드 조회 / 강제 종료
 */

import { Router } from "express";
import { prisma } from "../data/prisma";

const router = Router();

/**
 * GET /api/admin/exp
 * 모든 실험 목록 조회 (통계 포함)
 */
router.get("/", async (req, res) => {
  try {
    const exps = await prisma.experiment.findMany({
      include: {
        // Prisma 관계가 설정되어 있다면
        // stats: true
      },
      orderBy: { createdAt: "desc" },
    });

    // 통계 조회
    const expsWithStats = await Promise.all(
      exps.map(async (exp) => {
        const stats = await prisma.experimentStat.findMany({
          where: { expId: exp.id },
        });

        const variantA = stats.find((s) => s.variant === "A");
        const variantB = stats.find((s) => s.variant === "B");

        const ctrA =
          variantA && variantA.imp > 0
            ? variantA.click / variantA.imp
            : 0;
        const ctrB =
          variantB && variantB.imp > 0
            ? variantB.click / variantB.imp
            : 0;

        return {
          ...exp,
          startedAt: exp.startedAt.toISOString(),
          endedAt: exp.endedAt?.toISOString() || null,
          createdAt: exp.createdAt.toISOString(),
          updatedAt: exp.updatedAt.toISOString(),
          stats: {
            A: variantA
              ? {
                  imp: variantA.imp,
                  click: variantA.click,
                  ctr: ctrA,
                }
              : null,
            B: variantB
              ? {
                  imp: variantB.imp,
                  click: variantB.click,
                  ctr: ctrB,
                }
              : null,
          },
          totalImp: (variantA?.imp || 0) + (variantB?.imp || 0),
          totalClick: (variantA?.click || 0) + (variantB?.click || 0),
        };
      })
    );

    res.json(expsWithStats);
  } catch (error) {
    console.error("[GET /admin/exp]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/exp/:id
 * 특정 실험 상세 조회
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const exp = await prisma.experiment.findUnique({
      where: { id },
    });

    if (!exp) {
      return res.status(404).json({ error: "not_found" });
    }

    const stats = await prisma.experimentStat.findMany({
      where: { expId: id },
    });

    const variantA = stats.find((s) => s.variant === "A");
    const variantB = stats.find((s) => s.variant === "B");

    const ctrA =
      variantA && variantA.imp > 0 ? variantA.click / variantA.imp : 0;
    const ctrB =
      variantB && variantB.imp > 0 ? variantB.click / variantB.imp : 0;

    res.json({
      ...exp,
      startedAt: exp.startedAt.toISOString(),
      endedAt: exp.endedAt?.toISOString() || null,
      createdAt: exp.createdAt.toISOString(),
      updatedAt: exp.updatedAt.toISOString(),
      stats: {
        A: variantA
          ? {
              imp: variantA.imp,
              click: variantA.click,
              ctr: ctrA,
            }
          : null,
        B: variantB
          ? {
              imp: variantB.imp,
              click: variantB.click,
              ctr: ctrB,
            }
          : null,
      },
      totalImp: (variantA?.imp || 0) + (variantB?.imp || 0),
      totalClick: (variantA?.click || 0) + (variantB?.click || 0),
    });
  } catch (error) {
    console.error("[GET /admin/exp/:id]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/admin/exp/:id/force
 * 실험 강제 종료 (승자 수동 지정)
 */
router.post("/:id/force", async (req, res) => {
  try {
    const { id } = req.params;
    const { winner } = req.body;

    if (!winner || (winner !== "A" && winner !== "B")) {
      return res.status(400).json({ error: "winner must be 'A' or 'B'" });
    }

    const exp = await prisma.experiment.update({
      where: { id },
      data: {
        status: "WIN",
        winner,
        endedAt: new Date(),
      },
    });

    console.log(`[EXP_FORCE] ${id} → ${winner} (manual)`);

    res.json({
      ...exp,
      startedAt: exp.startedAt.toISOString(),
      endedAt: exp.endedAt?.toISOString() || null,
      createdAt: exp.createdAt.toISOString(),
      updatedAt: exp.updatedAt.toISOString(),
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "not_found" });
    }
    console.error("[POST /admin/exp/:id/force]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/admin/exp/:id/reset
 * 실험 재시작 (통계 초기화)
 */
router.post("/:id/reset", async (req, res) => {
  try {
    const { id } = req.params;

    // 통계 삭제
    await prisma.experimentStat.deleteMany({
      where: { expId: id },
    });

    // 실험 재시작
    const exp = await prisma.experiment.update({
      where: { id },
      data: {
        status: "RUNNING",
        winner: null,
        endedAt: null,
        startedAt: new Date(),
      },
    });

    console.log(`[EXP_RESET] ${id} restarted`);

    res.json({
      ...exp,
      startedAt: exp.startedAt.toISOString(),
      endedAt: exp.endedAt?.toISOString() || null,
      createdAt: exp.createdAt.toISOString(),
      updatedAt: exp.updatedAt.toISOString(),
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "not_found" });
    }
    console.error("[POST /admin/exp/:id/reset]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;

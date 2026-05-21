/**
 * 🔥 Admin Settlement Route - 정산 조회 API
 * 
 * Week3 핵심: 정산 아이템 조회/처리
 */

import { Router } from "express";
import { prisma } from "../data/prisma";

const router = Router();

/**
 * GET /api/admin/settlement
 * 정산 아이템 목록 조회
 */
router.get("/", async (req, res) => {
  try {
    const { ownerId, region, status, limit = "50", offset = "0" } = req.query;

    const where: any = {};

    if (ownerId) where.ownerId = ownerId;
    if (region) where.region = region;
    if (status) where.status = status;

    const items = await prisma.settlementItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit as string, 10),
      skip: parseInt(offset as string, 10),
    });

    const total = await prisma.settlementItem.count({ where });

    res.json({
      items,
      total,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
  } catch (error) {
    console.error("[GET /admin/settlement]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/settlement/summary
 * 정산 요약 (소유자별/지역별)
 */
router.get("/summary", async (req, res) => {
  try {
    const { ownerId, region } = req.query;

    const where: any = {};
    if (ownerId) where.ownerId = ownerId;
    if (region) where.region = region;

    const [ready, settled, hold] = await Promise.all([
      prisma.settlementItem.findMany({
        where: { ...where, status: "READY" },
      }),
      prisma.settlementItem.findMany({
        where: { ...where, status: "SETTLED" },
      }),
      prisma.settlementItem.findMany({
        where: { ...where, status: "HOLD" },
      }),
    ]);

    const readyTotal = ready.reduce((sum, item) => sum + item.net, 0);
    const settledTotal = settled.reduce((sum, item) => sum + item.net, 0);
    const holdTotal = hold.reduce((sum, item) => sum + item.net, 0);

    res.json({
      ready: {
        count: ready.length,
        total: readyTotal,
      },
      settled: {
        count: settled.length,
        total: settledTotal,
      },
      hold: {
        count: hold.length,
        total: holdTotal,
      },
      total: readyTotal + settledTotal + holdTotal,
    });
  } catch (error) {
    console.error("[GET /admin/settlement/summary]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/admin/settlement/:id/settle
 * 정산 완료 처리
 */
router.post("/:id/settle", async (req, res) => {
  try {
    const { id } = req.params;

    const item = await prisma.settlementItem.findUnique({
      where: { id },
    });

    if (!item) {
      return res.status(404).json({ error: "not_found" });
    }

    if (item.status !== "READY") {
      return res.status(400).json({ error: "item_not_ready" });
    }

    const updated = await prisma.settlementItem.update({
      where: { id },
      data: { status: "SETTLED" },
    });

    res.json(updated);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "not_found" });
    }
    console.error("[POST /admin/settlement/:id/settle]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/admin/settlement/batch
 * 정산 배치 처리 (주간 정산)
 */
router.post("/batch", async (req, res) => {
  try {
    const { ownerId, region, endDate } = req.body;

    const where: any = {
      status: "READY",
    };

    if (ownerId) where.ownerId = ownerId;
    if (region) where.region = region;
    if (endDate) {
      where.usedAt = { lte: new Date(endDate) };
    }

    const items = await prisma.settlementItem.findMany({
      where,
      orderBy: { usedAt: "asc" },
    });

    const updated = await prisma.settlementItem.updateMany({
      where,
      data: { status: "SETTLED" },
    });

    const total = items.reduce((sum, item) => sum + item.net, 0);

    res.json({
      ok: true,
      count: updated.count,
      total,
      message: "Settlement batch completed",
    });
  } catch (error) {
    console.error("[POST /admin/settlement/batch]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;

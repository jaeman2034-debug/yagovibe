/**
 * 🔥 Admin Campaign Route - 마케팅 캠페인 관리 API
 * 
 * Week5 핵심: 캠페인 CRUD + 발송 통계
 */

import { Router } from "express";
import { prisma } from "../data/prisma";

const router = Router();

/**
 * GET /api/admin/campaign
 * 모든 캠페인 목록 조회
 */
router.get("/", async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 발송 통계 포함
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        const sentCount = await prisma.messageLog.count({
          where: { campaignId: campaign.id },
        });

        const clickedCount = await prisma.messageLog.count({
          where: {
            campaignId: campaign.id,
            clicked: true,
          },
        });

        return {
          ...campaign,
          createdAt: campaign.createdAt.toISOString(),
          updatedAt: campaign.updatedAt.toISOString(),
          stats: {
            sent: sentCount,
            clicked: clickedCount,
            ctr: sentCount > 0 ? clickedCount / sentCount : 0,
          },
        };
      })
    );

    res.json(campaignsWithStats);
  } catch (error) {
    console.error("[GET /admin/campaign]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/campaign/:id
 * 특정 캠페인 상세 조회
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return res.status(404).json({ error: "not_found" });
    }

    const sentCount = await prisma.messageLog.count({
      where: { campaignId: id },
    });

    const clickedCount = await prisma.messageLog.count({
      where: {
        campaignId: id,
        clicked: true,
      },
    });

    res.json({
      ...campaign,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
      stats: {
        sent: sentCount,
        clicked: clickedCount,
        ctr: sentCount > 0 ? clickedCount / sentCount : 0,
      },
    });
  } catch (error) {
    console.error("[GET /admin/campaign/:id]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/admin/campaign
 * 캠페인 생성
 */
router.post("/", async (req, res) => {
  try {
    const { region, trigger, segment, msgA, msgB, status } = req.body;

    if (!region || !trigger || !msgA || !msgB) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const campaign = await prisma.campaign.create({
      data: {
        id: `c_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        region,
        trigger,
        segment: segment || "{}",
        msgA,
        msgB,
        status: status || "RUNNING",
      },
    });

    res.status(201).json({
      ...campaign,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[POST /admin/campaign]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * PATCH /api/admin/campaign/:id
 * 캠페인 수정
 */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { region, trigger, segment, msgA, msgB, status } = req.body;

    const updateData: any = {};
    if (region) updateData.region = region;
    if (trigger) updateData.trigger = trigger;
    if (segment) updateData.segment = segment;
    if (msgA) updateData.msgA = msgA;
    if (msgB) updateData.msgB = msgB;
    if (status) updateData.status = status;

    const campaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
    });

    res.json({
      ...campaign,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "not_found" });
    }
    console.error("[PATCH /admin/campaign/:id]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/admin/campaign/:id/click
 * 메시지 클릭 처리
 */
router.post("/:id/click", async (req, res) => {
  try {
    const { id } = req.params;
    const { messageLogId } = req.body;

    if (!messageLogId) {
      return res.status(400).json({ error: "messageLogId required" });
    }

    const { markMessageClicked } = await import("../domain/marketing.send");
    await markMessageClicked(messageLogId);

    res.json({ ok: true });
  } catch (error) {
    console.error("[POST /admin/campaign/:id/click]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;

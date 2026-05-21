/**
 * 🔥 Admin Stories Route - Admin 전용 스토리 관리 API
 * 
 * Week2 핵심: Admin UI DB 연결
 */

import { Router } from "express";
import { prisma } from "../data/prisma";
import type { StoryStatus } from "../domain/types";

const router = Router();

/**
 * GET /api/admin/stories
 * 스토리 목록 조회 (필터 지원)
 * 
 * Query:
 * - region: 지역 필터
 * - status: 상태 필터 (DRAFT, REVIEW, PUBLISHED, EXPIRED, REJECTED)
 * - source: 출처 필터 (운영, 협회, 사용자)
 * - category: 카테고리 필터 (대회, 모집, 협회, 마켓, 구장)
 * - limit: 페이지 크기 (기본 50)
 * - offset: 페이지 오프셋 (기본 0)
 */
router.get("/", async (req, res) => {
  try {
    const {
      region,
      status,
      source,
      category,
      limit = "50",
      offset = "0",
    } = req.query;

    const where: any = {};

    if (region) where.region = region;
    if (status) where.status = status as StoryStatus;
    if (source) where.source = source;
    if (category) where.category = category;

    const stories = await prisma.story.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: parseInt(limit as string, 10),
      skip: parseInt(offset as string, 10),
    });

    const total = await prisma.story.count({ where });

    res.json({
      stories: stories.map((s) => ({
        ...s,
        startAt: s.startAt.toISOString(),
        endAt: s.endAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      total,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
  } catch (error) {
    console.error("[GET /admin/stories]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/stories/:id
 * 스토리 상세 조회
 */
router.get("/:id", async (req, res) => {
  try {
    const story = await prisma.story.findUnique({
      where: { id: req.params.id },
    });

    if (!story) {
      return res.status(404).json({ error: "not_found" });
    }

    res.json({
      ...story,
      startAt: story.startAt.toISOString(),
      endAt: story.endAt.toISOString(),
      createdAt: story.createdAt.toISOString(),
      updatedAt: story.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[GET /admin/stories/:id]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * PATCH /api/admin/stories/:id
 * 스토리 수정 (기간/우선순위/제목/서브타이틀)
 */
router.patch("/:id", async (req, res) => {
  try {
    const { startAt, endAt, priority, title, subtitle, ctaType } = req.body;

    const updateData: any = {};
    if (startAt) updateData.startAt = new Date(startAt);
    if (endAt) updateData.endAt = new Date(endAt);
    if (priority !== undefined) {
      if (priority < 0 || priority > 100) {
        return res.status(400).json({ error: "priority must be 0-100" });
      }
      updateData.priority = priority;
    }
    if (title) {
      if (title.length > 40) {
        return res.status(400).json({ error: "title too long (max 40)" });
      }
      updateData.title = title;
    }
    if (subtitle) {
      if (subtitle.length > 60) {
        return res.status(400).json({ error: "subtitle too long (max 60)" });
      }
      updateData.subtitle = subtitle;
    }
    if (ctaType) updateData.ctaType = ctaType;

    const story = await prisma.story.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({
      ...story,
      startAt: story.startAt.toISOString(),
      endAt: story.endAt.toISOString(),
      createdAt: story.createdAt.toISOString(),
      updatedAt: story.updatedAt.toISOString(),
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "not_found" });
    }
    console.error("[PATCH /admin/stories/:id]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * PATCH /api/admin/stories/:id/status
 * 스토리 상태 변경 (승인/반려/만료)
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["DRAFT", "REVIEW", "PUBLISHED", "EXPIRED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "invalid status" });
    }

    const story = await prisma.story.update({
      where: { id: req.params.id },
      data: { status: status as StoryStatus },
    });

    res.json({
      ...story,
      startAt: story.startAt.toISOString(),
      endAt: story.endAt.toISOString(),
      createdAt: story.createdAt.toISOString(),
      updatedAt: story.updatedAt.toISOString(),
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "not_found" });
    }
    console.error("[PATCH /admin/stories/:id/status]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/admin/stories/:id/approve
 * 스토리 승인 (REVIEW → PUBLISHED)
 */
router.post("/:id/approve", async (req, res) => {
  try {
    const story = await prisma.story.findUnique({
      where: { id: req.params.id },
    });

    if (!story) {
      return res.status(404).json({ error: "not_found" });
    }

    if (story.status !== "REVIEW") {
      return res.status(400).json({ error: "story is not in REVIEW status" });
    }

    const updated = await prisma.story.update({
      where: { id: req.params.id },
      data: { status: "PUBLISHED" },
    });

    res.json({
      ...updated,
      startAt: updated.startAt.toISOString(),
      endAt: updated.endAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "not_found" });
    }
    console.error("[POST /admin/stories/:id/approve]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/admin/stories/:id/reject
 * 스토리 반려 (REVIEW → REJECTED)
 */
router.post("/:id/reject", async (req, res) => {
  try {
    const { reason } = req.body;

    const story = await prisma.story.findUnique({
      where: { id: req.params.id },
    });

    if (!story) {
      return res.status(404).json({ error: "not_found" });
    }

    if (story.status !== "REVIEW") {
      return res.status(400).json({ error: "story is not in REVIEW status" });
    }

    const updated = await prisma.story.update({
      where: { id: req.params.id },
      data: { status: "REJECTED" },
    });

    // 반려 사유는 추후 별도 테이블에 저장 가능
    console.log(`[REJECT] Story ${req.params.id} rejected. Reason: ${reason || "N/A"}`);

    res.json({
      ...updated,
      startAt: updated.startAt.toISOString(),
      endAt: updated.endAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "not_found" });
    }
    console.error("[POST /admin/stories/:id/reject]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * DELETE /api/admin/stories/:id
 * 스토리 삭제
 */
router.delete("/:id", async (req, res) => {
  try {
    await prisma.story.delete({
      where: { id: req.params.id },
    });

    res.json({ ok: true, message: "Story deleted" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "not_found" });
    }
    console.error("[DELETE /admin/stories/:id]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/stories/stats/summary
 * 스토리 통계 요약
 */
router.get("/stats/summary", async (req, res) => {
  try {
    const { region } = req.query;

    const where: any = {};
    if (region) where.region = region;

    const [total, published, review, expired, rejected] = await Promise.all([
      prisma.story.count({ where }),
      prisma.story.count({ where: { ...where, status: "PUBLISHED" } }),
      prisma.story.count({ where: { ...where, status: "REVIEW" } }),
      prisma.story.count({ where: { ...where, status: "EXPIRED" } }),
      prisma.story.count({ where: { ...where, status: "REJECTED" } }),
    ]);

    res.json({
      total,
      published,
      review,
      expired,
      rejected,
      region: region || "all",
    });
  } catch (error) {
    console.error("[GET /admin/stories/stats/summary]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;

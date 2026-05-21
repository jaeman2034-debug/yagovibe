/**
 * 🔥 Stories Route - GET/POST/PATCH 스텁
 * 
 * Week1~2 API Stub 기준
 */

import { Router } from "express";
import type { CreateStoryReq, GetStoriesRes, Story } from "../domain/types";
import { applyDefaultSchedule, validateStoryInput } from "../domain/validators";
import { detectSeasonDecision } from "../domain/season.detector";
import { rerankStories } from "../domain/personal.rank";
import { assignVariant } from "../domain/exp.assign";
import { cachedStories } from "../cache/stories.cache";
import { prisma } from "../data/prisma";

const router = Router();

// isActiveNow는 이제 Prisma where 조건으로 처리

/**
 * GET /api/stories
 * 스토리 목록 조회 (DB 전환)
 */
router.get("/", async (req: any, res) => {
  try {
    const region = req.region || (req.query.region as string) || "seoul";
    const userId = (req.query.userId as string) || null;
    const now = new Date();

    // 캐시된 스토리 조회
    const result = await cachedStories(
      region,
      async () => {
        // DB에서 활성 스토리 조회 (폴백: DB 장애 시 seed 반환)
        let stories: Story[];
        try {
          stories = await prisma.story.findMany({
            where: {
              region,
              status: "PUBLISHED",
              startAt: { lte: now },
              endAt: { gte: now },
            },
            orderBy: { priority: "desc" },
          });

          // 스토리가 없으면 seed 반환
          if (stories.length === 0) {
            const { createSeedStories } = await import("../data/seed.stories");
            stories = createSeedStories(region);
          }
        } catch (error) {
          // DB 장애 시 seed 반환
          console.warn(`[FALLBACK] DB error, using seed stories for ${region}`);
          const { createSeedStories } = await import("../data/seed.stories");
          stories = createSeedStories(region);
        }

        // 리그 조회 (시즌 판정용, 폴백: 빈 배열)
        let leagues: any[];
        try {
          leagues = await prisma.league.findMany({
            where: { region },
          });
        } catch (error) {
          console.warn(`[FALLBACK] League query failed for ${region}`);
          leagues = [];
        }

        // 1) 시즌 판정
        const decision = detectSeasonDecision(
          leagues.length > 0 ? leagues : null,
          stories as Story[]
        );

        // 2) 개인화 리랭킹
        const ranked = await rerankStories(userId, stories as Story[]);

        // 3) AB 테스트 - CTA 카피 실험
        // 승자가 결정되면 승자로 고정, 아니면 개인 할당
        const exp = await prisma.experiment.findUnique({
          where: { id: "hub_story_cta" },
        });

        let ctaVariant: "A" | "B";
        if (exp?.status === "WIN" && exp.winner) {
          // 승자 고정
          ctaVariant = exp.winner as "A" | "B";
        } else {
          // 개인 할당
          ctaVariant = assignVariant(userId, "hub_story_cta");
        }

        // CTA 라벨 매핑
        const CTA_LABEL_MAP: Record<string, { A: string; B: string }> = {
          view_schedule: { A: "일정 보기", B: "지금 확인" },
          find_team: { A: "팀 찾기", B: "참여하기" },
          view_notice: { A: "공지 보기", B: "자세히 보기" },
          browse_market: { A: "보러가기", B: "지금 보기" },
          book_ground: { A: "예약하기", B: "바로 예약" },
        };

        const finalStories = ranked.map((s) => {
          const ctaLabelMap = s.ctaType
            ? CTA_LABEL_MAP[s.ctaType] || { A: "자세히 보기", B: "지금 확인" }
            : { A: "자세히 보기", B: "지금 확인" };

          return {
            ...s,
            startAt: s.startAt.toISOString(),
            endAt: s.endAt.toISOString(),
            createdAt: s.createdAt.toISOString(),
            updatedAt: s.updatedAt.toISOString(),
            _ctaLabel: ctaVariant === "A" ? ctaLabelMap.A : ctaLabelMap.B,
          };
        });

        return {
          stories: finalStories as Story[],
          mode: decision.mode,
          decisionReason: decision.reason,
          serverTime: new Date().toISOString(),
          experiment: {
            key: "hub_story_cta",
            variant: ctaVariant,
          },
        };
      },
      30_000 // 30초 캐시
    );

    // 캐시 헤더 설정
    res.setHeader("Cache-Control", "public, max-age=20");
    res.json(result);
  } catch (error) {
    console.error("[GET /stories]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/stories
 * 스토리 생성 (DB 전환)
 */
router.post("/", async (req, res) => {
  try {
    const input = req.body as CreateStoryReq;

    validateStoryInput(input);
    const withSchedule = applyDefaultSchedule(input);

    const story = await prisma.story.create({
      data: {
        id: `s_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        region: withSchedule.region,
        source: withSchedule.source,
        category: withSchedule.category,
        title: withSchedule.title,
        subtitle: withSchedule.subtitle,
        status:
          withSchedule.status ??
          (withSchedule.source === "사용자" ? "REVIEW" : "PUBLISHED"),
        startAt: new Date(withSchedule.startAt!),
        endAt: new Date(withSchedule.endAt!),
        ctaType: withSchedule.ctaType,
        priority: withSchedule.priority ?? 50,
        score: withSchedule.score ?? 0,
        isVerifiedAuthor: withSchedule.isVerifiedAuthor ?? false,
      },
    });

    res.status(201).json({ id: story.id });
  } catch (error) {
    console.error("[POST /stories]", error);
    res.status(400).json({
      error: error instanceof Error ? error.message : "Invalid input",
    });
  }
});

/**
 * PATCH /api/stories/:id
 * 스토리 수정 (DB 전환)
 */
router.patch("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const patch = req.body as Partial<CreateStoryReq>;

    const updateData: any = {};
    if (patch.title) updateData.title = patch.title;
    if (patch.subtitle) updateData.subtitle = patch.subtitle;
    if (patch.status) updateData.status = patch.status;
    if (patch.priority !== undefined) updateData.priority = patch.priority;
    if (patch.startAt) updateData.startAt = new Date(patch.startAt);
    if (patch.endAt) updateData.endAt = new Date(patch.endAt);

    const updated = await prisma.story.update({
      where: { id },
      data: updateData,
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
    console.error("[PATCH /stories/:id]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * PATCH /api/stories/:id/priority
 * 우선순위 수정 (DB 전환)
 */
router.patch("/:id/priority", async (req, res) => {
  try {
    const id = req.params.id;
    const { priority } = req.body as { priority: number };

    if (typeof priority !== "number" || priority < 0 || priority > 100) {
      return res.status(400).json({ error: "priority must be 0-100" });
    }

    const updated = await prisma.story.update({
      where: { id },
      data: { priority },
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
    console.error("[PATCH /stories/:id/priority]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * PATCH /api/stories/:id/extend
 * 기간 연장 (DB 전환)
 */
router.patch("/:id/extend", async (req, res) => {
  try {
    const id = req.params.id;
    const { days } = req.body as { days: number };

    if (typeof days !== "number" || days < 1) {
      return res.status(400).json({ error: "days must be >= 1" });
    }

    const current = await prisma.story.findUnique({
      where: { id },
    });

    if (!current) {
      return res.status(404).json({ error: "not_found" });
    }

    const newEnd = new Date(
      current.endAt.getTime() + days * 24 * 60 * 60 * 1000
    );

    const updated = await prisma.story.update({
      where: { id },
      data: { endAt: newEnd },
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
    console.error("[PATCH /stories/:id/extend]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;

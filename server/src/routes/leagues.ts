/**
 * 🔥 Leagues Route - 시즌 판정용 스텁
 * 
 * Week1~2 API Stub 기준
 */

import { Router } from "express";
import type { LeagueInfo } from "../domain/types";
import { prisma } from "../data/prisma";

const router = Router();

/**
 * GET /api/leagues
 * 리그 목록 조회 (DB 전환)
 */
router.get("/", async (req, res) => {
  try {
    const region = (req.query.region as string) || "seoul";

    const leagues = await prisma.league.findMany({
      where: { region },
      orderBy: { startAt: "asc" },
    });

    const result: LeagueInfo[] = leagues.map((l) => ({
      id: l.id,
      region: l.region,
      name: l.name,
      startAt: l.startAt.toISOString(),
      endAt: l.endAt.toISOString(),
    }));

    res.json(result);
  } catch (error) {
    console.error("[GET /leagues]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/leagues
 * 리그 생성 (Week2 협회 동기화용)
 */
router.post("/", async (req, res) => {
  try {
    const { region, name, startAt, endAt } = req.body;

    if (!region || !name || !startAt || !endAt) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const league = await prisma.league.create({
      data: {
        id: `l_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        region,
        name,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
      },
    });

    res.status(201).json({
      id: league.id,
      region: league.region,
      name: league.name,
      startAt: league.startAt.toISOString(),
      endAt: league.endAt.toISOString(),
    });
  } catch (error) {
    console.error("[POST /leagues]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;

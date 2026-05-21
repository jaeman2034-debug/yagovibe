/**
 * 🔥 League Community Route - 커뮤니티 리그 API
 * 
 * Week4 핵심: 리그 생성 → 스토리 자동 생성 → 시즌 모드 트리거
 */

import { Router } from "express";
import { prisma } from "../data/prisma";
import {
  createLeague,
  createMatch,
  recordMatchResult,
  updateLeagueStatus,
} from "../domain/league.service";

const router = Router();

/**
 * GET /api/league/community
 * 커뮤니티 리그 목록 조회
 */
router.get("/", async (req: any, res) => {
  try {
    const region = req.region || (req.query.region as string) || "seoul";
    const status = req.query.status as string | undefined;

    const where: any = { region };
    if (status) {
      where.status = status;
    }

    const leagues = await prisma.league.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json(leagues);
  } catch (error) {
    console.error("[GET /league/community]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/league/community/:id
 * 리그 상세 조회
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const league = await prisma.league.findUnique({
      where: { id },
    });

    if (!league) {
      return res.status(404).json({ error: "not_found" });
    }

    // 경기 목록 조회
    const matches = await prisma.match.findMany({
      where: { leagueId: id },
      orderBy: { time: "asc" },
    });

    res.json({
      ...league,
      matches,
    });
  } catch (error) {
    console.error("[GET /league/community/:id]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/league/community
 * 리그 생성 (대회 스토리 자동 생성)
 */
router.post("/", async (req, res) => {
  try {
    const { region, name, season, startAt, endAt } = req.body;

    if (!region || !name || !season || !startAt || !endAt) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await createLeague({
      region,
      name,
      season,
      startAt,
      endAt,
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("[POST /league/community]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/league/community/match
 * 경기 등록
 */
router.post("/match", async (req, res) => {
  try {
    const { leagueId, homeTeam, awayTeam, groundId, time } = req.body;

    if (!leagueId || !homeTeam || !awayTeam || !groundId || !time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await createMatch({
      leagueId,
      homeTeam,
      awayTeam,
      groundId,
      time,
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("[POST /league/community/match]", error);

    if (
      error.message === "league_not_found" ||
      error.message === "ground_not_found"
    ) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/league/community/match/:id/result
 * 경기 결과 등록
 */
router.post("/match/:id/result", async (req, res) => {
  try {
    const { id } = req.params;
    const { homeScore, awayScore } = req.body;

    if (typeof homeScore !== "number" || typeof awayScore !== "number") {
      return res.status(400).json({ error: "Invalid scores" });
    }

    await recordMatchResult(id, homeScore, awayScore);

    res.json({ ok: true, message: "Match result recorded" });
  } catch (error: any) {
    console.error("[POST /league/community/match/:id/result]", error);

    if (error.message === "match_not_found") {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * PATCH /api/league/community/:id/status
 * 리그 상태 업데이트
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["READY", "RUNNING", "END"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await updateLeagueStatus(id, status);

    res.json({ ok: true, message: `League status updated to ${status}` });
  } catch (error: any) {
    console.error("[PATCH /league/community/:id/status]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;

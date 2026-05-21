/**
 * 🔥 Team Route - 팀 API
 * 
 * Week4 핵심: 팀 생성/가입 → 스토리 자동 생성
 */

import { Router } from "express";
import { prisma } from "../data/prisma";
import { createTeam, joinTeam, updateRecruitStatus } from "../domain/team.service";

const router = Router();

/**
 * GET /api/team
 * 팀 목록 조회
 */
router.get("/", async (req: any, res) => {
  try {
    const region = req.region || (req.query.region as string) || "seoul";
    const recruitStatus = req.query.recruitStatus as string | undefined;

    const where: any = { region };
    if (recruitStatus) {
      where.recruitStatus = recruitStatus;
    }

    const teams = await prisma.team.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json(teams);
  } catch (error) {
    console.error("[GET /team]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/team/:id
 * 팀 상세 조회
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        // Prisma 관계가 설정되어 있다면
        // members: true
      },
    });

    if (!team) {
      return res.status(404).json({ error: "not_found" });
    }

    // 멤버 수 조회
    const memberCount = await prisma.teamMember.count({
      where: { teamId: id },
    });

    res.json({
      ...team,
      memberCount,
    });
  } catch (error) {
    console.error("[GET /team/:id]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/team
 * 팀 생성 (모집 스토리 자동 생성)
 */
router.post("/", async (req, res) => {
  try {
    const { region, name, level, homeGroundId, managerId } = req.body;

    if (!region || !name || !level || !managerId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const team = await createTeam({
      region,
      name,
      level,
      homeGroundId,
      managerId,
    });

    res.status(201).json(team);
  } catch (error: any) {
    console.error("[POST /team]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/team/:id/join
 * 팀 가입
 */
router.post("/:id/join", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const result = await joinTeam(id, userId);

    res.status(201).json(result);
  } catch (error: any) {
    console.error("[POST /team/:id/join]", error);

    if (
      error.message === "team_not_found" ||
      error.message === "already_joined" ||
      error.message === "recruitment_closed"
    ) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/team/:id/members
 * 팀 멤버 목록
 */
router.get("/:id/members", async (req, res) => {
  try {
    const { id } = req.params;

    const members = await prisma.teamMember.findMany({
      where: { teamId: id },
      orderBy: [
        { role: "asc" }, // manager 먼저
        { createdAt: "asc" },
      ],
    });

    res.json(members);
  } catch (error) {
    console.error("[GET /team/:id/members]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * PATCH /api/team/:id/recruit
 * 모집 상태 변경
 */
router.patch("/:id/recruit", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, managerId } = req.body;

    if (!status || !managerId) {
      return res.status(400).json({ error: "status and managerId required" });
    }

    if (status !== "OPEN" && status !== "CLOSE") {
      return res.status(400).json({ error: "Invalid status" });
    }

    await updateRecruitStatus(id, status, managerId);

    res.json({ ok: true, message: `Recruitment ${status}` });
  } catch (error: any) {
    console.error("[PATCH /team/:id/recruit]", error);

    if (error.message === "unauthorized") {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;

/**
 * 🔥 Team Service - 팀 서비스
 * 
 * Week4 핵심: 팀 생성 → 스토리 자동 생성
 */

import { prisma } from "../data/prisma";

/**
 * 팀 생성 (모집 스토리 자동 생성)
 */
export async function createTeam(input: {
  region: string;
  name: string;
  level: string;
  homeGroundId?: string;
  managerId: string;
}) {
  const team = await prisma.team.create({
    data: {
      id: `t_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      region: input.region,
      name: input.name,
      level: input.level,
      homeGroundId: input.homeGroundId,
      recruitStatus: "OPEN",
    },
  });

  // 팀장 자동 가입
  await prisma.teamMember.create({
    data: {
      id: `tm_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      teamId: team.id,
      userId: input.managerId,
      role: "manager",
    },
  });

  // 모집 스토리 자동 생성
  const levelLabel =
    input.level === "beginner"
      ? "초보"
      : input.level === "normal"
      ? "중급"
      : "고급";

  await prisma.story.create({
    data: {
      id: `team_story_${team.id}`,
      region: team.region,
      source: "운영",
      category: "모집",
      title: `${team.name} 팀원 모집`,
      subtitle: `${levelLabel} 레벨 환영`,
      status: "PUBLISHED",
      startAt: new Date(),
      endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일
      ctaType: "find_team",
      priority: 70,
      score: 0,
      isVerifiedAuthor: false,
    },
  });

  console.log(`[TEAM_CREATED] Team ${team.id} created, story auto-generated`);

  return team;
}

/**
 * 팀 가입
 */
export async function joinTeam(teamId: string, userId: string): Promise<{
  teamMemberId: string;
  teamId: string;
  userId: string;
  role: string;
}> {
  // 중복 가입 체크
  const existing = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
  });

  if (existing) {
    throw new Error("already_joined");
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    throw new Error("team_not_found");
  }

  if (team.recruitStatus === "CLOSE") {
    throw new Error("recruitment_closed");
  }

  const member = await prisma.teamMember.create({
    data: {
      id: `tm_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      teamId,
      userId,
      role: "member",
    },
  });

  console.log(`[TEAM_JOIN] User ${userId} joined team ${teamId}`);

  return {
    teamMemberId: member.id,
    teamId: member.teamId,
    userId: member.userId,
    role: member.role,
  };
}

/**
 * 팀 모집 상태 변경
 */
export async function updateRecruitStatus(
  teamId: string,
  status: "OPEN" | "CLOSE",
  managerId: string
): Promise<void> {
  // 권한 체크
  const member = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId: managerId,
      },
    },
  });

  if (!member || member.role !== "manager") {
    throw new Error("unauthorized");
  }

  await prisma.team.update({
    where: { id: teamId },
    data: { recruitStatus: status },
  });

  // 모집 종료 시 스토리 만료
  if (status === "CLOSE") {
    await prisma.story.updateMany({
      where: {
        id: `team_story_${teamId}`,
      },
      data: {
        status: "EXPIRED",
      },
    });
  }
}

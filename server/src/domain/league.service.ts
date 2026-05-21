/**
 * 🔥 League Service - 리그 서비스
 * 
 * Week4 핵심: 리그 생성 → 스토리 자동 생성 → 시즌 모드 트리거
 */

import { prisma } from "../data/prisma";

/**
 * 리그 생성 (대회 스토리 자동 생성)
 */
export async function createLeague(input: {
  region: string;
  name: string;
  season: string;
  startAt: string;
  endAt: string;
}): Promise<{
  leagueId: string;
  storyId: string;
}> {
  const league = await prisma.league.create({
    data: {
      id: `l_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      region: input.region,
      name: input.name,
      season: input.season,
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      status: "READY",
    },
  });

  // 대회 스토리 자동 생성
  const story = await prisma.story.create({
    data: {
      id: `league_story_${league.id}`,
      region: league.region,
      source: "협회",
      category: "대회",
      title: `${league.name} 개막`,
      subtitle: `${league.season} 시즌`,
      status: "PUBLISHED",
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      ctaType: "view_schedule",
      priority: 95,
      score: 0,
      isVerifiedAuthor: false,
    },
  });

  console.log(
    `[LEAGUE_CREATED] League ${league.id} created, story auto-generated, season mode triggered`
  );

  return {
    leagueId: league.id,
    storyId: story.id,
  };
}

/**
 * 경기 등록
 */
export async function createMatch(input: {
  leagueId: string;
  homeTeam: string;
  awayTeam: string;
  groundId: string;
  time: string;
}): Promise<{
  matchId: string;
}> {
  // 리그 존재 확인
  const league = await prisma.league.findUnique({
    where: { id: input.leagueId },
  });

  if (!league) {
    throw new Error("league_not_found");
  }

  // 구장 존재 확인
  const ground = await prisma.ground.findUnique({
    where: { id: input.groundId },
  });

  if (!ground) {
    throw new Error("ground_not_found");
  }

  const match = await prisma.match.create({
    data: {
      id: `m_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      leagueId: input.leagueId,
      homeTeam: input.homeTeam,
      awayTeam: input.awayTeam,
      groundId: input.groundId,
      time: new Date(input.time),
      status: "SCHEDULED",
    },
  });

  console.log(`[MATCH_CREATED] Match ${match.id} created`);

  return {
    matchId: match.id,
  };
}

/**
 * 경기 결과 등록
 */
export async function recordMatchResult(
  matchId: string,
  homeScore: number,
  awayScore: number
): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match) {
    throw new Error("match_not_found");
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore,
      awayScore,
      status: "FINISHED",
    },
  });

  console.log(
    `[MATCH_RESULT] Match ${matchId}: ${homeScore} - ${awayScore}`
  );
}

/**
 * 리그 상태 업데이트
 */
export async function updateLeagueStatus(
  leagueId: string,
  status: "READY" | "RUNNING" | "END"
): Promise<void> {
  await prisma.league.update({
    where: { id: leagueId },
    data: { status },
  });
}

/**
 * 🔥 Marketing Examples - 마케팅 트리거 예시 구현
 * 
 * Week5 핵심: 다양한 트리거별 발송 로직
 */

import { prisma } from "../data/prisma";
import { sendMessage } from "./marketing.send";
import { matchSegment } from "./marketing.segment";

/**
 * 대회 임박 트리거
 * - 곧 시작하는 리그가 있을 때
 * - 대회 관심도가 높은 사용자에게 발송
 */
export async function triggerLeagueSoon(campaign: {
  id: string;
  region: string;
  segment: string;
  msgA: string;
  msgB: string;
}): Promise<number> {
  // 곧 시작하는 리그 확인 (7일 이내)
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  const upcomingLeagues = await prisma.league.findMany({
    where: {
      region: campaign.region,
      status: "READY",
      startAt: {
        lte: sevenDaysLater,
        gte: new Date(),
      },
    },
  });

  if (upcomingLeagues.length === 0) {
    return 0;
  }

  // 해당 지역 사용자 조회
  const users = await prisma.userProfile.findMany({
    where: { region: campaign.region },
  });

  let sentCount = 0;

  for (const user of users) {
    // 세그먼트 필터
    if (!matchSegment(user, campaign.segment)) {
      continue;
    }

    // 발송
    const sent = await sendMessage(user, campaign);
    if (sent) {
      sentCount++;
    }
  }

  console.log(`[TRIGGER_LEAGUE_SOON] Campaign ${campaign.id}: ${sentCount} messages sent`);
  return sentCount;
}

/**
 * 팀 모집 트리거
 * - 모집 중인 팀이 있을 때
 * - 팀 찾기 관심도가 높은 사용자에게 발송
 */
export async function triggerRecruit(campaign: {
  id: string;
  region: string;
  segment: string;
  msgA: string;
  msgB: string;
}): Promise<number> {
  // 모집 중인 팀 확인
  const recruitingTeams = await prisma.team.findMany({
    where: {
      region: campaign.region,
      recruitStatus: "OPEN",
    },
  });

  if (recruitingTeams.length === 0) {
    return 0;
  }

  // 해당 지역 사용자 조회
  const users = await prisma.userProfile.findMany({
    where: { region: campaign.region },
  });

  let sentCount = 0;

  for (const user of users) {
    // 세그먼트 필터
    if (!matchSegment(user, campaign.segment)) {
      continue;
    }

    // 발송
    const sent = await sendMessage(user, campaign);
    if (sent) {
      sentCount++;
    }
  }

  console.log(`[TRIGGER_RECRUIT] Campaign ${campaign.id}: ${sentCount} messages sent`);
  return sentCount;
}

/**
 * 할인 트리거
 * - 구장 할인이 있을 때
 * - 구장 예약 관심도가 높은 사용자에게 발송
 */
export async function triggerDiscount(campaign: {
  id: string;
  region: string;
  segment: string;
  msgA: string;
  msgB: string;
}): Promise<number> {
  // 할인 슬롯 확인 (예: 가격이 평균보다 20% 낮은 슬롯)
  // 실제 구현 시 Ground/Slot 모델에 할인 정보 추가 필요
  // 여기서는 stub로 처리

  const users = await prisma.userProfile.findMany({
    where: { region: campaign.region },
  });

  let sentCount = 0;

  for (const user of users) {
    // 세그먼트 필터
    if (!matchSegment(user, campaign.segment)) {
      continue;
    }

    // 발송
    const sent = await sendMessage(user, campaign);
    if (sent) {
      sentCount++;
    }
  }

  console.log(`[TRIGGER_DISCOUNT] Campaign ${campaign.id}: ${sentCount} messages sent`);
  return sentCount;
}

/**
 * 미접속 사용자 트리거
 * - 7일 이상 접속하지 않은 사용자에게 발송
 */
export async function triggerInactive(campaign: {
  id: string;
  region: string;
  segment: string;
  msgA: string;
  msgB: string;
}): Promise<number> {
  // 7일 전 날짜
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 최근 7일간 메시지를 받지 않은 사용자 조회
  const recentRecipients = await prisma.messageLog.findMany({
    where: {
      sentAt: {
        gte: sevenDaysAgo,
      },
    },
    select: {
      userId: true,
    },
    distinct: ["userId"],
  });

  const recentUserIds = new Set(recentRecipients.map((r) => r.userId));

  // 모든 사용자 조회
  const allUsers = await prisma.userProfile.findMany({
    where: campaign.region ? { region: campaign.region } : undefined,
  });

  // 최근 메시지를 받지 않은 사용자 필터링
  const inactiveUsers = allUsers.filter((u) => !recentUserIds.has(u.id));

  let sentCount = 0;

  for (const user of inactiveUsers) {
    // 세그먼트 필터
    if (!matchSegment(user, campaign.segment)) {
      continue;
    }

    // 발송
    const sent = await sendMessage(user, campaign);
    if (sent) {
      sentCount++;
    }
  }

  console.log(`[TRIGGER_INACTIVE] Campaign ${campaign.id}: ${sentCount} messages sent`);
  return sentCount;
}

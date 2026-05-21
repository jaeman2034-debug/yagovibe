/**
 * 🎯 Autopilot Actions - 개별 액션 실행 구현
 */

import { prisma } from "../data/prisma";
import { Action } from "../domain/autopilot.rules";

/**
 * 1) 스토리 자동 교체
 * CTR 하락 시 가장 낮은 점수 스토리를 만료하고 새 스토리 생성
 */
export async function replaceStory(
  region: string,
  reason: string
): Promise<void> {
  try {
    // 가장 낮은 점수 스토리 찾기
    const lowStory = await prisma.story.findFirst({
      where: {
        region,
        status: "PUBLISHED",
        startAt: { lte: new Date() },
        endAt: { gte: new Date() },
      },
      orderBy: { score: "asc" },
    });

    if (lowStory) {
      // 낮은 점수 스토리 만료
      await prisma.story.update({
        where: { id: lowStory.id },
        data: { status: "EXPIRED" },
      });

      console.log(`[AUTO] 스토리 교체: ${lowStory.id} → 만료 (${reason})`);
    }

    // 새 스토리 생성 (구장 예약 유도)
    const newStory = await prisma.story.create({
      data: {
        region,
        source: "OPS",
        category: "구장",
        title: "오늘 예약 가능한 구장",
        subtitle: "지금 바로 예약하고 경기하세요",
        status: "PUBLISHED",
        startAt: new Date(),
        endAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3일
        priority: 80,
        score: 50,
        ctaType: "book_ground",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`[AUTO] 새 스토리 생성: ${newStory.id} (${reason})`);

    // 액션 로그 기록
    await prisma.eventLog.create({
      data: {
        eventName: "autopilot_action",
        region,
        metadata: JSON.stringify({
          action: "REPLACE_STORY",
          reason,
          oldStoryId: lowStory?.id,
          newStoryId: newStory.id,
        }),
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[AUTO] replaceStory 실패:", error);
    throw error;
  }
}

/**
 * 2) 할인 자동 ON
 * Reserve CR 하락 시 할인 캠페인 자동 생성
 */
export async function enableDiscount(
  region: string,
  reason: string
): Promise<void> {
  try {
    // 이미 활성화된 할인 캠페인이 있는지 확인
    const existing = await prisma.campaign.findFirst({
      where: {
        region,
        trigger: "discount",
        status: "RUNNING",
      },
    });

    if (existing) {
      console.log(`[AUTO] 할인 캠페인 이미 활성화됨: ${existing.id}`);
      return;
    }

    // 새 할인 캠페인 생성
    const campaign = await prisma.campaign.create({
      data: {
        region,
        trigger: "discount",
        segment: JSON.stringify({}),
        msgA: "오늘 예약 10% 할인",
        msgB: "지금만 10% 혜택",
        status: "RUNNING",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`[AUTO] 할인 캠페인 생성: ${campaign.id} (${reason})`);

    // 액션 로그 기록
    await prisma.eventLog.create({
      data: {
        eventName: "autopilot_action",
        region,
        metadata: JSON.stringify({
          action: "DISCOUNT_ON",
          reason,
          campaignId: campaign.id,
        }),
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[AUTO] enableDiscount 실패:", error);
    throw error;
  }
}

/**
 * 3) 결제 보호 모드
 * PayFail 급등 시 결제 보호 모드 활성화 (로깅 강화, 재시도 증가)
 */
export async function payProtectMode(
  region: string,
  reason: string
): Promise<void> {
  try {
    console.log(`[AUTO] 결제 보호 모드 ON (${region}) - ${reason}`);

    // 결제 보호 모드 플래그 설정 (환경변수 또는 DB 설정 테이블)
    // 실제 구현 시에는 설정 테이블에 저장하거나 Redis에 플래그 설정

    // 액션 로그 기록
    await prisma.eventLog.create({
      data: {
        eventName: "autopilot_action",
        region,
        metadata: JSON.stringify({
          action: "PAY_PROTECT",
          reason,
          mode: "ON",
        }),
        createdAt: new Date(),
      },
    });

    // TODO: 실제 결제 보호 로직
    // - PG 재시도 횟수 증가
    // - 웹훅 타임아웃 증가
    // - 결제 로그 상세 기록
  } catch (error) {
    console.error("[AUTO] payProtectMode 실패:", error);
    throw error;
  }
}

/**
 * 4) 슬롯 부족 알림
 * FillRate 부족 시 운영자에게 알림
 */
export async function alertSlot(region: string, reason: string): Promise<void> {
  try {
    console.log(`[AUTO] ${region} 슬롯 부족 알림 - ${reason}`);

    // 액션 로그 기록 (운영자 알림 트리거)
    await prisma.eventLog.create({
      data: {
        eventName: "autopilot_action",
        region,
        metadata: JSON.stringify({
          action: "NEED_SLOT",
          reason,
          alert: true,
        }),
        createdAt: new Date(),
      },
    });

    // TODO: 실제 알림 발송 (Slack, Email 등)
    // - 운영자에게 즉시 알림
    // - 구장 슬롯 추가 요청
  } catch (error) {
    console.error("[AUTO] alertSlot 실패:", error);
    throw error;
  }
}

/**
 * 5) 모집 스토리 부스팅
 * 팀 가입 부족 시 모집 스토리 우선순위 상승
 */
export async function boostRecruit(
  region: string,
  reason: string
): Promise<void> {
  try {
    // 모집 카테고리 스토리 찾기
    const recruitStories = await prisma.story.findMany({
      where: {
        region,
        category: "모집",
        status: "PUBLISHED",
        startAt: { lte: new Date() },
        endAt: { gte: new Date() },
      },
    });

    // 우선순위 상승 (최대 2개)
    for (const story of recruitStories.slice(0, 2)) {
      await prisma.story.update({
        where: { id: story.id },
        data: {
          priority: Math.min(story.priority + 20, 100),
          score: Math.min((story.score || 0) + 10, 100),
        },
      });

      console.log(`[AUTO] 모집 스토리 부스팅: ${story.id} (${reason})`);
    }

    // 액션 로그 기록
    await prisma.eventLog.create({
      data: {
        eventName: "autopilot_action",
        region,
        metadata: JSON.stringify({
          action: "BOOST_RECRUIT",
          reason,
          boostedCount: Math.min(recruitStories.length, 2),
        }),
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[AUTO] boostRecruit 실패:", error);
    throw error;
  }
}

/**
 * 6) 운영자 알림
 * Critical 이슈 발생 시 운영자에게 즉시 알림
 */
export async function alertOperator(
  region: string,
  reason: string,
  severity: "warning" | "critical"
): Promise<void> {
  try {
    console.log(
      `[AUTO] 운영자 알림 [${severity.toUpperCase()}] (${region}) - ${reason}`
    );

    // 액션 로그 기록
    await prisma.eventLog.create({
      data: {
        eventName: "autopilot_action",
        region,
        metadata: JSON.stringify({
          action: "ALERT_OPERATOR",
          reason,
          severity,
          timestamp: new Date().toISOString(),
        }),
        createdAt: new Date(),
      },
    });

    // TODO: 실제 알림 발송
    // - Critical: 즉시 Slack/Email/SMS
    // - Warning: 대시보드 알림
  } catch (error) {
    console.error("[AUTO] alertOperator 실패:", error);
    throw error;
  }
}

/**
 * 액션 실행 라우터
 */
export async function executeAction(
  action: Action,
  region: string
): Promise<void> {
  switch (action.type) {
    case "REPLACE_STORY":
      await replaceStory(region, action.reason);
      break;
    case "DISCOUNT_ON":
      await enableDiscount(region, action.reason);
      break;
    case "PAY_PROTECT":
      await payProtectMode(region, action.reason);
      break;
    case "NEED_SLOT":
      await alertSlot(region, action.reason);
      break;
    case "BOOST_RECRUIT":
      await boostRecruit(region, action.reason);
      break;
    case "ALERT_OPERATOR":
      await alertOperator(region, action.reason, action.severity);
      break;
    default:
      console.warn(`[AUTO] 알 수 없는 액션 타입: ${(action as any).type}`);
  }
}

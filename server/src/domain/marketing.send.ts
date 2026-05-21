/**
 * 🔥 Marketing Send - 마케팅 메시지 발송 코어
 * 
 * Week5 핵심: AB 메시지 발송 + 빈도 제한 + KPI 로그
 */

import { prisma } from "../data/prisma";
import { assignVariant } from "./exp.assign";

const DAILY_LIMIT = 1; // 1일 1회 제한

/**
 * 사용자에게 마케팅 메시지 발송
 * 
 * @param user 사용자 프로필
 * @param campaign 캠페인 정보
 * @returns 발송 성공 여부
 */
export async function sendMessage(
  user: {
    id: string;
    region: string;
    level?: string | null;
  },
  campaign: {
    id: string;
    msgA: string;
    msgB: string;
  }
): Promise<boolean> {
  try {
    // 빈도 제한 체크
    const today = new Date().toISOString().slice(0, 10);

    const sentToday = await prisma.messageLog.count({
      where: {
        userId: user.id,
        sentAt: {
          gte: new Date(`${today}T00:00:00Z`),
          lt: new Date(`${today}T23:59:59Z`),
        },
      },
    });

    if (sentToday >= DAILY_LIMIT) {
      console.log(`[SEND_SKIP] User ${user.id} already received ${sentToday} messages today`);
      return false;
    }

    // AB variant 할당
    const variant = assignVariant(user.id, campaign.id) as "A" | "B";

    // 메시지 선택
    const msg = variant === "A" ? campaign.msgA : campaign.msgB;

    // 실제 발송 (stub - 실제로는 푸시/카카오톡 등)
    console.log(`[SEND] User ${user.id} → Campaign ${campaign.id} (${variant}): ${msg.substring(0, 50)}...`);

    // 발송 로그 저장
    await prisma.messageLog.create({
      data: {
        id: `m_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        userId: user.id,
        campaignId: campaign.id,
        variant,
      },
    });

    // KPI 로그
    await prisma.eventLog.create({
      data: {
        id: `e_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        eventName: "msg_send",
        payload: JSON.stringify({
          campaignId: campaign.id,
          variant,
          userId: user.id,
          region: user.region,
        }),
        userId: user.id,
        region: user.region,
      },
    });

    return true;
  } catch (error) {
    console.error(`[SEND_ERROR] User ${user.id}, Campaign ${campaign.id}:`, error);
    return false;
  }
}

/**
 * 메시지 클릭 처리
 */
export async function markMessageClicked(
  messageLogId: string
): Promise<void> {
  await prisma.messageLog.update({
    where: { id: messageLogId },
    data: {
      clicked: true,
      clickedAt: new Date(),
    },
  });

  // KPI 로그
  const log = await prisma.messageLog.findUnique({
    where: { id: messageLogId },
  });

  if (log) {
    await prisma.eventLog.create({
      data: {
        id: `e_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        eventName: "msg_click",
        payload: JSON.stringify({
          campaignId: log.campaignId,
          variant: log.variant,
          userId: log.userId,
        }),
        userId: log.userId,
      },
    });
  }
}

/**
 * 🔥 Marketing Trigger - 마케팅 트리거 엔진
 * 
 * Week5 핵심: 트리거 기반 자동 발송
 */

import { prisma } from "../data/prisma";
import {
  triggerLeagueSoon,
  triggerRecruit,
  triggerDiscount,
  triggerInactive,
} from "./marketing.examples";

/**
 * 모든 실행 중인 캠페인의 트리거를 감지하고 발송
 */
export async function detectTriggers(): Promise<void> {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { status: "RUNNING" },
    });

    console.log(`[TRIGGER_DETECT] Checking ${campaigns.length} running campaigns`);

    for (const campaign of campaigns) {
      try {
        let sentCount = 0;

        switch (campaign.trigger) {
          case "league_soon":
            sentCount = await triggerLeagueSoon(campaign);
            break;

          case "recruit":
            sentCount = await triggerRecruit(campaign);
            break;

          case "discount":
            sentCount = await triggerDiscount(campaign);
            break;

          case "inactive":
            sentCount = await triggerInactive(campaign);
            break;

          default:
            console.warn(`[TRIGGER_DETECT] Unknown trigger: ${campaign.trigger}`);
            continue;
        }

        console.log(
          `[TRIGGER_DETECT] Campaign ${campaign.id} (${campaign.trigger}): ${sentCount} messages sent`
        );
      } catch (error) {
        console.error(
          `[TRIGGER_DETECT] Error processing campaign ${campaign.id}:`,
          error
        );
        // 한 캠페인 실패해도 다른 캠페인은 계속 처리
        continue;
      }
    }

    console.log(`[TRIGGER_DETECT] Completed`);
  } catch (error) {
    console.error("[TRIGGER_DETECT] Fatal error:", error);
    throw error;
  }
}

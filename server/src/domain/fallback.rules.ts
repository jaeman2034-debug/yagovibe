/**
 * 🔥 Fallback Rules - 장애 대비 폴백 규칙
 * 
 * Week8 핵심: 각종 장애 상황에 대한 폴백 처리
 */

import { prisma } from "../data/prisma";
import { createSeedStories } from "../data/seed.stories";

/**
 * 협회 API 실패 시 → 기존 DB 유지
 */
export async function fallbackAssocSync(region: string): Promise<void> {
  try {
    // 협회 동기화 시도
    // await syncAssoc(region);
  } catch (error) {
    console.warn(`[FALLBACK] Assoc sync failed for ${region}, keeping existing data`);
    // 기존 DB 데이터 유지 (아무것도 하지 않음)
  }
}

/**
 * DB 장애 시 → seed 노출
 */
export async function fallbackSeedStories(region: string): Promise<any[]> {
  try {
    // DB에서 스토리 조회 시도
    const stories = await prisma.story.findMany({
      where: {
        region,
        status: "PUBLISHED",
      },
      take: 5,
    });

    if (stories.length > 0) {
      return stories;
    }

    // DB에 스토리가 없으면 seed 반환
    return createSeedStories(region);
  } catch (error) {
    console.warn(`[FALLBACK] DB error, returning seed stories for ${region}`);
    // DB 장애 시 seed 반환
    return createSeedStories(region);
  }
}

/**
 * 결제 지연 시 → LOCK 해제
 */
export async function fallbackReleaseLock(slotId: string): Promise<void> {
  try {
    // 5분 이상 LOCK된 슬롯 자동 해제
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    await prisma.slot.updateMany({
      where: {
        id: slotId,
        status: "LOCKED",
        updatedAt: {
          lt: fiveMinutesAgo,
        },
      },
      data: {
        status: "OPEN",
      },
    });
  } catch (error) {
    console.error(`[FALLBACK] Failed to release lock for ${slotId}:`, error);
  }
}

/**
 * PG 웹훅 재시도 (최대 3회)
 */
export async function retryPgWebhook(
  webhookFn: () => Promise<any>,
  maxRetries: number = 3
): Promise<any> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await webhookFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[RETRY] PG webhook attempt ${i + 1}/${maxRetries} failed:`, lastError);

      if (i < maxRetries - 1) {
        // 지수 백오프: 1초, 2초, 4초
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  throw lastError || new Error("PG webhook failed after retries");
}

/**
 * 협회 동기화 재시도 (최대 3회)
 */
export async function retryAssocSync(
  syncFn: () => Promise<any>,
  maxRetries: number = 3
): Promise<any> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await syncFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[RETRY] Assoc sync attempt ${i + 1}/${maxRetries} failed:`, lastError);

      if (i < maxRetries - 1) {
        // 지수 백오프
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  throw lastError || new Error("Assoc sync failed after retries");
}

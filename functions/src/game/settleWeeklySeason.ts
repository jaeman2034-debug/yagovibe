/**
 * 주간 시즌 정산 Callable — 관리자 수동 트리거
 * 자동 정산: `weeklySeasonSettleScheduler`
 */
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { assertPlatformAdmin } from "../lib/assertPlatformAdmin";
import { runWeeklySeasonSettlement, type SettleWeeklySeasonResponse } from "./settleWeeklySeasonCore";

const REGION = "asia-northeast3";

export type SettleWeeklySeasonRequest = {
  seasonId: string;
  forceBeforeEnd?: boolean;
};

export { type SettleWeeklySeasonResponse };

export const settleWeeklySeason = onCall(
  { region: REGION, cors: true, maxInstances: 3, timeoutSeconds: 540, memory: "512MiB" },
  async (request): Promise<SettleWeeklySeasonResponse> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    await assertPlatformAdmin(uid, request.auth?.token as Record<string, unknown> | undefined);

    const data = request.data as Partial<SettleWeeklySeasonRequest>;
    const seasonId = typeof data.seasonId === "string" ? data.seasonId.trim() : "";
    const forceBeforeEnd = Boolean(data.forceBeforeEnd);

    const db = getFirestore();
    try {
      return await runWeeklySeasonSettlement(db, seasonId, {
        now: new Date(),
        forceBeforeEnd,
      });
    } catch (e: unknown) {
      if (e instanceof HttpsError) throw e;
      throw new HttpsError("internal", "시즌 정산 처리에 실패했습니다.");
    }
  }
);

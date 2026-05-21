/**
 * 클라·서버 시즌 기준 통일 — 타임존/locale 차이로 인한 seasonId 불일치 방지
 */
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getCurrentWeeklySeasonId } from "./xpTimeKeys";
import { getWeeklySeasonBounds, parseWeeklySeasonId } from "./xpSeasonBounds";

const REGION = "asia-northeast3";

export type GetCurrentSeasonInfoRequest = {
  /** 생략 시 서버 기준 “지금” 주간 시즌 */
  seasonId?: string;
};

export type GetCurrentSeasonInfoResponse = {
  seasonId: string;
  type: "weekly";
  timeZone: "Asia/Seoul";
  /** 월요일 00:00 (서울) */
  startAt: Timestamp;
  /** 일요일 23:59:59.999 (서울) */
  endAt: Timestamp;
};

export const getCurrentSeasonInfo = onCall(
  { region: REGION, cors: true, maxInstances: 20 },
  async (request): Promise<GetCurrentSeasonInfoResponse> => {
    const raw = request.data as Partial<GetCurrentSeasonInfoRequest> | undefined;
    const arg =
      typeof raw?.seasonId === "string" && raw.seasonId.trim().length > 0
        ? raw.seasonId.trim()
        : getCurrentWeeklySeasonId();

    if (!parseWeeklySeasonId(arg)) {
      throw new HttpsError("invalid-argument", "유효하지 않은 seasonId 형식입니다. (예: 2026-W19)");
    }

    const bounds = getWeeklySeasonBounds(arg);
    if (!bounds) {
      throw new HttpsError("failed-precondition", "시즌 구간을 계산할 수 없습니다.");
    }

    return {
      seasonId: arg,
      type: "weekly",
      timeZone: "Asia/Seoul",
      startAt: Timestamp.fromDate(bounds.startAt),
      endAt: Timestamp.fromDate(bounds.endAt),
    };
  }
);

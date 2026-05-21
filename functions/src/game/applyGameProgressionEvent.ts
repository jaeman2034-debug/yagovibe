/**
 * 게임 Progression — 서버 단일 진실 원천 (Mini-Shot 데일리 보상 등)
 * 클라이언트에서 users.xp / badges 직접 쓰기 제거용.
 */
import type { DocumentReference, DocumentSnapshot } from "firebase-admin/firestore";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { levelFromTotalXp, XP_POLICY } from "../config/xpPolicy";
import { computeGameXpAllowance } from "./xpCapAllowance";
import { applyWeeklyXpLeaderboardInTransaction } from "./weeklyXpLeaderboard";

const REGION = "asia-northeast3";

const db = getFirestore();

function parseDailyKey(key: string): Date | null {
  if (!/^\d{8}$/.test(key)) return null;
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(4, 6));
  const d = Number(key.slice(6, 8));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
}

function formatDailyKey(date: Date): string {
  const y = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}${month}${day}`;
}

function streakBonusByDays(streakDays: number): number {
  if (streakDays >= 7) return 100;
  if (streakDays >= 5) return 50;
  if (streakDays >= 3) return 20;
  if (streakDays >= 2) return 10;
  return 0;
}

export type ApplyGameProgressionEventRequest = {
  source: "miniShotDaily";
  teamId: string;
  dailyId: string;
  rewardXp: number;
  rewardScore: number;
  accuracy?: number;
  sessionScore?: number;
};

export type ApplyGameProgressionEventResponse = {
  granted: boolean;
  streakDays: number;
  streakBonusXp: number;
  superBadgeGranted: boolean;
  /** 캡 적용 후 실제 반영 XP */
  totalXpApplied: number;
  /** 보상식 기준 요청 합산 XP (데일리+스트릭 등) */
  totalXpRequested?: number;
  /** 일·주간·소스 캡으로 일부 또는 전부 차감됨 */
  xpCapped?: boolean;
};

export const applyGameProgressionEvent = onCall(
  { region: REGION, cors: true, maxInstances: 40 },
  async (request): Promise<ApplyGameProgressionEventResponse> => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const data = request.data as Partial<ApplyGameProgressionEventRequest>;
    if (data.source !== "miniShotDaily") {
      throw new HttpsError("invalid-argument", "지원하지 않는 source 입니다.");
    }

    const teamId = typeof data.teamId === "string" ? data.teamId.trim() : "";
    const dailyId = typeof data.dailyId === "string" ? data.dailyId.trim() : "";
    if (!teamId || !dailyId) {
      throw new HttpsError("invalid-argument", "teamId와 dailyId가 필요합니다.");
    }

    let rewardXp = Math.max(0, Math.floor(Number(data.rewardXp) || 0));
    rewardXp = Math.min(rewardXp, XP_POLICY.MINI_SHOT_DAILY.MAX_REWARD_XP);
    let rewardScore = Math.max(0, Math.floor(Number(data.rewardScore) || 0));
    rewardScore = Math.min(rewardScore, XP_POLICY.MINI_SHOT_DAILY.MAX_REWARD_SCORE);
    const accuracy = typeof data.accuracy === "number" && Number.isFinite(data.accuracy) ? data.accuracy : 0;
    const sessionScore =
      typeof data.sessionScore === "number" && Number.isFinite(data.sessionScore)
        ? Math.max(0, Math.floor(data.sessionScore))
        : 0;

    const progressRef = db.doc(`teams/${teamId}/miniShotDailyUserProgress/${uid}_${dailyId}`);
    const historyRef = db.doc(`users/${uid}/miniShotDailyHistory/${dailyId}`);
    const userRef = db.doc(`users/${uid}`);
    const ledgerRef = db.doc(`users/${uid}/gameLedger/miniShotDaily_${teamId}_${dailyId}`);
    const progressionRef = db.doc(`users/${uid}/gameProgression/summary`);
    const leaderboardRef = db.doc(`gameLeaderboards/totalXp/entries/${uid}`);

    try {
      const result = await db.runTransaction(async (tx) => {
        const txnNow = new Date();

        const progressSnap = await tx.get(progressRef);
        if (progressSnap.exists && progressSnap.data()?.cleared === true) {
          return {
            granted: false,
            streakDays: 0,
            streakBonusXp: 0,
            superBadgeGranted: false,
            totalXpApplied: 0,
          } satisfies ApplyGameProgressionEventResponse;
        }

        const today = parseDailyKey(dailyId) ?? new Date();
        let streakDays = 1;
        for (let i = 1; i <= 6; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const prevKey = formatDailyKey(d);
          const prevRef = db.doc(`users/${uid}/miniShotDailyHistory/${prevKey}`);
          const prevSnap = await tx.get(prevRef);
          if (prevSnap.exists && prevSnap.data()?.cleared === true) {
            streakDays += 1;
            continue;
          }
          break;
        }

        const streakBonusXp = streakBonusByDays(streakDays);
        const baseXp = rewardXp;
        const totalXpRequested = baseXp + streakBonusXp;
        const isSuperChallengeReward = baseXp >= 200;
        let superBadgeGranted = false;

        const userSnap = await tx.get(userRef);
        const progressionSnap = await tx.get(progressionRef);

        const capOutcome = computeGameXpAllowance(
          userSnap.exists ? (userSnap.data() as Record<string, unknown>) : undefined,
          totalXpRequested,
          "miniShotDaily",
          txnNow
        );
        /** 캡 적용 후 실제 반영 XP (= requested 대비 applied) */
        const xpApplied = capOutcome.allowed;

        let superBadgeRef: DocumentReference | null = null;
        let superBadgeSnap: DocumentSnapshot | null = null;
        if (isSuperChallengeReward) {
          superBadgeRef = db.doc(`users/${uid}/badges/super7`);
          superBadgeSnap = await tx.get(superBadgeRef);
        }

        tx.set(
          progressRef,
          {
            userId: uid,
            dailyId,
            teamId,
            cleared: true,
            rewardXp: baseXp,
            rewardScore,
            streakDays,
            streakBonusXp,
            claimedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        tx.set(
          historyRef,
          {
            cleared: true,
            teamId,
            rewardXp: baseXp,
            rewardScore,
            streakAtClear: streakDays,
            streakBonusXp,
            score: sessionScore,
            accuracy,
            createdAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        const prevUserXp = userSnap.exists ? Number(userSnap.data()?.xp ?? 0) || 0 : 0;
        const nextUserXp = prevUserXp + xpApplied;
        const nextUserLevel = levelFromTotalXp(nextUserXp);

        const mergeUser: Record<string, unknown> = {
          xp: nextUserXp,
          level: nextUserLevel,
          gameXpCap: capOutcome.gameXpCap,
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (isSuperChallengeReward) {
          mergeUser.badges = FieldValue.arrayUnion("super7");
        }
        tx.set(userRef, mergeUser, { merge: true });

        const prevProgXp = progressionSnap.exists ? Number(progressionSnap.data()?.totalXp ?? 0) || 0 : prevUserXp;
        const nextProgXp = prevProgXp + xpApplied;
        const nextProgLevel = levelFromTotalXp(nextProgXp);
        const prevStats = (progressionSnap.data()?.stats as Record<string, number> | undefined) ?? {};
        const accBump = Math.min(100, Math.round(accuracy * 100) / 100);
        const progressionPayload: Record<string, unknown> = {
          schemaVersion: 1,
          totalXp: nextProgXp,
          level: nextProgLevel,
          stats: {
            accuracy: Math.min(100, (prevStats.accuracy ?? 0) + accBump),
            power: prevStats.power ?? 0,
            stamina: prevStats.stamina ?? 0,
            speed: prevStats.speed ?? 0,
          },
          lastEventAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (isSuperChallengeReward) {
          progressionPayload.badgeCodes = FieldValue.arrayUnion("super7");
        }
        tx.set(progressionRef, progressionPayload, { merge: true });

        if (isSuperChallengeReward && superBadgeRef && superBadgeSnap) {
          if (!superBadgeSnap.exists) {
            superBadgeGranted = true;
            tx.set(superBadgeRef, {
              code: "super7",
              title: "SUPER STRIKER",
              description: "7일 연속 슈퍼 챌린지 클리어",
              achievedAt: FieldValue.serverTimestamp(),
              count: 1,
              source: "miniShotDaily",
            });
          } else {
            const currentCount = Number(superBadgeSnap.data()?.count ?? 1);
            tx.set(
              superBadgeRef,
              {
                title: "SUPER STRIKER",
                description: "7일 연속 슈퍼 챌린지 클리어",
                updatedAt: FieldValue.serverTimestamp(),
                count: Number.isFinite(currentCount) ? currentCount + 1 : 2,
              },
              { merge: true }
            );
          }
        }

        tx.set(
          ledgerRef,
          {
            schemaVersion: 1,
            source: "miniShotDaily",
            deltaXp: xpApplied,
            teamId,
            dailyId,
            payload: {
              rewardXp: baseXp,
              streakBonusXp,
              rewardScore,
              accuracy,
              sessionScore,
              xpRequested: totalXpRequested,
              xpCapped: xpApplied < totalXpRequested,
            },
            createdAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        const displayName =
          userSnap.exists && typeof userSnap.data()?.displayName === "string"
            ? userSnap.data()?.displayName
            : undefined;

        tx.set(
          leaderboardRef,
          {
            schemaVersion: 1,
            boardId: "totalXp",
            uid,
            score: nextProgXp,
            level: nextProgLevel,
            displayName: displayName ?? null,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        if (xpApplied > 0) {
          await applyWeeklyXpLeaderboardInTransaction(
            db,
            tx,
            uid,
            xpApplied,
            userSnap,
            txnNow,
            { gameLevel: nextProgLevel }
          );
        }

        return {
          granted: true,
          streakDays,
          streakBonusXp,
          superBadgeGranted,
          totalXpApplied: xpApplied,
          totalXpRequested,
          xpCapped: xpApplied < totalXpRequested,
        } satisfies ApplyGameProgressionEventResponse;
      });

      return result;
    } catch (e: unknown) {
      logger.error("applyGameProgressionEvent failed", e);
      throw new HttpsError("internal", "보상 처리에 실패했습니다.");
    }
  }
);

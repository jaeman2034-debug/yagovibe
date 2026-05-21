/**
 * 스냅샷 저장된 보상만 클레임 — 결과 문서 + ledger 멱등
 */
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { applyXpDeltaInTransaction } from "./xpApplyCore";
import { parseWeeklySeasonId } from "./xpSeasonBounds";

const REGION = "asia-northeast3";

export type ClaimSeasonRewardRequest = {
  seasonId: string;
};

export type ClaimSeasonRewardResponse = {
  ok: boolean;
  seasonId: string;
  bonusXpGranted: number;
  badgeCodes: string[];
  alreadyClaimed?: boolean;
};

export const claimSeasonReward = onCall(
  { region: REGION, cors: true, maxInstances: 40 },
  async (request): Promise<ClaimSeasonRewardResponse> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const data = request.data as Partial<ClaimSeasonRewardRequest>;
    const seasonId = typeof data.seasonId === "string" ? data.seasonId.trim() : "";
    if (!parseWeeklySeasonId(seasonId)) {
      throw new HttpsError("invalid-argument", "유효하지 않은 seasonId 입니다.");
    }

    const db = getFirestore();
    const seasonRef = db.doc(`gameSeasons/${seasonId}`);
    const ledgerRef = db.doc(`users/${uid}/gameLedger/seasonReward_${seasonId}`);
    const resultRef = db.doc(`gameSeasons/${seasonId}/results/${uid}`);

    try {
      const outcome = await db.runTransaction(async (tx) => {
        const ledgerSnap = await tx.get(ledgerRef);
        if (ledgerSnap.exists) {
          return { alreadyClaimed: true as const, bonusXp: 0, badgeCodes: [] as string[] };
        }

        const seasonSnap = await tx.get(seasonRef);
        const seasonStatus = String(seasonSnap.data()?.status ?? "");
        if (seasonStatus !== "settled") {
          throw new HttpsError("failed-precondition", "아직 정산되지 않은 시즌입니다.");
        }

        const resultSnap = await tx.get(resultRef);
        if (!resultSnap.exists) {
          throw new HttpsError("not-found", "시즌 보상 정보가 없습니다. 랭킹에 포함되지 않았을 수 있습니다.");
        }

        const rs = resultSnap.data() ?? {};
        if (rs.rewardClaimed === true) {
          return { alreadyClaimed: true as const, bonusXp: 0, badgeCodes: [] as string[] };
        }

        const bonusXp = Math.max(0, Math.floor(Number(rs.bonusXp ?? 0)));
        const rawBadges = rs.badgeCodes;
        const badgeCodes = Array.isArray(rawBadges)
          ? rawBadges.filter((b): b is string => typeof b === "string" && b.trim().length > 0).map((b) => b.trim())
          : [];

        if (bonusXp > 0) {
          await applyXpDeltaInTransaction(db, tx, uid, bonusXp, "seasonSettlement", {
            bypassGameXpCap: true,
          });
        }

        const userRef = db.doc(`users/${uid}`);
        if (badgeCodes.length > 0) {
          tx.set(userRef, { badges: FieldValue.arrayUnion(...badgeCodes), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        }

        tx.set(
          resultRef,
          {
            rewardClaimed: true,
            claimedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        tx.set(
          ledgerRef,
          {
            schemaVersion: 1,
            source: "seasonReward",
            seasonId,
            deltaXp: bonusXp,
            badgeCodes,
            payload: { rank: rs.rank ?? null, tier: rs.tier ?? null, weeklyXp: rs.weeklyXp ?? null },
            createdAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return { alreadyClaimed: false as const, bonusXp, badgeCodes };
      });

      return {
        ok: true,
        seasonId,
        bonusXpGranted: outcome.bonusXp,
        badgeCodes: outcome.badgeCodes,
        alreadyClaimed: outcome.alreadyClaimed === true,
      };
    } catch (e: unknown) {
      if (e instanceof HttpsError) throw e;
      logger.error("claimSeasonReward failed", { uid, seasonId, e });
      throw new HttpsError("internal", "보상 수령 처리에 실패했습니다.");
    }
  }
);

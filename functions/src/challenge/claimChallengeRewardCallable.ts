/**
 * PR-10A — 챌린지 보상 Callable (서버 전용 판정 + grantAvatarXp).
 * @see docs/architecture/pr-10a-challenge-rewards.md
 *
 * UTC 일 경계·cap·ledger는 Admin SDK + 서버 Timestamp 기준.
 */

import type { DocumentReference, Firestore, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { grantAvatarXp } from "../lib/avatar/grantAvatarXp";
import {
  CHALLENGE_REWARD_ELIGIBLE_TEMPLATE_IDS,
  CHALLENGE_REWARD_MAX_GRANTS_PER_UTC_DAY,
  CHALLENGE_REWARD_XP_PER_GRANT,
} from "../lib/challenge/challengeRewardConstants";
import { ensureFirebaseAdminApp } from "../lib/ensureFirebaseAdminApp";

ensureFirebaseAdminApp();
const db = getFirestore();
const REGION = "asia-northeast3";

const MSG_GENERIC = "보상을 처리할 수 없습니다.";

function utcDayKeyFromServerTime(ts: Timestamp): string {
  const d = ts.toDate();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function ledgerDocId(uid: string, challengeId: string, utcDayKey: string, submissionId: string): string {
  return `${uid}_${challengeId}_${utcDayKey}_${submissionId}`.replace(/\//g, "_");
}

/** uid+challengeId 전체에서 제외 문서를 뺀 최고 score. limit(100) 왜곡 방지 — 페이지 순회 + 조기 종료. */
const PRIOR_BEST_PAGE_SIZE = 500;
/** 비정상 대량 제출 시 fail-closed (잘못된 보상 지급 방지) */
const PRIOR_BEST_MAX_PAGES = 400;

async function priorBestExcluding(
  uid: string,
  challengeId: string,
  excludeSubmissionId: string,
): Promise<number> {
  let best = -1;
  let last: QueryDocumentSnapshot | null = null;
  const base = db
    .collection("challenge_submissions")
    .where("uid", "==", uid)
    .where("challengeId", "==", challengeId)
    .orderBy("score", "desc");

  for (let page = 0; ; page += 1) {
    if (page >= PRIOR_BEST_MAX_PAGES) {
      logger.error("challenge_reward_prior_best_scan_cap", { uid, challengeId, excludeSubmissionId, best });
      throw new HttpsError("internal", MSG_GENERIC);
    }
    let q = base.limit(PRIOR_BEST_PAGE_SIZE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;

    let minOnPage = Infinity;
    for (const doc of snap.docs) {
      const raw = doc.data().score;
      const s = typeof raw === "number" && Number.isFinite(raw) ? raw : Number(raw);
      if (Number.isFinite(s) && s < minOnPage) minOnPage = s;
      if (doc.id === excludeSubmissionId) continue;
      if (Number.isFinite(s) && s > best) best = s;
    }

    const L = Number.isFinite(minOnPage) ? minOnPage : -1;
    if (snap.docs.length < PRIOR_BEST_PAGE_SIZE) break;
    if (L <= best) break;

    last = snap.docs[snap.docs.length - 1] ?? null;
    if (!last) break;
  }

  return best;
}

async function releaseReservation(
  firestore: Firestore,
  ledgerRef: DocumentReference,
  dailyRef: DocumentReference,
  expectedSubmissionId: string,
) {
  await firestore.runTransaction(async (tx) => {
    const l = await tx.get(ledgerRef);
    if (!l.exists) return;
    const ld = l.data() as Record<string, unknown> | undefined;
    const sid = typeof ld?.submissionId === "string" ? ld.submissionId : "";
    if (sid !== expectedSubmissionId) {
      logger.warn("challenge_reward_release_skipped_mismatch", {
        expectedSubmissionId,
        ledgerSubmissionId: sid,
      });
      return;
    }
    const d = await tx.get(dailyRef);
    const c = d.exists ? Math.max(0, Math.floor(Number(d.data()?.grantCount ?? 0) || 0)) : 0;
    if (c > 0) {
      tx.set(dailyRef, { grantCount: c - 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    tx.delete(ledgerRef);
  });
}

export type ClaimChallengeRewardResponse = {
  ok: boolean;
  outcome:
    | "granted"
    | "blocked_not_best"
    | "blocked_cap"
    | "blocked_duplicate"
    | "blocked_no_avatar"
    | "blocked_invalid_submission";
  deltaXp?: number;
  newXp?: number;
  newLevel?: number;
};

export const claimChallengeReward = onCall(
  { region: REGION, cors: true, maxInstances: 20 },
  async (request): Promise<ClaimChallengeRewardResponse> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const raw = (request.data as { submissionId?: unknown })?.submissionId;
    const submissionId = typeof raw === "string" ? raw.trim() : "";
    if (!submissionId || submissionId.length > 200) {
      throw new HttpsError("invalid-argument", MSG_GENERIC);
    }

    const serverTs = Timestamp.now();
    const utcDayKey = utcDayKeyFromServerTime(serverTs);

    const subRef = db.collection("challenge_submissions").doc(submissionId);
    const subSnap = await subRef.get();
    if (!subSnap.exists) {
      logger.info("challenge_reward_blocked_rules", { reason: "missing_submission", uid, submissionId });
      return { ok: false, outcome: "blocked_invalid_submission" };
    }

    const sub = subSnap.data() as Record<string, unknown>;
    const subUid = typeof sub.uid === "string" ? sub.uid : "";
    if (subUid !== uid) {
      logger.warn("challenge_reward_blocked_rules", { uid, submissionId, subUid });
      throw new HttpsError("permission-denied", MSG_GENERIC);
    }

    const challengeId = typeof sub.challengeId === "string" ? sub.challengeId : "";
    if (!CHALLENGE_REWARD_ELIGIBLE_TEMPLATE_IDS.includes(challengeId as (typeof CHALLENGE_REWARD_ELIGIBLE_TEMPLATE_IDS)[number])) {
      logger.info("challenge_reward_blocked_rules", { uid, submissionId, challengeId });
      return { ok: false, outcome: "blocked_invalid_submission" };
    }

    const scoreRaw = sub.score;
    const score = typeof scoreRaw === "number" && Number.isFinite(scoreRaw) ? scoreRaw : Number(scoreRaw);
    if (!Number.isFinite(score) || score < 0 || score > 1000) {
      logger.info("challenge_reward_blocked_rules", { uid, submissionId, score });
      return { ok: false, outcome: "blocked_invalid_submission" };
    }

    const prior = await priorBestExcluding(uid, challengeId, submissionId);
    if (!(score > prior)) {
      logger.info("challenge_reward_blocked_not_best", { uid, challengeId, submissionId, score, prior });
      return { ok: false, outcome: "blocked_not_best" };
    }

    const ledgerId = ledgerDocId(uid, challengeId, utcDayKey, submissionId);
    const ledgerRef = db.collection("challenge_reward_ledger").doc(ledgerId);
    const dailyRef = db.collection("challenge_reward_dailyCounters").doc(`${uid}_${utcDayKey}`);

    const dayGrantsSnap = await db
      .collection("challenge_reward_ledger")
      .where("uid", "==", uid)
      .where("utcDayKey", "==", utcDayKey)
      .limit(CHALLENGE_REWARD_MAX_GRANTS_PER_UTC_DAY + 1)
      .get();

    if (dayGrantsSnap.size >= CHALLENGE_REWARD_MAX_GRANTS_PER_UTC_DAY) {
      logger.info("challenge_reward_blocked_cap", { uid, utcDayKey, count: dayGrantsSnap.size, phase: "precheck" });
      return { ok: false, outcome: "blocked_cap" };
    }

    let reserveOutcome: "ok" | "dup" | "cap";
    try {
      reserveOutcome = await db.runTransaction(async (tx) => {
        const l0 = await tx.get(ledgerRef);
        if (l0.exists) return "dup" as const;
        const dSnap = await tx.get(dailyRef);
        const c = dSnap.exists ? Math.max(0, Math.floor(Number(dSnap.data()?.grantCount ?? 0) || 0)) : 0;
        if (c >= CHALLENGE_REWARD_MAX_GRANTS_PER_UTC_DAY) {
          return "cap" as const;
        }
        tx.set(
          dailyRef,
          {
            schemaVersion: 1,
            uid,
            utcDayKey,
            grantCount: c + 1,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        tx.set(ledgerRef, {
          schemaVersion: 1,
          uid,
          challengeId,
          submissionId,
          utcDayKey,
          deltaXp: CHALLENGE_REWARD_XP_PER_GRANT,
          idempotencyKey: `challenge_reward:${submissionId}`,
          reservedPendingXp: true,
          createdAt: FieldValue.serverTimestamp(),
        });
        return "ok" as const;
      });
    } catch (e: unknown) {
      logger.error("challenge_reward_reserve_failed", { uid, submissionId, err: String(e) });
      throw new HttpsError("internal", MSG_GENERIC);
    }

    if (reserveOutcome === "dup") {
      logger.info("challenge_reward_blocked_duplicate", { uid, submissionId, ledgerId });
      return { ok: false, outcome: "blocked_duplicate" };
    }
    if (reserveOutcome === "cap") {
      logger.info("challenge_reward_blocked_cap", { uid, utcDayKey, phase: "reserve" });
      return { ok: false, outcome: "blocked_cap" };
    }
    const idempotencyKey = `challenge_reward:${submissionId}`;
    const grant = await grantAvatarXp(db, {
      uid,
      source: "challenge_best_improvement",
      idempotencyKey,
      context: {
        challengeId,
        submissionId,
        utcDayKey,
        telemetry: "challenge_reward_granted",
      },
    });

    if (grant.noAvatar) {
      logger.info("challenge_reward_blocked_rules", { uid, submissionId, noAvatar: true });
      await releaseReservation(db, ledgerRef, dailyRef, submissionId);
      return { ok: false, outcome: "blocked_no_avatar" };
    }
    if (grant.skipped) {
      logger.info("challenge_reward_blocked_duplicate", { uid, submissionId, xpLayer: true });
      await releaseReservation(db, ledgerRef, dailyRef, submissionId);
      return { ok: false, outcome: "blocked_duplicate" };
    }
    if (!grant.ok) {
      logger.error("challenge_reward_blocked_rules", { uid, submissionId, err: grant.error });
      await releaseReservation(db, ledgerRef, dailyRef, submissionId);
      throw new HttpsError("internal", MSG_GENERIC);
    }

    try {
      await ledgerRef.update({
        reservedPendingXp: FieldValue.delete(),
        xpGrantedAt: FieldValue.serverTimestamp(),
      });
    } catch {
      /* non-fatal */
    }

    logger.info("challenge_reward_granted", {
      uid,
      challengeId,
      submissionId,
      utcDayKey,
      newXp: grant.newXp,
      newLevel: grant.newLevel,
    });

    return {
      ok: true,
      outcome: "granted",
      deltaXp: CHALLENGE_REWARD_XP_PER_GRANT,
      newXp: grant.newXp,
      newLevel: grant.newLevel,
    };
  },
);

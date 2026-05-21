/**
 * 미니슛 세션 종료 — 팀 세션/리더보드 + XP 서버 반영 (클라 users.xp 제거)
 */
import type { DocumentReference } from "firebase-admin/firestore";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { applyXpDeltaInTransaction } from "./xpApplyCore";
import { XP_POLICY } from "../config/xpPolicy";

const REGION = "asia-northeast3";
const db = getFirestore();

function computeMiniShotSessionXp(goals: number, avgAccuracy: number): number {
  const g = Math.max(0, Math.floor(Number(goals) || 0));
  const a = typeof avgAccuracy === "number" && Number.isFinite(avgAccuracy) ? avgAccuracy : 0;
  return g * 10 + Math.round(a * 50);
}

export type FinalizeMiniShotSessionRequest = {
  sessionKey: string;
  teamId?: string | null;
  goals: number;
  shots: number;
  score: number;
  successPct: number;
  avgAccuracy: number;
  ovr: number;
  streakXpBonus?: number;
};

export type FinalizeMiniShotSessionResponse = {
  ok: boolean;
  /** 캡 적용 후 실제 부여 XP */
  xpGranted: number;
  /** 세션당 상한까지 반영된 요청 XP (캡 전) */
  xpRequested?: number;
  xpCapped?: boolean;
  alreadyApplied?: boolean;
};

export const finalizeMiniShotSession = onCall(
  { region: REGION, cors: true, maxInstances: 40 },
  async (request): Promise<FinalizeMiniShotSessionResponse> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const d = request.data as Partial<FinalizeMiniShotSessionRequest>;
    const sessionKey = typeof d.sessionKey === "string" ? d.sessionKey.trim() : "";
    if (!sessionKey || sessionKey.length < 8) {
      throw new HttpsError("invalid-argument", "유효한 sessionKey가 필요합니다.");
    }

    const teamId = typeof d.teamId === "string" ? d.teamId.trim() : "";
    const goals = Math.max(0, Math.floor(Number(d.goals) || 0));
    const shots = Math.max(0, Math.floor(Number(d.shots) || 0));
    const score = Math.max(0, Math.floor(Number(d.score) || 0));
    const successPct = typeof d.successPct === "number" && Number.isFinite(d.successPct) ? d.successPct : 0;
    const avgAccuracy = typeof d.avgAccuracy === "number" && Number.isFinite(d.avgAccuracy) ? d.avgAccuracy : 0;
    const ovr = Math.max(0, Math.floor(Number(d.ovr) || 0));
    const streakBonus = Math.max(0, Math.floor(Number(d.streakXpBonus) || 0));

    const rawXpGain = computeMiniShotSessionXp(goals, avgAccuracy) + streakBonus;
    const xpGain = Math.min(
      rawXpGain,
      XP_POLICY.MINI_SHOT_SESSION.MAX_XP_PER_SESSION
    );
    const ledgerRef = db.doc(`users/${uid}/gameLedger/miniShotSession_${sessionKey}`);

    try {
      const result = await db.runTransaction(async (tx) => {
        const ledgerSnap = await tx.get(ledgerRef);
        if (ledgerSnap.exists) {
          return { xpGranted: 0, alreadyApplied: true as const };
        }

        let sessionRef: DocumentReference | null = null;
        let lbRef: DocumentReference | null = null;
        let lbPrev: Record<string, unknown> = {};

        if (teamId) {
          const sessionDocId = `${sessionKey}_${uid}`;
          sessionRef = db.doc(`teams/${teamId}/miniShotSessions/${sessionDocId}`);
          lbRef = db.doc(`teams/${teamId}/miniShotLeaderboard/${uid}`);
          const lbSnap = await tx.get(lbRef);
          lbPrev = lbSnap.exists ? lbSnap.data() ?? {} : {};
        }

        const xpApply = await applyXpDeltaInTransaction(db, tx, uid, xpGain, "miniShotSession", {
          accuracyBump: Math.min(100, Math.round(avgAccuracy * 20) / 100),
        });

        if (teamId && sessionRef && lbRef) {
          tx.set(sessionRef, {
            userId: uid,
            goals,
            shots,
            score,
            successPct,
            avgAccuracy,
            ovr,
            xpGranted: xpApply.xpApplied,
            streakXpBonus: streakBonus,
            createdAt: FieldValue.serverTimestamp(),
          });

          const totalSessions = Number(lbPrev.totalSessions ?? 0) + 1;
          const totalGoals = Number(lbPrev.totalGoals ?? 0) + goals;
          const totalShots = Number(lbPrev.totalShots ?? 0) + shots;
          const bestScore = Math.max(Number(lbPrev.bestScore ?? 0), score);
          const prevAvg = Number(lbPrev.avgScore ?? 0);
          const newAvg = (prevAvg * (totalSessions - 1) + score) / totalSessions;

          tx.set(
            lbRef,
            {
              userId: uid,
              bestScore,
              avgScore: newAvg,
              totalSessions,
              totalGoals,
              totalShots,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }

        tx.set(
          ledgerRef,
          {
            schemaVersion: 1,
            source: "miniShotSession",
            deltaXp: xpApply.xpApplied,
            teamId: teamId || null,
            payload: {
              goals,
              shots,
              score,
              avgAccuracy,
              ovr,
              streakBonus,
              xpRequested: xpApply.xpRequested,
              xpCapped: xpApply.xpApplied < xpApply.xpRequested,
            },
            createdAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return {
          xpGranted: xpApply.xpApplied,
          xpRequested: xpApply.xpRequested,
          xpCapped: xpApply.xpApplied < xpApply.xpRequested,
          alreadyApplied: false as const,
        };
      });

      return {
        ok: true,
        xpGranted: result.xpGranted,
        xpRequested: result.xpRequested,
        xpCapped: result.xpCapped,
        alreadyApplied: result.alreadyApplied === true,
      };
    } catch (e: unknown) {
      if (e instanceof HttpsError) throw e;
      logger.error("finalizeMiniShotSession failed", e);
      throw new HttpsError("internal", "세션 저장에 실패했습니다.");
    }
  }
);

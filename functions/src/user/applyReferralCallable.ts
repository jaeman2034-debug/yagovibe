/**
 * 추천 코드 적용 — 타인 users 문서 수정을 클라에서 제거 (보안 규칙 본인만 update 호환)
 */
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const REGION = "asia-northeast3";

const db = getFirestore();

export type ApplyReferralCallableRequest = {
  inviteCode: string;
};

export type ApplyReferralCallableResponse = {
  ok: boolean;
  reason?: string;
};

export const applyReferralCallable = onCall(
  { region: REGION, cors: true, maxInstances: 20 },
  async (request): Promise<ApplyReferralCallableResponse> => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const codeRaw = (request.data as Partial<ApplyReferralCallableRequest>)?.inviteCode;
    const code = typeof codeRaw === "string" ? codeRaw.trim() : "";
    if (!code) {
      throw new HttpsError("invalid-argument", "inviteCode가 필요합니다.");
    }

    const q = await db.collection("users").where("inviteCode", "==", code).limit(2).get();
    if (q.empty) {
      return { ok: false, reason: "invalid_code" };
    }
    if (q.docs.length > 1) {
      return { ok: false, reason: "ambiguous_code" };
    }

    const inviterId = q.docs[0].id;
    if (inviterId === uid) {
      return { ok: false, reason: "self_referral" };
    }

    const inviteeRef = db.doc(`users/${uid}`);
    const inviterRef = db.doc(`users/${inviterId}`);

    try {
      await db.runTransaction(async (tx) => {
        const inviteeSnap = await tx.get(inviteeRef);
        if (!inviteeSnap.exists) {
          throw new Error("no_profile");
        }
        if (inviteeSnap.data()?.referredBy) {
          throw new Error("already_applied");
        }
        const inviterSnap = await tx.get(inviterRef);
        if (!inviterSnap.exists) {
          throw new Error("invalid_inviter");
        }

        tx.set(
          inviteeRef,
          {
            referredBy: code,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        tx.set(
          inviterRef,
          {
            referralCount: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "already_applied") {
        return { ok: false, reason: "already_applied" };
      }
      if (msg === "no_profile") {
        throw new HttpsError("failed-precondition", "사용자 프로필이 없습니다.");
      }
      if (msg === "invalid_inviter") {
        return { ok: false, reason: "invalid_inviter" };
      }
      throw new HttpsError("internal", "추천 적용에 실패했습니다.");
    }

    return { ok: true };
  }
);

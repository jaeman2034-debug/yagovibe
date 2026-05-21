import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { parsePaymentDocUserIdWithKnownFeeId, parseTeamFeePaymentDocId } from "../lib/teamFeePaymentDocId";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function assertHubTeamStaff(teamId: string, actorUid: string): Promise<void> {
  const teamSnap = await db.doc(`teams/${teamId}`).get();
  if (!teamSnap.exists) {
    throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
  }
  const ownerUid = String((teamSnap.data() as Record<string, unknown>)?.ownerUid || "");
  if (ownerUid && ownerUid === actorUid) return;

  const memberSnap = await db.doc(`teams/${teamId}/members/${actorUid}`).get();
  if (!memberSnap.exists) throw new HttpsError("permission-denied", "팀 스태프만 실행할 수 있습니다.");
  const m = memberSnap.data() || {};
  const statusNorm = String(m.status ?? "active").trim().toLowerCase();
  if (statusNorm !== "active") {
    throw new HttpsError("permission-denied", "활성 팀원만 실행할 수 있습니다.");
  }
  const roleRaw = String(m.role || "").trim();
  const role = roleRaw.toLowerCase();
  const accessLevel = String(m.accessLevel || "").trim();
  const staffRoles = new Set(["owner", "manager", "coach", "admin", "vice", "부팀장", "총무", "관리자", "운영자"]);
  if (accessLevel === "ADMIN" || staffRoles.has(role) || staffRoles.has(roleRaw)) return;
  throw new HttpsError("permission-denied", "팀 스태프만 실행할 수 있습니다.");
}

function asMonthlyDuesType(
  payment: Record<string, unknown>,
  member: Record<string, unknown> | null
): "monthly" | "yearly" | "exempt" {
  const p = String(payment.duesType ?? "").trim().toLowerCase();
  if (p === "yearly" || p === "annual") return "yearly";
  if (p === "exempt") return "exempt";
  const m = String(member?.duesType ?? member?.feePlan ?? "").trim().toLowerCase();
  if (m === "yearly" || m === "annual") return "yearly";
  if (m === "exempt") return "exempt";
  return "monthly";
}

/**
 * 운영 복구용: `teams/{teamId}/payments` 스캔 후
 * - amount<=0 월납 문서 금액 보정 (fee.amount)
 * - feeId/userId 누락 시 paymentId(`feeId_userId`)에서 식별자 복구
 */
export const repairTeamFeePayments = onCall(
  { region: "asia-northeast3", cors: true, timeoutSeconds: 540, memory: "512MiB" },
  async (request) => {
    try {
      if (!request.auth?.uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
      const actorUid = request.auth.uid;
      const teamId = String(request.data?.teamId || "").trim();
      const feeIdFilter = String(request.data?.feeId || "").trim();
      const dryRun = request.data?.dryRun !== false;
      if (!teamId) throw new HttpsError("invalid-argument", "teamId가 필요합니다.");
      if (feeIdFilter) {
        const s = feeIdFilter;
        if (s.includes("/") || s.includes("\\") || s === "." || s === "..") {
          throw new HttpsError("invalid-argument", "feeId가 올바르지 않습니다.");
        }
      }

      await assertHubTeamStaff(teamId, actorUid);

      const paymentsRef = db.collection("teams").doc(teamId).collection("payments");
      const paymentsSnap = feeIdFilter
        ? await paymentsRef.where("feeId", "==", feeIdFilter).get()
        : await paymentsRef.get();

      const feeCache = new Map<string, number>();
      const memberCache = new Map<string, Record<string, unknown> | null>();
      let scanned = 0;
      let repairedAmount = 0;
      let repairedIdentity = 0;
      let skipped = 0;

      let batch = db.batch();
      let ops = 0;
      const flush = async () => {
        if (ops > 0 && !dryRun) {
          await batch.commit();
          batch = db.batch();
          ops = 0;
        }
      };

      for (const paymentDoc of paymentsSnap.docs) {
        scanned += 1;
        const p = (paymentDoc.data() || {}) as Record<string, unknown>;
        const parsed = parseTeamFeePaymentDocId(paymentDoc.id);
        const feeIdRaw = String(p.feeId || "").trim();
        const userIdRaw = String(p.userId || "").trim();
        const memberIdRaw = String(p.memberId || "").trim();
        let feeId = String(feeIdRaw || parsed?.feeId || "").trim();
        let userId = String(userIdRaw || memberIdRaw || "").trim();
        if (!userId && parsed?.userId) userId = String(parsed.userId).trim();
        if (feeIdRaw) {
          const fromDoc = parsePaymentDocUserIdWithKnownFeeId(paymentDoc.id, feeIdRaw);
          if (fromDoc) userId = fromDoc.trim();
        } else if (feeId) {
          const fromDoc = parsePaymentDocUserIdWithKnownFeeId(paymentDoc.id, feeId);
          if (fromDoc) userId = fromDoc.trim();
        }
        const amount = Math.floor(Number(p.amount || 0));
        if (!feeId || !userId) {
          skipped += 1;
          continue;
        }
        const needsIdentityRepair =
          feeIdRaw !== feeId || userIdRaw !== userId || (memberIdRaw.length > 0 && memberIdRaw !== userId);
        const needsAmountRepair = !Number.isFinite(amount) || amount <= 0;
        if (!needsAmountRepair && !needsIdentityRepair) continue;

        let member = memberCache.get(userId);
        if (member === undefined) {
          const memberSnap = await db.doc(`teams/${teamId}/members/${userId}`).get();
          member = memberSnap.exists ? ((memberSnap.data() || {}) as Record<string, unknown>) : null;
          memberCache.set(userId, member);
        }
        const duesType = asMonthlyDuesType(p, member);

        let feeAmount = feeCache.get(feeId);
        if (feeAmount === undefined) {
          const feeSnap = await db.doc(`teams/${teamId}/fees/${feeId}`).get();
          feeAmount = feeSnap.exists ? Math.floor(Number((feeSnap.data() || {}).amount || 0)) : 0;
          feeCache.set(feeId, feeAmount);
        }
        const patch: Record<string, unknown> = {
          feeId,
          userId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        let willPatch = false;
        if (needsIdentityRepair) {
          patch.feeId = feeId;
          patch.userId = userId;
          patch.memberId = userId;
          repairedIdentity += 1;
          willPatch = true;
        }

        if (needsAmountRepair) {
          if (duesType !== "monthly") {
            skipped += 1;
            continue;
          }
          if (!Number.isFinite(feeAmount) || feeAmount <= 0) {
            skipped += 1;
            continue;
          }
          patch.amount = feeAmount;
          const st = String(p.status || "pending").trim();
          patch.amountDue = feeAmount;
          patch.amountPaid = st === "paid" ? feeAmount : 0;
          repairedAmount += 1;
          willPatch = true;
        }
        if (!willPatch) continue;
        patch.repairMeta = {
          by: actorUid,
          at: admin.firestore.FieldValue.serverTimestamp(),
          reason: "repairTeamFeePayments",
        };

        if (!dryRun) {
          batch.set(paymentDoc.ref, patch, { merge: true });
          ops += 1;
          if (ops >= 400) await flush();
        }
      }

      await flush();
      logger.info("[repairTeamFeePayments] done", {
        teamId,
        feeIdFilter: feeIdFilter || null,
        dryRun,
        scanned,
        repairedAmount,
        repairedIdentity,
        skipped,
        actorUid,
      });
      return {
        success: true,
        teamId,
        feeIdFilter: feeIdFilter || null,
        dryRun,
        scanned,
        repairedAmount,
        repairedIdentity,
        skipped,
      };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      const stack = e instanceof Error ? e.stack : undefined;
      logger.error("[repairTeamFeePayments] unhandled", { message: msg, stack });
      throw new HttpsError(
        "failed-precondition",
        `repairTeamFeePayments: ${msg.slice(0, 240)}`
      );
    }
  }
);

/** 호환 alias */
export const repairTeamFeePaymentAmounts = repairTeamFeePayments;

// functions/src/feePaymentFinal.ts
// 💰 수동 완납 서버 코드 (최종 완성본)
//
// 요구사항:
// - Auth 필수
// - 관리자 권한 체크 (OWNER/ADMIN/STAFF)
// - allowManualFee gate
// - Idempotent write (중복 호출 안전)
// - 월별 fee 구조: teams/{teamId}/fees/{YYYY-MM}/payments/{memberId}

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { ensureMonthlyFee, ensureFeeMember, ensureMonthInitialized } from "./feeSystemCoreFinal";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * 💰 수동 완납 처리 (최종 완성본)
 * 
 * 동작 조건:
 * 1. Auth 필수
 * 2. 팀 존재 확인
 * 3. 관리자 권한 확인 (OWNER/ADMIN/STAFF)
 * 4. allowManualFee === true 또는 plan !== 'free'
 * 5. 월(YYYY-MM) 유효성 검사
 * 
 * 기록 원칙:
 * - Idempotent: 이미 완납이면 성공 반환
 * - 단일 소스: teams/{teamId}/fees/{YYYY-MM}/payments/{memberId}
 */
export const processFeePaymentCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (req) => {
    const { teamId, memberId, month, amount } = req.data ?? {};
    const uid = req.auth?.uid;

    // 1️⃣ Auth 필수
    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    // 2️⃣ 파라미터 검증
    if (!teamId || !memberId || !month) {
      throw new HttpsError("invalid-argument", "필수값 누락 (teamId, memberId, month)");
    }

    // 3️⃣ 월 형식 검증 (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new HttpsError("invalid-argument", "month는 YYYY-MM 형식이어야 합니다.");
    }

    // 4️⃣ 팀 존재 확인
    const teamRef = db.doc(`teams/${teamId}`);
    const teamSnap = await teamRef.get();

    if (!teamSnap.exists) {
      throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
    }

    const team = teamSnap.data()!;

    // 5️⃣ 관리자 권한 확인 (OWNER/ADMIN/STAFF)
    const owners = team.owners || [];
    let isAdmin = owners.includes(uid);

    if (!isAdmin) {
      // team_members에서 role 확인
      const memberSnap = await db
        .collection("team_members")
        .where("teamId", "==", teamId)
        .where("uid", "==", uid)
        .limit(1)
        .get();

      if (!memberSnap.empty) {
        const role = (memberSnap.docs[0].data().role || "").toUpperCase();
        if (["OWNER", "ADMIN", "STAFF", "총무"].includes(role)) {
          isAdmin = true;
        }
      }
    }

    if (!isAdmin) {
      throw new HttpsError("permission-denied", "회비 납부 처리는 관리자만 할 수 있습니다.");
    }

    // 6️⃣ allowManualFee gate 또는 plan 체크
    const allowManualFee = !!team.allowManualFee;
    const plan = (team.plan || "").toUpperCase();
    const isProPlan = plan === "PRO";

    if (!allowManualFee && !isProPlan) {
      throw new HttpsError(
        "permission-denied",
        "이 팀은 수동 회비 납부가 비활성화되어 있습니다."
      );
    }

    // 7️⃣ enableNewFeeSystem 체크 (신 시스템 사용 여부)
    const enableNew = team.enableNewFeeSystem !== false; // 기본 true

    if (!enableNew) {
      // 레거시 시스템으로 리다이렉트
      // 레거시 함수는 별도로 호출하거나, 여기서 레거시 로직 실행
      throw new HttpsError(
        "failed-precondition",
        "신규 회비 시스템이 비활성화 상태입니다. 레거시 시스템을 사용하세요."
      );
    }

    // 8️⃣ 월별 fee 헤더 보장
    await ensureMonthlyFee(teamId, month);

    // 9️⃣ 회원 fee 문서 보장 (없으면 생성)
    try {
      await ensureFeeMember(teamId, month, memberId);
    } catch (error: any) {
      // 이미 존재하거나 면제자는 무시
      if (error.message !== "MEMBER_NOT_FOUND" && error.message !== "FEE_DOC_NOT_FOUND") {
        console.warn(`⚠️ [processFeePayment] 회원 fee 문서 생성 실패: ${error.message}`);
      }
      // 문서가 없으면 Lazy-create로 월별 fee 생성
      if (error.message === "FEE_DOC_NOT_FOUND" || error.message === "MEMBER_NOT_FOUND") {
        await ensureMonthInitialized(teamId, month);
        // 다시 시도
        await ensureFeeMember(teamId, month, memberId);
      }
    }

    // 🔟 납부 처리 (Idempotent)
    const paymentRef = teamRef
      .collection("fees")
      .doc(month)
      .collection("payments")
      .doc(memberId);

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(paymentRef);
      
      if (!snap.exists) {
        throw new HttpsError("not-found", "해당 월의 회원 회비 문서가 없습니다.");
      }

      const cur = snap.data()!;
      const currentStatus = cur.status || "unpaid";
      const dueAmount = Number(cur.dueAmount ?? cur.amount ?? amount ?? 20000);
      const currentPaidAmount = Number(cur.paidAmount ?? 0);

      // Idempotent: 이미 완납이면 성공 반환
      if (currentStatus === "paid" && currentPaidAmount >= dueAmount) {
        return {
          ok: true,
          message: "이미 완납 처리되었습니다.",
          alreadyPaid: true,
        };
      }

      // 완납 처리
      const newPaidAmount = dueAmount;
      const newStatus = "paid";

      tx.set(
        paymentRef,
        {
          status: newStatus,
          paidAmount: newPaidAmount,
          amount: newPaidAmount,
          paidAt: FieldValue.serverTimestamp(),
          paidBy: uid,
          method: "manual",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return {
        ok: true,
        message: "회비 납부 처리가 완료되었습니다.",
        alreadyPaid: false,
      };
    });

    // 1️⃣1️⃣ Audit 로그 저장
    const auditLogRef = db.collection("auditLogs").doc();
    await auditLogRef.set({
      type: "fee_payment_manual",
      teamId,
      memberId,
      month,
      amount: result.alreadyPaid ? undefined : amount,
      processedBy: uid,
      method: "manual",
      feeDocumentPath: `teams/${teamId}/fees/${month}/payments/${memberId}`,
      createdAt: FieldValue.serverTimestamp(),
      uid, // auditLogs 규칙에 필요
      rollbackable: true,
      rollbackPath: `teams/${teamId}/fees/${month}/payments/${memberId}`,
    });

    return result;
  }
);


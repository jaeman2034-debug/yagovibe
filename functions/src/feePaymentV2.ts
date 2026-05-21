// functions/src/feePaymentV2.ts
// 💰 회비 납부 처리 (새 시스템 - Feature Flag 기반)
//
// Feature Flag:
// - enableNewFeeSystem: true/false (신규 로직 ON/OFF)
// - allowManualFee: true (수동 완납 허용)
// - feeBaseAmount: number (기본 회비 금액)

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { ensureMonthlyFee, ensureFeeMember } from "./feeSystemCore";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * 💰 회비 납부 처리 (수동 완납 포함)
 */
export const processFeePaymentCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (req) => {
    const { teamId, memberId, month, method } = req.data ?? {};
    const uid = req.auth?.uid;

    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!teamId || !memberId || !month) {
      throw new HttpsError("invalid-argument", "필수값 누락");
    }

    // month 형식 검증 (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new HttpsError("invalid-argument", "month는 YYYY-MM 형식이어야 합니다.");
    }

    const teamRef = db.doc(`teams/${teamId}`);
    const teamSnap = await teamRef.get();

    if (!teamSnap.exists) {
      throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
    }

    const team = teamSnap.data()!;
    const allowManualFee = !!team.allowManualFee;
    const enableNew = team.enableNewFeeSystem !== false; // 기본 true로 두고 싶으면 이렇게

    // (중요) 신규 시스템 OFF면 레거시로 넘기기
    if (!enableNew) {
      throw new HttpsError(
        "failed-precondition",
        "신규 회비 시스템이 비활성화 상태입니다."
      );
    }

    // 수동 완납이면 플래그 체크
    if (method === "manual" && !allowManualFee) {
      throw new HttpsError("permission-denied", "수동 완납이 허용되지 않습니다.");
    }

    // 관리자 권한 확인
    const owners = team.owners || [];
    let isAdminOrOwner = owners.includes(uid);

    if (!isAdminOrOwner) {
      // team_members에서 role 확인 (admin / treasurer / 총무 허용)
      const memberSnap = await db
        .collection("team_members")
        .where("teamId", "==", teamId)
        .where("uid", "==", uid)
        .limit(1)
        .get();

      if (!memberSnap.empty) {
        const role = (memberSnap.docs[0].data().role || "").toString();
        if (["admin", "treasurer", "총무"].includes(role)) {
          isAdminOrOwner = true;
        }
      }
    }

    if (!isAdminOrOwner) {
      throw new HttpsError("permission-denied", "회비 납부 처리는 관리자만 할 수 있습니다.");
    }

    // 월 문서 없으면 생성 + 회원 문서도 보장
    await ensureMonthlyFee(teamId, month);

    // 회원 fee 문서 보장 (없으면 생성)
    try {
      await ensureFeeMember(teamId, month, memberId);
    } catch (error: any) {
      // 이미 존재하거나 면제자는 무시
      if (error.message !== "MEMBER_NOT_FOUND" && error.message !== "FEE_DOC_NOT_FOUND") {
        console.warn(`⚠️ [processFeePayment] 회원 fee 문서 생성 실패: ${error.message}`);
      }
    }

    const feeMemberRef = teamRef
      .collection("fees")
      .doc(month)
      .collection("members")
      .doc(memberId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(feeMemberRef);
      if (!snap.exists) {
        throw new HttpsError("not-found", "해당 월의 회원 회비 문서가 없습니다.");
      }

      const cur = snap.data()!;
      const due = Number(cur.dueAmount ?? 0);
      const paid = Number(cur.paidAmount ?? 0);

      // 완납 처리
      const newPaidAmount = due;
      const newStatus = newPaidAmount >= due ? "paid" : "partial";

      tx.set(
        feeMemberRef,
        {
          paidAmount: newPaidAmount,
          status: newStatus,
          paidAt: FieldValue.serverTimestamp(),
          method: method ?? "manual",
          processedBy: uid,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    // Audit 로그 저장
    const auditLogRef = db.collection("auditLogs").doc();
    await auditLogRef.set({
      type: "fee_payment_manual",
      teamId,
      memberId,
      month,
      method: method ?? "manual",
      processedBy: uid,
      feeDocumentPath: `teams/${teamId}/fees/${month}/members/${memberId}`,
      createdAt: FieldValue.serverTimestamp(),
      uid, // auditLogs 규칙에 필요
      rollbackable: true,
      rollbackPath: `teams/${teamId}/fees/${month}/members/${memberId}`,
    });

    return { ok: true };
  }
);

/**
 * 🔧 Lazy-create: 화면 접속 시 월별 회비 생성
 */
export const ensureMonthlyFeeCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (req) => {
    const { teamId, month } = req.data ?? {};
    const uid = req.auth?.uid;

    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!teamId || !month) {
      throw new HttpsError("invalid-argument", "teamId와 month가 필요합니다.");
    }

    // month 형식 검증 (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new HttpsError("invalid-argument", "month는 YYYY-MM 형식이어야 합니다.");
    }

    // 팀 정보 조회
    const teamRef = db.doc(`teams/${teamId}`);
    const teamSnap = await teamRef.get();

    if (!teamSnap.exists) {
      throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
    }

    const team = teamSnap.data()!;

    // enableNewFeeSystem 플래그 확인
    if (team.enableNewFeeSystem === false) {
      return {
        success: false,
        message: "새 회비 시스템이 비활성화되어 있습니다.",
        created: false,
      };
    }

    // 월별 헤더 생성
    await ensureMonthlyFee(teamId, month);

    // 회원별 fee 문서 생성
    const { createMonthlyFeeMembers } = await import("./feeSystemCore");
    await createMonthlyFeeMembers(teamId, month);

    return {
      success: true,
      message: "월별 회비 생성 완료",
      created: true,
    };
  }
);


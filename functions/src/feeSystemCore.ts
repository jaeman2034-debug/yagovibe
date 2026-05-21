// functions/src/feeSystemCore.ts
// 🔥 회비 시스템 핵심 로직 (복붙 가능한 최종 뼈대)
//
// 최종 아키텍처:
// - 스케줄 자동 생성 (매월 1일 00:10)
// - Lazy-create 보조 (화면 접속 시)
// - Feature Flag 기반 롤백 (enableNewFeeSystem)
// - 이월 로직 완벽 구현

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * 📅 월 유틸 함수
 */
export function ym(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function prevYm(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1); // previous month
  return ym(d);
}

/**
 * ✅ 월별 회비 헤더 생성 (스케줄/화면 공통)
 * 
 * @param teamId 팀 ID
 * @param month 월 (YYYY-MM)
 * @returns fee 헤더 참조
 */
export async function ensureMonthlyFee(teamId: string, month: string) {
  const teamRef = db.doc(`teams/${teamId}`);
  const feeRef = teamRef.collection("fees").doc(month);

  await db.runTransaction(async (tx) => {
    const [teamSnap, feeSnap] = await Promise.all([
      tx.get(teamRef),
      tx.get(feeRef),
    ]);

    if (!teamSnap.exists) {
      throw new Error("TEAM_NOT_FOUND");
    }

    if (!feeSnap.exists) {
      const team = teamSnap.data()!;
      const baseAmount = Number(team.feeBaseAmount ?? 20000); // fallback

      tx.set(feeRef, {
        month,
        baseAmount,
        status: "open",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });

  return feeRef;
}

/**
 * 📦 회원별 fee 문서 생성 + 이월 계산
 * 
 * @param teamId 팀 ID
 * @param month 월 (YYYY-MM)
 */
export async function createMonthlyFeeMembers(teamId: string, month: string) {
  const teamRef = db.doc(`teams/${teamId}`);
  const feeRef = teamRef.collection("fees").doc(month);
  const feeSnap = await feeRef.get();

  if (!feeSnap.exists) {
    throw new Error("FEE_DOC_NOT_FOUND");
  }

  const baseAmount = Number(feeSnap.data()!.baseAmount ?? 20000);
  const prevMonth = prevYm(month);

  // 팀 멤버 목록 (활성 회원만)
  const membersSnap = await teamRef
    .collection("members")
    .where("status", "==", "active")
    .get();

  const batch = db.batch();
  let batchCount = 0;
  const MAX_BATCH_SIZE = 500;

  for (const m of membersSnap.docs) {
    const memberId = m.id;
    const memberData = m.data();

    // 면제자는 제외
    if (memberData.feePlan === "exempt") {
      continue;
    }

    // 이미 존재하는지 확인
    const curMemberRef = feeRef.collection("members").doc(memberId);
    const curMemberSnap = await curMemberRef.get();

    if (curMemberSnap.exists) {
      continue; // 이미 존재하면 스킵
    }

    // 전월 unpaid/partial이면 carryOver
    const prevRef = teamRef
      .collection("fees")
      .doc(prevMonth)
      .collection("members")
      .doc(memberId);
    const prevSnap = await prevRef.get();

    let carryOverAmount = 0;
    if (prevSnap.exists) {
      const prevData = prevSnap.data()!;
      const prevStatus = prevData.status || "unpaid";

      if (prevStatus !== "paid") {
        const prevDue = Number(prevData.dueAmount ?? 0);
        const prevPaid = Number(prevData.paidAmount ?? 0);
        carryOverAmount = Math.max(0, prevDue - prevPaid);
      }
    }

    const dueAmount = baseAmount + carryOverAmount;

    batch.set(
      curMemberRef,
      {
        memberId,
        memberName: memberData.name || "이름 없음",
        baseAmount,
        carryOverAmount: Math.max(0, carryOverAmount),
        dueAmount,
        paidAmount: 0,
        status: "unpaid",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    batchCount++;

    // 배치 제한 체크
    if (batchCount >= MAX_BATCH_SIZE) {
      await batch.commit();
      batchCount = 0;
    }
  }

  // 남은 배치 커밋
  if (batchCount > 0) {
    await batch.commit();
  }
}

/**
 * 💰 회원별 fee 문서 단일 생성 (Lazy-create용)
 * 
 * @param teamId 팀 ID
 * @param month 월 (YYYY-MM)
 * @param memberId 회원 ID
 */
export async function ensureFeeMember(
  teamId: string,
  month: string,
  memberId: string
): Promise<void> {
  const teamRef = db.doc(`teams/${teamId}`);
  const feeRef = teamRef.collection("fees").doc(month);
  const feeSnap = await feeRef.get();

  if (!feeSnap.exists) {
    throw new Error("FEE_DOC_NOT_FOUND");
  }

  const baseAmount = Number(feeSnap.data()!.baseAmount ?? 20000);
  const prevMonth = prevYm(month);

  // 회원 정보 조회
  const memberRef = teamRef.collection("members").doc(memberId);
  const memberSnap = await memberRef.get();

  if (!memberSnap.exists) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  const memberData = memberSnap.data()!;

  // 면제자는 제외
  if (memberData.feePlan === "exempt") {
    return;
  }

  // 이미 존재하는지 확인
  const curMemberRef = feeRef.collection("members").doc(memberId);
  const curMemberSnap = await curMemberRef.get();

  if (curMemberSnap.exists) {
    return; // 이미 존재하면 스킵
  }

  // 전월 unpaid/partial이면 carryOver
  const prevRef = teamRef
    .collection("fees")
    .doc(prevMonth)
    .collection("members")
    .doc(memberId);
  const prevSnap = await prevRef.get();

  let carryOverAmount = 0;
  if (prevSnap.exists) {
    const prevData = prevSnap.data()!;
    const prevStatus = prevData.status || "unpaid";

    if (prevStatus !== "paid") {
      const prevDue = Number(prevData.dueAmount ?? 0);
      const prevPaid = Number(prevData.paidAmount ?? 0);
      carryOverAmount = Math.max(0, prevDue - prevPaid);
    }
  }

  const dueAmount = baseAmount + carryOverAmount;

  await curMemberRef.set(
    {
      memberId,
      memberName: memberData.name || "이름 없음",
      baseAmount,
      carryOverAmount: Math.max(0, carryOverAmount),
      dueAmount,
      paidAmount: 0,
      status: "unpaid",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}


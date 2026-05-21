// src/utils/calculateUnpaidMonthsFinal.ts
// 📊 미납 개월 수 계산 (프론트엔드 - 최종 완성본)
//
// 회원관리 화면에서 "미납 0" 표시를 위한 계산식
// 새 구조: teams/{teamId}/fees/{YYYY-MM}/payments/{memberId} 기준
//
// 계산 방식:
// - 회원관리 화면 미납 = 이번달 + 이전월 unpaid 합계(누적)
// - 회비상세(월 화면) = 해당 월만

import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * 📅 월 유틸 함수
 */
function ym(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function prevYm(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return ym(d);
}

/**
 * 📊 회원의 미납 개월 수 계산 (누적 - 회원관리 화면용)
 * 
 * 계산 방식:
 * - 최근 12개월 fee 조회
 * - 최근 월부터 역순으로 확인
 * - status !== "paid" 또는 paidAmount < dueAmount → 미납 카운트
 * - status === "paid" && paidAmount >= dueAmount → 중단 (연속 미납만 카운트)
 * 
 * @param teamId 팀 ID
 * @param memberId 회원 ID
 * @returns 미납 개월 수 (누적)
 */
export async function calculateUnpaidMonths(
  teamId: string,
  memberId: string
): Promise<number> {
  try {
    // 현재 월 기준으로 최근 12개월 fee 조회
    const now = new Date();
    const months: string[] = [];
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = ym(date);
      months.push(month);
    }

    let unpaidCount = 0;

    // 최근 월부터 역순으로 확인 (현재 월 → 과거)
    for (const month of months) {
      const paymentRef = doc(
        db,
        `teams/${teamId}/fees/${month}/payments/${memberId}`
      );
      
      const paymentDoc = await getDoc(paymentRef);

      if (!paymentDoc.exists()) {
        // fee 기록이 없으면 미납으로 간주
        unpaidCount++;
        continue;
      }

      const paymentData = paymentDoc.data();
      const status = paymentData.status || "unpaid";
      const dueAmount = Number(paymentData.dueAmount ?? paymentData.amount ?? 0);
      const paidAmount = Number(paymentData.paidAmount ?? 0);

      if (status === "paid" && paidAmount >= dueAmount) {
        // 납부 완료 → 여기서 중단 (연속 미납만 카운트)
        break;
      } else {
        // 미납 또는 부분 납부
        unpaidCount++;
      }
    }

    return unpaidCount;

  } catch (error) {
    console.error("❌ [calculateUnpaidMonths] 계산 실패:", error);
    return 0; // 에러 시 0 반환 (안전)
  }
}

/**
 * 📊 회원의 현재 월 납부 상태 조회 (회비상세 화면용)
 * 
 * @param teamId 팀 ID
 * @param memberId 회원 ID
 * @param month 월 (YYYY-MM, 기본값: 현재 월)
 * @returns 납부 상태
 */
export async function getFeeStatus(
  teamId: string,
  memberId: string,
  month?: string
): Promise<{
  status: "unpaid" | "paid" | "partial" | "not_found";
  dueAmount: number;
  paidAmount: number;
  carryOverAmount: number;
  baseAmount: number;
}> {
  try {
    const now = new Date();
    const currentMonth = month || ym(now);

    const paymentRef = doc(
      db,
      `teams/${teamId}/fees/${currentMonth}/payments/${memberId}`
    );
    
    const paymentDoc = await getDoc(paymentRef);

    if (!paymentDoc.exists()) {
      return {
        status: "not_found",
        dueAmount: 0,
        paidAmount: 0,
        carryOverAmount: 0,
        baseAmount: 0,
      };
    }

    const paymentData = paymentDoc.data();
    const status = (paymentData.status || "unpaid") as "unpaid" | "paid" | "partial";
    const dueAmount = Number(paymentData.dueAmount ?? paymentData.amount ?? 0);
    const paidAmount = Number(paymentData.paidAmount ?? 0);
    const carryOverAmount = Number(paymentData.carryOverAmount ?? 0);
    const baseAmount = Number(paymentData.baseAmount ?? 0);

    return {
      status,
      dueAmount,
      paidAmount,
      carryOverAmount,
      baseAmount,
    };

  } catch (error) {
    console.error("❌ [getFeeStatus] 조회 실패:", error);
    return {
      status: "not_found",
      dueAmount: 0,
      paidAmount: 0,
      carryOverAmount: 0,
      baseAmount: 0,
    };
  }
}

/**
 * 📊 팀의 전체 미납 현황 조회 (회비상세 화면용)
 * 
 * @param teamId 팀 ID
 * @param month 월 (YYYY-MM, 기본값: 현재 월)
 * @returns 미납 현황
 */
export async function getTeamUnpaidStatus(
  teamId: string,
  month?: string
): Promise<{
  totalMembers: number;
  paidMembers: number;
  unpaidMembers: number;
  partialMembers: number;
  totalDueAmount: number;
  totalPaidAmount: number;
}> {
  try {
    const now = new Date();
    const currentMonth = month || ym(now);

    const paymentsRef = collection(
      db,
      `teams/${teamId}/fees/${currentMonth}/payments`
    );
    
    const paymentsSnap = await getDocs(paymentsRef);

    let totalMembers = 0;
    let paidMembers = 0;
    let unpaidMembers = 0;
    let partialMembers = 0;
    let totalDueAmount = 0;
    let totalPaidAmount = 0;

    paymentsSnap.forEach((doc) => {
      const data = doc.data();
      const status = data.status || "unpaid";
      const dueAmount = Number(data.dueAmount ?? data.amount ?? 0);
      const paidAmount = Number(data.paidAmount ?? 0);

      totalMembers++;
      totalDueAmount += dueAmount;
      totalPaidAmount += paidAmount;

      if (status === "paid") {
        paidMembers++;
      } else if (status === "partial") {
        partialMembers++;
      } else {
        unpaidMembers++;
      }
    });

    return {
      totalMembers,
      paidMembers,
      unpaidMembers,
      partialMembers,
      totalDueAmount,
      totalPaidAmount,
    };

  } catch (error) {
    console.error("❌ [getTeamUnpaidStatus] 조회 실패:", error);
    return {
      totalMembers: 0,
      paidMembers: 0,
      unpaidMembers: 0,
      partialMembers: 0,
      totalDueAmount: 0,
      totalPaidAmount: 0,
    };
  }
}

/**
 * 📊 회원의 미납 금액 계산 (누적)
 * 
 * @param teamId 팀 ID
 * @param memberId 회원 ID
 * @returns 미납 금액 (누적)
 */
export async function calculateUnpaidAmount(
  teamId: string,
  memberId: string
): Promise<number> {
  try {
    const now = new Date();
    const months: string[] = [];
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = ym(date);
      months.push(month);
    }

    let unpaidAmount = 0;

    for (const month of months) {
      const paymentRef = doc(
        db,
        `teams/${teamId}/fees/${month}/payments/${memberId}`
      );
      
      const paymentDoc = await getDoc(paymentRef);

      if (!paymentDoc.exists()) {
        continue;
      }

      const paymentData = paymentDoc.data();
      const status = paymentData.status || "unpaid";
      const dueAmount = Number(paymentData.dueAmount ?? paymentData.amount ?? 0);
      const paidAmount = Number(paymentData.paidAmount ?? 0);

      if (status === "paid" && paidAmount >= dueAmount) {
        break; // 완납된 월을 만나면 중단
      } else {
        unpaidAmount += Math.max(0, dueAmount - paidAmount);
      }
    }

    return unpaidAmount;

  } catch (error) {
    console.error("❌ [calculateUnpaidAmount] 계산 실패:", error);
    return 0;
  }
}


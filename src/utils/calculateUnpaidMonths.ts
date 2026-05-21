// src/utils/calculateUnpaidMonths.ts
// 📊 미납 개월 수 계산 (프론트엔드 - 새 구조 기준)
//
// 회원관리 화면에서 "미납 0" 표시를 위한 계산식
// 새 구조: teams/{teamId}/fees/{YYYY-MM}/members/{memberId} 기준

import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * 📊 회원의 미납 개월 수 계산 (새 구조 기준)
 * 
 * @param teamId 팀 ID
 * @param memberId 회원 ID
 * @returns 미납 개월 수
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
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.push(month);
    }

    let unpaidCount = 0;

    // 최근 월부터 역순으로 확인 (현재 월 → 과거)
    for (const month of months) {
      const feeMemberRef = doc(
        db,
        `teams/${teamId}/fees/${month}/members/${memberId}`
      );
      
      const feeMemberDoc = await getDoc(feeMemberRef);

      if (!feeMemberDoc.exists()) {
        // fee 기록이 없으면 미납으로 간주
        unpaidCount++;
        continue;
      }

      const feeData = feeMemberDoc.data();
      const status = feeData.status || "unpaid";
      const dueAmount = Number(feeData.dueAmount || 0);
      const paidAmount = Number(feeData.paidAmount || 0);

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
 * 📊 회원의 현재 월 납부 상태 조회
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
}> {
  try {
    const now = new Date();
    const currentMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const feeMemberRef = doc(
      db,
      `teams/${teamId}/fees/${currentMonth}/members/${memberId}`
    );
    
    const feeMemberDoc = await getDoc(feeMemberRef);

    if (!feeMemberDoc.exists()) {
      return {
        status: "not_found",
        dueAmount: 0,
        paidAmount: 0,
        carryOverAmount: 0,
      };
    }

    const feeData = feeMemberDoc.data();
    const status = (feeData.status || "unpaid") as "unpaid" | "paid" | "partial";
    const dueAmount = Number(feeData.dueAmount || 0);
    const paidAmount = Number(feeData.paidAmount || 0);
    const carryOverAmount = Number(feeData.carryOverAmount || 0);

    return {
      status,
      dueAmount,
      paidAmount,
      carryOverAmount,
    };

  } catch (error) {
    console.error("❌ [getFeeStatus] 조회 실패:", error);
    return {
      status: "not_found",
      dueAmount: 0,
      paidAmount: 0,
      carryOverAmount: 0,
    };
  }
}

/**
 * 📊 팀의 전체 미납 현황 조회
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
    const currentMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const feeMembersRef = collection(
      db,
      `teams/${teamId}/fees/${currentMonth}/members`
    );
    
    const feeMembersSnap = await getDocs(feeMembersRef);

    let totalMembers = 0;
    let paidMembers = 0;
    let unpaidMembers = 0;
    let partialMembers = 0;
    let totalDueAmount = 0;
    let totalPaidAmount = 0;

    feeMembersSnap.forEach((doc) => {
      const data = doc.data();
      const status = data.status || "unpaid";
      const dueAmount = Number(data.dueAmount || 0);
      const paidAmount = Number(data.paidAmount || 0);

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


// src/utils/monthlyReport.ts
// 📊 월간 운영 리포트 생성 유틸리티

import { TeamMember, TeamFeePolicy, calculateMonthlyFee } from "./teamRules";

export interface MonthlyReport {
  month: string; // YYYY-MM
  memberStats: {
    total: number;
    active: number;
    paused: number;
    expelled: number;
    deleted?: number; // 삭제된 회원 수 (옵션)
  };
  feeStats: {
    totalEligible: number; // 회비 대상자 (면제 제외)
    monthly: number;
    annual: number;
    exempt: number;
    expectedAmount?: number; // 예상 수입 (옵션)
    paidAmount?: number; // 실 수입 (옵션)
    unpaidAmount?: number; // 미수금 (옵션)
  };
  feeRevenue: {
    expectedAmount: number; // 예상 수입
    actualAmount: number; // 실 수입
    unpaidAmount: number; // 미수금
    paidCount: number; // 납부 완료
    unpaidCount: number; // 미납
    exemptCount: number; // 면제
  };
  alerts: Array<{
    type: "CONSECUTIVE_UNPAID" | "PAUSED_NOT_RESTORED" | "EXECUTIVE_UNPAID" | "UNPAID_2_MONTHS" | "PAUSED_OVER_3_MONTHS";
    message: string;
    memberNames: string[];
    count?: number; // 알림 개수 (옵션)
  }>;
  generatedAt: Date;
  generatedBy: string;
  generatedByName?: string; // 생성자 이름 (옵션)
}

/**
 * 월간 운영 리포트 생성
 */
export async function generateMonthlyReport(
  members: TeamMember[],
  month: string, // YYYY-MM
  feePolicy: TeamFeePolicy,
  ledgerItemsByMonth?: { [yyyymm: string]: any[] } // 해당 월의 ledger 항목들
): Promise<MonthlyReport> {
  // 🔥 삭제된 회원 제외
  const activeMembers = members.filter(m => !m.isDeleted);
  
  // 📊 회원 통계
  const memberStats = {
    total: activeMembers.length,
    active: activeMembers.filter(m => m.status === "active").length,
    paused: activeMembers.filter(m => m.status === "paused").length,
    expelled: activeMembers.filter(m => m.status === "expelled").length,
  };
  
  // 💰 회비 통계
  const feeStats = {
    totalEligible: activeMembers.filter(m => {
      const resolved = m.feePlan || "monthly";
      return resolved !== "exempt";
    }).length,
    monthly: activeMembers.filter(m => m.feePlan === "monthly").length,
    annual: activeMembers.filter(m => m.feePlan === "annual").length,
    exempt: activeMembers.filter(m => m.feePlan === "exempt").length,
  };
  
  // 💰 회비 수입 계산
  let expectedAmount = 0;
  let actualAmount = 0;
  let paidCount = 0;
  let unpaidCount = 0;
  const exemptCount = feeStats.exempt;
  
  activeMembers.forEach(member => {
    if (member.status === "paused" || member.status === "expelled") {
      return; // 휴원/제명은 회비 계산 제외
    }
    
    const monthlyFee = calculateMonthlyFee(member, new Date());
    
    if (member.feePlan === "exempt") {
      return; // 면제자는 제외
    }
    
    expectedAmount += monthlyFee;
    
    // 🔥 해당 월 ledger 항목 확인 (있으면 납부 완료로 간주)
    if (ledgerItemsByMonth && ledgerItemsByMonth[month]) {
      const ledgerItem = ledgerItemsByMonth[month].find(
        (item: any) => item.memberId === member.id
      );
      
      if (ledgerItem && ledgerItem.paidAmount >= ledgerItem.dueAmount) {
        actualAmount += ledgerItem.paidAmount;
        paidCount++;
      } else {
        unpaidCount++;
      }
    } else {
      // ledger 데이터가 없으면 미납으로 간주
      unpaidCount++;
    }
  });
  
  const unpaidAmount = expectedAmount - actualAmount;
  
  // ⚠️ 주의 항목 생성
  const alerts: MonthlyReport["alerts"] = [];
  
  // 2개월 연속 미납자
  const consecutiveUnpaid: string[] = [];
  activeMembers.forEach(member => {
    if (member.status === "active" && member.feePlan !== "exempt" && (member.unpaidMonths || 0) >= 2) {
      consecutiveUnpaid.push(member.name);
    }
  });
  if (consecutiveUnpaid.length > 0) {
    alerts.push({
      type: "CONSECUTIVE_UNPAID",
      message: `${consecutiveUnpaid.length}명의 회원이 2개월 이상 미납 상태입니다`,
      memberNames: consecutiveUnpaid,
    });
  }
  
  // 휴원 후 미복귀 (3개월 이상)
  // (실제로는 joinedAt과 현재 상태를 비교해야 하지만, 간단히 paused 상태만 체크)
  const pausedNotRestored: string[] = [];
  activeMembers.forEach(member => {
    if (member.status === "paused") {
      pausedNotRestored.push(member.name);
    }
  });
  if (pausedNotRestored.length > 0) {
    alerts.push({
      type: "PAUSED_NOT_RESTORED",
      message: `${pausedNotRestored.length}명의 회원이 휴원 상태입니다`,
      memberNames: pausedNotRestored,
    });
  }
  
  // 임원 중 회비 미납
  const executiveUnpaid: string[] = [];
  activeMembers.forEach(member => {
    const isExecutive = member.role !== "일반";
    if (isExecutive && member.status === "active" && member.feePlan !== "exempt" && (member.unpaidMonths || 0) > 0) {
      executiveUnpaid.push(member.name);
    }
  });
  if (executiveUnpaid.length > 0) {
    alerts.push({
      type: "EXECUTIVE_UNPAID",
      message: `${executiveUnpaid.length}명의 임원이 회비 미납 상태입니다`,
      memberNames: executiveUnpaid,
    });
  }
  
  return {
    month,
    memberStats,
    feeStats,
    feeRevenue: {
      expectedAmount,
      actualAmount,
      unpaidAmount,
      paidCount,
      unpaidCount,
      exemptCount,
    },
    alerts,
    generatedAt: new Date(),
    generatedBy: "system",
  };
}


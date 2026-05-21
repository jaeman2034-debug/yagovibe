// src/utils/simulationMode.ts
// 🔒 운영자 실수 방지: 시뮬레이션 모드 (정산 미리보기)

import { type TeamMember, type TeamFeePolicy, calculateDueAmount } from "./teamRules";
import { getActiveRuleSet } from "./ruleRegistry";

export interface SimulationResult {
  yyyymm: string;
  totalMembers: number;
  activeMembers: number;
  exemptMembers: number;
  expectedRevenue: number; // 예상 수납액
  unpaidIncrease: number; // 미납 증가 인원
  pauseCandidates: TeamMember[]; // 휴원 예정자
  expelCandidates: TeamMember[]; // 제명 예정자
  summary: {
    byStatus: {
      active: number;
      paused: number;
      expelled: number;
    };
    byFeePlan: {
      monthly: number;
      annual: number;
      exempt: number;
    };
  };
  ruleVersion: string; // 사용된 규칙 버전
}

// 🔒 정산 시뮬레이션 실행 (실제 반영 없음)
export async function simulateReconciliation(
  teamId: string,
  yyyymm: string,
  currentMembers: TeamMember[],
  feePolicy: TeamFeePolicy
): Promise<SimulationResult> {
  // 현재 활성 규칙 조회
  const activeRuleSet = await getActiveRuleSet(teamId);
  const ruleVersion = activeRuleSet?.version || "2025.1";

  const result: SimulationResult = {
    yyyymm,
    totalMembers: currentMembers.length,
    activeMembers: 0,
    exemptMembers: 0,
    expectedRevenue: 0,
    unpaidIncrease: 0,
    pauseCandidates: [],
    expelCandidates: [],
    summary: {
      byStatus: {
        active: 0,
        paused: 0,
        expelled: 0,
      },
      byFeePlan: {
        monthly: 0,
        annual: 0,
        exempt: 0,
      },
    },
    ruleVersion,
  };

  // 🔒 시뮬레이션: 각 회원 상태 계산
  for (const member of currentMembers) {
    // 현재 상태 카운트
    if (member.status === "active") {
      result.summary.byStatus.active++;
    } else if (member.status === "paused") {
      result.summary.byStatus.paused++;
    } else if (member.status === "expelled") {
      result.summary.byStatus.expelled++;
    }

    // 면제 회원 체크
    if (member.feePlan === "exempt") {
      result.exemptMembers++;
      result.summary.byFeePlan.exempt++;
      continue;
    }

    // 활성 회원만 계산
    if (member.status === "active") {
      result.activeMembers++;

      // 회비 플랜별 카운트 및 예상 수납액 계산
      const [year, month] = yyyymm.split("-").map(Number);
      const dueAmount = calculateDueAmount(member, feePolicy, year, month);
      
      if (member.feePlan === "monthly") {
        result.summary.byFeePlan.monthly++;
        result.expectedRevenue += dueAmount;
      } else if (member.feePlan === "annual") {
        result.summary.byFeePlan.annual++;
        // 연회비는 연도별로만 계산
      }

      // 미납 개월 시뮬레이션 (ledger 없이 가정)
      const currentUnpaidMonths = member.unpaidMonths || 0;
      // 이번 달 청구액이 있고 납부 안 했다고 가정
      const simulatedUnpaidMonths = dueAmount > 0 ? currentUnpaidMonths + 1 : currentUnpaidMonths;

      if (simulatedUnpaidMonths > currentUnpaidMonths) {
        result.unpaidIncrease++;
      }

      // 휴원 예정자 체크 (규칙 기반)
      if (activeRuleSet) {
        const penaltyPoints = (member.penaltyPoints || 0) + (currentUnpaidMonths >= 3 ? 1 : 0);
        
        if (penaltyPoints >= activeRuleSet.discipline.pauseAtPenaltyPoints) {
          result.pauseCandidates.push({
            ...member,
            simulatedStatus: "paused",
            simulatedPenaltyPoints: penaltyPoints,
          } as any);
        }

        // 제명 예정자 체크
        if (penaltyPoints >= activeRuleSet.discipline.expelAtPenaltyPoints) {
          result.expelCandidates.push({
            ...member,
            simulatedStatus: "expelled",
            simulatedPenaltyPoints: penaltyPoints,
          } as any);
        }
      } else {
        // 기본 규칙 적용
        if (simulatedUnpaidMonths >= feePolicy.pauseAtMonths) {
          result.pauseCandidates.push({
            ...member,
            simulatedStatus: "paused",
          } as any);
        }

        if (simulatedUnpaidMonths >= feePolicy.expelAtMonths) {
          result.expelCandidates.push({
            ...member,
            simulatedStatus: "expelled",
          } as any);
        }
      }
    }
  }

  return result;
}


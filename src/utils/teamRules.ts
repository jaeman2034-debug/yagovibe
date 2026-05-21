// src/utils/teamRules.ts
// 🔥 통합 엔진: System/People/Ops 연결

// 🔥 1. 임원 자동 회비 면제 로직 (규칙 엔진)
export const EXEMPT_ROLES = [
  "회장",
  "부회장",
  "총무",
  "감독",
  "코치",
  "상벌위원장",
];

export interface TeamFeePolicy {
  monthly: number;
  annualAmount: number;
  annualPayBy: string; // "02-28"
  annualBenefitMonths: number; // 2
  graceUnpaidMonths: number; // 3
  pauseAtMonths?: number; // 🔥 휴원 처리 기준 (기본값: graceUnpaidMonths)
  expelAtMonths?: number; // 🔥 제명 처리 기준 (기본값: 6)
  // 🔥 정관 변경 대비: 숫자만 바꾸면 모든 규칙 자동 반영
}

export interface TeamMember {
  id?: string;
  name: string;
  role: "일반" | "회장" | "부회장" | "총무" | "감독" | "코치" | "감사" | "상벌위원장";
  status: "active" | "paused" | "expelled";
  feePlan: "monthly" | "annual" | "exempt";
  exemptReason?: "role" | "special";
  manualFeeOverride?: boolean;
  annualPaidYear?: number;
  annualPaidAt?: Date;
  unpaidMonths?: number; // 계산 결과 캐시
  penaltyPoints?: number;
  phoneLast4?: string;
  memo?: string;
  joinedAt?: Date;
}

export interface LedgerItem {
  memberId: string;
  dueAmount: number; // 이번달 청구액
  paidAmount: number; // 실제 납부액
  paidAt?: Date;
  method?: "cash" | "transfer" | "other";
  note?: string;
  calculatedByRuleVersion?: string; // 🔒 근거 버전 (예: "2025.1")
}

// 🔥 1. 자동 판정 함수 (절대 핵심) - 규칙 엔진
// 🔄 역할과 회비 정책 분리: role과 feePlan은 완전히 독립적인 필드
export function resolveFeePlan(member: TeamMember): { feePlan: "monthly" | "annual" | "exempt"; exemptReason?: "role" | "special" } {
  // 🔥 회비 플랜이 이미 설정되어 있으면 그대로 사용 (역할과 독립적)
  if (member.feePlan) {
    return { feePlan: member.feePlan, exemptReason: member.exemptReason };
  }

  // 🔥 기본값: 월회비 (명시적으로 지정하지 않은 경우)
  return { feePlan: "monthly" };
}

// 🔥 2. 월별 청구액 계산
export function calculateDueAmount(
  member: TeamMember,
  feePolicy: TeamFeePolicy,
  year: number,
  month: number
): number {
  const resolved = resolveFeePlan(member);
  
  // 1. 면제
  if (resolved.feePlan === "exempt") return 0;

  // 2. 연회비
  if (resolved.feePlan === "annual" && member.annualPaidYear) {
    // 연회비 납부 연도가 올해면 0
    if (member.annualPaidYear === year) {
      return 0;
    }
  }

  // 3. 기본 월회비
  return feePolicy.monthly;
}

// 🔥 3. 미납 개월 계산
export function calculateUnpaidMonths(
  member: TeamMember,
  ledgerItemsByMonth: { [yyyymm: string]: LedgerItem[] }
): number {
  // 🔥 휴원/제명 상태는 미납 계산에서 제외
  if (member.status === "paused" || member.status === "expelled") {
    return 0;
  }
  
  let unpaidMonths = 0;
  
  // 최근 12개월 체크 (최신순)
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const checkDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyymm = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}`;
    
    const monthItems = ledgerItemsByMonth[yyyymm] || [];
    const ledgerItem = monthItems.find((item) => item.memberId === member.id);
    
    if (ledgerItem) {
      if (ledgerItem.dueAmount > 0 && ledgerItem.paidAmount < ledgerItem.dueAmount) {
        unpaidMonths++;
      } else if (ledgerItem.dueAmount === 0) {
        // 면제/연회비 유효 시 리셋
        break;
      } else if (ledgerItem.paidAmount >= ledgerItem.dueAmount) {
        // 완납 시 리셋
        break;
      }
    } else {
      // ledger 항목이 없으면 미납으로 간주 (단, 면제자는 제외)
      const resolved = resolveFeePlan(member);
      if (resolved.feePlan !== "exempt") {
        unpaidMonths++;
      }
    }
  }
  
  return unpaidMonths;
}

// 🔥 4. 상태 변경 규칙
export function resolveStatus(
  member: TeamMember,
  unpaidMonths: number,
  feePolicy: TeamFeePolicy
): "active" | "paused" | "expelled" {
  // 제명은 수동으로만 변경 (disciplinaryRecords 필수)
  if (member.status === "expelled") {
    return "expelled";
  }
  
  // 미납 3개월 이상 → 휴원
  if (unpaidMonths >= feePolicy.graceUnpaidMonths) {
    return "paused";
  }
  
  return "active";
}

// 🔥 5. 월별 정산 실행 (reconcileMonth)
export async function reconcileMonth(
  teamId: string,
  yyyymm: string,
  members: TeamMember[],
  feePolicy: TeamFeePolicy,
  existingLedgerItemsByMonth: { [yyyymm: string]: LedgerItem[] },
  ruleVersion?: string // 🔒 규칙 버전 (선택)
): Promise<{
  updatedMembers: TeamMember[];
  ledgerUpdates: LedgerItem[];
  auditLogs: any[];
  notificationQueueJobs: number; // 🔥 알림 큐 생성 개수
}> {
  const [year, month] = yyyymm.split("-").map(Number);
  const updatedMembers: TeamMember[] = [];
  const ledgerUpdates: LedgerItem[] = [];
  const auditLogs: any[] = [];
  
  for (const member of members) {
    // 청구액 계산
    const dueAmount = calculateDueAmount(member, feePolicy, year, month);
    
    // 기존 ledger 항목 찾기 (현재 월)
    const currentMonthItems = existingLedgerItemsByMonth[yyyymm] || [];
    const existingItem = currentMonthItems.find(
      (item) => item.memberId === member.id
    );
    
    const paidAmount = existingItem?.paidAmount || 0;
    
    // ledger 업데이트 (규칙 버전 포함)
    ledgerUpdates.push({
      memberId: member.id || "",
      dueAmount,
      paidAmount,
      paidAt: existingItem?.paidAt,
      method: existingItem?.method,
      note: existingItem?.note,
      calculatedByRuleVersion: ruleVersion || "2025.1", // 🔒 근거 버전
    });
    
    // 미납 개월 재계산 (전체 ledger 기반)
    const unpaidMonths = calculateUnpaidMonths(member, existingLedgerItemsByMonth);
    
    // 상태 변경
    const newStatus = resolveStatus(member, unpaidMonths, feePolicy);
    
    // 변경사항이 있으면 업데이트
    if (
      member.unpaidMonths !== unpaidMonths ||
      member.status !== newStatus
    ) {
      const updatedMember: TeamMember = {
        ...member,
        unpaidMonths,
        status: newStatus,
      };
      updatedMembers.push(updatedMember);
      
      // 감사 로그
      if (member.status !== newStatus) {
        auditLogs.push({
          action: "STATUS_CHANGE",
          targetMemberId: member.id,
          before: { status: member.status },
          after: { status: newStatus },
          reason: unpaidMonths >= feePolicy.graceUnpaidMonths 
            ? `미납 ${unpaidMonths}개월` 
            : "정산 실행",
        });
      }
    }
  }
  
  // 🔥 알림 큐는 reconcileMonth 외부에서 생성 (notificationService.createNotificationQueueAfterReconcile)
  // 여기서는 개수만 반환 (실제 큐 생성은 호출부에서 처리)
  return { updatedMembers, ledgerUpdates, auditLogs, notificationQueueJobs: 0 };
}

// 🔥 3. 연회비 유효성 판정 함수 (UI 표시용)
export function isAnnualValid(member: TeamMember, currentDate: Date): boolean {
  if (member.feePlan !== "annual") return false;
  if (!member.annualPaidYear) return false;
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12

  // 🔥 2월 말까지 납부한 연회비는 해당 연도 유효
  if (member.annualPaidYear === currentYear) {
    // 3월부터는 다음 해 연회비 필요
    if (currentMonth >= 3) {
      return false; // 다음 해 연회비 필요
    }
    return true; // 1-2월은 유효
  }

  return false;
}

// 🔥 3. 월별 회비 엔진 (중앙 로직) - 하위 호환성
export function calculateMonthlyFee(member: TeamMember, date: Date): number {
  const feePolicy: TeamFeePolicy = {
    monthly: 20000,
    annualAmount: 200000,
    annualPayBy: "02-28",
    annualBenefitMonths: 2,
    graceUnpaidMonths: 3,
  };
  
  return calculateDueAmount(
    member,
    feePolicy,
    date.getFullYear(),
    date.getMonth() + 1
  );
}

// 🔥 5. 월별 배치 시뮬레이터 (천재 모드 정점) - 하위 호환성
// 🔥 상태 기반 미납 계산 제외 로직 추가
export function simulateMonthlyBatch(members: TeamMember[], currentDate: Date): TeamMember[] {
  const feePolicy: TeamFeePolicy = {
    monthly: 20000,
    annualAmount: 200000,
    annualPayBy: "02-28",
    annualBenefitMonths: 2,
    graceUnpaidMonths: 3,
  };
  
  return members.map((member) => {
    const resolved = resolveFeePlan(member);
    let unpaidMonths = member.unpaidMonths || 0;
    let status = member.status || "active";
    
    // 🔥 핵심: 상태가 휴원(paused) 또는 제명(expelled)이면 미납 계산 제외
    if (status === "paused" || status === "expelled") {
      // 휴원/제명 상태는 미납 계산에서 제외 (회비 청구 안 함)
      return {
        ...member,
        feePlan: resolved.feePlan,
        exemptReason: resolved.exemptReason,
        unpaidMonths: unpaidMonths, // 기존 값 유지 (증가 안 함)
        status,
      };
    }
    
    // 🔥 재원(active) 상태만 회비 계산
    const fee = calculateMonthlyFee(member, currentDate);
    
    if (fee > 0) {
      // TODO: 실제 납부 여부 체크 (ledger 컬렉션)
      // 지금은 unpaidMonths만 증가 시뮬레이션
      // unpaidMonths += 1;
    } else {
      unpaidMonths = 0; // 면제/연회비 유효 시 초기화
    }
    
    // 🔥 자동 상태 변경 규칙 (재원 상태일 때만)
    if (status === "active" && unpaidMonths >= feePolicy.graceUnpaidMonths) {
      status = "paused"; // 미납 3개월 → 휴원
    }
    if (member.penaltyPoints && member.penaltyPoints >= 10) {
      status = "expelled"; // 징계 10점 → 제명
    }
    
    return {
      ...member,
      feePlan: resolved.feePlan,
      exemptReason: resolved.exemptReason,
      unpaidMonths,
      status,
    };
  });
}


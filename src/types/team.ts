// src/types/team.ts
// 🔥 소흘 60대 FC 기준 실사용 데이터 구조

export interface TeamSettings {
  monthlyFee: number; // 월 회비 (기본값: 20000)
  annualFee: number; // 연회비 (기본값: 200000)
  annualDiscount: number; // 연회비 할인액 (기본값: 40000)
  annualDeadlineMonth: number; // 연회비 납부 마감월 (기본값: 2)
}

export interface TeamMemberFeePolicy {
  memberId: string;
  type: "monthly" | "annual" | "exempt" | "discount";
  discountAmount?: number; // 할인 금액
  note?: string; // 총무 판단 메모
}

export interface TeamInvoice {
  id: string;
  teamId: string;
  memberId: string;
  month: string; // "2025-02" 형식
  amount: number;
  status: "unpaid" | "paid" | "waived";
  reason?: string; // 면제 사유
  createdAt: Date;
}

export interface TeamPayment {
  id: string;
  teamId: string;
  invoiceId: string;
  memberId: string;
  amount: number;
  method: "cash" | "transfer" | "platform";
  platform?: "toss" | "kcp" | "kakaopay" | null;
  paidAt: Date;
  confirmedBy?: string; // 현금/이체는 총무 확인자
  receiptUrl?: string | null;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId?: string | null; // 비회원도 가능
  name: string;
  phone: string;
  role: "admin" | "treasurer" | "member";
  position?: string; // 포지션 (예: "DF")
  status: "active" | "rest" | "left";
  joinedAt: Date;
}


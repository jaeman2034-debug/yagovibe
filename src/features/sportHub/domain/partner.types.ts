/**
 * 🔥 Partner Types - 파트너 제휴 도메인 모델
 * 
 * 외부 플랫폼과 "사업 단위"로 연결하는 마지막 레이어
 */

import type { Region } from "./region.types";

/**
 * 파트너 타입
 */
export type PartnerType = "map" | "payment" | "sns";

/**
 * 파트너 제공자
 */
export type PartnerProvider =
  | "kakao_map"
  | "naver_map"
  | "google_map"
  | "tosspay"
  | "iamport"
  | "kcp"
  | "kakao_sns"
  | "instagram";

/**
 * 파트너
 */
export type Partner = {
  id: string;
  type: PartnerType;
  provider: PartnerProvider;
  name: string;
  
  // 계약 정보
  contract: PartnerContract;
  
  // 연동 설정
  config: PartnerConfig;
  
  // 상태
  status: "active" | "inactive" | "suspended";
  
  createdAt: string;
  updatedAt: string;
};

/**
 * 제휴 계약
 */
export type PartnerContract = {
  // 수익 분배
  revenueShare: {
    partner: number;    // 파트너 수수료율 (0.06 = 6%)
    platform: number;   // 플랫폼 수수료율 (0.08 = 8%)
    ground: number;     // 구장 수익 (나머지)
  };
  
  // 결제 모델
  paymentModel: "cpa" | "revshare"; // CPA: 예약당 수수료, RevShare: 수익 분배
  
  // SLA
  sla: {
    availability: number;  // 99.5 = 99.5%
    webhookTimeout: number; // 5 = 5분
    alertTimeout: number;   // 10 = 10분
  };
  
  // 데이터 소유권
  dataOwnership: {
    groundInfo: "platform" | "shared";
    reviews: "platform" | "shared";
    userData: "platform"; // 개인정보는 항상 플랫폼 소유
  };
  
  // 정산 주기
  settlementCycle: "daily" | "weekly" | "monthly";
  
  // 분쟁 처리
  disputePeriod: number; // 14 = 14일
};

/**
 * 파트너 설정
 */
export type PartnerConfig = {
  apiKey: string;
  apiSecret: string;
  webhookUrl?: string;
  allowedIPs?: string[]; // IP 화이트리스트
  tokenExpiry?: number;   // 토큰 만료 시간 (초)
};

/**
 * 파트너 요청 (서명 포함)
 */
export type PartnerRequest = {
  partnerId: string;
  timestamp: string;
  signature: string;
  payload: Record<string, any>;
};

/**
 * 파트너 응답
 */
export type PartnerResponse = {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
};

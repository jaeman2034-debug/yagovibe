/**
 * 🔥 Partner Contract - 제휴 계약 템플릿
 * 
 * 계약 구조 + 수익 분배 + 운영 SLA
 */

import type { PartnerContract, PartnerType, PartnerProvider } from "./partner.types";

/**
 * 기본 계약 템플릿
 */
export const DEFAULT_CONTRACT: Omit<PartnerContract, "revenueShare"> = {
  paymentModel: "revshare",
  sla: {
    availability: 99.5,
    webhookTimeout: 5,
    alertTimeout: 10,
  },
  dataOwnership: {
    groundInfo: "platform",
    reviews: "platform",
    userData: "platform",
  },
  settlementCycle: "weekly",
  disputePeriod: 14,
};

/**
 * 지도사 계약 템플릿
 */
export function createMapPartnerContract(
  provider: "kakao_map" | "naver_map" | "google_map"
): PartnerContract {
  return {
    ...DEFAULT_CONTRACT,
    revenueShare: {
      partner: 0.06,  // 6%
      platform: 0.08, // 8%
      ground: 0.86,   // 86%
    },
    paymentModel: "cpa", // 지도사는 CPA 모델
    dataOwnership: {
      groundInfo: "shared", // 지도 정보는 공유
      reviews: "shared",
      userData: "platform",
    },
  };
}

/**
 * 결제사 계약 템플릿
 */
export function createPaymentPartnerContract(
  provider: "tosspay" | "iamport" | "kcp"
): PartnerContract {
  return {
    ...DEFAULT_CONTRACT,
    revenueShare: {
      partner: 0.028, // 2.8% (PG 수수료)
      platform: 0.07, // 7% (플랫폼 수수료)
      ground: 0.902,  // 90.2% (구장 수익)
    },
    paymentModel: "revshare",
    settlementCycle: "daily", // 결제는 일일 정산
  };
}

/**
 * SNS 파트너 계약 템플릿
 */
export function createSNSPartnerContract(
  provider: "kakao_sns" | "instagram"
): PartnerContract {
  return {
    ...DEFAULT_CONTRACT,
    revenueShare: {
      partner: 0,     // SNS는 수수료 없음 (획득 비용 0)
      platform: 0.10, // 10% (플랫폼 수수료)
      ground: 0.90,   // 90% (구장 수익)
    },
    paymentModel: "cpa", // SNS는 획득 기반
  };
}

/**
 * 수익 분배 계산
 */
export function calculateRevenueShare(
  amount: number,
  contract: PartnerContract
): {
  partner: number;
  platform: number;
  ground: number;
} {
  const partnerFee = amount * contract.revenueShare.partner;
  const platformFee = amount * contract.revenueShare.platform;
  const groundRevenue = amount - partnerFee - platformFee;

  return {
    partner: Math.round(partnerFee),
    platform: Math.round(platformFee),
    ground: Math.round(groundRevenue),
  };
}

/**
 * 수익 시뮬레이션
 */
export function simulateRevenue(amount: number, partnerType: PartnerType): {
  breakdown: {
    partner: number;
    platform: number;
    ground: number;
  };
  description: string;
} {
  let contract: PartnerContract;

  switch (partnerType) {
    case "map":
      contract = createMapPartnerContract("kakao_map");
      break;
    case "payment":
      contract = createPaymentPartnerContract("tosspay");
      break;
    case "sns":
      contract = createSNSPartnerContract("kakao_sns");
      break;
    default:
      contract = DEFAULT_CONTRACT as PartnerContract;
  }

  const breakdown = calculateRevenueShare(amount, contract);

  return {
    breakdown,
    description: `${amount.toLocaleString()}원 예약 시: 파트너 ${breakdown.partner.toLocaleString()}원, 플랫폼 ${breakdown.platform.toLocaleString()}원, 구장 ${breakdown.ground.toLocaleString()}원`,
  };
}

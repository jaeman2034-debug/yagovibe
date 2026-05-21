/**
 * 🔥 Partner Gateway - 파트너 게이트웨이
 * 
 * 서명/검증, 요청 라우팅
 */

import type {
  Partner,
  PartnerRequest,
  PartnerResponse,
} from "./partner.types";
import { validatePartnerRequest } from "./partner.security";

/**
 * 게이트웨이 처리 결과
 */
export type GatewayResult = {
  success: boolean;
  partner?: Partner;
  response?: PartnerResponse;
  error?: string;
};

/**
 * 파트너 게이트웨이
 */
export class PartnerGateway {
  private partners: Map<string, Partner> = new Map();

  /**
   * 파트너 등록
   */
  registerPartner(partner: Partner): void {
    this.partners.set(partner.id, partner);
  }

  /**
   * 파트너 조회
   */
  getPartner(partnerId: string): Partner | null {
    return this.partners.get(partnerId) || null;
  }

  /**
   * 요청 처리
   */
  async processRequest(
    request: PartnerRequest,
    clientIP: string
  ): Promise<GatewayResult> {
    // 1. 파트너 조회
    const partner = this.getPartner(request.partnerId);
    if (!partner) {
      return {
        success: false,
        error: `파트너를 찾을 수 없음: ${request.partnerId}`,
      };
    }

    // 2. 상태 확인
    if (partner.status !== "active") {
      return {
        success: false,
        error: `파트너 비활성: ${partner.status}`,
      };
    }

    // 3. 보안 검증
    const validation = await validatePartnerRequest(
      request,
      partner.config,
      clientIP
    );
    if (!validation.valid) {
      return {
        success: false,
        error: validation.reason || "보안 검증 실패",
      };
    }

    // 4. 타입별 라우팅
    const response = await this.routeByType(partner, request);

    return {
      success: response.success,
      partner,
      response,
    };
  }

  /**
   * 타입별 라우팅
   */
  private async routeByType(
    partner: Partner,
    request: PartnerRequest
  ): Promise<PartnerResponse> {
    switch (partner.type) {
      case "map":
        return this.handleMapRequest(partner, request);
      case "payment":
        return this.handlePaymentRequest(partner, request);
      case "sns":
        return this.handleSNSRequest(partner, request);
      default:
        return {
          success: false,
          error: `지원하지 않는 파트너 타입: ${partner.type}`,
          timestamp: new Date().toISOString(),
        };
    }
  }

  /**
   * 지도사 요청 처리
   */
  private async handleMapRequest(
    partner: Partner,
    request: PartnerRequest
  ): Promise<PartnerResponse> {
    // 실제 구현: 지도사 API 어댑터 호출
    return {
      success: true,
      data: { message: "지도사 요청 처리됨" },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 결제사 요청 처리
   */
  private async handlePaymentRequest(
    partner: Partner,
    request: PartnerRequest
  ): Promise<PartnerResponse> {
    // 실제 구현: 결제사 API 어댑터 호출
    return {
      success: true,
      data: { message: "결제사 요청 처리됨" },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * SNS 요청 처리
   */
  private async handleSNSRequest(
    partner: Partner,
    request: PartnerRequest
  ): Promise<PartnerResponse> {
    // 실제 구현: SNS API 어댑터 호출
    return {
      success: true,
      data: { message: "SNS 요청 처리됨" },
      timestamp: new Date().toISOString(),
    };
  }
}

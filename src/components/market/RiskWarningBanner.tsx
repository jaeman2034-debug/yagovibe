/**
 * 🔥 위험 경고 배너
 * 고위험 판매자/게시글에 대한 안전 가이드 표시
 */

import { AlertTriangle } from "lucide-react";
import type { MarketPost } from "@/types/market";

interface RiskWarningBannerProps {
  post: MarketPost;
  sellerRiskTier?: "low" | "medium" | "high";
  className?: string;
}

export default function RiskWarningBanner({
  post,
  sellerRiskTier,
  className = "",
}: RiskWarningBannerProps) {
  // 고위험 판매자 또는 고위험 게시글인지 확인
  const isHighRisk = 
    sellerRiskTier === "high" || 
    (post.riskScore !== undefined && post.riskScore >= 70);
  
  if (!isHighRisk) return null;
  
  return (
    <div className={`bg-yellow-50 border-l-4 border-yellow-400 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-yellow-900 mb-1">
            안전 거래 주의사항
          </h4>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• 외부 연락 유도(카톡/텔레그램 등) 시 주의하세요</li>
            <li>• 선입금 요구 시 거래를 중단하세요</li>
            <li>• 가능하면 플랫폼 내 채팅으로 거래하세요</li>
            <li>• 이상 징후 발견 시 신고해주세요</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

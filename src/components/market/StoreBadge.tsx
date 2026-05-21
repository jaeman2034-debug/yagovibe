/**
 * 🔥 지점 인증 배지 컴포넌트 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 지점 인증 표시
 * - 지역 신뢰도 강화
 */

import { Shield, MapPin } from "lucide-react";

interface StoreBadgeProps {
  storeId?: string;
  storeName?: string;
  verified?: boolean;
  services?: string[];
}

export default function StoreBadge({
  storeId,
  storeName,
  verified = false,
  services = [],
}: StoreBadgeProps) {
  if (!storeId || !verified) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full">
      <Shield className="w-4 h-4 text-blue-600" />
      <span className="text-sm font-medium text-blue-700">
        {storeName || "인증 지점"}
      </span>
      {services.length > 0 && (
        <span className="text-xs text-blue-500">
          ({services.join(", ")})
        </span>
      )}
    </div>
  );
}

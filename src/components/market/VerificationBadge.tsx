/**
 * 🔥 인증 뱃지 컴포넌트 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 대면/실명 인증 뱃지 표시
 * - 게시물 카드 상단 표시
 */

import { Shield, UserCheck } from "lucide-react";

interface VerificationBadgeProps {
  faceToFaceVerified?: boolean; // 대면 인증
  realNameVerified?: boolean; // 실명 인증
  trustTier?: "guest" | "basic" | "verified" | "host";
}

export default function VerificationBadge({
  faceToFaceVerified = false,
  realNameVerified = false,
  trustTier,
}: VerificationBadgeProps) {
  // 🔥 verified 이상이면 실명 인증으로 간주
  const isVerified = trustTier === "verified" || trustTier === "host";

  if (!faceToFaceVerified && !realNameVerified && !isVerified) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-full">
      {faceToFaceVerified && (
        <>
          <Shield className="w-3 h-3 text-blue-600" />
          <span className="text-xs font-medium text-blue-700">대면 인증</span>
        </>
      )}
      {(realNameVerified || isVerified) && (
        <>
          {faceToFaceVerified && <span className="mx-1 text-blue-400">•</span>}
          <UserCheck className="w-3 h-3 text-blue-600" />
          <span className="text-xs font-medium text-blue-700">실명 인증</span>
        </>
      )}
    </div>
  );
}

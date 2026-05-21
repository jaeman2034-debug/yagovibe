/**
 * 🔥 PlanFeature - 플랜 기능 래퍼 컴포넌트
 * 
 * 역할:
 * - 특정 기능이 플랜 제한이 있을 때 사용
 * - Free 플랜에서는 기능 비활성화 + 업그레이드 CTA
 * - Pro 플랜에서는 정상 기능 제공
 * 
 * 사용:
 * <PlanFeature feature="allowAttendanceStats" trigger="attendance_stats">
 *   <AttendanceStats />
 * </PlanFeature>
 */

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTeamPlan } from "@/hooks/useTeamPlan";
import { hasFeature } from "@/types/plan";
import Paywall from "@/components/Paywall";

interface PlanFeatureProps {
  children: React.ReactNode;
  /** 필요한 기능 (feature 키) */
  feature: keyof import("@/types/plan").PlanLimits;
  /** Paywall 트리거 타입 */
  trigger?: "unpaid_notification" | "payment_link" | "attendance_stats" | "multiple_admins";
  /** teamId (없으면 URL 파라미터에서 추출) */
  teamId?: string;
  /** 비활성화 상태 표시 여부 */
  showDisabled?: boolean;
}

export function PlanFeature({
  children,
  feature,
  trigger = "attendance_stats",
  teamId: propTeamId,
  showDisabled = true,
}: PlanFeatureProps) {
  const params = useParams();
  const teamId = propTeamId || params.teamId || params.id;
  const { plan, loading } = useTeamPlan(teamId);
  const [showPaywall, setShowPaywall] = useState(false);

  if (loading) {
    return <div className="opacity-50">{children}</div>;
  }

  const hasFeatureAccess = hasFeature(plan, feature);

  // 기능 접근 가능 → 정상 렌더링
  if (hasFeatureAccess) {
    return <>{children}</>;
  }

  // 기능 접근 불가 → 비활성화 + CTA
  return (
    <>
      <div className="relative">
        {/* 비활성화 오버레이 */}
        {showDisabled && (
          <div className="absolute inset-0 bg-gray-100/80 dark:bg-gray-800/80 rounded-lg flex items-center justify-center z-10">
            <button
              onClick={() => setShowPaywall(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              🔓 Pro로 업그레이드
            </button>
          </div>
        )}
        {/* 원본 콘텐츠 (비활성화) */}
        <div className="opacity-40 pointer-events-none">{children}</div>
      </div>

      <Paywall
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger={trigger}
        plan={plan === "academy_pro" ? "ACADEMY_PRO" : "TEAM_PRO"}
      />
    </>
  );
}

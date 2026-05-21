/**
 * 🔥 PlanGuard - 플랜 제한 가드 컴포넌트
 * 
 * 역할:
 * - 특정 기능/페이지에서 플랜 제한 체크
 * - Pro 플랜 필요 시 Paywall 표시
 * - Free 플랜에서는 제한된 기능 접근 차단
 * 
 * 사용:
 * <PlanGuard requiredPlan="pro" feature="allowAttendanceStats">
 *   <AttendanceStats />
 * </PlanGuard>
 */

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTeamPlan } from "@/hooks/useTeamPlan";
import { hasFeature, type PlanType } from "@/types/plan";
import Paywall from "@/components/Paywall";
import { AppSkeleton } from "@/components/onboarding/AppSkeleton";

interface PlanGuardProps {
  children: React.ReactNode;
  /** 필요한 플랜 레벨 */
  requiredPlan?: PlanType;
  /** 필요한 기능 (feature 키) */
  feature?: string;
  /** Paywall 트리거 타입 */
  trigger?: "unpaid_notification" | "payment_link" | "attendance_stats" | "multiple_admins";
  /** teamId (없으면 URL 파라미터에서 추출) */
  teamId?: string;
}

export function PlanGuard({
  children,
  requiredPlan = "pro",
  feature,
  trigger,
  teamId: propTeamId,
}: PlanGuardProps) {
  const params = useParams();
  const teamId = propTeamId || params.teamId || params.id;
  const { plan, loading } = useTeamPlan(teamId);
  const [showPaywall, setShowPaywall] = useState(false);

  // 플랜 체크
  const hasRequiredPlan = requiredPlan === "free" || 
    (requiredPlan === "pro" && (plan === "pro" || plan === "academy_pro")) ||
    (requiredPlan === "academy_pro" && plan === "academy_pro");

  const hasRequiredFeature = feature ? hasFeature(plan, feature as any) : true;

  const canAccess = hasRequiredPlan && hasRequiredFeature;

  useEffect(() => {
    // 로딩 완료 후 플랜 제한 체크
    if (!loading && !canAccess) {
      setShowPaywall(true);
    }
  }, [loading, canAccess]);

  // 로딩 중
  if (loading) {
    return <AppSkeleton />;
  }

  // 플랜 부족 → Paywall 표시
  if (!canAccess) {
    return (
      <>
        {/* children은 렌더링하지 않음 (차단) */}
        <Paywall
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          trigger={trigger || "attendance_stats"}
          plan={requiredPlan === "academy_pro" ? "ACADEMY_PRO" : "TEAM_PRO"}
        />
      </>
    );
  }

  // 플랜 충족 → children 렌더링
  return <>{children}</>;
}

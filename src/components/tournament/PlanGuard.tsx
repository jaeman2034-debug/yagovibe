/**
 * 🔐 요금제 기능 가드 컴포넌트 (v2)
 * 
 * 플랜 제한이 있는 기능을 감싸는 래퍼 컴포넌트
 */

import { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { useAssociationPlan } from "@/hooks/useAssociationPlan";
import { canUseFeature, getFeatureUpgradeMessage, type PlanType } from "@/utils/planGuard";

interface PlanGuardProps {
  associationId: string | undefined;
  featureName: keyof typeof import("@/utils/planGuard").FEATURE_PLANS;
  children: ReactNode;
  fallback?: ReactNode; // 기능 사용 불가 시 표시할 내용 (선택)
}

/**
 * 요금제 기능 가드 컴포넌트
 * 
 * 현재 플랜이 기능 사용에 충분하면 children 렌더링
 * 부족하면 fallback 또는 업그레이드 안내 표시
 */
export function PlanGuard({
  associationId,
  featureName,
  children,
  fallback,
}: PlanGuardProps) {
  const { plan, loading } = useAssociationPlan(associationId, { realtime: true });

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500">
        플랜 정보를 확인하는 중...
      </div>
    );
  }

  if (!canUseFeature(plan, featureName)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Alert>
        <CreditCard className="h-4 w-4" />
        <AlertTitle>플랜 업그레이드 필요</AlertTitle>
        <AlertDescription>
          <p className="mb-3">{getFeatureUpgradeMessage(featureName)}</p>
          <Button variant="outline" size="sm">
            플랜 업그레이드
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}

/**
 * 요금제 기능 가드 (Hook 버전)
 * 
 * 컴포넌트가 아닌 조건부 렌더링이 필요한 경우 사용
 */
export function usePlanGuard(
  associationId: string | undefined,
  featureName: keyof typeof import("@/utils/planGuard").FEATURE_PLANS
): {
  canUse: boolean;
  plan: PlanType;
  loading: boolean;
  upgradeMessage: string;
} {
  const { plan, loading } = useAssociationPlan(associationId, { realtime: true });
  const canUse = canUseFeature(plan, featureName);
  const upgradeMessage = getFeatureUpgradeMessage(featureName);

  return {
    canUse,
    plan,
    loading,
    upgradeMessage,
  };
}

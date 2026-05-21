/**
 * 🔥 권한 가드 컴포넌트
 * 
 * 역할:
 * - UI 레벨 권한 제어
 * - 버튼/기능 자동 비활성화
 */

import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";

interface PermissionGuardProps {
  children: ReactNode;
  require?: "pay" | "create" | "join" | "host";
  fallback?: ReactNode;
  showMessage?: boolean;
}

export function PermissionGuard({
  children,
  require,
  fallback,
  showMessage = false,
}: PermissionGuardProps) {
  const { canPay, canCreate, canJoin, canHost, loading, trustTier } = usePermissions();

  if (loading) {
    return <>{fallback || null}</>;
  }

  let hasPermission = false;
  let message = "";

  switch (require) {
    case "pay":
      hasPermission = canPay;
      message = "결제 기능을 사용하려면 신뢰도 등급이 필요합니다.";
      break;
    case "create":
      hasPermission = canCreate;
      message = "생성 기능을 사용하려면 신뢰도 등급이 필요합니다.";
      break;
    case "join":
      hasPermission = canJoin;
      message = "참여 기능을 사용하려면 로그인이 필요합니다.";
      break;
    case "host":
      hasPermission = canHost;
      message = "호스트 기능을 사용하려면 추가 검증이 필요합니다.";
      break;
    default:
      hasPermission = true;
  }

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showMessage) {
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          {message}
          {trustTier && (
            <div className="mt-2 text-xs text-yellow-600">
              현재 등급: {trustTier}
            </div>
          )}
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}

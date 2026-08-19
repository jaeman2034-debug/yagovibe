import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  inferLoginRequiredReason,
  openLoginRequiredModal,
  resolveGuestAuthFallbackPath,
} from "@/lib/auth/loginRequiredGate";

/** ProtectedRoute — 비회원 직접 진입 시 로그인 페이지 대신 모달 + 공개 페이지 복귀 */
export function GuestProtectedRedirect({ returnTo }: { returnTo: string }) {
  const navigate = useNavigate();
  const openedRef = useRef(false);

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    openLoginRequiredModal({
      returnTo,
      reason: inferLoginRequiredReason(returnTo),
    });
    navigate(resolveGuestAuthFallbackPath(returnTo), { replace: true });
  }, [navigate, returnTo]);

  return null;
}

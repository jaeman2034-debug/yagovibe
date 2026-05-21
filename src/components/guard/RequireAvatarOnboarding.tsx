import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { auth } from "@/lib/firebase";
import { usePostAuthBootstrapGate } from "@/hooks/usePostAuthBootstrapGate";
import { AuthBootSplash } from "@/components/auth/AuthBootSplash";
import { useAvatarGateReady } from "@/hooks/useAvatarGateReady";

interface RequireAvatarOnboardingProps {
  children: React.ReactNode;
}

/**
 * `avatars/{uid}` 없으면 `/onboarding/avatar?next=...` 로 보냄.
 * 익명 세션·온보딩 페이지 자체는 스킵 (초대/가입 퍼널과 충돌 방지).
 */
export function RequireAvatarOnboarding({ children }: RequireAvatarOnboardingProps) {
  const location = useLocation();
  const { user, loading } = useAuth();
  const waiting = usePostAuthBootstrapGate(loading);
  const session = user ?? auth.currentUser;
  const onAvatarPage = location.pathname.startsWith("/onboarding/avatar");
  const isAnon = Boolean(session?.isAnonymous);
  const skip = onAvatarPage || isAnon;
  const uid = session?.isAnonymous ? undefined : session?.uid;
  const { hasAvatarDoc, checking } = useAvatarGateReady(uid, skip);

  if (onAvatarPage) {
    return <>{children}</>;
  }

  if (waiting || (!skip && checking)) {
    return <AuthBootSplash />;
  }

  if (isAnon) {
    return <>{children}</>;
  }

  if (!hasAvatarDoc) {
    const next = `${location.pathname}${location.search}`;
    const q = next && next !== "/onboarding/avatar" ? `?next=${encodeURIComponent(next)}` : "";
    return <Navigate to={`/onboarding/avatar${q}`} replace />;
  }

  return <>{children}</>;
}

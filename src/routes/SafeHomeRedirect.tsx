import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { auth } from "@/lib/firebase";
import { usePostAuthBootstrapGate } from "@/hooks/usePostAuthBootstrapGate";
import { AuthBootSplash } from "@/components/auth/AuthBootSplash";
import {
  getPendingInviteReturnPath,
  isPendingInviteReturn,
} from "@/lib/auth/pendingInviteReturn";

/**
 * 루트 "/" 전용: 반드시 Auth 초기화(loading) 후에만 분기.
 * OAuth redirect로 `/`에 착지해도 loading 전에 /login·/home 으로 튕기지 않도록 함.
 */
export default function SafeHomeRedirect() {
  const { loading, user } = useAuth();
  const location = useLocation();
  const waiting = usePostAuthBootstrapGate(loading);

  if (import.meta.env.DEV) {
    console.log("[Auth] SafeHomeRedirect", {
      loading,
      waiting,
      user: !!user,
      currentUser: !!auth.currentUser,
      anonymousUser: user?.isAnonymous,
      anonymousCurrent: auth.currentUser?.isAnonymous,
      path: typeof window !== "undefined" ? window.location.pathname : "",
    });
  }

  if (waiting) {
    return <AuthBootSplash />;
  }

  console.log("[SafeHomeRedirect]", {
    loading,
    user: !!user,
    userUid: user?.uid ?? null,
    currentUser: !!auth.currentUser,
    currentUid: auth.currentUser?.uid ?? null,
    pathname: location.pathname,
  });

  const sessionUser = user ?? auth.currentUser;
  if (import.meta.env.DEV) {
    console.log("[Auth] SafeHomeRedirect sessionUser (분기 직전)", {
      sessionUser: !!sessionUser,
      sessionAnonymous: sessionUser?.isAnonymous,
      toHub: !!(sessionUser && !sessionUser.isAnonymous),
      toLogin: !(sessionUser && !sessionUser.isAnonymous),
    });
  }
  if (sessionUser && !sessionUser.isAnonymous) {
    // 로그인된 사용자는 / → Hub(또는 onboarding).
    // pending invite 복귀는 /login?next= 또는 InvitePage 진입 시에만 — used 초대 루프 방지.
    let hasChosenSport = false;
    try {
      hasChosenSport = !!localStorage.getItem("lastSport");
    } catch {
      hasChosenSport = false;
    }
    return <Navigate to={hasChosenSport ? "/hub" : "/onboarding"} replace />;
  }

  const pendingInvite = getPendingInviteReturnPath();
  if (isPendingInviteReturn(pendingInvite) && pendingInvite) {
    return (
      <Navigate to={`/login?next=${encodeURIComponent(pendingInvite)}`} replace />
    );
  }

  return <Navigate to="/login" replace />;
}

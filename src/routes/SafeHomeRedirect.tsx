import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { auth } from "@/lib/firebase";
import { usePostAuthBootstrapGate } from "@/hooks/usePostAuthBootstrapGate";
import { AuthBootSplash } from "@/components/auth/AuthBootSplash";

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
    let hasChosenSport = false;
    try {
      hasChosenSport = !!localStorage.getItem("lastSport");
    } catch {
      hasChosenSport = false;
    }
    return <Navigate to={hasChosenSport ? "/hub" : "/onboarding"} replace />;
  }

  return <Navigate to="/login" replace />;
}

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import { auth } from "@/lib/firebase";
import { usePostAuthBootstrapGate } from "@/hooks/usePostAuthBootstrapGate";
import { AuthBootSplash } from "@/components/auth/AuthBootSplash";
import { sanitizePostLoginRedirectTarget } from "@/lib/auth/sanitizePostLoginRedirect";

interface PublicRouteProps {
  children: JSX.Element;
}

/**
 * 로그인 전용 레이아웃 래퍼: loading 후에만 판단.
 * SafeHomeRedirect와 동일하게 user ?? auth.currentUser (redirect 복귀 직후 한 틱 방어).
 */
export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const waiting = usePostAuthBootstrapGate(loading);

  if (import.meta.env.DEV) {
    console.log("[Auth] PublicRoute", {
      loading,
      waiting,
      user: !!user,
      currentUser: !!auth.currentUser,
      anonymous: (user ?? auth.currentUser)?.isAnonymous,
      path: location.pathname,
    });
  }

  if (waiting) {
    return <AuthBootSplash />;
  }

  if (location.pathname.startsWith("/onboarding")) {
    return children;
  }

  const sessionUser = user ?? auth.currentUser;

  if (sessionUser && !sessionUser.isAnonymous) {
    const params = new URLSearchParams(location.search);
    const rawNext = params.get("next") ?? params.get("redirect");
    const safeNext = sanitizePostLoginRedirectTarget(rawNext);
    if (safeNext && safeNext.startsWith("/") && !safeNext.startsWith("//") && safeNext.length < 2048) {
      return <Navigate to={safeNext} replace />;
    }
    return <Navigate to="/hub" replace />;
  }

  return children;
};

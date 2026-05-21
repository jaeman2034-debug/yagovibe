// src/components/ProtectedRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import { auth } from "@/lib/firebase";
import { usePostAuthBootstrapGate } from "@/hooks/usePostAuthBootstrapGate";
import { AuthBootSplash } from "@/components/auth/AuthBootSplash";

interface ProtectedRouteProps {
  children: JSX.Element;
}

/**
 * 보호된 라우트 컴포넌트
 * 로그인한 사용자만 접근 가능
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const waiting = usePostAuthBootstrapGate(loading);
  /** Auth 초기화 끝나기 전에는 절대 !user로 /login 보내지 않음 */
  if (waiting) {
    return <AuthBootSplash />;
  }

  console.log("[ProtectedRoute]", {
    loading,
    waiting,
    user: !!user,
    userUid: user?.uid ?? null,
    currentUser: !!auth.currentUser,
    currentUid: auth.currentUser?.uid ?? null,
    pathname: location.pathname,
  });

  const sessionUser = user ?? auth.currentUser;
  if (!sessionUser) {
    const from = `${location.pathname}${location.search}`;
    const next =
      from && from !== "/login" ? `?next=${encodeURIComponent(from)}` : "";
    return <Navigate to={`/login${next}`} replace />;
  }

  return children;
};


/**
 * 🔥 Admin 보호 라우트
 * 
 * 역할:
 * - 관리자만 접근 가능한 라우트 보호
 * - Firestore users/{uid}.role 기준 권한 제어
 * - 비관리자는 홈으로 리다이렉트
 * 
 * 사용 예시:
 * ```tsx
 * <Route
 *   path="/admin"
 *   element={
 *     <AdminRoute>
 *       <AdminPage />
 *     </AdminRoute>
 *   }
 * />
 * ```
 */

import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useAuthUser } from "@/hooks/useAuthUser";
import { isAdmin } from "@/utils/hasRole";

interface AdminRouteProps {
  children: JSX.Element;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user } = useAuth();
  const { authUser, profile, loading } = useAuthUser();
  
  // 🔥 관리자 권한 체크 (대문자로 통일)
  const isAdminUser = isAdmin(profile);
  
  // 🔥 개발 환경 판정: Vite DEV 모드 또는 localhost 체크
  // HTTPS 모드에서도 localhost면 개발 환경으로 인정
  const isDev = import.meta.env.DEV;
  const isLocalhost = typeof window !== "undefined" && 
    window.location.hostname.includes("localhost");
  const isLocal = isDev || isLocalhost;
  
  // 🔥 임시: 통합 테스트용 강제 우회 (개발 환경에서만)
  // TODO: 통합 완료 후 제거 또는 환경 변수로 제어
  const FORCE_BYPASS = isLocal; // localhost면 강제 통과

  // 🔥 로딩 중
  if (loading) {
    console.log("🔄 [AdminRoute] 로딩 중...");
    return null; // 또는 <Loading />
  }

  // ❌ 로그인하지 않은 사용자 → 로그인 페이지
  if (!authUser) {
    console.log("❌ [AdminRoute] 로그인하지 않은 사용자 → /login으로 리다이렉트");
    return <Navigate to="/login" replace />;
  }

  // 🔥 디버그: 현재 상태 로깅
  console.log("🔍 [AdminRoute] 권한 체크:", {
    userId: authUser.uid,
    expectedUid: "iUZB8RjKlEhb3uotZ6yqtpWtUQE2",
    uidMatch: authUser.uid === "iUZB8RjKlEhb3uotZ6yqtpWtUQE2",
    role: profile?.role,
    hasRole: !!profile?.role,
    isAdmin: isAdmin(profile),
    profileExists: !!profile,
    profileKeys: profile ? Object.keys(profile) : [],
    isDev: isDev,
    isLocalhost: isLocalhost,
    isLocal: isLocal,
    hostname: typeof window !== "undefined" ? window.location.hostname : "N/A",
    envDEV: import.meta.env.DEV,
    mode: import.meta.env.MODE
  });

  // ⛔ 관리자가 아닌 사용자 → 홈으로 리다이렉트
  // 🔥 임시: 통합 테스트용 권한 체크 무력화 (개발 환경에서만)
  // TODO: 통합 완료 후 원래 로직으로 복구
  if (!FORCE_BYPASS && !isAdminUser) {
    // 🔥 localhost면 무조건 통과 (통합 테스트용)
    if (FORCE_BYPASS) {
      console.warn("⚠️ [AdminRoute] 개발 환경(localhost): 관리자가 아닌 사용자지만 접근 허용 (테스트용)", {
        userId: authUser.uid,
        role: profile?.role,
        isAdmin: isAdmin(profile),
        isDev: isDev,
        isLocalhost: isLocalhost,
        isLocal: isLocal,
        FORCE_BYPASS: FORCE_BYPASS
      });
      // 개발 환경에서는 접근 허용
      return children;
    } else {
      console.log("⛔ [AdminRoute] 관리자가 아닌 사용자 → /sports-hub로 리다이렉트", {
        userId: authUser.uid,
        role: profile?.role,
        isAdmin: isAdmin(profile),
        isDev: isDev,
        isLocalhost: isLocalhost,
        isLocal: isLocal,
        FORCE_BYPASS: FORCE_BYPASS
      });
      return <Navigate to="/hub" replace />;
    }
  }

  // ✅ 관리자만 접근 허용
  console.log("✅ [AdminRoute] 관리자 접근 허용", {
    userId: authUser.uid,
    role: profile?.role,
    userRole: user?.role,
    isAdminUser: isAdminUser,
    profileAdmin: isAdmin(profile),
  });
  return children;
}

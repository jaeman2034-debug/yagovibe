import { Navigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/useAuthUser";

interface OnboardingRouteProps {
  children: JSX.Element;
}

export function OnboardingRoute({ children }: OnboardingRouteProps) {
  const { authUser, profile, loading } = useAuthUser();

  // 🔥 Firebase 상태 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // ❌ 로그인 안된 경우
  if (!authUser) {
    return <Navigate to="/login" replace />;
  }

  // 🔥 프로필 없으면 신규 유저 → 온보딩 허용
  if (!profile) {
    return children;
  }

  // 🔥 온보딩 완료된 유저만 홈으로 이동
  if (profile.onboardingCompleted === true) {
    return <Navigate to="/hub" replace />;
  }

  // 🔥 온보딩 미완료 유저 허용
  return children;
}

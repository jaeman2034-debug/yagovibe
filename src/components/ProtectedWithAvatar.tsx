import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RequireAvatarOnboarding } from "@/components/guard/RequireAvatarOnboarding";

interface ProtectedWithAvatarProps {
  children: JSX.Element;
}

/** 로그인 + 아바타 온보딩(또는 기존 문서) 완료 후에만 하위 라우트 표시 */
export function ProtectedWithAvatar({ children }: ProtectedWithAvatarProps) {
  return (
    <ProtectedRoute>
      <RequireAvatarOnboarding>{children}</RequireAvatarOnboarding>
    </ProtectedRoute>
  );
}

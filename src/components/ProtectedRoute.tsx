// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import { auth } from "@/lib/firebase";

interface ProtectedRouteProps {
  children: JSX.Element;
}

/**
 * 보호된 라우트 컴포넌트
 * 로그인한 사용자만 접근 가능
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  /** Context 갱신이 한 틱 늦을 때 잘못 /login 으로 튕기는 것 방지 */
  const sessionUser = user ?? auth.currentUser;

  if (loading && !sessionUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!sessionUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};


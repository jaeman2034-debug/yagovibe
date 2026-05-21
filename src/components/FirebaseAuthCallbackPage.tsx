import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { usePostAuthBootstrapGate } from "@/hooks/usePostAuthBootstrapGate";

/**
 * Hosting이 `/__/auth/**`를 index.html로 넘길 때의 전용 화면.
 * 예전처럼 AuthProvider를 이중으로 두지 않고, 메인 트리와 동일한 AuthProvider에서
 * persistence·authStateReady가 끝난 뒤에만 `/` 또는 `/login`으로 보냄(이메일 링크·레거시 URL 호환).
 */
export default function FirebaseAuthCallbackPage() {
  const { loading } = useAuth();
  const gate = usePostAuthBootstrapGate(loading);
  const [to, setTo] = useState<"/" | "/login" | null>(null);

  useEffect(() => {
    if (gate) return;
    void auth.authStateReady().then(() => {
      const u = auth.currentUser;
      setTo(u && !u.isAnonymous ? "/" : "/login");
    });
  }, [gate]);

  if (to) {
    return <Navigate to={to} replace />;
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-white px-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      <p className="text-center text-sm text-gray-700">로그인 연결 중입니다…</p>
      <p className="text-center text-xs text-gray-500">잠시만 기다려 주세요.</p>
    </div>
  );
}

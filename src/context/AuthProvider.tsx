import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { setSentryUser } from "../lib/sentry";

const AuthContext = createContext<{ user: User | null }>({ user: null });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);

        // Sentry에 사용자 정보 설정 (에러 추적 시 사용자 컨텍스트 포함)
        setSentryUser({
          uid: u.uid,
          email: u.email || undefined,
          displayName: u.displayName || undefined,
        });

        // 포그라운드 메시지 수신 핸들러 제거됨
      } else {
        // 로그아웃 시 Sentry 사용자 정보 초기화
        setSentryUser(null);

        // AuthProvider에서는 자동 익명 로그인 시도하지 않음
        // firebase.ts에서 이미 처리하고 있으므로 중복 방지
        // 사용자가 명시적으로 로그인할 때만 처리
      }
    });
    return () => unsub();
  }, []);

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}

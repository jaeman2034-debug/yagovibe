import { createContext, useContext, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, authPersistenceReady } from "../lib/firebase";
import { attachDevAuthDebug } from "../lib/auth/authDevDebug";
import { setSentryUser } from "../lib/sentry";
import { useNavigate, useLocation } from "react-router-dom";
import { registerPushNotifications } from "../lib/pushNotifications";
import { removeDeviceToken } from "../lib/saveDeviceToken";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({ 
  user: null, 
  loading: true,
  logout: async () => {} 
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  /** 경로 변경마다 onAuthStateChanged 구독을 끊지 않도록 ref로 최신 경로만 참조 */
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;
  /** DEV: 새로고침 후 세션 복구 여부 확인용(토큰 갱신 스팸 방지) */
  const lastLoggedUidRef = useRef<string | null | undefined>(undefined);

  // 🔥 로그아웃 함수
  const logout = async () => {
    try {
      await signOut(auth);
      console.log("✅ 로그아웃 성공");
    } catch (err) {
      console.error("❌ 로그아웃 오류:", err);
      throw err;
    }
  };

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        await authPersistenceReady;
      } catch {
        /* firebase.ts에서 로깅 */
      }
      if (cancelled) return;

      attachDevAuthDebug(auth);

      unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);

      if (import.meta.env.DEV) {
        const uidNow = u?.uid ?? null;
        if (lastLoggedUidRef.current !== uidNow) {
          lastLoggedUidRef.current = uidNow;
          console.log("[AuthProvider] auth UID 변경 (새로고침·로그인·로그아웃)", {
            uid: uidNow,
          });
        }
      }

      if (u) {
        // Sentry에 사용자 정보 설정 (에러 추적 시 사용자 컨텍스트 포함)
        setSentryUser({
          uid: u.uid,
          email: u.email || undefined,
          displayName: u.displayName || undefined,
        });

        // 🔥 로그인 감지 → FCM 푸시 알림 등록
        console.log("🔥 [AuthProvider] 로그인 감지 → FCM 등록 실행");
        registerPushNotifications().catch((error) => {
          console.error("❌ [AuthProvider] FCM 등록 실패:", error);
        });

        // 🔥 자동 리다이렉트 규칙: 이미 로그인했고, 로그인/회원가입 페이지에 있으면 → 스포츠 허브로 보내기
        const path = pathnameRef.current;
        const isAuthPage =
          path === "/signup" ||
          path === "/register" ||
          path === "/start" ||
          path.startsWith("/login");
        
        if (isAuthPage) {
          console.log("✅ [AuthProvider] 로그인 상태 감지 - /hub로 리다이렉트");
          navigate("/hub", { replace: true });
        }
      } else {
        // 로그아웃 시 Sentry 사용자 정보 초기화
        setSentryUser(null);

        // 🔥 로그아웃 시 기기 토큰 삭제
        removeDeviceToken().catch((error) => {
          console.error("❌ [AuthProvider] 기기 토큰 삭제 실패:", error);
        });

        // 🔥 자동 리다이렉트 규칙: 로그아웃 상태인데, 보호된 페이지에 있으면 → 로그인으로 보내기
        const path = pathnameRef.current;
        const protectedPaths = ["/hub", "/sports-hub", "/home", "/app", "/admin"];
        const isProtected = protectedPaths.some((p) => path.startsWith(p));

        // /start 페이지는 예외 (게스트 모드 허용)
        if (isProtected && path !== "/start") {
          console.log("⚠️ [AuthProvider] 로그인 필요 - /login으로 리다이렉트");
          navigate("/login", { replace: true });
        }
      }
    });
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

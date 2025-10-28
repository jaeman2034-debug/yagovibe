import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, ensureFcmToken, attachOnMessage } from "../lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";

const AuthContext = createContext<{ user: User | null }>({ user: null });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);

        // 🔔 FCM 토큰 확보
        try {
          const token = await ensureFcmToken(u.uid);
          if (token) {
            console.log("✅ FCM 토큰 확보 완료");

            // 관리자 토픽 구독 시도 (관리자인 경우)
            // TODO: 실제 관리자 체크 로직으로 교체
            const adminEmails = ["admin@yagovibe.com"]; // 환경 변수로 관리 권장
            if (u.email && adminEmails.includes(u.email)) {
              try {
                const subscribeAdminTopic = httpsCallable(getFunctions(), "subscribeAdminTopic");
                await subscribeAdminTopic({ token });
                console.log("✅ 관리자 토픽 구독 완료");
              } catch (topicError) {
                console.warn("⚠️ 관리자 토픽 구독 실패:", topicError);
              }
            }
          }
        } catch (fcmError) {
          console.error("❌ FCM 토큰 확보 중 오류:", fcmError);
        }

        // 포그라운드 메시지 수신 핸들러
        attachOnMessage((payload) => {
          console.log("🔔 포그라운드 알림:", payload);
          // 필요시 사용자에게 알림 표시 (예: 토스트 메시지)
          if (payload.notification) {
            // 브라우저 알림 표시 (권한이 있을 경우)
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(payload.notification.title || "YAGO VIBE", {
                body: payload.notification.body,
                icon: payload.notification.icon || "/ai_logo.svg",
                data: payload.data,
              });
            }
          }
        });
      }
      // ⚠️ 자동 익명 로그인 제거: StartScreen에서 명시적으로 게스트 로그인 처리
      // else {
      //   signInAnonymously(auth);
      // }
    });
    return () => unsub();
  }, []);

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}

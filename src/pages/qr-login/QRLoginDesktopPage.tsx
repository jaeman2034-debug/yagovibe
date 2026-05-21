/**
 * 🔐 QR 기반 전화번호 로그인 페이지 (PC)
 * 
 * 역할:
 * - QR 세션 생성
 * - QR 코드 표시
 * - 실시간 로그인 완료 감지
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { 
  createQRLoginSession, 
  subscribeToQRSession, 
  generateQRLoginURL,
  expireQRSession,
  consumeQRSession
} from "@/lib/qrPhoneLogin";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ensureDurableAuthPersistence } from "@/utils/authHelpers";
import Logo from "@/components/common/Logo";
import { useAuth } from "@/context/AuthProvider";
import { trackQRLogin } from "@/lib/eventLog";

export default function QRLoginDesktopPage() {
  // 🔥 디버그: 컴포넌트 마운트 확인
  useEffect(() => {
    console.log("🔐 [QRLoginDesktop] 컴포넌트 마운트됨", {
      pathname: window.location.pathname,
      search: window.location.search,
      timestamp: new Date().toISOString(),
    });
    console.log("🔐 [QRLoginDesktop] 이 페이지는 /login/qr-phone 경로에서만 렌더링되어야 합니다");
    console.log("🔐 [QRLoginDesktop] 만약 이 로그가 안 보이면, 다른 컴포넌트가 렌더링되고 있는 것입니다");
    
    // 🔥 경로 검증
    if (window.location.pathname !== '/login/qr-phone') {
      console.error("❌ [QRLoginDesktop] 잘못된 경로에서 렌더링됨!", {
        expected: '/login/qr-phone',
        actual: window.location.pathname,
      });
    } else {
      console.log("✅ [QRLoginDesktop] 올바른 경로에서 렌더링됨!");
    }
  }, []);

  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "verified" | "expired">("loading");
  const [timeRemaining, setTimeRemaining] = useState<number>(300); // 5분
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 🔥 이미 로그인된 경우 리다이렉트 (주석 처리 - 테스트용)
  // useEffect(() => {
  //   if (user && !user.isAnonymous) {
  //     console.log("✅ [QRLoginDesktop] 이미 로그인됨, 홈으로 이동");
  //     navigate("/", { replace: true });
  //   }
  // }, [user, navigate]);

  // 🔥 QR 세션 생성 및 구독
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        console.log("🔐 [QRLoginDesktop] QR 세션 생성 시작...");
        const newSessionId = await createQRLoginSession(5); // 5분 만료
        
        if (!mounted) return;

        setSessionId(newSessionId);
        const url = generateQRLoginURL(newSessionId);
        setQrUrl(url);
        setStatus("ready");
        setTimeRemaining(300);

        console.log("✅ [QRLoginDesktop] QR 세션 생성 완료:", newSessionId);
        console.log("🔐 [QRLoginDesktop] QR URL:", url);
        console.log("🔐 [QRLoginDesktop] QR URL 검증:", {
          url,
          expectedPattern: 'https://www.yagovibe.com/qr-login?sessionId=',
          isValid: url === `https://www.yagovibe.com/qr-login?sessionId=${newSessionId}`,
          sessionId: newSessionId,
        });
        console.log("🔐 [QRLoginDesktop] ⚠️ 만약 이 로그가 안 보이면, 이 컴포넌트가 렌더링되지 않은 것입니다");
        
        // 📊 이벤트 로깅: QR 세션 생성
        trackQRLogin.sessionCreated(newSessionId, {
          platform: "desktop",
        }).catch(console.warn);
        
        // 📊 이벤트 로깅: QR 코드 표시
        trackQRLogin.qrDisplayed(newSessionId, {
          platform: "desktop",
        }).catch(console.warn);

        // 실시간 구독 시작
        const unsubscribe = subscribeToQRSession(
          newSessionId,
          async (userId, customToken) => {
            if (!mounted) return; // 컴포넌트 언마운트 체크
            
            console.log("✅ [QRLoginDesktop] Custom Token 준비 완료, 사용자 ID:", userId);
            
            try {
              setStatus("verified");
              
              // 🔥 Custom Token으로 즉시 자동 로그인
              console.log("🔐 [QRLoginDesktop] signInWithCustomToken 시작...");
              
              // 📊 이벤트 로깅: 토큰 수신
              trackQRLogin.tokenReceived(newSessionId, {
                platform: "desktop",
              }).catch(console.warn);
              
              await ensureDurableAuthPersistence(auth);
              await signInWithCustomToken(auth, customToken);
              console.log("✅ [QRLoginDesktop] 자동 로그인 완료!");
              
              if (!mounted) return; // 로그인 중 언마운트 체크
              
              // ✅ 1회용 소비 처리 (중복 사용 방지)
              await consumeQRSession(newSessionId);
              
              // 📊 이벤트 로깅: 로그인 성공
              trackQRLogin.loginSuccess(newSessionId, userId, {
                platform: "desktop",
              }).catch(console.warn);
              
              // 📊 이벤트 로깅: 세션 소비
              trackQRLogin.sessionConsumed(newSessionId, userId, {
                platform: "desktop",
              }).catch(console.warn);
              
              // 구독 해제
              unsubscribe();
              if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
              }
              
              // 타이머 정리
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              
              // 로그인 완료 후 홈으로 이동
              setTimeout(() => {
                if (mounted) {
                  navigate("/", { replace: true });
                }
              }, 500);
            } catch (error: any) {
              if (!mounted) return;
              console.error("❌ [QRLoginDesktop] 자동 로그인 실패:", error);
              
              // 📊 이벤트 로깅: 로그인 실패
              trackQRLogin.loginFailed(newSessionId, error.code || "unknown", {
                platform: "desktop",
                errorMessage: error.message,
              }).catch(console.warn);
              
              setError(error.message || "자동 로그인에 실패했습니다. 페이지를 새로고침해주세요.");
              // 실패 시 페이지 새로고침으로 폴백
              setTimeout(() => {
                if (mounted) {
                  window.location.reload();
                }
              }, 2000);
            }
          },
          () => {
            if (!mounted) return;
            console.log("⏰ [QRLoginDesktop] 세션 만료");
            setStatus("expired");
            
            // 📊 이벤트 로깅: 세션 만료
            if (newSessionId) {
              trackQRLogin.sessionExpired(newSessionId, "timer_expired", {
                platform: "desktop",
              }).catch(console.warn);
            }
          }
        );

        unsubscribeRef.current = unsubscribe;

        // 만료 타이머 시작
        timerRef.current = setInterval(() => {
          if (!mounted) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return;
          }
          
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              if (mounted && newSessionId) {
                expireQRSession(newSessionId);
                setStatus("expired");
                
                // 📊 이벤트 로깅: 타이머 만료
                trackQRLogin.sessionExpired(newSessionId, "timer_reached_zero", {
                  platform: "desktop",
                }).catch(console.warn);
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch (error) {
        console.error("❌ [QRLoginDesktop] 세션 생성 실패:", error);
        if (mounted) {
          setStatus("expired");
        }
      }
    }

    initSession();

    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // 🔥 탭 비활성화/활성화 처리 (세션 만료 방지)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("🔐 [QRLoginDesktop] 탭 비활성화 감지");
        // 탭이 비활성화되어도 세션은 유지 (사용자가 다른 탭에서 작업 중일 수 있음)
      } else {
        console.log("🔐 [QRLoginDesktop] 탭 활성화 감지");
        // 탭이 다시 활성화되면 세션 상태 확인
        if (sessionId && status === "ready") {
          // 세션이 만료되었는지 확인
          const checkExpiration = async () => {
            try {
              const { doc, getDoc } = await import("firebase/firestore");
              const { db } = await import("@/lib/firebase");
              const sessionDoc = await getDoc(doc(db, "qrSessions", sessionId));
              if (sessionDoc.exists()) {
                const data = sessionDoc.data();
                if (data.status === "expired" || data.status === "consumed") {
                  setStatus(data.status);
                }
              }
            } catch (error) {
              console.warn("⚠️ [QRLoginDesktop] 세션 상태 확인 실패:", error);
            }
          };
          checkExpiration();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sessionId, status]);

  // 🔥 QR 재생성
  const handleRegenerate = () => {
    const oldSessionId = sessionId;
    
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // 기존 세션 만료 처리
    if (oldSessionId) {
      expireQRSession(oldSessionId).catch(console.warn);
      
      // 📊 이벤트 로깅: QR 재생성
      trackQRLogin.qrRegenerated(oldSessionId, "", {
        platform: "desktop",
        reason: "user_requested",
      }).catch(console.warn);
    }
    
    setSessionId(null);
    setQrUrl(null);
    setStatus("loading");
    setTimeRemaining(300);
    
    // useEffect가 다시 실행되도록 상태 초기화
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: 20,
      background: "#fafafa",
    }}>
      <Logo className="w-20 mx-auto mb-4" alt="YAGO SPORTS" />
      
      <div style={{
        width: "100%",
        maxWidth: 500,
        background: "#fff",
        borderRadius: 16,
        padding: 40,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        marginTop: 40,
        textAlign: "center",
      }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 600,
          marginBottom: 8,
        }}>
          QR 코드로 로그인
        </h1>
        
        <p style={{
          fontSize: 14,
          color: "#666",
          marginBottom: 32,
        }}>
          이 QR 코드는 5분간만 유효하며,<br />
          모바일에서 스캔하면 전화번호 로그인 화면으로 이동합니다.
        </p>

        {error && (
          <div style={{
            background: "#fee2e2",
            color: "#dc2626",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
            textAlign: "center",
          }}>
            {error}
          </div>
        )}

        {status === "loading" && (
          <div style={{
            padding: 40,
            color: "#666",
          }}>
            QR 코드 생성 중...
          </div>
        )}

        {status === "ready" && qrUrl && (
          <>
            <div style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 24,
            }}>
              <div style={{
                padding: 16,
                background: "#fff",
                borderRadius: 12,
                border: "2px solid #e5e7eb",
              }}>
                {/* 🔥 디버그: QR URL 확인 */}
                {(() => {
                  const isValid = qrUrl?.includes('www.yagovibe.com/qr-login?sessionId=');
                  console.log("🔐 [QRLoginDesktop] QRCodeSVG 렌더링:", {
                    qrUrl,
                    expected: 'https://www.yagovibe.com/qr-login?sessionId=xxx',
                    isValid,
                    sessionId,
                  });
                  if (!isValid) {
                    console.error("❌ [QRLoginDesktop] QR URL이 올바르지 않습니다!", {
                      actual: qrUrl,
                      expected: 'https://www.yagovibe.com/qr-login?sessionId=xxx',
                    });
                  } else {
                    console.log("✅ [QRLoginDesktop] QR URL이 올바릅니다!");
                  }
                  return null;
                })()}
                <QRCodeSVG
                  value={qrUrl || ''}
                  size={256}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>

            <div style={{
              fontSize: 14,
              color: "#666",
              marginBottom: 16,
            }}>
              남은 시간: {minutes}:{seconds.toString().padStart(2, "0")}
            </div>

            <div style={{
              fontSize: 12,
              color: "#999",
            }}>
              ⚠️ QR 코드는 한 번만 사용 가능하며, 5분 후 만료됩니다.
            </div>
          </>
        )}

        {status === "verified" && (
          <div style={{
            padding: 40,
            color: "#10b981",
          }}>
            <div style={{
              fontSize: 48,
              marginBottom: 16,
            }}>
              ✅
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 8,
            }}>
              로그인 완료!
            </div>
            <div style={{
              fontSize: 14,
              color: "#666",
            }}>
              잠시 후 자동으로 이동합니다...
            </div>
          </div>
        )}

        {status === "expired" && (
          <div style={{
            padding: 40,
            color: "#ef4444",
          }}>
            <div style={{
              fontSize: 48,
              marginBottom: 16,
            }}>
              ⏰
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 8,
            }}>
              QR 코드가 만료되었습니다
            </div>
            <div style={{
              fontSize: 14,
              color: "#666",
              marginBottom: 24,
            }}>
              새로운 QR 코드를 생성해주세요.
            </div>
            <button
              onClick={handleRegenerate}
              style={{
                padding: "12px 24px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              새 QR 코드 생성
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

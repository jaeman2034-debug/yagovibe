/**
 * 🔐 로그인용 QR 모달 컴포넌트
 * 
 * 역할:
 * - 로그인 페이지에서 QR 코드 표시
 * - 로그인 완료 폴링
 * - 원래 페이지 복귀
 */

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { generateLoginQRToken, checkLoginStatus } from "@/lib/qrLogin";
import { getOrCreateWebSessionId } from "@/utils/webSession";
import { useAuth } from "@/context/AuthProvider";
import { useNavigate, useLocation } from "react-router-dom";

interface LoginQRModalProps {
  onClose: () => void;
  redirectTo?: string; // 로그인 후 복귀할 페이지
}

export function LoginQRModal({ onClose, redirectTo }: LoginQRModalProps) {
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // 🔥 로그인 완료 감지: user가 변경되면 자동으로 모달 닫기
  useEffect(() => {
    if (user && !user.isAnonymous) {
      console.log("✅ [LoginQRModal] 로그인 완료 감지, 모달 닫기");
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsPolling(false);
      onClose();
      
      // 원래 페이지로 복귀
      const returnPath = redirectTo || location.state?.from?.pathname || "/";
      navigate(returnPath, { replace: true });
    }
  }, [user, onClose, navigate, redirectTo, location.state]);

  // 🔥 QR 토큰 생성
  useEffect(() => {
    let mounted = true;

    async function createQR() {
      try {
        const webSessionId = getOrCreateWebSessionId();
        setSessionId(webSessionId);

        const result = await generateLoginQRToken(webSessionId, 3); // 3분 만료

        if (!mounted) return;

        const qrUrl = result.qrUrl;
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}`;
        
        setQrImageUrl(qrImageUrl);
        setExpiresAt(new Date(result.expiresAt.seconds * 1000));
        setError(null);
        setIsPolling(true);

        // 🔥 로그인 완료 폴링 시작
        startPolling(webSessionId);
      } catch (err: any) {
        console.error("❌ [LoginQRModal] QR 생성 실패:", err);
        if (mounted) {
          setError("QR 코드를 생성할 수 없습니다. 다시 시도해주세요.");
        }
      }
    }

    createQR();

    return () => {
      mounted = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // 🔥 로그인 상태 폴링
  function startPolling(sessionId: string) {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const status = await checkLoginStatus(sessionId);
        
        if (status.authenticated && status.userId) {
          console.log("✅ [LoginQRModal] 로그인 완료 감지 (폴링)");
          // user 상태 변경으로 자동 처리됨 (위 useEffect)
        }
      } catch (err) {
        console.error("❌ [LoginQRModal] 폴링 오류:", err);
      }
    }, 2000); // 2초마다 확인
  }

  // 🔥 만료 시간 표시
  const timeRemaining = expiresAt
    ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
    : 0;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  // 🔥 만료 시 에러 표시
  useEffect(() => {
    if (timeRemaining === 0 && expiresAt && isPolling) {
      setError("QR 코드가 만료되었습니다. 다시 생성해주세요.");
      setIsPolling(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [timeRemaining, expiresAt, isPolling]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2147483647,
        padding: "20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          padding: "32px",
          maxWidth: "400px",
          width: "100%",
          position: "relative",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#666",
          }}
        >
          <X size={20} />
        </button>

        {/* 제목 */}
        <h2
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "#1a1a1a",
            marginBottom: "8px",
            textAlign: "center",
          }}
        >
          QR 코드로 로그인
        </h2>
        <p
          style={{
            fontSize: "14px",
            color: "#666",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          모바일 앱에서 QR 코드를 스캔하세요
        </p>

        {/* QR 코드 */}
        {qrImageUrl && !error ? (
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <img
              src={qrImageUrl}
              alt="로그인 QR 코드"
              style={{
                width: "280px",
                height: "280px",
                maxWidth: "100%",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
              }}
            />
          </div>
        ) : error ? (
          <div
            style={{
              padding: "24px",
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "8px",
              marginBottom: "16px",
            }}
          >
            <p style={{ color: "#DC2626", fontSize: "14px", textAlign: "center" }}>
              {error}
            </p>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <p style={{ color: "#666", fontSize: "14px" }}>QR 코드 생성 중...</p>
          </div>
        )}

        {/* 만료 시간 표시 */}
        {expiresAt && timeRemaining > 0 && !error && (
          <p
            style={{
              fontSize: "12px",
              color: "#666",
              textAlign: "center",
              marginTop: "16px",
            }}
          >
            {minutes}분 {seconds}초 후 만료
          </p>
        )}

        {/* 안내 문구 */}
        {isPolling && !error && (
          <p
            style={{
              fontSize: "12px",
              color: "#6B7280",
              textAlign: "center",
              marginTop: "16px",
            }}
          >
            로그인 대기 중...
          </p>
        )}
      </div>
    </div>
  );
}

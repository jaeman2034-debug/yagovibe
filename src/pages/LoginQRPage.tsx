/**
 * 🔐 로그인용 QR 페이지
 * 
 * 역할:
 * - /login/qr?token=XXX 경로로 접근
 * - QR 토큰 검증 및 로그인 처리
 * - 모바일 앱에서 스캔한 QR 코드 처리
 */

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Logo from "@/components/common/Logo";

export default function LoginQRPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const token = searchParams.get("token");
    
    if (!token) {
      setStatus("error");
      setMessage("QR 코드가 유효하지 않습니다.");
      return;
    }

    // 🔥 모바일 앱에서 QR 스캔 시 이 페이지로 리다이렉트됨
    // 모바일 앱에서 로그인 처리 후 verifyLoginQRToken 호출
    // 여기서는 안내 메시지만 표시
    setStatus("error");
    setMessage("모바일 앱에서 QR 코드를 스캔해주세요.");
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-none md:max-w-3xl">
        <div className="flex flex-col items-center mb-8">
          <Logo size={96} className="mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">QR 코드 로그인</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          {status === "loading" && (
            <div className="text-center py-8">
              <p className="text-gray-600">처리 중...</p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{message}</p>
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                로그인 페이지로 돌아가기
              </button>
            </div>
          )}

          {status === "success" && (
            <div className="text-center py-8">
              <p className="text-green-600 mb-4">로그인 성공!</p>
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                홈으로 이동
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

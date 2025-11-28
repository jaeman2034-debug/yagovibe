// src/components/PhoneLogin.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendSMSCode, confirmSMSCode, cleanupRecaptcha } from "@/utils/authPhone";
import { useAuth } from "@/context/AuthProvider";

export default function PhoneLogin() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  // 로그인된 상태면 홈으로 리디렉션
  useEffect(() => {
    if (user) {
      navigate("/sports-hub");
    }
  }, [user, navigate]);

  // 컴포넌트 언마운트 시 reCAPTCHA 정리
  useEffect(() => {
    return () => {
      cleanupRecaptcha();
    };
  }, []);

  const requestSMS = async () => {
    setError("");
    setLoading(true);

    try {
      // 전화번호 형식 검증
      if (!phone) {
        throw new Error("전화번호를 입력해주세요.");
      }

      if (!phone.startsWith("+")) {
        throw new Error("전화번호는 국가 코드와 함께 입력해주세요 (예: +821012345678)");
      }

      const confirmation = await sendSMSCode(phone);
      console.log("✅ SMS 전송 성공:", confirmation);
      
      alert("인증번호가 전송되었습니다.");
      setStep(2);
    } catch (e: any) {
      console.error("❌ SMS 전송 실패:", e);
      setError(e.message || "전화번호 오류 또는 Recaptcha 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    setLoading(true);

    try {
      if (!code || code.length < 6) {
        throw new Error("인증번호를 입력해주세요.");
      }

      const result = await confirmSMSCode(code);
      console.log("✅ 로그인 성공:", result.user);

      alert("로그인 성공!");
      
      // 홈으로 이동
      navigate("/sports-hub");
    } catch (e: any) {
      console.error("❌ 인증번호 확인 실패:", e);
      setError(e.message || "인증번호가 올바르지 않습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setCode("");
    setError("");
    cleanupRecaptcha();
  };

  return (
    <div style={{ width: "100%", maxWidth: "400px", margin: "0 auto", padding: "20px" }}>
      {/* reCAPTCHA Invisible Container */}
      <div id="recaptcha-container"></div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-center mb-4">📱 전화번호 로그인</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              전화번호
            </label>
            <input
              type="tel"
              placeholder="+821012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  requestSMS();
                }
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              국가 코드를 포함하여 입력해주세요 (예: +821012345678)
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={requestSMS}
            disabled={loading || !phone}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "전송 중..." : "인증번호 받기"}
          </button>

          <div className="text-center text-sm text-gray-500 mt-4">
            <p>테스트 번호: +821056890800</p>
            <p>테스트 코드: 123456</p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-center mb-4">🔑 인증번호 입력</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              인증번호
            </label>
            <input
              type="text"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  verifyCode();
                }
              }}
              maxLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:outline-none text-center text-2xl tracking-widest"
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1 text-center">
              전송된 인증번호를 입력해주세요
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleBack}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all disabled:opacity-50"
            >
              뒤로
            </button>
            <button
              onClick={verifyCode}
              disabled={loading || code.length < 6}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "확인 중..." : "로그인 완료"}
            </button>
          </div>

          <button
            onClick={requestSMS}
            disabled={loading}
            className="w-full px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50"
          >
            인증번호 다시 받기
          </button>
        </div>
      )}
    </div>
  );
}


// src/pages/PhoneLoginPage.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { sendSMSCode, confirmSMSCode, cleanupRecaptcha } from "@/utils/authPhone";
import Logo from "@/components/common/Logo";
import { isValidKoreanPhone, normalizePhoneNumber } from "@/utils/phone";

export default function PhoneLoginPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // 컴포넌트 언마운트 시 reCAPTCHA 정리
  useEffect(() => {
    return () => {
      cleanupRecaptcha();
    };
  }, []);

  const handleSend = async () => {
    setError("");
    setLoading(true);

    try {
      if (!phone.trim()) {
        throw new Error("전화번호를 입력해주세요.");
      }

      if (!isValidKoreanPhone(phone)) {
        throw new Error("휴대폰 번호를 올바르게 입력해주세요. (예: 01056890800)");
      }

      await sendSMSCode(normalizePhoneNumber(phone));
      alert("인증번호가 전송되었습니다.");
      setStep(2);
    } catch (e: any) {
      console.error("❌ SMS 전송 실패:", e);
      setError(e.message || "전화번호 형식 또는 Recaptcha 문제입니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);

    try {
      if (!code || code.length < 6) {
        throw new Error("인증번호를 입력해주세요.");
      }

      const result = await confirmSMSCode(code);
      console.log("✅ 로그인 성공:", result.user);

      alert("로그인 성공!");
      // /hub 이동은 PublicRoute(sessionUser)가 처리
    } catch (e: any) {
      console.error("❌ 인증번호 확인 실패:", e);
      setError(e.message || "인증코드가 올바르지 않습니다.");
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
    <div className="flex flex-col items-center text-center min-h-screen justify-center p-6">
      <Logo size={96} alt="YAGO SPORTS" className="mb-6 drop-shadow-md" />
      <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
        YAGO SPORTS
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        AI Platform for Sports Enthusiasts
      </p>

      <div style={{ maxWidth: 360, width: "100%", margin: "0 auto" }}>
        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold mb-4">📱 전화번호 로그인</h2>
            
            <div
              className="mb-4 text-left"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSend();
                }
              }}
            >
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="전화번호를 입력해주세요"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
              />
              <p className="mt-1 text-left text-xs text-gray-500">
                전송 시 자동으로 +82 형식으로 변환됩니다.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={loading || !isValidKoreanPhone(phone)}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "전송 중..." : "인증번호 받기"}
            </button>

            {import.meta.env.DEV && (
              <div className="text-center text-xs text-gray-500 mt-4">
                <p>[개발] 테스트 번호: 01056890800 → +821056890800</p>
                <p>[개발] 테스트 코드: 123456</p>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-2xl font-bold mb-4">🔑 인증번호 입력</h2>
            
            <input
              type="text"
              placeholder="인증번호 6자리"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleVerify();
                }
              }}
              maxLength={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:outline-none text-center text-2xl tracking-widest shadow-sm mb-4"
              disabled={loading}
              autoFocus
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={loading || code.length < 6}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "확인 중..." : "로그인"}
            </button>

            <button
              onClick={handleBack}
              disabled={loading}
              className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-700 hover:underline mt-2 disabled:opacity-50"
            >
              뒤로 가기
            </button>
          </>
        )}
      </div>

      <div className="mt-6 text-sm text-gray-600">
        <Link to="/login" className="text-blue-600 hover:underline">
          이메일로 로그인
        </Link>
        {" · "}
        <Link to="/signup" className="text-blue-600 hover:underline">
          회원가입
        </Link>
        {" · "}
        <Link to="/start" className="hover:underline">
          홈으로
        </Link>
      </div>

      <footer className="mt-10 text-xs text-gray-400">
        © 2025 YAGO SPORTS · Powered by AI
      </footer>
    </div>
  );
}


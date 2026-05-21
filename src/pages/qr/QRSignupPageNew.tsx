/**
 * 🔥 QR 초대용 회원가입 페이지 (v1 LOCK)
 * 
 * 성공 시 /qr로 복귀 (inviteId는 localStorage에 저장되어 있음)
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { signInWithGoogleAdaptive } from "@/utils/authHelpers";
import Logo from "@/components/common/Logo";
import { getPendingInvite } from "@/lib/inviteContext";
import { useAuth } from "@/context/AuthProvider";
import FloatingMic from "@/components/FloatingMic";

export default function QRSignupPageNew() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [teamName, setTeamName] = useState<string | null>(null);
  const [showLoginOption, setShowLoginOption] = useState(false);

  // inviteId가 없으면 홈으로
  const pendingInvite = getPendingInvite();
  
  useEffect(() => {
    if (!pendingInvite) {
      navigate("/");
      return;
    }

    // 팀 이름 로드 (QR 문구용)
    (async () => {
      try {
        const inviteSnap = await getDoc(doc(db, "invites", pendingInvite));
        if (inviteSnap.exists()) {
          const invite = inviteSnap.data();
          const teamSnap = await getDoc(doc(db, "teams", invite.teamId));
          if (teamSnap.exists()) {
            setTeamName(teamSnap.data()?.name || null);
          }
        }
      } catch (e) {
        // 팀 이름 로드 실패해도 가입은 가능
        console.warn("팀 이름 로드 실패:", e);
      }
    })();
  }, [pendingInvite, navigate]);

  useEffect(() => {
    if (authLoading || !user || !pendingInvite) return;
    navigate("/qr", { replace: true });
  }, [authLoading, user, pendingInvite, navigate]);

  if (!pendingInvite) {
    return null;
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setShowLoginOption(false);

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // 사용자 프로필 생성
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: name || user.email?.split("@")[0] || "사용자",
        createdAt: new Date(),
      });

      // 가입 성공 시 /qr로 복귀 (자동 join 실행됨)
      navigate("/qr");
    } catch (err: any) {
      console.error("회원가입 오류:", err);
      
      // 🔥 WeChat Mode: 이미 계정 있으면 로그인 옵션 표시 (최종 카피)
      if (err.code === "auth/email-already-in-use") {
        setShowLoginOption(true);
        setError("이미 가입된 계정이에요\n로그인하고 바로 참여할 수 있어요");
      } else {
        setError(err.message || "회원가입에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithGoogleAdaptive(auth, provider);
    } catch (err: any) {
      console.error("구글 회원가입 오류:", err);
      setError(err.message || "구글 회원가입에 실패했습니다.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-none md:max-w-3xl">
        <div className="flex flex-col items-center mb-8">
          <Logo size={96} className="mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">회원가입</h1>
          {/* 🔥 WeChat Mode: QR 전용 상단 문구 (최종 카피) */}
          {teamName ? (
            <>
              <p className="text-gray-600 text-sm text-center mb-1">
                {teamName}팀에 참여 중입니다
              </p>
              <p className="text-gray-600 text-sm text-center">
                회원가입 후 바로 참여됩니다
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-600 text-sm text-center mb-1">
                초대를 통해 참여 중입니다
              </p>
              <p className="text-gray-600 text-sm text-center">
                회원가입 후 바로 참여됩니다
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm whitespace-pre-line">
              {error}
              {/* 🔥 WeChat Mode: 이미 계정 있으면 로그인 옵션 인라인 표시 (최종 카피) */}
              {showLoginOption && (
                <button
                  onClick={() => navigate("/qr/login")}
                  className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                >
                  로그인하고 참여하기
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleEmailSignup} className="space-y-4 mb-4">
            <div>
              <input
                type="text"
                placeholder="이름 (선택)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-white border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                // 🔥 WeChat Mode: 이름은 선택(optional) - 나중에 프로필에서 입력 가능
              />
            </div>
            <div>
              <input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-white border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              {/* 🔥 WeChat Mode: 이메일 입력 하단 안내 (선택) */}
              <p className="mt-1 text-xs text-gray-500">
                이 이메일로 팀 계정이 생성됩니다
              </p>
            </div>
            <div>
              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-white border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "가입 중..." : "회원가입하고 참여하기"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">또는</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignup}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            구글로 회원가입
          </button>
          
          {/* 🔥 WeChat Mode: Google 로그인 하단 보조 문구 */}
          <p className="mt-3 text-xs text-gray-500 text-center">
            로그인 후 자동으로 팀에 참여합니다
          </p>
          
          {/* 🔥 WeChat Mode: 하단 로그인 링크 제거 (처음부터 선택지 노출 ❌) */}
        </div>
      </div>

      {/* TC-QR-3: QR 진입 후 위젯 (보조 인터페이스) */}
      <FloatingMic />
    </div>
  );
}


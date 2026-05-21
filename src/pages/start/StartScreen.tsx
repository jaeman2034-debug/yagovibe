import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Logo from "@/components/common/Logo";
import { signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useState } from "react";

export default function StartScreen() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // 게스트로 둘러보기 버튼 클릭 시
  const handleGuestLogin = async () => {
    try {
      setIsLoading(true);
      console.log("🎯 게스트 로그인 시도 중...");
      
      const userCred = await signInAnonymously(auth);
      console.log("✅ 게스트 로그인 성공:", userCred.user.uid);
      
      navigate("/hub");
    } catch (error) {
      console.error("❌ 게스트 로그인 실패:", error);
      alert("게스트 로그인에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center w-full text-center space-y-6"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* 로고 */}
      <motion.div
        className="mb-4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 120 }}
      >
        <Logo size={96} alt="YAGO SPORTS Logo" className="drop-shadow-md mx-auto" />
      </motion.div>

      {/* 제목 */}
      <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
        YAGO SPORTS
      </h1>
      <p className="text-gray-500 text-sm max-w-xs">
        AI 기반 스포츠 커뮤니티 플랫폼<br />
        음성으로 제어되는 새로운 경험을 시작하세요.
      </p>

      {/* 버튼 영역 - 실명 로그인 우선 */}
      <div className="flex flex-col gap-3 w-full max-w-[200px] mt-4">
        <Button
          onClick={() => navigate("/login")}
          className="w-full text-white bg-blue-600 hover:bg-blue-700 font-semibold"
        >
          🔐 로그인
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/signup")}
          className="w-full font-semibold"
        >
          ✨ 회원가입
        </Button>
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-gray-500">또는</span>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleGuestLogin}
          disabled={isLoading}
          className="w-full text-gray-600 hover:text-gray-800 hover:bg-gray-50 text-sm"
        >
          {isLoading ? "접속 중..." : "게스트로 둘러보기"}
        </Button>
      </div>
    </motion.div>
  );
}

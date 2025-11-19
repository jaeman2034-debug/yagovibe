import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo/YagoVibeLogo.svg";

export default function StartScreen() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-white">
            {/* 로고 및 제목 */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col items-center"
            >
                <img
                    src={logo}
                    alt="YAGO VIBE leverages로고"
                    className="w-24 h-24 mb-6 select-none"
                />
                <h1 className="text-4xl font-extrabold text-gray-800 mb-2">
                    YAGO VIBE
                </h1>
                <p className="text-gray-500 text-sm">
                    AI Platform for Sports & Community
                </p>
            </motion.div>

            {/* 슬 ochron */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.3 }}
                className="mt-10"
            >
                <h2 className="text-xl font-bold text-gray-800 mb-3">
                    스포츠의 연결, 야고바이브
                </h2>
                <p className="text-gray-600 max-w-md mx-auto text-sm">
                    AI가 당신의 스포츠 활동을 분석하고, 커뮤니티와 장터, 모임을 하나로 연결합니다.
                </p>
            </motion.div>

            {/* 버튼 */}
            <div className="mt-10 w-full max-w-xs space-y-4">
                <button
                    onClick={() => navigate("/login")}
                    className="bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition w-full"
                >
                    로그인
                </button>
                <button
                    onClick={() => navigate("/signup")}
                    className="border border-blue-600 text-blue-600 font-bold py-3 rounded-xl hover:bg-blue-50 transition w-full"
                >
                    회원가입
                </button>
                <button
                    onClick={() => navigate("/home")}
                    className="text-gray-700 font-medium py-3 hover:text저장blue-600 transition w-full"
                >
                    게스트로 둘러보기 →
                </button>
            </div>

            <footer className="absolute bottom-5 text-xs text-gray-400">
                © 2025 YAGO VIBE · Powered by AI
            </footer>
        </div>
    );
}


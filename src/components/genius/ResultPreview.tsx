/**
 * 🔥 Step 4: 결과 미리보기
 */

interface ResultPreviewProps {
  data: {
    intent?: "watch" | "play" | "chill";
    company?: "solo" | "friends" | "date" | "family";
    mood?: "calm" | "excited" | "focus" | "light";
  };
  onComplete: () => void;
}

const INTENT_LABELS: Record<string, string> = {
  watch: "경기 보기",
  play: "운동하기",
  chill: "쉬기",
};

const COMPANY_LABELS: Record<string, string> = {
  solo: "혼자",
  friends: "친구",
  date: "연인",
  family: "가족",
};

const MOOD_LABELS: Record<string, string> = {
  calm: "조용",
  excited: "신남",
  focus: "집중",
  light: "가볍게",
};

import { useState } from "react";

export function ResultPreview({ data, onComplete }: ResultPreviewProps) {
  const { intent, company, mood } = data;
  const [isLoading, setIsLoading] = useState(false);

  if (!intent || !company || !mood) {
    return (
      <div className="text-center text-gray-500">
        모든 질문에 답해주세요.
      </div>
    );
  }

  // 🔥 "오늘의 코스" 설명 생성
  const courseDescription = `${COMPANY_LABELS[company]} ${MOOD_LABELS[mood]} ${INTENT_LABELS[intent]} 코스`;

  const handleComplete = async () => {
    setIsLoading(true);
    // 🔥 완료 애니메이션을 위한 짧은 딜레이
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  return (
    <div className="text-center animate-fadeIn">
      <div className="mb-6">
        <div className="text-6xl mb-4 animate-bounce">✨</div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 animate-slideDown">
          스포츠 감각이 켜졌어요!
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          이제 지도가 당신을 이해하기 시작합니다
        </p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 mb-6 animate-scaleIn">
        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          오늘의 코스
        </p>
        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {courseDescription}
        </p>
      </div>

      <button
        onClick={handleComplete}
        disabled={isLoading}
        className={`
          w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg 
          transition-all transform hover:scale-[1.02] active:scale-95
          ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:shadow-xl"}
        `}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <span className="animate-spin mr-2">⏳</span>
            감각 켜는 중...
          </span>
        ) : (
          "감각 켜기 ✨"
        )}
      </button>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.4s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

/**
 * 🔥 코스 카드 컴포넌트 (천재 모드 1.5)
 * 
 * 역할:
 * - 장소 정보 표시
 * - 추천 이유 설명
 * - 클릭 로깅
 */

import { useBehaviorLogging } from "@/hooks/useBehaviorLogging";
import type { MapPlace } from "@/types/map";
import type { SportsSenseProfile } from "@/utils/sportsSenseRecommendation";
import { explainPlace, reasonSentence } from "@/utils/courseExplanation";
import { saveFeedback, feedbackSentence, type FeedbackType } from "@/utils/feedbackLoop";
import { useAuth } from "@/context/AuthProvider";
import { toast } from "sonner";

interface CourseCardProps {
  place: MapPlace;
  profile: SportsSenseProfile;
  rank: number;
  onClick?: () => void;
}

export function CourseCard({ place, profile, rank, onClick }: CourseCardProps) {
  const { logClick } = useBehaviorLogging();
  const { user } = useAuth();
  // 🔥 v1.6: 이유 결합 문장 사용
  const reason = reasonSentence(place, profile);

  const handleClick = () => {
    logClick(place.id, place.name);
    onClick?.();
  };

  // 🔥 v2.1: 피드백 핸들러
  const handleFeedback = async (feedbackType: FeedbackType) => {
    if (!user || user.isAnonymous) {
      return;
    }

    await saveFeedback(user.uid, place.id, feedbackType, place.name);
    
    // 🔥 피드백 응답 문장 표시
    const message = feedbackSentence(feedbackType);
    toast.success(message, {
      duration: 2000,
      position: "top-center",
    });

    // 🔥 피드백 후 재랭킹 트리거
    window.dispatchEvent(
      new CustomEvent("FEEDBACK_RECEIVED", {
        detail: {
          placeId: place.id,
          feedbackType,
        },
      })
    );
  };

  return (
    <div
      className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* 순위 */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm">
          {rank}
        </div>

        {/* 장소 정보 */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-gray-900 mb-1 truncate">
            {place.name || "장소"}
          </h3>
          
          {/* 추천 이유 */}
          <p className="text-sm text-gray-600 mb-2">
            {reason}
          </p>

          {/* 추가 정보 */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            {place.rating && (
              <span className="flex items-center gap-1">
                ⭐ {place.rating.toFixed(1)}
              </span>
            )}
            {place.category && (
              <span className="px-2 py-1 bg-gray-100 rounded">
                {place.category}
              </span>
            )}
          </div>

          {/* 🔥 v2.1: 피드백 버튼 */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFeedback("like");
              }}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
            >
              👍 좋아요
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFeedback("meh");
              }}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              😐 보통
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFeedback("hate");
              }}
              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              👎 싫어요
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

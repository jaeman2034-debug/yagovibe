/**
 * 🔥 후속 질문 컴포넌트 (천재 모드 2.4)
 * 
 * 역할:
 * - 사용자 응답 입력 UI
 * - 응답 처리 및 재조정 트리거
 */

import { useState } from "react";
import { processReply, updateProfileFromDialog, filterPlacesByDialog, type DialogContext } from "@/utils/dialogRhythm";
import type { SportsSenseProfile } from "@/utils/sportsSenseRecommendation";
import type { MapPlace } from "@/types/map";
import { toast } from "sonner";

interface FollowupQuestionProps {
  question: string;
  profile: SportsSenseProfile;
  places: MapPlace[];
  userLocation?: { lat: number; lng: number };
  onReply?: (dialogContext: DialogContext, updatedProfile: SportsSenseProfile, filteredPlaces: MapPlace[]) => void;
}

export function FollowupQuestion({
  question,
  profile,
  places,
  userLocation,
  onReply,
}: FollowupQuestionProps) {
  const [answer, setAnswer] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!answer.trim()) {
      return;
    }

    setIsProcessing(true);

    try {
      // 🔥 v2.4: 응답 처리
      const dialogContext: DialogContext = {};
      const updatedContext = processReply(answer, dialogContext);

      // 🔥 v2.4: 프로필 업데이트
      const updatedProfile = updateProfileFromDialog(profile, updatedContext);

      // 🔥 v2.4: 장소 필터링
      const filteredPlaces = filterPlacesByDialog(places, updatedContext, userLocation);

      // 🔥 콜백 호출
      if (onReply) {
        onReply(updatedContext, updatedProfile, filteredPlaces);
      }

      // 🔥 피드백
      toast.success("반영했어요! 다시 추천해드릴게요 ✨", {
        duration: 2000,
      });

      // 🔥 입력 초기화
      setAnswer("");
    } catch (error) {
      console.warn("⚠️ [FollowupQuestion] 응답 처리 실패:", error);
      toast.error("응답 처리 중 오류가 발생했어요");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
      <p className="text-sm text-gray-700 mb-3 font-medium">
        💬 {question}
      </p>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="짧게 답해주세요 (예: 조용한 곳, 가까운 곳)"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          disabled={isProcessing}
        />
        <button
          onClick={handleSubmit}
          disabled={isProcessing || !answer.trim()}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg hover:from-purple-600 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {isProcessing ? "처리 중..." : "답변"}
        </button>
      </div>

      {/* 🔥 v2.4: 빠른 답변 버튼 */}
      <div className="flex gap-2 mt-2 flex-wrap">
        <button
          onClick={() => setAnswer("조용한 곳")}
          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          조용한 곳
        </button>
        <button
          onClick={() => setAnswer("가까운 곳")}
          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          가까운 곳
        </button>
        <button
          onClick={() => setAnswer("좋아요")}
          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          좋아요
        </button>
        <button
          onClick={() => setAnswer("다른 곳")}
          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          다른 곳
        </button>
      </div>
    </div>
  );
}

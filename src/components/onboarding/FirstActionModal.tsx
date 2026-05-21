/**
 * 🔥 첫 행동 유도 모달 (리텐션 트리거)
 * 
 * 역할:
 * - 로그인 직후 사용자에게 첫 행동 선택하게 만들기
 * - 홈에서 멍 때리게 두지 않기
 * - 무조건 하나 하게 만들기
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { logFirstAction } from "@/utils/retentionEvents";
import { updateTrustScore } from "@/utils/trustScore";

export type FirstActionType = "explore" | "create" | "join" | "profile";

interface FirstActionModalProps {
  onClose: () => void;
}

export function FirstActionModal({ onClose }: FirstActionModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSelect = async (action: FirstActionType) => {
    if (!user) return;

    setLoading(true);
    try {
      // 🔥 유저 프로필에 첫 행동 저장
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        firstAction: action,
        firstActionAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 🔥 리텐션 이벤트 로깅
      await logFirstAction(user, action);

      // 🔥 신뢰도 스코어 업데이트 (첫 행동 완료 반영)
      await updateTrustScore(user.uid);

      // 🔥 행동에 따라 라우팅
      switch (action) {
        case "explore":
          navigate("/hub");
          break;
        case "create":
          navigate("/teams/create");
          break;
        case "join":
          navigate("/teams/find");
          break;
        case "profile":
          navigate("/profile/setup");
          break;
      }

      onClose();
    } catch (error) {
      console.error("❌ [FirstActionModal] 첫 행동 저장 실패:", error);
      // 에러가 나도 라우팅은 진행
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
          무엇을 해볼까요? 🎯
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
          YAGO SPORTS에서 시작할 첫 번째 활동을 선택해주세요
        </p>

        <div className="space-y-3">
          <button
            onClick={() => handleSelect("explore")}
            disabled={loading}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>🔍</span>
            <span>근처 스포츠 둘러보기</span>
          </button>

          <button
            onClick={() => handleSelect("create")}
            disabled={loading}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>➕</span>
            <span>모임 만들기</span>
          </button>

          <button
            onClick={() => handleSelect("join")}
            disabled={loading}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>👥</span>
            <span>모임 참여하기</span>
          </button>

          <button
            onClick={() => handleSelect("profile")}
            disabled={loading}
            className="w-full px-4 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>👤</span>
            <span>프로필 완성하기</span>
          </button>
        </div>

        <button
          onClick={onClose}
          disabled={loading}
          className="mt-4 w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm"
        >
          나중에 하기
        </button>
      </div>
    </div>
  );
}

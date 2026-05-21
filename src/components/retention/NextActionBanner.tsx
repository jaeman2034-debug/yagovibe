/**
 * 🔥 재방문 훅 배너 (리텐션 트리거)
 * 
 * 역할:
 * - 로그인 직후 "다음 할 일" 제시
 * - 재방문 동기 부여
 * - 개인화된 추천 제공
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { GeniusOnboarding } from "@/components/genius/GeniusOnboarding";

export function NextActionBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null); // 🔥 핵심 수정: userData 상태 저장
  const [showSportsSense, setShowSportsSense] = useState(false); // 🔥 천재 모드: 스포츠 감각 온보딩 모달

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchPersonalizedMessage = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setLoading(false);
          return;
        }

        const data = userSnap.data();
        setUserData(data); // 🔥 핵심 수정: userData 저장 (클릭 핸들러에서 재사용)

        const firstAction = data.firstAction;
        const isProfileComplete = data.isProfileComplete;
        const aiProfile = data.aiProfile;
        const favoriteSports = data.favoriteSports;
        const sportsSense = data.sportsSense; // 🔥 천재 모드: 스포츠 감각 프로필
        const hasLocation = data.location && (data.location.lat || data.location.lng);
        const hasNickname = data.nickname || data.displayName;

        // 🔥 천재 모드: 간단한 조건 분기
        // aiProfile이 있으면 → "내 취향 다시 맞추기 ✨"
        // aiProfile이 없으면 → "나만의 스포츠 감각 켜기 ✨"
        if (aiProfile) {
          setMessage("내 취향 다시 맞추기 ✨");
        } else {
          setMessage("나만의 스포츠 감각 켜기 ✨");
        }
      } catch (error) {
        console.error("❌ [NextActionBanner] 메시지 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonalizedMessage();
  }, [user]);

  if (loading || !message) {
    return null;
  }

  // 🔥 핵심 수정: 간단한 클릭 핸들러
  const handleClick = () => {
    if (!user || !userData) {
      // 🔥 fallback: userData가 없으면 프로필 설정으로 이동
      navigate("/profile/setup");
      return;
    }

    const aiProfile = userData.aiProfile;

    // 🔥 천재 모드: 간단한 클릭 핸들러
    // aiProfile이 있으면 → 수정 모드 (기존 데이터로 모달 열기)
    // aiProfile이 없으면 → 신규 모드 (빈 모달 열기)
    if (message && (message.includes("나만의 스포츠 감각 켜기") || message.includes("내 취향 다시 맞추기"))) {
      console.log("🔥 [NextActionBanner] 스포츠 감각 온보딩 모달 표시", aiProfile ? "(수정)" : "(신규)");
      setShowSportsSense(true);
      return;
    }

    // 🔥 fallback: 다른 메시지인 경우 프로필 설정으로 이동
    navigate("/profile/setup");
  };

  return (
    <>
      {/* 🔥 천재 모드: 스포츠 감각 온보딩 모달 */}
      {showSportsSense && userData && (
        <GeniusOnboarding
          onClose={() => {
            setShowSportsSense(false);
            // 🔥 모달 닫은 후 메시지 갱신 (스포츠 감각 활성화/수정됨)
            // 수정 모드이므로 "스포츠 감각 다시 설정하기" 메시지 유지
            const sportsSense = userData.sportsSense;
            const hasSportsSense = sportsSense && sportsSense.activatedAt;
            if (hasSportsSense) {
              setMessage("스포츠 감각 다시 설정하기 🔄");
            } else {
              setMessage(null);
            }
          }}
          initialData={
            userData.intent && userData.company && userData.mood
              ? {
                  intent: userData.intent,
                  company: userData.company,
                  mood: userData.mood,
                }
              : undefined
          }
        />
      )}

      {/* 배너 */}
      <div
        onClick={handleClick}
        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 rounded-xl shadow-lg mb-4 cursor-pointer hover:shadow-xl transition-all transform hover:scale-[1.02]"
      >
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm whitespace-pre-line">{message}</p>
          <span className="text-xl">→</span>
        </div>
      </div>
    </>
  );
}

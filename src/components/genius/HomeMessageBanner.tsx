/**
 * 🔥 홈 문장 실시간 생성기 (천재 모드 1.2)
 * 
 * 역할:
 * - "오늘은 조용한 하루 → 경기 관람로 한강 러닝부터 시작 어때요? ✨" 표시
 * - GENIUS_HIGHLIGHT 이벤트 수신
 * - 실시간 문장 생성 및 표시
 */

import { useEffect, useState } from "react";
import { generateHomeMessage } from "@/utils/geniusMessageGenerator";
import type { Intent, Company, Mood } from "@/utils/geniusMessageGenerator";
import { buildCourse, generateCourseSentence } from "@/utils/courseBuilder";
import type { MapPlace } from "@/types/map";
import type { SportsSenseProfile } from "@/utils/sportsSenseRecommendation";
import { useBehaviorLogging } from "@/hooks/useBehaviorLogging";
import type { LongMemory } from "@/utils/longMemory";
import type { InferenceContext } from "@/utils/intentInference";
import { FollowupQuestion } from "./FollowupQuestion";
import { updateProfileFromDialog, filterPlacesByDialog, type DialogContext } from "@/utils/dialogRhythm";
import { triggerRecalc } from "@/utils/triggerRecalc";

export function HomeMessageBanner() {
  const [message, setMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [coursePlaces, setCoursePlaces] = useState<MapPlace[]>([]);
  const [followupQuestion, setFollowupQuestion] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<SportsSenseProfile | null>(null);
  const [allPlaces, setAllPlaces] = useState<MapPlace[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { logClick } = useBehaviorLogging(); // 🔥 v1.3: 코스 클릭 로깅

  useEffect(() => {
    const handleGeniusHighlight = async (event: CustomEvent) => {
      const { intent, company, mood, placeNames, placeIds, places, memory, inferenceContext, userLocation: eventUserLocation } = event.detail;
      console.log("✨ [HomeMessageBanner] GENIUS_HIGHLIGHT 이벤트 수신:", { intent, company, mood, placeNames, places, memory, inferenceContext, userLocation: eventUserLocation });
      
      // 🔥 v2.4: 사용자 위치 저장
      if (eventUserLocation) {
        setUserLocation(eventUserLocation);
      }

      if (intent && company && mood) {
        // 🔥 v1.3: 코스 생성기 사용
        if (places && Array.isArray(places) && places.length > 0) {
          // 🔥 타입 변환
          const moodForProfile: "quiet" | "excited" | "focused" | "light" = 
            mood === "calm" ? "quiet" :
            mood === "excited" ? "excited" :
            mood === "focus" ? "focused" : "light";
          
          const intentForProfile: "watch" | "exercise" | "play" | "alone" = 
            intent === "watch" ? "watch" :
            intent === "play" ? "exercise" :
            intent === "chill" ? "play" : "alone";
          
          const contextForProfile: "alone" | "friends" | "partner" | "family" = 
            company === "solo" ? "alone" :
            company === "friends" ? "friends" :
            company === "date" ? "partner" : "family";

          const profile: SportsSenseProfile = {
            todayIntent: intentForProfile,
            context: contextForProfile,
            mood: moodForProfile,
          };

          // 🔥 코스 생성
          const course = buildCourse(places, profile);
          
          // 🔥 v2.3: 신뢰도 계산을 위한 컨텍스트 준비
          const behaviorScoreCount = memory 
            ? (memory.favoriteTags?.length || 0) + (memory.favoriteCategories?.length || 0)
            : 0;
          const hasRecentFeedback = memory 
            ? ((memory.liked && memory.liked.length > 0) || (memory.hated && memory.hated.length > 0))
            : false;
          
          // 🔥 v2.2: 의도 추론 컨텍스트 포함하여 문장 생성
          const courseSentence = generateCourseSentence(course, profile, { 
            memory: memory as LongMemory | undefined,
            inferenceContext: inferenceContext as InferenceContext | undefined,
            behaviorScoreCount, // 🔥 v2.3: 행동 점수 데이터 개수
            hasRecentFeedback, // 🔥 v2.3: 최근 피드백 여부
          });
          
          if (courseSentence) {
            setCoursePlaces(course.places); // 🔥 v1.3: 코스 장소 저장 (클릭 로깅용)
            setCurrentProfile(profile); // 🔥 v2.4: 프로필 저장
            setAllPlaces(places); // 🔥 v2.4: 전체 장소 저장
            
            // 🔥 v2.4: 후속 질문 추출 (문장에서 질문 부분 분리)
            const questionMatch = courseSentence.match(/💬\s*(.+)/);
            if (questionMatch) {
              setFollowupQuestion(questionMatch[1]);
              setMessage(courseSentence.replace(/💬\s*.+/, "").trim()); // 질문 부분 제거
            } else {
              setMessage(courseSentence);
              setFollowupQuestion(null);
            }
            
            setIsVisible(true);
            
            // 🔥 5초 후 자동 숨김 (후속 질문은 유지)
            // setTimeout(() => {
            //   setIsVisible(false); // 🔥 v2.4: 후속 질문이 있으면 숨기지 않음
            // }, 5000);
          }
        } else if (placeNames && placeNames.length > 0) {
          // 🔥 v1.2: 기존 방식 (fallback)
          const moodMap: Record<Mood, string> = {
            calm: "조용한 하루",
            excited: "신나는 하루",
            focus: "집중 모드",
            light: "가벼운 산책",
          };

          const intentMap: Record<Intent, string> = {
            watch: "경기 관람",
            play: "운동",
            chill: "휴식",
          };

          const topPlace = placeNames[0];
          const homeMessage = `오늘은 ${moodMap[mood]} → ${intentMap[intent]}로\n${topPlace}부터 시작 어때요? ✨`;
          
          setMessage(homeMessage);
          setIsVisible(true);
          
          // 🔥 5초 후 자동 숨김
          setTimeout(() => {
            setIsVisible(false);
          }, 5000);
        }
      }
    };

    window.addEventListener("GENIUS_HIGHLIGHT", handleGeniusHighlight as EventListener);
    
    return () => {
      window.removeEventListener("GENIUS_HIGHLIGHT", handleGeniusHighlight as EventListener);
    };
  }, []);

  // 🔥 v2.4: 응답 처리 핸들러
  const handleReply = async (
    dialogContext: DialogContext,
    updatedProfile: SportsSenseProfile,
    filteredPlaces: MapPlace[]
  ) => {
    if (!userLocation) {
      return;
    }

    // 🔥 v2.4: 재랭킹 트리거
    await triggerRecalc(updatedProfile, filteredPlaces, userLocation);

    // 🔥 v2.4: 후속 질문 숨김
    setFollowupQuestion(null);
  };

  if (!message || !isVisible) {
    return null;
  }

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slideDown space-y-3">
      <div className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-6 py-4 rounded-2xl shadow-2xl max-w-md mx-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">✨</div>
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1">오늘의 코스</p>
            <div className="text-lg font-bold whitespace-pre-line">
              {message.split("\n").map((line, i) => {
                // 🔥 v1.3: 코스 장소 클릭 로깅 (1), 2), 3) 라인만 클릭 가능)
                const isCourseLine = i > 0 && /^\d+\)/.test(line.trim());
                const placeIndex = isCourseLine 
                  ? parseInt(line.trim().match(/^(\d+)\)/)?.[1] || "0") - 1 
                  : -1;
                const place = placeIndex >= 0 && coursePlaces[placeIndex] 
                  ? coursePlaces[placeIndex] 
                  : null;
                
                return (
                  <div 
                    key={i}
                    className={place ? "cursor-pointer hover:text-blue-200 transition-colors" : ""}
                    onClick={() => {
                      // 🔥 v1.3: 코스 장소 클릭 로깅
                      if (place) {
                        logClick(place.id, place.name);
                        console.log("✨ [HomeMessageBanner] 코스 장소 클릭:", place.name);
                      }
                    }}
                  >
                    {line}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 v2.4: 후속 질문 UI */}
      {followupQuestion && currentProfile && allPlaces.length > 0 && (
        <div className="max-w-md mx-4">
          <FollowupQuestion
            question={followupQuestion}
            profile={currentProfile}
            places={allPlaces}
            userLocation={userLocation || undefined}
            onReply={handleReply}
          />
        </div>
      )}
      
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}

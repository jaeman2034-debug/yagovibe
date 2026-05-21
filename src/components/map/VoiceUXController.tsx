/**
 * 🔥 VoiceUXController - 음성 안내 레이어 (Phase 6)
 * 
 * 책임 범위:
 * ✅ places 상태 변화 관찰
 * ✅ '말해야 할 조건'이 충족될 때만 TTS 호출
 * ✅ 검색 결과 해석 및 안내
 * 
 * ❌ 하지 않는 것:
 * - 지도 렌더링 (MapPageV3 책임)
 * - 검색 로직 (MapController 책임)
 * - 지도 상태 판단
 * 
 * Phase 6 원칙:
 * - TTS는 "상태 변화"에만 반응
 * - 지도 이동/줌 변경에는 말하지 않음
 * - 마커 생성에는 말하지 않음
 * - 검색 실패/결과 0개 → 침묵
 */

import { useEffect, useRef } from "react";
import { speak } from "@/voice/speech"; // Promise 기반 TTS
import type { LocationState } from "./LocationController"; // 🔥 Phase L: LocationController에서 re-export된 타입 사용
import { getLatestMemory, isMemoryEnabled } from "@/utils/memoryStorage"; // 🔥 Phase 10: 기억 조회, Phase 11: 기억 활용 여부

type MapPlace = {
  id: string;
  lat: number;
  lng: number;
  name?: string;
};

type VoiceUXControllerProps = {
  places: MapPlace[];
  isSearching: boolean;
  searchQuery?: string;
  voiceEnabled?: boolean; // 🔥 Phase 6: 음성 활성화 플래그
  location?: LocationState; // 🔥 Phase L 검증: 위치 상태 추가
  recommendedPlaceId?: string; // 🔥 Phase 7: 추천 장소 ID
  navigationStarted?: boolean; // 🔥 Phase 9: 길 안내 시작 상태
};

export default function VoiceUXController({
  places,
  isSearching,
  searchQuery,
  voiceEnabled = true, // 🔥 Phase 6: 기본값 true
  location, // 🔥 Phase L 검증: 위치 상태 추가
  recommendedPlaceId, // 🔥 Phase 7: 추천 장소 ID
  navigationStarted = false, // 🔥 Phase 9: 길 안내 시작 상태
}: VoiceUXControllerProps) {
  const lastPlacesCountRef = useRef<number>(0);
  const hasSpokenRef = useRef<boolean>(false);
  const hasSpokenRecommendationRef = useRef<boolean>(false); // 🔥 Phase 7: 추천 TTS 중복 방지
  const hasSpokenNavigationRef = useRef<boolean>(false); // 🔥 Phase 9: 길 안내 TTS 중복 방지

  // 🔥 Phase 6: TTS 허용 조건 (AND 조건)
  // location.status === 'ready'
  // AND places.length > 0
  // AND places.length !== previousPlacesLength
  // AND voiceEnabled === true
  useEffect(() => {
    // 🔥 Phase 6: 음성 비활성화 시 침묵
    if (!voiceEnabled) {
      return;
    }

    // 🔥 Phase 6: 위치 상태가 ready가 아니면 침묵
    if (!location || location.status !== 'ready') {
      return;
    }

    // 🔥 검색 중이면 말하지 않음
    if (isSearching) {
      return;
    }

    // 🔥 검색어가 없으면 말하지 않음
    if (!searchQuery || !searchQuery.trim()) {
      return;
    }

    const currentCount = places.length;
    const previousCount = lastPlacesCountRef.current;

    // 🔥 Phase 6: TTS 허용 조건 체크
    // 1. 위치 상태가 ready여야 함 (location.status === 'ready')
    // 2. 결과가 있어야 함 (currentCount > 0)
    // 3. 이전과 달라야 함 (currentCount !== previousCount)
    // 4. 음성이 활성화되어 있어야 함 (voiceEnabled === true)
    if (location.status === 'ready' && currentCount > 0 && currentCount !== previousCount && voiceEnabled) {
      // 🔥 이미 말했으면 다시 말하지 않음 (중복 방지)
      if (hasSpokenRef.current && previousCount > 0) {
        lastPlacesCountRef.current = currentCount;
        return;
      }

      // 🔥 Phase L 검증: 말하기 직전 위치 로그
      if (location) {
        console.log('[VoiceUXController] speaking with location', {
          lat: location.lat,
          lng: location.lng,
          source: location.source,
          status: location.status,
        });
      }

      // 🔥 Phase 6: 간결한 1줄 메시지
      const message = getResultMessage(currentCount, searchQuery);
      
      if (message) {
        console.log('🔊 [VoiceUXController] speak() 호출:', message);
        
        // 🔥 Phase 16: 타이밍 조정 - 음성 인식 종료 후 0.3~0.5초 딜레이
        const timer = setTimeout(() => {
          speak(message)
            .then(() => {
              console.log('✅ [VoiceUXController] TTS 재생 완료');
            })
            .catch((error) => {
              console.warn('⚠️ [VoiceUXController] TTS 재생 실패:', error);
            });
        }, 400); // 🔥 Phase 16: 0.4초 딜레이
        
        hasSpokenRef.current = true;
        
        return () => clearTimeout(timer);
      }
      
      lastPlacesCountRef.current = currentCount;
    } else if (currentCount === 0 && previousCount > 0) {
      // 🔥 Phase 6: 결과가 0개가 되었을 때는 침묵 (재검색 상황)
      hasSpokenRef.current = false;
      lastPlacesCountRef.current = 0;
      hasSpokenRecommendationRef.current = false; // 🔥 Phase 7: 추천도 초기화
    }
  }, [places.length, isSearching, searchQuery, voiceEnabled, location]); // location 추가

  // 🔥 Phase 7: 추천 장소 TTS (매우 절제, 선택적)
  useEffect(() => {
    if (!voiceEnabled || !recommendedPlaceId || hasSpokenRecommendationRef.current) {
      return;
    }

    if (location?.status === 'ready' && places.length > 0) {
      // 🔥 Phase 7: 추천 TTS는 기본 TTS 이후에만 (1회)
      if (hasSpokenRef.current && !hasSpokenRecommendationRef.current) {
        const message = '가장 가까운 장소를 표시했어요.';
        console.log('🔊 [VoiceUXController] 추천 TTS:', message);
        
        speak(message)
          .then(() => {
            console.log('✅ [VoiceUXController] 추천 TTS 재생 완료');
          })
          .catch((error) => {
            console.warn('⚠️ [VoiceUXController] 추천 TTS 재생 실패:', error);
          });

        hasSpokenRecommendationRef.current = true;
      }
    }
  }, [recommendedPlaceId, voiceEnabled, location, places.length]);

  // 🔥 검색어가 변경되면 초기화 (새로운 검색)
  useEffect(() => {
    if (searchQuery && searchQuery.trim()) {
      hasSpokenRef.current = false;
      lastPlacesCountRef.current = 0;
      hasSpokenRecommendationRef.current = false; // 🔥 Phase 7: 추천도 초기화
      hasSpokenNavigationRef.current = false; // 🔥 Phase 9: 길 안내도 초기화
    }
  }, [searchQuery]);

  // 🔥 Phase 9: 길 안내 중 TTS (매우 절제, 선택적, 1회)
  useEffect(() => {
    if (!voiceEnabled || !navigationStarted || hasSpokenNavigationRef.current) {
      return;
    }

    if (location?.status === 'ready' && places.length > 0) {
      const message = '필요하면 다른 장소도 다시 찾아볼 수 있어요.';
      console.log('🔊 [VoiceUXController] 길 안내 TTS:', message);
      
      speak(message)
        .then(() => {
          console.log('✅ [VoiceUXController] 길 안내 TTS 재생 완료');
        })
        .catch((error) => {
          console.warn('⚠️ [VoiceUXController] 길 안내 TTS 재생 실패:', error);
        });

      hasSpokenNavigationRef.current = true;
    }
  }, [navigationStarted, voiceEnabled, location, places.length]);

  // 🔥 Phase 9: 길 안내 종료 시 TTS 초기화
  useEffect(() => {
    if (!navigationStarted) {
      hasSpokenNavigationRef.current = false;
    }
  }, [navigationStarted]);

  // 🔥 Phase 11: 기억 기반 TTS (거의 침묵, 선택적, 앱 최초 1회만)
  const hasSpokenMemoryRef = useRef<boolean>(false);
  useEffect(() => {
    if (!voiceEnabled || hasSpokenMemoryRef.current) {
      return;
    }

    // 🔥 Phase 11: 앱 최초 1회만, 기억이 있고 활용 중일 때만
    const latestMemory = getLatestMemory();
    if (latestMemory && isMemoryEnabled() && !hasSpokenMemoryRef.current) {
      const message = '이전 선택을 참고해서 추천하고 있어요.';
      console.log('🔊 [VoiceUXController] 기억 TTS:', message);
      
      speak(message)
        .then(() => {
          console.log('✅ [VoiceUXController] 기억 TTS 재생 완료');
        })
        .catch((error) => {
          console.warn('⚠️ [VoiceUXController] 기억 TTS 재생 실패:', error);
        });

      hasSpokenMemoryRef.current = true;
    }
  }, [voiceEnabled]); // 앱 최초 1회만

  // 🔥 이 컴포넌트는 UI를 렌더링하지 않음 (순수 로직만)
  return null;
}

/**
 * 🔥 Phase 6: 검색 결과 메시지 생성 (간결한 1줄)
 * 규칙:
 * - 감탄사 ❌
 * - 장황한 설명 ❌
 * - 이유 설명 ❌
 */
function getResultMessage(count: number, query: string): string {
  if (count === 0) {
    // 🔥 결과 0개는 침묵 (TTS 호출 안 함)
    return "";
  }

  // 🔥 Phase 6: 간결한 1줄 메시지
  return `근처에 ${query}이(가) ${count}곳 있어요.`;
}

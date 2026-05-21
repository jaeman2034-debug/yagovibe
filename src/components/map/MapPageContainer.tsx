/**
 * 🔥 MapPageContainer - 지도 페이지 컨테이너
 * 
 * 책임 범위:
 * ✅ 검색어 상태 관리
 * ✅ 마이크 버튼 클릭 처리
 * ✅ MapController에 검색어 전달
 * 
 * ❌ 하지 않는 것:
 * - 지도 렌더링 (MapController → MapPageV3 책임)
 * - 검색 로직 (MapController 책임)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { lazy, Suspense } from "react";
import { HomeMessageBanner } from "@/components/genius/HomeMessageBanner";
import { useSearchParams } from "react-router-dom"; // 🔥 위치 기반 QR: URL 파라미터에서 lat, lng 읽기
import { Mic } from "lucide-react"; // 🔥 세련된 마이크 아이콘 적용: 검색창 우측의 마이크를 구형 아이콘이 아닌, Lucide-React의 Mic 또는 Google Material 아이콘으로 교체해
import { motion, AnimatePresence } from "framer-motion"; // 🔥 '말해보세요' 토글 통합: 음성 인식이 시작되면 검색창 바로 아래에 부드러운 애니메이션과 함께 대화창이 나타나도록 구현해서, 화면 중앙을 가리는 일이 없게 해줘
import { getLatestMemory } from "@/utils/memoryStorage"; // 🔥 Phase 10: 기억 조회
import { isFirstVisit, completeOnboarding } from "@/utils/onboarding"; // 🔥 Phase 13: 온보딩
import { useSpeechToText } from "@/hooks/useSpeechToText"; // 🔥 Phase 20: STT 훅
import type { STTStatus } from "@/types/stt"; // 🔥 Phase 20: STT 상태 타입
import { detectNavigationIntent } from "@/utils/navigationIntent"; // 🔥 Phase 22: 네비게이션 의도 감지
import type { SearchStatus, PlaceLite } from "@/types/search"; // 🔥 Phase 30: 검색 상태 타입
import { speakOnce, speakSequence, unlockTTS } from "@/utils/speech"; // 🔥 Phase 30: TTS 유틸리티
import { isMobileLikeDevice } from "@/utils/location"; // 🔥 Phase 29.5: 모바일 판별
import { getDistanceKm } from "@/utils/distance"; // 🔥 도착 감지: 거리 계산
import { useLocationController } from "./LocationController"; // 🔥 B 단계: 위치 컨트롤러
import PlaceResultCard from "./PlaceResultCard"; // ✅ MVP: 검색 결과 카드
import RouteInfoFloatingBar from "./RouteInfoFloatingBar"; // 🔥 2단계: 실시간 정보 플로팅 카드
import AIAssistantCard from "./AIAssistantCard"; // 🔥 AI 비서 레이아웃: 하단 AI 카드
import AiSummaryBubble from "./AiSummaryBubble"; // 🔥 AI 응답 말풍선 (요약)
import RouteSummaryBar from "./RouteSummaryBar"; // 🔥 AI 비서 레이아웃: 상단 경로 안내 바
import TransportTabs from "./TransportTabs"; // 🔥 경로 탐색 모드: 이동 수단 선택 탭
import EmptyState from "./EmptyState"; // ✅ MVP: 검색 결과 0개 EmptyState
import GpsWarningBanner from "./GpsWarningBanner"; // ✅ MVP: GPS 불안정 경고 배너
import RouteErrorCard from "./RouteErrorCard"; // ✅ MVP: 길 찾기 실패 RouteErrorCard
import MyLocationButton from "./MyLocationButton"; // 🔥 B 단계: 내 위치 버튼
import { MY_LOCATION } from "./constants"; // 🔥 내 위치 상수
import ActionCard from "./ActionCard"; // 🔥 C 단계: ActionCard
import NavigationCard from "./NavigationCard"; // 🔥 통합 네비게이션 카드 (CONFIRMED + NAVIGATING)
import NavigationStatusBar from "./NavigationStatusBar"; // 🔥 네비 UI: 상단 상태바
import DestinationLabel from "./DestinationLabel";
import PhaseStatusIndicator from "./PhaseStatusIndicator"; // 🔥 네비 UI: Phase 상태 표시
import { DebugBadge, type NavUIState } from "./NavUIStateMachine"; // 🔥 네비 UI: 상태 머신
import { StartButtonFeedback } from "./NavigationTransitionAnimation"; // 🔥 네비 UI: 전환 애니메이션
import ToastMessage from "./ToastMessage"; // 🔥 2️⃣ NAVIGATING 중 행동 제어: 토스트 메시지
import ArrivalImageOverlay from "./ArrivalImageOverlay"; // 🔥 ARRIVED 상태: 도착 배경 이미지 오버레이 (보조 역할)
import PlaceDetailSheet from "./PlaceDetailSheet"; // 🔥 CONFIRMED 상태: 위치 상세 정보 시트
import { HEADER_HEIGHT } from "@/layout/Header"; // 🔥 헤더 높이 상수
import { 
  initTestSession,
  trackSTTListenStart,
  trackSTTTranscriptReceived,
  trackRecommendationShown,
  trackRecommendAccept,
  trackRecommendReject,
  trackNavigationStart,
  trackSessionEnd,
  trackError,
} from "@/utils/mapTestAnalytics"; // 🔥 기능 테스트 계측

const MapController = lazy(() => import("./MapController"));

// ✅ MVP: STT/TTS 활성화
const VOICE_ENABLED = true; // 🔥 수정: 음성 기능 활성화

// 🔥 Phase 13: 출시 초기 기본값 - 음성 ON
const ENABLE_VOICE = true; // 🔥 수정: 기본 ON (마이크 기능 활성화)

// 🔥 Phase L 검증: STT → 검색 직결 임시 차단 (Phase L 완료까지)
const STT_TRIGGERS_SEARCH = false;

// 🔥 AI 비서 지도: 빠른 질문 예시
const QUICK_PROMPTS = [
  "이 근처 혼밥 가능한 곳",
  "아이랑 갈 만한 카페",
  "조용한 데이트 장소",
];

// 🔥 AI 비서 지도: AI 안내 문구 컴포넌트
function AiHintRow({
  onPromptClick,
}: {
  onPromptClick: (text: string) => void;
}) {
  return (
    <div style={{ 
      marginTop: '10px', 
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(4px)',
      borderRadius: '8px',
      padding: '6px 8px',
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      gap: '10px', 
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
        <strong style={{ color: '#111827' }}>AI에게 물어보세요</strong>
        <span style={{ marginLeft: '6px' }}>
          · AI가 상황에 맞는 장소를 추천해주는 지도 비서
        </span>
      </span>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {QUICK_PROMPTS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onPromptClick(t)}
            style={{
              fontSize: '12px',
              padding: '6px 10px',
              borderRadius: '999px',
              border: '1px solid #e5e7eb',
              background: '#fff',
              cursor: 'pointer',
              color: '#374151',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#4285F4';
              e.currentTarget.style.color = '#4285F4';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.color = '#374151';
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MapPageContainer() {
  // 🔥 천재 모드: GENIUS_ON 이벤트 리스너 (즉시 체감 연출)
  useEffect(() => {
    const handleGeniusOn = async (event: CustomEvent) => {
      const { intent, company, mood } = event.detail;
      console.log("🔥 [MapPageContainer] GENIUS_ON 이벤트 수신:", { intent, company, mood });
      
      // 🔥 토스트 메시지 표시 (sonner 사용)
      try {
        const { toast } = await import('sonner');
        const { generateCompletionToast } = await import('@/utils/geniusMessageGenerator');
        const toastMessage = generateCompletionToast(intent, company, mood);
        toast.success(toastMessage, {
          duration: 4000,
          position: "top-center",
        });
      } catch (error) {
        console.warn("⚠️ [MapPageContainer] 토스트 표시 실패:", error);
      }
    };

    // 🔥 천재 모드: GENIUS_UPDATED 이벤트 리스너 (v1.3: 코스 생성기 포함)
    const handleGeniusUpdated = async (event: CustomEvent) => {
      const { places, profile } = event.detail;
      console.log("✨ [MapPageContainer] GENIUS_UPDATED 이벤트 수신:", { places, profile });
      
      // 🔥 v1.3: 코스 생성 및 표시
      if (places && Array.isArray(places) && places.length > 0 && profile) {
        const { buildCourse } = await import("@/utils/courseBuilder");
        const course = buildCourse(places, profile);
        
        // 🔥 v1.3: 지도 하이라이트 연출 (코스 장소 기준)
        if (course.places.length > 0) {
          const { highlightTop3 } = await import("@/utils/mapHighlight");
          highlightTop3(course.places);
        }
        
        // 🔥 v1.3: 코스 문장 이벤트 발송
        if (course.places.length > 0) {
          const { generateCourseSentence } = await import("@/utils/courseBuilder");
          const courseSentence = generateCourseSentence(course, profile);
          
          // 🔥 타입 변환
          const intentForEvent = profile.todayIntent === "watch" ? "watch" :
                                profile.todayIntent === "exercise" ? "play" :
                                profile.todayIntent === "play" ? "chill" : "watch";
          const companyForEvent = profile.context === "alone" ? "solo" :
                                  profile.context === "friends" ? "friends" :
                                  profile.context === "partner" ? "date" : "family";
          const moodForEvent = profile.mood === "quiet" ? "calm" :
                              profile.mood === "excited" ? "excited" :
                              profile.mood === "focused" ? "focus" : "light";
          
          window.dispatchEvent(
            new CustomEvent("GENIUS_HIGHLIGHT", {
              detail: {
                placeIds: course.places.map(p => p.id),
                placeNames: course.places.map(p => p.name || "").filter(Boolean),
                places: course.places, // 🔥 v1.3: 코스 장소 전달
                intent: intentForEvent,
                company: companyForEvent,
                mood: moodForEvent,
              },
            })
          );
        }
      } else if (places && places.length > 0) {
        // 🔥 v1.2: 기존 방식 (fallback)
        const { highlightTop3 } = await import("@/utils/mapHighlight");
        highlightTop3(places.slice(0, 3));
      }
      
      // 🔥 v1.3: 토스트 메시지
      try {
        const { toast } = await import('sonner');
        toast.success("오늘 코스를 만들었어요 ✨", {
          duration: 3000,
          position: "top-center",
        });
      } catch (error) {
        console.warn("⚠️ [MapPageContainer] 토스트 표시 실패:", error);
      }
      
      // 🔥 v1.2: 이벤트 로깅
      try {
        const { logEvent } = await import("@/lib/analytics");
        logEvent("genius_applied");
      } catch (error) {
        console.warn("⚠️ [MapPageContainer] 이벤트 로깅 실패:", error);
      }
    };

    // 🔥 천재 모드: GENIUS_HIGHLIGHT 이벤트 리스너 (홈 문장 생성)
    const handleGeniusHighlight = async (event: CustomEvent) => {
      const { placeNames } = event.detail;
      console.log("✨ [MapPageContainer] GENIUS_HIGHLIGHT 이벤트 수신:", placeNames);
      
      // 🔥 홈 문장 생성 및 표시 (선택적)
      if (placeNames && placeNames.length > 0) {
        // 향후 홈 화면에 문장 표시 가능
        console.log("📝 [MapPageContainer] 홈 문장 생성 가능:", placeNames);
      }
    };

    window.addEventListener("GENIUS_ON", handleGeniusOn as EventListener);
    window.addEventListener("GENIUS_UPDATED", handleGeniusUpdated as EventListener);
    window.addEventListener("GENIUS_HIGHLIGHT", handleGeniusHighlight as EventListener);
    
    return () => {
      window.removeEventListener("GENIUS_ON", handleGeniusOn as EventListener);
      window.removeEventListener("GENIUS_UPDATED", handleGeniusUpdated as EventListener);
      window.removeEventListener("GENIUS_HIGHLIGHT", handleGeniusHighlight as EventListener);
    };
  }, []);
  // 🔥 빌드 버전 스탬프 (배포 확인용)
  console.log('[BUILD] MAP v3.1-preview-only 2026-01-27 19:00');
  
  // 🔥 위치 기반 QR: URL 파라미터에서 lat, lng 읽기
  const [searchParams] = useSearchParams();
  const qrLat = searchParams.get('lat');
  const qrLng = searchParams.get('lng');
  
  // 🔥 위치 기반 QR: URL 파라미터에서 위치 추출 (QR 토큰에서 리다이렉트된 경우)
  const qrLocation = qrLat && qrLng
    ? (() => {
        const lat = parseFloat(qrLat);
        const lng = parseFloat(qrLng);
        if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng };
        }
        return null;
      })()
    : null;
  
  // 🔥 B 단계: 위치 컨트롤러 (내 위치 버튼용)
  const { requestGeolocation, location: locationState, isStableReady, updateFromMap } = useLocationController();
  
  // 🔥 수정: locationReady 가드 함수 (모바일 호환)
  const isLocationReady = useCallback(() => {
    if (!locationState) return false;
    const hasValidCoords = 
      typeof locationState.lat === 'number' &&
      typeof locationState.lng === 'number' &&
      !Number.isNaN(locationState.lat) &&
      !Number.isNaN(locationState.lng) &&
      locationState.status === 'READY';
    return hasValidCoords;
  }, [locationState]);
  
  // ✅ MVP: 모바일 판별 (초기화 디버깅용)
  const isMobile = typeof window !== 'undefined' && isMobileLikeDevice();
  
  // 🔥 테스트용: UX 패널 확인을 위해 초기 검색어는 빈 문자열 (테스트 데이터 자동 삽입)
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | undefined>(undefined); // ✅ MVP: 검색 중심점 (ARRIVED → SEARCHING 전환 시 도착 지점 기준)
  // ❌ MVP에서 STT/TTS 임시 비활성화 (하지만 참조는 기본값으로 유지)
  // const [isListening, setIsListening] = useState(false);
  // const [hasSpoken, setHasSpoken] = useState(false);
  // const [memoryHint, setMemoryHint] = useState<string | null>(null);
  // const [showOnboardingMessage, setShowOnboardingMessage] = useState(false);
  // const [navIntent, setNavIntent] = useState<'idle' | 'intent-detected'>('idle');
  // const [recognizedText, setRecognizedText] = useState<string | null>(null);
  // const [showSpeechAck, setShowSpeechAck] = useState(false);
  // const [pendingSearchQuery, setPendingSearchQuery] = useState<string | null>(null);
  // const pendingSearchQueryRef = useRef<string | null>(null);
  
  // ✅ MVP: 최소 상태만 유지 (참조되는 변수는 기본값으로 설정)
  const [isMapReady, setIsMapReady] = useState(false);
  
  // 🔥 수정: STT 훅 활성화
  const [recognizedText, setRecognizedText] = useState<string | null>(null);
  const [hasSpoken, setHasSpoken] = useState(false);
  const [navIntent, setNavIntent] = useState<'idle' | 'intent-detected'>('idle');
  const [showSpeechAck, setShowSpeechAck] = useState(false);
  const [pendingSearchQuery, setPendingSearchQuery] = useState<string | null>(null);
  
  // 🔥 수정: useSpeechToText 훅 사용
  const { start: startSTT, stop: stopSTT, isListening, sttStatus } = useSpeechToText({
    onResult: (text) => {
      console.log('[STT] 결과:', text);
      setRecognizedText(text);
      // 🔥 STT 결과를 검색어로 설정
      if (text && text.trim()) {
        setSearchQuery(text.trim());
        setQueryText(text.trim());
        setPhase('SEARCHING');
      }
    },
    onEnd: () => {
      console.log('[STT] 종료');
      setSttStatusWithTransition('idle');
    },
    onError: (error) => {
      console.error('[STT] 오류:', error);
      setSttStatusWithTransition('idle');
    },
    onNoSpeech: () => {
      console.warn('[STT] 음성 없음');
      setSttStatusWithTransition('idle');
    },
    lang: 'ko-KR',
    continuous: false,
    interimResults: false,
  });
  
  // 🔥 STT 상태 전이 관리: sttStatus와 동기화되지만 별도 state로 관리 (전이 효과용)
  const [sttStatusWithTransition, setSttStatusWithTransition] = useState<STTStatus>(sttStatus);
  
  // 🔥 sttStatus 변경 시 sttStatusWithTransition 동기화
  useEffect(() => {
    setSttStatusWithTransition(sttStatus);
  }, [sttStatus]);
  // ✅ isIdleCurious는 아래에서 useState로 선언됨 (123번째 줄)
  
  // 🔥 MVP: phase 단일 상태 머신 (TMAP Core)
  type Phase = 'IDLE' | 'SEARCHING' | 'CONFIRMED' | 'PRE_NAVIGATING' | 'NAVIGATING' | 'ARRIVED';
  const [phase, setPhase] = useState<Phase>('IDLE');
  
  // 🔥 네비 UI: 상태 머신 매핑 (Phase → NavUIState)
  const navUIState: NavUIState = 
    phase === 'IDLE' || phase === 'SEARCHING' ? 'SEARCH' :
    phase === 'CONFIRMED' ? 'SELECTED' :
    phase === 'PRE_NAVIGATING' ? 'PRE_NAV' :
    phase === 'NAVIGATING' ? 'NAVIGATING' :
    phase === 'ARRIVED' ? 'ARRIVED' :
    'SEARCH';
  
  // 🔥 네비 UI: 출발 버튼 피드백 상태
  const [isStartButtonPressed, setIsStartButtonPressed] = useState<boolean>(false);
  
  // ✅ MVP: navigation 시작 여부 추적 (음성 가드용)
  const [navigationStarted, setNavigationStarted] = useState<boolean>(false);
  
  // ❌ MVP에서 임시 비활성화 (하지만 참조는 기본값으로 유지)
  // const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const searchStatus: SearchStatus = "idle"; // ✅ MVP: 기본값
  const searchPhase = "idle" as const; // ✅ MVP: 기본값
  // const [searchPhase, setSearchPhase] = useState<"idle" | "searching" | "results" | "confirmed" | "navigating" | "arrived">("idle");
  // type NavStatus = 'IDLE' | 'SEARCHING' | 'CONFIRMED' | 'NAVIGATING' | 'ARRIVED';
  // const [navStatus, setNavStatus] = useState<NavStatus>('IDLE');
  
  // 🔥 2️⃣ NAVIGATING 중 행동 제어: 토스트 메시지 상태
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // 🔥 v4 SEARCH ONLY: previewPlace = 단일 진실 원천 (Single Source of Truth)
  type PreviewPlace = { 
    id: string; 
    lat: number; 
    lng: number; 
    name: string;  // 필수
    address?: string; 
  };
  const [previewPlace, setPreviewPlace] = useState<PreviewPlace | null>(null);
  
  // 🔥 v4: confirmedDestination 선언 (필수 - 많은 곳에서 사용됨)
  const [confirmedDestination, setConfirmedDestination] = useState<PlaceLite | null>(null);
  
  const [routeError, setRouteError] = useState<boolean>(false); // ✅ MVP: 길 찾기 실패 상태
  const [routeFailedReason, setRouteFailedReason] = useState<'ZERO_RESULTS' | 'NOT_FOUND' | 'ERROR' | null>(null); // 🔥 네비 UI: 경로 실패 이유
  const [queryText, setQueryText] = useState<string | null>(null); // "축구장"
  const [places, setPlaces] = useState<PlaceLite[]>([]); // 🔥 검색 결과
  const [showAiSummary, setShowAiSummary] = useState(true); // 🔥 AI 응답 말풍선 표시 여부
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null); // 🔥 네비 UI: 경로 정보
  const [currentRouteResult, setCurrentRouteResult] = useState<google.maps.DirectionsResult | null>(null); // 🔥 2단계: 실시간 정보 플로팅 카드용 경로 결과
  const [isRouteCalculating, setIsRouteCalculating] = useState<boolean>(false); // 🔥 네비 UI: 경로 계산 중 여부
  const [currentTravelMode, setCurrentTravelMode] = useState<'WALKING' | 'DRIVING' | 'TRANSIT'>('DRIVING'); // 🔥 경로 탐색 모드: 현재 선택된 이동 수단

  // 🔥 데이터 동기화: currentRouteResult가 변경될 때 currentTravelMode 동기화
  useEffect(() => {
    if (currentRouteResult?.routes?.[0]?.legs?.[0]?.steps?.[0]) {
      const routeTravelMode = currentRouteResult.routes[0].legs[0].steps[0].travel_mode;
      if (routeTravelMode === 'TRANSIT') {
        setCurrentTravelMode('TRANSIT');
      } else if (routeTravelMode === 'DRIVING') {
        setCurrentTravelMode('DRIVING');
      } else if (routeTravelMode === 'WALKING') {
        setCurrentTravelMode('WALKING');
      }
    }
  }, [currentRouteResult]);
  const [aiResponse, setAiResponse] = useState<string>(''); // 🔥 AI 비서 레이아웃: AI 응답 텍스트
  
  // ❌ MVP에서 임시 비활성화 (하지만 참조는 기본값으로 유지)
  // const [confirmedPlace, setConfirmedPlace] = useState<PlaceLite | null>(null);
  // const [selectedPlace, setSelectedPlace] = useState<PlaceLite | null>(null);
  // const [showConfirmStart, setShowConfirmStart] = useState(false);
  // const [navigationStarted, setNavigationStarted] = useState(false);
  // const [recommendedPlace, setRecommendedPlace] = useState<PlaceLite | null>(null);
  // const [isNavigating, setIsNavigating] = useState(false);
  const confirmedPlace: PlaceLite | null = null; // ✅ MVP: 기본값
  const selectedPlace: PlaceLite | null = null; // ✅ MVP: 기본값
  const recommendedPlace: PlaceLite | null = null; // ✅ MVP: 기본값
  const isNavigating = false; // ✅ MVP: 기본값
  const showConfirmStart = false; // ✅ MVP: 기본값
  // 🔥 인터랙션 단계: 지도 상태 머신 (3단계)
  type MapPhase = 'idle' | 'moving' | 'selected';
  const [mapPhase, setMapPhase] = useState<MapPhase>('idle');
  const [showIdleCandidate, setShowIdleCandidate] = useState(false); // 🔥 STEP 4: idle 500ms 후 후보 상태 표시
  const idleCandidateTimerRef = useRef<NodeJS.Timeout | null>(null); // 🔥 STEP 4: 타이머 ref
  const hasAutoStartedRef = useRef(false); // 🔥 최초 자동 시작 플래그
  const autoRestartTimerRef = useRef<NodeJS.Timeout | null>(null); // 🔥 자동 재시작 타이머 ref
  const [mapHeight, setMapHeight] = useState<string>('420px'); // 🔥 FINAL LOCK: 반응형 지도 높이
  const [mapMaxWidth, setMapMaxWidth] = useState<string>('768px'); // 🔥 FINAL LOCK: 반응형 지도 가로폭
  const [isIdleCurious, setIsIdleCurious] = useState(false); // 🔥 천재 모드: idle 상태 3초 경과 후 "관심" 상태
  const idleCuriousTimerRef = useRef<NodeJS.Timeout | null>(null); // 🔥 idle curious 타이머 ref
  const navigationCompanionTimerRef = useRef<NodeJS.Timeout | null>(null); // 🔥 천재 모드: 동행 UX 타이머 ref
  const sttNoResponseTimerRef = useRef<NodeJS.Timeout | null>(null); // 🔥 출시 전 최종 루프: STT 3초 무응답 타이머
  const longSilenceMentRef = useRef<boolean>(false); // 🔥 출시 전 최종 루프: 5~7초 무발화 멘트 1회 플래그
  const onStartNavigationRef = useRef<(() => void) | null>(null); // 🔥 음성 명령에서 onStartNavigation 호출용 ref
  const arrivalCheckTimerRef = useRef<NodeJS.Timeout | null>(null); // 🔥 도착 감지 타이머
  const stationaryTimerRef = useRef<NodeJS.Timeout | null>(null); // 🔥 멈춤 감지 타이머 (5초)
  const lastLocationRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null); // 🔥 마지막 위치 (속도 계산용)
  const arrivalAutoIdleTimerRef = useRef<NodeJS.Timeout | null>(null); // 🔥 도착 후 10초 자동 idle 복귀 타이머
  const recommendationMentRef = useRef<boolean>(false); // 🔥 추천 완료 시 안내 멘트 중복 방지
  const hasSpokenStartRef = useRef<boolean>(false); // ✅ MVP: NAVIGATING 진입 음성 1회만 재생 플래그
  const hasSpokenFirstTurnRef = useRef<boolean>(false); // ✅ MVP: 첫 턴 음성 1회만 재생 플래그
  const prevPhaseRef = useRef<typeof phase | null>(null); // ✅ MVP: 이전 phase 추적 (실제 변경 감지용)

  // 🔥 기능 테스트 계측: 세션 초기화 (앱 열릴 때)
  useEffect(() => {
    initTestSession();
    
    // 🔥 Soft Launch: 세션 이탈 추적 (페이지 종료 시)
    const handleBeforeUnload = () => {
      trackSessionEnd('unload', sttStatusWithTransition);
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // 페이지가 숨겨질 때 (탭 전환 등)
        trackSessionEnd('navigation', sttStatusWithTransition);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // 컴포넌트 언마운트 시에도 세션 종료 추적
      trackSessionEnd('navigation', sttStatusWithTransition);
    };
  }, [sttStatusWithTransition]);

  // 🔥 천재 모드: 추천 멘트 생성 함수 (상황별)
  const getRecommendationMent = (place: PlaceLite | null, query: string | null): {
    reason: string; // 이유 설명
    alternative?: string; // 대안 기준 (CASE B용)
  } => {
    if (!place || !query) {
      return { reason: '추천 장소예요' };
    }

    // CASE C: 애매한 요청 감지 (예: "갈 곳", "좀 쉬고 싶어", "근처")
    const vagueKeywords = ['갈 곳', '갈곳', '좀', '쉬고', '근처', '주변', '어디', '곳'];
    const isVagueRequest = vagueKeywords.some(keyword => 
      (query || '').toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (isVagueRequest) {
      return { 
        reason: '의미를 이렇게 해석했어요',
        alternative: '틀리면 바로 말해줘도 괜찮아요'
      };
    }

    // CASE B: 인기/무난 추천 (평점 높고 리뷰 많은 경우)
    if (place.rating !== undefined && place.rating >= 4.0 && place.userRatingsTotal !== undefined && place.userRatingsTotal >= 10) {
      return { 
        reason: '사람들이 자주 가는 곳이에요',
        alternative: '조용한 곳 원하면 말해줘요'
      };
    }

    // CASE A: 거리 기반 추천 (기본)
    if (place.distanceM !== undefined) {
      if (place.distanceM < 500) {
        return { 
          reason: '지금 위치에서 제일 가까워서 먼저 보여줬어요',
          alternative: '다른 기준이면 바로 바꿔도 돼요'
        };
      } else if (place.distanceM < 2000) {
        return { 
          reason: '가까운 거리라 먼저 보여줬어요',
          alternative: '다른 기준이면 바로 바꿔도 돼요'
        };
      }
      // 거리가 2000m 이상이면 거리 기반 멘트 사용 안 함
    }

    // CASE A (기본): 거리가 멀거나 거리 정보가 없을 때
    // 평점이 있으면 평점 기준, 없으면 일반 추천
    if (place.rating !== undefined && place.rating >= 3.5) {
      return { 
        reason: '평점이 좋아서 먼저 보여줬어요',
        alternative: '다른 기준이면 바로 바꿔도 돼요'
      };
    }
    
    return { 
      reason: '조건에 맞아서 추천했어요',
      alternative: '다른 기준이면 바로 바꿔도 돼요'
    };
  };

  // ✅ MVP: startNavigation 단순화 (phase 기준)
  // 🔥 클릭 이벤트 연결: 하단 시트의 '길찾기' 버튼에 handleStartNavigation 함수를 연결
  // 🔥 안내 모드 시작: 버튼을 누르면 isNavigating 상태를 true로 바꾸고, 지도를 '실시간 내비게이션 뷰'로 전환
  const handleStartNavigation = useCallback(() => {
    // 🔥 최우선: navigationStarted를 즉시 true로 설정 (검색 차단 보장)
    setNavigationStarted(true);
    console.log('✅ [MapPageContainer] navigationStarted = true (최우선 설정)');
    
    // ✅ MVP: 릴리즈 - 디버그 로그만
    if (process.env.NODE_ENV === 'development') {
      console.debug('[NAV] handleStartNavigation called', {
      phase,
      hasConfirmedDestination: !!confirmedDestination,
      hasCurrentRouteResult: !!currentRouteResult,
      locationStatus: locationState.status,
    });
    }
    
    // 🔥 경로가 이미 계산되어 있으면 phase 체크를 우회하고 바로 NAVIGATING으로 전환
    if (currentRouteResult?.routes?.[0]?.legs?.[0]) {
      console.log('[NAV] 경로가 이미 계산되어 있음 → 바로 NAVIGATING으로 전환');
      setPhase('NAVIGATING');
      setIsRouteCalculating(false); // 경로는 이미 계산됨
      
      // 🔥 지도를 실시간 내비게이션 뷰로 전환
      const mapInstance = (window as any).__MAP_INSTANCE__;
      if (mapInstance && locationState && locationState.status === 'READY') {
        mapInstance.panTo({ lat: locationState.lat, lng: locationState.lng });
        mapInstance.setZoom(17);
        if (mapInstance.setTilt) {
          mapInstance.setTilt(45);
        }
      }
      
      return;
    }
    
    // ✅ MVP: phase가 CONFIRMED가 아니면 출발 불가
    if (phase !== 'CONFIRMED') {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[NAV] startNavigation blocked - phase is not CONFIRMED', { phase });
      }
      // 🔥 phase가 아니어도 navigationStarted는 이미 true로 설정됨 (검색 차단 유지)
      return;
    }
    
    // ✅ MVP: confirmedDestination이 없으면 출발 불가
    if (!confirmedDestination) {
      console.error('[NAV] no confirmedDestination, abort');
      // 🔥 destination 없어도 navigationStarted는 이미 true로 설정됨 (검색 차단 유지)
      return;
    }
    
    // ✅ MVP: 위치가 안정화된 READY가 아니면 출발 불가
    if (locationState.status !== 'READY' || !isStableReady()) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[NAV] startNavigation blocked - location not stable ready', { 
        status: locationState.status,
        isStableReady: isStableReady(),
      });
      }
      // 🔥 위치 미확정이어도 navigationStarted는 이미 true로 설정됨 (검색 차단 유지)
      return;
    }
    
    // ✅ MVP: phase를 NAVIGATING으로 전환 (navigationStarted는 이미 true)
    console.log('[NAV] PHASE → NAVIGATING');
    setPhase('NAVIGATING');
    setIsRouteCalculating(true); // 🔥 네비 UI: 경로 계산 시작
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('[NAV] start', {
      destination: confirmedDestination?.name || 'unknown',
      placeId: confirmedDestination?.placeId || 'unknown',
      center: { lat: locationState.lat, lng: locationState.lng },
    });
    }
    
    // 경로는 MapController에서 자동으로 계산됨 (confirmedDestination 기준)
    // routePath가 업데이트되면 WebMapRenderer에서 자동으로 얇은 경로 라인 표시
  }, [phase, confirmedDestination, locationState, currentRouteResult]);

  // ✅ MVP: stopNavigation 최소 버전
  // 🔥 UI 변경: '안내 종료' 버튼을 누르면 다시 검색 화면으로 돌아오게
  const handleStopNavigation = useCallback(() => {
    console.log('[NAV] 안내 종료 요청');
    
    // ✅ MVP: 경로 초기화 및 상태 리셋
    setCurrentRouteResult(null);
    setConfirmedDestination(null);
    setNavigationStarted(false); // ✅ MVP: navigation 시작 플래그 리셋
    setPhase('IDLE');
    
    // 🔥 지도 인터랙션: 안내 종료 시 grayscale 필터 제거 및 지도 리셋
    const mapInstance = (window as any).__MAP_INSTANCE__;
    if (mapInstance) {
      const mapContainer = mapInstance.getDiv();
      if (mapContainer) {
        mapContainer.style.filter = 'none';
      }
      // 지도를 기본 뷰로 리셋
      if (locationState && locationState.status === 'READY') {
        mapInstance.panTo({ lat: locationState.lat, lng: locationState.lng });
        mapInstance.setZoom(15);
        if (mapInstance.setTilt) {
          mapInstance.setTilt(0);
        }
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('[NAV] stop - 검색 화면으로 복귀');
    }
  }, [phase, locationState]);

  // ✅ MVP: resetToIdle (ARRIVED 상태에서 완전 리셋)
  const resetToIdle = useCallback(() => {
    console.log('[NAV] RESET TO IDLE');
    
    // ✅ MVP: 내비 흔적 전부 제거
    setConfirmedDestination(null);
    setNavigationStarted(false); // ✅ MVP: navigation 시작 플래그 리셋
    setPhase('IDLE');
    setSearchQuery('');
    setQueryText(null);
    // 🔥 핵심 수정: resetToIdle에서도 places 초기화 금지 (DEV 모드에서는 TEST_PLACES 보호)
    // setPlaces([]); 제거 - 기존 places 유지
    setSearchCenter(undefined); // ✅ MVP: 검색 중심점 초기화
    
    // ✅ MVP: 음성 재생 플래그 리셋 (다음 내비를 위해)
    hasSpokenStartRef.current = false;
    hasSpokenFirstTurnRef.current = false;
    prevPhaseRef.current = null; // ✅ MVP: phase 추적도 리셋
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('[NAV] 모든 내비 상태 초기화 완료');
    }
  }, []);

  // ✅ MVP: resetNavigation (ARRIVED 상태에서 안내 종료) - resetToIdle로 통합
  const resetNavigation = resetToIdle;
  
  // 🔥 v4 SEARCH ONLY: previewPlace 설정 (정규화된 PlaceLite 사용)
  const onPickPlace = useCallback((p: PlaceLite) => {
    // 🔥 정규화된 PlaceLite는 이미 name, lat, lng가 보장됨
    // 하지만 안전을 위해 최종 검증
    if (!p.name || !p.name.trim()) {
      console.error('[MAP] name이 없습니다:', p);
      return;
    }

    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) {
      console.error('[MAP] 좌표가 유효하지 않음:', {
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
      });
      return;
    }

    setPreviewPlace({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      name: p.name.trim(),
      address: p.address?.trim() || undefined,
    });

    console.log('[MAP] previewPlace 설정:', {
      id: p.id,
      name: p.name,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
    });
  }, []);

  // 🔥 v4 SEARCH ONLY: 검색 결과 클릭 → Place Details API 호출 → 확정된 정보로 previewPlace 설정
  // 🔥 v4 SEARCH ONLY: 검색 결과 클릭 → 정규화된 PlaceLite로 previewPlace 설정
  const selectResult = useCallback((place: PlaceLite) => {
    // 🔥 1단계: id 필수 검증 (정규화된 PlaceLite는 이미 보장됨)
    if (!place.id) {
      console.error('[MAP] id가 없습니다:', place);
      return;
    }

    // 🔥 2단계: name, lat, lng 필수 검증
    if (!place.name || !place.name.trim()) {
      console.error('[MAP] name이 없습니다:', place);
      return;
    }

    if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) {
      console.error('[MAP] 좌표가 유효하지 않음:', {
        id: place.id,
        name: place.name,
        lat: place.lat,
        lng: place.lng,
      });
      return;
    }

    // 🔥 3단계: 정규화된 PlaceLite로 previewPlace 설정
    // Text Search 결과가 이미 정규화되어 있으므로 바로 사용
    setPreviewPlace({
      id: place.id,
      lat: place.lat,
      lng: place.lng,
      name: place.name.trim(),
      address: place.address?.trim() || undefined,
    });

    // 🔥 UI 레이어 정리: 장소를 선택하면 검색 리스트는 닫고 장소 상세 정보만 보여주는 게 정석이야
    // 🔥 클릭 이벤트 연결: '길찾기' 버튼 클릭 시 해당 장소를 confirmedDestination으로 설정
    // 이렇게 하면 '안내 시작' 버튼이 정상 작동함
    setConfirmedDestination(place);
    setPhase('CONFIRMED');
    
    // 🔥 UI 레이어 정리: 장소 선택 시 검색 결과 리스트 닫기 (AIAssistantCard는 유지하되 검색 결과만 숨김)
    // 🔥 핵심 수정: DEV 모드에서는 TEST_PLACES 보호 (장소 선택해도 기본 마커 유지)
    if (import.meta.env.DEV) {
      console.log('🔒 [MapPageContainer] DEV 모드: 장소 선택 시에도 TEST_PLACES 유지');
      // DEV 모드에서는 places 초기화 안 함 (기본 마커 유지)
    } else {
      setPlaces([]); // PROD 모드에서만 검색 결과 리스트 닫기
    }

    console.log('[MAP] selectResult로 previewPlace 및 confirmedDestination 설정:', {
      id: place.id,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
    });
  }, []);
  
  // ✅ MVP: searchNearby (ARRIVED 상태에서 주변 검색 - 도착 지점 기준)
  const searchNearby = useCallback((keyword: string) => {
    if (phase !== 'ARRIVED' || !confirmedDestination) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[ARRIVED] searchNearby blocked - phase is not ARRIVED or no destination');
      }
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('[ARRIVED] searchNearby:', {
        keyword,
        location: {
          lat: confirmedDestination.location.lat,
          lng: confirmedDestination.location.lng,
        },
      });
    }
    
    // ✅ MVP: 도착 지점 기준 검색 (GPS 현재 위치 ❌)
    setSearchQuery(keyword);
    setQueryText(keyword);
    // ✅ MVP: searchCenter를 도착 지점으로 명시적 설정 (ARRIVED → SEARCHING 전환 시)
    setSearchCenter({
      lat: confirmedDestination.location.lat,
      lng: confirmedDestination.location.lng,
    });
    setPhase('SEARCHING');
    
    console.log('[NAV] PHASE → SEARCHING (from ARRIVED)');
  }, [phase, confirmedDestination]);
  
  // 🔥 onStartNavigation ref 업데이트 (음성 명령에서 호출하기 위해)
  useEffect(() => {
    onStartNavigationRef.current = handleStartNavigation;
  }, [handleStartNavigation]);

  // ✅ MVP: [BOOT] 로그 - 모바일 진입 시 초기 상태 확인
  useEffect(() => {
    console.log('[BOOT]', {
      phase,
      isNavigating: phase === 'NAVIGATING',
      isSearching: phase === 'SEARCHING',
      mounted: true,
      isMobile,
      navigationStarted,
    });
  }, []); // 마운트 시 1회만

  // ✅ MVP: 컴포넌트 마운트 시 phase 강제 초기화 (모바일 진입 시 이전 세션 상태 제거)
  useEffect(() => {
    console.error('[PHASE INIT EFFECT] 실행됨', {
      phase,
      isMobile,
    });
    
    // ✅ MVP: 모바일에서 NAVIGATING으로 시작하는 경우 강제 초기화
    if (isMobile && phase === 'NAVIGATING') {
      console.error('[FIX] 모바일 NAVIGATING 강제 리셋 실행');
      setPhase('IDLE');
      setConfirmedDestination(null);
      setNavigationStarted(false);
      hasSpokenStartRef.current = false;
      hasSpokenFirstTurnRef.current = false;
      prevPhaseRef.current = null;
      return;
    }
    
    // ✅ MVP: 마운트 시 항상 IDLE로 초기화 (이전 세션의 NAVIGATING/ARRIVED 상태 제거)
    if (phase !== 'IDLE') {
      console.error('[FIX] phase 강제 초기화 실행:', phase, '→ IDLE');
      setPhase('IDLE');
      setConfirmedDestination(null);
      setNavigationStarted(false);
      hasSpokenStartRef.current = false;
      hasSpokenFirstTurnRef.current = false;
      prevPhaseRef.current = null; // 초기화
    } else {
      prevPhaseRef.current = 'IDLE'; // IDLE이면 바로 기록
    }
    
    // 🔥 임시 확인용: 모바일에서 IDLE일 때 강제 SEARCHING 진입 (확인 후 제거 가능)
    // 이 코드는 "모바일에서 검색 UI가 뜨는지" 확인하기 위한 임시 코드입니다.
    // 검색창 포커스 기능이 정상 작동하면 이 코드는 제거해도 됩니다.
    if (isMobile && phase === 'IDLE') {
      console.warn('[MOBILE] 임시 확인용: IDLE → SEARCHING 강제 전환');
      setTimeout(() => {
        setPhase('SEARCHING');
      }, 500); // 500ms 지연 (렌더링 완료 후)
    }
  }, []); // ✅ MVP: 마운트 시 1회만 실행

  // ✅ MVP: phase가 NAVIGATING일 때 navigationStarted 자동 설정 (핵심 수정)
  useEffect(() => {
    if (phase === 'NAVIGATING' && !navigationStarted) {
      console.error('[FIX] phase NAVIGATING 감지 → navigationStarted 자동 설정');
      setNavigationStarted(true);
    } else if (phase !== 'NAVIGATING' && navigationStarted) {
      // NAVIGATING이 아닐 때는 navigationStarted를 false로 리셋 (IDLE/SEARCHING/CONFIRMED)
      if (phase === 'IDLE' || phase === 'SEARCHING' || phase === 'CONFIRMED') {
        console.error('[FIX] phase가 NAVIGATING 아님 → navigationStarted 리셋', phase);
        setNavigationStarted(false);
      }
    }
  }, [phase, navigationStarted]);

  // ✅ MVP: phase 변경 시 TTS 1회 멘트 (상태 전이 음성 안내)
  useEffect(() => {
    // ✅ MVP: 실제 phase 변경만 감지 (재마운트/복귀 시 무시)
    const prevPhase = prevPhaseRef.current;
    const isPhaseChanged = prevPhase !== phase;
    
    // 초기 마운트 시에는 prevPhase가 null이므로, IDLE이 아닌 경우만 처리
    // 단, 초기 마운트 시에는 음성 재생 안 함 (맵 열자마자 음성 방지)
    if (prevPhase === null) {
      // ✅ MVP: 초기 마운트 시에는 phase만 기록하고 음성 재생 안 함
      prevPhaseRef.current = phase;
      if (process.env.NODE_ENV === 'development') {
        console.debug('[NAV] 초기 마운트, phase:', phase, '(음성 재생 안 함)');
      }
      return;
    }
    
    // phase가 변경되지 않았으면 음성 재생 안 함 (재마운트 방지)
    if (!isPhaseChanged) {
      return;
    }
    
    // STT는 여전히 OFF, TTS만 1회 멘트 허용
    if (phase === 'SEARCHING' && isPhaseChanged) {
      console.log('[NAV] PHASE → SEARCHING');
      speakOnce('주변에서 찾고 있어요');
    } else if (phase === 'CONFIRMED' && isPhaseChanged) {
      console.log('[NAV] PHASE → CONFIRMED');
      speakOnce('여기로 안내할까요?');
    } else if (phase === 'NAVIGATING' && isPhaseChanged && prevPhase !== 'NAVIGATING') {
      // ✅ MVP: NAVIGATING 진입 음성 완전 고정 (실제 진입 시 1회만, navigationStarted가 true일 때만)
      // navigationStarted는 위 useEffect에서 자동으로 true로 설정됨
      if (!hasSpokenStartRef.current && navigationStarted === true) {
        console.log('[NAV] PHASE → NAVIGATING');
        speakOnce('안내를 시작합니다');
        hasSpokenStartRef.current = true;
        if (process.env.NODE_ENV === 'development') {
          console.debug('[NAV] 진입 음성 1회 재생');
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.debug('[NAV] NAVIGATING 진입 음성 차단', {
          hasSpokenStart: hasSpokenStartRef.current,
          navigationStarted,
        });
      }
    } else if (phase === 'ARRIVED' && isPhaseChanged) {
      console.log('[NAV] PHASE → ARRIVED');
      // ✅ MVP: 도착 음성 1회
      speakOnce('목적지에 도착했습니다');
    } else if (phase === 'IDLE' && isPhaseChanged) {
      console.log('[NAV] PHASE → IDLE');
    }
    
    // ✅ MVP: 이전 phase 업데이트
    prevPhaseRef.current = phase;
  }, [phase, navigationStarted]); // ✅ MVP: navigationStarted도 의존성에 추가 (위 useEffect에서 변경될 수 있음)

  // ❌ v4 SEARCH ONLY: 자동 선택 로직 완전 제거
  // 🔥 이전: 검색 결과 1개일 때 자동 선택 → 불완전한 객체로 confirmedDestination 설정 → 오류 발생
  // 🔥 현재: 사용자가 명시적으로 클릭할 때만 selectResult 호출
  // useEffect(() => {
  //   if (places.length === 1 && (phase === 'SEARCHING' || phase === 'IDLE') && !confirmedDestination) {
  //     const singlePlace = places[0];
  //     if (singlePlace && singlePlace.placeId) {
  //       selectResult(singlePlace, true);
  //     }
  //   }
  // }, [places.length, places[0]?.placeId, phase, confirmedDestination, selectResult]);

  // ✅ MVP: CONFIRMED 상태 음성 명령 처리 (phase 기준, 현재는 비활성화)
  const handleConfirmedVoiceCommand = (text: string): boolean => {
    // ✅ MVP: VOICE_ENABLED가 false면 음성 명령 처리 안 함
    if (!VOICE_ENABLED) return false;
    
    // ✅ MVP: phase가 CONFIRMED가 아니면 처리 안 함
    if (phase !== 'CONFIRMED' || !confirmedDestination) return false;
    
    const normalizedText = text.trim().toLowerCase();
    
    // 1️⃣ 출발 명령: "여기로 갈게", "출발", "가자" 등
    const startKeywords = ['여기로 갈게', '여기로 가자', '출발', '가자', '갈게', '갈래', '이쪽으로', '안내', '길 안내'];
    if (startKeywords.some(keyword => normalizedText.includes(keyword))) {
      console.log('🎤 [MapPageContainer] CONFIRMED 음성 명령: 출발', text);
      
      // ✅ MVP: 출발 로직은 handleStartNavigation 사용
      handleStartNavigation();
      
      return true; // 명령 처리 완료
    }
    
    // 2️⃣ 다른 장소 요청: "다른 곳", "다른 데" 등
    const otherPlaceKeywords = ['다른 곳', '다른 데', '다른 곳 보여줘', '다른 곳 찾아줘', '다른 곳 볼래'];
    if (otherPlaceKeywords.some(keyword => normalizedText.includes(keyword))) {
      console.log('🎤 [MapPageContainer] CONFIRMED 음성 명령: 다른 곳', text);
      
      // ✅ MVP: 다른 곳 보기는 MVP에서 제외 (단순화)
      // 검색 상태로 복귀
      setPhase('IDLE');
      setConfirmedDestination(null);
      
      return true; // 명령 처리 완료
    }
    
    // 3️⃣ 취소/무시: "아니", "그만", "취소" 등
    const cancelKeywords = ['아니', '그만', '취소', '안 갈래', '안 갈게'];
    if (cancelKeywords.some(keyword => normalizedText.includes(keyword))) {
      console.log('🎤 [MapPageContainer] CONFIRMED 음성 명령: 취소', text);
      
      // ✅ MVP: IDLE 상태로 복귀 (phase 기준)
      setPhase('IDLE');
      setConfirmedDestination(null);
      
      return true; // 명령 처리 완료
    }
    
    return false; // 명령 처리 안 됨
  };

  // 🔥 출발 의도 감지 함수 (상태와 무관하게)
  const detectStartIntent = (text: string): boolean => {
    // 문장 부호 제거 후 정규화
    const normalized = text.trim().toLowerCase().replace(/\s/g, '').replace(/[.,!?]/g, '');
    const startKeywords = [
      '여기로갈게', '여기로가자', '여기로갈래',
      '출발', '가자', '갈게', '갈래',
      '이쪽으로', '안내', '길안내',
      '여기로', '갈게요', '갈래요'
    ];
    return startKeywords.some(keyword => normalized.includes(keyword));
  };

  // 🔥 Phase 30: STT final 결과 처리 함수
  const onSpeechFinal = (text: string) => {
    const q = text.trim();
    if (!q) return;

    // 🔥 1️⃣ 출발 의도 최우선 체크 (상태와 무관하게)
    if (detectStartIntent(q)) {
      console.log('🎤 [MapPageContainer] 출발 의도 감지:', q);
      
      // ✅ MVP: confirmedDestination만 사용
      const targetPlace = confirmedDestination || (places.length > 0 ? places[0] : null);
      
      if (targetPlace) {
        console.log('✅ [MapPageContainer] 출발 의도 처리: 목적지 있음', targetPlace.name, {
          source: confirmedDestination ? 'confirmedDestination' : 'places[0]',
          placesCount: places.length,
          currentPhase: phase,
        });
        
        // ✅ MVP: 출발 로직은 handleStartNavigation 사용 (phase 기준)
        if (phase === 'CONFIRMED' && confirmedDestination) {
          handleStartNavigation();
          return; // 출발 처리 완료, 검색으로 넘어가지 않음
        } else if (phase === 'NAVIGATING') {
          console.log('⏸️ [MapPageContainer] 출발 의도 감지했지만 이미 내비게이션 중');
          return; // 이미 내비게이션 중이면 검색으로 넘어가지 않음
        } else {
          // ✅ MVP: CONFIRMED가 아니면 confirmedDestination 설정 후 CONFIRMED로 전환
          setConfirmedDestination(targetPlace);
          setPhase('CONFIRMED');
          return; // CONFIRMED로 전환, 검색으로 넘어가지 않음
        }
      } else {
        // ✅ MVP: 목적지가 없을 때: 검색으로 넘어가지 않고 사용자에게 안내
        console.warn('⚠️ [MapPageContainer] 출발 의도 감지했지만 목적지가 없음', {
          hasConfirmedDestination: !!confirmedDestination,
          placesCount: places.length,
          currentPhase: phase,
        });
        
        // 목적지가 없으면 사용자에게 안내하고 검색으로 넘어가지 않음
        speakOnce('먼저 목적지를 검색해주세요');
        
        // 🔥 검색으로 넘어가지 않음 (출발 의도는 처리했으므로)
        return;
      }
    }

    // ✅ MVP: CONFIRMED 상태 음성 명령 처리 (VOICE_ENABLED가 true일 때만)
    if (VOICE_ENABLED && phase === 'CONFIRMED' && confirmedDestination) {
      const handled = handleConfirmedVoiceCommand(q);
      if (handled) {
        console.log('✅ [MapPageContainer] CONFIRMED 음성 명령 처리 완료:', q);
        return; // 명령 처리 완료, 검색으로 넘어가지 않음
      }
    }

    // 🔥 v4 SEARCH ONLY: NAVIGATING 상태만 검색 차단 (CONFIRMED는 허용)
    if (phase === 'NAVIGATING') {
      console.log('🔒 [MapPageContainer] NAVIGATING 상태 보호: 검색 차단', {
        phase,
      });
      return; // 🔥 내비게이션 중에만 검색 불가
    }
    // 🔥 CONFIRMED 상태에서는 검색 허용 (더 정확한 장소 선택 가능)

    // ✅ MVP: 위치가 안정화된 READY가 아니면 검색 차단
    if (locationState.status !== 'READY' || !isStableReady()) {
      console.warn('[SEARCH] blocked - location not stable ready', {
        status: locationState.status,
        isStableReady: isStableReady(),
      });
      return;
    }

    // ✅ MVP: 검색 시작 - phase를 SEARCHING으로 전환
    if (process.env.NODE_ENV === 'development') {
      console.debug('[SEARCH] SETTING PHASE TO SEARCHING', { query: q, currentPhase: phase });
    }
    setQueryText(q);
    // 🔥 핵심 수정: 빈 검색어일 때 기존 마커 유지 (setPlaces([]) 금지)
    // DEV 모드에서는 TEST_PLACES 보호, PROD 모드에서는 Firestore places 보호
    if (!q || q.trim() === '') {
      console.log('🔒 [MapPageContainer] 빈 검색어 → 기존 장소 유지 (places 초기화 차단)');
      // 🔥 빈 검색어일 때는 검색하지 않고 기존 places 유지
      return;
    }
    setPhase('SEARCHING'); // ✅ MVP: phase를 SEARCHING으로 설정
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('[SEARCH] start', {
      query: q,
      center: locationState ? { lat: locationState.lat, lng: locationState.lng } : null,
      locStatus: locationState?.status,
      isStableReady: isStableReady(),
    });
    }
  };

  // ✅ MVP: STT/TTS 완전 비활성화 (훅 자체 사용 안 함)
  // useSpeechToText 훅과 모든 콜백 완전 제거
  
  // ✅ MVP: 더미 값으로 대체 (참조 오류 방지)
  const startListening = () => {
    console.warn('[STT] startListening disabled in MVP mode');
  };
  const stopListening = () => {
    console.warn('[STT] stopListening disabled in MVP mode');
  };
  // 🔥 수정: sttStatus는 useSpeechToText 훅에서 가져오므로 중복 선언 제거
  
  // 🔥 Phase 22: sttStatus와 sttStatusWithTransition 동기화 (위의 useEffect에서 이미 처리되므로 중복 제거)
  // useEffect는 위에서 이미 sttStatus 변경 시 자동 동기화하므로 여기서는 제거

  // ✅ MVP: 릴리즈 - 타이머/인터벌 cleanup (음성 포함)
  useEffect(() => {
    return () => {
      // ✅ MVP: 모든 타이머 정리
      if (navigationCompanionTimerRef.current) {
        clearTimeout(navigationCompanionTimerRef.current);
        navigationCompanionTimerRef.current = null;
      }
      if (arrivalCheckTimerRef.current) {
        clearTimeout(arrivalCheckTimerRef.current);
        arrivalCheckTimerRef.current = null;
      }
      if (stationaryTimerRef.current) {
        clearTimeout(stationaryTimerRef.current);
        stationaryTimerRef.current = null;
      }
      if (arrivalAutoIdleTimerRef.current) {
        clearTimeout(arrivalAutoIdleTimerRef.current);
        arrivalAutoIdleTimerRef.current = null;
      }
      
      // ✅ MVP: 음성 정리 (유령 음성 방지)
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  // ✅ MVP: 추천 완료 시 자동 안내 멘트는 MVP에서 제외 (단순화)
  // useEffect(() => {
  //   // 추천 로직은 MVP에서 제외
  // }, []);
  
  // ✅ MVP: 도착 감지는 MVP에서 제외 (단순화)
  // 🔥 도착 감지: NAVIGATING 중일 때만 (30-50m 반경 또는 멈춤 5초)
  useEffect(() => {
    // ✅ MVP: phase가 NAVIGATING이 아니면 도착 감지 안 함
    if (phase !== 'NAVIGATING') {
      // 타이머 정리
      if (arrivalCheckTimerRef.current) {
        clearTimeout(arrivalCheckTimerRef.current);
        arrivalCheckTimerRef.current = null;
      }
      if (stationaryTimerRef.current) {
        clearTimeout(stationaryTimerRef.current);
        stationaryTimerRef.current = null;
      }
      lastLocationRef.current = null;
      return;
    }
    
    // ✅ MVP: 목적지와 현재 위치가 없으면 감지 안 함
    if (!confirmedDestination?.location || !locationState || locationState.status !== 'READY') {
      return;
    }
    
    // 기존 타이머 클리어
    if (arrivalCheckTimerRef.current) {
      clearTimeout(arrivalCheckTimerRef.current);
    }
    
    // 2초마다 거리 체크
    arrivalCheckTimerRef.current = setTimeout(() => {
      // ✅ MVP: confirmedDestination만 사용
      const destination = confirmedDestination;
      
      if (phase !== 'NAVIGATING' || !destination?.location || !locationState || locationState.status !== 'READY') {
        return;
      }
      
      try {
        const distanceKm = getDistanceKm(
          { lat: locationState.lat, lng: locationState.lng },
          { lat: destination.location.lat, lng: destination.location.lng }
        );
        const distanceM = distanceKm * 1000; // km → m 변환
        
        // ✅ MVP: 도착 판정 (40m 이내)
        console.log('[ARRIVED CHECK]', {
          distanceM: Math.round(distanceM),
          destination: destination.name,
        });
        
        if (distanceM <= 40) {
          // ✅ MVP: ARRIVED 진입은 phase 변경 useEffect에서 로그 출력
          setPhase('ARRIVED');
              
              // 타이머 정리
              if (arrivalCheckTimerRef.current) {
                clearTimeout(arrivalCheckTimerRef.current);
                arrivalCheckTimerRef.current = null;
              }
              if (stationaryTimerRef.current) {
                clearTimeout(stationaryTimerRef.current);
                stationaryTimerRef.current = null;
              }
          lastLocationRef.current = null;
              return;
        }
      } catch (error) {
        console.warn('⚠️ [MapPageContainer] 도착 감지 오류:', error);
      }
    }, 2000); // 2초마다 체크
    
    return () => {
      if (arrivalCheckTimerRef.current) {
        clearTimeout(arrivalCheckTimerRef.current);
        arrivalCheckTimerRef.current = null;
      }
    };
  }, [phase, confirmedDestination, locationState]); // ✅ MVP: phase 기준으로 변경

  // 🔥 출시 전 최종 루프: STT listening 상태에서 3초 이상 무응답 시 1회 멘트
  useEffect(() => {
    // 기존 타이머 클리어
    if (sttNoResponseTimerRef.current) {
      clearTimeout(sttNoResponseTimerRef.current);
      sttNoResponseTimerRef.current = null;
    }
    
    // 조건: listening 상태이고, 말하지 않았을 때
    if (sttStatusWithTransition === 'listening' && isListening && !hasSpoken && isMapReady) {
      // 3초 후 1회 멘트
      sttNoResponseTimerRef.current = setTimeout(() => {
        // 다시 한 번 조건 확인
        if (sttStatusWithTransition === 'listening' && isListening && !hasSpoken) {
          console.log('✅ [MapPageContainer] 출시 전 최종 루프: STT 3초 무응답 → 멘트');
          speakOnce("지금 말해도 괜찮아요");
        }
      }, 3000);
    }
    
    return () => {
      if (sttNoResponseTimerRef.current) {
        clearTimeout(sttNoResponseTimerRef.current);
        sttNoResponseTimerRef.current = null;
      }
    };
  }, [sttStatusWithTransition, isListening, hasSpoken, isMapReady]);

  // 🔥 출시 전 최종 루프: idle 상태에서 5~7초 말 없을 때 미세 멘트 1회
  useEffect(() => {
    // 이미 멘트를 했으면 스킵
    if (longSilenceMentRef.current) return;
    
    // ✅ MVP: 추천 카드는 MVP에서 제외
    const hasRecommendationCard = false;
    
    // 조건: idle 상태, 말하지 않음, 지도 준비됨, listening 아님, 추천 카드 없음
    if (sttStatusWithTransition === 'idle' && !hasSpoken && isMapReady && !isListening && !hasRecommendationCard) {
      // 5~7초 후 1회 멘트 (idleCurious보다 조금 더 늦게)
      const delay = 5000 + Math.random() * 2000; // 5000~7000ms
      const timer = setTimeout(() => {
        // 다시 한 번 조건 확인
        if (sttStatusWithTransition === 'idle' && !hasSpoken && !isListening && !hasRecommendationCard && !longSilenceMentRef.current) {
          longSilenceMentRef.current = true; // 1회 플래그 설정
          console.log('✅ [MapPageContainer] 출시 전 최종 루프: 5~7초 무발화 → 미세 멘트');
          speakOnce("떠오르는 곳 아무거나 말해도 돼요");
        }
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [sttStatusWithTransition, hasSpoken, isMapReady, isListening, searchStatus]); // ✅ MVP: recommendedPlace, selectedPlace 제외

  // 🔥 천재 모드: STT 상태 머신 (idle → curious → suggest)
  // STATE 1: idle → STATE 2: curious (3~5초 무발화)
  useEffect(() => {
    // 기존 타이머 클리어
    if (idleCuriousTimerRef.current) {
      clearTimeout(idleCuriousTimerRef.current);
      idleCuriousTimerRef.current = null;
    }
    
    // STATE 1 → STATE 2 전이 조건:
    // - idle 상태
    // - 말하지 않음 (!hasSpoken)
    // - 지도 준비됨
    // - listening 아님
    // - 추천 카드 없음 (suggest 상태가 아니어야 함)
    // ✅ MVP: 추천 카드는 MVP에서 제외
    const hasRecommendationCard = false;
    
    if (sttStatusWithTransition === 'idle' && !hasSpoken && isMapReady && !isListening && !hasRecommendationCard) {
      setIsIdleCurious(false); // 먼저 리셋
      // 🔥 3~5초 사이 랜덤 (천천히 숨 쉬는 느낌)
      const delay = 3000 + Math.random() * 2000; // 3000~5000ms
      idleCuriousTimerRef.current = setTimeout(() => {
        // 다시 한 번 조건 확인 (상태가 변경되었을 수 있음)
        if (sttStatusWithTransition === 'idle' && !hasSpoken && !isListening && !hasRecommendationCard) {
          setIsIdleCurious(true);
          console.log('✅ [MapPageContainer] 천재 모드: idle → curious (STATE 2)');
        }
      }, delay);
    } else {
      // 다른 상태로 변경되면 리셋 (STATE 2 → STATE 1 복귀)
      setIsIdleCurious(false);
    }
    
    return () => {
      if (idleCuriousTimerRef.current) {
        clearTimeout(idleCuriousTimerRef.current);
      }
    };
  }, [sttStatusWithTransition, hasSpoken, isMapReady, isListening, searchStatus]); // ✅ MVP: recommendedPlace, selectedPlace 제외

  // 🔥 Phase 30: Phase 29 ACK 시점에 TTS 실행
  useEffect(() => {
    if (searchStatus !== "ack") return;
    if (!queryText) return;

    // 사용자 제스처 직후라 TTS 허용됨
    // 🔥 Phase 29.5: 모바일/데스크탑 차등 문구
    const isMobile = isMobileLikeDevice();
    const ttsText = isMobile
      ? `알겠어요. 현재 위치 기준으로 근처 ${queryText}을 찾아볼게요.`
      : `알겠어요. 지금 보고 있는 지도 근처에서 ${queryText}을 찾아볼게요.`;
    speakOnce(ttsText);
  }, [searchStatus, queryText]);

  // 🔥 Phase 13: 첫 방문 감지 및 온보딩 메시지
  // ✅ MVP: 온보딩 메시지 비활성화 (setShowOnboardingMessage 제거됨)
  useEffect(() => {
    if (isFirstVisit() && isMapReady) {
      // ✅ MVP: 온보딩 메시지 없이 바로 완료 처리
        completeOnboarding();
    }
  }, [isMapReady]);

  // 🔥 수정: startSTT는 useSpeechToText 훅에서 가져오므로 중복 선언 제거

  // ✅ MVP: 페이지 진입 후 STT 자동 시작 차단
  // useEffect 제거 - STT 완전 비활성화

  // ✅ MVP: 백그라운드→포그라운드 복귀 STT 자동 재시작 차단
  // useEffect 제거 - STT 완전 비활성화

  // 🔥 no-speech 후 자동 재시작 제거 (무한 루프 방지)
  // 사용자가 직접 ListeningIndicator를 클릭해서 다시 시작하도록 변경
  // useEffect 제거 - 자동 재시작 없음

  // 🔥 Phase 10: 기억 기반 힌트 조회 (최초 1회, Phase 13: 개인화 기본 OFF이므로 비활성화)
  // useEffect(() => {
  //   const latestMemory = getLatestMemory();
  //   if (latestMemory && !searchQuery) {
  //     setMemoryHint(`${latestMemory.keyword} 다시 찾아볼까요?`);
  //   }
  // }, []); // Phase 13: 기본 OFF

  // 🔥 Phase L: 위치 관리는 LocationController에서 처리 (MapPageContainer는 검색어만 관리)

  // 🔥 FINAL LOCK: 반응형 지도 높이 및 가로폭 계산
  useEffect(() => {
    const updateMapDimensions = () => {
      if (isMobileLikeDevice()) {
        setMapHeight('320px'); // 모바일: 320px
        setMapMaxWidth('100%'); // 모바일: 100%
      } else {
        const width = window.innerWidth;
        if (width >= 768 && width < 1024) {
          setMapHeight('420px'); // 태블릿: 420px
          setMapMaxWidth('960px'); // 태블릿: 960px
        } else {
          setMapHeight('420px'); // 데스크탑: 420px
          setMapMaxWidth('1200px'); // 데스크탑: 1200px (와이드)
        }
      }
    };
    
    updateMapDimensions();
    window.addEventListener('resize', updateMapDimensions);
    return () => window.removeEventListener('resize', updateMapDimensions);
  }, []);

  // 🔥 수정: 마이크 버튼 클릭 핸들러 활성화 (locationReady 가드 적용)
  const handleVoiceButtonClick = async () => {
    if (!ENABLE_VOICE) {
      console.warn('[STT] 음성 기능이 비활성화되어 있습니다');
      return;
    }
    
    // 🔥 수정: SEARCHING 상태에서만 마이크 활성화 (locationReady 불필요 - 검색은 fallback 좌표 사용)
    if (phase !== 'SEARCHING') {
      console.log('[STT] SEARCHING 상태로 전환 후 마이크 활성화');
      setPhase('SEARCHING');
      // SEARCHING 상태로 전환 후 마이크 시작
      setTimeout(() => {
        startSTT();
        setSttStatusWithTransition('listening');
      }, 100);
      return;
    }

    // 이미 listening 중이면 중지
    if (isListening) {
      stopSTT();
      setSttStatusWithTransition('idle');
    } else {
      // 마이크 시작
    startSTT();
      setSttStatusWithTransition('listening');
    }
  };

  // 🔥 STEP 4: 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (idleCandidateTimerRef.current) {
        clearTimeout(idleCandidateTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* 🔥 천재 모드: 홈 문장 배너 */}
      <HomeMessageBanner />
      
    <div 
      className="map-root"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh', // 🔥 즉시 해결: 지도 영역 확보 - MapContainer의 높이를 100vh로 고정하고
        zIndex: 0, // 🔥 레이아웃 정리: Z-Index - 지도는 가장 아래(z: 0)
        padding: 0,
        margin: 0,
        overflow: 'hidden',
        pointerEvents: 'auto', // 🔥 즉시 해결: 지도 영역 확보 - 지도는 터치 이벤트 보장
      }}
    >
      {/* 🔥 빌드 스탬프: 새 배포물 확인용 */}
      <div style={{
        position: 'fixed',
        top: 4,
        right: 4,
        zIndex: 99999,
        background: 'red',
        color: 'white',
        padding: '2px 6px',
        fontSize: 12,
        borderRadius: 6,
        fontWeight: 'bold',
        fontFamily: 'monospace',
      }}>
        BUILD: 2026-01-26-01
      </div>
      {/* 🔥 천재 모드: 지도 edge-to-edge (fixed 배경 레이어) */}
      {/* 지도는 MapController 내부에서 fixed로 렌더링됨 */}
      
      {/* 🔥 천재 모드: 상단 타이틀 완전 삭제 - AI의 입은 하나여야 함 (STT 오브젝트만) */}
      {/* ❌ 상단 spacer 완전 제거 - JSX에서 제거 */}
        
        {/* 🔥 천재 모드: 지도 edge-to-edge (박스 제거) */}
        {/* ❌ MapCard 제거 - 지도는 배경 레이어로만 존재 */}
        <Suspense fallback={<div className="fixed inset-0 bg-gray-100 animate-pulse" style={{ zIndex: 0 }} />}>
              <MapController 
            initialCenter={qrLocation || { lat: 37.754, lng: 127.114 }} // 🔥 위치 기반 QR: QR 토큰에서 받은 위치가 있으면 우선 사용, 없으면 기본값 (경기도 의정부시 용민로 420)
            searchQuery={searchQuery}
            searchCenter={searchCenter} // ✅ MVP: 검색 중심점 전달 (ARRIVED → SEARCHING 전환 시 도착 지점 기준)
            voiceEnabled={ENABLE_VOICE}
            isListening={isListening} // 🔥 Phase 20: 음성 인식 상태 전달
            hasSpoken={hasSpoken} // 🔥 Phase 21: 사용자가 말하기 시작했는지 전달
            sttStatus={sttStatusWithTransition} // 🔥 Phase 22: 상태 전이 포함 STT 상태 전달
            navIntent={navIntent} // 🔥 Phase 22: 네비게이션 의도 상태 전달
            recognizedText={recognizedText} // 🔥 Phase 22: 인식된 문장 전달
            onStartListening={handleVoiceButtonClick} // 🔥 STT 시작 핸들러 (ListeningIndicator 클릭용)
            showSpeechAck={showSpeechAck} // 🔥 Phase 29: STT 결과 즉각 반응 카드 표시 여부
            speechAckQuery={pendingSearchQuery || recognizedText || ''} // 🔥 Phase 29: 반응 카드에 표시할 검색어
            isIdleCurious={isIdleCurious} // 🔥 천재 모드: idle 상태 3초 경과 후 "관심" 상태
            isNavigating={phase === 'NAVIGATING'} // ✅ MVP: NAVIGATING에서는 마이크 비활성화
            onPlaceSelected={() => {
              // 🔥 Phase 31: 장소 선택 시 navIntent를 'intent-detected'로 설정하여 Phase 28 재진입
              setNavIntent('intent-detected');
              if (process.env.NODE_ENV === 'development') {
                console.debug('[MapPageContainer] Phase 31: 장소 선택 → Phase 28 재진입');
              }
            }}
            // 🔥 Phase 30: 새로운 검색 상태 전달
            searchStatus={searchStatus}
            queryText={queryText}
            places={places} // 🔥 Phase 30: 검색 결과 전달
            searchPhase={searchPhase} // 🔥 Phase 30: 검색 단계 전달
            phase={phase} // ✅ MVP: phase 상태 전달
            selectedPlace={confirmedDestination} // ✅ MVP: confirmedDestination을 selectedPlace로 전달 (NAVIGATING 시 경로 계산용)
            previewPlace={previewPlace} // 🔥 정상 지도 페이지: 단일 마커 상태
            onRouteError={() => {
              // ✅ MVP: 길 찾기 실패 처리 (NAVIGATING 진입 차단, ARRIVED 차단)
              if (process.env.NODE_ENV === 'development') {
                console.debug('[ROUTE] 길 찾기 실패 - routeError 설정');
              }
              setRouteError(true);
              // ✅ MVP: phase를 CONFIRMED로 복귀 (NAVIGATING 진입 차단)
              if (phase === 'NAVIGATING') {
                setPhase('CONFIRMED');
              }
            }}
            onPlacesUpdate={(newPlaces) => {
              // 🔥 핵심 수정: 빈 배열이면 기존 places 유지 (setPlaces([]) 금지)
              if (!newPlaces || newPlaces.length === 0) {
                console.log('🔒 [MapPageContainer] onPlacesUpdate: 빈 배열 → 기존 장소 유지');
                return; // 빈 배열이면 업데이트하지 않음
              }
              
              // 🔥 핵심: 검색 결과는 항상 업데이트 (navUIState와 무관)
              // navUIState === 'SEARCH'일 때만 PlaceResultCard가 렌더링되므로,
              // 결과 데이터는 항상 최신 상태로 유지해야 함
              setPlaces(newPlaces);
              
              // 🔥 AI 응답 말풍선: places가 새로 들어올 때 요약 다시 열기
              if (newPlaces && newPlaces.length > 0) {
                setShowAiSummary(true);
              }
              
              if (newPlaces.length > 0) {
                console.log('[SEARCH] 결과 수신:', {
                  placesCount: newPlaces.length,
                  phase,
                  navUIState,
                });
                // ✅ MVP: 결과 2개 이상일 때는 SEARCHING 상태 유지 (사용자 선택 대기)
              } else {
                // ✅ MVP: 검색 결과 0개 - SEARCHING 상태 유지 (자동 재검색 ❌, 상태 점프 ❌)
                console.log('[SEARCH] 결과 없음 - SEARCHING 상태 유지');
                // ✅ MVP: EmptyState가 표시됨 (사용자 주도 재시도)
              }
            }}
            onSelectPlace={(place) => {
              // ✅ MVP: NAVIGATING 중에는 장소 선택 차단
              if (phase === 'NAVIGATING') {
                setToastMessage('이동 중에는 목적지를 변경할 수 없어요');
                return;
              }
              
              // ✅ MVP: CONFIRMED 상태에서는 마커 클릭으로 상태 변경 차단
              if (phase === 'CONFIRMED') {
                console.log('🔒 [MapPageContainer] CONFIRMED 상태 보호: 마커 클릭으로 상태 변경 차단');
                return;
              }
              
              // 🔥 AI 비서 지도: 마커 클릭 시 previewPlace도 함께 설정 (장소 카드 표시용)
              // place는 PlaceLite 타입이거나 location 객체를 가질 수 있음
              const placeLat = place.lat ?? (place.location?.lat ?? (typeof place.location?.lat === 'function' ? place.location.lat() : undefined));
              const placeLng = place.lng ?? (place.location?.lng ?? (typeof place.location?.lng === 'function' ? place.location.lng() : undefined));
              
              if (placeLat && placeLng && place.name) {
                setPreviewPlace({
                  id: place.placeId || place.id || '',
                  lat: placeLat,
                  lng: placeLng,
                  name: place.name,
                  address: place.address,
                });
              }
              
              // ✅ MVP: 장소 선택 시 confirmedDestination으로 확정하고 CONFIRMED로 전환
              setConfirmedDestination(place);
              setPhase('CONFIRMED');
              
              console.log('[RECO] pick', {
                placeId: place.placeId,
                name: place.name,
                center: locationState ? { lat: locationState.lat, lng: locationState.lng } : null,
              });
            }}
            onStartNavigation={handleStartNavigation}
            onWaitNavigation={() => {
              // ✅ MVP: onWaitNavigation은 MVP에서 제외 (단순화)
            }}
            showConfirmStart={showConfirmStart}
            navigationStarted={navigationStarted}
            onMapReady={() => {
              setIsMapReady(true);
              console.log('[MapPageContainer] 지도 준비 완료');
            }} // 🔥 Phase 13: 지도 로드 완료 콜백
            onRouteInfoUpdate={(info) => {
              // 🔥 네비 UI: 경로 정보 업데이트
              setRouteInfo(info);
              setIsRouteCalculating(false); // 경로 계산 완료
              setRouteFailedReason(null); // 경로 성공 시 실패 이유 초기화
            }}
            onRouteFailed={(reason) => {
              // 🔥 네비 UI: 경로 계산 실패 처리
              console.log('[NAV] 경로 계산 실패:', reason);
              setRouteFailedReason(reason);
              setIsRouteCalculating(false);
              setRouteInfo(null);
            }}
            onTryWalking={() => {
              // 🔥 도보 경로 시도 요청
              console.log('[NAV] 도보 경로 시도 요청');
              setIsRouteCalculating(true);
              setRouteFailedReason(null);
              // MapController에서 도보 모드로 경로 재계산
            }}
            onMapInteraction={(type) => {
              // ✅ MVP: NAVIGATING 또는 CONFIRMED 상태에서는 지도 인터랙션 무시
              if (phase === 'NAVIGATING' || phase === 'CONFIRMED') {
                console.log('🔒 [MapPageContainer] phase 보호: 지도 인터랙션 무시', {
                  type,
                  phase,
                });
                return;
              }
              
              // ✅ MVP: 지도 인터랙션은 IDLE 또는 SEARCHING 상태에서만 허용
              if (type === 'dragstart' || type === 'zoom') {
                // 지도 이동/줌 시작 시 IDLE로 복귀
                // 🔥 핵심: 검색 결과는 유지 (사용자가 지도를 움직여도 결과는 보임)
                if (phase === 'SEARCHING') {
                  setPhase('IDLE');
                  // setPlaces([]); 제거: 결과 유지
                }
                // 🔥 STEP 4: 타이머 클리어
                if (idleCandidateTimerRef.current) {
                  clearTimeout(idleCandidateTimerRef.current);
                  idleCandidateTimerRef.current = null;
                }
                setShowIdleCandidate(false);
                setMapPhase('moving');
                console.log('🗺️ [MapPageContainer] 인터랙션: 지도 이동 시작 → moving');
              } else if (type === 'idle') {
                // 지도 이동 완료 (debounce 후) → idle 상태로 복귀
                console.log('🗺️ [MapPageContainer] 인터랙션: 지도 이동 완료 → idle');
                setMapPhase('idle');
                setShowIdleCandidate(false);
                // 🔥 STEP 4: 500ms 후 idleCandidate 상태로 전환 (타이머 설정)
                if (idleCandidateTimerRef.current) {
                  clearTimeout(idleCandidateTimerRef.current);
                }
                idleCandidateTimerRef.current = setTimeout(() => {
                  // 500ms 후에도 여전히 idle 상태면 후보 상태로 전환
                  setShowIdleCandidate(true);
                }, 500);
                // 필요 시 추가 로직 (예: 근처 장소 자동 검색 제안 등)
              }
            }} // 🔥 인터랙션 단계: 지도 인터랙션 이벤트 핸들러
          />
        </Suspense>
        
        {/* ✅ MVP: 테스트 버튼 - 개발 환경에서만 표시 (프로덕션 빌드에서는 자동 제거) */}
        {/* 🔥 테스트 버튼 제거: UI 시야 방해 및 프로덕션에서 불필요 */}
        {false && import.meta.env.DEV && (
          <button
            onClick={() => {
              console.log('[TEST] FORCE SEARCHING');
              console.log('[TEST] 현재 phase:', phase);
              setPhase('SEARCHING');
              setSearchQuery('카페');
              setQueryText('카페');
            }}
            style={{
              position: 'fixed',
              top: '80px',
              left: '16px',
              zIndex: 9999,
              padding: '12px 24px',
              borderRadius: '8px',
              background: '#2563eb',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
              transition: 'all 0.2s',
            }}
          >
            테스트: 검색 시작
          </button>
        )}
        
        {/* 🔥 레이아웃 최종 수리: 마이크 버튼 통합 - 화면 우측 하단의 파란 마이크 버튼을 삭제해 (검색창 안으로 이동 완료) */}

        {/* 🔥 천재 모드: 내 위치 버튼 (fixed, AI 레이어) */}
        <div 
          style={{ 
            position: 'fixed', 
            bottom: '80px', 
            right: '16px', 
            zIndex: 25,
            pointerEvents: 'auto', // ✅ MVP: 내 위치 버튼 터치 이벤트 보장
          }}
        >
        <MyLocationButton 
          onClick={() => {
              // 🔥 정답 구조: 고정 좌표로 지도 이동 보장 (GPS 요청 없이)
              console.log('📍 [MapPageContainer] 내 위치 버튼 클릭', {
                lat: MY_LOCATION.lat,
                lng: MY_LOCATION.lng,
                phase,
                locationStatus: locationState?.status,
              });
              
              // 1️⃣ locationState 업데이트 (마커 표시를 위해)
              updateFromMap(MY_LOCATION.lat, MY_LOCATION.lng);
              
              // 2️⃣ MapController의 useEffect가 감지하여 moveToMyLocation → map.panTo 직접 호출
              // (updateFromMap 호출로 locationState.source === 'map'이 되면 자동으로 실행됨)
              
              console.log('✅ [MapPageContainer] 내 위치 버튼 클릭 - locationState 업데이트 완료');
          }}
        />
          </div>
      
      {/* ✅ MVP: 추천 결과 선언 카드는 MVP에서 제외 (단순화) */}
      {/* {searchStatus === "results" && recommendedPlace && queryText && !selectedPlace && searchPhase !== 'confirmed' && searchPhase !== 'navigating' && ( */}
      {false && (
            <div
              style={{
                position: 'fixed', // 🔥 천재 모드: fixed로 변경
                bottom: '80px', // 🔥 safe-area 기준 (하단 네비게이션 고려)
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100% - 32px)', // 🔥 좌우 여백 16px씩
                maxWidth: '500px', // 🔥 최대 너비 제한
                padding: '20px',
                borderRadius: '16px', // 🔥 AI 레이어 입체감
                background: '#ffffff',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)', // 🔥 AI 레이어 입체감
                animation: 'fadeInUp 0.3s ease-out',
                zIndex: 20, // 🔥 추천 카드 레이어
              }}
            >
              {/* 🔥 추천 선언 문구 (천재 모드: AI 의견 + 거부권 + 음성 우선권) */}
              {(() => {
                const ment = getRecommendationMent(recommendedPlace, queryText);
                return (
                  <div
                    style={{
                      marginBottom: '16px',
                      textAlign: 'center',
                    }}
                  >
                    {/* 🔥 AI 의견: 이유 설명 (3요소 1번) */}
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#666',
                        marginBottom: '12px',
                        lineHeight: '1.5',
                      }}
                    >
                      {ment.reason}
                    </div>
                    
                    {/* 🔥 장소 이름 (강조) */}
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#1a73e8',
                        marginBottom: '8px',
                      }}
                    >
                      {recommendedPlace.name}
                    </div>
                    
                    {/* 🔥 거리 정보 */}
                    {recommendedPlace.distanceM && (
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#666',
                          marginBottom: '12px',
                        }}
                      >
                        약 {recommendedPlace.distanceM < 1000 
                          ? `${recommendedPlace.distanceM}m`
                          : `${(recommendedPlace.distanceM / 1000).toFixed(2)}km`
                        } 거리
                      </div>
                    )}
                    
                    {/* 🔥 거부권 제공 (3요소 2번) + 대안 기준 */}
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: '400',
                        color: '#999',
                        lineHeight: '1.5',
                        fontStyle: 'italic',
                        marginBottom: '8px',
                      }}
                    >
                      {ment.alternative || '마음에 안 들면 바로 바꿔도 돼요'}
                    </div>
                  </div>
                );
              })()}
              
              {/* 🔥 음성 우선권 안내 (3요소 3번) */}
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: '400',
                  color: '#999',
                  textAlign: 'center',
                  marginBottom: '12px',
                  lineHeight: '1.4',
                  fontStyle: 'italic',
                }}
              >
                💬 말로 해도 똑같이 돼요
              </div>

              {/* 🔥 사용자 선택 버튼 */}
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                }}
              >
                <button
                  onClick={() => {
                    if (!recommendedPlace) return;
                    console.log('✅ [MapPageContainer] 추천 장소 선택:', recommendedPlace.name);
                    
                    // 🔥 기능 테스트 계측: 추천 수락
                    trackRecommendAccept(
                      recommendedPlace.name,
                      sttStatusWithTransition,
                      searchStatus
                    );
                    
                    // ✅ MVP: 목적지 확정 (phase 기준)
                    console.log('[FORCE] SETTING CONFIRMED from recommendation card', {
                      place: recommendedPlace.name,
                    });
                    setConfirmedDestination(recommendedPlace);
                    setPhase('CONFIRMED');
                    
                    // 🔥 MapController의 onSelectPlace 콜백 호출 (Phase 28 카드 표시용)
                    // onSelectPlace는 MapController에서 selectedPlace prop 변경을 감지하여 처리
                  }}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    borderRadius: '10px',
                    background: '#1a73e8',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(26, 115, 232, 0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1557b0';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 115, 232, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#1a73e8';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(26, 115, 232, 0.2)';
                  }}
                >
                  여기로 갈게요
                </button>
                {places.length > 1 && (
                  <button
                    onClick={() => {
                      console.log('🔄 [MapPageContainer] 다른 곳 보기');
                      
                      // 🔥 기능 테스트 계측: 추천 거절
                      if (recommendedPlace) {
                        trackRecommendReject(
                          recommendedPlace.name,
                          sttStatusWithTransition,
                          searchStatus
                        );
                      }
                      
                      // 🔒 CONFIRMED 상태 보호: 목적지 확정 상태에서는 추천 변경 차단
                      if (confirmedPlace && (searchPhase === 'confirmed' || searchPhase === 'navigating' || searchPhase === 'arrived')) {
                        console.log('🔒 [MapPageContainer] CONFIRMED 상태 보호: 추천 변경 차단');
                        return; // 🔒 CONFIRMED 상태에서는 추천 변경하지 않음
                      }
                      
                      // 🔥 다음 장소로 추천 변경 (간단하게 두 번째 장소로)
                      if (places.length > 1) {
                        setRecommendedPlace(places[1]);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '14px 24px',
                      borderRadius: '10px',
                      background: '#f5f5f5',
                      color: '#1a1a1a',
                      border: '1px solid #e0e0e0',
                      fontSize: '15px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#eeeeee';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f5f5f5';
                    }}
                  >
                    다른 곳 볼래요
                  </button>
                )}
              </div>
              
              {/* 🔥 천재 모드: 인터랙션 힌트 (추천 카드 하단, 작은 텍스트) */}
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: '400',
                  color: '#999',
                  textAlign: 'center',
                  marginTop: '12px',
                  opacity: 0.6, // 🔥 보조 톤
                  lineHeight: '1.4',
                  pointerEvents: 'none', // 🔥 클릭 불가 (힌트용)
                }}
              >
                👆 지도를 움직여 다른 곳도 볼 수 있어요
              </div>
            </div>
          )}
          
          {/* ❌ 정상 지도 페이지: ActionCard 비활성화 (경로/출발 기능 제외) */}
          {false && (
            <ActionCard
              state={
                mapPhase === 'selected' ? 'selected' : 
                mapPhase === 'moving' ? 'moving' : 
                searchStatus === 'error' ? 'error' : 
                (mapPhase === 'idle' && showIdleCandidate) ? 'idleCandidate' :
                'idle'
              }
              placeName={confirmedDestination?.name || ''}
              isNavigating={phase === 'NAVIGATING'}
              onNavigate={() => {
                // ❌ 정상 지도 페이지: 네비게이션 기능 제외
              }}
              onRetry={() => {
                // ❌ 정상 지도 페이지: 재시도 기능 제외
              }}
            />
          )}
          
          {/* 🔒 CONFIRMED UI: 별도 렌더 루트로 분리 (MapController와 완전 분리, unmount 방지) */}
          {/* 🔒 이 컴포넌트는 places, recommendedPlace, searchPhase 변경과 무관하게 렌더링됨 */}
          {/* 🔒 렌더링 조건: destination만 확인 (phase는 "어떻게 보일지"만 결정) */}
          {confirmedDestination && (
            <>
              {/* 🔒 목적지 확정: 장소 이름 라벨 (CONFIRMED/ARRIVED 상태 시각화) - key 필수 (리마운트 방지) */}
              {/* 🔥 정상 지도 페이지: 네비 잔재 UI 제거 (DestinationLabel 비활성화) */}
              {false && (navUIState === 'SELECTED' || navUIState === 'PRE_NAV' || navUIState === 'NAVIGATING' || navUIState === 'ARRIVED') && confirmedDestination && (
                <DestinationLabel 
                  key={`destination-label-${confirmedDestination.placeId}`}
                  placeName={confirmedDestination.name || ''}
                  isVisible={true}
                />
              )}
              
              {/* 🔥 통합 네비게이션 카드: SELECTED, PRE_NAV, NAVIGATING, ARRIVED를 하나의 카드로 처리 */}
              {/* 🔥 정상 지도 페이지: 네비 잔재 UI 제거 (NavigationCard 비활성화) */}
              {false && (navUIState === 'SELECTED' || navUIState === 'PRE_NAV' || navUIState === 'NAVIGATING' || navUIState === 'ARRIVED') && confirmedDestination && (
                <NavigationCard
                  key={`navigation-card-${confirmedDestination.placeId}`}
                  place={{
                    name: confirmedDestination.name || '',
                    distance: confirmedDestination.distanceM,
                    address: confirmedDestination.address,
                  }}
                  mode={
                    phase === 'ARRIVED' ? 'ARRIVED' :
                    phase === 'NAVIGATING' ? 'NAVIGATING' :
                    phase === 'PRE_NAVIGATING' ? 'PRE_NAVIGATING' :
                    'CONFIRMED'
                  }
                  routeInfo={(phase === 'PRE_NAVIGATING' || phase === 'NAVIGATING') ? routeInfo : undefined} // 🔥 네비 UI: 경로 정보 전달
                  isRouteCalculating={(phase === 'PRE_NAVIGATING' || phase === 'NAVIGATING') ? isRouteCalculating : false} // 🔥 네비 UI: 경로 계산 중 여부
                  routeFailedReason={(phase === 'PRE_NAVIGATING' || phase === 'NAVIGATING') ? routeFailedReason : null} // 🔥 네비 UI: 경로 실패 이유
                  onTryWalking={
                    // 🔥 도보 경로 시도: ZERO_RESULTS일 때만 활성화
                    phase === 'PRE_NAVIGATING' && routeFailedReason === 'ZERO_RESULTS' && confirmedDestination
                      ? () => {
                          console.log('[NAV] 도보 경로 시도');
                          // 도보 모드로 경로 재계산
                          setIsRouteCalculating(true);
                          setRouteFailedReason(null);
                          // MapController에 도보 모드로 경로 계산 요청
                          // (MapController의 calculateRoute가 도보 모드로 재실행되도록 트리거)
                          // 임시: phase를 다시 PRE_NAVIGATING으로 설정하여 경로 재계산 트리거
                          // TODO: MapController에 도보 모드 전용 경로 계산 함수 추가 필요
                        }
                      : undefined
                  }
                  disabled={
                    // 🔥 2단계: GPS 없을 때 출발 버튼 비활성화
                    phase === 'PRE_NAVIGATING' && (
                      !locationState || 
                      locationState.status !== 'READY' || 
                      locationState.source === 'default'
                    )
                  }
                  disabledReason={
                    // 🔥 2단계: 비활성화 이유 메시지
                    phase === 'PRE_NAVIGATING' && (
                      !locationState || 
                      locationState.status !== 'READY' || 
                      locationState.source === 'default'
                    ) ? '현재 위치를 확인할 수 없습니다' : undefined
                  }
                  onStart={
                    phase === 'CONFIRMED' ? () => {
                      // 🔥 CONFIRMED → PRE_NAVIGATING 전환
                      console.log('[NAV] CONFIRMED → PRE_NAVIGATING');
                      setPhase('PRE_NAVIGATING');
                      setIsRouteCalculating(true);
                    } :
                    phase === 'PRE_NAVIGATING' ? () => {
                      // 🔥 Step 2: 출발 버튼 클릭 시 즉각적인 피드백
                      setIsStartButtonPressed(true);
                      // 150ms 후 지도 연출 시작
                      setTimeout(() => {
                        handleStartNavigation();
                        // 300ms 후 UI 스왑 완료
                        setTimeout(() => {
                          setIsStartButtonPressed(false);
                        }, 300);
                      }, 150);
                    } :
                    undefined
                  }
                  onStop={
                    phase === 'NAVIGATING' ? handleStopNavigation :
                    phase === 'ARRIVED' ? resetToIdle :
                    undefined
                  }
                  onWait={phase === 'CONFIRMED' ? () => {
                    // ✅ MVP: CONFIRMED에서 취소 시 SEARCHING 복귀 (상태 안전)
                    console.log('[CONFIRMED] 취소 → SEARCHING 복귀');
                    setPhase('SEARCHING');
                    // ✅ MVP: confirmedDestination은 유지 (다시 선택 가능)
                  } : undefined}
                  onGoToMarket={phase === 'ARRIVED' ? () => {
                    // ✅ MVP: ARRIVED 상태에서 주변 보기 (도착 지점 기준 SEARCHING)
                    if (!confirmedDestination) {
                      console.warn('[ARRIVED] 주변 보기 blocked - no destination');
                      return;
                    }
                    if (process.env.NODE_ENV === 'development') {
                      console.debug('[ARRIVED] 주변 보기');
                    }
                    setSearchQuery('주변');
                    setQueryText('주변');
                    // ✅ MVP: searchCenter를 도착 지점으로 명시적 설정
                    setSearchCenter({
                      lat: confirmedDestination.location.lat,
                      lng: confirmedDestination.location.lng,
                    });
                    setPhase('SEARCHING');
                  } : undefined}
                  onSearchNearby={phase === 'ARRIVED' ? searchNearby : undefined}
                />
              )}
              
              {/* 🔥 정상 지도 페이지: 네비 잔재 UI 제거 (RouteErrorCard 비활성화) */}
              {false && routeError && (
                <RouteErrorCard
                  title="길을 찾을 수 없어요"
                  actions={[
                    {
                      label: '다시 시도',
                      onClick: () => {
                        setRouteError(false);
                        // ✅ MVP: 경로 재계산 (handleStartNavigation 재호출)
                        if (confirmedDestination) {
                          handleStartNavigation();
                        }
                      },
                    },
                    {
                      label: '취소',
                      onClick: () => {
                        setRouteError(false);
                        resetToIdle();
                      },
                    },
                  ]}
                />
              )}
              
              {/* ✅ MVP: PlaceDetailSheet는 MVP에서 제외 (단순화) */}
              {/* {phase === 'CONFIRMED' && confirmedDestination && (
                <PlaceDetailSheet
                  place={{
                    name: confirmedDestination.name || '',
                    address: confirmedDestination.address,
                    distance: confirmedDestination.distanceM,
                    category: confirmedDestination.category,
                    imageUrl: confirmedDestination.imageUrl,
                    rating: confirmedDestination.rating,
                    placeId: confirmedDestination.placeId,
                  }}
                  isVisible={true}
                  onViewDetails={() => {
                    console.log('📍 [MapPageContainer] 위치 상세보기', confirmedDestination.name);
                  }}
                />
              )} */}
              
              {/* 🔒 Phase 28: 네비게이션 시작 확인 카드 - 레거시 코드 제거됨 (NavigationCard로 통합 완료) */}
            </>
          )}
          
          {/* ❌ 정상 지도 페이지: 네비 UI 완전 제거 */}
          {false && <DebugBadge state={navUIState} />}
          {false && <StartButtonFeedback isPressed={isStartButtonPressed} />}
          {false && <PhaseStatusIndicator phase={phase} />}

          {/* 🔥 네비 UI: 상단 상태바 (PRE_NAV/NAVIGATING일 때 표시) */}
          {/* 🔥 핵심: navUIState만 본다 */}
          {/* 🔥 정상 지도 페이지: 네비 잔재 UI 제거 (NavigationStatusBar 비활성화) */}
          {false && navUIState === 'PRE_NAV' && confirmedDestination && (
            <NavigationStatusBar
              destinationName={confirmedDestination.name || ''}
              travelMode="DRIVING"
              distance={routeInfo?.distance}
              duration={routeInfo?.duration}
              isCalculating={isRouteCalculating}
              statusText="🚗 출발 준비됨"
            />
          )}
          {false && navUIState === 'NAVIGATING' && confirmedDestination && (
            <NavigationStatusBar
              destinationName={confirmedDestination.name || ''}
              travelMode="DRIVING"
              distance={routeInfo?.distance}
              duration={routeInfo?.duration}
              isCalculating={isRouteCalculating}
            />
          )}

          {/* 🔥 레이아웃 전면 재배치: 검색창 독립 (Floating Search) - SearchBar를 상단 Header 컴포넌트 밖으로 꺼내줘 */}
          {/* ✅ MVP: SEARCH/SELECTED 상태에서 검색 입력창 표시 (헤더 아래) */}
          {/* 🔥 핵심: navUIState만 본다, phase 조건 제거 */}
          {/* 🔥 레이아웃 분리: 검색창과 경로 탐색 모드 UI를 하나의 컨테이너로 묶어서 flexbox로 배치 */}
          <div
            style={{
              position: 'fixed',
              top: `${HEADER_HEIGHT}px`,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '90%',
              maxWidth: '500px',
              zIndex: 1100, // 🔥 Z-index 정렬: 공통 헤더(z-index: 1200), 검색창(z-index: 1100), 지도(z-index: 1) 순서로 레이어를 정확히 정렬해서 서로 클릭을 방해하지 않게 해줘
              display: 'flex',
              flexDirection: 'column', // 🔥 레이아웃 분리: 검색창 아래에 탭바가 순서대로 오게
              gap: '10px', // 🔥 검색창-탭바 간격: 탭바가 검색창 뒤로 숨지 않도록 간격 확보
              pointerEvents: 'auto',
            }}
          >
            {/* 🔥 검색창: 경로 탐색 모드가 비활성화일 때만 표시 */}
            {(navUIState === 'SEARCH' || navUIState === 'SELECTED') && !currentRouteResult?.routes?.[0]?.legs?.[0] && (
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08), 0 4px 24px rgba(0, 0, 0, 0.04)',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
              <span style={{ fontSize: '16px' }}>🔍</span>
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => {
                  // 🔥 검색창 입력 핸들러: try-catch로 크게 감싸서 에러 방지
                  try {
                    setSearchQuery(e.target.value);
                    setQueryText(e.target.value);
                  } catch (error) {
                    console.warn('[MapPageContainer] 검색 입력 핸들러 에러:', error);
                    // 🔥 에러 발생해도 앱이 죽지 않도록 조용히 처리
                  }
                }}
                onFocus={() => {
                  // 🔥 핵심 수정: IDLE에서 포커스 시 SEARCHING 진입
                  if (phase === 'IDLE') {
                    console.log('[SEARCH] 포커스 → SEARCHING 진입', { phase });
                    setPhase('SEARCHING');
                  }
                }}
                onKeyPress={(e) => {
                  // 🔥 검색창 입력 핸들러: try-catch로 크게 감싸서 에러 방지
                  try {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      setSearchQuery(e.currentTarget.value.trim());
                      setQueryText(e.currentTarget.value.trim());
                    }
                  } catch (error) {
                    console.warn('[MapPageContainer] 검색 입력 핸들러(Enter) 에러:', error);
                    // 🔥 에러 발생해도 앱이 죽지 않도록 조용히 처리
                  }
                }}
                placeholder="장소를 검색하거나 AI에게 물어보세요"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '15px',
                  background: 'transparent',
                  color: '#1a1a1a',
                }}
              />
              {/* 🔥 세련된 마이크 아이콘 적용: 검색창 우측의 마이크를 구형 아이콘이 아닌, Lucide-React의 Mic 또는 Google Material 아이콘으로 교체해 */}
              {startSTT && (
                <button
                  type="button"
                  title='예: "근처 조용한 카페 추천해줘"'
                  aria-label='음성으로 AI에게 질문하기. 예: "근처 조용한 카페 추천해줘"'
                  onClick={(e) => {
                    e.stopPropagation();
                    startSTT();
                  }}
                  style={{
                    width: '36px', // 🔥 검색창 및 마이크 디자인 고도화: 마이크 아이콘은 현재의 파란색 원형 버튼 스타일을 유지하되, 크기를 검색창 높이에 딱 맞게 미세 조정해서 더 일체감 있게 만들어줘
                    height: '36px', // 🔥 검색창 및 마이크 디자인 고도화: 마이크 아이콘은 현재의 파란색 원형 버튼 스타일을 유지하되, 크기를 검색창 높이에 딱 맞게 미세 조정해서 더 일체감 있게 만들어줘
                    borderRadius: '50%',
                    background: isListening 
                      ? 'linear-gradient(135deg, #1A5FFF 0%, #4285F4 100%)' // 🔥 세련된 마이크 아이콘 적용: 아이콘에 일렉트릭 블루(#1A5FFF) 색상을 적용하고
                      : 'transparent',
                    border: isListening ? 'none' : '2px solid #1A5FFF', // 🔥 세련된 마이크 아이콘 적용: 일렉트릭 블루 테두리
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    padding: 0,
                    margin: 0,
                    boxShadow: isListening 
                      ? '0 0 20px rgba(26, 95, 255, 0.6), 0 4px 16px rgba(26, 95, 255, 0.4)' // 🔥 세련된 마이크 아이콘 적용: 약간의 글로우(Glow) 효과를 주어 'AI 비서' 느낌을 극대화해줘
                      : '0 0 10px rgba(26, 95, 255, 0.3), 0 2px 8px rgba(26, 95, 255, 0.2)', // 🔥 세련된 마이크 아이콘 적용: 비활성 상태에도 약한 글로우 효과
                  }}
                  onMouseEnter={(e) => {
                    if (!isListening) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(26, 95, 255, 0.15) 0%, rgba(66, 133, 244, 0.15) 100%)';
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = '0 0 15px rgba(26, 95, 255, 0.5), 0 4px 12px rgba(26, 95, 255, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isListening) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 0 10px rgba(26, 95, 255, 0.3), 0 2px 8px rgba(26, 95, 255, 0.2)';
                    }
                  }}
                >
                  <Mic 
                    size={20} 
                    style={{ 
                      color: isListening ? '#FFFFFF' : '#1A5FFF', // 🔥 세련된 마이크 아이콘 적용: 아이콘에 일렉트릭 블루(#1A5FFF) 색상을 적용하고
                      strokeWidth: 2.5,
                      transition: 'all 0.3s',
                      filter: isListening ? 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))' : 'none', // 🔥 세련된 마이크 아이콘 적용: 약간의 글로우(Glow) 효과를 주어 'AI 비서' 느낌을 극대화해줘
                    }} 
                  />
                </button>
              )}
              </div>
            )}
            
            {/* 🔥 AI 비서 지도: 검색창 아래 AI 안내 문구 + 예시 질문 */}
            {(navUIState === 'SEARCH' || navUIState === 'SELECTED') && !currentRouteResult?.routes?.[0]?.legs?.[0] && (
              <AiHintRow
                onPromptClick={(text) => {
                  // ✅ 검색어 설정 → 자동으로 MapController가 검색 실행
                  setSearchQuery(text);
                  setQueryText(text);
                  setPhase('SEARCHING'); // 검색 상태로 전환
                }}
              />
            )}

            {/* 🔥 경로 탐색 모드 UI: 경로 입력바 및 이동 수단 선택 탭 */}
            {currentRouteResult?.routes?.[0]?.legs?.[0] && (
              <>
                {/* 🔥 상단 경로 입력바: 내 위치와 도착지 표시 */}
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>내 위치</div>
                    <div style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 600 }}>
                      {locationState && locationState.status === 'READY' && locationState.source !== 'default'
                        ? '현재 위치'
                        : '위치 확인 중...'}
                    </div>
                  </div>
                  <div style={{ fontSize: '20px', color: '#999' }}>→</div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>도착지</div>
                    <div style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 600 }}>
                      {places.find(p => p.id === confirmedDestination?.id)?.name || confirmedDestination?.name || '의정부'}
                    </div>
                  </div>
                </div>

                {/* 🔥 이동 수단 선택 탭: 입력바 바로 아래 */}
                <div style={{ marginTop: '0' }}>
                  <TransportTabs
                    currentMode={currentTravelMode}
                    onSelect={async (mode) => {
                      console.log('✅ [MapPageContainer] 이동 수단 선택:', mode);
                      setCurrentTravelMode(mode);
                      
                      // 🔥 경로 재계산: 선택한 이동 수단으로 경로 갱신
                      if (locationState && locationState.status === 'READY' && locationState.source !== 'default' && confirmedDestination) {
                        setIsRouteCalculating(true);
                        const mapController = (window as any).__MAP_CONTROLLER__;
                        if (mapController?.calculateRoute) {
                          // Google Maps TravelMode 매핑
                          const google = window.google?.maps;
                          if (google) {
                            const travelModeMap: Record<'WALKING' | 'DRIVING' | 'TRANSIT', google.maps.TravelMode> = {
                              WALKING: google.TravelMode.WALKING,
                              DRIVING: google.TravelMode.DRIVING,
                              TRANSIT: google.TravelMode.TRANSIT,
                            };
                            
                            try {
                              // 🔥 PlaceLite 타입에 location이 없을 수 있으므로 lat, lng 직접 사용
                              const destLat = confirmedDestination.lat || (confirmedDestination as any).location?.lat;
                              const destLng = confirmedDestination.lng || (confirmedDestination as any).location?.lng;
                              
                              if (!destLat || !destLng) {
                                console.warn('⚠️ [MapPageContainer] 목적지 좌표 없음');
                                return;
                              }
                              
                              // 🔥 출발지 하드코딩: calculateRoute 함수의 origin 파라미터에 현재 위치 대신 사용자님이 알려주신 주소(경기도 의정부시 용민로 420)를 직접 입력하도록 수정해야 합니다.
                              // 🔥 출발지 주소 고정: 경기도 의정부시 용민로 420 (37.754, 127.114)
                              const FIXED_ORIGIN = { lat: 37.754, lng: 127.114 }; // 경기도 의정부시 용민로 420
                              console.log('[위치확정] 출발지: 용민로 420 (37.754, 127.114)');
                              
                              const result = await mapController.calculateRoute(
                                FIXED_ORIGIN, // 🔥 출발지 하드코딩: 항상 용민로 420 사용
                                { lat: destLat, lng: destLng },
                                travelModeMap[mode]
                              );
                              
                              if (result) {
                                setCurrentRouteResult(result);
                                console.log('✅ [MapPageContainer] 경로 재계산 완료:', mode);
                              }
                            } catch (error) {
                              console.warn('⚠️ [MapPageContainer] 경로 재계산 실패:', error);
                            } finally {
                              setIsRouteCalculating(false);
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {/* 🔥 '말해보세요' 토글 통합: 음성 인식이 시작되면 검색창 바로 아래에 부드러운 애니메이션과 함께 대화창이 나타나도록 구현해서, 화면 중앙을 가리는 일이 없게 해줘 */}
          <AnimatePresence>
            {isListening && (navUIState === 'SEARCH' || navUIState === 'SELECTED') && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  top: '140px', // 🔥 '말해보세요' 토글 통합: 검색창 바로 아래 (검색창 top: 80px + 검색창 높이 약 50px + 여백 10px)
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '90%',
                  maxWidth: '500px',
                  zIndex: 1099, // 검색창 바로 아래
                  backgroundColor: 'rgba(26, 95, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  boxShadow: '0 4px 16px rgba(26, 95, 255, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  pointerEvents: 'auto',
                }}
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
                <span style={{
                  fontSize: '14px',
                  color: '#FFFFFF',
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                }}>
                  말해보세요...
                </span>
                <style>{`
                  @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                  }
                `}</style>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* 🔥 AI 비서 레이아웃: 하단 AI 카드 - 기존 PlaceResultCard를 확장해서 상단에 AI 응답 텍스트 영역을 추가해 */}
          {/* 🔥 정상 지도 페이지: 검색 결과 리스트는 query와 results만 보고 표시 (phase 무관) */}
          {/* 검색 입력값이 있으면 무조건 표시 (결과가 없어도 AIAssistantCard가 EmptyState 처리) */}
          {(queryText || searchQuery) && (
            <AIAssistantCard
              places={places}
              onSelect={(place) => {
                // 🔥 시트 강제 종료: 길찾기 버튼 클릭 시, 현재 띄워져 있는 모든 상세 카드를 닫고 지도 화면을 넓게 확보해줘
                setPreviewPlace(null); // 🔥 시트 강제 종료: PlaceDetailSheet 닫기
                selectResult(place); // 🔥 기존 selectResult 호출
              }}
              queryText={queryText || searchQuery}
              isLoading={searchStatus === 'searching'}
              onCalculateRoute={async (origin, destination) => {
                // 🔥 출발지 하드코딩: calculateRoute 함수의 origin 파라미터에 현재 위치 대신 사용자님이 알려주신 주소(경기도 의정부시 용민로 420)를 직접 입력하도록 수정해야 합니다.
                // 🔥 출발지 주소 고정: 경기도 의정부시 용민로 420 (37.754, 127.114)
                const FIXED_ORIGIN = { lat: 37.754, lng: 127.114 }; // 경기도 의정부시 용민로 420
                console.log('[위치확정] 출발지: 용민로 420 (37.754, 127.114)');
                
                // 🔥 MapController의 calculateRoute 함수 호출
                const mapController = (window as any).__MAP_CONTROLLER__;
                if (mapController?.calculateRoute) {
                  // 🔥 현재 선택된 이동 수단으로 경로 계산
                  const google = window.google?.maps;
                  if (google) {
                    const travelModeMap: Record<'WALKING' | 'DRIVING' | 'TRANSIT', google.maps.TravelMode> = {
                      WALKING: google.TravelMode.WALKING,
                      DRIVING: google.TravelMode.DRIVING,
                      TRANSIT: google.TravelMode.TRANSIT,
                    };
                    try {
                      return await mapController.calculateRoute(FIXED_ORIGIN, destination, travelModeMap[currentTravelMode]); // 🔥 출발지 하드코딩: 항상 용민로 420 사용
                    } catch (error: any) {
                      // 🔥 에러 핸들링: ZERO_RESULTS가 뜰 때 사용자에게 "경로를 찾을 수 없습니다"라고 알려주고, 대신 지도를 해당 위치로 이동(panTo)시켜줘
                      console.error('❌ [MapPageContainer] 경로 계산 오류:', error);
                      if (error?.message?.includes('ZERO_RESULTS')) {
                        setToastMessage('경로를 찾을 수 없습니다');
                        // 🔥 에러 핸들링: ZERO_RESULTS 시 지도를 목적지로 이동
                        const mapInstance = (window as any).__MAP_INSTANCE__;
                        if (mapInstance) {
                          mapInstance.panTo({ lat: destination.lat, lng: destination.lng });
                          mapInstance.setZoom(15);
                        }
                      }
                      return null;
                    }
                  }
                  return await mapController.calculateRoute(FIXED_ORIGIN, destination); // 🔥 출발지 하드코딩: 항상 용민로 420 사용
                }
                return null;
              }}
              onRouteError={(status, message) => {
                // 🔥 에러 핸들링: ZERO_RESULTS가 뜰 때 사용자에게 "경로를 찾을 수 없습니다"라고 알려주고, 대신 지도를 해당 위치로 이동(panTo)시켜줘
                console.warn('⚠️ [MapPageContainer] 경로 계산 실패:', status, message);
                setToastMessage(message || '경로를 찾을 수 없습니다');
                
                // 🔥 UI 동기화: 경로 안내가 실패하면 navigationStarted를 다시 false로 돌려놓고 검색 화면으로 복구해줘
                console.log('🔄 [MapPageContainer] 경로 계산 실패 → navigationStarted = false, 검색 화면으로 복구');
                setNavigationStarted(false);
                setPhase('CONFIRMED'); // CONFIRMED 상태 유지 (다시 시도 가능하도록)
              }}
              userLocation={locationState && locationState.status === 'READY' && locationState.source !== 'default'
                ? { lat: locationState.lat, lng: locationState.lng }
                : null}
              selectedPlace={confirmedDestination || previewPlace ? {
                id: confirmedDestination?.placeId || previewPlace?.id || '',
                name: confirmedDestination?.name || previewPlace?.name || '',
                lat: confirmedDestination?.lat || previewPlace?.lat || 0,
                lng: confirmedDestination?.lng || previewPlace?.lng || 0,
                location: confirmedDestination?.location || (previewPlace ? { lat: previewPlace.lat, lng: previewPlace.lng } : undefined),
                address: confirmedDestination?.address || previewPlace?.address,
              } : null} // 🔥 가짜 '결과 없음' 삭제: selectedPlace prop 추가
              onRouteCalculated={(result) => {
                // 🔥 2단계: 실시간 정보 플로팅 카드용 경로 결과 저장
                setCurrentRouteResult(result);
              }}
              aiResponse={aiResponse} // 🔥 AI 비서 레이아웃: AI 응답 텍스트
              isListening={isListening} // 🔥 AI 비서 레이아웃: 음성 인식 중 여부
              onStartListening={startSTT} // 🔥 레이아웃 전면 재배치: '말해보세요' 토글 위치 수정 - 마이크 버튼 핸들러
              currentRouteResult={currentRouteResult} // 🔥 하단 시트 전환: 경로 계산 결과 전달
              onStartNavigation={handleStartNavigation} // 🔥 하단 시트 전환: 안내 시작 버튼 핸들러
              navigationStarted={navigationStarted} // 🔥 안내 모드 시작 여부
              onStopNavigation={handleStopNavigation} // 🔥 안내 종료 버튼 핸들러
              currentTravelMode={currentTravelMode} // 🔥 현재 선택된 이동 수단
              onRecalculateRoute={async (place, travelMode) => {
                // 🔥 경로 데이터 갱신: 현재 선택된 상단 탭의 수단에 맞춰서 실제 경로 API를 다시 호출하고 지도에 그리기
                if (locationState && locationState.status === 'READY' && locationState.source !== 'default') {
                  setIsRouteCalculating(true);
                  const mapController = (window as any).__MAP_CONTROLLER__;
                  if (mapController?.calculateRoute) {
                    const google = window.google?.maps;
                    if (google) {
                      const travelModeMap: Record<'WALKING' | 'DRIVING' | 'TRANSIT', google.maps.TravelMode> = {
                        WALKING: google.TravelMode.WALKING,
                        DRIVING: google.TravelMode.DRIVING,
                        TRANSIT: google.TravelMode.TRANSIT,
                      };
                      
                      try {
                        const destLat = place.lat || (place as any).location?.lat;
                        const destLng = place.lng || (place as any).location?.lng;
                        
                        if (!destLat || !destLng) {
                          console.warn('⚠️ [MapPageContainer] 목적지 좌표 없음');
                          return;
                        }
                        
                        // 🔥 출발지 하드코딩: calculateRoute 함수의 origin 파라미터에 현재 위치 대신 사용자님이 알려주신 주소(경기도 의정부시 용민로 420)를 직접 입력하도록 수정해야 합니다.
                        // 🔥 출발지 주소 고정: 경기도 의정부시 용민로 420 (37.754, 127.114)
                        const FIXED_ORIGIN = { lat: 37.754, lng: 127.114 }; // 경기도 의정부시 용민로 420
                        console.log('[위치확정] 출발지: 용민로 420 (37.754, 127.114)');
                        
                        const result = await mapController.calculateRoute(
                          FIXED_ORIGIN, // 🔥 출발지 하드코딩: 항상 용민로 420 사용
                          { lat: destLat, lng: destLng },
                          travelModeMap[travelMode]
                        );
                        
                        if (result) {
                          setCurrentRouteResult(result);
                          console.log('✅ [MapPageContainer] 경로 재계산 완료:', travelMode);
                        }
                      } catch (error) {
                        console.warn('⚠️ [MapPageContainer] 경로 재계산 실패:', error);
                      } finally {
                        setIsRouteCalculating(false);
                      }
                    }
                  }
                }
              }}
              onQuickAction={(action) => {
                // 🔥 음성 명령 제안: 퀵 버튼 핸들러
                if (action === 'parking') {
                  setSearchQuery('주변 주차장');
                  setQueryText('주변 주차장');
                } else if (action === 'fastest') {
                  // 가장 빠른 길 재계산
                  const mapController = (window as any).__MAP_CONTROLLER__;
                  if (mapController?.calculateRoute && confirmedDestination) {
                    const destLat = confirmedDestination.lat || (confirmedDestination as any).location?.lat;
                    const destLng = confirmedDestination.lng || (confirmedDestination as any).location?.lng;
                    if (destLat && destLng) {
                      // 🔥 출발지 하드코딩: calculateRoute 함수의 origin 파라미터에 현재 위치 대신 사용자님이 알려주신 주소(경기도 의정부시 용민로 420)를 직접 입력하도록 수정해야 합니다.
                      // 🔥 출발지 주소 고정: 경기도 의정부시 용민로 420 (37.754, 127.114)
                      const FIXED_ORIGIN = { lat: 37.754, lng: 127.114 }; // 경기도 의정부시 용민로 420
                      console.log('[위치확정] 출발지: 용민로 420 (37.754, 127.114)');
                      mapController.calculateRoute(
                        FIXED_ORIGIN, // 🔥 출발지 하드코딩: 항상 용민로 420 사용
                        { lat: destLat, lng: destLng }
                      );
                    }
                  }
                } else if (action === 'stop') {
                  setNavigationStarted(false);
                  setCurrentRouteResult(null);
                  // 🔥 지도 인터랙션: 안내 종료 시 grayscale 필터 제거
                  const mapInstance = (window as any).__MAP_INSTANCE__;
                  if (mapInstance) {
                    const mapContainer = mapInstance.getDiv();
                    if (mapContainer) {
                      mapContainer.style.filter = 'none';
                    }
                  }
                }
              }}
            />
          )}
          
          {/* 🔥 AI 비서 레이아웃: 상단 경로 안내 바 - navigationStarted가 true일 때만 상단에 고정된(Fixed) 플로팅 카드를 띄워줘 */}
          {navigationStarted && currentRouteResult?.routes?.[0]?.legs?.[0] && (
            <RouteSummaryBar
              distance={currentRouteResult.routes[0].legs[0].distance?.text}
              duration={currentRouteResult.routes[0].legs[0].duration?.text}
              travelMode={currentRouteResult.routes[0].legs[0].steps?.[0]?.travel_mode === 'TRANSIT' ? 'TRANSIT' 
                : currentRouteResult.routes[0].legs[0].steps?.[0]?.travel_mode === 'DRIVING' ? 'DRIVING' 
                : 'WALKING'}
              destinationName={places.find(p => p.id === confirmedDestination?.id)?.name || confirmedDestination?.name}
              isVisible={navigationStarted} // 🔥 AI 비서 레이아웃: navigationStarted가 true일 때만 표시
            />
          )}
          

          {/* 🔥 2단계: 실시간 정보 플로팅 카드 - navigationStarted가 false일 때만 표시 (길찾기 버튼 클릭 후) */}
          {/* 🔥 데이터 동기화: 말풍선의 시간 텍스트가 현재 선택된 탭의 실제 예상 시간으로 바뀌게 연동 */}
          {!navigationStarted && currentRouteResult?.routes?.[0]?.legs?.[0] && (
            <RouteInfoFloatingBar
              distance={currentRouteResult.routes[0].legs[0].distance?.text}
              duration={currentRouteResult.routes[0].legs[0].duration?.text}
              travelMode={currentTravelMode} // 🔥 데이터 동기화: 현재 선택된 탭의 이동 수단 사용
              destinationName={places.find(p => p.id === confirmedDestination?.id)?.name || confirmedDestination?.name}
            />
          )}
          
          {/* ❌ 제거: EmptyState는 PlaceResultCard 내부에서 처리 */}
          {false && phase === 'SEARCHING' && places.length === 0 && searchQuery && (
            <EmptyState
              title="검색 결과가 없어요"
              description="다른 키워드로 다시 검색해 보세요"
              action={{
                label: '다시 검색',
                onClick: () => {
                  // ✅ MVP: SEARCHING 상태 유지 (사용자 주도 재시도)
                  setSearchQuery('');
                  setQueryText(null);
                },
              }}
            />
          )}
          
          {/* ✅ MVP: GPS 불안정 경고 배너 (비침투) */}
          {locationState && locationState.status === 'READY' && locationState.accuracy && locationState.accuracy > 100 && (
            <GpsWarningBanner message="위치 정확도가 낮아 길 안내가 부정확할 수 있어요" />
          )}
          
          {/* ❌ 정상 지도 페이지: ActionCard 비활성화 (경로/출발 기능 제외) */}
          {false && (
            <ActionCard
              state={
                mapPhase === 'selected' ? 'selected' : 
                mapPhase === 'moving' ? 'moving' : 
                searchStatus === 'error' ? 'error' : 
                (mapPhase === 'idle' && showIdleCandidate) ? 'idleCandidate' :
                'idle'
              }
              placeName={confirmedPlace?.name || selectedPlace?.name}
              isNavigating={isNavigating}
              onNavigate={() => {
                // ❌ 정상 지도 페이지: 네비게이션 기능 제외
              }}
              onRetry={() => {
                // ❌ 정상 지도 페이지: 재시도 기능 제외
              }}
            />
          )}
          
          {/* 🔥 2️⃣ NAVIGATING 중 행동 제어: 토스트 메시지 */}
          {toastMessage && (
            <ToastMessage
              message={toastMessage}
              duration={3000}
              onClose={() => setToastMessage(null)}
            />
          )}

          {/* 🔥 AI 응답 말풍선 (요약): 검색 결과가 있을 때만 표시 */}
          {showAiSummary && places.length > 0 && searchQuery && !currentRouteResult?.routes?.[0]?.legs?.[0] && (
            <AiSummaryBubble
              query={searchQuery}
              placesCount={places.length}
              onClose={() => setShowAiSummary(false)}
            />
          )}

          {/* 🔥 UI 레이어 정리: 장소 상세 카드와 검색 결과 리스트가 겹치지 않게 해줘. 장소를 선택하면 검색 리스트는 닫고 장소 상세 정보만 보여주는 게 정석이야 */}
          {/* 🔥 버튼 통합: '여기로 갈게요' 버튼을 삭제하고, 하단 파란색 '길찾기' 버튼 하나로 모든 기능을 통합해 */}
          {/* 🔥 STEP 4: 장소 상세 카드 (previewPlace가 있을 때 표시, 경로 안내 시작 시 닫기) - 정보만 표시, 버튼 제거 */}
          {previewPlace && !currentRouteResult?.routes?.[0]?.legs?.[0] && (
            <PlaceDetailSheet
              place={{
                name: previewPlace.name,
                address: previewPlace.address,
                placeId: previewPlace.id,
                lat: previewPlace.lat, // 🔥 AI 비서 지도: 외부 지도 앱 연동용 좌표
                lng: previewPlace.lng, // 🔥 AI 비서 지도: 외부 지도 앱 연동용 좌표
              }}
              isVisible={true}
              useExternalMap={true} // 🔥 AI 비서 지도: 외부 지도 앱 사용 (카카오맵/네이버맵/구글맵)
              onViewDetails={() => {
                console.log('📍 [MapPageContainer] 위치 상세보기', previewPlace.name);
                // TODO: 향후 중고거래 게시물 연결
              }}
              onNavigate={() => {
                // 🔥 AI 비서 지도: 내부 네비게이션 사용 시 (useExternalMap=false일 때만 호출됨)
                console.log('✅ [MapPageContainer] PlaceDetailSheet에서 내부 길안내 시작:', previewPlace.name);
                if (confirmedDestination) {
                  handleStartNavigation();
                } else {
                  // 🔥 마커 클릭으로 previewPlace는 설정되었지만 confirmedDestination이 없는 경우
                  // selectResult를 호출하여 confirmedDestination 설정 후 길안내 시작
                  const placeLite: PlaceLite = {
                    id: previewPlace.id,
                    name: previewPlace.name,
                    lat: previewPlace.lat,
                    lng: previewPlace.lng,
                    address: previewPlace.address,
                  };
                  selectResult(placeLite);
                  // selectResult가 confirmedDestination을 설정하므로, 다음 프레임에서 handleStartNavigation 호출
                  setTimeout(() => {
                    handleStartNavigation();
                  }, 100);
                }
              }}
            />
          )}
    </div>
    </>
  );
}

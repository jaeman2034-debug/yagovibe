/**
 * 🔥 MapController - 지도 검색 결과 관리 레이어
 * 
 * 책임 범위:
 * ✅ 검색 트리거 수신
 * ✅ 검색어 결정 (이미 정제된 것만)
 * ✅ Places API 호출
 * ✅ 결과를 MapPlace[] 형태로 변환
 * ✅ MapPageV3에 props로 전달
 * 
 * ❌ 하지 않는 것:
 * - 지도 렌더링 (MapPageV3 책임)
 * - TTS 처리 (상위 UX 레이어 책임)
 * - 음성 명령 파싱 (상위 UX 레이어 책임)
 * - "근처 / 내 주변" 판단 (상위 UX 레이어 책임)
 */

import { useState, useEffect, useMemo, lazy, Suspense, useRef, useCallback } from "react";
import VoiceUXController from "./VoiceUXController";
import MapUXOverlay from "./MapUXOverlay"; // 🔥 UX 레이어 통합
import { textSearchPlaces } from "@/utils/placesSearch"; // 🔥 v4: Text Search 함수
import { normalizePlace } from "@/utils/placeNormalizer"; // 🔥 v4: Place 정규화

// 🔥 Phase 18: 플랫폼별 Renderer 통합 엔트리 (Web/Native 자동 분기)
// ❌ 개별 Renderer import 금지 → MapRenderer가 내부에서 분기 처리
// 이렇게 하면 Vite가 빌드 타임에 react-native-maps를 스캔하지 않음
const MapRenderer = lazy(() => import('./renderers/MapRenderer'));
import { useLocationController } from "./LocationController"; // 🔥 Phase L: 위치 상태 관리
import { MY_LOCATION, MY_LOCATION_ZOOM, FALLBACK_HOME, DEFAULT_ZOOM } from "./constants"; // 🔥 내 위치 상수
import type { LocationState } from "./LocationController"; // 🔥 Phase L: LocationController에서 re-export된 타입 사용
import { getDistanceKm } from "@/utils/distance"; // 🔥 Phase 7: 거리 계산
import { isRouteDeviation } from "@/utils/routeDeviation"; // 🔥 Phase 30: 경로 이탈 감지
import { getBestLocationMobileOnly, isMobileLikeDevice } from "@/utils/location"; // 🔥 Phase 29.5: 모바일 전용 GPS
import { saveMemory, getLatestMemory, isMemoryEnabled } from "@/utils/memoryStorage"; // 🔥 Phase 10: 기억 저장, Phase 11: 기억 조회
import { savePreferenceToServer, loadPreferencesFromServer, getPreferenceForPlace, scorePlace, disableCategoryRecommendation, deletePlaceMemory, type MapPreference } from "@/utils/serverMemory"; // 🔥 Phase 12: 서버 기억
import { isFirstVisit, completeOnboarding, hasSeenMapIntro, markMapIntroSeen } from "@/utils/onboarding"; // 🔥 Phase 13: 온보딩, Phase 15: 지도 안내
import { collection, query, where, getDocs, orderBy, Timestamp, doc, getDoc } from "firebase/firestore"; // 🔥 Firestore places 조회용
import { db } from "@/lib/firebase"; // 🔥 Firestore 인스턴스
import { rerankPlacesBySportsSense, safeRank, type SportsSenseProfile } from "@/utils/sportsSenseRecommendation"; // 🔥 천재 모드: 스포츠 감각 기반 추천
import { extractLongMemory, type LongMemory } from "@/utils/longMemory"; // 🔥 v2.0: 장기 기억 레이어
import { updateMemoryFromFeedback, type FeedbackType } from "@/utils/feedbackLoop"; // 🔥 v2.1: 대화 루프
import { updateProfileWithInference, type InferenceContext } from "@/utils/intentInference"; // 🔥 v2.2: 의도 추론
import { useAuth } from "@/context/AuthProvider"; // 🔥 사용자 인증
import { useBehaviorLogging } from "@/hooks/useBehaviorLogging"; // 🔥 천재 모드: 행동 학습 로깅
import { highlightTop3 } from "@/utils/mapHighlight"; // 🔥 v1.2: 지도 하이라이트 연출
import MemoryControlPanel from "./MemoryControlPanel"; // 🔥 Phase 14: 기억 제어 패널
import MemorySummaryCard from "./MemorySummaryCard"; // 🔥 Phase 28: 기억 요약 카드
import ListeningIndicator from "./ListeningIndicator"; // 🔥 Phase 20: 음성 인식 상태 표시
import ActionNudgeBubble from "./ActionNudgeBubble"; // 🔥 Phase 21: 행동 유도 힌트
import NavigationConfirmCard from "./NavigationConfirmCard"; // 🔥 Phase 28: 네비게이션 시작 확인 카드 (클릭 보장을 위해 분리)

type MapCenter = {
  lat: number;
  lng: number;
  source?: 'default' | 'geolocation' | 'map' | 'search' | 'explicit'; // 🔥 위치 출처 추적
};

type MapPlace = {
  id: string;
  lat: number;
  lng: number;
  name?: string;
};

// 🔥 v4: 좌표 정규화 함수 (LatLng 객체 → number 변환)
function toNumberLatLng(anyLoc: any): { lat: number; lng: number } | null {
  if (!anyLoc) return null;

  // case 1) google.maps.LatLng (lat() / lng() 메서드)
  if (typeof anyLoc.lat === "function" && typeof anyLoc.lng === "function") {
    const lat = anyLoc.lat();
    const lng = anyLoc.lng();
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat: Number(lat), lng: Number(lng) };
    }
    return null;
  }

  // case 2) LatLngLiteral ({lat, lng} 속성)
  const lat = anyLoc.lat;
  const lng = anyLoc.lng;
  if (lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return { lat: Number(lat), lng: Number(lng) };
  }

  // case 3) latitude/longitude 속성
  if (anyLoc.latitude != null && anyLoc.longitude != null) {
    const lat = Number(anyLoc.latitude);
    const lng = Number(anyLoc.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }

  return null;
}

/**
 * 🔥 [최종 해결책] 데이터 강제 직렬화 (Deep Clean)
 * 구글에서 온 '살아있는(함수형) 객체'를 '죽어있는(순수 데이터) 객체'로 완전히 변환
 */
const sanitizePlaces = (rawPlaces: any[]): any[] => {
  return rawPlaces.map(place => {
    try {
      // 1. 구글 함수형 데이터를 일반 숫자로 강제 변환
      const lat = typeof place.geometry?.location?.lat === 'function' 
        ? place.geometry.location.lat() 
        : (place.location?.lat || place.lat);
      const lng = typeof place.geometry?.location?.lng === 'function' 
        ? place.geometry.location.lng() 
        : (place.location?.lng || place.lng);

      // 2. 순수하게 값만 가진 새로운 객체 생성 (중요: 원본 참조 끊기)
      return {
        ...JSON.parse(JSON.stringify(place)), // 나머지 속성은 복사
        location: { lat, lng },
        lat, // 평면 구조 대응
        lng
      };
    } catch (e) {
      console.warn('[MapController] sanitizePlaces 실패:', e, { place });
      return null;
    }
  }).filter(Boolean);
};

/**
 * 🔥 최종 해결책: 어떤 형태의 장소 객체에서도 안전하게 위경도를 추출하는 함수
 * 구글 API의 함수형 데이터(place.geometry.location.lat())와 숫자형 데이터 모두 처리
 */
const getSafeLatLng = (place: any): { lat: number; lng: number } | null => {
  try {
    // 1. 우선순위: geometry.location (구글 표준)
    const geoLoc = place?.geometry?.location;
    // 2. 차선책: location (커스텀 데이터)
    const directLoc = place?.location;

    const target = geoLoc || directLoc;
    if (!target) return null;

    // 함수라면 호출하고, 숫자라면 그대로 반환하는 범용 추출기
    const extract = (val: any): number | null => {
      if (typeof val === 'function') {
        const result = val();
        const num = parseFloat(String(result));
        return isNaN(num) || !isFinite(num) ? null : num;
      }
      const num = parseFloat(String(val));
      return isNaN(num) || !isFinite(num) ? null : num;
    };

    const lat = extract(target.lat);
    const lng = extract(target.lng);

    if (lat === null || lng === null) return null;
    return { lat, lng };
  } catch (e) {
    // 🔥 로그 출력: console.error 대신 console.warn 사용 (에러 경계 작동 방지)
    console.warn("[MapController] 좌표 추출 중 치명적 에러:", e, { place });
    return null;
  }
};

type MapControllerProps = {
  initialCenter?: MapCenter;
  searchQuery?: string; // 검색어 (이미 정제된 것만)
  searchCenter?: MapCenter; // 검색 중심점 (위치 기반 검색용)
  voiceEnabled?: boolean; // 🔥 Phase 6: 음성 활성화 플래그
  onMapReady?: () => void; // 🔥 Phase 13: 지도 로드 완료 콜백
  isListening?: boolean; // 🔥 Phase 20: 음성 인식 중 여부 (MapPageContainer에서 전달)
  hasSpoken?: boolean; // 🔥 Phase 21: 사용자가 말하기 시작했는지 (MapPageContainer에서 전달)
  sttStatus?: import('@/types/stt').STTStatus; // 🔥 Phase 20: STT 상태 (MapPageContainer에서 전달)
  navIntent?: 'idle' | 'intent-detected'; // 🔥 Phase 22: 네비게이션 의도 상태 (MapPageContainer에서 전달)
  recognizedText?: string | null; // 🔥 Phase 22: 인식된 문장 (MapPageContainer에서 전달)
  onStartListening?: () => void; // 🔥 STT 시작 핸들러 (ListeningIndicator 클릭용)
  showSpeechAck?: boolean; // 🔥 Phase 29: STT 결과 즉각 반응 카드 표시 여부
  speechAckQuery?: string; // 🔥 Phase 29: 반응 카드에 표시할 검색어
  isIdleCurious?: boolean; // 🔥 천재 모드: idle 상태 3초 경과 후 "관심" 상태
  onPlaceSelected?: () => void; // 🔥 Phase 31: 장소 선택 시 콜백 (navIntent 설정용)
  // 🔥 Phase 30: 새로운 검색 상태
  searchStatus?: import('@/types/search').SearchStatus;
  queryText?: string | null;
  places?: import('@/types/search').PlaceLite[]; // 🔥 Phase 30: 검색 결과 (PlaceLite[])
  onPlacesUpdate?: (places: import('@/types/search').PlaceLite[]) => void; // 🔥 Phase 30: 검색 결과 업데이트 콜백
  selectedPlace?: import('@/types/search').PlaceLite | null;
  onSelectPlace?: (place: import('@/types/search').PlaceLite) => void;
  onStartNavigation?: () => void;
  onWaitNavigation?: () => void;
  showConfirmStart?: boolean;
  navigationStarted?: boolean;
  onMapInteraction?: (type: 'dragstart' | 'zoom' | 'idle') => void; // 🔥 인터랙션 단계: 지도 인터랙션 이벤트
  phase?: 'IDLE' | 'SEARCHING' | 'CONFIRMED' | 'NAVIGATING' | 'ARRIVED'; // ✅ MVP: phase 상태 전달
  onRouteError?: () => void; // ✅ MVP: 길 찾기 실패 콜백
  onMyLocationClick?: () => void; // 🔥 내 위치 버튼 클릭 핸들러 (외부에서 제공 가능)
  onRouteInfoUpdate?: (info: { distance: string; duration: string } | null) => void; // 🔥 네비 UI: 경로 정보 업데이트 콜백
  onRouteFailed?: (reason: 'ZERO_RESULTS' | 'NOT_FOUND' | 'ERROR') => void; // 🔥 네비 UI: 경로 계산 실패 콜백
  onTryWalking?: () => void; // 🔥 도보 경로 시도 요청 (ZERO_RESULTS 시)
  previewPlace?: { id: string; lat: number; lng: number; name: string } | null; // 🔥 정상 지도 페이지: 단일 마커 상태
  onCalculateRoute?: (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => Promise<google.maps.DirectionsResult | null>; // 🔥 경로 탐색: calculateRoute 함수
};

// 🔥 1단계: DEV mock 위치 고정 (로컬 PC = GPS 없음 대응)
const DEV_MOCK_LOCATION = {
  lat: 37.7466, // 의정부 민락동
  lng: 127.0950,
};

const isDev =
  import.meta.env.DEV ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost');

export default function MapController({
  initialCenter = { lat: 37.754, lng: 127.114 }, // 🔥 경기도 의정부시 용민로 420 (37.754, 127.114) - 정확한 좌표
  searchQuery,
  searchCenter,
  voiceEnabled = false, // 🔥 Phase 13: 기본값 false (설정에서만 켤 수 있음)
  onMapReady, // 🔥 Phase 13: 지도 준비 완료 콜백
  isListening = false, // 🔥 Phase 20: 음성 인식 중 여부
  hasSpoken = false, // 🔥 Phase 21: 사용자가 말하기 시작했는지
  sttStatus = 'idle', // 🔥 Phase 20: STT 상태 (기본값: idle)
  navIntent = 'idle', // 🔥 Phase 22: 네비게이션 의도 상태 (기본값: idle)
  recognizedText = null, // 🔥 Phase 22: 인식된 문장 (기본값: null)
  onStartListening, // 🔥 STT 시작 핸들러 (ListeningIndicator 클릭용)
  showSpeechAck = false, // 🔥 Phase 29: STT 결과 즉각 반응 카드 표시 여부
  speechAckQuery = '', // 🔥 Phase 29: 반응 카드에 표시할 검색어
  isIdleCurious = false, // 🔥 천재 모드: idle 상태 3초 경과 후 "관심" 상태
  onPlaceSelected, // 🔥 Phase 31: 장소 선택 시 콜백 (navIntent 설정용)
  // 🔥 Phase 30: 새로운 검색 상태
  searchStatus = "idle",
  queryText = null,
  places: propPlaces = [], // 🔥 Phase 30: 검색 결과 (PlaceLite[])
  onPlacesUpdate, // 🔥 Phase 30: 검색 결과 업데이트 콜백
  selectedPlace = null,
  onSelectPlace,
  onStartNavigation,
  onWaitNavigation,
  showConfirmStart = false,
  navigationStarted: propNavigationStarted = false,
  searchPhase = "idle", // 🔥 Phase 30: 검색 단계 (MapPageContainer에서 전달)
  onMapInteraction, // 🔥 인터랙션 단계: 지도 인터랙션 이벤트
  phase = 'IDLE', // ✅ MVP: phase 상태 (기본값 IDLE)
  onMyLocationClick, // 🔥 내 위치 버튼 클릭 핸들러 (외부에서 제공 가능, 없으면 내부 핸들러 사용)
  onRouteInfoUpdate, // 🔥 네비 UI: 경로 정보 업데이트 콜백
  onRouteFailed, // 🔥 네비 UI: 경로 계산 실패 콜백
  onTryWalking, // 🔥 도보 경로 시도 요청
  previewPlace = null, // 🔥 정상 지도 페이지: 단일 마커 상태
}: MapControllerProps) {
  const { user } = useAuth(); // 🔥 천재 모드: 사용자 인증
  // 🔥 Phase L: LocationController 훅 (Single Source of Truth) - 가장 먼저 선언
  const { location: locationState } = useLocationController();
  const [sportsSenseProfile, setSportsSenseProfile] = useState<SportsSenseProfile | null>(null); // 🔥 천재 모드: 스포츠 감각 프로필
  const [longMemory, setLongMemory] = useState<LongMemory | null>(null); // 🔥 v2.0: 장기 기억
  const [highlightedPlaceIds, setHighlightedPlaceIds] = useState<Set<string>>(new Set()); // 🔥 천재 모드: 하이라이트할 장소 ID (상위 3개)
  
  // 🔥 지도 인스턴스 참조 (내 위치 버튼용)
  const mapRef = useRef<google.maps.Map | null>(null);
  
  const [center, setCenter] = useState<MapCenter>(initialCenter);
  
  // 🔥 위치 기반 QR: initialCenter prop이 변경되면 center 상태 업데이트 및 지도 중심 이동
  useEffect(() => {
    if (initialCenter && (initialCenter.lat !== center.lat || initialCenter.lng !== center.lng)) {
      setCenter(initialCenter);
      
      // 지도가 준비되어 있으면 즉시 중심 이동
      const map = mapRef.current;
      if (map) {
        map.setCenter(initialCenter);
        map.setZoom(17); // 🔥 위치 기반 QR: 상세 확대 레벨
        console.log('✅ [MapController] QR 위치로 지도 중심 이동', initialCenter);
      }
    }
  }, [initialCenter, center.lat, center.lng]);
  // 🔥 초기값 보호: places 상태의 초기값을 []로 확실히 고정 (null/undefined 방지)
  // 🔥 하드코딩 테스트: 지도 정상 작동 확인용 (서울시청 주변 장소)
  const TEST_PLACES: MapPlace[] = [
    { id: 'test-1', lat: 37.5665, lng: 126.9780, name: '서울시청' },
    { id: 'test-2', lat: 37.5651, lng: 126.9895, name: '명동' },
    { id: 'test-3', lat: 37.5700, lng: 126.9769, name: '덕수궁' },
    { id: 'test-4', lat: 37.5636, lng: 126.9747, name: '서울역' },
    { id: 'test-5', lat: 37.5663, lng: 126.9779, name: '시청역' },
  ];
  
  // 🔥 1단계: 모든 상태 변수 선언 (React Hook 규칙 준수)
  // 🔥 검색 UX: allPlaces = 원본 목록 (절대 훼손 X), places = 필터된 목록 (화면 표시용)
  const [allPlaces, setAllPlaces] = useState<MapPlace[]>([]); // 🔥 원본 목록 (검색 필터의 기준)
  const [places, setPlaces] = useState<MapPlace[]>([]); // 🔥 필터된 목록 (화면에 표시)
  const [filterQuery, setFilterQuery] = useState<string>(""); // 🔥 로컬 필터링용 검색어 (props의 searchQuery와 구분)
  
  // 🔥 안전한 setPlaces 헬퍼: 빈 배열로 덮어쓰는 것 방지
  const safeSetPlaces = useCallback((newPlaces: MapPlace[] | ((prev: MapPlace[]) => MapPlace[])) => {
    if (typeof newPlaces === 'function') {
      // 함수형 업데이트인 경우
      setPlaces(prev => {
        const result = newPlaces(prev);
        // 🔥 빈 배열로 덮어쓰는 것 방지
        if (result.length === 0 && prev.length > 0) {
          console.log('🔒 [MapController] safeSetPlaces: 빈 배열 차단, 기존 장소 유지');
          return prev;
        }
        return result;
      });
    } else {
      // 직접 값인 경우
      // 🔥 빈 배열로 덮어쓰는 것 방지
      if (newPlaces.length === 0 && places.length > 0) {
        console.log('🔒 [MapController] safeSetPlaces: 빈 배열 차단, 기존 장소 유지');
        return; // 기존 places 유지
      }
      setPlaces(newPlaces);
    }
  }, [places.length]);
  const [isMapReady, setIsMapReady] = useState(false); // 🔥 Phase 15: 지도 준비 상태 (안내 표시용)
  const [isSearching, setIsSearching] = useState(false);
  // ❌ v4 SEARCH ONLY: 추천 로직 완전 제거
  // const [recommendedPlaceId, setRecommendedPlaceId] = useState<string | undefined>(undefined);
  const recommendedPlaceId: string | undefined = undefined; // 🔥 항상 undefined (추천 비활성화)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>(undefined); // 🔥 Phase 23: 선택된 장소 ID (피드백용)
  const [showStartFeedback, setShowStartFeedback] = useState(false); // 🔥 Phase 23: 시작 피드백 메시지 표시 여부
  const [navigationStarted, setNavigationStarted] = useState(propNavigationStarted); // 🔥 Phase 9: 길 안내 시작 상태 (prop으로 제어)
  const [showDirectionHint, setShowDirectionHint] = useState(false); // 🔥 Phase 24: 방향 힌트 표시 여부
  const [routePath, setRoutePath] = useState<google.maps.LatLngLiteral[]>([]); // 🔥 Phase 9: 경로 좌표 배열
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null); // 🔥 Phase 33: 경로 정보 (거리, 시간)
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null); // 🔥 Phase 33: Directions API 결과
  const [travelMode, setTravelMode] = useState<google.maps.TravelMode | undefined>(undefined); // 🔥 Phase 32: 이동수단 (초기값은 undefined, 나중에 설정)
  const [showMemoryPrompt, setShowMemoryPrompt] = useState(false); // 🔥 Phase 10: 기억 질문 표시 여부
  const searchRequestIdRef = useRef<number>(0); // 🔥 비동기 경합 방지: 최신 요청만 반영
  const hasSpokenFirstTurnRef = useRef<boolean>(false); // ✅ MVP: 첫 턴 음성 1회만 재생 플래그
  // 🔥 오류 흔적 삭제: tryWalkingModeRef 제거 (사용되지 않는 코드)
  const [arrived, setArrived] = useState(false); // 🔥 Phase 10: 도착 여부 (시뮬레이션)
  const [memoryJustSaved, setMemoryJustSaved] = useState(false); // 🔥 Phase 27: 기억 저장 직후 상태
  const [showMemorySummary, setShowMemorySummary] = useState(false); // 🔥 Phase 28: 기억 요약 카드 표시 여부
  const [serverPreferences, setServerPreferences] = useState<MapPreference[]>([]); // 🔥 Phase 12: 서버 기억
  const [showAutoSuggestion, setShowAutoSuggestion] = useState(false); // 🔥 Phase 13: 자동 제안 표시 여부
  const [showRouteDeviation, setShowRouteDeviation] = useState(false); // 🔥 Phase 30: 경로 이탈 배너 표시 여부
  const [showMemoryControl, setShowMemoryControl] = useState(false); // 🔥 Phase 14: 기억 제어 패널 표시 여부
  const [showMapIntro, setShowMapIntro] = useState(false); // 🔥 Phase 15: 지도 안내 표시 여부
  
  // 🔥 검색 UX: 검색 필터 함수
  const normalize = useCallback((s: string) => s.trim().toLowerCase(), []);
  
  const applySearch = useCallback((q: string, source: MapPlace[]): MapPlace[] => {
    const nq = normalize(q);
    if (!nq) return source; // 빈 검색어면 원본 그대로
    
    return source.filter(p => {
      const name = normalize(p.name ?? "");
      const category = normalize(p.category ?? "");
      return name.includes(nq) || category.includes(nq);
    });
  }, [normalize]);
  
  // 🔥 검색어 변경 핸들러 (로컬 필터링용)
  const onSearchChange = useCallback((q: string) => {
    setFilterQuery(q);
    // 핵심: 화면 places는 allPlaces 기반으로만 계산
    setPlaces(applySearch(q, allPlaces));
  }, [allPlaces, applySearch]);
  
  // 🔥 검색 취소 핸들러
  const onClearSearch = useCallback(() => {
    setFilterQuery("");
    setPlaces(allPlaces);
  }, [allPlaces]);
  
  // 🔥 천재 모드: 스포츠 감각 프로필 로드
  useEffect(() => {
    if (!user || user.isAnonymous) {
      setSportsSenseProfile(null);
      return;
    }

    const loadSportsSenseProfile = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          setSportsSenseProfile(null);
          return;
        }

        const userData = userSnap.data();
        const sportsSense = userData.sportsSense;
        
        if (sportsSense && sportsSense.activatedAt) {
          setSportsSenseProfile({
            todayIntent: sportsSense.todayIntent,
            context: sportsSense.context,
            mood: sportsSense.mood,
            behaviorScore: sportsSense.behaviorScore || 0,
          });
          
          // 🔥 v2.0: 장기 기억 추출
          const behaviorScore = sportsSense.behaviorScore || {};
          const behaviorLog = sportsSense.behaviorLog || {};
          const memory = extractLongMemory(behaviorScore, behaviorLog);
          setLongMemory(memory);
          
          console.log("✅ [MapController] 스포츠 감각 프로필 로드 완료:", sportsSense);
          console.log("🧠 [MapController] 장기 기억 추출 완료:", memory);
        } else {
          setSportsSenseProfile(null);
          setLongMemory(null);
        }
      } catch (error) {
        console.warn("⚠️ [MapController] 스포츠 감각 프로필 로드 실패:", error);
        setSportsSenseProfile(null);
      }
    };

    loadSportsSenseProfile();

    // 🔥 천재 모드: GENIUS_CONTEXT 이벤트 리스너 (v1.2: 실시간 컨텍스트 업데이트)
    const handleGeniusContext = async (event: CustomEvent) => {
      const ctx = event.detail;
      console.log("🔥 [MapController] GENIUS_CONTEXT 이벤트 수신:", ctx);

      if (!sportsSenseProfile) {
        console.warn("⚠️ [MapController] 스포츠 감각 프로필이 없습니다.");
        return;
      }

      // 🔥 프로필 업데이트
      const updatedProfile: SportsSenseProfile = {
        ...sportsSenseProfile,
        todayIntent: ctx.intentHint || sportsSenseProfile.todayIntent,
        mood: ctx.moodHint || sportsSenseProfile.mood,
        context: ctx.contextHint || sportsSenseProfile.context,
      };

      console.log("✨ [MapController] 프로필 업데이트:", updatedProfile);
      setSportsSenseProfile(updatedProfile);

      // 🔥 즉시 재랭킹
      if (allPlaces.length > 0 && locationState?.status === 'ready') {
        try {
          const behaviorScore = updatedProfile.behaviorScore || {};
          const hour = new Date().getHours();
          
          // 🔥 v2.0: 장기 기억 포함하여 재랭킹
          const reranked = safeRank(
            allPlaces,
            updatedProfile,
            { lat: locationState.lat, lng: locationState.lng },
            { hour, behaviorScore, memory: longMemory || undefined }
          );
          setPlaces(applySearch(filterQuery, reranked));
          console.log("✨ [MapController] 즉시 리랭킹 완료:", reranked.length, "개");
          
          // 🔥 천재 모드: 상위 3개 장소 하이라이트
          const top3Ids = reranked.slice(0, 3).map(p => p.id);
          const top3Names = reranked.slice(0, 3).map(p => p.name || "").filter(Boolean);
          const top3Places = reranked.slice(0, 3);
          setHighlightedPlaceIds(new Set(top3Ids));
          
          // 🔥 v1.2: 지도 하이라이트 연출
          if (top3Places.length > 0) {
            highlightTop3(top3Places);
          }
          
          // 🔥 천재 모드: 홈 문장 생성 이벤트 발송 (v1.3: 코스 생성기 포함)
          if (top3Names.length > 0) {
            // 🔥 타입 변환
            const intentForEvent = updatedProfile.todayIntent === "watch" ? "watch" :
                                  updatedProfile.todayIntent === "exercise" ? "play" :
                                  updatedProfile.todayIntent === "play" ? "chill" : "watch";
            const companyForEvent = updatedProfile.context === "alone" ? "solo" :
                                    updatedProfile.context === "friends" ? "friends" :
                                    updatedProfile.context === "partner" ? "date" : "family";
            const moodForEvent = updatedProfile.mood === "quiet" ? "calm" :
                                updatedProfile.mood === "excited" ? "excited" :
                                updatedProfile.mood === "focused" ? "focus" : "light";

            window.dispatchEvent(
              new CustomEvent("GENIUS_HIGHLIGHT", {
                detail: { 
                  placeIds: top3Ids,
                  placeNames: top3Names,
                  places: reranked, // 🔥 v1.3: 코스 생성기용 전체 places 전달
                  intent: intentForEvent,
                  company: companyForEvent,
                  mood: moodForEvent,
                  memory: longMemory || undefined, // 🔥 v2.0: 장기 기억 전달
                }
              })
            );
          }

          // 🔥 GENIUS_UPDATED 이벤트 발송
          window.dispatchEvent(
            new CustomEvent("GENIUS_UPDATED", {
              detail: {
                places: reranked,
                profile: updatedProfile,
              },
            })
          );
        } catch (error) {
          console.warn("⚠️ [MapController] 즉시 리랭킹 실패:", error);
        }
      }
    };

    // 🔥 천재 모드: GENIUS_UPDATED 이벤트 리스너 (즉시 재계산)
    const handleGeniusUpdate = async (event: CustomEvent) => {
      console.log("🔥 [MapController] GENIUS_UPDATED 이벤트 수신:", event.detail);
      
      // 프로필 재로드
      loadSportsSenseProfile();
      
      // 즉시 리랭킹 (allPlaces가 있으면)
      if (allPlaces.length > 0 && locationState?.status === 'ready') {
        const profile = event.detail.profile;
        if (profile) {
          try {
            // 🔥 v2.2: 의도 추론 적용
            const inferenceContext: InferenceContext = {
              hour: new Date().getHours(),
              dayOfWeek: new Date().getDay(),
            };
            const profileWithInference = updateProfileWithInference(
              profile,
              inferenceContext,
              longMemory
            );

            // 🔥 행동 학습 점수 로드
            const behaviorScore = profileWithInference?.behaviorScore || {};
            const hour = new Date().getHours();
            
            // 🔥 v2.0: 장기 기억 포함하여 재랭킹
            const reranked = safeRank(
              allPlaces,
              profileWithInference,
              { lat: locationState.lat, lng: locationState.lng },
              { hour, behaviorScore, memory: longMemory || undefined }
            );
            setPlaces(applySearch(filterQuery, reranked));
            console.log("✨ [MapController] 즉시 리랭킹 완료:", reranked.length, "개");
            
            // 🔥 천재 모드: 상위 3개 장소 하이라이트
            const top3Ids = reranked.slice(0, 3).map(p => p.id);
            const top3Names = reranked.slice(0, 3).map(p => p.name || "").filter(Boolean);
            const top3Places = reranked.slice(0, 3);
            setHighlightedPlaceIds(new Set(top3Ids));
            
            // 🔥 v1.2: 지도 하이라이트 연출
            if (top3Places.length > 0) {
              // 이미 파일 상단에서 import된 highlightTop3 사용
              highlightTop3(top3Places);
            }
            
            // 🔥 천재 모드: 홈 문장 생성 이벤트 발송 (프로필 정보 포함)
            if (top3Names.length > 0 && sportsSenseProfile) {
              window.dispatchEvent(
                new CustomEvent("GENIUS_HIGHLIGHT", {
                  detail: { 
                    placeIds: top3Ids,
                    placeNames: top3Names,
                    intent: sportsSenseProfile.todayIntent,
                    company: sportsSenseProfile.context === "solo" ? "solo" : 
                             sportsSenseProfile.context === "friends" ? "friends" :
                             sportsSenseProfile.context === "date" ? "date" : "family",
                    mood: sportsSenseProfile.mood,
                  }
                })
              );
            }
          } catch (error) {
            console.warn("⚠️ [MapController] 즉시 리랭킹 실패:", error);
          }
        }
      }
    };

    // 🔥 v2.1: 피드백 수신 리스너
    const handleFeedbackReceived = async (event: CustomEvent) => {
      const { placeId, feedbackType } = event.detail;
      console.log("🔥 [MapController] FEEDBACK_RECEIVED 이벤트 수신:", { placeId, feedbackType });

      if (!user || user.isAnonymous || !longMemory) {
        return;
      }

      // 🔥 메모리 업데이트
      const updatedMemory = updateMemoryFromFeedback(longMemory, placeId, feedbackType as FeedbackType);
      setLongMemory(updatedMemory);

      // 🔥 즉시 재랭킹
      if (sportsSenseProfile && allPlaces.length > 0 && locationState?.status === 'ready') {
        try {
          const behaviorScore = sportsSenseProfile?.behaviorScore || {};
          const hour = new Date().getHours();
          
          const reranked = safeRank(
            allPlaces,
            sportsSenseProfile,
            { lat: locationState.lat, lng: locationState.lng },
            { hour, behaviorScore, memory: updatedMemory }
          );
          setPlaces(applySearch(filterQuery, reranked));
          console.log("✨ [MapController] 피드백 기반 재랭킹 완료:", reranked.length, "개");
        } catch (error) {
          console.warn("⚠️ [MapController] 피드백 기반 재랭킹 실패:", error);
        }
      }
    };

    window.addEventListener("GENIUS_CONTEXT", handleGeniusContext as EventListener);
    window.addEventListener("GENIUS_UPDATED", handleGeniusUpdate as EventListener);
    window.addEventListener("FEEDBACK_RECEIVED", handleFeedbackReceived as EventListener); // 🔥 v2.1: 피드백 리스너

    return () => {
      window.removeEventListener("GENIUS_CONTEXT", handleGeniusContext as EventListener);
      window.removeEventListener("GENIUS_UPDATED", handleGeniusUpdate as EventListener);
      window.removeEventListener("FEEDBACK_RECEIVED", handleFeedbackReceived as EventListener); // 🔥 v2.1: 피드백 리스너 정리
    };
  }, [user, allPlaces, filterQuery, applySearch, locationState, sportsSenseProfile, longMemory]);

  // 🔥 allPlaces 변경 시 필터 검색어 기준으로 places 재계산 + 스포츠 감각 리랭킹
  useEffect(() => {
    let filtered = applySearch(filterQuery, allPlaces);
    
    // 🔥 천재 모드: 스포츠 감각 프로필이 있으면 리랭킹 (v1.4: 상황 인식 포함)
    if (sportsSenseProfile && locationState?.status === 'ready' && filtered.length > 0) {
      try {
        const behaviorScore = sportsSenseProfile?.behaviorScore || {};
        const hour = new Date().getHours();
        
        // 🔥 v2.0: 장기 기억 포함하여 재랭킹
        filtered = safeRank(
          filtered,
          sportsSenseProfile,
          { lat: locationState.lat, lng: locationState.lng },
          { hour, behaviorScore, memory: longMemory || undefined } // 🔥 v2.0: 장기 기억 추가
        );
        console.log("✨ [MapController] 스포츠 감각 기반 리랭킹 완료:", filtered.length, "개");
        
        // 🔥 천재 모드: 상위 3개 장소 하이라이트
        const top3Ids = new Set(filtered.slice(0, 3).map(p => p.id));
        setHighlightedPlaceIds(top3Ids);
        console.log("✨ [MapController] 상위 3개 장소 하이라이트:", Array.from(top3Ids));
      } catch (error) {
        console.warn("⚠️ [MapController] 스포츠 감각 리랭킹 실패:", error);
        setHighlightedPlaceIds(new Set()); // 에러 시 하이라이트 초기화
      }
    } else {
      setHighlightedPlaceIds(new Set()); // 스포츠 감각 없으면 하이라이트 없음
    }
    
    setPlaces(filtered);
  }, [allPlaces, applySearch, filterQuery, sportsSenseProfile, locationState]);
  
  // 🔥 2단계: AI 비서 테스트 모드 - 개발 모드에서 즉시 테스트 장소 로드
  // ✅ React Hook 규칙 준수: 모든 상태 변수 선언 후 useEffect 사용
  // 🔥 AI 비서 테스트 모드: Firestore places 데이터 없어도 지도가 살아있도록 보장
  useEffect(() => {
    if (import.meta.env.DEV) {
      // 🔥 개발 모드에서 즉시 테스트 장소 로드 (조건 없이 강제 실행)
      console.log('🧪 [MapController] AI 비서 테스트 모드: 개발 모드 감지, 테스트 장소 즉시 로드');
      // 🔥 검색 UX: allPlaces와 places 둘 다 설정
      setAllPlaces(TEST_PLACES);
      setPlaces(applySearch(filterQuery, TEST_PLACES));
      
      // 🔥 추가 안전장치: 500ms 후에도 비어있으면 다시 로드
      const timeout1 = setTimeout(() => {
        if (allPlaces.length === 0) {
          console.log('🧪 [MapController] AI 비서 테스트 모드: 500ms 후 재시도, 테스트 장소 강제 로드');
          setAllPlaces(TEST_PLACES);
          setPlaces(applySearch(filterQuery, TEST_PLACES));
        }
      }, 500);
      
      // 🔥 최종 안전장치: 2초 후에도 비어있으면 강제 로드
      const timeout2 = setTimeout(() => {
        if (allPlaces.length === 0) {
          console.log('🧪 [MapController] AI 비서 테스트 모드: 2초 후 최종 시도, 테스트 장소 강제 로드');
          setAllPlaces(TEST_PLACES);
          setPlaces(applySearch(filterQuery, TEST_PLACES));
        }
      }, 2000);
      
      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
      };
    }
  }, []); // 🔥 의존성 배열 비움: 컴포넌트 마운트 시 1회만 실행
  
  // 🔥 AI 비서 테스트 모드: allPlaces가 비어있으면 항상 TEST_PLACES로 보장
  useEffect(() => {
    if (import.meta.env.DEV && allPlaces.length === 0) {
      console.log('🧪 [MapController] AI 비서 테스트 모드: allPlaces가 비어있어서 TEST_PLACES로 보장');
      setAllPlaces(TEST_PLACES);
      setPlaces(applySearch(filterQuery, TEST_PLACES));
    }
  }, [allPlaces.length, filterQuery, applySearch]); // 🔥 allPlaces.length 변경 시마다 체크

  // 🔥 Firestore places 조회 함수 (AI 추천용)
  const loadPlacesFromFirestore = useCallback(async () => {
    try {
      console.log('🔥 [MapController] Firestore places 조회 시작');
      
      // Firestore places 쿼리 구성
      const q = query(
        collection(db, "places"),
        where("status", "==", "active"), // 🔥 필드명: status (statu 아님)
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      console.log(`🔥 [MapController] Firestore places 개수: ${snapshot.size}`);

      if (snapshot.empty) {
        console.log('⚠️ [MapController] Firestore places 데이터 없음');
        return [];
      }

      const firestorePlaces: MapPlace[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          lat: data.lat || 0,
          lng: data.lng || 0,
          name: data.name || '',
          // 추가 필드 (선택적)
          address: data.address,
          category: data.category,
          rating: data.rating,
        };
      });

      console.log('✅ [MapController] Firestore places 로드 완료:', firestorePlaces.length, '개');
      return firestorePlaces;
    } catch (error: any) {
      console.error('❌ [MapController] Firestore places 조회 실패:', error);
      
      // 권한 오류인 경우 조용히 처리 (앱 크래시 방지)
      if (error.code === 'permission-denied' || error.code === 'missing-or-insufficient-permissions') {
        console.warn('⚠️ [MapController] Firestore places 권한 오류 (기존 장소 유지)');
        return []; // 빈 배열 반환 (기존 places 유지)
      }
      
      // 인덱스 오류인 경우도 조용히 처리
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.warn('⚠️ [MapController] Firestore places 인덱스 오류 (기존 장소 유지)');
        console.warn('   인덱스 생성 필요: Firestore Console에서 복합 인덱스 생성');
        return []; // 빈 배열 반환 (기존 places 유지)
      }
      
      return []; // 기타 오류도 빈 배열 반환 (기존 places 유지)
    }
  }, []);

  // 🔥 Firestore places 자동 로드 (프로덕션 모드에서만)
  useEffect(() => {
    // 개발 모드에서는 하드코딩 테스트 장소 우선 사용
    if (import.meta.env.DEV) {
      return;
    }

    // 프로덕션 모드에서만 Firestore places 로드
    // 🔥 예외 처리 강화: 실패해도 기존 마커 유지
    const loadFirestorePlaces = async () => {
      try {
        const firestorePlaces = await loadPlacesFromFirestore();
        
        // 🔥 검색 UX: Firestore places 로드 시 allPlaces와 places 둘 다 업데이트
        if (firestorePlaces.length > 0) {
          console.log('✅ [MapController] Firestore places로 마커 업데이트:', firestorePlaces.length, '개');
          
          // 🔥 allPlaces 업데이트 (원본 목록)
          setAllPlaces(prevAllPlaces => {
            // 기존 allPlaces가 있으면 병합 (중복 제거)
            if (prevAllPlaces.length > 0) {
              const merged = [...firestorePlaces, ...prevAllPlaces];
              const unique = merged.filter((place, index, self) => 
                index === self.findIndex(p => p.id === place.id)
              );
              return unique;
            }
            // 기존 allPlaces가 없으면 Firestore places 사용
            return firestorePlaces;
          });
          
          // 🔥 places는 allPlaces 변경 시 useEffect에서 자동으로 재계산됨
          // (검색어가 있으면 필터링, 없으면 전체 표시)
        } else {
          // 🔥 핵심 수정: Firestore places가 없어도 기존 places 유지
          console.log('⚠️ [MapController] Firestore places 없음 - 기존 장소 유지');
        }
      } catch (error: any) {
        // 🔥 Firestore places 로드 실패해도 기존 마커 유지 (지도 렌더링에 영향 없음)
        console.warn('⚠️ [MapController] Firestore places 로드 실패 (기존 마커 유지):', error?.message || error);
        // 기존 places 상태 유지 (setPlaces 호출 안 함)
      }
    };

    loadFirestorePlaces();
  }, [loadPlacesFromFirestore]);

  // ❌ v4 SEARCH ONLY: Phase 16 테스트 데이터 주입 완전 제거
  // 🔥 이전: 테스트 데이터로 불완전한 객체 생성 → 오류 발생
  
  // 🔥 데이터 복구: 검색어 상태 유지 (prop이 변경되어도 이전 검색어 유지)
  const [internalSearchQuery, setInternalSearchQuery] = useState<string | undefined>(searchQuery);
  
  // 🔥 검색어 prop이 변경되면 내부 상태 업데이트 (하지만 빈 값으로 덮어쓰지 않음)
  useEffect(() => {
    if (searchQuery && searchQuery.trim()) {
      setInternalSearchQuery(searchQuery);
    }
  }, [searchQuery]);
  
  // 🔥 내부 검색어를 사용 (prop이 비어있어도 이전 검색어 유지)
  const activeSearchQuery = searchQuery || internalSearchQuery;
  
  // 🔥 현재 위치 결정 로직 (DEV mock 위치 지원) - locationState 선언 이후에 정의
  const getOriginPosition = useCallback((): { lat: number; lng: number } | null => {
    if (isDev) {
      console.info('[DEV] mock location used', DEV_MOCK_LOCATION);
      return DEV_MOCK_LOCATION;
    }
    
    if (!locationState || locationState.status !== 'READY') {
      return null;
    }
    
    // 🔥 source가 'default'인 경우 null 반환 (GPS 미확정)
    if (locationState.source === 'default') {
      return null;
    }
    
    return { lat: locationState.lat, lng: locationState.lng };
  }, [locationState, isDev]);
  
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

  // 🔥 Phase 9: 새로운 검색 시 Soft Reset
  useEffect(() => {
    if (activeSearchQuery && activeSearchQuery.trim()) {
      setNavigationStarted(false);
      // setRecommendedPlaceId(undefined); // ❌ 추천 로직 제거됨
    }
  }, [activeSearchQuery]);

  // 🔥 Phase 13: 계정 제안 모달 상태
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const [pendingPlace, setPendingPlace] = useState<MapPlace | null>(null);

  // 🔥 Phase 11: 기억 활용 여부 확인 (Phase 13: 개인화 기본 OFF이므로 항상 false)
  const usedMemory = useMemo(() => {
    // 🔥 Phase 13: 개인화 기본 OFF
    return false;
  }, [searchQuery]);

  // ❌ v4 SEARCH ONLY: 추천 대상 계산 제거 (항상 null 반환)
  // 🔥 이전: nearestPlace 계산 → 추천 로직 트리거 → 불완전한 객체로 오류 발생
  const nearestPlace: MapPlace | null = null; // 🔥 항상 null (추천 비활성화)
  
  /* ❌ 주석 처리됨
  const nearestPlace = useMemo(() => {
    if (places.length === 0) {
      return null;
    }
    
    // 🔥 테스트용: locationState가 없어도 첫 번째 장소를 추천으로 사용 (개발 모드)
    if (process.env.NODE_ENV === 'development' && (!locationState || locationState.status !== 'ready')) {
      console.log('[MapController] 테스트 모드: locationState 없이 첫 번째 장소 추천');
      // 🔥 데이터 접근 안전성: 옵셔널 체이닝 적용
      if (!places?.[0]) {
        return null;
      }
      return { ...places[0], distance: 0 };
    }
    
    if (!locationState || locationState.status !== 'ready') {
      return null;
    }

    // 🔥 초기값 보호: places가 배열이 아니면 빈 배열로 처리
    const safePlaces = Array.isArray(places) ? places : [];
    
    const placesWithDistance = safePlaces
      .filter(place => {
        // 🔥 UI 렌더링 방어: 데이터가 완벽할 때만 화면에 그리기
        if (!place?.location?.lat || !place?.location?.lng) {
          console.warn('[MapController] 유효하지 않은 좌표 데이터 스킵:', {
            placeId: place?.id,
            name: place?.name,
            hasLocation: !!place?.location,
          });
          return false;
        }
        // 🔥 좌표 접근 통일: 두 가지 구조를 모두 지원
        const placeLat = place.location?.lat || place.lat;
        const placeLng = place.location?.lng || place.lng;
        return place && typeof placeLat === 'number' && typeof placeLng === 'number';
      })
      .map(place => {
        // 🔥 좌표 접근 통일: 두 가지 구조를 모두 지원
        const placeLat = place.location?.lat || place.lat;
        const placeLng = place.location?.lng || place.lng;
        return {
      ...place,
      distance: getDistanceKm(
        { lat: locationState.lat, lng: locationState.lng },
            { lat: placeLat, lng: placeLng }
      ),
        };
      });

    // 🔥 Phase 12: 서버 기억 반영한 점수 계산
    const placesWithScore = placesWithDistance.map(place => {
      const memory = serverPreferences.find(p => p.placeId === place.id);
      const score = scorePlace(place, memory || null, place.distance);
      return { ...place, score };
    });

    // 🔥 Phase 12: 점수 순으로 정렬 (점수 같으면 거리 순)
    const sorted = placesWithScore.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.distance - b.distance;
    });
    
    return sorted[0];
  }, [places, locationState, serverPreferences]);
  */ // ❌ 위 useMemo 완전 제거됨

  // ❌ v4 SEARCH ONLY: 추천 로직 완전 제거
  // 🔥 이전: nearestPlace 기반 자동 추천 → 불완전한 객체로 추천 → 오류 발생
  // 🔥 현재: 추천 기능 완전 비활성화 (사용자가 명시적으로 선택해야 함)
  // useEffect(() => {
  //   if (searchPhase === 'confirmed' || searchPhase === 'navigating') {
  //     return;
  //   }
  //   if (nearestPlace) {
  //     const timer = setTimeout(() => {
  //       setRecommendedPlaceId(nearestPlace.id);
  //     }, 300);
  //     return () => clearTimeout(timer);
  //   } else {
  //     // setRecommendedPlaceId(undefined); // ❌ 추천 로직 제거됨
  //   }
  // }, [nearestPlace, searchPhase]);

  // 🔥 목적지 확정: selectedPlace prop → selectedPlaceId 변환 + places 배열에 추가 (CONFIRMED 상태 시각화)
  useEffect(() => {
    if (selectedPlace) {
      // 🔥 "여기로 갈게요" 클릭 시 목적지 확정
      setSelectedPlaceId(selectedPlace.placeId);
      console.log('✅ [MapController] 목적지 확정:', {
        placeId: selectedPlace.placeId,
        name: selectedPlace.name,
        lat: selectedPlace.location?.lat ?? selectedPlace.lat,
        lng: selectedPlace.location?.lng ?? selectedPlace.lng,
      });
      
      // 🔥 목적지 중심으로 카메라 이동 (WebMapRenderer에서 처리하도록 center 업데이트)
      const targetLat = selectedPlace.location?.lat ?? selectedPlace.lat;
      const targetLng = selectedPlace.location?.lng ?? selectedPlace.lng;
      if (typeof targetLat === 'number' && typeof targetLng === 'number' && 
          Number.isFinite(targetLat) && Number.isFinite(targetLng)) {
        setCenter({
          lat: targetLat,
          lng: targetLng,
          source: 'explicit', // 명시적 선택
        });
      } else {
        console.warn('[MapController] 선택된 장소 좌표 유효하지 않음:', selectedPlace);
      }
      
      // 🔥 목적지가 places 배열에 없으면 추가 (마커 렌더링 보장)
      const destinationMapPlace: MapPlace = {
        id: selectedPlace.placeId,
        lat: selectedPlace.location.lat,
        lng: selectedPlace.location.lng,
        name: selectedPlace.name,
      };
      
      console.log('🔥 [MapController] 목적지 MapPlace 생성:', {
        id: destinationMapPlace.id,
        name: destinationMapPlace.name,
        lat: destinationMapPlace.lat,
        lng: destinationMapPlace.lng,
        isValid: typeof destinationMapPlace.lat === 'number' && typeof destinationMapPlace.lng === 'number',
      });
      
      setPlaces(prevPlaces => {
        // 🔒 CONFIRMED 상태 보호: 목적지를 항상 맨 앞에 유지 (덮어쓰기 방지)
        const existingIndex = prevPlaces.findIndex(p => p.id === selectedPlace.placeId);
        
        if (existingIndex >= 0) {
          // 기존 장소 업데이트 (위치는 유지하되, 목적지를 맨 앞으로 이동)
          const updated = [...prevPlaces];
          updated.splice(existingIndex, 1); // 기존 위치에서 제거
          updated.unshift(destinationMapPlace); // 맨 앞에 추가 (우선순위 보장)
          console.log('🔒 [MapController] 목적지 업데이트 + 우선순위 보장:', {
            before: prevPlaces.length,
            after: updated.length,
            firstPlace: updated[0],
          });
          return updated;
        } else {
          // 목적지를 맨 앞에 추가 (우선 표시)
          const newPlaces = [destinationMapPlace, ...prevPlaces];
          console.log('🔒 [MapController] 목적지 추가 (우선순위 보장):', {
            before: prevPlaces.length,
            after: newPlaces.length,
            firstPlace: newPlaces[0],
          });
          return newPlaces;
        }
      });
    } else {
      // selectedPlace가 null이면 selectedPlaceId도 초기화 (다른 곳 보기 등)
      // 단, navigationStarted 중이면 유지 (동행 중에는 목적지 고정)
      if (!propNavigationStarted) {
        setSelectedPlaceId(undefined);
      }
    }
  }, [selectedPlace, propNavigationStarted]);

  // ❌ v4 SEARCH ONLY: 추천 장소 객체 제거
  // const recommendedPlace = useMemo(() => {
  //   if (!recommendedPlaceId) return null;
  //   return places.find(p => p.id === recommendedPlaceId) || null;
  // }, [recommendedPlaceId, places]);
  const recommendedPlace: MapPlace | null = null; // 🔥 항상 null (추천 비활성화)

  // 🔥 Phase 23: 방향 힌트 트리거 (navIntent + recommendedPlace 감지)
  useEffect(() => {
    if (
      navIntent === 'intent-detected' &&
      recommendedPlace !== null &&
      !navigationStarted
    ) {
      setShowDirectionHint(true);
      console.log('✅ [MapController] Phase 23: 방향 힌트 활성화');
      
      // 🔥 Phase 23: 지도 카메라 조정 (줌 +1, 앞쪽 공간 더 보여주기)
      // WebMapRenderer에서 처리하도록 locationState와 destination 전달됨
    } else {
      setShowDirectionHint(false);
    }
  }, [navIntent, recommendedPlace, navigationStarted]);

  // 🔥 Phase 30: 축구 관련 키워드 체크 (필터 완화용)
  const FOOTBALL_KEYWORDS = [
    "축구",
    "풋살",
    "운동장",
    "체육",
    "스포츠",
    "경기장",
    "공원"
  ];

  function isFootballPlace(place: google.maps.places.PlaceResult): boolean {
    const name = (place.name ?? "").toLowerCase();
    const types = place.types ?? [];

    // 1. 이름 기준 (가장 중요)
    const nameMatch = FOOTBALL_KEYWORDS.some(keyword =>
      name.includes(keyword.toLowerCase())
    );

    // 2. 타입 기준 (보조)
    const typeMatch = types.some(t =>
      [
        "stadium",
        "sports_complex",
        "park",
        "point_of_interest",
        "establishment",
        "gym",
        "sports_center"
      ].includes(t)
    );

    return nameMatch || typeMatch;
  }

  // ✅ MVP: Places NearbySearch 실행 (phase === 'SEARCHING'일 때만)
  useEffect(() => {
    // 🔥 v4: SEARCHING 또는 CONFIRMED 상태에서 검색 허용 (새 검색어 입력 시)
    if (phase !== 'SEARCHING' && phase !== 'CONFIRMED') {
      console.warn('[SEARCH] start - BLOCKED (phase is not SEARCHING or CONFIRMED)', {
        query: queryText,
        phase,
      });
      return;
    }
    
    // 🔥 최우선: navigationStarted가 true면 검색 완전 차단 (데이터 덮어쓰기 방지)
    if (navigationStarted) {
      console.warn('[SEARCH] start - BLOCKED (navigationStarted is true)', {
        query: queryText,
        navigationStarted,
        phase,
      });
      return;
    }
    
    if (!queryText) return;
    
    // 🔥 수정: 위치가 없어도 검색 허용 (fallback 좌표 사용)
    const runNearbySearch = async () => {
      const map = (window as any).__MAP_INSTANCE__;
      if (!map || !window.google?.maps?.places) {
        console.warn('⚠️ [MapController] Phase 30: 지도 인스턴스 또는 Places API 준비되지 않음');
        return;
      }

      // 🔥 수정: locationReady 가드 사용 + fallback 좌표
      const hasValidLocation = isLocationReady();
      const center = hasValidLocation && locationState
        ? {
        lat: locationState.lat,
        lng: locationState.lng,
          }
        : {
            lat: 37.754, // 🔥 경기도 의정부시 용민로 420 (37.754, 127.114) 기본 좌표 (fallback) - 정확한 좌표
            lng: 127.114,
          };
      
      if (!hasValidLocation) {
        console.warn('[SEARCH] 위치 없음 - 기본 좌표 사용', {
          query: queryText,
          locStatus: locationState?.status,
          fallbackCenter: center,
        });
      }

      // ✅ 검색 중심 고정 (현재 위치만 사용)
      console.log('[SEARCH] start', {
        query: queryText,
        center,
        locStatus: locationState.status,
      });

      const google = window.google?.maps;
      if (!google?.places) {
        console.warn('⚠️ [MapController] Phase 30: Places API 준비되지 않음');
        return;
      }
      const service = new google.places.PlacesService(map);

      // 🔥 nearbySearch 호출 - fields 절대 사용 금지 (getDetails에서만 사용)
      // ✅ 옵션 객체를 완전히 새로 생성 (spread나 타입 상속 없이, 완전히 순수한 객체)
      const searchOptions: any = {};
      searchOptions.location = center; // 🔥 1단계: 무조건 현재 위치만 사용
      searchOptions.radius = 2000;
      searchOptions.keyword = queryText;
      // ❌ fields는 절대 추가하지 않음
      
      // 🔥 fields가 전혀 없는지 최종 확인 (호출 직전)
      if ('fields' in searchOptions) {
        console.error('❌ [MapController] Phase 30: nearbySearch 옵션에 fields가 포함되어 있음!', searchOptions);
        delete searchOptions.fields;
      }
      
      // 🔥 호출 직전 최종 검증 로그 (JSON 직렬화로 완전 확인)
      const optionsKeys = Object.keys(searchOptions);
      const hasFields = 'fields' in searchOptions;
      const optionsString = JSON.stringify(searchOptions, null, 2);
      
      console.log("🔍 [MapController] Phase 30: nearbySearch 옵션 최종 확인:", {
        hasLocation: !!searchOptions.location,
        hasRadius: !!searchOptions.radius,
        hasKeyword: !!searchOptions.keyword,
        hasFields: hasFields, // 반드시 false여야 함
        optionsKeys: optionsKeys,
        optionsString: optionsString, // JSON으로 완전 확인
      });
      
      // 🔥 fields가 있으면 즉시 에러
      if (hasFields) {
        console.error('❌ [MapController] Phase 30: CRITICAL - fields가 여전히 포함되어 있음!', searchOptions);
        // 🔥 핵심 수정: fields 오류 발생해도 기존 places 유지 (빈 배열로 초기화 금지)
        return;
      }
      
      const results = await new Promise<google.maps.places.PlaceResult[]>((resolve) => {
        // 🔥 방어 코드: google.maps 확인 (LatLng 생성 전 필수) - 강화 버전
        if (!window.google || !window.google.maps || !window.google.maps.LatLng) {
          console.error('[MapController] ❌ google.maps.LatLng 없음 - nearbySearch 불가', {
            hasGoogle: !!window.google,
            hasMaps: !!window.google?.maps,
            hasLatLng: !!window.google?.maps?.LatLng,
            googleType: typeof window.google,
            mapsType: typeof window.google?.maps,
          });
          resolve([]);
          return;
        }
        
        // 🔥 수정: 모바일 호환을 위해 google.maps.LatLng 객체로 변환
        const locationLatLng = new window.google.maps.LatLng(center.lat, center.lng);
        
        const finalOptions: google.maps.places.PlaceSearchRequest = {
          location: locationLatLng, // 🔥 수정: LatLng 객체로 변환 (모바일 호환)
          radius: 2000,
          keyword: queryText,
        };
        
        console.log("🚀 [MapController] Phase 30: nearbySearch 최종 호출 직전:", {
          finalOptionsKeys: Object.keys(finalOptions),
          hasFieldsInFinal: 'fields' in finalOptions,
          locationType: locationLatLng instanceof window.google.maps.LatLng ? 'LatLng' : 'unknown',
        });
        
        service.nearbySearch(
          finalOptions,
          (r, status) => {
            console.log("🟢 [MapController] Phase 30: nearbySearch status:", status);
            console.log("🟢 [MapController] Phase 30: nearbySearch results:", r);
            
            // 🔥 방어 코드: PlacesServiceStatus 확인
            const PlacesServiceStatus = window.google?.maps?.places?.PlacesServiceStatus;
            if (PlacesServiceStatus && status === PlacesServiceStatus.OK && r) {
              resolve(r);
            } else {
              console.warn(`❌ [MapController] Phase 30: NearbySearch 실패`, { status });
              resolve([]);
            }
          }
        );
      });

      console.log(`✅ [MapController] Phase 30: NearbySearch 결과 ${results.length}개`);
      
      // 🔥 Phase 30: 디버깅 - 원본 결과 확인
      if (results.length > 0) {
        console.log('[MapController] Phase 30: 원본 결과 샘플', results.slice(0, 2).map(r => ({
          name: r.name,
          place_id: r.place_id,
          types: r.types,
          geometry: r.geometry ? {
            location: r.geometry.location ? 'exists' : 'missing',
            viewport: r.geometry.viewport ? 'exists' : 'missing',
          } : 'missing',
        })));
      }

      // 🔥 Phase 30: place_id로 getDetails() 호출하여 좌표 보강 (Promise.all 패턴 - React 검증됨)
      const detailPromises = results
        .slice(0, 5) // 최대 5개만 처리
        .filter((p) => p.place_id)
        .map(
          (place) =>
            new Promise<google.maps.places.PlaceResult | null>((resolve) => {
              service.getDetails(
                {
                  placeId: place.place_id!,
                  fields: ["name", "geometry", "vicinity", "formatted_address", "rating", "user_ratings_total", "opening_hours", "place_id"],
                },
                (detail, status) => {
                  // 🔥 방어 코드: PlacesServiceStatus 확인
                  const PlacesServiceStatus = window.google?.maps?.places?.PlacesServiceStatus;
                  if (
                    PlacesServiceStatus &&
                    status === PlacesServiceStatus.OK &&
                    detail?.geometry?.location
                  ) {
                    console.log('[MapController] Phase 30: getDetails 성공', { 
                      name: detail.name, 
                      place_id: place.place_id,
                      hasLocation: !!detail.geometry?.location 
                    });
                    resolve(detail);
                  } else {
                    console.warn('[MapController] Phase 30: getDetails 실패', { 
                      place_id: place.place_id, 
                      status,
                      hasLocation: !!detail?.geometry?.location 
                    });
                    resolve(null);
                  }
                }
              );
            })
        );

      const enrichedPlaces = (await Promise.all(detailPromises)).filter(
        (p): p is google.maps.places.PlaceResult => p !== null
      );

      console.log(`✅ [MapController] Phase 30: getDetails 보강 완료 ${enrichedPlaces.length}개`);

      // 🔥 Phase 30: 결과 매핑 (이제 geometry.location이 보장됨)
      // 1단계: geometry.location 있는 것만 필터
      const withLocation = enrichedPlaces.filter((p) => {
        if (!p.geometry?.location) {
          console.warn('[MapController] Phase 30: geometry.location 없음 (getDetails 후)', { name: p.name });
          return false;
        }
        
        const ll = p.geometry.location;
        
        // 🔥 좌표 추출 (함수 호출 필수!)
        const lat = typeof ll.lat === 'function' ? ll.lat() : ll.lat;
        const lng = typeof ll.lng === 'function' ? ll.lng() : ll.lng;
        
        const isValid = typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
        
        if (!isValid) {
          console.warn('[MapController] Phase 30: 좌표 유효하지 않음', { name: p.name, lat, lng });
        }
        
        return isValid;
      });

      // 2단계: 축구 관련 장소 우선, 나머지도 포함 (최대 5개)
      const queryLower = queryText.toLowerCase();
      const isFootballQuery = FOOTBALL_KEYWORDS.some(k => queryLower.includes(k.toLowerCase()));
      
      let filtered: google.maps.places.PlaceResult[];
      if (isFootballQuery) {
        // 🔥 축구 관련 검색어면 필터 적용
        const footballPlaces = withLocation.filter(isFootballPlace);
        const otherPlaces = withLocation.filter(p => !isFootballPlace(p));
        filtered = [...footballPlaces, ...otherPlaces].slice(0, 5);
        console.log(`✅ [MapController] Phase 30: 축구 관련 필터 적용`, { 
          footballPlaces: footballPlaces.length, 
          otherPlaces: otherPlaces.length,
          total: filtered.length 
        });
      } else {
        // 🔥 일반 검색어면 모두 포함
        filtered = withLocation.slice(0, 5);
      }

      // 🔥 Phase 30: Places 결과 → 좌표 추출 (함수 호출 필수!)
      const mappedPlaces = filtered
        .slice(0, 3) // 최종 3개만
        .map((place, index) => {
          // 🔥 변환부 강제 보호: 데이터가 완벽할 때만 변환 진행
          if (!place || (!place.geometry && !place.location)) {
            console.warn('[MapController] Phase 30: 유효하지 않은 place 객체 스킵:', {
              hasPlace: !!place,
              hasGeometry: !!place?.geometry,
              hasLocation: !!place?.location,
              place_id: place?.place_id,
            });
            return null;
          }

          // 🔥 안전한 추출 도구 사용: getSafeLatLng 함수로 변환 과정 보호
          let coords: { lat: number; lng: number } | null = null;
          try {
            coords = getSafeLatLng(place);
          } catch (error) {
            console.warn('[MapController] Phase 30: getSafeLatLng 호출 실패:', error, {
              place_id: place?.place_id,
              name: place?.name,
            });
            return null;
          }

          if (!coords) {
            console.warn('[MapController] Phase 30: 좌표 추출 실패', { 
              place_id: place?.place_id,
              name: place?.name,
              hasGeometry: !!place?.geometry,
              hasLocation: !!place?.location,
            });
            return null;
          }
          const { lat, lng } = coords;

          const placeLoc = { lat, lng };
          const name = place.name || place.formatted_address || place.vicinity || `장소 ${index + 1}`;

          return {
            placeId: place.place_id || `place-${Date.now()}-${index}-${Math.random()}`,
            name: name,
            location: placeLoc,
            address: (place.vicinity ?? place.formatted_address) || undefined,
            rating: place.rating ?? undefined,
            userRatingsTotal: (place.user_ratings_total as any) ?? undefined,
            openNow: place.opening_hours?.isOpen?.() ?? place.opening_hours?.open_now ?? undefined,
            distanceM: approxDistanceMeters(center, placeLoc), // 🔥 수정: bestLoc → center (정의되지 않은 변수 사용 문제 해결)
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      console.log("🔥 [MapController] 최종 places:", mappedPlaces.map(p => {
        // 🔥 좌표 접근 통일: 두 가지 구조를 모두 지원
        const placeLat = p.location?.lat || p.lat;
        const placeLng = p.location?.lng || p.lng;
        return {
        name: p.name, 
        placeId: p.placeId,
        location: p.location,
          lat: placeLat,
          lng: placeLng
        };
      }));
      
      // 🔥 성공 판정 로그
      if (mappedPlaces.length > 0) {
        console.log("✅ [MapController] Phase 30: 성공 - 좌표 포함된 places 생성 완료");
      } else {
        console.warn("⚠️ [MapController] Phase 30: 실패 - 좌표 포함된 places 없음");
      }

      console.log(`✅ [MapController] Phase 30: 매핑 완료 ${mappedPlaces.length}개`, mappedPlaces.map(p => ({ name: p.name, placeId: p.placeId })));

      // 🔥 Phase 30: 결과를 PlaceLite[]로 변환하여 MapPageContainer로 전달
      if (mappedPlaces.length > 0) {
        // 🔥 Phase 30: PlaceLite[] 결과를 MapPageContainer로 전달
        onPlacesUpdate?.(mappedPlaces);
        
        // 🔥 Phase 30: 기존 MapPlace[] 형태로도 변환 (마커 렌더링용)
        // 🔒 CONFIRMED 상태 보호: 목적지 확정 상태에서는 places 배열 덮어쓰기 차단
        if (searchPhase === 'confirmed' || searchPhase === 'navigating' || searchPhase === 'arrived') {
          console.log('🔒 [MapController] CONFIRMED 상태 보호: NearbySearch 결과로 places 업데이트 차단', { searchPhase });
          return; // 🔒 목적지 확정 상태에서는 places 배열 변경하지 않음
        }
        
        const convertedPlaces: MapPlace[] = mappedPlaces
          .filter((p) => {
            // 🔥 좌표 접근 통일: 두 가지 구조를 모두 지원
            const placeLat = p?.location?.lat || p?.lat;
            const placeLng = p?.location?.lng || p?.lng;
            return p && typeof placeLat === 'number' && typeof placeLng === 'number';
          })
          .map((p) => {
            // 🔥 좌표 접근 통일: 두 가지 구조를 모두 지원
            const placeLat = p.location?.lat || p.lat;
            const placeLng = p.location?.lng || p.lng;
            return {
            id: p.placeId,
              lat: placeLat,
              lng: placeLng,
          name: p.name,
            };
          });
        // 🔥 안전 가드: 빈 배열이면 기존 places 유지
        if (convertedPlaces.length > 0) {
          setPlaces(convertedPlaces);
        } else {
          console.log('🔒 [MapController] Phase 30: NearbySearch 결과 없음 - 기존 장소 유지');
        }
        console.log('✅ [MapController] Phase 30: NearbySearch 완료', { count: mappedPlaces.length });
        console.log('🔥 [MapController] 최종 places (마커용):', convertedPlaces.map(p => ({ 
          id: p.id, 
          name: p.name, 
          lat: p.lat, 
          lng: p.lng 
        })));
        console.log('[MapController] places 상태 업데이트:', convertedPlaces.map(p => ({ id: p.id, name: p.name })));
      } else {
        // 🔥 Phase 30: 결과 없음 - 빈 배열 전달 금지 (기존 places 유지)
        console.log('⚠️ [MapController] Phase 30: NearbySearch 결과 없음 - 기존 장소 유지');
        // onPlacesUpdate?.([]); 제거 - 빈 배열 전달하지 않음 (기존 places 유지)
      }
    };

    runNearbySearch();
  }, [phase, queryText, locationState]); // ✅ MVP: phase, queryText, locationState를 dependency에 추가

  // 🔥 v4 SEARCH ONLY: propPlaces 변경 시 places 업데이트 (더 정확한 결과 허용)
  useEffect(() => {
    // 🔥 NAVIGATING/ARRIVED 상태만 보호 (CONFIRMED는 제외)
    if (selectedPlace || searchPhase === 'navigating' || searchPhase === 'arrived') {
      console.log('🔒 [MapController] NAVIGATING/ARRIVED 상태 보호: propPlaces 업데이트 무시', {
        hasSelectedPlace: !!selectedPlace,
        searchPhase,
      });
      return;
    }
    // 🔥 CONFIRMED 상태에서는 propPlaces 업데이트 허용 (더 정확한 장소 교체 가능)
    
    if (propPlaces.length > 0) {
      // 🔥 Phase 30: PlaceLite[] → MapPlace[] 변환 (마커 렌더링용)
      const convertedPlaces: MapPlace[] = propPlaces.map((p) => {
        // 🔥 좌표 접근 통일: 두 가지 구조를 모두 지원
        const placeLat = p.location?.lat || p.lat;
        const placeLng = p.location?.lng || p.lng;
        return {
        id: p.placeId,
          lat: placeLat,
          lng: placeLng,
        name: p.name,
        };
      });
      // 🔥 안전 가드: 빈 배열이면 기존 places 유지
      if (convertedPlaces.length > 0) {
        setPlaces(convertedPlaces);
      } else {
        console.log('🔒 [MapController] propPlaces 변환 결과 없음 - 기존 장소 유지');
      }
      console.log('✅ [MapController] propPlaces → places 변환 완료', convertedPlaces.length);
    }
  }, [propPlaces, selectedPlace, searchPhase]); // 🔒 searchPhase를 dependency에 추가

  // ✅ MVP: phase 변경 시 첫 턴 음성 플래그 리셋 (ARRIVED/IDLE 진입 시)
  useEffect(() => {
    if (phase === 'ARRIVED' || phase === 'IDLE') {
      hasSpokenFirstTurnRef.current = false;
      console.log('[NAV] 첫 턴 음성 플래그 리셋 (phase:', phase, ')');
    }
  }, [phase]);

  // 🔥 Phase 30: 거리 계산 함수
  function approxDistanceMeters(a: google.maps.LatLngLiteral, b: google.maps.LatLngLiteral) {
    const R = 6371000;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s1 = Math.sin(dLat / 2);
    const s2 = Math.sin(dLng / 2);
    const q =
      s1 * s1 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
    return Math.round(2 * R * Math.asin(Math.sqrt(q)));
  }

  // 🔥 Phase 28: 네비게이션 시작 확인 카드 표시 조건 (prop으로 제어)
  const finalShowConfirmStart = showConfirmStart || (
    showDirectionHint === true &&
    navIntent === 'intent-detected' &&
    !navigationStarted &&
    recommendedPlace !== null
  );

  // 🔥 Phase 32: 이동수단 선택 핸들러 (외부 Google Maps로 위임 - 안전하고 실전적)
  const handleSelectMode = async (mode: 'WALKING' | 'DRIVING' | 'TRANSIT') => {
    if (!recommendedPlace || !locationState || locationState.status !== 'ready') {
      console.warn('⚠️ [MapController] Phase 32: 이동수단 선택 조건 불충족');
      return;
    }

    console.log('✅ [MapController] Phase 32: 이동수단 선택:', mode);

    // 🔥 음성 안내
    const modeText = mode === 'WALKING' ? '도보로 안내할게요' : mode === 'DRIVING' ? '자동차로 출발할게요' : '대중교통으로 안내할게요';
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      import('@/utils/speech').then(({ speakOnce }) => {
        speakOnce(modeText);
        console.log('🔊 [MapController] Phase 32: TTS 발화:', modeText);
      });
    }

    // 🔥 외부 Google Maps로 위임 (google 객체 접근 없음 - 크래시 방지)
    const origin = { lat: locationState.lat, lng: locationState.lng };
    const destination = { lat: recommendedPlace.lat, lng: recommendedPlace.lng };

    // Google Maps travelmode 매핑
    const travelModeMap: Record<'WALKING' | 'DRIVING' | 'TRANSIT', string> = {
      WALKING: 'walking',
      DRIVING: 'driving',
      TRANSIT: 'transit',
    };

    const travelMode = travelModeMap[mode];
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=${travelMode}`;
    
    // 새 탭에서 열기
    window.open(url, '_blank');
    
    console.log('[MapController] Phase 32: 외부 Google Maps 열기:', {
      origin,
      destination,
      travelMode,
      url,
    });

    // 🔥 Phase 32: 네비게이션 상태 업데이트 (선택적 - UI 피드백용)
    setNavigationStarted(true);
    setShowDirectionHint(false);
  };

  // 🔥 Phase 28 → Phase 32: 네비게이션 시작 함수 (확인 카드에서 호출 - 기존 호환성 유지)
  // onSelectMode가 있으면 이동수단 선택 카드가 표시되고, 없으면 기본 "출발" 버튼이 표시됨
  const handleStartNavigation = async () => {
    // 🔥 최우선: navigationStarted를 즉시 true로 설정 (검색 차단 보장)
    setNavigationStarted(true);
    console.log('✅ [MapController] navigationStarted = true (최우선 설정)');
    
    // 🔥 NAVIGATING 단계: 경로 요청 (confirmedPlace 또는 selectedPlace 기준)
    const targetPlace = selectedPlace || recommendedPlace;
    
    if (!targetPlace) {
      console.warn('⚠️ [MapController] NAVIGATING: targetPlace 없음 - 경로 요청 불가', {
        hasSelectedPlace: !!selectedPlace,
        hasRecommendedPlace: !!recommendedPlace,
      });
      // 🔥 targetPlace 없어도 navigationStarted는 이미 true로 설정됨 (검색 차단 유지)
      if (onRouteFailed) {
        onRouteFailed('ERROR');
      }
      return;
    }
    
    // 🔥 목적지 location 유효성 검증
    if (!targetPlace.location) {
      console.warn('⚠️ [MapController] NAVIGATING: targetPlace.location 없음 - 경로 요청 불가', {
        placeName: targetPlace.name,
        placeId: targetPlace.placeId || targetPlace.id,
      });
      if (onRouteFailed) {
        onRouteFailed('ERROR');
      }
      return;
    }
    
    // 🔥 목적지 좌표 추출 및 검증
    const destLat = typeof targetPlace.location.lat === 'function' 
      ? targetPlace.location.lat() 
      : targetPlace.location.lat;
    const destLng = typeof targetPlace.location.lng === 'function' 
      ? targetPlace.location.lng() 
      : targetPlace.location.lng;
    
    if (!isValidLatLng({ lat: destLat, lng: destLng })) {
      console.warn('⚠️ [MapController] NAVIGATING: 목적지 좌표가 유효하지 않음', {
        placeName: targetPlace.name,
        lat: destLat,
        lng: destLng,
      });
      if (onRouteFailed) {
        onRouteFailed('ERROR');
      }
      return;
    }
    
    const destination = { lat: destLat, lng: destLng };
    
    // 🔥 현재 위치 검증
    if (!locationState || locationState.status !== 'READY') {
      console.warn('⚠️ [MapController] NAVIGATING: locationState가 READY 상태가 아님', {
        status: locationState?.status,
      });
      if (onRouteFailed) {
        onRouteFailed('ERROR');
      }
      return;
    }
    
    // 🔥 source가 'default'인 경우 차단 (서울시청 고정값 사용 금지)
    if (locationState.source === 'default') {
      console.warn('⚠️ [MapController] NAVIGATING: locationState.source가 "default" (서울시청 고정값)', {
        source: locationState.source,
        lat: locationState.lat,
        lng: locationState.lng,
        status: locationState.status,
      });
      if (onRouteFailed) {
        onRouteFailed('ERROR'); // 위치 미확정은 ERROR로 처리
      }
      return;
    }
    
    // 🔥 origin 좌표 검증
    if (!isValidLatLng({ lat: locationState.lat, lng: locationState.lng })) {
      console.warn('⚠️ [MapController] NAVIGATING: 현재 위치 좌표가 유효하지 않음', {
        lat: locationState.lat,
        lng: locationState.lng,
      });
      if (onRouteFailed) {
        onRouteFailed('ERROR');
      }
      return;
    }
    
    const origin = { lat: locationState.lat, lng: locationState.lng };
    
    // 🔥 출발지와 목적지가 같은지 확인 (ZERO_RESULTS 방지)
    // 이미 파일 상단에서 import된 getDistanceKm 사용
    const distanceKm = getDistanceKm(origin, destination);
    
    // 🔥 거리 체크 완화: 30m 이내만 차단 (Google Maps Directions API 기준)
    if (distanceKm < 0.03) {
      console.warn('⚠️ [MapController] NAVIGATING: 출발지와 목적지가 너무 가까움 (30m 이내)', {
        origin,
        destination,
        distanceKm: (distanceKm * 1000).toFixed(0) + 'm',
        placeName: targetPlace.name,
      });
      if (onRouteFailed) {
        onRouteFailed('ZERO_RESULTS');
      }
      return;
    }
    
    console.log('✅ [MapController] NAVIGATING: 경로 요청 시작', {
      targetPlace: targetPlace.name,
      origin,
      destination,
      distanceKm: distanceKm.toFixed(2) + 'km',
    });
    
    // 경로 요청 (Directions API)
      await requestRoute(
      origin, // 🔥 현재 위치만 사용
      destination, // 🔥 검증된 목적지 좌표
      google.maps.TravelMode.DRIVING // ✅ MVP: DRIVING 모드
    );
  };

  // 🔥 Phase 28: 네비게이션 대기 함수 (카드 닫기로 호출)
  const handleWaitNavigation = () => {
    // 🔥 Phase 28: 카드만 닫고, 방향 힌트는 유지, 추가 개입 없음
    // navigationStarted는 그대로 false 유지
    // showConfirmStart는 false가 되어 카드만 사라짐
    // 사용자는 자유롭게 이동 가능, 언제든 다시 Phase 28을 띄울 수 있음
    console.log('⏸️ [MapController] Phase 28: 카드 닫기 (방향 힌트 유지, 사용자 자유 이동, 아무 변화 없음)');
  };

  // 🔥 Phase 32: 네비게이션 중지 함수 (다음 사용을 위한 자연스러운 복귀)
  const handleStopNavigation = () => {
    setNavigationStarted(false);
    setRoutePath([]);
    setRouteInfo(null); // 🔥 Phase 33: 경로 정보 초기화
    setDirectionsResult(null); // 🔥 Phase 33: DirectionsResult 초기화
    
    // 🔥 네비 UI: 경로 정보 초기화 콜백 호출
    if (onRouteInfoUpdate) {
      onRouteInfoUpdate(null);
    }
    setShowDirectionHint(false);
    // 🔥 Phase 32.5: selectedPlaceId는 유지 (선택 상태 고정)
    // recommendedPlace도 유지하여 Phase 28 카드가 다시 표시될 수 있도록 함
    // 🔥 Phase 32: places와 recommendedPlace는 유지 (다음 사용을 위한 여운)
    // 사용자가 다시 말할 수 있도록 상태는 유지하되, 네비게이션만 종료
    console.log('🛑 [MapController] Phase 32.5: 네비게이션 중지 (선택 상태 유지, 다음 사용을 위한 자연스러운 복귀)');
  };

  // 🔥 Phase 26: 목적지 근처 도착 감지 (50~100m 반경)
  const isNearDestination = useMemo(() => {
    if (!navigationStarted || !recommendedPlace || !locationState || locationState.status !== 'ready') {
      return false;
    }

    const distance = getDistanceKm(
      { lat: locationState.lat, lng: locationState.lng },
      { lat: recommendedPlace.lat, lng: recommendedPlace.lng }
    );

    // 🔥 Phase 26: 100m (0.1km) 이내면 도착으로 간주
    return distance <= 0.1;
  }, [navigationStarted, recommendedPlace, locationState]);

  // 🔥 Phase 30: 경로 이탈 감지 (네비게이션 중일 때만)
  useEffect(() => {
    if (!navigationStarted || !locationState || locationState.status !== 'ready' || routePath.length === 0) {
      setShowRouteDeviation(false);
      return;
    }

    const isDeviation = isRouteDeviation(
      { lat: locationState.lat, lng: locationState.lng },
      routePath,
      0.05 // 50m 이탈 기준
    );

    if (isDeviation) {
      setShowRouteDeviation(true);
      console.log('⚠️ [MapController] Phase 30: 경로 이탈 감지');
    } else {
      setShowRouteDeviation(false);
    }
  }, [navigationStarted, locationState, routePath]);

  // 🔥 Phase 31: 도착 감지 및 안내 종료 (감정 설계)
  useEffect(() => {
    if (isNearDestination && navigationStarted && !arrived) {
      // 🔥 Phase 31: 도착 상태 설정
      setArrived(true);
      
      // 🔥 Phase 32: 안내 종료 (부드럽게, 긍정적 마무리, 다음 사용을 위한 여운)
      // 도착 배너가 충분히 보인 후 (2.5초) 안내 종료
      // places와 recommendedPlace는 유지하여 "다시 말할 수 있다"는 암묵적 신호 유지
      setTimeout(() => {
        setNavigationStarted(false);
        setRoutePath([]);
        setShowDirectionHint(false);
        // 🔥 Phase 32: places와 recommendedPlace는 유지 (다음 사용을 위한 여운)
        console.log('✅ [MapController] Phase 32: 도착 - 부드러운 안내 종료 (다음 사용을 위한 여운 유지)');
      }, 2500); // 도착 배너 표시 후 부드러운 안내 종료

      // 🔥 Phase 31: 기억 질문 표시 (안내 종료 후, 자연스러운 전환)
      // 사용자가 성취감을 느낀 후 기억 질문 (3.5초)
      setTimeout(() => {
        setShowMemoryPrompt(true);
        console.log('✅ [MapController] Phase 32: 기억 질문 표시 (자연스러운 전환, 다음 사용을 위한 여운 유지)');
      }, 3500); // 도착 배너 사라진 후 기억 질문
    }
  }, [isNearDestination, navigationStarted, arrived]);

  // 🔥 Phase 26: 기억 저장 핸들러 (명시적 동의 후 저장)
  const handleSaveMemoryPhase26 = async () => {
    if (!recommendedPlace) return;

    // 🔥 Phase 26: 명시적 동의 후 저장 (로컬 + 서버)
    saveMemory({
      placeId: recommendedPlace.id,
      keyword: searchQuery || '검색',
      lat: recommendedPlace.lat,
      lng: recommendedPlace.lng,
      timestamp: Date.now(),
    });

    // 🔥 Phase 12: 서버 기억 저장
    await savePreferenceToServer(recommendedPlace, searchQuery || '검색');

    setShowMemoryPrompt(false);
    console.log('✅ [MapController] Phase 32: 기억 저장 완료 (로컬 + 서버, 긍정적 마무리, 다음 사용을 위한 여운 유지)');
    
    // 🔥 Phase 32: 기억 설명 토스트 표시 (다음 사용을 위한 자연스러운 전환)
    // places와 recommendedPlace는 유지하여 "다시 말할 수 있다"는 암묵적 신호 유지
    setMemoryJustSaved(true);
    
    // 🔥 Phase 28: 첫 기억 저장 시 요약 카드 표시 (선택적)
    // 사용자가 요청할 때만 표시하도록 함 (자동 표시 안 함)
    
    // 🔥 Phase 12: 서버 기억 다시 로드
    const preferences = await loadPreferencesFromServer();
    setServerPreferences(preferences);
  };

  // 🔥 Phase 27: 기억 설명 토스트 종료 핸들러
  const handleMemoryExplainTimeout = () => {
    setMemoryJustSaved(false);
    console.log('✅ [MapController] Phase 27: 기억 설명 토스트 종료');
  };

  // 🔥 Phase 32: 기억 거절 핸들러 (다음 사용을 위한 자연스러운 복귀)
  const handleDismissMemoryPhase26 = () => {
    setShowMemoryPrompt(false);
    // 🔥 Phase 32: places와 recommendedPlace는 유지 (다음 사용을 위한 여운)
    console.log('✅ [MapController] Phase 32: 기억 질문 거절 (다음 사용을 위한 자연스러운 복귀)');
  };

  // 🔥 Phase 11: 추천 이유 생성 함수 (간단 버전)
  const getRecommendationReason = (place: MapPlace | null): string => {
    if (!place) return '';
    
    // 🔥 Phase 10: 기억 기반 추천 확인
    const latestMemory = getLatestMemory();
    if (latestMemory && latestMemory.placeId === place.id) {
      return '이전에 선택하신 장소예요';
    }
    
    // 🔥 Phase 7: 거리 기반 추천
    if (nearestPlace && nearestPlace.id === place.id) {
      if (nearestPlace.distance < 0.5) {
        return '가장 가까운 장소예요';
      }
      return '가까운 곳이에요';
    }
    
    return '추천 장소예요';
  };

  // 🔥 Phase 14: 추천 이유 상세 리스트 생성 함수
  const getDetailedRecommendationReasons = (place: MapPlace | null): string[] => {
    if (!place) return [];
    
    const reasons: string[] = [];
    
    // 🔥 거리 기반
    if (nearestPlace && nearestPlace.id === place.id) {
      if (nearestPlace.distance < 0.5) {
        reasons.push('현재 위치에서 가까워요');
      } else {
        reasons.push('가까운 거리라 추천했어요');
      }
    }
    
    // 🔥 기억 기반
    const latestMemory = getLatestMemory();
    if (latestMemory && latestMemory.placeId === place.id) {
      reasons.push('이전에 선택한 기록이 있어요');
    }
    
    // 🔥 서버 기억 기반
    const serverMemory = serverPreferences.find(p => p.placeId === place.id);
    if (serverMemory && serverMemory.preferred) {
      reasons.push('같은 유형의 장소를 자주 선택했어요');
    }
    
    return reasons.length > 0 ? reasons : ['추천 장소예요'];
  };

  // 🔥 좌표 유효성 검증 함수 (재사용)
  const isValidLatLng = (p: { lat?: any; lng?: any } | null | undefined): boolean => {
    if (!p) return false;
    return (
      typeof p.lat === 'number' &&
      typeof p.lng === 'number' &&
      !Number.isNaN(p.lat) &&
      !Number.isNaN(p.lng) &&
      isFinite(p.lat) &&
      isFinite(p.lng) &&
      p.lat >= -90 && p.lat <= 90 &&
      p.lng >= -180 && p.lng <= 180
    );
  };

  // 🔥 도로 스냅 검사 함수: 차량이 진입 가능한 위치인지 확인
  const checkRoadSnap = async (position: { lat: number; lng: number }): Promise<boolean> => {
    const google = window.google?.maps;
    if (!google) {
      console.warn('⚠️ [MapController] Google Maps API 준비되지 않음 → 도로 스냅 검사 스킵');
      return true; // API 없으면 검사 스킵 (기존 동작 유지)
    }

    try {
      // 🔥 방법 1: Google Roads API snapToRoads 사용 (가장 정확)
      // 주의: Roads API는 별도 API 키가 필요할 수 있음
      if (google.RoadsService) {
        return new Promise((resolve) => {
          const roadsService = new google.RoadsService();
          roadsService.snapToRoads(
            {
              path: [{ lat: position.lat, lng: position.lng }],
              interpolate: true,
            },
            (snappedPoints, status) => {
              if (status === google.RoadsServiceStatus.OK && snappedPoints && snappedPoints.length > 0) {
                // 스냅된 좌표와 원본 좌표의 거리 계산
                const snapped = snappedPoints[0];
                // 🔥 이미 상단에서 import된 getDistanceKm 사용 (동적 import 제거)
                const distanceKm = getDistanceKm(
                  { lat: position.lat, lng: position.lng },
                  { lat: snapped.location.lat(), lng: snapped.location.lng() }
                );
                const distanceM = distanceKm * 1000;
                
                // 30m 이내면 도로 근처로 판단
                const isNearRoad = distanceM < 30;
                console.log('🔍 [MapController] 도로 스냅 검사 결과:', {
                  original: position,
                  snapped: { lat: snapped.location.lat(), lng: snapped.location.lng() },
                  distanceM: distanceM.toFixed(1) + 'm',
                  isNearRoad,
                });
                resolve(isNearRoad);
              } else {
                // Roads API 실패 시 Geocoding으로 대체 검사
                console.warn('⚠️ [MapController] Roads API 실패, Geocoding으로 대체 검사:', status);
                checkRoadSnapWithGeocoding(position).then(resolve);
              }
            }
          );
        });
      } else {
        // Roads API 없으면 Geocoding으로 대체
        return checkRoadSnapWithGeocoding(position);
      }
    } catch (error) {
      console.warn('⚠️ [MapController] 도로 스냅 검사 실패, 기본값 반환:', error);
      return true; // 에러 시 검사 스킵 (기존 동작 유지)
    }
  };

  // 🔥 Geocoding API를 사용한 도로 스냅 검사 (대체 방법)
  const checkRoadSnapWithGeocoding = async (position: { lat: number; lng: number }): Promise<boolean> => {
    const google = window.google?.maps;
    if (!google?.Geocoder) {
      return true; // Geocoder 없으면 검사 스킵
    }

    return new Promise((resolve) => {
      const geocoder = new google.Geocoder();
      geocoder.geocode({ location: position }, (results, status) => {
        if (status === google.GeocoderStatus.OK && results && results.length > 0) {
          // 주소 타입 확인 (도로 관련 타입이 있는지)
          const result = results[0];
          const hasRoadType = result.types.some((type: string) => 
            type === 'route' || 
            type === 'street_address' || 
            type === 'premise' ||
            type === 'subpremise'
          );
          
          console.log('🔍 [MapController] Geocoding 도로 스냅 검사 결과:', {
            position,
            addressTypes: result.types,
            hasRoadType,
            formattedAddress: result.formatted_address,
          });
          
          resolve(hasRoadType);
        } else {
          console.warn('⚠️ [MapController] Geocoding 실패, 기본값 반환:', status);
          resolve(true); // Geocoding 실패 시 검사 스킵
        }
      });
    });
  };

  // 🔥 Phase 9: 경로 요청 함수 (Directions API)
  const requestRoute = async (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, mode?: google.maps.TravelMode) => {
    const google = window.google?.maps;
    if (!google?.DirectionsService) {
      console.warn('⚠️ [MapController] DirectionsService 준비되지 않음');
      return null;
    }

    // 🔥 STEP 1: origin 검증 강화 (현재 위치만 허용, fallback 금지)
    if (!isValidLatLng(origin)) {
      console.warn('⚠️ [MapController] origin 좌표가 유효하지 않음 → 경로 계산 차단', { 
        origin,
        latType: typeof origin?.lat,
        lngType: typeof origin?.lng,
        latValue: origin?.lat,
        lngValue: origin?.lng,
        latIsNaN: Number.isNaN(origin?.lat),
        lngIsNaN: Number.isNaN(origin?.lng),
      });
      return null;
    }
    
    const finalOrigin = origin;
    
    // 🔥 STEP 2: destination 좌표 검증 및 변환 (LatLng 객체일 수 있으므로)
    if (!destination || (!destination.lat && !destination.lng)) {
      console.warn('⚠️ [MapController] destination 좌표가 유효하지 않음 → 경로 계산 차단', { destination });
      return null;
    }
    
    // 🔥 destination이 LatLng 객체인 경우 변환
    const finalDestination = {
      lat: typeof destination.lat === 'function' ? destination.lat() : destination.lat,
      lng: typeof destination.lng === 'function' ? destination.lng() : destination.lng,
    };
    
    // 🔥 좌표 유효성 최종 검증 (강화)
    if (!isValidLatLng(finalDestination)) {
      console.warn('⚠️ [MapController] finalDestination 좌표가 유효하지 않음 → 경로 계산 차단', { 
        finalDestination,
        originalDestination: destination,
        latType: typeof finalDestination.lat,
        lngType: typeof finalDestination.lng,
      });
      return null;
    }
    
    // 🔥 STEP 3: 출발지와 도착지 거리 계산 및 검증
    // 이미 파일 상단에서 import된 getDistanceKm 사용
    const distanceKm = getDistanceKm(finalOrigin, finalDestination);
    
    // 🔥 STEP 4: 출발지와 도착지가 동일하거나 너무 가까운지 체크 (30m 이내)
    // 🔥 Google Maps Directions API는 보통 30m 이내는 경로를 계산하지 않음
    if (distanceKm < 0.03) {
      console.warn('⚠️ [MapController] 출발지와 도착지가 너무 가까움 → 경로 계산 스킵 (30m 이내)', {
        origin: finalOrigin,
        destination: finalDestination,
        distanceKm: (distanceKm * 1000).toFixed(0) + 'm',
      });
      return null;
    }

    const finalMode = mode || travelMode || google.TravelMode.WALKING;
    const service = new google.DirectionsService();
    
    // 🔥 디버그 로그: origin/destination/거리 명확히 표시
    console.log('✅ [MapController] 경로 요청 시작', {
      origin: finalOrigin,
      destination: finalDestination,
      distanceKm: distanceKm.toFixed(2) + 'km',
      mode: finalMode,
    });
    
    // 🔥 최종 검증: service.route()에 전달되는 값 확인
    const routeRequest = {
      origin: finalOrigin, // 🔥 고정된 출발지 사용
      destination: finalDestination, // 🔥 변환된 도착지 사용
          travelMode: finalMode, // 🔥 Phase 32: 선택한 이동수단 사용
    };
    
    // 🔥 디버그: 실제 API 요청 값 확인
    console.log('🔍 [MapController] DirectionsService.route() 요청 값:', {
      origin: {
        lat: routeRequest.origin.lat,
        lng: routeRequest.origin.lng,
        latType: typeof routeRequest.origin.lat,
        lngType: typeof routeRequest.origin.lng,
        latIsFinite: isFinite(routeRequest.origin.lat),
        lngIsFinite: isFinite(routeRequest.origin.lng),
      },
      destination: {
        lat: routeRequest.destination.lat,
        lng: routeRequest.destination.lng,
        latType: typeof routeRequest.destination.lat,
        lngType: typeof routeRequest.destination.lng,
        latIsFinite: isFinite(routeRequest.destination.lat),
        lngIsFinite: isFinite(routeRequest.destination.lng),
      },
      travelMode: routeRequest.travelMode,
      distanceKm: distanceKm.toFixed(2) + 'km',
    });
    
    return new Promise<{ distance: string; duration: string } | null>((resolve) => {
      service.route(
        routeRequest,
        (result, status) => {
          if (status === google.DirectionsStatus.OK && result) {
            console.log('✅ [MapController] 경로 계산 성공', {
              origin: finalOrigin,
              destination: finalDestination,
              routeCount: result.routes.length,
            });
            const path = result.routes[0].overview_path.map((p: google.maps.LatLng) => ({
              lat: p.lat(),
              lng: p.lng(),
            }));
            setRoutePath(path);
            if (process.env.NODE_ENV === 'development') {
              console.debug('[ROUTE] polyline ready', {
                pathLength: path.length,
                encodedPolyline: result.routes[0].overview_polyline?.points || 'N/A',
              });
            }
            
            // 🔥 Phase 33: DirectionsResult 저장 (DirectionsRenderer용)
            setDirectionsResult(result);
            
            // 🔥 Phase 32: ETA + 거리 추출
            const leg = result.routes[0]?.legs?.[0];
            const distance = leg?.distance?.text || '';
            const duration = leg?.duration?.text || '';
            
            if (process.env.NODE_ENV === 'development') {
              console.debug('[MapController] Phase 33: 경로 정보 추출', { distance, duration });
            }
            
            // 🔥 Phase 33: 경로 정보 상태 저장 (UI 표시용)
            setRouteInfo({ distance, duration });
            
            // 🔥 네비 UI: 경로 정보 업데이트 콜백 호출
            if (onRouteInfoUpdate) {
              onRouteInfoUpdate({ distance, duration });
            }
            
            // ✅ MVP: 첫 턴 포인트 음성 1-shot (경로 계산 완료 시)
            if (phase === 'NAVIGATING' && leg?.steps && leg.steps.length > 0 && !hasSpokenFirstTurnRef.current) {
              const firstStep = leg.steps[0];
              const instruction = firstStep.instructions || '';
              
              // ✅ MVP: 첫 턴 음성 멘트 생성 (간단한 형태)
              if (instruction) {
                // HTML 태그 제거 및 간단한 멘트 생성
                const cleanInstruction = instruction.replace(/<[^>]*>/g, '').trim();
                const distanceText = firstStep.distance?.text || '';
                const voiceGuide = distanceText 
                  ? `약 ${distanceText} 앞에서 ${cleanInstruction}`
                  : cleanInstruction;
                
                if (process.env.NODE_ENV === 'development') {
                  console.debug('[NAV] 첫 턴 음성 준비:', {
                    instruction: cleanInstruction,
                    distance: distanceText,
                    voiceGuide,
                  });
                }
                
                // ✅ MVP: 첫 턴 음성 재생 (동적 import로 TTS 사용)
                import('@/utils/speech').then(({ speakOnce }) => {
                  speakOnce(voiceGuide);
                  hasSpokenFirstTurnRef.current = true;
                  if (process.env.NODE_ENV === 'development') {
                    console.debug('[NAV] 첫 턴 음성 재생 완료 (1회만)');
                  }
                }).catch((error) => {
                  console.warn('⚠️ [MapController] TTS import 실패:', error);
                });
              }
            }
            
            resolve({ distance, duration });
          } else {
            // ✅ MVP: 길 찾기 실패 처리
            console.warn('⚠️ [MapController] 경로 계산 실패:', status);
            
            // 🔥 디버그: 실패 원인 상세 로그
            console.warn('🔍 [MapController] 경로 계산 실패 상세:', {
              status,
              statusText: google.DirectionsStatus[status] || 'UNKNOWN',
              origin: finalOrigin,
              destination: finalDestination,
              distanceKm: distanceKm.toFixed(2) + 'km',
              travelMode: finalMode,
              originValid: isFinite(finalOrigin.lat) && isFinite(finalOrigin.lng),
              destValid: isFinite(finalDestination.lat) && isFinite(finalDestination.lng),
            });
            
            // 🔥 수정: ZERO_RESULTS 처리 (origin이 invalid한 경우와 실제 경로 없는 경우 구분)
            if (status === google.DirectionsStatus.ZERO_RESULTS) {
              // 🔥 origin이 invalid하면 ERROR로 처리 (ZERO_RESULTS는 실제 경로 없는 경우만)
              const originValid = isValidLatLng(finalOrigin);
              
              console.log('ℹ️ [MapController] ZERO_RESULTS 발생', {
                origin: finalOrigin,
                destination: finalDestination,
                distanceKm: distanceKm.toFixed(2) + 'km',
                originValid,
                destValid: isValidLatLng(finalDestination),
              });
              
              // 🔥 네비 UI: origin이 invalid하면 ERROR, 아니면 ZERO_RESULTS
              if (onRouteFailed) {
                if (!originValid) {
                  // 🔥 origin이 invalid하면 ERROR로 처리 (위치 미확정)
                  console.warn('⚠️ [MapController] ZERO_RESULTS but origin invalid → ERROR 처리');
                  onRouteFailed('ERROR');
                } else {
                  // 🔥 origin이 valid하면 실제 경로 없는 경우
                  onRouteFailed('ZERO_RESULTS');
                }
              }
            resolve(null);
              return;
            }
            
            // 🔥 네비 UI: 기타 경로 실패 콜백
            if (onRouteFailed) {
              if (status === google.DirectionsStatus.NOT_FOUND) {
                onRouteFailed('NOT_FOUND');
              } else {
                onRouteFailed('ERROR');
              }
            }
            
            // ✅ MVP: NAVIGATING 진입 차단, ARRIVED 차단 (ZERO_RESULTS 제외)
            if (onRouteError && typeof onRouteError === 'function') {
              try {
                onRouteError();
              } catch (error) {
                console.error('⚠️ [MapController] onRouteError 호출 실패:', error);
              }
            }
            resolve(null);
          }
        }
      );
    });
  };

  // 🔥 길 안내 실행 함수
  const handleNavigate = async () => {
    if (!recommendedPlace || !locationState || locationState.status !== 'ready') {
      return;
    }

    // 🔥 Phase 13: 첫 방문 시 계정 제안
    if (isFirstVisit()) {
      setPendingPlace(recommendedPlace);
      setShowAccountPrompt(true);
      return;
    }

    // 🔥 Phase 23: 즉시 피드백 - 선택된 장소 ID 설정
    setSelectedPlaceId(recommendedPlace.id);
    setShowStartFeedback(true);
    
    // 🔥 Phase 23: 지도 중심을 선택된 장소로 이동 (WebMapRenderer에서 처리)
    setCenter({
      lat: recommendedPlace.lat,
      lng: recommendedPlace.lng,
      source: 'explicit',
    });

    // 🔥 Phase 23: 피드백 메시지 1초 후 사라짐
    setTimeout(() => {
      setShowStartFeedback(false);
    }, 1000);

    // 🔥 Phase 9: 길 안내 시작 (피드백 후)
    setTimeout(() => {
      setNavigationStarted(true);
      setRoutePath([]); // 경로 초기화
      
      // 🔥 Phase 24: 방향 힌트 표시 시작
      setShowDirectionHint(true);
      
      // 🔥 Phase 24: 방향 힌트 메시지 2초 후 사라짐
      setTimeout(() => {
        setShowDirectionHint(false);
        
        // 🔥 Phase 9: 경로 요청 (Directions API) - 방향 힌트 후
        requestRoute(
          { lat: locationState.lat, lng: locationState.lng },
          { lat: recommendedPlace.lat, lng: recommendedPlace.lng }
        ).then(() => {
          // 🔥 기존 로직: 외부 지도 열기
          const url = `https://www.google.com/maps/dir/?api=1&origin=${locationState.lat},${locationState.lng}&destination=${recommendedPlace.lat},${recommendedPlace.lng}`;
          window.open(url, '_blank');

          console.log('[MapController] 외부 지도 열기:', {
            from: { lat: locationState.lat, lng: locationState.lng },
            to: { lat: recommendedPlace.lat, lng: recommendedPlace.lng },
          });

          // 🔥 Phase 10: 도착 시뮬레이션 (5초 후, 실제로는 사용자가 외부 지도에서 도착 확인)
          setTimeout(() => {
            setArrived(true);
            setShowMemoryPrompt(true);
            console.log('[MapController] 도착 시뮬레이션 완료 (기억 질문 표시)');
          }, 5000);
        });
      }, 2000); // 🔥 Phase 24: 방향 힌트 메시지 2초 표시
    }, 1200); // 🔥 Phase 23: 피드백 메시지 표시 후 1.2초 뒤 길 안내 시작
  };

  // 🔥 천재 모드: 행동 학습 로깅
  const { logClick, startDwell, stopDwell, logNavigation } = useBehaviorLogging();

  // 🔥 Phase 32: 마커 클릭 → 장소 선택 → Phase 32 진입 (길찾기 모드)
  // 🔒 CONFIRMED 상태 보호: 목적지 확정 상태에서는 마커 클릭으로 추천 변경 차단
  const handleSelectPlace = (place: MapPlace) => {
    // 🔒 CONFIRMED/NAVIGATING 상태면 마커 클릭으로 추천 변경 차단
    if (searchPhase === 'confirmed' || searchPhase === 'navigating') {
      console.log('🔒 [MapController] CONFIRMED 상태 보호: 마커 클릭으로 추천 변경 차단');
      return;
    }
    
    console.log('🔴 [MapController] Phase 32: 마커 클릭 감지 → 장소 선택 시작:', {
      placeId: place.id,
      placeName: place.name,
      lat: place.lat,
      lng: place.lng,
    });
    
    // 🔥 천재 모드: 클릭 로깅
    logClick(place.id, place.name);
    
    // 🔥 천재 모드: 체류 시작
    startDwell(place.id, place.name);
    
    // 🔥 Phase 32: 1단계 - 추천 장소 설정
    // setRecommendedPlaceId(place.id); // ❌ 추천 로직 제거됨
    setSelectedPlaceId(place.id);
    console.log('✅ [MapController] Phase 32: 추천 장소 설정 완료:', place.id);
    
    // 🔥 Phase 32: 2단계 - 즉시 TTS 발화
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      import('@/utils/speech').then(({ speakOnce }) => {
        const placeName = place.name || '이 장소';
        speakOnce(`여기로 안내할게요. ${placeName}입니다.`);
        console.log('🔊 [MapController] Phase 32: TTS 발화 완료:', `여기로 안내할게요. ${placeName}입니다.`);
      });
    }
    
    // 🔥 Phase 32: 3단계 - onSelectPlace 콜백 호출 (MapPageContainer에서 showConfirmStart 설정)
    // 이 콜백이 호출되면 MapPageContainer에서 setShowConfirmStart(true)가 실행되어 Phase 28 카드가 표시됨
    if (onSelectPlace) {
      console.log('🔄 [MapController] Phase 32: onSelectPlace 콜백 호출 시작');
      const placeLite = {
        placeId: place.id,
        name: place.name || '',
        location: { lat: place.lat, lng: place.lng },
        address: undefined,
        rating: undefined,
        userRatingsTotal: undefined,
        openNow: undefined,
        distanceM: undefined,
      };
      onSelectPlace(placeLite);
      console.log('✅ [MapController] Phase 32: onSelectPlace 콜백 호출 완료 → MapPageContainer에서 showConfirmStart=true 설정 예상');
    } else {
      console.warn('⚠️ [MapController] Phase 32: onSelectPlace 콜백이 없습니다. Phase 28 카드가 표시되지 않을 수 있습니다.');
    }
    
    // 🔥 Phase 32: 4단계 - navIntent 설정 (Phase 28 진입을 위한 추가 트리거)
    if (onPlaceSelected) {
      console.log('🔄 [MapController] Phase 32: onPlaceSelected 콜백 호출');
      onPlaceSelected();
    }
    
    console.log('✅ [MapController] Phase 32: 마커 클릭 처리 완료 → Phase 28 카드 표시 대기 중');
  };

  // 🔥 Phase 22: 다른 곳 보여주기 함수
  const handleShowOther = () => {
    if (!nearestPlace || places.length <= 1) {
      return;
    }
    
    // 🔥 현재 추천 장소를 제외한 나머지 중에서 다음 추천 선택
    const otherPlaces = places.filter(p => p.id !== recommendedPlaceId);
    if (otherPlaces.length > 0) {
      // 거리 기준으로 정렬하여 다음 가까운 곳 선택
      const sorted = otherPlaces.map(place => ({
        ...place,
        distance: locationState && locationState.status === 'ready'
          ? getDistanceKm(
              { lat: locationState.lat, lng: locationState.lng },
              { lat: place.lat, lng: place.lng }
            )
          : 0,
      })).sort((a, b) => a.distance - b.distance);
      
      const nextPlace = sorted[0];
      // setRecommendedPlaceId(nextPlace.id); // ❌ 추천 로직 제거됨
      console.log('[MapController] 다른 곳 선택:', nextPlace.id, nextPlace.name);
      
      // 🔥 Phase 31: 다른 곳 선택 시 TTS (중복 방지)
      import('@/utils/speech').then(({ speakOnce }) => {
        speakOnce(`${nextPlace.name}은 어떠세요?`);
      });
    }
  };

  // 🔥 리셋 함수
  const handleReset = () => {
    setNavigationStarted(false);
    // setRecommendedPlaceId(undefined); // ❌ 추천 로직 제거됨
    setSelectedPlaceId(undefined); // 🔥 Phase 23: 선택된 장소 초기화
    setShowStartFeedback(false); // 🔥 Phase 23: 피드백 메시지 초기화
    setShowDirectionHint(false); // 🔥 Phase 24: 방향 힌트 초기화
    setRoutePath([]); // 🔥 Phase 9: 경로 초기화
    setArrived(false); // 🔥 Phase 10: 도착 상태 초기화
    setShowMemoryPrompt(false); // 🔥 Phase 10: 기억 질문 닫기
    console.log('[MapController] 리셋');
  };

  // 🔥 Phase 10: 기억 저장 함수
  const handleSaveMemory = async () => {
    if (!recommendedPlace || !locationState || locationState.status !== 'ready') {
      return;
    }

    // 🔥 Phase 10: 로컬 기억 저장
    saveMemory({
      placeId: recommendedPlace.id,
      keyword: searchQuery || '검색',
      lat: recommendedPlace.lat,
      lng: recommendedPlace.lng,
      timestamp: Date.now(),
    });

    // 🔥 Phase 12: 서버 기억 저장
    await savePreferenceToServer(recommendedPlace, searchQuery || '검색');

    setShowMemoryPrompt(false);
    console.log('[MapController] 기억 저장 완료 (로컬 + 서버)');
    
    // 🔥 Phase 12: 서버 기억 다시 로드
    const preferences = await loadPreferencesFromServer();
    setServerPreferences(preferences);
  };

  // 🔥 Phase 10: 기억 질문 닫기
  const handleDismissMemory = () => {
    setShowMemoryPrompt(false);
    console.log('[MapController] 기억 질문 닫기');
  };

  // 🔥 Phase 14: 기억 제어 패널 열기/닫기
  const handleToggleMemoryControl = () => {
    setShowMemoryControl(!showMemoryControl);
  };

  // 🔥 Phase 28: 기억 요약 카드 열기/닫기
  const handleToggleMemorySummary = () => {
    setShowMemorySummary(!showMemorySummary);
  };

  // 🔥 Phase 28: 기억 삭제 후 콜백
  const handleMemoryDeleted = () => {
    // 서버 기억 다시 로드
    loadPreferencesFromServer().then(preferences => {
      setServerPreferences(preferences);
    });
  };

  // 🔥 Phase 14: 기억 토글 처리
  const handleMemoryToggle = (enabled: boolean) => {
    console.log('[MapController] 기억 토글:', enabled);
    // 기억이 꺼지면 추천 재계산 필요할 수 있음
    if (!enabled) {
      // 추천 재계산 (기억 없이)
      const currentRecommended = recommendedPlaceId;
      // setRecommendedPlaceId(undefined); // ❌ 추천 로직 제거됨
      setTimeout(() => {
        if (nearestPlace) {
          setRecommendedPlaceId(nearestPlace.id);
        }
      }, 100);
    }
  };

  // 🔥 Phase 14: 기억 삭제 처리
  const handleMemoryClear = () => {
    console.log('[MapController] 모든 기억 삭제');
    setServerPreferences([]);
    // 추천 재계산 (기억 없이)
    if (nearestPlace) {
      setRecommendedPlaceId(nearestPlace.id);
    }
  };

  // 🔥 Phase 14: 카테고리 추천 끄기
  const handleDisableCategory = async (category: string) => {
    // 이미 파일 상단에서 import된 disableCategoryRecommendation 사용
    await disableCategoryRecommendation(category);
    setDisabledCategories(prev => [...prev, category]);
    console.log('[MapController] 카테고리 추천 비활성화:', category);
    // 추천 재계산
    if (nearestPlace) {
      setRecommendedPlaceId(nearestPlace.id);
    }
  };

  // 🔥 Phase 14: 특정 장소 기억 삭제
  const handleDeletePlaceMemory = async (placeId: string) => {
    // 이미 파일 상단에서 import된 deletePlaceMemory 사용
    await deletePlaceMemory(placeId);
    setServerPreferences(prev => prev.filter(p => p.placeId !== placeId));
    console.log('[MapController] 장소 기억 삭제:', placeId);
    // 추천 재계산
    if (nearestPlace) {
      setRecommendedPlaceId(nearestPlace.id);
    }
  };

  // 🔥 검색 실행 (activeSearchQuery가 변경되면 자동 실행) - 디바운싱 추가
  // 🔥 데이터 복구: activeSearchQuery 사용 (검색어 상태 유지)
  useEffect(() => {
    if (!activeSearchQuery || !activeSearchQuery.trim()) {
      // 🔥 핵심 수정: 검색어가 없으면 기존 places 유지 (빈 배열로 초기화 금지)
      // DEV 모드에서는 TEST_PLACES 보호, PROD 모드에서는 Firestore places 보호
      console.log('🔒 [MapController] 검색어 없음 - 기존 장소 유지 (places 초기화 차단)');
      return;
    }

    // 🔥 디바운싱: 300ms 대기 후 검색 실행 (연속 입력 방지, 무분별한 API 호출 방지)
    const debounceTimer = setTimeout(() => {
      performSearch();
    }, 300);

    const performSearch = async () => {
      // 🔥 v4: SEARCHING 또는 CONFIRMED 상태에서 검색 허용 (새 검색어 입력 시)
      // ARRIVED 상태에서는 검색 차단 (종착역)
      if (phase !== 'SEARCHING' && phase !== 'CONFIRMED') {
        console.warn('[SEARCH] BLOCKED (phase:', phase, ')');
        setIsSearching(false);
        return;
      }
      
      // 🔥 최우선: navigationStarted가 true면 검색 완전 차단 (데이터 덮어쓰기 방지)
      if (navigationStarted) {
        console.warn('[SEARCH] BLOCKED (navigationStarted is true)', {
          query: queryText,
          navigationStarted,
          phase,
        });
        setIsSearching(false);
        return;
      }
      
      // 🔥 방어 코드: 지도 인스턴스 체크 (검색 시작 전 필수)
      const mapInstance = mapRef.current || (window as any).__MAP_INSTANCE__;
      if (!mapInstance) {
        console.warn('[MapController] ⚠️ 검색 시작 전 지도 인스턴스 없음 - 검색 대기', {
          hasMapRef: !!mapRef.current,
          hasWindowInstance: !!(window as any).__MAP_INSTANCE__,
        });
        setIsSearching(false);
        return;
      }
      
      // 🔥 비동기 경합 방지: 요청 ID 증가
      const currentRequestId = ++searchRequestIdRef.current;
      setIsSearching(true);
      
      try {
        // 🔥 Places API 준비
        const { ensurePlacesReady } = await import("@/utils/PlacesManager");
        const { Place } = await ensurePlacesReady();

        if (!Place || typeof Place.searchByText !== 'function') {
          console.warn('⚠️ [MapController] Places API 준비되지 않음 - 기존 장소 유지');
          // 🔥 핵심 수정: Places API 준비 안 됐을 때도 기존 places 유지 (빈 배열로 초기화 금지)
          setIsSearching(false);
          return;
        }

        // 🔥 수정: 위치 없어도 검색 허용 (fallback 좌표 사용)
        // 모바일에서 GPS 확보 전에도 검색 가능하도록 fallback 허용
        if (!isLocationReady()) {
          console.warn('⚠️ [MapController] location not ready - fallback 좌표로 검색 진행:', {
            locationStatus: locationState?.status,
            isMobile: isMobileLikeDevice(),
          });
          // 검색은 계속 진행 (resolveSearchCenter가 fallback 좌표 반환)
        }

        // 🔥 Phase L 검증: 검색 직전 Location 로그 (필수, 항상 찍힘)
        console.log('[LocationController]', locationState);

        // 🔥 Phase 6: 검색 중심점 확인 로그
        if (locationState && locationState.status === 'ready') {
          console.log('[MapController] search center confirmed', {
            lat: locationState.lat,
            lng: locationState.lng,
            source: locationState.source,
            status: locationState.status,
          });
        } else {
          console.log('[MapController] 개발 모드: 기본 좌표로 검색');
        }

        // 🔥 검색 중심점 결정 (Single Source of Truth)
        const resolvedCenter = resolveSearchCenter({
          explicitCenter: searchCenter,
          locationState: locationState, // 🔥 Phase L: LocationController에서 받은 위치 상태 사용
          mapCenter: center,
          defaultCenter: { lat: 37.754, lng: 127.114 }, // 🔥 경기도 의정부시 용민로 420 (37.754, 127.114) 기본값 - 정확한 좌표
        });
        
        // 🔥 Places API 호출 (fields는 반드시 배열 형태)
        // 🔥 강화: fields를 명시적으로 배열로 보장
        const fieldsArray: string[] = [
            'id',
            'displayName',
            'location',
            'formattedAddress',
        ];
        
        // 🔥 검증: fields가 배열인지 확인 (런타임 강제 검증)
        if (!Array.isArray(fieldsArray)) {
          console.error('❌ [MapController] fields가 배열이 아님:', typeof fieldsArray, fieldsArray);
          throw new Error('fields must be an array');
        }
        
        // 🔥 최종 검증: request 객체 생성 직전 fields 재확인
        const finalFields = Array.isArray(fieldsArray) ? [...fieldsArray] : [];
        if (finalFields.length === 0) {
          console.error('❌ [MapController] fields 배열이 비어있음');
          throw new Error('fields array cannot be empty');
        }
        
        const request = {
          textQuery: activeSearchQuery.trim(), // 🔥 데이터 복구: activeSearchQuery 사용
          // ✅ fields는 반드시 배열 형태 (콤마 문자열 절대 금지)
          // 🔥 최종 보장: 새 배열로 복사하여 전달
          fields: finalFields,
          locationBias: {
            center: { lat: resolvedCenter.lat, lng: resolvedCenter.lng },
            radius: 1000, // 🔥 검색 범위 확장: 1km로 조정 (의정부역 주변 상세 핀 확보)
          },
          // 🔥 검색 범위 확장: establishment, point_of_interest 타입 명시적으로 추가
          includedTypes: ['establishment', 'point_of_interest', 'restaurant', 'cafe', 'store', 'shopping_mall'],
          maxResultCount: 20, // 🔥 검색 방식 변경: 최소 10~20개의 결과를 가져오게 (의정부역 주변 상세 핀 확보)
        };
        
        // 🔥 API 호출 직전 최종 검증 (디버깅용)
        if (!Array.isArray(request.fields)) {
          console.error('❌ [MapController] request.fields가 배열이 아님!', {
            type: typeof request.fields,
            value: request.fields,
            isArray: Array.isArray(request.fields),
          });
          throw new Error('request.fields must be an array');
        }

        console.log('🔍 [MapController] Places API 검색 시작...', {
          searchQuery: activeSearchQuery, // 🔥 데이터 복구: activeSearchQuery 사용
          fields: request.fields,
          fieldsType: Array.isArray(request.fields) ? 'array' : typeof request.fields,
          fieldsLength: Array.isArray(request.fields) ? request.fields.length : 'N/A',
        });

        // 🔥 함수 교체: google.maps.places.PlacesService의 textSearch 함수를 사용하도록 로직을 변경 (현재는 결과가 1개만 나오는 함수를 쓰고 있어)
        const mapInstance = mapRef.current || (window as any).__MAP_INSTANCE__;
        let rawSearchResults: any[] = [];
        
        if (mapInstance && window.google?.maps?.places) {
          // 🔥 textSearch 사용: 검색 반경 설정 radius: 2000 (2km) 옵션을 추가
          try {
            const service = new window.google.maps.places.PlacesService(mapInstance);
            
            // 🔥 검색 반경 설정: 검색 시 현재 지도 중심(map.getCenter())을 기준으로 radius: 2000 (2km) 옵션을 추가
            const mapCenter = mapInstance.getCenter();
            const searchLocation = mapCenter 
              ? new window.google.maps.LatLng(mapCenter.lat(), mapCenter.lng())
              : new window.google.maps.LatLng(resolvedCenter.lat, resolvedCenter.lng);
            
            const textSearchResults = await new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
              service.textSearch({
                query: activeSearchQuery.trim(),
                location: searchLocation, // 🔥 현재 지도 중심(map.getCenter())을 기준으로
                radius: 1500, // 🔥 검색 범위 확장: 현재 지도 중심(map.getCenter())을 기준으로 radius: 1500 (1.5km) 옵션을 추가해서 주변 맛집과 카페를 최소 10개 이상 가져오게 해줘
                // 🔥 locationBias 추가: 현재 지도 중심을 기준으로 검색 결과를 더 정확하게 가져오기
                locationBias: {
                  lat: searchLocation.lat(),
                  lng: searchLocation.lng(),
                },
              }, (results, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                  resolve(results);
                } else {
                  reject(new Error(`textSearch failed: ${status}`));
                }
              });
            });
            
            // 🔥 textSearch 결과를 New Places API 형식으로 변환
            rawSearchResults = textSearchResults.map((result: any) => ({
              id: result.place_id,
              displayName: { text: result.name },
              location: result.geometry?.location,
              formattedAddress: result.formatted_address,
              types: result.types || [],
              name: result.name, // 🔥 name 필드 추가 (WebMapRenderer에서 사용)
              place_id: result.place_id, // 🔥 place_id 필드 추가
            }));
            
            console.log('✅ [MapController] textSearch 완료:', {
              resultsCount: rawSearchResults.length,
              query: activeSearchQuery,
              center: { lat: searchLocation.lat(), lng: searchLocation.lng() },
              radius: 2000,
            });
          } catch (textSearchError) {
            console.warn('⚠️ [MapController] textSearch 실패, searchByText로 폴백:', textSearchError);
            // 🔥 폴백: textSearch 실패 시 searchByText 사용
            const { places } = await Place.searchByText(request);
            rawSearchResults = places || [];
          }
        } else {
          // 🔥 폴백: map 인스턴스가 없으면 searchByText 사용
          console.warn('⚠️ [MapController] map 인스턴스 없음, searchByText로 폴백');
          const { places } = await Place.searchByText(request);
          rawSearchResults = places || [];
        }

        // 🔥 데이터 세탁: API 응답을 받자마자 JSON.parse(JSON.stringify())로 변환
        // 구글 특유의 함수형 객체를 원천 차단
        let searchResults: any[] = [];
        try {
          if (rawSearchResults && Array.isArray(rawSearchResults) && rawSearchResults.length > 0) {
            // 🔥 함수형 객체를 순수 데이터로 변환 (함수 제거)
            searchResults = JSON.parse(JSON.stringify(rawSearchResults));
          } else {
            searchResults = [];
          }
        } catch (error) {
          console.warn('[MapController] 데이터 세탁 실패, 빈 배열 반환:', error);
          // 🔥 무조건 빈 배열 반환: 에러가 감지되면 return []로 앱이 절대로 죽지 않게 보장
          searchResults = [];
        }

        console.log('✅ [MapController] Places API 검색 완료', { 
          resultsCount: searchResults?.length || 0,
          rawResultsCount: rawSearchResults?.length || 0,
        });

        // 🔥 결과를 MapPlace[] 형태로 변환 (New Places API는 location을 직접 제공)
        // 🔥 최종 해결책: getSafeLatLng 사용
        console.log('🔍 [MapController] Places API 원본 결과 샘플', searchResults?.slice(0, 2).map((r: any) => {
          const coords = getSafeLatLng(r);
          return {
            id: r?.id,
            displayName: r?.displayName?.text || r?.displayName,
            location: coords ? {
              lat: coords.lat,
              lng: coords.lng,
          } : 'missing',
          };
        }));

        // 🔥 결과 없음 방어: 빈 배열일 때는 기존 places 유지
        if (!searchResults || searchResults.length === 0) {
          console.warn('[MapController] Places API: 결과 없음 - 기존 장소 유지');
          // onPlacesUpdate?.([]); 제거 - 빈 배열 전달하지 않음 (기존 places 유지)
          // 🔥 핵심 수정: 검색 결과가 없어도 기존 places 유지 (빈 배열로 초기화 금지)
          setIsSearching(false);
          return;
        }

        // 🔥 결과 없음 방어: places.map이나 forEach 실행 전 빈 배열 체크
        if (!searchResults || !Array.isArray(searchResults) || searchResults.length === 0) {
          console.warn('[MapController] 검색 결과가 비어있음 - 기존 장소 유지');
          // onPlacesUpdate?.([]); 제거 - 빈 배열 전달하지 않음 (기존 places 유지)
          // 🔥 핵심 수정: 검색 결과가 없어도 기존 places 유지 (빈 배열로 초기화 금지)
          setIsSearching(false);
          return;
        }

        // 🔥 STEP 1: 행정구역 제외, 실제 장소 우선 선택
        const validPlaceTypes = [
          'establishment',
          'point_of_interest',
          'park',
          'stadium',
          'gym',
          'hospital',
          'school',
          'restaurant',
          'store',
          'shopping_mall',
        ];
        
        const invalidPlaceTypes = [
          'administrative_area_level_1',
          'administrative_area_level_2',
          'administrative_area_level_3',
          'administrative_area_level_4',
          'administrative_area_level_5',
          'locality',
          'sublocality',
          'neighborhood',
        ];
        
        // 🔥 결과 없음 방어: searchResults.map이나 forEach 실행 전 빈 배열 체크
        if (!searchResults || !Array.isArray(searchResults) || searchResults.length === 0) {
          console.warn('[MapController] searchResults가 비어있음 - 기존 장소 유지');
          // onPlacesUpdate?.([]); 제거 - 빈 배열 전달하지 않음 (기존 places 유지)
          // 🔥 핵심 수정: 검색 결과가 없어도 기존 places 유지 (빈 배열로 초기화 금지)
          setIsSearching(false);
          return;
        }
        
        // 🔥 v4 SEARCH ONLY: 실제 장소 우선 선택 (행정구역은 최후 수단)
        // 🔥 데이터 복구: 좌표가 함수 형태여도 toNumberLatLng로 파싱하여 데이터 유지
        const prioritizedResults = searchResults
          .filter((place: any) => {
            // 🔥 방어 코드: location 필수
            if (!place?.location) {
              console.warn('[MapController] location 없음:', {
                id: place?.id,
                name: place?.displayName?.text || place?.name,
              });
              // 🔥 데이터 복구: location이 없어도 id가 있으면 Place Details에서 가져올 수 있으므로 유지
              const hasId = place?.id || place?.place_id;
              if (hasId) {
                console.log('[MapController] location 없지만 id 있음 - Place Details에서 복구 가능:', {
                  id: place?.id,
                  place_id: place?.place_id,
                });
                return true;
              }
              return false;
            }
            
            // 🔥 변환부 강제 보호: 데이터가 완벽할 때만 변환 진행
            if (!place || (!place.geometry && !place.location)) {
              console.warn('[MapController] 유효하지 않은 place 객체 스킵:', {
                hasPlace: !!place,
                hasGeometry: !!place?.geometry,
                hasLocation: !!place?.location,
                id: place?.id,
              });
              // 🔥 데이터 복구: geometry/location이 없어도 id가 있으면 Place Details에서 가져올 수 있으므로 유지
              const hasId = place?.id || place?.place_id;
              if (hasId) {
                console.log('[MapController] geometry/location 없지만 id 있음 - Place Details에서 복구 가능:', {
                  id: place?.id,
                  place_id: place?.place_id,
                });
                return true;
              }
              return false;
            }
            
            // 🔥 안전한 추출 도구 사용: getSafeLatLng 함수로 변환 과정 보호
            let coords: { lat: number; lng: number } | null = null;
            try {
              coords = getSafeLatLng(place);
            } catch (error) {
              console.warn('[MapController] getSafeLatLng 호출 실패:', error, {
                id: place?.id,
                name: place?.displayName?.text || place?.name,
              });
              // 🔥 데이터 복구: 좌표 추출 실패해도 id가 있으면 Place Details에서 가져올 수 있으므로 유지
              const hasId = place?.id || place?.place_id;
              if (hasId) {
                console.log('[MapController] 좌표 추출 실패했지만 id 있음 - Place Details에서 복구 가능:', {
                  id: place?.id,
                  place_id: place?.place_id,
                });
                return true;
              }
              return false;
            }
            
            if (!coords) {
              console.warn('[MapController] location 좌표 추출 실패:', {
                id: place?.id,
                name: place?.displayName?.text || place?.name,
                hasGeometry: !!place?.geometry,
                hasLocation: !!place?.location,
              });
              // 🔥 데이터 복구: 좌표 추출 실패해도 id가 있으면 Place Details에서 가져올 수 있으므로 유지
              const hasId = place?.id || place?.place_id;
              if (hasId) {
                console.log('[MapController] 좌표 추출 실패했지만 id 있음 - Place Details에서 복구 가능:', {
                  id: place?.id,
                  place_id: place?.place_id,
                });
                return true;
              }
              return false;
            }
            
            // 🔥 UI 필터 해제: 결과가 1개라도 있으면 하단 리스트에 무조건 표시되도록 필터를 완화
            // 행정구역 타입 제외는 완화 (실제 장소 타입이 없어도 유지)
            const types = place.types || (place.primaryType ? [place.primaryType] : []);
            const hasInvalidType = invalidPlaceTypes.some(type => types.includes(type));
            const hasValidType = validPlaceTypes.some(type => types.includes(type));
            
            // 🔥 UI 필터 해제: 행정구역만 있어도 일단 포함 (나중에 정렬로 우선순위 조정)
            // 행정구역만 있고 실제 장소 타입이 없어도 제외하지 않음 (필터 완화)
            if (hasInvalidType && !hasValidType) {
              console.log('[MapController] 행정구역 타입이지만 필터 완화로 포함:', {
                id: place.id, 
                name: place.displayName?.text || place.name,
                types,
              });
              // 🔥 제외하지 않고 포함 (필터 완화)
            }
            
            return true;
          })
          .sort((a: any, b: any) => {
            // 🔥 실제 장소 타입 우선순위 강화
            const aTypes = a.types || (a.primaryType ? [a.primaryType] : []);
            const bTypes = b.types || (b.primaryType ? [b.primaryType] : []);
            const aHasValid = validPlaceTypes.some(type => aTypes.includes(type));
            const bHasValid = validPlaceTypes.some(type => bTypes.includes(type));
            
            // 🔥 실제 장소 타입이 있으면 무조건 우선
            if (aHasValid && !bHasValid) return -1;
            if (!aHasValid && bHasValid) return 1;
            
            // 🔥 둘 다 실제 장소면 첫 번째 유지, 둘 다 아니면 첫 번째 유지
            return 0;
          });
        
        // 🔥 STEP 2: Place Details API로 정확한 정보 가져오기
        // ⚠️ 중요: Search API는 place_id만 주므로, lat/lng/name/address는 Details 필수
        // 🔥 지도 인스턴스 우선순위: mapRef.current > window.__MAP_INSTANCE__
        const map = mapRef.current || (window as any).__MAP_INSTANCE__;
        if (!map) {
          console.error('[MapController] ❌ 지도 인스턴스 없음 - Place Details 호출 불가', {
            hasMapRef: !!mapRef.current,
            hasWindowInstance: !!(window as any).__MAP_INSTANCE__,
          });
          setIsSearching(false);
          return;
        }
        
        // 🔥 방어 코드: google.places 확인 (PlacesService 생성 전 필수)
        if (!window.google?.maps?.places || !window.google.maps.places.PlacesService) {
          console.error('[MapController] ❌ Places API 준비되지 않음 - Place Details 호출 불가', {
            hasGoogle: !!window.google,
            hasMaps: !!window.google?.maps,
            hasPlaces: !!window.google?.maps?.places,
            hasPlacesService: !!window.google?.maps?.places?.PlacesService,
          });
          setIsSearching(false);
          return;
        }
        
        // 🔥 STEP 10: Place Details API 호출 (반드시 실행)
        // 🔥 데이터 복구: resultsCount가 1 이상이면 무조건 Place Details 호출
        // prioritizedResults가 비어있어도 searchResults에서 직접 호출
        const resultsCount = searchResults?.length || 0;
        const placesToFetch = prioritizedResults.length > 0 
          ? prioritizedResults 
          : searchResults; // 🔥 prioritizedResults가 비어있으면 searchResults 직접 사용
        
        console.log('[DETAILS] Place Details API 호출 시작', {
          resultsCount,
          prioritizedResultsCount: prioritizedResults.length,
          placesToFetchCount: placesToFetch.length,
          prioritizedResults: prioritizedResults.map((p: any) => ({
            id: p.id,
            place_id: p.place_id,
            displayName: p.displayName?.text || p.displayName,
          })),
          hasMap: !!map,
          hasPlacesService: !!window.google.maps.places.PlacesService,
        });
        
        // 🔥 최종 해결책: Place Details 강제 호출 보장
        // 🔥 검색 결과가 1개라도 있으면 무조건 Place Details 호출 (누락 방지)
        if (resultsCount === 0) {
          console.warn('[MapController] ❌ 검색 결과 없음 - 기존 장소 유지');
          // onPlacesUpdate?.([]); 제거 - 빈 배열 전달하지 않음 (기존 places 유지)
          // 🔥 핵심 수정: 검색 결과가 없어도 기존 places 유지 (빈 배열로 초기화 금지)
          setIsSearching(false);
          return;
        }
        
        // 🔥 Optional Chaining: placesService 생성 전 안전 확인
        if (!window?.google?.maps?.places?.PlacesService) {
          console.error('[MapController] ❌ PlacesService 생성 불가');
          setIsSearching(false);
          return;
        }
        
        const placesService = new window.google.maps.places.PlacesService(map);
        
        // 🔥 디버그: placesToFetch 확인 (Optional Chaining 적용)
        console.log('[MapController] Place Details 호출 전 placesToFetch:', placesToFetch?.map((p: any) => ({
          id: p?.id,
          displayName: p?.displayName?.text || p?.displayName,
          hasLocation: !!p?.location,
          hasId: !!(p?.id || p?.place_id),
        })) || []);
        
        // 🔥 Optional Chaining: placesToFetch 안전하게 처리
        const detailPromises = (placesToFetch || [])
          .slice(0, 3)
          .filter((place: any) => {
            // 🔥 변환부 강제 보호: 데이터가 완벽할 때만 변환 진행
            if (!place || (!place.geometry && !place.location)) {
              console.warn('[MapController] Place Details: 유효하지 않은 place 객체 스킵:', {
                hasPlace: !!place,
                hasGeometry: !!place?.geometry,
                hasLocation: !!place?.location,
              });
              // 🔥 geometry/location이 없어도 id가 있으면 Place Details에서 가져올 수 있으므로 유지
              const hasId = place?.id || place?.place_id;
              if (hasId) {
                return true;
              }
              return false;
            }
            
            // 🔥 Optional Chaining: id/place_id 안전하게 확인
            const hasId = place?.id || place?.place_id;
            if (!hasId) {
              console.warn('[MapController] Place Details: id/place_id 없음:', {
                place,
                hasId: !!place?.id,
                hasPlaceId: !!place?.place_id,
              });
            }
            return !!hasId;
          })
          .map((place: any) => 
            new Promise<google.maps.places.PlaceResult | null>((resolve) => {
              // 🔥 Optional Chaining: New Places API는 id, 기존 API는 place_id
              const placeId = place?.id || place?.place_id;
              
              if (!placeId) {
                console.warn('[MapController] Place Details: placeId 없음:', {
                  place,
                  hasId: !!place?.id,
                  hasPlaceId: !!place?.place_id,
                });
                resolve(null);
                return;
              }
              
              // 🔥 STEP 1: Place Details 호출 로그
              console.log('[DETAILS] before fetch', {
                placeId: placeId,
                place: place,
                hasId: !!place.id,
                hasPlaceId: !!place.place_id,
              });
              
              // 🔥 타임아웃 추가 (5초)
              const timeout = setTimeout(() => {
                console.warn('[MapController] Place Details 타임아웃:', placeId);
                resolve(null);
              }, 5000);
              
              console.log('[MapController] Place Details 호출 시작:', { placeId, place });
              
              // 🔥 STEP 2: fields 강제 지정 (geometry 필수)
              // ⚠️ 중요: geometry.location이 없으면 lat/lng = undefined 100%
              const requestFields = [
                'name',
                'geometry.location',  // 🔥 필수: lat/lng를 위해 반드시 필요
                'formatted_address',
                'place_id',
                'types',
              ];
              
              console.log('[PlaceDetails] request', {
                placeId: placeId,
                fields: requestFields,
                fieldsCount: requestFields.length,
                hasGeometryLocation: requestFields.includes('geometry.location'),
              });
              
              placesService.getDetails(
                {
                  placeId: placeId,
                  fields: requestFields, // 🔥 필수 필드 강제 지정
                },
                (detail, status) => {
                  clearTimeout(timeout);
                  
                  // 🔥 방어 코드: google.places 확인 (PlacesServiceStatus 참조 전 필수)
                  if (!window.google?.maps?.places?.PlacesServiceStatus) {
                    console.error('[MapController] ❌ PlacesServiceStatus 없음 - Place Details 응답 처리 불가', {
                      hasGoogle: !!window.google,
                      hasMaps: !!window.google?.maps,
                      hasPlaces: !!window.google?.maps?.places,
                      hasPlacesServiceStatus: !!window.google?.maps?.places?.PlacesServiceStatus,
                    });
                    resolve(null);
                    return;
                  }
                  
                  // 🔥 STEP 1: Place Details RAW 응답 즉시 로그 (진단용)
                  console.group(`🔥 [PlaceDetails RAW] placeId: ${placeId}`);
                  const statusName = window.google.maps.places.PlacesServiceStatus[status] || 'UNKNOWN';
                  console.log('status:', status, statusName);
                  console.log('detail 전체:', detail);
                  console.log('detail.name:', detail?.name);
                  console.log('detail.formatted_address:', detail?.formatted_address);
                  console.log('detail.geometry:', detail?.geometry);
                  // 🔥 최종 해결책: getSafeLatLng 사용
                  console.log('detail.geometry?.location:', detail?.geometry?.location);
                  const detailCoords = getSafeLatLng(detail);
                  if (detailCoords) {
                    console.log('lat:', detailCoords.lat, typeof detailCoords.lat);
                    console.log('lng:', detailCoords.lng, typeof detailCoords.lng);
                  }
                  console.log('detail.place_id:', detail?.place_id);
                  console.log('detail.types:', detail?.types);
                  console.groupEnd();
                  
                  // 🔥 방어 코드: PlacesServiceStatus.OK 확인 (안전한 참조)
                  const PlacesServiceStatus = window.google.maps.places.PlacesServiceStatus;
                  if (status === PlacesServiceStatus.OK && detail?.geometry?.location) {
                    // 🔥 행정구역 타입 필터링 (Place Details 결과에서도)
                    const detailTypes = detail.types || [];
                    const hasInvalidType = invalidPlaceTypes.some(type => detailTypes.includes(type));
                    const hasValidType = validPlaceTypes.some(type => detailTypes.includes(type));
                    
                    // 🔥 행정구역만 있고 실제 장소 타입이 없으면 제외
                    if (hasInvalidType && !hasValidType) {
                      console.warn('[MapController] Place Details: 행정구역 타입 제외:', {
                        placeId: placeId,
                        name: detail.name,
                        types: detailTypes,
                      });
                      resolve(null);
                      return;
                    }
                    
                    // 🔥 name 필수 검증
                    if (!detail.name || !detail.name.trim()) {
                      console.warn('[MapController] Place Details: name 없음:', {
                        placeId: placeId,
                        formatted_address: detail.formatted_address,
                      });
                      resolve(null);
                      return;
                    }
                    
                    // 🔥 STEP 2: Place Details 성공 로그 (반드시 나와야 함)
                    // 🔥 최종 해결책: getSafeLatLng 사용
                    const detailCoords = getSafeLatLng(detail);
                    if (!detailCoords) {
                      console.warn('[MapController] Place Details: 좌표 추출 실패:', {
                        placeId: placeId,
                        name: detail?.name,
                        hasGeometry: !!detail?.geometry,
                        hasLocation: !!detail?.location,
                      });
                      resolve(null);
                      return;
                    }
                    const { lat, lng } = detailCoords;
                    console.log('[DETAILS] after fetch SUCCESS', {
                      placeId: placeId,
                      name: detail?.name,
                      formatted_address: detail?.formatted_address,
                      lat: lat,
                      lng: lng,
                      hasGeometry: !!detail?.geometry,
                      hasLocation: !!detail?.geometry?.location,
                      types: detailTypes,
                    });
                    console.log('[DETAILS SUCCESS]', {
                      placeId: placeId,
                      name: detail?.name,
                      formatted_address: detail?.formatted_address,
                      lat: lat,
                      lng: lng,
                      types: detailTypes,
                    });
                    console.log('[MapController] ✅ Place Details 성공:', {
                      placeId: placeId,
                      name: detail?.name,
                      formatted_address: detail?.formatted_address,
                      types: detailTypes,
                      hasLocation: !!detail?.geometry?.location,
                      lat: lat,
                      lng: lng,
                    });
                    resolve(detail);
                  } else {
                    // 🔥 방어 코드: PlacesServiceStatus 확인 (안전한 참조)
                    const PlacesServiceStatus = window.google.maps.places.PlacesServiceStatus;
                    const statusName = PlacesServiceStatus?.[status] || 'UNKNOWN';
                    console.warn('[MapController] ❌ Place Details 실패:', {
                      placeId: placeId,
                      status,
                      statusName: statusName,
                      hasDetail: !!detail,
                      hasGeometry: !!detail?.geometry,
                      hasLocation: !!detail?.geometry?.location,
                      errorMessage: status === PlacesServiceStatus?.OVER_QUERY_LIMIT ? '쿼리 한도 초과' :
                                   status === PlacesServiceStatus?.REQUEST_DENIED ? '요청 거부' :
                                   status === PlacesServiceStatus?.INVALID_REQUEST ? '잘못된 요청' :
                                   status === PlacesServiceStatus?.ZERO_RESULTS ? '결과 없음' :
                                   '알 수 없는 오류',
                    });
                    resolve(null);
                  }
                }
              );
            })
          );
        
        const enrichedDetails = (await Promise.all(detailPromises)).filter(
          (p): p is google.maps.places.PlaceResult => p !== null
        );
        
        // 🔥 STEP 1: Place Details RAW 결과 강제 노출 (진단용)
        console.group('🔥 [PlaceDetails RAW] 진단');
        enrichedDetails.forEach((detail, index) => {
          console.log(`[${index + 1}] Place Details RAW:`, detail);
          console.log(`[${index + 1}] name:`, detail.name);
          console.log(`[${index + 1}] formatted_address:`, detail.formatted_address);
          console.log(`[${index + 1}] geometry:`, detail.geometry);
          // 🔥 최종 해결책: getSafeLatLng 사용
          const detailCoords = getSafeLatLng(detail);
          if (detailCoords) {
            console.log(`[${index + 1}] lat:`, detailCoords.lat);
            console.log(`[${index + 1}] lng:`, detailCoords.lng);
          } else {
            console.warn(`[${index + 1}] ❌ geometry.location 없음`);
          }
          console.log(`[${index + 1}] place_id:`, detail.place_id);
          console.log(`[${index + 1}] types:`, detail.types);
        });
        console.log('enrichedDetails.length:', enrichedDetails.length);
        console.log('prioritizedResults.length:', prioritizedResults.length);
        console.groupEnd();
        
        // 🔥 STEP 10: Place Details 결과 확인 및 로그
        console.log('[DETAILS] Place Details API 호출 완료', {
          detailPromisesCount: detailPromises.length,
          enrichedDetailsCount: enrichedDetails.length,
          enrichedDetails: enrichedDetails.map(d => ({
            placeId: d.place_id || d.id,
            name: d.name,
            hasGeometry: !!d.geometry,
            hasLocation: !!d.geometry?.location,
          })),
        });
        
        // 🔥 STEP 10: Place Details 결과만 사용 (fallback 제거)
        // ⭐⭐⭐ Single Source of Truth: normalizePlace만 사용
        // ❌ fallback 제거: TextSearch 결과는 name/address가 없으므로 사용하지 않음
        if (enrichedDetails.length === 0) {
          // 🔥 로그 출력: console.error 대신 console.warn 사용 (에러 경계 작동 방지)
          console.warn('[MapController] ❌ Place Details 결과 없음 - 검색 결과를 표시할 수 없음');
          const allPromises = await Promise.all(detailPromises);
          console.warn('[MapController] ❌ detailPromises 전체 결과:', allPromises.map((p, i) => ({
            index: i,
            isNull: p === null,
            hasName: !!p?.name,
            hasGeometry: !!p?.geometry,
            status: p ? 'OK' : 'FAILED',
          })));
          // onPlacesUpdate?.([]); 제거 - 빈 배열 전달하지 않음 (기존 places 유지)
          console.warn('⚠️ [MapController] Place Details 변환 실패 - 기존 장소 유지');
          setIsSearching(false);
          return;
        }
        
        // 🔥 STEP 1: normalizePlace 전후 비교 (진단용)
        console.group('🔥 [normalizePlace] 진단');
        enrichedDetails.forEach((detail, index) => {
          const normalized = normalizePlace(detail);
          console.log(`[${index + 1}] normalizePlace 입력:`, {
            name: detail.name,
            formatted_address: detail.formatted_address,
            hasGeometry: !!detail.geometry,
            hasLocation: !!detail.geometry?.location,
            place_id: detail.place_id,
          });
          console.log(`[${index + 1}] normalizePlace 출력:`, normalized);
          if (!normalized) {
            // 🔥 로그 출력: console.error 대신 console.warn 사용 (에러 경계 작동 방지)
            console.warn(`[${index + 1}] ❌ normalizePlace 실패 - null 반환`);
          }
        });
        console.groupEnd();
        
        // 🔥 STEP 3: Place Details 결과를 normalizePlace로 변환
        // ⚠️ 중요: normalizePlace는 Place Details 결과만 받아야 함 (Search 결과 ❌)
        console.group('🔥 [normalizePlace 입력 검증]');
        enrichedDetails.forEach((detail, index) => {
          console.log(`[${index + 1}] normalizePlace 입력 (Place Details):`, {
            hasDetail: !!detail,
            name: detail?.name,
            formatted_address: detail?.formatted_address,
            hasGeometry: !!detail?.geometry,
            hasLocation: !!detail?.geometry?.location,
            place_id: detail?.place_id,
          });
        });
        console.groupEnd();
        
        // 🔥 최종 해결책: 데이터 필터링 강화 (filter(Boolean) 로직)
        // 🔥 Optional Chaining + getSafeCoord로 좌표 추출 성공한 데이터만 표시
        const finalResults = enrichedDetails
          .map((detail) => {
            // 🔥 Optional Chaining: detail 유효성 검사 (normalizePlace 호출 전)
            if (!detail || !detail?.geometry?.location) {
              console.warn('[MapController] ❌ normalizePlace 입력 무효:', {
                hasDetail: !!detail,
                hasGeometry: !!detail?.geometry,
                hasLocation: !!detail?.geometry?.location,
              });
              return null;
            }
            
            // 🔥 normalizePlace는 Place Details 결과만 받음 (Search 결과 절대 ❌)
            const normalized = normalizePlace(detail);
            if (!normalized) {
              // 🔥 로그 출력: console.error 대신 console.warn 사용 (에러 경계 작동 방지)
              console.warn('[MapController] ❌ normalizePlace 실패:', {
                detail: detail,
                name: detail?.name,
                geometry: detail?.geometry,
                location: detail?.geometry?.location,
              });
              return null;
            }
            
            // 🔥 좌표 추출 성공 여부 최종 확인 (normalized는 이미 숫자이므로 직접 검증)
            if (typeof normalized?.lat !== 'number' || typeof normalized?.lng !== 'number' ||
                !Number.isFinite(normalized.lat) || !Number.isFinite(normalized.lng)) {
              console.warn('[MapController] ❌ 최종 좌표 유효성 검증 실패:', {
                id: normalized?.id,
                name: normalized?.name,
                originalLat: normalized?.lat,
                originalLng: normalized?.lng,
              });
              return null;
            }
            
            return normalized;
          })
          .filter(Boolean) // 🔥 filter(Boolean): null/undefined 제거
          .filter((p): p is NonNullable<typeof p> => {
            if (!p) return false;
            
            // 🔥 강화된 좌표 유효성 검증 (NaN 체크 추가)
            const isValid = 
              typeof p.lat === 'number' && 
              typeof p.lng === 'number' && 
              Number.isFinite(p.lat) && 
              Number.isFinite(p.lng) &&
              !Number.isNaN(p.lat) &&
              !Number.isNaN(p.lng);
            
            if (!isValid) {
              console.warn('[MapController] ❌ 좌표 유효성 검증 실패:', {
                id: p.id,
                name: p.name,
                lat: p.lat,
                lng: p.lng,
                latType: typeof p.lat,
                lngType: typeof p.lng,
                isFiniteLat: Number.isFinite(p.lat),
                isFiniteLng: Number.isFinite(p.lng),
                isNaNLat: Number.isNaN(p.lat),
                isNaNLng: Number.isNaN(p.lng),
              });
            }
            return isValid;
          });
        
        // 🔥 STEP 4: 최종 변환 (정규화된 PlaceLite를 그대로 사용)
        // ⭐⭐⭐ Single Source of Truth: normalizePlace가 이미 모든 검증을 완료했으므로
        // 여기서는 그냥 PlaceLite를 그대로 사용 (추가 변환 불필요)
        const convertedPlaces: PlaceLite[] = finalResults.slice(0, 3);
        
        // 🔥 STEP 1: normalizePlace 결과 로그 (승리 확정용)
        // ⚠️ 중요: 여기서 name, lat, lng, address가 모두 차 있으면 승리
        console.group('🔥 [normalizePlace 최종 결과] 승리 확정');
        if (convertedPlaces.length > 0) {
          console.table(
            convertedPlaces
              .filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number')
              .map(p => ({
                id: p.id,
                name: p.name,
                lat: p.lat,
                lng: p.lng,
              address: p.address || '(주소 없음)',
              hasValidData: typeof p.lat === 'number' && typeof p.lng === 'number' && typeof p.name === 'string' && p.name.trim().length > 0,
            }))
          );
          const validCount = convertedPlaces.filter(p => 
            typeof p.lat === 'number' && 
            typeof p.lng === 'number' && 
            typeof p.name === 'string' && 
            p.name.trim().length > 0
          ).length;
          console.log('✅ 모든 필드가 유효한 place 개수:', validCount, '/', convertedPlaces.length);
          if (validCount === 0) {
            // 🔥 로그 출력: console.error 대신 console.warn 사용 (에러 경계 작동 방지)
            console.warn('❌ [승리 확정 실패] 모든 place가 유효하지 않음');
          }
        } else {
          console.warn('⚠️ [normalizePlace 최종 결과] convertedPlaces가 비어있음');
          console.warn('⚠️ 원인 추적:', {
            enrichedDetailsCount: enrichedDetails.length,
            finalResultsCount: finalResults.length,
            prioritizedResultsCount: prioritizedResults.length,
          });
        }
        console.groupEnd();

        console.log(`✅ [MapController] Places API 변환 완료 ${convertedPlaces.length}개`, convertedPlaces.map(p => ({ id: p.id, name: p.name })));
        console.log('🔥 [MapController] 최종 places (좌표 포함):', convertedPlaces.map(p => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng })));

        // 🔥 비동기 경합 방지: 오래된 응답 무시
        if (currentRequestId !== searchRequestIdRef.current) {
          console.log('[SEARCH] 오래된 응답 무시', { currentRequestId, latestId: searchRequestIdRef.current });
          return;
        }

        // 🔥 STEP 10: Place Details 수술 완료 - 정규화된 PlaceLite를 그대로 사용
        // ⭐⭐⭐ Single Source of Truth: normalizePlace가 이미 모든 검증을 완료했으므로
        // 여기서는 추가 변환 없이 그대로 전달
        if (convertedPlaces.length > 0) {
          // 🔥 [최종 해결책] 데이터 강제 직렬화: 검색 결과를 상태에 저장하기 직전에 실행
          const sanitizedPlaces = sanitizePlaces(convertedPlaces);
          
          // 🔥 정규화된 PlaceLite는 이미 완전한 형태이므로 그대로 사용
          const placeLites: import('@/types/search').PlaceLite[] = sanitizedPlaces;
          
          // 🔥 STEP 3: onPlacesUpdate 호출 전 실제 전달 데이터 확인
          console.log('[STATE UPDATE] onPlacesUpdate 호출 전 데이터 (sanitized):', placeLites.map(p => ({
            id: p.id,
            name: p.name,
            lat: p.lat,
            lng: p.lng,
            address: p.address,
          })));
          
          // 🔥 Phase 30: 결과 카드 표시를 위해 onPlacesUpdate 호출
          onPlacesUpdate?.(placeLites);
          console.log('✅ [MapController] Phase 30: onPlacesUpdate 호출 완료', { 
            count: placeLites.length,
            names: placeLites.map(p => p.name),
            hasValidData: placeLites.every(p => 
              typeof p.lat === 'number' && 
              typeof p.lng === 'number' && 
              typeof p.name === 'string' && 
              p.name.trim().length > 0
            ),
          });
        } else {
          // 🔥 Phase 30: 결과 없음 - 빈 배열 전달 금지 (기존 places 유지)
          console.log('⚠️ [MapController] Phase 30: 결과 없음 - 기존 장소 유지');
          // onPlacesUpdate?.([]); 제거 - 빈 배열 전달하지 않음 (기존 places 유지)
        }

        // 🔥 기존 MapPlace[] 형태로도 변환 (마커 렌더링용)
        // 🔥 v4 SEARCH ONLY: CONFIRMED 상태 보호 제거 (더 정확한 장소면 교체 허용)
        // 🔥 더 정확한 장소(실제 장소 타입)가 오면 항상 업데이트 허용
        if (searchPhase === 'navigating' || searchPhase === 'arrived') {
          console.log('🔒 [MapController] NAVIGATING/ARRIVED 상태 보호: 검색 결과로 places 업데이트 차단', { searchPhase });
          return;
        }
        // 🔥 CONFIRMED 상태에서는 차단하지 않음 (더 정확한 결과 허용)
        
        // 🔥 [최종 해결책] 데이터 강제 직렬화: 검색 결과를 상태에 저장하기 직전에 실행
        const sanitizedMapPlaces = sanitizePlaces(convertedPlaces);
        // 🔥 안전 가드: 빈 배열이면 기존 places 유지
        if (sanitizedMapPlaces.length > 0) {
          setPlaces(sanitizedMapPlaces);
        } else {
          console.log('🔒 [MapController] 검색 결과 없음 - 기존 장소 유지');
        }
        console.log(`✅ [MapController] ${convertedPlaces.length}개 장소 변환 완료`);
        console.log('[MapController] places 상태 업데이트:', convertedPlaces.map(p => ({ id: p.id, name: p.name })));

        // 🔥 검색 결과가 있으면 지도 중심을 첫 번째 결과로 이동 (선택적)
        // 🔒 CONFIRMED 상태 보호: 목적지 확정 상태에서는 카메라 이동 차단
        if (convertedPlaces.length > 0 && searchPhase !== 'confirmed' && searchPhase !== 'navigating' && searchPhase !== 'arrived') {
          setCenter({
            lat: convertedPlaces[0].lat,
            lng: convertedPlaces[0].lng,
          });
        }
      } catch (error: any) {
        // 🔥 검색창 입력 핸들러: 에러 발생 시 console.warn을 찍게 해줘
        console.warn('⚠️ [MapController] 검색 실패:', error?.message || '알 수 없는 오류', error);
        
        // 🔥 핵심 수정: 검색 실패해도 기존 places 유지 (빈 배열로 초기화 금지)
        // DEV 모드에서는 TEST_PLACES 보호, PROD 모드에서는 Firestore places 보호
        // onPlacesUpdate?.([]); 제거 - 빈 배열 전달하지 않음 (기존 places 유지)
        // 🔒 CONFIRMED 상태 보호: 목적지 확정 상태에서는 places 배열 초기화 차단
        if (searchPhase === 'confirmed' || searchPhase === 'navigating' || searchPhase === 'arrived') {
          console.log('🔒 [MapController] CONFIRMED 상태 보호: 검색 실패 시 places 초기화 차단', { searchPhase });
        } else {
          // 🔥 검색 실패해도 기존 장소 유지 (DEV 모드에서는 TEST_PLACES, PROD 모드에서는 Firestore places)
          console.log('🔒 [MapController] 검색 실패 - 기존 장소 유지 (places 초기화 차단)');
        }
      } finally {
        setIsSearching(false);
        // 🔥 Phase 22: 검색 완료 후 idle로 복귀 (상태 전이)
        // 실제로는 sttStatus가 외부에서 관리되므로 여기서는 검색 완료만 처리
      }
    };

    // 🔥 cleanup: 컴포넌트 언마운트 또는 activeSearchQuery 변경 시 타이머 정리
    return () => {
      clearTimeout(debounceTimer);
    };
  }, [activeSearchQuery, searchCenter, locationState, phase]); // ✅ MVP: phase도 dependency에 추가 (SEARCHING 전환 시 검색 실행)

  // ✅ MVP: phase가 NAVIGATING일 때 navigationStarted 설정 및 경로 계산 (핵심)
  useEffect(() => {
    // phase가 NAVIGATING이면 navigationStarted를 true로 설정 (최우선)
    if (phase === 'NAVIGATING') {
      setNavigationStarted(true);
      console.log('✅ [MapController] phase NAVIGATING → navigationStarted = true (강제 설정)');
    } else if (phase === 'PRE_NAVIGATING') {
      // 🔥 PRE_NAVIGATING 상태에서는 navigationStarted를 false로 유지 (경로 미리보기만)
      // navigationStarted는 NAVIGATING에서만 true
      if (process.env.NODE_ENV === 'development') {
        console.debug('[NAV] phase PRE_NAVIGATING → navigationStarted = false (미리보기 모드)');
      }
    } else if (phase === 'ARRIVED') {
      // ✅ MVP: ARRIVED 진입 시 navigationStarted를 false로 설정 (경로 제거, 검색 재허용)
      setNavigationStarted(false);
      setRoutePath([]); // 경로 제거
      if (process.env.NODE_ENV === 'development') {
        console.debug('[ARRIVED] 경로 제거 및 검색 재허용');
      }
    } else {
      // IDLE, SEARCHING, CONFIRMED 등 다른 상태에서는 navigationStarted를 false로 설정
      if (navigationStarted) {
        console.log('🔄 [MapController] phase 변경으로 navigationStarted = false', { phase });
        setNavigationStarted(false);
      }
    }
  }, [phase, navigationStarted]);

  // ✅ MVP: phase가 PRE_NAVIGATING 또는 NAVIGATING일 때 경로 계산 (1회만, 고정)
  const routeCalculatedRef = useRef(false); // 경로 계산 완료 플래그
  
  useEffect(() => {
    // ✅ MVP: ARRIVED 상태에서는 경로 계산 완전 차단 (종착역)
    if (phase === 'ARRIVED') {
      console.log('[ROUTE] BLOCKED (ARRIVED 상태에서는 경로 계산 불가)');
      return;
    }
    
    // 🔥 핵심: PRE_NAVIGATING 또는 NAVIGATING 상태에서만 경로 계산
    if (phase !== 'PRE_NAVIGATING' && phase !== 'NAVIGATING') {
      // PRE_NAVIGATING/NAVIGATING이 아니면 경로 계산 플래그 리셋
      routeCalculatedRef.current = false;
      return;
    }

    // ✅ MVP: 이미 경로를 계산했으면 재계산 안 함 (고정)
    if (routeCalculatedRef.current) {
      console.log('[ROUTE] 이미 계산됨, 재계산 안 함 (고정)');
      return;
    }

    // selectedPlace(confirmedDestination)가 없으면 실행 안 함
    if (!selectedPlace || !selectedPlace.location) {
      console.warn('[NAV] 경로 계산 차단: selectedPlace 없음', { phase, selectedPlace });
      return;
    }

    // 🔥 source가 'default'인 경우 차단 (서울시청 고정값 사용 금지)
    if (locationState?.source === 'default') {
      console.warn('[NAV] 경로 계산 차단: locationState.source가 "default" (서울시청 고정값)', {
        source: locationState.source,
        lat: locationState.lat,
        lng: locationState.lng,
        status: locationState.status,
        phase,
      });
      if (onRouteFailed) {
        onRouteFailed('ERROR'); // 위치 미확정은 ERROR로 처리
      }
      return;
    }
    
    // 위치가 READY가 아니면 실행 안 함
    if (!locationState || locationState.status !== 'READY') {
      console.warn('[NAV] 경로 계산 차단: location not READY', { 
        phase, 
        locationStatus: locationState?.status 
      });
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.debug('[ROUTE] request directions (1회만)', {
        phase,
        destinationName: selectedPlace.name,
        origin: { lat: locationState.lat, lng: locationState.lng },
        destination: { lat: selectedPlace.location.lat, lng: selectedPlace.location.lng },
      });
    }

    // 🔥 async 함수로 감싸서 await 사용 가능하게 함
    const calculateRoute = async () => {
      // 경로 계산 (Directions API) - 1회만
      const googleMaps = window.google?.maps;
      if (!googleMaps) {
        console.warn('[ROUTE] Google Maps API 준비되지 않음');
        return;
      }
      // 🔥 STEP 1: origin은 오직 현재 위치만 사용 (GPS 미확정 시 차단)
      // 🔥 강화: locationState.status가 READY이고 좌표가 유효한지 이중 검증
      if (!locationState || locationState.status !== 'READY') {
        console.warn('[NAV] 경로 계산 차단: locationState가 READY 상태가 아님', {
          status: locationState?.status,
          locationState,
        });
        if (onRouteFailed) {
          onRouteFailed('ERROR'); // 위치 미확정은 ERROR로 처리
        }
        return;
      }
      
      // 🔥 출발지 하드코딩: calculateRoute 함수의 origin 파라미터에 현재 위치 대신 사용자님이 알려주신 주소(경기도 의정부시 용민로 420)를 직접 입력하도록 수정해야 합니다.
      // 🔥 출발지 주소 고정: 경기도 의정부시 용민로 420 (37.754, 127.114)
      const FIXED_ORIGIN = { lat: 37.754, lng: 127.114 }; // 경기도 의정부시 용민로 420
      console.log('[위치확정] 출발지: 용민로 420 (37.754, 127.114)');
      const origin = FIXED_ORIGIN; // 🔥 출발지 하드코딩: 항상 용민로 420 사용
      
      // 🔥 좌표 유효성 검증 (origin 사용)
      if (!isValidLatLng(origin)) {
        console.warn('[NAV] 경로 계산 차단: origin 좌표가 유효하지 않음', {
          origin,
          locationState,
          latType: typeof origin.lat,
          lngType: typeof origin.lng,
          latIsNaN: Number.isNaN(origin.lat),
          lngIsNaN: Number.isNaN(origin.lng),
        });
        if (onRouteFailed) {
          onRouteFailed('ERROR'); // 위치 미확정은 ERROR로 처리
        }
        return;
      }
      
      // 🔥 STEP: destination 좌표 변환 (LatLng 객체일 수 있으므로 함수 호출 또는 직접 접근)
      const destLat = typeof selectedPlace.location.lat === 'function' 
        ? selectedPlace.location.lat() 
        : selectedPlace.location.lat;
      const destLng = typeof selectedPlace.location.lng === 'function' 
        ? selectedPlace.location.lng() 
        : selectedPlace.location.lng;
      
      // 🔥 좌표 유효성 검증
      if (!destLat || !destLng || !isFinite(destLat) || !isFinite(destLng)) {
        console.warn('[NAV] 경로 계산 차단: destination 좌표가 유효하지 않음', {
          lat: destLat,
          lng: destLng,
          location: selectedPlace.location,
        });
        if (onRouteFailed) {
          onRouteFailed('ERROR');
        }
        return;
      }
      
      const destination = { lat: destLat, lng: destLng };
      
      // 🔥 원칙 2: origin과 destination이 동일하면 무조건 차단
      const isSameLocation = 
        Math.abs(origin.lat - destination.lat) < 0.000001 && // 약 0.1m 이내
        Math.abs(origin.lng - destination.lng) < 0.000001;
      
      if (isSameLocation) {
        console.warn('🚫 [MapController] 출발지와 목적지가 동일 → 경로 계산 차단', {
          origin,
          destination,
          destinationName: selectedPlace.name,
        });
        if (onRouteFailed) {
          onRouteFailed('ZERO_RESULTS'); // 동일 위치는 ZERO_RESULTS로 처리
        }
        return;
      }
      
      // 🔥 디버그: origin/destination 좌표 및 거리 확인
      // 이미 파일 상단에서 import된 getDistanceKm 사용
      const distanceKm = getDistanceKm(origin, destination);
      
      console.log('[NAV] 경로 요청 준비:', {
        origin,
        destination,
        destinationName: selectedPlace.name,
        distanceKm: distanceKm.toFixed(2) + 'km',
        originType: typeof origin.lat,
        destType: typeof destination.lat,
        isSameLocation: false, // 🔥 이미 체크 완료
      });
      
      // 🔥 거리가 너무 가까우면 경로 요청 차단 (30m 이내로 완화)
      // 🔥 Google Maps Directions API는 보통 30m 이내는 경로를 계산하지 않음
      if (distanceKm < 0.03) {
        console.warn('[NAV] 경로 계산 차단: 출발지와 도착지가 너무 가까움 (30m 이내)', {
          distanceKm: (distanceKm * 1000).toFixed(0) + 'm',
          origin,
          destination,
        });
        if (onRouteFailed) {
          onRouteFailed('ZERO_RESULTS');
        }
        return;
      }
      
      // 🔥 오류 흔적 삭제: tryWalkingModeRef 같은 쓰레기 코드는 다 지우고 깔끔한 로직만 남겨
      // 🔥 도로 스냅 검사 제거: 복잡한 로직 대신 간단하게 DRIVING 모드로 경로 계산
      const result = await requestRoute(
        origin, // 🔥 오직 현재 위치만 사용
        destination, // 🔥 변환된 좌표 사용
        googleMaps.TravelMode.DRIVING // 🔥 기본값: DRIVING 모드
      );
      
      if (result) {
        // ✅ MVP: 경로 계산 완료 플래그 설정 (재계산 방지)
        routeCalculatedRef.current = true;
        if (process.env.NODE_ENV === 'development') {
          console.debug('[ROUTE] received (고정 완료)', {
            distance: result.distance,
            duration: result.duration,
          });
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[ROUTE] failed');
        }
      }
    }; // 🔥 calculateRoute 함수 닫기
    
    // 🔥 async 함수 실행
    calculateRoute();
  }, [phase, selectedPlace, locationState, onRouteFailed]); // ✅ MVP: phase, selectedPlace, locationState 변경 시 경로 계산 (1회만)

  // 🔥 오류 흔적 삭제: 도보 경로 시도 핸들러 제거 (사용되지 않는 코드)

  // ✅ MVP: phase가 SEARCHING일 때 강제로 검색 실행 (핵심)
  useEffect(() => {
    // phase가 SEARCHING이 아니면 실행 안 함
    if (phase !== 'SEARCHING') {
      return;
    }
    
    // 🔥 최우선: navigationStarted가 true면 검색 완전 차단 (데이터 덮어쓰기 방지)
    if (navigationStarted) {
      console.warn('[SEARCH] start - BLOCKED (navigationStarted is true)', {
        searchQuery,
        navigationStarted,
        phase,
      });
      return;
    }

    // 검색어가 없으면 실행 안 함
    // 🔥 데이터 복구: activeSearchQuery 사용
    if (!activeSearchQuery || !activeSearchQuery.trim()) {
      console.warn('[SEARCH] EFFECT TRIGGERED but no activeSearchQuery', { phase, activeSearchQuery, searchQuery });
      return;
    }

    // 위치가 READY가 아니면 실행 안 함
    if (!locationState || locationState.status !== 'READY') {
      console.warn('[SEARCH] EFFECT TRIGGERED but location not READY', { 
        phase, 
        locationStatus: locationState?.status 
      });
      return;
    }

    console.log('[SEARCH] EFFECT TRIGGERED', {
      phase,
      searchQuery: activeSearchQuery, // 🔥 데이터 복구: activeSearchQuery 사용
      location: {
        lat: locationState.lat,
        lng: locationState.lng,
        status: locationState.status,
      },
    });

    // 검색 실행 (기존 performSearch 로직 재사용)
    const performSearch = async () => {
      setIsSearching(true);
      
      try {
        // 🔥 Places API 준비
        const { ensurePlacesReady } = await import("@/utils/PlacesManager");
        const { Place } = await ensurePlacesReady();

        if (!Place || typeof Place.searchByText !== 'function') {
          console.warn('⚠️ [MapController] Places API 준비되지 않음 - 기존 장소 유지');
          // 🔥 핵심 수정: Places API 준비 안 됐을 때도 기존 places 유지 (빈 배열로 초기화 금지)
          setIsSearching(false);
          return;
        }

        // 검색 중심점 결정
        // 🔥 mapRef에서 현재 지도 중심점 가져오기 (서울시청 고정값 제거)
        const currentMapCenter = mapRef.current?.getCenter();
        const mapCenterFromRef = currentMapCenter 
          ? { lat: currentMapCenter.lat(), lng: currentMapCenter.lng() }
          : center; // fallback: center state 사용
        
        const searchCenterPoint = resolveSearchCenter({
          explicitCenter: searchCenter,
          locationState,
          mapCenter: mapCenterFromRef, // 🔥 지도 중심점 사용
          defaultCenter: { lat: 37.7463, lng: 127.0959 }, // 🔥 의정부 기본값 (서울시청 제거)
        });

        console.log('[SEARCH] start', {
          query: activeSearchQuery, // 🔥 데이터 복구: activeSearchQuery 사용
          center: searchCenterPoint,
        });

        // Places API 호출
        // 🔥 수정: query → textQuery, fields 배열 추가 (InvalidValueError 해결)
        // 🔥 강화: fields를 명시적으로 배열로 보장
        const fieldsArray: string[] = [
          'id',
          'displayName',
          'location',
          'formattedAddress',
        ];
        
        // 🔥 검증: fields가 배열인지 확인 (런타임 강제 검증)
        if (!Array.isArray(fieldsArray)) {
          console.error('❌ [MapController] fields가 배열이 아님:', typeof fieldsArray, fieldsArray);
          throw new Error('fields must be an array');
        }
        
        // 🔥 최종 검증: request 객체 생성 직전 fields 재확인
        const finalFields = Array.isArray(fieldsArray) ? [...fieldsArray] : [];
        if (finalFields.length === 0) {
          console.error('❌ [MapController] fields 배열이 비어있음');
          throw new Error('fields array cannot be empty');
        }
        
        const searchRequest = {
          textQuery: activeSearchQuery.trim(), // 🔥 데이터 복구: activeSearchQuery 사용
          // ✅ fields는 반드시 배열 형태 (콤마 문자열 절대 금지)
          // 🔥 최종 보장: 새 배열로 복사하여 전달
          fields: finalFields,
          locationBias: {
            center: {
              lat: searchCenterPoint.lat,
              lng: searchCenterPoint.lng,
            },
            radius: 1000, // 🔥 검색 범위 확장: 1km로 조정 (의정부역 주변 상세 핀 확보)
          },
          // 🔥 검색 범위 확장: establishment, point_of_interest 타입 명시적으로 추가
          includedTypes: ['establishment', 'point_of_interest', 'restaurant', 'cafe', 'store', 'shopping_mall'],
          maxResultCount: 20, // 🔥 검색 방식 변경: 최소 10~20개의 결과를 가져오게 (의정부역 주변 상세 핀 확보)
        };
        
        // 🔥 API 호출 직전 최종 검증 (디버깅용)
        if (!Array.isArray(searchRequest.fields)) {
          console.error('❌ [MapController] searchRequest.fields가 배열이 아님!', {
            type: typeof searchRequest.fields,
            value: searchRequest.fields,
            isArray: Array.isArray(searchRequest.fields),
          });
          throw new Error('searchRequest.fields must be an array');
        }
        
        console.log('🔍 [MapController] Places API 검색 요청:', {
          textQuery: searchRequest.textQuery,
          fields: searchRequest.fields,
          fieldsType: Array.isArray(searchRequest.fields) ? 'array' : typeof searchRequest.fields,
          fieldsLength: Array.isArray(searchRequest.fields) ? searchRequest.fields.length : 'N/A',
          locationBias: searchRequest.locationBias,
        });
        
        // 🔥 함수 교체: google.maps.places.PlacesService의 textSearch 함수를 사용하도록 로직을 변경 (현재는 결과가 1개만 나오는 함수를 쓰고 있어)
        const mapInstance = mapRef.current || (window as any).__MAP_INSTANCE__;
        let results: any[] = [];
        
        if (mapInstance && window.google?.maps?.places) {
          // 🔥 textSearch 사용: 검색 반경 설정 radius: 2000 (2km) 옵션을 추가
          try {
            const service = new window.google.maps.places.PlacesService(mapInstance);
            
            // 🔥 검색 반경 설정: 검색 시 현재 지도 중심(map.getCenter())을 기준으로 radius: 2000 (2km) 옵션을 추가
            const mapCenter = mapInstance.getCenter();
            const searchLocation = mapCenter 
              ? new window.google.maps.LatLng(mapCenter.lat(), mapCenter.lng())
              : new window.google.maps.LatLng(searchCenterPoint.lat, searchCenterPoint.lng);
            
            const textSearchResults = await new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
              service.textSearch({
                query: activeSearchQuery.trim(),
                location: searchLocation, // 🔥 현재 지도 중심(map.getCenter())을 기준으로
                radius: 1500, // 🔥 검색 범위 확장: 현재 지도 중심(map.getCenter())을 기준으로 radius: 1500 (1.5km) 옵션을 추가해서 주변 맛집과 카페를 최소 10개 이상 가져오게 해줘
                // 🔥 locationBias 추가: 현재 지도 중심을 기준으로 검색 결과를 더 정확하게 가져오기
                locationBias: {
                  lat: searchLocation.lat(),
                  lng: searchLocation.lng(),
                },
              }, (results, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                  resolve(results);
                } else {
                  reject(new Error(`textSearch failed: ${status}`));
                }
              });
            });
            
            // 🔥 textSearch 결과를 New Places API 형식으로 변환
            results = textSearchResults.map((result: any) => ({
              id: result.place_id,
              displayName: { text: result.name },
              location: result.geometry?.location,
              formattedAddress: result.formatted_address,
              types: result.types || [],
              name: result.name, // 🔥 name 필드 추가 (WebMapRenderer에서 사용)
              place_id: result.place_id, // 🔥 place_id 필드 추가
            }));
            
            console.log('✅ [MapController] textSearch 완료:', {
              resultsCount: results.length,
              query: activeSearchQuery,
              center: { lat: searchLocation.lat(), lng: searchLocation.lng() },
              radius: 2000,
            });
          } catch (textSearchError) {
            console.warn('⚠️ [MapController] textSearch 실패, searchByText로 폴백:', textSearchError);
            // 🔥 폴백: textSearch 실패 시 searchByText 사용
            const { places } = await Place.searchByText(searchRequest);
            results = places || [];
          }
        } else {
          // 🔥 폴백: map 인스턴스가 없으면 searchByText 사용
          console.warn('⚠️ [MapController] map 인스턴스 없음, searchByText로 폴백');
          const { places } = await Place.searchByText(searchRequest);
          results = places || [];
        }

        console.log('[SEARCH] Places API 결과:', {
          resultsCount: results?.length || 0,
          query: activeSearchQuery, // 🔥 데이터 복구: activeSearchQuery 사용
        });

        // 🔥 결과 없음 방어: results.map 실행 전 빈 배열 체크
        if (!results || !Array.isArray(results) || results.length === 0) {
          console.warn('[MapController] 검색 결과가 비어있음 - 기존 장소 유지');
          // 🔥 핵심 수정: 검색 결과가 없어도 기존 places 유지 (빈 배열로 초기화 금지)
          setIsSearching(false);
          return;
        }

        // 결과 변환 및 저장
        // 🔥 최종 해결책: getSafeLatLng 사용 (geometry.location과 location 모두 체크)
        const processedPlaces = (results || []).map((place: any) => {
          // 🔥 변환부 강제 보호: 데이터가 완벽할 때만 변환 진행
          if (!place || (!place.geometry && !place.location)) {
            console.warn("[MapController] 유효하지 않은 place 객체 스킵:", {
              hasPlace: !!place,
              hasGeometry: !!place?.geometry,
              hasLocation: !!place?.location,
              place_id: place?.place_id || place?.id,
            });
            return null;
          }

          // 🔥 안전한 추출 도구 사용: getSafeLatLng 함수로 변환 과정 보호
          let coords: { lat: number; lng: number } | null = null;
          try {
            coords = getSafeLatLng(place);
          } catch (error) {
            console.warn("[MapController] getSafeLatLng 호출 실패:", error, {
              place_id: place?.place_id || place?.id,
              name: place?.name,
            });
            return null;
          }
          
          // 좌표가 없으면 앱을 죽이지 말고 이 장소만 조용히 패스합니다.
          if (!coords) {
            console.warn("[MapController] 유효하지 않은 좌표 데이터 스킵:", place?.name || place?.id);
            return null;
          }

          return {
          id: place.place_id || place.id,
          name: place.name,
            location: coords, // 🔥 추출된 {lat, lng} 숫자를 할당
          address: place.formatted_address || place.address,
          rating: place.rating,
          userRatingsTotal: place.user_ratings_total,
          types: place.types || [],
            // 🔥 좌표 접근 통일: 평면 구조 대응
            lat: coords.lat,
            lng: coords.lng,
          };
        }).filter(Boolean) as MapPlace[];

        // 🔥 [최종 해결책] 데이터 강제 직렬화: 검색 결과를 상태에 저장하기 직전에 실행
        // 초록색 중심점 마커 말고, 검색 결과 리스트(processedPlaces)에 있는 장소들을 지도에 Marker로 뿌리기 위해
        // 반드시 getSafeLatLng 함수를 거친 숫자 좌표를 사용해야 함
        const sanitizedProcessedPlaces = sanitizePlaces(processedPlaces);
        
        // 🔥 데이터 필터링 완화: 검색 결과가 1개여도 UI에 표시되도록 placesCount > 0 조건을 확인
        // 🔥 UI 동기화: textSearch로 받아온 10~20개의 결과(results)가 processedPlaces에 담겨서 WebMapRenderer로 전달되는지 확인
        console.log('📊 [MapController] textSearch → processedPlaces → WebMapRenderer UI 동기화 확인:', {
          textSearchResultsCount: results?.length || 0,
          processedPlacesCount: processedPlaces.length,
          sanitizedPlacesCount: sanitizedProcessedPlaces.length,
          placesCount: sanitizedProcessedPlaces.length, // 🔥 UI 동기화: placesCount 확인
          willDisplayInUI: sanitizedProcessedPlaces.length > 0, // 🔥 검색 결과가 1개여도 UI에 표시
          willRenderMarkers: sanitizedProcessedPlaces.length > 0, // 🔥 WebMapRenderer에서 마커 렌더링 여부
          placesToRender: sanitizedProcessedPlaces.map(p => ({
            id: p.id,
            name: p.name,
            lat: p.lat,
            lng: p.lng,
            hasValidCoords: Number.isFinite(p.lat) && Number.isFinite(p.lng),
          })),
          allPlacesValid: sanitizedProcessedPlaces.every(p => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
        });
        
        // 🔥 UI 필터 점검: 검색된 장소가 1개라도 있으면 하단 리스트에 무조건 보이도록 필터 조건을 완화
        if (sanitizedProcessedPlaces.length > 0) {
          setPlaces(sanitizedProcessedPlaces);
          console.log('✅ [MapController] UI 필터 완화: 검색된 장소가 1개라도 있으면 하단 리스트에 무조건 표시, placesCount:', sanitizedProcessedPlaces.length);
        } else {
          // 🔥 핵심 수정: 검색 결과가 없어도 기존 places 유지 (빈 배열로 초기화 금지)
          console.warn('⚠️ [MapController] UI 필터: placesCount === 0, 기존 장소 유지');
        }
        setIsSearching(false);

        // 검색 결과를 부모 컴포넌트에 전달
        if (onPlacesUpdate) {
          const placeLites = processedPlaces.map(p => ({
            placeId: p.id,
            name: p.name,
            location: p.location,
            address: p.address,
            distanceM: undefined, // 거리는 나중에 계산
            category: p.types?.[0] || '',
            imageUrl: undefined,
            rating: p.rating,
          }));
          onPlacesUpdate(placeLites);
        }

        console.log('[SEARCH] 완료', {
          placesCount: processedPlaces.length,
        });
      } catch (error) {
        console.error('[SEARCH] 오류:', error);
        // 🔥 핵심 수정: 검색 오류 발생해도 기존 places 유지 (빈 배열로 초기화 금지)
        setIsSearching(false);
      }
    };

    performSearch();
  }, [phase, activeSearchQuery, locationState]); // ✅ MVP: phase, activeSearchQuery, locationState 변경 시 검색 실행

  // 🔥 초기 중심점 변경
  useEffect(() => {
    if (initialCenter) {
      setCenter(initialCenter);
    }
  }, [initialCenter]);

  // 🔥 Phase L: 위치 상태 변경 시 지도 중심 업데이트 (선택적)
  // ✅ MVP: 내 위치 버튼은 모든 phase에서 허용 (사용자 요청)
  useEffect(() => {
    // ✅ MVP: 내 위치 버튼 클릭 시 지도 중심 이동 (source가 'map'인 경우만)
    // 🔥 수정: phase 가드 제거 - 내 위치 버튼은 항상 허용
    if (locationState && locationState.status === 'READY' && locationState.source === 'map') {
      // 🔥 정답 구조: map 인스턴스가 있으면 직접 panTo 호출
      const map = mapRef.current;
      if (!map) {
        console.warn('⚠️ [MyLocation] mapRef 없음');
      return;
    }
    
      const target = {
        lat: locationState.lat,
        lng: locationState.lng,
      };
      
      console.log('[MyLocation] panTo', {
        lat: target.lat,
        lng: target.lng,
        source: locationState.source,
        phase,
      });
      
      map.panTo(target);
      map.setZoom(MY_LOCATION_ZOOM);
      
      console.log('✅ [MyLocation] panTo 완료');
    }
  }, [locationState, phase]); // ✅ MVP: phase 기준으로 변경

  // 🔥 Phase 12: 서버 기억 로드 (최초 1회)
  useEffect(() => {
    const loadServerMemories = async () => {
      const preferences = await loadPreferencesFromServer();
      setServerPreferences(preferences);
      
      // 🔥 Phase 13: 자동 제안 조건 확인
      if (preferences.length > 0 && !searchQuery && !navigationStarted) {
        setShowAutoSuggestion(true);
      }
    };
    
    loadServerMemories();
  }, []); // 최초 1회만

  // 🔥 Phase 13: 자동 제안 조건 확인 (검색어/길 안내 상태 변경 시)
  useEffect(() => {
    if (serverPreferences.length > 0 && !searchQuery && !navigationStarted && places.length === 0) {
      setShowAutoSuggestion(true);
    } else {
      setShowAutoSuggestion(false);
    }
  }, [serverPreferences.length, searchQuery, navigationStarted, places.length]);

  // 🔥 Phase 15: 지도 안내 표시 (최초 1회)
  useEffect(() => {
    if (!hasSeenMapIntro() && isMapReady) {
      setShowMapIntro(true);
    }
  }, [isMapReady]);

  // 🔥 지도 인스턴스 로드 핸들러 (WebMapRenderer에서 호출)
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // 🔥 지도 인스턴스를 window.__MAP_INSTANCE__에 저장 (Place Details API 호출용)
    (window as any).__MAP_INSTANCE__ = map;
    console.log('✅ [MapController] 지도 인스턴스 저장 완료 (mapRef + window.__MAP_INSTANCE__)');
    
    // 🔥 위치 기반 QR: initialCenter가 있으면 우선 사용, 없으면 내 위치 또는 기본값
    const initialTarget = initialCenter && initialCenter.lat !== FALLBACK_HOME.lat && initialCenter.lng !== FALLBACK_HOME.lng
      ? initialCenter // 🔥 QR 위치 우선
      : locationState && locationState.status === 'READY'
        ? { lat: locationState.lat, lng: locationState.lng }
        : FALLBACK_HOME;
    
    map.setCenter(initialTarget);
    map.setZoom(initialCenter && initialCenter.lat !== FALLBACK_HOME.lat && initialCenter.lng !== FALLBACK_HOME.lng ? 17 : DEFAULT_ZOOM); // 🔥 QR 위치는 상세 확대
    console.log('✅ [MapController] 지도 초기 중심 설정 완료', initialTarget);
  }, [locationState, initialCenter]);
  
  // 🔥 내 위치 버튼 클릭 핸들러 (정답 구조 - 직접 panTo 호출 + 마커 표시)
  const moveToMyLocation = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      console.warn('⚠️ [MyLocation] mapRef 없음');
      return;
    }
    
    // 🔥 항상 고정 좌표 사용 (의정부 용민로 420)
    const target = FALLBACK_HOME;
    
    console.log('[MyLocation] panTo', {
      lat: target.lat,
      lng: target.lng,
      source: 'manual',
      phase,
    });
    
    // 1️⃣ 지도 이동 (무조건 실행)
    map.panTo(target);
    map.setZoom(MY_LOCATION_ZOOM);
    
    console.log('✅ [MyLocation] panTo 완료');
    
    // 2️⃣ locationState 업데이트 (마커 표시를 위해)
    // updateFromMap은 MapPageContainer에서 호출하므로 여기서는 로그만
  }, [phase]);

  // 🔥 경로 탐색 로직: 사용자의 현재 위치(userLocation)와 리스트에서 선택된 장소의 좌표(finalLat, finalLng)를 인자로 받는 calculateRoute 함수
  const calculateRoute = useCallback(async (
    userLocation: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    travelMode?: google.maps.TravelMode // 🔥 경로 탐색 모드: 이동 수단 선택 파라미터 추가
  ): Promise<google.maps.DirectionsResult | null> => {
    try {
      // 🔥 안전한 렌더링: 경로를 그리기 전에 반드시 기존에 그려진 경로는 directionsRenderer.setMap(null)로 지워줘
      const mapInstance = mapRef.current || (window as any).__MAP_INSTANCE__;
      if (!mapInstance || !window.google?.maps?.DirectionsService) {
        console.warn('⚠️ [MapController] calculateRoute: 지도 인스턴스 또는 DirectionsService 없음');
        return null;
      }

      // 🔥 좌표 데이터 형식 통일: 좌표가 객체 형태({lat: ..., lng: ...})인지 아니면 숫자 타입인지 확인하고, API 요구 규격에 맞게 변환하는 로직을 추가해
      // 🔥 좌표값 검증: 경로 계산 시 origin(출발지)과 destination(도착지) 좌표가 올바른지 로그로 찍고, 좌표가 없다면 기본값(예: 의정부역 좌표)을 넣어서라도 경로를 그려줘
      // 🔥 경로 좌표를 계산할 때도 우리가 만든 getSafeLatLng를 사용해서 undefined 에러가 나지 않게 보호
      
      // 🔥 좌표 데이터 형식 통일: 다양한 형식의 좌표를 {lat, lng} 객체로 변환
      const normalizeCoordinate = (coord: any): { lat: number; lng: number } | null => {
        if (!coord) return null;
        
        // case 1: 이미 {lat, lng} 객체 형태
        if (typeof coord === 'object' && 'lat' in coord && 'lng' in coord) {
          const lat = typeof coord.lat === 'function' ? coord.lat() : coord.lat;
          const lng = typeof coord.lng === 'function' ? coord.lng() : coord.lng;
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { lat: Number(lat), lng: Number(lng) };
          }
        }
        
        // case 2: location 속성이 있는 경우
        if (coord.location) {
          return normalizeCoordinate(coord.location);
        }
        
        // case 3: getSafeLatLng 사용
        const safe = getSafeLatLng({ location: coord });
        if (safe) return safe;
        
        return null;
      };

      let safeOrigin = normalizeCoordinate(userLocation);
      let safeDestination = normalizeCoordinate(destination);

      // 🔥 좌표 유효성 강제 검사: calculateRoute 함수가 호출될 때, origin(출발지)과 destination(도착지)의 위경도 좌표를 콘솔에 [DEBUG] Origin: Lat, Lng / Destination: Lat, Lng 형식으로 찍어줘
      console.log('[DEBUG] Origin:', safeOrigin ? `${safeOrigin.lat}, ${safeOrigin.lng}` : 'INVALID');
      console.log('[DEBUG] Destination:', safeDestination ? `${safeDestination.lat}, ${safeDestination.lng}` : 'INVALID');
      console.log('[DEBUG] Original userLocation:', userLocation);
      console.log('[DEBUG] Original destination:', destination);

      // 🔥 출발지 주소 고정: 가짜 위치(mock location)를 사용하지 말고, 출발지(origin) 주소를 '경기도 의정부시 용민로 420'으로 하드코딩하거나 이 주소의 위경도 좌표(37.754, 127.114)를 기본 출발값으로 설정해줘
      // 🔥 위치 고정: 경기도 의정부시 용민로 420 (37.754, 127.114)
      const FIXED_ORIGIN = { lat: 37.754, lng: 127.114 }; // 경기도 의정부시 용민로 420
      const defaultDestination = { lat: 37.738, lng: 127.047 }; // 의정부역

      // 🔥 출발지 주소 고정: 항상 용민로 420을 출발지로 사용
      console.log('[위치확정] 출발지: 용민로 420 (37.754, 127.114)');
      safeOrigin = FIXED_ORIGIN; // 🔥 출발지 주소 고정: 항상 용민로 420 사용

      // 🔥 경로 다시 계산: '의정부역'을 목적지로 설정하고, 위에서 설정한 새로운 출발지로부터의 경로를 자동차(DRIVING)와 도보(WALKING)로 다시 계산해
      if (!safeDestination || 
          !Number.isFinite(safeDestination.lat) || !Number.isFinite(safeDestination.lng) ||
          (safeDestination.lat === 0 && safeDestination.lng === 0)) {
        console.warn('⚠️ [MapController] calculateRoute: 도착지 좌표가 유효하지 않음, 의정부역으로 설정:', {
          original: safeDestination,
          fallback: defaultDestination,
        });
        safeDestination = defaultDestination;
        console.log('[위치확정] 도착지: 의정부역 (37.738, 127.047)');
      }

      // 🔥 강제 경로 고정: 최종 좌표값 로그 출력 (정확한 값 확인)
      console.log('✅ [MapController] calculateRoute 좌표 검증 (강제 경로 고정):', {
        originalOrigin: userLocation,
        originalDestination: destination,
        safeOrigin: { lat: safeOrigin.lat, lng: safeOrigin.lng },
        safeDestination: { lat: safeDestination.lat, lng: safeDestination.lng },
        travelMode: travelMode ? travelMode.toString() : 'DRIVING (기본값)',
        originIsValid: Number.isFinite(safeOrigin.lat) && Number.isFinite(safeOrigin.lng),
        destinationIsValid: Number.isFinite(safeDestination.lat) && Number.isFinite(safeDestination.lng),
        originIsFixed: safeOrigin.lat === 37.754 && safeOrigin.lng === 127.114,
        destinationIsUijeongbuStation: safeDestination.lat === 37.738 && safeDestination.lng === 127.047,
      });
      
      // 🔥 강제 경로 고정: 좌표가 이상하면 경로 계산을 중단하고 사용자에게 알림을 줘
      if (!safeOrigin || !safeDestination || 
        !Number.isFinite(safeOrigin.lat) || !Number.isFinite(safeOrigin.lng) ||
        !Number.isFinite(safeDestination.lat) || !Number.isFinite(safeDestination.lng)) {
        console.error('❌ [MapController] calculateRoute: 좌표가 유효하지 않아 경로 계산 중단', {
          safeOrigin,
          safeDestination,
        });
        if (onRouteFailed) {
          onRouteFailed('ERROR');
        }
        return null; // 🔥 강제 경로 고정: 좌표가 이상하면 경로 계산 중단
      }

      const service = new window.google.maps.DirectionsService();
      
      // 🔥 경로 다시 계산: '의정부역'을 목적지로 설정하고, 위에서 설정한 새로운 출발지로부터의 경로를 자동차(DRIVING)와 도보(WALKING)로 다시 계산해
      // 🔥 이동 수단 기본값 변경: 현재 자동차(DRIVING) 경로 계산이 안 된다면, 우선 도보(WALKING) 경로를 먼저 시도하도록 폴백(Fallback) 로직을 넣어줘
      // 🔥 경로 탐색 모드: travelMode 파라미터가 있으면 사용, 없으면 DRIVING 우선 시도 후 WALKING으로 폴백
      const finalTravelMode = travelMode || window.google.maps.TravelMode.DRIVING; // 🔥 경로 다시 계산: DRIVING 우선 시도
      
      return new Promise((resolve, reject) => {
        // 🔥 경로 다시 계산: DRIVING 우선 시도
        service.route({
          origin: new window.google.maps.LatLng(safeOrigin.lat, safeOrigin.lng),
          destination: new window.google.maps.LatLng(safeDestination.lat, safeDestination.lng),
          travelMode: finalTravelMode,
        }, (result, status) => {
          // 🔥 API 에러 상세 출력: 단순히 '실패'라고만 띄우지 말고, API가 응답한 에러 객체 전체를 로그로 남겨서 정확히 어떤 파라미터가 문제인지 파악할 수 있게 해줘
          // 🔥 API 호출 방식 변경: DRIVING과 WALKING이 모두 안 된다면, API 응답 객체 전체를 로그로 찍어서 왜 결과가 없는지 상세 에러 메시지를 파악해줘
          const apiResponseLog: any = {
            status,
            statusText: status.toString(),
            statusCode: status,
            hasResult: !!result,
            resultKeys: result ? Object.keys(result) : [],
            routesCount: result?.routes?.length || 0,
            request: {
              origin: { lat: safeOrigin.lat, lng: safeOrigin.lng },
              destination: { lat: safeDestination.lat, lng: safeDestination.lng },
              travelMode: finalTravelMode.toString(),
            },
          };

          // 🔥 API 에러 상세 출력: result 객체의 모든 속성을 상세히 로그
          if (result) {
            apiResponseLog.firstRoute = result?.routes?.[0] ? {
              legsCount: result.routes[0].legs?.length || 0,
              bounds: result.routes[0].bounds ? {
                north: result.routes[0].bounds.getNorthEast().lat(),
                south: result.routes[0].bounds.getSouthWest().lat(),
                east: result.routes[0].bounds.getNorthEast().lng(),
                west: result.routes[0].bounds.getSouthWest().lng(),
              } : null,
            } : null;
            apiResponseLog.fullResult = JSON.parse(JSON.stringify(result)); // 깊은 복사로 전체 객체 저장
          } else {
            // 🔥 API 에러 상세 출력: 실패 시 에러 정보 상세 출력
            apiResponseLog.error = {
              status,
              statusText: status.toString(),
              message: `Directions API returned status: ${status}`,
            };
          }

          console.log('🔍 [MapController] API 응답 상세 로그:', apiResponseLog);
          
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            console.log(`✅ [MapController] calculateRoute: ${finalTravelMode} 경로 계산 성공`);
            // 🔥 결과값 전달: MapController.tsx에서 calculateRoute가 성공하여 받은 response를 반드시 directionsRenderer.setDirections(response)에 인자로 넣어 호출하게 수정
            setDirectionsResult(result); // 🔥 경로 계산 성공 시 즉시 directionsResult에 저장하여 WebMapRenderer로 전달
            console.log('✅ [MapController] calculateRoute: directionsResult 설정 완료 → WebMapRenderer로 전달');
            
            // 🔥 UI 업데이트: 경로가 찾아지면 지도의 중심을 '용민로 420'과 '의정부역'이 한눈에 보이도록 맞추고(fitBounds), 파란색 경로선을 진하게 그려줘
            if (mapInstance && result.routes?.[0]?.bounds) {
              console.log('[UI 업데이트] 경로 찾음 → fitBounds로 지도 조정');
              mapInstance.fitBounds(result.routes[0].bounds);
              // 🔥 UI 업데이트: 파란색 경로선을 진하게 그리기 위해 지도 스타일 조정 (directionsRenderer에서 처리)
            }
            
            resolve(result);
          } else {
            // 🔥 이동 수단 기본값 변경: DRIVING 실패 시 WALKING으로 폴백
            if (finalTravelMode === window.google.maps.TravelMode.DRIVING) {
              console.log('⚠️ [MapController] calculateRoute: DRIVING 실패, WALKING으로 폴백:', status);
              service.route({
                origin: new window.google.maps.LatLng(safeOrigin.lat, safeOrigin.lng),
                destination: new window.google.maps.LatLng(safeDestination.lat, safeDestination.lng),
                travelMode: window.google.maps.TravelMode.WALKING,
              }, (result, status) => {
                // 🔥 API 에러 상세 출력: 단순히 '실패'라고만 띄우지 말고, API가 응답한 에러 객체 전체를 로그로 남겨서 정확히 어떤 파라미터가 문제인지 파악할 수 있게 해줘
                // 🔥 API 호출 방식 변경: API 응답 객체 전체를 로그로 찍어서 왜 결과가 없는지 상세 에러 메시지를 파악해줘
                const fallbackLog: any = {
                  status,
                  statusText: status.toString(),
                  statusCode: status,
                  hasResult: !!result,
                  resultKeys: result ? Object.keys(result) : [],
                  routesCount: result?.routes?.length || 0,
                  request: {
                    origin: { lat: safeOrigin.lat, lng: safeOrigin.lng },
                    destination: { lat: safeDestination.lat, lng: safeDestination.lng },
                    travelMode: 'WALKING',
                  },
                };
                if (result) {
                  fallbackLog.fullResult = JSON.parse(JSON.stringify(result));
                } else {
                  fallbackLog.error = {
                    status,
                    statusText: status.toString(),
                    message: `Directions API (WALKING fallback) returned status: ${status}`,
                  };
                }
                console.log('🔍 [MapController] WALKING 폴백 API 응답 상세 로그:', fallbackLog);
                
                if (status === window.google.maps.DirectionsStatus.OK && result) {
                  console.log('✅ [MapController] calculateRoute: WALKING 경로 계산 성공 (폴백)');
                  setDirectionsResult(result);
                  console.log('✅ [MapController] calculateRoute: directionsResult 설정 완료 → WebMapRenderer로 전달');
                  
                  // 🔥 UI 업데이트: 경로가 찾아지면 지도의 중심을 '용민로 420'과 '의정부역'이 한눈에 보이도록 맞추고(fitBounds), 파란색 경로선을 진하게 그려줘
                  if (mapInstance && result.routes?.[0]?.bounds) {
                    console.log('[UI 업데이트] WALKING 경로 찾음 → fitBounds로 지도 조정');
                    mapInstance.fitBounds(result.routes[0].bounds);
                  }
                  
                  resolve(result);
                } else {
                  // 🔥 에러 핸들링: ZERO_RESULTS가 뜰 때 사용자에게 "경로를 찾을 수 없습니다"라고 알려주고, 대신 지도를 해당 위치로 이동(panTo)시켜줘
                  console.warn('⚠️ [MapController] calculateRoute: WALKING도 실패:', status);
                  if (status === window.google.maps.DirectionsStatus.ZERO_RESULTS) {
                    // 🔥 에러 핸들링: ZERO_RESULTS 시 지도를 목적지로 이동
                    if (mapInstance) {
                      mapInstance.panTo({ lat: safeDestination.lat, lng: safeDestination.lng });
                      mapInstance.setZoom(15);
                    }
                    // 🔥 에러 핸들링: 사용자에게 알림 (onRouteFailed 콜백 호출)
                    if (onRouteFailed) {
                      onRouteFailed('ZERO_RESULTS');
                    }
                  }
                  reject(new Error(`경로 계산 실패: ${status}`));
                }
              });
            } else if (!travelMode && finalTravelMode === window.google.maps.TravelMode.WALKING) {
              // 🔥 이동 수단 기본값 변경: WALKING 실패 시 DRIVING으로 대체
              console.log('⚠️ [MapController] calculateRoute: WALKING 실패, DRIVING으로 대체:', status);
              service.route({
                origin: new window.google.maps.LatLng(safeOrigin.lat, safeOrigin.lng),
                destination: new window.google.maps.LatLng(safeDestination.lat, safeDestination.lng),
                travelMode: window.google.maps.TravelMode.DRIVING,
              }, (result, status) => {
                // 🔥 API 에러 상세 출력: 단순히 '실패'라고만 띄우지 말고, API가 응답한 에러 객체 전체를 로그로 남겨서 정확히 어떤 파라미터가 문제인지 파악할 수 있게 해줘
                // 🔥 API 호출 방식 변경: API 응답 객체 전체를 로그로 찍어서 왜 결과가 없는지 상세 에러 메시지를 파악해줘
                const replacementLog: any = {
                  status,
                  statusText: status.toString(),
                  statusCode: status,
                  hasResult: !!result,
                  resultKeys: result ? Object.keys(result) : [],
                  routesCount: result?.routes?.length || 0,
                  request: {
                    origin: { lat: safeOrigin.lat, lng: safeOrigin.lng },
                    destination: { lat: safeDestination.lat, lng: safeDestination.lng },
                    travelMode: 'DRIVING',
                  },
                };
                if (result) {
                  replacementLog.fullResult = JSON.parse(JSON.stringify(result));
                } else {
                  replacementLog.error = {
                    status,
                    statusText: status.toString(),
                    message: `Directions API (DRIVING replacement) returned status: ${status}`,
                  };
                }
                console.log('🔍 [MapController] DRIVING 대체 API 응답 상세 로그:', replacementLog);
                
                if (status === window.google.maps.DirectionsStatus.OK && result) {
                  console.log('✅ [MapController] calculateRoute: DRIVING 경로 계산 성공 (대체)');
                  setDirectionsResult(result);
                  console.log('✅ [MapController] calculateRoute: directionsResult 설정 완료 → WebMapRenderer로 전달');
                  
                  // 🔥 UI 업데이트: 경로가 찾아지면 지도의 중심을 '용민로 420'과 '의정부역'이 한눈에 보이도록 맞추고(fitBounds), 파란색 경로선을 진하게 그려줘
                  if (mapInstance && result.routes?.[0]?.bounds) {
                    console.log('[UI 업데이트] DRIVING 경로 찾음 → fitBounds로 지도 조정');
                    mapInstance.fitBounds(result.routes[0].bounds);
                  }
                  
                  resolve(result);
                } else {
                  // 🔥 에러 핸들링: ZERO_RESULTS가 뜰 때 사용자에게 "경로를 찾을 수 없습니다"라고 알려주고, 대신 지도를 해당 위치로 이동(panTo)시켜줘
                  console.warn('⚠️ [MapController] calculateRoute: DRIVING도 실패:', status);
                  if (status === window.google.maps.DirectionsStatus.ZERO_RESULTS) {
                    // 🔥 에러 핸들링: ZERO_RESULTS 시 지도를 목적지로 이동
                    if (mapInstance) {
                      mapInstance.panTo({ lat: safeDestination.lat, lng: safeDestination.lng });
                      mapInstance.setZoom(15);
                    }
                    // 🔥 에러 핸들링: 사용자에게 알림 (onRouteFailed 콜백 호출)
                    if (onRouteFailed) {
                      onRouteFailed('ZERO_RESULTS');
                    }
                  }
                  reject(new Error(`경로 계산 실패: ${status}`));
                }
              });
            } else {
              // 🔥 에러 핸들링: ZERO_RESULTS가 뜰 때 사용자에게 "경로를 찾을 수 없습니다"라고 알려주고, 대신 지도를 해당 위치로 이동(panTo)시켜줘
              console.warn(`⚠️ [MapController] calculateRoute: ${finalTravelMode} 경로 계산 실패:`, status);
              if (status === window.google.maps.DirectionsStatus.ZERO_RESULTS) {
                // 🔥 에러 핸들링: ZERO_RESULTS 시 지도를 목적지로 이동
                if (mapInstance) {
                  mapInstance.panTo({ lat: safeDestination.lat, lng: safeDestination.lng });
                  mapInstance.setZoom(15);
                }
                // 🔥 에러 핸들링: 사용자에게 알림 (onRouteFailed 콜백 호출)
                if (onRouteFailed) {
                  onRouteFailed('ZERO_RESULTS');
                }
              }
              reject(new Error(`경로 계산 실패: ${status}`));
            }
          }
        });
      });
    } catch (error) {
      console.error('❌ [MapController] calculateRoute 오류:', error);
      // 🔥 에러 핸들링: 예외 발생 시에도 지도를 목적지로 이동
      const mapInstance = mapRef.current || (window as any).__MAP_INSTANCE__;
      if (mapInstance && destination) {
        const safeDestination = getSafeLatLng({ location: destination }) || destination;
        if (safeDestination && Number.isFinite(safeDestination.lat) && Number.isFinite(safeDestination.lng)) {
          mapInstance.panTo({ lat: safeDestination.lat, lng: safeDestination.lng });
          mapInstance.setZoom(15);
        }
      }
      return null;
    }
  }, [onRouteFailed]);

  // 🔥 UI 연동: calculateRoute 함수를 window에 노출하여 PlaceResultCard에서 접근 가능하게 함
  // 🔥 경로 표시 실행: MapController에서 경로 계산이 성공하면, 그 결과(response)를 directionsRenderer.setDirections(response)에 전달하는 코드가 누락되지 않았는지 점검
  useEffect(() => {
    (window as any).__MAP_CONTROLLER__ = { 
      calculateRoute,
      setDirectionsResult, // 🔥 경로 표시 실행: calculateRoute 결과를 directionsResult에 저장하여 WebMapRenderer로 전달
    };
    return () => {
      delete (window as any).__MAP_CONTROLLER__;
    };
  }, [calculateRoute]);

  // 🔥 Phase 15: 지도 준비 완료 핸들러
  const handleMapReady = () => {
    setIsMapReady(true);
    if (onMapReady) {
      onMapReady();
    }
  };

  // 🔥 Phase 15: 지도 안내 닫기
  const handleDismissMapIntro = () => {
    setShowMapIntro(false);
    markMapIntroSeen();
  };

  // 🔥 Phase 16: 추천 정확도 검증 로깅
  useEffect(() => {
    if (places.length > 0 && recommendedPlace) {
      console.log('[MapController] Phase 16: 추천 정확도 검증:', {
        totalPlaces: places.length,
        recommended: recommendedPlace.name,
        distance: nearestPlace?.distance?.toFixed(2) + 'km' || 'N/A',
        score: nearestPlace?.score || 0,
        reason: getRecommendationReason(recommendedPlace),
      });
    }
  }, [places.length, recommendedPlace, nearestPlace]);

  // 🔥 디버깅: MapUXOverlay 렌더링 확인
  console.log('[MapController] 렌더링 상태:', {
    placesCount: places.length,
    recommendedPlaceId,
    recommendedPlace: recommendedPlace?.name || null,
    navigationStarted,
  });

  return (
    <div 
      className="map-shell"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100vh', // 🔥 즉시 해결: 지도 영역 확보 - MapContainer의 높이를 100vh로 고정하고
        padding: 0,
        margin: 0,
        zIndex: 0, // 🔥 레이아웃 정리: Z-Index - 지도는 가장 아래(z: 0)
        pointerEvents: 'auto', // 🔥 즉시 해결: 지도 영역 확보 - 지도는 터치 이벤트 보장
      }}
    >
      {/* 🔥 레이아웃 전면 재배치: '말해보세요' 토글 위치 수정 - 현재 지도 중앙에 있는 말해보세요 버튼을 삭제해 */}
      {/* {voiceEnabled && <ListeningIndicator status={sttStatus} onStartListening={onStartListening} isListening={isListening} phase={phase} />} */}
      
      {/* 🔥 Phase 21: 행동 유도 힌트 (listening 상태일 때만) */}
      {voiceEnabled && (
        <ActionNudgeBubble
          isListening={isListening}
          hasSpoken={hasSpoken}
          hasResults={places.length > 0}
        />
      )}
      
      {/* 🔥 천재 모드: 지도 edge-to-edge (fixed 배경 레이어) */}
      {/* WebMapRenderer가 이미 fixed이므로 wrapper 없이 직접 렌더링 */}
      {/* 🔥 Phase 18: MapRenderer가 내부에서 Web/Native 자동 분기 처리 */}
      {/* 웹에서는 WebMapRenderer만 로드, Native에서는 NativeMapRenderer만 로드 */}
      <MapRenderer
          center={center}
          places={Array.isArray(places) ? places : []} // 🔥 초기값 보호: null/undefined 방지
          recommendedPlaceId={recommendedPlaceId} // 🔥 Phase 7: 추천 장소 전달
          selectedPlaceId={selectedPlaceId} // 🔥 Phase 23: 선택된 장소 ID (피드백용)
          highlightedPlaceIds={Array.from(highlightedPlaceIds)} // 🔥 천재 모드: 상위 3개 장소 하이라이트
          previewPlace={previewPlace} // 🔥 정상 지도 페이지: 단일 마커 상태
          routePath={routePath} // 🔥 Phase 9: 경로 좌표 전달
          directionsResult={directionsResult} // 🔥 Phase 33: Directions API 결과 전달 (DirectionsRenderer용)
          navigationStarted={navigationStarted} // 🔥 Phase 9: 길 안내 시작 상태
          showDirectionHint={showDirectionHint} // 🔥 Phase 24: 방향 힌트 표시 여부
          locationState={locationState && locationState.status === 'ready' ? { lat: locationState.lat, lng: locationState.lng } : null} // 🔥 Phase 24: 현재 위치
          destination={recommendedPlace} // 🔥 Phase 24: 목적지
          isSearching={isSearching && sttStatus === 'searching'} // 🔥 Phase 24: 검색 중 여부 (스켈레톤 마커 표시용)
          onMapReady={handleMapReady} // 🔥 Phase 15: 지도 준비 완료 콜백 (안내 표시용)
          onMapLoad={handleMapLoad} // 🔥 지도 인스턴스 전달 (내 위치 버튼용)
          onMarkerClick={handleSelectPlace} // 🔥 Phase 32.1: 마커 클릭 핸들러
          // 🔥 임시: 지도 인터랙션 이벤트 주석 처리 (음성 트리거 우선 복구)
          // onMapInteraction={onMapInteraction} // 🔥 인터랙션 단계: 지도 인터랙션 이벤트 전달
        />
        
        {/* 🔥 검색창 뒤에 숨어있는 녹색 버튼 제거 (검색창 위 버튼만 유지) */}
        {/* <div
          style={{
            position: 'fixed', // 🔥 fixed로 변경 (지도가 fixed이므로)
            top: 'calc(var(--header-h, 56px) + 16px)', // 🔥 천재 모드: 약간 상단 이동 (공간 안내 vs 가르기)
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30, // 🔥 음성 인디케이터 레이어
            pointerEvents: 'auto',
          }}
        >
          <ListeningIndicator 
            status={sttStatus} 
            onStartListening={onStartListening}
            hasRecommendation={
              searchStatus === "results" && 
              !!recommendedPlaceId && 
              !selectedPlace && 
              !propNavigationStarted
            } // 🔥 추천 카드가 표시되어 있는지 (검색 완료 + 추천 장소 있음 + 선택 안 됨 + 길 안내 안 함)
            isDestinationConfirmed={!!selectedPlace && !propNavigationStarted} // 🔥 목적지 확정 상태
            isNavigating={propNavigationStarted || phase === 'NAVIGATING'} // ✅ MVP: phase 기준으로도 NAVIGATING 감지
            isIdleCurious={isIdleCurious} // 🔥 천재 모드: idle 상태 3초 경과 후 "관심" 상태
            phase={phase} // 🔥 phase 전달: IDLE이 아니면 자동 숨김
          />
        </div> */}

      {/* ✅ 2) 오버레이는 무조건 지도 '밖' 형제 */}
      {/* 🔥 B 단계: 지도 위 오버레이 제거 (지도 밖으로 이동 예정) */}
      <div className="map-overlay" style={{ display: 'none' }}>
        {/* 🔥 Phase 32: 네비게이션 시작 확인 카드 (이동수단 선택 포함) - 지도 밖으로 이동 예정 */}
        {false && showConfirmStart && handleStartNavigation && handleWaitNavigation && (
          <NavigationConfirmCard 
            onStart={handleStartNavigation}
            onWait={onWaitNavigation || handleWaitNavigation}
            recommendedPlace={recommendedPlace ? {
              name: recommendedPlace.name || "장소",
              distance: nearestPlace?.distance ? nearestPlace.distance * 1000 : undefined, // km → m 변환
              address: undefined, // 추후 추가 가능
            } : null}
            onShowOther={places.length > 1 ? handleShowOther : undefined} // 🔥 Phase 31: 다른 장소가 있을 때만 표시
            onSelectMode={handleSelectMode} // 🔥 Phase 32: 이동수단 선택 핸들러
          />
        )}

        {/* 🔥 UX 레이어 (지도 위 overlay) - B 단계: 숨김 처리 (지도 밖으로 이동 예정) */}
        {false && (
          <MapUXOverlay
            places={places}
            recommended={recommendedPlace}
            navigationStarted={navigationStarted}
            routePath={routePath} // 🔥 Phase 9: 경로 좌표 전달
            showMemoryPrompt={showMemoryPrompt} // 🔥 Phase 26: 기억 질문 표시 여부
            showAutoSuggestion={showAutoSuggestion} // 🔥 Phase 13: 자동 제안 표시 여부
            recommendationReason={getRecommendationReason(recommendedPlace)} // 🔥 Phase 11: 추천 이유
            searchQuery={searchQuery || ''} // 🔥 Phase 16: 검색어 전달 (빈 상태 메시지 조건부 표시용)
            onSelectPlace={handleSelectPlace}
            onNavigate={handleNavigate}
            onReset={handleReset}
            onSaveMemory={handleSaveMemoryPhase26} // 🔥 Phase 26: 기억 저장 (명시적 동의)
            onDismissMemory={handleDismissMemoryPhase26} // 🔥 Phase 32: 기억 거절 (다음 사용을 위한 자연스러운 복귀)
            isNearDestination={isNearDestination} // 🔥 Phase 31: 목적지 근처 도착 여부 (감정 설계)
            memoryJustSaved={memoryJustSaved} // 🔥 Phase 27: 기억 저장 직후 상태
            onMemoryExplainTimeout={handleMemoryExplainTimeout} // 🔥 Phase 27: 기억 설명 토스트 종료 핸들러
            onDismissAutoSuggestion={() => setShowAutoSuggestion(false)} // 🔥 Phase 13: 자동 제안 닫기
            onShowOther={handleShowOther} // 🔥 Phase 22: 다른 곳 보여주기
            nearestPlace={nearestPlace ? { id: nearestPlace.id, distance: nearestPlace.distance } : null} // 🔥 Phase 22: 가장 가까운 장소 정보 전달
            showStartFeedback={showStartFeedback} // 🔥 Phase 23: 시작 피드백 메시지 표시 여부
            onOpenMemoryControl={handleToggleMemoryControl} // 🔥 Phase 14: 기억 제어 패널 열기
            sttStatus={sttStatus} // 🔥 Phase 22: STT 상태 전달 (상태 전이 포함)
            navIntent={navIntent} // 🔥 Phase 22: 네비게이션 의도 상태 전달
            recognizedText={recognizedText} // 🔥 Phase 22: 인식된 문장 전달
            showRouteDeviation={showRouteDeviation} // 🔥 Phase 30: 경로 이탈 배너 표시 여부
            onRouteDeviationTimeout={() => setShowRouteDeviation(false)} // 🔥 Phase 30: 경로 이탈 배너 종료 핸들러
            showConfirmStart={showConfirmStart} // 🔥 Phase 28: 네비게이션 시작 확인 카드 표시 여부
            onStartNavigation={handleStartNavigation} // 🔥 Phase 28 → Phase 29: 네비게이션 시작 핸들러
            onWaitNavigation={handleWaitNavigation} // 🔥 Phase 28: 대기 핸들러
            onStopNavigation={handleStopNavigation} // 🔥 Phase 25: 네비게이션 중지 핸들러
            onStartListening={onStartListening} // 🔥 STT 시작 핸들러 (ListeningIndicator 클릭용)
            showSpeechAck={showSpeechAck && !navigationStarted} // 🔥 Phase 29: 네비게이션 중이 아닐 때만 표시
            speechAckQuery={speechAckQuery} // 🔥 Phase 29: 반응 카드에 표시할 검색어
            routeInfo={routeInfo} // 🔥 Phase 33: 경로 정보 (거리, 시간) 전달
            // 🔥 Phase 30: 새로운 검색 상태 전달
            searchStatus={searchStatus}
            queryText={queryText}
            phase30Places={propPlaces} // 🔥 Phase 30: PlaceLite[] (기존 places와 이름 충돌 방지)
            onSelectPlacePhase30={onSelectPlace} // 🔥 Phase 30: PlaceLite 선택 핸들러 (기존 onSelectPlace와 이름 충돌 방지)
            searchPhase={searchPhase}
          />
        )}
      </div>
      
      {/* 🔥 공통 헤더 및 배경 정리: 검색창 뒤에 떠 있는 검은색 말풍선 바("자주 가는 장소를 기억해...")를 즉시 제거하거나, 검색창 하단으로 자연스럽게 위치를 옮겨줘 */}
      {false && showMapIntro && ( // 🔥 공통 헤더 및 배경 정리: 검색창 뒤에 떠 있는 검은색 말풍선 바를 즉시 제거
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-xl text-xs shadow-lg pointer-events-auto z-[60] max-w-[calc(100%-32px)]">
          <div className="flex items-center gap-2">
            <span>자주 가는 장소를 기억해 더 잘 추천해드려요.</span>
            <button
              onClick={handleDismissMapIntro}
              className="underline hover:text-gray-300 whitespace-nowrap"
            >
              알겠어요
            </button>
          </div>
        </div>
      )}

      {/* 🔥 Phase 28: 기억 요약 카드 */}
      {showMemorySummary && (
        <MemorySummaryCard
          onClose={() => setShowMemorySummary(false)}
          onMemoryDeleted={handleMemoryDeleted}
        />
      )}

      {/* 🔥 Phase 14: 기억 제어 패널 */}
      {showMemoryControl && (
        <MemoryControlPanel
          recommendedPlace={recommendedPlace}
          recommendationReasons={getDetailedRecommendationReasons(recommendedPlace)}
          currentCategory={searchQuery || ''}
          onClose={() => setShowMemoryControl(false)}
          onMemoryToggle={handleMemoryToggle}
          onMemoryClear={handleMemoryClear}
          onDisableCategory={handleDisableCategory}
          onDeletePlaceMemory={handleDeletePlaceMemory}
        />
      )}
      
      {/* 🔥 Phase 13: 계정 제안 모달 */}
      {showAccountPrompt && pendingPlace && locationState && locationState.status === 'ready' && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowAccountPrompt(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">이 선택을 기억해두면</h3>
            <p className="text-sm text-gray-600 mb-6">
              다음에도 더 빨리 도와드릴 수 있어요.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  // TODO: 계정 로그인/회원가입 플로우
                  console.log('[MapController] 계정으로 저장 클릭');
                  setShowAccountPrompt(false);
                  
                  // 🔥 계정 생성 후 길 안내 진행
                  const url = `https://www.google.com/maps/dir/?api=1&origin=${locationState.lat},${locationState.lng}&destination=${pendingPlace.lat},${pendingPlace.lng}`;
                  window.open(url, '_blank');
                  setNavigationStarted(true);
                  
                  // 🔥 Phase 13: 온보딩 완료 처리
                  completeOnboarding();
                }}
                className="w-full rounded-lg bg-blue-600 text-white py-3 px-4 text-sm font-semibold shadow-md hover:bg-blue-700 transition-colors"
              >
                계정으로 저장
              </button>
              <button
                onClick={() => {
                  // 🔥 나중에 선택 시 그냥 길 안내만 진행
                  const url = `https://www.google.com/maps/dir/?api=1&origin=${locationState.lat},${locationState.lng}&destination=${pendingPlace.lat},${pendingPlace.lng}`;
                  window.open(url, '_blank');
                  setNavigationStarted(true);
                  setShowAccountPrompt(false);
                  
                  // 🔥 Phase 13: 온보딩 완료 처리
                  completeOnboarding();
                }}
                className="w-full rounded-lg bg-gray-200 text-gray-800 py-3 px-4 text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                나중에
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 🔥 Phase 6: VoiceUXController 활성화 (조건부 TTS) */}
      <VoiceUXController
        places={places}
        isSearching={isSearching}
        searchQuery={searchQuery}
        voiceEnabled={voiceEnabled}
        location={locationState} // 🔥 Phase L 검증: 위치 상태 전달
        recommendedPlaceId={undefined} // ❌ v4 SEARCH ONLY: 추천 비활성화
        navigationStarted={navigationStarted} // 🔥 Phase 9: 길 안내 시작 상태 전달
      />
    </div>
  );
}

/**
 * 🔥 검색 중심점 결정 함수 (Single Source of Truth)
 * 
 * 우선순위:
 * 1. explicitCenter (명시적 전달, geolocation 또는 사용자 선택)
 * 2. locationState (LocationController에서 관리하는 위치 상태)
 * 3. mapCenter (지도 중심점)
 * 4. defaultCenter (서울시청 기본값)
 * 
 * 항상 하나의 유효한 좌표를 보장
 */
function resolveSearchCenter({
  explicitCenter,
  locationState,
  mapCenter,
  defaultCenter,
}: {
  explicitCenter?: MapCenter;
  locationState?: LocationState | null;
  mapCenter?: MapCenter;
  defaultCenter: MapCenter;
}): MapCenter & { source: 'default' | 'geolocation' | 'map' | 'search' | 'explicit' } {
  // 1순위: 명시적 중심점 (geolocation 성공 또는 사용자 선택)
  if (
    explicitCenter &&
    typeof explicitCenter.lat === 'number' &&
    typeof explicitCenter.lng === 'number' &&
    !isNaN(explicitCenter.lat) &&
    !isNaN(explicitCenter.lng)
  ) {
    return {
      lat: explicitCenter.lat,
      lng: explicitCenter.lng,
      source: explicitCenter.source || 'explicit',
    };
  }

  // 2순위: 지도 중심점 (실제 지도 중심 우선 사용)
  if (
    mapCenter &&
    typeof mapCenter.lat === 'number' &&
    typeof mapCenter.lng === 'number' &&
    !isNaN(mapCenter.lat) &&
    !isNaN(mapCenter.lng)
  ) {
    return {
      lat: mapCenter.lat,
      lng: mapCenter.lng,
      source: 'map',
    };
  }

  // 3순위: LocationController에서 관리하는 위치 상태 (Phase L)
  // 🔥 단, source가 'default'가 아닐 때만 사용 (실제 GPS 위치만)
  if (
    locationState &&
    locationState.status === 'ready' &&
    locationState.source !== 'default' && // 🔥 source가 'default'면 제외
    typeof locationState.lat === 'number' &&
    typeof locationState.lng === 'number' &&
    !isNaN(locationState.lat) &&
    !isNaN(locationState.lng)
  ) {
    return {
      lat: locationState.lat,
      lng: locationState.lng,
      source: locationState.source,
    };
  }

  // 4순위: 기본값 (서울시청)
  return {
    lat: defaultCenter.lat,
    lng: defaultCenter.lng,
    source: 'default',
  };
}

/**
 * 🔥 기본 지도 페이지 v2
 * 
 * 설계 원칙:
 * - 지도는 항상 풀스크린, 항상 줌 가능, 항상 드래그 가능
 * - 지도 자체는 절대 흔들지 않음 (옵션 스위칭 없음)
 * - UX는 지도 위 오버레이로 처리
 * - AI / 음성 / 가이드 전부 overlay 컴포넌트로 분리
 * 
 * 구조:
 * [ Header ] (App.tsx에서 제공)
 * [ Full Screen Google Map ] ← 항상 동일
 * [ Bottom Overlay (AI UI) ] ← 상태에 따라 내용만 변경
 * [ BottomNav ] (App.tsx에서 제공)
 * 
 * ---
 * 
 * 🔥 Phase 40: 핵심 메시지 정의
 * 
 * "길찾기는 맡기고, 돌아오면 내가 이어준다."
 * 
 * 또는
 * 
 * "길은 Google Maps가 안내하고, 나는 사용자를 놓치지 않는다."
 * 
 * 이 문장이 이 앱의 모든 Phase를 설명한다:
 * - 외부 지도 위임 (Phase 32-33)
 * - 복귀 상태 유지 (Phase 33)
 * - 음성 재진입 (Phase 36)
 * - 실패 대응 (Phase 37)
 * - 사용자 통제권 (Phase 34, 37)
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loadGoogleMap } from "@/lib/loadGoogleMap";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { HEADER_HEIGHT } from "@/layout/Header";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useAuth } from "@/context/AuthProvider";
import { getUserLocation } from "@/lib/getUserLocation";
import { getAddressFromLatLng } from "@/utils/getAddressFromLatLng";
import { saveMovementSession, updateMovementSession } from "@/services/movementSession";
import { determineArrivalContext } from "@/hooks/useArrivalContext";
import { inferIntent, getCurrentTimeContext } from "@/services/movementInference";
import { checkInToSession, startDeparture } from "@/services/runningCrewService";
// 🔥 리모델링: StatusHeader, ListeningIndicator, RecognizedCaption, StateBar 제거 (StatusPill로 통합 완료)
import { ArrivalPanel } from "@/components/movement/ArrivalPanel";
import { callVoiceAPI, type WebVoiceResponse } from "@/utils/voiceMapAPI";
import { beginVoiceCycle, endVoiceCycle, isVoiceCycleActive } from "@/utils/voiceCycleGuard";
import type { STTStatus } from "@/types/stt"; // 🔥 Phase 20: STT 상태 타입
import StatusPill from "@/components/map/StatusPill"; // 🔥 리모델링: 상태 메시지 단일화
import MapStatusPill from "@/components/map/MapStatusPill"; // 🔥 리모델링 Step 1: 지도 위 유일 UI
import { useMapUI, type MapUIState } from "@/hooks/useMapUI"; // 🔥 리모델링: UI 상태 머신
import TransportTabs from "@/components/map/TransportTabs"; // 🔥 리모델링: 상단 교통수단 탭
import BottomActionSheet from "@/components/map/BottomActionSheet"; // 🔥 리모델링: 하단 액션 시트

// 🔥 Phase 35: UX 이벤트 타입 (퍼널 수집)
type UXEvent =
  | 'map_loaded'
  | 'marker_selected'
  | 'cta_clicked'
  | 'external_navigation_opened'
  | 'returned_from_maps'
  | 'navigation_resumed'
  | 'navigation_canceled'
  | 'navigation_resumed_voice' // 🔥 Phase 36: 음성 재개
  | 'navigation_canceled_voice' // 🔥 Phase 36: 음성 취소
  | 'external_navigation_failed'; // 🔥 Phase 37: 외부 네비게이션 실패

// 🔥 Phase 35: 로깅 유틸 (초경량, console 기반)
const logUXEvent = (event: UXEvent, data?: Record<string, any>) => {
  console.debug('[UX]', event, data || {});
  // TODO: production에서는 analytics endpoint로 전송
  // if (import.meta.env.PROD) {
  //   fetch('/api/analytics/ux', { method: 'POST', body: JSON.stringify({ event, data, timestamp: Date.now() }) });
  // }
};

// 🔥 Phase 36: 음성 명령 스키마 (재안내 UX)
const VOICE_COMMANDS = {
  RESUME: ['계속 안내', '다시 안내', '다시 길찾기', '계속 가자', '계속', '다시', '길찾기'],
  CANCEL: ['취소', '안내 종료', '그만', '멈춰', '종료', '그만해'],
  RETRY: ['다시', '한번 더', '다시 시도', '재시도'], // 🔥 Phase 37: 실패 재시도
} as const;

// 🔥 사용자 목적 (Intent-first UX)
type UserIntent =
  | "solo_play"      // 혼자 운동
  | "team_practice"  // 팀 연습
  | "competition"    // 대회
  | "quiet_training"; // 조용히 뛰기

// 🔥 AI 응답 포맷 (고정)
type AIMapResponse = {
  title: string;
  intent?: UserIntent; // 🔥 목적 기반 해석
  results: {
    id: string;
    lat: number;
    lng: number;
    name: string;
  }[];
};

// 🔥 AI Overlay 상태 (딱 하나만 필요)
type AIOverlayState =
  | { type: "idle" }
  | { type: "result"; title: string; count: number }
  | { type: "followup"; placeName: string }
  | { type: "compare"; a: { name: string; point: string }; b: { name: string; point: string } }
  | { type: "reason"; placeName: string; reasons: string[] }
  | { type: "transport_select"; placeId: string; placeName: string; lat: number; lng: number }
  | { type: "phase33"; placeId: string; placeName: string; lat: number; lng: number; travelMode: string }
  | { type: "phase37"; placeId: string; placeName: string; lat: number; lng: number; travelMode: string }; // 🔥 Phase 37: 네트워크 실패

// 🔥 AI Proactive 메시지 (AI가 먼저 말 거는 경우)
type AIProactiveMessage = {
  text: string;
  actionHint?: string;
};

// 🔥 사용자 취향 신호 (설정이 아닌 흔적)
type UserPreferenceSignal = {
  type: "filter_used" | "marker_selected" | "followup_question";
  value: string; // "quiet", "night", "close", "team" 등
};

// 🔥 AI 컨텍스트 (취향 포함)
type AIContext = {
  recentPreferences: string[];
};

// 🔥 지도 모드 상태 머신 (이게 전부다)
type MapMode = "idle" | "result" | "navigation";

// 🔥 카메라 모드 (안내 중 자동 추적 상태)
type CameraMode = "follow" | "free";

// 🔥 네비게이션 정보
type NavigationInfo = {
  destination: { lat: number; lng: number; name: string };
  distance?: string;
  duration?: string;
  travelMode: google.maps.TravelMode;
};

// 🔥 위치 기반 검색 중심점 (source 구분)
type SearchCenter = {
  lat: number;
  lng: number;
  source: 'explicit' | 'map-fallback';
};

// 🔥 Geolocation UX 상태
type GeoUXState = 'idle' | 'requesting' | 'timeout' | 'denied' | 'success';

// 🔥 Map Command (Command Layer 파싱 결과)
type MapCommand = {
  keyword: string;
  useMyLocation: boolean;
};

// 🔥 YAGO 표준: 자동 줌 최소/최대 제한
const MAP_ZOOM_LIMIT = {
  MIN: 10, // 도시 단위 맥락 유지
  MAX: 19, // roadmap 기준 실제 확장 가능 (시설/운동장 단위 탐색)
};

// 🔥 Google Map "실전 정답 옵션 세트" (무조건 기본값으로 깔고 가야 함)
const MAP_OPTIONS: google.maps.MapOptions = {
  mapTypeId: "roadmap", // ⭐⭐⭐ 중요 (terrain/hybrid 금지 - 자체 maxZoom 한계 있음)

  zoom: 14,
  minZoom: 10,      // 너무 멀리 못 나가게
  maxZoom: 19,      // roadmap 기준 실제 확장 가능

  gestureHandling: "greedy", // ⭐ 필수 (마우스/터치 줌 허용)
  scrollwheel: true,         // 마우스 휠 줌
  disableDoubleClickZoom: false,

  fullscreenControl: true,
  mapTypeControl: false,
  streetViewControl: false,
};

// 🔥 1️⃣ resolveSearchCenter: 안전한 fallback 처리
// 목적: Geolocation timeout으로 searchCenter가 null일 때만, 지도 중심을 '임시 검색 기준'으로 사용
function resolveSearchCenter({
  explicitCenter,
  mapRef,
}: {
  explicitCenter?: { lat: number; lng: number };
  mapRef: { current: google.maps.Map | null };
}): SearchCenter | null {
  if (
    explicitCenter &&
    typeof explicitCenter.lat === "number" &&
    typeof explicitCenter.lng === "number"
  ) {
    return { ...explicitCenter, source: "explicit" as const };
  }

  // ⚠️ 여기서만 fallback
  const map = mapRef.current;
  const mapCenter = map?.getCenter();

  if (mapCenter) {
    console.warn("[searchCenter] geolocation 실패 → map center fallback");
    return {
      lat: mapCenter.lat(),
      lng: mapCenter.lng(),
      source: "map-fallback" as const,
    };
  }

  return null;
}

// 🔥 3️⃣ parseMapCommand: Command Layer 파싱
// 목적: "내 주변" 명령을 Command Layer에서만 처리하는 규칙
function parseMapCommand(text: string): MapCommand {
  return {
    keyword: text.replace(/내 주변|근처|주변|가까운/g, "").trim(),
    useMyLocation: /내 주변|근처|주변|가까운/.test(text),
  };
}

// 🔥 취향 신호 추적 (점수/퍼센트 없음, 그냥 "자주 나온 단어")
function trackPreference(signal: UserPreferenceSignal): string[] {
  const STORAGE_KEY = "yago_map_preferences";
  const MAX_SIGNALS = 10; // 최근 10개만 유지

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const signals: UserPreferenceSignal[] = stored ? JSON.parse(stored) : [];

    // 새 신호 추가
    signals.push(signal);

    // 최근 N개만 유지
    const recent = signals.slice(-MAX_SIGNALS);

    // value만 추출 (중복 제거)
    const values = Array.from(new Set(recent.map(s => s.value)));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));

    return values;
  } catch (err) {
    console.warn("⚠️ [GeneralMapPage v2] 취향 저장 실패:", err);
    return [];
  }
}

// 🔥 취향 로드 (최근 신호에서 value 추출)
function loadPreferences(): string[] {
  const STORAGE_KEY = "yago_map_preferences";

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const signals: UserPreferenceSignal[] = JSON.parse(stored);
    return Array.from(new Set(signals.map(s => s.value)));
  } catch (err) {
    return [];
  }
}

// 🔥 취향 기반 AI 컨텍스트 생성
function buildAIContext(): AIContext {
  return {
    recentPreferences: loadPreferences(),
  };
}

// 🔥 Intent → 라벨 변환 (목적 기반 해석)
function buildIntentLabel(intent?: UserIntent): string | null {
  if (!intent) return null;

  const intentLabels: Record<UserIntent, string> = {
    solo_play: "혼자 운동하기 좋은 곳",
    team_practice: "팀 연습하기 좋은 곳",
    competition: "대회 열 수 있는 곳",
    quiet_training: "조용히 뛰기 좋은 곳",
  };

  return intentLabels[intent] || null;
}

// 🔥 취향 기반 메시지 생성 (자연스럽게)
function buildPreferenceMessage(preferences: string[]): string | null {
  if (preferences.length === 0) return null;

  const preferenceMessages: Record<string, string> = {
    quiet: "조용한 곳",
    night: "밤에도 가능한 곳",
    close: "가까운 곳",
    team: "팀 활동",
  };

  const labels = preferences
    .slice(0, 2) // 최대 2개만
    .map(p => preferenceMessages[p] || p);

  if (labels.length === 0) return null;

  return `이런 곳을 자주 찾으시네요. ${labels.join(", ")} 위주로 골라볼게요.`;
}

// 🔥 비교 데이터 생성 (결과 2개일 때)
function buildComparison(
  results: AIMapResponse["results"]
): { a: { name: string; point: string }; b: { name: string; point: string } } | null {
  if (results.length !== 2) return null;

  // 🔥 간단한 비교 포인트 생성 (실제로는 AI가 분석)
  // TODO: 실제로는 거리, 인기도, 시설 등 분석
  return {
    a: {
      name: results[0].name,
      point: "가장 가까워요",
    },
    b: {
      name: results[1].name,
      point: "사람이 더 적어요",
    },
  };
}

// 🔥 추천 이유 생성 (신뢰 레이어)
function buildReason(
  placeName: string,
  preferences: string[] = []
): { placeName: string; reasons: string[] } {
  const reasons: string[] = [];

  // 🔥 기본 이유 (항상 포함)
  reasons.push("현재 위치에서 가장 가까워요");

  // 🔥 취향 기반 이유 (최대 2개)
  const preferenceReasons: Record<string, string> = {
    quiet: "저녁 시간대 이용이 편해요",
    night: "밤에도 가능한 곳이에요",
    close: "걸어서 바로 갈 수 있어요",
    team: "팀 활동하기 좋은 공간이에요",
  };

  const addedReasons = new Set<string>();
  for (const pref of preferences.slice(0, 2)) {
    const reason = preferenceReasons[pref];
    if (reason && !addedReasons.has(reason)) {
      reasons.push(reason);
      addedReasons.add(reason);
    }
  }

  // 🔥 최대 3개만 유지
  return {
    placeName,
    reasons: reasons.slice(0, 3),
  };
}

// 🔥 클러스터 요약 메시지 생성 (결과 많을 때 AI가 요약)
function getClusterSummary(
  results: AIMapResponse["results"],
  preferences?: string[]
): { text: string; hint?: string } {
  const baseText = `이 근처에 ${results.length}곳이 있어요.`;

  // 🔥 취향이 있으면 자연스럽게 반영
  const preferenceMsg = preferences && preferences.length > 0
    ? buildPreferenceMessage(preferences)
    : null;

  return {
    text: preferenceMsg || baseText,
    hint: "특정 위치를 말로 좁혀볼까요?",
  };
}

// 🔥 클러스터 연결 함수 (클러스터는 내부 계산용, UI는 최소)
function attachCluster(
  map: google.maps.Map,
  markers: google.maps.Marker[]
): MarkerClusterer | null {
  if (!markers.length || typeof MarkerClusterer === "undefined") return null;

  try {
    return new MarkerClusterer({
      map,
      markers,
      // 🔥 기본값 그대로 사용 (UI 최소화)
    });
  } catch (err) {
    console.warn("⚠️ [GeneralMapPage v2] MarkerClusterer 초기화 실패:", err);
    return null;
  }
}

// 🔥 마커 렌더링 함수 (지도는 건드리지 않음)
// 마커는 아무 말도 안 한다, 클릭되면 AI에게 권한 위임
function renderMarkers(
  map: google.maps.Map,
  results: AIMapResponse["results"],
  onSelect: (place: { id: string; name: string; lat: number; lng: number }) => void
): google.maps.Marker[] {
  // ✅ 1단계: 구글 라이브러리가 있는지 먼저 확인 (에러 방지 핵심)
  if (!window.google || !window.google.maps) {
    console.warn("⏳ 아직 구글 지도 라이브러리가 준비되지 않았습니다.");
    return [];
  }
  
  // ✅ Marker 클래스 존재 확인
  if (!window.google.maps.Marker || typeof window.google.maps.Marker !== 'function') {
    console.warn("⏳ 아직 구글 Maps Marker 클래스가 준비되지 않았습니다.");
    return [];
  }
  
  const markers: google.maps.Marker[] = [];
  const google = window.google.maps;

  // ✅ 3단계: 새 마커 생성
  results.forEach((r) => {
    try {
      // 최신 방식인 AdvancedMarkerElement 사용을 권장하지만, 
      // 현재 Marker를 쓰신다면 최소한 존재 여부는 확인해야 합니다.
      if (google.Marker && typeof google.Marker === 'function') {
        const marker = new google.Marker({
      position: { lat: r.lat, lng: r.lng },
          map: map,
      title: r.name,
      icon: {
            path: google.SymbolPath.CIRCLE,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2,
        scale: 8,
      },
    });

    // 🔥 마커 클릭 이벤트 = Phase 32 트리거 (크래시 방지)
        if (marker && typeof marker.addListener === 'function') {
    marker.addListener("click", () => {
        // 🔥 안전 체크: onSelect가 함수인지 확인
        if (typeof onSelect === 'function') {
      onSelect(r);
        } else {
          console.warn("⚠️ [마커] onSelect 핸들러가 없습니다");
        }
    });
        }

    markers.push(marker);
      }
    } catch (e) {
      console.warn("⚠️ 마커 생성 중 오류 발생:", e);
    }
  });

  return markers;
}

// 🔥 반경 기반 검색 (Radius Engine)
type RadiusPreset = 300 | 500 | 1000 | 3000 | 5000;

function inferRadius(text: string): RadiusPreset {
  if (/걸어서|근처/.test(text)) return 500;
  if (/가까운/.test(text)) return 1000;
  if (/차로|드라이브/.test(text)) return 5000;
  if (/주변/.test(text)) return 3000;
  return 1000; // default
}

// 🔥 거리 계산 (Haversine)
function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000; // 지구 반지름 (미터)
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// 🔥 반경 필터링
function filterByRadius<T extends { lat: number; lng: number }>(
  items: T[],
  center: { lat: number; lng: number },
  radius: number
): T[] {
  return items.filter((i) => distanceMeters(center, i) <= radius);
}

// 🔥 안내 모드 줌 정책 적용
function applyNavZoomBounds(
  map: google.maps.Map,
  travelMode: google.maps.TravelMode
) {
  const google = window.google?.maps;
  if (!google) return;

  const presets: Record<number, { min: number; max: number; zoom: number }> = {
    [google.TravelMode.WALKING]: { min: 15, max: 19, zoom: 17 },
    [google.TravelMode.DRIVING]: { min: 13, max: 18, zoom: 15 },
    [google.TravelMode.BICYCLING]: { min: 14, max: 19, zoom: 16 },
    [google.TravelMode.TRANSIT]: { min: 13, max: 18, zoom: 15 },
  };

  const p = presets[travelMode] || presets[google.TravelMode.WALKING];
  map.setOptions({ minZoom: p.min, maxZoom: p.max });
  
  // 초기 진입 시만 기본 줌
  const currentZoom = map.getZoom() || p.zoom;
  map.setZoom(Math.min(Math.max(currentZoom, p.min), p.max));
}

// 🔥 안내 모드 회전 정책 적용 (이동 수단별)
function applyNavRotation(map: google.maps.Map, travelMode: google.maps.TravelMode) {
  const google = window.google?.maps;
  if (!google) return;

  map.setOptions({
    rotateControl: true, // 컨트롤은 있어도 됨
  });
  
  // 차량일 때는 진행 방향, 도보/자전거는 북쪽 고정
  // Google Maps는 기본적으로 북쪽 고정이므로 추가 설정 불필요
  // (실제 heading/tilt 제어는 Google Maps API 제한으로 기본값 유지)
}

// 🔥 행동 타입 추출 (아이콘용)
type ActionType = "straight" | "left" | "right" | "uturn" | "merge" | "roundabout";

function extractActionType(instruction: string): ActionType {
  const lower = instruction.toLowerCase();
  if (lower.includes("u-turn") || lower.includes("유턴") || lower.includes("되돌아")) return "uturn";
  if (lower.includes("left") || lower.includes("좌회전") || lower.includes("왼쪽")) return "left";
  if (lower.includes("right") || lower.includes("우회전") || lower.includes("오른쪽")) return "right";
  if (lower.includes("merge") || lower.includes("합류")) return "merge";
  if (lower.includes("roundabout") || lower.includes("로터리")) return "roundabout";
  return "straight";
}

// 🔥 다음 스텝 정보 추출 (행동 타입 포함)
function getNextStep(result: google.maps.DirectionsResult): { instruction: string; distance: string; actionType: ActionType } | null {
  const steps = result.routes[0]?.legs[0]?.steps;
  if (!steps || steps.length === 0) return null;

  const step = steps[0];
  const instruction = step.instructions
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();

  return {
    instruction,
    distance: step.distance?.text || "",
    actionType: extractActionType(instruction),
  };
}

// 🔥 상황 인식 코칭 (AI 정체성의 핵심)
function getSituationalCoaching(
  step: { instruction: string; distance: string; actionType: ActionType } | null,
  distanceToDestination: number | null
): string | null {
  if (!step) return null;

  const distanceMeters = parseInt(step.distance.replace(/[^0-9]/g, "")) || 0;

  // 도착 직전 (50m 이내)
  if (distanceToDestination !== null && distanceToDestination < 50) {
    return "거의 다 왔어요";
  }

  // 복잡한 구간 (회전, 합류 등)
  if (step.actionType === "left" || step.actionType === "right") {
    if (distanceMeters < 100) {
      return "여기서 헷갈릴 수 있어요, 차선 유지하세요";
    }
  }

  // 로터리/복잡한 교차로
  if (step.actionType === "roundabout") {
    return "로터리 진입 시 주의하세요";
  }

  return null;
}

// 🔥 경로 이탈 감지 (간단 버전 - 실제로는 geometry 라이브러리 필요)
function isOffRoute(
  current: { lat: number; lng: number },
  directionsResult: google.maps.DirectionsResult,
  thresholdMeters = 50 // 50미터 이상 벗어나면 이탈로 간주
): boolean {
  const google = window.google?.maps;
  if (!google) return false;

  // 경로의 모든 포인트 추출
  const path: google.maps.LatLng[] = [];
  const route = directionsResult.routes[0];
  if (!route) return false;

  route.legs.forEach((leg) => {
    leg.steps.forEach((step) => {
      if (step.path) {
        step.path.forEach((point) => {
          path.push(point);
        });
      }
    });
  });

  if (path.length === 0) return false;

  // 현재 위치에서 가장 가까운 경로 포인트까지의 거리 계산
  let minDistance = Infinity;
  const currentLatLng = new google.LatLng(current.lat, current.lng);

  for (const point of path) {
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      currentLatLng,
      point
    );
    minDistance = Math.min(minDistance, distance);
  }

  return minDistance > thresholdMeters;
}

// 🔥 경로로 복귀 (카메라를 경로 중심으로 재정렬)
function recenterToRoute(
  map: google.maps.Map,
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  directionsResult?: google.maps.DirectionsResult
) {
  const google = window.google?.maps;
  if (!google) return;

  const bounds = new google.LatLngBounds();
  bounds.extend(origin);
  bounds.extend(destination);

  // 다음 스텝이 있으면 bounds에 포함
  if (directionsResult) {
    const steps = directionsResult.routes[0]?.legs[0]?.steps;
    if (steps && steps.length > 0) {
      const firstStep = steps[0];
      if (firstStep.start_location) bounds.extend(firstStep.start_location);
      if (firstStep.end_location) bounds.extend(firstStep.end_location);
    }
  }

  map.fitBounds(bounds, { top: 80, bottom: 200, left: 40, right: 40 });
}

// 🔥 다음 행동 중심 카메라 (내 위치 + 다음 step 끝점)
function focusNextStep(
  map: google.maps.Map,
  current: { lat: number; lng: number },
  directionsResult?: google.maps.DirectionsResult
) {
  const google = window.google?.maps;
  if (!google) return;

  const bounds = new google.LatLngBounds();
  bounds.extend(current);

  // 다음 스텝 끝점 포함
  if (directionsResult) {
    const steps = directionsResult.routes[0]?.legs[0]?.steps;
    if (steps && steps.length > 0) {
      const firstStep = steps[0];
      if (firstStep.end_location) {
        bounds.extend(firstStep.end_location);
      }
    }
  }

  map.fitBounds(bounds, {
    top: 120,
    bottom: 200,
    left: 60,
    right: 60,
  });
}

// 🔥 음성 안내 (최소 세트)
function speakInstruction(text: string) {
  if (!("speechSynthesis" in window)) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ko-KR";
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  
  // 기존 음성 중단
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

// 🔥 음성 명령 의도 분류 (AI 정체성의 핵심)
type VoiceIntent = 
  | { type: "immediate_action"; action: "pause" | "cancel" | "resume" }
  | { type: "change_mode"; mode: "walking" | "driving" | "bicycling" }
  | { type: "emotion_state"; state: "tired" | "scared" | "crowded" | "bad_route" }
  | { type: "route_change"; reason: "alternative" | "quieter" | "faster" }
  | { type: "unknown" };

function classifyVoiceIntent(text: string): VoiceIntent {
  const lower = text.toLowerCase().trim();
  
  // A. 즉시 행동형 (0.5초 반응)
  if (lower.includes("멈춰") || lower.includes("잠깐") || lower.includes("일시정지")) {
    return { type: "immediate_action", action: "pause" };
  }
  if (lower.includes("취소") || lower.includes("그만") || lower.includes("종료")) {
    return { type: "immediate_action", action: "cancel" };
  }
  if (lower.includes("다시") && (lower.includes("안내") || lower.includes("경로"))) {
    return { type: "immediate_action", action: "resume" };
  }
  
  // B. 선택 변경형 (1초 코칭)
  if (lower.includes("걸어") || lower.includes("도보") || lower.includes("걷기")) {
    return { type: "change_mode", mode: "walking" };
  }
  if (lower.includes("차로") || lower.includes("자동차") || lower.includes("차량")) {
    return { type: "change_mode", mode: "driving" };
  }
  if (lower.includes("자전거") || lower.includes("자전거로")) {
    return { type: "change_mode", mode: "bicycling" };
  }
  
  // C. 감정·상태형 (AI 정체성)
  if (lower.includes("힘들") || lower.includes("지치") || lower.includes("피곤")) {
    return { type: "emotion_state", state: "tired" };
  }
  if (lower.includes("무서") || lower.includes("어두") || lower.includes("무섭")) {
    return { type: "emotion_state", state: "scared" };
  }
  if (lower.includes("사람") && (lower.includes("많") || lower.includes("복잡"))) {
    return { type: "emotion_state", state: "crowded" };
  }
  if (lower.includes("길") && (lower.includes("별로") || lower.includes("안 좋") || lower.includes("싫"))) {
    return { type: "emotion_state", state: "bad_route" };
  }
  
  // D. 경로 변경형
  if (lower.includes("다른") && (lower.includes("길") || lower.includes("경로"))) {
    return { type: "route_change", reason: "alternative" };
  }
  if (lower.includes("한적") || lower.includes("조용") || lower.includes("사람 적")) {
    return { type: "route_change", reason: "quieter" };
  }
  if (lower.includes("빠른") || lower.includes("빠르게") || lower.includes("돌아가도")) {
    return { type: "route_change", reason: "faster" };
  }
  
  return { type: "unknown" };
}

// 🔥 자동 줌 함수 (YAGO 표준 - 사용자 위치 포함)
function fitMapToResults(
  map: google.maps.Map,
  results: AIMapResponse["results"],
  userLocation?: { lat: number; lng: number }
) {
  if (!results.length) return;

  const google = window.google?.maps;
  if (!google) return;

  const bounds = new google.LatLngBounds();

  // 🔥 사용자 위치 포함 (있으면)
  if (userLocation) {
    bounds.extend(userLocation);
  }

  results.forEach((item) => {
    bounds.extend({ lat: item.lat, lng: item.lng });
  });

  // fitBounds 실행 (결과에 맞게 자동 계산)
  map.fitBounds(bounds, {
    top: 80,
    bottom: 140,
    left: 40,
    right: 40,
  });

  // ⭐ fitBounds 후 줌 잠금 해제 (idle 이벤트 사용 - bounds_changed보다 안정적)
  google.maps.event.addListenerOnce(map, "idle", () => {
    const z = map.getZoom();
    if (z && z > MAP_ZOOM_LIMIT.MAX) map.setZoom(MAP_ZOOM_LIMIT.MAX);
    if (z && z < MAP_ZOOM_LIMIT.MIN) map.setZoom(MAP_ZOOM_LIMIT.MIN);
    
    // ⭐ 줌 잠금 해제 (이거 안 하면 "확대 버튼은 눌리는데 안 커짐" 현상 그대로)
    map.setOptions({
      minZoom: 10,
      maxZoom: 19,
    });
  });
}

// 🔥 리모델링: 지도 컨테이너 (부모 기준으로 100% 차지, absolute 제거)
function MapContainer({ children }: { children: React.ReactNode }) {
  return (
    <div 
      className="map-container"
      style={{
        height: '100%', // 부모(map-page)의 높이를 100% 차지
        width: '100%',
        position: 'relative', // absolute 제거, relative로 변경
      }}
    >
      <div 
        className="overflow-hidden rounded-2xl border bg-white shadow-sm"
        style={{
          height: '100%',
          width: '100%',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// 🔥 지도 높이만큼 공간 확보 (스크롤 영역용)
function MapSpacer() {
  const HEADER = HEADER_HEIGHT;
  const BOTTOM_NAV = BOTTOM_NAV_HEIGHT;
  const mapHeight = 600; // 고정 높이
  
  return (
    <div
      style={{
        height: `${mapHeight}px`,
        width: '100%',
      }}
    />
  );
}

// 🔥 리모델링: 지도 영역 (부모 높이를 100% 차지, 고정 높이 제거)
function MapInner({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-full"
      style={{
        height: '100%', // 부모(MapContainer)의 높이를 100% 차지
        width: '100%',
        pointerEvents: "auto",
      }}
    >
      {children}
    </div>
  );
}

// 🔥 지도 캔버스 (부모 크기에 맞춰 100% 채움)
function GoogleMapCanvas({ 
  onMapReady 
}: { 
  onMapReady?: (map: google.maps.Map) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const isInitializingRef = useRef(false); // 🔥 초기화 중 플래그 (중복 실행 방지)

  useEffect(() => {
    // 🔥 강력한 가드: ref가 없거나 이미 지도가 생성되었으면 즉시 종료
    if (!ref.current || mapRef.current) {
      console.log("⚠️ [GoogleMapCanvas] 이미 지도가 생성되었거나 ref가 없습니다.");
      return;
    }

    // 🔥 중복 실행 방지
    if (isInitializingRef.current) {
      console.log("⚠️ [GoogleMapCanvas] 이미 초기화 중입니다.");
      return;
    }
    isInitializingRef.current = true;

    let cancelled = false;

    // 🔥 사용자 위치 획득 → 지도 생성 (실전 기준)
    loadGoogleMap()
      .then(async (google) => {
        if (cancelled || !ref.current) return;

        let center: { lat: number; lng: number };
        let zoom = 15; // 실전 기준 (15~16)

        try {
          // 🔥 사용자 현재 위치 획득
          const userLocation = await getUserLocation();
          if (cancelled) return;
          center = userLocation;
          console.log("✅ [GeneralMapPage] 사용자 위치 획득:", center);
        } catch (err) {
          if (cancelled) return;
          // ❗ 위치 획득 실패 시 fallback (의정부시 민락동 용민로 420)
          // 의정부시 민락동 용민로 420의 정확한 좌표 (Google Maps 기준)
          center = { lat: 37.742, lng: 127.049 };
          zoom = 15;
          console.warn("⚠️ [GeneralMapPage] 위치 획득 실패, fallback 사용 (의정부시 민락동 용민로 420):", err);
        }

        if (cancelled || !ref.current) return;

        // 🔥 지도 생성 (사용자 위치 중심, 실전 기준)
        // 🔓 줌 활성화 (UX 확인용)
        const map = new google.maps.Map(ref.current, {
          center: center,
          zoom: zoom,
          ...MAP_OPTIONS, // ⭐ 실전 정답 옵션 세트 적용
          clickableIcons: false, // 🔥 POI 클릭 비활성화 (AI가 주도권)
          keyboardShortcuts: true,
          zoomControl: true, // 🔥 줌 버튼 활성화
          disableDefaultUI: false, // UI 활성화
          gestureHandling: 'auto', // 🔓 줌 활성화: 핀치 줌/드래그 줌 허용
          scrollwheel: true, // 🔓 줌 활성화: 마우스 휠 줌 허용
          disableDoubleClickZoom: false, // 더블클릭 줌 허용
          // 🔥 스타일: 지도 밀도 극단적으로 낮춤 (배경 캔버스화 - AI가 해석할 여백 확보)
          styles: [
            // 🔥 POI 완전 제거
            {
              featureType: "poi",
              elementType: "all",
              stylers: [{ visibility: "off" }],
            },
            // 🔥 교통 완전 제거 (노선 색상까지)
            {
              featureType: "transit",
              elementType: "all",
              stylers: [{ visibility: "off" }],
            },
            // 🔥 도로 라벨 완전 제거
            {
              featureType: "road",
              elementType: "labels.text",
              stylers: [{ visibility: "off" }],
            },
            {
              featureType: "road",
              elementType: "labels.icon",
              stylers: [{ visibility: "off" }],
            },
            // 🔥 지도 색상 톤 대폭 다운 (배경처럼, 대비 약화)
            {
              featureType: "road",
              elementType: "geometry",
              stylers: [{ saturation: -70 }, { lightness: 30 }],
            },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ saturation: -50 }, { lightness: 40 }],
            },
            {
              featureType: "landscape",
              elementType: "geometry",
              stylers: [{ saturation: -30 }, { lightness: 10 }],
            },
          ],
        });

        if (cancelled) return;

        mapRef.current = map;

        // 🔥 사용자 위치 마커 추가 (실전 기준 - 내 위치 표시)
        // 의정부시 민락동 용민로 420도 마커 표시
        // 🔥 구글 객체가 없으면 마커를 그리지 않고 조용히 리턴! (에러 방지)
        if (google && google.maps && google.maps.Marker) {
        const isFallback = center.lat === 37.742 && center.lng === 127.049;
        if (!isFallback || true) {
          // 모든 경우에 마커 표시 (의정부시 민락동 포함)
            try {
          new google.maps.Marker({
            position: center,
            map: map,
            title: isFallback ? "의정부시 민락동 용민로 420" : "내 위치",
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#2563eb", // 파란색
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#ffffff",
            },
          });
            } catch (markerError: any) {
              console.warn('⚠️ [마커] 초기 위치 마커 생성 실패:', markerError?.message || '알 수 없는 오류');
            }
          }
        } else {
          console.warn("⚠️ 구글 라이브러리가 아직 로드되지 않아 초기 위치 마커 생성을 보류합니다.");
        }

        console.log("✅ [GeneralMapPage v2] 지도 생성 완료 (사용자 위치 중심)");

        // 🔥 지도 준비 완료 콜백
        if (!cancelled) {
          onMapReady?.(map);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("❌ [GeneralMapPage v2] 지도 로드 실패:", err);
        }
      });

    // 🔥 cleanup: 컴포넌트 언마운트 시 취소 플래그 설정
    return () => {
      cancelled = true;
      isInitializingRef.current = false; // 🔥 초기화 플래그 리셋
    };
  }, []); // 🔥 onMapReady를 dependency에서 제거 (무한 루프 방지)

  // 🔥 absolute inset-0으로 부모를 100% 채움 (부모가 relative + height 있어야 함)
  return (
    <div 
      ref={ref} 
      className="absolute inset-0 h-full w-full"
      style={{ 
        pointerEvents: "auto", // ⭐ 필수 (마우스/트랙패드 줌 이벤트 정상 작동)
        touchAction: "pan-x pan-y", // 🔥 모바일: 지도 드래그는 두 손가락, 스크롤은 한 손가락
        overscrollBehavior: "contain", // 🔥 스크롤 전파 방지
      }}
    />
  );
}

// 🔥 리모델링: AIWhisper, AIOverlayIdle 완전 제거 (StatusPill로 통합 완료)

// 🔥 AI Overlay - Result 상태 (지도 안 가리게, 말만 함)
function AIOverlayResult({ title, count }: { title: string; count: number }) {
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 w-[90%] max-w-md -translate-x-1/2 z-20 rounded-2xl bg-white p-4 shadow-xl border border-neutral-200">
      <p className="text-sm font-semibold text-neutral-900">{title}</p>
      <p className="mt-1 text-xs text-neutral-600">
        {count}개의 결과
      </p>
    </div>
  );
}

// 🔥 AI Overlay - FollowUp 상태 (마커 클릭 후, AI가 다시 말을 건다)
function AIOverlayFollowUp({ 
  placeName, 
  onVoiceQuestion,
  onClose 
}: { 
  placeName: string;
  onVoiceQuestion: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-6 left-1/2 w-[90%] max-w-md -translate-x-1/2 z-20 rounded-2xl bg-white p-4 shadow-xl border border-neutral-200">
      <p className="text-sm font-semibold text-neutral-900">{placeName}</p>
      <p className="mt-1 text-xs text-neutral-600">
        이 장소에 대해 더 물어볼까요?
      </p>

      <div className="mt-3 flex gap-2">
        <button
          onClick={onVoiceQuestion}
          className="flex-1 rounded-full bg-black py-2 text-sm text-white active:scale-95 transition-transform font-medium"
        >
          🎤 말로 물어보기
        </button>
        <button
          onClick={onClose}
          className="flex-1 rounded-full bg-neutral-100 py-2 text-sm text-neutral-700 active:scale-95 transition-transform font-medium"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

// 🔥 AI Overlay - Compare 상태 (A vs B 비교 제안)
function AIOverlayCompare({ 
  a, 
  b,
  onClose 
}: { 
  a: { name: string; point: string };
  b: { name: string; point: string };
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-6 left-1/2 w-[92%] max-w-md -translate-x-1/2 z-20 rounded-2xl bg-white p-4 shadow-xl border border-neutral-200">
      <p className="mb-2 text-sm font-semibold text-neutral-900">
        두 곳을 비교해봤어요
      </p>

      <div className="space-y-2 text-sm text-neutral-700">
        <div>
          <strong className="text-neutral-900">{a.name}</strong> — {a.point}
        </div>
        <div>
          <strong className="text-neutral-900">{b.name}</strong> — {b.point}
        </div>
      </div>

      <p className="mt-3 text-xs text-neutral-500">
        더 궁금한 쪽을 말로 물어보세요
      </p>

      <button
        onClick={onClose}
        className="mt-3 w-full rounded-full bg-neutral-100 py-2 text-sm text-neutral-700 active:scale-95 transition-transform font-medium"
      >
        닫기
      </button>
    </div>
  );
}

// 🔥 AI Overlay - Reason 상태 (왜 이걸 추천했는지 설명)
function AIOverlayReason({ 
  placeName, 
  reasons,
  onClose 
}: { 
  placeName: string;
  reasons: string[];
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-24 left-1/2 w-[92%] max-w-md -translate-x-1/2 z-20 rounded-2xl bg-white p-4 shadow-xl border border-neutral-200">
      <p className="mb-2 text-sm font-semibold text-neutral-900">
        {placeName}를 추천한 이유예요
      </p>
      <ul className="space-y-1 text-xs text-neutral-600">
        {reasons.map((r, i) => (
          <li key={i}>• {r}</li>
        ))}
      </ul>
      <button
        onClick={onClose}
        className="mt-3 w-full rounded-full bg-neutral-100 py-2 text-sm text-neutral-700 active:scale-95 transition-transform font-medium"
      >
        닫기
      </button>
    </div>
  );
}

// 🔥 Phase 34: Long Press 버튼 (실수 방지)
function LongPressButton({
  onLongPress,
  delay = 600,
  children,
  className = "",
  ariaLabel,
}: {
  onLongPress: () => void;
  delay?: number;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isPressing, setIsPressing] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsPressing(true);
    
    // 햅틱 피드백 (모바일)
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    timerRef.current = setTimeout(() => {
      onLongPress();
      setIsPressing(false);
      
      // 햅틱 피드백 (완료)
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, delay);
  };

  const handlePointerUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);
  };

  const handlePointerCancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);
  };

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      aria-label={ariaLabel}
      className={`${className} ${isPressing ? 'opacity-70' : ''} transition-opacity`}
      style={{ touchAction: 'manipulation' }}
    >
      {children}
    </button>
  );
}

// 🔥 Phase 37: 네트워크 실패 UX (상황 설명 + 선택지)
function AIOverlayPhase37({
  placeName,
  onRetry,
  onClose,
}: {
  placeName: string;
  onRetry?: () => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* 상단 고정 배너 - 네트워크 불안정 안내 (헤더 아래 배치) */}
      {/* 🔥 z-index: 20 (Header z-1000 아래, 교통수단 바와 동일 레벨) */}
      <div 
        role="alert" 
        aria-live="assertive"
        className="fixed left-0 right-0 z-20 bg-orange-500/90 backdrop-blur-md text-white shadow-xl border-b border-white/10"
        style={{
          top: `calc(${HEADER_HEIGHT}px + env(safe-area-inset-top, 0px))`,
          paddingTop: '12px',
          paddingBottom: '12px',
          paddingLeft: '12px',
          paddingRight: '12px',
          minHeight: '56px',
        }}
      >
        <div className="flex items-center justify-between gap-2 max-w-full">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg flex-shrink-0" aria-hidden="true">📡</span>
            <span className="text-sm font-medium truncate">네트워크가 불안정해요</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onRetry && (
              <button
                onClick={onRetry}
                aria-label="다시 시도"
                className="rounded-full bg-white/20 px-4 py-2 text-xs font-medium hover:bg-white/30 active:scale-95 transition-all"
                style={{ minHeight: '44px', minWidth: '44px', touchAction: 'manipulation' }}
              >
                다시 시도
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="나중에"
              className="rounded-full bg-white/20 px-4 py-2 text-xs font-medium hover:bg-white/30 active:scale-95 transition-all"
              style={{ minHeight: '44px', minWidth: '44px', touchAction: 'manipulation' }}
            >
              나중에
            </button>
          </div>
        </div>
      </div>

      {/* 하단 안내 카드 */}
      <div className="absolute bottom-24 left-1/2 w-[92%] max-w-md -translate-x-1/2 z-20 rounded-2xl bg-white p-4 shadow-xl border border-neutral-200">
        <p className="mb-2 text-sm font-semibold text-neutral-900">
          {placeName}
        </p>
        <p className="mb-3 text-xs text-neutral-600">
          연결이 안정되면 다시 시도해주세요
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full rounded-full bg-orange-500 py-2.5 text-sm text-white font-medium active:scale-95 transition-transform shadow-lg"
          >
            🔄 다시 시도
          </button>
        )}
        <button
          onClick={onClose}
          className="mt-2 w-full rounded-full bg-neutral-100 py-2 text-sm text-neutral-700 active:scale-95 transition-transform font-medium"
        >
          나중에
        </button>
      </div>
    </>
  );
}

// 🔥 Phase 33: 길찾기 후 복귀 UX (Phase 34 UX 튜닝 적용)
function AIOverlayPhase33({
  placeName,
  onReopenRoute,
  onShowOther,
  onSavePlace,
  onShareRoute,
  onClose,
}: {
  placeName: string;
  onReopenRoute?: () => void;
  onShowOther?: () => void;
  onSavePlace?: () => void;
  onShareRoute?: () => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* 상단 고정 배너 - 안내 중 상태 (Phase 34: 모바일 터치 영역 보정, 헤더 아래 배치) */}
      {/* 🔥 z-index: 20 (Header z-1000 아래, 교통수단 바와 동일 레벨) */}
      <div 
        role="status" 
        aria-live="polite"
        className="fixed left-0 right-0 z-20 bg-black/90 backdrop-blur-md text-white shadow-xl border-b border-white/10"
        style={{
          top: `calc(${HEADER_HEIGHT}px + env(safe-area-inset-top, 0px))`,
          paddingTop: '12px',
          paddingBottom: '12px',
          paddingLeft: '12px',
          paddingRight: '12px',
          minHeight: '56px',
        }}
      >
        <div className="flex items-center justify-between gap-2 max-w-full">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg flex-shrink-0" aria-hidden="true">🧭</span>
            <span className="text-sm font-medium truncate">{placeName}까지 안내 중</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onReopenRoute && (
              <button
                onClick={onReopenRoute}
                aria-label="길찾기 다시 열기"
                className="rounded-full bg-white/20 px-4 py-2 text-xs font-medium hover:bg-white/30 active:scale-95 transition-all"
                style={{ minHeight: '44px', minWidth: '44px', touchAction: 'manipulation' }}
              >
                다시 길찾기
              </button>
            )}
            <LongPressButton
              onLongPress={onClose}
              delay={600}
              ariaLabel="안내 취소 (길게 누르기)"
              className="rounded-full bg-white/20 px-4 py-2 text-xs font-medium hover:bg-white/30 active:scale-95 transition-all"
            >
              <span style={{ minHeight: '44px', minWidth: '44px', display: 'inline-flex', alignItems: 'center' }}>
                취소
              </span>
            </LongPressButton>
          </div>
        </div>
      </div>

      {/* 🔥 Phase 36: 음성 힌트 (시각적 최소, 눈에 띄되 방해하지 않기) */}
      {/* 🔥 헤더 + 배너 아래 배치 (겹침 방지) */}
      <div 
        className="fixed left-1/2 -translate-x-1/2 z-25 rounded-full bg-black/60 backdrop-blur-sm px-4 py-2 text-white text-xs shadow-lg"
        style={{
          top: `calc(${HEADER_HEIGHT}px + ${PHASE_BANNER_HEIGHT}px + env(safe-area-inset-top, 0px) + 20px)`,
        }}
      >
        <span className="flex items-center gap-2">
          <span>🎤</span>
          <span>말로 "계속 안내"라고 해보세요</span>
        </span>
      </div>

      {/* 하단 고정 카드 */}
      <div className="absolute bottom-24 left-1/2 w-[92%] max-w-md -translate-x-1/2 z-20 rounded-2xl bg-white p-4 shadow-xl border border-neutral-200">
        <p className="mb-3 text-sm font-semibold text-neutral-900">
          {placeName}
        </p>
        <div className="flex flex-col gap-2">
          {onShowOther && (
            <button
              onClick={onShowOther}
              className="w-full rounded-full bg-neutral-100 py-2.5 text-sm text-neutral-700 font-medium active:scale-95 transition-transform"
            >
              🔁 다른 장소 보기
            </button>
          )}
          {onSavePlace && (
            <button
              onClick={onSavePlace}
              className="w-full rounded-full bg-neutral-100 py-2.5 text-sm text-neutral-700 font-medium active:scale-95 transition-transform"
            >
              ⭐ 이 장소 저장
            </button>
          )}
          {onShareRoute && (
            <button
              onClick={onShareRoute}
              className="w-full rounded-full bg-neutral-100 py-2.5 text-sm text-neutral-700 font-medium active:scale-95 transition-transform"
            >
              📤 경로 공유
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-3 w-full rounded-full bg-neutral-100 py-2 text-sm text-neutral-700 active:scale-95 transition-transform font-medium"
        >
          닫기
        </button>
      </div>
    </>
  );
}

// 🔥 Phase 32/33: 교통수단 선택 UI
function AIOverlayTransportSelect({
  placeName,
  onSelect,
  onClose,
}: {
  placeName: string;
  onSelect: (mode: TravelModeType) => void;
  onClose: () => void;
}) {
  const google = window.google?.maps;
  if (!google) return null;

  const modes: { type: TravelModeType; label: string; icon: string }[] = [
    { type: "WALKING", label: "도보", icon: "🚶" },
    { type: "DRIVING", label: "자동차", icon: "🚗" },
    { type: "BICYCLING", label: "대중교통", icon: "🚌" },
  ];

  // 🔥 Phase 38: 첫 사용 시에만 안내 표시 (심사용 명시)
  const [showFirstTimeHint, setShowFirstTimeHint] = useState(() => {
    const hasSeenHint = localStorage.getItem('yago_navigation_hint_seen');
    return !hasSeenHint;
  });

  const handleSelectWithHint = (mode: TravelModeType) => {
    // 첫 사용 시 안내 표시 후 localStorage에 저장
    if (showFirstTimeHint) {
      localStorage.setItem('yago_navigation_hint_seen', 'true');
      setShowFirstTimeHint(false);
    }
    onSelect(mode);
  };

  return (
    <div className="absolute bottom-24 left-1/2 w-[92%] max-w-md -translate-x-1/2 z-20 rounded-2xl bg-white p-4 shadow-xl border border-neutral-200">
      <p className="mb-2 text-sm font-semibold text-neutral-900">
        {placeName}
      </p>
      <p className="mb-3 text-xs text-neutral-600">
        교통수단을 선택해주세요
      </p>
      
      {/* 🔥 Phase 38: 외부 지도 위임 명시 (첫 사용 시에만, 인라인 설명) */}
      {showFirstTimeHint && (
        <div className="mb-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-xs text-blue-900 font-medium mb-1">
            ℹ️ 길안내는 Google Maps로 연결돼요
          </p>
          <p className="text-xs text-blue-700">
            더 정확하고 익숙한 안내를 위해서예요.
          </p>
          {/* 🔥 Google Maps 웹 제한 안내 (선택적, 모바일에서는 불필요) */}
          {typeof window !== 'undefined' && !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && (
            <p className="text-xs text-blue-600 mt-1 italic">
              💡 모바일에서 열면 더 정확한 안내를 받을 수 있어요
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {modes.map((mode) => (
          <button
            key={mode.type}
            onClick={() => handleSelectWithHint(mode.type)}
            className="flex-1 rounded-full bg-black py-2.5 text-sm text-white font-medium active:scale-95 transition-transform shadow-lg"
          >
            {mode.icon} {mode.label}
          </button>
        ))}
      </div>
      
      {/* 🔥 Phase 38/39: 위치/음성 사용 설명 (작은 텍스트, 항상 표시) */}
      {/* 🔥 Phase 39: 첫 20초 - 차별점은 행동 후에 알려준다 */}
      <div className="mt-3 pt-3 border-t border-neutral-100">
        <p className="text-[10px] text-neutral-500 leading-relaxed">
          길안내는 가장 정확한 Google Maps로 연결돼요. 현재 위치 정보는 저장하거나 전송하지 않아요. 음성 안내는 사용자가 원할 때만 활성화돼요.
        </p>
      </div>

      <button
        onClick={onClose}
        className="mt-3 w-full rounded-full bg-neutral-100 py-2 text-sm text-neutral-700 active:scale-95 transition-transform font-medium"
      >
        닫기
      </button>
    </div>
  );
}

// 🔥 AI Overlay - Proactive 상태 (AI가 먼저 말 거는 경우)
function AIOverlayProactive({ text, actionHint }: AIProactiveMessage) {
  return (
    <div className="pointer-events-none absolute bottom-24 left-1/2 w-[90%] max-w-md -translate-x-1/2 z-20 rounded-xl bg-black/80 backdrop-blur-sm p-3 text-white shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
      <p className="text-sm">{text}</p>
      {actionHint && (
        <p className="mt-1 text-xs text-neutral-300">
          {actionHint}
        </p>
      )}
    </div>
  );
}

// 🔥 AI Overlay - Intent 상태 (목적 기반 요약)
function AIOverlayIntent({ intentLabel }: { intentLabel: string }) {
  return (
    <div className="pointer-events-none absolute top-6 left-1/2 w-[90%] max-w-md -translate-x-1/2 z-20 rounded-xl bg-black/80 backdrop-blur-sm p-3 text-white shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
      <p className="text-sm">
        {intentLabel} 기준으로 찾아봤어요
      </p>
    </div>
  );
}

// 🔥 AI Overlay - Summary 상태 (클러스터 요약, 지도 안 가리고 존재감만)
function AIOverlaySummary({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="pointer-events-none absolute top-6 left-1/2 w-[90%] max-w-md -translate-x-1/2 z-20 rounded-xl bg-black/80 backdrop-blur-sm p-3 text-white shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
      <p className="text-sm">{text}</p>
      {hint && (
        <p className="mt-1 text-xs text-neutral-300">
          {hint}
        </p>
      )}
    </div>
  );
}

// 🔥 AI Overlay - Silent 상태 (말 없어도 흐름 유지하는 지도)
function AIOverlaySilent({ text }: { text: string }) {
  return (
    <div className="pointer-events-none absolute top-6 right-4 max-w-[70%] z-20 rounded-lg bg-white/90 backdrop-blur-sm p-3 text-sm text-neutral-700 shadow-lg animate-in fade-in slide-in-from-right-4 duration-300">
      <p>{text}</p>
    </div>
  );
}

// 🔥 고정 UI 높이 기준값 (레이아웃 정렬용, 여기서만 관리)
// HEADER_HEIGHT는 Header.tsx에서 import (실제: 56px)
const BOTTOM_NAV_HEIGHT = 64; // 하단 탭바 (실제: 64px + safe-area-inset-bottom)
const PHASE_BANNER_HEIGHT = 56; // Phase 33/37 상단 배너 높이 (minHeight: 56px)
const NAVIGATION_STATUS_BAR_HEIGHT = 48; // NavigationStatusBar 높이 (대략)
const TRAVEL_MODE_SELECTOR_HEIGHT = 48; // TravelModeSelector 높이 (대략)

// 🔥 상단 고정 UI 총 높이 (지도 offset 계산용)
const TOP_UI_HEIGHT = HEADER_HEIGHT + PHASE_BANNER_HEIGHT; // Phase 33/37 배너 있을 때
const TOP_UI_HEIGHT_NAV = HEADER_HEIGHT + NAVIGATION_STATUS_BAR_HEIGHT + TRAVEL_MODE_SELECTOR_HEIGHT; // 네비게이션 모드일 때

// 🔥 사용자 현재 위치 획득 함수는 src/lib/getUserLocation.ts에서 import

// 🔥 결과 카드 컴포넌트 (지도 아래, 스크롤 흐름)
function ResultCard({
  item,
  onFocus,
  onNavigate,
}: {
  item: { id: string; name: string; distance?: number; lat?: number; lng?: number };
  onFocus: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="w-full rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <button
        onClick={onFocus}
        className="w-full text-left"
      >
        <h3 className="font-medium text-neutral-900">{item.name}</h3>
        {item.distance !== undefined && (
          <p className="mt-1 text-sm text-neutral-500">
            {Math.round(item.distance)}m 거리
          </p>
        )}
      </button>
      {onNavigate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate();
          }}
          className="mt-3 w-full rounded-full bg-black py-2.5 text-sm text-white font-medium active:scale-95 transition-transform"
        >
          🧭 길 안내
        </button>
      )}
    </div>
  );
}

// 🔥 결과 리스트 컴포넌트 (지도 아래 배치)
function ResultList({
  results,
  onSelect,
  onNavigate,
}: {
  results: (AIMapResponse["results"][0] & { distance?: number })[];
  onSelect: (item: AIMapResponse["results"][0]) => void;
  onNavigate?: (item: AIMapResponse["results"][0]) => void;
}) {
  if (!results.length) return null;

  return (
    <section className="mt-6 space-y-3">
      {results.map((r) => (
        <ResultCard
          key={r.id}
          item={r}
          onFocus={() => onSelect(r)}
          onNavigate={onNavigate ? () => onNavigate(r) : undefined}
        />
      ))}
    </section>
  );
}

// 🔥 네비게이션 모드 UI (상단 상태 바)
function NavigationStatusBar({ 
  info, 
  isPaused 
}: { 
  info: NavigationInfo;
  isPaused?: boolean;
}) {
  const google = window.google?.maps;
  const modeLabel = google && info.travelMode === google.TravelMode.WALKING ? "🚶 도보" 
    : google && info.travelMode === google.TravelMode.DRIVING ? "🚗 차로"
    : "🚴 자전거";

  return (
    <div 
      className={`fixed left-1/2 -translate-x-1/2 z-20 rounded-full backdrop-blur-md px-6 py-3 text-white shadow-xl border border-white/10 ${
        isPaused ? "bg-yellow-600/90" : "bg-black/90"
      }`}
      style={{
        top: `calc(${HEADER_HEIGHT}px + env(safe-area-inset-top, 0px) + 4px)`,
      }}
    >
      <div className="flex items-center gap-3 text-sm font-medium">
        {isPaused && <span>⏸️</span>}
        <span>{modeLabel}</span>
        {!isPaused && info.duration && <span>· {info.duration}</span>}
        {!isPaused && info.distance && <span>· {info.distance}</span>}
        {isPaused && <span>일시정지</span>}
      </div>
    </div>
  );
}

// 🔥 이동 수단 타입
type TravelModeType = "WALKING" | "DRIVING" | "BICYCLING";

// 🔥 이동 수단 전환 UI (3개 토글)
function TravelModeSelector({
  currentMode,
  onSelect,
}: {
  currentMode: google.maps.TravelMode;
  onSelect: (mode: TravelModeType) => void;
}) {
  const google = window.google?.maps;
  if (!google) return null;

  const modes: { type: TravelModeType; label: string; icon: string; mapMode: google.maps.TravelMode }[] = [
    { type: "WALKING", label: "도보", icon: "🚶", mapMode: google.TravelMode.WALKING },
    { type: "DRIVING", label: "차량", icon: "🚗", mapMode: google.TravelMode.DRIVING },
    { type: "BICYCLING", label: "자전거", icon: "🚴", mapMode: google.TravelMode.BICYCLING },
  ];

  return (
    <div 
      className="fixed left-1/2 -translate-x-1/2 z-20 flex gap-2"
      style={{
        top: `calc(${HEADER_HEIGHT}px + env(safe-area-inset-top, 0px) + 60px)`,
      }}
    >
      {modes.map((mode) => {
        const isActive = currentMode === mode.mapMode;
        return (
          <button
            key={mode.type}
            onClick={() => onSelect(mode.type)}
            className={`rounded-full px-4 py-2 text-sm font-medium shadow-lg active:scale-95 transition-transform ${
              isActive
                ? "bg-black text-white"
                : "bg-white/90 text-neutral-700 backdrop-blur-sm"
            }`}
          >
            {mode.icon} {mode.label}
          </button>
        );
      })}
    </div>
  );
}

// 🔥 행동 아이콘 매핑
const ACTION_ICONS: Record<ActionType, string> = {
  straight: "⬆️",
  left: "⬅️",
  right: "➡️",
  uturn: "↩️",
  merge: "🔀",
  roundabout: "🌀",
};

// 🔥 다음 스텝 안내 카드 (상단 고정, 지도 안 가림) - 기존 ActionCue는 하단에 사용
function NextStepBar({ step }: { step: { instruction: string; distance: string; actionType: ActionType } | null }) {
  if (!step) return null;

  const icon = ACTION_ICONS[step.actionType] || "⬆️";
  const shortInstruction = step.instruction.length > 20 
    ? step.instruction.substring(0, 20) + "..."
    : step.instruction;

  return (
    <div className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 z-30">
      <div className="rounded-xl bg-black/90 backdrop-blur-md px-5 py-3 text-white shadow-xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{icon}</div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{shortInstruction}</span>
            <span className="text-xs text-neutral-300">{step.distance}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 🔥 "내 위치 따라가기" 버튼 (free 모드일 때만 표시)
function FollowMeButton({ onRecenter }: { onRecenter: () => void }) {
  return (
    <button
      onClick={onRecenter}
      className="absolute top-32 right-4 z-30 rounded-full bg-blue-600 px-4 py-2.5 text-sm text-white font-medium shadow-xl active:scale-95 transition-transform flex items-center gap-2"
    >
      <span>📍</span>
      <span>내 위치 따라가기</span>
    </button>
  );
}

// 🔥 네비게이션 모드 UI (하단 CTA)
function NavigationControls({
  onExit,
  onNewSearch,
}: {
  onExit: () => void;
  onNewSearch: () => void;
}) {
  return (
    <div className="absolute bottom-6 left-1/2 w-[90%] max-w-md -translate-x-1/2 z-20 flex gap-3">
      <button
        onClick={onExit}
        className="flex-1 rounded-full bg-white py-3 text-sm text-neutral-900 font-medium shadow-xl border border-neutral-200 active:scale-95 transition-transform"
      >
        안내 종료
      </button>
      <button
        onClick={onNewSearch}
        className="flex-1 rounded-full bg-black py-3 text-sm text-white font-medium shadow-xl active:scale-95 transition-transform"
      >
        다른 장소 찾기
      </button>
    </div>
  );
}

// 🔥 메인 페이지 컴포넌트
export default function GeneralMapPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // 🔥 리모델링: UI 상태 머신 (UI 독재자)
  const { ui, setUI } = useMapUI();
  const mapInstanceRef = useRef<google.maps.Map | null>(null); // 🔥 Active Map (첫 번째 지도만)
  const [isMapReady, setIsMapReady] = useState(false); // 🔥 지도 준비 상태
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const directionsResultRef = useRef<google.maps.DirectionsResult | null>(null); // 🔥 현재 경로 결과 저장
  const phase33SpokenRef = useRef(false); // 🔥 Phase 34: 음성 재시작 플래그 (1회만)
  
  // 🔥 좌표 → 주소 변환 캐시 (최소 비용 설계)
  const addressCacheRef = useRef<Map<string, string>>(new Map());
  
  // 🔥 좌표 → 주소 변환 (캐싱 포함, 비동기, 최소 비용 설계)
  const getCachedAddress = async (
    lat: number, 
    lng: number,
    placeData?: { adminDong?: string; name?: string; address?: string }
  ): Promise<string | null> => {
    // 🔥 1순위: 장소 데이터에 이미 있는 행정동/주소 (비용 0원)
    if (placeData?.adminDong) {
      return placeData.adminDong;
    }
    if (placeData?.address) {
      return placeData.address;
    }
    if (placeData?.name) {
      // 장소명도 사용 가능 (예: "홍대입구역", "연희동 주민센터")
      return placeData.name;
    }
    
    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    
    // 🔥 2순위: 메모리 캐시 확인
    if (addressCacheRef.current.has(cacheKey)) {
      return addressCacheRef.current.get(cacheKey) || null;
    }
    
    // 🔥 3순위: Reverse Geocoding (필요할 때만 1회)
    try {
      const address = await getAddressFromLatLng(lat, lng);
      if (address) {
        addressCacheRef.current.set(cacheKey, address);
        // 세션 종료 시까지 유지 (메모리 캐시)
        return address;
      }
    } catch (error) {
      console.warn("[좌표→주소] 변환 실패:", error);
    }
    
    // 🔥 4순위: 최종 fallback (좌표 사용)
    return null;
  };
  
  // 🔥 Google Maps URL 생성 (주소 우선, 좌표 fallback, 전문가 설계)
  const buildGoogleMapsUrl = async (
    origin: { lat: number; lng: number } | null,
    destination: { lat: number; lng: number; adminDong?: string; name?: string; address?: string },
    travelMode: string
  ): Promise<string> => {
    // 🔥 목적지 주소 변환 시도 (행정동 캐싱 우선, 필요할 때만 reverse geocoding)
    const destAddress = await getCachedAddress(
      destination.lat, 
      destination.lng,
      { adminDong: destination.adminDong, name: destination.name, address: destination.address }
    );
    
    // 🔥 출발지 주소 변환 시도 (선택적, origin이 있으면)
    let originAddress: string | null = null;
    if (origin) {
      originAddress = await getCachedAddress(origin.lat, origin.lng);
    }
    
    // 🔥 URL 생성: 주소 우선, 없으면 좌표 사용
    let url = 'https://www.google.com/maps/dir/?api=1';
    
    // 출발지 (origin 생략 = "현재 위치" - Google이 가장 좋아하는 방식)
    // origin이 있으면 주소 우선, 없으면 생략
    if (origin) {
      if (originAddress) {
        url += `&origin=${encodeURIComponent(originAddress)}`;
      } else {
        url += `&origin=${origin.lat},${origin.lng}`;
      }
    }
    // origin 생략 = "현재 위치" (Google이 가장 좋아하는 방식)
    
    // 목적지 (행정동/주소/장소명 우선, 없으면 좌표)
    if (destAddress) {
      url += `&destination=${encodeURIComponent(destAddress)}`;
    } else {
      url += `&destination=${destination.lat},${destination.lng}`;
    }
    
    url += `&travelmode=${travelMode}`;
    
    return url;
  };
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null); // 🔥 사용자 현재 위치
  const [geoUXState, setGeoUXState] = useState<GeoUXState>('idle'); // 🔥 Geolocation UX 상태
  const [aiResponse, setAiResponse] = useState<AIMapResponse | null>(null);
  const lastSearchQueryRef = useRef<string | null>(null); // 🔥 마지막 검색어 저장 (재검색용)
  const userPreferencesRef = useRef<Record<string, number>>({}); // 🔥 개인화: 사용자 선호 카테고리 (로컬 스토리지)
  const [overlayState, setOverlayState] = useState<AIOverlayState>({ type: "idle" });
  // 🔥 리모델링: whisperState 제거 (StatusPill의 ui 상태로 통합 완료)
  const [proactiveMessage, setProactiveMessage] = useState<AIProactiveMessage | null>(null);
  const [summaryMessage, setSummaryMessage] = useState<{ text: string; hint?: string } | null>(null);
  const [silentMessage, setSilentMessage] = useState<string | null>(null);
  const silentShownRef = useRef(false); // 🔥 한 세션에 1~2번만 표시
  const [userPreferences, setUserPreferences] = useState<string[]>([]); // 🔥 사용자 취향
  const [intentLabel, setIntentLabel] = useState<string | null>(null); // 🔥 목적 기반 라벨
  const [mapMode, setMapMode] = useState<MapMode>("idle"); // 🔥 지도 모드 상태 머신
  const [navigationInfo, setNavigationInfo] = useState<NavigationInfo | null>(null); // 🔥 네비게이션 정보
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow"); // 🔥 카메라 모드 (안내 중 자동 추적)
  const [isNavigationPaused, setIsNavigationPaused] = useState(false); // 🔥 네비게이션 일시정지 상태
  
  // 🔥 Phase 24: 방향 힌트 상태
  const [showDirectionHint, setShowDirectionHint] = useState(false); // 🔥 방향 힌트 표시 여부
  const [phase24Message, setPhase24Message] = useState<string | null>(null); // 🔥 Phase 24 하단 메시지
  const directionHintPolylineRef = useRef<google.maps.Polyline | null>(null); // 🔥 방향 힌트 Polyline
  
  // 🔥 Phase 26: 전체 경로 안내 상태
  const [fullNavigationStarted, setFullNavigationStarted] = useState(false); // 🔥 Phase 26 전체 경로 안내 시작 여부
  const [phase26Message, setPhase26Message] = useState<string | null>(null); // 🔥 Phase 26 최초 안내 메시지
  const phase26MessageShownRef = useRef(false); // 🔥 Phase 26 메시지 1회만 표시
  const routePolylineRef = useRef<google.maps.Polyline | null>(null); // 🔥 전체 경로 Polyline
  
  // 🔥 다음 스텝 정보 (거리 + 안내 + 행동 타입) - 선언을 앞으로 이동 (TDZ 에러 방지)
  const [nextStep, setNextStep] = useState<{ instruction: string; distance: string; actionType: ActionType } | null>(null);
  
  // 🔥 Movement Session 관리
  const currentSessionRef = useRef<string | null>(null); // 현재 세션 ID
  const midNavigationCoachingShownRef = useRef(false); // 🔥 이동 중 1회 개입 플래그
  const routeDeviationShownRef = useRef(false); // 🔥 Phase 26: 경로 이탈 안내 표시 여부
  const lastDeviationTimeRef = useRef(0); // 🔥 Phase 26: 마지막 경로 이탈 안내 시간
  
  // 🔥 Phase 28: 첫 사용자 온보딩 상태
  const [showOnboarding, setShowOnboarding] = useState(false); // 🔥 온보딩 표시 여부
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1); // 🔥 온보딩 단계 (1 또는 2)
  const [onboardingExample, setOnboardingExample] = useState<string>(""); // 🔥 온보딩 예시 (한 번만 선택)
  const hasSpokenYetRef = useRef(false); // 🔥 사용자가 말했는지 여부
  const onboardingTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 🔥 온보딩 자동 종료 타이머
  
  // 🔥 개인화: 로컬 스토리지에서 선호 카테고리 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem('userPreferences');
      if (saved) {
        userPreferencesRef.current = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('선호 카테고리 로드 실패:', e);
    }
  }, []);

  // 🔥 Phase 28: 첫 방문 체크 및 온보딩 트리거
  useEffect(() => {
    // 첫 방문 여부 확인 (localStorage)
    const hasVisitedBefore = localStorage.getItem('yago_has_visited');
    
    if (!hasVisitedBefore && isMapReady && mapMode === "idle") {
      // 첫 방문이고, 지도가 준비되었고, 아직 말한 적 없으면 온보딩 시작
      // 예시 한 번만 선택
      const examples = [
        "예: 근처 축구장",
        "예: 조용한 카페",
        "예: 여기서 제일 가까운 곳",
      ];
      setOnboardingExample(examples[Math.floor(Math.random() * examples.length)]);
      
      setShowOnboarding(true);
      setOnboardingStep(1);
      
      // Step 1: 3초 후 Step 2로 전환
      const step1Timer = setTimeout(() => {
        setOnboardingStep(2);
      }, 3000);
      
      // 전체 온보딩: 5초 후 자동 종료
      onboardingTimeoutRef.current = setTimeout(() => {
        endOnboarding();
      }, 5000);
      
      return () => {
        clearTimeout(step1Timer);
        if (onboardingTimeoutRef.current) {
          clearTimeout(onboardingTimeoutRef.current);
        }
      };
    }
  }, [isMapReady, mapMode]);

  // 🔥 Phase 28: 온보딩 종료 함수
  const endOnboarding = () => {
    setShowOnboarding(false);
    setOnboardingStep(1);
    hasSpokenYetRef.current = true;
    
    // 첫 방문 플래그 저장
    localStorage.setItem('yago_has_visited', 'true');
    
    // 타이머 클리어
    if (onboardingTimeoutRef.current) {
      clearTimeout(onboardingTimeoutRef.current);
      onboardingTimeoutRef.current = null;
    }
  };

  // 🔥 Places API 선로딩 (백그라운드, 실패해도 무시)
  useEffect(() => {
    const preloadPlaces = async () => {
      try {
        // 🔥 Maps API 먼저 로드
        const { loadGoogleMapsAPI } = await import("@/utils/googleMapsLoader");
        await loadGoogleMapsAPI();
        
        // 🔥 Places API 선로딩
        const { ensurePlacesReady } = await import("@/utils/PlacesManager");
        await ensurePlacesReady();
        console.log('✅ Places API 선로딩 완료');
      } catch (e) {
        // 실패해도 무시 (검색 시 다시 시도)
        console.log('⚠️ Places API 선로딩 실패 (검색 시 재시도):', e);
      }
    };
    // 🔥 컴포넌트 마운트 후 즉시 선로딩 (지도 준비와 무관)
    preloadPlaces();
  }, []); // 🔥 빈 dependency - 최초 1회만
  
  // 🔥 러닝 크루 상태 (OS 관점)
  const [runningCrewState, setRunningCrewState] = useState<{
    type: "idle" | "upcoming" | "navigating" | "arrived";
    message: string;
    timeRemaining?: string;
    crewName?: string;
  } | null>(null);
  
  // 🔥 음성 인식 타이밍 제어 (동행자 모드)
  const [shouldListenVoice, setShouldListenVoice] = useState(false); // 🔥 음성 인식 활성화 여부
  const lastVoiceCommandTimeRef = useRef<number>(0); // 🔥 마지막 음성 명령 시간
  const lastVoiceGuidanceTimeRef = useRef<number>(0); // 🔥 마지막 음성 안내 시간
  const silenceStartTimeRef = useRef<number>(0); // 🔥 침묵 시작 시간
  const voiceGuidanceFrequencyRef = useRef<"high" | "medium" | "low">("high"); // 🔥 음성 안내 빈도
  const humanTouchShownRef = useRef(false); // 🔥 인간적 멘트 표시 여부 (하루 1회)
  const lastSpeedRef = useRef<number | null>(null); // 🔥 이전 속도 (급변 감지용)
  const lastLocationRef = useRef<{ lat: number; lng: number; time: number } | null>(null); // 🔥 이전 위치 (속도 계산용)

  // 🔥 웹 STT (버튼 클릭 기반)
  const [isSTTListening, setIsSTTListening] = useState(false);
  const [sttStatus, setSttStatus] = useState<STTStatus>('idle'); // 🔥 Phase 20: STT 상태
  const [recognizedText, setRecognizedText] = useState<string | null>(null); // 🔥 Phase 22: 인식된 문장
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // 🔥 3단계: STT 중복 실행 방지 (useRef 기반)
  const isSearchingRef = useRef(false);

  // 🔥 Mock AI 응답 데이터 (테스트용)
  // 🔥 비교 테스트: results를 2개로 변경하면 비교 모드 활성화
  const mockAIResponse: AIMapResponse = {
    title: "근처 운동장을 찾았어요",
    intent: "solo_play", // 🔥 목적 기반 해석 (혼자 운동)
    results: [
      { id: "1", lat: 37.5665, lng: 126.978, name: "서울광장" },
      { id: "2", lat: 37.5700, lng: 126.982, name: "동대문운동장" },
      // 🔥 비교 테스트: 아래 주석 해제하면 비교 모드 활성화
      // { id: "3", lat: 37.5630, lng: 126.975, name: "광화문광장" },
    ],
  };

  // 🔥 자동 네비게이션 시작 (location.state에서)
  useEffect(() => {
    const state = location.state as { autoStartNavigation?: boolean; destination?: { lat: number; lng: number; name: string; type: string; id?: string } } | null;
    
    if (state?.autoStartNavigation && state.destination && mapInstanceRef.current && userLocation) {
      // 약간의 지연 후 네비게이션 시작 (지도 초기화 완료 후)
      setTimeout(() => {
        startNavigation(state.destination!);
      }, 1000);
      
      // state 초기화 (중복 실행 방지)
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, mapInstanceRef.current, userLocation, navigate]);

  // 🔥 지도 준비 완료 핸들러 (useCallback으로 메모이제이션 - 무한 루프 방지)
  const handleMapReady = useCallback((map: google.maps.Map) => {
    console.log('✅ [지도] handleMapReady 호출됨, Active Map 설정');
    
    // 🔥 첫 번째 지도만 Active Map으로 설정
    if (!mapInstanceRef.current) {
    mapInstanceRef.current = map;
      // 🔥 전역 변수에도 할당 (fallback용)
      (window as any).googleMapInstance = map;
      // 🔥 지도 준비 완료 플래그 설정
      setIsMapReady(true);
      console.log('✅ [지도] Active Map 준비 완료 (첫 번째 지도)');
    } else {
      // 🔥 두 번째 지도는 무시 (Active Map 아님)
      console.warn('🛑 [지도] 두 번째 지도 감지 - Active Map으로 설정하지 않음');
    }
    
    // 🔥 DirectionsService/DirectionsRenderer 초기화
    const google = window.google?.maps;
    if (google) {
      directionsServiceRef.current = new google.DirectionsService();
      directionsRendererRef.current = new google.DirectionsRenderer({
        suppressMarkers: false,
        preserveViewport: false,
      });
      directionsRendererRef.current.setMap(map);
    }
    
    // 🔥 취향 로드 (초기)
    const preferences = loadPreferences();
    setUserPreferences(preferences);

    // 🔥 사용자 위치 획득 (지도 준비 후)
    getUserLocation()
      .then((location) => {
        setUserLocation(location);
        console.log("✅ [GeneralMapPage] 사용자 위치 저장:", location);
      })
      .catch((err: GeolocationPositionError) => {
        // 🔥 TIMEOUT 에러 상세 로그
        if (err.code === 3) {
          console.error("❌ [GeneralMapPage] 위치 획득 TIMEOUT:", {
            code: err.code,
            message: err.message,
            tip: "위치 권한을 확인하거나 네트워크 연결을 확인해주세요."
          });
        } else {
          console.warn("⚠️ [GeneralMapPage] 위치 획득 실패:", err);
        }
        // 🔥 위치 실패 시 userLocation은 null로 유지 (fallback 좌표 사용 안 함)
        setUserLocation(null);
      });

    console.log("✅ [GeneralMapPage v2] 지도 준비 완료", { preferences });
    
    // 🔥 Phase 35: 지도 로드 이벤트
    logUXEvent('map_loaded');
  }, []); // 🔥 빈 dependency array - 한 번만 생성

  // 🔥 Phase 33: 복귀 감지 및 상태 복원 (컴포넌트 마운트 + 탭 복귀 감지)
  useEffect(() => {
    if (!isMapReady) return;

    const restoreNavigation = () => {
      const lastPhase = sessionStorage.getItem('lastPhase');
      const placeId = sessionStorage.getItem('lastPlaceId');
      const placeName = sessionStorage.getItem('lastPlaceName');
      const placeLat = sessionStorage.getItem('lastPlaceLat');
      const placeLng = sessionStorage.getItem('lastPlaceLng');
      const travelMode = sessionStorage.getItem('lastTravelMode');

      // Phase 32에서 길찾기로 나간 경우 복원
      if (lastPhase === '32' && placeId && placeName && placeLat && placeLng && travelMode) {
        // 이미 Phase 33 상태면 중복 복원 방지
        if (overlayState.type === "phase33") return;

        setOverlayState({
          type: "phase33",
          placeId,
          placeName,
          lat: parseFloat(placeLat),
          lng: parseFloat(placeLng),
          travelMode,
        });
        console.log("[Phase33] 복귀 감지 - 상태 복원:", { placeId, placeName, travelMode });
        
        // 🔥 Phase 35: 복귀 이벤트
        logUXEvent('returned_from_maps', { placeId, placeName });
        
        // 🔥 Phase 34: 복귀 즉시 TTS 제거 (버튼 트리거로 변경)
        // TTS는 사용자가 "다시 길찾기" 버튼을 눌렀을 때만 재생
        phase33SpokenRef.current = false; // 플래그 리셋
      }
    };

    // 최초 진입 시 복원
    restoreNavigation();

    // 🔥 탭 복귀 감지 (외부 앱 → 앱 복귀)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        restoreNavigation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isMapReady, overlayState.type]);

  // 🔥 웹 STT 초기화 (버튼 클릭용)
  const initWebSTT = (): SpeechRecognition | null => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('⚠️ Web Speech API가 지원되지 않습니다.');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false; // 🔥 한 번만 인식 (루프 차단)

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      // 🔥 Phase 28: STT 결과가 나오면 온보딩 종료
      if (showOnboarding) {
        endOnboarding();
      }
      hasSpokenYetRef.current = true;
      // 🔥 STT 무한 재호출 방지 가드
      if (!beginVoiceCycle()) {
        console.warn("🛑 [STT] 중복 음성 사이클 차단");
        return;
      }

      const text = e.results[0][0].transcript;
      console.log('🎤 STT 결과:', text);
      
      // 🔥 Phase 22: 상태 전이 - understood
      setSttStatus('understood');
      setRecognizedText(text);
      console.log('✅ [GeneralMapPage] Phase 22: 인식된 문장:', text);
      
      // 🔥 먼저 STT 완전히 끊기 (재시작 방지)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // 이미 종료된 경우 무시
        }
      }
      
      setIsSTTListening(false);
      // 🔥 리모델링: whisperState 제거됨
      
      // 🔥 Phase 22: 0.8초 후 searching 상태로 전이
      setTimeout(() => {
        setSttStatus('searching');
        setRecognizedText(null); // 캡션 사라짐
      }, 800);
      
      // 서버로 전송 (사이클 종료 보장)
      void handleWebVoiceCommand(text).finally(() => {
        setSttStatus('idle'); // 🔥 Phase 22: 처리 완료 후 idle
        endVoiceCycle(); // ❗ 이 사이클 끝
      });
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.error('❌ STT 오류:', e.error);
      setIsSTTListening(false);
      setSttStatus('error'); // 🔥 Phase 20: 오류 상태
      // 🔥 리모델링: whisperState 제거됨
      
      if (e.error === 'no-speech') {
        setSummaryMessage({ text: '음성이 감지되지 않았습니다. 다시 시도해주세요.' });
        setSttStatus('idle'); // 🔥 Phase 20: no-speech는 오류가 아님
      } else if (e.error === 'not-allowed') {
        setSummaryMessage({ text: '마이크 권한이 필요합니다. 브라우저 설정에서 마이크를 허용해주세요.' });
      } else {
        setSummaryMessage({ text: '음성 인식에 실패했습니다. 다시 시도해주세요.' });
      }
    };

    recognition.onend = () => {
      // 🔥 자동 재시작 금지 (루프 차단)
      setIsSTTListening(false);
      setSttStatus('idle'); // 🔥 Phase 20: 종료 시 idle
      // 🔥 리모델링: whisperState 제거됨
      console.log('🛑 STT 종료 (자동 재시작 없음)');
    };

    return recognition;
  };

  // 🔥 웹 음성 명령 처리 (서버 API 호출)
  const handleWebVoiceCommand = async (text: string) => {
    if (!text.trim()) return;
    
    // 🔥 3단계: STT 중복 실행 방지 (useRef 기반)
    if (isSearchingRef.current) {
      console.warn('🚫 [중복 차단] 검색이 이미 진행 중입니다.');
      return;
    }
    isSearchingRef.current = true;
    
    // 🛑 중복 호출 차단 (전역 락 - 이중 보호)
    if ((window as any).__VOICE_LOCK__) {
      console.warn('🚫 [중복 차단] 음성 명령이 이미 처리 중입니다.');
      isSearchingRef.current = false;
      return;
    }
    (window as any).__VOICE_LOCK__ = true;
    
    try {
      // 🔥 리모델링: whisperState 제거됨
      console.log('🌐 웹 음성 명령 요청:', text);
      
      // 서버 API 호출 (맥락 정보 + 개인화 정보 포함)
      const response = await callVoiceAPI(
        text,
        userLocation?.lat,
        userLocation?.lng,
        lastSearchQueryRef.current || undefined, // 🔥 맥락 유지: 마지막 검색어 전송
        user?.uid, // 🔥 개인화: 사용자 ID
        userPreferencesRef.current // 🔥 개인화: 선호 카테고리 전송
      ) as WebVoiceResponse & { preferences?: Record<string, number> };
      
      console.log('🌐 웹 음성 명령 응답:', response);
      
      // 🔥 서버 연결 실패 시 클라이언트 검색으로 자동 fallback
      if (response.error && response.error.includes('Server unavailable')) {
        console.log('🔄 서버 연결 실패 → 클라이언트 검색으로 fallback');
        // response.intent가 이미 'OPEN_MAP'으로 설정되어 있으므로 아래 로직으로 진행
      }
      
      // 🔥 개인화: 서버에서 업데이트된 선호 정보 저장
      if (response.preferences) {
        userPreferencesRef.current = response.preferences;
        try {
          localStorage.setItem('userPreferences', JSON.stringify(response.preferences));
        } catch (e) {
          console.warn('선호 카테고리 저장 실패:', e);
        }
      }
      
      // 🔥 메시지 표시는 검색 성공 후에만 (여기서는 일단 보류)
      // setSummaryMessage({ text: response.message }); // ❌ 검색 전 메시지 제거
      
      // Intent에 따라 처리 (웹은 판단 안 함, 서버 응답대로만 실행)
      if (response.intent === 'OPEN_MAP') {
        // 🔥 검색어 저장 (맥락 유지용)
        if (response.slots.query) {
          lastSearchQueryRef.current = response.slots.query;
        }
        
        // 🔥 검색 직전 강제 위치 업데이트
        if (!userLocation) {
          console.log('⚠️ [위치] userLocation 없음 -> 위치 업데이트 시도');
          try {
            const location = await getUserLocation();
            setUserLocation(location);
            console.log('✅ [위치] 위치 업데이트 성공:', location);
          } catch (locationError: any) {
            console.warn('⚠️ [위치] 위치 업데이트 실패:', locationError?.message || '알 수 없는 오류');
            // 위치 업데이트 실패해도 검색은 계속 진행 (지도 중심 fallback 사용)
          }
        }
        
        // 🔥 서버에서 Places 검색 결과가 있으면 바로 사용
        if (response.places && response.places.length > 0) {
          // 🔥 지도 표시 시도 (성공 여부 확인)
          try {
            await handleVoiceMapActionWithPlaces(response.places, response.slots, response.autoNavigate);
            
            // ✅ 지도 표시 성공 후에만 메시지 표시 (진짜 성공했을 때만!)
            setSummaryMessage({ text: `${response.slots.query || '장소'}을(를) 찾았습니다.` });
            
            // 🔥 음성 안내가 끝난 후 자연스럽게 지도 이동 (800ms 지연)
            await new Promise(resolve => setTimeout(resolve, 800));
          } catch (mapError: any) {
            // 🔥 지도 표시 실패 시 명확한 메시지
            console.error('❌ 지도 표시 실패:', mapError);
            // 🔥 리모델링: UI 상태 전이 (idle → error, 검색 실패)
            setUI('error');
            setSummaryMessage({ 
              text: `근처에서 "${response.slots.query || '장소'}"를 찾지 못했어요.` 
            });
          }
        } else {
          // 🔥 서버 검색 결과 없음: 클라이언트 검색 시도
          // ⚠️ 중요: fallback이 아니라 정상 흐름이지만, 실패 시 명확한 메시지 표시
          // ❌ 여기서는 성공 메시지 표시하지 않음 (검색 성공 후에만 표시)
          try {
            const searchSuccess = await handleVoiceMapAction(response.slots, undefined, response.autoNavigate);
            // 🔥 handleVoiceMapAction이 성공했으면 내부에서 메시지 표시됨
            // 실패하면 catch에서 처리
          } catch (searchError: any) {
            // 🔥 클라이언트 검색도 실패한 경우 명확한 메시지
            console.error('❌ 클라이언트 Places 검색 실패:', searchError);
            // 🔥 리모델링: UI 상태 전이 (idle → error, 검색 실패)
            setUI('error');
            setSummaryMessage({ 
              text: `근처에서 "${response.slots.query || '장소'}"를 찾지 못했어요.` 
            });
            // 🔥 리모델링: whisperState 제거됨
          }
        }
      } else if (response.intent === 'ZOOM_IN') {
        // 🔥 줌 제어 (맥락 유지 - lastQuery는 그대로 유지)
        // 🔥 지도 확대
        if (mapInstanceRef.current) {
          const currentZoom = mapInstanceRef.current.getZoom() || 14;
          mapInstanceRef.current.setZoom(Math.min(currentZoom + 1, 19));
        }
        // 🔥 리모델링: whisperState 제거됨
      } else if (response.intent === 'ZOOM_OUT') {
        // 🔥 지도 축소
        if (mapInstanceRef.current) {
          const currentZoom = mapInstanceRef.current.getZoom() || 14;
          mapInstanceRef.current.setZoom(Math.max(currentZoom - 1, 3));
        }
        // 🔥 리모델링: whisperState 제거됨
      } else if (response.intent === 'RECONFIRM' || response.intent === 'UNKNOWN') {
        // 재확인/알 수 없음: 메시지만 표시
        // 🔥 리모델링: whisperState 제거됨
        return;
      } else {
        // 🔥 리모델링: whisperState 제거됨
      }
    } catch (error: any) {
      console.error('❌ 웹 음성 명령 처리 실패:', error);
      setSummaryMessage({ text: '명령 처리에 실패했습니다. 다시 시도해주세요.' });
      // 🔥 리모델링: whisperState 제거됨
      
      // 🔥 에러 발생 시에도 사이클 종료 보장
      endVoiceCycle();
    } finally {
      // 🔥 3단계: STT 중복 실행 방지 해제
      isSearchingRef.current = false;
      // 🛑 락 해제 (성공/실패 무관하게 반드시 실행)
      (window as any).__VOICE_LOCK__ = false;
    }
  };

  // 🔥 지도 액션 처리 (서버 Places 결과 사용) - 🔥 새로운 메인 함수
  const handleVoiceMapActionWithPlaces = async (
    places: Array<{ name: string; address: string; rating: number; openNow: boolean | null; lat: number; lng: number; placeId?: string | null }>,
    slots: { query?: string; radius?: number; openNow?: boolean; sort?: string },
    autoNavigate?: boolean
  ) => {
    if (!mapInstanceRef.current) {
      // 🔥 조용히 처리
      console.warn('⚠️ [지도] 인스턴스 준비 중...');
      throw new Error('Map instance not available');
    }
    
    // 🔥 Places 배열 검증 (필수!)
    if (!places || !Array.isArray(places) || places.length === 0) {
      // 🔥 조용히 처리
      console.warn('⚠️ [검색] 결과 없음');
      throw new Error('Invalid places array');
    }
    
    const query = slots.query || '장소';
    const google = window.google;
    if (!google?.maps) {
      // 🔥 조용히 처리
      console.warn('⚠️ [지도] API 준비 중...');
      throw new Error('Google Maps API not loaded');
    }
    
    // 🔥 유효한 위치 정보가 있는 places만 필터링
    const validPlaces = places.filter(place => {
      if (!place || typeof place.lat !== 'number' || typeof place.lng !== 'number') {
        console.warn('⚠️ [Places] 유효하지 않은 place:', place);
        return false;
      }
      // lat/lng가 0이 아닌지 확인 (유효한 좌표인지)
      if (place.lat === 0 && place.lng === 0) {
        console.warn('⚠️ [Places] 좌표가 (0, 0)인 place 제외:', place);
        return false;
      }
      return true;
    });
    
    if (validPlaces.length === 0) {
      // 🔥 조용히 처리
      console.warn('⚠️ [검색] 유효한 위치 정보 없음');
      throw new Error('No valid places with location data');
    }
    
    // 🔥 서버 결과 정렬 처리 (유효한 places만 사용)
    let sortedPlaces = [...validPlaces];
    if (slots.sort === 'PRICE_ASC') {
      // 가격 낮은 순 (rating 기반 임시)
      sortedPlaces.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    } else if (slots.sort === 'DISTANCE_ASC' && userLocation) {
      // 거리 가까운 순 (사용자 위치 기준)
      sortedPlaces.sort((a, b) => {
        const distA = google.maps.geometry.spherical.computeDistanceBetween(
          new google.maps.LatLng(userLocation.lat, userLocation.lng),
          new google.maps.LatLng(a.lat, a.lng)
        );
        const distB = google.maps.geometry.spherical.computeDistanceBetween(
          new google.maps.LatLng(userLocation.lat, userLocation.lng),
          new google.maps.LatLng(b.lat, b.lng)
        );
        return distA - distB;
      });
    }
    
    // 🔥 구글 객체가 없으면 마커를 그리지 않고 조용히 리턴! (에러 방지)
    if (!window.google || !window.google.maps) {
      console.warn("⚠️ 구글 라이브러리가 아직 로드되지 않아 마커 생성을 보류합니다.");
      throw new Error('Google Maps library not loaded');
    }
    
    // 마커 표시 (유효한 places만)
    const markers = sortedPlaces
      .slice(0, 10)
      .map((place) => {
        // 🔥 위치 정보 최종 검증
        if (!place || typeof place.lat !== 'number' || typeof place.lng !== 'number') {
          return null;
        }
        
        // lat/lng가 0이 아닌지 확인
        if (place.lat === 0 && place.lng === 0) {
          return null;
        }
        
        try {
          // 🔥 추가 안전 장치: google.maps.Marker가 존재하는지 확인
          if (!google.maps.Marker) {
            console.warn('⚠️ [마커] Marker 클래스가 아직 준비되지 않음');
            return null;
          }
          
          const marker = new google.maps.Marker({
            position: new google.maps.LatLng(place.lat, place.lng),
            map: mapInstanceRef.current,
            title: place.name,
          });
          return marker;
        } catch (markerError: any) {
          // 🔥 조용히 처리 (개별 마커 실패는 무시)
          console.warn('⚠️ [마커] 생성 건너뜀');
          return null;
        }
      })
      .filter((marker): marker is google.maps.Marker => marker !== null); // 🔥 null 제거
    
    // 🔥 유효한 마커가 없으면 종료
    if (markers.length === 0) {
      // 🔥 조용히 처리
      console.warn('⚠️ [마커] 생성 실패');
      throw new Error('No valid markers created');
    }
    
    // 기존 마커 제거
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = markers;
    
    // 🔥 검색 결과 자동 줌 레벨 튜닝 (자동 네비게이션 시작 시에는 줌 제어 안 함)
    if (!autoNavigate) {
      if (markers.length === 0) return;
      
      if (markers.length === 1) {
        // 장소 1개: 줌 16 (가까이 보기)
        const pos = markers[0].getPosition()!;
        mapInstanceRef.current.setCenter(pos);
        mapInstanceRef.current.setZoom(16);
      } else {
        // 여러 개: 바운즈 맞춤
        const bounds = new google.maps.LatLngBounds();
        markers.forEach(marker => {
          const pos = marker.getPosition();
          if (pos) bounds.extend(pos);
        });
        
        // 사용자 위치도 포함 (선택적)
        if (userLocation) {
          bounds.extend(new google.maps.LatLng(userLocation.lat, userLocation.lng));
        }
        
        mapInstanceRef.current.fitBounds(bounds, {
          top: 80,
          bottom: 140,
          left: 40,
          right: 40,
        });
      }
    }
    
    // 응답 설정
    const results = sortedPlaces.slice(0, 10).map((place, idx) => ({
      id: place.placeId || `place_${idx}`,
      lat: place.lat,
      lng: place.lng,
      name: place.name,
    }));
    
    setAiResponse({
      title: `${query}을(를) 찾았어요`,
      results,
    });
    
    // 🔥 리모델링: UI 상태 전이 (idle → result, 검색 완료)
    setUI('result');
    
    setOverlayState({ type: 'result', title: `${query}을(를) 찾았어요`, count: sortedPlaces.length });
    
    // 🔥 자동 네비게이션 시작 (서버에서 결정한 경우)
    if (autoNavigate && results.length > 0 && userLocation) {
      const firstResult = results[0];
      startNavigation({
        lat: firstResult.lat,
        lng: firstResult.lng,
        name: firstResult.name,
      }, google.TravelMode.WALKING); // 🔥 기본값: 도보
    }
  };

  // 🔥 STT 오인식 보정 함수 (지도 검색용)
  // ⚠️ "근처" 키워드는 parseMapCommand에서 처리하므로 여기서는 제거하지 않음
  const normalizeMapQuery = (rawQuery: string): string => {
    let query = rawQuery.trim();
    
    // 🔥 STT 오인식 패턴 보정
    const corrections: Record<string, string> = {
      '초축구장': '축구장',
      '초 축구장': '축구장',
      '초축구': '축구장',
      '초 축구': '축구장',
      '초헬스장': '헬스장',
      '초 헬스장': '헬스장',
      '초헬스': '헬스장',
      '초 헬스': '헬스장',
      '초농구장': '농구장',
      '초 농구장': '농구장',
      '초농구': '농구장',
      '초 농구': '농구장',
      '초야구장': '야구장',
      '초 야구장': '야구장',
      '초야구': '야구장',
      '초 야구': '야구장',
      '초수영장': '수영장',
      '초 수영장': '수영장',
      '초수영': '수영장',
      '초 수영': '수영장',
    };
    
    // 🔥 오인식 패턴 교정
    for (const [wrong, correct] of Object.entries(corrections)) {
      if (query.includes(wrong)) {
        query = query.replace(wrong, correct);
        console.log(`🔧 [검색어 보정] "${wrong}" → "${correct}"`);
      }
    }
    
    return query.trim() || rawQuery; // 보정 실패 시 원본 반환
  };

  const handleVoiceMapAction = async (
    slots: { query?: string; radius?: number; openNow?: boolean; sort?: string },
    centerOverride?: { lat: number; lng: number }, // 🔥 재검색용 중심점 오버라이드
    autoNavigate?: boolean // 🔥 자동 네비게이션 시작 플래그
  ) => {
    // 🛑 1단계: Active Map 준비 확인 (필수!)
    if (!isMapReady || !mapInstanceRef.current) {
      console.warn("🛑 Map not ready (secondary map or not initialized). Abort search.");
      // 🔥 리모델링: whisperState 제거됨
      (window as any).__PLACES_SEARCH_LOCK__ = false;
      return;
    }
    
    // 🔥 Active Map 확인 (첫 번째 지도만 사용)
    const activeMapRef = mapInstanceRef.current; // 🔥 Active Map (첫 번째 지도)
    if (!activeMapRef) {
      console.warn('🛑 [지도] Active Map 없음 -> 검색 차단');
      // 🔥 리모델링: whisperState 제거됨
      (window as any).__PLACES_SEARCH_LOCK__ = false;
      return;
    }
    
    // 🔥 검색 직전 강제 위치 업데이트
    if (!userLocation) {
      console.log('⚠️ [위치] userLocation 없음 -> 위치 업데이트 시도');
      try {
        const location = await getUserLocation();
        setUserLocation(location);
        console.log('✅ [위치] 위치 업데이트 성공:', location);
      } catch (locationError: any) {
        console.warn('⚠️ [위치] 위치 업데이트 실패:', locationError?.message || '알 수 없는 오류');
        // 위치 업데이트 실패해도 검색은 계속 진행 (지도 중심 fallback 사용)
      }
    }
    
    // 🛑 중복 호출 차단 (Places 검색 중복 방지)
    if ((window as any).__PLACES_SEARCH_LOCK__) {
      console.warn('🚫 [중복 차단] Places 검색이 이미 진행 중입니다.');
      return;
    }
    (window as any).__PLACES_SEARCH_LOCK__ = true;
    
    // 🔥 ① 최종 수정: 라이브러리가 준비될 때까지 명시적 대기
    try {
      console.log('⏳ [최종 수정] 라이브러리 로딩 대기 중...');
      const { ensurePlacesReady } = await import("@/utils/PlacesManager");
      await ensurePlacesReady();
      console.log('✅ [최종 수정] 라이브러리 로딩 완료');
    } catch (libError: any) {
      // 🔥 조용히 처리 (오류 메시지 표시 안 함)
      console.warn('⚠️ [라이브러리] 로딩 지연:', libError?.message || '알 수 없는 오류');
      // 🔥 리모델링: whisperState 제거됨
      (window as any).__PLACES_SEARCH_LOCK__ = false;
      return;
    }
    
    // 🔥 3️⃣ Command Layer 파싱: "내 주변" 명령 처리
    const rawQuery = slots.query || '장소';
    const command = parseMapCommand(rawQuery);
    const query = command.keyword || '장소';
    
    // 🔥 검색어 유효성 검증
    if (!query || query.trim().length === 0) {
      console.warn('⚠️ [Places API] 검색어가 비어있습니다.');
      setSummaryMessage({ text: '검색어를 다시 말해주세요.' });
      // 🔥 리모델링: whisperState 제거됨
      (window as any).__PLACES_SEARCH_LOCK__ = false;
      return;
    }
    
    console.log(`🔧 [Command Layer] "${rawQuery}" → keyword: "${query}", useMyLocation: ${command.useMyLocation}`);
    
    try {
      // 🔥 1️⃣ [방어 로직] 라이브러리 미로딩 시 검색 차단
      if (!(window as any).google?.maps?.places) {
        console.warn("⏳ 구글 지도 라이브러리가 로드되지 않았습니다. 재시도합니다.");
        try {
          const { loadPlacesLibrary } = await import("@/utils/googleMapsLoader");
          await loadPlacesLibrary(); // 라이브러리 로드 함수 호출
        } catch (libError: any) {
          // 🔥 조용히 처리 (오류 메시지 표시 안 함)
          console.warn('⚠️ [라이브러리] 로드 지연:', libError?.message || '알 수 없는 오류');
          // 🔥 리모델링: whisperState 제거됨
        (window as any).__PLACES_SEARCH_LOCK__ = false;
        return;
        }
      }
      
      // 🔥 Places API 단일 진입점 사용 (중복 호출 방지)
      console.log('🔄 [Places Manager] Places API 준비 확인 중...');
      const { ensurePlacesReady } = await import("@/utils/PlacesManager");
      const { Place } = await ensurePlacesReady();
      console.log('✅ [Places Manager] Places API 준비 완료', { Place: typeof Place });
      
      // 🔥 Places API 안전 가드 (searchByText 메서드 확인)
      if (!Place || typeof Place.searchByText !== 'function') {
        // 🔥 조용히 처리
        console.warn('⚠️ [Places API] 검색 기능 준비 중...');
        // 🔥 리모델링: whisperState 제거됨
        (window as any).__PLACES_SEARCH_LOCK__ = false;
        return;
      }
      
      // 🔥 2️⃣ [설계 1번 적용] resolveSearchCenter 실행
      const searchCenter = (() => {
        // Geolocation 성공 데이터 확인
        console.log('🔍 [위치 확인] userLocation:', userLocation);
        if (userLocation?.lat && typeof userLocation.lat === "number" && !isNaN(userLocation.lat) && userLocation.lat !== 0) {
          console.log('✅ [위치 확인] userLocation 사용:', userLocation);
          return { lat: userLocation.lat, lng: userLocation.lng, source: "explicit" as const };
        }
        
        // ⚠️ 여기서 실패 시 '오류'를 띄우지 않고 바로 지도 중심을 땁니다.
        console.log('⚠️ [위치 확인] userLocation 없음 -> 지도 중심 확인 중...');
        const map = mapInstanceRef.current || (window as any).googleMapInstance;
        console.log('🔍 [위치 확인] mapInstanceRef.current:', mapInstanceRef.current ? '존재' : '없음');
        console.log('🔍 [위치 확인] googleMapInstance:', (window as any).googleMapInstance ? '존재' : '없음');
        console.log('🔍 [위치 확인] 최종 map 인스턴스:', map ? '존재' : '없음');
      
        if (!map) {
          console.error('❌ [위치 확인] map 인스턴스가 없습니다!');
          return null;
        }
        
        const center = map.getCenter();
        console.log('🔍 [위치 확인] map.getCenter() 결과:', center ? '존재' : '없음');
        
        if (center) {
          const fallbackCenter = { lat: center.lat(), lng: center.lng(), source: "map-fallback" as const };
          console.warn("⚠️ [Search] Geolocation 실패 -> 지도 중심 Fallback 사용:", fallbackCenter);
          return fallbackCenter;
        }
        console.error('❌ [위치 확인] 지도 중심도 없음');
        return null;
      })();
      
      if (!searchCenter) {
        // 🔥 조용히 처리 (오류 메시지 표시 안 함)
        console.warn('⚠️ [위치] 정보 확인 중...');
        // 🔥 리모델링: whisperState 제거됨
        (window as any).__PLACES_SEARCH_LOCK__ = false;
        return;
      }
      
      // 🔥 위치 정보 소스 로그
      if (searchCenter.source === 'map-fallback') {
        console.log('🔍 [search] 지도 중심 fallback 사용:', searchCenter);
      } else {
        console.log('🔍 [search] 명시적 중심점 사용:', searchCenter);
      }
      
      // 🔥 Places (New) API로 검색
      console.log('🔍 [검색어 확인]:', query);
      
      // 🔥 API 요청 객체 고정 (에러 반짝임 방지)
      // InvalidValueError의 주범인 fields 형식을 강제로 고정
      const request = {
        textQuery: query, // 보정된 키워드 ("축구장")
        fields: ['displayName', 'location', 'formattedAddress'], // 🔥 반드시 배열! 문자열 금지
        locationBias: {
          center: { lat: searchCenter.lat, lng: searchCenter.lng },
          radius: slots.radius || 5000 // 🔥 5km 반경
        },
        maxResultCount: 10,
        includedType: slots.openNow ? 'establishment' : undefined,
      };
      
      console.log('🔄 [Places API] searchByText 호출 시작...', { 
        query, 
        searchCenter, 
        locationBias: request.locationBias
      });
      
      const { places } = await Place.searchByText(request);
      console.log('✅ [Places API] searchByText 완료', { placesCount: places?.length || 0 });
      
      // 🔥 2단계: Places 결과 안전 가드 (절대 안 터지게)
      if (!places) {
        // 🔥 조용히 처리
        console.warn('⚠️ [검색] 결과 없음');
        // 🔥 리모델링: whisperState 제거됨
        (window as any).__PLACES_SEARCH_LOCK__ = false;
        return;
      }
      
      // 🔥 검색 결과 확인 (실패 시 즉시 종료, 조용히 처리)
      if (!Array.isArray(places) || places.length === 0) {
        // 🔥 조용히 처리
        console.warn('⚠️ [검색] 결과 없음');
        // 🔥 리모델링: whisperState 제거됨
        (window as any).__PLACES_SEARCH_LOCK__ = false;
        return;
      }
      
      // 🔥 Places 결과를 서버 형식으로 변환
      console.log('🔄 [Places API] 결과 변환 시작...', { placesCount: places.length });
      
      // 🔥 3단계: place 객체 유효성 검증 (가장 중요!)
      // searchByText 결과가 정상적인 Place 인스턴스인지 확인
      const validPlaces = places.filter((place, index) => {
        // 🔥 Place 인스턴스 확인
        if (!place || typeof place !== 'object') {
          console.warn(`⚠️ [Places API] place[${index}]가 유효한 객체가 아닙니다:`, place);
          return false;
        }
        
        // 🔥 fetchFields 메서드 존재 확인
        if (typeof place.fetchFields !== 'function') {
          console.warn(`⚠️ [Places API] place[${index}]에 fetchFields 메서드가 없습니다:`, place);
          return false;
        }
        
        // 🔥 기본 displayName 확인 (최소한의 유효성)
        if (!place.displayName && !place.id) {
          console.warn(`⚠️ [Places API] place[${index}]에 displayName과 id가 모두 없습니다:`, place);
          return false;
        }
        
        return true;
      });
      
      if (validPlaces.length === 0) {
        // 🔥 조용히 처리
        console.warn('⚠️ [검색] 유효한 결과 없음');
        // 🔥 리모델링: whisperState 제거됨
        (window as any).__PLACES_SEARCH_LOCK__ = false;
        return;
      }
      
      console.log(`✅ [Places API] 유효한 Place 인스턴스: ${validPlaces.length}/${places.length}`);
      
      // 🔥 fetchFields용 fields 배열 정의 (로컬 변수, 명확히 구분)
      const FETCH_FIELDS: string[] = ['displayName', 'formattedAddress', 'rating', 'location'];
      
      // 🔥 1단계: fetchFields 비동기 처리 개선 (타이밍 문제 해결)
      // Promise.allSettled를 사용하여 일부 실패해도 전체가 실패하지 않도록 처리
      const placesDataResults = await Promise.allSettled(
        validPlaces.map(async (place, index) => {
          try {
            // 🔥 fetchFields 타임아웃 추가 (5초)
            const fetchFieldsPromise = place.fetchFields({ 
              fields: FETCH_FIELDS
            });
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('fetchFields timeout')), 10000) // 🔥 10초로 상향 조정
            );
            
            const fetchedFields = await Promise.race([fetchFieldsPromise, timeoutPromise]) as any;
            
            // 🔥 위치 정보 유효성 검증
            const lat = fetchedFields.location?.lat?.() || fetchedFields.location?.lat || 0;
            const lng = fetchedFields.location?.lng?.() || fetchedFields.location?.lng || 0;
            
            if (lat === 0 && lng === 0) {
              console.warn(`⚠️ [Places API] place[${index}] 위치 정보가 (0, 0)입니다.`);
              // 기본 위치 정보로 fallback 시도
              if (place.location) {
                const fallbackLat = place.location.lat?.() || place.location.lat || 0;
                const fallbackLng = place.location.lng?.() || place.location.lng || 0;
                if (fallbackLat !== 0 || fallbackLng !== 0) {
                  return {
                    name: fetchedFields.displayName || place.displayName || '',
                    address: fetchedFields.formattedAddress || '',
                    rating: fetchedFields.rating || 0,
                    openNow: null,
                    lat: fallbackLat,
                    lng: fallbackLng,
                    placeId: place.id || undefined,
                  };
                }
              }
              throw new Error('Invalid location data');
            }
            
            return {
              name: fetchedFields.displayName || place.displayName || '',
              address: fetchedFields.formattedAddress || '',
              rating: fetchedFields.rating || 0,
              openNow: null,
              lat,
              lng,
              placeId: place.id || undefined,
            };
          } catch (fieldError: any) {
            // 🔥 조용히 처리 (개별 place 실패는 무시)
            console.warn(`⚠️ [Places API] place[${index}] 처리 건너뜀`);
            
            // 🔥 기본 정보로 fallback (location이 있으면 사용)
            const fallbackLat = place.location?.lat?.() || place.location?.lat || 0;
            const fallbackLng = place.location?.lng?.() || place.location?.lng || 0;
            
            if (fallbackLat === 0 && fallbackLng === 0) {
              // 위치 정보가 없으면 제외
              throw new Error('No valid location data');
            }
            
            return {
              name: place.displayName || '',
              address: '',
              rating: 0,
              openNow: null,
              lat: fallbackLat,
              lng: fallbackLng,
              placeId: place.id || undefined,
            };
          }
        })
      );
      
      // 🔥 Promise.allSettled 결과 처리
      const placesData = placesDataResults
        .map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            // 🔥 조용히 처리 (개별 place 실패는 무시)
            console.warn(`⚠️ [Places API] place[${index}] 처리 건너뜀`);
            return null;
          }
        })
        .filter((place): place is NonNullable<typeof place> => place !== null);
      console.log('✅ [Places API] 결과 변환 완료', { placesDataCount: placesData.length });
      
      // 🔥 검색 성공 확인 (반드시 데이터가 있을 때만!)
      if (placesData.length === 0) {
        // 🔥 조용히 처리
        console.warn('⚠️ [검색] 변환된 데이터 없음');
        // 🔥 리모델링: whisperState 제거됨
        (window as any).__PLACES_SEARCH_LOCK__ = false;
        return;
      }
      
      // 🔥 1순위: validPlacesData 스코프 보장 (절대 안 터지게)
      // 유효한 위치 정보가 있는 places만 필터링
      const validPlacesData = placesData.filter(place => {
        if (!place || typeof place.lat !== 'number' || typeof place.lng !== 'number') {
          return false;
        }
        // lat/lng가 0이 아닌지 확인
        if (place.lat === 0 && place.lng === 0) {
          return false;
        }
        return true;
      });
      
      // 🔥 유효한 places가 없으면 종료
      if (validPlacesData.length === 0) {
        // 🔥 조용히 처리
        console.warn('⚠️ [검색] 유효한 위치 정보 없음');
        // 🔥 리모델링: whisperState 제거됨
        (window as any).__PLACES_SEARCH_LOCK__ = false;
        return;
      }
      
      // 🔥 서버 결과 사용 함수 재사용 (유효한 places만 전달)
      // ⚠️ 중요: 지도 표시 성공 후에만 메시지 표시!
      try {
        await handleVoiceMapActionWithPlaces(validPlacesData, slots, autoNavigate);
        
        // ✅ 지도 표시 성공 후에만 메시지 표시 (진짜 성공했을 때만!)
        setSummaryMessage({ text: `${query}을(를) 찾았습니다.` });
        // 🔥 리모델링: whisperState 제거됨 // 🔥 성공 상태로 변경
        
        // 🔥 음성 안내가 끝난 후 자연스럽게 지도 이동 (800ms 지연)
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (mapError: any) {
        // 🔥 조용히 처리
        console.warn('⚠️ [지도] 표시 지연:', mapError?.message || '알 수 없는 오류');
        // 🔥 리모델링: whisperState 제거됨
        (window as any).__PLACES_SEARCH_LOCK__ = false;
        return;
      }
      
      // 🔥 검색 성공 완료 - 락 해제
      (window as any).__PLACES_SEARCH_LOCK__ = false;
    } catch (error: any) {
      // 🔥 모든 오류를 조용히 처리 (사용자에게 오류 메시지 표시 안 함)
      console.warn('⚠️ [검색] 처리 지연:', error?.message || '알 수 없는 오류');
      // 🔥 리모델링: whisperState 제거됨
      (window as any).__PLACES_SEARCH_LOCK__ = false;
      return;
    } finally {
      // 🛑 락 해제 (성공/실패 무관하게 반드시 실행)
      (window as any).__PLACES_SEARCH_LOCK__ = false;
    }
  };

  // 🔥 버튼 클릭 핸들러 (STT 시작)
  const onClickVoiceButton = () => {
    // 🔥 Phase 28: 사용자가 말하기 시작하면 온보딩 종료
    if (showOnboarding) {
      endOnboarding();
    }
    hasSpokenYetRef.current = true;

    // 이미 STT 진행 중이면 무시
    if (isSTTListening) {
      console.warn('⚠️ STT가 이미 진행 중입니다.');
      return;
    }

    // Speech Recognition 초기화 (없으면)
    if (!recognitionRef.current) {
      const recognition = initWebSTT();
      if (!recognition) {
        setSummaryMessage({ text: '음성 인식이 지원되지 않는 브라우저입니다.' });
        return;
      }
      recognitionRef.current = recognition;
    }

    try {
      setIsSTTListening(true);
      setSttStatus('listening'); // 🔥 Phase 20: 듣는 중 상태
      // 🔥 리모델링: whisperState 제거됨
      recognitionRef.current.start();
      console.log('🎤 STT 시작');
    } catch (error: any) {
      console.error('❌ STT 시작 실패:', error);
      setIsSTTListening(false);
      setSttStatus('error'); // 🔥 Phase 20: 시작 실패 시 오류 상태
      // 🔥 리모델링: whisperState 제거됨
      setSummaryMessage({ text: '음성 인식을 시작할 수 없습니다. 다시 시도해주세요.' });
    }
  };

  // 🔥 말의 강도 분석 (텍스트 패턴으로 보완)
  const analyzeVoiceIntensity = (text: string): "calm" | "moderate" | "intense" => {
    // 한글 자음 반복 (예: "하...", "으...")
    if (/[가-힣]\.{2,}/.test(text) || /\.{3,}/.test(text)) {
      return "intense";
    }
    // 느낌표
    if (/!{2,}/.test(text)) {
      return "intense";
    }
    // 한숨 표현 (하, 흠, 음 등)
    if (/^(하|흠|음|어|아)[\.\.\.]*$/.test(text.trim())) {
      return "intense";
    }
    // 평범한 질문
    if (text.includes("?") && !text.includes("!")) {
      return "calm";
    }
    return "moderate";
  };

  // 🔥 Phase 36/37: Phase 33/37 상태에서 음성 명령 처리 (재안내 UX + 실패 재시도)
  const handlePhase33VoiceCommand = (text: string) => {
    if (overlayState.type !== "phase33" && overlayState.type !== "phase37") return false;

    const lowerText = text.toLowerCase();
    
    // 재개 명령 (Phase 33, 37 모두)
    if (VOICE_COMMANDS.RESUME.some(cmd => lowerText.includes(cmd.toLowerCase()))) {
      logUXEvent('navigation_resumed_voice', { placeId: overlayState.placeId });
      handleReopenRoute();
      return true;
    }

    // 재시도 명령 (Phase 37 전용)
    if (overlayState.type === "phase37" && VOICE_COMMANDS.RETRY.some(cmd => lowerText.includes(cmd.toLowerCase()))) {
      logUXEvent('navigation_resumed_voice', { placeId: overlayState.placeId });
      handleReopenRoute();
      speakInstruction("연결되면 바로 다시 열게요");
      return true;
    }

    // 취소 명령
    if (VOICE_COMMANDS.CANCEL.some(cmd => lowerText.includes(cmd.toLowerCase()))) {
      logUXEvent('navigation_canceled_voice', { placeId: overlayState.placeId });
      handleCloseOverlay();
      return true;
    }

    return false;
  };

  // 🔥 음성 명령 처리 핸들러
  const handleVoiceCommand = (text: string) => {
    // 🔥 Phase 36: Phase 33 상태에서 음성 명령 우선 처리
    if (handlePhase33VoiceCommand(text)) {
      return;
    }

    if (mapMode !== "navigation" || !shouldListenVoice) return;
    
    // 🔥 침묵 타이머 리셋
    lastVoiceCommandTimeRef.current = Date.now();
    silenceStartTimeRef.current = 0;
    
    const intent = classifyVoiceIntent(text);
    const intensity = analyzeVoiceIntensity(text);
    console.log("🎤 [GeneralMapPage] 음성 명령 인식:", text, "→", intent, "강도:", intensity);
    
    switch (intent.type) {
      case "immediate_action":
        if (intent.action === "pause") {
          setIsNavigationPaused(true);
          speakInstruction("안내를 일시정지했어요");
        } else if (intent.action === "cancel") {
          exitNavigation();
          speakInstruction("안내를 종료했어요");
        } else if (intent.action === "resume") {
          setIsNavigationPaused(false);
          handleRecenterToRoute();
          speakInstruction("안내를 다시 시작할게요");
        }
        break;
        
      case "change_mode":
        const google = window.google?.maps;
        if (!google || !navigationInfo) return;
        
        const modeMap: Record<"walking" | "driving" | "bicycling", google.maps.TravelMode> = {
          walking: google.TravelMode.WALKING,
          driving: google.TravelMode.DRIVING,
          bicycling: google.TravelMode.BICYCLING,
        };
        
        const newMode = modeMap[intent.mode];
        const modeLabels = {
          walking: "도보",
          driving: "차량",
          bicycling: "자전거",
        };
        
        startNavigation(navigationInfo.destination, newMode);
        speakInstruction(`${modeLabels[intent.mode]}로 전환할게요`);
        break;
        
      case "emotion_state":
        if (intent.state === "tired") {
          speakInstruction("곧 쉬기 좋은 지점이 있어요");
        } else if (intent.state === "scared") {
          speakInstruction("조금 더 밝은 길로 바꿀 수 있어요");
        } else if (intent.state === "crowded") {
          speakInstruction("한적한 길로 바꿀게요");
          // 경로 재탐색 (조용한 길 우선)
          if (navigationInfo) {
            reroute();
          }
        } else if (intent.state === "bad_route") {
          speakInstruction("다른 경로로 안내할게요");
          if (navigationInfo) {
            reroute();
          }
        }
        break;
        
      case "route_change":
        // 🔥 강도에 따라 다른 응답
        if (intensity === "intense") {
          // 강한 불만 → 더 공감적 응답
          if (intent.reason === "quieter") {
            speakInstruction("조금 돌아가지만 한적한 길로 바꿀게요");
          } else if (intent.reason === "faster") {
            speakInstruction("조금 돌아가지만 더 빠른 길로 안내할게요");
          } else {
            speakInstruction("대체 경로로 안내할게요");
          }
        } else {
          // 평범한 요청 → 간단히 처리
          if (intent.reason === "quieter") {
            speakInstruction("한적한 길로 바꿀게요");
          } else if (intent.reason === "faster") {
            speakInstruction("더 빠른 길로 안내할게요");
          } else {
            speakInstruction("대체 경로로 안내할게요");
          }
        }
        // 경로 재탐색 (확인 없이 바로 실행)
        if (navigationInfo) {
          reroute();
        }
        break;
        
      case "unknown":
        // 🔥 실패해도 UX가 무너지지 않게 (확인 질문 없이 조용히 처리)
        // 현재 상태 유지 (아무 말도 하지 않음)
        break;
    }
  };
  
  // 🔥 네비게이션 모드에서 음성 인식 활성화 (continuous)
  const { start: startVoiceRecognition, stop: stopVoiceRecognition, isListening: isVoiceListening } = useSpeechToText({
    onResult: handleVoiceCommand,
    onError: () => {
      // 에러 발생해도 조용히 처리 (UX 안 깨짐)
    },
    lang: "ko-KR",
    continuous: true, // 🔥 네비게이션 중 계속 듣기
    interimResults: false,
  });
  
  // 🔥 음성 인식 타이밍 제어 (동행자 모드 + Phase 36: Phase 33 재안내)
  useEffect(() => {
    // 🔥 Phase 36/37: Phase 33/37 상태에서도 음성 리스너 활성화
    const isPhase33Active = overlayState.type === "phase33" || overlayState.type === "phase37";
    
    // 🔥 STT 무한 재호출 방지: 음성 사이클이 활성화되어 있으면 재시작 금지
    if ((mapMode === "navigation" && shouldListenVoice && !isVoiceCycleActive()) || isPhase33Active) {
      startVoiceRecognition();
    } else {
      stopVoiceRecognition();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapMode, shouldListenVoice, overlayState.type]);

  // 🔥 음성 인식 활성화 타이밍 제어 (특정 상황에만 ON)
  useEffect(() => {
    if (mapMode !== "navigation") {
      setShouldListenVoice(false);
      return;
    }

    // 🔥 1. 안내 직후 5초간 활성화
    const postGuidanceTimer = setTimeout(() => {
      setShouldListenVoice(true);
      lastVoiceCommandTimeRef.current = Date.now();
    }, 1000); // 안내 시작 후 1초

    // 🔥 5초 후 자동 비활성화 (침묵 존중)
    const silenceTimer = setTimeout(() => {
      if (Date.now() - lastVoiceCommandTimeRef.current > 5000) {
        setShouldListenVoice(false);
        silenceStartTimeRef.current = Date.now();
      }
    }, 6000);

    return () => {
      clearTimeout(postGuidanceTimer);
      clearTimeout(silenceTimer);
    };
  }, [mapMode, nextStep]); // nextStep 변경 시 재활성화

  // 🔥 침묵 감지 및 음성 안내 빈도 조절
  useEffect(() => {
    if (mapMode !== "navigation") return;

    const checkSilence = setInterval(() => {
      const now = Date.now();
      const silenceDuration = silenceStartTimeRef.current > 0 
        ? now - silenceStartTimeRef.current 
        : now - lastVoiceCommandTimeRef.current;

      // 🔥 5분간 침묵 → 음성 안내 빈도 감소
      if (silenceDuration > 300000) { // 5분
        voiceGuidanceFrequencyRef.current = "low";
      } else if (silenceDuration > 120000) { // 2분
        voiceGuidanceFrequencyRef.current = "medium";
      } else {
        voiceGuidanceFrequencyRef.current = "high";
      }
    }, 30000); // 30초마다 체크

    return () => clearInterval(checkSilence);
  }, [mapMode]);

  // 🔥 러닝 크루 상태 확인 (OS 관점)
  useEffect(() => {
    if (!user || mapMode === "navigation") {
      setRunningCrewState(null);
      return;
    }

    // TODO: 사용자의 러닝 크루 정보 가져오기
    // 임시로 기본 상태만 설정
    const checkRunningCrew = async () => {
      // 실제로는 사용자의 크루 정보를 가져와서
      // 오늘 모임이 있으면 "upcoming" 상태로 설정
      setRunningCrewState({
        type: "idle",
        message: "지금은 쉬는 중이에요",
      });
    };

    checkRunningCrew();
  }, [user, mapMode]);

  // 🔥 길안내 시작 함수
  const startNavigation = (
    destination: { lat: number; lng: number; name: string },
    travelMode?: google.maps.TravelMode
  ) => {
    if (!mapInstanceRef.current || !directionsServiceRef.current || !directionsRendererRef.current) {
      console.warn("⚠️ [GeneralMapPage] 지도 또는 DirectionsService가 준비되지 않음");
      return;
    }

    if (!userLocation) {
      console.warn("⚠️ [GeneralMapPage] 사용자 위치가 없음");
      return;
    }

    const google = window.google?.maps;
    if (!google) return;

    const mode = travelMode || google.TravelMode.WALKING;

    const request = {
      origin: userLocation,
      destination: { lat: destination.lat, lng: destination.lng },
      travelMode: mode,
    };

    directionsServiceRef.current.route(request, (result, status) => {
      if (status === google.DirectionsStatus.OK && result && directionsRendererRef.current) {
        directionsResultRef.current = result; // 🔥 경로 결과 저장
        
        const route = result.routes[0]?.legs[0];
        const distance = route?.distance?.text;
        const duration = route?.duration?.text;

        setNavigationInfo({
          destination,
          distance,
          duration,
          travelMode: mode,
        });
        
        // 🔥 Phase 24: 경로를 그리지 말고 방향 힌트만 표시
        // directionsRenderer는 숨김 (나중에 Phase 25에서 표시)
        directionsRendererRef.current.setMap(null);
        
        // Phase 24 트리거
        setShowDirectionHint(true);
        setPhase24Message("이쪽 방향이에요");
        
        setMapMode("navigation");
        setCameraMode("follow"); // 🔥 안내 시작 시 자동 추적 ON
        
        // 🔥 네비게이션 시작 시 초기화
        lastVoiceCommandTimeRef.current = Date.now();
        silenceStartTimeRef.current = 0;
        voiceGuidanceFrequencyRef.current = "high";
        humanTouchShownRef.current = false;
        lastSpeedRef.current = null;
        lastLocationRef.current = null;
        midNavigationCoachingShownRef.current = false; // 🔥 이동 중 1회 개입 리셋
        
        // 🔥 Movement Session 생성
        if (user) {
          const timeContext = getCurrentTimeContext();
          const intent = inferIntent(timeContext);
          
          saveMovementSession(user.uid, {
            intent,
            destination,
            navigation: {
              travelMode: mode === google.TravelMode.WALKING ? "WALKING" 
                : mode === google.TravelMode.DRIVING ? "DRIVING" 
                : "BICYCLING",
              duration,
              distance,
              route: result,
              startedAt: new Date(),
            },
            condition: {
              start: "normal", // 기본값, 나중에 업데이트 가능
            },
            routeCharacteristics: {
              quiet: false,
              flat: false,
              crowded: false,
            },
            preferences: {
              liked: false,
            },
          }).then((sessionId) => {
            currentSessionRef.current = sessionId;
            console.log("✅ [GeneralMapPage] Movement Session 생성:", sessionId);
          }).catch((error) => {
            console.error("❌ [GeneralMapPage] Movement Session 생성 실패:", error);
          });
        }
        
        // 🔥 안내 모드 줌/회전 정책 적용
        if (mapInstanceRef.current && userLocation) {
          applyNavZoomBounds(mapInstanceRef.current, mode);
          applyNavRotation(mapInstanceRef.current, mode);
          
          // 🔥 다음 행동 중심 카메라로 초기 설정
          setTimeout(() => {
            if (mapInstanceRef.current && userLocation) {
              focusNextStep(
                mapInstanceRef.current,
                userLocation,
                result
              );
            }
          }, 500);
        }
        
        console.log("✅ [GeneralMapPage] 길안내 시작:", { destination: destination.name, distance, duration });
      } else {
        console.warn("⚠️ [GeneralMapPage] 경로 탐색 실패:", status);
      }
    });
  };

  // 🔥 길안내 종료 함수
  const exitNavigation = () => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }
    directionsResultRef.current = null;
    setMapMode("idle");
    setNavigationInfo(null);
    setNextStep(null);
    setCameraMode("follow");
    setIsArrived(false);
    setIsNavigationPaused(false);
    
    // 🔥 Phase 24: 상태 초기화
    setShowDirectionHint(false);
    setPhase24Message(null);
    if (directionHintPolylineRef.current) {
      directionHintPolylineRef.current.setMap(null);
      directionHintPolylineRef.current = null;
    }
    
    // 🔥 Phase 26: 상태 초기화
    setFullNavigationStarted(false);
    setPhase26Message(null);
    phase26MessageShownRef.current = false;
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }
    
    // 타이머 클리어
    if (cameraTimeoutRef.current) {
      clearTimeout(cameraTimeoutRef.current);
    }
    
    // 음성 중단
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    
    // 🔥 줌 제한 해제 (idle 모드로 복귀)
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setOptions({
        minZoom: MAP_ZOOM_LIMIT.MIN,
        maxZoom: MAP_ZOOM_LIMIT.MAX,
      });
    }
    
    console.log("✅ [GeneralMapPage] 길안내 종료");
  };

  // 🔥 카메라를 경로로 복귀 (다음 행동 중심)
  const handleRecenterToRoute = () => {
    if (!mapInstanceRef.current || !userLocation || !navigationInfo) return;
    
    focusNextStep(
      mapInstanceRef.current,
      userLocation,
      directionsResultRef.current || undefined
    );
    setCameraMode("follow");
    
    // 타이머 리셋
    if (cameraTimeoutRef.current) {
      clearTimeout(cameraTimeoutRef.current);
    }
  };

  // 🔥 도착 감지 및 처리
  const [isArrived, setIsArrived] = useState(false);
  // 도착 후 스케줄된 리디렉트 타이머 정리용 ref
  const redirectTimersRef = useRef<number[]>([]);
  const clearAllRedirectTimers = () => {
    if (!redirectTimersRef.current.length) return;
    redirectTimersRef.current.forEach((t) => {
      try {
        clearTimeout(t);
      } catch {}
    });
    redirectTimersRef.current = [];
  };
  // 경로가 바뀌면 기존 타이머 전부 취소
  useEffect(() => {
    clearAllRedirectTimers();
  }, [location.pathname]);
  
  useEffect(() => {
    if (mapMode !== "navigation" || !userLocation || !navigationInfo) {
      setIsArrived(false);
      return;
    }

    const distance = distanceMeters(userLocation, navigationInfo.destination);
    
    if (distance < 20 && !isArrived) {
      setIsArrived(true);
      speakInstruction("도착했어요");
      console.log("✅ [GeneralMapPage] 목적지 도착");
      
      // 🔥 도착 시 세션 완료 및 자동 전환
      if (currentSessionRef.current && navigationInfo && user) {
        // 세션 업데이트
        updateMovementSession(currentSessionRef.current, {
          navigation: {
            ...navigationInfo,
            completedAt: new Date(),
          },
        }).then(() => {
          // 러닝 크루 자동 출석 처리
          const state = location.state as { crewId?: string; sessionId?: string } | null;
          if (state?.crewId && state?.sessionId) {
            checkInToSession(state.crewId, state.sessionId, user.uid, currentSessionRef.current)
              .then(() => {
                speakInstruction("도착했어요. 오늘 출석 처리됐어요");
              })
              .catch((error) => {
                console.error("❌ [GeneralMapPage] 출석 처리 실패:", error);
              });
          }
          
          // 도착 컨텍스트 결정 및 전환
          const context = determineArrivalContext(navigationInfo.destination);
          
          if (context) {
            // 러닝 크루인 경우 크루 대시보드로 이동
            if (state?.crewId) {
              clearAllRedirectTimers();
              const t = window.setTimeout(() => {
                navigate(`/running-crew/${state.crewId}`);
              }, 2000);
              // cleanup에 의해 해제되도록 ref에 보관
              redirectTimersRef.current.push(t as unknown as number);
              return;
            }
            
            // 2초 후 자동 전환 (지도 사라짐)
            {
              clearAllRedirectTimers();
              const t = window.setTimeout(() => {
              switch (context.type) {
                case "team":
                  navigate(`/sports/${navigationInfo.destination.type || "football"}/team`, {
                    state: { teamId: context.teamId },
                  });
                  break;
                case "competition":
                  navigate(`/tournaments/${context.tournamentId}`);
                  break;
                case "solo":
                  // 운동 기록 화면 또는 홈으로
                  navigate("/me/records", {
                    state: { sessionId: currentSessionRef.current },
                  });
                  break;
                default:
                  // 기본: 홈으로
                  if (!location.pathname.startsWith("/sports")) {
                    console.log("🔥 NAVIGATE HOME TRIGGERED [GeneralMapPage:context-default]", location.pathname);
                  navigate("/home");
                  }
              }
            }, 2000);
              redirectTimersRef.current.push(t as unknown as number);
            }
          } else {
            // 컨텍스트 없으면 홈으로
            clearAllRedirectTimers();
            const t = window.setTimeout(() => {
              if (!location.pathname.startsWith("/sports")) {
                console.log("🔥 NAVIGATE HOME TRIGGERED [GeneralMapPage:no-context]", location.pathname);
              navigate("/home");
              }
            }, 2000);
            redirectTimersRef.current.push(t as unknown as number);
          }
        }).catch((error) => {
          console.error("❌ [GeneralMapPage] 세션 업데이트 실패:", error);
        });
      }
    }
    
    // 🔥 도착 1분 전 인간적 멘트 (하루 1회)
    if (distance >= 50 && distance <= 100 && !humanTouchShownRef.current) {
      const now = new Date();
      const today = now.toDateString();
      const lastShown = localStorage.getItem("yago_human_touch_date");
      
      if (lastShown !== today) {
        // 🔥 날씨 확인 (간단한 체크)
        const isRaining = false; // 실제로는 날씨 API 사용 가능
        
        if (isRaining) {
          speakInstruction("비 오는 날엔 길이 더 길게 느껴지죠");
        } else {
          // 이동 시간 계산 (대략)
          const duration = navigationInfo?.duration || "";
          if (duration) {
            speakInstruction(`오늘 이동 꽤 길었네요`);
          }
        }
        
        humanTouchShownRef.current = true;
        localStorage.setItem("yago_human_touch_date", today);
      }
    }
  }, [mapMode, userLocation, navigationInfo, isArrived]);

  useEffect(() => {
    return () => {
      clearAllRedirectTimers();
    };
  }, []);

  // 🔥 Phase 24: 방향 힌트 표시 및 지도 카메라 조정
  useEffect(() => {
    if (!showDirectionHint || !mapInstanceRef.current || !userLocation || !navigationInfo) {
      // 방향 힌트가 꺼지면 Polyline 제거
      if (directionHintPolylineRef.current) {
        directionHintPolylineRef.current.setMap(null);
        directionHintPolylineRef.current = null;
      }
      return;
    }

    const google = window.google?.maps;
    if (!google || !google.Polyline) return;

    const map = mapInstanceRef.current;
    const destination = navigationInfo.destination;

    // 전체 거리 계산
    const totalDistance = distanceMeters(userLocation, destination);
    
    // 방향 힌트 거리: 전체의 10~15% (최소 50m, 최대 200m)
    const hintDistance = Math.max(50, Math.min(200, totalDistance * 0.12));

    // 방향 계산 (bearing)
    const lat1 = userLocation.lat * Math.PI / 180;
    const lat2 = destination.lat * Math.PI / 180;
    const dLng = (destination.lng - userLocation.lng) * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    const bearing = Math.atan2(y, x) * 180 / Math.PI;

    // 힌트 끝점 계산 (현재 위치에서 bearing 방향으로 hintDistance만큼)
    const R = 6371000; // 지구 반지름 (미터)
    const lat1Rad = userLocation.lat * Math.PI / 180;
    const lng1Rad = userLocation.lng * Math.PI / 180;
    const bearingRad = bearing * Math.PI / 180;
    
    const lat2Rad = Math.asin(
      Math.sin(lat1Rad) * Math.cos(hintDistance / R) +
      Math.cos(lat1Rad) * Math.sin(hintDistance / R) * Math.cos(bearingRad)
    );
    const lng2Rad = lng1Rad + Math.atan2(
      Math.sin(bearingRad) * Math.sin(hintDistance / R) * Math.cos(lat1Rad),
      Math.cos(hintDistance / R) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
    );

    const hintEndPoint = {
      lat: lat2Rad * 180 / Math.PI,
      lng: lng2Rad * 180 / Math.PI,
    };

    // 기존 Polyline 제거
    if (directionHintPolylineRef.current) {
      directionHintPolylineRef.current.setMap(null);
    }

    // 방향 힌트 Polyline 생성
    const polyline = new google.Polyline({
      path: [userLocation, hintEndPoint],
      geodesic: true,
      strokeColor: '#3B82F6', // 반투명 블루
      strokeOpacity: 0.6,
      strokeWeight: 4,
      map: map,
    });

    directionHintPolylineRef.current = polyline;

    // 지도 카메라 조정: 줌 살짝 증가, 앞쪽 공간이 더 많이 보이도록 tilt/pan
    const currentZoom = map.getZoom() || 15;
    const newZoom = Math.min(currentZoom + 1, 18); // 최대 18까지
    
    // 목적지 방향으로 카메라를 약간 이동 (pan)
    // 앞쪽 공간이 더 보이도록 bounds를 확장
    const bounds = new google.LatLngBounds();
    bounds.extend(userLocation);
    bounds.extend(hintEndPoint);
    const center = bounds.getCenter();
    
    // 목적지 방향으로 bounds 확장 (1.5배)
    const extendedBounds = new google.LatLngBounds();
    extendedBounds.extend(userLocation);
    extendedBounds.extend({
      lat: center.lat() + (destination.lat - center.lat()) * 1.5,
      lng: center.lng() + (destination.lng - center.lng()) * 1.5,
    });
    
    map.fitBounds(extendedBounds, { top: 80, bottom: 200, left: 40, right: 40 });
    
    // 줌 조정
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setZoom(newZoom);
      }
    }, 300);

    console.log("✅ [Phase 24] 방향 힌트 표시:", { hintDistance, totalDistance });

    return () => {
      if (directionHintPolylineRef.current) {
        directionHintPolylineRef.current.setMap(null);
        directionHintPolylineRef.current = null;
      }
    };
  }, [showDirectionHint, userLocation, navigationInfo]);

  // 🔥 Phase 24: 하단 메시지 자동 사라짐 (2초) → Phase 26 자동 전환
  useEffect(() => {
    if (!phase24Message) return;

    const timer = setTimeout(() => {
      setPhase24Message(null);
      // Phase 24 메시지가 사라진 후 Phase 26으로 자동 전환
      if (mapMode === "navigation" && navigationInfo) {
        onStartFullNavigation();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [phase24Message, mapMode, navigationInfo]);

  // 🔥 Phase 26: 전체 경로 안내 시작 함수
  const onStartFullNavigation = () => {
    if (!mapInstanceRef.current || !directionsResultRef.current || !navigationInfo) {
      console.warn("⚠️ [Phase 26] 경로 정보가 없음");
      return;
    }

    const google = window.google?.maps;
    if (!google) return;

    // Phase 24 방향 힌트 제거
    setShowDirectionHint(false);
    if (directionHintPolylineRef.current) {
      directionHintPolylineRef.current.setMap(null);
      directionHintPolylineRef.current = null;
    }

    // 전체 경로 Polyline 생성
    const route = directionsResultRef.current.routes[0];
    if (!route) return;

    const path: google.maps.LatLngLiteral[] = [];
    route.legs.forEach((leg) => {
      leg.steps.forEach((step) => {
        if (step.path) {
          step.path.forEach((point) => {
            path.push({ lat: point.lat(), lng: point.lng() });
          });
        }
      });
    });

    // 기존 Polyline 제거
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
    }

    // 전체 경로 Polyline 생성 (부드럽게, 강조하지 않음)
    const polyline = new google.Polyline({
      path: path,
      geodesic: true,
      strokeColor: '#60A5FA', // 연한 블루
      strokeOpacity: 0.4, // 반투명
      strokeWeight: 3, // 얇게
      map: mapInstanceRef.current,
    });

    routePolylineRef.current = polyline;

    // Phase 26 시작
    setFullNavigationStarted(true);
    
    // 최초 1회만 안내 메시지
    if (!phase26MessageShownRef.current) {
      setPhase26Message("편한 속도로 가시면 돼요");
      phase26MessageShownRef.current = true;
    }

    // directionsRenderer는 사용하지 않음 (Polyline만 사용)
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }

    console.log("✅ [Phase 26] 전체 경로 안내 시작");
  };

  // 🔥 Phase 26: 하단 메시지 자동 사라짐 (3초, 이후 침묵)
  useEffect(() => {
    if (!phase26Message) return;

    const timer = setTimeout(() => {
      setPhase26Message(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [phase26Message]);

  // 🔥 Phase 26: 부드러운 follow mode (현재 위치 중심 유지)
  useEffect(() => {
    if (!fullNavigationStarted || !mapInstanceRef.current || !userLocation || cameraMode !== "follow") {
      return;
    }

    const map = mapInstanceRef.current;
    
    // 부드러운 카메라 이동 (즉시 이동하지 않고 약간의 지연)
    const updateCamera = () => {
      if (!mapInstanceRef.current || !userLocation) return;
      
      // 현재 위치를 중심으로 설정 (부드럽게)
      mapInstanceRef.current.panTo(userLocation);
    };

    // 약간의 지연 후 카메라 업데이트 (너무 빠른 업데이트 방지)
    const timer = setTimeout(updateCamera, 300);

    return () => clearTimeout(timer);
  }, [fullNavigationStarted, userLocation, cameraMode]);

  // 🔥 Phase 26: 안내 그만하기 함수
  const stopNavigation = () => {
    // Polyline 제거
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }

    // Phase 26 상태 초기화
    setFullNavigationStarted(false);
    setPhase26Message(null);
    phase26MessageShownRef.current = false;

    // 지도 자유 모드 복귀
    setCameraMode("free");
    
    // 네비게이션 모드는 유지 (사용자가 다시 시작할 수 있도록)
    // 완전히 종료하려면 exitNavigation() 호출

    console.log("✅ [Phase 26] 안내 중지");
  };

  // 🔥 Phase 26: 경로 이탈 감지 및 목적지 근처 도착 시 음성 안내 (최소화)
  useEffect(() => {
    if (!fullNavigationStarted || !userLocation || !navigationInfo || !directionsResultRef.current) {
      return;
    }

    const google = window.google?.maps;
    if (!google) return;

    // 목적지까지 거리 계산
    const distanceToDestination = distanceMeters(userLocation, navigationInfo.destination);

    // 목적지 근처 도착 시 (50m 이내) 음성 안내 (1회만)
    if (distanceToDestination < 50 && !isArrived) {
      speakInstruction("거의 다 왔어요");
      console.log("✅ [Phase 26] 목적지 근처 도착 안내");
    }

    // 경로 이탈 감지 (간단 버전)
    // 실제로는 geometry 라이브러리를 사용해야 하지만, 여기서는 거리 기반으로 간단히 처리
    const route = directionsResultRef.current.routes[0];
    if (!route) return;

    // 경로상 가장 가까운 점 찾기
    let minDistance = Infinity;
    route.legs.forEach((leg) => {
      leg.steps.forEach((step) => {
        if (step.path) {
          step.path.forEach((point) => {
            const dist = distanceMeters(userLocation, { lat: point.lat(), lng: point.lng() });
            if (dist < minDistance) {
              minDistance = dist;
            }
          });
        }
      });
    });

    // 경로에서 크게 벗어났을 때 (100m 이상) 음성 안내 (쿨다운 적용)
    const DEVIATION_COOLDOWN = 30000; // 30초 쿨다운

    if (minDistance > 100 && Date.now() - lastDeviationTimeRef.current > DEVIATION_COOLDOWN) {
      if (!routeDeviationShownRef.current) {
        speakInstruction("경로에서 벗어났어요. 다시 안내할게요");
        routeDeviationShownRef.current = true;
        lastDeviationTimeRef.current = Date.now();
        
        // 경로 재탐색
        setTimeout(() => {
          reroute(navigationInfo.travelMode);
          routeDeviationShownRef.current = false;
        }, 2000);
      }
    } else if (minDistance <= 50) {
      routeDeviationShownRef.current = false;
    }
  }, [fullNavigationStarted, userLocation, navigationInfo, isArrived]);

  // 🔥 사용자 인터랙션 감지 (드래그/줌/회전 시 free 모드로 전환)
  useEffect(() => {
    if (mapMode !== "navigation" || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const google = window.google?.maps;
    if (!google) return;
    
    const toFree = () => {
      setCameraMode((prev) => {
        if (prev === "follow") {
          return "free";
        }
        return prev;
      });
    };

    const dragStartListener = map.addListener("dragstart", toFree);
    const zoomChangedListener = map.addListener("zoom_changed", toFree);
    
    // 회전 컨트롤 사용 시 감지 (Google Maps는 heading_changed 이벤트가 없을 수 있음)
    // 대신 dragend에서 회전 여부 확인

    return () => {
      google.maps.event.removeListener(dragStartListener);
      google.maps.event.removeListener(zoomChangedListener);
    };
  }, [mapMode]);

  // 🔥 이동 수단 전환 함수 (3개 모드 지원)
  const changeTravelMode = (modeType: TravelModeType) => {
    if (!navigationInfo) return;

    const google = window.google?.maps;
    if (!google) return;

    const modeMap: Record<TravelModeType, google.maps.TravelMode> = {
      WALKING: google.TravelMode.WALKING,
      DRIVING: google.TravelMode.DRIVING,
      BICYCLING: google.TravelMode.BICYCLING,
    };

    const newMode = modeMap[modeType];
    startNavigation(navigationInfo.destination, newMode);
    
    // 🔥 이동 수단 전환 시 줌/회전 정책도 업데이트
    if (mapInstanceRef.current) {
      applyNavZoomBounds(mapInstanceRef.current, newMode);
      applyNavRotation(mapInstanceRef.current, newMode);
    }
  };

  // 🔥 경로 재탐색 함수 (길 이탈 시 사용)
  const reroute = (travelMode?: google.maps.TravelMode) => {
    if (!navigationInfo || !userLocation) return;

    const google = window.google?.maps;
    if (!google || !directionsServiceRef.current || !directionsRendererRef.current) return;

    const mode = travelMode || navigationInfo.travelMode;

    const request = {
      origin: userLocation,
      destination: { lat: navigationInfo.destination.lat, lng: navigationInfo.destination.lng },
      travelMode: mode,
    };

    directionsServiceRef.current.route(request, (result, status) => {
      if (status === google.DirectionsStatus.OK && result) {
        directionsResultRef.current = result; // 🔥 경로 결과 업데이트
        
        const route = result.routes[0]?.legs[0];
        const distance = route?.distance?.text;
        const duration = route?.duration?.text;

        setNavigationInfo({
          ...navigationInfo,
          distance,
          duration,
          travelMode: mode,
        });

        // 🔥 Phase 26: 전체 경로 안내 중이면 Polyline 업데이트
        if (fullNavigationStarted && mapInstanceRef.current) {
          const routePath = result.routes[0];
          if (routePath) {
            const path: google.maps.LatLngLiteral[] = [];
            routePath.legs.forEach((leg) => {
              leg.steps.forEach((step) => {
                if (step.path) {
                  step.path.forEach((point) => {
                    path.push({ lat: point.lat(), lng: point.lng() });
                  });
                }
              });
            });

            // 기존 Polyline 제거
            if (routePolylineRef.current) {
              routePolylineRef.current.setMap(null);
            }

            // 새 경로 Polyline 생성
            const polyline = new google.Polyline({
              path: path,
              geodesic: true,
              strokeColor: '#60A5FA',
              strokeOpacity: 0.4,
              strokeWeight: 3,
              map: mapInstanceRef.current,
            });

            routePolylineRef.current = polyline;
          }
        } else if (directionsRendererRef.current) {
          // Phase 26이 아니면 directionsRenderer 사용
          directionsRendererRef.current.setDirections(result);
        }

        console.log("✅ [GeneralMapPage] 경로 재탐색 완료:", { distance, duration });
      }
    });
  };

  // 🔥 길 이탈 감지 및 자동 재탐색 (일시정지 상태가 아닐 때만)
  useEffect(() => {
    if (mapMode !== "navigation" || isNavigationPaused || !userLocation || !navigationInfo || !directionsResultRef.current) return;

    let lastRerouteTime = 0;
    const REROUTE_COOLDOWN = 10000; // 10초 쿨다운 (너무 자주 재탐색 방지)

    // 위치 추적 시작 (길 이탈 감지용)
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        const now = Date.now();
        setUserLocation(current);

        // 🔥 속도 계산 (급변 감지용)
        if (lastLocationRef.current) {
          const distance = distanceMeters(lastLocationRef.current, current);
          const timeDiff = (now - lastLocationRef.current.time) / 1000; // 초
          const speed = timeDiff > 0 ? distance / timeDiff : 0; // m/s
          
          // 🔥 속도 급변 감지 (정지 → 이동, 이동 → 정지, 속도 2배 이상 변화)
          if (lastSpeedRef.current !== null) {
            const speedChange = Math.abs(speed - lastSpeedRef.current);
            if (speedChange > 2 || (lastSpeedRef.current < 0.5 && speed > 1.5) || (lastSpeedRef.current > 1.5 && speed < 0.5)) {
              console.log("🚶 [GeneralMapPage] 속도 급변 감지, 음성 인식 활성화");
              setShouldListenVoice(true);
              lastVoiceCommandTimeRef.current = now;
            }
          }
          
          lastSpeedRef.current = speed;
        }
        
        lastLocationRef.current = { ...current, time: now };

        // 경로 이탈 감지
        if (now - lastRerouteTime < REROUTE_COOLDOWN) return;

        if (directionsResultRef.current && isOffRoute(current, directionsResultRef.current)) {
          console.log("⚠️ [GeneralMapPage] 경로 이탈 감지, 자동 재탐색 시작");
          lastRerouteTime = now;
          
          // 🔥 경로 이탈 시 음성 인식 활성화
          setShouldListenVoice(true);
          lastVoiceCommandTimeRef.current = now;
          
          // 🔥 Phase 27: Phase 26에서는 상황 인식 코칭 비활성화 (침묵 모드)
          // 경로 이탈 시에는 Phase 26의 경로 이탈 감지 로직에서만 처리
          if (!fullNavigationStarted) {
            const frequency = voiceGuidanceFrequencyRef.current;
            if (frequency !== "low") {
              const coaching = "조금 돌아가지만 더 빠른 길로 안내할게요";
              setSituationalCoaching(coaching);
              speakInstruction(coaching);
              
              setTimeout(() => {
                setSituationalCoaching(null);
              }, 3000);
            }
          }
          
          reroute();
        }
      },
      (err) => {
        // 🔥 TIMEOUT 에러 상세 로그
        if (err.code === 3) {
          console.error('❌ [GeneralMapPage] 위치 추적 TIMEOUT:', {
            code: err.code,
            message: err.message
          });
        } else {
          console.warn("⚠️ [GeneralMapPage] 위치 추적 실패:", err);
        }
      },
      {
        enableHighAccuracy: false, // 🔥 실내라면 false가 더 잘 잡힐 수 있음
        timeout: 10000,            // 🔥 10초로 설정 (TIMEOUT 방지)
        maximumAge: 60000          // 🔥 1분 이내의 과거 위치 정보 허용
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [mapMode, userLocation, navigationInfo]);

  // 🔥 다음 스텝 관련 ref 및 state (nextStep은 위에서 선언됨)
  const lastSpokenStepRef = useRef<string | null>(null); // 🔥 마지막 음성 안내 스텝 추적
  const lastCoachingRef = useRef<string | null>(null); // 🔥 마지막 상황 코칭 추적
  const [situationalCoaching, setSituationalCoaching] = useState<string | null>(null); // 🔥 상황 인식 코칭
  
  useEffect(() => {
    if (mapMode !== "navigation" || !directionsResultRef.current) {
      setNextStep(null);
      return;
    }

    // DirectionsResult에서 다음 단계 추출
    const step = getNextStep(directionsResultRef.current);
    setNextStep(step);

    // 🔥 목적지까지 거리 계산
    const distanceToDestination = navigationInfo && userLocation
      ? distanceMeters(userLocation, navigationInfo.destination)
      : null;

    // 🔥 복잡 구간 진입 감지 (회전이 많은 구간)
    if (step && directionsResultRef.current) {
      const steps = directionsResultRef.current.routes[0]?.legs[0]?.steps || [];
      const upcomingSteps = steps.slice(0, 3); // 다음 3개 스텝
      const turnCount = upcomingSteps.filter(s => 
        s.instructions.includes("회전") || 
        s.instructions.includes("좌회전") || 
        s.instructions.includes("우회전")
      ).length;
      
      // 🔥 복잡 구간 진입 시 음성 인식 활성화
      if (turnCount >= 2 && !shouldListenVoice) {
        console.log("🔄 [GeneralMapPage] 복잡 구간 진입, 음성 인식 활성화");
        setShouldListenVoice(true);
        lastVoiceCommandTimeRef.current = Date.now();
      }
    }

    // 🔥 상황 인식 코칭 (침묵 시간에 따라 빈도 조절)
    const frequency = voiceGuidanceFrequencyRef.current;
    if (frequency !== "low") {
      const coaching = getSituationalCoaching(step, distanceToDestination);
      if (coaching && lastCoachingRef.current !== coaching) {
        setSituationalCoaching(coaching);
        speakInstruction(coaching);
        lastCoachingRef.current = coaching;
        lastVoiceGuidanceTimeRef.current = Date.now();
        
        // 3초 후 자동 제거
        setTimeout(() => {
          setSituationalCoaching(null);
        }, 3000);
      }
    }
    
    // 🔥 이동 중 1회 개입 (천재 모드)
    // 네비게이션 시작 후 중간 지점에서 딱 한 번만
    if (
      !midNavigationCoachingShownRef.current &&
      navigationInfo &&
      distanceToDestination &&
      distanceToDestination > 200 && // 200m 이상 남았을 때
      distanceToDestination < (parseInt(navigationInfo.distance.replace(/[^0-9]/g, "")) || 1000) * 0.6 // 전체의 60% 이하
    ) {
      midNavigationCoachingShownRef.current = true;
      
      // 🔥 Phase 27: Phase 26에서는 상황 인식 코칭 비활성화 (침묵 모드)
      if (!fullNavigationStarted) {
        // 컨디션 기반 코칭 (간단한 예시)
        const coaching = "오늘은 평소보다 조금 천천히 가도 돼요";
        setSituationalCoaching(coaching);
        speakInstruction(coaching);
        
        setTimeout(() => {
          setSituationalCoaching(null);
        }, 5000);
      }
    }

    // 🔥 음성 안내 (침묵 시간에 따라 빈도 조절)
    if (step) {
      const distanceMeters = parseInt(step.distance.replace(/[^0-9]/g, "")) || 0;
      const stepKey = `${step.distance}-${step.instruction}`;
      const frequency = voiceGuidanceFrequencyRef.current;

      // 🔥 빈도에 따라 안내 범위 조절
      let shouldSpeak = false;
      if (frequency === "high") {
        // 높은 빈도: 50m 전 또는 행동 직전 (100m 이하)
        shouldSpeak = distanceMeters <= 100;
      } else if (frequency === "medium") {
        // 중간 빈도: 30m 전 또는 행동 직전 (50m 이하)
        shouldSpeak = distanceMeters <= 50;
      } else {
        // 낮은 빈도: 행동 직전만 (30m 이하)
        shouldSpeak = distanceMeters <= 30;
      }

      // 🔥 Phase 27: Phase 26에서는 턴바이턴 음성 안내 비활성화 (침묵 모드)
      // Phase 26에서는 경로 이탈/목적지 근처 도착 시만 음성 안내
      if (!fullNavigationStarted && shouldSpeak && lastSpokenStepRef.current !== stepKey) {
        if (distanceMeters <= 50) {
          speakInstruction(`50미터 앞에서 ${step.instruction}`);
        } else {
          speakInstruction(`${step.distance} 후 ${step.instruction}`);
        }
        lastSpokenStepRef.current = stepKey;
        lastVoiceGuidanceTimeRef.current = Date.now();
      }
    }
  }, [mapMode, navigationInfo, directionsResultRef.current, userLocation]);

  // 🔥 경로 이탈 시 음성 안내
  useEffect(() => {
    if (mapMode !== "navigation") {
      lastSpokenStepRef.current = null;
    }
  }, [mapMode]);

  // 🔥 안내 종료 및 새 검색
  const handleNewSearch = () => {
    exitNavigation();
    setAiResponse(null);
    setOverlayState({ type: "idle" });
  };

  // 🔥 카드 클릭 시 지도 포커스
  const focusOnMap = (item: { lat: number; lng: number }) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.panTo({ lat: item.lat, lng: item.lng });
    mapInstanceRef.current.setZoom(17);
  };

  // 🔥 마커 클릭 핸들러 (AI에게 권한 위임)
  const handleMarkerSelect = (place: { id: string; name: string; lat: number; lng: number }) => {
    // 🔥 Phase 32: 마커 클릭 시 즉시 교통수단 선택 UI 표시
    console.log("[Phase32] marker clicked", place.id);
    
    // 🔥 리모델링: UI 상태 전이 (idle → result)
    setUI('result');
    
    // 음성 안내
    speakInstruction("여기로 안내할게요");
    
    // 🔥 Phase 32: 선택된 장소 저장 (Phase 33 복귀 대비)
    sessionStorage.setItem('selectedPlace', JSON.stringify({
      id: place.id,
      name: place.name,
      lat: place.lat,
      lng: place.lng,
    }));
    
    // 교통수단 선택 UI 표시
    setOverlayState({
      type: "transport_select",
      placeId: place.id,
      placeName: place.name,
      lat: place.lat,
      lng: place.lng,
    });
  };

  // 🔥 AI 응답 처리 (이 한 effect로 끝)
  useEffect(() => {
    // 🛑 1단계: Active Map 준비 확인 (필수!)
    if (!isMapReady || !mapInstanceRef.current || !aiResponse) {
      if (!isMapReady) {
        console.warn("🛑 Map not ready. Abort marker rendering.");
      }
      return;
    }
    
    // 🔥 Active Map 확인 (첫 번째 지도만 사용)
    const activeMapRef = mapInstanceRef.current; // 🔥 Active Map (첫 번째 지도)
    
    // ✅ 2단계: 구글 라이브러리가 있는지 먼저 확인
    if (!window.google || !window.google.maps) {
      console.warn("⏳ 아직 구글 지도 라이브러리가 준비되지 않았습니다.");
      return;
    }
    
    // ✅ Marker 클래스 존재 확인
    if (!window.google.maps.Marker || typeof window.google.maps.Marker !== 'function') {
      console.warn("⏳ 아직 구글 Maps Marker 클래스가 준비되지 않았습니다.");
      return;
    }

    // 🔥 기존 마커 및 클러스터 제거
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }

    // 🔥 마커 추가 (클릭 핸들러 포함) - Active Map 사용
    const markers = renderMarkers(
      activeMapRef, 
      aiResponse.results, 
      handleMarkerSelect
    );
    markersRef.current = markers;

    // 🔥 클러스터 연결 (결과 많을 때 자동) - Active Map 사용
    if (markers.length > 0) {
      const clusterer = attachCluster(activeMapRef, markers);
      clustererRef.current = clusterer;
    }

    // 🔥 자동 줌 1회 (사용자 위치 포함) - Active Map 사용
    // ⚠️ 중요: 위치 정보가 없어도 지도 중심을 유지 (파란 점 유지)
    // userLocation이 없으면 지도 중심을 사용하여 줌 조정
    const zoomCenter = userLocation || (() => {
      const mapCenter = activeMapRef?.getCenter();
      if (mapCenter) {
        return { lat: mapCenter.lat(), lng: mapCenter.lng() };
      }
      return undefined;
    })();
    fitMapToResults(activeMapRef, aiResponse.results, zoomCenter);

    // 🔥 AI 요약 트리거 (6개 이상일 때, 취향 반영)
    if (aiResponse.results.length >= 6) {
      const aiContext = buildAIContext();
      const summary = getClusterSummary(aiResponse.results, aiContext.recentPreferences);
      setSummaryMessage(summary);
      // 🔥 4초 후 자동 사라짐
      setTimeout(() => {
        setSummaryMessage(null);
      }, 4000);
    } else {
      setSummaryMessage(null);
    }

    // 🔥 목적 기반 라벨 설정 (Intent-first UX)
    const intent = buildIntentLabel(aiResponse.intent);
    setIntentLabel(intent);

    // 🔥 비교 모드 트리거 (결과 2개일 때)
    const comparison = buildComparison(aiResponse.results);
    if (comparison) {
      // 🔥 2초 후 비교 제안 표시 (자연스러운 타이밍)
      setTimeout(() => {
        setOverlayState({
          type: "compare",
          a: comparison.a,
          b: comparison.b,
        });
      }, 2000);
    } else {
      // 🔥 Overlay 상태 업데이트 (일반 결과, intent 반영)
      const resultTitle = intent 
        ? `${intent} 기준으로 골라봤어요`
        : aiResponse.title;

      setOverlayState({
        type: "result",
        title: resultTitle,
        count: aiResponse.results.length,
      });
    }

    // 🔥 결과 모드로 전환
    setMapMode("result");

    console.log("✅ [GeneralMapPage v2] AI 응답 처리 완료:", { 
      title: aiResponse.title, 
      count: aiResponse.results.length,
      hasCluster: markers.length >= 6
    });
  }, [aiResponse]);

  // 🔥 AI Proactive 메시지 (결과 직후 1.5초 뒤 자동 표시)
  useEffect(() => {
    if (!aiResponse) {
      setProactiveMessage(null);
      return;
    }

    // 🔥 결과 직후 1.5초 뒤 Proactive 메시지 표시 (1회만)
    const timer = setTimeout(() => {
      setProactiveMessage({
        text: "이 근처에 비슷한 운동장이 더 있어요",
        actionHint: "말로 더 물어보세요",
      });

      // 🔥 3초 후 자동 사라짐
      setTimeout(() => {
        setProactiveMessage(null);
      }, 3000);
    }, 1500);

    return () => clearTimeout(timer);
  }, [aiResponse]);

  // 🔥 Silent AI 메시지 (map_idle_3s: 사용자가 가만히 있을 때)
  useEffect(() => {
    if (!aiResponse || silentShownRef.current) return;

    // 🔥 자동 줌 완료 후 3초 뒤 Silent AI 메시지 (1회만)
    const timer = setTimeout(() => {
      if (silentShownRef.current) return;

      // 🔥 Silent 메시지 생성 (간단한 정보 한 줄)
      const silentTexts = [
        "가장 가까운 운동장은 여기예요",
        "지금 위치에서 도보로 10분 이내예요",
        "이 중에서 제일 가까운 곳은 여기예요",
      ];
      const randomText = silentTexts[Math.floor(Math.random() * silentTexts.length)];

      setSilentMessage(randomText);
      silentShownRef.current = true; // 🔥 한 세션에 1번만 표시
    }, 3000); // 🔥 자동 줌 완료 후 3초

    return () => clearTimeout(timer);
  }, [aiResponse]);

  // 🔥 Silent 메시지 자동 제거 (3초 후)
  useEffect(() => {
    if (!silentMessage) return;

    const timer = setTimeout(() => {
      setSilentMessage(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [silentMessage]);

  // 🔥 AI 음성 질문 핸들러 (반경 기반 검색 포함)
  const handleVoiceQuestion = async () => {
    // 🔥 Phase 28: 사용자가 말했으면 온보딩 종료
    if (showOnboarding) {
      endOnboarding();
    }
    hasSpokenYetRef.current = true;

    // 🔥 새 질문 시 Silent 상태 리셋
    silentShownRef.current = false;
    setSilentMessage(null);

    // 🔥 리모델링: whisperState 제거됨 (StatusPill의 ui 상태로 통합)

    // 🔥 음성 종료 후 thinking 상태 (실제로는 음성 종료 시점에 호출)
    setTimeout(() => {
      // 🔥 리모델링: whisperState 제거됨

      // 🔥 AI 응답 시뮬레이션 (반경 기반 필터링 적용)
      setTimeout(async () => {
        if (!userLocation) {
          // 사용자 위치 없으면 기본 응답
          setAiResponse(mockAIResponse);
          // 🔥 리모델링: UI 상태 전이 (idle → result, 검색 완료)
          setUI('result');
          return;
        }

        // 🔥 음성 텍스트에서 반경 추론 (임시: "근처 운동장"으로 가정)
        const voiceText = "근처 운동장 찾아줘"; // TODO: 실제 음성 텍스트로 교체
        
        // 🔥 "여기로 가고 싶어" 같은 네비게이션 요청 감지
        const navigationKeywords = ["가고 싶어", "가고싶어", "길 안내", "길안내", "여기로", "이곳으로"];
        const isNavigationRequest = navigationKeywords.some(keyword => voiceText.includes(keyword));
        
        // 🔥 네비게이션 요청이고 결과가 있으면 첫 번째 결과로 바로 길안내 시작
        if (isNavigationRequest && aiResponse && aiResponse.results.length > 0) {
          const firstResult = aiResponse.results[0];
          startNavigation({
            lat: firstResult.lat,
            lng: firstResult.lng,
            name: firstResult.name,
          });
          // 🔥 리모델링: whisperState 제거됨
          return;
        }
        
        // 🔥 네비게이션 요청이지만 결과가 없으면 먼저 검색 수행
        if (isNavigationRequest && (!aiResponse || aiResponse.results.length === 0)) {
          // 검색 후 첫 번째 결과로 길안내 (현재는 검색만 수행)
          console.log("🔥 [GeneralMapPage] 네비게이션 요청 감지, 먼저 검색 수행");
        }
        
        const radius = inferRadius(voiceText);

        // 🔥 Mock 데이터에서 반경 기반 필터링
        const mockPlaces = [
          { id: "1", lat: 37.5665, lng: 126.978, name: "서울광장" },
          { id: "2", lat: 37.5700, lng: 126.982, name: "동대문운동장" },
          { id: "3", lat: 37.5630, lng: 126.975, name: "광화문광장" },
          { id: "4", lat: 37.5550, lng: 126.990, name: "남산공원 운동장" },
          { id: "5", lat: 37.5480, lng: 127.000, name: "장충단 공원" },
        ];

        const filtered = filterByRadius(mockPlaces, userLocation, radius);
        
        // 🔥 거리 계산 후 추가
        const withDistance = filtered.map((p) => ({
          ...p,
          distance: distanceMeters(userLocation, p),
        }));

        // 🔥 거리순 정렬
        withDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));

        setAiResponse({
          title: `지금 위치 기준 ${Math.round(radius / 100) / 10}km 안에서 찾았어요`,
          intent: "solo_play",
          results: withDistance,
        });

        // 🔥 리모델링: UI 상태 전이 (idle → result, 검색 완료)
        setUI('result');
      }, 800);
    }, 200);
  };

  // 🔥 리모델링: Whisper 자동 idle 복귀 제거됨 (StatusPill의 ui 상태로 통합)

  // 🔥 후속 질문 핸들러 (FollowUp 상태에서)
  const handleFollowUpVoiceQuestion = () => {
    // TODO: 실제 AI 후속 질문 시작
    console.log("🔥 [GeneralMapPage v2] 후속 질문 시작:", overlayState.type === "followup" ? overlayState.placeName : "");
    // 임시: Idle로 리셋
    setOverlayState({ type: "idle" });
  };

  // 🔥 Phase 32 → 33: 교통수단 선택 핸들러 (외부 Google Maps로 위임)
  const handleTransportSelect = (mode: TravelModeType) => {
    if (overlayState.type !== "transport_select") return;

    console.log("[Phase32→33] transport selected:", mode);

    // 🔥 Phase 35: CTA 클릭 이벤트
    logUXEvent('cta_clicked', { mode, placeId: overlayState.placeId });

    // 음성 안내
    const modeText = mode === "WALKING" 
      ? "도보로 안내할게요"
      : mode === "DRIVING"
      ? "자동차로 출발할게요"
      : "대중교통으로 안내할게요";
    speakInstruction(modeText);

    // 🔥 외부 Google Maps로 위임 (안전하고 실전적)
    const destination = {
      lat: overlayState.lat,
      lng: overlayState.lng,
    };

    // 사용자 위치 확인 (없으면 지도 중심 사용)
    const origin = userLocation || (() => {
      const mapCenter = mapInstanceRef.current?.getCenter();
      if (mapCenter) {
        return { lat: mapCenter.lat(), lng: mapCenter.lng() };
      }
      return { lat: 37.5665, lng: 126.9780 }; // 서울시청 fallback
    })();

    // Google Maps travelmode 매핑
    const travelModeMap: Record<TravelModeType, string> = {
      WALKING: "walking",
      DRIVING: "driving",
      BICYCLING: "transit", // 대중교통
    };

    const travelMode = travelModeMap[mode];

    // 🔥 Phase 33: 외부 Maps 열기 전 상태 저장 (복귀 시 복원용)
    sessionStorage.setItem('lastPhase', '32');
    sessionStorage.setItem('lastPlaceId', overlayState.placeId);
    sessionStorage.setItem('lastPlaceName', overlayState.placeName);
    sessionStorage.setItem('lastPlaceLat', overlayState.lat.toString());
    sessionStorage.setItem('lastPlaceLng', overlayState.lng.toString());
    sessionStorage.setItem('lastTravelMode', travelMode);
    if (aiResponse) {
      sessionStorage.setItem('lastSearchQuery', lastSearchQueryRef.current || '');
    }

    // 🔥 좌표 → 주소 변환 후 Google Maps URL 생성 (행정동 캐싱 우선, 필요할 때만 reverse geocoding)
    // 장소 데이터에서 adminDong/address/name 우선 사용 (비용 0원)
    const placeData = aiResponse?.results.find(r => r.id === overlayState.placeId);
    buildGoogleMapsUrl(
      origin, 
      { 
        lat: destination.lat, 
        lng: destination.lng,
        adminDong: (placeData as any)?.adminDong,
        name: placeData?.name,
        address: (placeData as any)?.address,
      }, 
      travelMode
    ).then((url) => {
      // 🔥 리모델링: UI 상태 전이 (result → navigating)
      setUI('navigating');
      
      // 🔥 Phase 37: 외부 Maps 열기 실패 감지 (시간 기반 추론)
      const navigationStartTime = Date.now();
      let navigationFailed = false;
      
      // 새 탭에서 열기
      const openedWindow = window.open(url, '_blank');
    
    // 🔥 Phase 37: 실패 감지 타이머 (1.2초 후 체크)
    const failureCheckTimer = setTimeout(() => {
      const elapsed = Date.now() - navigationStartTime;
      // 1.5초 이내에 페이지가 여전히 포커스되어 있으면 실패 가능성 높음
      if (elapsed < 1500 && document.hasFocus() && !navigationFailed) {
        navigationFailed = true;
        handleNavigationFailure({
          placeId: overlayState.placeId,
          placeName: overlayState.placeName,
          lat: overlayState.lat,
          lng: overlayState.lng,
          travelMode,
        });
      }
    }, 1200);
    
    // 🔥 Phase 35: 외부 네비게이션 열기 이벤트
    logUXEvent('external_navigation_opened', { mode: travelMode, placeId: overlayState.placeId });
    
    console.log("[Phase33] 외부 Google Maps 열기:", {
      origin,
      destination,
      travelMode,
      url,
    });
    
    // 🔥 Phase 37: 성공 시 타이머 정리 (visibilitychange로 감지)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // 외부 앱으로 전환됨 → 성공
        clearTimeout(failureCheckTimer);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 3초 후 자동 정리 (성공했을 가능성 높음)
    setTimeout(() => {
      clearTimeout(failureCheckTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, 3000);

      // 🔥 Phase 33: 복귀 UX로 전환 (상태 바 + 하단 카드)
      setOverlayState({
        type: "phase33",
        placeId: overlayState.placeId,
        placeName: overlayState.placeName,
        lat: overlayState.lat,
        lng: overlayState.lng,
        travelMode: travelMode,
      });
    });
  };

  // 🔥 Phase 37: 네비게이션 실패 처리 핸들러
  const handleNavigationFailure = (place: { placeId: string; placeName: string; lat: number; lng: number; travelMode: string }) => {
    logUXEvent('external_navigation_failed', { placeId: place.placeId });
    
    // 🔥 리모델링: UI 상태 전이 (navigating → error)
    setUI('error');
    
    // Phase 37 상태로 전환
    setOverlayState({
      type: "phase37",
      placeId: place.placeId,
      placeName: place.placeName,
      lat: place.lat,
      lng: place.lng,
      travelMode: place.travelMode,
    });
    
    // TTS 안내
    speakInstruction("지금은 길찾기를 열 수 없어요");
    
    console.log("[Phase37] 네비게이션 실패 감지:", place);
  };

  // 🔥 Phase 33/37: 다시 길찾기 열기 핸들러 (Phase 34: 버튼 트리거 + 1회만 TTS)
  const handleReopenRoute = () => {
    if (overlayState.type !== "phase33" && overlayState.type !== "phase37") return;

    const origin = userLocation || (() => {
      const mapCenter = mapInstanceRef.current?.getCenter();
      if (mapCenter) {
        return { lat: mapCenter.lat(), lng: mapCenter.lng() };
      }
      return { lat: 37.5665, lng: 126.9780 };
    })();

    // 🔥 좌표 → 주소 변환 후 Google Maps URL 생성 (행정동 캐싱 우선)
    // 장소 데이터에서 adminDong/address/name 우선 사용 (비용 0원)
    const placeData = aiResponse?.results.find(r => r.id === overlayState.placeId);
    buildGoogleMapsUrl(
      origin, 
      { 
        lat: overlayState.lat, 
        lng: overlayState.lng,
        adminDong: (placeData as any)?.adminDong,
        name: placeData?.name,
        address: (placeData as any)?.address,
      }, 
      overlayState.travelMode
    ).then((url) => {
      window.open(url, '_blank');
      
      console.log("[Phase33] 다시 길찾기 열기:", url);

      // 🔥 Phase 35: 네비게이션 재개 이벤트
      logUXEvent('navigation_resumed', { placeId: overlayState.placeId });

      // 🔥 Phase 34: 버튼 트리거 시에만 TTS (1회만)
      if (!phase33SpokenRef.current) {
        speakInstruction("계속 안내할게요");
        phase33SpokenRef.current = true;
      }
    });
  };

  // 🔥 Phase 33: 다른 장소 보기 핸들러
  const handleShowOther = () => {
    if (overlayState.type !== "phase33") return;
    
    // sessionStorage 정리
    sessionStorage.removeItem('lastPhase');
    sessionStorage.removeItem('lastPlaceId');
    sessionStorage.removeItem('lastPlaceName');
    sessionStorage.removeItem('lastPlaceLat');
    sessionStorage.removeItem('lastPlaceLng');
    sessionStorage.removeItem('lastTravelMode');
    
    // 결과 화면으로 복귀
    if (aiResponse) {
      setOverlayState({
        type: "result",
        title: aiResponse.title,
        count: aiResponse.results.length,
      });
    } else {
      setOverlayState({ type: "idle" });
    }
  };

  // 🔥 Phase 33: 장소 저장 핸들러
  const handleSavePlace = () => {
    if (overlayState.type !== "phase33") return;
    
    // TODO: 장소 저장 로직 구현
    console.log("[Phase33] 장소 저장:", overlayState.placeId);
    speakInstruction("저장했어요");
  };

  // 🔥 Phase 33: 경로 공유 핸들러
  const handleShareRoute = () => {
    if (overlayState.type !== "phase33") return;
    
    const origin = userLocation || { lat: 37.5665, lng: 126.9780 };
    
    // 🔥 좌표 → 주소 변환 후 Google Maps URL 생성 (행정동 캐싱 우선)
    // 장소 데이터에서 adminDong/address/name 우선 사용 (비용 0원)
    const placeData = aiResponse?.results.find(r => r.id === overlayState.placeId);
    buildGoogleMapsUrl(
      origin, 
      { 
        lat: overlayState.lat, 
        lng: overlayState.lng,
        adminDong: (placeData as any)?.adminDong,
        name: placeData?.name,
        address: (placeData as any)?.address,
      }, 
      overlayState.travelMode
    ).then((url) => {
      if (navigator.share) {
        navigator.share({
          title: `${overlayState.placeName}로 가는 길`,
          text: `${overlayState.placeName}로 가는 경로를 공유합니다`,
          url: url,
        });
      } else {
        navigator.clipboard.writeText(url);
        speakInstruction("경로 링크를 복사했어요");
      }
    });
  };

  // 🔥 Overlay 닫기 핸들러 (FollowUp/Compare/Reason/TransportSelect/Phase33/Phase37 상태 처리)
  const handleCloseOverlay = () => {
    if (overlayState.type === "followup" || overlayState.type === "compare" || overlayState.type === "reason" || overlayState.type === "transport_select" || overlayState.type === "phase33" || overlayState.type === "phase37") {
      // sessionStorage 정리 (Phase 33/37 취소 시)
      if (overlayState.type === "phase33" || overlayState.type === "phase37") {
        // 🔥 Phase 35: 네비게이션 취소 이벤트
        logUXEvent('navigation_canceled', { placeId: overlayState.placeId });
        
        // 🔥 리모델링: UI 상태 전이 (navigating → idle)
        setUI('idle');
        
        sessionStorage.removeItem('lastPhase');
        sessionStorage.removeItem('lastPlaceId');
        sessionStorage.removeItem('lastPlaceName');
        sessionStorage.removeItem('lastPlaceLat');
        sessionStorage.removeItem('lastPlaceLng');
        sessionStorage.removeItem('lastTravelMode');
        phase33SpokenRef.current = false; // 🔥 Phase 34: 플래그 리셋
        speakInstruction("안내를 종료했어요");
      }
      
      // FollowUp/Compare/Reason/TransportSelect/Phase33 → Result로 복귀
      if (aiResponse) {
        setOverlayState({
          type: "result",
          title: aiResponse.title,
          count: aiResponse.results.length,
        });
        // 🔥 리모델링: UI 상태 전이 (navigating → result)
        setUI('result');
      } else {
        setOverlayState({ type: "idle" });
        // 🔥 리모델링: UI 상태 전이 (navigating → idle)
        setUI('idle');
      }
    }
  };

  // 🔥 리모델링: renderOverlay 완전 제거 (StatusPill + BottomActionSheet로 통합)
  // renderOverlay 함수 자체를 제거 (더 이상 사용되지 않음)

  return (
    // 🔥 리모델링: 부모(app-content)의 높이를 100% 차지 (flex 기반, absolute 제거)
    <div 
      className="map-page"
      style={{
        height: '100%', // 부모(app-content)의 높이를 100% 차지
        width: '100%',
        position: 'relative', // absolute 제거, relative로 변경
      }}
    >
      {/* 🔥 리모델링: 상단 교통수단 탭 (Header 바로 아래) */}
      <TransportTabs
        currentMode={overlayState.type === "phase33" ? navigationInfo?.travelMode : undefined}
        onSelect={handleTransportSelect}
      />

      {/* 🔥 지도 컨테이너 (부모 영역 전체 차지) */}
      <MapContainer>
        <MapInner>
          <GoogleMapCanvas onMapReady={handleMapReady} />
          
          {/* 🔥 리모델링 Step 1: 지도 위 유일 UI (상태 설명만) */}
          <MapStatusPill 
            ui={
              ui === 'idle' ? 'idle' :
              ui === 'result' ? 'result' :
              ui === 'error' ? 'error' :
              'idle' // loading, voice, navigating은 idle로 처리
            } 
          />
        </MapInner>
      </MapContainer>

        {/* 🔥 리모델링: 하단 액션 시트 (엄지 UX) */}
      <BottomActionSheet
          ui={ui}
          place={
            overlayState.type === "transport_select" || overlayState.type === "phase33" || overlayState.type === "phase37"
              ? { name: overlayState.placeName, id: overlayState.placeId }
              : undefined
          }
          onNavigate={() => {
            if (overlayState.type === "transport_select") {
              // 첫 번째 모드 선택 (기본값: WALKING)
              handleTransportSelect("WALKING");
            }
          }}
          onReopenRoute={handleReopenRoute}
          onCancel={handleCloseOverlay}
          onRetry={handleReopenRoute}
        />

      {/* 🔥 리모델링: 기존 AIOverlay 제거 (StatusPill + BottomActionSheet로 통합) */}
      {/* AIOverlayIntent, AIOverlaySummary, AIOverlayProactive, AIOverlaySilent 제거됨 */}
      {/* renderOverlay() 제거됨 (transport_select, phase33, phase37는 BottomActionSheet로 이동) */}

      {/* 🔥 네비게이션 모드 UI */}
      {mapMode === "navigation" && navigationInfo && (
        <>
          <NavigationStatusBar info={navigationInfo} isPaused={isNavigationPaused} />
          <TravelModeSelector
            currentMode={navigationInfo.travelMode}
            onSelect={changeTravelMode}
          />
          {/* 🔥 다음 행동 (하단 액션 큐) - Figma: ActionCue */}
          {nextStep && (
            <ActionCue
              type={nextStep.actionType}
              instruction={nextStep.instruction}
              distance={nextStep.distance}
            />
          )}
          {situationalCoaching && (
            <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 rounded-full bg-blue-600/90 backdrop-blur-md px-5 py-2.5 text-sm text-white shadow-xl border border-white/10 max-w-[90%]">
              <p className="text-center font-medium">{situationalCoaching}</p>
            </div>
          )}
          {cameraMode === "free" && (
            <FollowMeButton onRecenter={handleRecenterToRoute} />
          )}
          <NavigationControls
            onExit={exitNavigation}
            onNewSearch={handleNewSearch}
          />
          
          {/* 🔥 도착 UI (지도 사라지고 컨텍스트 전환) - Figma: ArrivalPanel */}
          {isArrived && navigationInfo && (
            <ArrivalPanel
              destinationName={navigationInfo.destination.name}
              crewId={(location.state as { crewId?: string } | null)?.crewId}
              onClose={() => {
                exitNavigation();
                if (!location.pathname.startsWith("/sports")) {
                  console.log("🔥 NAVIGATE HOME TRIGGERED [GeneralMapPage:arrivalPanel-onClose]", location.pathname);
                navigate("/home");
                }
              }}
            />
          )}
        </>
      )}

      {/* 🔥 결과 카드 리스트 (지도 아래, 스크롤 흐름) - 네비게이션 모드가 아닐 때만 표시 */}
      {aiResponse && overlayState.type === "result" && mapMode !== "navigation" && (
        <ResultList
          results={aiResponse.results.map((r) => ({
            ...r,
            distance: userLocation ? distanceMeters(userLocation, r) : undefined,
          }))}
          onSelect={(item) => {
            handleMarkerSelect(item);
            focusOnMap(item);
          }}
          onNavigate={(item) => {
            startNavigation({
              lat: item.lat,
              lng: item.lng,
              name: item.name,
            });
          }}
        />
      )}

      {/* 🔥 Phase 28: 첫 사용자 온보딩 (상단 중앙, Phase 20 Listening Indicator와 동일 톤) */}
      {/* 🔥 헤더 아래 배치 (겹침 방지) */}
      {showOnboarding && (
        <div 
          className="fixed left-1/2 -translate-x-1/2 z-50"
          style={{
            top: `calc(${HEADER_HEIGHT}px + env(safe-area-inset-top, 0px) + 20px)`,
          }}
        >
          <div className="rounded-full bg-black/80 backdrop-blur-sm px-6 py-3 text-white shadow-lg border border-white/10 animate-in fade-in slide-in-from-top-4 duration-300">
            {onboardingStep === 1 ? (
              <p className="text-sm font-medium">원하는 장소를 말해보세요</p>
            ) : (
              <div className="text-sm">
                <p className="font-medium">원하는 장소를 말해보세요</p>
                <p className="mt-1 text-xs text-neutral-300">
                  {onboardingExample}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔥 Phase 24: 방향 힌트 메시지 (하단, 2초 고정) */}
      {phase24Message && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full bg-black/80 backdrop-blur-sm text-white text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
          {phase24Message}
        </div>
      )}

      {/* 🔥 Phase 26: 최초 안내 메시지 (하단, 3초 고정) */}
      {phase26Message && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full bg-black/80 backdrop-blur-sm text-white text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
          {phase26Message}
        </div>
      )}

      {/* 🔥 Phase 26: 안내 그만할게요 버튼 (전체 경로 안내 중일 때만) */}
      {fullNavigationStarted && mapMode === "navigation" && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={stopNavigation}
            className="px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-medium shadow-lg border border-gray-200 hover:bg-white transition-colors"
          >
            안내 그만할게요
          </button>
        </div>
      )}

      {/* 🔥 리모델링: StateBar 제거 (StatusPill로 통합) */}
    </div>
  );
}

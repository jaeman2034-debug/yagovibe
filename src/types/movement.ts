/**
 * 🌍 Movement OS 타입 정의
 * 
 * YAGO는 더 이상 '지도 앱'이 아니다.
 * 사람이 움직이는 모든 순간을 관리하는 OS다.
 */

// 🔥 Layer 1: 의도 (Intent)
export type MovementIntent =
  | "solo_play"      // 혼자 운동
  | "team_practice"  // 팀 연습
  | "competition"    // 대회
  | "daily_routine"  // 일상 루틴
  | "recovery"       // 회복 / 산책 / 리프레시
  | "exploration";   // 탐험

// 🔥 Layer 3: 도착 이후 컨텍스트
export type ArrivalContext =
  | { type: "team"; teamId: string; activity: "practice" | "match" }
  | { type: "competition"; tournamentId: string; phase: string }
  | { type: "solo"; activity: "workout" | "recovery" }
  | { type: "exploration"; placeId: string }
  | { type: "next_suggestion"; suggestions: MovementSuggestion[] };

// 🔥 Movement Session (이동 세션)
export interface MovementSession {
  id: string;
  userId: string;
  
  // Layer 1: Intent
  intent: MovementIntent;
  destination: {
    lat: number;
    lng: number;
    name: string;
    type: "venue" | "team" | "competition" | "custom";
    id?: string; // 팀 ID, 대회 ID 등
  };
  
  // Layer 2: Navigation
  navigation: {
    travelMode: "WALKING" | "DRIVING" | "BICYCLING";
    duration: string; // "12분"
    distance: string; // "850m"
    route?: google.maps.DirectionsResult; // 경로 데이터 (선택적)
    startedAt: Date;
    completedAt?: Date;
  };
  
  // Layer 3: Context
  arrivalContext?: ArrivalContext;
  
  // 상태 추적
  condition: {
    start: "good" | "normal" | "tired";
    end?: "good" | "normal" | "tired";
  };
  
  routeCharacteristics: {
    quiet: boolean;
    flat: boolean;
    crowded: boolean;
  };
  
  // 학습 데이터
  preferences: {
    liked: boolean;
    reason?: string;
  };
  
  // 메타데이터
  createdAt: Date;
  updatedAt: Date;
}

// 🔥 홈 화면 상태
export type HomeState =
  | { type: "idle"; message: string; next?: MovementSuggestion }
  | { type: "navigating"; mode: string; timeRemaining: string; destination: string }
  | { type: "arrived"; context: ArrivalContext }
  | { type: "suggesting"; suggestions: MovementSuggestion[] };

// 🔥 Movement 제안
export interface MovementSuggestion {
  id: string;
  intent: MovementIntent;
  destination: {
    lat: number;
    lng: number;
    name: string;
  };
  reason: string; // "지난번 이 시간엔 이 길이 편했어요"
  estimatedDuration: string;
  estimatedDistance: string;
}

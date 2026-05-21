/**
 * 🔥 플랫폼 통합 스포츠 아이콘 시스템
 * 
 * 역할:
 * - 모든 스포츠 카테고리의 아이콘, 라벨, 메타데이터 통일 관리
 * - 허브/Activity/마켓/팀 전역에서 동일한 아이콘 체계 사용
 * - 플랫폼 시각 언어 통일
 * 
 * 사용 예시:
 * ```ts
 * import { SPORTS, getSportIcon, getSportLabel } from "@/constants/sports";
 * 
 * const icon = getSportIcon("baseball"); // "⚾"
 * const label = getSportLabel("baseball"); // "야구"
 * ```
 */

export type SportId = 
  | "baseball"      // 야구
  | "soccer"        // 축구 (football)
  | "basketball"    // 농구
  | "volleyball"    // 배구
  | "golf"          // 골프
  | "tennis"        // 테니스
  | "running"       // 러닝
  | "hiking"        // 아웃도어/등산
  | "badminton"     // 배드민턴
  | "table-tennis"  // 탁구
  | "swimming"      // 수영
  | "fitness"       // 헬스/피트니스
  | "yoga"          // 요가/필라테스
  | "climbing"      // 클라이밍
  | "billiards"     // 당구
  | "cycling"       // 사이클
  | "martial"       // 무술/격투
  | "winter"        // 겨울스포츠
  | "misc"          // 잡화
  | "other"         // 기타
  | "all";          // 전체

export interface SportConfig {
  id: SportId;
  label: string;
  icon: string;
  color?: string; // 선택적 색상 (필요시)
  category?: "ball" | "outdoor" | "fitness" | "water" | "winter" | "other"; // 카테고리 분류
}

/**
 * 🔥 플랫폼 통합 스포츠 설정
 * 
 * 모든 스포츠의 아이콘, 라벨, 메타데이터를 통일 관리
 */
export const SPORTS: Record<SportId, SportConfig> = {
  baseball: {
    id: "baseball",
    label: "야구",
    icon: "⚾",
    category: "ball",
  },
  soccer: {
    id: "soccer",
    label: "축구",
    icon: "⚽",
    category: "ball",
  },
  basketball: {
    id: "basketball",
    label: "농구",
    icon: "🏀",
    category: "ball",
  },
  volleyball: {
    id: "volleyball",
    label: "배구",
    icon: "🏐",
    category: "ball",
  },
  badminton: {
    id: "badminton",
    label: "배드민턴",
    icon: "🏸",
    category: "ball",
  },
  tennis: {
    id: "tennis",
    label: "테니스",
    icon: "🎾",
    category: "ball",
  },
  "table-tennis": {
    id: "table-tennis",
    label: "탁구",
    icon: "🏓",
    category: "ball",
  },
  golf: {
    id: "golf",
    label: "골프",
    icon: "⛳",
    category: "ball",
  },
  running: {
    id: "running",
    label: "러닝",
    icon: "🏃",
    category: "outdoor",
  },
  hiking: {
    id: "hiking",
    label: "아웃도어",
    icon: "🏞️",
    category: "outdoor",
  },
  climbing: {
    id: "climbing",
    label: "클라이밍",
    icon: "🧗",
    category: "outdoor",
  },
  yoga: {
    id: "yoga",
    label: "요가/필라테스",
    icon: "🧘",
    category: "fitness",
  },
  swimming: {
    id: "swimming",
    label: "수영",
    icon: "🏊",
    category: "water",
  },
  cycling: {
    id: "cycling",
    label: "사이클",
    icon: "🚴",
    category: "outdoor",
  },
  martial: {
    id: "martial",
    label: "무술/격투",
    icon: "🥋",
    category: "other",
  },
  winter: {
    id: "winter",
    label: "겨울스포츠",
    icon: "🎿",
    category: "winter",
  },
  fitness: {
    id: "fitness",
    label: "헬스/피트니스",
    icon: "🏋️",
    category: "fitness",
  },
  billiards: {
    id: "billiards",
    label: "당구",
    icon: "🎱",
    category: "other",
  },
  misc: {
    id: "misc",
    label: "잡화",
    icon: "📦",
    category: "other",
  },
  other: {
    id: "other",
    label: "기타",
    icon: "🏆",
    category: "other",
  },
  all: {
    id: "all",
    label: "전체",
    icon: "🌟",
    category: "other",
  },
} as const;

/**
 * 🔥 스포츠 아이콘 가져오기
 */
export function getSportIcon(sportId: SportId | string | null | undefined): string {
  if (!sportId) return "🏆";
  const sport = SPORTS[sportId as SportId];
  return sport?.icon || "🏆";
}

/**
 * 🔥 스포츠 라벨 가져오기
 */
export function getSportLabel(sportId: SportId | string | null | undefined): string {
  if (!sportId) return "기타";
  const sport = SPORTS[sportId as SportId];
  return sport?.label || sportId;
}

/**
 * 🔥 스포츠 설정 가져오기
 */
export function getSportConfig(sportId: SportId | string | null | undefined): SportConfig | null {
  if (!sportId) return null;
  return SPORTS[sportId as SportId] || null;
}

/**
 * 🔥 모든 스포츠 목록 가져오기 (전체 제외)
 */
export function getAllSports(): SportConfig[] {
  return Object.values(SPORTS).filter(sport => sport.id !== "all");
}

/**
 * 🔥 카테고리별 스포츠 가져오기
 */
export function getSportsByCategory(category: SportConfig["category"]): SportConfig[] {
  return Object.values(SPORTS).filter(sport => sport.category === category);
}

/**
 * 🔥 주요 스포츠 목록 (허브 기본 표시용)
 */
export const POPULAR_SPORTS: SportId[] = [
  "soccer",
  "baseball",
  "basketball",
  "volleyball",
  "badminton",
  "tennis",
];

/**
 * 🔥 레거시 호환성: 기존 id 매핑
 */
export const LEGACY_SPORT_MAP: Record<string, SportId> = {
  football: "soccer",
  pingpong: "table-tennis",
  "ping-pong": "table-tennis",
  futsal: "soccer",
  gym: "fitness",
  pilates: "yoga",
  footsal: "soccer", // 흔한 오타
  futbol: "soccer",  // 다국어 별칭
};

/**
 * 🔥 레거시 id를 새 id로 변환
 */
export function normalizeSportId(sportId: string | null | undefined): SportId | null {
  if (!sportId) return null;
  
  // 레거시 매핑 확인
  if (LEGACY_SPORT_MAP[sportId]) {
    return LEGACY_SPORT_MAP[sportId];
  }
  
  // 직접 매칭
  if (sportId in SPORTS) {
    return sportId as SportId;
  }
  
  return null;
}

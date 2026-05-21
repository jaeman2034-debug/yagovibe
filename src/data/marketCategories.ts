/**
 * 🔥 마켓 카테고리 설정 (중앙화)
 * 
 * 카테고리 자동 분기 구조:
 * - 카테고리 메타데이터 중앙 관리
 * - 확장성: 새 카테고리 추가 시 여기만 수정
 * - 타입 안정성: MarketCategory 타입과 동기화
 */

import type { MarketCategory } from "@/types/market";

export interface CategoryConfig {
  id: MarketCategory;
  label: string;
  description?: string;
  icon?: string; // 나중에 아이콘 추가 가능
  color?: string; // 나중에 색상 테마 추가 가능
  enabled: boolean; // 활성화 여부
  order: number; // UI 표시 순서
}

/**
 * 🔥 카테고리 설정 목록
 * 
 * 구조:
 * - id: Firestore 필드값과 일치
 * - label: UI 표시명
 * - enabled: 현재 활성화된 카테고리만 true
 * - order: 탭 표시 순서 (낮을수록 앞에)
 */
export const MARKET_CATEGORIES: CategoryConfig[] = [
  {
    id: "all",
    label: "전체",
    description: "모든 카테고리",
    enabled: true,
    order: 0,
  },
  {
    id: "equipment",
    label: "중고",
    description: "중고 장비 거래",
    enabled: true,
    order: 1,
  },
  {
    id: "recruit",
    label: "모집",
    description: "팀원/멤버 모집",
    enabled: true,
    order: 2,
  },
  {
    id: "match",
    label: "매칭",
    description: "경기/연습 매칭",
    enabled: true,
    order: 3,
  },
  // 🔥 향후 확장 가능한 카테고리 (현재 비활성화)
  {
    id: "lesson",
    label: "레슨",
    description: "레슨/코칭",
    enabled: false,
    order: 4,
  },
  {
    id: "ground",
    label: "구장양도",
    description: "구장 대여/양도",
    enabled: false,
    order: 5,
  },
  {
    id: "ticket",
    label: "티켓",
    description: "경기 티켓 거래",
    enabled: false,
    order: 6,
  },
];

/**
 * 🔥 활성화된 카테고리만 필터링
 */
export const ENABLED_CATEGORIES = MARKET_CATEGORIES.filter(cat => cat.enabled);

/**
 * 🔥 order 기준 정렬된 활성 카테고리
 */
export const SORTED_CATEGORIES = [...ENABLED_CATEGORIES].sort((a, b) => a.order - b.order);

/**
 * 🔥 카테고리 ID로 설정 찾기
 */
export function getCategoryConfig(categoryId: MarketCategory): CategoryConfig | undefined {
  return MARKET_CATEGORIES.find(cat => cat.id === categoryId);
}

/**
 * 🔥 카테고리 ID로 설정 찾기 (호환성용 별칭)
 * @deprecated getCategoryConfig 사용 권장
 */
export function getCategoryById(categoryId: MarketCategory | string) {
  const config = MARKET_CATEGORIES.find(cat => cat.id === categoryId);
  if (!config) return undefined;
  
  return {
    id: config.id,
    name: config.label, // label을 name으로 매핑
    icon: config.icon,
    label: config.label,
    description: config.description,
    color: config.color,
  };
}

/**
 * 🔥 기본 카테고리 (전체)
 */
export const DEFAULT_CATEGORY: MarketCategory = "all";

/**
 * 🔥 카테고리 유효성 검증
 */
export function isValidCategory(category: string): category is MarketCategory {
  return MARKET_CATEGORIES.some(cat => cat.id === category);
}

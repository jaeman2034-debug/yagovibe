// src/constants/sportCategories.ts
// 🔥 종목 카테고리 마스터 (허브 기준 전체 + 잡화/기타)

export interface SportCategory {
  id: string;
  name: string;
  icon?: string; // 아이콘 선택형 UI용 (선택사항)
}

export const SPORT_CATEGORIES: SportCategory[] = [
  { id: "baseball", name: "야구", icon: "⚾" },
  { id: "soccer", name: "축구", icon: "⚽" },
  { id: "basketball", name: "농구", icon: "🏀" },
  { id: "volleyball", name: "배구", icon: "🏐" },
  { id: "golf", name: "골프", icon: "⛳" },
  { id: "parkgolf", name: "파크골프", icon: "🏌️" },
  { id: "tennis", name: "테니스", icon: "🎾" },
  { id: "running", name: "러닝", icon: "🏃" },
  { id: "outdoor", name: "아웃도어", icon: "🏔️" },
  { id: "badminton", name: "배드민턴", icon: "🏸" },
  { id: "pingpong", name: "탁구", icon: "🏓" },
  { id: "swimming", name: "수영", icon: "🏊" },
  { id: "fitness", name: "헬스/피트니스", icon: "💪" },
  { id: "yoga", name: "요가/필라테스", icon: "🧘" },
  { id: "climbing", name: "클라이밍", icon: "🧗" },
  { id: "billiards", name: "당구", icon: "🎱" },
  // 추가
  { id: "goods", name: "잡화", icon: "🛍️" },
  { id: "etc", name: "기타", icon: "🏆" },
];

// ID로 카테고리 찾기
export function getSportCategoryById(id: string | null | undefined): SportCategory | null {
  if (!id) return null;
  return SPORT_CATEGORIES.find((cat) => cat.id === id) || null;
}

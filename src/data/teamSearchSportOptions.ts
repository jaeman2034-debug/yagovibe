/**
 * 팀 찾기(FilterBar) 종목 옵션 — Firestore `teams.sportType` 과 맞춘 value + 표시 라벨
 * (레거시 축구는 `football`, 허브 슬러그는 teamSearchQuery에서 `soccer`로 매핑)
 */

export type TeamSearchSportOption = {
  value: string;
  label: string;
  icon: string;
};

/** 서비스 기준 16종 — value는 팀 문서에 흔히 쓰이는 문자열 위주 */
export const TEAM_SEARCH_SPORT_OPTIONS: TeamSearchSportOption[] = [
  { value: "football", label: "축구", icon: "⚽" },
  { value: "futsal", label: "풋살", icon: "⚽" },
  { value: "basketball", label: "농구", icon: "🏀" },
  { value: "baseball", label: "야구", icon: "⚾" },
  { value: "volleyball", label: "배구", icon: "🏐" },
  { value: "badminton", label: "배드민턴", icon: "🏸" },
  { value: "tennis", label: "테니스", icon: "🎾" },
  { value: "table-tennis", label: "탁구", icon: "🏓" },
  { value: "golf", label: "골프", icon: "⛳" },
  { value: "swimming", label: "수영", icon: "🏊" },
  { value: "running", label: "러닝", icon: "🏃" },
  { value: "cycling", label: "자전거", icon: "🚴" },
  { value: "fitness", label: "헬스", icon: "🏋️" },
  { value: "climbing", label: "클라이밍", icon: "🧗" },
  { value: "bowling", label: "볼링", icon: "🎳" },
  { value: "esports", label: "e스포츠", icon: "🎮" },
];

import type { Sport } from "@/features/market/types";

/** 홈 허브 스포츠 칩과 동일 — 마켓 등록 등에서 sportId로 저장/라우팅에 사용 */
export type SportsCategoryRow = {
  name: string;
  icon: string;
  path: string;
  sportId: Sport;
};

export const sportsCategories: SportsCategoryRow[] = [
  { name: "야구", icon: "⚾", path: "/app/team", sportId: "baseball" },
  { name: "축구", icon: "⚽", path: "/app/team", sportId: "soccer" },
  { name: "농구", icon: "🏀", path: "/app/event", sportId: "basketball" },
  { name: "배구", icon: "🏐", path: "/app/facility", sportId: "volleyball" },
  { name: "골프", icon: "🏌️", path: "/app/facility", sportId: "golf" },
  { name: "파크골프", icon: "⛳", path: "/app/facility", sportId: "golf" },
  { name: "테니스", icon: "🎾", path: "/app/facility", sportId: "tennis" },
  { name: "러닝", icon: "🏃", path: "/voice-map", sportId: "running" },
  { name: "아웃도어", icon: "🏞️", path: "/voice-map", sportId: "hiking" },
  { name: "배드민턴", icon: "🏸", path: "/app/facility", sportId: "badminton" },
  { name: "탁구", icon: "🏓", path: "/app/facility", sportId: "table-tennis" },
  { name: "수영", icon: "🏊", path: "/voice-map", sportId: "swimming" },
  { name: "헬스/피트니스", icon: "💪", path: "/app/market", sportId: "fitness" },
  { name: "요가/필라테스", icon: "🧘", path: "/app/facility", sportId: "yoga" },
  { name: "클라이밍", icon: "🧗", path: "/app/facility", sportId: "climbing" },
  { name: "기타", icon: "🏅", path: "/app/market", sportId: "other" },
];

const homeSportIdSet = new Set<Sport>(sportsCategories.map((row) => row.sportId));

export function isHomeSportsCategorySportId(id: string | null | undefined): id is Sport {
  return typeof id === "string" && homeSportIdSet.has(id as Sport);
}


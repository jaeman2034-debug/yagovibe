/**
 * 🔥 Sport Type 정의 (공유 타입)
 * 
 * 멀티 스포츠 지원을 위한 중앙 집중식 타입 정의
 */

export type SportType =
  | "soccer"
  | "basketball"
  | "baseball"
  | "badminton"
  | "running"
  | "volleyball"
  | "tennis"
  | "golf"
  | "fitness"
  | "yoga"
  | "climbing"
  | "swimming"
  | "table-tennis"
  | "billiards";

/** Firestore `matches.sport` 등에 쓰는 슬러그인지 검사 (허브 SportId와 교집합) */
const SPORT_TYPE_SLUGS = new Set<string>([
  "soccer",
  "basketball",
  "baseball",
  "badminton",
  "running",
  "volleyball",
  "tennis",
  "golf",
  "fitness",
  "yoga",
  "climbing",
  "swimming",
  "table-tennis",
  "billiards",
]);

export function isSportTypeSlug(s: string | null | undefined): s is SportType {
  if (!s) return false;
  return SPORT_TYPE_SLUGS.has(s);
}

/**
 * SportType을 한글 라벨로 변환
 */
export function getSportLabel(sport: SportType): string {
  const labels: Record<SportType, string> = {
    soccer: "축구",
    basketball: "농구",
    baseball: "야구",
    badminton: "배드민턴",
    running: "러닝",
    volleyball: "배구",
    tennis: "테니스",
    golf: "골프",
    fitness: "헬스/피트니스",
    yoga: "요가/필라테스",
    climbing: "클라이밍",
    swimming: "수영",
    "table-tennis": "탁구",
    billiards: "당구",
  };
  return labels[sport] || sport;
}

/**
 * 🔥 마켓 타입 정의
 */

export type Sport = 
  | "baseball"      // 야구
  | "soccer"        // 축구
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
  | "misc"          // 잡화
  | "other";        // 기타

export type MarketCategory =
  | "all"
  | "equipment"  // 중고
  | "recruit"    // 모집
  | "match"      // 매칭
  | "lesson"     // 레슨
  | "ground"     // 구장양도
  | "ticket";    // 티켓

export type MarketView = "sport" | "all";

export interface MarketPost {
  id: string;
  sport: Sport;
  /** 홈 종목 키와 동일(필터용). `category`는 MarketCategory(중고 등) */
  sportCategory?: Sport;
  category: MarketCategory;
  /** 세부 유형 (예: equipment + `lost`) */
  subType?: string;
  title: string;
  description?: string;
  price?: number;
  location?: string;
  images: string[];
  thumbnailUrl?: string; // 🔥 썸네일 (리스트용, 없으면 images[0] 사용)
  status: "open" | "active" | "reserved" | "completed" | "done" | "hidden"; // done은 레거시 호환
  reservedBy?: string | null; // 예약한 사용자 uid
  reservedAt?: number | any | null; // 예약 시각 (Firestore Timestamp)
  createdAt: number | any; // Firestore Timestamp or number
  authorId: string;
  authorName?: string;
  authorFaceToFaceVerified?: boolean; // 🔥 작성자 대면 인증
  authorRealNameVerified?: boolean; // 🔥 작성자 실명 인증
  authorTrustTier?: "guest" | "basic" | "verified" | "trusted" | "top" | "host"; // 🔥 작성자 신뢰도 등급 (host는 레거시 호환)
  viewCount?: number;
  likeCount?: number;
  
  // 🔥 카테고리별 특화 필드
  
  // 중고 (equipment)
  condition?: "new" | "like_new" | "used" | "poor"; // 상태
  brand?: string; // 브랜드
  
  // 모집 (recruit)
  people?: number; // 모집 인원수
  currentPeople?: number; // 현재 인원수
  position?: string[]; // 모집 포지션 ["FW", "MF", "DF", "GK"]
  level?: "입문" | "아마" | "프로지향"; // 실력 레벨
  ageRange?: string; // 연령대 "20-30"
  practiceDay?: string[]; // 연습 요일
  practiceLocation?: string; // 연습 장소
  
  // 매칭 (match)
  matchDate?: number | any; // 경기 날짜/시간 (Timestamp)
  matchType?: "5v5" | "7v7" | "11v11"; // 경기 형식
  fee?: number; // 참가비

  // 팀 연결(모집/매칭 등)
  teamId?: string;
  teamName?: string;
}

export interface MarketQueryParams {
  contextSport: Sport;
  view: MarketView;
  category: MarketCategory;
  limit: number;
  cursor?: any;
}

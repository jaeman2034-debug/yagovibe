// src/utils/parseVoiceQuery.ts
// 🔥 음성 검색 파싱 유틸리티 (규칙 기반 v1)

import { MARKET_CATEGORIES } from "@/data/marketCategories";

export interface ParsedVoiceQuery {
  query: string; // 기본 검색어
  category: string | null; // 카테고리 ID
  size: number | null; // 사이즈 (250~300)
  brand: string | null; // 브랜드
  location: string | null; // 위치 키워드
  sort: "priceAsc" | "priceDesc" | "latest" | null; // 정렬
  condition: "A" | "B" | "C" | null; // 상태
}

/**
 * 음성 입력을 파싱하여 검색 파라미터로 변환
 * 
 * 예시:
 * "러닝화 270 상태 좋은 거" → { query: "러닝화", category: "러닝", size: 270, condition: "A" }
 * "헬스 벤치 강남 근처" → { query: "헬스 벤치", category: "헬스/피트니스", location: "강남" }
 * "축구화 나이키 싸게" → { query: "축구화", category: "축구/풋살", brand: "나이키", sort: "priceAsc" }
 */
export function parseVoiceQuery(text: string): ParsedVoiceQuery {
  const lower = text.toLowerCase().trim();
  
  const result: ParsedVoiceQuery = {
    query: text,
    category: null,
    size: null,
    brand: null,
    location: null,
    sort: null,
    condition: null,
  };

  // 1. 카테고리 파싱
  const categoryKeywords: Record<string, string> = {
    "러닝화": "러닝",
    "러닝": "러닝",
    "축구화": "축구/풋살",
    "축구": "축구/풋살",
    "풋살": "축구/풋살",
    "농구화": "농구",
    "농구": "농구",
    "헬스": "헬스/피트니스",
    "피트니스": "헬스/피트니스",
    "벤치": "헬스/피트니스",
    "덤벨": "헬스/피트니스",
    "바벨": "헬스/피트니스",
    "등산": "등산/아웃도어",
    "등산화": "등산/아웃도어",
    "아웃도어": "등산/아웃도어",
    "홈트": "홈트",
    "요가": "요가/필라테스",
    "필라테스": "요가/필라테스",
    "골프": "골프",
    "골프채": "골프",
    "테니스": "테니스",
    "배드민턴": "배드민턴",
    "자전거": "자전거",
    "수영": "수영",
  };

  for (const [keyword, categoryId] of Object.entries(categoryKeywords)) {
    if (lower.includes(keyword)) {
      result.category = categoryId;
      break;
    }
  }

  // 2. 사이즈 파싱 (250~300)
  const sizeMatch = lower.match(/\b(2[5-9]\d|300)\b/);
  if (sizeMatch) {
    result.size = parseInt(sizeMatch[1], 10);
  }

  // 3. 브랜드 파싱
  const brands = ["나이키", "아디다스", "푸마", "언더아머", "뉴발란스", "아식스", "미즈노", "컨버스", "반스"];
  for (const brand of brands) {
    if (lower.includes(brand.toLowerCase())) {
      result.brand = brand;
      break;
    }
  }

  // 4. 위치 키워드 파싱
  const locationKeywords = ["강남", "홍대", "역삼", "잠실", "송파", "강동", "서초", "용산", "마포", "근처", "동네", "가까운"];
  for (const loc of locationKeywords) {
    if (lower.includes(loc)) {
      result.location = loc === "근처" || loc === "동네" || loc === "가까운" ? "nearby" : loc;
      break;
    }
  }

  // 5. 상태/가격 힌트 파싱
  if (lower.includes("상태 좋") || lower.includes("새것") || lower.includes("거의 새")) {
    result.condition = "A";
  } else if (lower.includes("상태 보통") || lower.includes("사용감")) {
    result.condition = "B";
  } else if (lower.includes("상태 나쁜") || lower.includes("낡은")) {
    result.condition = "C";
  }

  // 6. 정렬 힌트 파싱
  if (lower.includes("싸게") || lower.includes("저렴") || lower.includes("가격 낮")) {
    result.sort = "priceAsc";
  } else if (lower.includes("비싼") || lower.includes("가격 높")) {
    result.sort = "priceDesc";
  } else if (lower.includes("최신") || lower.includes("새로")) {
    result.sort = "latest";
  }

  // 7. 기본 검색어 정리 (카테고리/브랜드/사이즈 제거)
  let cleanedQuery = text;
  
  // 카테고리 키워드 제거
  for (const keyword of Object.keys(categoryKeywords)) {
    cleanedQuery = cleanedQuery.replace(new RegExp(keyword, "gi"), "").trim();
  }
  
  // 브랜드 제거
  if (result.brand) {
    cleanedQuery = cleanedQuery.replace(new RegExp(result.brand, "gi"), "").trim();
  }
  
  // 사이즈 제거
  if (result.size) {
    cleanedQuery = cleanedQuery.replace(new RegExp(String(result.size), "g"), "").trim();
  }
  
  // 상태/가격 힌트 제거
  cleanedQuery = cleanedQuery
    .replace(/상태\s*(좋|나쁜|보통)/gi, "")
    .replace(/싸게|저렴|비싼|최신|새로/gi, "")
    .replace(/근처|동네|가까운/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  result.query = cleanedQuery || text; // 정리된 게 없으면 원본 사용

  return result;
}


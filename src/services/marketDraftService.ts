/**
 * 🔥 마켓 글쓰기 Draft(임시저장) 서비스
 * localStorage 기반 (v1)
 * 
 * 향후 Firestore로 확장 가능 (멀티 디바이스 지원)
 */

import type { Sport, MarketCategory } from "@/types/market";
import type { ImagePipelineResult } from "@/utils/imagePipeline";

export interface MarketDraft {
  sport: Sport;
  category: MarketCategory;
  title?: string;
  description?: string;
  price?: string;
  // 🔥 이미지: 업로드된 URL만 저장 (v1)
  images?: string[]; // originalUrl 배열
  // 🔥 카테고리별 특화 필드
  condition?: "new" | "like_new" | "used" | "poor";
  brand?: string;
  location?: string;
  // recruit
  people?: string;
  currentPeople?: string;
  selectedPositions?: string[];
  level?: "입문" | "아마" | "프로지향";
  ageRange?: string;
  practiceDay?: string;
  practiceLocation?: string;
  // match
  matchDate?: string;
  matchTime?: string;
  matchType?: "5v5" | "7v7" | "11v11";
  fee?: string;
  // 메타데이터
  updatedAt: number; // timestamp
}

const STORAGE_PREFIX = "marketDraft";

/**
 * 🔥 Draft 저장소 키 생성
 */
function getDraftKey(uid: string, sport: Sport, category: MarketCategory): string {
  return `${STORAGE_PREFIX}:${uid}:${sport}:${category}`;
}

/**
 * 🔥 Draft 저장
 */
export function saveMarketDraft(
  uid: string,
  sport: Sport,
  category: MarketCategory,
  draft: Partial<MarketDraft>
): void {
  try {
    const key = getDraftKey(uid, sport, category);
    const fullDraft: MarketDraft = {
      sport,
      category,
      ...draft,
      updatedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(fullDraft));
    console.log("✅ [MarketDraft] Draft 저장 완료:", { sport, category });
  } catch (error) {
    console.error("❌ [MarketDraft] Draft 저장 실패:", error);
  }
}

/**
 * 🔥 Draft 조회
 */
export function getMarketDraft(
  uid: string,
  sport: Sport,
  category: MarketCategory
): MarketDraft | null {
  try {
    const key = getDraftKey(uid, sport, category);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const draft = JSON.parse(stored) as MarketDraft;
    console.log("✅ [MarketDraft] Draft 조회 완료:", { sport, category });
    return draft;
  } catch (error) {
    console.error("❌ [MarketDraft] Draft 조회 실패:", error);
    return null;
  }
}

/**
 * 🔥 Draft 삭제
 */
export function deleteMarketDraft(
  uid: string,
  sport: Sport,
  category: MarketCategory
): void {
  try {
    const key = getDraftKey(uid, sport, category);
    localStorage.removeItem(key);
    console.log("✅ [MarketDraft] Draft 삭제 완료:", { sport, category });
  } catch (error) {
    console.error("❌ [MarketDraft] Draft 삭제 실패:", error);
  }
}

/**
 * 🔥 사용자의 모든 Draft 목록 조회
 */
export function getAllMarketDrafts(uid: string): Array<{ sport: Sport; category: MarketCategory; updatedAt: number }> {
  try {
    const prefix = `${STORAGE_PREFIX}:${uid}:`;
    const drafts: Array<{ sport: Sport; category: MarketCategory; updatedAt: number }> = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const draft = JSON.parse(stored) as MarketDraft;
            drafts.push({
              sport: draft.sport,
              category: draft.category,
              updatedAt: draft.updatedAt,
            });
          }
        } catch (err) {
          console.warn("⚠️ [MarketDraft] Draft 파싱 실패:", key, err);
        }
      }
    }
    
    return drafts.sort((a, b) => b.updatedAt - a.updatedAt); // 최신순 정렬
  } catch (error) {
    console.error("❌ [MarketDraft] Draft 목록 조회 실패:", error);
    return [];
  }
}

/**
 * 🔥 특정 sport+category에 Draft 존재 여부 확인
 */
export function hasMarketDraft(
  uid: string,
  sport: Sport,
  category: MarketCategory
): boolean {
  const draft = getMarketDraft(uid, sport, category);
  return draft !== null;
}

/**
 * 🔥 Draft에서 이미지 URL 추출 (업로드된 것만)
 */
export function extractDraftImages(images: ImagePipelineResult[]): string[] {
  return images
    .filter((img) => img.originalUrl) // 업로드된 것만
    .map((img) => img.originalUrl);
}

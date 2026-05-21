/**
 * 🔥 Search 서비스
 * 
 * 역할:
 * - Global Search 조회
 * - Search Index 조회
 * - 자동완성 검색
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type SearchEntityType = "team" | "player" | "event";

export interface SearchIndexItem {
  id: string;
  entityType: SearchEntityType;
  entityId: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  url: string;
  searchName: string;
  searchKeywords: string[];
  stats?: {
    matches?: number;
    wins?: number;
    goals?: number;
    appearances?: number;
    assists?: number;
  };
  isActive: boolean;
  updatedAt: any;
}

/**
 * Global Search 조회
 */
export async function globalSearch(
  queryText: string,
  options?: { limit?: number }
): Promise<{
  teams: SearchIndexItem[];
  players: SearchIndexItem[];
  events: SearchIndexItem[];
}> {
  if (!queryText || queryText.trim().length === 0) {
    return { teams: [], players: [], events: [] };
  }

  try {
    const normalizedQuery = normalizeSearchText(queryText);
    const searchLimit = options?.limit || 10;

    // searchKeywords에 포함된 항목 검색
    const searchQuery = query(
      collection(db, "search_index"),
      where("searchKeywords", "array-contains", normalizedQuery),
      where("isActive", "==", true),
      orderBy("updatedAt", "desc"),
      limit(searchLimit * 3) // 각 타입별로 필터링하기 위해 더 많이 가져옴
    );

    const snapshot = await getDocs(searchQuery);
    const allResults: SearchIndexItem[] = [];

    snapshot.forEach((doc) => {
      allResults.push({
        id: doc.id,
        ...doc.data(),
      } as SearchIndexItem);
    });

    // 타입별로 분류
    const teams = allResults
      .filter((item) => item.entityType === "team")
      .slice(0, searchLimit);
    const players = allResults
      .filter((item) => item.entityType === "player")
      .slice(0, searchLimit);
    const events = allResults
      .filter((item) => item.entityType === "event")
      .slice(0, searchLimit);

    return { teams, players, events };
  } catch (error) {
    console.error("[globalSearch] 검색 실패:", error);
    return { teams: [], players: [], events: [] };
  }
}

/**
 * 자동완성 검색 (상위 N개)
 */
export async function searchAutocomplete(
  queryText: string,
  limitCount: number = 5
): Promise<SearchIndexItem[]> {
  if (!queryText || queryText.trim().length === 0) {
    return [];
  }

  try {
    const normalizedQuery = normalizeSearchText(queryText);

    const searchQuery = query(
      collection(db, "search_index"),
      where("searchKeywords", "array-contains", normalizedQuery),
      where("isActive", "==", true),
      orderBy("updatedAt", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(searchQuery);
    const results: SearchIndexItem[] = [];

    snapshot.forEach((doc) => {
      results.push({
        id: doc.id,
        ...doc.data(),
      } as SearchIndexItem);
    });

    return results;
  } catch (error) {
    console.error("[searchAutocomplete] 자동완성 실패:", error);
    return [];
  }
}

/**
 * 타입별 검색
 */
export async function searchByType(
  entityType: SearchEntityType,
  queryText: string,
  options?: { limit?: number }
): Promise<SearchIndexItem[]> {
  if (!queryText || queryText.trim().length === 0) {
    return [];
  }

  try {
    const normalizedQuery = normalizeSearchText(queryText);
    const searchLimit = options?.limit || 20;

    const searchQuery = query(
      collection(db, "search_index"),
      where("entityType", "==", entityType),
      where("searchKeywords", "array-contains", normalizedQuery),
      where("isActive", "==", true),
      orderBy("updatedAt", "desc"),
      limit(searchLimit)
    );

    const snapshot = await getDocs(searchQuery);
    const results: SearchIndexItem[] = [];

    snapshot.forEach((doc) => {
      results.push({
        id: doc.id,
        ...doc.data(),
      } as SearchIndexItem);
    });

    return results;
  } catch (error) {
    console.error("[searchByType] 검색 실패:", error);
    return [];
  }
}

/**
 * 검색 텍스트 정규화
 */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * 검색 키워드 생성 (prefix 기반)
 */
export function generateSearchKeywords(text: string): string[] {
  const normalized = normalizeSearchText(text);
  const keywords: string[] = [];

  // 1글자부터 전체까지 모든 prefix
  for (let i = 1; i <= normalized.length; i++) {
    keywords.push(normalized.substring(0, i));
  }

  return keywords;
}

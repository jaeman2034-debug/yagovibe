/**
 * 🔥 시맨틱 검색 훅 (v2 - 검색 랭킹 시스템 포함)
 * 
 * 역할:
 * - 사용자 쿼리 → 시맨틱 검색
 * - searchScore 계산 및 정렬
 * - 결과 반환
 */

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { functions, db } from "@/lib/firebase";
import type { MarketPost } from "@/types/market";
import type { User } from "@/types/user";
import { calculateAndSortBySearchScore } from "@/utils/searchScoring";

interface SearchResult {
  id: string;
  score: number;
  [key: string]: any;
}

interface SearchResponse {
  success: boolean;
  query: string;
  results: SearchResult[];
  count: number;
}

/**
 * 시맨틱 검색 훅 (v2)
 */
export function useSemanticSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (
    query: string,
    limit: number = 20
  ): Promise<MarketPost[] | null> => {
    if (!query || query.trim().length === 0) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const searchMarket = httpsCallable(functions, "searchMarket");
      const result = await searchMarket({ query: query.trim(), limit: limit * 2 }); // Shadow Ban 필터링을 위해 여유있게 가져옴
      const data = result.data as SearchResponse;

      if (!data.success || !data.results) {
        return [];
      }

      // 🔥 v2: MarketPost로 변환 및 Shadow Ban 필터링
      const posts: MarketPost[] = data.results
        .map((r) => ({
          id: r.id,
          ...r,
        }))
        .filter((post: MarketPost) => !post.isShadowBanned) // Shadow Ban 제외
        .slice(0, limit) as MarketPost[];

      // 🔥 v2: 작성자 정보 조회 및 searchScore 계산
      const authorIds = [...new Set(posts.map(post => post.authorId))];
      const authorDataMap = new Map<string, User>();
      
      // 작성자 정보 병렬 조회
      await Promise.all(
        authorIds.map(async (authorId) => {
          try {
            const userRef = doc(db, "users", authorId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              authorDataMap.set(authorId, { uid: authorId, ...userSnap.data() } as User);
            }
          } catch (err) {
            console.warn(`⚠️ 작성자 정보 조회 실패 (${authorId}):`, err);
          }
        })
      );
      
      // 🔥 searchScore 계산 및 정렬
      const postsWithSearchScore = calculateAndSortBySearchScore(
        posts,
        query.trim(),
        authorDataMap
      );
      
      // 🔥 최종 결과: searchScore 기준 정렬된 상위 N개
      const finalPosts = postsWithSearchScore
        .slice(0, limit)
        .map(({ searchScore, ...post }) => post); // searchScore는 계산용이므로 제거
      
      console.log(`✅ [useSemanticSearch] 검색 완료: ${finalPosts.length}개 (searchScore 기반 정렬)`);
      
      // 🔥 검색 실행 트래킹
      import("@/lib/analytics").then(({ trackMarket }) => {
        trackMarket.search({
          keyword: query.trim(),
          resultCount: finalPosts.length,
          source: 'semantic_search',
        });
      }).catch((err) => {
        console.warn("⚠️ 트래킹 실패 (무시):", err);
      });

      return finalPosts;
    } catch (err: any) {
      console.error("❌ [useSemanticSearch] 검색 실패:", err);
      setError(err.message || "검색 중 오류가 발생했습니다.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { search, loading, error };
}

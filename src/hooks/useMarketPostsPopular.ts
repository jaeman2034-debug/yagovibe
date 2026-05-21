/**
 * 🔥 인기글 조회 Hook
 * 
 * 쿼리 분기:
 * 1. 전체: orderBy("rankScore", "desc")
 * 2. sport: where("sport", "==", sport) + orderBy("rankScore", "desc")
 * 3. sport+category: where("sport", "==", sport) + where("category", "==", category) + orderBy("rankScore", "desc")
 */

import { useState, useEffect } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { collection, query, where, orderBy, limit, startAfter, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MarketPost, Sport, MarketCategory } from "@/types/market";

const DEFAULT_LIMIT = 20;

export interface PopularPostsQuery {
  sport?: Sport;
  category?: MarketCategory;
  limit?: number;
}

export function useMarketPostsPopular(queryParams: PopularPostsQuery = {}) {
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        // 🔥 기본 쿼리: status 필터 + rankScore 정렬 (active 또는 open 허용)
        let q = query(
          collection(db, "marketPosts"),
          where("status", "in", ["active", "open"]), // active 또는 open 허용
          orderBy("rankScore", "desc"),
          limit(queryParams.limit || DEFAULT_LIMIT)
        );

        // 🔥 쿼리 분기 1: Sport 필터
        if (queryParams.sport && queryParams.sport !== "all") {
          q = query(q, where("sport", "==", queryParams.sport));
          console.log("🔥 [useMarketPostsPopular] 종목별 인기글:", queryParams.sport);
        }

        // 🔥 쿼리 분기 2: Category 필터
        if (queryParams.category && queryParams.category !== "all") {
          q = query(q, where("category", "==", queryParams.category));
          console.log("🔥 [useMarketPostsPopular] 카테고리 필터:", queryParams.category);
        }

        const snapshot = await getDocs(q);
        // 🔥 Shadow Ban된 게시글 필터링
        const postsData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((post: MarketPost) => !post.isShadowBanned) // Shadow Ban 제외
          .slice(0, queryParams.limit || DEFAULT_LIMIT) as MarketPost[];

        console.log(`✅ [useMarketPostsPopular] 인기글 조회 완료: ${postsData.length}개`);
        setPosts(postsData);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === (queryParams.limit || DEFAULT_LIMIT));
      } catch (err) {
        console.error("❌ [useMarketPostsPopular] 인기글 조회 실패:", err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [queryParams.sport, queryParams.category, queryParams.limit]);

  const loadMore = async () => {
    if (!hasMore || loading || !lastDoc) return;

    try {
      setLoading(true);

      // 🔥 기본 쿼리: status 필터 + rankScore 정렬 + pagination
      // active 또는 open 허용 (기존 데이터 호환)
      let q = query(
        collection(db, "marketPosts"),
        where("status", "in", ["active", "open"]),
        orderBy("rankScore", "desc"),
        startAfter(lastDoc),
        limit(queryParams.limit || DEFAULT_LIMIT)
      );

      // 🔥 쿼리 분기 1: Sport 필터
      if (queryParams.sport && queryParams.sport !== "all") {
        q = query(q, where("sport", "==", queryParams.sport));
      }

      // 🔥 쿼리 분기 2: Category 필터
      if (queryParams.category && queryParams.category !== "all") {
        q = query(q, where("category", "==", queryParams.category));
      }

      const snapshot = await getDocs(q);
      // 🔥 Shadow Ban된 게시글 필터링
      const newPosts = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((post: MarketPost) => !post.isShadowBanned) // Shadow Ban 제외
        .slice(0, queryParams.limit || DEFAULT_LIMIT) as MarketPost[];

      console.log(`✅ [useMarketPostsPopular] 더보기 완료: ${newPosts.length}개 추가`);
      setPosts(prev => [...prev, ...newPosts]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === (queryParams.limit || DEFAULT_LIMIT));
    } catch (err) {
      console.error("❌ [useMarketPostsPopular] 더보기 실패:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return {
    posts,
    loading,
    error,
    hasMore,
    loadMore,
  };
}

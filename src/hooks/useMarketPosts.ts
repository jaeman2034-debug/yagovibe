/**
 * 🔥 마켓 게시글 데이터 페칭 Hook
 * 
 * 쿼리 분기 로직:
 * 1. 종목별 페이지 (view === "sport"): where("sport", "==", contextSport) 필터 적용
 * 2. 전체 모아보기 (view === "all"): sport 필터 없이 전체 조회
 * 3. 카테고리 필터: category !== "all"일 때 where("category", "==", category) 적용
 * 
 * @param queryParams - 쿼리 파라미터 (contextSport, view, category, limit)
 * @returns { posts, loading, error, hasMore, loadMore }
 */

import { useState, useEffect } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MarketPost, MarketQuery } from "@/types/market";

const DEFAULT_LIMIT = 20;

export function useMarketPosts(queryParams: MarketQuery) {
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // 🔥 새로고침 트리거

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        // 🔥 단일 컬렉션에서 category로 분리 (권장 패턴)
        let q = query(
          collection(db, "marketPosts"),
          where("status", "in", ["active", "open"]),
          limit(DEFAULT_LIMIT * 2) // Shadow Ban 필터링을 위해 여유있게 가져옴
        );

        // 🔥 쿼리 분기 1: Sport 필터
        // - view === "sport": 종목별 페이지 → sport 필터 적용
        // - view === "all": 전체 모아보기 → sport 필터 없음
        if (queryParams.view === "sport" && queryParams.contextSport && queryParams.contextSport !== "all") {
          q = query(q, where("sport", "==", queryParams.contextSport));
          console.log("🔥 [useMarketPosts] 종목별 쿼리:", queryParams.contextSport);
        } else {
          console.log("🔥 [useMarketPosts] 전체 모아보기 쿼리 (sport 필터 없음)");
        }

        // 🔥 쿼리 분기 2: Category 필터 (equipment | recruit | match)
        if (queryParams.category && queryParams.category !== "all") {
          q = query(q, where("category", "==", queryParams.category));
          console.log("🔥 [useMarketPosts] 카테고리 필터:", queryParams.category);
        } else {
          // 🔥 category가 "all"이거나 없으면 equipment만 필터링 (market 리스트 기본값)
          q = query(q, where("category", "==", "equipment"));
          console.log("🔥 [useMarketPosts] 기본 필터: equipment만 표시");
        }

        const snapshot = await getDocs(q);
        // 🔥 Shadow Ban된 게시글 필터링 + 클라이언트 사이드 정렬
        const postsData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((post: MarketPost) => !post.isShadowBanned) // Shadow Ban 제외
          .sort((a: MarketPost, b: MarketPost) => {
            // 🔥 createdAt 기준 내림차순 정렬 (클라이언트 사이드)
            const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
            const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
            return bTime - aTime;
          })
          .slice(0, DEFAULT_LIMIT) as MarketPost[]; // limit만큼만 반환

        console.log(`✅ [useMarketPosts] 조회 완료: ${postsData.length}개 게시글`);
        setPosts(postsData);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === DEFAULT_LIMIT);
      } catch (err) {
        console.error("❌ [useMarketPosts] 데이터 페칭 실패:", err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [queryParams.contextSport, queryParams.view, queryParams.category, refreshKey]);

  // 🔥 새로고침 함수
  const refetch = () => {
    setRefreshKey(prev => prev + 1);
  };

  const loadMore = async () => {
    if (!hasMore || loading || !lastDoc) return;

    try {
      setLoading(true);

      // 🔥 단일 컬렉션 + category 분기
      let q = query(
        collection(db, "marketPosts"),
        where("status", "in", ["active", "open"]),
        limit(DEFAULT_LIMIT * 2) // Shadow Ban 필터링을 위해 여유있게 가져옴
      );

      // 🔥 쿼리 분기 1: Sport 필터 (fetchPosts와 동일한 로직)
      if (queryParams.view === "sport" && queryParams.contextSport && queryParams.contextSport !== "all") {
        q = query(q, where("sport", "==", queryParams.contextSport));
      }

      // 🔥 쿼리 분기 2: Category 필터
      // market 리스트는 기본적으로 equipment만 보여줌
      if (queryParams.category && queryParams.category !== "all") {
        q = query(q, where("category", "==", queryParams.category));
      } else {
        // 🔥 category가 "all"이거나 없으면 equipment만 필터링 (market 리스트 기본값)
        q = query(q, where("category", "==", "equipment"));
      }

      const snapshot = await getDocs(q);
      // 🔥 Shadow Ban된 게시글 필터링 + 클라이언트 사이드 정렬
      const newPosts = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((post: MarketPost) => !post.isShadowBanned) // Shadow Ban 제외
        .sort((a: MarketPost, b: MarketPost) => {
          // 🔥 createdAt 기준 내림차순 정렬 (클라이언트 사이드)
          const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
          return bTime - aTime;
        })
        .slice(0, DEFAULT_LIMIT) as MarketPost[]; // limit만큼만 반환

      // 🔥 중복 제거 (orderBy 없이 pagination 처리)
      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
        return [...prev, ...uniqueNewPosts];
      });
      
      console.log(`✅ [useMarketPosts] 더보기 완료: ${newPosts.length}개 추가`);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length >= DEFAULT_LIMIT); // 더 가져올 데이터가 있는지 확인
    } catch (err) {
      console.error("❌ [useMarketPosts] 더보기 실패:", err);
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
    refetch, // 🔥 새로고침 함수
  };
}

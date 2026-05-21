/**
 * 🔥 추천 피드 Hook (v2)
 * 
 * v2 개선사항:
 * - feedScore 기반 정렬 (rankScore + trustScore - riskScore + recencyBoost)
 * - 신뢰 점수와 위험 점수 반영
 * 
 * 비율: 관심 40% + 인기 40% + 최신 20%
 * 
 * 관심: 최근 본 sport/category 기반
 * 인기: rankScore 높은 순
 * 최신: createdAt 최신 순
 * 
 * 최종 정렬: feedScore 기준 (클라이언트 사이드)
 */

import { useState, useEffect, useMemo } from "react";
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MarketPost, Sport, MarketCategory } from "@/types/market";
import type { User } from "@/types/user";
import { useAuth } from "@/context/AuthProvider";
import { calculateAndSortByFeedScore } from "@/utils/feedScoring";

const DEFAULT_LIMIT = 20;

export interface RecommendedFeedQuery {
  sport?: Sport;
  category?: MarketCategory;
  limit?: number;
}

export function useMarketFeedRecommended(queryParams: RecommendedFeedQuery = {}) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 🔥 최근 관심사 추출 (localStorage 기반)
  const recentInterests = useMemo(() => {
    if (typeof window === "undefined") return { sport: null, category: null };
    
    try {
      const recentSport = localStorage.getItem("recentViewedSport");
      const recentCategory = localStorage.getItem("recentViewedCategory");
      return {
        sport: recentSport as Sport | null,
        category: recentCategory as MarketCategory | null,
      };
    } catch {
      return { sport: null, category: null };
    }
  }, []);

  useEffect(() => {
    const fetchRecommendedFeed = async () => {
      try {
        setLoading(true);
        setError(null);

        const totalLimit = queryParams.limit || DEFAULT_LIMIT;
        const interestLimit = Math.floor(totalLimit * 0.4); // 40%
        const popularLimit = Math.floor(totalLimit * 0.4); // 40%
        const latestLimit = totalLimit - interestLimit - popularLimit; // 20%

        const allPosts: MarketPost[] = [];
        const postIds = new Set<string>(); // 중복 제거용

        // 🔥 1. 관심 피드 (40%) - 최근 본 sport/category
        if (interestLimit > 0 && (recentInterests.sport || recentInterests.category)) {
          try {
            let interestQuery = query(
              collection(db, "marketPosts"),
              where("status", "in", ["active", "open"]), // active 또는 open 허용
              orderBy("createdAt", "desc"),
              limit(interestLimit * 2) // 여유있게 가져와서 필터링
            );

            if (recentInterests.sport && recentInterests.sport !== "all") {
              interestQuery = query(interestQuery, where("sport", "==", recentInterests.sport));
            }
            if (recentInterests.category && recentInterests.category !== "all") {
              interestQuery = query(interestQuery, where("category", "==", recentInterests.category));
            }

            const interestSnapshot = await getDocs(interestQuery);
            const interestPosts = interestSnapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() } as MarketPost))
              .filter((post: MarketPost) => !post.isShadowBanned) // Shadow Ban 제외
              .slice(0, interestLimit);

            interestPosts.forEach(post => {
              if (!postIds.has(post.id)) {
                allPosts.push(post);
                postIds.add(post.id);
              }
            });

            console.log(`✅ [useMarketFeedRecommended] 관심 피드: ${interestPosts.length}개`);
          } catch (err) {
            console.warn("⚠️ [useMarketFeedRecommended] 관심 피드 조회 실패:", err);
          }
        }

        // 🔥 2. 인기 피드 (40%) - rankScore 높은 순
        if (popularLimit > 0) {
          try {
            let popularQuery = query(
              collection(db, "marketPosts"),
              where("status", "in", ["active", "open"]), // active 또는 open 허용
              orderBy("rankScore", "desc"),
              limit(popularLimit * 2) // 여유있게 가져와서 필터링
            );

            // 쿼리 파라미터 필터 적용
            if (queryParams.sport && queryParams.sport !== "all") {
              popularQuery = query(popularQuery, where("sport", "==", queryParams.sport));
            }
            if (queryParams.category && queryParams.category !== "all") {
              popularQuery = query(popularQuery, where("category", "==", queryParams.category));
            }

            const popularSnapshot = await getDocs(popularQuery);
            const popularPosts = popularSnapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() } as MarketPost))
              .filter((post: MarketPost) => !post.isShadowBanned) // Shadow Ban 제외
              .filter(post => !postIds.has(post.id))
              .slice(0, popularLimit);

            popularPosts.forEach(post => {
              allPosts.push(post);
              postIds.add(post.id);
            });

            console.log(`✅ [useMarketFeedRecommended] 인기 피드: ${popularPosts.length}개`);
          } catch (err) {
            console.warn("⚠️ [useMarketFeedRecommended] 인기 피드 조회 실패:", err);
          }
        }

        // 🔥 3. 최신 피드 (20%) - createdAt 최신 순
        if (latestLimit > 0) {
          try {
            let latestQuery = query(
              collection(db, "marketPosts"),
              where("status", "in", ["active", "open"]), // active 또는 open 허용
              orderBy("createdAt", "desc"),
              limit(latestLimit * 2) // 여유있게 가져와서 필터링
            );

            // 쿼리 파라미터 필터 적용
            if (queryParams.sport && queryParams.sport !== "all") {
              latestQuery = query(latestQuery, where("sport", "==", queryParams.sport));
            }
            if (queryParams.category && queryParams.category !== "all") {
              latestQuery = query(latestQuery, where("category", "==", queryParams.category));
            }

            const latestSnapshot = await getDocs(latestQuery);
            const latestPosts = latestSnapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() } as MarketPost))
              .filter((post: MarketPost) => !post.isShadowBanned) // Shadow Ban 제외
              .filter(post => !postIds.has(post.id))
              .slice(0, latestLimit);

            latestPosts.forEach(post => {
              allPosts.push(post);
              postIds.add(post.id);
            });

            console.log(`✅ [useMarketFeedRecommended] 최신 피드: ${latestPosts.length}개`);
          } catch (err) {
            console.warn("⚠️ [useMarketFeedRecommended] 최신 피드 조회 실패:", err);
          }
        }

        // 🔥 v2: 작성자 정보 조회 및 feedScore 계산
        const authorIds = [...new Set(allPosts.map(post => post.authorId))];
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
        
        // 🔥 feedScore 계산 및 정렬
        const postsWithFeedScore = calculateAndSortByFeedScore(allPosts, authorDataMap);
        
        // 🔥 최종 결과: feedScore 기준 정렬된 상위 N개
        const finalPosts = postsWithFeedScore
          .slice(0, totalLimit)
          .map(({ feedScore, ...post }) => post); // feedScore는 계산용이므로 제거
        
        console.log(`✅ [useMarketFeedRecommended] 추천 피드 완료: ${finalPosts.length}개 (관심:${interestLimit}, 인기:${popularLimit}, 최신:${latestLimit})`);
        console.log(`🔥 [useMarketFeedRecommended] feedScore 기반 정렬 완료`);

        setPosts(finalPosts);
      } catch (err) {
        console.error("❌ [useMarketFeedRecommended] 추천 피드 조회 실패:", err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendedFeed();
  }, [queryParams.sport, queryParams.category, queryParams.limit, recentInterests.sport, recentInterests.category]);

  return {
    posts,
    loading,
    error,
  };
}

/**
 * 🔥 관련 글 추천 섹션
 * 같은 sport 기준, 가능하면 category도 동일
 * 최신 + 인기 혼합 4~6개 노출
 */

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import MarketPostCard from "@/components/market/MarketPostCard";
import type { MarketPost, Sport } from "@/types/market";

interface RelatedPostsSectionProps {
  currentPost: MarketPost;
  className?: string;
}

export default function RelatedPostsSection({
  currentPost,
  className,
}: RelatedPostsSectionProps) {
  const [relatedPosts, setRelatedPosts] = useState<MarketPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRelatedPosts = async () => {
      try {
        setLoading(true);

        const allPosts: MarketPost[] = [];
        const postIds = new Set<string>([currentPost.id]); // 현재 글 제외

        // 🔥 1. 같은 sport + 같은 category (우선순위 높음)
        if (currentPost.sport && currentPost.sport !== "all" && currentPost.category) {
          try {
            const sameCategoryQuery = query(
              collection(db, "market"),
              where("sport", "==", currentPost.sport),
              where("category", "==", currentPost.category),
              where("status", "==", "open"),
              orderBy("createdAt", "desc"),
              limit(3)
            );
            const sameCategorySnap = await getDocs(sameCategoryQuery);
            sameCategorySnap.docs.forEach((doc) => {
              if (!postIds.has(doc.id)) {
                const data = doc.data();
                allPosts.push({
                  id: doc.id,
                  ...data,
                } as MarketPost);
                postIds.add(doc.id);
              }
            });
          } catch (err) {
            console.warn("⚠️ 같은 카테고리 글 조회 실패:", err);
          }
        }

        // 🔥 2. 같은 sport (다른 category)
        if (currentPost.sport && currentPost.sport !== "all" && allPosts.length < 6) {
          try {
            const sameSportQuery = query(
              collection(db, "market"),
              where("sport", "==", currentPost.sport),
              where("status", "==", "open"),
              orderBy("createdAt", "desc"),
              limit(6 - allPosts.length)
            );
            const sameSportSnap = await getDocs(sameSportQuery);
            sameSportSnap.docs.forEach((doc) => {
              if (!postIds.has(doc.id) && allPosts.length < 6) {
                const data = doc.data();
                allPosts.push({
                  id: doc.id,
                  ...data,
                } as MarketPost);
                postIds.add(doc.id);
              }
            });
          } catch (err) {
            console.warn("⚠️ 같은 종목 글 조회 실패:", err);
          }
        }

        // 최대 6개로 제한
        setRelatedPosts(allPosts.slice(0, 6));
      } catch (err) {
        console.error("❌ 관련 글 조회 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    if (currentPost.id) {
      loadRelatedPosts();
    }
  }, [currentPost.id, currentPost.sport, currentPost.category]);

  if (loading) {
    return (
      <div className={className}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 px-4">관련 글 추천</h3>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border-b border-gray-200 p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-24 h-24 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (relatedPosts.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="space-y-4 pb-6">
        <h3 className="text-lg font-semibold text-gray-900 px-4">관련 글 추천</h3>
        <div className="space-y-0">
          {relatedPosts.map((post) => (
            <MarketPostCard
              key={post.id}
              post={post}
              contextSport={post.sport || "all"}
              showSportBadge={false}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

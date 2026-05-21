/**
 * 🔥 상위 판매자 게시글 훅
 */

import { useState, useEffect } from "react";
import { getTopSellerPosts } from "@/services/topSellerService";
import type { MarketPost } from "@/types/market";

interface UseTopSellerPostsOptions {
  limit?: number;
  sport?: string;
  category?: string;
}

export function useTopSellerPosts({
  limit = 5,
  sport,
  category,
}: UseTopSellerPostsOptions = {}) {
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const topSellerPosts = await getTopSellerPosts({
          limitCount: limit,
          sport,
          category,
        });
        setPosts(topSellerPosts);
      } catch (err) {
        console.error("❌ 상위 판매자 게시글 로드 실패:", err);
        setError(err as Error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [limit, sport, category]);

  return { posts, loading, error };
}

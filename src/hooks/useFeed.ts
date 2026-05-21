/**
 * 🔥 추천 피드 훅 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 개인화 추천 피드 조회
 * - ForYou, Near, Popular 탭 지원
 */

import { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type FeedType = "forYou" | "near" | "popular";

interface FeedPost {
  id: string;
  title: string;
  category: string;
  recommendationScore: number;
  [key: string]: any;
}

interface FeedResponse {
  success: boolean;
  type: FeedType;
  posts: FeedPost[];
  count: number;
}

/**
 * 추천 피드 훅
 */
export function useFeed(type: FeedType = "forYou", limit: number = 20) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFeed = async () => {
      setLoading(true);
      setError(null);

      try {
        const getFeed = httpsCallable(functions, "getFeed");
        const result = await getFeed({ type, limit });
        const data = result.data as FeedResponse;

        if (data.success && data.posts) {
          setPosts(data.posts);
        } else {
          setPosts([]);
        }
      } catch (err: any) {
        console.error("❌ [useFeed] 피드 로드 실패:", err);
        setError(err.message || "피드 로드 중 오류가 발생했습니다.");
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadFeed();
  }, [type, limit]);

  return { posts, loading, error };
}

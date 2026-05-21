/**
 * 🔥 마켓 피드 컴포넌트
 */

import { useEffect, useRef } from "react";
import MarketPostCard from "./MarketPostCard";
import type { MarketPost, Sport } from "../types";

interface MarketFeedProps {
  posts: MarketPost[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  onLoadMore: () => void;
  contextSport: Sport;
  showSportBadge?: boolean;
}

export default function MarketFeed({
  posts,
  loading,
  error,
  hasMore,
  onLoadMore,
  contextSport,
  showSportBadge = false,
}: MarketFeedProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    // 🔥 null 체크 후 observe (에러 방지)
    const element = loadMoreRef.current;
    if (element && element instanceof Element) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, onLoadMore]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <p className="text-red-600 mb-2">오류가 발생했어요</p>
        <p className="text-sm text-gray-500">{error.message}</p>
      </div>
    );
  }

  if (!loading && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <p className="text-gray-600 mb-2">
          {showSportBadge
            ? "아직 게시글이 없어요"
            : `${contextSport} 상품이 아직 없어요`}
        </p>
        <p className="text-sm text-gray-400">첫 글을 올려보세요</p>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {posts.map((post, index) => (
        <MarketPostCard
          key={post.id}
          post={post}
          contextSport={contextSport}
          showSportBadge={showSportBadge}
          rank={index + 1}
        />
      ))}

      {/* 무한 스크롤 트리거 */}
      {hasMore && (
        <div ref={loadMoreRef} className="py-4 text-center">
          {loading && <p className="text-sm text-gray-500">로딩 중...</p>}
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="py-4 text-center text-sm text-gray-400">
          더 이상 게시글이 없어요
        </div>
      )}
    </div>
  );
}

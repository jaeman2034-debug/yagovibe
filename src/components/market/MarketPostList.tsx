/**
 * 🔥 마켓 게시글 리스트 컴포넌트
 */

import { useEffect, useRef } from "react";
import MarketPostCard from "./MarketPostCard";
import type { MarketPost, Sport } from "@/types/market";

interface MarketPostListProps {
  posts: MarketPost[];
  loading: boolean;
  /** 첫 페이지 이후 추가 로드 (무한 스크롤) */
  loadingMore?: boolean;
  error: Error | null;
  hasMore: boolean;
  onLoadMore: () => void;
  contextSport: Sport;
  showSportBadge?: boolean;
}

export default function MarketPostList({
  posts,
  loading,
  loadingMore = false,
  error,
  hasMore,
  onLoadMore,
  contextSport,
  showSportBadge = false,
}: MarketPostListProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loading || loadingMore) return;

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
  }, [hasMore, loading, loadingMore, onLoadMore]);

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
        <p className="text-sm text-gray-400">
          첫 글을 올려보세요
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto w-full min-w-0 px-4 md:px-6">
        {/* 리스트형: 세로 나열 */}
        <div className="flex flex-col gap-3">
          {posts.map((post, index) => (
            <div key={post.id}>
              <MarketPostCard
                post={post}
                contextSport={contextSport}
                showSportBadge={showSportBadge}
                rank={index + 1}
              />
            </div>
          ))}
        </div>

        {/* 무한 스크롤 트리거 */}
        {hasMore && (
          <div ref={loadMoreRef} className="py-6 text-center">
            {(loading || loadingMore) && (
              <p className="text-sm text-gray-500">로딩 중...</p>
            )}
          </div>
        )}

        {!hasMore && posts.length > 0 && (
          <div className="py-6 text-center text-sm text-gray-400">
            더 이상 게시글이 없어요
          </div>
        )}
      </div>
    </div>
  );
}

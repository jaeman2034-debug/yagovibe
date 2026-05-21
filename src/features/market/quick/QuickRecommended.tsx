import { useMemo } from "react";
import MarketPostCard from "@/components/market/MarketPostCard";
import type { MarketPost, Sport } from "@/types/market";

function hasListImage(p: MarketPost): boolean {
  const n = Array.isArray(p.images) ? p.images.filter((u) => typeof u === "string" && u.length > 0).length : 0;
  return n > 0 || (typeof p.thumbnailUrl === "string" && p.thumbnailUrl.length > 0);
}

type Props = {
  sport: Sport;
  /** 현재 필터·정렬과 동일한 목록 — 이미지 있는 글만 골라 최대 4개 */
  allPosts: MarketPost[];
  listLoading: boolean;
};

const MAX = 4;

/** Quick — 사진 있는 글만 임시 추천 (메인 리스트 쿼리와 동일 소스, 표시 조건만 다름) */
export function QuickRecommended({ sport, allPosts, listLoading }: Props) {
  const posts = useMemo(
    () => allPosts.filter(hasListImage).slice(0, MAX),
    [allPosts]
  );

  if (listLoading && posts.length === 0) {
    return (
      <div className="mb-4 border-b border-gray-100 bg-gray-50/80 px-4 pb-4 sm:px-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">
          <span aria-hidden>🔥</span> 지금 인기 있는 거래
        </h2>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="h-24 animate-pulse rounded-xl bg-gray-200/70" />
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 border-b border-gray-100 bg-gray-50/80 px-4 pb-4 sm:px-6">
      <h2 className="mb-2 text-sm font-semibold text-gray-900">
        <span aria-hidden>🔥</span> 지금 인기 있는 거래
      </h2>
      <p className="mb-2 text-xs text-gray-500">사진이 있는 글을 먼저 보여드려요</p>
      <div className="space-y-2">
        {posts.map((post, i) => (
          <MarketPostCard key={post.id} post={post} contextSport={sport} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}

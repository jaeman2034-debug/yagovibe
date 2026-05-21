/**
 * 🔥 SportMarketFeed - 종목별 Market Feed
 * 
 * 역할:
 * - marketPosts 컬렉션에서 해당 종목만 필터링
 * - 최신순 정렬
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MarketPostCard from "@/components/market/MarketPostCard";
import type { MarketPost, Sport, MarketCategory } from "@/types/market";
import { fetchMarketPosts } from "@/services/marketService";
import FeedSkeletonGrid from "@/components/sports/FeedSkeletonGrid";
import FeedEmptyState from "@/components/sports/FeedEmptyState";

interface SportMarketFeedProps {
  sport: string;
}

export default function SportMarketFeed({ sport }: SportMarketFeedProps) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 🔥 marketService 사용 (1원화)
        const marketPostsData = await fetchMarketPosts({
          sport,
          // 🔥 레거시 글 대응: category 미지정 글도 포함하기 위해 서버 필터 제거
          status: ["active", "reserved", "completed"], // 거래완료 글도 포함
          limit: 30,
          orderBy: "createdAt",
          orderDirection: "desc",
        });
        
        // 🔥 프런트에서 거래 탭 범주 필터링
        const filtered = marketPostsData.filter((p: any) => {
          const cat = (p?.category || "").toString();
          return cat === "" || cat === "equipment";
        });
        
        setPosts(filtered);
      } catch (err: any) {
        // 🔥 에러는 콘솔에만 출력 (사용자에게는 정상 EmptyState 표시)
        console.error("❌ [SportMarketFeed] 조회 실패:", err);
        setError("상품을 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };
    
    void fetchPosts();
  }, [sport]);
  
  if (loading) {
    return <FeedSkeletonGrid />;
  }
  
  if (error) {
    return (
      <FeedEmptyState
        title="상품을 불러올 수 없어요"
        description="잠시 후 다시 시도해주세요."
        ctaText="새로고침"
        onClick={() => window.location.reload()}
      />
    );
  }
  
  if (posts.length === 0) {
    return (
      <FeedEmptyState
        title="등록된 상품이 없어요"
        description="첫 거래를 시작해보세요."
        ctaText="판매하기"
        onClick={() => navigate(`/sports/${sport}/market/write`)}
      />
    );
  }
  
  return (
    <div className="px-4 pt-7 pb-20 space-y-4">
      {posts.map((post, index) => (
        <MarketPostCard
          key={post.id}
          post={post}
          contextSport={sport as Sport}
          showSportBadge={false}
          rank={index + 1}
        />
      ))}
    </div>
  );
}

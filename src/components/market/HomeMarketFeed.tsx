/**
 * 🔥 홈 화면 마켓 피드 컴포넌트
 * 
 * 3가지 피드 블록:
 * 1. 오늘 인기글 (rankScore desc, limit 5)
 * 2. 관심 종목 추천 (useMarketFeedRecommended)
 * 3. 최신 글 (createdAt desc, limit 5)
 */

import { useState, useEffect } from "react";
import { useMarketPostsPopular } from "@/hooks/useMarketPostsPopular";
import { useMarketFeedRecommended } from "@/hooks/useMarketFeedRecommended";
import { useMarketPosts } from "@/hooks/useMarketPosts";
import MarketPostCard from "@/components/market/MarketPostCard";
import { useNavigate } from "react-router-dom";
import { getTopSellerPosts } from "@/services/topSellerService";
import type { Sport } from "@/types/market";
import type { MarketPost } from "@/types/market";

interface HomeMarketFeedProps {
  favoriteSport?: Sport;
}

export default function HomeMarketFeed({ favoriteSport }: HomeMarketFeedProps) {
  const navigate = useNavigate();
  const [topSellerPosts, setTopSellerPosts] = useState<MarketPost[]>([]);
  const [topSellerLoading, setTopSellerLoading] = useState(true);

  // 🔥 0. 신뢰 판매자 상품 (trustScore desc, limit 5)
  useEffect(() => {
    const loadTopSellerPosts = async () => {
      try {
        setTopSellerLoading(true);
        const posts = await getTopSellerPosts({ limitCount: 5 });
        setTopSellerPosts(posts);
      } catch (err) {
        console.error("❌ 신뢰 판매자 상품 로드 실패:", err);
        setTopSellerPosts([]);
      } finally {
        setTopSellerLoading(false);
      }
    };
    loadTopSellerPosts();
  }, []);

  // 🔥 1. 오늘 인기글 (rankScore desc, limit 5)
  const { posts: popularPosts, loading: popularLoading } = useMarketPostsPopular({
    limit: 5,
  });

  // 🔥 2. 관심 종목 추천 (favoriteSport 기반)
  const { posts: recommendedPosts, loading: recommendedLoading } = useMarketFeedRecommended({
    sport: favoriteSport,
    limit: 5,
  });

  // 🔥 3. 최신 글 (createdAt desc, limit 5)
  // useMarketPosts는 limit 파라미터를 받지 않으므로 slice로 제한
  const { posts: allLatestPosts, loading: latestLoading } = useMarketPosts({
    contextSport: "all",
    view: "all",
    category: "all",
  });

  // 최신 글은 limit 5로 제한
  const latestPosts = allLatestPosts.slice(0, 5);

  return (
    <div className="w-full max-w-5xl space-y-8">
      {/* 🔥 신뢰 판매자 상품 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">🔥 신뢰 판매자 상품</h2>
            <p className="text-sm text-gray-600">검증된 판매자의 안전한 거래</p>
          </div>
          <button
            onClick={() => navigate("/market?sort=trusted")}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            더보기 →
          </button>
        </div>
        {topSellerLoading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : topSellerPosts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">신뢰 판매자 상품이 없습니다.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {topSellerPosts.map((post) => (
              <MarketPostCard
                key={post.id}
                post={post}
                contextSport={post.sport || "all"}
                showSportBadge={true}
              />
            ))}
          </div>
        )}
      </section>

      {/* 🔥 오늘 인기글 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">🔥 오늘 인기글</h2>
            <p className="text-sm text-gray-600">지금 가장 핫한 게시글</p>
          </div>
          <button
            onClick={() => navigate("/market?sort=popular")}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            더보기 →
          </button>
        </div>
        {popularLoading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : popularPosts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">인기 글이 없습니다.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {popularPosts.map((post) => (
              <MarketPostCard
                key={post.id}
                post={post}
                contextSport={post.sport || "all"}
                showSportBadge={true}
              />
            ))}
          </div>
        )}
      </section>

      {/* 🔥 관심 종목 추천 */}
      {favoriteSport && favoriteSport !== "all" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">🔥 신뢰 추천</h2>
              <p className="text-sm text-gray-600">인기 + 신뢰 + 안전 + 최신이 균형 잡힌 추천</p>
            </div>
            <button
              onClick={() => navigate(`/${favoriteSport}/market`)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              더보기 →
            </button>
          </div>
          {recommendedLoading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : recommendedPosts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">추천 글이 없습니다.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommendedPosts.map((post) => (
                <MarketPostCard
                  key={post.id}
                  post={post}
                  contextSport={post.sport || "all"}
                  showSportBadge={true}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 🔥 최신 글 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">🆕 최신 글</h2>
            <p className="text-sm text-gray-600">방금 올라온 게시글</p>
          </div>
          <button
            onClick={() => navigate("/market")}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            더보기 →
          </button>
        </div>
        {latestLoading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : latestPosts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">최신 글이 없습니다.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {latestPosts.map((post) => (
              <MarketPostCard
                key={post.id}
                post={post}
                contextSport={post.sport || "all"}
                showSportBadge={true}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

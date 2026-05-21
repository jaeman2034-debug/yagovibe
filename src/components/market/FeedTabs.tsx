/**
 * 🔥 추천 피드 탭 컴포넌트 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - ForYou, Near, Popular 탭
 * - 피드 표시
 */

import { useState } from "react";
import { useFeed, type FeedType } from "@/hooks/useFeed";
import MarketPostCard from "../features/market/components/MarketPostCard";
import { Loader2 } from "lucide-react";

export default function FeedTabs() {
  const [activeTab, setActiveTab] = useState<FeedType>("forYou");
  const { posts, loading, error } = useFeed(activeTab, 20);

  const tabs = [
    { id: "forYou" as FeedType, label: "맞춤 추천" },
    { id: "near" as FeedType, label: "내 주변" },
    { id: "popular" as FeedType, label: "인기" },
  ];

  return (
    <div className="space-y-4">
      {/* 🔥 탭 헤더 */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 🔥 피드 콘텐츠 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          추천할 게시글이 없습니다.
        </div>
      )}

      {!loading && !error && posts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <MarketPostCard
              key={post.id}
              post={post}
              contextSport="soccer"
            />
          ))}
        </div>
      )}
    </div>
  );
}

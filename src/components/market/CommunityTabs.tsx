/**
 * 🔥 커뮤니티 탭 컴포넌트 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - Market/Community/Chat 탭
 * - 혼합 피드 표시
 */

import { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import MarketPostCard from "../features/market/components/MarketPostCard";
import AdCard from "./AdCard";
import { Loader2, MessageSquare, Users, ShoppingBag } from "lucide-react";

type TabType = "market" | "community" | "chat";

interface MixedFeedItem {
  type: "market" | "community" | "ad";
  id: string;
  data: any;
  score: number;
}

export default function CommunityTabs() {
  const [activeTab, setActiveTab] = useState<TabType>("market");
  const [feedItems, setFeedItems] = useState<MixedFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔥 혼합 피드 로드
  const loadMixedFeed = async () => {
    setLoading(true);
    setError(null);

    try {
      const getMixedFeed = httpsCallable(functions, "getMixedFeed");
      const result = await getMixedFeed({ limit: 20 });
      const data = result.data as { success: boolean; items: MixedFeedItem[] };

      if (data.success && data.items) {
        setFeedItems(data.items);
      } else {
        setFeedItems([]);
      }
    } catch (err: any) {
      console.error("❌ [CommunityTabs] 피드 로드 실패:", err);
      setError(err.message || "피드 로드 중 오류가 발생했습니다.");
      setFeedItems([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 탭 변경 시 피드 로드
  useEffect(() => {
    if (activeTab === "market") {
      loadMixedFeed();
    }
  }, [activeTab]);

  const tabs = [
    { id: "market" as TabType, label: "마켓", icon: ShoppingBag },
    { id: "community" as TabType, label: "커뮤니티", icon: Users },
    { id: "chat" as TabType, label: "채팅", icon: MessageSquare },
  ];

  return (
    <div className="space-y-4">
      {/* 🔥 탭 헤더 */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "market") {
                  loadMixedFeed();
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 🔥 피드 콘텐츠 */}
      {activeTab === "market" && (
        <>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
          )}

          {!loading && !error && feedItems.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              추천할 게시글이 없습니다.
            </div>
          )}

          {!loading && !error && feedItems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {feedItems.map((item) => {
                if (item.type === "market") {
                  return (
                    <MarketPostCard
                      key={item.id}
                      post={item.data}
                      contextSport="soccer"
                    />
                  );
                } else if (item.type === "community") {
                  return (
                    <div
                      key={item.id}
                      className="p-4 bg-white rounded-lg border border-gray-200"
                    >
                      <h3 className="font-semibold text-lg mb-2">
                        {item.data.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-3">
                        {item.data.content}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                        <span>👍 {item.data.likeCount || 0}</span>
                        <span>💬 {item.data.commentCount || 0}</span>
                        <span>👁️ {item.data.viewCount || 0}</span>
                      </div>
                    </div>
                  );
                } else if (item.type === "ad") {
                  return (
                    <AdCard
                      key={item.id}
                      ad={item.data}
                    />
                  );
                }
                return null;
              })}
            </div>
          )}
        </>
      )}

      {activeTab === "community" && (
        <div className="p-8 text-center text-gray-500">
          커뮤니티 기능 준비 중입니다.
        </div>
      )}

      {activeTab === "chat" && (
        <div className="p-8 text-center text-gray-500">
          채팅 기능 준비 중입니다.
        </div>
      )}
    </div>
  );
}

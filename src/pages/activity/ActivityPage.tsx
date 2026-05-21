/**
 * 🔥 ActivityPage - Activity 메인 페이지
 * 
 * 역할:
 * - ActivityFeed 렌더링
 * - 필터 탭 제공
 * - ActivityFeed에 filter props 전달
 */

import { useState } from "react";
import ActivityFeedComponent from "@/features/activity/ActivityFeed";

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState<"all" | "market" | "team" | "event">("all");

  // 🔥 필터 라벨 매핑
  const filterLabels: Record<string, string> = {
    all: "전체",
    market: "거래",
    team: "팀",
    event: "이벤트",
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* 🔥 필터 탭 */}
      <div className="sticky top-16 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-2 p-3">
            {(["all", "market", "team", "event"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActiveTab(f)}
                className={`px-4 py-2 rounded-full border transition-colors text-sm font-medium ${
                  activeTab === f
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                {filterLabels[f]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🔥 Activity 피드 (반드시 렌더, 조건부 렌더 금지) */}
      <ActivityFeedComponent filter={activeTab} />
    </div>
  );
}

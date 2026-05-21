/**
 * 🔴 Live Leaderboard 컴포넌트
 * 
 * 역할:
 * - 실시간 리더보드 표시
 * - 순위 변화 감지
 */

import { useLiveLeaderboard, type LeaderboardItem } from "@/hooks/useLiveLeaderboard";
import { Trophy, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LiveLeaderboardProps {
  eventId: string;
  category: "goals" | "assists" | "appearances";
  limit?: number;
  title?: string;
}

const categoryLabels: Record<string, string> = {
  goals: "득점",
  assists: "도움",
  appearances: "출전",
};

export function LiveLeaderboard({
  eventId,
  category,
  limit = 10,
  title,
}: LiveLeaderboardProps) {
  const { leaderboard, loading } = useLiveLeaderboard(eventId, category, {
    limitCount: limit,
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title || `${categoryLabels[category]} 순위`}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(limit)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          {title || `${categoryLabels[category]} 순위`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {leaderboard.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              데이터가 없습니다.
            </div>
          ) : (
            leaderboard.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-8 text-center">
                  {index === 0 ? (
                    <Trophy className="w-5 h-5 text-yellow-500 mx-auto" />
                  ) : (
                    <span className="text-sm font-semibold text-gray-600">
                      {item.rank}
                    </span>
                  )}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">
                    {item.playerName}
                  </div>
                  {item.teamName && (
                    <div className="text-sm text-gray-500 truncate">
                      {item.teamName}
                    </div>
                  )}
                </div>

                {/* Value */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-lg font-bold text-gray-900">
                    {item.value}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

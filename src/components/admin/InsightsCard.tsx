/**
 * 🔥 InsightsCard - 인사이트 카드 컴포넌트
 * 
 * 역할:
 * - 인사이트 목록 표시
 * - 타입별 아이콘 및 스타일
 * - 우선순위별 정렬
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import type { Insight } from "@/services/analyticsService";

interface InsightsCardProps {
  insights: Insight[];
  loading?: boolean;
}

export function InsightsCard({
  insights,
  loading = false,
}: InsightsCardProps) {
  const getIcon = (type: Insight["type"]) => {
    switch (type) {
      case "growth":
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case "trend":
        return <BarChart3 className="w-5 h-5 text-blue-600" />;
      case "milestone":
        return <Trophy className="w-5 h-5 text-yellow-600" />;
      case "alert":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <BarChart3 className="w-5 h-5 text-gray-400" />;
    }
  };

  const getBgColor = (type: Insight["type"], priority: Insight["priority"]) => {
    if (type === "alert") {
      return priority === "high"
        ? "bg-red-50 border-red-200"
        : "bg-orange-50 border-orange-200";
    }
    if (type === "growth") {
      return "bg-green-50 border-green-200";
    }
    if (type === "milestone") {
      return "bg-yellow-50 border-yellow-200";
    }
    return "bg-blue-50 border-blue-200";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>인사이트</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>인사이트</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            생성된 인사이트가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>인사이트</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 sm:space-y-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`p-3 sm:p-4 rounded-lg border ${getBgColor(
                insight.type,
                insight.priority
              )}`}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(insight.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-900">
                    {insight.message}
                  </p>
                  {insight.value !== undefined && (
                    <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">
                      {insight.period === "weekly" ? "주간" : "월간"} 변화:{" "}
                      {insight.value > 0 ? "+" : ""}
                      {insight.value}%
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

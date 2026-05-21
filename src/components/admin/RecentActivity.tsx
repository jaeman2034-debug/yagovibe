/**
 * 🔥 RecentActivity - 최근 활동 컴포넌트
 * 
 * 역할:
 * - 최근 활동 목록 표시
 * - 활동 타입별 아이콘
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  Target,
  Trophy,
  Users,
  Award,
  Activity,
  Bell,
} from "lucide-react";
import type { RecentActivity as RecentActivityType } from "@/services/analyticsService";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface RecentActivityProps {
  activities: RecentActivityType[];
  loading?: boolean;
}

export function RecentActivity({
  activities,
  loading = false,
}: RecentActivityProps) {
  const getIcon = (type: string) => {
    if (type.includes("EVENT") || type.includes("event")) {
      return <Calendar className="w-4 h-4 text-blue-600" />;
    }
    if (type.includes("MATCH") || type.includes("match")) {
      return <Target className="w-4 h-4 text-green-600" />;
    }
    if (type.includes("AWARD") || type.includes("award")) {
      return <Trophy className="w-4 h-4 text-yellow-600" />;
    }
    if (type.includes("TEAM") || type.includes("team")) {
      return <Users className="w-4 h-4 text-purple-600" />;
    }
    if (type.includes("PLAYER") || type.includes("player")) {
      return <Activity className="w-4 h-4 text-indigo-600" />;
    }
    return <Bell className="w-4 h-4 text-gray-400" />;
  };

  const formatTime = (createdAt: any) => {
    if (!createdAt) return "";
    
    try {
      const date = createdAt?.toDate?.() || new Date(createdAt);
      // date-fns가 있으면 사용, 없으면 fallback
      if (formatDistanceToNow) {
        try {
          return formatDistanceToNow(date, { addSuffix: true });
        } catch {
          // date-fns 에러 시 fallback
        }
      }
      // Fallback: 직접 계산
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (minutes < 1) return "방금 전";
      if (minutes < 60) return `${minutes}분 전`;
      if (hours < 24) return `${hours}시간 전`;
      if (days < 7) return `${days}일 전`;
      return date.toLocaleDateString("ko-KR");
    } catch {
      return "";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            최근 활동이 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 활동</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 sm:space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
            >
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-medium text-gray-900">
                  {activity.title}
                </div>
                {activity.message && (
                  <div className="text-xs text-gray-500 mt-0.5 sm:mt-1 line-clamp-2">
                    {activity.message}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-0.5 sm:mt-1">
                  {formatTime(activity.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

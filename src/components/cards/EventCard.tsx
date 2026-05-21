/**
 * 🔥 Event Card 컴포넌트
 * 
 * 역할:
 * - Event 카드 UI
 * - Directory / Homepage에서 사용
 */

import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Trophy, Users } from "lucide-react";

interface EventCardProps {
  event: {
    id: string;
    name: string;
    status: "scheduled" | "ongoing" | "completed" | "canceled";
    startDate?: any;
    endDate?: any;
    teamCount?: number;
    matchCount?: number;
  };
}

export function EventCard({ event }: EventCardProps) {
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: "예정",
      ongoing: "진행중",
      completed: "완료",
      canceled: "취소",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-blue-100 text-blue-800",
      ongoing: "bg-green-100 text-green-800",
      completed: "bg-gray-100 text-gray-800",
      canceled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <Link to={`/events/${event.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {event.name}
            </h3>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ml-2 ${getStatusColor(
                event.status
              )}`}
            >
              {getStatusLabel(event.status)}
            </span>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            {(event.startDate || event.endDate) && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>
                  {formatDate(event.startDate)}
                  {event.endDate && ` ~ ${formatDate(event.endDate)}`}
                </span>
              </div>
            )}

            <div className="flex items-center gap-4">
              {event.teamCount !== undefined && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>{event.teamCount}팀</span>
                </div>
              )}

              {event.matchCount !== undefined && (
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-gray-400" />
                  <span>{event.matchCount}경기</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

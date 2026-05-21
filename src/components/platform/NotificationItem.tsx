/**
 * 🔔 NotificationItem - 알림 아이템 컴포넌트
 * 
 * 역할:
 * - 알림 타입별 아이콘 표시
 * - 알림 내용 표시
 * - 시간 표시
 * - 읽음 상태 표시
 */

import {
  Bell,
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  Award,
  Users,
  CheckCircle,
  Activity,
  BarChart3,
  MessageCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Notification } from "@/types/notification";
// date-fns는 선택적 (없으면 fallback)
let formatDistanceToNow: any = null;
try {
  const dateFns = require("date-fns");
  formatDistanceToNow = dateFns.formatDistanceToNow;
} catch {
  // date-fns가 없으면 fallback 함수 사용
  formatDistanceToNow = (date: Date) => {
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
  };
}

interface NotificationItemProps {
  notification: Notification;
  showTime?: boolean;
}

function notificationBodyText(n: Notification): string {
  const p = n.payload as { preview?: string } | undefined;
  const fromMessage = typeof n.message === "string" ? n.message.trim() : "";
  const fromPreview = typeof p?.preview === "string" ? p.preview.trim() : "";
  const fromBody = typeof (n as { body?: string }).body === "string" ? (n as { body: string }).body.trim() : "";
  return fromMessage || fromPreview || fromBody || "새 메시지";
}

export function NotificationItem({ notification, showTime = true }: NotificationItemProps) {
  const navigate = useNavigate();

  const getIcon = () => {
    switch (notification.type) {
      // 경기 관련
      case "MATCH_RESULT_UPDATED":
      case "MATCH_COMPLETED":
        return <Target className="w-5 h-5 text-blue-600" />;
      case "MATCH_STARTED":
        return <Activity className="w-5 h-5 text-green-600" />;
      
      // 수상 관련
      case "AWARD_ANNOUNCED":
        return <Trophy className="w-5 h-5 text-yellow-600" />;
      
      // 리더보드 관련
      case "LEADERBOARD_RANK_CHANGED":
        return <TrendingUp className="w-5 h-5 text-purple-600" />;
      
      // 대회 관련
      case "EVENT_STARTED":
      case "EVENT_COMPLETED":
        return <Calendar className="w-5 h-5 text-orange-600" />;
      
      // 경기 일정
      case "TEAM_MATCH_SCHEDULED":
      case "TEAM_MATCH_REMINDER":
        return <Calendar className="w-5 h-5 text-blue-600" />;
      
      // 선수 기록
      case "PLAYER_STATS_UPDATED":
      case "PLAYER_ACHIEVEMENT":
        return <BarChart3 className="w-5 h-5 text-green-600" />;
      
      // 팀 순위
      case "TEAM_RANKING_UPDATED":
        return <Users className="w-5 h-5 text-indigo-600" />;

      case "TEAM_WALL_POST":
        return <Users className="w-5 h-5 text-emerald-600" />;

      case "MATCH_JOIN_REQUESTED":
      case "MATCH_JOIN_ACCEPTED":
      case "MATCH_JOIN_REJECTED":
        return <Users className="w-5 h-5 text-sky-600" />;

      case "CHAT_MESSAGE":
      case "MARKET_CHAT_MESSAGE":
        return <MessageCircle className="w-5 h-5 text-blue-600" />;
      
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatTime = () => {
    if (!notification.createdAt) return "";
    
    try {
      const date = notification.createdAt?.toDate?.() || new Date(notification.createdAt);
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

  return (
    <div className="flex items-start gap-3">
      {/* 아이콘 */}
      <div className="flex-shrink-0">
        {notification.actorPhotoUrl ? (
          notification.actorId ? (
            <button
              type="button"
              className="block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${notification.actorId}`);
              }}
              aria-label={notification.actorName ? `${notification.actorName} 프로필` : "프로필 보기"}
            >
              <img
                src={notification.actorPhotoUrl}
                alt=""
                className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
              />
            </button>
          ) : (
            <img
              src={notification.actorPhotoUrl}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          )
        ) : (
          <div
            className={`flex-shrink-0 rounded-full p-2 ${
              !notification.isRead
                ? "bg-blue-100 text-blue-600"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {getIcon()}
          </div>
        )}
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3
            className={`text-sm font-semibold ${
              !notification.isRead ? "text-gray-900" : "text-gray-600"
            }`}
          >
            {notification.title}
          </h3>
          {notification.isRead && (
            <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          )}
        </div>
        {notification.actorId && !notification.actorPhotoUrl && (
          <button
            type="button"
            className="mb-1 text-left text-xs text-blue-600 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${notification.actorId}`);
            }}
          >
            {notification.actorName ? `${notification.actorName} 프로필` : "프로필 보기"}
          </button>
        )}
        <p className="text-sm text-gray-600 line-clamp-2 mb-1">
          {notificationBodyText(notification)}
        </p>
        {showTime && (
          <p className="text-xs text-gray-400">
            {formatTime()}
          </p>
        )}
      </div>
    </div>
  );
}

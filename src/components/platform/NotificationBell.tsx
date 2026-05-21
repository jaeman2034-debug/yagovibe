/**
 * 🔔 NotificationBell - 플랫폼 스포츠 알림 벨 (드롭다운 포함)
 * 
 * 위치: 상단 네비게이션
 * 기능:
 * - 실시간 읽지 않은 알림 개수 표시
 * - 클릭 시 드롭다운 표시
 * - 최신 알림 미리보기 (PlatformNotificationsPage와 동일 그룹핑, 최대 5줄)
 * - 전체 알림 페이지로 이동
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { resolveNotificationDeepLink } from "@/lib/notifications/notificationDeepLink";
import { navigateFromNotification } from "@/lib/notifications/navigateFromNotification";
import { markNotificationsReadForChat } from "@/lib/notifications/markNotificationsReadForChat";
import {
  groupPlatformNotifications,
  countUnreadInGroup,
} from "@/lib/notifications/groupPlatformNotifications";
import { usePlatformNotifications } from "@/hooks/usePlatformNotifications";
import { useAuthForFirestore } from "@/hooks/useAuthForFirestore";
import {
  formatUnreadCount,
  formatUnreadCountFullLabel,
} from "@/lib/notifications/formatUnreadCount";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NotificationItem } from "./NotificationItem";
import { recordNotificationClicked } from "@/lib/notifications/recordNotificationEngagement";
import type { Notification } from "@/types/notification";

type NotificationBellProps = {
  /** MainLayout 헤더와 동일한 버튼 스타일 */
  variant?: "default" | "header";
};

const DROPDOWN_GROUP_LIMIT = 5;
/** 그룹핑 후에도 미리보기 줄 수가 나오도록 원본 알림은 더 가져옴 */
const DROPDOWN_FETCH_LIMIT = 30;

export function NotificationBell({ variant = "default" }: NotificationBellProps) {
  const navigate = useNavigate();
  const { user } = useAuthForFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [shakeBell, setShakeBell] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef<number | null>(null);
  const { notifications, unreadCount, loading, markAsRead } = usePlatformNotifications({
    limitCount: DROPDOWN_FETCH_LIMIT,
    unreadOnly: false,
  });

  const dropdownGroups = useMemo(() => {
    return groupPlatformNotifications(notifications).slice(0, DROPDOWN_GROUP_LIMIT);
  }, [notifications]);

  useEffect(() => {
    const prev = prevUnreadRef.current;
    prevUnreadRef.current = unreadCount;
    if (prev === null || unreadCount <= prev) return;
    setShakeBell(true);
    const t = window.setTimeout(() => setShakeBell(false), 600);
    return () => window.clearTimeout(t);
  }, [unreadCount]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const markGroupRead = async (group: (typeof dropdownGroups)[0]) => {
    const unread = group.items.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    try {
      if (group.kind === "thread" && group.chatThreadId && user?.uid) {
        await markNotificationsReadForChat(user.uid, group.chatThreadId);
      }
      await Promise.all(unread.map((n) => markAsRead(n.id)));
    } catch {
      // markAsRead 내부 로깅
    }
  };

  const navigateForNotification = (notification: Notification) => {
    void recordNotificationClicked(notification.id);
    const deep = resolveNotificationDeepLink(notification);
    if (deep) {
      navigate(deep);
      return;
    }

    if (notification.target) {
      const { screen, id, params } = notification.target;

      switch (screen) {
        case "chat":
          navigateFromNotification(notification, navigate);
          break;
        case "match":
          if (id) {
            navigate(`/match/${id}`);
            break;
          }
          navigate("/match");
          break;
        case "event":
          navigate(`/events/${id || ""}`);
          break;
        case "player":
          navigate(`/players/${id || ""}`);
          break;
        case "team": {
          const tid = String(id || "").trim();
          if (!tid) {
            navigate("/me");
            break;
          }
          if (params?.tab) {
            const q = new URLSearchParams({ tab: String(params.tab) });
            navigate(`/team/${encodeURIComponent(tid)}/public?${q.toString()}`);
          } else {
            navigate(`/teams/${encodeURIComponent(tid)}/play`);
          }
          break;
        }
        case "leaderboard":
          navigate(`/events/${params?.eventId || ""}/stats`);
          break;
        default:
          navigate("/notifications");
      }
    } else if (notification.link) {
      navigate(notification.link);
    } else {
      navigate("/notifications");
    }
  };

  const handleGroupClick = async (group: (typeof dropdownGroups)[0]) => {
    const latest = group.items[0];
    await markGroupRead(group);
    setIsOpen(false);
    navigateForNotification(latest);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* 벨 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative text-gray-600 transition-colors hover:text-gray-900",
          variant === "header"
            ? "rounded-full p-1.5 hover:bg-gray-100"
            : "p-2"
        )}
        aria-label="알림"
        type="button"
      >
        <Bell className={cn("h-5 w-5", shakeBell && "animate-bell-shake")} />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className={cn(
              "absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center px-1 text-[10px] leading-none"
            )}
          >
            {formatUnreadCount(unreadCount)}
          </Badge>
        )}
      </button>

      {/* 드롭다운 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
          {/* 헤더 */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">알림</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-gray-500">{formatUnreadCountFullLabel(unreadCount)}</span>
            )}
          </div>

          {/* 알림 목록 */}
          <div className="overflow-y-auto max-h-[400px]">
            {loading ? (
              <div className="px-4 py-8 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="text-xs text-gray-500 mt-2">로딩 중...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-1">새 알림이 없어요</p>
                <p className="text-xs text-gray-500">새로운 알림이 오면 여기에 표시됩니다</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {dropdownGroups.map((group) => {
                  const latest = group.items[0];
                  const stacked = group.items.length > 1;
                  const unreadInGroup = countUnreadInGroup(group);
                  const rowUnread = unreadInGroup > 0;

                  return (
                    <div
                      key={group.key}
                      onClick={() => handleGroupClick(group)}
                      className={cn(
                        "px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors",
                        rowUnread ? "bg-blue-50/50" : "bg-white"
                      )}
                    >
                      {stacked && (
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[11px] font-medium text-blue-700 leading-tight">
                            {group.kind === "thread" && (
                              <>
                                새 메시지 {group.items.length}건
                                {unreadInGroup > 0 ? ` · 읽지 않음 ${unreadInGroup}건` : ""}
                              </>
                            )}
                            {group.kind === "trade" && (
                              <>
                                거래 알림 {group.items.length}건
                                {unreadInGroup > 0 ? ` · 읽지 않음 ${unreadInGroup}건` : ""}
                              </>
                            )}
                          </span>
                          {unreadInGroup > 0 && (
                            <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                              {unreadInGroup > 99 ? "99+" : unreadInGroup}
                            </span>
                          )}
                        </div>
                      )}
                      <NotificationItem notification={latest} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 푸터 */}
          <div className="px-4 py-3 border-t border-gray-200">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/notifications");
              }}
              className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium py-2"
            >
              전체 알림 보기
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

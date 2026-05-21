/**
 * 🔔 Platform Notifications Page - 플랫폼 스포츠 알림 페이지
 * 
 * /notifications
 * 
 * UX 규칙:
 * - 전체 알림 목록 표시
 * - 읽지 않은 알림 강조
 * - 알림 클릭 시 딥링크 이동
 * - 읽음 처리 자동
 * - 전체 읽음 처리 버튼
 * - 실시간 업데이트
 * - 채팅·거래 동일 스레드는 한 줄로 묶음 (카톡 스타일)
 */

import { useMemo } from "react";
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
import { formatUnreadCountFullLabel } from "@/lib/notifications/formatUnreadCount";
import { NotificationItem } from "@/components/platform/NotificationItem";
import { recordNotificationClicked } from "@/lib/notifications/recordNotificationEngagement";
import { Bell, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Notification } from "@/types/notification";

export default function PlatformNotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuthForFirestore();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = usePlatformNotifications({
    limitCount: 50,
    unreadOnly: false,
  });

  const groups = useMemo(() => groupPlatformNotifications(notifications), [notifications]);

  const markGroupRead = async (group: (typeof groups)[0]) => {
    const unread = group.items.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    try {
      if (group.kind === "thread" && group.chatThreadId && user?.uid) {
        await markNotificationsReadForChat(user.uid, group.chatThreadId);
      }
      await Promise.all(unread.map((n) => markAsRead(n.id)));
    } catch {
      // 개별 읽음은 markAsRead 내부에서 로깅
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
          navigate(`/events/${params?.eventId || ""}/matches/${id || ""}`);
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
    }
  };

  const handleGroupClick = async (group: (typeof groups)[0]) => {
    const latest = group.items[0];
    await markGroupRead(group);
    navigateForNotification(latest);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">알림</h1>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              <Check className="w-4 h-4 mr-1" />
              모두 읽음
            </Button>
          )}
        </div>
        {unreadCount > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Bell className="w-4 h-4" />
              <span className="font-medium">{formatUnreadCountFullLabel(unreadCount)}</span>
            </div>
          </div>
        )}
      </div>

      {/* 목록 */}
      <div className="pb-4">
        {loading ? (
          <div className="px-4 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-sm text-gray-500">로딩 중...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-base font-medium text-gray-700 mb-1">새 알림이 없어요</p>
            <p className="text-sm text-gray-500">새로운 알림이 오면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {groups.map((group) => {
              const latest = group.items[0];
              const stacked = group.items.length > 1;
              const unreadInGroup = countUnreadInGroup(group);
              const rowUnread = unreadInGroup > 0;

              return (
                <div
                  key={group.key}
                  onClick={() => handleGroupClick(group)}
                  className={`px-4 py-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                    rowUnread ? "bg-blue-50/50 border-l-4 border-blue-500" : "bg-white"
                  }`}
                >
                  {stacked && (
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-medium text-blue-700">
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
                        <span className="min-w-[1.5rem] h-6 px-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">
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
    </div>
  );
}

/**
 * 🔥 NotificationItem - 알림 아이템 (STEP: 알림 히스토리 & 활동 로그)
 * 
 * 알림 카드:
 * - 읽지 않은 것 강조
 * - 클릭 시 link로 이동 + 읽음 처리
 */

import { useNavigate } from "react-router-dom";
import { markNotificationAsRead } from "@/lib/notification/markAsRead";
import { navigateFromNotification } from "@/lib/notifications/navigateFromNotification";
import type { Notification } from "@/types/notification";
import { Bell, Check } from "lucide-react";

interface NotificationItemProps {
  notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const navigate = useNavigate();

  const handleClick = async () => {
    // 읽음 처리
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
    }

    // 🔥 딥링크 라우팅 (target 우선, link는 하위 호환성)
    navigateFromNotification(notification, navigate);
  };

  return (
    <div
      onClick={handleClick}
      className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
        !notification.isRead ? "bg-blue-50" : "bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <Bell className={`w-5 h-5 mt-0.5 ${!notification.isRead ? "text-blue-600" : "text-gray-400"}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className={`text-sm font-semibold ${!notification.isRead ? "text-gray-900" : "text-gray-600"}`}>
              {notification.title}
            </h3>
            {notification.isRead && (
              <Check className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <p className="text-sm text-gray-600">{notification.message}</p>
          <p className="text-xs text-gray-400 mt-1">
            {notification.createdAt?.toDate?.().toLocaleDateString("ko-KR") || "날짜 없음"}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 🔥 GrowthNotifications - 성장 알림 컴포넌트
 * 
 * 역할:
 * - 성장 관련 알림 표시
 * - 행동 유도 메시지
 * 
 * UX 목적:
 * - 행동 유지 강화
 * - 사용자 습관 통제
 */

import { useGrowthNotifications } from "@/hooks/useGrowthNotifications";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useState } from "react";

/**
 * 🔥 GrowthNotifications 컴포넌트
 */
export function GrowthNotifications() {
  const { notifications, loading } = useGrowthNotifications();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (loading || notifications.length === 0) {
    return null;
  }

  // 🔥 최대 3개만 표시 (우선순위 높은 것만)
  const visibleNotifications = notifications
    .filter((n) => !dismissed.has(n.type))
    .slice(0, 3);

  if (visibleNotifications.length === 0) {
    return null;
  }

  const handleDismiss = (type: string) => {
    setDismissed((prev) => new Set([...prev, type]));
  };

  const handleClick = (notification: typeof notifications[0]) => {
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  return (
    <div className="space-y-3">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.type}
          className={`rounded-xl border p-4 shadow-sm cursor-pointer transition-all hover:shadow-md ${notification.bgColor} ${notification.color}`}
          onClick={() => handleClick(notification)}
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl shrink-0">{notification.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">
                    {notification.title}
                  </h4>
                  <p className="text-sm opacity-90">{notification.message}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss(notification.type);
                  }}
                  className="shrink-0 p-1 hover:bg-black/10 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

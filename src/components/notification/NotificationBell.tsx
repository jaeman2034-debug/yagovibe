/**
 * 🔥 NotificationBell - 알림 벨 아이콘 (STEP: 알림 히스토리 & 활동 로그)
 * 
 * 위치: 상단 네비게이션
 * UI 규칙:
 * - 최신 10개만
 * - 읽지 않은 것 강조 (배지)
 * - 클릭 시 /notifications 이동
 */

import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import { formatUnreadCount } from "@/lib/notifications/formatUnreadCount";
import { Badge } from "@/components/ui/badge";

export function NotificationBell() {
  const navigate = useNavigate();
  const { count: unreadCount } = useUnreadNotificationCount();

  const handleClick = () => {
    console.log("🔔 [NotificationBell] 알림 버튼 클릭됨");
    try {
      navigate("/notifications");
      console.log("✅ [NotificationBell] /notifications로 이동 성공");
    } catch (error) {
      console.error("❌ [NotificationBell] 네비게이션 실패:", error);
      // 🔥 폴백: 직접 URL 변경
      window.location.href = "/notifications";
    }
  };

  return (
    <button
      onClick={handleClick}
      className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      aria-label="알림"
      type="button" // 🔥 폼 내부에서 submit 방지
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {formatUnreadCount(unreadCount)}
        </Badge>
      )}
    </button>
  );
}

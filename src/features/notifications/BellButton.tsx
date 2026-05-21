/**
 * 🔔 알림 벨 버튼 (제품 레벨)
 * 
 * 클릭 시 /notifications 페이지로 이동 (당근마켓 방식)
 */

import { useNavigate } from "react-router-dom";
import { useNotifications } from "./hooks";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BellButton() {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  return (
    <button
      className="header-icon-btn relative text-gray-600 hover:text-gray-900 transition-colors"
      onClick={() => navigate("/notifications")}
      aria-label="알림"
      type="button"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </button>
  );
}

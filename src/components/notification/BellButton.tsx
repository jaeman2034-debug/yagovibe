/**
 * 🔔 알림 벨 버튼 (제품 레벨)
 * 
 * 실시간 배지 카운트 + 클릭 처리
 */

import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUnreadCount } from "@/lib/notifications/hooks";
import { Badge } from "@/components/ui/badge";

export default function BellButton() {
  const navigate = useNavigate();
  const count = useUnreadCount();

  const handleClick = () => {
    navigate("/notifications");
  };

  return (
    <button
      onClick={handleClick}
      className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      aria-label="알림"
      type="button"
    >
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {count > 9 ? "9+" : count}
        </Badge>
      )}
    </button>
  );
}

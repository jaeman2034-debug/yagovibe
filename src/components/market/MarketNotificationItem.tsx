/**
 * 🔔 매칭 알림 아이템 컴포넌트
 */

import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import type { MarketNotification } from "@/hooks/useMarketNotifications";
import { normalizeTradeChatDocumentIdForRoute } from "@/features/chat/services/chatService";
import { resolveLastSportId, sportMarketDetailUrl } from "@/utils/sportHubHref";

interface MarketNotificationItemProps {
  notification: MarketNotification;
  userId: string;
}

export function MarketNotificationItem({
  notification,
  userId,
}: MarketNotificationItemProps) {
  const navigate = useNavigate();

  const handleClick = async () => {
    // 🔥 읽음 처리
    if (!notification.read) {
      const notiRef = doc(
        db,
        "notifications",
        userId,
        "items",
        notification.id
      );
      await updateDoc(notiRef, { read: true });
    }

    // 🔥 알림 타입별 이동 — 통합방은 /chat/, 거래 1:1은 /app/chat/
    if (notification.chatRoomId) {
      const id = notification.chatRoomId;
      const rt = notification.roomType?.toLowerCase();
      if (rt === "trade") {
        navigate(`/app/chat/${normalizeTradeChatDocumentIdForRoute(id)}`);
      } else {
        navigate(`/chat/${id}`);
      }
    } else {
      navigate(sportMarketDetailUrl(resolveLastSportId(), notification.postId));
    }
  };

  return (
    <div
      className={`p-4 border-b cursor-pointer transition-colors ${
        notification.read
          ? "bg-gray-50 hover:bg-gray-100"
          : "bg-blue-50 hover:bg-blue-100"
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h4
            className={`font-semibold ${
              notification.read ? "text-gray-700" : "text-gray-900"
            }`}
          >
            {notification.title}
          </h4>
          <p
            className={`mt-1 ${
              notification.read ? "text-gray-500" : "text-gray-700"
            }`}
          >
            {notification.body}
          </p>
          {!notification.read && (
            <span className="inline-block mt-2 w-2 h-2 bg-blue-500 rounded-full" />
          )}
        </div>
      </div>
    </div>
  );
}

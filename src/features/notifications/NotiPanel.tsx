/**
 * 🔔 알림 패널 (제품 레벨)
 */

import { useNotifications } from "./hooks";
import { markAsRead } from "./service";
import { useNavigate } from "react-router-dom";
import { Bell, Check, X } from "lucide-react";
import type { YagoNoti } from "./types";
import { resolveLastSportId, sportMarketDetailUrl } from "@/utils/sportHubHref";

export default function NotiPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const { list, loading } = useNotifications();
  const nav = useNavigate();

  async function open(n: YagoNoti) {
    await markAsRead(n.id);

    switch (n.target.screen) {
      case "chat":
        nav(`/chat/${n.target.id}`); // 🔥 YAGO 채팅 URL: /chat/:chatRoomId
        break;

      case "trade":
        if (n.target.id) {
          nav(sportMarketDetailUrl(resolveLastSportId(), n.target.id));
        }
        break;

      case "item":
        if (n.target.id) {
          nav(sportMarketDetailUrl(resolveLastSportId(), n.target.id));
        }
        break;
    }

    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "rgba(0, 0, 0, 0.5)",
      }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">알림</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">로딩 중...</div>
          ) : list.length === 0 ? (
            <div className="p-8 text-center text-gray-500">새 알림이 없어요</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {list.map((n) => (
                <div
                  key={n.id}
                  onClick={() => open(n)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !n.isRead ? "bg-blue-50" : "bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Bell
                      className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        !n.isRead ? "text-blue-600" : "text-gray-400"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4
                          className={`text-sm font-semibold ${
                            !n.isRead ? "text-gray-900" : "text-gray-600"
                          }`}
                        >
                          {n.title}
                        </h4>
                        {n.isRead && (
                          <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {n.createdAt?.toDate?.().toLocaleDateString("ko-KR") ||
                          "날짜 없음"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

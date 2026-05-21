/**
 * 🔔 알림 패널 (제품 레벨)
 * 
 * 알림 목록 + 클릭 처리
 */

import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/lib/notifications/hooks";
import { markAsRead } from "@/lib/notifications/service";
import { navigateFromNoti } from "@/lib/notifications/navigate";
import type { Notification } from "@/types/notification";
import { Bell, Check } from "lucide-react";

export default function NotiPanel() {
  const navigate = useNavigate();
  const { list, loading } = useNotifications();

  const handleClick = async (noti: Notification) => {
    // 읽음 처리
    if (!noti.isRead) {
      await markAsRead(noti.id);
    }

    // 딥링크 이동
    navigateFromNoti(noti, navigate);
  };

  if (loading) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-gray-500">알림이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {list.map((noti) => (
        <div
          key={noti.id}
          onClick={() => handleClick(noti)}
          className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
            !noti.isRead ? "bg-blue-50" : "bg-white"
          }`}
        >
          <div className="flex items-start gap-3">
            <Bell className={`w-5 h-5 mt-0.5 ${!noti.isRead ? "text-blue-600" : "text-gray-400"}`} />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className={`text-sm font-semibold ${!noti.isRead ? "text-gray-900" : "text-gray-600"}`}>
                  {noti.title}
                </h3>
                {noti.isRead && (
                  <Check className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <p className="text-sm text-gray-600">{noti.message}</p>
              <p className="text-xs text-gray-400 mt-1">
                {noti.createdAt?.toDate?.().toLocaleDateString("ko-KR") || "날짜 없음"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 🔔 알림 페이지 (당근마켓 방식)
 * 
 * /notifications
 * 
 * UX 규칙:
 * - 새 페이지로 이동 (모달 금지)
 * - 헤더 유지 (뒤로가기 가능)
 * - 알림 클릭 → 해당 채팅/상품/팀으로 딥링크
 * - 읽음 처리 자동
 * - 실시간 업데이트
 */

import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/features/notifications/hooks";
import { markAsRead } from "@/features/notifications/service";
import { navigateFromNoti } from "@/features/notifications/navigate";
import { Bell, Check, ArrowLeft, MessageSquare, DollarSign, Package, Users, MapPin, X, Lock } from "lucide-react";
import type { YagoNoti } from "@/features/notifications/types";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { list, loading, unreadCount } = useNotifications();

  const handleClick = async (noti: YagoNoti) => {
    // 읽음 처리
    if (!noti.isRead) {
      await markAsRead(noti.id);
    }

    // 타입별 딥링크 이동
    navigateFromNoti(noti, navigate);
  };

  // 타입별 아이콘
  const getIcon = (type: YagoNoti["type"]) => {
    switch (type) {
      case "CHAT_MESSAGE":
      case "MARKET_CHAT_MESSAGE":
        return <MessageSquare className="w-5 h-5" />;
      case "PRICE_OFFER":
        return <DollarSign className="w-5 h-5" />;
      case "TRADE_RESERVED":
      case "TRADE_COMPLETED":
      case "MARKET_TRANSACTION_COMPLETE":
        return <Package className="w-5 h-5" />;
      case "MARKET_POST_UPDATED":
      case "MARKET_POST_LIKED":
        return <Package className="w-5 h-5 text-blue-600" />;
      case "LOCATION_REQUEST":
        return <MapPin className="w-5 h-5" />;
      // 🔥 매칭 참여 알림 타입
      case "MARKET_JOIN_APPROVED":
        return <Check className="w-5 h-5 text-green-600" />;
      case "MARKET_JOIN_REJECTED":
        return <X className="w-5 h-5 text-red-600" />;
      case "MARKET_JOIN_CANCELLED":
        return <X className="w-5 h-5 text-orange-600" />;
      // 🔥 모집 단체방 알림 타입
      case "RECRUIT_NEW_MEMBER":
        return <Users className="w-5 h-5 text-blue-600" />;
      case "RECRUIT_KICKED":
        return <X className="w-5 h-5 text-red-600" />;
      case "RECRUIT_CLOSED":
        return <Lock className="w-5 h-5 text-gray-600" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 (고정) */}
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
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Bell className="w-4 h-4" />
              <span className="font-medium">읽지 않음 {unreadCount}개</span>
            </div>
          )}
        </div>
      </div>

      {/* 목록 */}
      <div className="pb-4">
        {loading ? (
          <div className="px-4 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-sm text-gray-500">로딩 중...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-base font-medium text-gray-700 mb-1">새 알림이 없어요</p>
            <p className="text-sm text-gray-500">새로운 알림이 오면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {list.map((noti) => (
              <div
                key={noti.id}
                onClick={() => handleClick(noti)}
                className={`px-4 py-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                  !noti.isRead ? "bg-blue-50" : "bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* 타입별 아이콘 */}
                  <div
                    className={`flex-shrink-0 p-2 rounded-full ${
                      !noti.isRead
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {getIcon(noti.type)}
                  </div>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3
                        className={`text-sm font-semibold ${
                          !noti.isRead ? "text-gray-900" : "text-gray-600"
                        }`}
                      >
                        {noti.title}
                      </h3>
                      {noti.isRead && (
                        <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{noti.body}</p>
                    <p className="text-xs text-gray-400">
                      {noti.createdAt?.toDate?.().toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }) || "날짜 없음"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

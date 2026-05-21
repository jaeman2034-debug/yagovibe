/**
 * 🔔 YAGO 알림 타입 정의 (제품 레벨)
 */

export type NotiType =
  | "CHAT_MESSAGE"
  | "PRICE_OFFER"
  | "TRADE_RESERVED"
  | "TRADE_COMPLETED"
  | "LOCATION_REQUEST"
  | "SYSTEM_NOTICE"
  | "LIKE_RECEIVED"
  | "COMMENT_RECEIVED"
  | "ASSOCIATION_JOINED"
  // 🔥 모집 단체방 알림
  | "RECRUIT_NEW_MEMBER"
  | "RECRUIT_KICKED"
  | "RECRUIT_CLOSED";

export interface YagoNoti {
  id: string;
  userId: string;

  type: NotiType;

  title: string;
  body: string;

  target: {
    screen: "chat" | "trade" | "item" | "association" | "association_post" | "home";
    id?: string;
    params?: Record<string, string>;
  };

  isRead: boolean;
  createdAt: any; // Timestamp (Firestore)

  priority: "high" | "normal" | "low";
}

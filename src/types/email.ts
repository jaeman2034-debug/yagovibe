/**
 * 🔥 Email Notification 타입 정의
 * 
 * 역할:
 * - 이메일 알림 타입
 * - 구독 설정
 * - 이메일 템플릿
 */

export type EmailNotificationType =
  | "match_result"
  | "match_started"
  | "match_completed"
  | "media_uploaded"
  | "award_announced"
  | "event_started"
  | "event_completed"
  | "team_match_scheduled"
  | "player_achievement"
  | "weekly_digest"
  | "monthly_digest";

export interface EmailSubscription {
  userId: string;
  email: string;
  enabled: boolean;
  preferences: {
    [key in EmailNotificationType]: boolean;
  };
  digestFrequency: "none" | "weekly" | "monthly";
  createdAt: any;
  updatedAt: any;
}

export interface EmailTemplate {
  type: EmailNotificationType;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateId?: string;
  data?: Record<string, any>;
}

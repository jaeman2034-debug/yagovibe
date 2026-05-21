/**
 * 🔔 알림 로그 데이터 모델
 */

export type NotificationType =
  | "APPLICATION_APPROVED"
  | "ROSTER_REMINDER"
  | "DEADLINE_APPROACHING";

export type NotificationChannel = "email" | "kakao";

export type NotificationStatus = "success" | "failed" | "pending";

export interface NotificationLog {
  type: NotificationType;
  applicationId: string;
  associationId: string;
  tournamentId: string;
  userId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  errorMessage?: string;
  sentAt: FirebaseFirestore.Timestamp;
  retryCount: number;
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  daysUntilDeadline?: number;
}

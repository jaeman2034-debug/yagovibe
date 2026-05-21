/**
 * 🔔 알림 로그 기록 유틸리티
 * 
 * 알림 발송 성공/실패를 로그로 기록
 * 재시도 및 운영 관리용
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import type {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from "./types";

const db = admin.firestore();

export interface LogNotificationParams {
  type: NotificationType;
  applicationId: string;
  associationId: string;
  tournamentId: string;
  userId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  errorMessage?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  daysUntilDeadline?: number;
  retryCount?: number;
}

/**
 * 알림 로그 기록
 * 
 * 경로: associations/{associationId}/tournaments/{tournamentId}/applications/{applicationId}/notificationLogs/{logId}
 */
export async function logNotification(
  params: LogNotificationParams
): Promise<void> {
  const {
    type,
    applicationId,
    associationId,
    tournamentId,
    userId,
    channel,
    status,
    errorMessage,
    recipientEmail,
    recipientPhone,
    subject,
    daysUntilDeadline,
    retryCount = 0,
  } = params;

  try {
    const logRef = db
      .collection(
        `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}/notificationLogs`
      )
      .doc();

    const logData = {
      type,
      applicationId,
      associationId,
      tournamentId,
      userId,
      channel,
      status,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      retryCount,
      ...(errorMessage && { errorMessage }),
      ...(recipientEmail && { recipientEmail }),
      ...(recipientPhone && { recipientPhone }),
      ...(subject && { subject }),
      ...(daysUntilDeadline !== undefined && { daysUntilDeadline }),
    };

    await logRef.set(logData);

    logger.info("[logNotification] 알림 로그 기록 완료", {
      type,
      applicationId,
      status,
      retryCount,
    });
  } catch (error: any) {
    logger.error("[logNotification] 로그 기록 실패", {
      type,
      applicationId,
      error: error.message,
    });
    // 로그 기록 실패는 알림 발송 실패와 별개 (무시)
  }
}

/**
 * 알림 로그 조회 (중복 방지용)
 * 
 * 특정 타입의 알림이 이미 성공적으로 발송되었는지 확인
 */
export async function hasSuccessfulNotification(
  associationId: string,
  tournamentId: string,
  applicationId: string,
  type: NotificationType
): Promise<boolean> {
  try {
    const logsRef = db
      .collection(
        `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}/notificationLogs`
      )
      .where("type", "==", type)
      .where("status", "==", "success")
      .limit(1);

    const logsSnap = await logsRef.get();

    return !logsSnap.empty;
  } catch (error: any) {
    logger.error("[hasSuccessfulNotification] 조회 실패", {
      type,
      applicationId,
      error: error.message,
    });
    // 조회 실패 시 false 반환 (안전하게 알림 발송)
    return false;
  }
}

/**
 * 실패한 알림 로그 조회 (재시도용)
 */
export async function getFailedNotificationLogs(
  maxRetries: number = 3
): Promise<Array<admin.firestore.QueryDocumentSnapshot>> {
  try {
    // collectionGroup으로 모든 notificationLogs 조회
    const logsSnap = await db
      .collectionGroup("notificationLogs")
      .where("status", "==", "failed")
      .where("retryCount", "<", maxRetries)
      .get();

    return logsSnap.docs;
  } catch (error: any) {
    logger.error("[getFailedNotificationLogs] 조회 실패", {
      error: error.message,
    });
    return [];
  }
}

/**
 * 알림 로그 상태 업데이트 (재시도용)
 */
export async function updateNotificationLogStatus(
  logRef: admin.firestore.DocumentReference,
  status: NotificationStatus,
  retryCount: number,
  errorMessage?: string
): Promise<void> {
  try {
    await logRef.update({
      status,
      retryCount,
      ...(errorMessage && { errorMessage }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    logger.error("[updateNotificationLogStatus] 업데이트 실패", {
      error: error.message,
    });
  }
}

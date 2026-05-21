/**
 * 🔥 알림 설정 유틸리티
 * 
 * 역할:
 * - 사용자별 알림 설정 조회
 * - 알림 타입별 설정 확인
 * - 기본값 처리 (안전한 기본값)
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const db = getFirestore();

/**
 * 알림 설정 타입
 */
export interface NotificationSettings {
  // 필수 알림 (끌 수 없음)
  // - 팀장 위임 (TEAM_CAPTAIN_DELEGATED)
  // - 팀에서 제거됨 (TEAM_MEMBER_REMOVED)
  
  // 중요 알림 (기본 ON, 끄기 가능)
  joinApproved?: boolean;        // 가입 승인 (TEAM_JOIN_APPROVED)
  associationJoined?: boolean;   // 협회 가입 완료 (ASSOCIATION_JOINED)
  roleChanged?: boolean;         // 역할 변경 (추후 확장)
  
  // 선택 알림 (기본 OFF)
  teamNotice?: boolean;           // 팀 공지 (추후 확장)
  marketing?: boolean;            // 마케팅 알림 (추후 확장)
  
  updatedAt?: any;               // Timestamp
}

/**
 * 알림 타입별 설정 키 매핑
 */
const NOTIFICATION_TYPE_TO_SETTING: Record<string, keyof NotificationSettings> = {
  'TEAM_JOIN_APPROVED': 'joinApproved',
  'ASSOCIATION_JOINED': 'associationJoined',
  'TEAM_CAPTAIN_DELEGATED': undefined, // 필수 알림 (끌 수 없음)
  'TEAM_MEMBER_REMOVED': undefined,     // 필수 알림 (끌 수 없음)
};

/**
 * 필수 알림 타입 (끌 수 없음)
 */
const REQUIRED_NOTIFICATION_TYPES = [
  'TEAM_CAPTAIN_DELEGATED',
  'TEAM_MEMBER_REMOVED',
];

/**
 * 사용자의 알림 설정 조회
 * 
 * @param uid - 사용자 UID
 * @returns 알림 설정 (없으면 기본값 반환)
 */
export async function getUserNotificationSettings(
  uid: string
): Promise<NotificationSettings> {
  try {
    const settingsRef = db.doc(`users/${uid}/notificationSettings/default`);
    const settingsSnap = await settingsRef.get();
    
    if (!settingsSnap.exists) {
      // 기본값 반환 (안전한 기본값)
      return {
        joinApproved: true,
        associationJoined: true,
        roleChanged: true,
        teamNotice: false,
        marketing: false,
      };
    }
    
    const data = settingsSnap.data() as NotificationSettings;
    
    // 기본값 병합 (안전한 기본값)
    return {
      joinApproved: data.joinApproved !== false, // 기본값: true
      associationJoined: data.associationJoined !== false, // 기본값: true
      roleChanged: data.roleChanged !== false, // 기본값: true
      teamNotice: data.teamNotice === true, // 기본값: false
      marketing: data.marketing === true, // 기본값: false
      ...data,
    };
  } catch (error: any) {
    logger.warn('⚠️ [getUserNotificationSettings] 설정 조회 실패, 기본값 사용', {
      uid,
      error: error.message,
    });
    
    // 에러 시 안전한 기본값 반환
    return {
      joinApproved: true,
      associationJoined: true,
      roleChanged: true,
      teamNotice: false,
      marketing: false,
    };
  }
}

/**
 * 알림을 발송해야 하는지 확인
 * 
 * @param uid - 사용자 UID
 * @param notificationType - 알림 타입
 * @returns 발송 여부
 */
export async function shouldSendNotification(
  uid: string,
  notificationType: string
): Promise<boolean> {
  // 필수 알림은 항상 발송
  if (REQUIRED_NOTIFICATION_TYPES.includes(notificationType)) {
    return true;
  }
  
  // 설정 조회
  const settings = await getUserNotificationSettings(uid);
  
  // 알림 타입별 설정 키 확인
  const settingKey = NOTIFICATION_TYPE_TO_SETTING[notificationType];
  
  if (!settingKey) {
    // 매핑되지 않은 알림 타입은 기본값으로 처리 (안전하게 발송)
    logger.warn('⚠️ [shouldSendNotification] 알림 타입 매핑 없음', {
      uid,
      notificationType,
    });
    return true; // 기본값: 발송
  }
  
  // 설정 확인 (기본값은 true)
  const shouldSend = settings[settingKey] !== false;
  
  logger.info('✅ [shouldSendNotification] 알림 발송 여부 확인', {
    uid,
    notificationType,
    settingKey,
    shouldSend,
  });
  
  return shouldSend;
}

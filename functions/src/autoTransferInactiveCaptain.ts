/**
 * 🔥 팀장 휴면 시 자동 위임 (Fail-safe 설계)
 * 
 * 역할:
 * - 팀장이 30일간 활동하지 않으면 자동으로 권한 위임
 * - 사전 경고 알림 (D-7, D-1)
 * - 위임 대상 우선순위: 부팀장 > 가입 오래된 순 > 최근 활동 있음
 * - 모든 과정은 기록 + 알림
 * 
 * 핵심 원칙:
 * - 자동 위임은 "최후의 수단"
 * - 사전 고지 필수 (알림)
 * - 위임 대상은 명확한 우선순위
 * - 모든 과정은 기록 + 알림
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";

const db = getFirestore();

/**
 * 팀장 활동 추적 데이터 구조
 */
interface CaptainActivity {
  teamId: string;
  captainUid: string;
  lastActiveAt: admin.firestore.Timestamp | null;
  inactivityDays: number;
  warningSentAt?: admin.firestore.Timestamp; // D-7 경고 발송 시각
  finalWarningSentAt?: admin.firestore.Timestamp; // D-1 경고 발송 시각
}

/**
 * 위임 대상 정보
 */
interface NextCaptainCandidate {
  uid: string;
  name: string;
  joinedAt: admin.firestore.Timestamp;
  lastActiveAt?: admin.firestore.Timestamp;
  isViceCaptain: boolean;
}

/**
 * 팀장 휴면 체크 및 자동 위임 스케줄러
 * 
 * 매일 오전 9시 실행 (Asia/Seoul)
 */
export const checkInactiveCaptains = onSchedule(
  {
    schedule: "0 9 * * *", // 매일 오전 9시
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    memory: "512MiB",
    timeoutSeconds: 540, // 9분
  },
  async () => {
    logger.info("🔥 [checkInactiveCaptains] 팀장 휴면 체크 시작");

    try {
      // 모든 팀 조회
      const teamsSnap = await db.collection("teams").get();
      const teams = teamsSnap.docs;

      logger.info(`📊 [checkInactiveCaptains] ${teams.size}개 팀 확인 중`);

      let checkedCount = 0;
      let warningCount = 0;
      let transferredCount = 0;

      for (const teamDoc of teams) {
        const teamId = teamDoc.id;
        const teamData = teamDoc.data();

        // 팀장 UID 확인
        const captainUid = teamData.ownerUid;
        if (!captainUid) {
          continue; // 팀장이 없으면 스킵
        }

        // 팀 삭제 확인
        if (teamData.isDeleted === true) {
          continue;
        }

        checkedCount++;

        // 팀장 활동 정보 조회
        const activity = await getCaptainActivity(teamId, captainUid);
        
        if (!activity) {
          continue; // 활동 정보 없으면 스킵
        }

        // 휴면 기준: 30일
        const INACTIVITY_THRESHOLD_DAYS = 30;
        const WARNING_DAYS = 7; // D-7 경고
        const FINAL_WARNING_DAYS = 1; // D-1 경고

        const daysInactive = activity.inactivityDays;

        // D-7 경고 (23일째)
        if (daysInactive >= INACTIVITY_THRESHOLD_DAYS - WARNING_DAYS && 
            daysInactive < INACTIVITY_THRESHOLD_DAYS - FINAL_WARNING_DAYS &&
            !activity.warningSentAt) {
          await sendWarningNotification(teamId, captainUid, teamData.name || "팀", WARNING_DAYS);
          await updateWarningSentAt(teamId, captainUid, "warning");
          warningCount++;
          logger.info(`⚠️ [checkInactiveCaptains] D-7 경고 발송: ${teamId}`);
        }

        // D-1 경고 (29일째)
        if (daysInactive >= INACTIVITY_THRESHOLD_DAYS - FINAL_WARNING_DAYS &&
            daysInactive < INACTIVITY_THRESHOLD_DAYS &&
            !activity.finalWarningSentAt) {
          await sendFinalWarningNotification(teamId, captainUid, teamData.name || "팀");
          await updateWarningSentAt(teamId, captainUid, "final");
          warningCount++;
          logger.info(`🚨 [checkInactiveCaptains] D-1 경고 발송: ${teamId}`);
        }

        // 자동 위임 실행 (30일 이상)
        if (daysInactive >= INACTIVITY_THRESHOLD_DAYS) {
          const transferred = await autoTransferCaptain(teamId, captainUid, teamData.name || "팀");
          if (transferred) {
            transferredCount++;
            logger.info(`✅ [checkInactiveCaptains] 자동 위임 완료: ${teamId}`);
          }
        }
      }

      logger.info(`✅ [checkInactiveCaptains] 완료`, {
        checked: checkedCount,
        warnings: warningCount,
        transferred: transferredCount,
      });
    } catch (error: any) {
      logger.error("❌ [checkInactiveCaptains] 에러 발생", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * 팀장 활동 정보 조회
 */
async function getCaptainActivity(
  teamId: string,
  captainUid: string
): Promise<CaptainActivity | null> {
  try {
    // 팀장의 마지막 활동 시각 조회
    // 1. users/{uid}/lastActiveAt (로그인/앱 접근)
    // 2. teams/{teamId}/members/{uid}/lastActiveAt (팀 관리 페이지 접근)
    // 3. audit_logs에서 최근 활동 확인

    const userRef = db.doc(`users/${captainUid}`);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : null;

    const memberRef = db.doc(`teams/${teamId}/members/${captainUid}`);
    const memberSnap = await memberRef.get();
    const memberData = memberSnap.exists ? memberSnap.data() : null;

    // 최근 활동 시각 결정 (가장 최근 것)
    let lastActiveAt: admin.firestore.Timestamp | null = null;

    if (userData?.lastActiveAt) {
      lastActiveAt = userData.lastActiveAt;
    }
    if (memberData?.lastActiveAt) {
      const memberActiveAt = memberData.lastActiveAt;
      if (!lastActiveAt || (memberActiveAt.toMillis() > lastActiveAt.toMillis())) {
        lastActiveAt = memberActiveAt;
      }
    }

    // audit_logs에서 최근 활동 확인 (선택사항)
    const auditLogsQuery = db
      .collection("audit_logs")
      .where("actorUid", "==", captainUid)
      .where("teamId", "==", teamId)
      .orderBy("createdAt", "desc")
      .limit(1);

    const auditLogsSnap = await auditLogsQuery.get();
    if (!auditLogsSnap.empty) {
      const latestLog = auditLogsSnap.docs[0].data();
      const logCreatedAt = latestLog.createdAt;
      if (logCreatedAt && (!lastActiveAt || logCreatedAt.toMillis() > lastActiveAt.toMillis())) {
        lastActiveAt = logCreatedAt;
      }
    }

    if (!lastActiveAt) {
      // 활동 기록이 없으면 null 반환 (스킵)
      return null;
    }

    // 휴면 일수 계산
    const now = admin.firestore.Timestamp.now();
    const daysInactive = Math.floor(
      (now.toMillis() - lastActiveAt.toMillis()) / (1000 * 60 * 60 * 24)
    );

    return {
      teamId,
      captainUid,
      lastActiveAt,
      inactivityDays: daysInactive,
      warningSentAt: memberData?.warningSentAt,
      finalWarningSentAt: memberData?.finalWarningSentAt,
    };
  } catch (error: any) {
    logger.warn(`⚠️ [getCaptainActivity] 활동 정보 조회 실패: ${teamId}`, {
      error: error.message,
    });
    return null;
  }
}

/**
 * D-7 경고 알림 발송
 */
async function sendWarningNotification(
  teamId: string,
  captainUid: string,
  teamName: string,
  daysRemaining: number
): Promise<void> {
  try {
    const notificationRef = db.collection("notifications").doc();
    await notificationRef.set({
      userId: captainUid,
      type: "TEAM_CAPTAIN_DELEGATED", // 재사용 (경고용)
      teamId,
      title: "⚠️ 팀장 활동 경고",
      message: `⚠️ 팀장 활동이 ${30 - daysRemaining}일째 없어요. ${daysRemaining}일 후 자동으로 팀장이 위임될 수 있어요.`,
      link: "/me",
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info(`✅ [sendWarningNotification] D-7 경고 발송: ${teamId}`);
  } catch (error: any) {
    logger.error(`❌ [sendWarningNotification] 경고 발송 실패: ${teamId}`, {
      error: error.message,
    });
  }
}

/**
 * D-1 최종 경고 알림 발송
 */
async function sendFinalWarningNotification(
  teamId: string,
  captainUid: string,
  teamName: string
): Promise<void> {
  try {
    const notificationRef = db.collection("notifications").doc();
    await notificationRef.set({
      userId: captainUid,
      type: "TEAM_CAPTAIN_DELEGATED", // 재사용 (경고용)
      teamId,
      title: "🚨 팀장 자동 위임 예정",
      message: `🚨 내일 팀장 권한이 자동 위임될 예정이에요. 활동을 재개하면 위임되지 않아요.`,
      link: "/me",
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info(`✅ [sendFinalWarningNotification] D-1 경고 발송: ${teamId}`);
  } catch (error: any) {
    logger.error(`❌ [sendFinalWarningNotification] 경고 발송 실패: ${teamId}`, {
      error: error.message,
    });
  }
}

/**
 * 경고 발송 시각 업데이트
 */
async function updateWarningSentAt(
  teamId: string,
  captainUid: string,
  type: "warning" | "final"
): Promise<void> {
  try {
    const memberRef = db.doc(`teams/${teamId}/members/${captainUid}`);
    if (type === "warning") {
      await memberRef.update({
        warningSentAt: FieldValue.serverTimestamp(),
      });
    } else {
      await memberRef.update({
        finalWarningSentAt: FieldValue.serverTimestamp(),
      });
    }
  } catch (error: any) {
    logger.warn(`⚠️ [updateWarningSentAt] 업데이트 실패: ${teamId}`, {
      error: error.message,
    });
  }
}

/**
 * 자동 위임 실행
 */
async function autoTransferCaptain(
  teamId: string,
  oldCaptainUid: string,
  teamName: string
): Promise<boolean> {
  try {
    // 위임 대상 선택
    const nextCaptain = await selectNextCaptain(teamId, oldCaptainUid);

    if (!nextCaptain) {
      logger.warn(`⚠️ [autoTransferCaptain] 위임 대상 없음: ${teamId}`);
      // 위임 대상이 없으면 팀 잠금 (선택사항)
      // await lockTeam(teamId);
      return false;
    }

    // 트랜잭션으로 위임 처리
    await db.runTransaction(async (transaction) => {
      const teamRef = db.doc(`teams/${teamId}`);
      const oldCaptainRef = db.doc(`teams/${teamId}/members/${oldCaptainUid}`);
      const newCaptainRef = db.doc(`teams/${teamId}/members/${nextCaptain.uid}`);

      // 팀 문서 업데이트
      transaction.update(teamRef, {
        ownerUid: nextCaptain.uid,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 멤버 역할 업데이트
      transaction.update(oldCaptainRef, {
        role: "member",
        accessLevel: "STAFF", // 기본 권한으로 변경
      });

      transaction.update(newCaptainRef, {
        role: "owner",
        accessLevel: "OWNER",
      });
    });

    // 알림 발송
    await sendAutoTransferNotifications(
      teamId,
      oldCaptainUid,
      nextCaptain.uid,
      teamName,
      nextCaptain.name
    );

    logger.info(`✅ [autoTransferCaptain] 자동 위임 완료: ${teamId}`, {
      oldCaptain: oldCaptainUid,
      newCaptain: nextCaptain.uid,
    });

    return true;
  } catch (error: any) {
    logger.error(`❌ [autoTransferCaptain] 자동 위임 실패: ${teamId}`, {
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}

/**
 * 위임 대상 선택
 * 
 * 우선순위:
 * 1. 부팀장 (있다면)
 * 2. 팀원 중 가입 오래된 순
 * 3. 최근 활동 있음
 */
async function selectNextCaptain(
  teamId: string,
  excludeUid: string
): Promise<NextCaptainCandidate | null> {
  try {
    const membersRef = db.collection(`teams/${teamId}/members`);
    const membersSnap = await membersRef.get();

    if (membersSnap.empty) {
      return null;
    }

    const candidates: NextCaptainCandidate[] = [];

    for (const memberDoc of membersSnap.docs) {
      const memberData = memberDoc.data();
      const memberUid = memberDoc.id;

      // 본인 제외
      if (memberUid === excludeUid) {
        continue;
      }

      // 삭제된 멤버 제외
      if (memberData.isDeleted === true) {
        continue;
      }

      // 사용자 정보 조회
      const userRef = db.doc(`users/${memberUid}`);
      const userSnap = await userRef.get();
      const userData = userSnap.exists ? userSnap.data() : null;
      const userName = userData?.displayName || userData?.name || memberUid;

      // 부팀장 확인 (role이 'vice' 또는 '부팀장' 등)
      const isViceCaptain = 
        memberData.role === "vice" ||
        memberData.role === "부팀장" ||
        memberData.accessLevel === "ADMIN";

      candidates.push({
        uid: memberUid,
        name: userName,
        joinedAt: memberData.joinedAt || admin.firestore.Timestamp.now(),
        lastActiveAt: memberData.lastActiveAt,
        isViceCaptain,
      });
    }

    if (candidates.length === 0) {
      return null;
    }

    // 우선순위 정렬
    candidates.sort((a, b) => {
      // 1. 부팀장 우선
      if (a.isViceCaptain && !b.isViceCaptain) return -1;
      if (!a.isViceCaptain && b.isViceCaptain) return 1;

      // 2. 가입 오래된 순
      const aJoined = a.joinedAt.toMillis();
      const bJoined = b.joinedAt.toMillis();
      if (aJoined !== bJoined) {
        return aJoined - bJoined; // 오래된 순
      }

      // 3. 최근 활동 있음
      if (a.lastActiveAt && !b.lastActiveAt) return -1;
      if (!a.lastActiveAt && b.lastActiveAt) return 1;
      if (a.lastActiveAt && b.lastActiveAt) {
        return b.lastActiveAt.toMillis() - a.lastActiveAt.toMillis(); // 최근 활동 순
      }

      return 0;
    });

    return candidates[0];
  } catch (error: any) {
    logger.error(`❌ [selectNextCaptain] 위임 대상 선택 실패: ${teamId}`, {
      error: error.message,
    });
    return null;
  }
}

/**
 * 자동 위임 알림 발송
 */
async function sendAutoTransferNotifications(
  teamId: string,
  oldCaptainUid: string,
  newCaptainUid: string,
  teamName: string,
  newCaptainName: string
): Promise<void> {
  try {
    // 새 팀장에게 알림
    const newCaptainNotificationRef = db.collection("notifications").doc();
    await newCaptainNotificationRef.set({
      userId: newCaptainUid,
      type: "TEAM_CAPTAIN_DELEGATED",
      teamId,
      title: "팀장으로 자동 위임되었어요",
      message: `🛡️ ${teamName}의 팀장으로 자동 위임되었어요. 팀 활동을 계속 이어주세요.`,
      link: `/me/team/${teamId}/manage`,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 이전 팀장에게 알림
    const oldCaptainNotificationRef = db.collection("notifications").doc();
    await oldCaptainNotificationRef.set({
      userId: oldCaptainUid,
      type: "TEAM_CAPTAIN_DELEGATED",
      teamId,
      title: "팀장 권한이 자동 위임되었어요",
      message: `ℹ️ 장기간 활동이 없어 ${teamName}의 팀장 권한이 위임되었어요. 현재는 팀원으로 활동 중이에요.`,
      link: "/me",
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 팀원 전체에게 알림
    const membersRef = db.collection(`teams/${teamId}/members`);
    const membersSnap = await membersRef.get();

    const teamMemberNotifications = membersSnap.docs
      .filter((doc) => {
        const memberUid = doc.id;
        return memberUid !== oldCaptainUid && memberUid !== newCaptainUid;
      })
      .map((doc) => {
        const notificationRef = db.collection("notifications").doc();
        return notificationRef.set({
          userId: doc.id,
          type: "TEAM_CAPTAIN_DELEGATED", // 재사용
          teamId,
          title: "팀장이 변경되었어요",
          message: `📢 ${teamName}의 팀장이 변경되었어요. 새 팀장: ${newCaptainName}`,
          link: `/teams/${teamId}`,
          isRead: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      });

    await Promise.all(teamMemberNotifications);

    logger.info(`✅ [sendAutoTransferNotifications] 알림 발송 완료: ${teamId}`);
  } catch (error: any) {
    logger.error(`❌ [sendAutoTransferNotifications] 알림 발송 실패: ${teamId}`, {
      error: error.message,
    });
  }
}

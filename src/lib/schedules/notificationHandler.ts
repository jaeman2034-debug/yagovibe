/**
 * 🔥 일정 관련 알림 핸들러
 * 
 * 기능:
 * - 일정 생성 시 알림 발송
 * - 일정 변경 시 알림 발송
 * - 리마인드 알림 생성 (Cloud Functions용)
 */

import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Schedule } from "@/types/schedule";
import type { NotificationType } from "@/types/notification";

/**
 * 일정 생성 시 알림 발송
 * 
 * @param schedule 생성된 일정
 * @param teamId 팀 ID
 * @param creatorId 생성자 UID (알림 제외)
 */
export async function notifyScheduleCreated(
  schedule: Schedule,
  teamId: string,
  creatorId: string
): Promise<void> {
  try {
    // 팀 멤버 조회
    const membersRef = collection(db, "teams", teamId, "members");
    const membersSnap = await getDocs(membersRef);

    // 우선순위 결정 (당일 일정이면 high)
    const scheduleDate = schedule.dateTime?.toDate
      ? schedule.dateTime.toDate()
      : new Date(schedule.dateTime);
    const now = new Date();
    const isToday = scheduleDate.toDateString() === now.toDateString();
    const priority: "high" | "normal" = isToday ? "high" : "normal";

    // 알림 생성
    const notifications = [];
    for (const memberDoc of membersSnap.docs) {
      const memberUid = memberDoc.id;
      // 생성자 제외
      if (memberUid === creatorId) continue;

      const notificationData = {
        userId: memberUid,
        type: "TEAM_SCHEDULE_CREATED" as NotificationType,
        title: "새 일정이 등록되었어요",
        message: `${schedule.title} - ${schedule.type}`,
        target: {
          screen: "team" as const,
          id: schedule.id,
          params: { teamId, open: schedule.id },
        },
        priority,
        isRead: false,
        createdAt: serverTimestamp(),
        payload: {
          scheduleId: schedule.id,
          teamId,
          scheduleType: schedule.type,
        },
      };

      notifications.push(
        addDoc(collection(db, "notifications"), notificationData)
      );
    }

    // 알림 발송 (실패해도 계속 진행)
    await Promise.allSettled(notifications);
  } catch (error) {
    console.error("일정 생성 알림 발송 실패:", error);
    // Fail-safe: 알림 실패해도 throw 하지 않음
  }
}

/**
 * 일정 변경 시 알림 발송
 * 
 * @param schedule 변경된 일정
 * @param teamId 팀 ID
 * @param changedFields 변경된 필드 목록
 */
export async function notifyScheduleUpdated(
  schedule: Schedule,
  teamId: string,
  changedFields: string[]
): Promise<void> {
  try {
    // 참석/미응답 멤버 조회
    const attendance = schedule.attendance || {};
    const targetUserIds = Object.keys(attendance).filter(
      (uid) => attendance[uid] === "참석" || attendance[uid] === "미정"
    );

    if (targetUserIds.length === 0) return;

    // 변경 내용 요약
    const changeSummary = changedFields
      .map((field) => {
        switch (field) {
          case "dateTime":
            return "시간";
          case "place":
            return "장소";
          case "opponent":
            return "상대팀";
          default:
            return field;
        }
      })
      .join(", ");

    // 알림 생성
    const notifications = targetUserIds.map((userId) => ({
      userId,
      type: "TEAM_SCHEDULE_UPDATED" as NotificationType,
      title: "일정이 변경되었어요",
      message: `${schedule.title} - ${changeSummary} 변경`,
      target: {
        screen: "team" as const,
        id: schedule.id,
        params: { teamId, open: schedule.id },
      },
      priority: "high" as const,
      isRead: false,
      createdAt: serverTimestamp(),
      payload: {
        scheduleId: schedule.id,
        teamId,
        changedFields,
      },
    }));

    // 알림 발송
    await Promise.allSettled(
      notifications.map((data) =>
        addDoc(collection(db, "notifications"), data)
      )
    );
  } catch (error) {
    console.error("일정 변경 알림 발송 실패:", error);
    // Fail-safe: 알림 실패해도 throw 하지 않음
  }
}

/**
 * 일정 리마인드 알림 생성 (Cloud Functions용)
 * 
 * @param schedule 일정
 * @param teamId 팀 ID
 * @param reminderType 리마인드 타입 (D-1 또는 D-0)
 * @param targetUserIds 대상 사용자 ID 목록
 */
export async function createReminderNotifications(
  schedule: Schedule,
  teamId: string,
  reminderType: "D-1" | "D-0",
  targetUserIds: string[]
): Promise<void> {
  try {
    const scheduleDate = schedule.dateTime?.toDate
      ? schedule.dateTime.toDate()
      : new Date(schedule.dateTime);

    const dateStr = scheduleDate.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
    });
    const timeStr = scheduleDate.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const title =
      reminderType === "D-1"
        ? "내일 일정이 있어요"
        : "곧 일정이 시작돼요";

    const message =
      reminderType === "D-1"
        ? `${schedule.title} - ${dateStr} ${timeStr}`
        : `${schedule.title} - ${timeStr} 시작`;

    const priority = reminderType === "D-0" ? ("high" as const) : ("normal" as const);

    // 알림 생성
    const notifications = targetUserIds.map((userId) => ({
      userId,
      type: "TEAM_SCHEDULE_REMINDER" as NotificationType,
      title,
      message,
      target: {
        screen: "team" as const,
        id: schedule.id,
        params: { teamId, open: schedule.id },
      },
      priority,
      isRead: false,
      createdAt: serverTimestamp(),
      payload: {
        scheduleId: schedule.id,
        teamId,
        reminderType,
      },
    }));

    // 알림 발송
    await Promise.allSettled(
      notifications.map((data) =>
        addDoc(collection(db, "notifications"), data)
      )
    );
  } catch (error) {
    console.error("리마인드 알림 생성 실패:", error);
    // Fail-safe: 알림 실패해도 throw 하지 않음
  }
}

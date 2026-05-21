/**
 * 🔥 일정 리마인드 로직 (Cloud Functions용 준비)
 * 
 * 규칙:
 * - D-1 20:00 (normal)
 * - D-0 2시간 전 (high)
 * 
 * 구현 위치: functions/src/schedules/dailyReminders.ts
 */

import type { Schedule } from "@/types/schedule";

export interface ScheduleReminder {
  scheduleId: string;
  teamId: string;
  userId: string;
  type: "D-1" | "D-0";
  scheduleDate: Date;
  priority: "normal" | "high";
}

/**
 * 일정 리마인드 필요 여부 확인
 * 
 * @param schedule 일정 데이터
 * @param now 현재 시간
 * @returns 리마인드 필요 여부 및 타입
 */
export function checkReminderNeeded(
  schedule: Schedule,
  now: Date = new Date()
): { needed: boolean; type?: "D-1" | "D-0" } {
  if (!schedule.dateTime) {
    return { needed: false };
  }

  const scheduleDate = schedule.dateTime.toDate
    ? schedule.dateTime.toDate()
    : new Date(schedule.dateTime);

  const diffMs = scheduleDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // D-1 체크: 20:00 ~ 24:00 사이, 1일 전
  if (diffDays >= 0.8 && diffDays <= 1.2) {
    const currentHour = now.getHours();
    if (currentHour >= 20) {
      return { needed: true, type: "D-1" };
    }
  }

  // D-0 체크: 2시간 전 ~ 일정 시간 사이
  if (diffHours >= 0 && diffHours <= 2) {
    return { needed: true, type: "D-0" };
  }

  return { needed: false };
}

/**
 * 일정 리마인드 알림 생성 (Cloud Functions에서 사용)
 * 
 * @param schedule 일정 데이터
 * @param memberIds 팀 멤버 ID 목록
 * @param reminderType 리마인드 타입
 * @returns 알림 데이터 목록
 */
export function generateReminderNotifications(
  schedule: Schedule,
  memberIds: string[],
  reminderType: "D-1" | "D-0"
): Array<{
  userId: string;
  type: "TEAM_SCHEDULE_REMINDER";
  title: string;
  message: string;
  priority: "normal" | "high";
  target: {
    screen: "team";
    id: schedule.id;
    params: { teamId: schedule.teamId; open: schedule.id };
  };
}> {
  const scheduleDate = schedule.dateTime.toDate
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

  return memberIds.map((userId) => ({
    userId,
    type: "TEAM_SCHEDULE_REMINDER" as const,
    title,
    message,
    priority: reminderType === "D-0" ? ("high" as const) : ("normal" as const),
    target: {
      screen: "team" as const,
      id: schedule.id,
      params: { teamId: schedule.teamId, open: schedule.id },
    },
  }));
}

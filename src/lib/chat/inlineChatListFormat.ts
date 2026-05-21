/**
 * 인라인 채팅 목록(팀/모집 패널, 거래 ChatRoom) 공통 — 날짜·시간·그룹 판별
 * Firestore 메시지 스키마는 건드리지 않고 `createdAt` / `senderId` / `uid`만 사용.
 */

export function createdAtToDate(createdAt: unknown): Date | null {
  try {
    if (createdAt == null) return null;
    const c = createdAt as { toDate?: () => Date };
    if (typeof c.toDate === "function") {
      const d = c.toDate();
      return d && !Number.isNaN(d.getTime()) ? d : null;
    }
    if (createdAt instanceof Date) {
      return Number.isNaN(createdAt.getTime()) ? null : createdAt;
    }
    if (typeof createdAt === "number") {
      const d = new Date(createdAt);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof createdAt === "object" && createdAt && "seconds" in createdAt) {
      const seconds = Number((createdAt as { seconds?: unknown }).seconds ?? 0);
      if (!Number.isFinite(seconds)) return null;
      const millis = seconds * 1000;
      const d = new Date(millis);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch {
    return null;
  }
}

export function sameCalendarDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 같은 시·분이면 true (연속 말풍선에 시간 한 번만 표시할 때) */
export function isSameCalendarMinute(a: unknown, b: unknown): boolean {
  const da = createdAtToDate(a);
  const db = createdAtToDate(b);
  if (!da || !db) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate() &&
    da.getHours() === db.getHours() &&
    da.getMinutes() === db.getMinutes()
  );
}

/** 목록 구분선용 (예: 2026년 4월 15일 (수)) */
export function formatChatListDateLabel(createdAt: unknown): string {
  const d = createdAtToDate(createdAt);
  if (!d) return "";
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

/** 말풍선 하단 시간 */
export function formatChatListTime(createdAt: unknown): string {
  const d = createdAtToDate(createdAt);
  if (!d) return "";
  return d.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function messageAuthorKey(m: { senderId?: string; uid?: string }): string {
  return String(m.senderId || m.uid || "");
}

/** 같은 작성자 연속 블록의 마지막 줄에만 시간·읽음 메타를 붙일 때 */
export function isLastInAuthorGroup(
  curr: { senderId?: string; uid?: string },
  next: { senderId?: string; uid?: string } | undefined
): boolean {
  if (!next) return true;
  return messageAuthorKey(curr) !== messageAuthorKey(next);
}

/** 팀 단톡: 상대 연속 발화면 "멤버" 라벨 숨김 */
export function showInlineTeamPeerLabel(
  msg: { senderId?: string },
  prev: { senderId?: string } | undefined,
  myUid: string | undefined
): boolean {
  if (!myUid) return false;
  if ((msg.senderId || "") === myUid) return false;
  if (!prev) return true;
  const prevMine = (prev.senderId || "") === myUid;
  if (prevMine) return true;
  return (prev.senderId || "") !== (msg.senderId || "");
}

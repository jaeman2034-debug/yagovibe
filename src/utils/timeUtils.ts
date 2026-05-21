/**
 * 🔥 시간 유틸리티 함수
 * 
 * 역할:
 * - 시간 표시 포맷팅 (상대 시간)
 * - 시간 문자열 파싱 (정렬용)
 * - Firestore Timestamp → Date 변환
 */

/**
 * 🔥 Firestore Timestamp를 Date로 변환 (안전한 변환)
 * 
 * @param value - Date, Firestore Timestamp, number, string 등
 * @returns Date 객체 또는 null
 */
export function toDate(value: any): Date | null {
  if (!value) return null;
  
  if (value instanceof Date) return value;
  
  // Firestore Timestamp (toDate() 메서드가 있는 경우)
  if (value?.toDate && typeof value.toDate === 'function') {
    return value.toDate();
  }
  
  // 숫자 (timestamp)
  if (typeof value === 'number') return new Date(value);
  
  // 문자열
  if (typeof value === 'string') return new Date(value);
  
  // Firestore Timestamp 객체 (seconds, nanoseconds 속성이 있는 경우)
  if (value?.seconds !== undefined) {
    return new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1000000);
  }
  
  return null;
}

/**
 * activities 등: Firestore `createdAt`이 아직 null/빈 값일 때 `createdAtMillis`로 보조
 */
export function toDateWithMillisFallback(
  createdAt: unknown,
  createdAtMillis?: number | null
): Date | null {
  const fromStamp = toDate(createdAt);
  if (fromStamp && !Number.isNaN(fromStamp.getTime())) return fromStamp;
  if (typeof createdAtMillis === "number" && Number.isFinite(createdAtMillis)) {
    return new Date(createdAtMillis);
  }
  return null;
}

/**
 * 🔥 상대 시간 표시 (예: "5분 전", "2시간 전")
 * 
 * @param date - Date, Firestore Timestamp, number, string 등
 * @returns 상대 시간 문자열
 */
export function getTimeAgo(date: Date | any): string {
  const d = toDate(date);
  if (!d) return "";
  
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return `${days}일 전`;
}

/**
 * 🔥 시간 문자열을 숫자로 파싱 (정렬용)
 * 
 * @param timeStr - "5분 전", "2시간 전" 등의 문자열
 * @returns 분 단위 숫자 (정렬에 사용)
 */
export function parseTimeAgo(timeStr: string): number {
  if (timeStr === "방금 전") return 0;
  const match = timeStr.match(/(\d+)(분|시간|일) 전/);
  if (!match) return 999999;
  const value = parseInt(match[1]);
  const unit = match[2];
  if (unit === "분") return value;
  if (unit === "시간") return value * 60;
  if (unit === "일") return value * 60 * 24;
  return 999999;
}

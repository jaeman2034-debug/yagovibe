/**
 * Firestore `Timestamp`·직렬화 `{ seconds|_seconds }`·ISO 문자열·epoch(ms) 등을 `Date`로.
 * 캐시/REST 등으로 `toDate`가 없는 평문 객체가 와도 동일 인스턴트로 복원한다.
 */
export function firestoreLikeToDate(value: unknown): Date | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const d = new Date(value.trim());
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    const d = (value as { toDate: () => Date }).toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  const secRaw = (value as { seconds?: unknown; _seconds?: unknown }).seconds;
  const secPriv = (value as { seconds?: unknown; _seconds?: unknown })._seconds;
  const sec =
    typeof secRaw === "number" && Number.isFinite(secRaw)
      ? secRaw
      : typeof secPriv === "number" && Number.isFinite(secPriv)
        ? secPriv
        : undefined;
  if (sec !== undefined) {
    const d = new Date(sec * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

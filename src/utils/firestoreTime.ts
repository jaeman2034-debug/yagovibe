/**
 * Firestore/Timestamp/Date/숫자 → ms
 */
export function toMillis(value: unknown): number {
    if (value == null) return 0;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (value instanceof Date) return value.getTime();
    if (
        typeof value === "object" &&
        typeof (value as { toMillis?: () => number }).toMillis === "function"
    ) {
        return (value as { toMillis: () => number }).toMillis();
    }
    return 0;
}

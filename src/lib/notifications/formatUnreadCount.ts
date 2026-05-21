/** 배지·짧은 문구용 (100 이상은 99+) */
export function formatUnreadCount(n: number): string {
  if (n > 99) return "99+";
  return String(n);
}

/** 페이지 상단 등 한 줄 라벨 */
export function formatUnreadCountFullLabel(n: number): string {
  if (n > 99) return "읽지 않음 99+";
  return `읽지 않음 ${n}개`;
}

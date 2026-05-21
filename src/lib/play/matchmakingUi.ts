/** 큐 입장 실패 — 동일 계정 다른 탭이 이미 큐 점유 */
export function isOtherTabQueueError(message: string | null | undefined): boolean {
  if (!message) return false;
  return message.includes("다른 탭") || message.includes("기기");
}

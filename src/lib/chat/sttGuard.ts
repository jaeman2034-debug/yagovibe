/**
 * 🔥 STT 연타 방지 가드
 * 
 * 배포 안정화:
 * - 같은 transcript 1초 내 반복 전송 방지
 * - 실사용에서 자주 발생하는 문제 해결
 */

const recentTranscripts = new Map<string, number>(); // messageId -> timestamp
const DEBOUNCE_MS = 1000; // 1초

export function shouldSendSTTMessage(transcript: string, roomId: string): boolean {
  const key = `${roomId}:${transcript.trim().toLowerCase()}`;
  const now = Date.now();
  const lastSent = recentTranscripts.get(key);

  // 🔥 1초 내 같은 transcript면 차단
  if (lastSent && now - lastSent < DEBOUNCE_MS) {
    console.warn("⚠️ [STT Guard] 같은 transcript 반복 전송 차단:", transcript.substring(0, 20));
    return false;
  }

  // 🔥 새 transcript 기록
  recentTranscripts.set(key, now);

  // 🔥 오래된 기록 정리 (메모리 관리)
  if (recentTranscripts.size > 100) {
    const cutoff = now - DEBOUNCE_MS * 10; // 10초 전 기록 제거
    for (const [k, v] of recentTranscripts.entries()) {
      if (v < cutoff) {
        recentTranscripts.delete(k);
      }
    }
  }

  return true;
}

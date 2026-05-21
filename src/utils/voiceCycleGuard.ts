/**
 * 🛑 STT 무한 재호출 방지 가드
 * 
 * 핵심 원칙:
 * - 한 번 명령을 처리했으면, 그 사이클이 끝날 때까지 STT를 절대 다시 켜지 않는다
 * - voiceCycleActive 플래그로 중복 실행 완전 차단
 */

let voiceCycleActive = false;

/**
 * 음성 사이클 시작 (중복 실행 방지)
 * @returns true: 사이클 시작 가능, false: 이미 실행 중 (차단)
 */
export function beginVoiceCycle(): boolean {
  if (voiceCycleActive) {
    console.warn("🛑 [VoiceCycleGuard] 중복 음성 사이클 차단");
    return false;
  }
  voiceCycleActive = true;
  console.log("✅ [VoiceCycleGuard] 음성 사이클 시작");
  return true;
}

/**
 * 음성 사이클 종료 (다음 사이클 허용)
 */
export function endVoiceCycle(): void {
  voiceCycleActive = false;
  console.log("✅ [VoiceCycleGuard] 음성 사이클 종료");
}

/**
 * 현재 음성 사이클이 활성화되어 있는지 확인
 */
export function isVoiceCycleActive(): boolean {
  return voiceCycleActive;
}

/**
 * 강제 리셋 (에러 복구용)
 */
export function resetVoiceCycle(): void {
  voiceCycleActive = false;
  console.log("🔄 [VoiceCycleGuard] 음성 사이클 강제 리셋");
}

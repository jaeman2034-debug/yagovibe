/**
 * 🔁 Voice State Machine
 * 단순 상태 머신 (4개 고정)
 * 상태 전이 외 로직 금지
 */

export type VoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'EXECUTING';

export interface VoiceStateMachine {
  current: VoiceState;
  setState: (state: VoiceState) => void;
}

/**
 * 상태 전이 검증
 */
export function canTransition(
  from: VoiceState,
  to: VoiceState
): boolean {
  const validTransitions: Record<VoiceState, VoiceState[]> = {
    IDLE: ['LISTENING'],
    LISTENING: ['PROCESSING', 'IDLE'],
    PROCESSING: ['EXECUTING', 'IDLE'],
    EXECUTING: ['IDLE'],
  };

  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * 상태 머신 생성
 */
export function createVoiceStateMachine(
  initialState: VoiceState = 'IDLE',
  onStateChange?: (state: VoiceState) => void
): VoiceStateMachine {
  let current = initialState;

  return {
    get current() {
      return current;
    },
    setState(newState: VoiceState) {
      if (canTransition(current, newState)) {
        current = newState;
        onStateChange?.(current);
      } else {
        console.warn(
          `⚠️ 잘못된 상태 전이: ${current} → ${newState}`
        );
      }
    },
  };
}

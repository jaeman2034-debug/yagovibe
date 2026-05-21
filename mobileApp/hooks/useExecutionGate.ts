/**
 * 🔒 실행 게이트 훅
 * 중복 실행 방지 (쿨다운 + 상태 락 + 해시 방지)
 */

import { useRef, useCallback } from 'react';

export interface UseExecutionGateOptions {
  cooldownMs?: number; // 쿨다운 시간 (기본 4000ms)
  checkState?: () => boolean; // 상태 락 체크 함수 (선택)
}

export function useExecutionGate(options: UseExecutionGateOptions = {}) {
  const { cooldownMs = 4000, checkState } = options;
  const lastExecAtRef = useRef<number>(0);
  const lastCommandHashRef = useRef<string>('');

  const canExecute = useCallback(
    (finalText?: string) => {
      // ① 실행 쿨다운
      const now = Date.now();
      if (now - lastExecAtRef.current < cooldownMs) {
        console.log('⏸ 실행 쿨다운 중...');
        return false;
      }

      // ② 상태 락 (선택)
      if (checkState && !checkState()) {
        console.log('⏸ 상태 락으로 실행 불가...');
        return false;
      }

      // ③ 동일 명령 해시 방지
      if (finalText) {
        const textHash = finalText.trim().toLowerCase();
        if (textHash === lastCommandHashRef.current && textHash.length > 0) {
          console.log('⏸ 동일 명령 중복 방지...');
          return false;
        }
      }

      return true;
    },
    [cooldownMs, checkState]
  );

  const markExecuted = useCallback((finalText?: string) => {
    lastExecAtRef.current = Date.now();
    if (finalText) {
      lastCommandHashRef.current = finalText.trim().toLowerCase();
    }
  }, []);

  return { canExecute, markExecuted };
}

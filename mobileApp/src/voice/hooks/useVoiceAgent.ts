/**
 * 🧠 useVoiceAgent Hook (완성본)
 * 모바일 앱의 심장
 * 모든 레이어 통합
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { WakeState, MemoryItem } from '../types';
import { VOICE_AGENT_CONFIG } from '../config';
import type { VoiceState } from '../state/voiceState';
import { createVoiceStateMachine } from '../state/voiceState';
import { startWakeWordDetection } from '../audio/wakeWord';
import { startWhisperStreaming } from '../audio/whisperStream';
import { startSilenceDetection } from '../audio/silenceDetector';
import { execute } from '../executor/executor';
import {
  addToMemory,
  getLastMemory,
  createMemorySummary,
  updateMemory,
} from '../memory/recentMemory';
import { runAgent } from '../agent/agentClient';
import { callExecuteIntent } from '../services/executeIntentService';

// Server Instruction 타입
export type ServerInstruction =
  | { kind: 'OPEN_SEARCH'; query: string }
  | { kind: 'OPEN_NAVIGATE'; destination: string }
  | { kind: 'NOOP' };

// Step Response 타입
export interface StepResponse {
  instruction: ServerInstruction;
  debug?: {
    finalText: string;
    action: string;
    fallback?: string;
    latencyMs?: number;
  };
}

/**
 * 서버 Step 엔드포인트 호출
 */
async function postStep(payload: {
  finalText: string;
  memory: string;
}): Promise<StepResponse> {
  const endpoint =
    'https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/voiceStep';

  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!r.ok) {
    throw new Error('step api failed');
  }

  return r.json();
}

/**
 * 300ms 대기 (생각하는 느낌)
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface UseVoiceAgentOptions {
  isAlwaysOn?: boolean;
  onStateChange?: (state: VoiceState) => void;
  onError?: (error: Error) => void;
}

export function useVoiceAgent(options: UseVoiceAgentOptions = {}) {
  const { isAlwaysOn = false, onStateChange, onError } = options;

  // 상태
  const [wakeState, setWakeState] = useState<WakeState>('IDLE');
  const [liveText, setLiveText] = useState('');
  const [lastUpdateAt, setLastUpdateAt] = useState<number>(Date.now());
  const [recentMemory, setRecentMemory] = useState<MemoryItem[]>([]);

  // State Machine
  const stateMachineRef = useRef(
    createVoiceStateMachine('IDLE', (state) => {
      onStateChange?.(state);
    })
  ).current;

  // Refs
  const streamingRef = useRef(false);
  const wakeStreamingRef = useRef(false);
  const executedRef = useRef(false);
  const silenceCleanupRef = useRef<(() => void) | null>(null);

  const state = stateMachineRef.current;
  const isListening = state === 'LISTENING';
  const isBusy = state === 'PROCESSING' || state === 'EXECUTING';

  /**
   * IDLE로 리셋
   */
  const resetToIdle = () => {
    executedRef.current = false;
    setLiveText('');
    setLastUpdateAt(Date.now());
    stateMachineRef.setState('IDLE');

    if (silenceCleanupRef.current) {
      silenceCleanupRef.current();
      silenceCleanupRef.current = null;
    }

    if (isAlwaysOn) {
      setWakeState('IDLE');
    }
  };

  /**
   * 수동 시작
   */
  const startManual = async () => {
    if (state !== 'IDLE') return;

    try {
      executedRef.current = false;
      setLiveText('');
      setLastUpdateAt(Date.now());
      stateMachineRef.setState('LISTENING');
      streamingRef.current = true;

      await startWhisperStreaming(
        VOICE_AGENT_CONFIG.chunkDuration,
        {
          onTextChunk: (chunkText) => {
            if (!streamingRef.current) return;

            setLiveText((prev) => {
              const next = prev ? prev + ' ' + chunkText : chunkText;
              return next;
            });
            setLastUpdateAt(Date.now());
          },
          onError: (error) => {
            console.error('❌ STT Streaming 오류:', error);
            onError?.(error);
            resetToIdle();
          },
        },
        () => streamingRef.current
      );
    } catch (error: any) {
      console.error('❌ 수동 시작 오류:', error);
      onError?.(error);
      resetToIdle();
    }
  };

  /**
   * 수동 중지
   */
  const stopManual = () => {
    streamingRef.current = false;
    resetToIdle();
  };

  // 1) Wake Word 감지 → STT 시작
  useEffect(() => {
    if (!isAlwaysOn || state !== 'IDLE') return;

    let isActive = true;

    const startWake = async () => {
      try {
        setWakeState('WAKE_LISTENING');
        wakeStreamingRef.current = true;

        await startWakeWordDetection(
          {
            onWake: () => {
              if (!isActive || state !== 'IDLE') return;

              wakeStreamingRef.current = false;
              executedRef.current = false;
              setLiveText('');
              setLastUpdateAt(Date.now());
              setWakeState('LISTENING');
              stateMachineRef.setState('LISTENING');
              streamingRef.current = true;

              // Whisper Streaming 시작
              startWhisperStreaming(
                VOICE_AGENT_CONFIG.chunkDuration,
                {
                  onTextChunk: (chunkText) => {
                    if (!streamingRef.current) return;

                    setLiveText((prev) => {
                      const next = prev ? prev + ' ' + chunkText : chunkText;
                      return next;
                    });
                    setLastUpdateAt(Date.now());
                  },
                  onError: (error) => {
                    console.error('❌ STT Streaming 오류:', error);
                    onError?.(error);
                    resetToIdle();
                  },
                },
                () => streamingRef.current
              );
            },
            onError: (error) => {
              console.error('❌ Wake Word 감지 오류:', error);
              onError?.(error);
            },
          },
          () =>
            wakeStreamingRef.current &&
            isAlwaysOn &&
            (state === 'IDLE' || state === 'WAKE_LISTENING')
        );
      } catch (error: any) {
        console.error('❌ Wake Word 시작 오류:', error);
        onError?.(error);
      }
    };

    startWake();

    return () => {
      isActive = false;
      wakeStreamingRef.current = false;
    };
  }, [isAlwaysOn, state]);

  // 2) 침묵 감지 → 말 끝 처리
  useEffect(() => {
    if (!isListening) return;

    // 기존 침묵 감지 정리
    if (silenceCleanupRef.current) {
      silenceCleanupRef.current();
      silenceCleanupRef.current = null;
    }

    // 침묵 감지 시작
    silenceCleanupRef.current = startSilenceDetection(
      lastUpdateAt,
      VOICE_AGENT_CONFIG.silenceThreshold,
      {
        onSilence: () => {
          if (!executedRef.current && liveText.length > 3) {
            executedRef.current = true;
            streamingRef.current = false;
            stateMachineRef.setState('PROCESSING');

            if (silenceCleanupRef.current) {
              silenceCleanupRef.current();
              silenceCleanupRef.current = null;
            }
          }
        },
      },
      () => streamingRef.current && isListening
    );

    return () => {
      if (silenceCleanupRef.current) {
        silenceCleanupRef.current();
        silenceCleanupRef.current = null;
      }
    };
  }, [isListening, lastUpdateAt, liveText]);

  // 3) PROCESSING → 서버 Step 호출 → EXECUTE
  useEffect(() => {
    if (state !== 'PROCESSING') return;

    (async () => {
      try {
        const finalText = liveText.trim();
        const memory = createMemorySummary(recentMemory);

        const t0 = Date.now();
        const resp = await postStep({ finalText, memory });
        const latencyMs = Date.now() - t0;

        // 300ms 대기 (생각하는 느낌)
        await sleep(300);

        stateMachineRef.setState('EXECUTING');

        const ins = resp.instruction;

        // 메모리 아이템 생성
        const newMemoryItem: MemoryItem = {
          intent: {
            type:
              ins.kind === 'OPEN_NAVIGATE'
                ? 'MAP_NAVIGATE'
                : ins.kind === 'OPEN_SEARCH'
                  ? 'MAP_SEARCH'
                  : 'NONE',
            query: finalText,
            autoNavigate: ins.kind === 'OPEN_NAVIGATE',
          },
          result:
            ins.kind === 'OPEN_NAVIGATE'
              ? { destination: ins.destination }
              : undefined,
          timestamp: Date.now(),
        };

        // Executor 실행
        if (ins.kind === 'OPEN_NAVIGATE') {
          await execute({
            action: 'NAVIGATE',
            query: ins.destination,
            filters: {
              openNow: false,
              parking: false,
              sort: 'DEFAULT',
            },
            finalText,
            recentMemory,
          });

          // 메모리 저장
          setRecentMemory((prev) => {
            const newMem = addToMemory(prev, {
              ...newMemoryItem,
              result: { destination: ins.destination },
            });
            return newMem;
          });
        } else if (ins.kind === 'OPEN_SEARCH') {
          await execute({
            action: 'SEARCH',
            query: ins.query,
            filters: {
              openNow: false,
              parking: false,
              sort: 'DEFAULT',
            },
            finalText,
            recentMemory,
          });

          // 메모리 저장
          setRecentMemory((prev) => {
            const newMem = addToMemory(prev, newMemoryItem);
            return newMem;
          });
        }

        // Debug 로그
        if (resp.debug) {
          console.log('✅ Step 응답:', {
            finalText,
            latencyMs,
            action: resp.debug.action,
            fallback: resp.debug.fallback,
          });
        }

        resetToIdle();

        // Always-On 모드면 Wake Word 감지 재시작
        if (isAlwaysOn) {
          setWakeState('IDLE');
          setTimeout(() => {
            // Wake Word 감지는 useEffect에서 자동 재시작
          }, 1000);
        }
      } catch (error: any) {
        console.error('❌ Step 처리 실패:', error);
        onError?.(error);

        // Ultimate Fallback: 기본 검색
        try {
          await execute({
            action: 'SEARCH',
            query: liveText.trim(),
            filters: {
              openNow: false,
              parking: false,
              sort: 'DEFAULT',
            },
            finalText: liveText.trim(),
            recentMemory,
          });
        } catch (fallbackError: any) {
          console.error('❌ Fallback 실행 실패:', fallbackError);
        } finally {
          resetToIdle();
        }
      }
    })();
  }, [state, liveText, recentMemory, isAlwaysOn, onError]);

  // Public API
  return useMemo(
    () => ({
      // State
      state,
      wakeState,
      liveText,
      recentMemory,
      isListening,
      isBusy,

      // Controls
      resetToIdle,
      startManual,
      stopManual,
      setIsAlwaysOn: (value: boolean) => {
        // Always-On 토글은 외부에서 관리
      },
    }),
    [state, wakeState, liveText, recentMemory, isListening, isBusy]
  );
}

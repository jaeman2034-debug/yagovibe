/**
 * 🧠 useVoiceAgent Hook (완성본)
 * 모든 레이어 통합
 * 앱의 심장
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type {
  WakeState,
  MemoryItem,
  VoiceAgentState,
} from '../types';
import { VOICE_AGENT_CONFIG } from '../config';

// Audio Layer
import {
  requestMicrophonePermission,
  configureAudioMode,
} from '../audio/microphone';
import { startWhisperStreaming } from '../audio/whisperStream';
import { startSilenceDetection } from '../audio/silenceDetector';
import { startWakeWordDetection } from '../audio/wakeWord';

// Agent Layer
import { runAgent } from '../agent/agentClient';

// Executor Layer
import { execute } from '../executor/executor';

// Memory Layer
import {
  addToMemory,
  createMemorySummary,
  updateMemory,
} from '../memory/recentMemory';

// State Layer
import { createVoiceStateMachine, type VoiceState } from '../state/voiceState';

interface UseVoiceAgentOptions {
  onStateChange?: (state: VoiceAgentState) => void;
  onError?: (error: Error) => void;
}

export function useVoiceAgent(options: UseVoiceAgentOptions = {}) {
  const { onStateChange, onError } = options;

  // 상태
  const [wakeState, setWakeState] = useState<WakeState>('IDLE');
  const [isAlwaysOn, setIsAlwaysOn] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [lastUpdateAt, setLastUpdateAt] = useState<number>(Date.now());
  const [recentMemory, setRecentMemory] = useState<MemoryItem[]>([]);

  // State Machine
  const stateMachine = useRef(
    createVoiceStateMachine('IDLE', (state) => {
      console.log('🔁 State:', state);
    })
  ).current;

  // Refs
  const streamingRef = useRef(false);
  const wakeStreamingRef = useRef(false);
  const silenceCleanupRef = useRef<(() => void) | null>(null);

  // STT Streaming 시작
  const startStreaming = useCallback(async () => {
    try {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        throw new Error('마이크 권한 필요');
      }

      await configureAudioMode();

      streamingRef.current = true;
      setLiveText('');
      setLastUpdateAt(Date.now());
      stateMachine.setState('LISTENING');

      // Whisper Streaming 시작
      let accumulatedText = '';

      await startWhisperStreaming(
        VOICE_AGENT_CONFIG.chunkDuration,
        {
          onTextChunk: (chunkText) => {
            accumulatedText = accumulatedText
              ? accumulatedText + ' ' + chunkText
              : chunkText;
            setLiveText(accumulatedText);
            setLastUpdateAt(Date.now());

            // 기존 침묵 감지 정리
            if (silenceCleanupRef.current) {
              silenceCleanupRef.current();
            }

            // 침묵 감지 시작
            silenceCleanupRef.current = startSilenceDetection(
              Date.now(),
              VOICE_AGENT_CONFIG.silenceThreshold,
              {
                onSilence: async () => {
                  if (!streamingRef.current) return;

                  streamingRef.current = false;
                  stateMachine.setState('PROCESSING');

                  const finalText = accumulatedText;
                  console.log('🗺 말 끝 감지! 최종 텍스트:', finalText);

                  try {
                    // Agent 호출
                    const memorySummary = createMemorySummary(recentMemory);
                    const agentResult = await runAgent(
                      finalText,
                      memorySummary,
                      recentMemory.length
                    );

                    console.log('✅ Agent 결정:', agentResult.action);

                    // 메모리 아이템 생성
                    const newMemoryItem: MemoryItem = {
                      intent: {
                        type:
                          agentResult.action === 'NAVIGATE'
                            ? 'MAP_NAVIGATE'
                            : agentResult.action === 'REPEAT_LAST' ||
                                agentResult.action === 'SEARCH_ALTERNATIVE'
                              ? recentMemory[0]?.intent.type || 'MAP_SEARCH'
                              : 'MAP_SEARCH',
                        query: agentResult.query || finalText,
                        filters: agentResult.filters,
                        autoNavigate: agentResult.action === 'NAVIGATE',
                      },
                      timestamp: Date.now(),
                    };

                    // Executor 실행
                    stateMachine.setState('EXECUTING');

                    const executeResult = await execute({
                      action: agentResult.action,
                      query: agentResult.query || finalText,
                      filters: agentResult.filters,
                      finalText,
                      recentMemory,
                    });

                    // 메모리 업데이트
                    const updatedMemory = addToMemory(recentMemory, newMemoryItem);
                    if (executeResult.memoryUpdate) {
                      const finalMemory = updateMemory(
                        updatedMemory,
                        0,
                        executeResult.memoryUpdate
                      );
                      setRecentMemory(finalMemory);
                    } else {
                      setRecentMemory(updatedMemory);
                    }

                    stateMachine.setState('IDLE');

                    // Always-On 모드면 Wake Word 감지 재시작
                    if (isAlwaysOn) {
                      setWakeState('IDLE');
                      setTimeout(() => {
                        if (isAlwaysOn) {
                          startWakeWordDetectionLoop();
                        }
                      }, 1000);
                    }
                  } catch (error: any) {
                    console.error('❌ Agent 처리 실패:', error);
                    onError?.(error);
                    stateMachine.setState('IDLE');

                    if (isAlwaysOn) {
                      setWakeState('IDLE');
                    }
                  }
                },
              },
              () => streamingRef.current
            );
          },
          onError: (error) => {
            console.error('❌ STT Streaming 오류:', error);
            onError?.(error);
          },
        },
        () => streamingRef.current
      );
    } catch (e: any) {
      console.error('❌ STT Streaming 시작 오류:', e);
      streamingRef.current = false;
      stateMachine.setState('IDLE');
      onError?.(e);
    }
  }, [recentMemory, isAlwaysOn, onError]);

  // STT Streaming 중지
  const stopStreaming = useCallback(() => {
    streamingRef.current = false;
    stateMachine.setState('IDLE');

    if (silenceCleanupRef.current) {
      silenceCleanupRef.current();
      silenceCleanupRef.current = null;
    }

    if (isAlwaysOn) {
      setWakeState('IDLE');
    }
  }, [isAlwaysOn]);

  // Wake Word 감지 루프
  const startWakeWordDetectionLoop = useCallback(async () => {
    if (!isAlwaysOn || wakeState !== 'IDLE') return;

    try {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        console.warn('⚠️ Wake Word 감지: 마이크 권한 없음');
        return;
      }

      await configureAudioMode();

      wakeStreamingRef.current = true;
      setWakeState('WAKE_LISTENING');

      await startWakeWordDetection(
        {
          onWake: () => {
            wakeStreamingRef.current = false;
            setWakeState('LISTENING');
            startStreaming();
          },
          onError: (error) => {
            console.error('❌ Wake Word 감지 오류:', error);
            onError?.(error);
          },
        },
        () => wakeStreamingRef.current && isAlwaysOn && wakeState === 'WAKE_LISTENING'
      );
    } catch (e: any) {
      console.error('❌ Wake Word 감지 시작 오류:', e);
      setWakeState('IDLE');
      wakeStreamingRef.current = false;
      onError?.(e);
    }
  }, [isAlwaysOn, wakeState, startStreaming, onError]);

  // Always-On 모드 토글
  const toggleAlwaysOn = useCallback(async () => {
    const newState = !isAlwaysOn;
    setIsAlwaysOn(newState);

    if (newState) {
      console.log('🎧 Always-On 모드 ON');
      setWakeState('IDLE');
      await startWakeWordDetectionLoop();
    } else {
      console.log('🎧 Always-On 모드 OFF');
      wakeStreamingRef.current = false;
      streamingRef.current = false;
      setWakeState('IDLE');
      stateMachine.setState('IDLE');

      if (silenceCleanupRef.current) {
        silenceCleanupRef.current();
        silenceCleanupRef.current = null;
      }
    }
  }, [isAlwaysOn, startWakeWordDetectionLoop]);

  // 상태 변경 시 콜백
  useEffect(() => {
    onStateChange?.({
      wakeState,
      isAlwaysOn,
      isStreaming: stateMachine.current === 'LISTENING',
      liveText,
      lastUpdateAt,
      executed: stateMachine.current === 'PROCESSING' || stateMachine.current === 'EXECUTING',
      recentMemory,
    });
  }, [
    wakeState,
    isAlwaysOn,
    stateMachine.current,
    liveText,
    lastUpdateAt,
    recentMemory,
    onStateChange,
  ]);

  return {
    // State
    wakeState,
    isAlwaysOn,
    isStreaming: stateMachine.current === 'LISTENING',
    liveText,
    recentMemory,
    currentState: stateMachine.current,

    // Actions
    startStreaming,
    stopStreaming,
    toggleAlwaysOn,
    setIsAlwaysOn,
  };
}

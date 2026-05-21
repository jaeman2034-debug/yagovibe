/**
 * 🎧 useWakeWord Hook
 * Wake Word 감지 및 Always-On 모드 관리
 */

import { useCallback, useRef } from 'react';
import * as Audio from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import type { WakeState } from '../types';
import { VOICE_AGENT_CONFIG } from '../config';
import { callSTT } from '../services/sttService';
import { detectWakeWord } from '../utils/wakeWordDetector';

interface UseWakeWordOptions {
  isAlwaysOn: boolean;
  wakeState: WakeState;
  onWakeDetected: () => void;
  onError?: (error: Error) => void;
}

export function useWakeWord(options: UseWakeWordOptions) {
  const { isAlwaysOn, wakeState, onWakeDetected, onError } = options;
  const wakeStreamingRef = useRef(false);

  // Wake Word 감지 루프 시작
  const startWakeWordDetection = useCallback(async () => {
    if (!isAlwaysOn || wakeState !== 'IDLE') return;

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        console.warn('⚠️ Wake Word 감지: 마이크 권한 없음');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      wakeStreamingRef.current = true;

      // 초저전력 Wake Word 감지 루프 (긴 간격)
      while (wakeStreamingRef.current && isAlwaysOn && wakeState === 'WAKE_LISTENING') {
        try {
          const { recording: wakeRecording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.LOW_QUALITY
          );

          // 3초 녹음 (Wake Word 감지용)
          await new Promise((resolve) => setTimeout(resolve, 3000));

          await wakeRecording.stopAndUnloadAsync();
          const wakeUri = wakeRecording.getURI();

          if (!wakeUri || !wakeStreamingRef.current) continue;

          // ⚠️ expo-file-system v19에서는 encoding을 문자열로 사용
          const base64 = await FileSystem.readAsStringAsync(wakeUri, {
            encoding: 'base64' as any,
          });

          const chunkText = await callSTT(base64);

          if (detectWakeWord(chunkText, VOICE_AGENT_CONFIG.wakeKeywords)) {
            console.log('🎧 Wake Word 감지!');
            wakeStreamingRef.current = false;
            onWakeDetected();
            return;
          }
        } catch (wakeError: any) {
          console.warn('⚠️ Wake Word 감지 오류:', wakeError);
        }
      }
    } catch (e: any) {
      console.error('❌ Wake Word 감지 시작 오류:', e);
      wakeStreamingRef.current = false;
      onError?.(e);
    }
  }, [isAlwaysOn, wakeState, onWakeDetected, onError]);

  // Wake Word 감지 중지
  const stopWakeWordDetection = useCallback(() => {
    wakeStreamingRef.current = false;
  }, []);

  return {
    startWakeWordDetection,
    stopWakeWordDetection,
  };
}

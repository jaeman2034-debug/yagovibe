import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Platform, Alert } from 'react-native';

/**
 * 🔊 안전한 TTS 재생 래퍼 (에러 격리 보장)
 * STT/Always-On 에러가 발생해도 TTS는 살아있게 함
 * "비서가 말할 권한"을 보장하는 핵심 함수
 * 🔥 핵심: TTS 완료(onDone)까지 기다리는 Promise 반환
 */
export async function speakOnce(text?: string): Promise<void> {
  if (!text) {
    console.log('⚠️ speakOnce: 텍스트가 없습니다');
    return;
  }

  try {
    console.log('🔊 speakOnce 시작:', text);
    await speakGuide(text);
    console.log('✅ speakOnce 완료 (onDone 콜백까지 대기 완료)');
  } catch (error) {
    // 🔥 에러가 발생해도 TTS는 계속 시도 (격리)
    console.warn('⚠️ speakOnce 에러 (격리됨):', error);
    // 최후의 수단: 직접 Speech.speak 호출 (Promise 기반)
    return new Promise<void>((resolve) => {
      try {
        Speech.speak(text, {
          language: 'ko-KR',
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
          onDone: () => {
            console.log('✅ Fallback TTS onDone - 재생 완료');
            resolve();
          },
          onStopped: () => {
            console.log('⚠️ Fallback TTS onStopped - 중단됨');
            resolve();
          },
          onError: () => {
            console.error('❌ Fallback TTS onError');
            resolve(); // 실패해도 흐름 유지
          },
        });
      } catch (fallbackError) {
        console.error('❌ speakOnce 최종 실패:', fallbackError);
        resolve(); // 에러 발생 시에도 Promise 해결
      }
    });
  }
}

/**
 * 🔊 안내 멘트 TTS 재생 (지도 열기 직전용)
 * TTS 완료까지 기다리는 Promise 기반
 * STT 사용 후 TTS 재생 전에 호출하여 오디오 포커스 전환
 */
export async function speakGuide(text?: string): Promise<void> {
  if (!text) {
    console.log('⚠️ speakGuide: 텍스트가 없습니다');
    return;
  }

  return new Promise<void>(async (resolve) => {
    try {
      console.log('🔊 speakGuide 시작:', text);
      
      // 🔥 오디오 모드 설정 (Android/iOS 정확히 분기)
      // ⚠️ interruptionModeAndroid 제거 (SDK 호환성 문제로 인한 오류 방지)
      const audioModeConfig = Platform.OS === 'android'
        ? {
            allowsRecordingIOS: false,
            staysActiveInBackground: false,
            shouldDuckAndroid: true, // 다른 오디오와 함께 재생 가능하도록
            playThroughEarpieceAndroid: false,
            // interruptionModeAndroid 제거 (invalid value 오류 방지)
          }
        : {
            allowsRecordingIOS: false,
            staysActiveInBackground: false,
            playsInSilentModeIOS: true,
            interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
          };

      // 🔥 Audio Mode 설정을 완료까지 기다림 (중요!)
      try {
        await Audio.setAudioModeAsync(audioModeConfig);
        console.log('✅ Audio Mode 설정 완료');
      } catch (audioError) {
        console.warn('⚠️ Audio Mode 설정 경고:', audioError);
        // 실패해도 계속 진행
      }

      // 🔥 짧은 딜레이로 오디오 포커스 안정화
      await new Promise((r) => setTimeout(r, 100));

      // 🔥 기존 TTS 세션 정리
      Speech.stop();
      console.log('✅ 기존 TTS 세션 정리 완료');

      // 🔥 TTS 재생 (Promise로 완료까지 기다림)
      console.log('🔊 TTS 재생 시작...');
      Speech.speak(text, {
        language: 'ko-KR',
        rate: 0.95,
        pitch: 1.0, // 🔥 pitch 추가 (일부 Android 기기에서 필요)
        volume: 1.0,
        onStart: () => {
          console.log('✅ TTS onStart 콜백 호출됨:', text);
        },
        onDone: () => {
          console.log('✅ TTS onDone 콜백 호출됨 - 재생 완료');
          resolve(); // TTS 완료 시 Promise 해결
        },
        onStopped: () => {
          console.log('⚠️ TTS onStopped 콜백 호출됨 - 중단됨');
          resolve(); // 중단되어도 Promise 해결
        },
        onError: (e) => {
          console.error('❌ TTS onError 콜백 호출됨:', e);
          resolve(); // 오류 발생 시에도 Promise 해결 (막지 않음)
        },
      });
      
      console.log('✅ Speech.speak() 호출 완료');
    } catch (error) {
      console.error('❌ speakGuide 예외 발생:', error);
      resolve(); // 오류 발생 시에도 Promise 해결
    }
  });
}

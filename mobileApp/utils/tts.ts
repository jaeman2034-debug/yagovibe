import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

/**
 * 🔊 안내 멘트 TTS 재생 (지도 열기 직전용)
 * STT 사용 후 TTS 재생 전에 호출하여 오디오 포커스 전환
 */
export async function speakGuide(text?: string) {
  if (!text) return;

  try {
    // 🔥 오디오 모드 설정 (Android/iOS 분기)
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
      ...(Platform.OS === 'android'
        ? { interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX }
        : { interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX }),
    });

    // 🔥 기존 TTS 세션 정리
    Speech.stop();

    // 🔥 TTS 재생
    Speech.speak(text, {
      language: 'ko-KR',
      rate: 0.95,
      volume: 1.0,
      onStart: () => console.log('🔊 안내 멘트 시작:', text),
      onDone: () => console.log('🔊 안내 멘트 완료'),
      onError: (e) => console.error('❌ 안내 멘트 오류', e),
    });
  } catch (error) {
    console.warn('⚠️ speakGuide 오류:', error);
  }
}

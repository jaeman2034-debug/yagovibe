/**
 * 🎙️ Microphone Service
 * Raw audio stream 관리
 * 비즈니스 로직 0, 이벤트만 emit
 */

import * as Audio from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

export interface AudioChunk {
  uri: string;
  base64: string;
}

/**
 * 마이크 권한 요청
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const permission = await Audio.requestPermissionsAsync();
    return permission.granted;
  } catch (error) {
    console.error('❌ 마이크 권한 요청 실패:', error);
    return false;
  }
}

/**
 * 오디오 모드 설정
 */
export async function configureAudioMode(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
}

/**
 * 오디오 chunk 녹음
 */
export async function recordAudioChunk(
  duration: number = 1500,
  quality: 'LOW' | 'HIGH' = 'LOW'
): Promise<AudioChunk | null> {
  try {
    const preset =
      quality === 'LOW'
        ? Audio.RecordingOptionsPresets.LOW_QUALITY
        : Audio.RecordingOptionsPresets.HIGH_QUALITY;

    const { recording } = await Audio.Recording.createAsync(preset);

    // 지정된 시간만큼 녹음
    await new Promise((resolve) => setTimeout(resolve, duration));

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();

    if (!uri) {
      return null;
    }

    // base64 변환
    // ⚠️ expo-file-system v19에서는 encoding을 문자열로 사용
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
    });

    return { uri, base64 };
  } catch (error) {
    console.error('❌ 오디오 녹음 실패:', error);
    return null;
  }
}

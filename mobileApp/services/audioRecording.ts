/**
 * 🎤 오디오 녹음 서비스
 * expo-av를 사용한 마이크 녹음 기능
 */

import { Audio } from 'expo-av';

// FileSystem은 expo-file-system 패키지가 필요합니다.
// 설치: npx expo install expo-file-system
let FileSystem: any;
try {
  FileSystem = require('expo-file-system/legacy');
} catch (e) {
  console.warn('expo-file-system이 설치되지 않았습니다. 설치가 필요합니다.');
}

export interface RecordingStatus {
  isRecording: boolean;
  durationMillis: number;
}

/**
 * 마이크 권한 요청
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('마이크 권한 요청 실패:', error);
    return false;
  }
}

/**
 * 오디오 녹음 설정 초기화
 */
export async function initializeAudioMode(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch (error) {
    console.error('오디오 모드 설정 실패:', error);
  }
}

/**
 * 오디오 녹음 클래스
 */
export class AudioRecorder {
  private recording: Audio.Recording | null = null;
  private uri: string | null = null;

  /**
   * 녹음 시작
   */
  async startRecording(): Promise<void> {
    try {
      // 권한 확인
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        throw new Error('마이크 권한이 없습니다.');
      }

      // 오디오 모드 설정
      await initializeAudioMode();

      // 녹음 시작
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          // 녹음 상태 업데이트 콜백
        }
      );

      this.recording = recording;
    } catch (error) {
      console.error('녹음 시작 실패:', error);
      throw error;
    }
  }

  /**
   * 녹음 중지 및 파일 경로 반환
   */
  async stopRecording(): Promise<string | null> {
    if (!this.recording) {
      return null;
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.uri = uri;
      this.recording = null;
      return uri;
    } catch (error) {
      console.error('녹음 중지 실패:', error);
      throw error;
    }
  }

  /**
   * 녹음 상태 확인
   */
  getStatus(): Promise<Audio.RecordingStatus | null> {
    if (!this.recording) {
      return Promise.resolve(null);
    }
    return this.recording.getStatusAsync();
  }

  /**
   * 녹음 URI 가져오기
   */
  getURI(): string | null {
    return this.uri;
  }

  /**
   * 녹음 파일을 Base64로 변환
   */
  async getBase64(): Promise<string | null> {
    if (!this.uri) {
      return null;
    }

    if (!FileSystem) {
      console.warn('expo-file-system이 설치되지 않아 Base64 변환을 할 수 없습니다.');
      return null;
    }

    try {
      const base64 = await FileSystem.readAsStringAsync(this.uri, {
        encoding: 'base64' as any,
      });
      return base64;
    } catch (error) {
      console.error('Base64 변환 실패:', error);
      return null;
    }
  }

  /**
   * 녹음 파일을 FormData로 변환 (서버 전송용)
   */
  async getFormData(): Promise<FormData | null> {
    if (!this.uri) {
      return null;
    }

    if (!FileSystem) {
      console.warn('expo-file-system이 설치되지 않아 FormData 생성을 할 수 없습니다.');
      return null;
    }

    try {
      // 파일 정보 가져오기
      const fileInfo = await FileSystem.getInfoAsync(this.uri);
      if (!fileInfo.exists) {
        return null;
      }

      // Base64로 읽기
      const base64 = await this.getBase64();
      if (!base64) {
        return null;
      }

      // FormData 생성
      const formData = new FormData();
      
      // Blob 생성 (React Native에서는 URI를 직접 전송)
      // 또는 base64를 사용하여 서버에서 처리
      formData.append('audio', {
        uri: this.uri,
        type: 'audio/m4a', // iOS는 m4a, Android는 m4a 또는 3gp
        name: 'recording.m4a',
      } as any);

      return formData;
    } catch (error) {
      console.error('FormData 생성 실패:', error);
      return null;
    }
  }

  /**
   * 리소스 정리
   */
  async cleanup(): Promise<void> {
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch (error) {
        console.error('리소스 정리 실패:', error);
      }
      this.recording = null;
    }

    // 파일 삭제 (선택사항)
    if (this.uri && FileSystem) {
      try {
        await FileSystem.deleteAsync(this.uri, { idempotent: true });
      } catch (error) {
        console.error('파일 삭제 실패:', error);
      }
      this.uri = null;
    }
  }
}

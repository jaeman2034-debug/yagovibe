/**
 * 🎙 Whisper API 호출 서비스
 * OpenAI Whisper API를 사용한 음성 인식 (STT)
 */

// Firebase Functions 엔드포인트 (환경 변수에서 가져오거나 기본값 사용)
const STT_URL = 
  process.env.EXPO_PUBLIC_STT_URL ||
  'https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/stt';

/**
 * Whisper API를 통한 음성 인식 (STT)
 * @param audioURI 녹음된 오디오 파일 URI
 * @returns 인식된 텍스트
 */
export async function transcribeAudio(audioURI: string): Promise<string> {
  try {
    // FormData 생성
    const formData = new FormData();
    
    // 오디오 파일 추가
    formData.append('audio', {
      uri: audioURI,
      type: 'audio/m4a', // iOS/Android 기본 형식
      name: 'recording.m4a',
    } as any);

    // API 호출 (headers 제거 - React Native가 자동으로 boundary 설정)
    const response = await fetch(STT_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whisper API 오류: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    // 응답 형식에 따라 텍스트 추출
    // handleImageAndVoiceAnalyze는 { voiceText: string } 형식 반환 가능
    if (result.voiceText) {
      return result.voiceText;
    }
    
    // 다른 형식도 지원
    if (result.transcript) {
      return result.transcript;
    }
    
    if (result.text) {
      return result.text;
    }

    throw new Error('응답 형식을 알 수 없습니다.');
  } catch (error) {
    console.error('Whisper API 호출 실패:', error);
    throw error;
  }
}

/**
 * 간단한 오디오 인식 (에러 처리 포함)
 */
export async function transcribeAudioSafe(audioURI: string): Promise<string | null> {
  try {
    return await transcribeAudio(audioURI);
  } catch (error) {
    console.error('STT 실패:', error);
    return null;
  }
}

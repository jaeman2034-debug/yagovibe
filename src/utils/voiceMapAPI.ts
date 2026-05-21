/**
 * 🌐 웹용 음성 명령 API 클라이언트 (슬롯 기반)
 * 
 * 설계 원칙:
 * - 웹은 입력/지도만 담당
 * - 서버는 판단/확장만 담당
 * - 슬롯 기반 구조로 확장성 확보
 */

export type WebIntent = 
  | 'OPEN_MAP'
  | 'FILTER_OPEN_NOW'
  | 'FILTER_DISTANCE'
  | 'SORT_PRICE_ASC'
  | 'SORT_DISTANCE_ASC'
  | 'ZOOM_IN'
  | 'ZOOM_OUT'
  | 'SEARCH_AROUND'
  | 'RECONFIRM'
  | 'UNKNOWN';

export interface VoiceSlots {
  query?: string;
  radius?: number;
  openNow?: boolean;
  sort?: 'PRICE_ASC' | 'DISTANCE_ASC';
}

export interface PlaceResult {
  name: string;
  address: string;
  rating: number;
  openNow: boolean | null;
  lat: number;
  lng: number;
  placeId?: string | null;
}

export interface WebVoiceResponse {
  intent: WebIntent;
  slots: VoiceSlots;
  message: string;
  error?: string;
  autoNavigate?: boolean; // 🔥 자동 네비게이션 시작 플래그
  places?: PlaceResult[]; // 🔥 서버에서 검색한 Places 결과
}

/**
 * 웹 음성 명령 API 호출
 */
export async function callVoiceAPI(
  text: string,
  lat?: number,
  lng?: number,
  lastQuery?: string, // 🔥 맥락 유지: 마지막 검색어
  userId?: string, // 🔥 개인화: 사용자 ID
  preferences?: Record<string, number> // 🔥 개인화: 선호 카테고리
): Promise<WebVoiceResponse & { preferences?: Record<string, number> }> {
  // 🔥 Firebase Functions URL (개발/프로덕션 분기)
  // 개발 환경: Firebase Functions Emulator (직접 호출)
  // 프로덕션: Firebase Cloud Functions
  // 🔥 실제 존재하는 함수: voiceStep (asia-northeast3)
  const isDev = import.meta.env.DEV;
  
  // 🔥 Firebase Functions Emulator URL 형식:
  // http://localhost:5001/{PROJECT_ID}/{REGION}/{FUNCTION_NAME}
  const API_URL = isDev
    ? 'http://localhost:5001/yago-vibe-spt/asia-northeast3/voiceStep'
    : 'https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/voiceStep';

  try {
    // 🔥 타임아웃 설정 (10초) - 호환성 있는 방법
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // 🔥 voiceStep은 finalText를 받음 (text → finalText 변환)
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        finalText: text.trim(), // 🔥 voiceStep 형식
        memory: lastQuery || '', // 🔥 맥락 정보 (선택적)
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 🔥 voiceStep 응답 형식 변환 (StepResponse → WebVoiceResponse)
    const stepResponse = await response.json() as {
      instruction: { kind: 'OPEN_SEARCH' | 'OPEN_NAVIGATE' | 'NOOP'; query?: string; destination?: string };
      summary?: { text: string; tts: string };
      decision?: { intent: string; autoNavigate: boolean };
      context?: { lastQuery: string };
      places?: Array<{ name: string; address: string; rating: number; openNow: boolean | null; lat: number; lng: number; placeId?: string | null }>; // 🔥 Places 검색 결과
    };
    
    // 🔥 StepResponse를 WebVoiceResponse로 변환
    if (stepResponse.instruction.kind === 'OPEN_SEARCH') {
      return {
        intent: 'OPEN_MAP',
        slots: {
          query: stepResponse.instruction.query || text.trim(),
        },
        message: stepResponse.summary?.text || stepResponse.summary?.tts || `${stepResponse.instruction.query || text}을(를) 보여드릴게요.`,
        autoNavigate: stepResponse.decision?.autoNavigate || false, // 🔥 서버에서 결정한 자동 네비게이션 플래그
        places: stepResponse.places, // 🔥 서버에서 검색한 Places 결과
      } as WebVoiceResponse;
    } else if (stepResponse.instruction.kind === 'OPEN_NAVIGATE') {
      return {
        intent: 'OPEN_MAP',
        slots: {
          query: stepResponse.instruction.destination || text.trim(),
        },
        message: stepResponse.summary?.text || stepResponse.summary?.tts || `${stepResponse.instruction.destination || text}으로 안내할게요.`,
        autoNavigate: true, // 🔥 자동 네비게이션 시작 플래그
        places: stepResponse.places, // 🔥 서버에서 검색한 Places 결과
      } as WebVoiceResponse;
    } else {
      // NOOP 또는 기타
      return {
        intent: 'UNKNOWN',
        slots: {},
        message: stepResponse.summary?.text || '명령을 이해하지 못했습니다.',
        places: stepResponse.places, // 🔥 Places 결과가 있으면 포함
      } as WebVoiceResponse;
    }
  } catch (error: any) {
    console.error('❌ 웹 음성 명령 API 호출 실패:', error);
    
    // 🔥 네트워크 오류 시 클라이언트에서 직접 처리할 수 있도록 fallback 응답
    // 서버가 없어도 앱이 죽지 않도록 처리
    if (error?.name === 'AbortError' || 
        error?.message?.includes('fetch') || 
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('NetworkError') ||
        error?.message?.includes('Network request failed')) {
      console.warn('⚠️ 서버 연결 실패 → 클라이언트 검색으로 fallback');
      
      // 🔥 클라이언트에서 직접 검색할 수 있도록 OPEN_MAP intent 반환
      return {
        intent: 'OPEN_MAP' as WebIntent,
        slots: {
          query: text.trim(), // 원본 텍스트를 검색어로 사용
        },
        message: '로컬에서 검색을 시도합니다.',
        error: 'Server unavailable, using client-side search',
      };
    }
    
    // 🔥 에러 타입별 구체적인 메시지
    let errorMessage = '음성 명령 처리에 실패했습니다.';
    if (error?.message?.includes('status')) {
      errorMessage = '서버 응답 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
    
    return {
      intent: 'UNKNOWN',
      slots: {},
      message: errorMessage,
      error: error?.message || 'Unknown error',
    };
  }
}

import { View, Text, Pressable, StyleSheet, Alert, Linking, ScrollView, Platform, PermissionsAndroid } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useExecutionGate } from '../hooks/useExecutionGate';
import { speakGuide, speakOnce } from '../utils/tts';

/**
 * 🔐 마이크 권한 요청 유틸리티 (안전 버전)
 * Expo/Bare RN 구분 없이 동작
 */
async function ensureMicrophonePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Android: PermissionsAndroid 직접 사용 (가장 확실함)
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: '마이크 권한 필요',
          message: '음성 인식을 위해 마이크 권한이 필요합니다.',
          buttonNeutral: '나중에',
          buttonNegative: '거부',
          buttonPositive: '허용',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error: any) {
      console.error('❌ Android 권한 요청 오류:', error);
      return false;
    }
  } else {
    // iOS: expo-av API 사용 (존재 여부 확인)
    try {
      // 현재 권한 상태만 확인 (요청은 자동)
      const currentStatus = await Audio.getPermissionsAsync();
      
      if (currentStatus.granted) {
        return true;
      }
      
      // 권한이 없으면 사용자에게 설정 안내
      Alert.alert(
        '마이크 권한 필요',
        '음성 인식을 위해 마이크 권한이 필요합니다.\n설정 > 개인정보 보호 > 마이크에서 권한을 허용해주세요.',
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '설정으로 이동', 
            onPress: () => Linking.openSettings() 
          }
        ]
      );
      return false;
    } catch (error: any) {
      console.error('❌ iOS 권한 확인 오류:', error);
      Alert.alert(
        '권한 오류',
        '마이크 권한 확인에 실패했습니다.\n설정에서 직접 권한을 허용해주세요.'
      );
      return false;
    }
  }
}

/**
 * 🔊 TTS 오디오 모드 활성화 (Android 필수)
 * STT(마이크) 사용 후 TTS를 재생하기 전에 반드시 호출해야 함
 * Android는 Recording → Playback 자동 전환을 하지 않으므로 명시적으로 설정 필요
 * ⚠️ Android에서 iOS 옵션을 사용하면 실패하므로 Platform별로 분기
 */
async function enableTTSAudio() {
  try {
    // 🔥 Android: 녹음 모드 완전히 해제하고 재생 모드로 전환
    if (Platform.OS === 'android') {
      // 🔥 1단계: 녹음 모드 완전 해제
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true, // 다른 오디오와 함께 재생 가능하도록
        playThroughEarpieceAndroid: false, // 스피커로 재생 (이어폰 아님)
        // interruptionModeAndroid 제거 (invalid value 오류 방지)
      });
      
      // 🔥 2단계: 추가 안정화를 위한 짧은 대기
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      console.log('✅ TTS Audio Mode 설정 완료 (Android)');
    } else {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true, // iOS 무음 모드에서도 재생
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      });
      console.log('✅ TTS Audio Mode 설정 완료 (iOS)');
    }
  } catch (error) {
    console.warn('⚠️ TTS Audio Mode 설정 실패:', error);
    // 실패해도 계속 진행 (일부 환경에서는 작동할 수 있음)
  }
}

// 🎯 명령 파싱 함수 (단순 문자열 파싱)
function parseCommand(text: string) {
  const patterns = ['찾아줘', '가줘', '어디야', '근처', '위치'];

  for (const p of patterns) {
    if (text.includes(p)) {
      // 명령어 키워드 제거하고 검색어 추출
      let query = text
        .replace('찾아줘', '')
        .replace('가줘', '')
        .replace('어디야', '')
        .replace('근처', '')
        .replace('위치', '')
        .trim();

      // 빈 문자열이면 전체 텍스트 사용
      if (!query) {
        query = text.trim();
      }

      return { type: 'MAP', query };
    }
  }
  return { type: 'UNKNOWN' };
}

// 🗺 Google Maps 실행 함수 (필터 지원)
async function openGoogleMaps(
  query: string,
  filters?: {
    openNow?: boolean;
    parking?: boolean;
    sort?: 'NEAREST' | 'BEST_RATED' | 'DEFAULT';
  }
) {
  // 🔥 TTS 완료 후 추가 안정화 대기 (오디오 포커스 확보)
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  // 필터 힌트를 쿼리에 자연어로 추가
  const hints: string[] = [];
  if (filters?.openNow) hints.push('지금 영업중');
  if (filters?.parking) hints.push('주차');
  if (filters?.sort === 'NEAREST') hints.push('가까운');
  if (filters?.sort === 'BEST_RATED') hints.push('평점 높은');

  const fullQuery = [query, ...hints].join(' ');
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullQuery)}`;
  
  console.log('📍 지도 열기 실행됨:', url);
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      console.log('✅ Google Maps 열기 성공');
    } else {
      console.warn('⚠️ Google Maps URL을 열 수 없음:', url);
    }
  } catch (error) {
    console.error('❌ 지도 열기 실패:', error);
  }
}

// 🗺 Google Maps 길찾기 함수 (NAVIGATE) - 실패 시 SEARCH로 자동 전환
async function openGoogleMapsNavigate(dest: string, fallbackQuery?: string) {
  // 🔥 TTS 완료 후 추가 안정화 대기 (오디오 포커스 확보)
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  try {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
    
    console.log('📍 네비게이션 지도 열기 실행됨:', url);
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      console.log('✅ Google Maps 네비게이션 열기 성공');
    } else {
      console.warn('⚠️ Google Maps URL을 열 수 없음:', url);
      throw new Error('URL을 열 수 없음');
    }
  } catch (error: any) {
    console.warn('⚠️ NAVIGATE 실패, SEARCH로 전환:', error);
    // 🛡️ NAVIGATE 실패 → SEARCH로 자동 전환
    if (fallbackQuery) {
      openGoogleMaps(fallbackQuery);
    } else {
      // 목적지에서 장소명만 추출 (주소 제거)
      const placeName = dest.split(',')[0].trim();
      openGoogleMaps(placeName);
    }
  }
}

// 🛡️ Ultimate Fallback (모든 것이 실패했을 때)
function ultimateFallback(text: string) {
  console.log('🛡️ Ultimate Fallback 실행:', text);
  // 텍스트에서 핵심 키워드만 추출하여 검색
  const query = text
    .replace(/찾아줘|가줘|어디야|근처|위치|안내해줘|길찾기/g, '')
    .trim() || text;
  openGoogleMaps(query);
}

// 🧠 컨텍스트 메모리 타입 정의
type MemoryItem = {
  intent: {
    type: 'MAP_SEARCH' | 'MAP_NAVIGATE' | 'NONE';
    query: string;
    filters?: {
      openNow: boolean;
      parking: boolean;
      sort: 'NEAREST' | 'BEST_RATED' | 'DEFAULT';
    };
    autoNavigate?: boolean;
  };
  result?: {
    destination?: string;
    candidates?: string[];
    chosenIndex?: number;
  };
  timestamp: number;
};

// 🚀 Execute Intent 호출 함수 (Search → Select → Navigate) - Agent에서 사용
async function callExecuteIntent(intent: any, text: string) {
  const resp = await fetch(
    'https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/executeIntent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent, text }),
    }
  );

  if (!resp.ok) {
    throw new Error('Execute Intent API failed');
  }

  return resp.json() as Promise<{
    action: 'NAVIGATE' | 'OPEN_SEARCH' | 'NONE';
    destination?: string;
    query?: string;
    filters?: {
      openNow: boolean;
      parking: boolean;
      sort: 'NEAREST' | 'BEST_RATED' | 'DEFAULT';
    };
    place?: {
      name: string;
      address: string;
      rating: number;
    };
    message?: string;
  }>;
}

// 🧠 Assistant State Machine
export type AssistantState =
  | 'IDLE'
  | 'ALWAYS_LISTENING' // Always-On 모드: Wake Word 대기 중
  | 'LISTENING' // Wake Word 감지 후 명령 듣는 중
  | 'THINKING'
  | 'PRESENTING'
  | 'AWAITING_FOLLOWUP'
  | 'NAVIGATING';

// 🔥 STT 세션 State Machine (STT 생명주기 관리)
type STTState = 'IDLE' | 'LISTENING' | 'PROCESSING';

// 📦 확장된 서버 응답 타입
interface StepResponse {
  instruction: {
    kind: 'OPEN_SEARCH' | 'OPEN_NAVIGATE' | 'NOOP';
    query?: string;
    destination?: string;
  };
  summary?: {
    text: string;
    tts: string;
  };
  followups?: Array<{
    id: string;
    label: string;
    type: 'NAVIGATE_NEAREST' | 'APPLY_FILTER' | 'RETRY' | 'SEARCH_ALTERNATIVE';
    patch?: {
      openNow?: boolean;
      parking?: boolean;
      sort?: 'NEAREST' | 'BEST_RATED' | 'DEFAULT';
    };
  }>;
  decision?: {
    intent: string;
    intensity: 'SHOW' | 'SUGGEST' | 'AUTO';
    autoNavigate: boolean;
    reason: string;
  };
  context?: {
    lastQuery: string;
    lastAction: string;
  };
  debug?: {
    finalText: string;
    action: string;
    fallback?: string;
    latencyMs?: number;
  };
}

// 🧠 Voice Step 호출 함수 (확장된 응답)
async function callVoiceStep(
  finalText: string,
  memory: MemoryItem[],
  filters?: { openNow?: boolean; parking?: boolean; sort?: 'NEAREST' | 'BEST_RATED' | 'DEFAULT' }
): Promise<StepResponse> {
  const memorySummary = memory
    .map(
      (m, i) =>
        `${i}. ${m.intent.query} -> ${
          m.result?.destination ?? '검색만'
        }`
    )
    .join('\n');

  const resp = await fetch(
    'https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/voiceStep',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        finalText,
        memory: memorySummary,
        filters, // 필터 포함 (Follow-up에서 사용)
      }),
    }
  );

  if (!resp.ok) {
    throw new Error('Voice Step API failed');
  }

  return resp.json() as Promise<StepResponse>;
}

/**
 * 🚗 운전/실사용 모드: 짧고 확정적인 실전 멘트 세트
 * 운전 중엔 설명 금지. 결정만 전달.
 */
function getRealWorldTTS(
  instruction: StepResponse['instruction'],
  decision: StepResponse['decision'],
  context: StepResponse['context']
): string {
  const actionKind = instruction.kind;
  const isAutoNavigate = decision?.autoNavigate ?? false;
  const lastQuery = context?.lastQuery || '';
  
  // 🚗 네비게이션 액션 (운전 모드: 짧고 확정적으로)
  if (actionKind === 'OPEN_NAVIGATE') {
    if (isAutoNavigate) {
      // 자동 네비게이션: 가장 짧고 명확하게
      if (lastQuery.includes('다시') || lastQuery.includes('아까')) {
        return '아까 그 장소로 다시 안내할게요.';
      }
      return '가장 가까운 곳으로 안내합니다.';
    } else {
      // 수동 네비게이션
      if (instruction.destination) {
        return `${instruction.destination}로 안내합니다.`;
      }
      return '길 안내를 시작합니다.';
    }
  }
  
  // 🔍 검색 액션은 운전 모드에서 말 안 함 (침묵)
  // 검색 결과는 화면으로만 표시
  
  return '알겠습니다.';
}

/**
 * 🎯 지도 액션별 멘트 자동 선택기
 * 상황에 맞는 자연스러운 비서 멘트를 자동으로 생성
 * 🚗 운전 모드에서는 짧고 확정적인 멘트 사용
 */
function getActionTTS(
  instruction: StepResponse['instruction'],
  decision: StepResponse['decision'],
  context: StepResponse['context'],
  query?: string,
  isRealWorldMode: boolean = false
): string {
  // 🚗 운전/실사용 모드: 짧고 확정적인 멘트
  if (isRealWorldMode) {
    return getRealWorldTTS(instruction, decision, context);
  }
  
  const actionKind = instruction.kind;
  const isAutoNavigate = decision?.autoNavigate ?? false;
  const intent = decision?.intent || '';
  const lastQuery = context?.lastQuery || query || '';
  
  // 🚗 네비게이션 액션
  if (actionKind === 'OPEN_NAVIGATE') {
    if (isAutoNavigate) {
      // 자동 네비게이션 (의도가 확정된 경우)
      if (lastQuery.includes('가까운') || lastQuery.includes('가장 가까운')) {
        return `가장 가까운 ${lastQuery.replace(/가까운|가장 가까운/g, '').trim() || '곳'}으로 바로 안내할게요.`;
      }
      if (lastQuery.includes('제일') || lastQuery.includes('첫 번째')) {
        return `${lastQuery}로 바로 안내할게요.`;
      }
      return lastQuery 
        ? `주변 ${lastQuery} 결과를 찾았어요. 가장 가까운 곳으로 바로 안내할게요.`
        : '가장 가까운 곳으로 안내합니다.';
    } else {
      // 수동 네비게이션 (사용자가 명시적으로 요청)
      if (instruction.destination) {
        return `${instruction.destination}로 안내할게요.`;
      }
      return lastQuery ? `${lastQuery}로 안내할게요.` : '길 안내를 시작합니다.';
    }
  }
  
  // 🔍 검색 액션
  if (actionKind === 'OPEN_SEARCH') {
    if (isAutoNavigate) {
      // 검색 후 자동 네비게이션 가능한 경우
      return lastQuery 
        ? `주변 ${lastQuery}를 몇 곳 찾았어요. 가장 가까운 곳부터 보여드릴게요.`
        : '검색 결과를 찾았어요. 가장 가까운 곳부터 보여드릴게요.';
    } else {
      // 일반 검색 (결과만 보여주기)
      if (lastQuery.includes('뭐') || lastQuery.includes('어디') || lastQuery.includes('있어')) {
        return `${lastQuery.replace(/뭐|어디|있어/g, '').trim() || '곳'}을 찾았어요. 결과를 보여드릴게요.`;
      }
      return lastQuery 
        ? `${lastQuery} 결과를 찾았어요. 보여드릴게요.`
        : '검색 결과를 찾았습니다.';
    }
  }
  
  // 기본 fallback
  return '알겠습니다. 처리 중입니다.';
}

/**
 * 🎯 Follow-up 확인 멘트 자동 생성기
 * Follow-up 타입에 맞는 짧은 확인 멘트 생성
 * 🚗 운전 모드: "그럼 여기로 갈게요" 수준의 짧은 멘트
 */
function getFollowupConfirmTTS(
  followup: StepResponse['followups'][0],
  isRealWorldMode: boolean = false
): string {
  // 🚗 운전 모드: NAVIGATE만 짧게 말함
  if (isRealWorldMode) {
    if (followup.type.startsWith('NAVIGATE')) {
      return '그럼 여기로 갈게요.';
    }
    return ''; // 다른 타입은 침묵
  }
  
  switch (followup.type) {
    case 'NAVIGATE_NEAREST':
      return '그럼 가장 가까운 곳으로 갈게요.';
    
    case 'APPLY_FILTER':
      if (followup.patch?.openNow) {
        return '지금 영업 중인 곳만 볼게요.';
      }
      if (followup.patch?.parking) {
        return '주차 가능한 곳만 보여드릴게요.';
      }
      if (followup.patch?.sort === 'NEAREST') {
        return '가까운 순서로 정렬할게요.';
      }
      if (followup.patch?.sort === 'BEST_RATED') {
        return '평점 높은 순서로 정렬할게요.';
      }
      return '필터를 적용할게요.';
    
    case 'RETRY':
      return '다시 찾아볼게요.';
    
    case 'SEARCH_ALTERNATIVE':
      return '다른 곳을 찾아볼게요.';
    
    default:
      return '알겠습니다.';
  }
}

/**
 * 🚗 운전/실사용 모드: 말하는 경우 판단 (최종 룰)
 * 딱 2가지만 말함: 자동 네비 시작 직전, Follow-up NAVIGATE 선택 시
 */
function shouldSpeakInRealWorld(
  decision: StepResponse['decision'],
  instruction: StepResponse['instruction'],
  isMapOpen: boolean
): boolean {
  // 지도 이미 열린 상태면 말 안 함
  if (isMapOpen) {
    return false;
  }
  
  // autoNavigate가 아니면 말 안 함
  if (!decision?.autoNavigate) {
    return false;
  }
  
  // OPEN_NAVIGATE만 말함 (자동 네비 시작 직전)
  return instruction.kind === 'OPEN_NAVIGATE';
}

/**
 * 🧠 "Follow-up에서 말 안 해도 되는 상황" 판단 로직
 * 필터만 바뀌거나 재정렬은 침묵, 네비게이션만 말함
 * 🚗 운전 모드: NAVIGATE만 말함
 */
function shouldSpeakFollowup(
  followup: StepResponse['followups'][0],
  isRealWorldMode: boolean = false
): boolean {
  // 🚗 운전 모드: NAVIGATE만 말함
  if (isRealWorldMode) {
    return followup.type.startsWith('NAVIGATE');
  }
  
  // NAVIGATE 타입만 말함 (실제 이동이 발생)
  if (followup.type.startsWith('NAVIGATE')) {
    return true;
  }
  
  // 필터만 바뀌거나 재정렬은 말 안 함 (같은 화면에서 변경)
  if (followup.type === 'APPLY_FILTER') {
    return false; // 필터는 침묵
  }
  
  // RETRY, SEARCH_ALTERNATIVE는 말함 (새로운 검색)
  if (followup.type === 'RETRY' || followup.type === 'SEARCH_ALTERNATIVE') {
    return true;
  }
  
  return false;
}

/**
 * 🧠 "이건 말 안 해도 되는 상황" 판단 로직
 * 지능적으로 TTS 발화 여부를 결정하는 핵심 Guard
 */
function shouldSpeakSummary(
  res: StepResponse,
  hasSpokenRef: React.MutableRefObject<boolean>,
  ttsEnabled: boolean,
  ttsGate: ReturnType<typeof useExecutionGate>
): boolean {
  // 1. TTS가 비활성화되어 있으면 말 안 함
  if (!ttsEnabled) {
    return false;
  }
  
  // 2. 이미 말했으면 말 안 함 (중복 방지)
  if (hasSpokenRef.current) {
    return false;
  }
  
  // 3. Execution Gate 체크 (쿨다운)
  try {
    if (ttsGate?.canExecute?.() === false) {
      return false;
    }
  } catch (gateError) {
    console.warn('⚠️ TTS Gate 체크 에러 (격리됨):', gateError);
    // 에러가 나도 계속 진행 (Gate는 보조 장치)
  }
  
  // 4. 🧠 "말 안 해도 되는 상황" 판단 로직
  const instruction = res.instruction;
  const decision = res.decision;
  const intensity = decision?.intensity;
  
  // 4-1. NOOP 액션은 말 안 함 (아무 동작 없음)
  if (instruction.kind === 'NOOP') {
    console.log('🛑 Guard: NOOP 액션, TTS 스킵');
    return false;
  }
  
  // 4-2. SHOW 강도는 말 안 함 (단순 표시만)
  if (intensity === 'SHOW') {
    console.log('🛑 Guard: SHOW 강도, TTS 스킵 (단순 표시)');
    return false;
  }
  
  // 4-3. SUGGEST 강도는 말 안 함 (제안만, 사용자 확인 필요)
  if (intensity === 'SUGGEST') {
    console.log('🛑 Guard: SUGGEST 강도, TTS 스킵 (제안만)');
    return false;
  }
  
  // 4-4. 🔊 지도 열기 직전 1회 안내 허용 조건 (핵심 수정)
  // OPEN_SEARCH 또는 OPEN_NAVIGATE이면 말함 (autoNavigate 여부와 무관)
  const isMapAction = instruction.kind === 'OPEN_SEARCH' || instruction.kind === 'OPEN_NAVIGATE';
  
  if (!isMapAction) {
    // 지도 액션이 아니면 기존 로직 유지 (AUTO 강도만)
    if (intensity !== 'AUTO' && !decision?.autoNavigate) {
      console.log('🛑 Guard: 지도 액션이 아니고 AUTO 강도도 아님, TTS 스킵');
      return false;
    }
  }
  
  // 5. TTS 텍스트가 있으면 말함 (서버 제공 또는 자동 생성)
  const hasTTS = !!res.summary?.tts;
  if (!hasTTS) {
    // TTS가 없어도 지도 액션이면 자동 생성해서 말함
    if (isMapAction) {
      console.log('✅ Guard: TTS 없지만 지도 액션, 자동 생성 멘트 사용');
      return true; // getActionTTS로 자동 생성
    }
    // 지도 액션이 아니면 AUTO 강도일 때만
    if (intensity === 'AUTO' || decision?.autoNavigate) {
      console.log('✅ Guard: TTS 없지만 AUTO 강도, 자동 생성 멘트 사용');
      return true; // getActionTTS로 자동 생성
    }
    return false;
  }
  
  // 6. 모든 조건 통과 → 말함
  console.log('✅ Guard: TTS 재생 허용', { instructionKind: instruction.kind, isMapAction });
  return true;
}

/**
 * 🎯 Assistant 응답 처리 핵심 함수
 * 서버 응답을 받아서 상태 전이 + 실행
 * 🔥 핵심: TTS는 지도 액션 실행 직전에 딱 1회만
 */
async function handleAssistantResponse(
  stepResponse: StepResponse,
  finalText: string,
  setAssistantState: (state: AssistantState) => void,
  setCurrentSummary: (text: string) => void,
  setCurrentFollowups: (followups: StepResponse['followups']) => void,
  setRecentMemory: React.Dispatch<React.SetStateAction<MemoryItem[]>>,
  openGoogleMapsNavigate: (destination: string, query?: string) => void,
  openGoogleMaps: (query: string) => void,
  ttsEnabled: boolean,
  ttsGate: ReturnType<typeof useExecutionGate>,
  hasSpokenRef: React.MutableRefObject<boolean>,
  isRealWorldMode: boolean = false,
  isMapOpenRef: React.MutableRefObject<boolean>,
  finalizeTtsIfAny: () => Promise<void>,
  lockSpeechUntilNextCommand: () => void
) {
  // 📝 Summary 표시 (UI에만 표시, TTS는 지도 열기 전에 재생)
  if (stepResponse.summary?.text) {
    setCurrentSummary(stepResponse.summary.text);
  }

  // ✅ STT 완전 종료 확인 (이미 말 끝 감지 시 종료됨)
  console.log('✅ STT 종료 확인 완료, TTS → 지도 순서로 진행');

  // 🚗 자동 네비게이션 (핵심!)
  if (stepResponse.decision?.autoNavigate) {
    if (stepResponse.instruction.kind === 'OPEN_NAVIGATE' && stepResponse.instruction.destination) {
      console.log('🚀 자동 네비게이션 실행:', stepResponse.instruction.destination);
      
      // 🎯 지도 액션별 멘트 자동 선택기 사용 (운전 모드 적용)
      const ttsText = stepResponse.summary?.tts || getActionTTS(
        stepResponse.instruction,
        stepResponse.decision,
        stepResponse.context,
        stepResponse.context?.lastQuery,
        isRealWorldMode
      );
      
      // 🎧 네비 진입 시 음성 UX 분리 (네비게이션 전용 멘트)
      // 🚗 운전 모드: 자동 네비 시작 직전만 말함
      if (shouldSpeakSummary(stepResponse, hasSpokenRef, ttsEnabled, ttsGate, isRealWorldMode, isMapOpenRef.current)) {
        try {
          // 🔥 Guard: 말하기 전에 플래그 설정 (중복 방지)
          hasSpokenRef.current = true;
          if (ttsGate?.markExecuted) {
            ttsGate.markExecuted();
          }
          
          // 🎧 네비게이션 전용 멘트 (짧고 명확하게)
          const navTTS = stepResponse.summary?.tts || ttsText;
          console.log('🔊 🎧 네비게이션 TTS 재생:', navTTS);
          
          // ✅ 1. TTS 재생 (onDone까지 완전히 대기) - 절대 순서 변경 금지!
          await speakOnce(navTTS);
          console.log('✅ 네비게이션 TTS 완료 확인, 지도 열기 시작');
          
          // 🎯 UX 버퍼: TTS 완료 후 자연스러운 전환을 위한 딜레이 (400ms)
          await new Promise((resolve) => setTimeout(resolve, 400));
          console.log('✅ UX 버퍼 완료, 지도 열기 실행');
        } catch (ttsError) {
          console.warn('⚠️ 네비게이션 TTS 에러 (격리됨):', ttsError);
          // TTS 실패해도 지도는 열림 (비서가 침묵하지 않음)
        }
      } else {
        console.log('⚠️ 네비게이션 TTS 스킵 (Guard):', {
          hasSpoken: hasSpokenRef.current,
          hasTts: !!stepResponse.summary?.tts,
          intensity: stepResponse.decision?.intensity,
          autoNavigate: stepResponse.decision?.autoNavigate
        });
        // 🎯 TTS 스킵 시에도 UX 버퍼 적용 (일관성)
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      
      // ✅ 2. 지도 실행 (TTS 완료 후에만 실행) - 절대 순서 변경 금지!
      // 🔒 실사용 안정성: 지도 열림 상태 추적
      await finalizeTtsIfAny();
      openGoogleMapsNavigate(
        stepResponse.instruction.destination,
        stepResponse.context?.lastQuery || stepResponse.instruction.destination
      );
      lockSpeechUntilNextCommand(); // 지도 열린 뒤 TTS 잠금
      isMapOpenRef.current = true;
      setAssistantState('NAVIGATING');
      
      // 메모리 저장
      setRecentMemory((prev) => {
        const newMem = [
          {
            intent: {
              type: 'MAP_NAVIGATE',
              query: stepResponse.context?.lastQuery || finalText,
              filters: {},
              autoNavigate: true,
            },
            result: { destination: stepResponse.instruction.destination },
            timestamp: Date.now(),
          },
          ...prev,
        ];
        return newMem.slice(0, 3);
      });
      
      // 3초 후 IDLE로 복귀
      setTimeout(() => {
        setAssistantState('IDLE');
        setCurrentSummary('');
        setCurrentFollowups([]);
      }, 3000);
      return;
    }
  }

  // 🎯 일반 실행
  if (stepResponse.instruction.kind === 'OPEN_NAVIGATE' && stepResponse.instruction.destination) {
    // 🔥 TTS 트리거: 지도 열기 직전에 딱 1회만 (정확한 위치)
    // 🎯 지도 액션별 멘트 자동 선택기 사용 (운전 모드 적용)
    const ttsText = stepResponse.summary?.tts || getActionTTS(
      stepResponse.instruction,
      stepResponse.decision,
      stepResponse.context,
      stepResponse.context?.lastQuery,
      isRealWorldMode
    );
    
    // 🚗 운전 모드: SEARCH는 침묵 (결과만 표시)
    if (shouldSpeakSummary(stepResponse, hasSpokenRef, ttsEnabled, ttsGate, isRealWorldMode, isMapOpenRef.current)) {
      try {
        // 🔥 Guard: 말하기 전에 플래그 설정 (중복 방지)
        hasSpokenRef.current = true;
        if (ttsGate?.markExecuted) {
          ttsGate.markExecuted();
        }
        
        console.log('🔊 Navigate TTS 재생:', ttsText);
        // ✅ 1. TTS 재생 (onDone까지 완전히 대기) - 절대 순서 변경 금지!
        await speakOnce(ttsText);
        console.log('✅ TTS 완료 확인, 지도 열기 시작');
        
        // 🎯 UX 버퍼: TTS 완료 후 자연스러운 전환을 위한 딜레이 (400ms)
        await new Promise((resolve) => setTimeout(resolve, 400));
        console.log('✅ UX 버퍼 완료, 지도 열기 실행');
      } catch (ttsError) {
        console.warn('⚠️ Navigate TTS 에러 (격리됨):', ttsError);
        // TTS 실패해도 지도는 열림 (비서가 침묵하지 않음)
      }
    } else {
      console.log('⚠️ Navigate TTS 스킵 (Guard):', {
        hasSpoken: hasSpokenRef.current,
        hasTts: !!stepResponse.summary?.tts,
        autoNavigate: stepResponse.decision?.autoNavigate
      });
      // 🎯 TTS 스킵 시에도 UX 버퍼 적용 (일관성)
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    
    // ✅ 2. 지도 실행 (TTS 완료 후에만 실행) - 절대 순서 변경 금지!
    openGoogleMapsNavigate(
      stepResponse.instruction.destination,
      stepResponse.context?.lastQuery || stepResponse.instruction.destination
    );
    setAssistantState('NAVIGATING');
    
    // 메모리 저장
    setRecentMemory((prev) => {
      const newMem = [
        {
          intent: {
            type: 'MAP_NAVIGATE',
            query: stepResponse.context?.lastQuery || finalText,
            filters: {},
            autoNavigate: false,
          },
          result: { destination: stepResponse.instruction.destination },
          timestamp: Date.now(),
        },
        ...prev,
      ];
      return newMem.slice(0, 3);
    });
    
    // 3초 후 IDLE로 복귀
    setTimeout(() => {
      setAssistantState('IDLE');
      setCurrentSummary('');
      setCurrentFollowups([]);
    }, 3000);
  } else if (stepResponse.instruction.kind === 'OPEN_SEARCH' && stepResponse.instruction.query) {
    // 🔥 TTS 트리거: 지도 열기 직전에 딱 1회만 (정확한 위치)
    // 🎯 지도 액션별 멘트 자동 선택기 사용 (운전 모드 적용)
    const ttsText = stepResponse.summary?.tts || getActionTTS(
      stepResponse.instruction,
      stepResponse.decision,
      stepResponse.context,
      stepResponse.instruction.query,
      isRealWorldMode
    );
    
    // 🚗 운전 모드: SEARCH는 침묵 (결과만 표시)
    if (shouldSpeakSummary(stepResponse, hasSpokenRef, ttsEnabled, ttsGate, isRealWorldMode, isMapOpenRef.current)) {
      try {
        // 🔥 Guard: 말하기 전에 플래그 설정 (중복 방지)
        hasSpokenRef.current = true;
        if (ttsGate?.markExecuted) {
          ttsGate.markExecuted();
        }
        
        console.log('🔊 OPEN_SEARCH TTS 재생:', ttsText);
        // ✅ 1. TTS 재생 (onDone까지 완전히 대기) - 절대 순서 변경 금지!
        await speakOnce(ttsText);
        console.log('✅ TTS 완료 확인, 지도 열기 시작');
        
        // 🎯 UX 버퍼: TTS 완료 후 자연스러운 전환을 위한 딜레이 (400ms)
        await new Promise((resolve) => setTimeout(resolve, 400));
        console.log('✅ UX 버퍼 완료, 지도 열기 실행');
      } catch (ttsError) {
        console.warn('⚠️ OPEN_SEARCH TTS 에러 (격리됨):', ttsError);
        // TTS 실패해도 지도는 열림 (비서가 침묵하지 않음)
      }
    } else {
      console.log('⚠️ OPEN_SEARCH TTS 스킵 (Guard):', {
        hasSpoken: hasSpokenRef.current,
        hasTts: !!stepResponse.summary?.tts,
        autoNavigate: stepResponse.decision?.autoNavigate
      });
      // 🎯 TTS 스킵 시에도 UX 버퍼 적용 (일관성)
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    
    // ✅ 2. 지도 실행 (TTS 완료 후에만 실행) - 절대 순서 변경 금지!
    // 🔒 실사용 안정성: TTS 완료 확인 후 지도 열기
    await finalizeTtsIfAny();
    openGoogleMaps(stepResponse.instruction.query);
    lockSpeechUntilNextCommand(); // 지도 열린 뒤 TTS 잠금
    isMapOpenRef.current = true;
    setAssistantState('PRESENTING');
    
    // 메모리 저장
    setRecentMemory((prev) => {
      const newMem = [
        {
          intent: {
            type: 'MAP_SEARCH',
            query: stepResponse.context?.lastQuery || finalText,
            filters: {},
            autoNavigate: false,
          },
          result: undefined,
          timestamp: Date.now(),
        },
        ...prev,
      ];
      return newMem.slice(0, 3);
    });
    
    // Follow-up 대기 상태로 전환 (1초 후)
    setTimeout(() => {
      if (stepResponse.followups && stepResponse.followups.length > 0) {
        setCurrentFollowups(stepResponse.followups);
        setAssistantState('AWAITING_FOLLOWUP');
      } else {
        // Follow-up 없으면 IDLE로
        setAssistantState('IDLE');
        setCurrentSummary('');
      }
    }, 1000);
  }
}

// 🧠 Voice Agent 호출 함수 (기존 호환성 유지)
async function callAgent(userText: string, memory: MemoryItem[]) {
  const summary = memory
    .map(
      (m, i) =>
        `${i}. ${m.intent.query} -> ${
          m.result?.destination ?? '검색만'
        }`
    )
    .join('\n');

  const resp = await fetch(
    'https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/agent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userText,
        memorySummary: summary,
        memoryCount: memory.length,
      }),
    }
  );

  if (!resp.ok) {
    const errorData = await resp.json();
    // Fallback 응답 반환
    if (errorData.fallback) {
      return errorData.fallback;
    }
    throw new Error('Agent API failed');
  }

  return resp.json() as Promise<{
    action: 'SEARCH' | 'NAVIGATE' | 'REPEAT_LAST' | 'SEARCH_ALTERNATIVE' | 'NONE';
    query: string;
    filters: {
      openNow: boolean;
      parking: boolean;
      sort: 'NEAREST' | 'BEST_RATED' | 'DEFAULT';
    };
  }>;
}

export default function Home() {
  // 🔥 리로드 확인 로그 (확실한 방법)
  console.log('🔥 HARD RELOAD CHECK', Date.now());
  
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [uri, setUri] = useState<string | null>(null);

  // 🔥 STT 세션 State Machine (STT 생명주기 관리)
  const [sttState, setSttState] = useState<STTState>('IDLE');
  const hasExecutedRef = useRef(false); // STT 세션당 실행 여부
  
  // 🔥 STT 엔진 세션 ID 하드 게이트 (지연된 콜백 이벤트 차단)
  const sttSessionIdRef = useRef<number>(0);
  
  // 🚀 실시간 STT 상태
  const [liveText, setLiveText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastUpdateAt, setLastUpdateAt] = useState<number>(Date.now());
  const [executed, setExecuted] = useState(false); // 중복 실행 방지
  const streamingRef = useRef(false); // 루프 제어용 ref

  // 🧠 컨텍스트 메모리 (최근 3개 Intent + 결과)
  const [recentMemory, setRecentMemory] = useState<MemoryItem[]>([]);

  // 🎯 Assistant State Machine (비서 상태)
  const [assistantState, setAssistantState] = useState<AssistantState>('IDLE');
  const [currentSummary, setCurrentSummary] = useState<string>('');
  const [currentFollowups, setCurrentFollowups] = useState<StepResponse['followups']>([]);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true); // TTS 기본 ON
  const lastQueryRef = useRef<string>(''); // Follow-up 재요청용

  // 🔒 중복 실행 방지 (3중 잠금) - 훅으로 분리
  const { canExecute, markExecuted } = useExecutionGate({
    cooldownMs: 4000,
    checkState: useCallback(() => {
      // 상태 락: THINKING/NAVIGATING 중 실행 차단
      return assistantState !== 'THINKING' && assistantState !== 'NAVIGATING';
    }, [assistantState]),
  });

  // 🔊 TTS 중복 방지 게이트 (지도 열릴 때 딱 1번만 말하기)
  const ttsGate = useExecutionGate({ cooldownMs: 1500 });
  
  // 🔒 TTS 중복 방지 Guard ref (이미 말했는지 체크)
  const hasSpokenRef = useRef<boolean>(false);
  
  // 🚗 실사용 안정성: 지도 열림 상태 추적
  const isMapOpenRef = useRef<boolean>(false);
  
  // 🚗 실사용 모드 (운전/실사용 모드 활성화 여부)
  const [isRealWorldMode, setIsRealWorldMode] = useState<boolean>(false);
  
  // 🔥 재확인 중 상태 (무한 루프 방지의 핵심)
  const [isReconfirming, setIsReconfirming] = useState<boolean>(false);
  // 🔥 사용자 발화 대기 상태 (재확인 후 잔여 STT 이벤트 차단)
  const [isWaitingUserSpeech, setIsWaitingUserSpeech] = useState<boolean>(false);
  
  // 🔒 실사용 안정성 가드 함수들
  const resetSttSession = useCallback(() => {
    console.log('🔄 STT 세션 리셋');
    hasSpokenRef.current = false;
    setSttState('IDLE');
    setLiveText('');
    setExecuted(false);
  }, []); // setState 함수들은 안정적이므로 의존성 배열에 포함하지 않음
  
  const finalizeTtsIfAny = useCallback(async () => {
    // TTS가 재생 중이면 완료까지 대기
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log('✅ TTS 완료 확인');
    } catch (e) {
      console.warn('⚠️ TTS 완료 확인 경고:', e);
    }
  }, []);
  
  const lockSpeechUntilNextCommand = useCallback(() => {
    console.log('🔒 다음 명령까지 TTS 잠금');
    isMapOpenRef.current = true;
    hasSpokenRef.current = true; // 지도 열린 뒤에는 말 안 함
  }, []);

  // 🎯 재확인 질문 UX (STT 신뢰도 낮을 때)
  // 🔥 핵심: TTS 재생 중에는 STT를 반드시 꺼야 무한 루프 방지
  const requestReconfirm = useCallback(async () => {
    // 🔥 중복 재확인 방지: 이미 재확인 중이면 리턴
    if (isReconfirming) {
      console.log('🔕 재확인 중복 요청 무시');
      return;
    }
    
    console.log('🔄 재확인 요청');
    
    // 🔥 STT 엔진 세션 ID 증가 (이전 세션 이벤트 전부 무효화)
    sttSessionIdRef.current += 1;
    console.log('🛑 재확인: STT 세션 무효화, session =', sttSessionIdRef.current);
    
    // 🔥 재확인 상태 활성화 (핵심!)
    setIsReconfirming(true);
    setIsWaitingUserSpeech(true); // ⭐ 사용자 발화 대기 상태 활성화
    
    // ⭐ 1️⃣ 먼저 STT 완전히 끄기 (무한 루프 방지)
    streamingRef.current = false;
    setIsStreaming(false);
    setExecuted(true);
    setSttState('IDLE');
    setAssistantState('IDLE');
    console.log('🛑 STT 중지 완료 (TTS 재생 전)');
    
    // ⭐ 1-1️⃣ 오디오 모드를 녹음 모드에서 재생 모드로 전환
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      console.log('✅ 오디오 모드 전환 완료 (녹음 → 재생)');
    } catch (audioError) {
      console.warn('⚠️ 오디오 모드 전환 경고:', audioError);
    }
    
    try {
      // ⭐ 2️⃣ TTS 재생 (STT가 꺼진 상태에서)
      await speakOnce('잘 못 들었어요. 다시 한 번 말씀해 주세요.');
      console.log('✅ 재확인 TTS 완료');
      
      // ⭐ 2-1️⃣ TTS 완료 후 추가 대기 (오디오 포커스 완전 해제)
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log('✅ TTS 완료 후 추가 대기 완료');
      
      // 상태 리셋
      resetSttSession();
      setLiveText('');
      setExecuted(false);
      
      // ⭐ 3️⃣ 재확인 완료, 대기 상태 (자동 재시작 제거)
      console.log('⏸️ 재확인 완료, 대기 상태 (사용자가 버튼을 눌러야 재시작)');
      setIsReconfirming(false);
      setIsWaitingUserSpeech(false);
    } catch (error) {
      console.warn('⚠️ 재확인 요청 에러:', error);
      // 에러 발생 시에도 상태 리셋
      resetSttSession();
    }
  }, [isAlwaysOn, resetSttSession, speakOnce]);

  // 🎯 오인식 필터 (뉴스/방송체 감지)
  const isLikelyBroadcast = useCallback((text: string): boolean => {
    const broadcastPattern = /(뉴스|앵커|입니다$|MBC|KBS|SBS|JTBC|채널)/i;
    return broadcastPattern.test(text);
  }, []);

  // 🎯 명령어 필터 (길이 및 키워드 체크)
  const isValidCommand = useCallback((text: string): boolean => {
    // 1. 길이 체크 (20자 초과 시 거부)
    if (text.length > 20) {
      console.log('⚠️ 명령어 길이 초과:', text.length);
      return false;
    }

    // 2. 명령어 키워드 체크
    const commandKeywords = /(찾아|열어|보여|근처|지도|검색|가자|안내|가줘|보여줘|찾아줘|열어줘)/;
    if (!commandKeywords.test(text)) {
      console.log('⚠️ 명령어 키워드 없음');
      return false;
    }

    return true;
  }, []);

  // 🎯 Assistant State와 isStreaming 동기화 (assistantState 선언 후에 위치)
  useEffect(() => {
    if (isStreaming && assistantState === 'IDLE') {
      setAssistantState('LISTENING');
    } else if (!isStreaming && assistantState === 'LISTENING') {
      // THINKING으로 전환되기 전까지는 IDLE로 유지
      if (assistantState !== 'THINKING') {
        setAssistantState('IDLE');
      }
    }
  }, [isStreaming, assistantState]);

  // 🎧 Wake Word + Always-On 상태 (STEP 8)
  type WakeState = 'IDLE' | 'WAKE_LISTENING' | 'LISTENING' | 'PROCESSING';
  const [wakeState, setWakeState] = useState<WakeState>('IDLE');
  const [isAlwaysOn, setIsAlwaysOn] = useState(false);
  const wakeStreamingRef = useRef(false); // Wake Word 감지용 스트리밍
  const alwaysOnStreamingRef = useRef(false); // Always-On 모드 스트리밍 제어용 ref
  const wakeTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 타임아웃 관리

  // 🧪 네트워크 연결 테스트
  const testNetwork = async () => {
    try {
      await fetch('https://www.google.com');
      Alert.alert('OK', 'google reachable');
    } catch (e) {
      Alert.alert('FAIL', String(e));
    }
  };

  const startRecording = async () => {
    try {
      // 🔥 새 음성 입력 시작 시 TTS Guard 리셋 (중요!)
      hasSpokenRef.current = false;
      
      // 🔥 안전한 권한 요청 (통일된 함수 사용)
      const permissionGranted = await ensureMicrophonePermission();
      if (!permissionGranted) {
        return; // ensureMicrophonePermission에서 이미 Alert 표시함
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      console.log('🎙 녹음 시작');
    } catch (e) {
      console.error('녹음 시작 에러', e);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      setRecording(null);
      setUri(uri ?? null);

      console.log('🎧 녹음 완료:', uri);

      if (!uri) return;

      try {
        // 🔹 파일 → base64
        // ⚠️ expo-file-system v19에서는 encoding을 문자열로 사용
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64' as any,
        });

        // 🔹 STT 서버 호출
        const res = await fetch(
          'https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/stt',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: base64 }),
          }
        );

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`STT 오류: ${res.status} - ${errorText}`);
        }

        const json = await res.json();
        const text = json.text;

        console.log('✅ STT 결과:', text);
        Alert.alert('STT 성공', text);

        // 🔹 명령 파싱 → 지도 실행
        const cmd = parseCommand(text);
        if (cmd.type === 'MAP') {
          openGoogleMaps(cmd.query!);
        }
      } catch (e: any) {
        console.error('❌ STT 실패:', e);
        Alert.alert('STT 실패', e.message || String(e));
      }
    } catch (e) {
      console.error('녹음 중지 에러', e);
    }
  };

  // 🚀 실시간 STT 시작 (Chunk 기반 Near-Realtime)
  const startLiveSTT = async () => {
    console.log('🎯 startLiveSTT() 함수 진입');
    console.log('📊 초기 상태:', {
      isStreaming,
      streamingRef: streamingRef.current,
      isAlwaysOn,
      assistantState,
      sttState
    });
    
    // 🔥 중복 시작 방지: 실제로 스트리밍 중이면 리턴 (상태만 LISTENING인 건 허용)
    if (isStreaming || streamingRef.current) {
      console.warn('⚠️ STT 세션이 이미 진행 중입니다. 상태:', {
        isStreaming,
        streamingRef: streamingRef.current,
        assistantState,
        sttState
      });
      return;
    }
    
    // 🔥 STT 엔진 세션 ID 증가 (하드 게이트)
    sttSessionIdRef.current += 1;
    const mySessionId = sttSessionIdRef.current;
    console.log('🎤 STT START, session =', mySessionId);
    
    try {
      // 🔒 실사용 안정성: 새 명령 시작 시 세션 완전 리셋
      resetSttSession();
      isMapOpenRef.current = false; // 새 명령 시작 시 지도 상태 리셋
      console.log('✅ STT 세션 및 지도 상태 리셋 완료');
      
      // 🔥 1순위: 마이크 권한 확인 (플랫폼별 올바른 API 사용)
      console.log('🔐 마이크 권한 확인 시작...');
      let permissionGranted = false;

      if (Platform.OS === 'android') {
        // Android: PermissionsAndroid 직접 사용
        try {
          console.log('📱 Android 권한 요청 시작...');
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: '마이크 권한 필요',
              message: '실시간 STT를 사용하려면 마이크 권한이 필요합니다.',
              buttonNeutral: '나중에',
              buttonNegative: '거부',
              buttonPositive: '허용',
            }
          );
          console.log('📱 Android 권한 요청 결과:', granted);
          permissionGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
          console.log('✅ 권한 허용 여부:', permissionGranted);
        } catch (androidError: any) {
          console.error('❌ Android 권한 요청 오류:', androidError);
          Alert.alert(
            '권한 오류',
            '마이크 권한 요청 중 오류가 발생했습니다.\n설정에서 직접 권한을 허용해주세요.'
          );
          return;
        }
      } else {
        // iOS: 안전한 권한 요청
        console.log('📱 iOS 권한 요청 시작...');
        permissionGranted = await ensureMicrophonePermission();
        console.log('✅ iOS 권한 허용 여부:', permissionGranted);
      }

      if (!permissionGranted) {
        console.warn('⚠️ 권한이 거부되어 STT 시작 중단');
        return; // ensureMicrophonePermission에서 이미 Alert 표시함
      }
      
      console.log('✅ 마이크 권한 확인 완료, 다음 단계 진행...');

      // 🔥 2순위: Notification 권한 확인 및 표시 (Android Foreground Service 필수)
      // ⚠️ Expo Go에서는 SDK 53+부터 Notification이 제거됨 → Development Build 필요
      const isExpoGo = Constants.executionEnvironment === Constants.executionEnvironment.StoreClient;
      
      if (Platform.OS === 'android' && !isExpoGo) {
        // Development Build에서만 Notification 사용
        try {
          const notificationPermission = await Notifications.getPermissionsAsync();
          if (!notificationPermission.granted) {
            const requestResult = await Notifications.requestPermissionsAsync();
            if (!requestResult.granted) {
              Alert.alert(
                '알림 권한 필요',
                '실시간 STT를 사용하려면 알림 권한이 필요합니다.\n설정에서 알림 권한을 허용해주세요.'
              );
              return;
            }
          }

          // 🔥 Foreground Service용 Notification 표시 (필수!)
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🎙 실시간 음성 인식 중',
              body: '음성을 듣고 있습니다...',
              sound: false,
            },
            trigger: null, // 즉시 표시
          });
          console.log('✅ Foreground Service Notification 표시');
        } catch (notificationError: any) {
          console.warn('⚠️ Notification 표시 경고:', notificationError);
          // Notification 실패해도 계속 진행 (일부 환경)
        }
      } else if (Platform.OS === 'android' && isExpoGo) {
        // Expo Go에서는 Notification 없이 진행 (경고만)
        console.warn('⚠️ Expo Go에서는 Foreground Service Notification이 지원되지 않습니다.');
        console.warn('⚠️ STT는 작동하지만, 백그라운드 녹음은 제한될 수 있습니다.');
        console.warn('⚠️ 완전한 테스트를 위해서는 Development Build를 사용하세요: npx expo run:android');
      }

      // 🔥 3순위: 오디오 모드 설정 (안드로이드/ iOS 모두)
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      } catch (audioModeError: any) {
        console.warn('⚠️ 오디오 모드 설정 경고:', audioModeError);
        // 모드 설정 실패해도 계속 진행 (일부 기기에서 가능)
      }

      // 🔥 FIX 1: STT 시작 시 상태 완전 초기화 (필수!)
      setLiveText(''); // transcript 초기화
      setExecuted(false); // hasExecuted 초기화
      setLastUpdateAt(Date.now());
      
      // 🔥 Execution Gate ref 초기화 (중복 실행 방지 리셋)
      // useExecutionGate의 lastExecAtRef는 내부에 있지만, markExecuted를 호출하지 않으면 자동으로 쿨다운이 풀림
      // 대신 여기서 명시적으로 초기화를 위해 canExecute를 강제로 통과시키기 위해 시간을 리셋
      // 실제로는 markExecuted를 호출하지 않으면 자동으로 쿨다운이 풀리므로 추가 작업 불필요
      
      // 🔥 STT State Machine: IDLE → LISTENING (여기서 상태 설정)
      setSttState('LISTENING');
      setAssistantState('LISTENING');
      
      setIsStreaming(true);
      streamingRef.current = true;

      console.log('🎙 실시간 STT 시작');
      console.log('✅ 상태 초기화 완료:', {
        liveText: '',
        executed: false,
        isStreaming: true
      });
      console.log('📱 Platform:', Platform.OS);
      console.log('📱 Execution Environment:', Constants.executionEnvironment);
      console.log('📱 권한 상태: 마이크 ✅, 알림 ✅');
      
      // 🔥 에뮬레이터 경고
      if (Constants.executionEnvironment === Constants.executionEnvironment.StoreClient) {
        console.warn('⚠️ Expo Go 환경: STT가 제한될 수 있습니다.');
      }

      // 🔄 Chunk 기반 녹음 루프 (안전장치: 최대 반복 횟수 제한)
      let loopCount = 0;
      const MAX_LOOPS = 1000; // 최대 1000회 (약 25분) - 안전장치
      
      while (streamingRef.current && loopCount < MAX_LOOPS) {
        loopCount++;
        try {
          // 🔥 3순위: 권한 재확인 (안드로이드 13+ 대응)
          const currentPermission = await Audio.getPermissionsAsync();
          if (!currentPermission.granted) {
            console.error('❌ 녹음 중 권한 상실 감지');
            Alert.alert(
              '마이크 권한 상실',
              '녹음 중 마이크 권한이 취소되었습니다.\n설정에서 권한을 허용해주세요.'
            );
            streamingRef.current = false;
            setIsStreaming(false);
            return;
          }

          // 🔥 4순위: AudioRecord 안전 설정 (Galaxy 안전 세팅)
          // 새 녹음 인스턴스 생성 - 명시적 설정으로 안정성 향상
          const recordingOptions: Audio.RecordingOptions = {
            android: {
              extension: '.m4a',
              outputFormat: Audio.AndroidOutputFormat.MPEG_4,
              audioEncoder: Audio.AndroidAudioEncoder.AAC,
              sampleRate: 16000, // Galaxy 안전 값
              numberOfChannels: 1, // MONO
              bitRate: 128000,
            },
            ios: {
              extension: '.m4a',
              outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
              audioQuality: Audio.IOSAudioQuality.LOW,
              sampleRate: 16000,
              numberOfChannels: 1,
              bitRate: 128000,
              linearPCMBitDepth: 16,
              linearPCMIsBigEndian: false,
              linearPCMIsFloat: false,
            },
            web: {
              mimeType: 'audio/webm',
              bitsPerSecond: 128000,
            },
          };

          console.log(`🎙 Chunk ${loopCount} 녹음 시작...`);
          const { recording: chunkRecording } = await Audio.Recording.createAsync(
            recordingOptions
          );
          console.log(`✅ Chunk ${loopCount} 녹음 인스턴스 생성 완료`);

          // ⏱ 1.5초 녹음
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // 녹음 중지
          await chunkRecording.stopAndUnloadAsync();
          const chunkUri = chunkRecording.getURI();
          console.log(`✅ Chunk ${loopCount} 녹음 완료, URI:`, chunkUri);

          if (!chunkUri || !streamingRef.current) {
            console.warn(`⚠️ Chunk ${loopCount} URI 없음 또는 스트리밍 중지됨`);
            continue;
          }

          // base64 변환
          // ⚠️ expo-file-system v19에서는 encoding을 문자열로 사용
          const base64 = await FileSystem.readAsStringAsync(chunkUri, {
            encoding: 'base64' as any,
          });

          // 서버로 chunk 전송
          console.log(`📤 Chunk ${loopCount} 서버 전송 중... (크기: ${base64.length} bytes)`);
          
          const STT_ENDPOINT = 'https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/stt';
          
          let res: Response;
          try {
            res = await fetch(STT_ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64 }),
            });
            console.log(`📥 Chunk ${loopCount} 서버 응답:`, res.status, res.statusText);
          } catch (networkError: any) {
            console.error(`❌ Chunk ${loopCount} 네트워크 오류:`, networkError);
            
            // 🔥 네트워크 오류 시 사용자에게 알림
            if (networkError?.message?.includes('Network request failed') || networkError?.message?.includes('Failed to fetch')) {
              console.error('❌ STT 서버 접근 실패:', STT_ENDPOINT);
              console.error('💡 확인 사항:');
              console.error('  1. 서버 URL이 올바른지 확인');
              console.error('  2. Android에서 HTTPS URL인지 확인');
              console.error('  3. 네트워크 연결 상태 확인');
              
              // 네트워크 오류 시 첫 번째만 사용자에게 알림
              if (loopCount === 1) {
                Alert.alert(
                  '네트워크 오류',
                  'STT 서버에 연결할 수 없습니다.\n\n확인 사항:\n1. 인터넷 연결 확인\n2. 서버 상태 확인\n3. Wi-Fi/데이터 전환'
                );
              }
            }
            
            // 네트워크 오류는 계속 재시도 (일시적일 수 있음)
            continue;
          }

          if (res.ok) {
            const json = await res.json();
            console.log(`✅ Chunk ${loopCount} STT 결과:`, json.text);
            
            if (json.text && streamingRef.current) {
              // 🔥 STT 엔진 세션 ID 하드 게이트 체크 (지연된 콜백 이벤트 차단)
              if (sttSessionIdRef.current !== mySessionId) {
                console.log('🗑️ 오래된 STT 이벤트 폐기 (세션 불일치):', {
                  currentSession: sttSessionIdRef.current,
                  eventSession: mySessionId,
                  text: json.text
                });
                continue; // 이전 세션 이벤트는 무시
              }
              
              const chunkText = json.text;
              
              // 🔥 사용자 발화 시작 감지 (재확인 후 실제 발화 시작)
              if (isWaitingUserSpeech && chunkText.trim().length > 0) {
                console.log('🎤 사용자 발화 시작 감지:', chunkText);
                setIsWaitingUserSpeech(false); // 사용자 발화 시작 → 대기 상태 해제
              }
              
              // 부분 텍스트 누적 및 업데이트 시간 갱신
              setLiveText((prev) => {
                const newText = prev ? prev + ' ' + chunkText : chunkText;
                console.log('📝 부분 텍스트 누적:', newText);
                return newText;
              });
              
              // 🔥 마지막 업데이트 시간 갱신 (말 끝 감지용)
              setLastUpdateAt(Date.now());
            } else {
              console.warn(`⚠️ Chunk ${loopCount} 텍스트 없음 또는 스트리밍 중지됨`);
            }
          } else {
            const errorText = await res.text();
            console.warn(`⚠️ STT chunk ${loopCount} 실패:`, res.status, errorText);
          }
        } catch (chunkError: any) {
          console.error('❌ Chunk 처리 오류:', chunkError);
          
          // 🔥 네트워크 오류 감지 및 처리
          const errorMessage = chunkError?.message || String(chunkError);
          
          if (
            errorMessage.includes('Network request failed') ||
            errorMessage.includes('Failed to fetch') ||
            errorMessage.includes('NetworkError')
          ) {
            console.error('❌ STT 네트워크 오류 감지');
            console.error('💡 STT 서버 URL:', 'https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/stt');
            console.error('💡 확인 사항:');
            console.error('  1. 서버 URL이 올바른지 확인');
            console.error('  2. Android에서 HTTPS URL인지 확인 (HTTP는 차단됨)');
            console.error('  3. 네트워크 연결 상태 확인');
            console.error('  4. 서버가 실행 중인지 확인');
            
            // 네트워크 오류가 연속으로 발생하면 사용자에게 알림 (첫 번째만)
            if (loopCount === 1) {
              Alert.alert(
                '네트워크 오류',
                'STT 서버에 연결할 수 없습니다.\n\n확인 사항:\n1. 인터넷 연결 확인\n2. 서버 상태 확인\n3. Wi-Fi/데이터 전환',
                [{ text: '확인' }]
              );
            }
            
            // 네트워크 오류는 계속 재시도 (일시적일 수 있음)
            continue;
          }
          
          // 🔥 Chunk 오류가 권한 관련이면 즉시 중지
          if (
            errorMessage.includes('permission') ||
            errorMessage.includes('권한') ||
            errorMessage.includes('Permission')
          ) {
            console.error('❌ 녹음 권한 오류로 중지');
            Alert.alert(
              '마이크 권한 오류',
              '녹음 중 마이크 권한 문제가 발생했습니다.\n설정 > 앱 > 권한 > 마이크에서 허용해주세요.'
            );
            streamingRef.current = false;
            setIsStreaming(false);
            return;
          }
          
          // Chunk 실패해도 계속 진행 (일시적 오류 가능)
        }
      }
      
      // 🔥 루프 종료 로그
      if (loopCount >= MAX_LOOPS) {
        console.warn('⚠️ STT 루프 최대 반복 횟수 도달, 안전하게 중지');
        streamingRef.current = false;
        setIsStreaming(false);
        Alert.alert('STT 중지', '녹음 시간이 너무 길어 자동으로 중지되었습니다.');
      }
    } catch (e: any) {
      console.error('❌ 실시간 STT 시작 오류:', e);
      
      // 🔥 STT State Machine: 에러 시 IDLE 복귀
      setSttState('IDLE');
      hasExecutedRef.current = false;
      
      // 🔥 에러 발생 시 확실히 중지
      streamingRef.current = false;
      setIsStreaming(false);
      setExecuted(false);
      
      // 🔥 구체적인 오류 메시지 추출
      const errorMessage = e?.message || String(e);
      let userMessage = '실시간 STT를 시작할 수 없습니다.';
      
      if (errorMessage.includes('permission') || errorMessage.includes('권한')) {
        userMessage = '마이크 권한이 필요합니다.\n설정 > 앱 > 권한 > 마이크에서 허용해주세요.';
      } else if (errorMessage.includes('recording') || errorMessage.includes('녹음')) {
        userMessage = '녹음 기능을 시작할 수 없습니다.\n기기를 다시 시작하거나 앱을 재설치해보세요.';
      } else if (errorMessage.includes('Audio') || errorMessage.includes('audio')) {
        userMessage = '오디오 시스템 오류가 발생했습니다.\n기기를 재시작해보세요.';
      }
      
      Alert.alert('실시간 STT 시작 오류', userMessage);
    }
  };

  // 🛑 실시간 STT 중지
  const stopLiveSTT = async () => {
    console.log('🛑 실시간 STT 중지');
    
    // 🔥 STT 엔진 세션 ID 증가 (이전 세션 이벤트 전부 무효화)
    sttSessionIdRef.current += 1;
    console.log('🛑 STT STOP, session =', sttSessionIdRef.current, '(이전 세션 이벤트 전부 무효화)');
    
    // 🔥 확실한 중지 (순서 중요)
    streamingRef.current = false;
    setIsStreaming(false);
    setExecuted(true); // 실행 중지 플래그도 설정
    setExecuted(false);

    // 🔥 Android: Notification 제거 (Development Build에서만)
    const isExpoGo = Constants.executionEnvironment === Constants.executionEnvironment.StoreClient;
    if (Platform.OS === 'android' && !isExpoGo) {
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.dismissAllNotificationsAsync();
      } catch (error) {
        console.warn('⚠️ Notification 제거 경고:', error);
      }
    }
    
    // Always-On 모드면 IDLE로 복귀, 아니면 완전 종료
    if (isAlwaysOn) {
      setWakeState('IDLE');
      startWakeWordDetection(); // Wake Word 감지 재시작
    } else {
      setWakeState('IDLE');
    }
  };

  /**
   * 🎧 Wake Word 감지 (야고야, 헤이 야고)
   */
  const detectWakeWord = (text: string): boolean => {
    const normalized = text.toLowerCase().trim();
    return /(야고야|헤이\s?야고|야고\s?야고)/i.test(normalized);
  };

  /**
   * 🛑 종료 명령어 감지 (그만, 됐어, 꺼줘)
   */
  const detectStopCommand = (text: string): boolean => {
    const normalized = text.toLowerCase().trim();
    return /(그만|됐어|꺼줘|중지|멈춰|종료)/i.test(normalized);
  };


  // 🎧 Always-On Wake Word 감지 루프 (초저전력 모드)
  const startWakeWordDetection = async () => {
    if (!isAlwaysOn || wakeState !== 'IDLE') return;

    try {
      // 🔥 플랫폼별 올바른 권한 요청
      let permissionGranted = false;

      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: '마이크 권한 필요',
              message: 'Wake Word 감지를 위해 마이크 권한이 필요합니다.',
              buttonPositive: '허용',
            }
          );
          permissionGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (androidError: any) {
          console.warn('⚠️ Android 권한 요청 오류:', androidError);
          return;
        }
      } else {
        // iOS: 안전한 권한 요청
        permissionGranted = await ensureMicrophonePermission();
      }

      if (!permissionGranted) {
        console.warn('⚠️ Wake Word 감지: 마이크 권한 없음');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      wakeStreamingRef.current = true;
      setWakeState('WAKE_LISTENING');

      console.log('🎧 Wake Word 감지 시작 (Always-On)');

      // 🔄 초저전력 Wake Word 감지 루프 (긴 간격 chunk)
      // 🔥 안전장치: 최대 반복 횟수 제한
      let wakeLoopCount = 0;
      const MAX_WAKE_LOOPS = 2000; // 최대 2000회 (약 100분) - 안전장치
      
      while (wakeStreamingRef.current && isAlwaysOn && wakeState === 'WAKE_LISTENING' && wakeLoopCount < MAX_WAKE_LOOPS) {
        wakeLoopCount++;
        try {
          // Wake Word 감지는 긴 간격 (배터리 절약)
          const { recording: wakeRecording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.LOW_QUALITY
          );

          // 3초 녹음 (Wake Word 감지용)
          await new Promise((resolve) => setTimeout(resolve, 3000));

          await wakeRecording.stopAndUnloadAsync();
          const wakeUri = wakeRecording.getURI();

          if (!wakeUri || !wakeStreamingRef.current) {
            continue;
          }

          // base64 변환
          // ⚠️ expo-file-system v19에서는 encoding을 문자열로 사용
          const base64 = await FileSystem.readAsStringAsync(wakeUri, {
            encoding: 'base64' as any,
          });

          // STT 호출 (Wake Word 감지용)
          const res = await fetch(
            'https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/stt',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64 }),
            }
          );

          if (res.ok) {
            const json = await res.json();
            const chunkText = json.text?.toLowerCase() || '';

            // Wake Word 감지
            if (detectWakeWord(chunkText) && wakeState === 'WAKE_LISTENING') {
              console.log('🎧 Wake Word 감지!', chunkText);
              
              // 🔔 UX 연출: 진동
              try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              } catch (e) {
                console.warn('진동 실패:', e);
              }

              // 🔊 UX 연출: 음성 피드백
              if (ttsEnabled) {
                // 🔥 1. STT 완전 종료 대기 (Android 오디오 포커스 전환 필수)
                await new Promise((resolve) => setTimeout(resolve, 300));
                
                // 🔥 2. Android Audio Mode 설정 (STT → TTS 전환 필수)
                await enableTTSAudio();
                
                // 🔥 3. 세션 정리
                Speech.stop();
                
                // 🔥 4. TTS 재생
                Speech.speak('네', {
                  language: 'ko-KR',
                  rate: 0.95,
                  pitch: 1.0,
                  volume: 1.0,
                  onStart: () => console.log('🔊 TTS start (Wake)'),
                  onDone: () => console.log('🔊 TTS done (Wake)'),
                  onError: (e) => console.error('❌ TTS error (Wake)', e),
                });
              }

              // STT 스트리밍 시작 (Wake 이후)
              setWakeState('LISTENING');
              setAssistantState('LISTENING');
              wakeStreamingRef.current = false; // Wake 루프 중지

              // 자동으로 실시간 STT 시작
              await startLiveSTTAfterWake();
              return;
            }
          }
        } catch (wakeError: any) {
          console.warn('⚠️ Wake Word 감지 오류:', wakeError);
          // 오류해도 계속 진행
        }
      }
      
      // 🔥 루프 종료 로그
      if (wakeLoopCount >= MAX_WAKE_LOOPS) {
        console.warn('⚠️ Wake Word 루프 최대 반복 횟수 도달, 안전하게 중지');
        wakeStreamingRef.current = false;
        setWakeState('IDLE');
      }
    } catch (e: any) {
      console.error('❌ Wake Word 감지 시작 오류:', e);
      // 🔥 에러 발생 시 확실히 중지
      wakeStreamingRef.current = false;
      setWakeState('IDLE');
    }
  };

  // 🎧 Wake Word 감지 후 STT 시작
  const startLiveSTTAfterWake = async () => {
    // 🔥 중복 시작 방지: 실제로 스트리밍 중이면 리턴 (상태만 LISTENING인 건 허용)
    if (isStreaming || streamingRef.current) {
      console.warn('⚠️ Wake Word STT 시작 취소: 이미 진행 중인 세션 감지');
      return;
    }
    
    try {
      // 🔒 실사용 안정성: 새 명령 시작 시 세션 완전 리셋
      resetSttSession();
      isMapOpenRef.current = false; // 새 명령 시작 시 지도 상태 리셋
      
      // 🔥 FIX 1: STT 시작 시 상태 완전 초기화 (필수!)
      setLiveText(''); // transcript 초기화
      setExecuted(false); // hasExecuted 초기화
      hasExecutedRef.current = false; // STT 세션 실행 여부 초기화
      setLastUpdateAt(Date.now());
      setCurrentSummary(''); // summary 초기화
      setCurrentFollowups([]); // followups 초기화
      
      // 🔥 STT State Machine: IDLE → LISTENING (Wake 후)
      setSttState('LISTENING');
      
      setIsStreaming(true);
      streamingRef.current = true;

      console.log('🎙 Wake 후 STT 시작');
      console.log('✅ 상태 초기화 완료, STT State: LISTENING');

      // 기존 startLiveSTT 로직과 동일한 chunk 루프
      // 🔥 안전장치: 최대 반복 횟수 제한
      let wakeSTTLoopCount = 0;
      const MAX_WAKE_STT_LOOPS = 1000; // 최대 1000회 (약 25분) - 안전장치
      
      while (streamingRef.current && wakeState === 'LISTENING' && wakeSTTLoopCount < MAX_WAKE_STT_LOOPS) {
        wakeSTTLoopCount++;
        try {
          const { recording: chunkRecording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.LOW_QUALITY
          );

          await new Promise((resolve) => setTimeout(resolve, 1500));
          await chunkRecording.stopAndUnloadAsync();
          const chunkUri = chunkRecording.getURI();

          if (!chunkUri || !streamingRef.current) {
            continue;
          }

          // ⚠️ expo-file-system v19에서는 encoding을 문자열로 사용
          const base64 = await FileSystem.readAsStringAsync(chunkUri, {
            encoding: 'base64' as any,
          });

          const res = await fetch(
            'https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/stt',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64 }),
            }
          );

          if (res.ok) {
            const json = await res.json();
            if (json.text && streamingRef.current) {
              // 🔥 STT 엔진 세션 ID 하드 게이트 체크 (지연된 콜백 이벤트 차단)
              if (sttSessionIdRef.current !== mySessionId) {
                console.log('🗑️ 오래된 STT 이벤트 폐기 (Wake, 세션 불일치):', {
                  currentSession: sttSessionIdRef.current,
                  eventSession: mySessionId,
                  text: json.text
                });
                continue; // 이전 세션 이벤트는 무시
              }
              
              const chunkText = json.text;
              
              // 🔥 사용자 발화 시작 감지 (재확인 후 실제 발화 시작) - Wake Word 경로
              if (isWaitingUserSpeech && chunkText.trim().length > 0) {
                console.log('🎤 사용자 발화 시작 감지 (Wake):', chunkText);
                setIsWaitingUserSpeech(false); // 사용자 발화 시작 → 대기 상태 해제
              }

              setLiveText((prev) => {
                const newText = prev ? prev + ' ' + chunkText : chunkText;
                console.log('📝 부분 텍스트:', chunkText);
                return newText;
              });

              setLastUpdateAt(Date.now());
            }
          }
        } catch (chunkError: any) {
          // 🔥 STT chunk 에러는 격리 (TTS까지 막지 않음)
          console.warn('⚠️ Chunk 처리 오류 (격리됨):', chunkError);
          // 에러가 나도 루프는 계속 (일시적 네트워크 오류일 수 있음)
        }
      }
      
      // 🔥 루프 종료 로그
      if (wakeSTTLoopCount >= MAX_WAKE_STT_LOOPS) {
        console.warn('⚠️ Wake STT 루프 최대 반복 횟수 도달, 안전하게 중지');
        streamingRef.current = false;
        setIsStreaming(false);
        setWakeState('IDLE');
      }
    } catch (e: any) {
      // 🔥 STT 에러는 격리 (TTS까지 막지 않음)
      console.warn('⚠️ Wake 후 STT 시작 오류 (격리됨):', e);
      // 🔥 에러 발생 시 확실히 중지
      try {
        streamingRef.current = false;
        setIsStreaming(false);
        setExecuted(true);
        setWakeState('IDLE');
      } catch (cleanupError) {
        console.warn('⚠️ Cleanup 에러 (무시):', cleanupError);
      }
    }
  };

  /**
   * 🎧 Always-On 저전력 STT 루프 (Wake Word 감지용)
   * startWakeWordDetection의 개선 버전
   */
  const startAlwaysOnSTT = async () => {
    if (alwaysOnStreamingRef.current) return;
    if (!isAlwaysOn) return;

    try {
      const permissionGranted = await ensureMicrophonePermission();
      if (!permissionGranted) {
        console.warn('⚠️ Always-On: 마이크 권한 없음');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      alwaysOnStreamingRef.current = true;
      setAssistantState('ALWAYS_LISTENING');
      setWakeState('WAKE_LISTENING');

      console.log('🎧 Always-On STT 시작 (Wake Word 대기)');

      let wakeLoopCount = 0;
      const MAX_WAKE_LOOPS = 2000;

      while (
        alwaysOnStreamingRef.current &&
        isAlwaysOn &&
        assistantState === 'ALWAYS_LISTENING' &&
        wakeLoopCount < MAX_WAKE_LOOPS
      ) {
        wakeLoopCount++;
        try {
          const recordingOptions: Audio.RecordingOptions = {
            android: {
              extension: '.m4a',
              outputFormat: Audio.AndroidOutputFormat.MPEG_4,
              audioEncoder: Audio.AndroidAudioEncoder.AAC,
              sampleRate: 16000,
              numberOfChannels: 1,
              bitRate: 64000, // 저전력
            },
            ios: {
              extension: '.m4a',
              outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
              audioQuality: Audio.IOSAudioQuality.LOW,
              sampleRate: 16000,
              numberOfChannels: 1,
              bitRate: 64000,
            },
          };

          const { recording: wakeRecording } = await Audio.Recording.createAsync(
            recordingOptions
          );

          await new Promise((resolve) => setTimeout(resolve, 3000));
          await wakeRecording.stopAndUnloadAsync();
          const wakeUri = wakeRecording.getURI();

          if (!wakeUri || !alwaysOnStreamingRef.current) {
            continue;
          }

          const base64 = await FileSystem.readAsStringAsync(wakeUri, {
            encoding: 'base64' as any,
          });

          const res = await fetch(
            'https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/stt',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64 }),
            }
          );

          if (res.ok) {
            const json = await res.json();
            const chunkText = json.text?.toLowerCase() || '';

            if (detectWakeWord(chunkText) && assistantState === 'ALWAYS_LISTENING') {
              console.log('🎧 Wake Word 감지!', chunkText);

              // 🔔 UX 연출: 진동
              try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              } catch (e) {
                console.warn('진동 실패:', e);
              }

              // 🔊 UX 연출: 음성 피드백
              if (ttsEnabled) {
                // 🔥 1. STT 완전 종료 대기 (Android 오디오 포커스 전환 필수)
                await new Promise((resolve) => setTimeout(resolve, 300));
                
                // 🔥 2. Android Audio Mode 설정 (STT → TTS 전환 필수)
                await enableTTSAudio();
                
                // 🔥 3. 세션 정리
                Speech.stop();
                
                // 🔥 4. TTS 재생
                Speech.speak('네', {
                  language: 'ko-KR',
                  rate: 0.95,
                  pitch: 1.0,
                  volume: 1.0,
                  onStart: () => console.log('🔊 TTS start (Always-On)'),
                  onDone: () => console.log('🔊 TTS done (Always-On)'),
                  onError: (e) => console.error('❌ TTS error (Always-On)', e),
                });
              }

              alwaysOnStreamingRef.current = false;
              setAssistantState('LISTENING');
              setWakeState('LISTENING');
              setIsStreaming(true);
              streamingRef.current = true;
              setLiveText('');
              setLastUpdateAt(Date.now());
              setExecuted(false);

              // 일반 STT 루프 시작
              startLiveSTTAfterWake();
              return;
            }
          }
        } catch (wakeError: any) {
          console.warn('⚠️ Always-On STT 오류:', wakeError);
        }
      }

      if (wakeLoopCount >= MAX_WAKE_LOOPS) {
        console.warn('⚠️ Always-On 루프 최대 반복 횟수 도달');
        alwaysOnStreamingRef.current = false;
        setAssistantState('IDLE');
      }
    } catch (e: any) {
      console.error('❌ Always-On STT 시작 오류:', e);
      alwaysOnStreamingRef.current = false;
      setAssistantState('IDLE');
    }
  };

  // 🎧 Always-On 모드 토글
  const toggleAlwaysOn = async () => {
    const newState = !isAlwaysOn;
    setIsAlwaysOn(newState);

    if (newState) {
      console.log('🎧 Always-On 모드 ON');
      setAssistantState('IDLE');
      setWakeState('IDLE');
      // 새로운 Always-On STT 시작
      await startAlwaysOnSTT();
    } else {
      console.log('🎧 Always-On 모드 OFF');
      // 모든 스트리밍 중지
      alwaysOnStreamingRef.current = false;
      wakeStreamingRef.current = false;
      streamingRef.current = false;
      setAssistantState('IDLE');
      setWakeState('IDLE');
      setIsStreaming(false);
      setExecuted(false);

      // 타임아웃 클리어
      if (wakeTimeoutRef.current) {
        clearTimeout(wakeTimeoutRef.current);
        wakeTimeoutRef.current = null;
      }
    }
  };

  // 🔥 말 끝 감지 타이머 + LLM Intent Parser (Hands-free UX 핵심)
  useEffect(() => {
    // 🔥 안전장치: streaming이 아니거나 이미 실행됐으면 타이머 시작 안 함
    // 🔥 재확인 중이면 타이머 시작 안 함
    if (!isStreaming || executed || isReconfirming) {
      return;
    }

    let isProcessing = false; // 중복 실행 방지 플래그
    let timerId: NodeJS.Timeout | null = null;

    const checkSilence = async () => {
      // 🔥 STT 엔진 세션 ID 하드 게이트 체크 (지연된 콜백 이벤트 차단)
      // 현재 활성 세션이 아니면 모든 STT 결과 무시
      const currentSessionId = sttSessionIdRef.current;
      if (currentSessionId === 0) {
        // 세션이 시작되지 않았으면 무시
        return;
      }
      
      // 🔥 재확인 중 + 사용자 발화 대기 중이면 STT 결과 무시 (2중 차단)
      if (isReconfirming && isWaitingUserSpeech) {
        console.log('🔕 재확인 중, 사용자 발화 전 STT 결과 무시');
        return;
      }
      
      // 🔥 FIX 2: STT 시작 직후 실행 금지 guard (필수!)
      if (!isStreaming) {
        console.log('🛑 Guard: isStreaming이 false, 실행 중단');
        return;
      }
      
      // 🔥 안전장치: 상태 재확인
      if (executed || isProcessing) {
        return;
      }

      const now = Date.now();

      // 1.8초 동안 텍스트 업데이트 없으면 말 끝으로 판단
      if (now - lastUpdateAt > 1800 && liveText.length > 3) {
        // 🔥 즉시 잠금 (중복 실행 방지)
        isProcessing = true;
        setExecuted(true);
        setIsStreaming(false);
        streamingRef.current = false; // 루프도 중지
        
        // 🔥 타이머 즉시 정리
        if (timerId) {
          clearInterval(timerId);
          timerId = null;
        }
        
        // 🎧 Always-On 모드면 PROCESSING 상태로 전환
        if (isAlwaysOn) {
          setWakeState('PROCESSING');
        }

        // 🔥 STT 엔진 세션 ID 하드 게이트 체크 (지연된 콜백 이벤트 차단)
        // 현재 활성 세션이 아니면 말 끝 감지 무시
        const currentSessionId = sttSessionIdRef.current;
        if (currentSessionId === 0) {
          console.log('🗑️ 세션 ID가 0이면 무시 (STT 시작 전)');
          return;
        }
        
        const finalText = liveText.trim();
        console.log('🗺 말 끝 감지! 최종 텍스트:', finalText, 'session =', currentSessionId);
        
        // 🔥 FIX 3: "말 안 했으면 아무 것도 하지 않기" (필수!)
        if (!finalText || finalText.length < 2) {
          console.log('🛑 음성 없음, 실행 중단 (길이:', finalText?.length || 0, ')');
          // 상태 복구 및 IDLE 복귀
          isProcessing = false;
          setExecuted(false);
          setSttState('IDLE');
          setIsStreaming(true);
          streamingRef.current = true;
          return;
        }
        
        // 🔥 FIX 2 추가: finalText가 비어있으면 실행 중단
        if (!finalText.trim()) {
          console.log('🛑 Guard: finalText가 비어있음, 실행 중단');
          // 상태 복구 및 IDLE 복귀
          isProcessing = false;
          setExecuted(false);
          setSttState('IDLE');
          setIsStreaming(true);
          streamingRef.current = true;
          return;
        }
        
        // 🎯 ① 오인식 필터 (뉴스/방송체 감지)
        if (isLikelyBroadcast(finalText)) {
          console.log('⚠️ STT 오인식 필터 발동:', finalText);
          isProcessing = false;
          setExecuted(false);
          await requestReconfirm();
          return;
        }

        // 🎯 ② 명령어 필터 (길이 및 키워드 체크)
        if (!isValidCommand(finalText)) {
          console.log('⚠️ 명령어 필터 발동:', finalText);
          isProcessing = false;
          setExecuted(false);
          await requestReconfirm();
          return;
        }
        
        // 🔥 STT State Machine: LISTENING → PROCESSING (말 끝 감지 시)
        console.log('🔄 STT State 전환: LISTENING → PROCESSING');
        setSttState('PROCESSING');

        // 🛑 종료 명령어 감지 (그만, 됐어, 꺼줘)
        if (detectStopCommand(finalText)) {
          console.log('🛑 종료 명령어 감지');
          stopLiveSTT();
          setAssistantState('IDLE');
          setCurrentSummary('');
          setCurrentFollowups([]);
          // 🔥 STT State Machine: PROCESSING → IDLE (종료 명령)
          setSttState('IDLE');
          // Always-On 모드면 다시 시작
          if (isAlwaysOn) {
            setTimeout(() => {
              startAlwaysOnSTT();
            }, 2000);
          }
          return;
        }

        // 🔒 STT 세션 실행 여부 체크 (State Machine 기반)
        if (hasExecutedRef.current) {
          console.log('🛑 Guard: 이미 실행된 STT 세션, 중단');
          setSttState('IDLE');
          return;
        }
        
        // 🔒 중복 실행 방지 체크
        // 🔥 안전한 canExecute 체크 (에러 격리)
        let canProceed = false;
        try {
          canProceed = canExecute(finalText) !== false;
        } catch (gateError) {
          console.warn('⚠️ canExecute 체크 에러 (격리됨):', gateError);
          // 에러가 나도 진행 (단, executed 플래그는 이미 설정됨)
          canProceed = true;
        }
        
        if (!canProceed) {
          setSttState('IDLE');
          return;
        }

        // 🔒 실행 기록 (STT 세션 실행 플래그 설정)
        hasExecutedRef.current = true;
        markExecuted(finalText);

        // 🎯 State: LISTENING 종료 → THINKING (서버 요청 중)
        setAssistantState('THINKING');

        // 🛑 자동 종료 타이머 (8초 무음 시 IDLE 복귀)
        const autoStopTimer = setTimeout(() => {
          if (assistantState === 'LISTENING') {
            console.log('⏸ 8초 무음, IDLE 복귀');
            stopLiveSTT();
            setAssistantState('IDLE');
            // Always-On 모드면 다시 시작
            if (isAlwaysOn) {
              setTimeout(() => {
                startAlwaysOnSTT();
              }, 1000);
            }
          }
        }, 8000);

        try {
          // 🧠 Voice Step 호출 (확장된 응답)
          lastQueryRef.current = finalText; // Follow-up 재요청용 저장
          
          let stepResponse: StepResponse | null = null;
          try {
            stepResponse = await callVoiceStep(finalText, recentMemory);
            console.log('✅ Voice Step 응답:', stepResponse.instruction.kind, stepResponse.decision);
          } catch (voiceStepError: any) {
            // 🔥 Voice Step 실패해도 TTS는 실행 (격리)
            console.warn('⚠️ Voice Step API 실패 (격리됨):', voiceStepError);
            
            // 🔥 기본 TTS 재생 (서버 응답 없어도 비서는 말해야 함)
            if (ttsEnabled) {
              try {
                const fallbackMessage = `알겠습니다. ${finalText} 검색 중입니다.`;
                await speakOnce(fallbackMessage);
              } catch (ttsError) {
                console.warn('⚠️ Fallback TTS 에러 (격리됨):', ttsError);
              }
            }
            
            // 🔥 기본 검색 실행 (서버 응답 없어도 동작)
            setAssistantState('PRESENTING');
            openGoogleMaps(finalText);
            
            // 🔥 STT State Machine: PROCESSING → IDLE (에러 시에도 복귀)
            console.log('🔄 STT State 전환: PROCESSING → IDLE (에러 복귀)');
            setSttState('IDLE');
            
            // 🛑 자동 종료 타이머 취소
            clearTimeout(autoStopTimer);
            
            // Always-On 모드면 다시 시작
            if (isAlwaysOn) {
              setTimeout(() => {
                if (isAlwaysOn) {
                  startAlwaysOnSTT();
                }
              }, 5000);
            }
            
            return; // 에러 시 여기서 종료
          }

          // 🛑 자동 종료 타이머 취소
          clearTimeout(autoStopTimer);

          // 🔥 정상 명령 처리됨 → 재확인 상태 완전 리셋 (무한 루프 방지)
          setIsReconfirming(false);
          setIsWaitingUserSpeech(false);
          console.log('✅ 정상 명령 처리, 재확인 상태 완전 리셋');

          // 🎯 핵심: Assistant 응답 처리 (한 함수로 모든 상태 전이)
          if (stepResponse) {
            await handleAssistantResponse(
              stepResponse,
              finalText,
              setAssistantState,
              setCurrentSummary,
              setCurrentFollowups,
              setRecentMemory,
              openGoogleMapsNavigate,
              openGoogleMaps,
              ttsEnabled,
              ttsGate,
              hasSpokenRef,
              isRealWorldMode,
              isMapOpenRef,
              finalizeTtsIfAny,
              lockSpeechUntilNextCommand
            );
          }

          // 🔥 STT State Machine: PROCESSING → IDLE (실행 완료)
          console.log('🔄 STT State 전환: PROCESSING → IDLE (실행 완료)');
          setSttState('IDLE');

          // 🎧 Always-On 모드면 실행 완료 후 다시 시작
          if (isAlwaysOn && assistantState !== 'ALWAYS_LISTENING') {
            setTimeout(() => {
              if (isAlwaysOn) {
                startAlwaysOnSTT();
              }
            }, 5000); // 5초 후 재시작
          }
          
          // 🧠 기존 Agent 호출 (fallback - 아래 코드는 실행 안 됨)
          const agentResult = await callAgent(finalText, recentMemory);
          console.log('✅ Agent 결정:', agentResult.action, agentResult.query);

          // 🧠 메모리에 저장 (action에 따라 다른 저장 방식)
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

          // 🚀 Executor: Action에 따라 실행 (switch-case)
          switch (agentResult.action) {
            case 'REPEAT_LAST': {
              // 아까 그거 / 방금 그거 / 다시
              const last = recentMemory[0];
              if (last?.result?.destination) {
                console.log('🗺 이전 결과 재안내:', last.result.destination);
                openGoogleMapsNavigate(
                  last.result.destination,
                  last.intent.query || last.result.destination
                );

                // 메모리 업데이트 (재실행 기록)
                setRecentMemory((prev) => {
                  const newMem = [...prev];
                  if (newMem[0]) {
                    newMem[0].timestamp = Date.now();
                  }
                  return newMem;
                });
              } else {
                // 🛡️ 메모리에 결과 없으면 기본 검색
                console.warn('⚠️ 메모리에 결과 없음, 기본 검색 실행');
                if (last?.intent?.query) {
                  openGoogleMaps(last.intent.query);
                } else {
                  ultimateFallback(finalText);
                }
              }
              return;
            }

            case 'SEARCH_ALTERNATIVE': {
              // 방금 찾은 데 말고 다른 데
              const last = recentMemory[0];
              if (last?.result?.candidates && last.result.candidates.length > 1) {
                const chosenIndex = last.result.chosenIndex ?? 0;
                const otherCandidates = last.result.candidates.filter(
                  (_, i) => i !== chosenIndex
                );

                if (otherCandidates.length > 0) {
                  console.log('🗺 다른 후보로 안내:', otherCandidates[0]);
                  openGoogleMapsNavigate(otherCandidates[0]);

                  // 메모리 업데이트
                  setRecentMemory((prev) => {
                    const newMem = [...prev];
                    if (newMem[0]) {
                      const newChosenIndex =
                        chosenIndex === 0 ? 1 : chosenIndex - 1;
                      newMem[0].result = {
                        ...newMem[0].result,
                        destination: otherCandidates[0],
                        chosenIndex: newChosenIndex,
                      };
                      newMem[0].timestamp = Date.now();
                    }
                    return newMem;
                  });
                } else {
                  // 🛡️ 후보 없으면 기본 검색
                  openGoogleMaps(agentResult.query || finalText, agentResult.filters);
                }
              } else {
                // 🛡️ 메모리 없으면 기본 검색
                openGoogleMaps(agentResult.query || finalText, agentResult.filters);
              }
              return;
            }

            case 'NAVIGATE': {
              // 바로 길안내
              console.log('🗺 NAVIGATE 실행:', agentResult.query);
              openGoogleMapsNavigate(agentResult.query, agentResult.query);

              // 메모리 저장
              setRecentMemory((prev) => {
                const newMem = [newMemoryItem, ...prev];
                newMem[0].result = { destination: agentResult.query };
                return newMem.slice(0, 3);
              });
              return;
            }

            case 'SEARCH':
            default: {
              // 검색만 실행 (기본값)
              console.log('📍 SEARCH 실행:', agentResult.query, agentResult.filters);

              // 🚀 Execute Intent 호출 (자동 길안내 포함)
              try {
                const result = await callExecuteIntent(
                  {
                    type: 'MAP_SEARCH',
                    query: agentResult.query || finalText,
                    filters: agentResult.filters,
                    autoNavigate: true,
                    confidence: 1.0,
                  },
                  finalText
                );
                console.log('✅ Execute Intent 결과:', result);

                // 메모리 저장: 결과 포함
                setRecentMemory((prev) => {
                  const newMem = [newMemoryItem, ...prev];
                  if (result.action === 'NAVIGATE' && result.destination) {
                    newMem[0].result = {
                      destination: result.destination,
                      candidates: result.place ? [result.destination!] : undefined,
                      chosenIndex: result.place ? 0 : undefined,
                    };
                  }
                  return newMem.slice(0, 3);
                });

                if (result.action === 'NAVIGATE' && result.destination) {
                  // 🛡️ 자동 길안내 실행
                  openGoogleMapsNavigate(
                    result.destination,
                    agentResult.query || finalText
                  );
                } else if (result.action === 'OPEN_SEARCH' && result.query) {
                  // 검색만 열기
                  openGoogleMaps(result.query, result.filters);
                } else {
                  // 🛡️ 기본 검색
                  openGoogleMaps(agentResult.query || finalText, agentResult.filters);
                }
              } catch (executeError: any) {
                console.error('❌ Execute Intent 실패, 기본 검색 실행:', executeError);
                // 🛡️ Execute Intent 실패 시 기본 검색
                openGoogleMaps(agentResult.query || finalText, agentResult.filters);

                // 메모리 저장 (결과 없음)
                setRecentMemory((prev) => {
                  const newMem = [newMemoryItem, ...prev];
                  return newMem.slice(0, 3);
                });
              }
              return;
            }
          }
          
          // 🎧 Always-On 모드면 IDLE로 복귀 (Wake Word 감지 재시작)
          if (isAlwaysOn) {
            setWakeState('IDLE');
            // 잠시 후 Wake Word 감지 재시작
            setTimeout(() => {
              if (isAlwaysOn) {
                startWakeWordDetection();
              }
            }, 1000);
          }
        } catch (error: any) {
          console.error('❌ Voice Step 호출 실패, ultimate fallback:', error);
          // 🛑 자동 종료 타이머 취소
          clearTimeout(autoStopTimer);
          
          // 🛡️ 실패 시 최종 안전망
          setAssistantState('IDLE');
          setCurrentSummary('');
          setCurrentFollowups([]);
          
          const cmd = parseCommand(finalText);
          if (cmd.type === 'MAP') {
            openGoogleMaps(cmd.query!);
          } else {
            ultimateFallback(finalText);
          }
          
          // 🎧 Always-On 모드면 다시 시작
          if (isAlwaysOn) {
            setTimeout(() => {
              if (isAlwaysOn) {
                startAlwaysOnSTT();
              }
            }, 2000);
          }
        }
      }
    };

    // 🔥 setInterval 대신 setTimeout 체인으로 변경 (더 안전)
    const scheduleNext = () => {
      if (!isStreaming || executed || isProcessing) {
        return;
      }
      timerId = setTimeout(() => {
        checkSilence().finally(() => {
          if (isStreaming && !executed && !isProcessing) {
            scheduleNext(); // 다음 체크 예약
          }
        });
      }, 300);
    };

    scheduleNext(); // 첫 체크 시작

    return () => {
      // 🔥 cleanup: 타이머 확실히 정리
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      isProcessing = false;
    };
  }, [liveText, lastUpdateAt, isStreaming, executed, isAlwaysOn, recentMemory, wakeState, isReconfirming]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>🎤 STT TEST</Text>

      {/* 🧪 네트워크 테스트 버튼 */}
      <Pressable
        onPress={testNetwork}
        style={{
          backgroundColor: '#2979FF',
          padding: 14,
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: 'white', fontSize: 16 }}>네트워크 테스트</Text>
      </Pressable>

      {/* 🔊 TTS 진실 테스트 버튼 (STT 없이 TTS만) */}
      <Pressable
        onPress={async () => {
          console.log('🔊 STT 없이 TTS만 테스트 시작');
          console.log('📱 Platform:', Platform.OS);
          console.log('📱 Constants.executionEnvironment:', Constants.executionEnvironment);
          
          try {
            await enableTTSAudio();
            console.log('✅ Audio Mode 설정 완료');
            
            Speech.stop();
            console.log('✅ Speech.stop() 완료');
            
            const testText = '지금 이 소리가 들리면 모든 문제는 끝입니다';
            console.log('🔊 Speech.speak() 호출:', testText);
            
            // 🔥 Android TTS 엔진 확인을 위한 추가 로그
            console.log('🔊 Speech 모듈 확인:', {
              speak: typeof Speech.speak,
              stop: typeof Speech.stop,
              isAvailable: !!Speech.speak,
            });
            
            // 🔥 speakGuide 함수 사용 (Audio Mode 설정 포함, Promise 기반)
            await speakGuide(testText);
            
            console.log('✅ TTS 테스트 완료');
            Alert.alert(
              'TTS 테스트',
              'TTS 재생을 시도했습니다.\n\n소리가 들렸다면 정상입니다.\n\n소리가 안 들리면:\n1. 설정 > 접근성 > TTS 출력에서 테스트 재생 확인\n2. 다른 앱(유튜브 등)에서 소리가 나는지 확인\n3. 기기 재시작 후 다시 시도'
            );
            
            console.log('✅ Speech.speak() 호출 완료 (비동기)');
          } catch (error: any) {
            console.error('❌ TTS 테스트 전체 오류:', error);
            Alert.alert('TTS 테스트 오류', `오류: ${error?.message || String(error)}`);
          }
        }}
        style={{
          backgroundColor: '#4CAF50',
          padding: 14,
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
          🔊 STT 없이 TTS만 테스트
        </Text>
        <Text style={{ color: 'white', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
          (이게 들리면 STT→TTS 전환 문제)
        </Text>
      </Pressable>

      {/* 📌 기존 녹음 기능 (테스트용) */}
      <Text style={styles.sectionTitle}>📼 기존 녹음 (테스트용)</Text>
      {!recording ? (
        <Pressable style={styles.button} onPress={startRecording}>
          <Text style={styles.buttonText}>녹음 시작</Text>
        </Pressable>
      ) : (
        <Pressable style={[styles.button, styles.stop]} onPress={stopRecording}>
          <Text style={styles.buttonText}>녹음 중지</Text>
        </Pressable>
      )}

      {uri && <Text style={styles.uri}>{uri}</Text>}

      {/* 🎧 Always-On 모드 섹션 (Wake Word) */}
      <View style={styles.liveSection}>
        <Text style={styles.sectionTitle}>🎧 Always-On 모드 (Wake Word)</Text>

        {/* Wake State 표시 */}
        <View style={styles.wakeStateContainer}>
          <Text style={styles.wakeStateText}>
            상태:{' '}
            {wakeState === 'IDLE' && <Text>💤 대기 중</Text>}
            {wakeState === 'WAKE_LISTENING' && <Text>👂 Wake Word 감지 중...</Text>}
            {wakeState === 'LISTENING' && <Text>🎙 명령 듣는 중...</Text>}
            {wakeState === 'PROCESSING' && <Text>🧠 처리 중...</Text>}
          </Text>
        </View>

        {/* Always-On 토글 버튼 */}
        <Pressable
          style={[
            styles.button,
            isAlwaysOn ? styles.alwaysOnActive : styles.alwaysOnInactive,
          ]}
          onPress={toggleAlwaysOn}
        >
          <Text style={styles.buttonText}>
            {isAlwaysOn ? '🔴 Always-On ON' : '⚪ Always-On OFF'}
          </Text>
        </Pressable>

        {isAlwaysOn && (
          <Text style={styles.wakeInstruction}>
            "헤이" 또는 "야고"라고 말하면 자동으로 인식합니다
          </Text>
        )}
      </View>

      {/* 🚀 실시간 STT 섹션 (수동 모드) */}
      <View style={styles.liveSection}>
        <Text style={styles.sectionTitle}>🚀 실시간 STT (수동 모드)</Text>

        {/* Assistant State 표시 */}
        <View style={styles.stateContainer}>
          <Text style={styles.stateLabel}>상태:</Text>
          <Text style={styles.stateText}>
            {assistantState === 'IDLE' && <Text>대기 중</Text>}
            {assistantState === 'LISTENING' && <Text>듣는 중...</Text>}
            {assistantState === 'THINKING' && <Text>생각 중...</Text>}
            {assistantState === 'PRESENTING' && <Text>결과 표시 중</Text>}
            {assistantState === 'AWAITING_FOLLOWUP' && <Text>선택 대기 중</Text>}
            {assistantState === 'NAVIGATING' && <Text>안내 중</Text>}
          </Text>
        </View>

        {/* 실시간 텍스트 표시 영역 */}
        <View style={styles.liveTextContainer}>
          <Text style={styles.liveText}>
            {liveText || '말하면 여기에 실시간 표시됩니다...'}
          </Text>
        </View>

        {/* 📝 Summary 표시 */}
        {currentSummary && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryLabel}>💬 비서:</Text>
            <Text style={styles.summaryText}>{currentSummary}</Text>
          </View>
        )}

        {/* 🔄 Follow-up 칩 UI */}
        {currentFollowups && currentFollowups.length > 0 && assistantState === 'AWAITING_FOLLOWUP' && (
          <View style={styles.followupsContainer}>
            <Text style={styles.followupsLabel}>다음 행동:</Text>
            <View style={styles.followupsChips}>
              {currentFollowups.map((followup) => (
                <Pressable
                  key={followup.id}
                  style={styles.followupChip}
                  onPress={async () => {
                    console.log('🔄 Follow-up 선택:', followup.id, followup.type);
                    
                    // 🔥 Follow-up은 새로운 액션이므로 TTS Guard 리셋
                    hasSpokenRef.current = false;
                    
                    // 🔒 실사용 안정성: Follow-up은 새로운 액션이므로 TTS Guard 리셋
                    hasSpokenRef.current = false;
                    
                    // 🎯 1️⃣ Follow-up 클릭 시 짧은 확인 멘트 (필수)
                    // 🚗 운전 모드: NAVIGATE만 말함
                    if (shouldSpeakFollowup(followup, isRealWorldMode) && ttsEnabled) {
                      try {
                        const confirmTTS = getFollowupConfirmTTS(followup, isRealWorldMode);
                        if (confirmTTS) {
                          console.log('🔊 Follow-up 확인 멘트:', confirmTTS);
                          hasSpokenRef.current = true; // 말하기 전에 플래그 설정
                          await speakOnce(confirmTTS);
                          console.log('✅ Follow-up TTS 완료, 액션 실행');
                          
                          // 🎯 UX 버퍼: TTS 완료 후 자연스러운 전환을 위한 딜레이 (400ms)
                          await new Promise((resolve) => setTimeout(resolve, 400));
                          console.log('✅ Follow-up UX 버퍼 완료, 액션 실행');
                        }
                      } catch (ttsError) {
                        console.warn('⚠️ Follow-up TTS 에러 (격리됨):', ttsError);
                        // TTS 실패해도 액션은 실행
                      }
                    } else {
                      console.log('🛑 Follow-up TTS 스킵 (침묵 룰):', followup.type);
                    }
                    
                    // 🎯 2️⃣ 실제 액션 실행 (TTS 완료 후)
                    if (followup.type === 'NAVIGATE_NEAREST') {
                      // 가장 가까운 곳으로 안내
                      const lastDestination = recentMemory[0]?.result?.destination;
                      if (lastDestination) {
                        // 🔒 실사용 안정성: TTS 완료 확인 후 지도 열기
                        await finalizeTtsIfAny();
                        openGoogleMapsNavigate(lastDestination, lastDestination);
                        lockSpeechUntilNextCommand(); // 지도 열린 뒤 TTS 잠금
                        isMapOpenRef.current = true;
                        setAssistantState('NAVIGATING');
                        setCurrentFollowups([]);
                        setCurrentSummary('');
                        setTimeout(() => {
                          setAssistantState('IDLE');
                        }, 3000);
                      }
                    } else if (followup.type === 'APPLY_FILTER') {
                      // 필터 적용하여 재검색
                      setAssistantState('THINKING');
                      setCurrentFollowups([]);
                      
                      try {
                        const lastQuery = lastQueryRef.current || recentMemory[0]?.intent?.query || liveText;
                        const stepResponse = await callVoiceStep(
                          lastQuery,
                          recentMemory,
                          followup.patch // 필터 patch 전달
                        );
                        
                        // 재응답 처리
                        await handleAssistantResponse(
                          stepResponse,
                          lastQuery,
                          setAssistantState,
                          setCurrentSummary,
                          setCurrentFollowups,
                          setRecentMemory,
                          openGoogleMapsNavigate,
                          openGoogleMaps,
                          ttsEnabled,
                          ttsGate,
                          hasSpokenRef,
                          isRealWorldMode,
                          isMapOpenRef,
                          finalizeTtsIfAny,
                          lockSpeechUntilNextCommand
                        );
                      } catch (error: any) {
                        console.error('❌ Follow-up 재요청 실패:', error);
                        setAssistantState('IDLE');
                        setCurrentSummary('');
                      }
                    } else if (followup.type === 'RETRY') {
                      // 다시 찾기
                      setAssistantState('THINKING');
                      setCurrentFollowups([]);
                      
                      try {
                        const lastQuery = lastQueryRef.current || recentMemory[0]?.intent?.query || liveText;
                        const stepResponse = await callVoiceStep(lastQuery, recentMemory);
                        
                        await handleAssistantResponse(
                          stepResponse,
                          lastQuery,
                          setAssistantState,
                          setCurrentSummary,
                          setCurrentFollowups,
                          setRecentMemory,
                          openGoogleMapsNavigate,
                          openGoogleMaps,
                          ttsEnabled,
                          ttsGate,
                          hasSpokenRef,
                          isRealWorldMode,
                          isMapOpenRef,
                          finalizeTtsIfAny,
                          lockSpeechUntilNextCommand
                        );
                      } catch (error: any) {
                        console.error('❌ 재검색 실패:', error);
                        setAssistantState('IDLE');
                        setCurrentSummary('');
                      }
                    }
                  }}
                >
                  <Text style={styles.followupChipText}>{followup.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* 🔊 TTS 토글 */}
        <View style={styles.ttsToggleContainer}>
          <Text style={styles.ttsLabel}>음성 안내:</Text>
          <Pressable
            style={[styles.ttsToggle, ttsEnabled && styles.ttsToggleActive]}
            onPress={() => setTtsEnabled(!ttsEnabled)}
          >
            <Text style={styles.ttsToggleText}>{ttsEnabled ? 'ON' : 'OFF'}</Text>
          </Pressable>
        </View>

        {/* 실시간 STT 제어 버튼 */}
        {!isStreaming ? (
          <Pressable
            style={[styles.button, styles.liveButton, isAlwaysOn && styles.buttonDisabled]}
            onPress={() => {
              console.log('🔘 실시간 STT 시작 버튼 클릭됨');
              console.log('📊 현재 상태:', {
                isStreaming,
                isAlwaysOn,
                assistantState,
                hasPermission: '확인 중...'
              });
              
              if (isAlwaysOn) {
                console.warn('⚠️ Always-On 모드가 활성화되어 있어 버튼이 비활성화됨');
                Alert.alert(
                  'Always-On 모드 활성화 중',
                  'Always-On 모드를 먼저 끄고 다시 시도해주세요.'
                );
                return;
              }
              
              // 🔥 STT 세션 시작 (State Machine) - 중복 시작 방지 (실제 스트리밍 중인지만 체크)
              if (isStreaming || streamingRef.current) {
                console.warn('⚠️ STT 세션이 이미 진행 중입니다. 상태:', {
                  sttState,
                  isStreaming,
                  streamingRef: streamingRef.current,
                  assistantState
                });
                return;
              }
              
              // 🔒 실사용 안정성: 새 명령 시작 시 세션 완전 리셋
              resetSttSession();
              isMapOpenRef.current = false; // 새 명령 시작 시 지도 상태 리셋
              
              // 🔥 FIX 1: STT 시작 시 상태 완전 초기화 (버튼 클릭 시점에!)
              setLiveText(''); // transcript 초기화
              setExecuted(false); // hasExecuted 초기화
              hasExecutedRef.current = false; // STT 세션 실행 여부 초기화
              setCurrentSummary(''); // summary 초기화
              setCurrentFollowups([]); // followups 초기화
              
              // ⚠️ 중요: 상태는 startLiveSTT() 내부에서 설정하도록 함 (중복 체크 방지)
              console.log('✅ 버튼 클릭 시 상태 초기화 완료');
              console.log('🚀 startLiveSTT() 호출 시작...');
              startLiveSTT().catch((error) => {
                console.error('❌ startLiveSTT() 호출 실패:', error);
                // 에러 시 IDLE로 복귀
                setSttState('IDLE');
                setAssistantState('IDLE');
                Alert.alert('오류', `STT 시작 실패: ${error?.message || '알 수 없는 오류'}`);
              });
            }}
            disabled={isAlwaysOn}
          >
            <Text style={styles.buttonText}>
              {isAlwaysOn ? '⏸ Always-On 모드 활성화 중' : '🎙 실시간 STT 시작'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.button, styles.stop]}
            onPress={() => {
              stopLiveSTT();
              setAssistantState('IDLE');
            }}
          >
            <Text style={styles.buttonText}>🛑 중지</Text>
          </Pressable>
        )}

        {isStreaming && (
          <Text style={styles.streamingIndicator}>● 녹음 중...</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 30,
    marginBottom: 15,
    color: '#333',
  },
  button: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  liveButton: {
    backgroundColor: '#4CAF50',
  },
  stop: {
    backgroundColor: 'red',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  uri: {
    marginTop: 20,
    fontSize: 12,
    color: '#555',
  },
  liveSection: {
    width: '100%',
    marginTop: 20,
  },
  liveTextContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    minHeight: 150,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  liveText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  streamingIndicator: {
    textAlign: 'center',
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  wakeStateContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  wakeStateText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  wakeInstruction: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginTop: 10,
    fontStyle: 'italic',
  },
  alwaysOnActive: {
    backgroundColor: '#FF5722',
  },
  alwaysOnInactive: {
    backgroundColor: '#9E9E9E',
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  stateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
  },
  stateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  stateText: {
    fontSize: 14,
    color: '#2979FF',
    fontWeight: '500',
  },
  summaryContainer: {
    marginTop: 15,
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  followupsContainer: {
    marginTop: 15,
    marginBottom: 15,
  },
  followupsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  followupsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  followupChip: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  followupChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  ttsToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  ttsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginRight: 10,
  },
  ttsToggle: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ttsToggleActive: {
    backgroundColor: '#4CAF50',
  },
  ttsToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

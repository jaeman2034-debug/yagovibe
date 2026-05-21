/**
 * 🌐 웹용 음성 명령 API (LLM 기반 완성형 서버 두뇌)
 * 
 * 설계 원칙:
 * - 웹은 입력/지도만 담당
 * - 서버는 판단/확장만 담당
 * - LLM 기반 intent 분류 (표현 다양성 확보)
 * - 규칙식은 하드 필터로만 사용
 * - 이후 기능 추가는 서버만 수정
 * 
 * 요청:
 * POST /api/voice
 * {
 *   text: "근처 지금 영업하는 축구장 보여줘",
 *   lat?: number,
 *   lng?: number
 * }
 * 
 * 응답:
 * {
 *   intent: "OPEN_MAP" | "FILTER_OPEN_NOW" | "FILTER_DISTANCE" | "SORT_PRICE_ASC" | "SORT_DISTANCE_ASC" | "RECONFIRM" | "UNKNOWN",
 *   slots: {
 *     query?: string,
 *     radius?: number,
 *     openNow?: boolean,
 *     sort?: "PRICE_ASC" | "DISTANCE_ASC"
 *   },
 *   message: string
 * }
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { withTimeout, DEFAULT_TIMEOUT_MS } from '../utils/timeout';
import { logError } from '../utils/logger';
import { validateApiKeys } from '../config/security';
import { retryWithBackoff } from '../utils/retry';

// 🔥 확장 가능한 Intent 타입 (기능 추가 시 여기만 수정)
export type WebIntent = 
  | 'OPEN_MAP'           // 지도 검색 화면 열기
  | 'FILTER_OPEN_NOW'    // 지금 영업 중 필터
  | 'FILTER_DISTANCE'    // 거리 필터
  | 'SORT_PRICE_ASC'     // 가격 낮은 순 정렬
  | 'SORT_DISTANCE_ASC'  // 거리 가까운 순 정렬
  | 'RECONFIRM'          // 재확인 요청
  | 'UNKNOWN';           // 알 수 없음

// 슬롯 타입 (확장 가능)
export interface VoiceSlots {
  query?: string;        // 검색어
  radius?: number;       // 반경 (미터)
  openNow?: boolean;     // 지금 영업 중
  sort?: 'PRICE_ASC' | 'DISTANCE_ASC';  // 정렬 방식
  // 🔥 확장 포인트: 여기에 필터 추가 가능
  // priceRange?: { min: number; max: number };
  // category?: string;
}

// 웹용 응답 타입
export interface WebVoiceResponse {
  intent: WebIntent;
  slots: VoiceSlots;
  message: string;
  error?: string;
}

// LLM 응답 타입
interface LLMIntentResponse {
  intent: WebIntent;
  slots: VoiceSlots;
}

// OpenAI 클라이언트 (지연 초기화)
let openaiClient: any = null;
async function getOpenAIClient(): Promise<any> {
  if (!openaiClient) {
    const OpenAI = (await import("openai")).default;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    openaiClient = new OpenAI({
      apiKey,
    });
  }
  return openaiClient;
}

/**
 * 🔥 LLM Intent 분류 시스템 프롬프트
 */
/**
 * 🔥 개인화: 사용자 선호 카테고리 추출 및 업데이트
 */
function updateUserPreferences(
  userId: string | undefined,
  query: string | undefined,
  preferences: Record<string, number> | undefined
): Record<string, number> {
  if (!userId || !query) return preferences || {};
  
  const updated = { ...(preferences || {}) };
  updated[query] = (updated[query] || 0) + 1;
  
  // 상위 5개만 유지 (메모리 절약)
  const sorted = Object.entries(updated)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  return Object.fromEntries(sorted);
}

/**
 * 🔥 개인화: 선호 카테고리 기반 추정
 */
function inferQueryFromPreferences(
  text: string,
  preferences: Record<string, number> | undefined
): string | null {
  if (!preferences || Object.keys(preferences).length === 0) return null;
  
  // 모호한 발화 감지
  const ambiguousPatterns = [
    /(뭐|무엇|어디|어떤|찾아|보여|있지|있어)/,
  ];
  
  const isAmbiguous = ambiguousPatterns.some(p => p.test(text));
  if (!isAmbiguous) return null;
  
  // 가장 선호도 높은 카테고리 반환
  const topCategory = Object.entries(preferences)
    .sort((a, b) => b[1] - a[1])[0];
  
  return topCategory ? topCategory[0] : null;
}

const LLM_INTENT_SYSTEM_PROMPT = `너는 지도 서비스의 음성 명령 해석기다.

사용자 발화를 보고 아래 JSON 형식만 출력해라.

intent:
- OPEN_MAP: 장소 검색/찾기 요청
- FILTER_OPEN_NOW: 지금 영업 중 필터 요청
- FILTER_DISTANCE: 거리 필터 요청
- SORT_PRICE_ASC: 가격 낮은 순 정렬 요청
- SORT_DISTANCE_ASC: 거리 가까운 순 정렬 요청
- ZOOM_IN: 지도 확대 요청 ("확대해", "더 크게", "가까이")
- ZOOM_OUT: 지도 축소 요청 ("축소해", "멀리", "줄여")
- SEARCH_AROUND: 현재 지도 중심 기준 재검색 ("이 근처로", "여기 주변", "이쪽에서")
- RECONFIRM: 명확하지 않아 재확인 필요
- UNKNOWN: 이해할 수 없음

slots:
- query (string | null): 장소 키워드 (예: "축구장", "카페", "중고폰")
- radius (number | null): 반경 미터 (예: 500, 1000, 2000, 5000)
- openNow (boolean): 지금 영업 중 여부
- sort ("PRICE_ASC" | "DISTANCE_ASC" | null): 정렬 방식

예시:
입력: "근처 지금 영업하는 축구장 보여줘"
출력: {"intent": "OPEN_MAP", "slots": {"query": "축구장", "radius": 1000, "openNow": true, "sort": null}}

입력: "가격 싼 중고폰 찾아줘"
출력: {"intent": "OPEN_MAP", "slots": {"query": "중고폰", "radius": null, "openNow": false, "sort": "PRICE_ASC"}}

입력: "가까운 카페부터"
출력: {"intent": "OPEN_MAP", "slots": {"query": "카페", "radius": null, "openNow": false, "sort": "DISTANCE_ASC"}}

입력: "확대해"
출력: {"intent": "ZOOM_IN", "slots": {}}

입력: "축소해"
출력: {"intent": "ZOOM_OUT", "slots": {}}

입력: "이 근처로 다시 찾아줘"
출력: {"intent": "SEARCH_AROUND", "slots": {}}

설명 없이 JSON만 출력해라.

규칙:
- 불필요한 문장은 RECONFIRM으로 처리하라.
- 장소명은 가능한 일반명사로 정규화하라.
- 사용자의 최근 선호 카테고리가 제공되면, 발화가 모호할 경우 해당 카테고리를 우선 고려하라.
- 명확한 발화가 있으면 항상 명확한 발화를 우선하라.`;

/**
 * 🔥 오인식 필터 (뉴스/방송체 감지) - 하드 필터
 */
function isLikelyBroadcast(text: string): boolean {
  const broadcastPattern = /(뉴스|앵커|입니다$|MBC|KBS|SBS|JTBC|채널)/i;
  return broadcastPattern.test(text);
}

/**
 * 🔥 안전장치 (악성/잡음 차단) - 운영 강화
 */
function isValidInput(text: string): boolean {
  // 1. 길이 제한 (80자 초과 차단)
  if (text.length > 80) {
    logger.warn('⚠️ 입력 길이 초과:', text.length);
    return false;
  }

  // 2. 한글 포함 여부 (비언어/잡음 차단)
  if (!/[가-힣]/.test(text)) {
    logger.warn('⚠️ 한글 미포함:', text);
    return false;
  }

  // 3. 최소 길이 (너무 짧으면 잡음 가능)
  if (text.trim().length < 2) {
    logger.warn('⚠️ 입력 너무 짧음:', text);
    return false;
  }

  // 4. 특수문자 과다 차단 (잡음/악성 입력)
  const specialCharCount = (text.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;
  if (specialCharCount > text.length * 0.3) {
    logger.warn('⚠️ 특수문자 과다:', specialCharCount);
    return false;
  }

  return true;
}

/**
 * 🔥 규칙식 폴백 (LLM 실패 시 사용)
 */
function parseIntentRuleBased(text: string): LLMIntentResponse {
  const slots: VoiceSlots = {};

  // 1. 지금 영업 중 감지
  slots.openNow = /(지금|영업|열려|오픈)/.test(text);

  // 2. 거리/반경 감지
  if (/(1km|1킬로|1키로)/.test(text)) {
    slots.radius = 1000;
  } else if (/(500m|오백|5백)/.test(text)) {
    slots.radius = 500;
  } else if (/(2km|2킬로|2키로)/.test(text)) {
    slots.radius = 2000;
  } else if (/(5km|5킬로|5키로)/.test(text)) {
    slots.radius = 5000;
  } else if (/(근처|가까운|주변)/.test(text)) {
    slots.radius = 1000;
  } else if (/(바로|옆|앞)/.test(text)) {
    slots.radius = 500;
  }

  // 3. 정렬 방식 감지
  if (/(싼|저렴|쌈|가격)/.test(text)) {
    slots.sort = 'PRICE_ASC';
  } else if (/(가까운|거리)/.test(text) && !slots.radius) {
    slots.sort = 'DISTANCE_ASC';
  }

  // 4. 줌 제어 감지 (장소 키워드보다 우선)
  if (/(확대|크게|가까이|더 가까이)/.test(text)) {
    return { intent: 'ZOOM_IN', slots: {} };
  } else if (/(축소|멀리|줄여|더 멀리)/.test(text)) {
    return { intent: 'ZOOM_OUT', slots: {} };
  }

  // 4-1. 현재 위치 기준 재검색 감지
  if (/(이\s?근처|여기\s?주변|이쪽|이\s?근처로|여기서)/.test(text)) {
    return { intent: 'SEARCH_AROUND', slots: {} };
  }

  // 5. 장소 키워드 추출 (확장된 키워드)
  const placeKeywords = [
    '축구장', '운동장', '체육관', '농구장', '야구장', '테니스장', '수영장',
    '카페', '커피', '스타벅스', '이디야', '맛집', '식당', '치킨', '피자',
    '중고폰', '휴대폰', '스마트폰',
    '마트', '편의점', '슈퍼', '마켓',
    '약국', '병원', '의원',
    '학교', '대학교', '학원', '도서관',
    '공원', '한강공원', '영화관', 'PC방',
    '역', '지하철', '정류장', '버스정류장',
    '은행', 'ATM',
    '주유소', '충전소',
  ];

  for (const keyword of placeKeywords) {
    if (text.includes(keyword)) {
      slots.query = keyword;
      break;
    }
  }

  // 6. Intent 판단
  let intent: WebIntent = 'UNKNOWN';
  if (slots.query) {
    intent = 'OPEN_MAP';
  } else if (slots.openNow) {
    intent = 'FILTER_OPEN_NOW';
  } else if (slots.radius) {
    intent = 'FILTER_DISTANCE';
  } else if (slots.sort) {
    intent = slots.sort === 'PRICE_ASC' ? 'SORT_PRICE_ASC' : 'SORT_DISTANCE_ASC';
  }

  return { intent, slots };
}

/**
 * 🔥 성능 캡 (연타 방지)
 */
function checkRateLimit(): boolean {
  const now = Date.now();
  if (now - lastCallAt < MIN_CALL_INTERVAL_MS) {
    logger.warn('⚠️ 호출 간격 너무 짧음:', now - lastCallAt, 'ms');
    return false;
  }
  lastCallAt = now;
  return true;
}

// 🔥 비용 제어: 캐시 (문장 단위) - 운영 최적화
const intentCache = new Map<string, { result: LLMIntentResponse; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10분 캐시 (5분 → 10분으로 비용 최적화)
const MAX_CACHE_SIZE = 200; // 최대 캐시 크기 (100 → 200으로 확장)

// 🔥 성능 캡: 연타 방지 (폭주 방지)
let lastCallAt = 0;
const MIN_CALL_INTERVAL_MS = 800; // 최소 호출 간격 800ms

/**
 * 캐시 정리 (오래된 항목 제거)
 */
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of intentCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      intentCache.delete(key);
    }
  }
  
  // 캐시 크기 제한
  if (intentCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(intentCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, intentCache.size - MAX_CACHE_SIZE);
    for (const [key] of toDelete) {
      intentCache.delete(key);
    }
  }
}

/**
 * 🔥 LLM 기반 Intent 분류 및 슬롯 추출
 */
async function parseIntentLLM(text: string, customPrompt?: string): Promise<LLMIntentResponse> {
  const openai = await getOpenAIClient();

  try {
    const completion = await withTimeout(
      retryWithBackoff(
        async () => {
          return await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: customPrompt || LLM_INTENT_SYSTEM_PROMPT,
              },
              {
                role: "user",
                content: text,
              },
            ],
            temperature: 0, // 결정론적 응답
            response_format: { type: "json_object" }, // JSON only
          });
        },
        {
          maxRetries: 3,
          baseDelayMs: 1000,
          maxDelayMs: 10000,
          shouldRetry: (error: any) => {
            const status = error?.status || error?.response?.status;
            return status === 429 || status === 503;
          },
        }
      ),
      DEFAULT_TIMEOUT_MS,
      "LLM intent parsing timeout"
    );

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from LLM");
    }

    const result = JSON.parse(responseContent) as LLMIntentResponse;

    // 기본 검증
    if (!result.intent || !result.slots) {
      throw new Error("Invalid LLM response structure");
    }

    return result;
  } catch (error: any) {
    logError(error, { context: 'LLM intent parsing', text });
    throw error;
  }
}

/**
 * 🔥 안전한 Intent 파싱 (타임아웃 + 규칙식 폴백) - 운영 강화
 */
async function parseIntentSafe(text: string, customPrompt?: string): Promise<LLMIntentResponse> {
  // 1. 캐시 확인
  cleanCache();
  const cached = intentCache.get(text);
  if (cached) {
    logger.info('💾 캐시 히트:', text);
    return cached.result;
  }

  // 2. LLM 호출 (타임아웃 1.5초)
  try {
    const result = await Promise.race([
      parseIntentLLM(text, customPrompt),
      new Promise<LLMIntentResponse>((_, reject) => 
        setTimeout(() => reject(new Error('LLM timeout')), 1500)
      ),
    ]);

    // 3. 캐시 저장
    intentCache.set(text, {
      result,
      timestamp: Date.now(),
    });

    return result;
  } catch (error: any) {
    logError(error, { context: 'parseIntentSafe', text });
    
    // 🔥 장애 대응: 규칙식 폴백
    logger.warn('⚠️ LLM 실패, 규칙식 폴백 사용');
    const fallback = parseIntentRuleBased(text);
    return fallback;
  }
}

/**
 * 🔥 메시지 생성
 */
function generateMessage(intent: WebIntent, slots: VoiceSlots): string {
  if (intent === 'OPEN_MAP') {
    let msg = `${slots.query || '장소'}을(를) 보여드릴게요.`;
    
    if (slots.openNow && slots.query) {
      msg = `지금 영업 중인 ${slots.query}을(를) 보여드릴게요.`;
    } else if (slots.radius && slots.query) {
      const radiusKm = slots.radius >= 1000 ? `${slots.radius / 1000}km` : `${slots.radius}m`;
      msg = `근처 ${radiusKm} 내 ${slots.query}을(를) 보여드릴게요.`;
    } else if (slots.sort === 'PRICE_ASC' && slots.query) {
      msg = `가격이 저렴한 ${slots.query}부터 보여드릴게요.`;
    } else if (slots.sort === 'DISTANCE_ASC' && slots.query) {
      msg = `가까운 ${slots.query}부터 보여드릴게요.`;
    } else if (slots.query) {
      // 🔥 지역/동 단위 판단 (자동 줌 힌트)
      const isRegion = /(구|동|시|군|읍|면)/.test(slots.query);
      if (isRegion) {
        msg = `${slots.query} 지역을 보여드릴게요.`;
      } else {
        msg = `${slots.query}을(를) 지도에서 보여드릴게요.`;
      }
    }
    
    return msg;
  } else if (intent === 'FILTER_OPEN_NOW') {
    return '지금 영업 중인 곳만 보여드릴게요.';
  } else if (intent === 'FILTER_DISTANCE') {
    const radiusKm = slots.radius ? (slots.radius >= 1000 ? `${slots.radius / 1000}km` : `${slots.radius}m`) : '1km';
    return `근처 ${radiusKm} 내 장소를 보여드릴게요.`;
  } else if (intent === 'SORT_PRICE_ASC') {
    return '가격이 저렴한 순으로 보여드릴게요.';
  } else if (intent === 'SORT_DISTANCE_ASC') {
    return '가까운 순으로 보여드릴게요.';
  } else if (intent === 'ZOOM_IN') {
    return '확대했어요.';
  } else if (intent === 'ZOOM_OUT') {
    return '축소했어요.';
  } else if (intent === 'SEARCH_AROUND') {
    return '현재 위치 기준으로 다시 찾아볼게요.';
  } else if (intent === 'RECONFIRM') {
    return '잘 못 들었어요. 다시 한 번 말씀해 주세요.';
  }

  return '명령을 이해하지 못했습니다.';
}

export const apiVoice = onRequest(
  {
    region: 'asia-northeast3',
    cors: true,
    maxInstances: 10,
    secrets: ['OPENAI_API_KEY', 'GMAPS_API_KEY'],
  } as any,
  async (req, res) => {
    const t0 = Date.now();

    // CORS 헤더 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // OPTIONS 요청 처리
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // API 키 검증
    try {
      validateApiKeys();
    } catch (error: any) {
      logError(error, { context: 'API key validation' });
      // 키 검증 실패해도 실행 (Places 없이)
    }

    try {
      const text = String(req.body?.text ?? '').trim();
      const lat = req.body?.lat ? Number(req.body.lat) : undefined;
      const lng = req.body?.lng ? Number(req.body.lng) : undefined;

      // 🔒 H-안전 ③: 하드 가드 (입력 가드 + 레이트 캡)
      // 1. 입력 가드 (빈 입력/길이/한글 체크)
      if (!text || text.length > 80 || !/[가-힣]/.test(text)) {
        res.json({
          intent: 'RECONFIRM',
          slots: {},
          message: '짧게 다시 말씀해 주세요.',
        } as WebVoiceResponse);
        return;
      }

      // 2. 레이트 캡 (연타 방지 - 800ms 간격)
      const now = Date.now();
      if (now - lastCallAt < 800) {
        res.status(429).json({
          intent: 'UNKNOWN',
          slots: {},
          message: '요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요.',
        } as WebVoiceResponse);
        return;
      }
      lastCallAt = now;

      logger.info('🌐 웹 음성 명령 요청:', { text, lat, lng });

      // 3. 안전장치 (악성/잡음 차단 - 추가 검증)
      if (!isValidInput(text)) {
        res.json({
          intent: 'RECONFIRM',
          slots: {},
          message: '짧게 다시 말씀해 주세요.',
        } as WebVoiceResponse);
        return;
      }

      // 4. 하드 필터 (오인식 필터 - 뉴스/방송체)
      if (isLikelyBroadcast(text)) {
        logger.warn('⚠️ 오인식 필터 발동:', text);
        res.json({
          intent: 'RECONFIRM',
          slots: {},
          message: '잘 못 들었어요. 다시 한 번 말씀해 주세요.',
        } as WebVoiceResponse);
        return;
      }

      // 4-1. 맥락 정보 추출 (연속 명령용)
      const lastQuery = req.body?.lastQuery as string | undefined;
      
      // 4-2. 🔥 개인화: 사용자 선호 카테고리 추출
      const userId = req.body?.userId as string | undefined;
      const userPreferences = req.body?.preferences as Record<string, number> | undefined;
      
      // 🔥 개인화: 모호한 발화에서 선호 카테고리 추정
      const inferredQuery = inferQueryFromPreferences(text, userPreferences);
      if (inferredQuery) {
        logger.info('🎯 개인화 추정:', { text, inferredQuery, preferences: userPreferences });
      }
      
      // 5. LLM 기반 Intent 분류 및 슬롯 추출 (안전한 파싱 + 장애 대응)
      let llmResult: LLMIntentResponse;
      const parseStartTime = Date.now();
      
      try {
        // 🔥 개인화: LLM 프롬프트에 선호 정보 포함
        const enhancedPrompt = userPreferences && Object.keys(userPreferences).length > 0
          ? `${LLM_INTENT_SYSTEM_PROMPT}\n\n사용자 선호 카테고리: ${Object.entries(userPreferences)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => `${cat}(${count}회)`)
              .join(', ')}`
          : LLM_INTENT_SYSTEM_PROMPT;
        
        llmResult = await parseIntentSafe(text, enhancedPrompt);
        
        // 🔥 개인화: 모호한 발화에서 추정된 쿼리 적용
        if (inferredQuery && (!llmResult.slots.query || llmResult.slots.query === '장소')) {
          llmResult.slots.query = inferredQuery;
          logger.info('✅ 개인화 쿼리 적용:', inferredQuery);
        }
        
        // 🔥 맥락 유지: OPEN_MAP 시 lastQuery 저장 (서버 응답에 포함)
        if (llmResult.intent === 'OPEN_MAP' && llmResult.slots.query) {
          // 클라이언트가 저장하도록 응답에 포함
        }
        
        // 🔥 맥락 유지: SEARCH_AROUND 시 lastQuery 필수
        if (llmResult.intent === 'SEARCH_AROUND' && !lastQuery) {
          logger.warn('⚠️ SEARCH_AROUND without lastQuery');
          return res.json({
            intent: 'RECONFIRM',
            slots: {},
            message: '먼저 장소를 찾아볼게요.',
          } as WebVoiceResponse);
        }
        
        // 🔥 맥락 유지: ZOOM_IN/ZOOM_OUT 시에도 lastQuery 유지 (클라이언트에서 처리)
      } catch (error: any) {
        // 🔥 장애 대응: 서버 지연 시 UNKNOWN 즉시 반환
        logError(error, { context: 'parseIntentSafe', text });
        const latency = Date.now() - parseStartTime;
        if (latency > 2000) {
          logger.warn('⚠️ 서버 지연 감지, UNKNOWN 즉시 반환:', latency, 'ms');
          res.json({
            intent: 'UNKNOWN',
            slots: {},
            message: '서버 응답이 지연되었습니다. 다시 시도해주세요.',
          } as WebVoiceResponse);
          return;
        }
        
        // 규칙식 폴백
        llmResult = parseIntentRuleBased(text);
      }
      
      // 📊 H-관측 ⑤: 로그 스키마 고정 (운영 중 개선 포인트 즉시 포착)
      logger.info('[VOICE]', {
        ts: Date.now(),
        text,
        intent: llmResult.intent,
        slots: llmResult.slots,
        ok: llmResult.intent === 'OPEN_MAP',
        latencyMs: Date.now() - parseStartTime,
      });

      // 🔥 개인화: 선호 카테고리 업데이트 (에러 처리 후에도 실행)
      const updatedPreferences = updateUserPreferences(
        userId,
        llmResult.slots.query,
        userPreferences
      );
      
      // 🔥 개인화: 모호한 발화에서 선호 카테고리 추정 (응답 생성용)
      const inferredQuery = inferQueryFromPreferences(text, userPreferences);
      
      // 4. 메시지 생성 (개인화 반영)
      let message = generateMessage(llmResult.intent, llmResult.slots);
      if (llmResult.intent === 'OPEN_MAP' && inferredQuery && llmResult.slots.query === inferredQuery) {
        message = `자주 찾으시는 ${inferredQuery}을(를) 보여드릴게요.`;
      }

      // 5. 응답 반환
      res.json({
        intent: llmResult.intent,
        slots: llmResult.slots,
        message,
        preferences: updatedPreferences, // 🔥 클라이언트가 저장하도록
      } as WebVoiceResponse & { preferences?: Record<string, number> });

      logger.info('🌐 웹 음성 명령 응답:', { 
        intent: llmResult.intent, 
        slots: llmResult.slots, 
        message,
        latencyMs: Date.now() - t0 
      });
    } catch (error: any) {
      logError(error, { context: 'Web voice API', body: req.body });
      res.status(500).json({
        intent: 'UNKNOWN',
        slots: {},
        message: '서버 오류가 발생했습니다.',
        error: error?.message,
      } as WebVoiceResponse);
    }
  }
);

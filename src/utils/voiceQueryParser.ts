/**
 * 자연어 음성 검색 쿼리 파서
 * STT 결과를 Firestore 검색용 토큰으로 변환
 */

// 카테고리 키워드 매핑 (체육인 감성)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  러닝: ["러닝", "러닝화", "조깅", "마라톤", "러닝화"],
  헬스: ["헬스", "벤치", "덤벨", "바벨", "웨이트", "헬스장"],
  축구: ["축구", "풋살", "축구화", "축구공", "축구장"],
  자전거: ["자전거", "MTB", "로드", "자전거", "바이크"],
  농구: ["농구", "농구화", "농구공", "농구장"],
  테니스: ["테니스", "테니스화", "테니스라켓", "테니스공"],
  배드민턴: ["배드민턴", "배드민턴화", "배드민턴라켓", "셔틀콕"],
  수영: ["수영", "수영복", "수영모", "수영장"],
  골프: ["골프", "골프채", "골프공", "골프장"],
  야구: ["야구", "야구배트", "야구공", "야구장"],
  기타: ["기타", "운동", "스포츠"],
};

// 🔥 카테고리 우선순위 (혼합 발화 대응)
const CATEGORY_PRIORITY = ["러닝", "헬스", "자전거", "축구", "농구", "테니스", "배드민턴", "수영", "골프", "야구", "기타"];

// 🔥 우선순위 키워드 (Firestore array-contains-any 최적화)
const PRIORITY_WORDS = ["직거래", "상태", "새거", "새것", "중고", "판매", "구매"];

// 🔥 거리 키워드 매핑 (체육인 룰 기반)
const DISTANCE_KEYWORDS = {
  walk: ["걸어서", "바로", "가까운", "집", "집근처"],
  near: ["근처", "주변", "동네", "가까이"],
  far: ["좀 멀어도", "상관없어", "멀어도"],
};

/**
 * 자연어에서 거리 반경(km) 추출
 * 
 * @param text - 자연어 텍스트
 * @returns 거리 반경 (km), 기본값 5km
 */
export function resolveRadiusKm(text: string): number {
  const lower = text.toLowerCase();
  
  // 걸어서/바로/가까운 → 1~2km
  if (DISTANCE_KEYWORDS.walk.some((w) => lower.includes(w))) {
    return 2;
  }
  
  // 근처/주변/동네 → 3km
  if (DISTANCE_KEYWORDS.near.some((w) => lower.includes(w))) {
    return 3;
  }
  
  // 좀 멀어도/상관없어 → 7km
  if (DISTANCE_KEYWORDS.far.some((w) => lower.includes(w))) {
    return 7;
  }
  
  // 기본값: 5km (생각보다 넓다 느낌)
  return 5;
}

// 불용어 (검색에서 제외할 단어)
const STOP_WORDS = [
  "거",
  "거요",
  "좀",
  "있는",
  "찾아",
  "해주세요",
  "해줘",
  "있어",
  "없어",
  "에서",
  "으로",
  "를",
  "을",
  "의",
  "가",
  "이",
  "는",
  "은",
  "도",
  "만",
  "까지",
  "부터",
  "와",
  "과",
  "하고",
  "그리고",
  "또",
  "또는",
  "또한",
  "근처",
  "에서",
  "직거래",
  "배송",
  "상태",
  "좋은",
  "나쁜",
  "괜찮은",
  "싼",
  "비싼",
];

/**
 * 자연어 텍스트를 검색 토큰으로 파싱
 */
export function parseVoiceQuery(text: string): {
  category: string | null;
  keywordTokens: string[];
  numbers: string[];
  radiusKm: number; // 🔥 거리 반경 추가
} {
  // 1. 복합 토큰 분해 (29인치, 270mm, 5만원 등)
  let preprocessed = text
    .replace(/(\d+)(인치|mm|cm|kg|만원|원)/g, "$1 $2") // 숫자+단위 분리
    .replace(/(\d+)\s*(만원|원)/g, "$1$2"); // 가격은 다시 합치기 (5만원 → 50000 변환 준비)

  // 2. 특수문자 제거 및 정규화
  const normalized = preprocessed
    .replace(/[^\w가-힣\s\d]/g, " ") // 특수문자 제거
    .replace(/\s+/g, " ") // 연속 공백 정리
    .trim()
    .toLowerCase();

  // 2. 카테고리 추출 (우선순위 기반)
  let category: string | null = null;
  for (const cat of CATEGORY_PRIORITY) {
    const keywords = CATEGORY_KEYWORDS[cat];
    if (keywords && keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
      category = cat;
      break; // 첫 매칭에서 중단 (우선순위 보장)
    }
  }

  // 3. 숫자 추출 및 의미 부여 (사이즈 vs 가격)
  const allNumbers = (normalized.match(/\d+/g) ?? []).filter((n) => n.length <= 6); // 최대 6자리
  const sizeTokens = allNumbers.filter((n) => {
    const num = Number(n);
    return num >= 200 && num < 400; // 200~399: 사이즈 (270, 280 등)
  });
  const priceTokens = allNumbers.filter((n) => {
    const num = Number(n);
    return num >= 1000; // 1000 이상: 가격 (5000, 50000 등)
  });
  const numbers = [...sizeTokens, ...priceTokens];

  // 4. 토큰 분리
  const tokens = normalized
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  // 5. 불용어 필터링 및 키워드 토큰 생성 (우선순위 기반)
  const keywordTokens: string[] = [];
  const normalTokens: string[] = [];

  for (const token of tokens) {
    // 불용어 제외
    if (STOP_WORDS.includes(token)) continue;

    // 숫자만 있는 토큰은 별도 처리 (keywordTokens에도 포함)
    if (/^\d+$/.test(token)) {
      normalTokens.push(token);
      continue;
    }

    // 너무 짧은 토큰 제외 (1글자)
    if (token.length < 2) continue;

    // 카테고리 키워드는 제외 (이미 category로 처리됨)
    const isCategoryKeyword = Object.values(CATEGORY_KEYWORDS).some((keywords) =>
      keywords.some((kw) => kw.toLowerCase() === token)
    );
    if (isCategoryKeyword) continue;

    // 우선순위 단어는 앞에 배치
    if (PRIORITY_WORDS.some((pw) => token.includes(pw.toLowerCase()))) {
      keywordTokens.push(token);
    } else {
      normalTokens.push(token);
    }
  }

  // 6. 우선순위 단어 먼저, 그 다음 일반 토큰, 중복 제거, 최대 8개
  const uniqueTokens = Array.from(new Set([...keywordTokens, ...normalTokens])).slice(0, 8);

  // 7. 거리 반경 추출
  const radiusKm = resolveRadiusKm(text);

  return {
    category,
    keywordTokens: uniqueTokens,
    numbers,
    radiusKm, // 🔥 거리 반경 추가
  };
}

/**
 * 파싱 결과를 기반으로 Firestore 쿼리 조건 배열 생성
 * (query() 함수에 직접 전달할 수 있는 형태)
 */
export function buildQueryConditions(
  parsed: ReturnType<typeof parseVoiceQuery>
): Array<ReturnType<typeof where>> {
  const conditions: Array<ReturnType<typeof where>> = [];

  // 카테고리 필터
  if (parsed.category) {
    conditions.push(where("category", "==", parsed.category));
  }

  // 키워드 토큰 필터 (array-contains-any 사용, 최대 10개)
  // Firestore 제한: array-contains-any는 최대 10개 항목
  if (parsed.keywordTokens.length > 0) {
    const tokens = parsed.keywordTokens.slice(0, 10);
    conditions.push(where("keywordTokens", "array-contains-any", tokens));
  }

  // 숫자 토큰은 keywordTokens에 이미 포함되어 있으므로 별도 처리 불필요
  // (parseVoiceQuery에서 numbers도 keywordTokens에 추가됨)

  return conditions;
}


// src/speech/ruleParser.ts
// 🔥 Phase 6: Rule-based Intent Parser (기존 intentParser.ts를 분리)
// ✅ NLP 전환 시에도 규칙 기반 파서는 항상 유지 (fallback)

import type { Intent } from "./intents";
import { isBlacklisted } from "./learning/blacklist";

/**
 * 규칙 기반 Intent 파서 (기존 intentParser.ts 로직)
 * NLP 실패 시 항상 fallback으로 사용됨
 */
export function parseWithRules(text: string): Intent {
  const t = text.trim().toLowerCase();

  // 🔥 Phase 6-3: 블랙리스트 체크 (지원 안 할 명령 차단)
  if (isBlacklisted(t)) {
    return { type: "UNKNOWN", payload: {}, confidence: 0.0 };
  }

  // 🔍 검색 명령 (자연스러운 표현 확장)
  if (/^(검색|search|찾아|보여|보여줘|찾아줘|보기|열어|열어줘)/.test(t)) {
    const query = t.replace(/^(검색|search|찾아|보여|보여줘|찾아줘|보기|열어|열어줘)\s*(줘|해|해줘|해봐)?\s*/, "").trim();
    // 검색어가 없으면 스포츠 카테고리로 해석 시도
    if (!query) {
      // 스포츠 카테고리 키워드 추출
      const sportMatch = t.match(/(야구|축구|농구|배구|골프|테니스|러닝|수영|헬스|피트니스|배드민턴|탁구|요가|필라테스|클라이밍|baseball|football|basketball|volleyball|golf|tennis|running|swimming|fitness|badminton|table.tennis|yoga|pilates|climbing)/);
      if (sportMatch) {
        return parseSportCategory(sportMatch[0]);
      }
    }
    return { type: "SEARCH", payload: { query: query || "" }, confidence: 1.0 };
  }

  // 🏠 기본 네비게이션 명령 (자연스러운 표현)
  if (/(홈|메인|대시보드|시작|홈으로|메인으로)/.test(t)) {
    return { type: "NAVIGATE", payload: { to: "/sports-hub" }, confidence: 1.0 };
  }

  if (/(마켓|쇼핑|구매|상점|마켓으로|쇼핑하러)/.test(t)) {
    return { type: "NAVIGATE", payload: { to: "/app/market" }, confidence: 1.0 };
  }

  if (/(지도|맵|지도보기|지도로|맵으로)/.test(t)) {
    return { type: "NAVIGATE", payload: { to: "/market/map" }, confidence: 1.0 };
  }

  if (/(시설|체육시설|운동장|구장|시설로|체육시설로)/.test(t)) {
    return { type: "NAVIGATE", payload: { to: "/app/facility" }, confidence: 1.0 };
  }

  if (/(팀|팀목록|팀보기|팀으로|팀 목록)/.test(t)) {
    return { type: "NAVIGATE", payload: { to: "/app/team" }, confidence: 1.0 };
  }

  if (/(이벤트|일정|경기일정|경기|일정으로|이벤트로)/.test(t)) {
    return { type: "NAVIGATE", payload: { to: "/app/event" }, confidence: 1.0 };
  }

  if (/(관리자|어드민|관리|관리자로)/.test(t)) {
    return { type: "NAVIGATE", payload: { to: "/app/admin" }, confidence: 1.0 };
  }

  // ⚾ 스포츠 카테고리별 네비게이션 (실사용자 표현 중심)
  const sportIntent = parseSportCategory(t);
  if (sportIntent) {
    return sportIntent;
  }

  // 📜 스크롤 명령 (자연스러운 표현)
  if (/(위로|올려|위|상단|맨위|맨 위)/.test(t)) {
    return { type: "SCROLL", payload: { direction: "up" }, confidence: 1.0 };
  }

  if (/(아래|내려|아래로|하단|더보기|더 보기)/.test(t)) {
    return { type: "SCROLL", payload: { direction: "down" }, confidence: 1.0 };
  }

  // 🔙 뒤로가기 명령 (자연스러운 표현)
  if (/(뒤로|이전|back|뒤로가기|이전으로|뒤로 가)/.test(t)) {
    return { type: "NAVIGATE", payload: { to: ".." }, confidence: 1.0 };
  }

  // 🛑 중지 명령
  if (/(멈춰|중지|그만|스톱|중단)/.test(t)) {
    return { type: "STOP", payload: {}, confidence: 1.0 };
  }

  // ✅ Phase 8: 추천 승인/거절 명령
  if (/(네|예|좋아|그래|응|ok|yes|좋아요|예요|맞아)/.test(t)) {
    return { type: "CONFIRM_YES", payload: {}, confidence: 1.0 };
  }

  if (/(아니|안돼|싫어|괜찮아|no|괜찮아요|아니요)/.test(t)) {
    return { type: "CONFIRM_NO", payload: {}, confidence: 1.0 };
  }

  // ❓ 알 수 없는 명령 (로깅 대상)
  return { type: "UNKNOWN", payload: {}, confidence: 0.0 };
}

// 🔥 스포츠 카테고리 파싱 헬퍼 (중복 제거)
function parseSportCategory(text: string): Intent | null {
  // 야구
  if (/(야구|baseball|야구장|구장|야구로|야구 보기)/.test(text)) {
    return { type: "NAVIGATE", payload: { to: "/sports-hub?category=baseball" }, confidence: 1.0 };
  }

  // 축구
  if (/(축구|football|soccer|축구장|풋볼|축구로|축구 보기)/.test(text)) {
    return { type: "NAVIGATE", payload: { to: "/sports-hub?category=football" }, confidence: 1.0 };
  }

  // 농구
  if (/(농구|basketball|농구장|코트|농구로|농구 보기)/.test(text)) {
    return { type: "NAVIGATE", payload: { to: "/sports-hub?category=basketball" }, confidence: 1.0 };
  }

  // 배구
  if (/(배구|volleyball|배구장|배구로|배구 보기)/.test(text)) {
    return { type: "NAVIGATE", payload: { to: "/sports-hub?category=volleyball" }, confidence: 1.0 };
  }

  // 골프
  if (/(골프|golf|골프장|골프로|골프 보기)/.test(text)) {
    return { type: "NAVIGATE", payload: { to: "/sports-hub?category=golf" }, confidence: 1.0 };
  }

  // 테니스
  if (/(테니스|tennis|테니스장|테니스로|테니스 보기)/.test(text)) {
    return { type: "NAVIGATE", payload: { to: "/sports-hub?category=tennis" }, confidence: 1.0 };
  }

  // 러닝
  if (/(러닝|running|달리기|조깅|러닝으로|러닝 보기)/.test(text)) {
    return { type: "NAVIGATE", payload: { to: "/sports-hub?category=running" }, confidence: 1.0 };
  }

  // 수영
  if (/(수영|swimming|수영장|풀장|수영으로|수영 보기)/.test(text)) {
    return { type: "NAVIGATE", payload: { to: "/sports-hub?category=swimming" }, confidence: 1.0 };
  }

  // 헬스/피트니스
  if (/(헬스|피트니스|fitness|운동|체육관|헬스로|피트니스로)/.test(text)) {
    return { type: "NAVIGATE", payload: { to: "/sports-hub?category=fitness" }, confidence: 1.0 };
  }

  // 배드민턴
  if (/(배드민턴|badminton|배드민턴장|배드민턴으로)/.test(text)) {
    return { type: "NAVIGATE", payload: { to: "/sports-hub?category=badminton" }, confidence: 1.0 };
  }

  // 탁구
  if (/(탁구|table.tennis|탁구장|탁구로)/.test(text)) {
    return { type: "NAVIGATE", payload: { to: "/sports-hub?category=table-tennis" }, confidence: 1.0 };
  }

  // 요가/필라테스
  if (/(요가|필라테스|yoga|pilates|요가로|필라테스로)/.test(text)) {
    return { type: "NAVIGATE", payload: { to: "/sports-hub?category=yoga" }, confidence: 1.0 };
  }

  // 클라이밍
  if (/(클라이밍|climbing|암벽등반|클라이밍으로)/.test(text)) {
    return { type: "NAVIGATE", payload: { to: "/sports-hub?category=climbing" }, confidence: 1.0 };
  }

  return null;
}


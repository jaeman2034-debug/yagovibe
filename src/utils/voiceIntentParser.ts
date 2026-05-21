/**
 * 음성 명령 Intent 분석 엔진
 * 
 * 자연어 음성 명령을 분석하여 VoiceIntent로 변환합니다.
 * NER 엔진과 날짜 파싱 엔진을 활용하여 엔티티를 먼저 추출한 후 Intent를 결정합니다.
 * 맥락 적용 단계를 통해 이전 대화를 기억하고 모호한 표현을 해석합니다.
 */

import type { VoiceIntent } from "@/types/voiceIntent";
import { extractEntities } from "@/utils/extractEntities";
import { parseDateIntent } from "@/utils/parseDateIntent";
import { applyContext } from "@/utils/applyContext";
import type { VoiceContextState } from "@/context/VoiceCommandProvider";
import { isPureQuestion } from "@/utils/isPureQuestion";
import { inferLeagueFromVoiceCommand } from "@/utils/leagueMapper";

/**
 * 음성 명령을 Intent로 파싱
 * 
 * @param text - 음성 명령 텍스트
 * @param context - 이전 대화 맥락 (선택적)
 * @returns 파싱된 VoiceIntent
 */
export function parseVoiceCommand(
  text: string,
  context?: VoiceContextState
): VoiceIntent {
  if (!text || typeof text !== "string") {
    return { type: "SEARCH", query: text || "" };
  }

  const t = text.toLowerCase().trim();
  
  // 🔥 NER 엔진으로 엔티티 추출 (우선 처리)
  const entities = extractEntities(text);
  
  // 🔥 날짜 파싱 엔진으로 날짜 Intent 추출
  const dateIntent = parseDateIntent(text);

  // 🔥 Intent 파싱 (맥락 적용 전)
  let rawIntent: VoiceIntent | null = null;

  // 🔥 1) 선수 + 하이라이트
  if (entities.player && (t.includes("하이라이트") || t.includes("영상") || t.includes("요약") || t.includes("경기 영상"))) {
    rawIntent = {
      type: "SHOW_HIGHLIGHT",
      player: entities.player,
      sport: entities.sport || undefined,
    };
  }
  // 🔥 2) 선수 경기 요청 (날짜 있거나 없거나 모두 처리)
  else if (entities.player && (t.includes("경기") || t.includes("일정") || t.includes("스케줄"))) {
    // 음성 명령에서 자동으로 리그 추론
    const inferredLeague = inferLeagueFromVoiceCommand(null, entities.player, entities.sport);
    
    rawIntent = {
      type: "SHOW_PLAYER_GAMES",
      player: entities.player,
      date: dateIntent || undefined,
      sport: entities.sport || undefined,
    } as any;
  }
  // 🔥 3) 특정 팀 경기 요청 (자동 리그 추론)
  else if (entities.team && (t.includes("경기") || t.includes("일정") || t.includes("스케줄") || t.includes("경기 결과"))) {
    // 음성 명령에서 자동으로 리그 추론
    const inferredLeague = inferLeagueFromVoiceCommand(entities.team, null, entities.sport);
    
    rawIntent = {
      type: "SHOW_TEAM_GAMES",
      team: entities.team,
      date: dateIntent || undefined,
      sport: entities.sport || undefined,
      // 리그 정보는 league 필드에 저장 (VoiceIntent 타입 확장 필요 시)
    } as any; // 타입 확장 전까지 any 사용
  }
  // 🔥 4) 리그 순위 요청
  else if (entities.league && (t.includes("순위") || t.includes("랭킹") || t.includes("랭크"))) {
    rawIntent = {
      type: "SHOW_RANKING",
      league: entities.league,
      sport: entities.sport || undefined,
    };
  }
  // 🔥 5) 날짜 + 전체 경기 (팀/선수 없이 날짜만)
  else if (dateIntent && (t.includes("경기") || t.includes("일정") || t.includes("스케줄"))) {
    rawIntent = {
      type: "SHOW_GAMES_BY_DATE",
      date: dateIntent,
      sport: entities.sport || undefined,
    };
  }
  // 🔥 6) 오늘/내일/이번주 경기 요청 (날짜 파싱 엔진 사용)
  else if (dateIntent && (t.includes("경기") || t.includes("일정") || t.includes("스케줄"))) {
    rawIntent = {
      type: "SHOW_TODAY_GAMES",
      sport: entities.sport || undefined,
      date: dateIntent,
    };
  }
  // 🔥 7) 선수 이름만 언급된 경우 (하이라이트로 추정)
  else if (entities.player && !t.includes("경기") && !t.includes("일정")) {
    rawIntent = {
      type: "SHOW_HIGHLIGHT",
      player: entities.player,
      sport: entities.sport || undefined,
    };
  }
  // 🔥 8) 카테고리 매칭 (스포츠 종목만 언급)
  else if (entities.sport && !entities.player && !entities.team && !entities.league) {
    rawIntent = { type: "CATEGORY", sport: entities.sport };
  }

  // 🔥 9) 기본 스포츠 카테고리 매칭 (엔티티 추출 실패 시 fallback)
  if (!rawIntent) {
    if (t.includes("야구") || t.includes("mlb") || t.includes("kbo")) {
      rawIntent = { type: "CATEGORY", sport: "baseball" };
    } else if (t.includes("축구") || t.includes("k리그") || t.includes("프리미어리그") || t.includes("epl")) {
      rawIntent = { type: "CATEGORY", sport: "football" };
    } else if (t.includes("농구") || t.includes("nba") || t.includes("kbl")) {
      rawIntent = { type: "CATEGORY", sport: "basketball" };
    } else if (t.includes("배구") || t.includes("v리그")) {
      rawIntent = { type: "CATEGORY", sport: "volleyball" };
    } else if (t.includes("골프")) {
      rawIntent = { type: "CATEGORY", sport: "golf" };
    } else if (t.includes("테니스")) {
      rawIntent = { type: "CATEGORY", sport: "tennis" };
    } else if (t.includes("배드민턴")) {
      rawIntent = { type: "CATEGORY", sport: "badminton" };
    } else if (t.includes("탁구")) {
      rawIntent = { type: "CATEGORY", sport: "table-tennis" };
    } else if (t.includes("수영")) {
      rawIntent = { type: "CATEGORY", sport: "swimming" };
    } else if (t.includes("러닝") || t.includes("달리기")) {
      rawIntent = { type: "CATEGORY", sport: "running" };
    } else if (t.includes("헬스") || t.includes("피트니스")) {
      rawIntent = { type: "CATEGORY", sport: "fitness" };
    }
  }

  // 🔥 10) 네비게이션 명령어 파싱
  if (!rawIntent) {
    // 메인 화면 / 홈
    if (t.includes("메인") || t.includes("홈으로") || t.includes("처음으로") || t.includes("홈") || t.includes("메인 화면")) {
      rawIntent = { type: "NAVIGATE", target: "home" };
    }
    // 스포츠 허브
    else if (t.includes("스포츠") || t.includes("스포츠 허브") || t.includes("스포츠 페이지")) {
      rawIntent = { type: "NAVIGATE", target: "sports" };
    }
    // 내 팀 / 즐겨찾기
    else if (t.includes("내 팀") || t.includes("내팀") || t.includes("즐겨찾기") || t.includes("좋아하는 팀")) {
      rawIntent = { type: "NAVIGATE", target: "favorites" };
    }
    // 설정
    else if (t.includes("설정") || t.includes("세팅") || t.includes("설정 페이지")) {
      rawIntent = { type: "NAVIGATE", target: "settings" };
    }
    // 뒤로 가기
    else if (t.includes("뒤로") || t.includes("이전 페이지") || t.includes("뒤로 돌아가") || t.includes("뒤로가기") || t.includes("이전")) {
      rawIntent = { type: "NAVIGATE", target: "back" };
    }
    // 로그아웃
    else if (t.includes("로그아웃") || t.includes("로그아웃 해줘") || t.includes("로그아웃 해")) {
      rawIntent = { type: "LOGOUT" };
    }
    // 팀 페이지 열기
    else if (entities.team && (t.includes("페이지") || t.includes("팀 페이지") || t.includes("열어줘") || t.includes("보여줘"))) {
      rawIntent = { type: "OPEN_TEAM_PAGE", team: entities.team };
    }
    // 선수 페이지 열기
    else if (entities.player && (t.includes("페이지") || t.includes("선수 페이지") || t.includes("열어줘") || t.includes("보여줘"))) {
      rawIntent = { type: "OPEN_PLAYER_PAGE", player: entities.player };
    }
  }

  // 🔥 11) 즐겨찾기 추가
  if (!rawIntent && t.includes("즐겨찾기") && (t.includes("추가") || t.includes("넣어") || t.includes("저장"))) {
    if (entities.team) {
      rawIntent = { type: "FAVORITE_ADD", target: "team", name: entities.team };
    } else if (entities.player) {
      rawIntent = { type: "FAVORITE_ADD", target: "player", name: entities.player };
    }
  }

  // 🔥 12) 즐겨찾기 제거
  if (!rawIntent && t.includes("즐겨찾기") && (t.includes("삭제") || t.includes("빼줘") || t.includes("제거") || t.includes("해제"))) {
    if (entities.team) {
      rawIntent = { type: "FAVORITE_REMOVE", target: "team", name: entities.team };
    } else if (entities.player) {
      rawIntent = { type: "FAVORITE_REMOVE", target: "player", name: entities.player };
    }
  }

  // 🔥 13) 알림 설정
  if (!rawIntent && (t.includes("알림") || t.includes("알려줘")) && (t.includes("설정") || t.includes("켜줘") || t.includes("받고"))) {
    rawIntent = {
      type: "SET_NOTIFICATION",
      target: entities.team ? "team" : entities.player ? "player" : "game",
      name: entities.team || entities.player || undefined,
      date: dateIntent || undefined,
      sport: entities.sport || undefined,
    };
  }

  // 🔥 14) 알림 해제
  if (!rawIntent && t.includes("알림") && (t.includes("끄") || t.includes("해제") || t.includes("삭제"))) {
    rawIntent = {
      type: "REMOVE_NOTIFICATION",
      target: entities.team ? "team" : entities.player ? "player" : "game",
      name: entities.team || entities.player || undefined,
    };
  }

  // 🔥 15) 내가 좋아하는 팀 필터링
  if (!rawIntent && t.includes("내가") && (t.includes("좋아") || t.includes("관심") || t.includes("팔로우"))) {
    rawIntent = { type: "FILTER_BY_MY_TEAMS", sport: entities.sport || undefined };
  }

  // 🔥 16) AI 추론이 필요한 순수 질문인지 확인
  // 규칙 기반 Intent로 처리할 수 없는 고급 자연어 질문은 ASK_AI로 넘김
  if (!rawIntent) {
    if (isPureQuestion(text)) {
      rawIntent = { type: "ASK_AI", question: text };
    } else {
      // 화면 검색이 필요한 경우는 SEARCH로 유지
      rawIntent = { type: "SEARCH", query: text };
    }
  }

  // 🔥 13) 맥락 적용 단계 (이전 대화 기억)
  // 모든 Intent에 맥락을 적용하여 모호한 표현을 해석
  if (context) {
    rawIntent = applyContext(rawIntent, context, text);
  }

  return rawIntent;
}


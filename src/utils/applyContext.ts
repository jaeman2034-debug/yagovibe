/**
 * 맥락 적용 유틸리티
 * 
 * 이전 대화 맥락을 기반으로 모호한 Intent를 보정합니다.
 */

import type { VoiceIntent } from "@/types/voiceIntent";
import type { VoiceContextState } from "@/context/VoiceCommandProvider";
import { parseDateIntent } from "@/utils/parseDateIntent";

/**
 * 맥락을 적용하여 Intent를 보정합니다.
 * 
 * @param rawIntent - 원본 Intent
 * @param context - 이전 대화 맥락
 * @param originalText - 원본 음성 명령 텍스트
 * @returns 맥락이 적용된 최종 Intent
 */
export function applyContext(
  rawIntent: VoiceIntent,
  context: VoiceContextState,
  originalText: string
): VoiceIntent {
  const t = originalText.toLowerCase().trim();
  const { lastIntent, lastEntities } = context;

  // 🔥 1) "그 팀", "그 선수", "그거" 같은 모호한 표현 처리
  if (t.includes("그 팀") || t.includes("그팀")) {
    if (lastEntities.team) {
      // 팀 관련 Intent로 변환
      if (rawIntent.type === "SEARCH") {
        return {
          type: "SHOW_TEAM_GAMES",
          team: lastEntities.team,
          date: lastEntities.date || undefined,
          sport: lastEntities.sport || undefined,
        };
      }
      // 기존 Intent에 팀 정보 추가
      if ("team" in rawIntent) {
        (rawIntent as any).team = lastEntities.team;
      }
    }
  }

  if (t.includes("그 선수") || t.includes("그선수")) {
    if (lastEntities.player) {
      // 선수 관련 Intent로 변환
      if (rawIntent.type === "SEARCH") {
        return {
          type: "SHOW_PLAYER_GAMES",
          player: lastEntities.player,
          date: lastEntities.date || undefined,
          sport: lastEntities.sport || undefined,
        };
      }
      // 기존 Intent에 선수 정보 추가
      if ("player" in rawIntent) {
        (rawIntent as any).player = lastEntities.player;
      }
    }
  }

  if (t.includes("그거") || t.includes("그 것") || t.includes("그것")) {
    // 이전 Intent 기반으로 추론
    if (lastIntent) {
      if (lastIntent.type === "SHOW_TEAM_GAMES") {
        return {
          ...lastIntent,
          date: parseDateIntent(originalText) || lastIntent.date,
        };
      }
      if (lastIntent.type === "SHOW_PLAYER_GAMES") {
        return {
          ...lastIntent,
          date: parseDateIntent(originalText) || lastIntent.date,
        };
      }
      if (lastIntent.type === "SHOW_TODAY_GAMES" || lastIntent.type === "SHOW_GAMES_BY_DATE") {
        return {
          ...lastIntent,
          date: parseDateIntent(originalText) || lastIntent.date,
        };
      }
    }
  }

  // 🔥 2) "하이라이트도", "하이라이트 틀어줘" 같은 추가 요청 처리
  if ((t.includes("하이라이트") || t.includes("영상")) && lastEntities.player) {
    return {
      type: "SHOW_HIGHLIGHT",
      player: lastEntities.player,
      sport: lastEntities.sport || undefined,
    };
  }

  // 🔥 3) 날짜만 변경된 경우 (예: "내일은?", "모레는?")
  if (
    (t.includes("내일") || t.includes("모레") || t.includes("다음 주") || t.includes("이번 주")) &&
    lastIntent
  ) {
    const newDate = parseDateIntent(originalText);
    if (newDate && lastIntent.type !== "SEARCH") {
      // 이전 Intent의 날짜만 업데이트
      return {
        ...lastIntent,
        date: newDate,
      } as VoiceIntent;
    }
  }

  // 🔥 4) 날짜 생략 시 이전 날짜 재사용
  if (
    !("date" in rawIntent) ||
    rawIntent.date === undefined ||
    rawIntent.date === null
  ) {
    if (lastEntities.date && lastIntent && lastIntent.type !== "SEARCH") {
      // 이전 Intent와 유사한 타입이면 날짜 재사용
      if (
        (lastIntent.type === "SHOW_TODAY_GAMES" && rawIntent.type === "SHOW_TODAY_GAMES") ||
        (lastIntent.type === "SHOW_TEAM_GAMES" && rawIntent.type === "SHOW_TEAM_GAMES") ||
        (lastIntent.type === "SHOW_PLAYER_GAMES" && rawIntent.type === "SHOW_PLAYER_GAMES")
      ) {
        (rawIntent as any).date = lastEntities.date;
      }
    }
  }

  // 🔥 5) 스포츠 종목 생략 시 이전 종목 재사용
  if (
    !("sport" in rawIntent) ||
    rawIntent.sport === undefined ||
    rawIntent.sport === null
  ) {
    if (lastEntities.sport && lastIntent && lastIntent.type !== "SEARCH") {
      // 이전 Intent와 유사한 타입이면 스포츠 재사용
      if (
        (lastIntent.type === "SHOW_TODAY_GAMES" && rawIntent.type === "SHOW_TODAY_GAMES") ||
        (lastIntent.type === "SHOW_TEAM_GAMES" && rawIntent.type === "SHOW_TEAM_GAMES") ||
        (lastIntent.type === "SHOW_PLAYER_GAMES" && rawIntent.type === "SHOW_PLAYER_GAMES") ||
        (lastIntent.type === "CATEGORY" && rawIntent.type === "CATEGORY")
      ) {
        (rawIntent as any).sport = lastEntities.sport;
      }
    }
  }

  // 🔥 6) "만 보여줘", "만 필터" 같은 필터링 요청 처리
  if ((t.includes("만") || t.includes("필터")) && lastIntent) {
    // 이전 Intent의 필터 조건을 유지하면서 새로운 필터 추가
    if (lastIntent.type === "SHOW_TODAY_GAMES" || lastIntent.type === "SHOW_GAMES_BY_DATE") {
      // 스포츠 종목 필터 추가
      const sportMatch = t.match(/(야구|축구|농구|배구|골프|테니스|배드민턴|탁구|수영|러닝|헬스|피트니스|mlb|kbo|nba|kbl|epl|k리그|프리미어리그)/i);
      if (sportMatch) {
        const sportMap: { [key: string]: string } = {
          야구: "baseball",
          mlb: "baseball",
          kbo: "baseball",
          축구: "football",
          k리그: "football",
          프리미어리그: "football",
          epl: "football",
          농구: "basketball",
          nba: "basketball",
          kbl: "basketball",
          배구: "volleyball",
          골프: "golf",
          테니스: "tennis",
          배드민턴: "badminton",
          탁구: "table-tennis",
          수영: "swimming",
          러닝: "running",
          헬스: "fitness",
          피트니스: "fitness",
        };
        const sport = sportMap[sportMatch[0].toLowerCase()];
        if (sport) {
          return {
            ...lastIntent,
            sport,
          } as VoiceIntent;
        }
      }
    }
  }

  return rawIntent;
}


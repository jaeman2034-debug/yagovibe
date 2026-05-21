/**
 * 음성 응답 문장 생성 유틸리티
 * 
 * Intent와 데이터를 기반으로 자연스러운 한국어 음성 응답 문장을 생성합니다.
 */

import type { VoiceIntent } from "@/types/voiceIntent";
import type { DateIntent } from "@/utils/parseDateIntent";
import { dateIntentToDisplayString } from "@/utils/parseDateIntent";

/**
 * DateIntent를 자연스러운 한국어 문장으로 변환합니다.
 */
function formatDateForSpeech(dateIntent: DateIntent | undefined): string {
  if (!dateIntent) {
    return "";
  }

  return dateIntentToDisplayString(dateIntent);
}

/**
 * Intent와 데이터를 기반으로 음성 응답 문장을 생성합니다.
 * 
 * @param intent - 처리된 Intent
 * @param data - Intent 처리 결과 데이터 (선택적)
 * @returns 생성된 음성 응답 문장
 */
export function generateSpeechResponse(
  intent: VoiceIntent,
  data?: {
    gamesCount?: number;
    hasGames?: boolean;
    gameTime?: string;
    teamName?: string;
    playerName?: string;
    leagueName?: string;
  }
): string {
  switch (intent.type) {
    case "SHOW_TODAY_GAMES":
    case "SHOW_GAMES_BY_DATE": {
      const dateText = formatDateForSpeech(intent.date);
      const datePrefix = dateText ? `${dateText} ` : "";

      if (data?.gamesCount !== undefined) {
        if (data.gamesCount === 0) {
          return `${datePrefix}경기는 없습니다.`;
        }
        return `${datePrefix}총 ${data.gamesCount}개의 경기가 있어요.`;
      }

      return `${datePrefix}경기 일정을 불러오고 있어요.`;
    }

    case "SHOW_TEAM_GAMES": {
      const dateText = formatDateForSpeech(intent.date);
      const datePrefix = dateText ? `${dateText} ` : "";
      const teamName = data?.teamName || intent.team;

      if (data?.hasGames === false || data?.gamesCount === 0) {
        return `${datePrefix}${teamName} 경기는 없습니다.`;
      }

      if (data?.gamesCount !== undefined && data.gamesCount > 0) {
        if (data.gameTime) {
          return `${datePrefix}${teamName} 경기는 ${data.gameTime}에 시작합니다.`;
        }
        return `${datePrefix}${teamName} 경기는 총 ${data.gamesCount}개입니다.`;
      }

      return `${datePrefix}${teamName} 경기 일정을 불러오고 있어요.`;
    }

    case "SHOW_PLAYER_GAMES": {
      const dateText = formatDateForSpeech(intent.date);
      const datePrefix = dateText ? `${dateText} ` : "";
      const playerName = data?.playerName || intent.player;

      if (data?.hasGames === false || data?.gamesCount === 0) {
        return `${datePrefix}${playerName} 선수 경기는 없습니다.`;
      }

      if (data?.gamesCount !== undefined && data.gamesCount > 0) {
        if (data.gameTime) {
          return `${datePrefix}${playerName} 선수 경기는 ${data.gameTime}에 시작합니다.`;
        }
        return `${datePrefix}${playerName} 선수 경기는 총 ${data.gamesCount}개입니다.`;
      }

      return `${datePrefix}${playerName} 선수 경기 일정을 불러오고 있어요.`;
    }

    case "SHOW_HIGHLIGHT": {
      const playerName = data?.playerName || intent.player || "선수";
      return `${playerName} 선수 하이라이트를 보여드릴게요.`;
    }

    case "SHOW_RANKING": {
      const leagueName = data?.leagueName || intent.league || "리그";
      return `${leagueName} 현재 순위를 불러오고 있어요.`;
    }

    case "CATEGORY": {
      const sportNames: { [key: string]: string } = {
        baseball: "야구",
        football: "축구",
        basketball: "농구",
        volleyball: "배구",
        golf: "골프",
        tennis: "테니스",
        badminton: "배드민턴",
        "table-tennis": "탁구",
        swimming: "수영",
        running: "러닝",
        fitness: "헬스",
      };

      const sportName = sportNames[intent.sport] || intent.sport;
      return `${sportName} 카테고리로 이동할게요.`;
    }

    case "SEARCH": {
      return `"${intent.query}"에 대한 검색 결과를 보여드릴게요.`;
    }

    case "FILTER_BY_MY_TEAMS": {
      return "내가 좋아하는 팀 경기만 보여드릴게요.";
    }

    case "SET_NOTIFICATION": {
      const name = intent.name || "경기";
      const dateText = intent.date ? dateIntentToDisplayString(intent.date) + " " : "";
      return `${dateText}${name}의 경기 알림을 설정해드렸어요.`;
    }

    case "REMOVE_NOTIFICATION": {
      const name = intent.name || "알림";
      return `${name} 알림을 해제했습니다.`;
    }

    case "FAVORITE_ADD": {
      if (intent.target === "team") {
        return `${intent.name} 팀을 즐겨찾기에 추가했어요.`;
      } else {
        return `${intent.name} 선수를 즐겨찾기에 추가했어요.`;
      }
    }

    case "FAVORITE_REMOVE": {
      if (intent.target === "team") {
        return `${intent.name} 팀을 즐겨찾기에서 제거했어요.`;
      } else {
        return `${intent.name} 선수를 즐겨찾기에서 제거했어요.`;
      }
    }

    case "NAVIGATE": {
      switch (intent.target) {
        case "home":
          return "메인 화면으로 이동할게요.";
        case "sports":
          return "스포츠 허브로 이동합니다.";
        case "favorites":
          return "내 팀 페이지로 이동합니다.";
        case "settings":
          return "설정 화면을 열게요.";
        case "back":
          return "이전 화면으로 돌아갈게요.";
        default:
          return "이동 중이에요.";
      }
    }

    case "OPEN_TEAM_PAGE": {
      return `${intent.team} 팀 페이지로 이동할게요.`;
    }

    case "OPEN_PLAYER_PAGE": {
      return `${intent.player} 선수 페이지로 이동할게요.`;
    }

    case "LOGOUT": {
      return "로그아웃할게요.";
    }

    case "ASK_AI": {
      // AI 답변은 실제 API 응답을 사용하므로 여기서는 기본 메시지만 반환
      return "질문을 분석하고 있어요.";
    }

    default:
      return "처리 중이에요.";
  }
}


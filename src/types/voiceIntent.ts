/**
 * 음성 명령 Intent 타입 정의
 * 
 * 자연어 음성 명령을 분석하여 실행 가능한 액션으로 변환합니다.
 * Discriminated Union 패턴을 사용하여 타입 안전성을 보장합니다.
 */

import type { DateIntent } from "@/utils/parseDateIntent";

export type VoiceIntent =
  | { type: "CATEGORY"; sport: string }
  | { type: "SHOW_TODAY_GAMES"; sport?: string; date?: DateIntent }
  | { type: "SHOW_TEAM_GAMES"; team: string; date?: DateIntent; sport?: string }
  | { type: "SHOW_PLAYER_GAMES"; player: string; date?: DateIntent; sport?: string }
  | { type: "SHOW_GAMES_BY_DATE"; date: DateIntent; sport?: string }
  | { type: "SHOW_RANKING"; league?: string; sport?: string }
  | { type: "SHOW_HIGHLIGHT"; player?: string; sport?: string }
  | { type: "FILTER_BY_MY_TEAMS"; sport?: string }
  | { type: "SET_NOTIFICATION"; target: "team" | "player" | "game"; name?: string; date?: DateIntent; sport?: string }
  | { type: "REMOVE_NOTIFICATION"; target: "team" | "player" | "game"; name?: string }
  | { type: "FAVORITE_ADD"; target: "team" | "player"; name: string }
  | { type: "FAVORITE_REMOVE"; target: "team" | "player"; name: string }
  | { type: "NAVIGATE"; target: "home" | "sports" | "favorites" | "settings" | "back" }
  | { type: "OPEN_TEAM_PAGE"; team: string }
  | { type: "OPEN_PLAYER_PAGE"; player: string }
  | { type: "LOGOUT" }
  | { type: "ASK_AI"; question: string }
  | { type: "SEARCH"; query: string };

/**
 * 스포츠 카테고리 타입
 */
export type SportCategory = "baseball" | "football" | "basketball" | "volleyball" | "golf" | "tennis" | "badminton" | "table-tennis" | "swimming" | "running" | "fitness";

/**
 * 리그 타입
 */
export type League = "EPL" | "K-League" | "MLB" | "KBO" | "NBA" | "KBL" | "V-League";


/**
 * 엔티티 추출 엔진 (NER)
 * 
 * 음성 텍스트에서 선수, 팀, 리그 등의 엔티티를 자동 추출합니다.
 * 날짜 정보는 parseDateIntent 엔진으로 위임합니다.
 */

import { PLAYER_NAMES, TEAM_NAMES, LEAGUE_NAMES } from "@/data/sportsEntities";
import type { DateIntent } from "@/utils/parseDateIntent";
import { PLAYER_TEAM_MAP } from "@/utils/playerTeamMap";

export interface ExtractedEntities {
  /** 선수 이름 */
  player: string | null;
  /** 팀 이름 */
  team: string | null;
  /** 리그 이름 */
  league: string | null;
  /** 스포츠 종목 */
  sport: string | null;
}

/**
 * 텍스트에서 엔티티를 추출합니다.
 * 
 * @param text - 분석할 텍스트
 * @returns 추출된 엔티티들
 */
export function extractEntities(text: string): ExtractedEntities {
  if (!text || typeof text !== "string") {
    return {
      player: null,
      team: null,
      league: null,
      date: null,
      sport: null,
    };
  }

  const lower = text.toLowerCase().trim();

  // 🔥 1. 선수 이름 추출 (PLAYER_TEAM_MAP 우선, 그 다음 PLAYER_NAMES)
  // PLAYER_TEAM_MAP에서 먼저 검색 (더 정확한 매칭, 팀 정보도 함께 제공)
  const playerFromMap = Object.keys(PLAYER_TEAM_MAP).find((p) => 
    lower.includes(p.toLowerCase()) || p.toLowerCase().includes(lower)
  );
  
  // PLAYER_TEAM_MAP에서 찾지 못하면 기존 PLAYER_NAMES에서 검색
  const player = playerFromMap || (() => {
    const sortedPlayers = [...PLAYER_NAMES].sort((a, b) => b.length - a.length);
    return sortedPlayers.find((p) => lower.includes(p.toLowerCase())) || null;
  })();

  // 🔥 2. 팀 이름 추출 (긴 이름부터 매칭)
  const sortedTeams = [...TEAM_NAMES].sort((a, b) => b.length - a.length);
  const team = sortedTeams.find((t) => lower.includes(t.toLowerCase())) || null;

  // 🔥 3. 리그 이름 추출
  const league = LEAGUE_NAMES.find((l) => lower.includes(l.toLowerCase())) || null;

  // 🔥 4. 날짜 정보는 parseDateIntent 엔진으로 위임 (더 정확한 파싱)
  // extractEntities에서는 날짜를 추출하지 않음

  // 🔥 5. 스포츠 종목 추출
  let sport: string | null = null;
  if (lower.includes("야구") || lower.includes("mlb") || lower.includes("kbo")) {
    sport = "baseball";
  } else if (lower.includes("축구") || lower.includes("k리그") || lower.includes("프리미어리그") || lower.includes("epl")) {
    sport = "football";
  } else if (lower.includes("농구") || lower.includes("nba") || lower.includes("kbl")) {
    sport = "basketball";
  } else if (lower.includes("배구") || lower.includes("v리그")) {
    sport = "volleyball";
  } else if (lower.includes("골프")) {
    sport = "golf";
  } else if (lower.includes("테니스")) {
    sport = "tennis";
  } else if (lower.includes("배드민턴")) {
    sport = "badminton";
  } else if (lower.includes("탁구")) {
    sport = "table-tennis";
  } else if (lower.includes("수영")) {
    sport = "swimming";
  } else if (lower.includes("러닝") || lower.includes("달리기")) {
    sport = "running";
  } else if (lower.includes("헬스") || lower.includes("피트니스")) {
    sport = "fitness";
  }

  // 🔥 6. 선수 이름으로부터 스포츠 종목 추론 (스포츠가 명시되지 않은 경우)
  if (!sport && player) {
    const footballPlayers = ["손흥민", "이강인", "박지성", "황희찬", "김민재", "메시", "호날두", "음바페"];
    const baseballPlayers = ["이정후", "류현진", "김하성", "오타니", "이치로", "다르빗슈"];
    
    if (footballPlayers.includes(player)) {
      sport = "football";
    } else if (baseballPlayers.includes(player)) {
      sport = "baseball";
    }
  }

  // 🔥 7. 리그 이름으로부터 스포츠 종목 추론
  if (!sport && league) {
    const footballLeagues = ["프리미어리그", "EPL", "라리가", "세리에", "분데스리가", "K리그", "UCL", "챔피언스리그"];
    const baseballLeagues = ["MLB", "KBO", "NPB"];
    const basketballLeagues = ["NBA", "KBL"];
    
    if (footballLeagues.includes(league)) {
      sport = "football";
    } else if (baseballLeagues.includes(league)) {
      sport = "baseball";
    } else if (basketballLeagues.includes(league)) {
      sport = "basketball";
    }
  }

  return {
    player,
    team,
    league,
    sport,
  };
}


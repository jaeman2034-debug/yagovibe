/**
 * 리그 매핑 유틸리티
 * 
 * 음성 명령에서 팀/선수 이름을 추출하여 자동으로 리그를 매핑합니다.
 * ESPN BFF 서버와 완벽하게 호환됩니다.
 */

export type LeagueCode = 
  | "MLB" | "KBO" | "NPB"
  | "NBA" | "KBL" | "WKBL"
  | "EPL" | "KLeague" | "KLeague1" | "KLeague2" | "UCL" | "LaLiga" | "SerieA" | "Bundesliga" | "Ligue1"
  | "NFL" | "NHL" | "VLeague";

// 팀 이름 → 리그 매핑 (완전 통합 테이블)
const TEAM_TO_LEAGUE_MAP: Record<string, LeagueCode> = {
  // MLB
  "다저스": "MLB", "Dodgers": "MLB", "LA Dodgers": "MLB",
  "양키스": "MLB", "Yankees": "MLB", "NY Yankees": "MLB",
  "레드삭스": "MLB", "Red Sox": "MLB", "Boston": "MLB",
  "카디널스": "MLB", "Cardinals": "MLB",
  "애스트로스": "MLB", "Astros": "MLB",
  "메츠": "MLB", "Mets": "MLB",
  "파드리스": "MLB", "Padres": "MLB",
  "자이언츠": "MLB", "Giants": "MLB",
  "시애틀": "MLB", "Mariners": "MLB",
  
  // KBO
  "키움": "KBO", "히어로즈": "KBO",
  "LG": "KBO", "LG 트윈스": "KBO",
  "SSG": "KBO", "SSG 랜더스": "KBO",
  "KT": "KBO", "KT 위즈": "KBO",
  "NC": "KBO", "NC 다이노스": "KBO",
  "삼성": "KBO", "삼성 라이온즈": "KBO",
  "두산": "KBO", "두산 베어스": "KBO",
  "롯데": "KBO", "롯데 자이언츠": "KBO",
  "한화": "KBO", "한화 이글스": "KBO",
  "KIA": "KBO", "KIA 타이거즈": "KBO",
  
  // EPL
  "토트넘": "EPL", "Tottenham": "EPL", "토트넘 홋스퍼": "EPL",
  "맨시티": "EPL", "Man City": "EPL", "맨체스터 시티": "EPL",
  "맨유": "EPL", "Man United": "EPL", "맨체스터 유나이티드": "EPL",
  "리버풀": "EPL", "Liverpool": "EPL",
  "첼시": "EPL", "Chelsea": "EPL",
  "아스날": "EPL", "Arsenal": "EPL",
  "바르셀로나": "LaLiga", "Barcelona": "LaLiga", "바르사": "LaLiga",
  "레알 마드리드": "LaLiga", "Real Madrid": "LaLiga", "레알": "LaLiga",
  
  // NBA
  "레이커스": "NBA", "Lakers": "NBA", "LA Lakers": "NBA",
  "워리어스": "NBA", "Warriors": "NBA", "골든스테이트": "NBA",
  "불스": "NBA", "Bulls": "NBA", "시카고 불스": "NBA",
  "셀틱스": "NBA", "Celtics": "NBA", "보스턴": "NBA",
  "히트": "NBA", "Heat": "NBA", "마이애미": "NBA",
  "넥서스": "NBA", "Nuggets": "NBA", "덴버": "NBA",
  
  // K리그
  "울산": "KLeague", "울산 현대": "KLeague",
  "전북": "KLeague", "전북 현대": "KLeague",
  "포항": "KLeague", "포항 스틸러스": "KLeague",
  "서울": "KLeague", "FC 서울": "KLeague",
  "수원": "KLeague", "수원 삼성": "KLeague",
};

// 선수 이름 → 리그 매핑
const PLAYER_TO_LEAGUE_MAP: Record<string, LeagueCode> = {
  // 축구 선수 (EPL)
  "손흥민": "EPL", "Son": "EPL", "Son Heung-min": "EPL",
  "이강인": "EPL", "Lee Kang-in": "EPL",
  "황희찬": "EPL", "Hwang Hee-chan": "EPL",
  "박지성": "EPL", "Park Ji-sung": "EPL",
  "김민재": "EPL", "Kim Min-jae": "EPL",
  "조규성": "EPL", "Cho Gue-sung": "EPL",
  "메시": "LaLiga", "Messi": "LaLiga",
  "호날두": "EPL", "Ronaldo": "EPL", "Cristiano": "EPL",
  "음바페": "Ligue1", "Mbappe": "Ligue1",
  
  // 야구 선수 (MLB/KBO)
  "류현진": "MLB", "Ryu": "MLB", "Ryu Hyun-jin": "MLB",
  "김하성": "MLB", "Kim": "MLB", "Kim Ha-seong": "MLB",
  "이정후": "MLB", "Lee": "MLB", "Lee Jung-hoo": "MLB",
  "오타니": "MLB", "Ohtani": "MLB", "Shohei": "MLB",
  "추신수": "MLB", "Choo": "MLB",
  "강백호": "KBO",
  "이대호": "KBO",
  "양현종": "KBO",
  
  // 농구 선수 (NBA)
  "르브론": "NBA", "LeBron": "NBA", "James": "NBA",
  "커리": "NBA", "Curry": "NBA", "Stephen": "NBA",
  "조던": "NBA", "Jordan": "NBA",
  "코비": "NBA", "Kobe": "NBA",
};

// 스포츠 종목 → 기본 리그 매핑
const SPORT_TO_DEFAULT_LEAGUE: Record<string, LeagueCode> = {
  "야구": "KBO",
  "baseball": "MLB",
  "축구": "EPL",
  "football": "EPL",
  "soccer": "EPL",
  "농구": "NBA",
  "basketball": "NBA",
  "배구": "VLeague",
  "volleyball": "VLeague",
};

/**
 * 팀 이름으로부터 리그를 추론합니다.
 */
export function inferLeagueFromTeam(teamName: string): LeagueCode | undefined {
  if (!teamName) return undefined;
  
  const teamLower = teamName.toLowerCase();
  
  // 정확한 매칭 우선
  for (const [key, league] of Object.entries(TEAM_TO_LEAGUE_MAP)) {
    if (teamLower === key.toLowerCase() || teamLower.includes(key.toLowerCase()) || key.toLowerCase().includes(teamLower)) {
      return league;
    }
  }
  
  return undefined;
}

/**
 * 선수 이름으로부터 리그를 추론합니다.
 */
export function inferLeagueFromPlayer(playerName: string): LeagueCode | undefined {
  if (!playerName) return undefined;
  
  const playerLower = playerName.toLowerCase();
  
  // 정확한 매칭 우선
  for (const [key, league] of Object.entries(PLAYER_TO_LEAGUE_MAP)) {
    if (playerLower === key.toLowerCase() || playerLower.includes(key.toLowerCase()) || key.toLowerCase().includes(playerLower)) {
      return league;
    }
  }
  
  return undefined;
}

/**
 * 스포츠 종목으로부터 기본 리그를 반환합니다.
 */
export function inferLeagueFromSport(sport: string): LeagueCode | undefined {
  if (!sport) return undefined;
  
  const sportLower = sport.toLowerCase();
  
  return SPORT_TO_DEFAULT_LEAGUE[sportLower] || 
         Object.entries(SPORT_TO_DEFAULT_LEAGUE).find(([key]) => 
           sportLower.includes(key) || key.includes(sportLower)
         )?.[1];
}

/**
 * 음성 명령에서 리그를 자동 추론합니다.
 * 팀 > 선수 > 스포츠 순서로 우선순위를 둡니다.
 */
export function inferLeagueFromVoiceCommand(
  team?: string | null,
  player?: string | null,
  sport?: string | null
): LeagueCode | undefined {
  // 1순위: 팀 이름
  if (team) {
    const league = inferLeagueFromTeam(team);
    if (league) return league;
  }
  
  // 2순위: 선수 이름
  if (player) {
    const league = inferLeagueFromPlayer(player);
    if (league) return league;
  }
  
  // 3순위: 스포츠 종목
  if (sport) {
    const league = inferLeagueFromSport(sport);
    if (league) return league;
  }
  
  return undefined;
}

/**
 * 리그 코드를 ESPN 경로로 변환합니다.
 */
export function leagueCodeToESPNPath(leagueCode: LeagueCode): string {
  const LEAGUE_PATH_MAP: Record<LeagueCode, string> = {
    // 야구
    MLB: "baseball/mlb",
    KBO: "baseball/kbo",
    NPB: "baseball/jpn.1",
    
    // 농구
    NBA: "basketball/nba",
    KBL: "basketball/kbl",
    WKBL: "basketball/wkbl",
    
    // 축구
    EPL: "soccer/eng.1",
    KLeague: "soccer/kor.1",
    KLeague1: "soccer/kor.1",
    KLeague2: "soccer/kor.2",
    UCL: "soccer/uefa.champions",
    LaLiga: "soccer/esp.1",
    SerieA: "soccer/ita.1",
    Bundesliga: "soccer/ger.1",
    Ligue1: "soccer/fra.1",
    
    // 미식축구
    NFL: "football/nfl",
    
    // 하키
    NHL: "hockey/nhl",
    
    // 배구
    VLeague: "volleyball/kor.1",
  };
  
  return LEAGUE_PATH_MAP[leagueCode] || "baseball/mlb";
}


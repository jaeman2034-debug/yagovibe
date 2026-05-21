/**
 * 선수 → 팀 매핑 테이블
 * 
 * 선수 이름을 팀 이름과 리그로 매핑합니다.
 * "손흥민 경기 보여줘" → Tottenham Hotspur (EPL) 경기 조회
 */

export interface PlayerTeamInfo {
  teamName: string;
  league: string;
}

export const PLAYER_TEAM_MAP: Record<string, PlayerTeamInfo> = {
  // ⚽ 축구 (EPL 및 기타)
  "손흥민": { teamName: "Tottenham Hotspur", league: "EPL" },
  "Son Heung-min": { teamName: "Tottenham Hotspur", league: "EPL" },
  "Son": { teamName: "Tottenham Hotspur", league: "EPL" },
  
  "이강인": { teamName: "Paris Saint-Germain", league: "EPL" },
  "Lee Kang-in": { teamName: "Paris Saint-Germain", league: "EPL" },
  
  "황희찬": { teamName: "Wolverhampton Wanderers", league: "EPL" },
  "Hwang Hee-chan": { teamName: "Wolverhampton Wanderers", league: "EPL" },
  
  "김민재": { teamName: "Bayern Munich", league: "EPL" },
  "Kim Min-jae": { teamName: "Bayern Munich", league: "EPL" },
  
  "조규성": { teamName: "FC Midtjylland", league: "EPL" },
  "Cho Gue-sung": { teamName: "FC Midtjylland", league: "EPL" },
  
  "메시": { teamName: "Inter Miami CF", league: "MLS" },
  "Messi": { teamName: "Inter Miami CF", league: "MLS" },
  
  "호날두": { teamName: "Al Nassr", league: "SAUDI" },
  "Ronaldo": { teamName: "Al Nassr", league: "SAUDI" },
  "Cristiano Ronaldo": { teamName: "Al Nassr", league: "SAUDI" },
  
  "음바페": { teamName: "Paris Saint-Germain", league: "EPL" },
  "Mbappe": { teamName: "Paris Saint-Germain", league: "EPL" },
  
  "홀란드": { teamName: "Manchester City", league: "EPL" },
  "Haaland": { teamName: "Manchester City", league: "EPL" },
  
  // ⚾ 야구 (MLB, KBO)
  "오타니": { teamName: "Los Angeles Dodgers", league: "MLB" },
  "쇼헤이 오타니": { teamName: "Los Angeles Dodgers", league: "MLB" },
  "Ohtani": { teamName: "Los Angeles Dodgers", league: "MLB" },
  "Shohei Ohtani": { teamName: "Los Angeles Dodgers", league: "MLB" },
  
  "류현진": { teamName: "Hanwha Eagles", league: "KBO" },
  "Ryu Hyun-jin": { teamName: "Hanwha Eagles", league: "KBO" },
  "Ryu": { teamName: "Hanwha Eagles", league: "KBO" },
  
  "김하성": { teamName: "San Diego Padres", league: "MLB" },
  "Kim Ha-seong": { teamName: "San Diego Padres", league: "MLB" },
  
  "이정후": { teamName: "San Francisco Giants", league: "MLB" },
  "Lee Jung-hoo": { teamName: "San Francisco Giants", league: "MLB" },
  
  "추신수": { teamName: "Texas Rangers", league: "MLB" },
  "Choo Shin-soo": { teamName: "Texas Rangers", league: "MLB" },
  
  "강백호": { teamName: "LG Twins", league: "KBO" },
  "양현종": { teamName: "KIA Tigers", league: "KBO" },
  "이대호": { teamName: "Lotte Giants", league: "KBO" },
  
  // 🏀 농구 (NBA)
  "르브론": { teamName: "Los Angeles Lakers", league: "NBA" },
  "르브론 제임스": { teamName: "Los Angeles Lakers", league: "NBA" },
  "LeBron": { teamName: "Los Angeles Lakers", league: "NBA" },
  "LeBron James": { teamName: "Los Angeles Lakers", league: "NBA" },
  
  "커리": { teamName: "Golden State Warriors", league: "NBA" },
  "Stephen Curry": { teamName: "Golden State Warriors", league: "NBA" },
  "Curry": { teamName: "Golden State Warriors", league: "NBA" },
  
  "조던": { teamName: "Chicago Bulls", league: "NBA" },
  "Michael Jordan": { teamName: "Chicago Bulls", league: "NBA" },
  "Jordan": { teamName: "Chicago Bulls", league: "NBA" },
  
  "코비": { teamName: "Los Angeles Lakers", league: "NBA" },
  "Kobe Bryant": { teamName: "Los Angeles Lakers", league: "NBA" },
  "Kobe": { teamName: "Los Angeles Lakers", league: "NBA" },
  
  "하든": { teamName: "Los Angeles Clippers", league: "NBA" },
  "James Harden": { teamName: "Los Angeles Clippers", league: "NBA" },
  "Harden": { teamName: "Los Angeles Clippers", league: "NBA" },
};

/**
 * 선수 이름으로 팀 정보 조회
 */
export function getPlayerTeam(playerName: string): PlayerTeamInfo | null {
  if (!playerName) return null;
  
  // 정확한 매칭 우선
  const exactMatch = PLAYER_TEAM_MAP[playerName];
  if (exactMatch) return exactMatch;
  
  // 부분 매칭 (대소문자 무시)
  const playerLower = playerName.toLowerCase();
  for (const [key, value] of Object.entries(PLAYER_TEAM_MAP)) {
    if (key.toLowerCase().includes(playerLower) || playerLower.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return null;
}


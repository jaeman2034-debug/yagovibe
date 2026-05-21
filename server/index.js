// server/index.js
import express from "express";
import cors from "cors";

// Node 18 이상이면 fetch 내장, 아니면 node-fetch 설치해서 import 해도 됨.

const app = express();
app.use(cors());

// 음성 Intent에서 쓰는 리그 코드 → ESPN 경로 매핑
const LEAGUE_MAP = {
  MLB: "baseball/mlb",
  NBA: "basketball/nba",
  NFL: "football/nfl",
  EPL: "soccer/eng.1",
  KBO: "baseball/kbo", // KBO는 ESPN에 없을 수도 있음. 나중에 다른 소스로 대체 가능
  // 필요하면 여기 계속 추가
};

/**
 * 팀 이름 정규화 테이블 (한국어 음성 → 영문 팀명)
 * 
 * "다저스 경기 보여줘" → "Dodgers"로 자동 변환
 * Intent 시스템과 완벽하게 연동됩니다.
 */
const TEAM_NAME_MAP = {
  // MLB 팀
  "다저스": "Dodgers",
  "LA 다저스": "Dodgers",
  "도저스": "Dodgers",
  "양키스": "Yankees",
  "뉴욕 양키스": "Yankees",
  "레드삭스": "Red Sox",
  "보스턴 레드삭스": "Red Sox",
  "카디널스": "Cardinals",
  "세인트루이스 카디널스": "Cardinals",
  "애스트로스": "Astros",
  "휴스턴 애스트로스": "Astros",
  "메츠": "Mets",
  "뉴욕 메츠": "Mets",
  "파드리스": "Padres",
  "샌디에이고 파드리스": "Padres",
  "자이언츠": "Giants",
  "샌프란시스코 자이언츠": "Giants",
  "시애틀": "Mariners",
  "시애틀 매리너스": "Mariners",
  "엔젤스": "Angels",
  "LA 엔젤스": "Angels",
  "화이트삭스": "White Sox",
  "시카고 화이트삭스": "White Sox",
  "컵스": "Cubs",
  "시카고 컵스": "Cubs",
  
  // KBO 팀
  "키움": "Kiwoom",
  "히어로즈": "Kiwoom",
  "LG": "LG Twins",
  "LG 트윈스": "LG Twins",
  "SSG": "SSG Landers",
  "SSG 랜더스": "SSG Landers",
  "KT": "KT Wiz",
  "KT 위즈": "KT Wiz",
  "NC": "NC Dinos",
  "NC 다이노스": "NC Dinos",
  "삼성": "Samsung Lions",
  "삼성 라이온즈": "Samsung Lions",
  "두산": "Doosan Bears",
  "두산 베어스": "Doosan Bears",
  "롯데": "Lotte Giants",
  "롯데 자이언츠": "Lotte Giants",
  "한화": "Hanwha Eagles",
  "한화 이글스": "Hanwha Eagles",
  "KIA": "KIA Tigers",
  "KIA 타이거즈": "KIA Tigers",
  
  // NBA 팀
  "레이커스": "Lakers",
  "LA 레이커스": "Lakers",
  "워리어스": "Warriors",
  "골든스테이트": "Warriors",
  "골든스테이트 워리어스": "Warriors",
  "불스": "Bulls",
  "시카고 불스": "Bulls",
  "셀틱스": "Celtics",
  "보스턴 셀틱스": "Celtics",
  "히트": "Heat",
  "마이애미 히트": "Heat",
  "넥서스": "Nuggets",
  "덴버 넥서스": "Nuggets",
  "스퍼스": "Spurs",
  "샌안토니오 스퍼스": "Spurs",
  "클리퍼스": "Clippers",
  "LA 클리퍼스": "Clippers",
  
  // EPL 팀
  "토트넘": "Tottenham",
  "토트넘 홋스퍼": "Tottenham",
  "맨시티": "Man City",
  "맨체스터 시티": "Man City",
  "맨유": "Man United",
  "맨체스터 유나이티드": "Man United",
  "리버풀": "Liverpool",
  "첼시": "Chelsea",
  "아스날": "Arsenal",
  "바르셀로나": "Barcelona",
  "바르사": "Barcelona",
  "레알": "Real Madrid",
  "레알 마드리드": "Real Madrid",
  "뮌헨": "Bayern Munich",
  "바이에른 뮌헨": "Bayern Munich",
  "PSG": "Paris Saint-Germain",
  "파리 생제르맹": "Paris Saint-Germain",
  
  // K리그 팀
  "울산": "Ulsan",
  "울산 현대": "Ulsan",
  "전북": "Jeonbuk",
  "전북 현대": "Jeonbuk",
  "포항": "Pohang",
  "포항 스틸러스": "Pohang",
  "서울": "FC Seoul",
  "FC 서울": "FC Seoul",
  "수원": "Suwon",
  "수원 삼성": "Suwon",
  
  // 선수 이름 → 팀 매핑 (선수 검색 시 사용)
  "손흥민": "Tottenham",
  "이강인": "PSG",
  "황희찬": "Wolves",
  "류현진": "Blue Jays",
  "오타니": "Angels",
  "Ohtani": "Angels",
};

/**
 * 한국어 팀명을 영문 팀명으로 변환
 */
function normalizeTeamName(koreanName) {
  if (!koreanName) return null;
  
  // 정확한 매칭 우선
  const exactMatch = TEAM_NAME_MAP[koreanName];
  if (exactMatch) return exactMatch;
  
  // 부분 매칭 (대소문자 무시)
  const koreanLower = koreanName.toLowerCase();
  for (const [korean, english] of Object.entries(TEAM_NAME_MAP)) {
    if (korean.toLowerCase().includes(koreanLower) || koreanLower.includes(korean.toLowerCase())) {
      return english;
    }
  }
  
  // 매칭 실패 시 원본 반환 (영문일 수도 있음)
  return koreanName;
}

function toESPNDate(yyyy_mm_dd) {
  // "2025-04-12" -> "20250412"
  return yyyy_mm_dd.replace(/-/g, "");
}

// 공통 fetch 래퍼
async function espnGetJson(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; voice-sports-bff/1.0)",
    },
  });
  if (!res.ok) {
    throw new Error(`ESPN error ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

/**
 * ESPN 이벤트를 공통 Game 타입으로 정규화
 * 
 * 리그별로 미묘하게 다른 ESPN 응답을 우리 공통 Game 타입으로 완전히 통일시킵니다.
 * 기본 구조는 공통으로 처리하고, 리그별 특수 처리는 switch 문으로 확장 가능합니다.
 */
function normalizeGame(league, event) {
  const competition = event.competitions?.[0];
  const statusType = competition?.status?.type?.name; // "STATUS_SCHEDULED", "STATUS_IN_PROGRESS", "STATUS_FINAL" 등

  const competitors = competition?.competitors || [];
  const home = competitors.find((t) => t.homeAway === "home") || competitors[0];
  const away = competitors.find((t) => t.homeAway === "away") || competitors[1];

  // 상태 정규화
  const normalizeStatus = () => {
    if (!statusType) return "scheduled";
    if (statusType === "STATUS_FINAL") return "finished";
    if (statusType === "STATUS_IN_PROGRESS") return "live";
    return "scheduled";
  };

  // 팀 이름 추출 (우선순위: shortDisplayName > abbreviation > displayName > name)
  const homeName =
    home?.team?.shortDisplayName ||
    home?.team?.abbreviation ||
    home?.team?.displayName ||
    home?.team?.name ||
    "HOME";

  const awayName =
    away?.team?.shortDisplayName ||
    away?.team?.abbreviation ||
    away?.team?.displayName ||
    away?.team?.name ||
    "AWAY";

  // 기본 Game 객체
  const base = {
    id: event.id,
    league,
    startTime: event.date, // ISO
    status: normalizeStatus(), // "scheduled" | "live" | "finished"
    homeTeam: homeName,
    awayTeam: awayName,
    homeScore: home?.score != null ? Number(home.score) : null,
    awayScore: away?.score != null ? Number(away.score) : null,
  };

  // 리그별로 혹시 다른 처리 필요하면 분기 추가
  switch (league.toUpperCase()) {
    case "EPL":
    case "KLEAGUE":
    case "KLEAGUE1":
    case "KLEAGUE2":
    case "UCL":
    case "LALIGA":
    case "SERIEA":
    case "BUNDESLIGA":
    case "LIGUE1":
      // 축구 리그: 필요 시 EPL 전용 필드 가공
      // 예: 무승부 여부, 연장전 정보 등
      return base;

    case "NBA":
    case "KBL":
    case "WKBL":
      // 농구 리그: 필요 시 NBA 전용 필드 가공
      // 예: 쿼터별 스코어, 연장전 정보 등
      return base;

    case "MLB":
    case "KBO":
    case "NPB":
      // 야구 리그: 기본 구조로 충분
      return base;

    case "NFL":
      // 미식축구: 필요 시 NFL 전용 필드 가공
      // 예: 쿼터 정보, 연장전 정보 등
      return base;

    default:
      // 기본값: 공통 구조 사용
      return base;
  }
}

/**
 * ESPN 순위 데이터를 공통 StandingRow 타입으로 정규화
 */
function normalizeStanding(entry, league) {
  const stats = entry.stats || [];
  const findStat = (name) => stats.find((s) => s.name === name)?.value ?? null;

  const base = {
    league,
    team: entry.team?.displayName || entry.team?.shortDisplayName || entry.team?.name || "Unknown",
    rank: findStat("rank") ?? findStat("playoffseed") ?? findStat("position") ?? null,
    wins: findStat("wins") ?? null,
    losses: findStat("losses") ?? null,
    draws: findStat("ties") ?? findStat("draws") ?? null,
  };

  // 리그별 추가 정보
  const leagueUpper = league.toUpperCase();
  if (
    leagueUpper === "EPL" ||
    leagueUpper === "KLEAGUE" ||
    leagueUpper === "UCL" ||
    leagueUpper === "LALIGA" ||
    leagueUpper === "SERIEA" ||
    leagueUpper === "BUNDESLIGA" ||
    leagueUpper === "LIGUE1"
  ) {
    // 축구 리그: 승점 추가
    base.points = findStat("points") ?? findStat("point") ?? null;
  } else if (leagueUpper === "NBA" || leagueUpper === "KBL") {
    // 농구: 승률 추가
    base.winRate = findStat("winPercent") ?? findStat("winpct") ?? null;
  } else if (leagueUpper === "MLB" || leagueUpper === "KBO") {
    // 야구: 승률 추가
    base.winRate = findStat("winPercent") ?? findStat("winpct") ?? null;
  }

  return base;
}

/**
 * GET /api/games?league=MLB&date=2025-04-12&team=Dodgers
 * 네 프론트의 Game 타입에 맞게 변환해서 돌려줌
 * 
 * team 파라미터가 있으면 해당 팀이 포함된 경기만 필터링합니다.
 * 한국어 팀명도 자동으로 영문 팀명으로 변환됩니다.
 */
app.get("/api/games", async (req, res) => {
  try {
    const league = (req.query.league || "MLB").toString();
    const date = (req.query.date || "").toString(); // "YYYY-MM-DD"
    const team = (req.query.team || "").toString(); // 팀 이름 (한국어 또는 영문)

    if (!date) {
      return res.status(400).json({ error: "date query param (YYYY-MM-DD) is required" });
    }

    const leaguePath = LEAGUE_MAP[league] || LEAGUE_MAP.MLB;
    const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/${leaguePath}/scoreboard?dates=${toESPNDate(
      date
    )}`;

    const data = await espnGetJson(espnUrl);

    // 정규화 레이어를 통해 리그별로 일관된 Game 객체 생성
    let games = (data.events || []).map((event) => normalizeGame(league, event));

    // 🔥 팀 필터 적용 (한국어 팀명을 영문으로 변환 후 필터링)
    if (team) {
      const normalizedTeam = normalizeTeamName(team) || team; // 한국어 → 영문 변환, 실패 시 원본 사용
      const teamLower = normalizedTeam.toLowerCase();
      
      games = games.filter(
        (g) =>
          g.homeTeam.toLowerCase().includes(teamLower) ||
          g.awayTeam.toLowerCase().includes(teamLower) ||
          teamLower.includes(g.homeTeam.toLowerCase()) ||
          teamLower.includes(g.awayTeam.toLowerCase())
      );
    }

    res.json({ games });
  } catch (e) {
    console.error("[BFF] /api/games error", e);
    res.status(500).json({ error: "Failed to fetch games from ESPN" });
  }
});

/**
 * GET /api/standings?league=MLB
 * 리그 순위
 */
app.get("/api/standings", async (req, res) => {
  try {
    const league = (req.query.league || "MLB").toString();
    const leaguePath = LEAGUE_MAP[league] || LEAGUE_MAP.MLB;

    const espnUrl = `https://site.web.api.espn.com/apis/v2/sports/${leaguePath}/standings`;

    const data = await espnGetJson(espnUrl);

    // ESPN standings 구조에서 팀 정보 꺼내기
    const group = data.children?.[0]?.standings;
    if (!group) {
      return res.json({ standings: [] });
    }

    // 정규화 레이어를 통해 리그별로 일관된 StandingRow 객체 생성
    const standings = group.entries.map((entry) => {
      return normalizeStanding(entry, league);
    });

    // rank 기준 정렬
    standings.sort((a, b) => {
      if (a.rank == null) return 1;
      if (b.rank == null) return -1;
      return a.rank - b.rank;
    });

    res.json({ standings });
  } catch (e) {
    console.error("[BFF] /api/standings error", e);
    res.status(500).json({ error: "Failed to fetch standings from ESPN" });
  }
});

/**
 * GET /api/team?name=Dodgers&league=MLB&date=2025-04-12
 * 팀 경기 일정 조회
 */
app.get("/api/team", async (req, res) => {
  try {
    const teamName = (req.query.name || "").toString();
    const league = (req.query.league || "MLB").toString();
    const date = (req.query.date || "").toString();

    if (!teamName) {
      return res.status(400).json({ error: "name query param is required" });
    }

    if (!date) {
      return res.status(400).json({ error: "date query param (YYYY-MM-DD) is required" });
    }

    // 한국어 팀명을 영문 팀명으로 정규화
    const normalizedTeamName = normalizeTeamName(teamName);
    if (!normalizedTeamName) {
      return res.status(400).json({ 
        error: `Team name "${teamName}" not found in mapping table`,
        suggestion: "Please use English team name or check TEAM_NAME_MAP"
      });
    }

    const leaguePath = LEAGUE_MAP[league] || LEAGUE_MAP.MLB;
    const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/${leaguePath}/scoreboard?dates=${toESPNDate(
      date
    )}`;

    const data = await espnGetJson(espnUrl);

    // 모든 경기를 정규화한 후 팀 이름으로 필터링
    const allGames = (data.events || []).map((event) => normalizeGame(league, event));

    // 정규화된 영문 팀명으로 필터링 (대소문자 무시, 부분 매칭)
    const teamLower = normalizedTeamName.toLowerCase();
    const teamGames = allGames.filter(
      (game) =>
        game.homeTeam.toLowerCase().includes(teamLower) ||
        game.awayTeam.toLowerCase().includes(teamLower) ||
        teamLower.includes(game.homeTeam.toLowerCase()) ||
        teamLower.includes(game.awayTeam.toLowerCase())
    );

    res.json({ 
      games: teamGames, 
      team: normalizedTeamName, // 영문 팀명 반환
      originalQuery: teamName, // 원본 한국어 팀명도 함께 반환
      league 
    });
  } catch (e) {
    console.error("[BFF] /api/team error", e);
    res.status(500).json({ error: "Failed to fetch team games from ESPN" });
  }
});

/**
 * GET /api/player?name=Ohtani&league=MLB&date=2025-04-12
 * 선수 관련 경기 조회
 * 
 * ESPN API는 선수별 경기를 직접 제공하지 않으므로,
 * 선수 → 팀 매핑을 통해 팀 경기를 반환합니다.
 */
app.get("/api/player", async (req, res) => {
  try {
    const playerName = (req.query.name || "").toString();
    const league = (req.query.league || "MLB").toString();
    const date = (req.query.date || "").toString();

    if (!playerName) {
      return res.status(400).json({ error: "name query param is required" });
    }

    if (!date) {
      return res.status(400).json({ error: "date query param (YYYY-MM-DD) is required" });
    }

    // 선수 → 팀 매핑 (간단한 버전, 나중에 확장 가능)
    const PLAYER_TEAM_MAP = {
      "Ohtani": "Angels",
      "손흥민": "Tottenham",
      "이강인": "PSG",
      "류현진": "Blue Jays",
    };

    const teamName = PLAYER_TEAM_MAP[playerName] || null;

    if (!teamName) {
      // 팀 매핑이 없으면 전체 경기 반환 (나중에 확장)
      return res.json({ 
        games: [], 
        player: playerName, 
        message: "Player team mapping not found. Please use /api/team endpoint." 
      });
    }

    // 팀 경기 조회 로직 재사용
    const leaguePath = LEAGUE_MAP[league] || LEAGUE_MAP.MLB;
    const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/${leaguePath}/scoreboard?dates=${toESPNDate(
      date
    )}`;

    const data = await espnGetJson(espnUrl);

    const allGames = (data.events || []).map((event) => normalizeGame(league, event));

    const teamLower = teamName.toLowerCase();
    const playerGames = allGames.filter(
      (game) =>
        game.homeTeam.toLowerCase().includes(teamLower) ||
        game.awayTeam.toLowerCase().includes(teamLower)
    );

    res.json({ games: playerGames, player: playerName, team: teamName, league });
  } catch (e) {
    console.error("[BFF] /api/player error", e);
    res.status(500).json({ error: "Failed to fetch player games from ESPN" });
  }
});

/**
 * 루트 경로 - API 정보
 */
app.get("/", (req, res) => {
  res.json({
    message: "ESPN BFF Proxy Server",
    version: "1.0.0",
    endpoints: {
      games: "GET /api/games?league=MLB&date=YYYY-MM-DD",
      standings: "GET /api/standings?league=MLB",
      team: "GET /api/team?name=Dodgers&league=MLB&date=YYYY-MM-DD",
      player: "GET /api/player?name=Ohtani&league=MLB&date=YYYY-MM-DD",
    },
    supportedLeagues: Object.keys(LEAGUE_MAP),
  });
});

/**
 * 헬스 체크
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ BFF server running on http://localhost:${PORT}`);
});

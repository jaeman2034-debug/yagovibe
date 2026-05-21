# YAGO League Page - 핵심 페이지 아키텍처 (실서비스 수준)

## 🎯 목표

**경기 일정, 순위, 팀 정보, 경기 결과를 한 번에 확인하는 핵심 화면**

---

## 📊 전체 페이지 구조

```
League Page
 │
 ├─ League Header (Hero Section)
 │
 ├─ Navigation Tabs
 │
 ├─ Overview Tab
 │   ├─ Standings (순위표)
 │   ├─ Upcoming Matches (다가오는 경기)
 │   └─ Recent Results (최근 결과)
 │
 ├─ Standings Tab
 │   └─ Full Standings Table
 │
 ├─ Matches Tab
 │   ├─ Match Schedule (경기 일정)
 │   └─ Match Results (경기 결과)
 │
 ├─ Teams Tab
 │   └─ Teams Grid
 │
 └─ Stats Tab
     └─ League Statistics
```

---

## 🎨 화면 레이아웃

### 전체 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  [Header: Organization Navigation]                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [League Header - Hero Section]                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [Hero Image]                                   │   │
│  │                                                 │   │
│  │  K7 노원구 리그                                 │   │
│  │  2026 시즌                                      │   │
│  │  서울 노원구 지역 생활체육 축구 리그            │   │
│  │                                                 │   │
│  │  [통계] 12팀 · 66경기 · 24경기 완료            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Navigation Tabs]                                      │
│  [Overview] [Standings] [Matches] [Teams] [Stats]     │
│                                                         │
│  ┌──────────────────────┬──────────────────────────┐  │
│  │                      │                          │  │
│  │  순위표               │  다가오는 경기           │  │
│  │                      │                          │  │
│  │  ┌────────────────┐  │  ┌────────────────────┐ │  │
│  │  │ 1 노원FC       │  │  │ 4월 12일          │ │  │
│  │  │   5경기 13점   │  │  │ 노원FC vs 상계     │ │  │
│  │  └────────────────┘  │  │ 14:00 · 마들경기장│ │  │
│  │                      │  └────────────────────┘ │  │
│  │  ┌────────────────┐  │  ┌────────────────────┐ │  │
│  │  │ 2 상계유나이티드│  │  │ 4월 19일          │ │  │
│  │  │   5경기 10점   │  │  │ 중계 vs 월계       │ │  │
│  │  └────────────────┘  │  │ 14:00 · 마들경기장│ │  │
│  │                      │  └────────────────────┘ │  │
│  │  ...                 │  ...                  │  │
│  │                      │                          │  │
│  └──────────────────────┴──────────────────────────┘  │
│                                                         │
│  [최근 경기 결과]                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  노원FC 3 : 1 상계유나이티드                     │   │
│  │  [경기 상세 보기]                                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [참가 팀]                                              │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐            │
│  │ 노원 │  │ 상계 │  │ 중계 │  │ 월계 │            │
│  │  FC │  │유나이│  │스타즈│  │  FC │            │
│  └──────┘  └──────┘  └──────┘  └──────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🧩 React 컴포넌트 구조

```typescript
LeaguePage
 ├─ LeagueHeader
 │   ├─ HeroSection
 │   └─ LeagueStats
 ├─ LeagueTabs
 │   ├─ OverviewTab
 │   ├─ StandingsTab
 │   ├─ MatchesTab
 │   ├─ TeamsTab
 │   └─ StatsTab
 └─ TabContent
     ├─ StandingsTable
     ├─ MatchSchedule
     ├─ MatchResults
     ├─ TeamsGrid
     └─ LeagueStatistics
```

---

## 🎨 컴포넌트 상세

### 1. LeagueHeader

```typescript
interface LeagueHeaderProps {
  league: League;
  organization: Organization;
}

export default function LeagueHeader({
  league,
  organization
}: LeagueHeaderProps) {
  return (
    <div className="relative w-full h-64 md:h-80">
      {/* Hero Image (조직의 Hero 이미지 사용) */}
      <img
        src={organization.heroImageUrl}
        alt={league.name}
        className="w-full h-full object-cover"
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
      
      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-4">
        {/* League Name */}
        <h1 className="text-4xl md:text-5xl font-bold mb-2 text-center">
          {league.name}
        </h1>
        
        {/* Season */}
        <div className="text-xl md:text-2xl mb-4">
          {league.season} 시즌
        </div>
        
        {/* Description */}
        {league.description && (
          <p className="text-lg text-center max-w-2xl text-white/90">
            {league.description}
          </p>
        )}
        
        {/* Stats */}
        <div className="flex items-center gap-6 mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{league.teamCount}</div>
            <div className="text-sm text-white/80">팀</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{league.matchCount}</div>
            <div className="text-sm text-white/80">경기</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{league.completedMatchCount || 0}</div>
            <div className="text-sm text-white/80">완료</div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 2. LeagueTabs

```typescript
interface LeagueTabsProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "standings", label: "순위", icon: Trophy },
  { id: "matches", label: "경기", icon: Calendar },
  { id: "teams", label: "팀", icon: Users },
  { id: "stats", label: "통계", icon: BarChart }
];

export default function LeagueTabs({
  currentTab,
  onTabChange
}: LeagueTabsProps) {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${currentTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### 3. OverviewTab

```typescript
interface OverviewTabProps {
  leagueId: string;
}

export default function OverviewTab({ leagueId }: OverviewTabProps) {
  const { standings, upcomingMatches, recentResults } = useLeagueData(leagueId);
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 왼쪽: 순위표 */}
        <div>
          <h2 className="text-2xl font-bold mb-4">순위</h2>
          <StandingsTable standings={standings.slice(0, 5)} />
          <Link
            to={`/leagues/${leagueId}?tab=standings`}
            className="text-blue-600 hover:text-blue-700 text-sm mt-4 inline-block"
          >
            전체 순위 보기 →
          </Link>
        </div>
        
        {/* 오른쪽: 다가오는 경기 */}
        <div>
          <h2 className="text-2xl font-bold mb-4">다가오는 경기</h2>
          <div className="space-y-3">
            {upcomingMatches.slice(0, 5).map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
          <Link
            to={`/leagues/${leagueId}?tab=matches`}
            className="text-blue-600 hover:text-blue-700 text-sm mt-4 inline-block"
          >
            전체 일정 보기 →
          </Link>
        </div>
      </div>
      
      {/* 최근 경기 결과 */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">최근 경기 결과</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentResults.slice(0, 6).map((match) => (
            <MatchResultCard key={match.id} match={match} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### 4. StandingsTable

```typescript
interface StandingsTableProps {
  standings: LeagueStanding[];
  showFull?: boolean;
}

export default function StandingsTable({
  standings,
  showFull = false
}: StandingsTableProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                순위
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                팀
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                경기
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                승
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                무
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                패
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                득점
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                실점
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                승점
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {standings.map((standing, index) => (
              <tr
                key={standing.id}
                className={`
                  hover:bg-gray-50
                  ${index < 3 ? "bg-blue-50/50" : ""}
                `}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{standing.rank}</span>
                    {standing.rankChange && standing.rankChange !== 0 && (
                      <span
                        className={`
                          text-xs
                          ${standing.rankChange > 0 ? "text-green-600" : "text-red-600"}
                        `}
                      >
                        {standing.rankChange > 0 ? "↑" : "↓"} {Math.abs(standing.rankChange)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {getTeamLogo(standing.teamId) && (
                      <img
                        src={getTeamLogo(standing.teamId)}
                        alt={standing.teamName}
                        className="w-8 h-8 rounded"
                      />
                    )}
                    <span className="font-medium">{standing.teamName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">{standing.games}</td>
                <td className="px-4 py-3 text-center text-green-600 font-semibold">
                  {standing.wins}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">
                  {standing.draws}
                </td>
                <td className="px-4 py-3 text-center text-red-600">
                  {standing.losses}
                </td>
                <td className="px-4 py-3 text-center">{standing.goalsFor}</td>
                <td className="px-4 py-3 text-center">{standing.goalsAgainst}</td>
                <td className="px-4 py-3 text-center font-bold text-blue-600">
                  {standing.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

### 5. MatchSchedule

```typescript
interface MatchScheduleProps {
  leagueId: string;
}

export default function MatchSchedule({ leagueId }: MatchScheduleProps) {
  const { matches, loading } = useLeagueMatches(leagueId, {
    status: "scheduled",
    limit: 20
  });
  
  // 날짜별로 그룹화
  const matchesByDate = groupMatchesByDate(matches);
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="space-y-8">
        {Object.entries(matchesByDate).map(([date, dateMatches]) => (
          <div key={date}>
            <h3 className="text-lg font-semibold mb-4">
              {formatDate(date)}
            </h3>
            <div className="space-y-3">
              {dateMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: LeagueMatch }) {
  return (
    <Link
      to={`/matches/${match.id}`}
      className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-600 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          {/* 홈팀 */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <span className="font-medium">{match.homeTeamName}</span>
            {getTeamLogo(match.homeTeamId) && (
              <img
                src={getTeamLogo(match.homeTeamId)}
                alt={match.homeTeamName}
                className="w-8 h-8 rounded"
              />
            )}
          </div>
          
          {/* VS */}
          <div className="text-gray-400 mx-4">VS</div>
          
          {/* 어웨이팀 */}
          <div className="flex items-center gap-2 flex-1">
            {getTeamLogo(match.awayTeamId) && (
              <img
                src={getTeamLogo(match.awayTeamId)}
                alt={match.awayTeamName}
                className="w-8 h-8 rounded"
              />
            )}
            <span className="font-medium">{match.awayTeamName}</span>
          </div>
        </div>
        
        {/* 일정 정보 */}
        <div className="text-right text-sm text-gray-600 ml-4">
          <div>{formatTime(match.scheduledAt)}</div>
          {match.facilityName && (
            <div className="text-xs">{match.facilityName}</div>
          )}
        </div>
      </div>
    </Link>
  );
}
```

---

### 6. MatchResults

```typescript
interface MatchResultsProps {
  leagueId: string;
}

export default function MatchResults({ leagueId }: MatchResultsProps) {
  const { matches, loading } = useLeagueMatches(leagueId, {
    status: "completed",
    limit: 20
  });
  
  const matchesByDate = groupMatchesByDate(matches);
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="space-y-8">
        {Object.entries(matchesByDate).map(([date, dateMatches]) => (
          <div key={date}>
            <h3 className="text-lg font-semibold mb-4">
              {formatDate(date)}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dateMatches.map((match) => (
                <MatchResultCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchResultCard({ match }: { match: LeagueMatch }) {
  return (
    <Link
      to={`/matches/${match.id}`}
      className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-600 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getTeamLogo(match.homeTeamId) && (
            <img
              src={getTeamLogo(match.homeTeamId)}
              alt={match.homeTeamName}
              className="w-6 h-6 rounded"
            />
          )}
          <span className="font-medium text-sm">{match.homeTeamName}</span>
        </div>
        <div className="text-lg font-bold">
          {match.homeScore}
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getTeamLogo(match.awayTeamId) && (
            <img
              src={getTeamLogo(match.awayTeamId)}
              alt={match.awayTeamName}
              className="w-6 h-6 rounded"
            />
          )}
          <span className="font-medium text-sm">{match.awayTeamName}</span>
        </div>
        <div className="text-lg font-bold">
          {match.awayScore}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mt-2">
        {formatDate(match.playedAt || match.scheduledAt)}
        {match.matchReportId && (
          <span className="ml-2 text-blue-600">📄 리포트</span>
        )}
      </div>
    </Link>
  );
}
```

---

### 7. TeamsGrid

```typescript
interface TeamsGridProps {
  leagueId: string;
}

export default function TeamsGrid({ leagueId }: TeamsGridProps) {
  const { teams, loading } = useLeagueTeams(leagueId);
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {teams.map((team) => (
          <Link
            key={team.id}
            to={`/teams/${team.teamId}`}
            className="block bg-white border border-gray-200 rounded-xl p-6 text-center hover:border-blue-600 hover:shadow-md transition-all"
          >
            {team.teamLogo && (
              <img
                src={team.teamLogo}
                alt={team.teamName}
                className="w-16 h-16 mx-auto mb-3 object-contain"
              />
            )}
            <div className="font-semibold mb-1">{team.teamName}</div>
            <div className="text-sm text-gray-500">
              {team.matchesPlayed}경기 · {team.points}점
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

---

## 🔄 데이터 페칭

### Custom Hooks

```typescript
// useLeagueData
function useLeagueData(leagueId: string) {
  const [league, setLeague] = useState<League | null>(null);
  const [standings, setStandings] = useState<LeagueStanding[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<LeagueMatch[]>([]);
  const [recentResults, setRecentResults] = useState<LeagueMatch[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      const [leagueData, standingsData, matchesData] = await Promise.all([
        getLeague(leagueId),
        getLeagueStandings(leagueId),
        getLeagueMatches(leagueId, { limit: 50 })
      ]);
      
      setLeague(leagueData);
      setStandings(standingsData);
      
      const upcoming = matchesData.filter(m => m.status === "scheduled");
      const recent = matchesData
        .filter(m => m.status === "completed")
        .sort((a, b) => (b.playedAt?.toMillis() || 0) - (a.playedAt?.toMillis() || 0))
        .slice(0, 10);
      
      setUpcomingMatches(upcoming);
      setRecentResults(recent);
      setLoading(false);
    }
    
    fetchData();
  }, [leagueId]);
  
  return { league, standings, upcomingMatches, recentResults, loading };
}

// useLeagueMatches
function useLeagueMatches(
  leagueId: string,
  options?: {
    status?: "scheduled" | "completed" | "all";
    limit?: number;
  }
) {
  const [matches, setMatches] = useState<LeagueMatch[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchMatches() {
      setLoading(true);
      const data = await getLeagueMatches(leagueId, options);
      setMatches(data);
      setLoading(false);
    }
    
    fetchMatches();
  }, [leagueId, options?.status]);
  
  return { matches, loading };
}
```

---

## 📊 데이터 구조

### League

```typescript
interface League {
  id: string;
  organizationId: string;
  seasonId: string;
  name: string;
  slug: string;
  sport: string;
  description?: string;
  format: "round_robin" | "tournament" | "hybrid";
  status: "draft" | "registration" | "active" | "completed";
  teamCount: number;
  matchCount: number;
  completedMatchCount: number;
  startDate: Timestamp;
  endDate: Timestamp;
}
```

### LeagueStanding

```typescript
interface LeagueStanding {
  id: string;
  leagueId: string;
  teamId: string;
  teamName: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  rank: number;
  previousRank?: number;
  rankChange?: number;
}
```

---

## 🎯 URL 구조

### League Page

```
/federations/{federationSlug}/leagues/{leagueSlug}
  → League Overview (기본)

/federations/{federationSlug}/leagues/{leagueSlug}?tab=standings
  → Standings Tab

/federations/{federationSlug}/leagues/{leagueSlug}?tab=matches
  → Matches Tab

/federations/{federationSlug}/leagues/{leagueSlug}?tab=teams
  → Teams Tab
```

---

## 🔄 사용자 흐름

```
Organization Website
    │
    ▼
League List
    │
    ▼
League Page (Overview)
    │
    ├─ Standings 확인
    ├─ 경기 일정 확인
    ├─ 팀 정보 확인
    └─ 경기 결과 클릭
        │
        ▼
Match Center Page
    │
    ├─ 경기 상세
    ├─ 타임라인
    └─ AI 리포트
```

---

## ✅ 구현 체크리스트

### Phase 1: 기본 구조
- [ ] LeagueHeader 컴포넌트
- [ ] LeagueTabs 컴포넌트
- [ ] OverviewTab 컴포넌트
- [ ] useLeagueData 훅

### Phase 2: 각 Tab 구현
- [ ] StandingsTab (순위표)
- [ ] MatchesTab (경기 일정/결과)
- [ ] TeamsTab (팀 목록)
- [ ] StatsTab (통계)

### Phase 3: 컴포넌트
- [ ] StandingsTable
- [ ] MatchCard
- [ ] MatchResultCard
- [ ] TeamsGrid

### Phase 4: 데이터 연동
- [ ] League 조회 API
- [ ] Standings 조회 API
- [ ] Matches 조회 API
- [ ] Teams 조회 API

---

## 🚀 Cursor에게 전달할 지시

```
Implement YAGO League Page with tab-based navigation.
Create Overview tab with standings and upcoming matches.
Implement Standings table with real-time updates.
Create Match schedule and results views.
Make all components responsive and accessible.
```

---

이 페이지를 구현하면 **YAGO의 핵심 사용자 경험이 완성됩니다!** 🚀

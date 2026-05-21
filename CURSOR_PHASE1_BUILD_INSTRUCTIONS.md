# 🚀 YAGO VIBE SPORTS - Cursor Phase-1 Build 통합 작업 지시문

> **작성일**: 2024년  
> **목적**: Cursor AI가 한 번에 실행할 수 있는 통합 작업 지시문

---

## 📋 작업 개요

We are building the **YAGO VIBE SPORTS platform**.

The system is a **Sports Operating System** that supports:

* Team management
* Match system
* Events
* Player records
* Statistics & rankings
* Tournaments
* Youth academy

The `/sports` page is already implemented as a **Sports Hub**.

Now implement the **core domain pages and systems**.

---

## 1️⃣ CREATE DOMAIN PAGES

Create pages for the following routes:

- `/teams`
- `/matches`
- `/tournaments`
- `/players`
- `/stats`
- `/academy`

### Requirements for each page:

* Page header with title and description
* Section navigation (if needed)
* Placeholder content with Tailwind layout
* Responsive design (mobile-first)
* Link to Sports Hub (`/sports`)

### File structure:

```
src/pages/teams/TeamsListPage.tsx
src/pages/matches/MatchListPage.tsx
src/pages/tournaments/TournamentListPage.tsx
src/pages/players/PlayerListPage.tsx
src/pages/stats/StatsPage.tsx
src/pages/academy/AcademyListPage.tsx
```

### Example structure:

```typescript
// src/pages/teams/TeamsListPage.tsx
import { useNavigate } from "react-router-dom";
import Header from "@/layout/Header";

export default function TeamsListPage() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">팀</h1>
          <p className="text-gray-500">팀을 찾거나 생성하세요</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Placeholder cards */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold mb-2">팀 카드</h3>
            <p className="text-sm text-gray-500">팀 정보가 여기에 표시됩니다</p>
          </div>
        </div>
      </main>
    </div>
  );
}
```

---

## 2️⃣ TEAM SYSTEM

Use the existing Firestore structure:

```
teams/{teamId}
teams/{teamId}/members/{uid}
teams/{teamId}/events/{eventId}
teams/{teamId}/notices/{noticeId}
teams/{teamId}/activities/{activityId}
teams/{teamId}/matches/{matchId}
```

### Create Team Workspace page:

Route: `/sports/{type}/team` (already exists, improve it)

Tabs structure:
- Activity Feed (already implemented)
- Schedule
- Members
- Records
- Notices

### Requirements:

* Use existing `MyTeamPage.tsx` as base
* Ensure all tabs are functional
* Use `useTeamPermission` hook for permission checks
* Use realtime subscriptions for Activities, Events, Notices

---

## 3️⃣ ACTIVITY FEED

Create a Team Activity Feed system.

### Firestore source:

```
teams/{teamId}/activities/{activityId}
```

### Fields:

```typescript
{
  type: "event" | "notice" | "match" | "member_join",
  title: string,
  createdBy: string,
  createdAt: Timestamp,
  referenceId: string,
  summary?: string,
  metadata?: {
    eventDate?: Timestamp,
    matchScore?: string,
    memberName?: string,
  }
}
```

### Components to create:

```
src/components/team/activity/ActivityFeed.tsx (already exists, verify)
src/components/team/activity/ActivityItem.tsx (already exists, verify)
src/components/team/activity/ActivityIcon.tsx (already exists, verify)
```

### Requirements:

* Use `onSnapshot` for realtime updates
* Sort by `orderBy("createdAt", "desc")`
* Limit to 20 items initially
* Add loading and error states
* Add empty state

### Integration:

* Already integrated in `MyTeamPage.tsx` as Activity Feed tab
* Verify it works correctly

---

## 4️⃣ MATCH SYSTEM

Create a match system.

### Firestore collections:

```
matches/{matchId}
matches/{matchId}/lineups/{playerId}
matches/{matchId}/events/{eventId}
```

### Match document structure:

```typescript
{
  homeTeamId: string,
  homeTeamName: string,
  awayTeamId: string,
  awayTeamName: string,
  date: Timestamp,
  location: string,
  status: "scheduled" | "live" | "completed" | "cancelled",
  score: {
    home: number,
    away: number
  },
  leagueId?: string,
  tournamentId?: string,
  createdBy: string,
  createdAt: Timestamp
}
```

### Pages to create:

```
src/pages/matches/MatchListPage.tsx
src/pages/matches/MatchDetailPage.tsx
src/pages/matches/MatchCreatePage.tsx (may already exist)
```

### Components to create:

```
src/components/match/MatchCard.tsx
src/components/match/MatchHeader.tsx
src/components/match/MatchLineup.tsx
src/components/match/MatchTimeline.tsx
src/components/match/MatchStats.tsx
```

### Requirements:

* Match List: Use `getDocs` (not onSnapshot) for match list
* Match Detail: Use `getDoc` for match data, `onSnapshot` only for live matches
* Match Card: Display match summary with teams, score, date, status
* Match Header: Display match score, teams, date, location
* Match Lineup: Display team lineups (if available)
* Match Timeline: Display match events in chronological order
* Match Stats: Display match statistics (if available)

### Match List Page structure:

```typescript
// src/pages/matches/MatchListPage.tsx
export default function MatchListPage() {
  return (
    <div>
      <Header />
      <main>
        <h1>경기</h1>
        
        {/* Tabs: 예정 / 진행중 / 완료 */}
        <div className="tabs">
          <button>예정</button>
          <button>진행중</button>
          <button>완료</button>
        </div>
        
        {/* Match cards */}
        <div className="grid">
          <MatchCard />
        </div>
      </main>
    </div>
  );
}
```

---

## 5️⃣ STATS SYSTEM

Create statistics pages.

### Routes:

```
/stats (main stats page)
/stats/team (team statistics)
/stats/player (player statistics)
/stats/rank (rankings)
```

### Firestore collections:

```
teams/{teamId}/stats/{seasonId}
players/{playerId}/stats/{seasonId}
rankings/{seasonId}/teams/{teamId}
rankings/{seasonId}/players/{category}/{playerId}
```

### Components to create:

```
src/components/stats/TeamStatsCard.tsx
src/components/stats/PlayerStatsCard.tsx
src/components/stats/RankingTable.tsx
```

### Requirements:

* Use `getDoc` for stats (not onSnapshot)
* Use `getDocs` for rankings (not onSnapshot)
* Add season selector
* Add category selector for player rankings (goals, assists)

### Stats Page structure:

```typescript
// src/pages/stats/StatsPage.tsx
export default function StatsPage() {
  return (
    <div>
      <Header />
      <main>
        <h1>통계</h1>
        
        {/* Navigation */}
        <nav>
          <Link to="/stats/team">팀 통계</Link>
          <Link to="/stats/player">선수 통계</Link>
          <Link to="/stats/rank">랭킹</Link>
        </nav>
        
        {/* Content */}
        <Outlet />
      </main>
    </div>
  );
}
```

---

## 6️⃣ TOURNAMENT SYSTEM

Create tournament pages.

### Routes:

```
/tournaments (tournament list)
/tournaments/{tournamentId} (tournament detail)
```

### Features:

* Teams (참가 팀)
* Matches (경기 일정)
* Standings (순위)
* Statistics (통계)

### Firestore collections:

```
tournaments/{tournamentId}
tournaments/{tournamentId}/teams/{teamId}
tournaments/{tournamentId}/matches/{matchId}
tournaments/{tournamentId}/standings/{teamId}
```

### Pages to create:

```
src/pages/tournaments/TournamentListPage.tsx
src/pages/tournaments/TournamentDetailPage.tsx
```

### Components to create:

```
src/components/tournament/TournamentCard.tsx
src/components/tournament/TournamentStandings.tsx
src/components/tournament/TournamentMatches.tsx
```

### Requirements:

* Use `getDocs` for tournament list (not onSnapshot)
* Use `getDoc` for tournament detail
* Use `getDocs` for teams/matches/standings
* Add tabs: Overview, Teams, Matches, Standings

---

## 7️⃣ ACADEMY SYSTEM

Create academy pages.

### Routes:

```
/academy (academy list)
/academy/{academyId} (academy detail)
```

### Features:

* Academy list
* Coaches
* Training programs
* Youth teams

### Firestore collections:

```
academies/{academyId}
academies/{academyId}/players/{playerId}
academies/{academyId}/coaches/{coachId}
academies/{academyId}/programs/{programId}
```

### Pages to create:

```
src/pages/academy/AcademyListPage.tsx
src/pages/academy/AcademyDetailPage.tsx
```

### Components to create:

```
src/components/academy/AcademyCard.tsx
src/components/academy/CoachCard.tsx
src/components/academy/ProgramCard.tsx
```

### Requirements:

* Use `getDocs` for academy list (not onSnapshot)
* Use `getDoc` for academy detail
* Add filters (sport, region)

---

## 8️⃣ COMPONENT RULES

Use reusable UI components.

### Create common card component:

```
src/components/ui/ModuleCard.tsx
```

### Each card includes:

* icon (Lucide icon)
* title
* description
* quick links (2-4 links)

### Example:

```typescript
// src/components/ui/ModuleCard.tsx
interface ModuleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  links: { label: string; path: string }[];
}

export function ModuleCard({ icon, title, description, links }: ModuleCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-gray-300 transition-all">
      <div className="flex items-center mb-4">
        <div className="mr-3">{icon}</div>
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <div className="flex flex-col space-y-2">
        {links.map((link, index) => (
          <Link key={index} to={link.path} className="text-sm text-blue-600 hover:underline">
            {link.label} →
          </Link>
        ))}
      </div>
    </div>
  );
}
```

---

## 9️⃣ DESIGN RULES

Use TailwindCSS for all styling.

### Cards:

```css
rounded-xl
border border-gray-200
hover:shadow-lg
hover:border-gray-300
transition-all
bg-white
p-6
```

### Icons:

* Use Lucide icons
* Size: 24px (w-6 h-6)
* Color: text-gray-600 or text-blue-600

### Buttons:

```css
px-4 py-2
rounded-lg
bg-blue-600 text-white
hover:bg-blue-700
transition-colors
```

### Typography:

* Headings: font-bold
* Body: text-gray-900
* Secondary: text-gray-500
* Small: text-sm

---

## 🔟 REALTIME RULES

Use realtime listeners only where necessary.

### Use `onSnapshot` for:

* Chat messages (`chatRooms/{roomId}/messages`)
* Team activities (`teams/{teamId}/activities`)
* Team events (`teams/{teamId}/events/{eventId}`)
* Team notices (`teams/{teamId}/notices`)
* Team members (`teams/{teamId}/members`)
* Live matches (`matches/{matchId}` when status === "live")

### Use `getDocs` / `getDoc` for:

* Team list
* Match list
* Tournament list
* Player directory
* Statistics
* Rankings
* Academy list

### Pattern:

```typescript
// ✅ Realtime (onSnapshot)
const unsubscribe = onSnapshot(query(...), (snapshot) => {
  // Update state
});

// ✅ Fetch (getDocs)
const snapshot = await getDocs(query(...));
const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

---

## 1️⃣1️⃣ ROUTING STRUCTURE

Add routes to `src/App.tsx`:

```typescript
// Domain pages
<Route path="/teams" element={<TeamsListPage />} />
<Route path="/matches" element={<MatchListPage />} />
<Route path="/matches/:matchId" element={<MatchDetailPage />} />
<Route path="/tournaments" element={<TournamentListPage />} />
<Route path="/tournaments/:tournamentId" element={<TournamentDetailPage />} />
<Route path="/players" element={<PlayerListPage />} />
<Route path="/stats" element={<StatsPage />} />
<Route path="/stats/team" element={<TeamStatsPage />} />
<Route path="/stats/player" element={<PlayerStatsPage />} />
<Route path="/stats/rank" element={<RankingPage />} />
<Route path="/academy" element={<AcademyListPage />} />
<Route path="/academy/:academyId" element={<AcademyDetailPage />} />
```

---

## 1️⃣2️⃣ SERVICE LAYER

Create service functions for Firestore operations.

### File structure:

```
src/services/
  ├─ teamService.ts (may already exist)
  ├─ matchService.ts (may already exist)
  ├─ playerService.ts
  ├─ statsService.ts
  ├─ rankingService.ts
  ├─ tournamentService.ts
  └─ academyService.ts
```

### Example service function:

```typescript
// src/services/matchService.ts
export async function getMatches(options?: {
  status?: "scheduled" | "live" | "completed";
  limit?: number;
}): Promise<Match[]> {
  const matchesRef = collection(db, "matches");
  let q = query(matchesRef, orderBy("date", "desc"));
  
  if (options?.status) {
    q = query(q, where("status", "==", options.status));
  }
  
  if (options?.limit) {
    q = query(q, limit(options.limit));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Match[];
}
```

---

## ✅ COMPLETION CHECKLIST

After completing this phase, verify:

- [ ] All domain pages are created and accessible
- [ ] Team Workspace is functional with all tabs
- [ ] Activity Feed displays realtime updates
- [ ] Match System pages are created
- [ ] Stats pages are created
- [ ] Tournament pages are created
- [ ] Academy pages are created
- [ ] All routes are added to App.tsx
- [ ] Service functions are created
- [ ] Components follow design rules
- [ ] Realtime rules are followed

---

## 🎯 GOAL

Create the **core Sports Operating System foundation of YAGO**.

This includes:
- All domain entry pages
- Team Workspace system
- Match System
- Activity Feed
- Stats & Ranking
- Tournament System
- Academy System

---

**Status**: Ready for Cursor execution  
**Priority**: Phase-1 (Core Foundation)

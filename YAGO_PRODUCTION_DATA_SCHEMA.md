# 🗄️ YAGO VIBE SPORTS - Production Data Schema

> **작성일**: 2024년  
> **목적**: Frontend / Backend / AI / Admin 모두 동일한 데이터 구조 사용

---

## 📋 목차

1. [Firestore 최상위 구조](#1-firestore-최상위-구조)
2. [Federation Document](#2-federation-document)
3. [Federation 하위 컬렉션](#3-federation-하위-컬렉션)
4. [상세 스키마](#4-상세-스키마)
5. [TypeScript Types](#5-typescript-types)
6. [Repository Layer](#6-repository-layer)

---

## 1️⃣ Firestore 최상위 구조

### 플랫폼 전체 구조

```
users/{userId}
federations/{federationId}
platform/
systemTemplates/
aiAgents/
```

### 핵심 원칙

```
federations/{federationId} = 독립 스포츠 운영 시스템
```

### 예시

```
federations/nowon-football
federations/seoul-futsal
federations/gangnam-basketball
```

---

## 2️⃣ Federation Document

### 경로

```
federations/{federationId}
```

### 스키마

```typescript
{
  id: string;
  name: string;                    // "노원구 축구협회"
  slug: string;                    // "nowon-football"
  sportType: "football" | "futsal" | "basketball" | "baseball" | "volleyball";
  region: string;                  // "서울 노원구"
  
  // Visual
  logoUrl?: string;
  heroImageUrl?: string;
  primaryColor: string;            // "#0F172A"
  secondaryColor: string;           // "#16A34A"
  
  // Info
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  website?: string;
  
  // Settings
  status: "active" | "inactive" | "suspended";
  homepageVisible: boolean;
  adminEnabled: boolean;
  templateId: string;              // "football-association-v1"
  
  // Permissions
  adminUids: string[];
  superAdminUids: string[];
  
  // Defaults
  defaultTournamentType: "round_robin" | "knockout" | "hybrid";
  ageGroups: string[];             // ["유소년", "성인"]
  divisions: string[];             // ["남자부", "여자부", "혼성부"]
  
  // Stats
  stats: {
    activeTournaments: number;
    activeLeagues: number;
    totalTeams: number;
    totalPlayers: number;
    totalMatches: number;
  };
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

---

## 3️⃣ Federation 하위 컬렉션

### 전체 구조

```
federations/{federationId}
  ├─ pages/{pageId}
  ├─ menus/{menuId}
  ├─ notices/{noticeId}
  ├─ leagues/{leagueId}
  │   └─ seasons/{seasonId}
  │       ├─ teams/{teamId}
  │       ├─ matches/{matchId}
  │       │   ├─ events/{eventId}
  │       │   └─ lineups/{playerId}
  │       ├─ standings/{teamId}
  │       └─ stats/{statId}
  ├─ registrations/{registrationId}
  ├─ teams/{teamId}
  │   └─ roster/{playerId}
  ├─ players/{playerId}
  ├─ matches/{matchId}
  ├─ tournaments/{tournamentId}
  │   ├─ groups/{groupId}
  │   ├─ brackets/{bracketId}
  │   └─ scheduleJobs/{jobId}
  ├─ documents/{documentId}
  ├─ sponsors/{sponsorId}
  ├─ venues/{venueId}
  ├─ referees/{refereeId}
  ├─ staff/{staffId}
  ├─ admins/{adminId}
  ├─ aiAgents/{agentId}
  └─ settings/{settingId}
```

---

## 4️⃣ 상세 스키마

### 4.1 League

**경로**: `federations/{federationId}/leagues/{leagueId}`

```typescript
{
  id: string;
  federationId: string;
  name: string;                    // "노원구 K7 리그"
  slug: string;                    // "k7-league"
  category: "adult" | "youth" | "mixed";
  sportType: string;
  gender: "men" | "women" | "mixed";
  ageGroup: string;                // "adult", "U12", "U15"
  description?: string;
  
  competitionType: "league" | "cup";
  status: "draft" | "active" | "completed" | "cancelled";
  visible: boolean;
  
  // Stats
  currentSeasonId?: string;
  totalSeasons: number;
  totalTeams: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 4.2 Season

**경로**: `federations/{federationId}/leagues/{leagueId}/seasons/{seasonId}`

```typescript
{
  id: string;
  federationId: string;
  leagueId: string;
  name: string;                    // "2026 전반기"
  slug: string;                    // "2026-h1"
  year: number;                    // 2026
  seasonNumber: number;            // 1
  
  // Dates
  startDate: Timestamp;
  endDate: Timestamp;
  registrationStart: Timestamp;
  registrationEnd: Timestamp;
  
  // Limits
  maxTeams: number;                // 16
  minTeams: number;                 // 8
  
  // Rules
  scheduleType: "round_robin" | "custom";
  roundsPerTeam: number;
  pointsForWin: number;            // 3
  pointsForDraw: number;           // 1
  pointsForLoss: number;           // 0
  tieBreakRules: string[];        // ["goalDifference", "goalsFor", "headToHead"]
  
  status: "draft" | "registration" | "ongoing" | "completed" | "cancelled";
  visible: boolean;
  published: boolean;
  
  // Stats
  totalMatches: number;
  completedMatches: number;
  registeredTeams: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 4.3 Team

**경로**: `federations/{federationId}/teams/{teamId}`

```typescript
{
  id: string;
  federationId: string;
  name: string;                    // "노원FC"
  slug: string;                    // "nowon-fc"
  logoUrl?: string;
  
  // Info
  foundedYear?: number;
  homeStadium?: string;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  description?: string;
  
  // Management
  managerName?: string;
  managerPhone?: string;
  managerEmail?: string;
  coachName?: string;
  coachPhone?: string;
  
  // Location
  region?: string;                 // "노원구"
  
  status: "pending" | "active" | "inactive" | "suspended";
  
  // Stats
  totalPlayers: number;
  totalMatches: number;
  totalWins: number;
  totalDraws: number;
  totalLosses: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 4.4 Player

**경로**: `federations/{federationId}/players/{playerId}`

```typescript
{
  id: string;
  federationId: string;
  userId?: string;                  // 연결된 사용자 ID
  name: string;                    // "홍길동"
  photoUrl?: string;
  
  // Personal
  dateOfBirth?: Timestamp;
  position?: string[];              // ["FW", "MF", "DF", "GK"]
  jerseyNumber?: number;
  height?: number;                  // cm
  weight?: number;                   // kg
  nationality?: string;
  
  // Team
  currentTeamId?: string;
  currentTeamName?: string;
  
  status: "active" | "inactive" | "suspended";
  
  // Stats (aggregated)
  totalGoals: number;
  totalAssists: number;
  totalYellowCards: number;
  totalRedCards: number;
  totalMatches: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 4.5 Match

**경로**: `federations/{federationId}/matches/{matchId}`

```typescript
{
  id: string;
  federationId: string;
  tournamentId?: string;
  seasonId?: string;
  matchNumber: number;
  round?: number;                   // 라운드 번호
  group?: string;                   // "A조"
  groupId?: string;
  
  // Teams
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  
  // Schedule
  matchDate: Timestamp;
  matchTime: string;                // "14:00"
  venue: string;                    // "마들 스타디움"
  venueId?: string;
  referee?: string;
  refereeId?: string;
  
  // Result
  status: "scheduled" | "live" | "completed" | "cancelled" | "postponed";
  homeScore?: number;
  awayScore?: number;
  homeScoreDetail?: {
    q1?: number;
    q2?: number;
    q3?: number;
    q4?: number;
    ot?: number;
  };
  awayScoreDetail?: {
    q1?: number;
    q2?: number;
    q3?: number;
    q4?: number;
    ot?: number;
  };
  
  // Info
  attendance?: number;
  weather?: string;
  notes?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 4.6 Standing

**경로**: `federations/{federationId}/leagues/{leagueId}/seasons/{seasonId}/standings/{teamId}`

```typescript
{
  id: string;
  federationId: string;
  seasonId: string;
  teamId: string;
  teamName: string;
  
  rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;           // goalsFor - goalsAgainst
  points: number;
  
  form: string[];                   // ["W", "W", "L", "D", "W"]
  headToHead?: Record<string, number>; // 상대전적
  
  lastUpdated: Timestamp;
}
```

### 4.7 Tournament

**경로**: `federations/{federationId}/tournaments/{tournamentId}`

```typescript
{
  id: string;
  federationId: string;
  name: string;                     // "노원구청장기 축구대회"
  slug: string;                     // "nowon-mayor-cup"
  category: "adult" | "youth" | "mixed";
  competitionType: "league" | "tournament" | "hybrid";
  sportType: string;
  gender: "men" | "women" | "mixed";
  ageGroup: string;
  description?: string;
  
  // Dates
  startDate: Timestamp;
  endDate: Timestamp;
  registrationStart: Timestamp;
  registrationEnd: Timestamp;
  
  // Limits
  maxTeams: number;
  minTeams: number;
  teamCount: number;                 // 실제 참가팀 수
  
  // Options
  entryFee?: number;
  prizePool?: number;
  useSeeding: boolean;
  thirdPlaceMatch: boolean;
  penaltyShootout: boolean;
  allowDraw: boolean;
  
  // Format
  format?: "round_robin" | "knockout" | "hybrid";
  groupCount?: number;
  teamsPerGroup?: number;
  advancingTeamsPerGroup?: number;
  bracketType?: "single" | "double" | "round_robin";
  
  status: "draft" | "registration" | "ongoing" | "completed" | "cancelled";
  visible: boolean;
  
  // Stats
  totalMatches: number;
  completedMatches: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 4.8 Notice

**경로**: `federations/{federationId}/notices/{noticeId}`

```typescript
{
  id: string;
  federationId: string;
  title: string;                    // "대회 일정 공지"
  content: string;
  category: "general" | "tournament" | "registration" | "result" | "discipline";
  isPinned: boolean;
  importance?: "low" | "medium" | "high";
  attachments?: string[];           // File URLs
  
  viewCount: number;
  published: boolean;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 4.9 Document

**경로**: `federations/{federationId}/documents/{documentId}`

```typescript
{
  id: string;
  federationId: string;
  title: string;
  content?: string;                  // HTML content
  fileUrl?: string;                  // PDF, DOCX 등
  category: "rule" | "regulation" | "form" | "notice" | "other";
  tags: string[];                   // ["registration", "team"]
  
  downloadCount: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 4.10 Sponsor

**경로**: `federations/{federationId}/sponsors/{sponsorId}`

```typescript
{
  id: string;
  federationId: string;
  name: string;                     // "방병원"
  category: "hospital" | "company" | "individual" | "government";
  logoUrl?: string;
  linkUrl?: string;
  tier: "official" | "partner" | "supporter";
  description?: string;
  
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 4.11 Venue

**경로**: `federations/{federationId}/venues/{venueId}`

```typescript
{
  id: string;
  federationId: string;
  name: string;                     // "마들 스타디움"
  address: string;
  surface: "natural" | "artificial" | "indoor";
  capacity?: number;
  facilities?: string[];             // ["parking", "locker", "shower"]
  
  contactPhone?: string;
  contactEmail?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 4.12 Referee

**경로**: `federations/{federationId}/referees/{refereeId}`

```typescript
{
  id: string;
  federationId: string;
  name: string;                     // "김심판"
  grade: "A" | "B" | "C" | "D";
  phone?: string;
  email?: string;
  status: "active" | "inactive";
  
  totalMatches: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 4.13 Admin

**경로**: `federations/{federationId}/admins/{adminId}`

```typescript
{
  id: string;
  federationId: string;
  userId: string;
  name: string;                     // "협회사무국"
  role: "super-admin" | "federation-admin" | "league-manager" | "match-operator";
  permissions: string[];             // ["manage-leagues", "manage-matches"]
  status: "active" | "inactive";
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 4.14 AI Agent

**경로**: `federations/{federationId}/aiAgents/{agentId}`

```typescript
{
  id: string;
  federationId: string;
  name: string;                     // "Tournament Guide"
  agentType: "general-assistant" | "tournament-guide" | "match-ops" | 
             "team-registration" | "player-registration" | "rules-docs" | 
             "admin-ops" | "sponsor-assistant";
  enabled: boolean;
  scope: "public" | "admin";
  knowledgeSources: string[];       // ["notices", "tournaments", "matches"]
  uiPlacement: "homepage-chat" | "admin-panel" | "tournament-page";
  
  config: {
    model: string;                   // "gpt-4"
    temperature: number;             // 0.7
    maxTokens: number;               // 500
    systemPrompt?: string;
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 5️⃣ TypeScript Types

### 5.1 Federation Type

```typescript
// src/types/federation.ts
import { Timestamp } from "firebase/firestore";

export interface Federation {
  id: string;
  name: string;
  slug: string;
  sportType: "football" | "futsal" | "basketball" | "baseball" | "volleyball";
  region: string;
  logoUrl?: string;
  heroImageUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  website?: string;
  status: "active" | "inactive" | "suspended";
  homepageVisible: boolean;
  adminEnabled: boolean;
  templateId: string;
  adminUids: string[];
  superAdminUids: string[];
  defaultTournamentType: "round_robin" | "knockout" | "hybrid";
  ageGroups: string[];
  divisions: string[];
  stats: {
    activeTournaments: number;
    activeLeagues: number;
    totalTeams: number;
    totalPlayers: number;
    totalMatches: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 5.2 League Type

```typescript
// src/types/league.ts
import { Timestamp } from "firebase/firestore";

export interface League {
  id: string;
  federationId: string;
  name: string;
  slug: string;
  category: "adult" | "youth" | "mixed";
  sportType: string;
  gender: "men" | "women" | "mixed";
  ageGroup: string;
  description?: string;
  competitionType: "league" | "cup";
  status: "draft" | "active" | "completed" | "cancelled";
  visible: boolean;
  currentSeasonId?: string;
  totalSeasons: number;
  totalTeams: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 5.3 Match Type

```typescript
// src/types/match.ts
import { Timestamp } from "firebase/firestore";

export interface Match {
  id: string;
  federationId: string;
  tournamentId?: string;
  seasonId?: string;
  matchNumber: number;
  round?: number;
  group?: string;
  groupId?: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  matchDate: Timestamp;
  matchTime: string;
  venue: string;
  venueId?: string;
  referee?: string;
  refereeId?: string;
  status: "scheduled" | "live" | "completed" | "cancelled" | "postponed";
  homeScore?: number;
  awayScore?: number;
  homeScoreDetail?: {
    q1?: number;
    q2?: number;
    q3?: number;
    q4?: number;
    ot?: number;
  };
  awayScoreDetail?: {
    q1?: number;
    q2?: number;
    q3?: number;
    q4?: number;
    ot?: number;
  };
  attendance?: number;
  weather?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

---

## 6️⃣ Repository Layer

### 6.1 Repository 구조

```
src/lib/repositories/
  ├─ federationRepository.ts
  ├─ leagueRepository.ts
  ├─ seasonRepository.ts
  ├─ teamRepository.ts
  ├─ playerRepository.ts
  ├─ matchRepository.ts
  ├─ tournamentRepository.ts
  ├─ noticeRepository.ts
  ├─ documentRepository.ts
  └─ standingRepository.ts
```

### 6.2 Example Repository

```typescript
// src/lib/repositories/leagueRepository.ts
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp 
} from "firebase/firestore";
import { League } from "@/types/league";

const db = getFirestore();

export const leagueRepository = {
  // Get all leagues
  async getLeagues(federationId: string): Promise<League[]> {
    const ref = collection(db, `federations/${federationId}/leagues`);
    const q = query(ref, where("status", "==", "active"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as League[];
  },
  
  // Get league by ID
  async getLeague(federationId: string, leagueId: string): Promise<League | null> {
    const ref = doc(db, `federations/${federationId}/leagues`, leagueId);
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as League;
    }
    return null;
  },
  
  // Create league
  async createLeague(federationId: string, data: Omit<League, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const ref = collection(db, `federations/${federationId}/leagues`);
    const docRef = await addDoc(ref, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  },
  
  // Update league
  async updateLeague(
    federationId: string, 
    leagueId: string, 
    data: Partial<League>
  ): Promise<void> {
    const ref = doc(db, `federations/${federationId}/leagues`, leagueId);
    await updateDoc(ref, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  },
  
  // Delete league
  async deleteLeague(federationId: string, leagueId: string): Promise<void> {
    const ref = doc(db, `federations/${federationId}/leagues`, leagueId);
    await deleteDoc(ref);
  },
};
```

### 6.3 Match Repository

```typescript
// src/lib/repositories/matchRepository.ts
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp 
} from "firebase/firestore";
import { Match } from "@/types/match";

const db = getFirestore();

export const matchRepository = {
  // Get matches by date
  async getMatchesByDate(
    federationId: string, 
    date: Date
  ): Promise<Match[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const ref = collection(db, `federations/${federationId}/matches`);
    const q = query(
      ref,
      where("matchDate", ">=", Timestamp.fromDate(startOfDay)),
      where("matchDate", "<=", Timestamp.fromDate(endOfDay)),
      orderBy("matchDate", "asc"),
      orderBy("matchTime", "asc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Match[];
  },
  
  // Get team matches
  async getTeamMatches(
    federationId: string,
    teamId: string
  ): Promise<Match[]> {
    const ref = collection(db, `federations/${federationId}/matches`);
    const q = query(
      ref,
      where("homeTeamId", "==", teamId),
      orderBy("matchDate", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Match[];
  },
  
  // Update match result
  async updateMatchResult(
    federationId: string,
    matchId: string,
    result: {
      homeScore: number;
      awayScore: number;
      status: "completed";
    }
  ): Promise<void> {
    const ref = doc(db, `federations/${federationId}/matches`, matchId);
    await updateDoc(ref, {
      ...result,
      updatedAt: Timestamp.now(),
    });
  },
};
```

---

## ✅ Production Data Schema 완료

### 완성된 스키마

- ✅ Federation (최상위)
- ✅ League
- ✅ Season
- ✅ Team
- ✅ Player
- ✅ Match
- ✅ Standing
- ✅ Tournament
- ✅ Notice
- ✅ Document
- ✅ Sponsor
- ✅ Venue
- ✅ Referee
- ✅ Admin
- ✅ AI Agent

### Repository 패턴

- ✅ Repository Layer 구조
- ✅ Example Repository 구현
- ✅ CRUD 함수 예시

---

**작성일**: 2024년  
**상태**: ✅ YAGO Production Data Schema 완료

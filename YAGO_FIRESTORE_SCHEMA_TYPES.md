# 🗄️ YAGO VIBE SPORTS - Firestore 실제 데이터 스키마 + TypeScript 타입

> **작성일**: 2024년  
> **목적**: Cursor, Backend, AI, Frontend가 모두 같은 데이터 구조로 개발

---

## 📋 목차

1. [전체 컬렉션 구조](#1-전체-컬렉션-구조)
2. [핵심 타입 정의](#2-핵심-타입-정의)
3. [Sub-collection 타입](#3-sub-collection-타입)
4. [인덱스 전략](#4-인덱스-전략)

---

## 1️⃣ 전체 컬렉션 구조

### Firestore 경로 구조

```
federations/{federationId}
  ├─ pages/{pageId}
  ├─ menus/{menuId}
  ├─ notices/{noticeId}
  ├─ tournaments/{tournamentId}
  │   ├─ groups/{groupId}
  │   ├─ brackets/{bracketId}
  │   └─ scheduleJobs/{jobId}
  ├─ leagues/{leagueId}
  │   └─ seasons/{seasonId}
  │       ├─ teams/{teamId}
  │       ├─ matches/{matchId}
  │       │   ├─ events/{eventId}
  │       │   └─ lineups/{playerId}
  │       ├─ standings/{teamId}
  │       └─ stats/{statId}
  ├─ teams/{teamId}
  │   └─ roster/{playerId}
  ├─ players/{playerId}
  ├─ matches/{matchId}
  ├─ documents/{documentId}
  ├─ sponsors/{sponsorId}
  ├─ staff/{staffId}
  ├─ admins/{adminId}
  ├─ aiAgents/{agentId}
  └─ settings/{settingId}
```

---

## 2️⃣ 핵심 타입 정의

### 2.1 Federation

```typescript
// src/types/federation.ts
import { Timestamp } from "firebase/firestore";

export interface Federation {
  id: string;
  name: string;
  slug: string;
  region: string;
  sportType: "football" | "futsal" | "basketball" | "baseball" | "volleyball";
  status: "active" | "inactive" | "suspended";
  
  // Visual
  logoUrl?: string;
  heroImageUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  
  // Info
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  website?: string;
  
  // Settings
  homepageVisible: boolean;
  adminEnabled: boolean;
  templateId: string;
  
  // Permissions
  adminUids: string[];
  superAdminUids: string[];
  
  // Defaults
  defaultTournamentType: "round_robin" | "knockout" | "hybrid";
  ageGroups: string[];
  divisions: string[];
  
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

### 2.2 League

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

### 2.3 Season

```typescript
// src/types/season.ts
import { Timestamp } from "firebase/firestore";

export interface Season {
  id: string;
  federationId: string;
  leagueId: string;
  name: string;
  slug: string;
  year: number;
  seasonNumber: number;
  
  // Dates
  startDate: Timestamp;
  endDate: Timestamp;
  registrationStart: Timestamp;
  registrationEnd: Timestamp;
  
  // Limits
  maxTeams: number;
  minTeams: number;
  
  // Rules
  scheduleType: "round_robin" | "custom";
  roundsPerTeam: number;
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
  tieBreakRules: string[];
  
  status: "draft" | "registration" | "ongoing" | "completed" | "cancelled";
  visible: boolean;
  
  // Stats
  totalMatches: number;
  completedMatches: number;
  registeredTeams: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 2.4 Team

```typescript
// src/types/team.ts
import { Timestamp } from "firebase/firestore";

export interface Team {
  id: string;
  federationId: string;
  name: string;
  slug: string;
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

### 2.5 Player

```typescript
// src/types/player.ts
import { Timestamp } from "firebase/firestore";

export interface Player {
  id: string;
  federationId: string;
  userId?: string;
  name: string;
  photoUrl?: string;
  
  // Personal
  dateOfBirth?: Timestamp;
  position?: string[]; // ["FW", "MF", "DF", "GK"]
  jerseyNumber?: number;
  height?: number;
  weight?: number;
  nationality?: string;
  
  status: "active" | "inactive" | "suspended";
  
  // Stats
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

### 2.6 Match

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
  
  // Teams
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  
  // Schedule
  matchDate: Timestamp;
  matchTime: string;
  venue: string;
  venueId?: string;
  referee?: string;
  
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

### 2.7 Tournament

```typescript
// src/types/tournament.ts
import { Timestamp } from "firebase/firestore";

export interface Tournament {
  id: string;
  federationId: string;
  name: string;
  slug: string;
  category: "adult" | "youth" | "mixed";
  competitionType: "league" | "knockout" | "hybrid";
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
  teamCount: number;
  
  // Options
  entryFee?: number;
  prizePool?: number;
  useSeeding: boolean;
  thirdPlaceMatch: boolean;
  penaltyShootout: boolean;
  allowDraw: boolean;
  
  status: "draft" | "registration" | "ongoing" | "completed" | "cancelled";
  visible: boolean;
  
  // Format
  format?: "round_robin" | "knockout" | "hybrid";
  groupCount?: number;
  teamsPerGroup?: number;
  advancingTeamsPerGroup?: number;
  bracketType?: "single" | "double" | "round_robin";
  
  // Stats
  totalMatches: number;
  completedMatches: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 2.8 Standing

```typescript
// src/types/standing.ts
import { Timestamp } from "firebase/firestore";

export interface Standing {
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
  goalDifference: number;
  points: number;
  
  form: string[]; // ["W", "W", "L", "D", "W"]
  headToHead?: Record<string, number>;
  
  lastUpdated: Timestamp;
}
```

### 2.9 Notice

```typescript
// src/types/notice.ts
import { Timestamp } from "firebase/firestore";

export interface Notice {
  id: string;
  federationId: string;
  title: string;
  content: string;
  category: "general" | "tournament" | "registration" | "result" | "discipline";
  isPinned: boolean;
  attachments?: string[];
  
  viewCount: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 2.10 Document

```typescript
// src/types/document.ts
import { Timestamp } from "firebase/firestore";

export interface Document {
  id: string;
  federationId: string;
  title: string;
  content?: string;
  fileUrl?: string;
  category: "rule" | "regulation" | "form" | "notice" | "other";
  tags: string[];
  
  downloadCount: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

---

## 3️⃣ Sub-collection 타입

### 3.1 Match Event

```typescript
// src/types/matchEvent.ts
import { Timestamp } from "firebase/firestore";

export interface MatchEvent {
  id: string;
  matchId: string;
  eventType: "goal" | "assist" | "yellow_card" | "red_card" | 
             "substitution" | "penalty" | "own_goal";
  minute: number;
  playerId?: string;
  playerName?: string;
  teamId: string;
  teamName: string;
  description?: string;
  
  createdAt: Timestamp;
}
```

### 3.2 Match Lineup

```typescript
// src/types/matchLineup.ts
import { Timestamp } from "firebase/firestore";

export interface MatchLineup {
  id: string;
  matchId: string;
  teamId: string;
  playerId: string;
  playerName: string;
  position: string;
  jerseyNumber: number;
  isStarting: boolean;
  substitutionMinute?: number;
  
  createdAt: Timestamp;
}
```

### 3.3 Group

```typescript
// src/types/group.ts
import { Timestamp } from "firebase/firestore";

export interface Group {
  id: string;
  tournamentId: string;
  name: string; // "A조", "B조"
  teamIds: string[];
  advancingTeams: number;
  standings: TeamStanding[];
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TeamStanding {
  teamId: string;
  teamName: string;
  rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}
```

### 3.4 Bracket

```typescript
// src/types/bracket.ts
import { Timestamp } from "firebase/firestore";

export interface Bracket {
  id: string;
  tournamentId: string;
  round: number;
  roundName: string; // "8강", "4강", "결승"
  matchNumber: number;
  homeTeamId?: string;
  awayTeamId?: string;
  homeSource: string; // "A1" or previous match ID
  awaySource: string;
  nextMatchId?: string;
  
  status: "scheduled" | "live" | "completed";
  homeScore?: number;
  awayScore?: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3.5 AI Agent

```typescript
// src/types/aiAgent.ts
import { Timestamp } from "firebase/firestore";

export interface AIAgent {
  id: string;
  federationId: string;
  name: string;
  agentType: "general-assistant" | "tournament-guide" | "match-ops" | 
             "team-registration" | "player-registration" | "rules-docs" | 
             "admin-ops" | "sponsor-assistant";
  enabled: boolean;
  scope: "public" | "admin";
  knowledgeSources: string[];
  uiPlacement: "homepage-chat" | "admin-panel" | "tournament-page";
  
  config: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt?: string;
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 4️⃣ 인덱스 전략

### firestore.indexes.json

```json
{
  "indexes": [
    {
      "collectionGroup": "notices",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "federationId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "isPinned",
          "order": "DESCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "federationId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "matchDate",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "standings",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "federationId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "seasonId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "rank",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "teams",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "federationId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "tournaments",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "federationId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "startDate",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## ✅ 타입 정의 완료

### 완성된 타입

- ✅ Federation
- ✅ League
- ✅ Season
- ✅ Team
- ✅ Player
- ✅ Match
- ✅ Tournament
- ✅ Standing
- ✅ Notice
- ✅ Document
- ✅ MatchEvent
- ✅ MatchLineup
- ✅ Group
- ✅ Bracket
- ✅ AIAgent

### 사용 방법

```typescript
// src/services/federationService.ts
import { Federation } from "@/types/federation";
import { getFirestore, doc, getDoc } from "firebase/firestore";

export async function getFederation(
  federationId: string
): Promise<Federation | null> {
  const db = getFirestore();
  const docRef = doc(db, "federations", federationId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Federation;
  }
  
  return null;
}
```

---

**작성일**: 2024년  
**상태**: ✅ Firestore 실제 데이터 스키마 + TypeScript 타입 완료

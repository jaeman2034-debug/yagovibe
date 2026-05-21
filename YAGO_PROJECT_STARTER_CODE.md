# 🚀 YAGO VIBE SPORTS - 실제 프로젝트 Starter 코드

> **작성일**: 2024년  
> **목적**: Cursor에서 바로 프로젝트 생성 및 개발 시작 가능한 실제 코드 기반

---

## 📋 목차

1. [프로젝트 생성](#1-프로젝트-생성)
2. [전체 프로젝트 구조](#2-전체-프로젝트-구조)
3. [핵심 파일 코드](#3-핵심-파일-코드)
4. [Firebase 설정](#4-firebase-설정)
5. [Repository Layer](#5-repository-layer)
6. [Service Layer](#6-service-layer)

---

## 1️⃣ 프로젝트 생성

### Cursor 프롬프트

```
Create a Next.js 14 project with TypeScript and TailwindCSS for YAGO VIBE SPORTS platform.

Project setup:
- Next.js 14 with App Router
- TypeScript
- TailwindCSS
- src directory structure
- ESLint

Install dependencies:
- firebase (Firestore, Auth, Storage)
- @tanstack/react-query (data fetching)
- zod (validation)
- date-fns (date utilities)
- lucide-react (icons)
- clsx tailwind-merge (className utilities)
```

### 터미널 명령어

```bash
npx create-next-app@latest yago-vibe-sports --typescript --tailwind --app --src-dir
cd yago-vibe-sports
npm install firebase @tanstack/react-query zod date-fns lucide-react clsx tailwind-merge
```

---

## 2️⃣ 전체 프로젝트 구조

### 완전한 폴더 구조

```
yago-vibe-sports/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   │
│   │   ├── (platform)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   │
│   │   │   ├── sports/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   └── federations/
│   │   │       ├── page.tsx
│   │   │       └── [federationId]/
│   │   │           ├── layout.tsx
│   │   │           ├── page.tsx
│   │   │           ├── about/
│   │   │           │   └── page.tsx
│   │   │           ├── notices/
│   │   │           │   ├── page.tsx
│   │   │           │   └── [noticeId]/
│   │   │           │       └── page.tsx
│   │   │           ├── tournaments/
│   │   │           │   ├── page.tsx
│   │   │           │   └── [tournamentId]/
│   │   │           │       └── page.tsx
│   │   │           ├── matches/
│   │   │           │   ├── page.tsx
│   │   │           │   └── [matchId]/
│   │   │           │       └── page.tsx
│   │   │           ├── standings/
│   │   │           │   └── page.tsx
│   │   │           ├── clubs/
│   │   │           │   ├── page.tsx
│   │   │           │   └── [teamId]/
│   │   │           │       └── page.tsx
│   │   │           ├── docs/
│   │   │           │   └── page.tsx
│   │   │           ├── sponsors/
│   │   │           │   └── page.tsx
│   │   │           │
│   │   │           └── admin/
│   │   │               ├── layout.tsx
│   │   │               ├── page.tsx
│   │   │               ├── leagues/
│   │   │               │   └── page.tsx
│   │   │               ├── seasons/
│   │   │               │   ├── page.tsx
│   │   │               │   └── [seasonId]/
│   │   │               │       └── page.tsx
│   │   │               ├── registrations/
│   │   │               │   └── page.tsx
│   │   │               ├── teams/
│   │   │               │   ├── page.tsx
│   │   │               │   └── [teamId]/
│   │   │               │       └── page.tsx
│   │   │               ├── players/
│   │   │               │   └── page.tsx
│   │   │               ├── matches/
│   │   │               │   ├── page.tsx
│   │   │               │   └── [matchId]/
│   │   │               │       └── page.tsx
│   │   │               ├── results/
│   │   │               │   └── page.tsx
│   │   │               ├── standings/
│   │   │               │   └── page.tsx
│   │   │               ├── tournaments/
│   │   │               │   ├── page.tsx
│   │   │               │   └── [tournamentId]/
│   │   │               │       ├── page.tsx
│   │   │               │       ├── draw/
│   │   │               │       │   └── page.tsx
│   │   │               │       ├── schedule/
│   │   │               │       │   └── page.tsx
│   │   │               │       └── bracket/
│   │   │               │           └── page.tsx
│   │   │               └── notices/
│   │   │                   └── page.tsx
│   │   │
│   │   └── platform/
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       └── federations/
│   │           ├── page.tsx
│   │           └── new/
│   │               └── page.tsx
│   │
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── AdminTopbar.tsx
│   │   │   ├── StatCard.tsx
│   │   │   ├── QuickActionGrid.tsx
│   │   │   ├── ApprovalDrawer.tsx
│   │   │   └── ResultEntryPanel.tsx
│   │   │
│   │   ├── federation/
│   │   │   ├── FederationHeader.tsx
│   │   │   ├── FederationTabs.tsx
│   │   │   ├── FederationHero.tsx
│   │   │   ├── ActiveTournaments.tsx
│   │   │   ├── TodayMatches.tsx
│   │   │   ├── CurrentStandings.tsx
│   │   │   ├── FeaturedClubs.tsx
│   │   │   ├── SponsorsBanner.tsx
│   │   │   └── AIChatbot.tsx
│   │   │
│   │   ├── tournaments/
│   │   │   ├── BracketView.tsx
│   │   │   ├── GroupTable.tsx
│   │   │   └── TournamentCard.tsx
│   │   │
│   │   ├── matches/
│   │   │   ├── MatchTable.tsx
│   │   │   ├── MatchCard.tsx
│   │   │   ├── ResultEntry.tsx
│   │   │   └── LineupEditor.tsx
│   │   │
│   │   ├── teams/
│   │   │   ├── TeamTable.tsx
│   │   │   ├── TeamCard.tsx
│   │   │   └── PlayerRoster.tsx
│   │   │
│   │   └── shared/
│   │       ├── DataTable.tsx
│   │       ├── StatusBadge.tsx
│   │       ├── SectionHeader.tsx
│   │       ├── FilterBar.tsx
│   │       ├── NoticeCard.tsx
│   │       ├── LeagueCard.tsx
│   │       ├── StandingTable.tsx
│   │       ├── PlayerTable.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── hooks/
│   │   ├── useFederation.ts
│   │   ├── useLeagues.ts
│   │   ├── useSeasons.ts
│   │   ├── useTeams.ts
│   │   ├── useMatches.ts
│   │   ├── useStandings.ts
│   │   ├── useTournaments.ts
│   │   └── useIsFederationAdmin.ts
│   │
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── config.ts
│   │   │   ├── firebaseClient.ts
│   │   │   └── firebaseAdmin.ts
│   │   │
│   │   ├── repositories/
│   │   │   ├── federationRepository.ts
│   │   │   ├── leagueRepository.ts
│   │   │   ├── seasonRepository.ts
│   │   │   ├── teamRepository.ts
│   │   │   ├── playerRepository.ts
│   │   │   ├── matchRepository.ts
│   │   │   ├── tournamentRepository.ts
│   │   │   ├── noticeRepository.ts
│   │   │   └── standingRepository.ts
│   │   │
│   │   ├── services/
│   │   │   ├── tournamentEngine.ts
│   │   │   ├── scheduleGenerator.ts
│   │   │   └── standingsCalculator.ts
│   │   │
│   │   ├── ai/
│   │   │   ├── federationAssistant.ts
│   │   │   ├── tournamentAgent.ts
│   │   │   └── matchAgent.ts
│   │   │
│   │   ├── mock/
│   │   │   ├── mockFederation.ts
│   │   │   ├── mockLeagues.ts
│   │   │   ├── mockSeasons.ts
│   │   │   ├── mockTeams.ts
│   │   │   ├── mockMatches.ts
│   │   │   └── mockStandings.ts
│   │   │
│   │   └── utils/
│   │       ├── dateUtils.ts
│   │       ├── formatUtils.ts
│   │       ├── validation.ts
│   │       └── cn.ts
│   │
│   └── types/
│       ├── federation.ts
│       ├── league.ts
│       ├── season.ts
│       ├── team.ts
│       ├── player.ts
│       ├── match.ts
│       ├── tournament.ts
│       ├── standing.ts
│       ├── notice.ts
│       └── document.ts
│
├── public/
│   └── images/
│
├── functions/
│   └── src/
│       ├── federation/
│       │   └── createFederation.ts
│       ├── tournament/
│       │   └── generateSchedule.ts
│       ├── match/
│       │   └── updateMatchResult.ts
│       └── ai/
│           └── queryAI.ts
│
├── firestore.rules
├── firestore.indexes.json
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 3️⃣ 핵심 파일 코드

### 3.1 Root Layout

```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "YAGO VIBE SPORTS",
  description: "멀티 협회형 스포츠 운영 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### 3.2 Platform Layout

```typescript
// src/app/(platform)/layout.tsx
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
```

### 3.3 Federation Layout

```typescript
// src/app/(platform)/federations/[federationId]/layout.tsx
import { FederationHeader } from "@/components/federation/FederationHeader";
import { FederationTabs } from "@/components/federation/FederationTabs";

export default function FederationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { federationId: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <FederationHeader federationId={params.federationId} />
      <FederationTabs federationId={params.federationId} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
```

### 3.4 Admin Layout

```typescript
// src/app/(platform)/federations/[federationId]/admin/layout.tsx
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

export default function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { federationId: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar federationId={params.federationId} />
      <div className="lg:pl-64">
        <AdminTopbar federationId={params.federationId} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## 4️⃣ Firebase 설정

### 4.1 Firebase Client Config

```typescript
// src/lib/firebase/config.ts
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
```

### 4.2 Firebase Client

```typescript
// src/lib/firebase/firebaseClient.ts
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { firebaseConfig } from "./config";

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
```

---

## 5️⃣ Repository Layer

### 5.1 League Repository

```typescript
// src/lib/repositories/leagueRepository.ts
import {
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
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { League } from "@/types/league";

export const leagueRepository = {
  // Get all leagues
  async getLeagues(federationId: string): Promise<League[]> {
    const ref = collection(db, `federations/${federationId}/leagues`);
    const q = query(
      ref,
      where("status", "==", "active"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
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
  async createLeague(
    federationId: string,
    data: Omit<League, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
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

### 5.2 Match Repository

```typescript
// src/lib/repositories/matchRepository.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { Match } from "@/types/match";

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
    return snapshot.docs.map((doc) => ({
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
    return snapshot.docs.map((doc) => ({
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

## 6️⃣ Service Layer

### 6.1 Tournament Engine

```typescript
// src/lib/services/tournamentEngine.ts
import { Team } from "@/types/team";
import { Match } from "@/types/match";

export function generateKnockoutBracket(teams: Team[]): Match[] {
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  const matches: Match[] = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push({
      id: `match-${i / 2 + 1}`,
      homeTeamId: shuffled[i].id,
      awayTeamId: shuffled[i + 1]?.id || "",
      homeTeamName: shuffled[i].name,
      awayTeamName: shuffled[i + 1]?.name || "",
      status: "scheduled",
    } as Match);
  }

  return matches;
}

export function generateRoundRobin(teams: Team[]): Match[] {
  const matches: Match[] = [];
  const n = teams.length;
  const isOdd = n % 2 === 1;
  const workingTeams = isOdd ? [...teams, { id: "BYE", name: "BYE" } as Team] : teams;
  const totalRounds = n - 1;

  for (let round = 1; round <= totalRounds; round++) {
    for (let i = 0; i < workingTeams.length / 2; i++) {
      const home = workingTeams[i];
      const away = workingTeams[workingTeams.length - 1 - i];

      if (home.id !== "BYE" && away.id !== "BYE") {
        matches.push({
          id: `match-${matches.length + 1}`,
          round,
          homeTeamId: home.id,
          awayTeamId: away.id,
          homeTeamName: home.name,
          awayTeamName: away.name,
          status: "scheduled",
        } as Match);
      }
    }

    // Rotate teams
    const last = workingTeams.pop()!;
    workingTeams.splice(1, 0, last);
  }

  return matches;
}
```

### 6.2 Standings Calculator

```typescript
// src/lib/services/standingsCalculator.ts
import { Match } from "@/types/match";
import { Standing } from "@/types/standing";

export function calculateStandings(
  matches: Match[],
  teams: string[]
): Standing[] {
  const standingsMap = new Map<string, Standing>();

  // Initialize standings
  teams.forEach((teamId) => {
    standingsMap.set(teamId, {
      id: teamId,
      teamId,
      teamName: "",
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
    });
  });

  // Process matches
  matches
    .filter((m) => m.status === "completed")
    .forEach((match) => {
      const home = standingsMap.get(match.homeTeamId)!;
      const away = standingsMap.get(match.awayTeamId)!;

      home.played++;
      away.played++;
      home.goalsFor += match.homeScore || 0;
      home.goalsAgainst += match.awayScore || 0;
      away.goalsFor += match.awayScore || 0;
      away.goalsAgainst += match.homeScore || 0;

      if (match.homeScore! > match.awayScore!) {
        home.wins++;
        home.points += 3;
        home.form.push("W");
        away.losses++;
        away.form.push("L");
      } else if (match.homeScore! < match.awayScore!) {
        away.wins++;
        away.points += 3;
        away.form.push("W");
        home.losses++;
        home.form.push("L");
      } else {
        home.draws++;
        home.points += 1;
        home.form.push("D");
        away.draws++;
        away.points += 1;
        away.form.push("D");
      }
    });

  // Calculate goal difference
  standingsMap.forEach((standing) => {
    standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
    standing.form = standing.form.slice(-5);
  });

  // Sort by points, goal difference, goals for
  const standings = Array.from(standingsMap.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  // Assign ranks
  standings.forEach((standing, index) => {
    standing.rank = index + 1;
  });

  return standings;
}
```

---

## ✅ 프로젝트 Starter 코드 완료

### 완성된 구조

- ✅ 완전한 폴더 구조
- ✅ 핵심 Layout 파일 (4개)
- ✅ Firebase 설정
- ✅ Repository Layer 예시 (2개)
- ✅ Service Layer 예시 (2개)

### 다음 단계

1. **타입 파일 생성**: `YAGO_PRODUCTION_DATA_SCHEMA.md` 참고
2. **나머지 Repository 생성**: 동일한 패턴으로 확장
3. **컴포넌트 구현**: `CURSOR_DEVELOPMENT_PROMPT_PACKAGE.md` 참고

---

**작성일**: 2024년  
**상태**: ✅ YAGO 실제 프로젝트 Starter 코드 완료

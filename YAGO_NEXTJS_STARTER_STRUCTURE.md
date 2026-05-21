# 🚀 YAGO VIBE SPORTS - Next.js 프로젝트 Starter 구조

> **작성일**: 2024년  
> **목적**: Cursor에서 한 번에 프로젝트를 생성할 수 있는 Starter 구조

---

## 📋 목차

1. [프로젝트 초기화](#1-프로젝트-초기화)
2. [폴더 구조](#2-폴더-구조)
3. [기본 Layout](#3-기본-layout)
4. [Core Components](#4-core-components)
5. [타입 정의](#5-타입-정의)
6. [Repository Layer](#6-repository-layer)
7. [Mock 데이터](#7-mock-데이터)

---

## 1️⃣ 프로젝트 초기화

### Cursor 프롬프트

```
Create a Next.js 14 project with TypeScript and TailwindCSS for YAGO VIBE SPORTS platform.

Project name: yago-vibe-spt
Use App Router
Install dependencies:
- lucide-react (icons)
- date-fns (date utilities)
- clsx tailwind-merge (className utilities)
- firebase (Firestore)

Create the complete folder structure as specified in YAGO_PRODUCTION_BUILD_ROADMAP.md
```

### 초기 명령어

```bash
npx create-next-app@latest yago-vibe-spt --typescript --tailwind --app --no-src-dir
cd yago-vibe-spt
npm install lucide-react date-fns clsx tailwind-merge
npm install firebase
```

---

## 2️⃣ 폴더 구조

### 전체 구조

```
yago-vibe-spt/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (platform)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── sports/
│   │   │   └── page.tsx
│   │   └── federations/
│   │       ├── page.tsx
│   │       └── [federationId]/
│   │           ├── page.tsx
│   │           ├── about/
│   │           │   └── page.tsx
│   │           ├── notices/
│   │           │   ├── page.tsx
│   │           │   └── [noticeId]/
│   │           │       └── page.tsx
│   │           ├── tournaments/
│   │           │   ├── page.tsx
│   │           │   └── [tournamentId]/
│   │           │       └── page.tsx
│   │           ├── matches/
│   │           │   ├── page.tsx
│   │           │   └── [matchId]/
│   │           │       └── page.tsx
│   │           ├── standings/
│   │           │   └── page.tsx
│   │           ├── clubs/
│   │           │   ├── page.tsx
│   │           │   └── [teamId]/
│   │           │       └── page.tsx
│   │           ├── docs/
│   │           │   └── page.tsx
│   │           ├── sponsors/
│   │           │   └── page.tsx
│   │           └── admin/
│   │               ├── layout.tsx
│   │               ├── page.tsx
│   │               ├── leagues/
│   │               │   └── page.tsx
│   │               ├── seasons/
│   │               │   └── page.tsx
│   │               ├── registrations/
│   │               │   └── page.tsx
│   │               ├── teams/
│   │               │   └── page.tsx
│   │               ├── players/
│   │               │   └── page.tsx
│   │               ├── matches/
│   │               │   └── page.tsx
│   │               ├── results/
│   │               │   └── page.tsx
│   │               ├── standings/
│   │               │   └── page.tsx
│   │               ├── tournaments/
│   │               │   ├── page.tsx
│   │               │   └── [tournamentId]/
│   │               │       ├── page.tsx
│   │               │       ├── draw/
│   │               │       │   └── page.tsx
│   │               │       ├── schedule/
│   │               │       │   └── page.tsx
│   │               │       └── bracket/
│   │               │           └── page.tsx
│   │               └── notices/
│   │                   └── page.tsx
│   └── platform/
│       ├── layout.tsx
│       ├── page.tsx
│       └── federations/
│           ├── page.tsx
│           └── new/
│               └── page.tsx
│
├── components/
│   ├── federation/
│   │   ├── FederationHeader.tsx
│   │   ├── FederationTabs.tsx
│   │   ├── FederationHero.tsx
│   │   ├── ActiveTournaments.tsx
│   │   ├── TodayMatches.tsx
│   │   ├── CurrentStandings.tsx
│   │   ├── FeaturedClubs.tsx
│   │   ├── SponsorsBanner.tsx
│   │   └── AIChatbot.tsx
│   ├── admin/
│   │   ├── AdminSidebar.tsx
│   │   ├── AdminTopbar.tsx
│   │   ├── StatCard.tsx
│   │   ├── QuickActionGrid.tsx
│   │   ├── ApprovalDrawer.tsx
│   │   └── ResultEntryPanel.tsx
│   └── shared/
│       ├── DataTable.tsx
│       ├── StatusBadge.tsx
│       ├── SectionHeader.tsx
│       ├── FilterBar.tsx
│       ├── NoticeCard.tsx
│       ├── LeagueCard.tsx
│       ├── TournamentCard.tsx
│       ├── MatchCard.tsx
│       ├── StandingTable.tsx
│       ├── TeamCard.tsx
│       ├── PlayerTable.tsx
│       ├── BracketView.tsx
│       ├── LoadingSpinner.tsx
│       └── ErrorBoundary.tsx
│
├── hooks/
│   ├── useFederation.ts
│   ├── useLeagues.ts
│   ├── useSeasons.ts
│   ├── useTeams.ts
│   ├── useMatches.ts
│   ├── useStandings.ts
│   ├── useTournaments.ts
│   └── useIsFederationAdmin.ts
│
├── lib/
│   ├── firebase/
│   │   ├── config.ts
│   │   └── firestore.ts
│   ├── repositories/
│   │   ├── federationRepository.ts
│   │   ├── leagueRepository.ts
│   │   ├── seasonRepository.ts
│   │   ├── teamRepository.ts
│   │   ├── playerRepository.ts
│   │   ├── matchRepository.ts
│   │   ├── tournamentRepository.ts
│   │   ├── noticeRepository.ts
│   │   └── standingRepository.ts
│   ├── mock/
│   │   ├── mockFederation.ts
│   │   ├── mockLeagues.ts
│   │   ├── mockSeasons.ts
│   │   ├── mockTeams.ts
│   │   ├── mockMatches.ts
│   │   └── mockStandings.ts
│   └── utils/
│       ├── dateUtils.ts
│       ├── formatUtils.ts
│       └── validation.ts
│
├── types/
│   ├── federation.ts
│   ├── league.ts
│   ├── season.ts
│   ├── team.ts
│   ├── player.ts
│   ├── match.ts
│   ├── tournament.ts
│   ├── standing.ts
│   ├── notice.ts
│   └── document.ts
│
├── public/
│   └── images/
│
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 3️⃣ 기본 Layout

### 3.1 Root Layout

```typescript
// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
```

### 3.2 Platform Layout

```typescript
// app/(platform)/layout.tsx
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
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
// app/(platform)/federations/[federationId]/layout.tsx
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
      <main>
        {children}
      </main>
    </div>
  );
}
```

### 3.4 Admin Layout

```typescript
// app/(platform)/federations/[federationId]/admin/layout.tsx
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

## 4️⃣ Core Components

### 4.1 StatCard

```typescript
// components/shared/StatCard.tsx
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({ title, value, icon, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <p className={`text-sm mt-1 ${trend.isPositive ? "text-green-600" : "text-red-600"}`}>
              {trend.isPositive ? "+" : ""}{trend.value}%
            </p>
          )}
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
    </div>
  );
}
```

### 4.2 DataTable

```typescript
// components/shared/DataTable.tsx
interface ColumnDef<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
  sortable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  pageSize?: number;
}

export function DataTable<T>({
  data,
  columns,
  onRowClick,
  sortable = true,
  filterable = false,
  pagination = false,
  pageSize = 10,
}: DataTableProps<T>) {
  // Implementation
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, index) => (
            <tr
              key={index}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}
            >
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                  {column.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 4.3 StatusBadge

```typescript
// components/shared/StatusBadge.tsx
interface StatusBadgeProps {
  status: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

const statusColors = {
  default: "bg-gray-100 text-gray-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
};

export function StatusBadge({ status, variant = "default" }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[variant]}`}>
      {status}
    </span>
  );
}
```

---

## 5️⃣ 타입 정의

### 타입 파일 생성

모든 타입 파일을 `src/types/` 폴더에 생성:

- `federation.ts`
- `league.ts`
- `season.ts`
- `team.ts`
- `player.ts`
- `match.ts`
- `tournament.ts`
- `standing.ts`
- `notice.ts`
- `document.ts`

**참고**: `YAGO_FIRESTORE_SCHEMA_TYPES.md`의 타입 정의 사용

---

## 6️⃣ Repository Layer

### Repository 파일 생성

모든 Repository 파일을 `src/lib/repositories/` 폴더에 생성:

- `federationRepository.ts`
- `leagueRepository.ts`
- `seasonRepository.ts`
- `teamRepository.ts`
- `playerRepository.ts`
- `matchRepository.ts`
- `tournamentRepository.ts`
- `noticeRepository.ts`
- `standingRepository.ts`

**참고**: `YAGO_PRODUCTION_DATA_SCHEMA.md`의 Repository 예시 사용

---

## 7️⃣ Mock 데이터

### Mock 파일 생성

```typescript
// lib/mock/mockFederation.ts
import { Federation } from "@/types/federation";
import { Timestamp } from "firebase/firestore";

export const mockFederation: Federation = {
  id: "nowon-football",
  name: "노원구 축구협회",
  slug: "nowon-football",
  sportType: "football",
  region: "서울 노원구",
  logoUrl: "/images/nowon-logo.png",
  primaryColor: "#0F172A",
  secondaryColor: "#16A34A",
  description: "노원구 지역 축구 발전을 위한 협회",
  contactPhone: "02-1234-5678",
  contactEmail: "info@nowon-football.kr",
  address: "서울시 노원구 노원로 123",
  status: "active",
  homepageVisible: true,
  adminEnabled: true,
  templateId: "football-association-v1",
  adminUids: ["user_001"],
  superAdminUids: ["user_001"],
  defaultTournamentType: "hybrid",
  ageGroups: ["유소년", "성인"],
  divisions: ["남자부", "여자부", "혼성부"],
  stats: {
    activeTournaments: 2,
    activeLeagues: 3,
    totalTeams: 24,
    totalPlayers: 320,
    totalMatches: 156,
  },
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  createdBy: "user_001",
};
```

---

## ✅ Starter 구조 완료

### 생성된 구조

- ✅ Next.js 프로젝트 구조
- ✅ 폴더 구조 (완전)
- ✅ 기본 Layout (4개)
- ✅ Core Components (3개 예시)
- ✅ 타입 정의 위치
- ✅ Repository Layer 위치
- ✅ Mock 데이터 위치

### 다음 단계

1. **타입 파일 생성**: `YAGO_FIRESTORE_SCHEMA_TYPES.md` 참고
2. **Repository 파일 생성**: `YAGO_PRODUCTION_DATA_SCHEMA.md` 참고
3. **Mock 데이터 생성**: 실제 데이터 구조로 생성
4. **컴포넌트 구현**: `CURSOR_DEVELOPMENT_PROMPT_PACKAGE.md` 참고

---

**작성일**: 2024년  
**상태**: ✅ YAGO Next.js 프로젝트 Starter 구조 완료

# 🚀 노원구 축구협회 플랫폼 MVP 개발 가이드

> **설계 → 실제 개발 시작 - 실행 가능한 프로젝트 만들기**

---

## 📋 목차

1. [Next.js 프로젝트 생성](#1-nextjs-프로젝트-생성)
2. [Firebase / Firestore 설정](#2-firebase--firestore-설정)
3. [App Router 구조 생성](#3-app-router-구조-생성)
4. [UI 컴포넌트 구축](#4-ui-컴포넌트-구축)
5. [Firestore 데이터 연결](#5-firestore-데이터-연결)
6. [MVP 페이지 구현](#6-mvp-페이지-구현)

---

## 1️⃣ Next.js 프로젝트 생성

### 1-1. 프로젝트 생성

```bash
npx create-next-app@latest nowon-football-platform
```

**옵션 선택**:
```
✓ Would you like to use TypeScript? → Yes
✓ Would you like to use ESLint? → Yes
✓ Would you like to use Tailwind CSS? → Yes
✓ Would you like to use `src/` directory? → Yes
✓ Would you like to use App Router? → Yes
✓ Would you like to customize the default import alias? → No
```

### 1-2. 프로젝트 구조

```
nowon-football-platform/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   └── types/
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

### 1-3. 프로젝트 실행

```bash
cd nowon-football-platform
npm run dev
```

**접속**: `http://localhost:3000`

---

## 2️⃣ Firebase / Firestore 설정

### 2-1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름: `nowon-football-platform`
4. Google Analytics 설정 (선택)

### 2-2. Firebase SDK 설치

```bash
npm install firebase
```

### 2-3. Firebase 설정 파일 생성

**파일**: `src/lib/firebase.ts`

```typescript
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// 서비스 export
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
```

### 2-4. 환경 변수 설정

**파일**: `.env.local`

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=nowon-football-platform
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=nowon-football-platform.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

**⚠️ 중요**: `.env.local`은 `.gitignore`에 추가되어 있어야 합니다.

### 2-5. Firestore 보안 규칙 설정

**Firebase Console → Firestore Database → 규칙**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 개발 단계: 모든 읽기/쓰기 허용 (나중에 수정 필요)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 3️⃣ App Router 구조 생성

### 3-1. 폴더 구조 생성

```bash
mkdir -p src/app/a/\[associationSlug\]
mkdir -p src/app/a/\[associationSlug\]/teams
mkdir -p src/app/a/\[associationSlug\]/teams/\[teamId\]
mkdir -p src/app/a/\[associationSlug\]/matches
mkdir -p src/app/a/\[associationSlug\]/matches/\[matchId\]
mkdir -p src/app/a/\[associationSlug\]/players
mkdir -p src/app/a/\[associationSlug\]/players/\[playerId\]
mkdir -p src/app/a/\[associationSlug\]/admin
```

### 3-2. Association Home Page

**파일**: `src/app/a/[associationSlug]/page.tsx`

```typescript
import { Suspense } from "react";

interface AssociationHomePageProps {
  params: Promise<{ associationSlug: string }>;
}

export default async function AssociationHomePage({
  params,
}: AssociationHomePageProps) {
  const { associationSlug } = await params;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="bg-white border rounded-2xl shadow-sm p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            노원구 축구협회
          </h1>
          <p className="text-gray-500 text-lg">
            리그 · 팀 · 선수 · 경기 정보를 한 곳에서 확인하세요
          </p>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <a
            href={`/a/${associationSlug}/teams`}
            className="bg-white border rounded-xl p-6 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900">팀 목록</h3>
            <p className="text-sm text-gray-500 mt-1">24개 팀</p>
          </a>
          <a
            href={`/a/${associationSlug}/matches`}
            className="bg-white border rounded-xl p-6 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900">경기 일정</h3>
            <p className="text-sm text-gray-500 mt-1">오늘 3경기</p>
          </a>
          <a
            href={`/a/${associationSlug}/players`}
            className="bg-white border rounded-xl p-6 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900">선수 목록</h3>
            <p className="text-sm text-gray-500 mt-1">340명</p>
          </a>
          <a
            href={`/a/${associationSlug}/admin`}
            className="bg-white border rounded-xl p-6 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900">관리자</h3>
            <p className="text-sm text-gray-500 mt-1">시스템 관리</p>
          </a>
        </section>

        {/* Today Matches */}
        <section className="bg-white border rounded-2xl shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">오늘 경기</h2>
          <div className="space-y-4">
            <div className="border rounded-xl p-4 flex justify-between items-center">
              <span className="font-semibold">노원FC</span>
              <span className="text-2xl font-bold">VS</span>
              <span className="font-semibold">상계FC</span>
            </div>
            <div className="border rounded-xl p-4 flex justify-between items-center">
              <span className="font-semibold">중계FC</span>
              <span className="text-2xl font-bold">VS</span>
              <span className="font-semibold">하계FC</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
```

---

## 4️⃣ UI 컴포넌트 구축

### 4-1. 컴포넌트 폴더 구조

```bash
mkdir -p src/components/ui
mkdir -p src/components/team
mkdir -p src/components/match
mkdir -p src/components/player
mkdir -p src/components/feed
mkdir -p src/components/admin
```

### 4-2. Card 컴포넌트

**파일**: `src/components/ui/Card.tsx`

```typescript
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  interactive?: boolean;
}

export default function Card({
  children,
  className,
  hover = false,
  interactive = false,
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-2xl shadow-sm p-4",
        hover && "hover:shadow-md transition-shadow",
        interactive && "cursor-pointer hover:-translate-y-0.5 transition-transform",
        className
      )}
    >
      {children}
    </div>
  );
}
```

### 4-3. Button 컴포넌트

**파일**: `src/components/ui/Button.tsx`

```typescript
import { ReactNode, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
}

export default function Button({
  children,
  variant = "default",
  size = "default",
  className,
  ...props
}: ButtonProps) {
  const variantClasses = {
    default: "bg-primary-500 text-white hover:bg-primary-600",
    outline: "border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    ghost: "text-gray-700 hover:bg-gray-100",
  };

  const sizeClasses = {
    sm: "h-9 px-3 text-sm",
    default: "h-10 px-4 text-base",
    lg: "h-12 px-6 text-lg",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

### 4-4. Badge 컴포넌트

**파일**: `src/components/ui/Badge.tsx`

```typescript
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export default function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  const variantClasses = {
    default: "bg-gray-100 text-gray-700 border border-gray-200",
    success: "bg-green-100 text-green-700 border border-green-200",
    warning: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    danger: "bg-red-100 text-red-700 border border-red-200",
    info: "bg-blue-100 text-blue-700 border border-blue-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
```

### 4-5. TeamCard 컴포넌트

**파일**: `src/components/team/TeamCard.tsx`

```typescript
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

interface Team {
  id: string;
  name: string;
  region: string;
  membership: "member" | "pending" | "non-member";
  memberCount?: number;
  logoUrl?: string;
}

interface TeamCardProps {
  team: Team;
  associationSlug: string;
}

export default function TeamCard({ team, associationSlug }: TeamCardProps) {
  return (
    <Link href={`/a/${associationSlug}/teams/${team.id}`}>
      <Card hover interactive>
        <div className="flex items-start gap-4">
          {team.logoUrl ? (
            <img
              src={team.logoUrl}
              alt={team.name}
              className="w-16 h-16 rounded-xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-400">
                {team.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {team.name}
              </h3>
              {team.membership === "member" && (
                <Badge variant="success" className="text-xs">
                  정회원
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-1">{team.region}</p>
            {team.memberCount !== undefined && (
              <p className="text-xs text-gray-400">
                멤버 {team.memberCount}명
              </p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
```

### 4-6. MatchCard 컴포넌트

**파일**: `src/components/match/MatchCard.tsx`

```typescript
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

interface Match {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore?: number;
  awayScore?: number;
  date: string;
  time?: string;
  venueName?: string;
  status: "scheduled" | "live" | "completed";
}

interface MatchCardProps {
  match: Match;
  associationSlug: string;
}

export default function MatchCard({
  match,
  associationSlug,
}: MatchCardProps) {
  const statusLabels = {
    scheduled: "예정",
    live: "LIVE",
    completed: "종료",
  };

  const statusVariants = {
    scheduled: "default" as const,
    live: "danger" as const,
    completed: "default" as const,
  };

  return (
    <Link href={`/a/${associationSlug}/matches/${match.id}`}>
      <Card hover interactive>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-500">
            {match.date} {match.time && `· ${match.time}`}
          </div>
          <Badge variant={statusVariants[match.status]}>
            {statusLabels[match.status]}
          </Badge>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-4">
          <div className="text-right">
            <div className="font-semibold text-gray-900">
              {match.homeTeamName}
            </div>
          </div>
          <div className="text-center">
            {match.status === "completed" &&
            match.homeScore !== undefined ? (
              <div className="text-2xl font-bold text-gray-900">
                {match.homeScore} : {match.awayScore}
              </div>
            ) : (
              <div className="text-lg font-semibold text-gray-400">VS</div>
            )}
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-900">
              {match.awayTeamName}
            </div>
          </div>
        </div>

        {match.venueName && (
          <div className="text-xs text-gray-500">{match.venueName}</div>
        )}
      </Card>
    </Link>
  );
}
```

### 4-7. 유틸리티 함수

**파일**: `src/lib/utils.ts`

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**필요한 패키지 설치**:
```bash
npm install clsx tailwind-merge
```

---

## 5️⃣ Firestore 데이터 연결

### 5-1. Service 함수 생성

**파일**: `src/lib/services/teamService.ts`

```typescript
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Team {
  id: string;
  name: string;
  region: string;
  membership: "member" | "pending" | "non-member";
  associationId: string;
  memberCount?: number;
  logoUrl?: string;
  createdAt?: any;
}

export async function getTeams(
  associationId: string
): Promise<Team[]> {
  const snapshot = await getDocs(collection(db, "teams"));
  
  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter((team) => team.associationId === associationId) as Team[];
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const docRef = doc(db, "teams", teamId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Team;
}
```

**파일**: `src/lib/services/matchService.ts`

```typescript
import { collection, getDocs, doc, getDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Match {
  id: string;
  associationId: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  homeScore?: number;
  awayScore?: number;
  date: string;
  time?: string;
  venueName?: string;
  status: "scheduled" | "live" | "completed";
  createdAt?: any;
}

export async function getMatches(
  associationId: string
): Promise<Match[]> {
  const q = query(
    collection(db, "matches"),
    where("associationId", "==", associationId),
    orderBy("date", "desc")
  );
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Match[];
}

export async function getMatch(matchId: string): Promise<Match | null> {
  const docRef = doc(db, "matches", matchId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Match;
}
```

---

## 6️⃣ MVP 페이지 구현

### 6-1. Teams List Page

**파일**: `src/app/a/[associationSlug]/teams/page.tsx`

```typescript
import { Suspense } from "react";
import TeamCard from "@/components/team/TeamCard";
import { getTeams } from "@/lib/services/teamService";

interface TeamsPageProps {
  params: Promise<{ associationSlug: string }>;
}

async function TeamsList({ associationSlug }: { associationSlug: string }) {
  // TODO: associationSlug로 associationId 조회
  const associationId = "assoc-nowon-football";
  const teams = await getTeams(associationId);

  if (teams.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">등록된 팀이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {teams.map((team) => (
        <TeamCard key={team.id} team={team} associationSlug={associationSlug} />
      ))}
    </div>
  );
}

export default async function TeamsPage({ params }: TeamsPageProps) {
  const { associationSlug } = await params;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">팀 목록</h1>
        <Suspense fallback={<div>로딩 중...</div>}>
          <TeamsList associationSlug={associationSlug} />
        </Suspense>
      </div>
    </main>
  );
}
```

### 6-2. Team Detail Page

**파일**: `src/app/a/[associationSlug]/teams/[teamId]/page.tsx`

```typescript
import { getTeam } from "@/lib/services/teamService";
import { notFound } from "next/navigation";
import Card from "@/components/ui/Card";

interface TeamPageProps {
  params: Promise<{ associationSlug: string; teamId: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = await params;
  const team = await getTeam(teamId);

  if (!team) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="p-8">
          <div className="flex items-start gap-6">
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={team.name}
                className="w-24 h-24 rounded-xl object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-gray-200 flex items-center justify-center">
                <span className="text-4xl font-bold text-gray-400">
                  {team.name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {team.name}
              </h1>
              <p className="text-gray-500 text-lg">{team.region}</p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
```

### 6-3. Matches List Page

**파일**: `src/app/a/[associationSlug]/matches/page.tsx`

```typescript
import { Suspense } from "react";
import MatchCard from "@/components/match/MatchCard";
import { getMatches } from "@/lib/services/matchService";

interface MatchesPageProps {
  params: Promise<{ associationSlug: string }>;
}

async function MatchesList({
  associationSlug,
}: {
  associationSlug: string;
}) {
  const associationId = "assoc-nowon-football";
  const matches = await getMatches(associationId);

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">등록된 경기가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          associationSlug={associationSlug}
        />
      ))}
    </div>
  );
}

export default async function MatchesPage({ params }: MatchesPageProps) {
  const { associationSlug } = await params;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">경기 일정</h1>
        <Suspense fallback={<div>로딩 중...</div>}>
          <MatchesList associationSlug={associationSlug} />
        </Suspense>
      </div>
    </main>
  );
}
```

### 6-4. Tailwind Theme 설정

**파일**: `tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          500: "#0F3D75",
          600: "#0D3563",
        },
        accent: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          500: "#16A34A",
          600: "#15803D",
        },
      },
      borderRadius: {
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## ✅ 개발 체크리스트

### Phase 1: 프로젝트 설정
- [ ] Next.js 프로젝트 생성
- [ ] Firebase 프로젝트 생성
- [ ] Firebase SDK 설치
- [ ] 환경 변수 설정
- [ ] Firestore 보안 규칙 설정

### Phase 2: 기본 구조
- [ ] App Router 폴더 구조 생성
- [ ] Association Home Page 생성
- [ ] 기본 레이아웃 설정

### Phase 3: UI 컴포넌트
- [ ] Card 컴포넌트
- [ ] Button 컴포넌트
- [ ] Badge 컴포넌트
- [ ] TeamCard 컴포넌트
- [ ] MatchCard 컴포넌트

### Phase 4: 데이터 연결
- [ ] teamService 생성
- [ ] matchService 생성
- [ ] Teams List Page 구현
- [ ] Team Detail Page 구현
- [ ] Matches List Page 구현

### Phase 5: 스타일링
- [ ] Tailwind Theme 설정
- [ ] 전역 스타일 설정
- [ ] 반응형 디자인

---

## 🚀 다음 단계

이제 **Firestore 실제 DB 생성 + 샘플 데이터 50개**를 만들어야 합니다.

다음 문서를 확인하세요:
- `FIRESTORE_INIT_SCRIPT.md` - Firestore 초기화 스크립트

---

**작성일**: 2024년  
**상태**: ✅ 개발 가이드 완료 (실행 가능)

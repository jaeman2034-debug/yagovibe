# 🚀 YAGO VIBE SPORTS - Cursor 개발 프롬프트

> **작성일**: 2024년  
> **목적**: 실제 개발 가능한 수준의 Cursor 개발 가이드

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [개발 환경 설정](#2-개발-환경-설정)
3. [폴더 구조](#3-폴더-구조)
4. [핵심 기능 구현 가이드](#4-핵심-기능-구현-가이드)
5. [Firestore 설정](#5-firestore-설정)
6. [Cloud Functions 설정](#6-cloud-functions-설정)
7. [개발 체크리스트](#7-개발-체크리스트)

---

## 1️⃣ 프로젝트 개요

### 프로젝트명
**YAGO VIBE SPORTS - 협회 운영 플랫폼**

### 기술 스택
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Firebase (Firestore + Cloud Functions)
- **Routing**: React Router
- **State Management**: React Hooks + Context API
- **UI Components**: shadcn/ui + Lucide Icons

### 핵심 기능
1. 협회 홈페이지 자동 생성
2. 대회/리그 운영 시스템
3. 경기 일정 및 결과 관리
4. 팀/선수 등록 시스템
5. 순위 및 통계 시스템
6. AI 에이전트 시스템
7. 관리자 대시보드

---

## 2️⃣ 개발 환경 설정

### 필수 패키지 설치

```bash
# React Router
npm install react-router-dom

# Firebase
npm install firebase

# 날짜 처리
npm install date-fns

# 아이콘
npm install lucide-react

# Tailwind CSS (이미 설치되어 있다면 생략)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Firebase 설정

```typescript
// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
```

---

## 3️⃣ 폴더 구조

```
src/
├── app/                    # 앱 설정
│   ├── App.tsx
│   └── providers/
├── pages/                  # 페이지 컴포넌트
│   ├── federations/
│   │   ├── FederationHomePage.tsx
│   │   ├── FederationAboutPage.tsx
│   │   ├── FederationNoticesPage.tsx
│   │   ├── FederationTournamentsPage.tsx
│   │   ├── TournamentDetailPage.tsx
│   │   ├── FederationMatchesPage.tsx
│   │   ├── FederationClubsPage.tsx
│   │   ├── FederationDocsPage.tsx
│   │   ├── FederationSponsorsPage.tsx
│   │   └── FederationAdminDashboard.tsx
│   └── sports/
├── components/             # 재사용 컴포넌트
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
│   └── ui/                # 공통 UI 컴포넌트
├── hooks/                 # 커스텀 훅
│   ├── useFederation.ts
│   ├── useTournaments.ts
│   ├── useMatches.ts
│   ├── useStandings.ts
│   ├── useClubs.ts
│   ├── useSponsors.ts
│   └── useAIChat.ts
├── services/              # Firestore 서비스
│   ├── federationService.ts
│   ├── tournamentService.ts
│   ├── matchService.ts
│   └── teamService.ts
├── types/                 # TypeScript 타입
│   ├── federation.ts
│   ├── tournament.ts
│   ├── match.ts
│   └── team.ts
├── lib/                   # 유틸리티
│   ├── firebase.ts
│   └── utils.ts
└── layout/                # 레이아웃 컴포넌트
    ├── Header.tsx
    └── Footer.tsx
```

---

## 4️⃣ 핵심 기능 구현 가이드

### 4-1. Federation 조회 훅

```typescript
// src/hooks/useFederation.ts
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useFederation(federationId: string) {
  const [federation, setFederation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!federationId) {
      setLoading(false);
      return;
    }

    const fetchFederation = async () => {
      try {
        const docRef = doc(db, "federations", federationId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setFederation({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError(new Error("협회를 찾을 수 없습니다."));
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchFederation();
  }, [federationId]);

  return { federation, loading, error };
}
```

### 4-2. Tournaments 조회 훅

```typescript
// src/hooks/useTournaments.ts
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useTournaments(
  federationId: string,
  options: {
    status?: string;
    limit?: number;
  } = {}
) {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!federationId) {
      setLoading(false);
      return;
    }

    const fetchTournaments = async () => {
      try {
        const constraints = [
          where("federationId", "==", federationId),
        ];

        if (options.status) {
          constraints.push(where("status", "==", options.status));
        }

        constraints.push(orderBy("createdAt", "desc"));

        if (options.limit) {
          constraints.push(limit(options.limit));
        }

        const q = query(
          collection(db, "federations", federationId, "tournaments"),
          ...constraints
        );

        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setTournaments(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [federationId, options.status, options.limit]);

  return { tournaments, loading, error };
}
```

### 4-3. Matches 조회 훅

```typescript
// src/hooks/useMatches.ts
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";

export function useMatches(
  federationId: string,
  options: {
    date?: string;
    status?: string;
    limit?: number;
  } = {}
) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!federationId) {
      setLoading(false);
      return;
    }

    const fetchMatches = async () => {
      try {
        const constraints = [
          where("federationId", "==", federationId),
        ];

        if (options.date) {
          const startOfDay = new Date(options.date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(options.date);
          endOfDay.setHours(23, 59, 59, 999);

          constraints.push(
            where("scheduledDate", ">=", Timestamp.fromDate(startOfDay)),
            where("scheduledDate", "<=", Timestamp.fromDate(endOfDay))
          );
        }

        if (options.status) {
          constraints.push(where("status", "==", options.status));
        }

        constraints.push(orderBy("scheduledDate", "asc"));

        if (options.limit) {
          constraints.push(limit(options.limit));
        }

        const q = query(
          collection(db, "federations", federationId, "matches"),
          ...constraints
        );

        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setMatches(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [federationId, options.date, options.status, options.limit]);

  return { matches, loading, error };
}
```

### 4-4. Standings 조회 훅

```typescript
// src/hooks/useStandings.ts
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useStandings(
  federationId: string,
  options: {
    tournamentId?: string;
    leagueId?: string;
    seasonId?: string;
    limit?: number;
  } = {}
) {
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!federationId) {
      setLoading(false);
      return;
    }

    const fetchStandings = async () => {
      try {
        const constraints = [
          where("federationId", "==", federationId),
        ];

        if (options.tournamentId) {
          constraints.push(where("tournamentId", "==", options.tournamentId));
        }

        if (options.leagueId) {
          constraints.push(where("leagueId", "==", options.leagueId));
        }

        if (options.seasonId) {
          constraints.push(where("seasonId", "==", options.seasonId));
        }

        constraints.push(orderBy("rank", "asc"));

        if (options.limit) {
          constraints.push(limit(options.limit));
        }

        const q = query(
          collection(db, "federations", federationId, "standings"),
          ...constraints
        );

        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setStandings(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, [federationId, options.tournamentId, options.leagueId, options.seasonId, options.limit]);

  return { standings, loading, error };
}
```

---

## 5️⃣ Firestore 설정

### 인덱스 생성

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "notices",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "isPinned", "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "tournaments",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "scheduledDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "standings",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "rank", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

### 보안 규칙

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Federations
    match /federations/{federationId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.uid in resource.data.adminUids || 
         request.auth.uid in resource.data.superAdminUids);
      
      // Notices
      match /notices/{noticeId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/federations/$(federationId)).data.adminUids;
        allow update, delete: if request.auth != null && 
          request.resource.data.createdBy == request.auth.uid;
      }
      
      // Tournaments
      match /tournaments/{tournamentId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/federations/$(federationId)).data.adminUids;
      }
      
      // Matches
      match /matches/{matchId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/federations/$(federationId)).data.adminUids;
      }
    }
  }
}
```

---

## 6️⃣ Cloud Functions 설정

### createFederation 함수

```typescript
// functions/src/federation/createFederation.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

export const createFederation = onCall(async (request) => {
  const { data, auth } = request;
  
  if (!auth) {
    throw new HttpsError("unauthenticated", "인증이 필요합니다.");
  }
  
  // 권한 확인
  const userDoc = await db.collection("users").doc(auth.uid).get();
  const userData = userDoc.data();
  
  if (userData?.role !== "ADMIN") {
    throw new HttpsError("permission-denied", "플랫폼 관리자만 협회를 생성할 수 있습니다.");
  }
  
  const input = data;
  
  // Federation 문서 생성
  const federationRef = db.collection("federations").doc();
  const federationId = federationRef.id;
  
  await federationRef.set({
    id: federationId,
    name: input.name,
    slug: input.slug,
    region: input.region,
    sport: input.sport,
    logoUrl: input.logoUrl || null,
    primaryColor: input.primaryColor || "#0F3D75",
    accentColor: input.accentColor || "#16A34A",
    description: input.description || "",
    adminUids: input.adminUids || [auth.uid],
    superAdminUids: [auth.uid],
    defaultTournamentType: input.defaultTournamentType || "round_robin",
    ageGroups: input.ageGroups || ["유소년", "성인"],
    divisions: input.divisions || ["남자부", "여자부", "혼성부"],
    contact: input.contact || {},
    organization: input.organization || {},
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: auth.uid,
  });
  
  // 초기 공지 생성
  await createInitialNotices(federationId, input, auth.uid);
  
  // AI 에이전트 생성
  await createAIAgents(federationId, input);
  
  return {
    success: true,
    federationId,
    message: "협회가 성공적으로 생성되었습니다.",
  };
});

async function createInitialNotices(federationId: string, input: any, createdBy: string) {
  const noticesRef = db.collection(`federations/${federationId}/notices`);
  
  const initialNotices = [
    {
      title: `${input.name} 설립 안내`,
      content: `${input.name}가 정식으로 설립되었습니다.`,
      category: "announcement",
      isPinned: true,
      createdAt: FieldValue.serverTimestamp(),
      createdBy,
      viewCount: 0,
    },
    {
      title: "참가 신청 안내",
      content: "팀 참가 신청은 관리자 대시보드에서 가능합니다.",
      category: "guide",
      isPinned: false,
      createdAt: FieldValue.serverTimestamp(),
      createdBy,
      viewCount: 0,
    },
  ];
  
  for (const notice of initialNotices) {
    await noticesRef.add(notice);
  }
}

async function createAIAgents(federationId: string, input: any) {
  const agentsRef = db.collection(`federations/${federationId}/aiAgents`);
  
  const agents = [
    {
      name: "대표 AI 비서",
      type: "main",
      description: "홈페이지 전체 검색 및 안내",
      status: "active",
      config: {
        federationId,
        federationName: input.name,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    // ... 다른 에이전트들
  ];
  
  for (const agent of agents) {
    await agentsRef.add(agent);
  }
}
```

---

## 7️⃣ 개발 체크리스트

### Phase 1: 기본 구조
- [ ] 프로젝트 설정 및 의존성 설치
- [ ] Firebase 설정
- [ ] 라우팅 구조 설정
- [ ] 기본 레이아웃 컴포넌트 (Header, Footer)

### Phase 2: Federation 페이지
- [ ] FederationHomePage 구현
- [ ] FederationHeader 컴포넌트
- [ ] FederationTabs 컴포넌트
- [ ] FederationHero 컴포넌트
- [ ] ActiveTournaments 컴포넌트
- [ ] TodayMatches 컴포넌트
- [ ] CurrentStandings 컴포넌트
- [ ] FeaturedClubs 컴포넌트
- [ ] SponsorsBanner 컴포넌트
- [ ] AIChatbot 컴포넌트

### Phase 3: 하위 페이지
- [ ] FederationAboutPage
- [ ] FederationNoticesPage
- [ ] FederationTournamentsPage
- [ ] TournamentDetailPage
- [ ] FederationMatchesPage
- [ ] FederationClubsPage
- [ ] FederationDocsPage
- [ ] FederationSponsorsPage

### Phase 4: 관리자 대시보드
- [ ] FederationAdminDashboard
- [ ] AdminSidebar
- [ ] AdminKPICards
- [ ] AdminQuickActions
- [ ] AdminWidgets

### Phase 5: Firestore 통합
- [ ] useFederation 훅
- [ ] useTournaments 훅
- [ ] useMatches 훅
- [ ] useStandings 훅
- [ ] useClubs 훅
- [ ] useSponsors 훅

### Phase 6: Cloud Functions
- [ ] createFederation 함수
- [ ] 초기 데이터 생성 로직
- [ ] AI 에이전트 생성 로직

### Phase 7: AI 통합
- [ ] AI 챗봇 UI
- [ ] AI 메시지 처리
- [ ] AI 에이전트 라우팅

---

## ✅ 개발 팁

### 1. 컴포넌트 재사용
- 공통 UI 컴포넌트는 `components/ui/`에 분리
- Federation 관련 컴포넌트는 `components/federation/`에 분리

### 2. 훅 패턴
- 데이터 조회는 커스텀 훅으로 분리
- 로딩/에러 상태는 훅 내부에서 관리

### 3. 타입 안정성
- 모든 Firestore 문서는 TypeScript 타입으로 정의
- `types/` 폴더에 타입 정의

### 4. 성능 최적화
- 필요한 데이터만 조회 (limit 사용)
- 이미지 lazy loading
- 컴포넌트 lazy loading

### 5. 에러 처리
- 모든 데이터 조회에 에러 처리 추가
- 사용자 친화적인 에러 메시지

---

**작성일**: 2024년  
**상태**: ✅ Cursor 개발 프롬프트 완료

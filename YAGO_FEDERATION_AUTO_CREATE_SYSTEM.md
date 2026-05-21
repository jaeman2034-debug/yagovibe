# 🚀 YAGO VIBE SPORTS - 신규 협회 자동 생성 시스템

> **작성일**: 2024년  
> **목적**: 협회 하나 생성 → 홈페이지 + 운영시스템 + AI 에이전트 자동 생성

---

## 📋 목차

1. [시스템 개요](#1-시스템-개요)
2. [협회 생성 입력값](#2-협회-생성-입력값)
3. [자동 생성 항목](#3-자동-생성-항목)
4. [Firestore 데이터 구조](#4-firestore-데이터-구조)
5. [Cloud Functions 구현](#5-cloud-functions-구현)
6. [템플릿 시스템](#6-템플릿-시스템)
7. [생성 플로우차트](#7-생성-플로우차트)

---

## 1️⃣ 시스템 개요

### 목표

```
협회 생성
→ 공식 홈페이지 자동 생성
→ 대회 시스템 생성
→ AI 운영 자동 생성
```

### 핵심 원칙

1. **최소 입력, 최대 자동화**: 필수 정보만 입력하면 나머지는 자동 생성
2. **템플릿 기반**: 종목별/유형별 템플릿 적용
3. **확장 가능**: 신규 협회도 동일한 구조로 생성

---

## 2️⃣ 협회 생성 입력값

### 필수 입력

```typescript
interface CreateFederationInput {
  // 기본 정보
  name: string;                    // "노원구 축구협회"
  slug: string;                    // "nowon-football"
  region: string;                  // "서울 노원구"
  sport: string;                   // "football"
  
  // 시각적 요소
  logoUrl?: string;                // 협회 로고
  primaryColor?: string;           // "#0F3D75"
  accentColor?: string;            // "#16A34A"
  
  // 소개
  description?: string;            // 협회 소개
  
  // 관리자
  adminUids: string[];             // 관리자 UID 목록
  
  // 기본 설정
  defaultTournamentType?: string;  // "round_robin" | "knockout"
  ageGroups?: string[];           // ["유소년", "성인"]
  divisions?: string[];            // ["남자부", "여자부", "혼성부"]
  
  // 문서 템플릿
  documentTemplates?: {
    tournamentGuideline?: string;
    regulations?: string;
    playerRegistration?: string;
  };
}
```

### 선택 입력

```typescript
interface CreateFederationInput {
  // 조직 정보
  organization?: {
    president?: string;
    vicePresident?: string;
    secretary?: string;
  };
  
  // 연락처
  contact?: {
    address?: string;
    phone?: string;
    email?: string;
  };
  
  // 후원사 초기 데이터
  initialSponsors?: Array<{
    name: string;
    type: "official" | "hospital" | "equipment" | "restaurant";
    logoUrl?: string;
  }>;
}
```

---

## 3️⃣ 자동 생성 항목

### 1. 협회 홈페이지

```
/federations/{federationId}
```

**생성되는 페이지:**
- 홈 탭
- 협회소개 탭
- 공지사항 탭
- 대회/리그 탭
- 경기일정 탭
- 결과/순위 탭
- 참가팀/클럽 탭
- 규정/자료실 탭
- 후원사 탭
- 유소년 탭
- 문의하기 탭

### 2. 관리자 대시보드

```
/federations/{federationId}/admin
```

**생성되는 섹션:**
- 운영 대시보드
- 대회 관리
- 리그 관리
- 시즌 관리
- 팀 승인
- 선수 등록
- 경기 관리
- 결과 입력
- 순위 관리
- 공지 관리
- 조직 관리
- 후원사 관리
- 문의 관리
- AI 운영

### 3. 공지 게시판

```
federations/{federationId}/notices
```

**초기 공지:**
- 협회 설립 안내
- 참가 신청 안내
- 규정 안내

### 4. 대회/리그 모듈

```
federations/{federationId}/tournaments
federations/{federationId}/leagues
```

**기본 구조:**
- 대회 목록
- 대회 상세 페이지
- 대진표 시스템
- 일정 관리

### 5. 팀/선수 등록 모듈

```
federations/{federationId}/teams
federations/{federationId}/players
```

**기본 구조:**
- 팀 등록 시스템
- 선수 등록 시스템
- 승인 워크플로우

### 6. 경기 일정/결과 모듈

```
federations/{federationId}/matches
```

**기본 구조:**
- 경기 일정 관리
- 결과 입력 시스템
- 순위 자동 계산

### 7. 순위/기록 모듈

```
federations/{federationId}/standings
federations/{federationId}/stats
```

**기본 구조:**
- 순위표
- 득점 랭킹
- 도움 랭킹
- 팀/선수 기록

### 8. 규정/자료실 모듈

```
federations/{federationId}/regulations
federations/{federationId}/documents
```

**초기 문서:**
- 대회요강 템플릿
- 대회규정 템플릿
- 선수등록 규정 템플릿
- FAQ 초안

### 9. 후원사/광고 모듈

```
federations/{federationId}/sponsors
```

**기본 구조:**
- 후원사 목록
- 광고 관리
- 제휴 관리

### 10. AI 에이전트 세트

```
federations/{federationId}/aiAgents
```

**생성되는 에이전트:**
- 대표 AI 비서
- 대회 안내 AI
- 경기 운영 AI
- 팀/선수 등록 AI
- 규정 AI
- 협회 행정 AI
- 후원사 AI

---

## 4️⃣ Firestore 데이터 구조

### 협회 문서 생성

```typescript
// federations/{federationId}
{
  id: string;
  name: string;
  slug: string;
  region: string;
  sport: string;
  
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  
  description?: string;
  
  adminUids: string[];
  superAdminUids: string[];
  
  // 기본 설정
  defaultTournamentType: string;
  ageGroups: string[];
  divisions: string[];
  
  // 연락처
  contact?: {
    address?: string;
    phone?: string;
    email?: string;
  };
  
  // 조직 정보
  organization?: {
    president?: string;
    vicePresident?: string;
    secretary?: string;
  };
  
  // 상태
  status: "active" | "inactive";
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 하위 컬렉션 자동 생성

```typescript
// 공지사항
federations/{federationId}/notices/{noticeId}
// 초기 공지 3개 자동 생성

// 대회
federations/{federationId}/tournaments/{tournamentId}
// 빈 컬렉션 생성

// 리그
federations/{federationId}/leagues/{leagueId}
// 빈 컬렉션 생성

// 팀
federations/{federationId}/teams/{teamId}
// 빈 컬렉션 생성

// 선수
federations/{federationId}/players/{playerId}
// 빈 컬렉션 생성

// 경기
federations/{federationId}/matches/{matchId}
// 빈 컬렉션 생성

// 규정/문서
federations/{federationId}/regulations/{regulationId}
// 초기 규정 템플릿 생성

federations/{federationId}/documents/{documentId}
// 초기 문서 템플릿 생성

// 후원사
federations/{federationId}/sponsors/{sponsorId}
// 초기 후원사 데이터 생성 (입력된 경우)

// AI 에이전트
federations/{federationId}/aiAgents/{agentId}
// 7개 에이전트 자동 생성

// 조직/임원
federations/{federationId}/organization/{memberId}
// 조직 정보 생성 (입력된 경우)
```

---

## 5️⃣ Cloud Functions 구현

### createFederation 함수

```typescript
// functions/src/federation/createFederation.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const db = getFirestore();

export const createFederation = onCall(async (request) => {
  const { data, auth } = request;
  
  // 인증 확인
  if (!auth) {
    throw new HttpsError("unauthenticated", "인증이 필요합니다.");
  }
  
  // 권한 확인 (플랫폼 관리자만)
  const userDoc = await db.collection("users").doc(auth.uid).get();
  const userData = userDoc.data();
  
  if (userData?.role !== "ADMIN") {
    throw new HttpsError("permission-denied", "플랫폼 관리자만 협회를 생성할 수 있습니다.");
  }
  
  const input = data as CreateFederationInput;
  
  // 1. Federation 문서 생성
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
  
  // 2. 초기 공지 생성
  await createInitialNotices(federationId, input);
  
  // 3. 초기 규정/문서 생성
  await createInitialRegulations(federationId, input);
  
  // 4. 초기 후원사 생성
  if (input.initialSponsors && input.initialSponsors.length > 0) {
    await createInitialSponsors(federationId, input.initialSponsors);
  }
  
  // 5. AI 에이전트 생성
  await createAIAgents(federationId, input);
  
  // 6. 조직 정보 생성
  if (input.organization) {
    await createOrganization(federationId, input.organization);
  }
  
  return {
    success: true,
    federationId,
    message: "협회가 성공적으로 생성되었습니다.",
  };
});

// 초기 공지 생성
async function createInitialNotices(
  federationId: string,
  input: CreateFederationInput
) {
  const noticesRef = db.collection(`federations/${federationId}/notices`);
  
  const initialNotices = [
    {
      title: `${input.name} 설립 안내`,
      content: `${input.name}가 정식으로 설립되었습니다.`,
      category: "announcement",
      isPinned: true,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: input.adminUids[0],
    },
    {
      title: "참가 신청 안내",
      content: "팀 참가 신청은 관리자 대시보드에서 가능합니다.",
      category: "guide",
      isPinned: false,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: input.adminUids[0],
    },
    {
      title: "규정 안내",
      content: "대회 규정 및 참가 규정은 규정/자료실에서 확인하실 수 있습니다.",
      category: "guide",
      isPinned: false,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: input.adminUids[0],
    },
  ];
  
  for (const notice of initialNotices) {
    await noticesRef.add(notice);
  }
}

// 초기 규정/문서 생성
async function createInitialRegulations(
  federationId: string,
  input: CreateFederationInput
) {
  const regulationsRef = db.collection(`federations/${federationId}/regulations`);
  const documentsRef = db.collection(`federations/${federationId}/documents`);
  
  // 대회요강 템플릿
  await regulationsRef.add({
    title: "대회요강",
    category: "tournament_guideline",
    content: input.documentTemplates?.tournamentGuideline || "대회요강 템플릿",
    createdAt: FieldValue.serverTimestamp(),
    createdBy: input.adminUids[0],
  });
  
  // 대회규정 템플릿
  await regulationsRef.add({
    title: "대회규정",
    category: "tournament_regulation",
    content: input.documentTemplates?.regulations || "대회규정 템플릿",
    createdAt: FieldValue.serverTimestamp(),
    createdBy: input.adminUids[0],
  });
  
  // 선수등록 규정 템플릿
  await regulationsRef.add({
    title: "선수등록 규정",
    category: "player_registration",
    content: input.documentTemplates?.playerRegistration || "선수등록 규정 템플릿",
    createdAt: FieldValue.serverTimestamp(),
    createdBy: input.adminUids[0],
  });
}

// 초기 후원사 생성
async function createInitialSponsors(
  federationId: string,
  sponsors: Array<{ name: string; type: string; logoUrl?: string }>
) {
  const sponsorsRef = db.collection(`federations/${federationId}/sponsors`);
  
  for (const sponsor of sponsors) {
    await sponsorsRef.add({
      name: sponsor.name,
      type: sponsor.type,
      logoUrl: sponsor.logoUrl || null,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
    });
  }
}

// AI 에이전트 생성
async function createAIAgents(
  federationId: string,
  input: CreateFederationInput
) {
  const agentsRef = db.collection(`federations/${federationId}/aiAgents`);
  
  const agents = [
    {
      id: "main_assistant",
      name: "대표 AI 비서",
      type: "main",
      description: "홈페이지 전체 검색 및 안내",
      status: "active",
      config: {
        federationId,
        federationName: input.name,
      },
    },
    {
      id: "tournament_guide",
      name: "대회 안내 AI",
      type: "tournament",
      description: "브로슈어 기반 대회 정보 제공",
      status: "active",
      config: {
        federationId,
        defaultTournamentType: input.defaultTournamentType,
      },
    },
    {
      id: "match_operation",
      name: "경기 운영 AI",
      type: "match",
      description: "운영진용 경기 관리 보조",
      status: "active",
      config: {
        federationId,
      },
    },
    {
      id: "team_player_registration",
      name: "팀/선수 등록 AI",
      type: "registration",
      description: "등록 관리 및 검수",
      status: "active",
      config: {
        federationId,
      },
    },
    {
      id: "regulation_document",
      name: "규정/문서 AI",
      type: "regulation",
      description: "규정 검색 및 해석",
      status: "active",
      config: {
        federationId,
      },
    },
    {
      id: "administration",
      name: "협회 행정 AI",
      type: "administration",
      description: "조직/임원/행사 운영",
      status: "active",
      config: {
        federationId,
      },
    },
    {
      id: "sponsor_partnership",
      name: "후원사 AI",
      type: "sponsor",
      description: "후원사 및 광고 관리",
      status: "active",
      config: {
        federationId,
      },
    },
  ];
  
  for (const agent of agents) {
    await agentsRef.add(agent);
  }
}

// 조직 정보 생성
async function createOrganization(
  federationId: string,
  organization: {
    president?: string;
    vicePresident?: string;
    secretary?: string;
  }
) {
  const orgRef = db.collection(`federations/${federationId}/organization`);
  
  if (organization.president) {
    await orgRef.add({
      role: "president",
      name: organization.president,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  
  if (organization.vicePresident) {
    await orgRef.add({
      role: "vice_president",
      name: organization.vicePresident,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  
  if (organization.secretary) {
    await orgRef.add({
      role: "secretary",
      name: organization.secretary,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
}
```

---

## 6️⃣ 템플릿 시스템

### 종목별 템플릿

```typescript
const sportTemplates = {
  football: {
    defaultTournamentType: "round_robin",
    ageGroups: ["유소년", "성인"],
    divisions: ["남자부", "여자부", "혼성부"],
    positions: ["GK", "DF", "MF", "FW"],
    eventTypes: ["goal", "assist", "yellow_card", "red_card", "substitution"],
  },
  basketball: {
    defaultTournamentType: "knockout",
    ageGroups: ["유소년", "성인"],
    divisions: ["남자부", "여자부"],
    positions: ["PG", "SG", "SF", "PF", "C"],
    eventTypes: ["point", "rebound", "assist", "steal", "block"],
  },
  // ... 다른 종목
};
```

### 문서 템플릿

```typescript
const documentTemplates = {
  tournamentGuideline: `
# 대회요강

## 대회 개요
- 대회명: {tournamentName}
- 기간: {startDate} ~ {endDate}
- 참가 자격: {eligibility}

## 참가비
- 팀당: {fee}원

## 일정
- 참가 신청: {registrationPeriod}
- 대진 추첨: {drawDate}
- 개막전: {openingDate}
  `,
  regulations: `
# 대회규정

## 경기 규칙
- 경기 시간: {matchDuration}분
- 교체 인원: {substitutionLimit}명

## 참가 규정
- 최소 인원: {minPlayers}명
- 최대 인원: {maxPlayers}명
  `,
};
```

---

## 7️⃣ 생성 플로우차트

```
사용자 입력 (Create Federation)
  ↓
권한 확인 (플랫폼 관리자만)
  ↓
입력값 검증
  ↓
┌─────────────────────────────────────────┐
│ 자동 생성 프로세스                       │
│                                         │
│ 1. Federation Document 생성            │
│ 2. 초기 공지 생성 (3개)                 │
│ 3. 초기 규정/문서 생성                  │
│ 4. 초기 후원사 생성 (입력된 경우)       │
│ 5. AI 에이전트 생성 (7개)                │
│ 6. 조직 정보 생성 (입력된 경우)         │
│ 7. 기본 설정 저장                       │
└─────────────────────────────────────────┘
  ↓
생성 완료
  ↓
협회 홈페이지 활성화
  ↓
관리자 대시보드 접근 가능
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] `createFederation` Cloud Function
- [ ] Federation 문서 생성
- [ ] 초기 공지 생성
- [ ] 초기 규정/문서 생성

### Phase 2 (다음)
- [ ] AI 에이전트 생성
- [ ] 조직 정보 생성
- [ ] 후원사 초기 데이터 생성
- [ ] 템플릿 시스템

### Phase 3 (확장)
- [ ] 종목별 템플릿 확장
- [ ] 커스텀 템플릿 지원
- [ ] 대량 생성 API

---

**작성일**: 2024년  
**상태**: ✅ 신규 협회 자동 생성 시스템 설계 완료

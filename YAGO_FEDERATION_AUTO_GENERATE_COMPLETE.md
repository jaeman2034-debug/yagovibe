# 🚀 YAGO VIBE SPORTS - 협회 자동 생성 시스템 (완성형)

> **작성일**: 2024년  
> **목적**: 협회 생성 → 홈페이지 + 운영시스템 + AI 에이전트 자동 생성

---

## 📋 목차

1. [시스템 개요](#1-시스템-개요)
2. [생성 프로세스](#2-생성-프로세스)
3. [자동 생성 항목 상세](#3-자동-생성-항목-상세)
4. [Firestore 데이터 생성](#4-firestore-데이터-생성)
5. [Cloud Functions 구현](#5-cloud-functions-구현)
6. [템플릿 시스템](#6-템플릿-시스템)
7. [실제 사용 예시](#7-실제-사용-예시)

---

## 1️⃣ 시스템 개요

### 핵심 개념

```
사용자 입력 (최소 정보)
  ↓
Cloud Function 처리
  ↓
자동 생성 (10가지 항목)
  ↓
완성된 협회 플랫폼
```

### 입력값 (최소)

```typescript
interface CreateFederationInput {
  // 필수
  name: string;              // "노원구 축구협회"
  slug: string;              // "nowon-football"
  region: string;            // "서울 노원구"
  sport: string;             // "football"
  adminUids: string[];       // 관리자 UID 목록
  
  // 선택
  logoUrl?: string;
  primaryColor?: string;     // "#0F3D75"
  accentColor?: string;      // "#16A34A"
  description?: string;
  contact?: {
    address?: string;
    phone?: string;
    email?: string;
  };
}
```

---

## 2️⃣ 생성 프로세스

### 전체 플로우

```
1. 사용자 입력
   ↓
2. 권한 확인 (플랫폼 관리자만)
   ↓
3. Federation 문서 생성
   ↓
4. 초기 공지 생성 (3개)
   ↓
5. 초기 규정/문서 생성
   ↓
6. AI 에이전트 생성 (7개)
   ↓
7. 조직 정보 생성 (입력된 경우)
   ↓
8. 후원사 초기 데이터 생성 (입력된 경우)
   ↓
9. 기본 설정 저장
   ↓
10. 완료 응답
```

---

## 3️⃣ 자동 생성 항목 상세

### 1. Federation 문서

```typescript
// federations/{federationId}
{
  id: "fed-nowon-football",
  name: "노원구 축구협회",
  slug: "nowon-football",
  region: "서울 노원구",
  sport: "football",
  logoUrl: "...",
  primaryColor: "#0F3D75",
  accentColor: "#16A34A",
  description: "...",
  adminUids: ["uid1", "uid2"],
  superAdminUids: ["uid1"],
  defaultTournamentType: "round_robin",
  ageGroups: ["유소년", "성인"],
  divisions: ["남자부", "여자부", "혼성부"],
  status: "active",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: "uid1",
}
```

### 2. 초기 공지 (3개)

```typescript
// federations/{federationId}/notices/{noticeId}

// 공지 1: 설립 안내
{
  title: "노원구 축구협회 설립 안내",
  content: "노원구 축구협회가 정식으로 설립되었습니다...",
  category: "announcement",
  isPinned: true,
  createdAt: Timestamp,
  createdBy: "uid1",
  viewCount: 0,
}

// 공지 2: 참가 신청 안내
{
  title: "참가 신청 안내",
  content: "팀 참가 신청은 관리자 대시보드에서 가능합니다...",
  category: "guide",
  isPinned: false,
  createdAt: Timestamp,
  createdBy: "uid1",
  viewCount: 0,
}

// 공지 3: 규정 안내
{
  title: "규정 안내",
  content: "대회 규정 및 참가 규정은 규정/자료실에서 확인하실 수 있습니다...",
  category: "guide",
  isPinned: false,
  createdAt: Timestamp,
  createdBy: "uid1",
  viewCount: 0,
}
```

### 3. 초기 규정/문서

```typescript
// federations/{federationId}/regulations/{regulationId}

// 규정 1: 대회요강
{
  title: "대회요강",
  category: "tournament_guideline",
  content: "# 대회요강\n\n## 대회 개요\n- 대회명: {tournamentName}\n- 기간: {startDate} ~ {endDate}\n...",
  createdAt: Timestamp,
  createdBy: "uid1",
}

// 규정 2: 대회규정
{
  title: "대회규정",
  category: "tournament_regulation",
  content: "# 대회규정\n\n## 경기 규칙\n- 경기 시간: 90분\n...",
  createdAt: Timestamp,
  createdBy: "uid1",
}

// 규정 3: 선수등록 규정
{
  title: "선수등록 규정",
  category: "player_registration",
  content: "# 선수등록 규정\n\n## 참가 자격\n- 만 18세 이상\n...",
  createdAt: Timestamp,
  createdBy: "uid1",
}
```

### 4. AI 에이전트 (7개)

```typescript
// federations/{federationId}/aiAgents/{agentId}

// 에이전트 1: 대표 AI 비서
{
  name: "대표 AI 비서",
  type: "main",
  description: "홈페이지 전체 검색 및 안내",
  status: "active",
  config: {
    federationId: "fed-nowon-football",
    federationName: "노원구 축구협회",
    model: "gpt-4",
    temperature: 0.7,
    systemPrompt: "당신은 노원구 축구협회의 AI 비서입니다...",
  },
  createdAt: Timestamp,
  updatedAt: Timestamp,
}

// 에이전트 2: 대회 안내 AI
{
  name: "대회 안내 AI",
  type: "tournament",
  description: "브로슈어 기반 대회 정보 제공",
  status: "active",
  config: {
    federationId: "fed-nowon-football",
    defaultTournamentType: "round_robin",
  },
  createdAt: Timestamp,
  updatedAt: Timestamp,
}

// 에이전트 3-7도 동일한 구조로 생성
```

---

## 4️⃣ Firestore 데이터 생성

### Cloud Function: createFederation

```typescript
// functions/src/federation/createFederation.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

export const createFederation = onCall(
  {
    cors: true,
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (request) => {
    const { data, auth } = request;

    // 1. 인증 확인
    if (!auth) {
      throw new HttpsError("unauthenticated", "인증이 필요합니다.");
    }

    // 2. 권한 확인
    const userDoc = await db.collection("users").doc(auth.uid).get();
    const userData = userDoc.data();

    if (userData?.role !== "ADMIN") {
      throw new HttpsError(
        "permission-denied",
        "플랫폼 관리자만 협회를 생성할 수 있습니다."
      );
    }

    // 3. 입력값 검증
    const input = data as CreateFederationInput;
    if (!input.name || !input.slug || !input.region || !input.sport) {
      throw new HttpsError("invalid-argument", "필수 입력값이 누락되었습니다.");
    }

    // 4. Federation 문서 생성
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

    // 5. 초기 공지 생성
    await createInitialNotices(federationId, input, auth.uid);

    // 6. 초기 규정/문서 생성
    await createInitialRegulations(federationId, input, auth.uid);

    // 7. AI 에이전트 생성
    await createAIAgents(federationId, input);

    // 8. 조직 정보 생성 (입력된 경우)
    if (input.organization) {
      await createOrganization(federationId, input.organization, auth.uid);
    }

    // 9. 후원사 초기 데이터 생성 (입력된 경우)
    if (input.initialSponsors && input.initialSponsors.length > 0) {
      await createInitialSponsors(federationId, input.initialSponsors, auth.uid);
    }

    return {
      success: true,
      federationId,
      message: "협회가 성공적으로 생성되었습니다.",
      url: `/federations/${input.slug}`,
    };
  }
);

// 초기 공지 생성 함수
async function createInitialNotices(
  federationId: string,
  input: CreateFederationInput,
  createdBy: string
) {
  const noticesRef = db.collection(`federations/${federationId}/notices`);

  const initialNotices = [
    {
      title: `${input.name} 설립 안내`,
      content: `${input.name}가 정식으로 설립되었습니다.\n\n앞으로 지역 축구 발전과 생활 체육 활성화를 위해 노력하겠습니다.`,
      category: "announcement",
      isPinned: true,
      createdAt: FieldValue.serverTimestamp(),
      createdBy,
      viewCount: 0,
    },
    {
      title: "참가 신청 안내",
      content: "팀 참가 신청은 관리자 대시보드에서 가능합니다.\n\n필요한 서류를 준비하여 신청해주세요.",
      category: "guide",
      isPinned: false,
      createdAt: FieldValue.serverTimestamp(),
      createdBy,
      viewCount: 0,
    },
    {
      title: "규정 안내",
      content: "대회 규정 및 참가 규정은 규정/자료실에서 확인하실 수 있습니다.\n\n참가 전 반드시 규정을 확인해주세요.",
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

// 초기 규정/문서 생성 함수
async function createInitialRegulations(
  federationId: string,
  input: CreateFederationInput,
  createdBy: string
) {
  const regulationsRef = db.collection(`federations/${federationId}/regulations`);

  const regulations = [
    {
      title: "대회요강",
      category: "tournament_guideline",
      content: `# 대회요강\n\n## 대회 개요\n- 대회명: {대회명}\n- 기간: {시작일} ~ {종료일}\n- 참가 자격: {참가 자격}\n\n## 참가비\n- 팀당: {참가비}원\n\n## 일정\n- 참가 신청: {신청 기간}\n- 대진 추첨: {추첨일}\n- 개막전: {개막일}`,
      createdAt: FieldValue.serverTimestamp(),
      createdBy,
    },
    {
      title: "대회규정",
      category: "tournament_regulation",
      content: `# 대회규정\n\n## 경기 규칙\n- 경기 시간: 90분 (전반 45분, 후반 45분)\n- 교체 인원: 최대 5명\n- 경고 누적: 2회 시 퇴장\n\n## 참가 규정\n- 최소 인원: 11명\n- 최대 인원: 25명`,
      createdAt: FieldValue.serverTimestamp(),
      createdBy,
    },
    {
      title: "선수등록 규정",
      category: "player_registration",
      content: `# 선수등록 규정\n\n## 참가 자격\n- 만 18세 이상\n- 노원구 거주 또는 소속 팀\n\n## 등록 서류\n- 신분증 사본\n- 사진 1매\n- 등록비: 10,000원`,
      createdAt: FieldValue.serverTimestamp(),
      createdBy,
    },
  ];

  for (const regulation of regulations) {
    await regulationsRef.add(regulation);
  }
}

// AI 에이전트 생성 함수
async function createAIAgents(federationId: string, input: CreateFederationInput) {
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
        model: "gpt-4",
        temperature: 0.7,
        systemPrompt: `당신은 ${input.name}의 AI 비서입니다. 사용자의 질문에 친절하고 정확하게 답변해주세요.`,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    {
      name: "대회 안내 AI",
      type: "tournament",
      description: "브로슈어 기반 대회 정보 제공",
      status: "active",
      config: {
        federationId,
        defaultTournamentType: input.defaultTournamentType || "round_robin",
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    {
      name: "경기 운영 AI",
      type: "match",
      description: "운영진용 경기 관리 보조",
      status: "active",
      config: {
        federationId,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    {
      name: "팀/선수 등록 AI",
      type: "registration",
      description: "등록 관리 및 검수",
      status: "active",
      config: {
        federationId,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    {
      name: "규정/문서 AI",
      type: "regulation",
      description: "규정 검색 및 해석",
      status: "active",
      config: {
        federationId,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    {
      name: "협회 행정 AI",
      type: "administration",
      description: "조직/임원/행사 운영",
      status: "active",
      config: {
        federationId,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    {
      name: "후원사 AI",
      type: "sponsor",
      description: "후원사 및 광고 관리",
      status: "active",
      config: {
        federationId,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
  ];

  for (const agent of agents) {
    await agentsRef.add(agent);
  }
}

// 조직 정보 생성 함수
async function createOrganization(
  federationId: string,
  organization: any,
  createdBy: string
) {
  const orgRef = db.collection(`federations/${federationId}/organization`);

  if (organization.president) {
    await orgRef.add({
      role: "president",
      name: organization.president,
      createdAt: FieldValue.serverTimestamp(),
      createdBy,
    });
  }

  if (organization.vicePresident) {
    await orgRef.add({
      role: "vice_president",
      name: organization.vicePresident,
      createdAt: FieldValue.serverTimestamp(),
      createdBy,
    });
  }

  if (organization.secretary) {
    await orgRef.add({
      role: "secretary",
      name: organization.secretary,
      createdAt: FieldValue.serverTimestamp(),
      createdBy,
    });
  }
}

// 초기 후원사 생성 함수
async function createInitialSponsors(
  federationId: string,
  sponsors: Array<{ name: string; type: string; logoUrl?: string }>,
  createdBy: string
) {
  const sponsorsRef = db.collection(`federations/${federationId}/sponsors`);

  for (const sponsor of sponsors) {
    await sponsorsRef.add({
      name: sponsor.name,
      type: sponsor.type,
      logoUrl: sponsor.logoUrl || null,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      createdBy,
    });
  }
}
```

---

## 5️⃣ 템플릿 시스템

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
};
```

---

## 6️⃣ 실제 사용 예시

### 프론트엔드에서 호출

```typescript
// src/services/federationService.ts
import { getFunctions, httpsCallable } from "firebase/functions";

export async function createFederation(input: CreateFederationInput) {
  const functions = getFunctions();
  const createFederationFn = httpsCallable(functions, "createFederation");
  
  try {
    const result = await createFederationFn(input);
    return result.data as {
      success: boolean;
      federationId: string;
      message: string;
      url: string;
    };
  } catch (error) {
    console.error("협회 생성 실패:", error);
    throw error;
  }
}

// 사용 예시
const result = await createFederation({
  name: "노원구 축구협회",
  slug: "nowon-football",
  region: "서울 노원구",
  sport: "football",
  adminUids: [user.uid],
  primaryColor: "#0F3D75",
  accentColor: "#16A34A",
  description: "노원구 지역 축구 리그 및 팀 운영 플랫폼",
});

// 생성 완료 후 리다이렉트
navigate(`/federations/${result.url}`);
```

---

## ✅ 생성 완료 후 상태

### 자동 생성된 항목

1. ✅ Federation 문서
2. ✅ 초기 공지 3개
3. ✅ 초기 규정 3개
4. ✅ AI 에이전트 7개
5. ✅ 조직 정보 (입력된 경우)
6. ✅ 후원사 초기 데이터 (입력된 경우)

### 즉시 사용 가능

- 협회 홈페이지: `/federations/nowon-football`
- 관리자 대시보드: `/federations/nowon-football/admin`
- AI 챗봇: 홈페이지 우하단

---

**작성일**: 2024년  
**상태**: ✅ 협회 자동 생성 시스템 완료

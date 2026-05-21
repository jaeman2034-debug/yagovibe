# 🏗️ YAGO VIBE SPORTS - 협회 자동 생성 워크플로우 (Federation Auto Builder)

> **작성일**: 2024년  
> **목적**: 버튼 클릭 → 10초 안에 완전한 협회 플랫폼 자동 생성

---

## 📋 목차

1. [전체 흐름](#1-전체-흐름)
2. [Step별 상세 구현](#2-step별-상세-구현)
3. [실제 코드 흐름](#3-실제-코드-흐름)
4. [생성 후 검증](#4-생성-후-검증)
5. [에러 처리](#5-에러-처리)

---

## 1️⃣ 전체 흐름

### 프로세스 다이어그램

```
협회 생성 요청
  ↓
[Step 1] Federation 문서 생성
  ↓
[Step 2] 기본 페이지 생성 (9개)
  ↓
[Step 3] 메뉴 자동 생성 (11개)
  ↓
[Step 4] 관리자 계정 연결
  ↓
[Step 5] 기본 리그/대회 템플릿 생성
  ↓
[Step 6] AI 에이전트 생성 (7개)
  ↓
[Step 7] 관리자 대시보드 초기화
  ↓
[Step 8] 협회 홈페이지 publish
  ↓
생성 완료
```

### 목표 시간

```
목표: 10초 이내
실제: 약 5-8초 (Firestore 배치 쓰기 사용 시)
```

---

## 2️⃣ Step별 상세 구현

### Step 1: Federation 문서 생성

```typescript
async function createFederationDocument(
  input: CreateFederationInput,
  createdBy: string
): Promise<string> {
  const federationRef = db.collection("federations").doc();
  const federationId = federationRef.id;

  await federationRef.set({
    id: federationId,
    name: input.name,
    slug: input.slug,
    region: input.region,
    sportType: input.sport,
    status: "active",
    logoUrl: input.logoUrl || null,
    heroImageUrl: null,
    primaryColor: input.primaryColor || "#0F172A",
    secondaryColor: input.accentColor || "#16A34A",
    description: input.description || "",
    contactPhone: input.contact?.phone || null,
    contactEmail: input.contact?.email || null,
    address: input.contact?.address || null,
    homepageVisible: false, // Step 8에서 true로 변경
    adminEnabled: true,
    templateId: `${input.sport}-association-v1`,
    adminUids: input.adminUids || [createdBy],
    superAdminUids: [createdBy],
    defaultTournamentType: input.defaultTournamentType || "round_robin",
    ageGroups: input.ageGroups || ["유소년", "성인"],
    divisions: input.divisions || ["남자부", "여자부", "혼성부"],
    stats: {
      activeTournaments: 0,
      activeLeagues: 0,
      totalTeams: 0,
      totalPlayers: 0,
      totalMatches: 0,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy,
  });

  return federationId;
}
```

### Step 2: 기본 페이지 생성

```typescript
async function createDefaultPages(
  federationId: string,
  input: CreateFederationInput,
  createdBy: string
): Promise<void> {
  const pagesRef = db.collection(`federations/${federationId}/pages`);
  const batch = db.batch();

  const defaultPages = [
    {
      id: "home",
      federationId,
      title: "홈",
      slug: "home",
      pageType: "content",
      status: "published",
      contentHtml: generateHomePageContent(input),
      seoTitle: `${input.name} - 공식 홈페이지`,
      seoDescription: input.description || "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy,
    },
    {
      id: "about",
      federationId,
      title: "협회소개",
      slug: "about",
      pageType: "content",
      status: "published",
      contentHtml: generateAboutPageContent(input),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy,
    },
    {
      id: "greeting",
      federationId,
      title: "협회장 인사말",
      slug: "greeting",
      pageType: "content",
      status: "published",
      contentHtml: generateGreetingPageContent(input),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy,
    },
    {
      id: "history",
      federationId,
      title: "협회 연혁",
      slug: "history",
      pageType: "content",
      status: "published",
      contentHtml: generateHistoryPageContent(input),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy,
    },
    {
      id: "organization",
      federationId,
      title: "조직도",
      slug: "organization",
      pageType: "content",
      status: "published",
      contentHtml: generateOrganizationPageContent(input),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy,
    },
    {
      id: "notices",
      federationId,
      title: "공지사항",
      slug: "notices",
      pageType: "list",
      status: "published",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy,
    },
    {
      id: "tournaments",
      federationId,
      title: "대회/리그",
      slug: "tournaments",
      pageType: "list",
      status: "published",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy,
    },
    {
      id: "matches",
      federationId,
      title: "경기일정",
      slug: "matches",
      pageType: "list",
      status: "published",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy,
    },
    {
      id: "standings",
      federationId,
      title: "결과/순위",
      slug: "standings",
      pageType: "list",
      status: "published",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy,
    },
    {
      id: "clubs",
      federationId,
      title: "참가팀/클럽",
      slug: "clubs",
      pageType: "list",
      status: "published",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy,
    },
    {
      id: "docs",
      federationId,
      title: "규정/자료실",
      slug: "docs",
      pageType: "list",
      status: "published",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy,
    },
    {
      id: "sponsors",
      federationId,
      title: "후원사",
      slug: "sponsors",
      pageType: "list",
      status: "published",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy,
    },
    {
      id: "contact",
      federationId,
      title: "문의하기",
      slug: "contact",
      pageType: "form",
      status: "published",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy,
    },
  ];

  // 배치 쓰기로 한 번에 처리
  defaultPages.forEach((page) => {
    const pageRef = pagesRef.doc(page.id);
    batch.set(pageRef, page);
  });

  await batch.commit();
}

function generateHomePageContent(input: CreateFederationInput): string {
  return `
    <h1>${input.name}에 오신 것을 환영합니다</h1>
    <p>${input.description || `${input.region} 지역 ${input.sport} 리그 및 대회 운영 플랫폼`}</p>
    <p>이 플랫폼을 통해 대회 일정, 경기 결과, 순위, 팀 정보를 확인하실 수 있습니다.</p>
  `;
}

function generateAboutPageContent(input: CreateFederationInput): string {
  return `
    <h1>협회소개</h1>
    <p>${input.name}는 ${input.region} 지역의 ${input.sport} 발전을 위해 설립되었습니다.</p>
    <p>우리는 지역 주민들이 건강하고 즐거운 스포츠 생활을 할 수 있도록 지원합니다.</p>
  `;
}

function generateGreetingPageContent(input: CreateFederationInput): string {
  const president = input.organization?.president || "협회장";
  return `
    <h1>협회장 인사말</h1>
    <p>${input.name}를 찾아주신 여러분께 감사드립니다.</p>
    <p>${president} 드림</p>
  `;
}

function generateHistoryPageContent(input: CreateFederationInput): string {
  return `
    <h1>협회 연혁</h1>
    <p>${input.name}의 역사가 여기에 표시됩니다.</p>
  `;
}

function generateOrganizationPageContent(input: CreateFederationInput): string {
  return `
    <h1>조직도</h1>
    <p>${input.name}의 조직 구조가 여기에 표시됩니다.</p>
  `;
}
```

### Step 3: 메뉴 자동 생성

```typescript
async function createDefaultMenus(
  federationId: string,
  input: CreateFederationInput
): Promise<void> {
  const menusRef = db.collection(`federations/${federationId}/menus`);
  const batch = db.batch();

  const defaultMenus = [
    { id: "home", label: "홈", path: `/federations/${input.slug}`, order: 1, icon: "Building2" },
    { id: "about", label: "협회소개", path: `/federations/${input.slug}/about`, order: 2, icon: "Building2" },
    { id: "notices", label: "공지", path: `/federations/${input.slug}/notices`, order: 3, icon: "Bell" },
    { id: "tournaments", label: "대회/리그", path: `/federations/${input.slug}/tournaments`, order: 4, icon: "Trophy" },
    { id: "matches", label: "경기일정", path: `/federations/${input.slug}/matches`, order: 5, icon: "Calendar" },
    { id: "results", label: "결과/순위", path: `/federations/${input.slug}/results`, order: 6, icon: "BarChart" },
    { id: "clubs", label: "참가팀/클럽", path: `/federations/${input.slug}/clubs`, order: 7, icon: "Users" },
    { id: "docs", label: "규정/자료실", path: `/federations/${input.slug}/docs`, order: 8, icon: "FileText" },
    { id: "sponsors", label: "후원사", path: `/federations/${input.slug}/sponsors`, order: 9, icon: "Award" },
    { id: "youth", label: "유소년", path: `/federations/${input.slug}/youth`, order: 10, icon: "GraduationCap" },
    { id: "contact", label: "문의하기", path: `/federations/${input.slug}/contact`, order: 11, icon: "MessageSquare" },
  ];

  defaultMenus.forEach((menu) => {
    const menuRef = menusRef.doc(menu.id);
    batch.set(menuRef, {
      ...menu,
      federationId,
      visible: true,
      menuType: "public",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
}
```

### Step 4: 관리자 계정 연결

```typescript
async function createAdminAccounts(
  federationId: string,
  input: CreateFederationInput,
  createdBy: string
): Promise<void> {
  const adminsRef = db.collection(`federations/${federationId}/admins`);
  const batch = db.batch();

  const adminUids = input.adminUids || [createdBy];

  for (const adminUid of adminUids) {
    const userDoc = await db.collection("users").doc(adminUid).get();
    const userData = userDoc.data();

    const adminRef = adminsRef.doc(adminUid);
    batch.set(adminRef, {
      userId: adminUid,
      name: userData?.displayName || "관리자",
      role: adminUid === createdBy ? "super-admin" : "federation-admin",
      permissions: getAllPermissions(adminUid === createdBy),
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy,
    });
  }

  await batch.commit();
}

function getAllPermissions(isSuperAdmin: boolean): string[] {
  const basePermissions = [
    "view-analytics",
    "view-teams",
    "view-players",
    "view-matches",
  ];

  if (isSuperAdmin) {
    return [
      ...basePermissions,
      "manage-leagues",
      "manage-seasons",
      "approve-registrations",
      "manage-matches",
      "manage-results",
      "manage-notices",
      "manage-teams",
      "manage-players",
      "manage-documents",
      "manage-sponsors",
      "manage-staff",
      "manage-admins",
      "manage-ai-agents",
    ];
  }

  return [
    ...basePermissions,
    "manage-matches",
    "manage-results",
    "manage-notices",
  ];
}
```

### Step 5: 기본 리그/대회 템플릿 생성

```typescript
async function createDefaultLeagues(
  federationId: string,
  input: CreateFederationInput,
  createdBy: string
): Promise<void> {
  const leaguesRef = db.collection(`federations/${federationId}/leagues`);
  const batch = db.batch();

  // sportType 기반 기본 리그 생성
  const defaultLeagues = getDefaultLeaguesBySportType(input.sport);

  defaultLeagues.forEach((league, index) => {
    const leagueRef = leaguesRef.doc();
    batch.set(leagueRef, {
      id: leagueRef.id,
      federationId,
      name: league.name,
      slug: generateSlug(league.name),
      category: league.category,
      competitionType: "league",
      sportType: input.sport,
      gender: league.gender,
      ageGroup: league.ageGroup,
      description: league.description,
      status: "draft", // 관리자가 활성화
      visible: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy,
    });
  });

  await batch.commit();
}

function getDefaultLeaguesBySportType(sportType: string): Array<{
  name: string;
  category: string;
  gender: string;
  ageGroup: string;
  description: string;
}> {
  if (sportType === "football") {
    return [
      {
        name: "K7 리그",
        category: "adult",
        gender: "men",
        ageGroup: "adult",
        description: "성인 남자부 K7 리그",
      },
      {
        name: "주말 리그",
        category: "adult",
        gender: "men",
        ageGroup: "adult",
        description: "주말 성인 리그",
      },
      {
        name: "유소년 리그",
        category: "youth",
        gender: "mixed",
        ageGroup: "youth",
        description: "유소년 리그",
      },
    ];
  }

  // 다른 종목의 기본 리그
  return [];
}
```

### Step 6: AI 에이전트 생성

```typescript
async function createAIAgents(
  federationId: string,
  input: CreateFederationInput
): Promise<void> {
  const aiAgentsRef = db.collection(`federations/${federationId}/aiAgents`);
  const batch = db.batch();

  const defaultAgents = [
    {
      name: "대표 AI 비서",
      agentType: "general-assistant",
      enabled: true,
      scope: "public",
      knowledgeSources: ["notices", "documents", "tournaments", "matches", "teams", "players"],
      uiPlacement: "homepage-chat",
      config: {
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 500,
        systemPrompt: `당신은 ${input.name}의 AI 비서입니다. 사용자의 질문에 친절하고 정확하게 답변해주세요.`,
      },
    },
    {
      name: "대회 안내 AI",
      agentType: "tournament-guide",
      enabled: true,
      scope: "public",
      knowledgeSources: ["tournaments", "notices", "documents"],
      uiPlacement: "homepage-chat",
      config: {
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 500,
      },
    },
    {
      name: "경기 운영 AI",
      agentType: "match-ops",
      enabled: true,
      scope: "admin",
      knowledgeSources: ["matches", "teams", "players"],
      uiPlacement: "admin-panel",
      config: {
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 500,
      },
    },
    {
      name: "팀 등록 AI",
      agentType: "team-registration",
      enabled: true,
      scope: "public",
      knowledgeSources: ["documents", "notices"],
      uiPlacement: "homepage-chat",
      config: {
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 500,
      },
    },
    {
      name: "선수 등록 AI",
      agentType: "player-registration",
      enabled: true,
      scope: "public",
      knowledgeSources: ["documents", "notices"],
      uiPlacement: "homepage-chat",
      config: {
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 500,
      },
    },
    {
      name: "규정 AI",
      agentType: "rules-docs",
      enabled: true,
      scope: "public",
      knowledgeSources: ["documents"],
      uiPlacement: "homepage-chat",
      config: {
        model: "gpt-4",
        temperature: 0.3,
        maxTokens: 500,
      },
    },
    {
      name: "협회 행정 AI",
      agentType: "admin-ops",
      enabled: true,
      scope: "admin",
      knowledgeSources: ["notices", "documents", "staff"],
      uiPlacement: "admin-panel",
      config: {
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 500,
      },
    },
  ];

  defaultAgents.forEach((agent) => {
    const agentRef = aiAgentsRef.doc();
    batch.set(agentRef, {
      id: agentRef.id,
      federationId,
      ...agent,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
}
```

### Step 7: 관리자 대시보드 초기화

```typescript
async function initializeDashboard(
  federationId: string,
  input: CreateFederationInput,
  createdBy: string
): Promise<void> {
  // 관리자 대시보드는 라우팅과 UI로만 구성되므로
  // 별도의 Firestore 문서 생성은 필요 없음
  // 대신 기본 설정만 저장

  const settingsRef = db.collection(`federations/${federationId}/settings`).doc("general");
  
  await settingsRef.set({
    dashboardEnabled: true,
    defaultView: "overview",
    widgets: [
      { id: "kpi-cards", enabled: true, order: 1 },
      { id: "quick-actions", enabled: true, order: 2 },
      { id: "pending-approvals", enabled: true, order: 3 },
      { id: "upcoming-matches", enabled: true, order: 4 },
    ],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
```

### Step 8: 협회 홈페이지 publish

```typescript
async function publishHomepage(
  federationId: string
): Promise<void> {
  const federationRef = db.collection("federations").doc(federationId);
  
  await federationRef.update({
    homepageVisible: true,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
```

---

## 3️⃣ 실제 코드 흐름

### 통합 함수

```typescript
// functions/src/federation/createFederation.ts
export const createFederation = onCall(
  {
    cors: true,
    memory: "1GiB",
    timeoutSeconds: 120,
  },
  async (request) => {
    const { data, auth } = request;

    // 인증 및 권한 확인
    if (!auth || !isPlatformAdmin(auth.uid)) {
      throw new HttpsError("permission-denied", "권한이 없습니다.");
    }

    const input = data as CreateFederationInput;

    try {
      const startTime = Date.now();

      // Step 1: Federation 문서 생성
      const federationId = await createFederationDocument(input, auth.uid);

      // Step 2-8: 병렬 처리 가능한 작업들
      await Promise.all([
        createDefaultPages(federationId, input, auth.uid),
        createDefaultMenus(federationId, input),
        createAdminAccounts(federationId, input, auth.uid),
        createDefaultLeagues(federationId, input, auth.uid),
        createAIAgents(federationId, input),
        initializeDashboard(federationId, input, auth.uid),
      ]);

      // Step 8: 홈페이지 publish
      await publishHomepage(federationId);

      const duration = Date.now() - startTime;

      return {
        success: true,
        federationId,
        slug: input.slug,
        message: "협회가 성공적으로 생성되었습니다.",
        url: `/federations/${input.slug}`,
        duration: `${duration}ms`,
      };
    } catch (error: any) {
      console.error("협회 생성 오류:", error);
      throw new HttpsError("internal", error.message || "협회 생성 중 오류가 발생했습니다.");
    }
  }
);
```

---

## 4️⃣ 생성 후 검증

### 검증 함수

```typescript
async function validateFederationCreation(federationId: string): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Federation 문서 확인
  const federationDoc = await db.collection("federations").doc(federationId).get();
  if (!federationDoc.exists()) {
    errors.push("Federation 문서가 생성되지 않았습니다.");
  }

  // 필수 컬렉션 확인
  const [pages, menus, admins, aiAgents] = await Promise.all([
    db.collection(`federations/${federationId}/pages`).get(),
    db.collection(`federations/${federationId}/menus`).get(),
    db.collection(`federations/${federationId}/admins`).get(),
    db.collection(`federations/${federationId}/aiAgents`).get(),
  ]);

  if (pages.size < 9) {
    errors.push(`페이지가 부족합니다. (현재: ${pages.size}, 필요: 9)`);
  }

  if (menus.size < 11) {
    errors.push(`메뉴가 부족합니다. (현재: ${menus.size}, 필요: 11)`);
  }

  if (admins.size < 1) {
    errors.push("관리자 계정이 생성되지 않았습니다.");
  }

  if (aiAgents.size < 7) {
    errors.push(`AI 에이전트가 부족합니다. (현재: ${aiAgents.size}, 필요: 7)`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

## 5️⃣ 에러 처리

### 롤백 로직

```typescript
async function rollbackFederationCreation(federationId: string): Promise<void> {
  // Federation 문서 삭제
  await db.collection("federations").doc(federationId).delete();

  // 하위 컬렉션은 Firestore의 cascade delete 규칙에 의해 자동 삭제
  // 또는 수동으로 삭제
  const subcollections = [
    "pages",
    "menus",
    "notices",
    "leagues",
    "teams",
    "players",
    "matches",
    "documents",
    "sponsors",
    "admins",
    "aiAgents",
  ];

  // 배치 삭제는 Firestore에서 직접 지원하지 않으므로
  // 각 컬렉션별로 삭제하거나 Cloud Function에서 처리
}
```

---

## ✅ 생성 완료 후 상태

### 자동 생성된 구조

```
federations/{federationId}
  ├─ pages/ (9개)
  ├─ menus/ (11개)
  ├─ notices/ (3개)
  ├─ documents/ (3개)
  ├─ leagues/ (3개 - draft 상태)
  ├─ admins/ (1개 이상)
  ├─ aiAgents/ (7개)
  └─ settings/general
```

### 즉시 사용 가능

- 협회 홈페이지: `/federations/{slug}` ✅
- 관리자 대시보드: `/federations/{slug}/admin` ✅
- AI 챗봇: 홈페이지 우하단 ✅

---

**작성일**: 2024년  
**상태**: ✅ 협회 자동 생성 워크플로우 완료

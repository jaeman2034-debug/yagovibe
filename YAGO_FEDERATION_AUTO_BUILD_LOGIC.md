# 🏗️ YAGO VIBE SPORTS - 협회 자동 생성 로직 (완성형)

> **작성일**: 2024년  
> **목적**: 버튼 하나로 협회 플랫폼 전체 자동 생성

---

## 📋 목차

1. [생성 프로세스 개요](#1-생성-프로세스-개요)
2. [단계별 생성 로직](#2-단계별-생성-로직)
3. [템플릿 적용](#3-템플릿-적용)
4. [Cloud Functions 구현](#4-cloud-functions-구현)
5. [생성 완료 검증](#5-생성-완료-검증)

---

## 1️⃣ 생성 프로세스 개요

### 전체 플로우

```
사용자 입력 (최소 정보)
  ↓
권한 확인
  ↓
Federation 문서 생성
  ↓
템플릿 조회 및 적용
  ↓
기본 페이지 생성 (9개)
  ↓
기본 메뉴 생성 (11개)
  ↓
초기 공지 생성 (3개)
  ↓
초기 규정/문서 생성 (3개)
  ↓
관리자 계정 연결
  ↓
AI 에이전트 생성 (7개)
  ↓
기본 설정 저장
  ↓
생성 완료
```

---

## 2️⃣ 단계별 생성 로직

### 2-1. Federation 문서 생성

```typescript
// Step 1: Federation 루트 문서 생성
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
  homepageVisible: true,
  adminEnabled: true,
  templateId: `football-association-v1`, // sportType 기반
  adminUids: input.adminUids || [auth.uid],
  superAdminUids: [auth.uid],
  defaultTournamentType: input.defaultTournamentType || "round_robin",
  ageGroups: input.ageGroups || ["유소년", "성인"],
  divisions: input.divisions || ["남자부", "여자부", "혼성부"],
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
  createdBy: auth.uid,
});
```

### 2-2. 기본 페이지 생성

```typescript
// Step 2: 기본 페이지 생성
const pagesRef = db.collection(`federations/${federationId}/pages`);

const defaultPages = [
  {
    id: "home",
    title: "홈",
    slug: "home",
    pageType: "content",
    status: "published",
    contentHtml: `<h1>${input.name}에 오신 것을 환영합니다</h1><p>${input.description || ""}</p>`,
    seoTitle: `${input.name} - 공식 홈페이지`,
    seoDescription: input.description || "",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: auth.uid,
  },
  {
    id: "about",
    title: "협회소개",
    slug: "about",
    pageType: "content",
    status: "published",
    contentHtml: `<h1>협회소개</h1><p>${input.name}에 대한 소개입니다.</p>`,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: auth.uid,
  },
  {
    id: "greeting",
    title: "협회장 인사말",
    slug: "greeting",
    pageType: "content",
    status: "published",
    contentHtml: `<h1>협회장 인사말</h1><p>${input.organization?.president || "협회장"}의 인사말이 여기에 표시됩니다.</p>`,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: auth.uid,
  },
  {
    id: "history",
    title: "협회 연혁",
    slug: "history",
    pageType: "content",
    status: "published",
    contentHtml: `<h1>협회 연혁</h1><p>협회의 역사가 여기에 표시됩니다.</p>`,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: auth.uid,
  },
  {
    id: "organization",
    title: "조직도",
    slug: "organization",
    pageType: "content",
    status: "published",
    contentHtml: `<h1>조직도</h1><p>조직 구조가 여기에 표시됩니다.</p>`,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: auth.uid,
  },
  {
    id: "sponsors",
    title: "후원사",
    slug: "sponsors",
    pageType: "list",
    status: "published",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: auth.uid,
  },
  {
    id: "docs",
    title: "규정/자료실",
    slug: "docs",
    pageType: "list",
    status: "published",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: auth.uid,
  },
  {
    id: "contact",
    title: "문의하기",
    slug: "contact",
    pageType: "form",
    status: "published",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: auth.uid,
  },
  {
    id: "youth",
    title: "유소년",
    slug: "youth",
    pageType: "content",
    status: "published",
    contentHtml: `<h1>유소년 프로그램</h1><p>유소년 프로그램 정보가 여기에 표시됩니다.</p>`,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: auth.uid,
  },
];

for (const page of defaultPages) {
  await pagesRef.doc(page.id).set(page);
}
```

### 2-3. 기본 메뉴 생성

```typescript
// Step 3: 기본 메뉴 생성
const menusRef = db.collection(`federations/${federationId}/menus`);

const defaultMenus = [
  {
    id: "home",
    label: "홈",
    path: `/federations/${input.slug}`,
    order: 1,
    visible: true,
    menuType: "public",
    icon: "Building2",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  },
  {
    id: "about",
    label: "협회소개",
    path: `/federations/${input.slug}/about`,
    order: 2,
    visible: true,
    menuType: "public",
    icon: "Building2",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  },
  {
    id: "notices",
    label: "공지",
    path: `/federations/${input.slug}/notices`,
    order: 3,
    visible: true,
    menuType: "public",
    icon: "Bell",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  },
  {
    id: "tournaments",
    label: "대회/리그",
    path: `/federations/${input.slug}/tournaments`,
    order: 4,
    visible: true,
    menuType: "public",
    icon: "Trophy",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  },
  {
    id: "matches",
    label: "경기일정",
    path: `/federations/${input.slug}/matches`,
    order: 5,
    visible: true,
    menuType: "public",
    icon: "Calendar",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  },
  {
    id: "results",
    label: "결과/순위",
    path: `/federations/${input.slug}/results`,
    order: 6,
    visible: true,
    menuType: "public",
    icon: "BarChart",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  },
  {
    id: "clubs",
    label: "참가팀/클럽",
    path: `/federations/${input.slug}/clubs`,
    order: 7,
    visible: true,
    menuType: "public",
    icon: "Users",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  },
  {
    id: "docs",
    label: "규정/자료실",
    path: `/federations/${input.slug}/docs`,
    order: 8,
    visible: true,
    menuType: "public",
    icon: "FileText",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  },
  {
    id: "sponsors",
    label: "후원사",
    path: `/federations/${input.slug}/sponsors`,
    order: 9,
    visible: true,
    menuType: "public",
    icon: "Award",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  },
  {
    id: "youth",
    label: "유소년",
    path: `/federations/${input.slug}/youth`,
    order: 10,
    visible: true,
    menuType: "public",
    icon: "GraduationCap",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  },
  {
    id: "contact",
    label: "문의하기",
    path: `/federations/${input.slug}/contact`,
    order: 11,
    visible: true,
    menuType: "public",
    icon: "MessageSquare",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  },
];

for (const menu of defaultMenus) {
  await menusRef.doc(menu.id).set(menu);
}
```

### 2-4. 초기 공지 생성

```typescript
// Step 4: 초기 공지 생성
const noticesRef = db.collection(`federations/${federationId}/notices`);

const initialNotices = [
  {
    title: `${input.name} 설립 안내`,
    content: `${input.name}가 정식으로 설립되었습니다.\n\n앞으로 지역 스포츠 발전과 생활 체육 활성화를 위해 노력하겠습니다.`,
    category: "general",
    importance: "high",
    status: "published",
    targetScope: "public",
    publishedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: auth.uid,
    viewCount: 0,
    likeCount: 0,
  },
  {
    title: "참가 신청 안내",
    content: "팀 참가 신청은 관리자 대시보드에서 가능합니다.\n\n필요한 서류를 준비하여 신청해주세요.",
    category: "general",
    importance: "normal",
    status: "published",
    targetScope: "public",
    publishedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: auth.uid,
    viewCount: 0,
    likeCount: 0,
  },
  {
    title: "규정 안내",
    content: "대회 규정 및 참가 규정은 규정/자료실에서 확인하실 수 있습니다.\n\n참가 전 반드시 규정을 확인해주세요.",
    category: "general",
    importance: "normal",
    status: "published",
    targetScope: "public",
    publishedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: auth.uid,
    viewCount: 0,
    likeCount: 0,
  },
];

for (const notice of initialNotices) {
  await noticesRef.add(notice);
}
```

### 2-5. 초기 규정/문서 생성

```typescript
// Step 5: 초기 규정/문서 생성
const documentsRef = db.collection(`federations/${federationId}/documents`);

const initialDocuments = [
  {
    title: "대회요강",
    type: "rulebook",
    category: "tournament",
    fileUrl: null,
    version: "1.0",
    status: "published",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: auth.uid,
  },
  {
    title: "대회규정",
    type: "rulebook",
    category: "rules",
    fileUrl: null,
    version: "1.0",
    status: "published",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: auth.uid,
  },
  {
    title: "선수등록 규정",
    type: "player-registration-rule",
    category: "rules",
    fileUrl: null,
    version: "1.0",
    status: "published",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: auth.uid,
  },
];

for (const doc of initialDocuments) {
  await documentsRef.add(doc);
}
```

### 2-6. 관리자 계정 연결

```typescript
// Step 6: 관리자 계정 연결
const adminsRef = db.collection(`federations/${federationId}/admins`);

for (const adminUid of input.adminUids || [auth.uid]) {
  const userDoc = await db.collection("users").doc(adminUid).get();
  const userData = userDoc.data();

  await adminsRef.doc(adminUid).set({
    userId: adminUid,
    name: userData?.displayName || "관리자",
    role: adminUid === auth.uid ? "super-admin" : "federation-admin",
    permissions: [
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
      "view-analytics",
    ],
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: auth.uid,
  });
}
```

### 2-7. AI 에이전트 생성

```typescript
// Step 7: AI 에이전트 생성
const aiAgentsRef = db.collection(`federations/${federationId}/aiAgents`);

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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
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
      temperature: 0.3, // 규정은 정확성이 중요
      maxTokens: 500,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  },
];

for (const agent of defaultAgents) {
  await aiAgentsRef.add(agent);
}
```

### 2-8. 조직 정보 생성 (입력된 경우)

```typescript
// Step 8: 조직 정보 생성
if (input.organization) {
  const staffRef = db.collection(`federations/${federationId}/staff`);

  if (input.organization.president) {
    await staffRef.add({
      name: input.organization.president,
      role: "회장",
      group: "presidents",
      visible: true,
      order: 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  if (input.organization.vicePresident) {
    await staffRef.add({
      name: input.organization.vicePresident,
      role: "부회장",
      group: "presidents",
      visible: true,
      order: 2,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  if (input.organization.secretary) {
    await staffRef.add({
      name: input.organization.secretary,
      role: "사무국장",
      group: "executives",
      visible: true,
      order: 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}
```

---

## 3️⃣ 템플릿 적용

### 템플릿 조회 및 적용

```typescript
// 템플릿 조회
const templateId = `football-association-v1`; // sportType 기반
const templateDoc = await db.collection("systemTemplates").doc(templateId).get();

if (templateDoc.exists()) {
  const template = templateDoc.data();
  
  // 템플릿의 기본 메뉴 적용 (기존 메뉴와 병합)
  if (template.defaultMenus) {
    // 기존 메뉴와 템플릿 메뉴 병합
  }
  
  // 템플릿의 기본 AI 에이전트 적용
  if (template.defaultAgents) {
    // 기존 에이전트와 템플릿 에이전트 병합
  }
}
```

---

## 4️⃣ Cloud Functions 구현

### createFederation 함수 (완성형)

```typescript
// functions/src/federation/createFederation.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

export const createFederation = onCall(
  {
    cors: true,
    memory: "1GiB",
    timeoutSeconds: 120,
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

    // 4. Slug 중복 확인
    const existingFederation = await db
      .collection("federations")
      .where("slug", "==", input.slug)
      .get();

    if (!existingFederation.empty) {
      throw new HttpsError("already-exists", "이미 사용 중인 Slug입니다.");
    }

    try {
      // 5. Federation 문서 생성
      const federationId = await createFederationDocument(input, auth.uid);

      // 6. 기본 페이지 생성
      await createDefaultPages(federationId, input, auth.uid);

      // 7. 기본 메뉴 생성
      await createDefaultMenus(federationId, input);

      // 8. 초기 공지 생성
      await createInitialNotices(federationId, input, auth.uid);

      // 9. 초기 규정/문서 생성
      await createInitialDocuments(federationId, input, auth.uid);

      // 10. 관리자 계정 연결
      await createAdminAccounts(federationId, input, auth.uid);

      // 11. AI 에이전트 생성
      await createAIAgents(federationId, input);

      // 12. 조직 정보 생성 (입력된 경우)
      if (input.organization) {
        await createOrganization(federationId, input.organization);
      }

      // 13. 후원사 초기 데이터 생성 (입력된 경우)
      if (input.initialSponsors && input.initialSponsors.length > 0) {
        await createInitialSponsors(federationId, input.initialSponsors, auth.uid);
      }

      return {
        success: true,
        federationId,
        slug: input.slug,
        message: "협회가 성공적으로 생성되었습니다.",
        url: `/federations/${input.slug}`,
      };
    } catch (error: any) {
      console.error("협회 생성 오류:", error);
      throw new HttpsError("internal", error.message || "협회 생성 중 오류가 발생했습니다.");
    }
  }
);

// 각 단계별 함수는 위의 2-1 ~ 2-8 섹션 참고
```

---

## 5️⃣ 생성 완료 검증

### 검증 로직

```typescript
async function validateFederationCreation(federationId: string): Promise<boolean> {
  const federationDoc = await db.collection("federations").doc(federationId).get();
  
  if (!federationDoc.exists()) {
    return false;
  }

  // 필수 컬렉션 확인
  const [pages, menus, notices, documents, admins, aiAgents] = await Promise.all([
    db.collection(`federations/${federationId}/pages`).get(),
    db.collection(`federations/${federationId}/menus`).get(),
    db.collection(`federations/${federationId}/notices`).get(),
    db.collection(`federations/${federationId}/documents`).get(),
    db.collection(`federations/${federationId}/admins`).get(),
    db.collection(`federations/${federationId}/aiAgents`).get(),
  ]);

  return (
    pages.size >= 9 &&
    menus.size >= 11 &&
    notices.size >= 3 &&
    documents.size >= 3 &&
    admins.size >= 1 &&
    aiAgents.size >= 7
  );
}
```

---

## ✅ 생성 완료 후 상태

### 자동 생성된 항목

1. ✅ Federation 문서
2. ✅ 기본 페이지 9개
3. ✅ 기본 메뉴 11개
4. ✅ 초기 공지 3개
5. ✅ 초기 규정/문서 3개
6. ✅ 관리자 계정 연결
7. ✅ AI 에이전트 7개
8. ✅ 조직 정보 (입력된 경우)
9. ✅ 후원사 초기 데이터 (입력된 경우)

### 즉시 사용 가능

- 협회 홈페이지: `/federations/{slug}`
- 관리자 대시보드: `/federations/{slug}/admin`
- AI 챗봇: 홈페이지 우하단

---

**작성일**: 2024년  
**상태**: ✅ 협회 자동 생성 로직 완료

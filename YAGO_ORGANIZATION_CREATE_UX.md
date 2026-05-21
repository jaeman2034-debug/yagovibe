# 🏗️ YAGO 조직 생성 시스템 - 완성형 UI/UX 설계

## 🎯 핵심 원칙

**스포츠 조직 플랫폼** - 협회, 아카데미, 클럽 모두 지원

```
조직 생성
AI가 몇 가지 질문을 통해
협회 또는 아카데미 사이트를 만들어드립니다
```

---

## 📊 지원하는 조직 유형

### 1. 🏆 협회 (Federation)
- 리그 운영
- 팀 관리
- 경기 일정
- 순위 관리

### 2. 🏫 아카데미 (Academy)
- 코치 관리
- 훈련 프로그램
- 선수 등록
- 수강 관리

### 3. ⚽ 클럽 (Club)
- 팀 소개
- 선수 프로필
- 경기 일정
- 공지사항

---

## 📱 전체 플로우

```
[진입 화면] - 조직 유형 선택
    ↓
[AI 대화형 생성] - 조직 유형별 질문
    ↓
[Hero 이미지 선택]
    ↓
[AI 분석 & 템플릿 추천]
    ↓
[검토 화면]
    ↓
[생성 완료]
```

---

## 🚪 화면 1: 진입 화면 (Landing)

**URL**: `/platform/organizations/create`

**목적**: 조직 유형 선택 및 생성 방식 선택

**레이아웃**:
```
┌─────────────────────────────────────┐
│  [Header]                           │
├─────────────────────────────────────┤
│                                     │
│  조직 생성                           │
│                                     │
│  3분 안에 스포츠 조직 사이트를      │
│  만들어보세요.                       │
│                                     │
│  AI가 몇 가지 질문을 드리고,         │
│  운영 방식에 맞는 템플릿을          │
│  추천해드립니다.                     │
│                                     │
│  ┌──────────┐  ┌──────────┐      │
│  │ 🏆 협회   │  │ 🏫 아카데미│      │
│  │ 생성      │  │ 생성      │      │
│  └──────────┘  └──────────┘      │
│                                     │
│  ┌──────────┐                      │
│  │ ⚽ 클럽   │                      │
│  │ 생성      │                      │
│  └──────────┘                      │
│                                     │
│  또는                                │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ✏️ 직접 설정하기              │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**카드 디자인**:
```
┌─────────────────────────────┐
│  🏆                         │
│                             │
│  협회 생성                  │
│                             │
│  리그 운영 · 팀 관리         │
│  경기 일정 · 순위 관리       │
│                             │
│  [AI와 시작하기]            │
└─────────────────────────────┘
```

**액션**:
- `🏆 협회 생성` 클릭 → 화면 2 (AI 대화형 생성, type: "federation")
- `🏫 아카데미 생성` 클릭 → 화면 2 (AI 대화형 생성, type: "academy")
- `⚽ 클럽 생성` 클릭 → 화면 2 (AI 대화형 생성, type: "club")
- `직접 설정하기` 클릭 → 화면 6 (폼 입력)

---

## 🤖 화면 2: AI 대화형 생성 (조직 유형별 질문)

**URL**: `/platform/organizations/create/ai?type={federation|academy|club}`

**목적**: 조직 유형에 맞는 질문으로 정보 수집

### 협회 (Federation) 질문 시퀀스

#### 질문 1: 종목
```
어떤 종목 협회를 만드시나요?
```
- ⚽ 축구
- 🏀 농구
- ⚾ 야구
- 🏐 배구
- 🏸 배드민턴
- 기타

#### 질문 2: 참가 대상
```
주 참가 대상은 누구인가요?
```
- 유소년
- 청소년
- 성인
- 혼합

#### 질문 3: 운영 방식
```
리그 운영 방식은 무엇인가요?
```
- 풀리그
- 토너먼트
- 리그 + 토너먼트
- 이벤트 중심

#### 질문 4: 참가 형태
```
참가는 어떤 방식인가요?
```
- 팀 단위
- 개인 신청 후 팀 배정
- 학교
- 클럽

#### 질문 5: 지역 기반 여부
```
지역 기반 협회인가요?
```
- 지역 협회
- 학교 리그
- 기업 리그
- 온라인 커뮤니티 리그
- 기타

---

### 아카데미 (Academy) 질문 시퀀스

#### 질문 1: 종목
```
어떤 종목 아카데미를 만드시나요?
```
- ⚽ 축구
- 🏀 농구
- ⚾ 야구
- 🏐 배구
- 기타

#### 질문 2: 대상 연령
```
주 대상 연령대는?
```
- 유아 (4-6세)
- 초등 (7-12세)
- 중등 (13-15세)
- 고등 (16-18세)
- 혼합

#### 질문 3: 운영 방식
```
아카데미 운영 방식은?
```
- 정기 수업 (주 1-2회)
- 집중 캠프 (방학)
- 개인 레슨
- 혼합

#### 질문 4: 코치 구성
```
코치는 어떻게 구성하시나요?
```
- 단일 코치
- 여러 코치 (팀 구성)
- 외부 강사 초빙
- 미정

#### 질문 5: 지역
```
어느 지역에서 운영하시나요?
```
- 지역 입력 (시/구/군)

---

### 클럽 (Club) 질문 시퀀스

#### 질문 1: 종목
```
어떤 종목 클럽을 만드시나요?
```
- ⚽ 축구
- 🏀 농구
- ⚾ 야구
- 🏐 배구
- 기타

#### 질문 2: 클럽 유형
```
어떤 유형의 클럽인가요?
```
- 아마추어 클럽
- 유소년 클럽
- 기업 클럽
- 동호회

#### 질문 3: 활동 빈도
```
주로 얼마나 자주 활동하시나요?
```
- 주 1회
- 주 2-3회
- 주 4회 이상
- 불규칙

#### 질문 4: 지역
```
어느 지역에서 활동하시나요?
```
- 지역 입력 (시/구/군)

---

## 🖼️ 화면 3: Hero 이미지 선택

**URL**: `/platform/organizations/create/ai/hero?type={type}`

**목적**: 조직 홈페이지 상단 Hero 이미지 선택

**레이아웃**:
```
┌─────────────────────────────────────┐
│  [Header]                           │
├─────────────────────────────────────┤
│                                     │
│  [진행률 표시]                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  [5/6]                              │
│                                     │
│  협회 홈페이지 상단 이미지를         │
│  선택하세요                          │
│                                     │
│  ┌──────────┐  ┌──────────┐      │
│  │ [이미지] │  │ [이미지] │      │
│  │ ⚽ 축구   │  │ 🏟️ 스타디움│     │
│  │ 경기장   │  │          │      │
│  └──────────┘  └──────────┘      │
│                                     │
│  ┌──────────┐  ┌──────────┐      │
│  │ [이미지] │  │ [이미지] │      │
│  │ 👥 팀    │  │ 🏃 훈련   │      │
│  │ 단체 사진│  │ 장면      │      │
│  └──────────┘  └──────────┘      │
│                                     │
│  ┌──────────┐                      │
│  │ [이미지] │                      │
│  │ 📷 직접  │                      │
│  │ 업로드   │                      │
│  └──────────┘                      │
│                                     │
│  [이전] [다음]                      │
│                                     │
└─────────────────────────────────────┘
```

**이미지 카드 디자인**:
```
┌─────────────────────────────┐
│  [이미지 썸네일]             │
│  (16:9 비율)                 │
│                             │
│  ⚽ 축구 경기장              │
│                             │
│  [선택됨] ← 선택 시 표시     │
└─────────────────────────────┘
```

**이미지 라이브러리 구조**:
```
/images/hero/
  ├─ football/
  │   ├─ stadium_01.jpg
  │   ├─ stadium_02.jpg
  │   ├─ training_01.jpg
  │   ├─ team_01.jpg
  │   └─ match_01.jpg
  ├─ basketball/
  │   ├─ court_01.jpg
  │   ├─ training_01.jpg
  │   └─ team_01.jpg
  ├─ academy/
  │   ├─ kids_training_01.jpg
  │   ├─ kids_training_02.jpg
  │   └─ coach_01.jpg
  └─ generic/
      ├─ sports_01.jpg
      └─ sports_02.jpg
```

**직접 업로드**:
- 클릭 시 파일 선택 다이얼로그
- 이미지 업로드 → Firebase Storage
- 업로드된 이미지 URL 저장

**액션**:
- 이미지 카드 클릭 → 선택 상태 토글
- `이전` 클릭 → 화면 2 (AI 질문)로 이동
- `다음` 클릭 → 화면 4 (AI 분석)로 이동

---

## 🎯 화면 4: AI 분석 & 템플릿 추천

**URL**: `/platform/organizations/create/ai/recommend?type={type}`

**목적**: 수집 정보 분석 및 조직 유형별 템플릿 추천

### 협회 (Federation) 템플릿

#### 템플릿 1: 지역 생활체육 축구협회 (추천)
```
포함 기능:
✓ 리그 운영
✓ 팀 관리
✓ 선수 등록
✓ 경기 일정
✓ 결과 입력
✓ 순위 자동 계산
✓ 공지사항
```

#### 템플릿 2: 토너먼트 중심 협회
```
포함 기능:
✓ 대회 운영
✓ 참가 신청
✓ 대진표 관리
✓ 결과 입력
✓ 공지사항
```

---

### 아카데미 (Academy) 템플릿

#### 템플릿 1: 정기 수업 아카데미 (추천)
```
포함 기능:
✓ 코치 프로필
✓ 훈련 프로그램
✓ 수강 신청
✓ 일정 관리
✓ 선수 등록
✓ 공지사항
```

#### 템플릿 2: 집중 캠프 아카데미
```
포함 기능:
✓ 캠프 프로그램
✓ 신청 관리
✓ 일정 관리
✓ 선수 등록
✓ 공지사항
```

---

### 클럽 (Club) 템플릿

#### 템플릿 1: 아마추어 클럽 (추천)
```
포함 기능:
✓ 팀 소개
✓ 선수 프로필
✓ 경기 일정
✓ 경기 결과
✓ 공지사항
```

---

## 📋 화면 5: 검토 화면 (Review)

**URL**: `/platform/organizations/create/review?type={type}&templateId={id}`

**목적**: 생성될 조직 구조 미리보기

### 협회 (Federation) 검토 화면

```
┌─────────────────────────────────────┐
│  [Header]                           │
├─────────────────────────────────────┤
│                                     │
│  생성 예정 구조                      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 조직 정보                     │   │
│  │                              │   │
│  │ 유형: 협회                    │   │
│  │ 이름: 노원구 축구협회         │   │
│  │ 종목: 축구                    │   │
│  │ 지역: 서울시 노원구           │   │
│  │                              │   │
│  │ [Hero 이미지 미리보기]        │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 생성 메뉴                    │   │
│  │                              │   │
│  │ • 홈                          │   │
│  │ • 리그                        │   │
│  │ • 경기                        │   │
│  │ • 팀                          │   │
│  │ • 순위                        │   │
│  │ • 공지                        │   │
│  │ • 문의                        │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 관리자 기능                  │   │
│  │                              │   │
│  │ • 시즌 생성                  │   │
│  │ • 리그 생성                  │   │
│  │ • 팀 승인                    │   │
│  │ • 경기 일정 관리             │   │
│  │ • 결과 입력                  │   │
│  │ • 공지 관리                  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 기본 데이터                  │   │
│  │                              │   │
│  │ • 2026 시즌                  │   │
│  │ • 공지 샘플                  │   │
│  └─────────────────────────────┘   │
│                                     │
│  [이전] [조직 생성하기]              │
│                                     │
└─────────────────────────────────────┘
```

### 아카데미 (Academy) 검토 화면

```
┌─────────────────────────────┐
│ 생성 메뉴                   │
│                             │
│ • 홈                        │
│ • 코치                      │
│ • 훈련 프로그램             │
│ • 수강 신청                 │
│ • 선수 등록                 │
│ • 공지                      │
│ • 문의                      │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 관리자 기능                  │
│                             │
│ • 코치 등록                 │
│ • 프로그램 생성             │
│ • 수강 신청 관리            │
│ • 선수 등록 관리            │
│ • 일정 관리                │
│ • 공지 관리                │
└─────────────────────────────┘
```

### 클럽 (Club) 검토 화면

```
┌─────────────────────────────┐
│ 생성 메뉴                   │
│                             │
│ • 홈                        │
│ • 팀 소개                   │
│ • 선수                      │
│ • 경기 일정                 │
│ • 경기 결과                 │
│ • 공지                      │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 관리자 기능                  │
│                             │
│ • 선수 등록                 │
│ • 경기 일정 생성            │
│ • 경기 결과 입력            │
│ • 공지 관리                │
└─────────────────────────────┘
```

---

## ✏️ 화면 6: 폼 입력 (보조 플로우)

**URL**: `/platform/organizations/create/form?type={type}`

**목적**: 빠른 생성이 필요한 사용자를 위한 직접 입력

**레이아웃**:
```
┌─────────────────────────────────────┐
│  [Header]                           │
├─────────────────────────────────────┤
│                                     │
│  직접 설정하기                       │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 조직 유형 *                   │   │
│  │ [협회 ▼]                     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 조직명 *                     │   │
│  │ [________________________]   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 종목 *                      │   │
│  │ [축구 ▼]                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 지역 *                      │   │
│  │ [서울시 노원구]             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Hero 이미지                  │   │
│  │ [이미지 선택]                │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 템플릿 선택                  │   │
│  │ [표준 템플릿 ▼]              │   │
│  └─────────────────────────────┘   │
│                                     │
│  [취소] [다음 단계]                  │
│                                     │
└─────────────────────────────────────┘
```

---

## ✅ 화면 7: 생성 완료 (Success)

**URL**: `/platform/organizations/create/success?organizationId={id}&type={type}`

**목적**: 조직 생성 완료 안내

**레이아웃**:
```
┌─────────────────────────────────────┐
│  [Header]                           │
├─────────────────────────────────────┤
│                                     │
│         [체크 아이콘]                │
│                                     │
│  조직이 생성되었습니다! 🎉          │
│                                     │
│  노원구 축구협회                     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 생성된 항목                  │   │
│  │                             │   │
│  │ ✓ 조직 홈페이지             │   │
│  │ ✓ 관리자 대시보드            │   │
│  │ ✓ 기본 메뉴 구조            │   │
│  │ ✓ Hero 이미지               │   │
│  │ ✓ 2026 시즌 (협회만)        │   │
│  │ ✓ 공지 샘플                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 조직 홈으로 이동              │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 관리자 대시보드로 이동        │   │
│  └─────────────────────────────┘   │
│                                     │
│  [다른 조직 생성하기]                │
│                                     │
└─────────────────────────────────────┘
```

---

## 🗄️ 데이터 구조 확장

### Organization (통합 타입)

```typescript
interface Organization {
  // 기본 정보
  id: string;
  type: "federation" | "academy" | "club";
  name: string;
  slug: string;
  sport: string;
  region: string;
  description?: string;
  
  // 이미지
  logoUrl?: string;
  heroImageUrl: string;              // Hero 이미지 (필수)
  
  // 관리자
  ownerId: string;
  adminIds: string[];
  
  // 상태
  status: "active" | "inactive" | "suspended";
  
  // 템플릿
  templateId: string;
  
  // 타임스탬프
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### Hero 이미지 선택 데이터

```typescript
interface HeroImageSelection {
  source: "library" | "upload";       // 라이브러리 or 직접 업로드
  imageUrl: string;                   // 이미지 URL
  libraryId?: string;                  // 라이브러리 이미지 ID (선택)
}
```

---

## 🎨 Hero 이미지 라이브러리 구조

### Firebase Storage 구조

```
hero_images/
  ├─ football/
  │   ├─ stadium_01.jpg
  │   ├─ stadium_02.jpg
  │   ├─ training_01.jpg
  │   ├─ team_01.jpg
  │   └─ match_01.jpg
  ├─ basketball/
  │   ├─ court_01.jpg
  │   ├─ training_01.jpg
  │   └─ team_01.jpg
  ├─ academy/
  │   ├─ kids_training_01.jpg
  │   ├─ kids_training_02.jpg
  │   └─ coach_01.jpg
  └─ generic/
      ├─ sports_01.jpg
      └─ sports_02.jpg
```

### 이미지 메타데이터

```typescript
interface HeroImageMetadata {
  id: string;
  category: "football" | "basketball" | "academy" | "generic";
  name: string;                       // "축구 경기장"
  description?: string;
  imageUrl: string;
  thumbnailUrl: string;
  tags: string[];                     // ["stadium", "football", "match"]
}
```

---

## 🚀 Cloud Function: 조직 생성

### 함수 구현

```typescript
/**
 * 조직 생성 Cloud Function
 */
export const createOrganization = onCall(async (request) => {
  const {
    type,
    name,
    sport,
    region,
    heroImageUrl,
    templateId,
    conversationData
  } = request.data;
  
  const userId = request.auth?.uid;
  
  if (!userId) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }
  
  // Slug 생성
  const slug = generateSlug(name);
  
  // 조직 문서 생성
  const orgRef = admin.firestore().collection("organizations").doc();
  
  const organizationData: Organization = {
    id: orgRef.id,
    type,
    name,
    slug,
    sport,
    region,
    heroImageUrl,
    templateId,
    ownerId: userId,
    adminIds: [userId],
    status: "active",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  await orgRef.set(organizationData);
  
  // 템플릿 기반 초기 데이터 생성
  await createFromTemplate(orgRef.id, type, templateId, {
    heroImageUrl,
    ...conversationData
  });
  
  return {
    success: true,
    organizationId: orgRef.id,
    slug,
    type
  };
});
```

---

## 📊 템플릿 라이브러리 구조

### 템플릿 정의

```typescript
interface OrganizationTemplate {
  id: string;
  type: "federation" | "academy" | "club";
  name: string;
  description: string;
  features: string[];
  defaultMenus: string[];
  defaultData: {
    seasons?: string[];
    announcements?: number;
    programs?: string[];
  };
  heroImageCategory?: string;          // 추천 Hero 이미지 카테고리
}
```

### 템플릿 예시

```typescript
const templates: OrganizationTemplate[] = [
  {
    id: "federation-region-adult-soccer",
    type: "federation",
    name: "지역 생활체육 축구협회",
    description: "지역 기반 성인 축구 리그 운영 템플릿",
    features: [
      "리그 운영",
      "팀 관리",
      "선수 등록",
      "경기 일정",
      "결과 입력",
      "순위 자동 계산"
    ],
    defaultMenus: ["홈", "리그", "경기", "팀", "순위", "공지", "문의"],
    defaultData: {
      seasons: ["2026 시즌"],
      announcements: 1
    },
    heroImageCategory: "football"
  },
  {
    id: "academy-regular-class",
    type: "academy",
    name: "정기 수업 아카데미",
    description: "주 1-2회 정기 수업 운영 템플릿",
    features: [
      "코치 프로필",
      "훈련 프로그램",
      "수강 신청",
      "일정 관리",
      "선수 등록"
    ],
    defaultMenus: ["홈", "코치", "프로그램", "수강 신청", "선수", "공지"],
    defaultData: {
      announcements: 1
    },
    heroImageCategory: "academy"
  }
];
```

---

## 🌐 URL 구조

### 조직 홈페이지

```
/federations/{slug}          → 협회 홈
/academies/{slug}           → 아카데미 홈
/clubs/{slug}               → 클럽 홈
```

### 관리자 대시보드

```
/admin/federations/{slug}    → 협회 관리
/admin/academies/{slug}      → 아카데미 관리
/admin/clubs/{slug}          → 클럽 관리
```

---

## 🎨 Hero Section 구현

### React 컴포넌트

```typescript
interface HeroSectionProps {
  organization: Organization;
  title: string;
  subtitle?: string;
}

export default function HeroSection({
  organization,
  title,
  subtitle
}: HeroSectionProps) {
  return (
    <div className="relative w-full h-[400px] md:h-[500px]">
      {/* Hero 이미지 */}
      <img
        src={organization.heroImageUrl}
        alt={title}
        className="w-full h-full object-cover"
      />
      
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/40" />
      
      {/* 콘텐츠 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xl md:text-2xl text-center">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
```

---

## 📋 구현 체크리스트

### Phase 1: 기본 구조
- [ ] Organization 타입 정의 (federation/academy/club 통합)
- [ ] Hero 이미지 라이브러리 구조 생성
- [ ] 템플릿 라이브러리 확장

### Phase 2: UI 구현
- [ ] 진입 화면 (조직 유형 선택)
- [ ] AI 질문 Wizard (조직 유형별)
- [ ] Hero 이미지 선택 화면
- [ ] 템플릿 추천 화면
- [ ] 검토 화면 (조직 유형별)

### Phase 3: 생성 로직
- [ ] Cloud Function: createOrganization
- [ ] 템플릿 기반 초기 데이터 생성
- [ ] Hero 이미지 업로드 처리

### Phase 4: Hero Section
- [ ] HeroSection 컴포넌트 구현
- [ ] 조직 홈페이지에 Hero Section 적용

---

## 🔥 핵심 가치

### 1. 플랫폼 확장성

**단일 협회 플랫폼** → **스포츠 조직 플랫폼**

- 협회, 아카데미, 클럽 모두 지원
- 조직 유형별 맞춤 템플릿
- 확장 가능한 구조

### 2. 브랜딩 강화

**Hero 이미지 선택**으로:
- 조직별 고유한 브랜딩
- 시각적 차별화
- 전문성 향상

### 3. 사용자 경험

**3분 조직 생성**:
- AI 질문으로 빠른 설정
- Hero 이미지로 즉시 브랜딩
- 템플릿으로 완성도 높은 사이트

---

## 🚀 다음 단계

이 설계를 기반으로:

1. **타입 정의**: `src/types/organization.ts` 생성
2. **서비스 레이어**: `src/services/organizationService.ts` 생성
3. **UI 컴포넌트**: 각 화면별 컴포넌트 구현
4. **Cloud Functions**: 조직 생성 및 템플릿 적용

원하시면 다음 단계로 바로 진행하겠습니다! 🚀

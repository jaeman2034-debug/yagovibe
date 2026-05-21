# YAGO Organization Builder - UI 아키텍처 (한 장 구조)

## 🎯 전체 플로우

```
User
 │
 ▼
Organization Builder (Wizard UI)
 │
 ├─ Step 1: Organization Type
 ├─ Step 2: Sport Selection
 ├─ Step 3: Target Audience
 ├─ Step 4: Operation Type
 ├─ Step 5: Logo Upload
 ├─ Step 6: Hero Image Selection
 └─ Step 7: Template Recommendation
           │
           ▼
      Organization Generator
           │
           ▼
       Platform Database
           │
           ▼
   Organization Website + Admin Dashboard
```

---

## 📱 React Wizard 구조

### State 관리

```typescript
const [currentStep, setCurrentStep] = useState(0);
const [formData, setFormData] = useState<OrganizationFormData>({
  organizationType: null,
  sport: null,
  target: null,
  operationType: null,
  logoFile: null,
  logoUrl: null,
  heroImageSource: null,
  heroImageUrl: null,
  heroImageFile: null,
  templateId: null,
  name: "",
  region: "",
  description: ""
});
```

### Step 정의

```typescript
const STEPS = [
  { id: "organizationType", title: "조직 유형", component: StepOrganizationType },
  { id: "sport", title: "종목", component: StepSport },
  { id: "target", title: "참가 대상", component: StepTarget },
  { id: "operationType", title: "운영 방식", component: StepOperationType },
  { id: "logo", title: "로고", component: StepLogo },
  { id: "heroImage", title: "Hero 이미지", component: StepHeroImage },
  { id: "template", title: "템플릿", component: StepTemplate }
];
```

---

## 🎨 Step별 UI 구조

### STEP 1: 조직 유형 선택

**질문**: "어떤 조직을 만드시나요?"

**UI**:
```typescript
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <OrganizationTypeCard
    icon="🏆"
    title="협회"
    subtitle="리그 운영 및 대회 관리"
    value="federation"
    selected={formData.organizationType === "federation"}
    onClick={() => setFormData({ ...formData, organizationType: "federation" })}
  />
  <OrganizationTypeCard
    icon="🏫"
    title="아카데미"
    subtitle="훈련 프로그램 및 선수 육성"
    value="academy"
    selected={formData.organizationType === "academy"}
    onClick={() => setFormData({ ...formData, organizationType: "academy" })}
  />
  <OrganizationTypeCard
    icon="⚽"
    title="클럽"
    subtitle="팀 중심 운영"
    value="club"
    selected={formData.organizationType === "club"}
    onClick={() => setFormData({ ...formData, organizationType: "club" })}
  />
</div>
```

**검증**: `formData.organizationType !== null`

---

### STEP 2: 종목 선택

**질문**: "어떤 종목인가요?"

**UI**:
```typescript
<div className="grid grid-cols-3 md:grid-cols-5 gap-4">
  {SPORTS.map((sport) => (
    <SportCard
      key={sport.value}
      icon={sport.icon}
      label={sport.label}
      value={sport.value}
      selected={formData.sport === sport.value}
      onClick={() => setFormData({ ...formData, sport: sport.value })}
    />
  ))}
</div>
```

**SPORTS 데이터**:
```typescript
const SPORTS = [
  { value: "football", icon: "⚽", label: "축구" },
  { value: "basketball", icon: "🏀", label: "농구" },
  { value: "baseball", icon: "⚾", label: "야구" },
  { value: "volleyball", icon: "🏐", label: "배구" },
  { value: "badminton", icon: "🏸", label: "배드민턴" }
];
```

**검증**: `formData.sport !== null`

---

### STEP 3: 참가 대상

**질문**: "주 참가 대상은 누구인가요?"

**조직 유형별 다른 옵션**:

**Federation**:
```typescript
const TARGETS_FEDERATION = [
  { value: "youth", label: "유소년" },
  { value: "teen", label: "청소년" },
  { value: "adult", label: "성인" },
  { value: "mixed", label: "혼합" }
];
```

**Academy**:
```typescript
const TARGETS_ACADEMY = [
  { value: "preschool", label: "유아 (4-6세)" },
  { value: "elementary", label: "초등 (7-12세)" },
  { value: "middle", label: "중등 (13-15세)" },
  { value: "high", label: "고등 (16-18세)" },
  { value: "mixed", label: "혼합" }
];
```

**Club**:
```typescript
const TARGETS_CLUB = [
  { value: "amateur", label: "아마추어" },
  { value: "youth", label: "유소년" },
  { value: "company", label: "기업" },
  { value: "community", label: "동호회" }
];
```

**UI**:
```typescript
const targets = getTargetsByOrganizationType(formData.organizationType);

<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {targets.map((target) => (
    <button
      key={target.value}
      onClick={() => setFormData({ ...formData, target: target.value })}
      className={`p-4 border-2 rounded-lg ${
        formData.target === target.value
          ? "border-blue-600 bg-blue-50"
          : "border-gray-200"
      }`}
    >
      {target.label}
    </button>
  ))}
</div>
```

**검증**: `formData.target !== null`

---

### STEP 4: 운영 방식

**질문**: "운영 방식은 무엇인가요?"

**조직 유형별 다른 옵션**:

**Federation**:
```typescript
const OPERATIONS_FEDERATION = [
  { value: "league", label: "풀리그" },
  { value: "tournament", label: "토너먼트" },
  { value: "mixed", label: "리그 + 토너먼트" },
  { value: "event", label: "이벤트 중심" }
];
```

**Academy**:
```typescript
const OPERATIONS_ACADEMY = [
  { value: "regular", label: "정기 수업 (주 1-2회)" },
  { value: "camp", label: "집중 캠프 (방학)" },
  { value: "private", label: "개인 레슨" },
  { value: "mixed", label: "혼합" }
];
```

**Club**:
```typescript
const OPERATIONS_CLUB = [
  { value: "weekly", label: "주 1회" },
  { value: "frequent", label: "주 2-3회" },
  { value: "intensive", label: "주 4회 이상" },
  { value: "irregular", label: "불규칙" }
];
```

**검증**: `formData.operationType !== null`

---

### STEP 5: 로고 업로드

**질문**: "조직 로고를 업로드하세요 (선택)"

**UI**:
```typescript
<div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
  {formData.logoUrl ? (
    <div>
      <img
        src={formData.logoUrl}
        alt="로고"
        className="w-32 h-32 mx-auto mb-4 object-contain"
      />
      <button
        onClick={() => setFormData({ ...formData, logoFile: null, logoUrl: null })}
        className="text-sm text-red-600"
      >
        제거
      </button>
    </div>
  ) : (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            setFormData({ ...formData, logoFile: file, logoUrl: url });
          }
        }}
        className="hidden"
        id="logo-upload"
      />
      <label
        htmlFor="logo-upload"
        className="cursor-pointer text-blue-600 font-medium"
      >
        📷 로고 이미지 선택
      </label>
      <p className="text-sm text-gray-500 mt-2">
        PNG, JPG (최대 5MB)
      </p>
    </div>
  )}
</div>
```

**검증**: 선택 사항 (항상 통과)

---

### STEP 6: Hero 이미지 선택

**질문**: "홈페이지 상단 이미지를 선택하세요"

**UI**:
```typescript
<div className="space-y-6">
  {/* 라이브러리 이미지 */}
  <div>
    <h3 className="text-sm font-medium mb-4">라이브러리 이미지</h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {heroImageLibrary
        .filter(img => 
          img.category === formData.sport || 
          img.category === "generic" ||
          img.category === formData.organizationType
        )
        .map((image) => (
          <button
            key={image.id}
            onClick={() => {
              setFormData({
                ...formData,
                heroImageSource: "library",
                heroImageUrl: image.imageUrl,
                heroImageFile: null
              });
            }}
            className={`relative border-2 rounded-lg overflow-hidden ${
              formData.heroImageUrl === image.imageUrl
                ? "border-blue-600 ring-2 ring-blue-200"
                : "border-gray-200"
            }`}
          >
            <img
              src={image.thumbnailUrl}
              alt={image.name}
              className="w-full h-32 object-cover"
            />
            <div className="p-2 text-xs text-center bg-white">
              {image.name}
            </div>
            {formData.heroImageUrl === image.imageUrl && (
              <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                ✓
              </div>
            )}
          </button>
        ))}
    </div>
  </div>
  
  {/* 직접 업로드 */}
  <div>
    <h3 className="text-sm font-medium mb-4">직접 업로드</h3>
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            setFormData({
              ...formData,
              heroImageSource: "upload",
              heroImageFile: file,
              heroImageUrl: url
            });
          }
        }}
        className="hidden"
        id="hero-upload"
      />
      <label
        htmlFor="hero-upload"
        className="cursor-pointer text-blue-600 font-medium"
      >
        📷 이미지 업로드
      </label>
      <p className="text-sm text-gray-500 mt-2">
        PNG, JPG (권장: 1920x600px, 최대 10MB)
      </p>
    </div>
  </div>
</div>
```

**Hero 이미지 라이브러리**:
```typescript
const heroImageLibrary = [
  {
    id: "football-stadium-01",
    category: "football",
    name: "축구 경기장",
    imageUrl: "/images/hero/football/stadium_01.jpg",
    thumbnailUrl: "/images/hero/football/stadium_01_thumb.jpg"
  },
  {
    id: "football-training-01",
    category: "football",
    name: "훈련 장면",
    imageUrl: "/images/hero/football/training_01.jpg",
    thumbnailUrl: "/images/hero/football/training_01_thumb.jpg"
  },
  {
    id: "academy-kids-01",
    category: "academy",
    name: "유소년 훈련",
    imageUrl: "/images/hero/academy/kids_training_01.jpg",
    thumbnailUrl: "/images/hero/academy/kids_training_01_thumb.jpg"
  },
  {
    id: "generic-sports-01",
    category: "generic",
    name: "스포츠 일반",
    imageUrl: "/images/hero/generic/sports_01.jpg",
    thumbnailUrl: "/images/hero/generic/sports_01_thumb.jpg"
  }
];
```

**검증**: `formData.heroImageUrl !== null`

---

### STEP 7: 템플릿 추천

**질문**: "추천 템플릿"

**UI**:
```typescript
const recommendedTemplates = getRecommendedTemplates({
  organizationType: formData.organizationType,
  sport: formData.sport,
  target: formData.target,
  operationType: formData.operationType
});

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {recommendedTemplates.map((template) => (
    <button
      key={template.id}
      onClick={() => setFormData({ ...formData, templateId: template.id })}
      className={`p-6 border-2 rounded-lg text-left transition-all ${
        formData.templateId === template.id
          ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="font-semibold text-lg">{template.name}</div>
        {formData.templateId === template.id && (
          <div className="text-blue-600">✓</div>
        )}
      </div>
      <div className="text-sm text-gray-600 mb-4">{template.description}</div>
      <div className="space-y-1">
        {template.features.map((feature, idx) => (
          <div key={idx} className="text-sm text-gray-500">
            ✓ {feature}
          </div>
        ))}
      </div>
    </button>
  ))}
</div>
```

**템플릿 추천 로직**:
```typescript
function getRecommendedTemplates(data: {
  organizationType: string;
  sport: string;
  target: string;
  operationType: string;
}): Template[] {
  let templates = TEMPLATES.filter(t => t.type === data.organizationType);
  
  templates = templates.map(template => ({
    ...template,
    score: calculateMatchScore(template, data)
  }));
  
  templates.sort((a, b) => b.score - a.score);
  
  return templates.slice(0, 3);
}

function calculateMatchScore(template: Template, data: any): number {
  let score = 0;
  
  if (template.sport === data.sport) score += 10;
  if (template.target === data.target) score += 8;
  if (template.operationType === data.operationType) score += 6;
  
  return score;
}
```

**검증**: `formData.templateId !== null`

---

## 📊 진행률 표시

**상단 UI**:
```typescript
<div className="mb-8">
  <div className="flex items-center justify-between mb-2">
    <span className="text-sm font-medium text-gray-700">
      {STEPS[currentStep].title}
    </span>
    <span className="text-sm text-gray-500">
      {currentStep + 1} / {STEPS.length}
    </span>
  </div>
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
      style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
    />
  </div>
</div>
```

---

## 🎛️ 네비게이션

**이전/다음 버튼**:
```typescript
<div className="flex justify-between mt-8">
  <button
    onClick={() => setCurrentStep(currentStep - 1)}
    disabled={currentStep === 0}
    className="px-6 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
  >
    이전
  </button>
  
  <button
    onClick={handleNext}
    disabled={!canProceed()}
    className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
  >
    {currentStep === STEPS.length - 1 ? "생성하기" : "다음"}
  </button>
</div>
```

**검증 함수**:
```typescript
function canProceed(): boolean {
  switch (currentStep) {
    case 0: return formData.organizationType !== null;
    case 1: return formData.sport !== null;
    case 2: return formData.target !== null;
    case 3: return formData.operationType !== null;
    case 4: return true; // 로고는 선택 사항
    case 5: return formData.heroImageUrl !== null;
    case 6: return formData.templateId !== null;
    default: return false;
  }
}
```

---

## 🗄️ 데이터 구조

### Organization (Firestore)

```typescript
interface Organization {
  id: string;
  type: "federation" | "academy" | "club";
  name: string;
  slug: string;
  sport: string;
  region: string;
  target: string;
  operationType: string;
  
  // 이미지
  logoUrl?: string;
  heroImageUrl: string;
  
  // 템플릿
  templateId: string;
  
  // 관리자
  ownerId: string;
  adminIds: string[];
  
  // 상태
  status: "active" | "inactive" | "suspended";
  
  // 타임스탬프
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

## 🎨 생성되는 메뉴 구조

### Federation (협회)
```
홈
리그
경기
팀
순위
공지
문의
```

### Academy (아카데미)
```
홈
코치
훈련 프로그램
수강 신청
선수 등록
공지
문의
```

### Club (클럽)
```
홈
팀 소개
선수
경기 일정
경기 결과
공지
```

---

## 🚀 생성 API

```typescript
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

const createOrganization = httpsCallable(functions, "createOrganization");

// 이미지 업로드 (Firebase Storage)
const logoUrl = formData.logoFile 
  ? await uploadImage(formData.logoFile, `organizations/${organizationId}/logo`)
  : null;

const heroImageUrl = formData.heroImageFile
  ? await uploadImage(formData.heroImageFile, `organizations/${organizationId}/hero`)
  : formData.heroImageUrl; // 라이브러리 이미지인 경우

// Organization 생성
const result = await createOrganization({
  type: formData.organizationType,
  name: formData.name,
  sport: formData.sport,
  region: formData.region,
  target: formData.target,
  operationType: formData.operationType,
  logoUrl,
  heroImageUrl,
  templateId: formData.templateId,
  description: formData.description
});
```

---

## 📁 파일 구조

```
src/
├── pages/
│   └── platform/
│       └── OrganizationCreatePage.tsx
├── components/
│   └── organization/
│       ├── WizardProgress.tsx
│       ├── WizardNavigation.tsx
│       ├── steps/
│       │   ├── StepOrganizationType.tsx
│       │   ├── StepSport.tsx
│       │   ├── StepTarget.tsx
│       │   ├── StepOperationType.tsx
│       │   ├── StepLogo.tsx
│       │   ├── StepHeroImage.tsx
│       │   └── StepTemplate.tsx
│       └── cards/
│           ├── OrganizationTypeCard.tsx
│           ├── SportCard.tsx
│           └── TemplateCard.tsx
├── services/
│   └── organizationService.ts
├── types/
│   └── organization.ts
├── lib/
│   ├── templates.ts
│   └── heroImages.ts
└── hooks/
    └── useOrganizationWizard.ts
```

---

## ✅ 구현 체크리스트

- [ ] WizardProgress 컴포넌트
- [ ] StepOrganizationType 컴포넌트
- [ ] StepSport 컴포넌트
- [ ] StepTarget 컴포넌트 (조직 유형별)
- [ ] StepOperationType 컴포넌트 (조직 유형별)
- [ ] StepLogo 컴포넌트 (파일 업로드)
- [ ] StepHeroImage 컴포넌트 (라이브러리 + 업로드)
- [ ] StepTemplate 컴포넌트 (추천 로직)
- [ ] WizardNavigation 컴포넌트
- [ ] 이미지 업로드 처리 (Firebase Storage)
- [ ] 템플릿 추천 로직
- [ ] Organization 생성 API 연결
- [ ] 검증 로직 (각 Step별)

---

## 🎯 Cursor에게 전달할 지시

```
Implement this as a React + Tailwind step-based wizard UI.
Each step should be a component and controlled by step state.
Use TypeScript for type safety.
Implement image upload with Firebase Storage.
Create template recommendation logic based on user selections.
```

---

## 🔥 추가 개선: 진입 화면

**Wizard 시작 전 진입 화면**:

```typescript
<div className="text-center py-12">
  <h1 className="text-3xl font-bold mb-4">
    3분 안에 스포츠 조직 사이트를 만들어보세요
  </h1>
  <p className="text-gray-600 mb-8">
    AI가 몇 가지 질문을 드리고, 운영 방식에 맞는 템플릿을 추천해드립니다.
  </p>
  
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
    <button
      onClick={() => {
        setFormData({ ...formData, organizationType: "federation" });
        setCurrentStep(1);
      }}
      className="p-8 border-2 border-gray-200 rounded-xl hover:border-blue-600 hover:bg-blue-50 transition-all"
    >
      <div className="text-5xl mb-4">🏆</div>
      <div className="font-semibold text-lg mb-2">협회 생성</div>
      <div className="text-sm text-gray-600">
        리그 운영 · 팀 관리
      </div>
    </button>
    
    <button
      onClick={() => {
        setFormData({ ...formData, organizationType: "academy" });
        setCurrentStep(1);
      }}
      className="p-8 border-2 border-gray-200 rounded-xl hover:border-blue-600 hover:bg-blue-50 transition-all"
    >
      <div className="text-5xl mb-4">🏫</div>
      <div className="font-semibold text-lg mb-2">아카데미 생성</div>
      <div className="text-sm text-gray-600">
        코치 · 훈련 프로그램
      </div>
    </button>
    
    <button
      onClick={() => {
        setFormData({ ...formData, organizationType: "club" });
        setCurrentStep(1);
      }}
      className="p-8 border-2 border-gray-200 rounded-xl hover:border-blue-600 hover:bg-blue-50 transition-all"
    >
      <div className="text-5xl mb-4">⚽</div>
      <div className="font-semibold text-lg mb-2">클럽 생성</div>
      <div className="text-sm text-gray-600">
        팀 소개 · 선수 프로필
      </div>
    </button>
  </div>
</div>
```

---

이 구조를 Cursor에 제공하면 **거의 자동으로 UI + 로직을 생성**합니다! 🚀

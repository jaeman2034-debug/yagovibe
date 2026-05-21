# YAGO 조직 생성 시스템 - Cursor 개발 지시서

## 🎯 목표

**현재**: 협회만 생성 가능  
**변경**: 협회 / 아카데미 / 클럽 생성 + Hero 이미지 + 로고 업로드

---

## 📋 구현 요구사항

### 1. 페이지 타이틀 변경

**현재**:
```typescript
"협회 생성"
```

**변경**:
```typescript
"조직 생성"
"협회 · 아카데미 · 클럽"
```

**설명 문구**:
```typescript
"AI가 몇 가지 질문을 통해 협회 또는 아카데미 사이트를 자동으로 만들어드립니다."
```

---

### 2. Wizard Step 구조

**Step 기반 React Wizard 구현**

```typescript
const [currentStep, setCurrentStep] = useState(0);

const STEPS = [
  { id: "organizationType", title: "조직 유형" },
  { id: "sport", title: "종목" },
  { id: "target", title: "대상" },
  { id: "operationType", title: "운영 방식" },
  { id: "images", title: "이미지" }, // 로고 + Hero 이미지
  { id: "template", title: "템플릿 추천" },
  { id: "review", title: "검토" }
];
```

---

### 3. State 구조

```typescript
interface OrganizationFormData {
  // Step 1: 조직 유형
  organizationType: "federation" | "academy" | "club" | null;
  
  // Step 2: 종목
  sport: "football" | "basketball" | "baseball" | "volleyball" | "badminton" | "other" | null;
  
  // Step 3: 대상
  target: "youth" | "teen" | "adult" | "mixed" | null;
  
  // Step 4: 운영 방식
  operationType: "league" | "tournament" | "training" | "mixed" | null;
  
  // Step 5: 이미지
  logoFile: File | null;
  logoUrl: string | null;
  heroImageSource: "library" | "upload" | null;
  heroImageUrl: string | null;
  heroImageFile: File | null; // 직접 업로드인 경우
  
  // Step 6: 템플릿
  templateId: string | null;
  
  // 기타
  name: string;
  region: string;
  description?: string;
}
```

---

### 4. Step 1: 조직 유형 선택

**UI 구조**:
```typescript
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <button
    onClick={() => setFormData({ ...formData, organizationType: "federation" })}
    className={`p-6 border-2 rounded-lg ${
      formData.organizationType === "federation" 
        ? "border-blue-600 bg-blue-50" 
        : "border-gray-200"
    }`}
  >
    <div className="text-4xl mb-2">🏆</div>
    <div className="font-semibold">협회</div>
    <div className="text-sm text-gray-500">리그 운영 · 팀 관리</div>
  </button>
  
  <button
    onClick={() => setFormData({ ...formData, organizationType: "academy" })}
    className={`p-6 border-2 rounded-lg ${
      formData.organizationType === "academy" 
        ? "border-blue-600 bg-blue-50" 
        : "border-gray-200"
    }`}
  >
    <div className="text-4xl mb-2">🏫</div>
    <div className="font-semibold">아카데미</div>
    <div className="text-sm text-gray-500">코치 · 훈련 프로그램</div>
  </button>
  
  <button
    onClick={() => setFormData({ ...formData, organizationType: "club" })}
    className={`p-6 border-2 rounded-lg ${
      formData.organizationType === "club" 
        ? "border-blue-600 bg-blue-50" 
        : "border-gray-200"
    }`}
  >
    <div className="text-4xl mb-2">⚽</div>
    <div className="font-semibold">클럽</div>
    <div className="text-sm text-gray-500">팀 소개 · 선수 프로필</div>
  </button>
</div>
```

**검증**:
```typescript
const canProceedStep1 = formData.organizationType !== null;
```

---

### 5. Step 2: 종목 선택

**UI 구조**:
```typescript
<div className="grid grid-cols-3 md:grid-cols-5 gap-3">
  {["football", "basketball", "baseball", "volleyball", "badminton"].map((sport) => (
    <button
      key={sport}
      onClick={() => setFormData({ ...formData, sport })}
      className={`p-4 border-2 rounded-lg ${
        formData.sport === sport 
          ? "border-blue-600 bg-blue-50" 
          : "border-gray-200"
      }`}
    >
      <div className="text-3xl mb-1">
        {sport === "football" && "⚽"}
        {sport === "basketball" && "🏀"}
        {sport === "baseball" && "⚾"}
        {sport === "volleyball" && "🏐"}
        {sport === "badminton" && "🏸"}
      </div>
      <div className="text-sm font-medium">
        {sport === "football" && "축구"}
        {sport === "basketball" && "농구"}
        {sport === "baseball" && "야구"}
        {sport === "volleyball" && "배구"}
        {sport === "badminton" && "배드민턴"}
      </div>
    </button>
  ))}
  
  <button
    onClick={() => setFormData({ ...formData, sport: "other" })}
    className="p-4 border-2 border-gray-200 rounded-lg"
  >
    <div className="text-sm">기타</div>
  </button>
</div>
```

---

### 6. Step 3: 대상 선택

**조직 유형별 다른 질문**

**Federation (협회)**:
```typescript
const targetOptions = [
  { value: "youth", label: "유소년" },
  { value: "teen", label: "청소년" },
  { value: "adult", label: "성인" },
  { value: "mixed", label: "혼합" }
];
```

**Academy (아카데미)**:
```typescript
const targetOptions = [
  { value: "preschool", label: "유아 (4-6세)" },
  { value: "elementary", label: "초등 (7-12세)" },
  { value: "middle", label: "중등 (13-15세)" },
  { value: "high", label: "고등 (16-18세)" },
  { value: "mixed", label: "혼합" }
];
```

**Club (클럽)**:
```typescript
const targetOptions = [
  { value: "amateur", label: "아마추어" },
  { value: "youth", label: "유소년" },
  { value: "company", label: "기업" },
  { value: "community", label: "동호회" }
];
```

---

### 7. Step 4: 운영 방식

**조직 유형별 다른 질문**

**Federation (협회)**:
```typescript
const operationOptions = [
  { value: "league", label: "풀리그" },
  { value: "tournament", label: "토너먼트" },
  { value: "mixed", label: "리그 + 토너먼트" },
  { value: "event", label: "이벤트 중심" }
];
```

**Academy (아카데미)**:
```typescript
const operationOptions = [
  { value: "regular", label: "정기 수업 (주 1-2회)" },
  { value: "camp", label: "집중 캠프 (방학)" },
  { value: "private", label: "개인 레슨" },
  { value: "mixed", label: "혼합" }
];
```

**Club (클럽)**:
```typescript
const operationOptions = [
  { value: "weekly", label: "주 1회" },
  { value: "frequent", label: "주 2-3회" },
  { value: "intensive", label: "주 4회 이상" },
  { value: "irregular", label: "불규칙" }
];
```

---

### 8. Step 5: 이미지 선택 (로고 + Hero)

**로고 업로드**:
```typescript
<div className="space-y-4">
  <div>
    <label className="block text-sm font-medium mb-2">
      로고 업로드 (선택)
    </label>
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
      {formData.logoUrl ? (
        <div>
          <img src={formData.logoUrl} alt="로고" className="w-32 h-32 mx-auto mb-2" />
          <button
            onClick={() => {
              setFormData({ ...formData, logoFile: null, logoUrl: null });
            }}
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
            className="cursor-pointer text-blue-600"
          >
            로고 이미지 선택
          </label>
        </div>
      )}
    </div>
  </div>
</div>
```

**Hero 이미지 선택**:
```typescript
<div>
  <label className="block text-sm font-medium mb-2">
    Hero 이미지 선택
  </label>
  
  {/* 라이브러리 이미지 */}
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
    {heroImageLibrary
      .filter(img => img.category === formData.sport || img.category === "generic")
      .map((image) => (
        <button
          key={image.id}
          onClick={() => {
            setFormData({
              ...formData,
              heroImageSource: "library",
              heroImageUrl: image.imageUrl
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
            <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
              ✓
            </div>
          )}
        </button>
      ))}
  </div>
  
  {/* 직접 업로드 */}
  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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
      className="cursor-pointer text-blue-600"
    >
      📷 직접 업로드
    </label>
  </div>
</div>
```

**Hero 이미지 라이브러리 데이터**:
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
  // ... 더 많은 이미지
];
```

---

### 9. Step 6: 템플릿 추천

**AI 분석 및 템플릿 추천**:
```typescript
// 수집된 데이터 기반 템플릿 추천
const recommendedTemplates = getRecommendedTemplates({
  organizationType: formData.organizationType,
  sport: formData.sport,
  target: formData.target,
  operationType: formData.operationType
});

// 템플릿 카드 표시
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {recommendedTemplates.map((template) => (
    <button
      key={template.id}
      onClick={() => setFormData({ ...formData, templateId: template.id })}
      className={`p-6 border-2 rounded-lg text-left ${
        formData.templateId === template.id
          ? "border-blue-600 bg-blue-50"
          : "border-gray-200"
      }`}
    >
      <div className="font-semibold text-lg mb-2">{template.name}</div>
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
  // 조직 유형별 템플릿 필터링
  let templates = TEMPLATES.filter(t => t.type === data.organizationType);
  
  // 스코어 계산 (매칭도 기반)
  templates = templates.map(template => ({
    ...template,
    score: calculateMatchScore(template, data)
  }));
  
  // 스코어 높은 순으로 정렬
  templates.sort((a, b) => b.score - a.score);
  
  // 상위 2-3개 반환
  return templates.slice(0, 3);
}
```

---

### 10. Step 7: 검토 화면

**생성 예정 구조 미리보기**:
```typescript
<div className="space-y-6">
  {/* 조직 정보 */}
  <div className="bg-gray-50 rounded-lg p-6">
    <h3 className="font-semibold mb-4">조직 정보</h3>
    <div className="space-y-2">
      <div>유형: {getOrganizationTypeLabel(formData.organizationType)}</div>
      <div>종목: {getSportLabel(formData.sport)}</div>
      <div>대상: {getTargetLabel(formData.target)}</div>
      <div>운영 방식: {getOperationTypeLabel(formData.operationType)}</div>
    </div>
  </div>
  
  {/* 이미지 미리보기 */}
  <div className="bg-gray-50 rounded-lg p-6">
    <h3 className="font-semibold mb-4">이미지</h3>
    <div className="grid grid-cols-2 gap-4">
      {formData.logoUrl && (
        <div>
          <div className="text-sm text-gray-600 mb-2">로고</div>
          <img src={formData.logoUrl} alt="로고" className="w-24 h-24 object-contain" />
        </div>
      )}
      {formData.heroImageUrl && (
        <div>
          <div className="text-sm text-gray-600 mb-2">Hero 이미지</div>
          <img src={formData.heroImageUrl} alt="Hero" className="w-full h-32 object-cover rounded" />
        </div>
      )}
    </div>
  </div>
  
  {/* 생성될 메뉴 */}
  <div className="bg-gray-50 rounded-lg p-6">
    <h3 className="font-semibold mb-4">생성될 메뉴</h3>
    <div className="space-y-1">
      {selectedTemplate?.defaultMenus.map((menu, idx) => (
        <div key={idx} className="text-sm">• {menu}</div>
      ))}
    </div>
  </div>
</div>
```

---

### 11. 이미지 업로드 처리

**Firebase Storage 업로드**:
```typescript
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

async function uploadImage(
  file: File,
  path: string
): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
}

// 로고 업로드
if (formData.logoFile) {
  const logoPath = `organizations/${organizationId}/logo/${formData.logoFile.name}`;
  const logoUrl = await uploadImage(formData.logoFile, logoPath);
  // logoUrl 저장
}

// Hero 이미지 업로드 (직접 업로드인 경우)
if (formData.heroImageFile) {
  const heroPath = `organizations/${organizationId}/hero/${formData.heroImageFile.name}`;
  const heroUrl = await uploadImage(formData.heroImageFile, heroPath);
  // heroUrl 저장
}
```

---

### 12. Organization 생성 API

**Cloud Function 호출**:
```typescript
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

const createOrganization = httpsCallable(functions, "createOrganization");

const result = await createOrganization({
  type: formData.organizationType,
  name: formData.name,
  sport: formData.sport,
  region: formData.region,
  target: formData.target,
  operationType: formData.operationType,
  logoUrl: formData.logoUrl, // 업로드 완료된 URL
  heroImageUrl: formData.heroImageUrl, // 업로드 완료된 URL 또는 라이브러리 URL
  templateId: formData.templateId,
  description: formData.description
});
```

---

### 13. 데이터 구조

**Firestore 컬렉션: `organizations/{organizationId}`**

```typescript
interface Organization {
  id: string;
  type: "federation" | "academy" | "club";
  name: string;
  slug: string; // URL용 (name 기반 생성)
  sport: string;
  region: string;
  target: string;
  operationType: string;
  
  // 이미지
  logoUrl?: string;
  heroImageUrl: string; // 필수
  
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

### 14. 템플릿 라이브러리

**템플릿 정의**:
```typescript
interface Template {
  id: string;
  type: "federation" | "academy" | "club";
  name: string;
  description: string;
  features: string[];
  defaultMenus: string[];
  heroImageCategory?: string; // 추천 Hero 이미지 카테고리
}

const TEMPLATES: Template[] = [
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
    heroImageCategory: "academy"
  },
  {
    id: "club-amateur",
    type: "club",
    name: "아마추어 클럽",
    description: "아마추어 클럽 운영 템플릿",
    features: [
      "팀 소개",
      "선수 프로필",
      "경기 일정",
      "경기 결과",
      "공지사항"
    ],
    defaultMenus: ["홈", "팀 소개", "선수", "경기 일정", "경기 결과", "공지"],
    heroImageCategory: "generic"
  }
];
```

---

### 15. Wizard 네비게이션

**이전/다음 버튼**:
```typescript
<div className="flex justify-between mt-8">
  <button
    onClick={() => setCurrentStep(currentStep - 1)}
    disabled={currentStep === 0}
    className="px-6 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
  >
    이전
  </button>
  
  <button
    onClick={() => {
      if (currentStep === STEPS.length - 1) {
        handleCreate();
      } else {
        setCurrentStep(currentStep + 1);
      }
    }}
    disabled={!canProceed()}
    className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
  >
    {currentStep === STEPS.length - 1 ? "생성하기" : "다음"}
  </button>
</div>
```

**진행률 표시**:
```typescript
<div className="mb-6">
  <div className="flex items-center justify-between mb-2">
    <span className="text-sm text-gray-600">
      {STEPS[currentStep].title}
    </span>
    <span className="text-sm text-gray-600">
      {currentStep + 1} / {STEPS.length}
    </span>
  </div>
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className="bg-blue-600 h-2 rounded-full transition-all"
      style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
    />
  </div>
</div>
```

---

## 🎨 UI 컴포넌트 구조

```
OrganizationCreatePage
 ├─ WizardProgress (진행률 표시)
 ├─ StepContent (현재 Step 내용)
 │   ├─ StepOrganizationType
 │   ├─ StepSport
 │   ├─ StepTarget
 │   ├─ StepOperationType
 │   ├─ StepImages (로고 + Hero)
 │   ├─ StepTemplate
 │   └─ StepReview
 └─ WizardNavigation (이전/다음 버튼)
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
│       ├── StepOrganizationType.tsx
│       ├── StepSport.tsx
│       ├── StepTarget.tsx
│       ├── StepOperationType.tsx
│       ├── StepImages.tsx
│       ├── StepTemplate.tsx
│       ├── StepReview.tsx
│       └── WizardNavigation.tsx
├── services/
│   └── organizationService.ts
├── types/
│   └── organization.ts
└── lib/
    └── templates.ts
```

---

## 🔥 핵심 구현 포인트

1. **Step 기반 Wizard**: `useState`로 Step 관리
2. **조직 유형별 다른 질문**: 조건부 렌더링
3. **이미지 업로드**: Firebase Storage 연동
4. **템플릿 추천**: 수집 데이터 기반 매칭
5. **검증**: 각 Step별 필수 항목 체크

---

## ✅ 체크리스트

- [ ] Wizard Step UI 구현
- [ ] 조직 유형 선택 (3개 카드)
- [ ] 종목 선택 (아이콘 카드)
- [ ] 대상 선택 (조직 유형별)
- [ ] 운영 방식 선택 (조직 유형별)
- [ ] 로고 업로드 UI
- [ ] Hero 이미지 선택 (라이브러리 + 업로드)
- [ ] 템플릿 추천 로직
- [ ] 검토 화면
- [ ] 이미지 업로드 처리 (Firebase Storage)
- [ ] Organization 생성 API 연결
- [ ] Firestore 데이터 구조 생성

---

## 🚀 Cursor에게 전달할 한 줄

```
Use React + Tailwind UI and implement this as a step-based wizard with image upload functionality.
```

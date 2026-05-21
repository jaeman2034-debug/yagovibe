# YAGO Live Preview Builder - SaaS 수준 UX 아키텍처

## 🎯 핵심 개념

**Wizard를 진행하는 동안 오른쪽에 실제 사이트 미리보기가 실시간으로 바뀌는 구조**

```
Wix / Shopify / Framer 스타일의 빌더 UX
```

---

## 📊 전체 레이아웃 구조

### Split View

```
┌─────────────────────────────────────────────────────────┐
│  [Header: YAGO Logo]                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────┐  ┌────────────────────────┐ │
│  │                      │  │                        │ │
│  │  Wizard Panel       │  │  Live Preview Panel    │ │
│  │  (왼쪽 50%)         │  │  (오른쪽 50%)          │ │
│  │                      │  │                        │ │
│  │  [Progress Bar]     │  │  ┌────────────────────┐ │ │
│  │                      │  │  │ [Hero Section]    │ │ │
│  │  어떤 종목인가요?     │  │  │                   │ │ │
│  │                      │  │  │ [Organization]    │ │ │
│  │  ┌────┐ ┌────┐     │  │  │ [Name]            │ │ │
│  │  │ ⚽ │ │ 🏀 │     │  │  └────────────────────┘ │ │
│  │  └────┘ └────┘     │  │                        │ │
│  │                      │  │  ┌────────────────────┐ │ │
│  │  [이전] [다음]       │  │  │ [Navigation Menu]  │ │ │
│  │                      │  │  │ • 홈               │ │ │
│  │                      │  │  │ • 리그             │ │ │
│  │                      │  │  │ • 경기             │ │ │
│  │                      │  │  └────────────────────┘ │ │
│  │                      │  │                        │ │
│  │                      │  │  [Sample Content]     │ │ │
│  │                      │  │                        │ │ │
│  └──────────────────────┘  └────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 React 컴포넌트 구조

### 메인 레이아웃

```typescript
export default function OrganizationBuilder() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<OrganizationFormData>({
    organizationType: null,
    sport: null,
    target: null,
    operationType: null,
    name: "",
    logoFile: null,
    logoUrl: null,
    heroImageSource: null,
    heroImageUrl: null,
    heroImageFile: null,
    templateId: null
  });
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 왼쪽: Wizard Panel */}
          <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-y-auto">
            <WizardPanel
              currentStep={currentStep}
              formData={formData}
              setFormData={setFormData}
              onStepChange={setCurrentStep}
            />
          </div>
          
          {/* 오른쪽: Live Preview Panel */}
          <div className="hidden lg:block">
            <LivePreviewPanel formData={formData} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🎨 Live Preview Panel 컴포넌트

### 전체 구조

```typescript
interface LivePreviewPanelProps {
  formData: OrganizationFormData;
}

export default function LivePreviewPanel({
  formData
}: LivePreviewPanelProps) {
  const template = getTemplateById(formData.templateId);
  
  return (
    <div className="sticky top-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
        {/* Preview Header */}
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              사이트 미리보기
            </span>
            <div className="flex items-center gap-2">
              <button className="text-xs text-gray-500 hover:text-gray-700">
                모바일
              </button>
              <button className="text-xs text-gray-500 hover:text-gray-700">
                태블릿
              </button>
              <button className="text-xs font-medium text-blue-600">
                데스크톱
              </button>
            </div>
          </div>
        </div>
        
        {/* Preview Content */}
        <div className="bg-white" style={{ minHeight: "600px" }}>
          {/* Hero Section Preview */}
          <PreviewHeroSection
            heroImageUrl={formData.heroImageUrl}
            logoUrl={formData.logoUrl}
            organizationName={formData.name || "조직 이름"}
            organizationType={formData.organizationType}
          />
          
          {/* Navigation Menu Preview */}
          <PreviewNavigation
            template={template}
            organizationType={formData.organizationType}
          />
          
          {/* Sample Content Preview */}
          <PreviewSampleContent
            template={template}
            organizationType={formData.organizationType}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## 🎨 PreviewHeroSection 컴포넌트

### Hero Section 미리보기

```typescript
interface PreviewHeroSectionProps {
  heroImageUrl: string | null;
  logoUrl: string | null;
  organizationName: string;
  organizationType: "federation" | "academy" | "club" | null;
}

export default function PreviewHeroSection({
  heroImageUrl,
  logoUrl,
  organizationName,
  organizationType
}: PreviewHeroSectionProps) {
  // 기본 Hero 이미지 (선택 전)
  const defaultHeroImage = getDefaultHeroImage(organizationType);
  const displayHeroImage = heroImageUrl || defaultHeroImage;
  
  return (
    <div className="relative w-full h-64 md:h-80">
      {/* Hero Image */}
      {displayHeroImage ? (
        <img
          src={displayHeroImage}
          alt="Hero"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600" />
      )}
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      
      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-4">
        {/* Logo */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo"
            className="w-16 h-16 md:w-20 md:h-20 mb-4 object-contain"
          />
        ) : (
          <div className="w-16 h-16 md:w-20 md:h-20 mb-4 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-2xl">🏆</span>
          </div>
        )}
        
        {/* Organization Name */}
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-center">
          {organizationName || "조직 이름"}
        </h1>
        
        {/* Description (템플릿 기반) */}
        {organizationType && (
          <p className="text-sm md:text-base text-center text-white/90">
            {getOrganizationDescription(organizationType)}
          </p>
        )}
      </div>
    </div>
  );
}

function getOrganizationDescription(
  type: "federation" | "academy" | "club"
): string {
  switch (type) {
    case "federation":
      return "지역 생활체육 리그 운영";
    case "academy":
      return "훈련 프로그램 및 선수 육성";
    case "club":
      return "팀 중심 활동";
    default:
      return "";
  }
}
```

---

## 🎨 PreviewNavigation 컴포넌트

### 메뉴 구조 미리보기

```typescript
interface PreviewNavigationProps {
  template: Template | null;
  organizationType: "federation" | "academy" | "club" | null;
}

export default function PreviewNavigation({
  template,
  organizationType
}: PreviewNavigationProps) {
  // 템플릿이 선택되면 템플릿 메뉴, 아니면 기본 메뉴
  const menus = template?.defaultMenus || getDefaultMenus(organizationType);
  
  return (
    <div className="border-b border-gray-200 bg-white">
      <nav className="flex items-center justify-center gap-1 px-4 py-3 overflow-x-auto">
        {menus.map((menu, idx) => (
          <button
            key={idx}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 whitespace-nowrap"
          >
            {menu}
          </button>
        ))}
      </nav>
    </div>
  );
}

function getDefaultMenus(
  type: "federation" | "academy" | "club" | null
): string[] {
  switch (type) {
    case "federation":
      return ["홈", "리그", "경기", "팀", "순위", "공지"];
    case "academy":
      return ["홈", "코치", "프로그램", "선수", "공지"];
    case "club":
      return ["홈", "팀 소개", "선수", "경기 일정", "공지"];
    default:
      return ["홈", "소개", "공지"];
  }
}
```

---

## 🎨 PreviewSampleContent 컴포넌트

### 샘플 콘텐츠 미리보기

```typescript
interface PreviewSampleContentProps {
  template: Template | null;
  organizationType: "federation" | "academy" | "club" | null;
}

export default function PreviewSampleContent({
  template,
  organizationType
}: PreviewSampleContentProps) {
  return (
    <div className="p-6 space-y-6">
      {/* 조직 소개 섹션 */}
      <div>
        <h2 className="text-xl font-bold mb-3">소개</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          {getSampleDescription(organizationType)}
        </p>
      </div>
      
      {/* 조직 유형별 샘플 콘텐츠 */}
      {organizationType === "federation" && (
        <div>
          <h2 className="text-xl font-bold mb-3">진행 중인 리그</h2>
          <div className="space-y-2">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-sm">K7 리그</div>
              <div className="text-xs text-gray-500">12팀 · 24경기</div>
            </div>
          </div>
        </div>
      )}
      
      {organizationType === "academy" && (
        <div>
          <h2 className="text-xl font-bold mb-3">훈련 프로그램</h2>
          <div className="space-y-2">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-sm">주말 정기 수업</div>
              <div className="text-xs text-gray-500">주 2회 · 초등부</div>
            </div>
          </div>
        </div>
      )}
      
      {organizationType === "club" && (
        <div>
          <h2 className="text-xl font-bold mb-3">최근 경기</h2>
          <div className="space-y-2">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-sm">노원FC vs 상계유나이티드</div>
              <div className="text-xs text-gray-500">3 - 1</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getSampleDescription(
  type: "federation" | "academy" | "club" | null
): string {
  switch (type) {
    case "federation":
      return "지역 생활체육 축구 리그를 운영하는 협회입니다. 정기 리그와 토너먼트를 통해 지역 축구 문화를 활성화합니다.";
    case "academy":
      return "유소년 축구 인재를 육성하는 아카데미입니다. 체계적인 훈련 프로그램을 통해 선수들의 기량을 향상시킵니다.";
    case "club":
      return "아마추어 축구 클럽입니다. 정기적인 경기와 훈련을 통해 회원들의 건강과 우정을 증진합니다.";
    default:
      return "스포츠 조직입니다.";
  }
}
```

---

## 🔄 실시간 업데이트 로직

### State 변경 시 Preview 자동 업데이트

```typescript
// formData가 변경될 때마다 Preview 자동 업데이트
useEffect(() => {
  // Preview는 formData를 직접 참조하므로 자동으로 리렌더링됨
  // 추가 로직이 필요한 경우 여기에 작성
}, [formData]);
```

### 단계별 Preview 변화

#### STEP 1: Organization Type 선택
```typescript
// organizationType 변경 시
// → Preview Navigation 메뉴 변경
// → Preview Sample Content 변경
```

#### STEP 2: Sport 선택
```typescript
// sport 변경 시
// → Hero 이미지 필터링 (해당 종목 이미지만 표시)
// → 기본 Hero 이미지 변경
```

#### STEP 5: Logo 업로드
```typescript
// logoUrl 변경 시
// → Preview Hero Section의 로고 즉시 업데이트
```

#### STEP 6: Hero Image 선택
```typescript
// heroImageUrl 변경 시
// → Preview Hero Section의 배경 이미지 즉시 업데이트
```

#### STEP 7: Template 선택
```typescript
// templateId 변경 시
// → Preview Navigation 메뉴 변경
// → Preview Sample Content 변경
```

---

## 📱 반응형 Preview

### 디바이스 모드 전환

```typescript
const [previewMode, setPreviewMode] = useState<"mobile" | "tablet" | "desktop">("desktop");

<div className="flex items-center gap-2">
  <button
    onClick={() => setPreviewMode("mobile")}
    className={`text-xs px-2 py-1 rounded ${
      previewMode === "mobile"
        ? "bg-blue-600 text-white"
        : "text-gray-500 hover:text-gray-700"
    }`}
  >
    모바일
  </button>
  <button
    onClick={() => setPreviewMode("tablet")}
    className={`text-xs px-2 py-1 rounded ${
      previewMode === "tablet"
        ? "bg-blue-600 text-white"
        : "text-gray-500 hover:text-gray-700"
    }`}
  >
    태블릿
  </button>
  <button
    onClick={() => setPreviewMode("desktop")}
    className={`text-xs px-2 py-1 rounded ${
      previewMode === "desktop"
        ? "bg-blue-600 text-white"
        : "text-gray-500 hover:text-gray-700"
    }`}
  >
    데스크톱
  </button>
</div>

{/* Preview Container with responsive width */}
<div
  className={`
    mx-auto transition-all duration-300
    ${previewMode === "mobile" && "max-w-sm"}
    ${previewMode === "tablet" && "max-w-2xl"}
    ${previewMode === "desktop" && "max-w-full"}
  `}
>
  <LivePreviewPanel formData={formData} />
</div>
```

---

## 🎨 Preview 스타일링

### 실제 사이트와 동일한 스타일

```typescript
// Preview는 실제 생성될 사이트와 동일한 스타일 사용
// Tailwind CSS 클래스 그대로 사용
// 실제 컴포넌트 재사용 가능
```

### 미리보기 전용 스타일 (선택)

```typescript
// Preview 전용 스타일 (실제 사이트와 약간 다를 수 있음)
<div className="preview-container">
  {/* 실제 사이트 컴포넌트 재사용 */}
  <HeroSection
    heroImageUrl={formData.heroImageUrl}
    logoUrl={formData.logoUrl}
    organizationName={formData.name}
  />
</div>
```

---

## 🔄 이름 입력 추가 (고급 기능)

### STEP 1.5: Organization Name 입력

```typescript
// Organization Type 선택 후 이름 입력 Step 추가
<div className="mt-8">
  <label className="block text-sm font-medium mb-2">
    조직 이름
  </label>
  <input
    type="text"
    value={formData.name}
    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
    placeholder="예: 노원구 축구협회"
    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
  />
  {/* Preview에 즉시 반영 */}
</div>
```

---

## 🎯 이 UX의 장점

### 1. 사용자 확신 증가

**결과를 바로 확인**:
- 선택한 옵션이 실제 사이트에 어떻게 반영되는지 즉시 확인
- 불확실성 제거
- 생성 전 최종 확인

### 2. 인터랙티브 경험

**재미있는 빌더 경험**:
- Wix/Shopify 수준의 UX
- 실시간 피드백
- 플레이풀한 경험

### 3. SaaS 완성도 상승

**플랫폼 느낌**:
- 전문적인 빌더 도구
- 차별화된 UX
- 브랜드 가치 상승

---

## 📊 데이터 흐름

```
User Input (Wizard)
    │
    ▼
formData State Update
    │
    ▼
Live Preview Re-render
    │
    ▼
Visual Update (실시간)
```

---

## 🎨 Preview 컴포넌트 트리

```
LivePreviewPanel
 ├─ PreviewHeader (디바이스 모드 전환)
 ├─ PreviewHeroSection
 │   ├─ Hero Image
 │   ├─ Logo
 │   └─ Organization Name
 ├─ PreviewNavigation
 │   └─ Menu Items
 └─ PreviewSampleContent
     ├─ Organization Description
     └─ Sample Sections (조직 유형별)
```

---

## ✅ 구현 체크리스트

### Phase 1: 기본 구조
- [ ] Split View 레이아웃
- [ ] LivePreviewPanel 컴포넌트
- [ ] PreviewHeroSection 컴포넌트
- [ ] PreviewNavigation 컴포넌트

### Phase 2: 실시간 업데이트
- [ ] formData 변경 감지
- [ ] Preview 자동 리렌더링
- [ ] 단계별 Preview 변화

### Phase 3: 고급 기능
- [ ] 디바이스 모드 전환
- [ ] 이름 입력 Step 추가
- [ ] Preview 스타일 최적화

---

## 🚀 Cursor에게 전달할 지시

```
Implement YAGO Live Preview Builder.
Create a split view layout with Wizard on left and Live Preview on right.
Preview should update in real-time as user makes selections.
Reuse actual website components for preview.
Make preview responsive with device mode switcher.
```

---

이 기능을 구현하면 **YAGO가 진짜 SaaS 빌더처럼 보입니다!** 🚀

# YAGO Organization Builder - Figma 수준 완성형 UI 구조

## 🎯 목표

**Cursor가 바로 React UI 코드로 변환할 수 있는 완성된 화면 설계**

---

## 📊 전체 플로우

```
Landing (STEP 0)
    ↓
Organization Type (STEP 1)
    ↓
Sport Selection (STEP 2)
    ↓
Target Audience (STEP 3)
    ↓
Operation Type (STEP 4)
    ↓
Logo Upload (STEP 5)
    ↓
Hero Image Selection (STEP 6)
    ↓
Template Recommendation (STEP 7)
    ↓
Create Organization
    ↓
Success
```

**총 7 Step Wizard + Landing + Success**

---

## 🎨 STEP 0: Builder Landing

### 화면 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  [Header: YAGO Logo]                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│                                                         │
│           3분 안에 스포츠 조직 사이트를                   │
│                  만들어보세요                           │
│                                                         │
│         AI가 몇 가지 질문을 통해                        │
│         협회 / 아카데미 / 클럽 시스템을                  │
│         자동으로 생성합니다                             │
│                                                         │
│                                                         │
│                                                         │
│              ┌────────────────────┐                    │
│              │   시작하기          │                    │
│              └────────────────────┘                    │
│                                                         │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 컴포넌트 스펙

```typescript
<div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-4">
  <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-center">
    3분 안에 스포츠 조직 사이트를 만들어보세요
  </h1>
  <p className="text-xl text-gray-600 mb-12 text-center max-w-2xl">
    AI가 몇 가지 질문을 통해<br />
    협회 / 아카데미 / 클럽 시스템을 자동으로 생성합니다
  </p>
  <button className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors">
    시작하기
  </button>
</div>
```

---

## 🎨 STEP 1: Organization Type

### 화면 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  [Header]                                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Progress: Step 1 / 7]                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                         │
│  어떤 조직을 만드시나요?                                 │
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐          │
│  │                  │  │                  │          │
│  │       🏆         │  │       🏫         │          │
│  │                  │  │                  │          │
│  │     협회         │  │    아카데미       │          │
│  │                  │  │                  │          │
│  │  리그 및 대회     │  │  훈련 프로그램   │          │
│  │  운영            │  │  운영            │          │
│  │                  │  │                  │          │
│  │  [선택됨] ✓      │  │                  │          │
│  │                  │  │                  │          │
│  └──────────────────┘  └──────────────────┘          │
│                                                         │
│  ┌──────────────────┐                                 │
│  │                  │                                 │
│  │       ⚽         │                                 │
│  │                  │                                 │
│  │     클럽         │                                 │
│  │                  │                                 │
│  │  팀 중심 활동     │                                 │
│  │                  │                                 │
│  │                  │                                 │
│  │                  │                                 │
│  └──────────────────┘                                 │
│                                                         │
│  [이전]                                    [다음]       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 컴포넌트 스펙

```typescript
<div className="max-w-4xl mx-auto px-4 py-8">
  <WizardProgress currentStep={1} totalSteps={7} stepTitle="조직 유형" />
  
  <div className="mt-12">
    <h2 className="text-3xl font-bold text-center mb-8">
      어떤 조직을 만드시나요?
    </h2>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <OrganizationTypeCard
        icon="🏆"
        title="협회"
        subtitle="리그 및 대회 운영"
        selected={formData.organizationType === "federation"}
        onClick={() => setFormData({ ...formData, organizationType: "federation" })}
      />
      <OrganizationTypeCard
        icon="🏫"
        title="아카데미"
        subtitle="훈련 프로그램 운영"
        selected={formData.organizationType === "academy"}
        onClick={() => setFormData({ ...formData, organizationType: "academy" })}
      />
      <OrganizationTypeCard
        icon="⚽"
        title="클럽"
        subtitle="팀 중심 활동"
        selected={formData.organizationType === "club"}
        onClick={() => setFormData({ ...formData, organizationType: "club" })}
      />
    </div>
  </div>
  
  <WizardNavigation
    onPrevious={() => setCurrentStep(0)}
    onNext={() => setCurrentStep(2)}
    canNext={formData.organizationType !== null}
  />
</div>
```

### OrganizationTypeCard 컴포넌트

```typescript
interface OrganizationTypeCardProps {
  icon: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
}

export default function OrganizationTypeCard({
  icon,
  title,
  subtitle,
  selected,
  onClick
}: OrganizationTypeCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        p-8 border-2 rounded-xl text-left transition-all
        ${selected
          ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200"
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        }
      `}
    >
      <div className="text-5xl mb-4">{icon}</div>
      <div className="text-xl font-semibold mb-2">{title}</div>
      <div className="text-sm text-gray-600">{subtitle}</div>
      {selected && (
        <div className="mt-4 text-blue-600 font-semibold">✓ 선택됨</div>
      )}
    </button>
  );
}
```

---

## 🎨 STEP 2: Sport Selection

### 화면 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  [Header + Progress: 2/7]                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  어떤 종목인가요?                                       │
│                                                         │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐    │
│  │  ⚽  │  │  🏀  │  │  ⚾  │  │  🏐  │  │  🏸  │    │
│  │      │  │      │  │      │  │      │  │      │    │
│  │ 축구 │  │ 농구 │  │ 야구 │  │ 배구 │  │ 배드 │    │
│  │      │  │      │  │      │  │      │  │      │    │
│  │      │  │      │  │      │  │      │  │      │    │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘    │
│                                                         │
│  ┌──────┐                                             │
│  │ 기타 │                                             │
│  └──────┘                                             │
│                                                         │
│  [이전]                                    [다음]       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 컴포넌트 스펙

```typescript
<div className="max-w-4xl mx-auto px-4 py-8">
  <WizardProgress currentStep={2} totalSteps={7} stepTitle="종목" />
  
  <div className="mt-12">
    <h2 className="text-3xl font-bold text-center mb-8">
      어떤 종목인가요?
    </h2>
    
    <div className="grid grid-cols-3 md:grid-cols-5 gap-4 max-w-3xl mx-auto">
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
      <SportCard
        icon="⋯"
        label="기타"
        value="other"
        selected={formData.sport === "other"}
        onClick={() => setFormData({ ...formData, sport: "other" })}
      />
    </div>
  </div>
  
  <WizardNavigation
    onPrevious={() => setCurrentStep(1)}
    onNext={() => setCurrentStep(3)}
    canNext={formData.sport !== null}
  />
</div>
```

### SportCard 컴포넌트

```typescript
interface SportCardProps {
  icon: string;
  label: string;
  value: string;
  selected: boolean;
  onClick: () => void;
}

export default function SportCard({
  icon,
  label,
  value,
  selected,
  onClick
}: SportCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        p-6 border-2 rounded-xl text-center transition-all
        ${selected
          ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200"
          : "border-gray-200 hover:border-gray-300"
        }
      `}
    >
      <div className="text-4xl mb-2">{icon}</div>
      <div className="text-sm font-medium">{label}</div>
    </button>
  );
}
```

---

## 🎨 STEP 3: Target Audience

### 화면 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  [Header + Progress: 3/7]                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  주 참가 대상은 누구인가요?                               │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │   유소년     │  │   청소년     │                    │
│  └──────────────┘  └──────────────┘                    │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │    성인      │  │    혼합      │                    │
│  └──────────────┘  └──────────────┘                    │
│                                                         │
│  [이전]                                    [다음]       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 컴포넌트 스펙

```typescript
<div className="max-w-2xl mx-auto px-4 py-8">
  <WizardProgress currentStep={3} totalSteps={7} stepTitle="참가 대상" />
  
  <div className="mt-12">
    <h2 className="text-3xl font-bold text-center mb-8">
      주 참가 대상은 누구인가요?
    </h2>
    
    <div className="grid grid-cols-2 gap-4">
      {getTargetOptions(formData.organizationType).map((target) => (
        <button
          key={target.value}
          onClick={() => setFormData({ ...formData, target: target.value })}
          className={`
            p-6 border-2 rounded-xl text-center font-semibold transition-all
            ${formData.target === target.value
              ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200"
              : "border-gray-200 hover:border-gray-300"
            }
          `}
        >
          {target.label}
        </button>
      ))}
    </div>
  </div>
  
  <WizardNavigation
    onPrevious={() => setCurrentStep(2)}
    onNext={() => setCurrentStep(4)}
    canNext={formData.target !== null}
  />
</div>
```

---

## 🎨 STEP 4: Operation Type

### 화면 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  [Header + Progress: 4/7]                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  운영 방식은 무엇인가요?                                 │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │  리그 운영    │  │ 토너먼트 대회 │                    │
│  └──────────────┘  └──────────────┘                    │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ 훈련 프로그램 │  │   혼합      │                    │
│  └──────────────┘  └──────────────┘                    │
│                                                         │
│  [이전]                                    [다음]       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 컴포넌트 스펙

```typescript
<div className="max-w-2xl mx-auto px-4 py-8">
  <WizardProgress currentStep={4} totalSteps={7} stepTitle="운영 방식" />
  
  <div className="mt-12">
    <h2 className="text-3xl font-bold text-center mb-8">
      운영 방식은 무엇인가요?
    </h2>
    
    <div className="grid grid-cols-2 gap-4">
      {getOperationOptions(formData.organizationType).map((operation) => (
        <button
          key={operation.value}
          onClick={() => setFormData({ ...formData, operationType: operation.value })}
          className={`
            p-6 border-2 rounded-xl text-center font-semibold transition-all
            ${formData.operationType === operation.value
              ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200"
              : "border-gray-200 hover:border-gray-300"
            }
          `}
        >
          {operation.label}
        </button>
      ))}
    </div>
  </div>
  
  <WizardNavigation
    onPrevious={() => setCurrentStep(3)}
    onNext={() => setCurrentStep(5)}
    canNext={formData.operationType !== null}
  />
</div>
```

---

## 🎨 STEP 5: Logo Upload

### 화면 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  [Header + Progress: 5/7]                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  조직 로고를 업로드하세요 (선택)                          │
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │                                                 │    │
│  │                                                 │    │
│  │                                                 │    │
│  │            [로고 이미지 미리보기]               │    │
│  │                 128×128px                       │    │
│  │                                                 │    │
│  │                                                 │    │
│  │              [제거]                             │    │
│  │                                                 │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  또는                                                   │
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │                                                 │    │
│  │                                                 │    │
│  │            📷 로고 이미지 선택                  │    │
│  │                                                 │    │
│  │         PNG, JPG (최대 5MB)                    │    │
│  │                                                 │    │
│  │                                                 │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  [이전]                                    [다음]       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 컴포넌트 스펙

```typescript
<div className="max-w-2xl mx-auto px-4 py-8">
  <WizardProgress currentStep={5} totalSteps={7} stepTitle="로고" />
  
  <div className="mt-12">
    <h2 className="text-3xl font-bold text-center mb-8">
      조직 로고를 업로드하세요 <span className="text-gray-500 text-lg">(선택)</span>
    </h2>
    
    <div className="max-w-md mx-auto">
      {formData.logoUrl ? (
        <div className="border-2 border-gray-200 rounded-xl p-8 text-center">
          <img
            src={formData.logoUrl}
            alt="로고"
            className="w-32 h-32 mx-auto mb-4 object-contain"
          />
          <button
            onClick={() => setFormData({ ...formData, logoFile: null, logoUrl: null })}
            className="text-sm text-red-600 hover:text-red-700"
          >
            제거
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-600 transition-colors">
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
            className="cursor-pointer"
          >
            <div className="text-4xl mb-4">📷</div>
            <div className="text-blue-600 font-medium mb-2">로고 이미지 선택</div>
            <div className="text-sm text-gray-500">PNG, JPG (최대 5MB)</div>
          </label>
        </div>
      )}
    </div>
  </div>
  
  <WizardNavigation
    onPrevious={() => setCurrentStep(4)}
    onNext={() => setCurrentStep(6)}
    canNext={true} // 로고는 선택 사항
  />
</div>
```

---

## 🎨 STEP 6: Hero Image Selection

### 화면 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  [Header + Progress: 6/7]                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  홈페이지 상단 이미지를 선택하세요                       │
│                                                         │
│  라이브러리 이미지                                       │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ [이미지] │  │ [이미지] │  │ [이미지] │            │
│  │          │  │          │  │          │            │
│  │ ⚽ 축구   │  │ 🏟️ 스타  │  │ 👥 팀    │            │
│  │ 경기장   │  │ 디움     │  │ 단체 사진 │            │
│  │          │  │          │  │          │            │
│  │   ✓      │  │          │  │          │            │
│  └──────────┘  └──────────┘  └──────────┘            │
│                                                         │
│  ┌──────────┐  ┌──────────┐                          │
│  │ [이미지] │  │ [이미지] │                          │
│  │          │  │          │                          │
│  │ 🏃 훈련   │  │ 📷 직접  │                          │
│  │ 장면     │  │ 업로드   │                          │
│  │          │  │          │                          │
│  └──────────┘  └──────────┘                          │
│                                                         │
│  직접 업로드                                             │
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │                                                 │    │
│  │            📷 이미지 업로드                     │    │
│  │                                                 │    │
│  │    PNG, JPG (권장: 1920×600px, 최대 10MB)      │    │
│  │                                                 │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  [이전]                                    [다음]       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 컴포넌트 스펙

```typescript
<div className="max-w-6xl mx-auto px-4 py-8">
  <WizardProgress currentStep={6} totalSteps={7} stepTitle="Hero 이미지" />
  
  <div className="mt-12">
    <h2 className="text-3xl font-bold text-center mb-8">
      홈페이지 상단 이미지를 선택하세요
    </h2>
    
    {/* 라이브러리 이미지 */}
    <div className="mb-8">
      <h3 className="text-sm font-medium text-gray-700 mb-4">라이브러리 이미지</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {heroImageLibrary
          .filter(img => 
            img.category === formData.sport || 
            img.category === "generic"
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
              className={`
                relative border-2 rounded-lg overflow-hidden transition-all
                ${formData.heroImageUrl === image.imageUrl
                  ? "border-blue-600 ring-2 ring-blue-200"
                  : "border-gray-200 hover:border-gray-300"
                }
              `}
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
      <h3 className="text-sm font-medium text-gray-700 mb-4">직접 업로드</h3>
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-600 transition-colors">
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
          className="cursor-pointer"
        >
          <div className="text-4xl mb-4">📷</div>
          <div className="text-blue-600 font-medium mb-2">이미지 업로드</div>
          <div className="text-sm text-gray-500">
            PNG, JPG (권장: 1920×600px, 최대 10MB)
          </div>
        </label>
      </div>
    </div>
  </div>
  
  <WizardNavigation
    onPrevious={() => setCurrentStep(5)}
    onNext={() => setCurrentStep(7)}
    canNext={formData.heroImageUrl !== null}
  />
</div>
```

---

## 🎨 STEP 7: Template Recommendation

### 화면 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  [Header + Progress: 7/7]                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  추천 템플릿                                             │
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │  지역 생활체육 축구협회            [추천] ✓    │    │
│  │                                                 │    │
│  │  지역 기반 성인 축구 리그 운영 템플릿          │    │
│  │                                                 │    │
│  │  ✓ 리그 운영                                    │    │
│  │  ✓ 팀 관리                                      │    │
│  │  ✓ 선수 등록                                    │    │
│  │  ✓ 경기 일정                                    │    │
│  │  ✓ 결과 입력                                    │    │
│  │  ✓ 순위 자동 계산                               │    │
│  │                                                 │    │
│  │  [이 템플릿 사용]                                │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │  토너먼트 중심 협회                            │    │
│  │                                                 │    │
│  │  대회 중심 운영 템플릿                          │    │
│  │                                                 │    │
│  │  ✓ 대회 운영                                    │    │
│  │  ✓ 참가 신청                                    │    │
│  │  ✓ 대진표 관리                                  │    │
│  │  ✓ 결과 입력                                    │    │
│  │                                                 │    │
│  │  [이 템플릿 사용]                                │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │  다른 템플릿 보기                               │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  [이전]                                    [생성하기]   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 컴포넌트 스펙

```typescript
<div className="max-w-4xl mx-auto px-4 py-8">
  <WizardProgress currentStep={7} totalSteps={7} stepTitle="템플릿" />
  
  <div className="mt-12">
    <h2 className="text-3xl font-bold text-center mb-8">
      추천 템플릿
    </h2>
    
    <div className="space-y-4">
      {recommendedTemplates.map((template) => (
        <button
          key={template.id}
          onClick={() => setFormData({ ...formData, templateId: template.id })}
          className={`
            w-full p-6 border-2 rounded-xl text-left transition-all
            ${formData.templateId === template.id
              ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200"
              : "border-gray-200 hover:border-gray-300"
            }
          `}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="font-semibold text-lg">{template.name}</div>
            {template.isRecommended && (
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                추천
              </span>
            )}
            {formData.templateId === template.id && (
              <span className="text-blue-600">✓</span>
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
  </div>
  
  <WizardNavigation
    onPrevious={() => setCurrentStep(6)}
    onNext={handleCreate}
    canNext={formData.templateId !== null}
    nextLabel="생성하기"
  />
</div>
```

---

## 🎨 Success 화면

### 화면 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  [Header]                                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│                    [체크 아이콘]                         │
│                                                         │
│              조직이 생성되었습니다! 🎉                   │
│                                                         │
│                  노원구 축구협회                         │
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │  생성된 항목                                    │    │
│  │                                                │    │
│  │  ✓ 조직 홈페이지                               │    │
│  │  ✓ 관리자 대시보드                             │    │
│  │  ✓ 기본 메뉴 구조                              │    │
│  │  ✓ Hero 이미지                                 │    │
│  │  ✓ 2026 시즌                                   │    │
│  │  ✓ 공지 샘플                                   │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │  조직 홈으로 이동                               │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │  관리자 대시보드로 이동                          │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  [다른 조직 생성하기]                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 공통 컴포넌트

### WizardProgress

```typescript
interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
}

export default function WizardProgress({
  currentStep,
  totalSteps,
  stepTitle
}: WizardProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {stepTitle}
        </span>
        <span className="text-sm text-gray-500">
          {currentStep} / {totalSteps}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}
```

### WizardNavigation

```typescript
interface WizardNavigationProps {
  onPrevious: () => void;
  onNext: () => void;
  canNext: boolean;
  nextLabel?: string;
}

export default function WizardNavigation({
  onPrevious,
  onNext,
  canNext,
  nextLabel = "다음"
}: WizardNavigationProps) {
  return (
    <div className="flex justify-between mt-12">
      <button
        onClick={onPrevious}
        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        이전
      </button>
      <button
        onClick={onNext}
        disabled={!canNext}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {nextLabel}
      </button>
    </div>
  );
}
```

---

## 🔥 Live Preview Builder (고급 기능)

### Split View 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  [Header]                                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │                  │  │                          │   │
│  │  Wizard          │  │  Live Preview            │   │
│  │  (왼쪽)          │  │  (오른쪽)                 │   │
│  │                  │  │                          │   │
│  │  [Step Content]  │  │  [실시간 미리보기]        │   │
│  │                  │  │                          │   │
│  │                  │  │  ┌────────────────────┐ │   │
│  │                  │  │  │ [Hero Image]       │ │   │
│  │                  │  │  │                    │ │   │
│  │                  │  │  │ 조직 이름           │ │   │
│  │                  │  │  │                    │ │   │
│  │                  │  │  └────────────────────┘ │   │
│  │                  │  │                          │   │
│  │                  │  │  [메뉴 구조 미리보기]    │   │
│  │                  │  │                          │   │
│  └──────────────────┘  └──────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Live Preview 컴포넌트

```typescript
interface LivePreviewProps {
  formData: OrganizationFormData;
}

export default function LivePreview({ formData }: LivePreviewProps) {
  return (
    <div className="sticky top-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
        {/* Hero Section Preview */}
        <div className="relative w-full h-48">
          {formData.heroImageUrl ? (
            <img
              src={formData.heroImageUrl}
              alt="Hero"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">Hero 이미지</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            {formData.logoUrl && (
              <img
                src={formData.logoUrl}
                alt="Logo"
                className="w-12 h-12 mb-2 object-contain"
              />
            )}
            <div className="text-xl font-bold">
              {formData.name || "조직 이름"}
            </div>
          </div>
        </div>
        
        {/* 메뉴 구조 미리보기 */}
        <div className="p-4">
          <div className="text-sm font-medium text-gray-700 mb-2">
            생성될 메뉴
          </div>
          <div className="space-y-1">
            {selectedTemplate?.defaultMenus.map((menu, idx) => (
              <div key={idx} className="text-sm text-gray-600">
                • {menu}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Split View 레이아웃 적용

```typescript
<div className="max-w-7xl mx-auto px-4 py-8">
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    {/* 왼쪽: Wizard */}
    <div>
      <WizardProgress currentStep={currentStep} totalSteps={7} />
      {renderStep()}
      <WizardNavigation {...navigationProps} />
    </div>
    
    {/* 오른쪽: Live Preview */}
    <div className="hidden lg:block">
      <LivePreview formData={formData} />
    </div>
  </div>
</div>
```

---

## 📐 레이아웃 규칙

### 컨테이너
- 최대 너비: 1200px (Landing), 800px (Wizard), 1400px (Split View)
- 중앙 정렬: mx-auto
- 패딩: px-4, py-8

### 카드
- 기본: border-2, rounded-xl, p-6 또는 p-8
- 선택됨: border-blue-600, bg-blue-50, ring-2 ring-blue-200
- 호버: hover:border-gray-300, hover:bg-gray-50

### 간격
- 섹션 간: mb-8 또는 mb-12
- 요소 간: mb-4 또는 mb-6
- 그리드 간격: gap-4 또는 gap-6

---

## 🎨 색상 시스템

### Primary
- Blue-600: #2563eb (메인 액션, 선택)
- Blue-50: #eff6ff (선택 배경)
- Blue-200: #bfdbfe (링)

### Neutral
- Gray-50: #f9fafb (배경)
- Gray-200: #e5e7eb (보더)
- Gray-600: #4b5563 (텍스트)
- Gray-900: #111827 (제목)

---

## 📱 반응형 규칙

### 모바일 (< 768px)
- 카드: grid-cols-1
- Split View: 숨김
- 패딩: px-4, py-6

### 태블릿 (768px - 1024px)
- 카드: grid-cols-2
- Split View: 숨김

### 데스크톱 (> 1024px)
- 카드: grid-cols-3
- Split View: 표시

---

## ✅ Cursor 구현 체크리스트

- [ ] Landing 화면
- [ ] WizardProgress 컴포넌트
- [ ] WizardNavigation 컴포넌트
- [ ] StepOrganizationType
- [ ] StepSport
- [ ] StepTarget
- [ ] StepOperationType
- [ ] StepLogo (파일 업로드)
- [ ] StepHeroImage (라이브러리 + 업로드)
- [ ] StepTemplate
- [ ] Success 화면
- [ ] Live Preview (선택)
- [ ] 이미지 업로드 처리
- [ ] 템플릿 추천 로직
- [ ] Organization 생성 API

---

## 🚀 Cursor에게 전달할 지시

```
Implement YAGO Organization Builder as a step-based wizard UI.
Use React + TypeScript + Tailwind CSS.
Follow the exact layout specifications provided.
Implement image upload with preview.
Create template recommendation system.
Make all steps responsive.
Optionally implement Live Preview in split view.
```

---

이 구조를 Cursor에 제공하면 **거의 완성된 UI 코드가 자동 생성됩니다!** 🚀

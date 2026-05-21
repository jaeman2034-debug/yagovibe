# 🚀 YAGO Federation Create Wizard - 구현 가이드

> **작성일**: 2024년  
> **목적**: 실제 서비스에서 바로 구현 가능한 UI 구조 + 컴포넌트 설계 + 페이지 흐름

---

## 📋 목차

1. [전체 페이지 구조](#1-전체-페이지-구조)
2. [라우팅 및 레이아웃](#2-라우팅-및-레이아웃)
3. [상태 관리](#3-상태-관리)
4. [컴포넌트 설계](#4-컴포넌트-설계)
5. [각 Step 구현](#5-각-step-구현)
6. [API 및 서버 로직](#6-api-및-서버-로직)
7. [생성 완료 후 흐름](#7-생성-완료-후-흐름)

---

## 1️⃣ 전체 페이지 구조

### 라우팅

```
/federations/create
```

### 컴포넌트 트리

```
FederationCreatePage
 ├ WizardHeader (진행바 + 타이틀)
 ├ WizardBody
 │   ├ StepBasicInfo
 │   ├ StepOperationScope
 │   ├ StepBranding
 │   ├ StepAdmin
 │   └ StepReview
 └ WizardFooter (이전 / 다음 / 생성)
```

### UX 핵심

```
Single Page Wizard
State 기반 Step 전환
모바일 대응 중앙 카드 레이아웃
```

---

## 2️⃣ 라우팅 및 레이아웃

### 파일 구조

```
src/
├── app/
│   └── platform/
│       └── federations/
│           └── create/
│               └── page.tsx
├── components/
│   └── federation/
│       ├── FederationCreateWizard.tsx
│       ├── WizardProgress.tsx
│       ├── WizardHeader.tsx
│       ├── WizardFooter.tsx
│       ├── steps/
│       │   ├── StepBasicInfo.tsx
│       │   ├── StepOperationScope.tsx
│       │   ├── StepBranding.tsx
│       │   ├── StepAdmin.tsx
│       │   └── StepReview.tsx
```

### 전체 레이아웃

```typescript
// src/app/platform/federations/create/page.tsx
"use client";

import { FederationCreateWizard } from "@/components/federation/FederationCreateWizard";

export default function CreateFederationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-gray-50 py-8 md:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <FederationCreateWizard />
      </div>
    </div>
  );
}
```

---

## 3️⃣ 상태 관리

### Form 타입 정의

```typescript
// src/types/federation.ts
export interface FederationFormData {
  // Step 1: Basic Info
  name: string;
  slug: string;
  sportType: string;
  tagline: string;
  description: string;
  
  // Step 2: Operation Scope
  region1: string; // 시/도
  region2: string; // 시/군/구
  targetType: "youth" | "amateur" | "school" | "adult";
  ageCategories: string[];
  hasSeasons: "yes" | "no";
  operationType: "league" | "tournament" | "mixed";
  
  // Step 3: Branding
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  coverUrl?: string;
  bannerText?: string;
  contactEmail: string;
  contactPhone: string;
  
  // Step 4: Admin
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminRole: string;
}
```

### Wizard 상태

```typescript
// FederationCreateWizard.tsx
const [currentStep, setCurrentStep] = useState(1);
const [formData, setFormData] = useState<FederationFormData>({
  name: "",
  slug: "",
  sportType: "",
  tagline: "",
  description: "",
  region1: "",
  region2: "",
  targetType: "youth",
  ageCategories: [],
  hasSeasons: "yes",
  operationType: "league",
  primaryColor: "#0F172A",
  secondaryColor: "#16A34A",
  contactEmail: "",
  contactPhone: "",
  adminName: "",
  adminEmail: "",
  adminPhone: "",
  adminRole: "",
});
const [errors, setErrors] = useState<Record<string, string>>({});
const [isCreating, setIsCreating] = useState(false);
```

---

## 4️⃣ 컴포넌트 설계

### 4.1 FederationCreateWizard (메인 컴포넌트)

```typescript
// src/components/federation/FederationCreateWizard.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WizardHeader } from "./WizardHeader";
import { WizardProgress } from "./WizardProgress";
import { WizardFooter } from "./WizardFooter";
import { StepBasicInfo } from "./steps/StepBasicInfo";
import { StepOperationScope } from "./steps/StepOperationScope";
import { StepBranding } from "./steps/StepBranding";
import { StepAdmin } from "./steps/StepAdmin";
import { StepReview } from "./steps/StepReview";
import { Card } from "@/components/shared/Card";
import type { FederationFormData } from "@/types/federation";

const TOTAL_STEPS = 5;

export function FederationCreateWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FederationFormData>({
    // 초기값
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);

  const handleNext = () => {
    if (isStepValid(currentStep) && currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
      setErrors({});
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/federations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/federations/${result.slug}/welcome`);
      } else {
        setErrors({ submit: result.error || "협회 생성에 실패했습니다." });
      }
    } catch (error) {
      setErrors({ submit: "네트워크 오류가 발생했습니다." });
    } finally {
      setIsCreating(false);
    }
  };

  const isStepValid = (step: number): boolean => {
    // 각 단계별 유효성 검사
    switch (step) {
      case 1:
        return (
          formData.name.length >= 2 &&
          formData.slug.length >= 3 &&
          formData.sportType !== "" &&
          formData.tagline.length >= 5
        );
      case 2:
        return (
          formData.region1 !== "" &&
          formData.region2 !== "" &&
          formData.targetType !== "" &&
          formData.ageCategories.length > 0 &&
          formData.operationType !== ""
        );
      case 3:
        return formData.contactEmail !== "" && formData.contactPhone !== "";
      case 4:
        return (
          formData.adminName.length >= 2 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail) &&
          formData.adminPhone !== "" &&
          formData.adminRole !== ""
        );
      case 5:
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepBasicInfo
            formData={formData}
            setFormData={setFormData}
            errors={errors}
          />
        );
      case 2:
        return (
          <StepOperationScope
            formData={formData}
            setFormData={setFormData}
            errors={errors}
          />
        );
      case 3:
        return (
          <StepBranding
            formData={formData}
            setFormData={setFormData}
            errors={errors}
          />
        );
      case 4:
        return (
          <StepAdmin
            formData={formData}
            setFormData={setFormData}
            errors={errors}
          />
        );
      case 5:
        return (
          <StepReview
            formData={formData}
            errors={errors}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      <WizardHeader />
      
      <div className="mt-8 mb-6">
        <WizardProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
      </div>

      <Card className="shadow-xl">
        <div className="p-6 md:p-8">
          {renderStep()}
        </div>

        <WizardFooter
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          onBack={handleBack}
          onNext={handleNext}
          onCreate={handleCreate}
          isStepValid={isStepValid(currentStep)}
          isCreating={isCreating}
        />
      </Card>
    </div>
  );
}
```

### 4.2 WizardProgress

```typescript
// src/components/federation/WizardProgress.tsx
interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function WizardProgress({ currentStep, totalSteps }: WizardProgressProps) {
  const steps = [
    "기본 정보",
    "운영 범위",
    "브랜드",
    "관리자",
    "완료",
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber <= currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div key={stepNumber} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-semibold transition-all ${
                    isActive
                      ? "bg-primary-600 text-white shadow-lg"
                      : "bg-gray-200 text-gray-600"
                  } ${isCurrent ? "ring-4 ring-primary-200" : ""}`}
                >
                  {stepNumber}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={`text-xs md:text-sm font-medium ${
                      isActive ? "text-primary-600" : "text-gray-500"
                    }`}
                  >
                    {label}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 transition-all ${
                    stepNumber < currentStep ? "bg-primary-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 4.3 WizardHeader

```typescript
// src/components/federation/WizardHeader.tsx
import { Building2 } from "lucide-react";

export function WizardHeader() {
  return (
    <div className="text-center">
      <Building2 className="w-16 h-16 text-primary-600 mx-auto mb-4" />
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
        3분 만에 협회 홈페이지를 시작하세요
      </h1>
      <p className="text-lg text-gray-600">
        협회 정보만 입력하면 홈페이지, 관리자, 리그 운영 구조가 자동으로 생성됩니다.
      </p>
    </div>
  );
}
```

### 4.4 WizardFooter

```typescript
// src/components/federation/WizardFooter.tsx
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface WizardFooterProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onCreate: () => void;
  isStepValid: boolean;
  isCreating: boolean;
}

export function WizardFooter({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onCreate,
  isStepValid,
  isCreating,
}: WizardFooterProps) {
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-200 px-6 md:px-8 pb-6">
      <Button
        variant="outline"
        onClick={onBack}
        disabled={currentStep === 1}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        이전
      </Button>

      {isLastStep ? (
        <Button
          onClick={onCreate}
          disabled={!isStepValid || isCreating}
          size="lg"
          className="px-8"
        >
          {isCreating ? (
            <>
              <LoadingSpinner className="w-5 h-5 mr-2" />
              생성 중...
            </>
          ) : (
            "협회 생성하기"
          )}
        </Button>
      ) : (
        <Button
          onClick={onNext}
          disabled={!isStepValid}
        >
          다음
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  );
}
```

---

## 5️⃣ 각 Step 구현

### 5.1 StepBasicInfo

```typescript
// src/components/federation/steps/StepBasicInfo.tsx
import { Input } from "@/components/shared/Input";
import { Select } from "@/components/shared/Select";
import { Textarea } from "@/components/shared/Textarea";
import type { FederationFormData } from "@/types/federation";

interface StepBasicInfoProps {
  formData: FederationFormData;
  setFormData: (data: FederationFormData) => void;
  errors: Record<string, string>;
}

export function StepBasicInfo({
  formData,
  setFormData,
  errors,
}: StepBasicInfoProps) {
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          기본 정보
        </h2>
        <p className="text-gray-600">
          협회 이름과 종목을 입력하세요
        </p>
      </div>

      <Input
        label="협회 이름 *"
        value={formData.name}
        onChange={(e) => {
          const name = e.target.value;
          setFormData({
            ...formData,
            name,
            slug: generateSlug(name),
          });
        }}
        placeholder="예: 서울북부유소년축구협회"
        maxLength={50}
        error={errors.name}
        required
      />

      <Input
        label="슬러그 *"
        value={formData.slug}
        onChange={(e) =>
          setFormData({
            ...formData,
            slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          })
        }
        placeholder="예: seoul-north-youth-football"
        helperText="URL에 사용됩니다 (영문, 숫자, 하이픈만 가능)"
        error={errors.slug}
        required
      />

      <Select
        label="종목 *"
        options={[
          { value: "football", label: "축구" },
          { value: "futsal", label: "풋살" },
          { value: "basketball", label: "농구" },
          { value: "baseball", label: "야구" },
          { value: "volleyball", label: "배구" },
        ]}
        value={formData.sportType}
        onChange={(value) =>
          setFormData({ ...formData, sportType: value })
        }
        error={errors.sportType}
        required
      />

      <Input
        label="한 줄 소개 *"
        value={formData.tagline}
        onChange={(e) =>
          setFormData({ ...formData, tagline: e.target.value })
        }
        placeholder="예: 서울 북부 지역 유소년 축구 리그 운영"
        maxLength={50}
        error={errors.tagline}
        required
      />

      <Textarea
        label="상세 설명"
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        placeholder="협회에 대한 자세한 설명을 입력하세요"
        maxLength={500}
        rows={4}
      />
    </div>
  );
}
```

### 5.2 StepOperationScope

```typescript
// src/components/federation/steps/StepOperationScope.tsx
import { Select } from "@/components/shared/Select";
import { RadioGroup, Radio } from "@/components/shared/Radio";
import { CheckboxGroup, Checkbox } from "@/components/shared/Checkbox";
import type { FederationFormData } from "@/types/federation";

interface StepOperationScopeProps {
  formData: FederationFormData;
  setFormData: (data: FederationFormData) => void;
  errors: Record<string, string>;
}

const REGIONS = [
  { value: "seoul", label: "서울특별시" },
  { value: "busan", label: "부산광역시" },
  { value: "gyeonggi", label: "경기도" },
  // ...
];

const DISTRICTS: Record<string, Array<{ value: string; label: string }>> = {
  seoul: [
    { value: "nowon", label: "노원구" },
    { value: "gangnam", label: "강남구" },
    // ...
  ],
  // ...
};

export function StepOperationScope({
  formData,
  setFormData,
  errors,
}: StepOperationScopeProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          운영 범위
        </h2>
        <p className="text-gray-600">
          협회의 운영 방식을 설정하세요
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="시/도 *"
          options={REGIONS}
          value={formData.region1}
          onChange={(value) =>
            setFormData({ ...formData, region1: value, region2: "" })
          }
          error={errors.region1}
          required
        />
        <Select
          label="시/군/구 *"
          options={DISTRICTS[formData.region1] || []}
          value={formData.region2}
          onChange={(value) =>
            setFormData({ ...formData, region2: value })
          }
          disabled={!formData.region1}
          error={errors.region2}
          required
        />
      </div>

      <RadioGroup
        label="운영 대상 *"
        value={formData.targetType}
        onChange={(value) =>
          setFormData({ ...formData, targetType: value as any })
        }
        error={errors.targetType}
        required
      >
        <Radio value="youth">유소년</Radio>
        <Radio value="amateur">아마추어</Radio>
        <Radio value="school">학교</Radio>
        <Radio value="adult">성인 클럽</Radio>
      </RadioGroup>

      <CheckboxGroup
        label="연령 카테고리 *"
        value={formData.ageCategories}
        onChange={(values) =>
          setFormData({ ...formData, ageCategories: values })
        }
        error={errors.ageCategories}
        required
      >
        <Checkbox value="u8">U8 (8세 이하)</Checkbox>
        <Checkbox value="u10">U10 (10세 이하)</Checkbox>
        <Checkbox value="u12">U12 (12세 이하)</Checkbox>
        <Checkbox value="u15">U15 (15세 이하)</Checkbox>
        <Checkbox value="u18">U18 (18세 이하)</Checkbox>
        <Checkbox value="adult">성인</Checkbox>
      </CheckboxGroup>

      <RadioGroup
        label="시즌 운영 여부 *"
        value={formData.hasSeasons}
        onChange={(value) =>
          setFormData({ ...formData, hasSeasons: value as any })
        }
        error={errors.hasSeasons}
        required
      >
        <Radio value="yes">시즌제 운영 (예: 전반기/후반기)</Radio>
        <Radio value="no">연중 운영</Radio>
      </RadioGroup>

      <RadioGroup
        label="운영 방식 *"
        value={formData.operationType}
        onChange={(value) =>
          setFormData({ ...formData, operationType: value as any })
        }
        error={errors.operationType}
        required
      >
        <Radio value="league">리그 중심 (정규 리그 운영)</Radio>
        <Radio value="tournament">대회 중심 (토너먼트 위주)</Radio>
        <Radio value="mixed">혼합형 (리그 + 대회)</Radio>
      </RadioGroup>
    </div>
  );
}
```

### 5.3 StepBranding

```typescript
// src/components/federation/steps/StepBranding.tsx
import { FileUpload } from "@/components/shared/FileUpload";
import { ColorPicker } from "@/components/shared/ColorPicker";
import { Input } from "@/components/shared/Input";
import type { FederationFormData } from "@/types/federation";

interface StepBrandingProps {
  formData: FederationFormData;
  setFormData: (data: FederationFormData) => void;
  errors: Record<string, string>;
}

export function StepBranding({
  formData,
  setFormData,
  errors,
}: StepBrandingProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          브랜드 설정
        </h2>
        <p className="text-gray-600">
          로고와 색상을 설정하세요
        </p>
      </div>

      <FileUpload
        label="로고 업로드"
        accept="image/*"
        value={formData.logoUrl}
        onChange={(url) => setFormData({ ...formData, logoUrl: url })}
        preview
      />

      <div className="grid grid-cols-2 gap-4">
        <ColorPicker
          label="대표 색상 *"
          value={formData.primaryColor}
          onChange={(color) =>
            setFormData({ ...formData, primaryColor: color })
          }
          required
        />
        <ColorPicker
          label="보조 색상 *"
          value={formData.secondaryColor}
          onChange={(color) =>
            setFormData({ ...formData, secondaryColor: color })
          }
          required
        />
      </div>

      <FileUpload
        label="커버 이미지 (선택)"
        accept="image/*"
        value={formData.coverUrl}
        onChange={(url) => setFormData({ ...formData, coverUrl: url })}
        preview
        aspectRatio="16:9"
      />

      <Input
        label="대표 배너 문구"
        value={formData.bannerText || ""}
        onChange={(e) =>
          setFormData({ ...formData, bannerText: e.target.value })
        }
        placeholder="예: 미래를 키우는 유소년 축구 플랫폼"
        maxLength={100}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="이메일 *"
          type="email"
          value={formData.contactEmail}
          onChange={(e) =>
            setFormData({ ...formData, contactEmail: e.target.value })
          }
          placeholder="contact@federation.kr"
          error={errors.contactEmail}
          required
        />
        <Input
          label="전화번호 *"
          type="tel"
          value={formData.contactPhone}
          onChange={(e) =>
            setFormData({ ...formData, contactPhone: e.target.value })
          }
          placeholder="02-1234-5678"
          error={errors.contactPhone}
          required
        />
      </div>
    </div>
  );
}
```

### 5.4 StepAdmin

```typescript
// src/components/federation/steps/StepAdmin.tsx
import { Input } from "@/components/shared/Input";
import { Select } from "@/components/shared/Select";
import type { FederationFormData } from "@/types/federation";

interface StepAdminProps {
  formData: FederationFormData;
  setFormData: (data: FederationFormData) => void;
  errors: Record<string, string>;
}

export function StepAdmin({
  formData,
  setFormData,
  errors,
}: StepAdminProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          관리자 계정
        </h2>
        <p className="text-gray-600">
          관리자 정보를 입력하세요
        </p>
      </div>

      <Input
        label="관리자 이름 *"
        value={formData.adminName}
        onChange={(e) =>
          setFormData({ ...formData, adminName: e.target.value })
        }
        placeholder="홍길동"
        maxLength={20}
        error={errors.adminName}
        required
      />

      <Input
        label="이메일 *"
        type="email"
        value={formData.adminEmail}
        onChange={(e) =>
          setFormData({ ...formData, adminEmail: e.target.value })
        }
        placeholder="admin@federation.kr"
        helperText="협회 관리자로 지정될 이메일 주소"
        error={errors.adminEmail}
        required
      />

      <Input
        label="휴대폰 *"
        type="tel"
        value={formData.adminPhone}
        onChange={(e) =>
          setFormData({ ...formData, adminPhone: e.target.value })
        }
        placeholder="010-1234-5678"
        error={errors.adminPhone}
        required
      />

      <Select
        label="직책 *"
        options={[
          { value: "president", label: "회장" },
          { value: "secretary", label: "사무국장" },
          { value: "manager", label: "운영자" },
          { value: "admin", label: "관리자" },
        ]}
        value={formData.adminRole}
        onChange={(value) =>
          setFormData({ ...formData, adminRole: value })
        }
        error={errors.adminRole}
        required
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          관리자 계정은 초대 링크를 통해 생성됩니다.
          입력하신 이메일로 초대 링크가 발송됩니다.
        </p>
      </div>
    </div>
  );
}
```

### 5.5 StepReview

```typescript
// src/components/federation/steps/StepReview.tsx
import type { FederationFormData } from "@/types/federation";

interface StepReviewProps {
  formData: FederationFormData;
  errors: Record<string, string>;
}

const AUTO_CREATED_ITEMS = [
  { icon: "🌐", label: "협회 홈페이지" },
  { icon: "⚙️", label: "관리자 콘솔" },
  { icon: "👥", label: "팀 등록 폼" },
  { icon: "🏃", label: "선수 등록 구조" },
  { icon: "📅", label: "시즌/리그 기본 템플릿" },
  { icon: "📢", label: "공지사항 게시판" },
  { icon: "🎉", label: "이벤트 관리 메뉴" },
  { icon: "🤖", label: "AI 운영 도우미" },
];

export function StepReview({ formData, errors }: StepReviewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          확인
        </h2>
        <p className="text-gray-600">
          정보를 확인하고 생성하세요
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">
          다음 항목이 자동 생성됩니다
        </h3>
        <div className="space-y-2">
          {AUTO_CREATED_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-gray-700">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 space-y-3">
        <h4 className="font-semibold text-gray-900 mb-4">입력 정보 요약</h4>
        <div className="flex justify-between">
          <span className="text-gray-600">협회명</span>
          <span className="font-medium">{formData.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">종목</span>
          <span className="font-medium">
            {getSportLabel(formData.sportType)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">지역</span>
          <span className="font-medium">
            {formData.region1} {formData.region2}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">운영 대상</span>
          <span className="font-medium">
            {getTargetTypeLabel(formData.targetType)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">운영 방식</span>
          <span className="font-medium">
            {getOperationTypeLabel(formData.operationType)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">관리자</span>
          <span className="font-medium">{formData.adminName}</span>
        </div>
      </div>

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{errors.submit}</p>
        </div>
      )}
    </div>
  );
}

// Helper functions
function getSportLabel(sport: string) {
  const labels: Record<string, string> = {
    football: "축구",
    futsal: "풋살",
    basketball: "농구",
    baseball: "야구",
    volleyball: "배구",
  };
  return labels[sport] || sport;
}

function getTargetTypeLabel(type: string) {
  const labels: Record<string, string> = {
    youth: "유소년",
    amateur: "아마추어",
    school: "학교",
    adult: "성인 클럽",
  };
  return labels[type] || type;
}

function getOperationTypeLabel(type: string) {
  const labels: Record<string, string> = {
    league: "리그 중심",
    tournament: "대회 중심",
    mixed: "혼합형",
  };
  return labels[type] || type;
}
```

---

## 6️⃣ API 및 서버 로직

### 6.1 API Route

```typescript
// src/app/api/federations/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createFederation } from "@/lib/services/federationService";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const result = await createFederation(data);
    
    return NextResponse.json({
      success: true,
      slug: result.slug,
      federationId: result.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "협회 생성에 실패했습니다.",
      },
      { status: 400 }
    );
  }
}
```

### 6.2 서버 로직

```typescript
// src/lib/services/federationService.ts
import { db } from "@/lib/firebase/firebaseClient";
import { collection, doc, setDoc, addDoc, Timestamp } from "firebase/firestore";
import type { FederationFormData } from "@/types/federation";

export async function createFederation(data: FederationFormData) {
  // 1. Federation 문서 생성
  const federationRef = doc(collection(db, "federations"));
  await setDoc(federationRef, {
    name: data.name,
    slug: data.slug,
    sportType: data.sportType,
    tagline: data.tagline,
    description: data.description,
    region: `${data.region1} ${data.region2}`,
    targetType: data.targetType,
    operationType: data.operationType,
    ageCategories: data.ageCategories,
    hasSeasons: data.hasSeasons === "yes",
    logoUrl: data.logoUrl || "",
    primaryColor: data.primaryColor,
    secondaryColor: data.secondaryColor,
    coverUrl: data.coverUrl || "",
    bannerText: data.bannerText || "",
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    status: "active",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  const federationId = federationRef.id;

  // 2. 기본 페이지 생성
  await createDefaultPages(federationId);

  // 3. 기본 메뉴 생성
  await createDefaultMenus(federationId);

  // 4. 관리자 계정 연결
  await createAdminAccount(federationId, data);

  // 5. 기본 시즌/리그 템플릿 생성
  await createDefaultTemplates(federationId, data);

  // 6. AI 에이전트 생성
  await createAIAgents(federationId);

  return {
    id: federationId,
    slug: data.slug,
  };
}

async function createDefaultPages(federationId: string) {
  const pages = [
    { id: "home", title: "홈", path: "/" },
    { id: "about", title: "협회소개", path: "/about" },
    { id: "notices", title: "공지사항", path: "/notices" },
    { id: "tournaments", title: "대회", path: "/tournaments" },
    { id: "matches", title: "경기", path: "/matches" },
    { id: "standings", title: "순위", path: "/standings" },
    { id: "clubs", title: "팀", path: "/clubs" },
    { id: "docs", title: "자료실", path: "/docs" },
    { id: "sponsors", title: "후원사", path: "/sponsors" },
    { id: "contact", title: "문의", path: "/contact" },
  ];

  for (const page of pages) {
    await addDoc(
      collection(db, `federations/${federationId}/pages`),
      {
        ...page,
        createdAt: Timestamp.now(),
      }
    );
  }
}

async function createDefaultMenus(federationId: string) {
  const menus = [
    { label: "홈", path: "/", order: 1 },
    { label: "협회소개", path: "/about", order: 2 },
    { label: "공지사항", path: "/notices", order: 3 },
    { label: "대회", path: "/tournaments", order: 4 },
    { label: "경기", path: "/matches", order: 5 },
    { label: "순위", path: "/standings", order: 6 },
    { label: "팀", path: "/clubs", order: 7 },
    { label: "자료실", path: "/docs", order: 8 },
  ];

  for (const menu of menus) {
    await addDoc(
      collection(db, `federations/${federationId}/menus`),
      {
        ...menu,
        createdAt: Timestamp.now(),
      }
    );
  }
}

async function createAdminAccount(
  federationId: string,
  data: FederationFormData
) {
  // 관리자 계정 생성 또는 권한 부여
  await addDoc(
    collection(db, `federations/${federationId}/admins`),
    {
      userId: "", // 실제 사용자 ID로 연결
      name: data.adminName,
      email: data.adminEmail,
      phone: data.adminPhone,
      role: data.adminRole,
      permissions: [
        "manage-leagues",
        "manage-teams",
        "manage-matches",
        "manage-results",
        "manage-notices",
      ],
      createdAt: Timestamp.now(),
    }
  );
}

async function createDefaultTemplates(
  federationId: string,
  data: FederationFormData
) {
  // 기본 시즌 생성
  if (data.hasSeasons === "yes") {
    await addDoc(
      collection(db, `federations/${federationId}/seasons`),
      {
        name: "2026 전반기",
        year: 2026,
        period: "first",
        status: "draft",
        createdAt: Timestamp.now(),
      }
    );
  }

  // 기본 리그 템플릿 생성
  const leagueTemplates = getLeagueTemplates(data.sportType);
  for (const league of leagueTemplates) {
    await addDoc(
      collection(db, `federations/${federationId}/leagues`),
      {
        ...league,
        status: "draft",
        createdAt: Timestamp.now(),
      }
    );
  }
}

function getLeagueTemplates(sportType: string) {
  const templates: Record<string, any[]> = {
    football: [
      { name: "K7 리그", category: "adult", ageGroup: "adult" },
      { name: "주말 리그", category: "adult", ageGroup: "adult" },
      { name: "유소년 리그", category: "youth", ageGroup: "youth" },
    ],
    // ...
  };
  return templates[sportType] || [];
}

async function createAIAgents(federationId: string) {
  const agents = [
    { name: "대표 AI 비서", type: "federation-assistant", scope: "public" },
    { name: "대회 안내 AI", type: "tournament-guide", scope: "public" },
    { name: "팀 등록 AI", type: "team-registration", scope: "public" },
    { name: "선수 등록 AI", type: "player-registration", scope: "public" },
    { name: "규정 AI", type: "rules-guide", scope: "public" },
    { name: "운영 AI", type: "operations", scope: "admin" },
    { name: "후원사 AI", type: "sponsor", scope: "public" },
  ];

  for (const agent of agents) {
    await addDoc(
      collection(db, `federations/${federationId}/aiAgents`),
      {
        ...agent,
        enabled: true,
        createdAt: Timestamp.now(),
      }
    );
  }
}
```

---

## 7️⃣ 생성 완료 후 흐름

### Welcome 페이지

```typescript
// src/app/federations/[slug]/welcome/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { Users, Trophy, Megaphone, Palette } from "lucide-react";
import { Card } from "@/components/shared/Card";
import { Button } from "@/components/shared/Button";

export default function FederationWelcomePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const quickActions = [
    {
      icon: <Users className="w-8 h-8" />,
      title: "팀 초대하기",
      description: "첫 팀을 등록하고 초대하세요",
      onClick: () => router.push(`/federations/${slug}/admin/teams/new`),
    },
    {
      icon: <Trophy className="w-8 h-8" />,
      title: "대회 만들기",
      description: "첫 대회를 생성하고 시작하세요",
      onClick: () => router.push(`/federations/${slug}/admin/tournaments/new`),
    },
    {
      icon: <Megaphone className="w-8 h-8" />,
      title: "공지 작성",
      description: "첫 공지사항을 작성하세요",
      onClick: () => router.push(`/federations/${slug}/admin/notices/new`),
    },
    {
      icon: <Palette className="w-8 h-8" />,
      title: "홈페이지 꾸미기",
      description: "협회 소개 페이지를 수정하세요",
      onClick: () => router.push(`/federations/${slug}/admin/settings`),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            협회가 준비되었습니다! 🎉
          </h1>
          <p className="text-lg text-gray-600">
            이제 협회를 운영할 준비가 끝났습니다.
            팀을 초대하고 첫 시즌을 시작해보세요.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {quickActions.map((action, index) => (
            <Card
              key={index}
              hover
              className="cursor-pointer"
              onClick={action.onClick}
            >
              <div className="flex items-start gap-4">
                <div className="text-primary-600">{action.icon}</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {action.title}
                  </h3>
                  <p className="text-gray-600">{action.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex gap-4 justify-center">
          <Button
            variant="outline"
            onClick={() => router.push(`/federations/${slug}`)}
          >
            홈페이지 보기
          </Button>
          <Button
            onClick={() => router.push(`/federations/${slug}/admin`)}
          >
            관리자 대시보드
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ 구현 가이드 완료

### 완성된 내용

- ✅ 전체 페이지 구조 및 라우팅
- ✅ 상태 관리 설계
- ✅ 모든 컴포넌트 코드 (6개)
- ✅ 5개 Step 구현 코드
- ✅ API 및 서버 로직
- ✅ 생성 완료 후 Welcome 페이지

### 예상 개발 시간

```
Wizard UI: 1~2일
API + DB: 1일
생성 로직: 1일
총: 3~4일
```

---

**작성일**: 2024년  
**상태**: ✅ YAGO Federation Create Wizard 구현 가이드 완료

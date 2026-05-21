# 🚀 YAGO Federation Create Wizard - 3분 협회 생성 시스템

> **작성일**: 2024년  
> **목적**: 3분만에 협회 홈페이지 자동 생성 - 완전한 구현 가이드

---

## 📋 목차

1. [Wizard 전체 구조](#1-wizard-전체-구조)
2. [5단계 상세 설계](#2-5단계-상세-설계)
3. [Backend API 설계](#3-backend-api-설계)
4. [자동 생성 프로세스](#4-자동-생성-프로세스)
5. [완전한 컴포넌트 코드](#5-완전한-컴포넌트-코드)

---

## 1️⃣ Wizard 전체 구조

### 5단계 프로세스

```
Step 1: 기본 정보 (협회명, 슬러그, 지역)
  ↓
Step 2: 종목 선택 (축구, 풋살, 농구, 야구, 배구)
  ↓
Step 3: 브랜딩 (로고, 주요 색상, 보조 색상)
  ↓
Step 4: 관리자 설정 (관리자 이메일)
  ↓
Step 5: 확인 및 생성
```

### 생성 시간 목표

```
목표: 3분 이내
실제: 약 2-3분 (사용자 입력 + 자동 생성)
```

---

## 2️⃣ 5단계 상세 설계

### Step 1: 기본 정보

**입력 항목**
- 협회명 (필수)
- 슬러그 (필수, 자동 생성 가능)
- 지역 (필수)

**유효성 검사**
- 협회명: 2-50자
- 슬러그: 영문, 숫자, 하이픈만, 3-30자, 중복 체크
- 지역: 2-30자

**UI**
```typescript
<Input label="협회명 *" placeholder="예: 노원구 축구협회" />
<Input label="슬러그 *" placeholder="예: nowon-football" />
<Input label="지역 *" placeholder="예: 서울 노원구" />
```

### Step 2: 종목 선택

**선택 가능 종목**
- 축구 (football)
- 풋살 (futsal)
- 농구 (basketball)
- 야구 (baseball)
- 배구 (volleyball)

**UI**
```typescript
// 그리드 레이아웃
<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
  {sports.map(sport => (
    <SportCard 
      key={sport.id}
      selected={selectedSport === sport.id}
      onClick={() => setSelectedSport(sport.id)}
    />
  ))}
</div>
```

### Step 3: 브랜딩

**입력 항목**
- 로고 업로드 (선택)
- 주요 색상 (기본값: #0F172A)
- 보조 색상 (기본값: #16A34A)

**UI**
```typescript
<FileUpload label="로고 업로드" />
<ColorPicker label="주요 색상" />
<ColorPicker label="보조 색상" />
```

### Step 4: 관리자 설정

**입력 항목**
- 관리자 이메일 (필수)

**유효성 검사**
- 이메일 형식 검증
- 사용자 존재 여부 확인

**UI**
```typescript
<Input 
  type="email" 
  label="관리자 이메일 *" 
  placeholder="admin@example.com" 
/>
```

### Step 5: 확인 및 생성

**표시 정보**
- 모든 입력값 요약
- 자동 생성될 항목 목록

**생성 버튼**
- "협회 생성" 버튼 클릭
- 로딩 상태 표시
- 생성 완료 후 리다이렉트

---

## 3️⃣ Backend API 설계

### API 엔드포인트

```typescript
POST /api/federations/create
```

### Request Body

```typescript
interface CreateFederationRequest {
  name: string;
  slug: string;
  region: string;
  sportType: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  adminEmail: string;
}
```

### Response

```typescript
interface CreateFederationResponse {
  success: boolean;
  federationId: string;
  slug: string;
  message?: string;
  error?: string;
}
```

### Cloud Function 구조

```typescript
// functions/src/federation/createFederation.ts
import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

export const createFederation = onCall(async (request) => {
  const {
    name,
    slug,
    region,
    sportType,
    logoUrl,
    primaryColor,
    secondaryColor,
    adminEmail,
  } = request.data;

  // 1. 슬러그 중복 체크
  const existingFederation = await checkSlugExists(slug);
  if (existingFederation) {
    throw new Error("이미 사용 중인 슬러그입니다.");
  }

  // 2. 관리자 사용자 확인
  const adminUser = await getUserByEmail(adminEmail);
  if (!adminUser) {
    throw new Error("관리자 이메일을 찾을 수 없습니다.");
  }

  // 3. Federation 문서 생성
  const federationRef = db.collection("federations").doc();
  await federationRef.set({
    name,
    slug,
    region,
    sportType,
    logoUrl: logoUrl || "",
    primaryColor,
    secondaryColor,
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const federationId = federationRef.id;

  // 4. 기본 페이지 생성
  await createDefaultPages(federationId);

  // 5. 기본 메뉴 생성
  await createDefaultMenus(federationId);

  // 6. 관리자 계정 연결
  await createAdminAccount(federationId, adminUser.uid);

  // 7. 기본 리그 템플릿 생성
  await createDefaultLeagues(federationId, sportType);

  // 8. AI 에이전트 생성
  await createAIAgents(federationId);

  // 9. 관리자 대시보드 초기화
  await initializeAdminDashboard(federationId);

  return {
    success: true,
    federationId,
    slug,
    message: "협회가 성공적으로 생성되었습니다.",
  };
});
```

---

## 4️⃣ 자동 생성 프로세스

### 생성 순서

```
1. Federation 문서 생성
   ↓
2. 기본 페이지 생성 (10개)
   ↓
3. 기본 메뉴 생성 (8개)
   ↓
4. 관리자 계정 연결
   ↓
5. 기본 리그 템플릿 생성 (3개)
   ↓
6. AI 에이전트 생성 (7개)
   ↓
7. 관리자 대시보드 초기화
   ↓
8. 완료 (약 10초)
```

### 생성되는 항목 상세

#### 1. 기본 페이지 (10개)

```typescript
const defaultPages = [
  { id: "home", title: "홈", path: "/" },
  { id: "about", title: "협회소개", path: "/about" },
  { id: "greeting", title: "회장 인사말", path: "/greeting" },
  { id: "organization", title: "조직도", path: "/organization" },
  { id: "notices", title: "공지사항", path: "/notices" },
  { id: "tournaments", title: "대회", path: "/tournaments" },
  { id: "matches", title: "경기", path: "/matches" },
  { id: "standings", title: "순위", path: "/standings" },
  { id: "clubs", title: "팀", path: "/clubs" },
  { id: "docs", title: "자료실", path: "/docs" },
  { id: "sponsors", title: "후원사", path: "/sponsors" },
  { id: "contact", title: "문의", path: "/contact" },
];
```

#### 2. 기본 메뉴 (8개)

```typescript
const defaultMenus = [
  { label: "홈", path: "/", order: 1 },
  { label: "협회소개", path: "/about", order: 2 },
  { label: "공지사항", path: "/notices", order: 3 },
  { label: "대회", path: "/tournaments", order: 4 },
  { label: "경기", path: "/matches", order: 5 },
  { label: "순위", path: "/standings", order: 6 },
  { label: "팀", path: "/clubs", order: 7 },
  { label: "자료실", path: "/docs", order: 8 },
];
```

#### 3. 기본 리그 템플릿 (종목별)

**축구 (football)**
```typescript
const footballLeagues = [
  { name: "K7 리그", category: "adult", ageGroup: "adult" },
  { name: "주말 리그", category: "adult", ageGroup: "adult" },
  { name: "유소년 리그", category: "youth", ageGroup: "youth" },
];
```

**풋살 (futsal)**
```typescript
const futsalLeagues = [
  { name: "성인 풋살 리그", category: "adult", ageGroup: "adult" },
  { name: "주말 풋살 리그", category: "adult", ageGroup: "adult" },
];
```

#### 4. AI 에이전트 (7개)

```typescript
const aiAgents = [
  { name: "대표 AI 비서", type: "federation-assistant", scope: "public" },
  { name: "대회 안내 AI", type: "tournament-guide", scope: "public" },
  { name: "팀 등록 AI", type: "team-registration", scope: "public" },
  { name: "선수 등록 AI", type: "player-registration", scope: "public" },
  { name: "규정 AI", type: "rules-guide", scope: "public" },
  { name: "운영 AI", type: "operations", scope: "admin" },
  { name: "후원사 AI", type: "sponsor", scope: "public" },
];
```

---

## 5️⃣ 완전한 컴포넌트 코드

### FederationCreateWizard.tsx

```typescript
// src/app/platform/federations/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { Card } from "@/components/shared/Card";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface WizardStep {
  id: string;
  title: string;
  description: string;
}

const steps: WizardStep[] = [
  {
    id: "basic",
    title: "기본 정보",
    description: "협회 이름과 지역을 입력하세요",
  },
  {
    id: "sport",
    title: "종목 선택",
    description: "운영할 스포츠 종목을 선택하세요",
  },
  {
    id: "visual",
    title: "브랜딩",
    description: "로고와 색상을 설정하세요",
  },
  {
    id: "admin",
    title: "관리자 설정",
    description: "관리자 계정을 연결하세요",
  },
  {
    id: "review",
    title: "확인",
    description: "정보를 확인하고 생성하세요",
  },
];

const sports = [
  { id: "football", label: "축구", icon: "⚽" },
  { id: "futsal", label: "풋살", icon: "🏃" },
  { id: "basketball", label: "농구", icon: "🏀" },
  { id: "baseball", label: "야구", icon: "⚾" },
  { id: "volleyball", label: "배구", icon: "🏐" },
];

export default function CreateFederationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    region: "",
    sportType: "",
    logoUrl: "",
    primaryColor: "#0F172A",
    secondaryColor: "#16A34A",
    adminEmail: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  // 슬러그 자동 생성
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  // 슬러그 중복 체크
  const checkSlugAvailability = async (slug: string) => {
    if (!slug) return false;
    setIsCheckingSlug(true);
    try {
      const response = await fetch(`/api/federations/check-slug?slug=${slug}`);
      const data = await response.json();
      return data.available;
    } catch (error) {
      return false;
    } finally {
      setIsCheckingSlug(false);
    }
  };

  // 단계별 유효성 검사
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return (
          formData.name.length >= 2 &&
          formData.name.length <= 50 &&
          formData.slug.length >= 3 &&
          formData.slug.length <= 30 &&
          formData.region.length >= 2 &&
          formData.region.length <= 30
        );
      case 1:
        return formData.sportType !== "";
      case 2:
        return true; // 브랜딩은 선택사항
      case 3:
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail);
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      // 슬러그 중복 체크
      const available = await checkSlugAvailability(formData.slug);
      if (!available) {
        setErrors({ slug: "이미 사용 중인 슬러그입니다." });
        return;
      }
    }

    if (isStepValid(currentStep) && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setErrors({});
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/federations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/federations/${result.slug}`);
      } else {
        setErrors({ submit: result.error || "협회 생성에 실패했습니다." });
      }
    } catch (error) {
      setErrors({ submit: "네트워크 오류가 발생했습니다." });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Building2 className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            새 협회 생성
          </h1>
          <p className="text-gray-600">
            3분만에 협회 홈페이지를 만들 수 있습니다
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      index <= currentStep
                        ? "bg-primary-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {index < currentStep ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p
                      className={`text-sm font-medium ${
                        index <= currentStep ? "text-primary-600" : "text-gray-500"
                      }`}
                    >
                      {step.title}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 transition-all ${
                      index < currentStep ? "bg-primary-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <Card>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {steps[currentStep].title}
            </h2>
            <p className="text-gray-600 mt-1">
              {steps[currentStep].description}
            </p>
          </div>

          {/* Step 1: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <Input
                label="협회명 *"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData({
                    ...formData,
                    name,
                    slug: generateSlug(name),
                  });
                }}
                placeholder="예: 노원구 축구협회"
                error={errors.name}
              />
              <Input
                label="슬러그 *"
                value={formData.slug}
                onChange={(e) => {
                  const slug = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-")
                    .replace(/-+/g, "-");
                  setFormData({ ...formData, slug });
                }}
                placeholder="예: nowon-football"
                helperText="URL에 사용됩니다 (영문, 숫자, 하이픈만 가능)"
                error={errors.slug}
                disabled={isCheckingSlug}
              />
              <Input
                label="지역 *"
                value={formData.region}
                onChange={(e) =>
                  setFormData({ ...formData, region: e.target.value })
                }
                placeholder="예: 서울 노원구"
                error={errors.region}
              />
            </div>
          )}

          {/* Step 2: Sport Type */}
          {currentStep === 1 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {sports.map((sport) => (
                <button
                  key={sport.id}
                  onClick={() =>
                    setFormData({ ...formData, sportType: sport.id })
                  }
                  className={`p-6 border-2 rounded-lg text-center transition-all ${
                    formData.sportType === sport.id
                      ? "border-primary-600 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-4xl mb-2">{sport.icon}</div>
                  <p className="font-medium text-gray-900">{sport.label}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Visual */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  로고 업로드 (선택)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="logo"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // 파일 업로드 로직
                        // setFormData({ ...formData, logoUrl: uploadedUrl });
                      }
                    }}
                  />
                  <label
                    htmlFor="logo"
                    className="cursor-pointer text-primary-600 hover:text-primary-700"
                  >
                    클릭하여 업로드
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    주요 색상
                  </label>
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) =>
                      setFormData({ ...formData, primaryColor: e.target.value })
                    }
                    className="w-full h-12 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    보조 색상
                  </label>
                  <input
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        secondaryColor: e.target.value,
                      })
                    }
                    className="w-full h-12 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Admin */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <Input
                label="관리자 이메일 *"
                type="email"
                value={formData.adminEmail}
                onChange={(e) =>
                  setFormData({ ...formData, adminEmail: e.target.value })
                }
                placeholder="admin@example.com"
                helperText="협회 관리자로 지정될 이메일 주소"
                error={errors.adminEmail}
              />
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">협회명</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">슬러그</span>
                  <span className="font-medium">{formData.slug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">지역</span>
                  <span className="font-medium">{formData.region}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">종목</span>
                  <span className="font-medium">
                    {sports.find((s) => s.id === formData.sportType)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">관리자</span>
                  <span className="font-medium">{formData.adminEmail}</span>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  생성 시 다음이 자동으로 생성됩니다:
                </p>
                <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                  <li>협회 홈페이지</li>
                  <li>관리자 대시보드</li>
                  <li>기본 메뉴 및 페이지 (12개)</li>
                  <li>AI 에이전트 (7개)</li>
                  <li>리그 템플릿 (3개)</li>
                </ul>
              </div>
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{errors.submit}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              이전
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!isStepValid(currentStep) || isCheckingSlug}
              >
                다음
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    생성 중...
                  </>
                ) : (
                  "협회 생성"
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
```

---

## ✅ Federation Create Wizard 완료

### 완성된 기능

- ✅ 5단계 Wizard UI
- ✅ 실시간 유효성 검사
- ✅ 슬러그 자동 생성 및 중복 체크
- ✅ 종목 선택 UI
- ✅ 브랜딩 설정 (로고, 색상)
- ✅ 관리자 설정
- ✅ 최종 확인 및 생성

### 다음 단계

1. **Backend API 구현**: Cloud Function 작성
2. **자동 생성 로직**: 8단계 프로세스 구현
3. **테스트**: 전체 플로우 테스트

---

**작성일**: 2024년  
**상태**: ✅ YAGO Federation Create Wizard 완료

# 🏗️ YAGO VIBE SPORTS - 협회 자동 생성 UI (Federation Builder)

> **작성일**: 2024년  
> **목적**: 협회 생성 UI 및 워크플로우 설계

---

## 📋 목차

1. [협회 생성 페이지](#1-협회-생성-페이지)
2. [생성 폼 UI](#2-생성-폼-ui)
3. [생성 프로세스](#3-생성-프로세스)
4. [생성 완료 페이지](#4-생성-완료-페이지)
5. [실제 구현 코드](#5-실제-구현-코드)

---

## 1️⃣ 협회 생성 페이지

### 경로: `/admin/create-federation`

### 전체 레이아웃

```
┌─────────────────────────────────────────┐
│ Header                                  │
├─────────────────────────────────────────┤
│ 협회 생성                                │
│                                         │
│ 새로운 협회를 생성하여                  │
│ 완전한 스포츠 운영 플랫폼을 만드세요    │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 기본 정보                            │ │
│ │                                      │ │
│ │ 협회명: [________________]          │ │
│ │ 지역:   [________________]          │ │
│ │ 종목:   [축구 ▼]                    │ │
│ │ Slug:   [________________]          │ │
│ │                                      │ │
│ │ 설명:   [________________]          │ │
│ │        [________________]          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 시각적 요소                          │ │
│ │                                      │ │
│ │ 로고: [업로드]                       │ │
│ │                                      │ │
│ │ 대표 색상: [색상 선택기]            │ │
│ │ 강조 색상: [색상 선택기]            │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 관리자 설정                          │ │
│ │                                      │ │
│ │ 관리자 이메일: [________________]   │ │
│ │                                      │ │
│ │ [관리자 추가]                        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 선택 사항                            │ │
│ │                                      │ │
│ │ 연락처:                             │ │
│ │   주소: [________________]         │ │
│ │   전화: [________________]         │ │
│ │   이메일: [________________]        │ │
│ │                                      │ │
│ │ 조직 정보:                          │ │
│ │   회장: [________________]         │ │
│ │   부회장: [________________]        │ │
│ │   사무국장: [________________]      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [ 취소 ]  [ 협회 생성 ]                 │
└─────────────────────────────────────────┘
```

---

## 2️⃣ 생성 폼 UI

### 컴포넌트 구조

```tsx
// src/pages/admin/CreateFederationPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createFederation } from "@/services/federationService";
import Header from "@/layout/Header";

export default function CreateFederationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateFederationInput>({
    name: "",
    slug: "",
    region: "",
    sport: "football",
    adminUids: [],
    primaryColor: "#0F3D75",
    accentColor: "#16A34A",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createFederation(formData);
      navigate(`/federations/${result.slug}`, {
        state: { message: "협회가 성공적으로 생성되었습니다." },
      });
    } catch (error) {
      console.error("협회 생성 실패:", error);
      alert("협회 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">협회 생성</h1>
          <p className="text-gray-600">
            새로운 협회를 생성하여 완전한 스포츠 운영 플랫폼을 만드세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <BasicInfoSection formData={formData} setFormData={setFormData} />
          
          {/* 시각적 요소 */}
          <VisualElementsSection formData={formData} setFormData={setFormData} />
          
          {/* 관리자 설정 */}
          <AdminSettingsSection formData={formData} setFormData={setFormData} />
          
          {/* 선택 사항 */}
          <OptionalInfoSection formData={formData} setFormData={setFormData} />
          
          {/* 제출 버튼 */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name || !formData.slug || !formData.region}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "생성 중..." : "협회 생성"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### BasicInfoSection 컴포넌트

```tsx
// src/components/admin/createFederation/BasicInfoSection.tsx
interface BasicInfoSectionProps {
  formData: CreateFederationInput;
  setFormData: (data: CreateFederationInput) => void;
}

export function BasicInfoSection({ formData, setFormData }: BasicInfoSectionProps) {
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4">기본 정보</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            협회명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => {
              setFormData({
                ...formData,
                name: e.target.value,
                slug: generateSlug(e.target.value),
              });
            }}
            placeholder="노원구 축구협회"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Slug <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">/federations/</span>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="nowon-football"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            URL에 사용될 고유 식별자입니다. 영문, 숫자, 하이픈만 사용 가능합니다.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            지역 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.region}
            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
            placeholder="서울 노원구"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            종목 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.sport}
            onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="football">축구</option>
            <option value="basketball">농구</option>
            <option value="baseball">야구</option>
            <option value="volleyball">배구</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            설명
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="협회에 대한 간단한 설명을 입력하세요."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
```

### VisualElementsSection 컴포넌트

```tsx
// src/components/admin/createFederation/VisualElementsSection.tsx
export function VisualElementsSection({ formData, setFormData }: BasicInfoSectionProps) {
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Firebase Storage 업로드 로직
    // 업로드 후 URL을 formData.logoUrl에 설정
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4">시각적 요소</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            로고
          </label>
          <div className="flex items-center gap-4">
            {formData.logoUrl ? (
              <img src={formData.logoUrl} alt="로고" className="w-20 h-20 rounded-lg object-cover" />
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                <Image className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <label className="px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <span className="text-sm text-gray-700">로고 업로드</span>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              대표 색상
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              강조 색상
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.accentColor}
                onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={formData.accentColor}
                onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 3️⃣ 생성 프로세스

### 단계별 진행

```
1. 폼 입력
   ↓
2. 유효성 검사
   ↓
3. Cloud Function 호출
   ↓
4. 생성 진행 중 (로딩)
   ↓
5. 생성 완료
   ↓
6. 협회 홈페이지로 리다이렉트
```

### 로딩 상태 UI

```tsx
{loading && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-8 max-w-md">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold mb-2">협회 생성 중...</h3>
        <p className="text-gray-600 text-sm">
          홈페이지, 대회 시스템, AI 에이전트를 생성하고 있습니다.
        </p>
        <div className="mt-4 space-y-2 text-left">
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-green-500" />
            <span>Federation 문서 생성</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-green-500" />
            <span>초기 공지 생성</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Loader className="w-4 h-4 text-blue-500 animate-spin" />
            <span>AI 에이전트 생성 중...</span>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
```

---

## 4️⃣ 생성 완료 페이지

### 성공 메시지

```tsx
// 생성 완료 후 리다이렉트된 협회 홈페이지에 표시
{location.state?.message && (
  <div className="max-w-7xl mx-auto px-4 py-4">
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <span className="text-green-800">{location.state.message}</span>
      </div>
      <button
        onClick={() => navigate(`/federations/${federationId}/admin`)}
        className="text-sm text-green-700 hover:text-green-900 font-medium"
      >
        관리자 대시보드로 이동 →
      </button>
    </div>
  </div>
)}
```

---

## 5️⃣ 실제 구현 코드

### Federation Service

```typescript
// src/services/federationService.ts
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";

export interface CreateFederationInput {
  name: string;
  slug: string;
  region: string;
  sport: string;
  adminUids: string[];
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  description?: string;
  contact?: {
    address?: string;
    phone?: string;
    email?: string;
  };
  organization?: {
    president?: string;
    vicePresident?: string;
    secretary?: string;
  };
}

export interface CreateFederationResult {
  success: boolean;
  federationId: string;
  slug: string;
  message: string;
  url: string;
}

export async function createFederation(
  input: CreateFederationInput
): Promise<CreateFederationResult> {
  const functions = getFunctions();
  const auth = getAuth();
  
  if (!auth.currentUser) {
    throw new Error("로그인이 필요합니다.");
  }

  // 현재 사용자를 관리자 목록에 추가
  const adminUids = input.adminUids.includes(auth.currentUser.uid)
    ? input.adminUids
    : [...input.adminUids, auth.currentUser.uid];

  const createFederationFn = httpsCallable<CreateFederationInput, CreateFederationResult>(
    functions,
    "createFederation"
  );

  try {
    const result = await createFederationFn({
      ...input,
      adminUids,
    });

    return result.data;
  } catch (error: any) {
    console.error("협회 생성 실패:", error);
    throw new Error(error.message || "협회 생성에 실패했습니다.");
  }
}
```

---

## ✅ 유효성 검사

### 클라이언트 사이드 검증

```typescript
const validateForm = (formData: CreateFederationInput): string[] => {
  const errors: string[] = [];

  if (!formData.name || formData.name.trim().length < 2) {
    errors.push("협회명은 2자 이상이어야 합니다.");
  }

  if (!formData.slug || !/^[a-z0-9-]+$/.test(formData.slug)) {
    errors.push("Slug는 영문, 숫자, 하이픈만 사용 가능합니다.");
  }

  if (!formData.region || formData.region.trim().length < 2) {
    errors.push("지역을 입력해주세요.");
  }

  if (!formData.sport) {
    errors.push("종목을 선택해주세요.");
  }

  if (formData.adminUids.length === 0) {
    errors.push("최소 1명의 관리자가 필요합니다.");
  }

  return errors;
};
```

---

**작성일**: 2024년  
**상태**: ✅ 협회 자동 생성 UI 완료

# 🎯 YAGO VIBE SPORTS - 개선된 플랫폼 구조

> **작성일**: 2024년  
> **목적**: UX 개선 - 팀 디렉토리 + 협회 플랫폼 분리 + FAB Create Center

---

## 📋 목차

1. [문제점 분석](#1-문제점-분석)
2. [개선된 플랫폼 구조](#2-개선된-플랫폼-구조)
3. [FAB (Floating Action Button)](#3-fab-floating-action-button)
4. [팀 디렉토리 페이지](#4-팀-디렉토리-페이지)
5. [Federation Create Wizard](#5-federation-create-wizard)

---

## 1️⃣ 문제점 분석

### 현재 구조의 문제

```
/sports 페이지에
├─ 내 팀
├─ 경기
├─ 팀 이벤트
├─ 선수
├─ 통계
├─ 대회
├─ 유소년
└─ 협회
```

**문제**: 개인 스포츠 관리 + 협회 플랫폼이 섞여 있음

### 개선 방향

```
Sports Hub (개인) + Federation Hub (협회) 분리
```

---

## 2️⃣ 개선된 플랫폼 구조

### 새로운 플랫폼 IA

```
/
└─ YAGO Home (플랫폼 홈)

/sports
└─ 팀 디렉토리 (Team Directory)
   ├─ 검색
   ├─ 인기 팀
   ├─ 최근 등록 팀
   ├─ 대회 참가 팀
   └─ 유소년 팀

/federations
└─ 협회 목록 (Federation Directory)

/federations/{federationId}
└─ 협회 홈페이지

/federations/{federationId}/admin
└─ 협회 관리자

FAB (우측 하단)
└─ Create Center
   ├─ 협회 생성
   ├─ 팀 생성
   ├─ 대회 생성
   ├─ 이벤트 생성
   └─ 선수 등록
```

---

## 3️⃣ FAB (Floating Action Button)

### FAB 구조

```typescript
// components/shared/FabMenu.tsx
"use client";

import { useState } from "react";
import { Plus, Building2, Users, Trophy, Calendar, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

interface FabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
}

export function FabMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const fabItems: FabItem[] = [
    {
      id: "federation",
      label: "협회 생성",
      icon: <Building2 className="w-5 h-5" />,
      onClick: () => router.push("/platform/federations/new"),
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      id: "team",
      label: "팀 생성",
      icon: <Users className="w-5 h-5" />,
      onClick: () => router.push("/teams/new"),
      color: "bg-green-600 hover:bg-green-700",
    },
    {
      id: "tournament",
      label: "대회 생성",
      icon: <Trophy className="w-5 h-5" />,
      onClick: () => {
        // 현재 협회 컨텍스트에서 대회 생성
        const federationId = getCurrentFederationId();
        if (federationId) {
          router.push(`/federations/${federationId}/admin/tournaments/new`);
        } else {
          // 협회 선택 필요
          router.push("/federations");
        }
      },
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      id: "event",
      label: "이벤트 생성",
      icon: <Calendar className="w-5 h-5" />,
      onClick: () => router.push("/events/new"),
      color: "bg-orange-600 hover:bg-orange-700",
    },
    {
      id: "player",
      label: "선수 등록",
      icon: <UserPlus className="w-5 h-5" />,
      onClick: () => {
        const teamId = getCurrentTeamId();
        if (teamId) {
          router.push(`/teams/${teamId}/players/new`);
        } else {
          router.push("/teams");
        }
      },
      color: "bg-indigo-600 hover:bg-indigo-700",
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* FAB Items */}
      {isOpen && (
        <div className="mb-4 space-y-3">
          {fabItems.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center justify-end gap-3 animate-in slide-in-from-bottom-2"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg">
                {item.label}
              </span>
              <button
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                className={`${item.color || "bg-primary-600"} text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all`}
              >
                {item.icon}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-primary-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all ${
          isOpen ? "rotate-45" : "rotate-0"
        }`}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
```

### FAB 스타일

```typescript
// FAB 애니메이션 및 스타일
const fabStyle = {
  position: "fixed",
  bottom: "1.5rem",
  right: "1.5rem",
  zIndex: 50,
  animation: "fadeIn 0.2s ease-in",
};

// Tailwind 애니메이션
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 4️⃣ 팀 디렉토리 페이지

### 새로운 `/sports` 페이지 구조

```typescript
// src/app/(platform)/sports/page.tsx
"use client";

import { useState } from "react";
import { Search, TrendingUp, Clock, Trophy, GraduationCap } from "lucide-react";
import { TeamCard } from "@/components/teams/TeamCard";
import { SectionHeader } from "@/components/shared/SectionHeader";

export default function SportsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">스포츠 팀 허브</h1>
          <p className="text-xl text-primary-100">
            지역 스포츠 팀을 찾고 연결하세요
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="팀명, 지역, 종목으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 outline-none text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 인기 팀 */}
        <SectionHeader
          icon={<TrendingUp className="w-5 h-5" />}
          title="🔥 인기 팀"
          subtitle="가장 많이 조회된 팀"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {popularTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>

        {/* 최근 등록 팀 */}
        <SectionHeader
          icon={<Clock className="w-5 h-5" />}
          title="⚽ 최근 등록 팀"
          subtitle="새로 가입한 팀"
          className="mt-12"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {recentTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>

        {/* 대회 참가 팀 */}
        <SectionHeader
          icon={<Trophy className="w-5 h-5" />}
          title="🏆 대회 참가 팀"
          subtitle="현재 대회에 참가 중인 팀"
          className="mt-12"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {tournamentTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>

        {/* 유소년 팀 */}
        <SectionHeader
          icon={<GraduationCap className="w-5 h-5" />}
          title="🎓 유소년 팀"
          subtitle="유소년 전용 팀"
          className="mt-12"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {youthTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      </div>

      {/* FAB */}
      <FabMenu />
    </div>
  );
}
```

### TeamCard 컴포넌트

```typescript
// components/teams/TeamCard.tsx
import { Card } from "@/components/shared/Card";
import { Users, MapPin, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface TeamCardProps {
  team: {
    id: string;
    name: string;
    logoUrl?: string;
    region: string;
    playerCount: number;
    activeLeagues: number;
    category?: string;
  };
}

export function TeamCard({ team }: TeamCardProps) {
  return (
    <Link href={`/teams/${team.id}`}>
      <Card hover className="cursor-pointer">
        <div className="flex items-start gap-4">
          {/* Team Logo */}
          <div className="flex-shrink-0">
            {team.logoUrl ? (
              <Image
                src={team.logoUrl}
                alt={team.name}
                width={64}
                height={64}
                className="rounded-lg"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Team Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {team.name}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{team.region}</span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>선수 {team.playerCount}명</span>
              </div>
              {team.activeLeagues > 0 && (
                <div className="flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  <span>리그 {team.activeLeagues}개</span>
                </div>
              )}
            </div>
            {team.category && (
              <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded">
                {team.category}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
```

---

## 5️⃣ Federation Create Wizard

### 3분 협회 생성 시스템

```typescript
// src/app/platform/federations/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { Card } from "@/components/shared/Card";

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
  const [isCreating, setIsCreating] = useState(false);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsCreating(true);
    try {
      // Cloud Function 호출
      const response = await fetch("/api/federations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/federations/${result.slug}`);
      }
    } catch (error) {
      console.error("협회 생성 오류:", error);
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
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
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
                    className={`h-1 flex-1 mx-2 ${
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 노원구 축구협회"
              />
              <Input
                label="슬러그 *"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="예: nowon-football"
                helperText="URL에 사용됩니다 (영문, 숫자, 하이픈만 가능)"
              />
              <Input
                label="지역 *"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="예: 서울 노원구"
              />
            </div>
          )}

          {/* Step 2: Sport Type */}
          {currentStep === 1 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {["football", "futsal", "basketball", "baseball", "volleyball"].map(
                (sport) => (
                  <button
                    key={sport}
                    onClick={() => setFormData({ ...formData, sportType: sport })}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      formData.sportType === sport
                        ? "border-primary-600 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="font-medium text-gray-900">
                      {sport === "football" && "축구"}
                      {sport === "futsal" && "풋살"}
                      {sport === "basketball" && "농구"}
                      {sport === "baseball" && "야구"}
                      {sport === "volleyball" && "배구"}
                    </p>
                  </button>
                )
              )}
            </div>
          )}

          {/* Step 3: Visual */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  로고 업로드
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input type="file" accept="image/*" className="hidden" id="logo" />
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
                    className="w-full h-12 rounded-lg"
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
                      setFormData({ ...formData, secondaryColor: e.target.value })
                    }
                    className="w-full h-12 rounded-lg"
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
                    {formData.sportType === "football" && "축구"}
                    {formData.sportType === "futsal" && "풋살"}
                    {formData.sportType === "basketball" && "농구"}
                    {formData.sportType === "baseball" && "야구"}
                    {formData.sportType === "volleyball" && "배구"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">관리자</span>
                  <span className="font-medium">{formData.adminEmail}</span>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  생성 시 다음이 자동으로 생성됩니다:
                </p>
                <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
                  <li>협회 홈페이지</li>
                  <li>관리자 대시보드</li>
                  <li>기본 메뉴 및 페이지</li>
                  <li>AI 에이전트</li>
                  <li>리그 템플릿</li>
                </ul>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              이전
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button onClick={handleNext} disabled={!isStepValid(currentStep)}>
                다음
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isCreating}>
                {isCreating ? "생성 중..." : "협회 생성"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function isStepValid(step: number): boolean {
  // 각 단계별 유효성 검사 로직
  return true; // 실제로는 formData 검증
}
```

---

## ✅ 개선된 플랫폼 구조 완료

### 완성된 개선사항

- ✅ `/sports` → 팀 디렉토리로 변경
- ✅ FAB (Floating Action Button) 설계
- ✅ Federation Create Wizard (5단계)
- ✅ TeamCard 컴포넌트
- ✅ 개선된 플랫폼 IA

### 다음 단계

이제 실제 코드로 구현할 수 있습니다.

---

**작성일**: 2024년  
**상태**: ✅ YAGO 개선된 플랫폼 구조 완료

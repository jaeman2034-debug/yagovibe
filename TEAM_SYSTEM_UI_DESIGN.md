# 🛡️ 노원구 축구협회 팀 시스템 UI + 페이지 설계

> **팀 생성 → 팀 관리 → 선수 등록 → 팀 페이지 전체 설계**

---

## 📋 목차

1. [팀 시스템 전체 구조](#1-팀-시스템-전체-구조)
2. [팀 생성 플로우](#2-팀-생성-플로우)
3. [팀 관리 페이지](#3-팀-관리-페이지)
4. [팀 페이지 (Public)](#4-팀-페이지-public)
5. [선수 등록 시스템](#5-선수-등록-시스템)
6. [Firestore 구조](#6-firestore-구조)
7. [React 컴포넌트 구조](#7-react-컴포넌트-구조)
8. [실제 구현 코드](#8-실제-구현-코드)

---

## 1️⃣ 팀 시스템 전체 구조

### 팀 시스템 계층

```
팀 생성
  ↓
팀 관리 (팀장/관리자)
  ├─ 기본 정보 관리
  ├─ 멤버 관리
  ├─ 선수 등록
  ├─ 일정 관리
  └─ 설정
  ↓
팀 페이지 (Public)
  ├─ 팀 소개
  ├─ 멤버 목록
  ├─ 경기 기록
  ├─ 통계
  └─ 미디어
```

### URL 구조

```
/a/[associationSlug]/teams
  ├─ / (팀 목록)
  ├─ /register (팀 등록)
  ├─ /[teamId] (팀 상세 페이지)
  └─ /[teamId]/manage (팀 관리)
      ├─ /overview
      ├─ /members
      ├─ /players
      ├─ /schedule
      └─ /settings
```

---

## 2️⃣ 팀 생성 플로우

### 2-1. 팀 등록 페이지

**URL**: `/a/[associationSlug]/teams/register`

**단계별 폼**:

```
Step 1: 기본 정보
  - 팀명
  - 지역
  - 종목 (축구 고정)
  - 팀 소개

Step 2: 팀장 정보
  - 이름
  - 전화번호
  - 이메일

Step 3: 협회 가입 신청
  - 협회 가입 여부 선택
  - 가입 시 추가 정보

Step 4: 완료
  - 팀 생성 완료
  - 팀 관리 페이지로 이동
```

### 2-2. 팀 생성 컴포넌트

**파일**: `src/pages/teams/TeamRegisterPage.tsx`

```typescript
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createTeam } from "@/services/teamService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function TeamRegisterPage() {
  const { associationSlug } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    region: "서울시 노원구",
    description: "",
    captainName: "",
    captainPhone: "",
    captainEmail: "",
    requestMembership: false,
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const team = await createTeam({
        ...formData,
        associationId: "assoc-nowon-football",
      });
      
      toast.success("팀이 생성되었습니다!");
      navigate(`/a/${associationSlug}/teams/${team.id}/manage`);
    } catch (error: any) {
      toast.error(error.message || "팀 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-2xl px-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">팀 등록</h1>
          
          {/* Step Indicator */}
          <div className="mt-6 flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full ${
                  s <= step ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />
            ))}
          </div>

          {/* Step 1: 기본 정보 */}
          {step === 1 && (
            <div className="mt-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  팀명 *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="예: 노원FC"
                  className="mt-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  지역
                </label>
                <Input
                  value={formData.region}
                  disabled
                  className="mt-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  팀 소개
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="팀에 대해 간단히 소개해주세요"
                  className="mt-2"
                  rows={4}
                />
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!formData.name}
                className="w-full"
              >
                다음
              </Button>
            </div>
          )}

          {/* Step 2: 팀장 정보 */}
          {step === 2 && (
            <div className="mt-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  팀장 이름 *
                </label>
                <Input
                  value={formData.captainName}
                  onChange={(e) =>
                    setFormData({ ...formData, captainName: e.target.value })
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  전화번호 *
                </label>
                <Input
                  value={formData.captainPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, captainPhone: e.target.value })
                  }
                  placeholder="010-1234-5678"
                  className="mt-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  이메일
                </label>
                <Input
                  type="email"
                  value={formData.captainEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, captainEmail: e.target.value })
                  }
                  className="mt-2"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  이전
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!formData.captainName || !formData.captainPhone}
                  className="flex-1"
                >
                  다음
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: 협회 가입 신청 */}
          {step === 3 && (
            <div className="mt-8 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.requestMembership}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requestMembership: e.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />
                  <div>
                    <div className="font-medium text-slate-900">
                      노원구 축구협회 가입 신청
                    </div>
                    <div className="text-sm text-slate-600">
                      협회 가입 시 우선 대관, 대회 참가 등의 혜택을 받을 수 있습니다.
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  이전
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? "생성 중..." : "팀 생성하기"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 3️⃣ 팀 관리 페이지

### 3-1. 팀 관리 대시보드

**URL**: `/a/[associationSlug]/teams/[teamId]/manage`

**탭 구조**:

```
Overview (개요)
  ├─ 팀 정보
  ├─ 통계 카드
  └─ 최근 활동

Members (멤버 관리)
  ├─ 멤버 목록
  ├─ 멤버 초대
  └─ 권한 관리

Players (선수 등록)
  ├─ 선수 목록
  ├─ 선수 등록
  └─ 선수 정보 수정

Schedule (일정 관리)
  ├─ 경기 일정
  └─ 훈련 일정

Settings (설정)
  ├─ 기본 정보 수정
  ├─ 팀 로고 변경
  └─ 팀 삭제
```

### 3-2. 팀 관리 페이지 컴포넌트

**파일**: `src/pages/teams/TeamManagePage.tsx`

```typescript
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getTeam } from "@/services/teamService";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TeamOverviewTab } from "@/components/teams/TeamOverviewTab";
import { TeamMembersTab } from "@/components/teams/TeamMembersTab";
import { TeamPlayersTab } from "@/components/teams/TeamPlayersTab";
import { TeamScheduleTab } from "@/components/teams/TeamScheduleTab";
import { TeamSettingsTab } from "@/components/teams/TeamSettingsTab";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { useAuth } from "@/context/AuthProvider";
import { useTeamPermission } from "@/hooks/useTeamPermission";

export default function TeamManagePage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const { canManage, loading: permissionLoading } = useTeamPermission(teamId, user?.uid);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: team, isLoading, error } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => getTeam(teamId!),
    enabled: !!teamId,
  });

  if (isLoading || permissionLoading) {
    return <LoadingState />;
  }

  if (error || !team) {
    return <ErrorState message="팀 정보를 불러오는데 실패했습니다." />;
  }

  if (!canManage) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">팀 관리 권한이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{team.name} 관리</h1>
          <p className="mt-1 text-sm text-slate-600">팀 정보 및 멤버를 관리하세요</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="members">멤버</TabsTrigger>
            <TabsTrigger value="players">선수</TabsTrigger>
            <TabsTrigger value="schedule">일정</TabsTrigger>
            <TabsTrigger value="settings">설정</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview">
              <TeamOverviewTab teamId={teamId!} />
            </TabsContent>

            <TabsContent value="members">
              <TeamMembersTab teamId={teamId!} />
            </TabsContent>

            <TabsContent value="players">
              <TeamPlayersTab teamId={teamId!} />
            </TabsContent>

            <TabsContent value="schedule">
              <TeamScheduleTab teamId={teamId!} />
            </TabsContent>

            <TabsContent value="settings">
              <TeamSettingsTab teamId={teamId!} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
```

---

## 4️⃣ 팀 페이지 (Public)

### 4-1. 팀 상세 페이지

**URL**: `/a/[associationSlug]/teams/[teamId]`

**탭 구조**:

```
Overview (개요)
  ├─ 팀 소개
  ├─ 팀 통계
  └─ 최근 활동

Members (멤버)
  ├─ 멤버 목록
  └─ 선수 목록

Matches (경기)
  ├─ 경기 일정
  ├─ 경기 기록
  └─ 통계

Media (미디어)
  ├─ 사진
  └─ 영상
```

### 4-2. 팀 페이지 컴포넌트

**파일**: `src/pages/teams/TeamPage.tsx`

```typescript
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getTeam } from "@/services/teamService";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TeamHeader } from "@/components/teams/TeamHeader";
import { TeamOverviewTab } from "@/components/teams/TeamOverviewTab";
import { TeamMembersTab } from "@/components/teams/TeamMembersTab";
import { TeamMatchesTab } from "@/components/teams/TeamMatchesTab";
import { TeamMediaTab } from "@/components/teams/TeamMediaTab";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";

export default function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: team, isLoading, error } = useQuery({
    queryKey: ["team", teamId, "public"],
    queryFn: () => getTeam(teamId!),
    enabled: !!teamId,
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !team) {
    return <ErrorState message="팀 정보를 불러오는데 실패했습니다." />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Team Header */}
      <TeamHeader team={team} />

      {/* Tabs */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="members">멤버</TabsTrigger>
            <TabsTrigger value="matches">경기</TabsTrigger>
            <TabsTrigger value="media">미디어</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview">
              <TeamOverviewTab teamId={teamId!} />
            </TabsContent>

            <TabsContent value="members">
              <TeamMembersTab teamId={teamId!} />
            </TabsContent>

            <TabsContent value="matches">
              <TeamMatchesTab teamId={teamId!} />
            </TabsContent>

            <TabsContent value="media">
              <TeamMediaTab teamId={teamId!} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
```

---

## 5️⃣ 선수 등록 시스템

### 5-1. 선수 등록 폼

**컴포넌트**: `src/components/teams/PlayerRegisterForm.tsx`

```typescript
import { useState } from "react";
import { useForm } from "react-hook-form";
import { addPlayer } from "@/services/playerService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";

interface PlayerFormData {
  name: string;
  birthDate: string;
  position: string;
  jerseyNumber?: number;
  phone?: string;
  email?: string;
}

export function PlayerRegisterForm({ teamId }: { teamId: string }) {
  const { register, handleSubmit, formState: { errors } } = useForm<PlayerFormData>();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: PlayerFormData) => {
    setLoading(true);
    try {
      await addPlayer(teamId, data);
      toast.success("선수가 등록되었습니다!");
      // 폼 리셋 또는 모달 닫기
    } catch (error: any) {
      toast.error(error.message || "선수 등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">
          이름 *
        </label>
        <Input
          {...register("name", { required: "이름을 입력해주세요" })}
          className="mt-2"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          생년월일 *
        </label>
        <Input
          type="date"
          {...register("birthDate", { required: "생년월일을 입력해주세요" })}
          className="mt-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          포지션
        </label>
        <Select {...register("position")} className="mt-2">
          <option value="">선택</option>
          <option value="GK">GK</option>
          <option value="DF">DF</option>
          <option value="MF">MF</option>
          <option value="FW">FW</option>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          등번호
        </label>
        <Input
          type="number"
          {...register("jerseyNumber", { valueAsNumber: true })}
          className="mt-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          전화번호
        </label>
        <Input
          {...register("phone")}
          placeholder="010-1234-5678"
          className="mt-2"
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "등록 중..." : "선수 등록"}
      </Button>
    </form>
  );
}
```

---

## 6️⃣ Firestore 구조

### 팀 컬렉션

```
teams/{teamId}
  - name: string
  - region: string
  - description?: string
  - logoUrl?: string
  - ownerUid: string
  - associationId?: string
  - membership: "non-member" | "pending" | "member"
  - status: "active" | "inactive"
  - createdAt: Timestamp
  - updatedAt: Timestamp

teams/{teamId}/members/{uid}
  - uid: string
  - role: "owner" | "admin" | "member"
  - status: "active" | "inactive"
  - joinedAt: Timestamp

teams/{teamId}/players/{playerId}
  - name: string
  - birthDate: Timestamp
  - position?: string
  - jerseyNumber?: number
  - phone?: string
  - email?: string
  - status: "active" | "inactive"
  - registeredAt: Timestamp
```

---

## 7️⃣ React 컴포넌트 구조

```
components/teams/
├─ TeamHeader.tsx
├─ TeamCard.tsx
├─ TeamList.tsx
├─ TeamRegisterForm.tsx
├─ TeamOverviewTab.tsx
├─ TeamMembersTab.tsx
├─ TeamPlayersTab.tsx
├─ TeamMatchesTab.tsx
├─ TeamMediaTab.tsx
├─ TeamSettingsTab.tsx
├─ PlayerRegisterForm.tsx
├─ PlayerCard.tsx
└─ MemberCard.tsx
```

---

## 8️⃣ 실제 구현 코드

### 팀 서비스

**파일**: `src/services/teamService.ts`

```typescript
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  query,
  where,
  serverTimestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export async function createTeam(data: {
  name: string;
  region: string;
  description?: string;
  captainName: string;
  captainPhone: string;
  captainEmail?: string;
  associationId?: string;
  requestMembership?: boolean;
}) {
  const createTeamFn = httpsCallable(functions, "createTeam");
  
  const result = await createTeamFn({
    name: data.name,
    region: data.region,
    description: data.description,
    captainName: data.captainName,
    captainPhone: data.captainPhone,
    captainEmail: data.captainEmail,
    associationId: data.associationId,
    requestMembership: data.requestMembership || false,
  });

  return result.data as { teamId: string };
}

export async function getTeam(teamId: string) {
  const docRef = doc(db, "teams", teamId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error("Team not found");
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  };
}

export async function getTeamsByAssociation(associationId: string) {
  const q = query(
    collection(db, "teams"),
    where("associationId", "==", associationId),
    where("status", "==", "active")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}
```

---

## ✅ 구현 체크리스트

### Phase 1: 팀 생성
- [ ] `TeamRegisterPage` 구현
- [ ] `createTeam` Cloud Function 연동
- [ ] 팀 생성 후 관리 페이지 이동

### Phase 2: 팀 관리
- [ ] `TeamManagePage` 구현
- [ ] 탭별 컴포넌트 구현
- [ ] 권한 체크 로직

### Phase 3: 팀 페이지
- [ ] `TeamPage` (Public) 구현
- [ ] 팀 헤더 컴포넌트
- [ ] 탭별 콘텐츠

### Phase 4: 선수 등록
- [ ] `PlayerRegisterForm` 구현
- [ ] 선수 목록 표시
- [ ] 선수 정보 수정

---

**작성일**: 2024년  
**상태**: ✅ 설계 완료 (개발 시작 가능)

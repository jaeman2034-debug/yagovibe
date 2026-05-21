# ⚽ YAGO Team Join System - 완전한 설계

> **작성일**: 2024년  
> **목적**: 팀 등록 신청 → 협회 승인 → 리그 참가 시스템

---

## 📋 목차

1. [제품 정의](#1-제품-정의)
2. [전체 흐름](#2-전체-흐름)
3. [팀 등록 신청](#3-팀-등록-신청)
4. [협회 승인 시스템](#4-협회-승인-시스템)
5. [리그 참가](#5-리그-참가)
6. [React 구현](#6-react-구현)

---

## 1️⃣ 제품 정의

### 한 줄 정의

```
팀 등록 신청 → 협회 승인 → 리그 참가 시스템
```

### 핵심 기능

```
✓ 팀 등록 신청
✓ 협회 승인/거절
✓ 리그 참가 신청
✓ 승인 대기 상태 관리
✓ 알림 시스템
```

### 시스템 흐름

```
팀 등록 신청
  ↓
협회 승인 대기
  ↓
협회 승인
  ↓
리그 참가 신청
  ↓
리그 참가 완료
```

---

## 2️⃣ 전체 흐름

### 사용자 여정

#### 1. 팀 등록 신청

```
팀장 → FAB → "팀 생성"
  ↓
팀 생성 폼 작성
  ↓
협회 선택 (노원구 축구협회)
  ↓
팀 등록 신청 제출
```

#### 2. 협회 승인 대기

```
팀 상태: "pending"
협회 관리자 대시보드에 표시
```

#### 3. 협회 승인

```
협회 관리자 → 승인 요청 페이지
  ↓
팀 정보 확인
  ↓
승인 버튼 클릭
  ↓
팀 상태: "active"
```

#### 4. 리그 참가

```
팀장 → 리그 목록
  ↓
리그 선택
  ↓
참가 신청
  ↓
협회 승인
  ↓
리그 참가 완료
```

---

## 3️⃣ 팀 등록 신청

### 팀 생성 폼

```typescript
// src/pages/sports/teams/create/page.tsx
"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/shared/Input";
import { Select } from "@/components/shared/Select";
import { Textarea } from "@/components/shared/Textarea";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import Header from "@/layout/Header";

export default function TeamCreatePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    region: "",
    sportType: "football",
    description: "",
    federationId: "", // 협회 선택
  });

  const [federations, setFederations] = useState<any[]>([]);

  useEffect(() => {
    // 협회 목록 조회
    const loadFederations = async () => {
      const response = await fetch("/api/federations");
      const data = await response.json();
      setFederations(data);
    };
    loadFederations();
  }, []);

  const handleSubmit = async () => {
    const response = await fetch("/api/teams/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        status: "pending", // 승인 대기
      }),
    });

    const result = await response.json();
    if (result.success) {
      navigate(`/teams/${result.teamId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">팀 생성</h1>
        
        <Card>
          <div className="space-y-4">
            <Input
              label="팀명 *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="예: 노원FC"
            />

            <Select
              label="협회 선택 *"
              options={federations.map((fed) => ({
                value: fed.id,
                label: fed.name,
              }))}
              value={formData.federationId}
              onChange={(value) =>
                setFormData({ ...formData, federationId: value })
              }
              placeholder="협회를 선택하세요"
            />

            <Input
              label="지역 *"
              value={formData.region}
              onChange={(e) =>
                setFormData({ ...formData, region: e.target.value })
              }
              placeholder="예: 서울 노원구"
            />

            <Textarea
              label="팀 소개"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
            />

            <Button onClick={handleSubmit} className="w-full">
              팀 등록 신청
            </Button>

            <p className="text-sm text-gray-500 text-center">
              등록 후 협회 관리자의 승인이 필요합니다.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
```

---

## 4️⃣ 협회 승인 시스템

### 승인 요청 페이지

```typescript
// src/pages/federations/[slug]/admin/approvals/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/shared/Card";
import { Button } from "@/components/shared/Button";
import { CheckCircle, XCircle, Users, MapPin } from "lucide-react";

interface ApprovalRequest {
  id: string;
  type: "team" | "player" | "league";
  title: string;
  description: string;
  data: any;
  createdAt: Date;
}

export default function ApprovalsPage() {
  const params = useParams();
  const federationSlug = params.federationId as string;

  const [requests, setRequests] = useState<ApprovalRequest[]>([]);

  useEffect(() => {
    // 승인 대기 요청 조회
    const loadRequests = async () => {
      const response = await fetch(
        `/api/federations/${federationSlug}/approvals/pending`
      );
      const data = await response.json();
      setRequests(data);
    };
    loadRequests();
  }, [federationSlug]);

  const handleApprove = async (requestId: string) => {
    const response = await fetch(
      `/api/federations/${federationSlug}/approvals/${requestId}/approve`,
      { method: "POST" }
    );
    if (response.ok) {
      setRequests(requests.filter((r) => r.id !== requestId));
    }
  };

  const handleReject = async (requestId: string) => {
    const response = await fetch(
      `/api/federations/${federationSlug}/approvals/${requestId}/reject`,
      { method: "POST" }
    );
    if (response.ok) {
      setRequests(requests.filter((r) => r.id !== requestId));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">승인 요청</h1>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-500">
              승인 대기 중인 요청이 없습니다.
            </div>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      {request.type === "team" && "팀 등록"}
                      {request.type === "player" && "선수 등록"}
                      {request.type === "league" && "리그 참가"}
                    </span>
                    <h3 className="font-semibold text-gray-900">
                      {request.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {request.description}
                  </p>
                  {request.type === "team" && (
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{request.data.region}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>선수 {request.data.playerCount || 0}명</span>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    승인
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(request.id)}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    거절
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
```

---

## 5️⃣ 리그 참가

### 리그 참가 신청

```typescript
// src/pages/federations/[slug]/leagues/[leagueId]/join/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/shared/Card";
import { Button } from "@/components/shared/Button";
import { Trophy, Users, Calendar } from "lucide-react";

export default function LeagueJoinPage() {
  const params = useParams();
  const navigate = useNavigate();
  const federationSlug = params.federationId as string;
  const leagueId = params.leagueId as string;

  const [league, setLeague] = useState<any>(null);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");

  useEffect(() => {
    // 리그 정보 조회
    const loadLeague = async () => {
      const response = await fetch(
        `/api/federations/${federationSlug}/leagues/${leagueId}`
      );
      const data = await response.json();
      setLeague(data);
    };
    loadLeague();

    // 내 팀 목록 조회
    const loadMyTeams = async () => {
      const response = await fetch("/api/teams/my");
      const data = await response.json();
      setMyTeams(data.filter((team: any) => team.status === "active"));
    };
    loadMyTeams();
  }, [federationSlug, leagueId]);

  const handleJoin = async () => {
    if (!selectedTeam) return;

    const response = await fetch(
      `/api/federations/${federationSlug}/leagues/${leagueId}/join`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: selectedTeam }),
      }
    );

    const result = await response.json();
    if (result.success) {
      navigate(`/federations/${federationSlug}/leagues/${leagueId}`);
    }
  };

  if (!league) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Card>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">{league.name}</h1>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>참가 팀: {league.teamCount || 0}팀</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(league.startDate).toLocaleDateString()} ~{" "}
                {new Date(league.endDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              참가할 팀 선택 *
            </label>
            {myTeams.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                참가 가능한 팀이 없습니다.
                <br />
                <Button
                  variant="link"
                  onClick={() => navigate("/sports/teams/create")}
                  className="mt-2"
                >
                  팀 생성하기
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {myTeams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team.id)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                      selectedTeam === team.id
                        ? "border-primary-600 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium text-gray-900">{team.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {team.region}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedTeam && (
            <Button onClick={handleJoin} className="w-full" size="lg">
              리그 참가 신청
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
```

---

## 6️⃣ React 구현

### 승인 대기 위젯 (Dashboard)

```typescript
// src/components/admin/PendingApprovalsWidget.tsx
import { Card } from "@/components/shared/Card";
import { Button } from "@/components/shared/Button";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function PendingApprovalsWidget({
  pendingCount,
  federationSlug,
}: {
  pendingCount: number;
  federationSlug: string;
}) {
  const navigate = useNavigate();

  if (pendingCount === 0) {
    return null;
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-600" />
          <div>
            <p className="font-semibold text-gray-900">
              승인 대기 요청 {pendingCount}건
            </p>
            <p className="text-sm text-gray-600">
              팀 등록 및 리그 참가 승인이 필요합니다.
            </p>
          </div>
        </div>
        <Button
          onClick={() =>
            navigate(`/federations/${federationSlug}/admin/approvals`)
          }
        >
          승인하기
        </Button>
      </div>
    </Card>
  );
}
```

---

## ✅ Team Join System 완료

### 완성된 내용

- ✅ 팀 등록 신청 시스템
- ✅ 협회 승인 시스템
- ✅ 리그 참가 신청
- ✅ 승인 대기 상태 관리
- ✅ React 구현 코드

### 시스템 완성도

이제 YAGO는:

```
Sports Social Platform
+
League Operating System
+
Federation Platform
+
Team Join System
```

---

**작성일**: 2024년  
**상태**: ✅ YAGO Team Join System 완전한 설계 완료

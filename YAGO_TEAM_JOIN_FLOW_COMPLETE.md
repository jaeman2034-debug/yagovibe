# ⚽ YAGO Team Join Flow - 완전한 실무 설계

> **작성일**: 2024년  
> **목적**: 팀 → 협회 → 리그 연결 시스템 - 실제 리그 운영 플랫폼

---

## 📋 목차

1. [제품 정의](#1-제품-정의)
2. [전체 흐름](#2-전체-흐름)
3. [팀 페이지에서 참가 신청](#3-팀-페이지에서-참가-신청)
4. [리그 참가 신청 화면](#4-리그-참가-신청-화면)
5. [협회 관리자 승인](#5-협회-관리자-승인)
6. [자동 처리 로직](#6-자동-처리-로직)
7. [React 구현](#7-react-구현)

---

## 1️⃣ 제품 정의

### 한 줄 정의

```
팀이 협회 리그 참가 신청 → 협회 승인 → 자동 리그 등록
```

### 핵심 흐름

```
팀 생성
  ↓
협회 리그 참가 신청
  ↓
협회 관리자 승인
  ↓
리그 팀 등록
  ↓
League Engine 일정 생성
```

---

## 2️⃣ 전체 흐름

### 사용자 여정

#### 1. 팀 페이지에서 시작

```
/sports/teams/{teamSlug}
  ↓
[리그 참가 신청] 버튼 클릭
  ↓
리그 선택 화면
```

#### 2. 리그 선택

```
협회별 리그 목록 표시
  ↓
리그 선택
  ↓
참가 신청 폼
```

#### 3. 참가 신청

```
팀 정보 확인
대표자 정보 입력
  ↓
참가 신청 제출
  ↓
승인 대기 상태
```

#### 4. 협회 승인

```
협회 관리자 대시보드
  ↓
승인 요청 확인
  ↓
승인/거절
  ↓
자동 리그 등록
```

---

## 3️⃣ 팀 페이지에서 참가 신청

### 팀 페이지에 버튼 추가

```typescript
// src/pages/sports/teams/[slug]/page.tsx
"use client";

import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/shared/Button";
import { Trophy } from "lucide-react";

export default function TeamPage() {
  const params = useParams();
  const navigate = useNavigate();
  const teamSlug = params.slug as string;

  const [team, setTeam] = useState<any>(null);
  const [participatingLeagues, setParticipatingLeagues] = useState<any[]>([]);

  return (
    <div>
      {/* Team Info */}
      <TeamHero team={team} />

      {/* Participating Leagues */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">참가 리그</h2>
          <Button
            onClick={() => navigate(`/sports/teams/${teamSlug}/leagues/join`)}
          >
            <Trophy className="w-4 h-4 mr-2" />
            리그 참가 신청
          </Button>
        </div>
        <div className="space-y-3">
          {participatingLeagues.map((league) => (
            <div
              key={league.id}
              className="p-4 border border-gray-200 rounded-lg"
            >
              <h3 className="font-semibold text-gray-900">{league.name}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {league.federationName}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
```

---

## 4️⃣ 리그 참가 신청 화면

### 리그 선택 페이지

```typescript
// src/pages/sports/teams/[slug]/leagues/join/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/shared/Card";
import { Button } from "@/components/shared/Button";
import { Trophy, Calendar, Users } from "lucide-react";
import Header from "@/layout/Header";

export default function LeagueJoinPage() {
  const params = useParams();
  const navigate = useNavigate();
  const teamSlug = params.slug as string;

  const [leagues, setLeagues] = useState<any[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>("");

  useEffect(() => {
    // 참가 가능한 리그 목록 조회
    const loadLeagues = async () => {
      const response = await fetch("/api/leagues/available");
      const data = await response.json();
      setLeagues(data);
    };
    loadLeagues();
  }, []);

  const handleSelectLeague = (leagueId: string) => {
    setSelectedLeague(leagueId);
  };

  const handleNext = () => {
    if (selectedLeague) {
      navigate(`/sports/teams/${teamSlug}/leagues/${selectedLeague}/join/form`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">리그 참가 신청</h1>
        
        <Card>
          <h2 className="text-lg font-semibold mb-4">참가 가능한 리그</h2>
          <div className="space-y-3">
            {leagues.map((league) => (
              <button
                key={league.id}
                onClick={() => handleSelectLeague(league.id)}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                  selectedLeague === league.id
                    ? "border-primary-600 bg-primary-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-5 h-5 text-primary-600" />
                      <h3 className="font-semibold text-gray-900">
                        {league.name}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {league.federationName}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>참가 팀: {league.teamCount}팀</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(league.startDate).toLocaleDateString()} ~{" "}
                          {new Date(league.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {selectedLeague && (
            <div className="mt-6">
              <Button onClick={handleNext} className="w-full" size="lg">
                다음 단계
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
```

### 참가 신청 폼

```typescript
// src/pages/sports/teams/[slug]/leagues/[leagueId]/join/form/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/shared/Card";
import { Input } from "@/components/shared/Input";
import { Button } from "@/components/shared/Button";
import { CheckCircle } from "lucide-react";
import Header from "@/layout/Header";

export default function LeagueJoinFormPage() {
  const params = useParams();
  const navigate = useNavigate();
  const teamSlug = params.slug as string;
  const leagueId = params.leagueId as string;

  const [league, setLeague] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [formData, setFormData] = useState({
    managerName: "",
    phone: "",
    playerListConfirmed: false,
  });

  useEffect(() => {
    // 리그 정보 조회
    const loadLeague = async () => {
      const response = await fetch(`/api/leagues/${leagueId}`);
      const data = await response.json();
      setLeague(data);
    };
    loadLeague();

    // 팀 정보 조회
    const loadTeam = async () => {
      const response = await fetch(`/api/teams/${teamSlug}`);
      const data = await response.json();
      setTeam(data);
    };
    loadTeam();
  }, [leagueId, teamSlug]);

  const handleSubmit = async () => {
    const response = await fetch(`/api/leagues/${leagueId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId: team.id,
        managerName: formData.managerName,
        phone: formData.phone,
        playerListConfirmed: formData.playerListConfirmed,
      }),
    });

    const result = await response.json();
    if (result.success) {
      navigate(`/sports/teams/${teamSlug}?joined=true`);
    }
  };

  if (!league || !team) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">{league.name} 참가 신청</h1>
        <p className="text-gray-600 mb-6">{league.federationName}</p>
        
        <Card>
          <div className="space-y-6">
            {/* 팀 정보 확인 */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">팀 정보</h3>
              <p className="text-gray-700">{team.name}</p>
              <p className="text-sm text-gray-600 mt-1">
                선수 {team.playerCount}명 · {team.region}
              </p>
            </div>

            {/* 대표자 정보 */}
            <Input
              label="대표자 이름 *"
              value={formData.managerName}
              onChange={(e) =>
                setFormData({ ...formData, managerName: e.target.value })
              }
              placeholder="홍길동"
            />

            <Input
              label="연락처 *"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="010-1234-5678"
            />

            {/* 선수 명단 확인 */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="playerListConfirmed"
                checked={formData.playerListConfirmed}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    playerListConfirmed: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <label
                htmlFor="playerListConfirmed"
                className="text-sm text-gray-700"
              >
                선수 명단이 정확함을 확인했습니다.
              </label>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={
                !formData.managerName ||
                !formData.phone ||
                !formData.playerListConfirmed
              }
              className="w-full"
              size="lg"
            >
              참가 신청하기
            </Button>

            <p className="text-sm text-gray-500 text-center">
              신청 후 협회 관리자의 승인이 필요합니다.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
```

---

## 5️⃣ 협회 관리자 승인

### 승인 요청 페이지

```typescript
// src/pages/federations/[slug]/admin/approvals/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/shared/Card";
import { Button } from "@/components/shared/Button";
import { CheckCircle, XCircle, Trophy, Users, Phone } from "lucide-react";

interface JoinRequest {
  id: string;
  type: "league_join";
  leagueId: string;
  leagueName: string;
  teamId: string;
  teamName: string;
  managerName: string;
  phone: string;
  playerCount: number;
  createdAt: Date;
}

export default function ApprovalsPage() {
  const params = useParams();
  const federationSlug = params.federationId as string;

  const [requests, setRequests] = useState<JoinRequest[]>([]);

  useEffect(() => {
    const loadRequests = async () => {
      const response = await fetch(
        `/api/federations/${federationSlug}/approvals/pending`
      );
      const data = await response.json();
      setRequests(data.filter((r: any) => r.type === "league_join"));
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
      // 알림 표시
      alert("승인되었습니다.");
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt("거절 사유를 입력하세요:");
    if (!reason) return;

    const response = await fetch(
      `/api/federations/${federationSlug}/approvals/${requestId}/reject`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }
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
                      리그 참가
                    </span>
                    <h3 className="font-semibold text-gray-900">
                      {request.teamName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {request.leagueName}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>대표자:</span>
                      <span className="font-medium">{request.managerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{request.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>선수 {request.playerCount}명</span>
                    </div>
                  </div>
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

## 6️⃣ 자동 처리 로직

### 승인 시 자동 처리

```typescript
// src/lib/services/leagueJoinService.ts
import { db } from "@/lib/firebase/firebaseClient";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";

export async function approveLeagueJoin(
  federationId: string,
  requestId: string
) {
  // 1. 요청 상태 업데이트
  const requestRef = doc(
    db,
    `federations/${federationId}/leagueJoinRequests`,
    requestId
  );
  await setDoc(
    requestRef,
    { status: "approved", approvedAt: new Date() },
    { merge: true }
  );

  // 2. 리그 팀 등록
  const request = await getDoc(requestRef);
  const requestData = request.data();
  
  const leagueTeamRef = collection(
    db,
    `federations/${federationId}/leagues/${requestData.leagueId}/teams`
  );
  await addDoc(leagueTeamRef, {
    teamId: requestData.teamId,
    teamName: requestData.teamName,
    joinedAt: new Date(),
    status: "active",
  });

  // 3. 리그 팀 수 업데이트
  const leagueRef = doc(
    db,
    `federations/${federationId}/leagues`,
    requestData.leagueId
  );
  const league = await getDoc(leagueRef);
  const currentTeamCount = league.data()?.teamCount || 0;
  await setDoc(
    leagueRef,
    { teamCount: currentTeamCount + 1 },
    { merge: true }
  );

  // 4. 리그 시작 조건 확인 (8팀 이상이면 자동 일정 생성)
  if (currentTeamCount + 1 >= 8) {
    await generateLeagueSchedule(federationId, requestData.leagueId);
  }

  // 5. 팀에 알림 발송
  await sendNotification(requestData.teamId, {
    type: "league_join_approved",
    title: "리그 참가가 승인되었습니다",
    message: `${requestData.leagueName} 참가가 승인되었습니다.`,
  });
}
```

---

## 7️⃣ React 구현

### 리그 참가 팀 목록

```typescript
// src/components/leagues/ParticipatingTeams.tsx
import { Card } from "@/components/shared/Card";
import { TeamCard } from "@/components/teams/TeamCard";
import { Users } from "lucide-react";

export function ParticipatingTeams({ teams }: { teams: any[] }) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary-600" />
        <h2 className="text-xl font-semibold text-gray-900">참가 팀</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </Card>
  );
}
```

---

## ✅ Team Join Flow 완료

### 완성된 내용

- ✅ 팀 페이지에서 참가 신청 버튼
- ✅ 리그 선택 화면
- ✅ 참가 신청 폼
- ✅ 협회 관리자 승인 화면
- ✅ 자동 처리 로직 (리그 등록, 일정 생성)
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
Team Join Flow
```

---

**작성일**: 2024년  
**상태**: ✅ YAGO Team Join Flow 완전한 실무 설계 완료

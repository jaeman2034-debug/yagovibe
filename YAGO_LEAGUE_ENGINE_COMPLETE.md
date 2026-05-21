# ⚽ YAGO League Engine - 완전한 설계

> **작성일**: 2024년  
> **목적**: 리그 생성 → 자동 경기 일정 생성 → 순위 자동 계산 시스템

---

## 📋 목차

1. [제품 정의](#1-제품-정의)
2. [전체 시스템 구조](#2-전체-시스템-구조)
3. [리그 생성](#3-리그-생성)
4. [자동 경기 일정 생성](#4-자동-경기-일정-생성)
5. [순위 자동 계산](#5-순위-자동-계산)
6. [Round Robin 알고리즘](#6-round-robin-알고리즘)
7. [React 구현](#7-react-구현)

---

## 1️⃣ 제품 정의

### 한 줄 정의

```
리그 생성 → 자동 경기 일정 생성 → 순위 자동 계산 시스템
```

### 핵심 기능

```
✓ 리그 생성
✓ 팀 등록
✓ 자동 경기 일정 생성 (Round Robin)
✓ 경기 결과 입력
✓ 순위 자동 계산
✓ 다음 라운드 자동 생성
```

### 시스템 흐름

```
리그 생성
  ↓
팀 등록 (8팀)
  ↓
자동 경기 일정 생성 (28경기)
  ↓
경기 결과 입력
  ↓
순위 자동 계산
  ↓
다음 라운드 자동 생성
```

---

## 2️⃣ 전체 시스템 구조

### 시스템 레이어

```
League Engine
 ├─ League Creator (리그 생성)
 ├─ Team Registration (팀 등록)
 ├─ Schedule Generator (일정 생성)
 ├─ Match Manager (경기 관리)
 ├─ Result Processor (결과 처리)
 └─ Standings Calculator (순위 계산)
```

### 데이터 흐름

```
League
  ↓
Teams (8팀)
  ↓
Schedule Generator
  ↓
Matches (28경기)
  ↓
Results
  ↓
Standings (자동 계산)
```

---

## 3️⃣ 리그 생성

### 리그 생성 폼

```typescript
// src/pages/federations/[slug]/admin/leagues/new/page.tsx
"use client";

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/shared/Input";
import { Select } from "@/components/shared/Select";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";

export default function LeagueCreatePage() {
  const params = useParams();
  const navigate = useNavigate();
  const federationSlug = params.federationId as string;

  const [formData, setFormData] = useState({
    name: "",
    category: "adult",
    ageGroup: "adult",
    gender: "male",
    teamLimit: 8,
    startDate: "",
    endDate: "",
  });

  const handleSubmit = async () => {
    // 리그 생성 API 호출
    const response = await fetch(`/api/federations/${federationSlug}/leagues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const result = await response.json();
    if (result.success) {
      navigate(`/federations/${federationSlug}/admin/leagues/${result.leagueId}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">리그 생성</h1>
      
      <Card>
        <div className="space-y-4">
          <Input
            label="리그명 *"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="예: 노원구 K7 리그"
          />

          <Select
            label="카테고리 *"
            options={[
              { value: "adult", label: "성인" },
              { value: "youth", label: "유소년" },
            ]}
            value={formData.category}
            onChange={(value) =>
              setFormData({ ...formData, category: value })
            }
          />

          <Input
            label="팀 수 제한 *"
            type="number"
            value={formData.teamLimit}
            onChange={(e) =>
              setFormData({ ...formData, teamLimit: parseInt(e.target.value) })
            }
            min={4}
            max={16}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="시작일 *"
              type="date"
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
            />
            <Input
              label="종료일 *"
              type="date"
              value={formData.endDate}
              onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
              }
            />
          </div>

          <Button onClick={handleSubmit} className="w-full">
            리그 생성하기
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

---

## 4️⃣ 자동 경기 일정 생성

### Schedule Generator

```typescript
// src/lib/services/scheduleGenerator.ts
import { Match } from "@/types/match";

/**
 * Round Robin 알고리즘으로 경기 일정 생성
 */
export function generateRoundRobinSchedule(
  teams: string[],
  options: {
    homeAndAway?: boolean; // 홈앤어웨이 여부
    startDate: Date;
    matchDuration: number; // 경기 시간 (분)
    minRestTime: number; // 팀 휴식 시간 (분)
    venues: string[];
    availableTimes: string[]; // 예: ["09:00", "10:30", "14:00"]
  }
): Match[] {
  const matches: Match[] = [];
  const n = teams.length;
  const isOdd = n % 2 === 1;
  const workingTeams = isOdd ? [...teams, "BYE"] : teams;
  const totalRounds = isOdd ? n : n - 1;
  const matchesPerRound = Math.floor(workingTeams.length / 2);

  let currentDate = new Date(options.startDate);
  let matchIndex = 0;

  // 각 라운드 생성
  for (let round = 1; round <= totalRounds; round++) {
    // 라운드 내 경기 생성
    for (let i = 0; i < matchesPerRound; i++) {
      const home = workingTeams[i];
      const away = workingTeams[workingTeams.length - 1 - i];

      // BYE 팀 제외
      if (home !== "BYE" && away !== "BYE") {
        // 날짜 및 시간 배정
        const matchDate = new Date(currentDate);
        const timeIndex = matchIndex % options.availableTimes.length;
        const matchTime = options.availableTimes[timeIndex];
        const venueIndex = matchIndex % options.venues.length;
        const venue = options.venues[venueIndex];

        matches.push({
          id: `match-${matches.length + 1}`,
          round,
          homeTeamId: home,
          awayTeamId: away,
          matchDate,
          matchTime,
          venueId: venue,
          status: "scheduled",
        } as Match);

        matchIndex++;
      }
    }

    // 다음 라운드를 위한 팀 순환
    const last = workingTeams.pop()!;
    workingTeams.splice(1, 0, last);

    // 날짜 업데이트 (하루 최대 경기 수 고려)
    if (matchIndex % (options.availableTimes.length * options.venues.length) === 0) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // 홈앤어웨이인 경우 역경기 추가
  if (options.homeAndAway) {
    const reverseMatches = matches.map((match) => ({
      ...match,
      id: `match-${matches.length + match.id}`,
      homeTeamId: match.awayTeamId,
      awayTeamId: match.homeTeamId,
      round: match.round + totalRounds,
    }));
    matches.push(...reverseMatches);
  }

  return matches;
}
```

---

## 5️⃣ 순위 자동 계산

### Standings Calculator

```typescript
// src/lib/services/standingsCalculator.ts
import { Match } from "@/types/match";
import { Standing } from "@/types/standing";

/**
 * 경기 결과를 기반으로 순위 자동 계산
 */
export function calculateStandings(
  matches: Match[],
  teams: string[]
): Standing[] {
  const standingsMap = new Map<string, Standing>();

  // 초기화
  teams.forEach((teamId) => {
    standingsMap.set(teamId, {
      id: teamId,
      teamId,
      teamName: "",
      rank: 0,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
    });
  });

  // 경기 결과 처리
  matches
    .filter((m) => m.status === "completed")
    .forEach((match) => {
      const home = standingsMap.get(match.homeTeamId)!;
      const away = standingsMap.get(match.awayTeamId)!;

      if (!home || !away) return;

      home.played++;
      away.played++;
      home.goalsFor += match.homeScore || 0;
      home.goalsAgainst += match.awayScore || 0;
      away.goalsFor += match.awayScore || 0;
      away.goalsAgainst += match.homeScore || 0;

      if (match.homeScore! > match.awayScore!) {
        home.wins++;
        home.points += 3;
        home.form.push("W");
        away.losses++;
        away.form.push("L");
      } else if (match.homeScore! < match.awayScore!) {
        away.wins++;
        away.points += 3;
        away.form.push("W");
        home.losses++;
        home.form.push("L");
      } else {
        home.draws++;
        home.points += 1;
        home.form.push("D");
        away.draws++;
        away.points += 1;
        away.form.push("D");
      }
    });

  // 골득실 계산
  standingsMap.forEach((standing) => {
    standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
    standing.form = standing.form.slice(-5); // 최근 5경기
  });

  // 정렬 (승점 → 골득실 → 다득점)
  const standings = Array.from(standingsMap.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference)
      return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  // 순위 할당
  standings.forEach((standing, index) => {
    standing.rank = index + 1;
  });

  return standings;
}
```

---

## 6️⃣ Round Robin 알고리즘

### 알고리즘 설명

```
8팀 Round Robin:
- 총 라운드: 7라운드
- 라운드당 경기: 4경기
- 총 경기: 28경기
```

### 구현 코드

```typescript
// src/lib/services/roundRobin.ts
export function generateRoundRobin(teams: string[]): Array<{
  round: number;
  matches: Array<{ home: string; away: string }>;
}> {
  const n = teams.length;
  const isOdd = n % 2 === 1;
  const workingTeams = isOdd ? [...teams, "BYE"] : teams;
  const totalRounds = isOdd ? n : n - 1;
  const rounds: Array<{
    round: number;
    matches: Array<{ home: string; away: string }>;
  }> = [];

  for (let round = 1; round <= totalRounds; round++) {
    const matches: Array<{ home: string; away: string }> = [];

    for (let i = 0; i < workingTeams.length / 2; i++) {
      const home = workingTeams[i];
      const away = workingTeams[workingTeams.length - 1 - i];

      if (home !== "BYE" && away !== "BYE") {
        matches.push({ home, away });
      }
    }

    rounds.push({ round, matches });

    // 팀 순환
    const last = workingTeams.pop()!;
    workingTeams.splice(1, 0, last);
  }

  return rounds;
}
```

---

## 7️⃣ React 구현

### League Management Page

```typescript
// src/pages/federations/[slug]/admin/leagues/[leagueId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/shared/Card";
import { Button } from "@/components/shared/Button";
import { DataTable } from "@/components/shared/DataTable";
import { StandingTable } from "@/components/shared/StandingTable";
import { Trophy, Users, Calendar, Play } from "lucide-react";

export default function LeagueDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const federationSlug = params.federationId as string;
  const leagueId = params.leagueId as string;

  const [league, setLeague] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);

  const handleGenerateSchedule = async () => {
    // 자동 일정 생성
    const response = await fetch(
      `/api/federations/${federationSlug}/leagues/${leagueId}/generate-schedule`,
      { method: "POST" }
    );
    const result = await response.json();
    if (result.success) {
      setMatches(result.matches);
    }
  };

  return (
    <div className="space-y-6">
      {/* League Info */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{league?.name}</h1>
            <p className="text-gray-600 mt-1">
              {teams.length}팀 · {matches.length}경기
            </p>
          </div>
          <Button onClick={handleGenerateSchedule}>
            <Play className="w-4 h-4 mr-2" />
            일정 생성
          </Button>
        </div>
      </Card>

      {/* Teams */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">참가 팀</h2>
        <DataTable
          columns={[
            { key: "name", label: "팀명" },
            { key: "playerCount", label: "선수 수" },
          ]}
          data={teams}
        />
      </Card>

      {/* Schedule */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">경기 일정</h2>
        <DataTable
          columns={[
            { key: "round", label: "라운드" },
            { key: "homeTeam", label: "홈" },
            { key: "awayTeam", label: "원정" },
            { key: "date", label: "날짜" },
            { key: "status", label: "상태" },
          ]}
          data={matches}
        />
      </Card>

      {/* Standings */}
      {standings.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">순위</h2>
          <StandingTable standings={standings} />
        </Card>
      )}
    </div>
  );
}
```

---

## ✅ League Engine 완료

### 완성된 내용

- ✅ 리그 생성 시스템
- ✅ 자동 경기 일정 생성 (Round Robin)
- ✅ 순위 자동 계산
- ✅ Round Robin 알고리즘
- ✅ React 구현 코드

### 시스템 완성도

이제 YAGO는:

```
Sports Social Platform
+
League Operating System
+
Federation Platform
```

---

**작성일**: 2024년  
**상태**: ✅ YAGO League Engine 완전한 설계 완료

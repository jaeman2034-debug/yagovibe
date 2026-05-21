# 🔄 YAGO VIBE SPORTS - Round Robin Scheduler (자동 리그 일정 생성 엔진) 완전 설계

> **작성일**: 2024년  
> **목적**: LeagueApps / SportsEngine / FIFA league manager 수준의 자동 일정 생성 시스템

---

## 📋 목차

1. [Round Robin Scheduler 개념](#1-round-robin-scheduler-개념)
2. [Round Robin 구조](#2-round-robin-구조)
3. [Circle Method 알고리즘](#3-circle-method-알고리즘)
4. [Firestore 구조](#4-firestore-구조)
5. [Scheduler 구현](#5-scheduler-구현)
6. [UI 구조](#6-ui-구조)
7. [실제 구현 코드](#7-실제-구현-코드)

---

## 1️⃣ Round Robin Scheduler 개념

### Round Robin 방식

**모든 팀이 서로 한 번씩 경기하는 리그 방식**입니다.

### 경기 수 계산

```
matches = n(n-1)/2
```

예:
```
4팀 → 6경기
6팀 → 15경기
12팀 → 66경기
```

### 핵심 기능

```
협회 관리자가 클릭 한 번으로
리그 경기 일정이 자동 생성됩니다.
```

---

## 2️⃣ Round Robin 구조

### 2-1. 4팀 리그 예시

```
Team A
Team B
Team C
Team D
```

**Round 1**:
```
A vs B
C vs D
```

**Round 2**:
```
A vs C
B vs D
```

**Round 3**:
```
A vs D
B vs C
```

### 2-2. 6팀 리그 예시

```
Team A
Team B
Team C
Team D
Team E
Team F
```

**Round 1**:
```
A vs F
B vs E
C vs D
```

**Round 2**:
```
A vs E
F vs D
B vs C
```

**Round 3**:
```
A vs D
E vs C
F vs B
```

**Round 4**:
```
A vs C
D vs B
E vs F
```

**Round 5**:
```
A vs B
C vs F
D vs E
```

---

## 3️⃣ Circle Method 알고리즘

### 3-1. Circle Method 원리

**1팀 고정, 나머지 팀 회전**

```
A B C D E F

Round 1
A vs F
B vs E
C vs D

Round 2 (F를 맨 뒤로 이동)
A vs E
F vs D
B vs C

Round 3 (E를 맨 뒤로 이동)
A vs D
E vs C
F vs B
```

### 3-2. 알고리즘 단계

1. **첫 번째 팀 고정** (A)
2. **나머지 팀을 원형으로 배치**
3. **각 라운드마다 회전**
4. **고정 팀과 대칭 위치 팀 매칭**

### 3-3. TypeScript 구현

```typescript
// src/services/roundRobinScheduler.ts

interface Team {
  id: string;
  name: string;
}

interface Match {
  round: number;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  matchNumber: number; // 라운드 내 경기 번호
}

export function generateRoundRobin(teams: Team[]): Match[] {
  const n = teams.length;
  const isEven = n % 2 === 0;
  const rounds = isEven ? n - 1 : n;
  const matchesPerRound = Math.floor(n / 2);
  
  const matches: Match[] = [];
  
  // 첫 번째 팀 고정
  const fixedTeam = teams[0];
  const rotatingTeams = teams.slice(1);
  
  // 각 라운드 생성
  for (let round = 1; round <= rounds; round++) {
    // 현재 라운드의 팀 순서 (고정 팀 + 회전 팀)
    const currentTeams = [fixedTeam, ...rotatingTeams];
    
    // 홀수인 경우 부전승 처리
    if (!isEven) {
      currentTeams.push({ id: "BYE", name: "부전승" });
    }
    
    // 라운드 내 경기 생성
    for (let i = 0; i < matchesPerRound; i++) {
      const homeIndex = i;
      const awayIndex = currentTeams.length - 1 - i;
      
      const homeTeam = currentTeams[homeIndex];
      const awayTeam = currentTeams[awayIndex];
      
      // 부전승 제외
      if (homeTeam.id !== "BYE" && awayTeam.id !== "BYE") {
        matches.push({
          round,
          homeTeamId: homeTeam.id,
          homeTeamName: homeTeam.name,
          awayTeamId: awayTeam.id,
          awayTeamName: awayTeam.name,
          matchNumber: i + 1,
        });
      }
    }
    
    // 다음 라운드를 위해 회전 (마지막 팀을 두 번째 위치로 이동)
    if (round < rounds) {
      const lastTeam = rotatingTeams.pop();
      if (lastTeam) {
        rotatingTeams.unshift(lastTeam);
      }
    }
  }
  
  return matches;
}
```

---

## 4️⃣ Firestore 구조

### 4-1. League Schedule 문서

```
leagues/{leagueId}/schedule
```

**문서 스키마**:
```typescript
{
  leagueId: string;
  totalRounds: number;
  totalMatches: number;
  matchesPerRound: number;
  startDate: Timestamp;
  endDate: Timestamp;
  matchInterval: number; // 경기 간격 (일)
  matchDay?: string; // "Saturday", "Sunday"
  createdAt: Timestamp;
}
```

### 4-2. League Matches 서브컬렉션

```
leagues/{leagueId}/matches/{matchId}
```

**문서 스키마**:
```typescript
{
  matchId: string; // matches/{matchId} 참조
  round: number;
  matchNumber: number;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  scheduledDate: Timestamp;
  scheduledTime?: string; // "15:00"
  venue?: string;
  status: "scheduled" | "live" | "finished" | "cancelled";
  createdAt: Timestamp;
}
```

### 4-3. League Rounds 서브컬렉션 (선택적)

```
leagues/{leagueId}/rounds/{roundId}
```

**문서 스키마**:
```typescript
{
  round: number;
  date: Timestamp;
  matchCount: number;
  completedMatches: number;
}
```

---

## 5️⃣ Scheduler 구현

### 5-1. 경기 일정 생성 함수

```typescript
// src/services/leagueScheduleService.ts
import { collection, doc, setDoc, addDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateRoundRobin, Match } from "./roundRobinScheduler";

interface CreateScheduleParams {
  leagueId: string;
  teams: Team[];
  startDate: Date;
  matchInterval: number; // 일
  matchDay?: string; // "Saturday", "Sunday"
  venue?: string;
  defaultTime?: string; // "15:00"
}

export async function createLeagueSchedule(params: CreateScheduleParams): Promise<void> {
  const { leagueId, teams, startDate, matchInterval, matchDay, venue, defaultTime } = params;
  
  // Round Robin 스케줄 생성
  const matches = generateRoundRobin(teams);
  
  // 날짜 할당
  const matchesWithDates = assignMatchDates(matches, startDate, matchInterval, matchDay);
  
  // Schedule 문서 생성
  const scheduleRef = doc(db, "leagues", leagueId, "schedule", "main");
  await setDoc(scheduleRef, {
    leagueId,
    totalRounds: Math.max(...matches.map(m => m.round)),
    totalMatches: matches.length,
    matchesPerRound: Math.floor(teams.length / 2),
    startDate,
    endDate: matchesWithDates[matchesWithDates.length - 1].scheduledDate,
    matchInterval,
    matchDay: matchDay || null,
    createdAt: serverTimestamp(),
  });
  
  // 각 경기 문서 생성
  const batch = writeBatch(db);
  
  for (const match of matchesWithDates) {
    // matches 컬렉션에 경기 문서 생성
    const matchRef = doc(collection(db, "matches"));
    const matchData = {
      leagueId,
      homeTeamId: match.homeTeamId,
      homeTeamName: match.homeTeamName,
      awayTeamId: match.awayTeamId,
      awayTeamName: match.awayTeamName,
      scheduledDate: match.scheduledDate,
      scheduledTime: defaultTime || null,
      venue: venue || null,
      status: "scheduled",
      sport: "soccer", // 리그에서 가져오기
      createdAt: serverTimestamp(),
    };
    
    batch.set(matchRef, matchData);
    
    // leagues/{leagueId}/matches에 참조 추가
    const leagueMatchRef = doc(collection(db, "leagues", leagueId, "matches"));
    batch.set(leagueMatchRef, {
      matchId: matchRef.id,
      round: match.round,
      matchNumber: match.matchNumber,
      homeTeamId: match.homeTeamId,
      homeTeamName: match.homeTeamName,
      awayTeamId: match.awayTeamId,
      awayTeamName: match.awayTeamName,
      scheduledDate: match.scheduledDate,
      scheduledTime: defaultTime || null,
      venue: venue || null,
      status: "scheduled",
      createdAt: serverTimestamp(),
    });
  }
  
  await batch.commit();
}
```

### 5-2. 날짜 할당 함수

```typescript
function assignMatchDates(
  matches: Match[],
  startDate: Date,
  matchInterval: number,
  matchDay?: string
): Array<Match & { scheduledDate: Date }> {
  const matchesWithDates: Array<Match & { scheduledDate: Date }> = [];
  let currentDate = new Date(startDate);
  let currentRound = 1;
  
  matches.forEach((match) => {
    // 라운드가 바뀌면 날짜 증가
    if (match.round > currentRound) {
      currentRound = match.round;
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + matchInterval);
      
      // 특정 요일 지정이 있으면 조정
      if (matchDay) {
        const dayMap: Record<string, number> = {
          "Sunday": 0,
          "Monday": 1,
          "Tuesday": 2,
          "Wednesday": 3,
          "Thursday": 4,
          "Friday": 5,
          "Saturday": 6,
        };
        
        const targetDay = dayMap[matchDay];
        const currentDay = currentDate.getDay();
        const diff = targetDay - currentDay;
        
        if (diff !== 0) {
          currentDate.setDate(currentDate.getDate() + diff);
        }
      }
    }
    
    matchesWithDates.push({
      ...match,
      scheduledDate: new Date(currentDate),
    });
  });
  
  return matchesWithDates;
}
```

---

## 6️⃣ UI 구조

### 6-1. Scheduler 입력 UI

```
┌─────────────────────────────────────────┐
│ League Scheduler                         │
│                                          │
│ 리그: Seoul Futsal League 2025          │
│                                          │
│ 참가 팀 (12팀)                           │
│ ┌─────────────────────────────────────┐ │
│ │ ☑ Tigers                            │ │
│ │ ☑ Lions                             │ │
│ │ ☑ Eagles                            │ │
│ │ ☑ Wolves                            │ │
│ │ ...                                 │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ 시작일: [2025-03-01]                     │
│ 경기 간격: [7] 일                        │
│ 경기 요일: [Saturday]                    │
│ 경기장: [마들스타디움]                    │
│ 기본 시간: [15:00]                       │
│                                          │
│ 예상 일정                                │
│ 라운드: 11                               │
│ 총 경기: 66                              │
│ 종료일: 2025-05-15                       │
│                                          │
│ [ 일정 생성 ]                            │
└─────────────────────────────────────────┘
```

### 6-2. 생성된 일정 UI

```
┌─────────────────────────────────────────┐
│ 2025 Seoul League Schedule                │
│                                          │
│ Round 1 (2025-03-01)                    │
│ ┌─────────────────────────────────────┐ │
│ │ Tigers vs Lions                     │ │
│ │ 2025-03-01 15:00 · 마들스타디움     │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Eagles vs Wolves                    │ │
│ │ 2025-03-01 17:00 · 마들스타디움     │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Round 2 (2025-03-08)                    │
│ ...                                      │
└─────────────────────────────────────────┘
```

---

## 7️⃣ 실제 구현 코드

### 7-1. Round Robin Scheduler 컴포넌트

```typescript
// src/components/league/RoundRobinScheduler.tsx
import { useState } from "react";
import { createLeagueSchedule } from "@/services/leagueScheduleService";
import { useLeagueTeams } from "@/hooks/useLeagueTeams";

interface RoundRobinSchedulerProps {
  leagueId: string;
  onComplete: () => void;
}

export function RoundRobinScheduler({ leagueId, onComplete }: RoundRobinSchedulerProps) {
  const { teams, loading } = useLeagueTeams(leagueId);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [matchInterval, setMatchInterval] = useState(7);
  const [matchDay, setMatchDay] = useState("");
  const [venue, setVenue] = useState("");
  const [defaultTime, setDefaultTime] = useState("15:00");
  const [generating, setGenerating] = useState(false);
  
  const handleTeamToggle = (teamId: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };
  
  const handleGenerate = async () => {
    if (selectedTeams.length < 2) {
      alert("최소 2팀 이상 선택해주세요");
      return;
    }
    
    if (!startDate) {
      alert("시작일을 선택해주세요");
      return;
    }
    
    setGenerating(true);
    try {
      const selectedTeamObjects = teams.filter(t => selectedTeams.includes(t.teamId));
      
      await createLeagueSchedule({
        leagueId,
        teams: selectedTeamObjects,
        startDate: new Date(startDate),
        matchInterval,
        matchDay: matchDay || undefined,
        venue: venue || undefined,
        defaultTime: defaultTime || undefined,
      });
      
      alert("경기 일정이 생성되었습니다");
      onComplete();
    } catch (error) {
      console.error("일정 생성 실패:", error);
      alert("일정 생성에 실패했습니다");
    } finally {
      setGenerating(false);
    }
  };
  
  const teamCount = selectedTeams.length;
  const totalRounds = teamCount > 0 ? (teamCount % 2 === 0 ? teamCount - 1 : teamCount) : 0;
  const totalMatches = teamCount > 0 ? (teamCount * (teamCount - 1)) / 2 : 0;
  
  if (loading) return <div>로딩 중...</div>;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">Round Robin 일정 생성</h2>
      
      <div className="space-y-4">
        {/* 팀 선택 */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            참가 팀 ({selectedTeams.length}팀 선택)
          </label>
          <div className="border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
            {teams.map((team) => (
              <label key={team.teamId} className="flex items-center gap-2 p-2 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedTeams.includes(team.teamId)}
                  onChange={() => handleTeamToggle(team.teamId)}
                />
                <span>{team.teamName}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* 시작일 */}
        <div>
          <label className="block text-sm font-semibold mb-2">시작일</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        
        {/* 경기 간격 */}
        <div>
          <label className="block text-sm font-semibold mb-2">경기 간격 (일)</label>
          <input
            type="number"
            value={matchInterval}
            onChange={(e) => setMatchInterval(Number(e.target.value))}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        
        {/* 경기 요일 */}
        <div>
          <label className="block text-sm font-semibold mb-2">경기 요일 (선택사항)</label>
          <select
            value={matchDay}
            onChange={(e) => setMatchDay(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">요일 무관</option>
            <option value="Sunday">일요일</option>
            <option value="Monday">월요일</option>
            <option value="Tuesday">화요일</option>
            <option value="Wednesday">수요일</option>
            <option value="Thursday">목요일</option>
            <option value="Friday">금요일</option>
            <option value="Saturday">토요일</option>
          </select>
        </div>
        
        {/* 경기장 */}
        <div>
          <label className="block text-sm font-semibold mb-2">경기장 (선택사항)</label>
          <input
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="마들스타디움"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        
        {/* 기본 시간 */}
        <div>
          <label className="block text-sm font-semibold mb-2">기본 시간</label>
          <input
            type="time"
            value={defaultTime}
            onChange={(e) => setDefaultTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        
        {/* 예상 일정 */}
        {teamCount >= 2 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">예상 일정</h3>
            <div className="space-y-1 text-sm">
              <div>라운드: {totalRounds}</div>
              <div>총 경기: {totalMatches}</div>
              {startDate && (
                <div>
                  종료일:{" "}
                  {new Date(
                    new Date(startDate).getTime() + (totalRounds - 1) * matchInterval * 24 * 60 * 60 * 1000
                  ).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 생성 버튼 */}
        <button
          onClick={handleGenerate}
          disabled={generating || teamCount < 2 || !startDate}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? "일정 생성 중..." : "경기 일정 생성"}
        </button>
      </div>
    </div>
  );
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] Circle Method 알고리즘 구현
- [ ] 경기 일정 날짜 할당 함수
- [ ] Firestore 저장 함수
- [ ] Round Robin Scheduler 컴포넌트

### Phase 2 (다음)
- [ ] 경기 요일 지정 기능
- [ ] 경기 시간 자동 할당
- [ ] 경기장 할당 기능

### Phase 3 (확장)
- [ ] 홈/원정 자동 교체
- [ ] 경기 일정 수정 기능
- [ ] 경기장 최적화

---

**작성일**: 2024년  
**상태**: ✅ Round Robin Scheduler 완전 설계 완료

# 🔄 YAGO VIBE SPORTS - Round Robin Scheduler (자동 경기 일정 생성) 설계

> **작성일**: 2024년  
> **목적**: 협회가 클릭 한 번으로 리그 경기 일정을 자동 생성하는 핵심 기능

---

## 📋 목차

1. [Round Robin Scheduler 개념](#1-round-robin-scheduler-개념)
2. [Round Robin 알고리즘](#2-round-robin-알고리즘)
3. [Firestore 구조](#3-firestore-구조)
4. [스케줄러 구현](#4-스케줄러-구현)
5. [UI 구조](#5-ui-구조)
6. [실제 구현 코드](#6-실제-구현-코드)

---

## 1️⃣ Round Robin Scheduler 개념

### Round Robin Scheduler 역할

**리그에 참가한 팀들을 자동으로 매칭하여 경기 일정을 생성하는 시스템**입니다.

### 핵심 기능

```
팀 목록 입력
      ↓
Round Robin 알고리즘
      ↓
경기 일정 자동 생성
      ↓
Firestore 저장
```

### 예시

```
12팀 리그

Round 1
Tigers vs Lions
Eagles vs Wolves
Bears vs Hawks
...

Round 2
Tigers vs Eagles
Lions vs Bears
Wolves vs Hawks
...
```

---

## 2️⃣ Round Robin 알고리즘

### 2-1. 기본 원리

**각 팀이 다른 모든 팀과 한 번씩 경기하는 방식**

```
팀 수: n
총 경기 수: n * (n - 1) / 2
라운드 수: n - 1 (짝수) 또는 n (홀수)
```

### 2-2. 짝수 팀 (예: 12팀)

```
라운드 수: 11
총 경기 수: 66
라운드당 경기 수: 6
```

### 2-3. 홀수 팀 (예: 11팀)

```
라운드 수: 11
총 경기 수: 55
라운드당 경기 수: 5 (한 팀은 부전승)
```

### 2-4. 알고리즘 예시 (12팀)

**Round 1**:
```
1 vs 12
2 vs 11
3 vs 10
4 vs 9
5 vs 8
6 vs 7
```

**Round 2** (1번 팀 고정, 나머지 회전):
```
1 vs 11
12 vs 10
2 vs 9
3 vs 8
4 vs 7
5 vs 6
```

**Round 3**:
```
1 vs 10
11 vs 9
12 vs 8
2 vs 7
3 vs 6
4 vs 5
```

... (계속)

---

## 3️⃣ Firestore 구조

### 3-1. League Schedule 문서

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
  createdAt: Timestamp;
}
```

### 3-2. League Matches 서브컬렉션

```
leagues/{leagueId}/matches/{matchId}
```

**문서 스키마**:
```typescript
{
  matchId: string; // matches/{matchId} 참조
  round: number;
  matchNumber: number; // 라운드 내 경기 번호
  homeTeamId: string;
  awayTeamId: string;
  scheduledDate: Timestamp;
  scheduledTime?: string; // "15:00"
  venue?: string;
  status: "scheduled" | "live" | "finished" | "cancelled";
  createdAt: Timestamp;
}
```

---

## 4️⃣ 스케줄러 구현

### 4-1. Round Robin 알고리즘 함수

```typescript
// src/services/schedulerService.ts

interface Team {
  id: string;
  name: string;
}

interface Match {
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  matchNumber: number;
}

export function generateRoundRobinSchedule(teams: Team[]): Match[] {
  const teamCount = teams.length;
  const isEven = teamCount % 2 === 0;
  const rounds = isEven ? teamCount - 1 : teamCount;
  const matchesPerRound = Math.floor(teamCount / 2);
  
  const schedule: Match[] = [];
  const teamIds = teams.map(t => t.id);
  
  // 홀수인 경우 부전승 팀 추가
  if (!isEven) {
    teamIds.push("BYE");
  }
  
  // 각 라운드 생성
  for (let round = 1; round <= rounds; round++) {
    const roundMatches: Match[] = [];
    
    // 첫 번째 팀 고정, 나머지 회전
    for (let i = 0; i < matchesPerRound; i++) {
      const homeIndex = i;
      const awayIndex = teamIds.length - 1 - i;
      
      // 부전승 제외
      if (teamIds[homeIndex] !== "BYE" && teamIds[awayIndex] !== "BYE") {
        roundMatches.push({
          round,
          homeTeamId: teamIds[homeIndex],
          awayTeamId: teamIds[awayIndex],
          matchNumber: i + 1,
        });
      }
    }
    
    schedule.push(...roundMatches);
    
    // 팀 순서 회전 (첫 번째 팀 제외)
    const lastTeam = teamIds.pop();
    if (lastTeam) {
      teamIds.splice(1, 0, lastTeam);
    }
  }
  
  return schedule;
}
```

### 4-2. 경기 일정 날짜 할당

```typescript
export function assignMatchDates(
  schedule: Match[],
  startDate: Date,
  matchInterval: number = 7 // 일주일 간격
): Match[] {
  const matchesWithDates: Match[] = [];
  let currentDate = new Date(startDate);
  
  let currentRound = 1;
  
  schedule.forEach((match, index) => {
    // 라운드가 바뀌면 날짜 증가
    if (match.round > currentRound) {
      currentRound = match.round;
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + matchInterval);
    }
    
    matchesWithDates.push({
      ...match,
      scheduledDate: new Date(currentDate),
    });
  });
  
  return matchesWithDates;
}
```

### 4-3. Firestore 저장 함수

```typescript
// src/services/leagueService.ts
import { collection, doc, setDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function createLeagueSchedule(params: {
  leagueId: string;
  teams: Team[];
  startDate: Date;
  matchInterval: number;
  venue?: string;
}): Promise<void> {
  const { leagueId, teams, startDate, matchInterval, venue } = params;
  
  // Round Robin 스케줄 생성
  const schedule = generateRoundRobinSchedule(teams);
  const scheduleWithDates = assignMatchDates(schedule, startDate, matchInterval);
  
  // Schedule 문서 생성
  const scheduleRef = doc(db, "leagues", leagueId, "schedule", "main");
  await setDoc(scheduleRef, {
    leagueId,
    totalRounds: Math.max(...schedule.map(m => m.round)),
    totalMatches: schedule.length,
    matchesPerRound: Math.floor(teams.length / 2),
    startDate: startDate,
    endDate: scheduleWithDates[scheduleWithDates.length - 1].scheduledDate,
    matchInterval,
    createdAt: serverTimestamp(),
  });
  
  // 각 경기 문서 생성
  const matchesRef = collection(db, "leagues", leagueId, "matches");
  const batch = writeBatch(db);
  
  for (const match of scheduleWithDates) {
    // matches 컬렉션에 경기 문서 생성
    const matchRef = doc(collection(db, "matches"));
    const matchData = {
      leagueId,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      scheduledDate: match.scheduledDate,
      venue: venue || "",
      status: "scheduled",
      sport: "soccer", // 리그에서 가져오기
      createdAt: serverTimestamp(),
    };
    
    batch.set(matchRef, matchData);
    
    // leagues/{leagueId}/matches에 참조 추가
    const leagueMatchRef = doc(matchesRef);
    batch.set(leagueMatchRef, {
      matchId: matchRef.id,
      round: match.round,
      matchNumber: match.matchNumber,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      scheduledDate: match.scheduledDate,
      venue: venue || "",
      status: "scheduled",
      createdAt: serverTimestamp(),
    });
  }
  
  await batch.commit();
}
```

---

## 5️⃣ UI 구조

### 5-1. 경기 일정 생성 UI

```
┌─────────────────────────────────────────┐
│ 경기 일정 생성                            │
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
│ 경기장: [마들스타디움]                    │
│                                          │
│ 예상 일정                                │
│ 라운드: 11                               │
│ 총 경기: 66                              │
│ 종료일: 2025-05-15                       │
│                                          │
│ [ 일정 생성 ]                            │
└─────────────────────────────────────────┘
```

### 5-2. 생성된 경기 일정 UI

```
┌─────────────────────────────────────────┐
│ 경기 일정                                 │
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

## 6️⃣ 실제 구현 코드

### 6-1. Schedule Generator 컴포넌트

```typescript
// src/components/league/ScheduleGenerator.tsx
import { useState } from "react";
import { useParams } from "react-router-dom";
import { createLeagueSchedule } from "@/services/leagueService";
import { useLeagueTeams } from "@/hooks/useLeagueTeams";

interface ScheduleGeneratorProps {
  leagueId: string;
  onComplete: () => void;
}

export function ScheduleGenerator({ leagueId, onComplete }: ScheduleGeneratorProps) {
  const { teams, loading } = useLeagueTeams(leagueId);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [matchInterval, setMatchInterval] = useState(7);
  const [venue, setVenue] = useState("");
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
        venue,
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
      <h2 className="text-xl font-bold mb-4">경기 일정 생성</h2>
      
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

### 6-2. League Schedule View 컴포넌트

```typescript
// src/components/league/LeagueScheduleView.tsx
import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface LeagueScheduleViewProps {
  leagueId: string;
}

export function LeagueScheduleView({ leagueId }: LeagueScheduleViewProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const matchesRef = collection(db, "leagues", leagueId, "matches");
        const q = query(matchesRef, orderBy("round", "asc"), orderBy("matchNumber", "asc"));
        
        const snapshot = await getDocs(q);
        const matchesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setMatches(matchesData);
        
        // 첫 번째 라운드 선택
        if (matchesData.length > 0) {
          setSelectedRound(matchesData[0].round);
        }
      } catch (error) {
        console.error("경기 일정 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMatches();
  }, [leagueId]);
  
  if (loading) return <div>로딩 중...</div>;
  
  const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);
  const filteredMatches = selectedRound
    ? matches.filter(m => m.round === selectedRound)
    : matches;
  
  const groupedByRound = rounds.reduce((acc, round) => {
    acc[round] = matches.filter(m => m.round === round);
    return acc;
  }, {} as Record<number, any[]>);
  
  return (
    <div className="space-y-6">
      {/* 라운드 선택 */}
      <div className="flex gap-2 overflow-x-auto">
        {rounds.map((round) => (
          <button
            key={round}
            onClick={() => setSelectedRound(round)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              selectedRound === round
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Round {round}
          </button>
        ))}
      </div>
      
      {/* 경기 목록 */}
      <div className="space-y-4">
        {Object.entries(groupedByRound).map(([round, roundMatches]) => {
          if (selectedRound && Number(round) !== selectedRound) return null;
          
          const roundDate = roundMatches[0]?.scheduledDate?.toDate();
          
          return (
            <div key={round} className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">
                Round {round}
                {roundDate && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({format(roundDate, "yyyy년 MM월 dd일", { locale: ko })})
                  </span>
                )}
              </h3>
              
              <div className="space-y-3">
                {roundMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-semibold">
                        {match.homeTeamName} vs {match.awayTeamName}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {match.scheduledDate?.toDate() && (
                          <>
                            {format(match.scheduledDate.toDate(), "yyyy-MM-dd HH:mm", { locale: ko })}
                            {match.venue && ` · ${match.venue}`}
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        match.status === "finished" ? "bg-green-100 text-green-800" :
                        match.status === "live" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {match.status === "finished" ? "종료" :
                         match.status === "live" ? "진행중" : "예정"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] Round Robin 알고리즘 함수
- [ ] 경기 일정 날짜 할당 함수
- [ ] Firestore 저장 함수
- [ ] Schedule Generator 컴포넌트

### Phase 2 (다음)
- [ ] League Schedule View 컴포넌트
- [ ] 경기 일정 수정 기능
- [ ] 경기장 할당 기능

### Phase 3 (확장)
- [ ] 홈/원정 자동 교체
- [ ] 경기 시간 자동 할당
- [ ] 경기장 최적화

---

**작성일**: 2024년  
**상태**: ✅ Round Robin Scheduler 설계 완료

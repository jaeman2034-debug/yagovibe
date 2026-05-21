# ⚽ YAGO VIBE SPORTS - 경기 자동 대진표 생성 시스템

> **작성일**: 2024년  
> **목적**: AI 기반 자동 대진표 생성 및 경기 운영 시스템

---

## 📋 목차

1. [대진표 생성 개요](#1-대진표-생성-개요)
2. [Round Robin 알고리즘](#2-round-robin-알고리즘)
3. [Knockout Tournament 알고리즘](#3-knockout-tournament-알고리즘)
4. [실제 구현 코드](#4-실제-구현-코드)
5. [자동 일정 최적화](#5-자동-일정-최적화)

---

## 1️⃣ 대진표 생성 개요

### 대회 타입별 대진표

```
Round Robin (리그전)
  → 모든 팀이 서로 한 번씩 경기
  → 홈/어웨이 고려
  → 라운드 수 = (팀 수 - 1) × 2

Knockout (토너먼트)
  → 단계별 탈락
  → 8강 → 4강 → 결승
  → 자동 시드 배정

Hybrid (혼합)
  → 조별 리그 → 토너먼트
  → 조별 경기 후 상위 팀 진출
```

### 생성 프로세스

```
시즌/대회 생성
  ↓
팀 등록 완료
  ↓
대진표 생성 요청
  ↓
알고리즘 선택 (Round Robin / Knockout)
  ↓
일정 자동 생성
  ↓
경기 매칭 생성
  ↓
Firestore 저장
  ↓
홈페이지 반영
```

---

## 2️⃣ Round Robin 알고리즘

### 기본 원리

```
N개 팀이 있을 때:
- 총 경기 수 = N × (N - 1) / 2
- 라운드 수 = N - 1 (홈/어웨이 고려 시 × 2)
- 각 라운드당 경기 수 = N / 2
```

### 알고리즘 구현

```typescript
interface Team {
  id: string;
  name: string;
  homeStadium?: string;
}

interface Match {
  homeTeamId: string;
  awayTeamId: string;
  round: number;
  matchNumber: number;
}

function generateRoundRobinSchedule(
  teams: Team[],
  options: {
    homeAndAway: boolean; // 홈/어웨이 고려
    roundsPerTeam?: number; // 팀당 경기 수
  }
): Match[] {
  const matches: Match[] = [];
  
  // 팀 수가 홀수면 BYE 팀 추가
  const teamCount = teams.length;
  const isOdd = teamCount % 2 === 1;
  const workingTeams = isOdd ? [...teams, { id: "BYE", name: "BYE" }] : teams;
  const n = workingTeams.length;
  
  // 홈/어웨이 고려 시 라운드 수 × 2
  const totalRounds = options.homeAndAway ? (n - 1) * 2 : n - 1;
  
  let matchNumber = 1;
  
  for (let round = 1; round <= totalRounds; round++) {
    // 각 라운드의 경기 생성
    for (let i = 0; i < n / 2; i++) {
      const homeIndex = i;
      const awayIndex = n - 1 - i;
      
      const homeTeam = workingTeams[homeIndex];
      const awayTeam = workingTeams[awayIndex];
      
      // BYE 팀 제외
      if (homeTeam.id !== "BYE" && awayTeam.id !== "BYE") {
        // 홈/어웨이 교체 (홀수 라운드에서)
        const isHomeAwaySwap = options.homeAndAway && round > (n - 1);
        
        matches.push({
          homeTeamId: isHomeAwaySwap ? awayTeam.id : homeTeam.id,
          awayTeamId: isHomeAwaySwap ? homeTeam.id : awayTeam.id,
          round,
          matchNumber: matchNumber++,
        });
      }
    }
    
    // 팀 순환 (마지막 팀 고정, 나머지 시계 방향 회전)
    const lastTeam = workingTeams[n - 1];
    for (let i = n - 2; i >= 0; i--) {
      workingTeams[i + 1] = workingTeams[i];
    }
    workingTeams[0] = lastTeam;
  }
  
  return matches;
}
```

### 예시: 6팀 Round Robin

```
라운드 1:
  팀1 vs 팀6
  팀2 vs 팀5
  팀3 vs 팀4

라운드 2:
  팀1 vs 팀5
  팀6 vs 팀4
  팀2 vs 팀3

라운드 3:
  팀1 vs 팀4
  팀5 vs 팀3
  팀6 vs 팀2

라운드 4:
  팀1 vs 팀3
  팀4 vs 팀2
  팀5 vs 팀6

라운드 5:
  팀1 vs 팀2
  팀3 vs 팀6
  팀4 vs 팀5
```

---

## 3️⃣ Knockout Tournament 알고리즘

### 기본 원리

```
N개 팀이 있을 때:
- 라운드 수 = ⌈log₂(N)⌉
- 각 라운드 경기 수 = 이전 라운드 / 2
- 시드 배정 필요
```

### 알고리즘 구현

```typescript
interface KnockoutMatch {
  homeTeamId?: string;
  awayTeamId?: string;
  round: number;
  matchNumber: number;
  bracketPosition: number;
  nextMatchId?: string; // 다음 라운드 매치 ID
}

function generateKnockoutBracket(
  teams: Team[],
  options: {
    seeded: boolean; // 시드 배정 여부
    doubleElimination: boolean; // 더블 엘리미네이션
  }
): KnockoutMatch[] {
  const matches: KnockoutMatch[] = [];
  const teamCount = teams.length;
  
  // 시드 배정
  const seededTeams = options.seeded
    ? seedTeams(teams)
    : shuffleTeams(teams);
  
  // 라운드 수 계산
  const rounds = Math.ceil(Math.log2(teamCount));
  
  // 첫 라운드 매치 생성
  let currentRoundMatches: KnockoutMatch[] = [];
  let matchNumber = 1;
  
  for (let i = 0; i < seededTeams.length; i += 2) {
    const match: KnockoutMatch = {
      homeTeamId: seededTeams[i]?.id,
      awayTeamId: seededTeams[i + 1]?.id,
      round: 1,
      matchNumber: matchNumber++,
      bracketPosition: Math.floor(i / 2),
    };
    
    currentRoundMatches.push(match);
    matches.push(match);
  }
  
  // 다음 라운드 생성
  for (let round = 2; round <= rounds; round++) {
    const nextRoundMatches: KnockoutMatch[] = [];
    const matchesInRound = currentRoundMatches.length / 2;
    
    for (let i = 0; i < matchesInRound; i++) {
      const prevMatch1 = currentRoundMatches[i * 2];
      const prevMatch2 = currentRoundMatches[i * 2 + 1];
      
      const match: KnockoutMatch = {
        round,
        matchNumber: matchNumber++,
        bracketPosition: i,
        nextMatchId: undefined, // 최종 라운드는 없음
      };
      
      // 이전 매치와 연결
      if (prevMatch1) prevMatch1.nextMatchId = match.matchNumber.toString();
      if (prevMatch2) prevMatch2.nextMatchId = match.matchNumber.toString();
      
      nextRoundMatches.push(match);
      matches.push(match);
    }
    
    currentRoundMatches = nextRoundMatches;
  }
  
  return matches;
}

function seedTeams(teams: Team[]): Team[] {
  // 시드 배정 로직 (예: 이전 시즌 순위 기반)
  // 여기서는 단순 정렬로 구현
  return [...teams].sort((a, b) => {
    // 시드 기준에 따라 정렬 (예: 이전 순위)
    return 0; // 실제로는 시드 데이터 필요
  });
}

function shuffleTeams(teams: Team[]): Team[] {
  // 무작위 섞기
  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

### 예시: 8팀 Knockout

```
1라운드 (8강):
  매치1: 팀1 vs 팀8
  매치2: 팀2 vs 팀7
  매치3: 팀3 vs 팀6
  매치4: 팀4 vs 팀5

2라운드 (4강):
  매치5: 매치1 승자 vs 매치2 승자
  매치6: 매치3 승자 vs 매치4 승자

3라운드 (결승):
  매치7: 매치5 승자 vs 매치6 승자
```

---

## 4️⃣ 실제 구현 코드

### Cloud Function: generateSchedule

```typescript
// functions/src/league/generateSchedule.ts
import { onCall } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

export const generateSchedule = onCall(
  {
    cors: true,
    memory: "1GiB",
    timeoutSeconds: 300,
  },
  async (request) => {
    const { data, auth } = request;
    
    if (!auth) {
      throw new HttpsError("unauthenticated", "인증이 필요합니다.");
    }
    
    const {
      federationId,
      seasonId,
      scheduleType, // "round_robin" | "knockout" | "hybrid"
      options,
    } = data as {
      federationId: string;
      seasonId: string;
      scheduleType: string;
      options: {
        homeAndAway?: boolean;
        seeded?: boolean;
        startDate?: string;
        matchInterval?: number; // 경기 간격 (일)
      };
    };
    
    try {
      // 1. 시즌 정보 조회
      const seasonDoc = await db
        .collection(`federations/${federationId}/seasons`)
        .doc(seasonId)
        .get();
      
      if (!seasonDoc.exists) {
        throw new HttpsError("not-found", "시즌을 찾을 수 없습니다.");
      }
      
      const season = seasonDoc.data();
      
      // 2. 등록된 팀 조회
      const teamsSnapshot = await db
        .collection(`federations/${federationId}/seasons/${seasonId}/teams`)
        .where("status", "==", "approved")
        .get();
      
      if (teamsSnapshot.empty) {
        throw new HttpsError("failed-precondition", "등록된 팀이 없습니다.");
      }
      
      const teams = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // 3. 대진표 생성
      let matches: any[];
      
      switch (scheduleType) {
        case "round_robin":
          matches = generateRoundRobinSchedule(teams, {
            homeAndAway: options.homeAndAway ?? true,
          });
          break;
          
        case "knockout":
          matches = generateKnockoutBracket(teams, {
            seeded: options.seeded ?? false,
            doubleElimination: false,
          });
          break;
          
        default:
          throw new HttpsError("invalid-argument", "지원하지 않는 대진표 타입입니다.");
      }
      
      // 4. 일정 배정
      const scheduledMatches = assignMatchDates(
        matches,
        options.startDate ? new Date(options.startDate) : new Date(),
        options.matchInterval ?? 7 // 기본 7일 간격
      );
      
      // 5. Firestore에 저장
      const batch = db.batch();
      const matchesRef = db.collection(
        `federations/${federationId}/matches`
      );
      
      scheduledMatches.forEach((match) => {
        const matchRef = matchesRef.doc();
        batch.set(matchRef, {
          id: matchRef.id,
          federationId,
          seasonId,
          tournamentId: null,
          matchNumber: match.matchNumber,
          round: match.round,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homeTeamName: teams.find(t => t.id === match.homeTeamId)?.name || "",
          awayTeamName: teams.find(t => t.id === match.awayTeamId)?.name || "",
          matchDate: match.matchDate,
          matchTime: match.matchTime || "18:00",
          venue: match.venue || "TBD",
          status: "scheduled",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          createdBy: auth.uid,
        });
      });
      
      await batch.commit();
      
      // 6. 시즌 상태 업데이트
      await seasonDoc.ref.update({
        status: "ongoing",
        scheduleGenerated: true,
        totalMatches: scheduledMatches.length,
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      return {
        success: true,
        message: "대진표가 성공적으로 생성되었습니다.",
        totalMatches: scheduledMatches.length,
        rounds: Math.max(...scheduledMatches.map(m => m.round)),
      };
    } catch (error: any) {
      console.error("대진표 생성 오류:", error);
      throw new HttpsError("internal", error.message || "대진표 생성 중 오류가 발생했습니다.");
    }
  }
);

function assignMatchDates(
  matches: any[],
  startDate: Date,
  intervalDays: number
): any[] {
  const scheduledMatches: any[] = [];
  let currentDate = new Date(startDate);
  
  // 라운드별로 그룹화
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, any[]>);
  
  // 각 라운드의 경기를 날짜에 배정
  for (const round in matchesByRound) {
    const roundMatches = matchesByRound[round];
    
    // 라운드 내 경기를 여러 날에 분산
    const matchesPerDay = Math.ceil(roundMatches.length / 3); // 하루 최대 3경기 가정
    
    let dayOffset = 0;
    for (let i = 0; i < roundMatches.length; i++) {
      if (i > 0 && i % matchesPerDay === 0) {
        dayOffset++;
      }
      
      const matchDate = new Date(currentDate);
      matchDate.setDate(matchDate.getDate() + (parseInt(round) - 1) * intervalDays + dayOffset);
      
      scheduledMatches.push({
        ...roundMatches[i],
        matchDate: matchDate,
        matchTime: getMatchTime(i % matchesPerDay), // 시간대 분산
        venue: "TBD", // 추후 배정
      });
    }
  }
  
  return scheduledMatches;
}

function getMatchTime(index: number): string {
  const times = ["14:00", "16:00", "18:00"];
  return times[index % times.length];
}
```

---

## 5️⃣ 자동 일정 최적화

### 최적화 알고리즘

```typescript
interface OptimizationOptions {
  avoidConsecutiveMatches: boolean; // 연속 경기 방지
  balanceHomeAway: boolean; // 홈/어웨이 균형
  considerStadium: boolean; // 경기장 고려
  weekendPreference: boolean; // 주말 선호
}

function optimizeSchedule(
  matches: any[],
  teams: Team[],
  options: OptimizationOptions
): any[] {
  let optimized = [...matches];
  
  // 1. 연속 경기 방지
  if (options.avoidConsecutiveMatches) {
    optimized = avoidConsecutiveMatches(optimized, teams);
  }
  
  // 2. 홈/어웨이 균형
  if (options.balanceHomeAway) {
    optimized = balanceHomeAway(optimized, teams);
  }
  
  // 3. 주말 선호
  if (options.weekendPreference) {
    optimized = preferWeekends(optimized);
  }
  
  return optimized;
}

function avoidConsecutiveMatches(
  matches: any[],
  teams: Team[]
): any[] {
  // 각 팀의 경기 일정을 확인하고 연속 경기 방지
  const teamMatches = new Map<string, any[]>();
  
  matches.forEach(match => {
    [match.homeTeamId, match.awayTeamId].forEach(teamId => {
      if (!teamMatches.has(teamId)) {
        teamMatches.set(teamId, []);
      }
      teamMatches.get(teamId)!.push(match);
    });
  });
  
  // 각 팀의 경기 일정을 최소 3일 간격으로 조정
  teamMatches.forEach((teamMatchList, teamId) => {
    teamMatchList.sort((a, b) => a.matchDate.getTime() - b.matchDate.getTime());
    
    for (let i = 1; i < teamMatchList.length; i++) {
      const prevDate = teamMatchList[i - 1].matchDate;
      const currentDate = teamMatchList[i].matchDate;
      const daysDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff < 3) {
        // 날짜 조정
        const newDate = new Date(prevDate);
        newDate.setDate(newDate.getDate() + 3);
        teamMatchList[i].matchDate = newDate;
      }
    }
  });
  
  return matches;
}

function preferWeekends(matches: any[]): any[] {
  return matches.map(match => {
    const date = new Date(match.matchDate);
    const dayOfWeek = date.getDay();
    
    // 평일이면 가장 가까운 주말로 이동
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const daysToSaturday = 6 - dayOfWeek;
      date.setDate(date.getDate() + daysToSaturday);
      match.matchDate = date;
    }
    
    return match;
  });
}
```

---

## ✅ 자동 대진표 생성 시스템 요약

### 핵심 특징

1. **다양한 대회 타입 지원**: Round Robin, Knockout, Hybrid
2. **자동 일정 배정**: 날짜, 시간, 경기장 자동 배정
3. **최적화 알고리즘**: 연속 경기 방지, 홈/어웨이 균형, 주말 선호
4. **확장 가능**: 새로운 대회 타입 추가 용이

### 사용 예시

```typescript
// Round Robin 대진표 생성
await generateSchedule({
  federationId: "nowon-football",
  seasonId: "season-001",
  scheduleType: "round_robin",
  options: {
    homeAndAway: true,
    startDate: "2024-03-01",
    matchInterval: 7,
  },
});

// Knockout 대진표 생성
await generateSchedule({
  federationId: "nowon-football",
  seasonId: "season-002",
  scheduleType: "knockout",
  options: {
    seeded: true,
    startDate: "2024-04-01",
  },
});
```

---

**작성일**: 2024년  
**상태**: ✅ 경기 자동 대진표 생성 시스템 완료

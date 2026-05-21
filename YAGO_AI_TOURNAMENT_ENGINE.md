# ⚽ YAGO VIBE SPORTS - AI 자동 대진표 생성 엔진 (AI Tournament Engine)

> **작성일**: 2024년  
> **목적**: 대회 운영 전체를 자동화하는 AI 엔진 - 참가팀 등록부터 다음 라운드 자동 연결까지

---

## 📋 목차

1. [AI Tournament Engine 전체 구조](#1-ai-tournament-engine-전체-구조)
2. [대회 생성 입력값](#2-대회-생성-입력값)
3. [AI 포맷 추천 시스템](#3-ai-포맷-추천-시스템)
4. [조 편성 알고리즘](#4-조-편성-알고리즘)
5. [리그전 생성 알고리즘](#5-리그전-생성-알고리즘)
6. [토너먼트 브래킷 생성](#6-토너먼트-브래킷-생성)
7. [경기 일정 자동 생성](#7-경기-일정-자동-생성)
8. [경기 결과 자동 반영](#8-경기-결과-자동-반영)
9. [순위 계산 로직](#9-순위-계산-로직)
10. [AI 운영 보조 기능](#10-ai-운영-보조-기능)
11. [관리자 UI 구조](#11-관리자-ui-구조)
12. [데이터 구조](#12-데이터-구조)

---

## 1️⃣ AI Tournament Engine 전체 구조

### 전체 흐름

```
Tournament Creation
   ↓
Team Registration
   ↓
AI Format Recommendation
   ↓
Group Draw / Seeding
   ↓
Bracket Generation
   ↓
Match Schedule Generation
   ↓
Venue & Time Allocation
   ↓
Match Results
   ↓
Standings Update
   ↓
Next Round Auto Advancement
```

### 핵심 원칙

1. **AI 초안 생성 + 관리자 검수**: AI가 제안하고 관리자가 최종 결정
2. **운영 친화적**: 실제 협회 운영에 최적화된 포맷 추천
3. **완전 자동화**: 반복 작업은 최대한 자동화
4. **실시간 반영**: 결과 입력 시 즉시 순위/브래킷 업데이트

---

## 2️⃣ 대회 생성 입력값

### 최소 필수 정보

```typescript
interface TournamentBasicInput {
  name: string;                    // 대회명
  sportType: "football" | "futsal" | ...;
  competitionType: "league" | "tournament" | "hybrid";
  teamCount: number;               // 참가팀 수
  venues: Venue[];                 // 경기장 목록
  startDate: Date;                 // 시작일
  endDate: Date;                   // 종료일
  ageGroups: string[];             // 부/연령 구분
  gender: "men" | "women" | "mixed";
}
```

### 추가 옵션

```typescript
interface TournamentAdvancedOptions {
  // 조별 리그 옵션
  useGroups: boolean;
  groupCount?: number;
  teamsPerGroup?: number;
  advancingTeamsPerGroup?: number;
  
  // 토너먼트 옵션
  useSeeding: boolean;
  seedingRules?: SeedingRule[];
  thirdPlaceMatch: boolean;
  
  // 경기 규칙
  allowDraw: boolean;
  penaltyShootout: boolean;
  matchDuration: number;           // 분
  breakDuration: number;           // 분
  
  // 일정 옵션
  maxMatchesPerDay: number;
  maxMatchesPerTeamPerDay: number;
  minRestMinutes: number;          // 팀 휴식 최소 간격
  weekendOnly: boolean;
  preferredTimes: {
    youth: "morning" | "afternoon";
    adult: "morning" | "afternoon";
  };
}
```

---

## 3️⃣ AI 포맷 추천 시스템

### 추천 로직

```typescript
interface FormatRecommendation {
  format: "round_robin" | "knockout" | "hybrid";
  reason: string;
  estimatedMatches: number;
  estimatedDays: number;
  feasibility: "feasible" | "tight" | "impossible";
  operationalScore: number;
  config?: HybridConfig;
}

async function recommendFormat(
  teamCount: number,
  availableDays: number,
  venues: Venue[]
): Promise<FormatRecommendation[]> {
  const recommendations: FormatRecommendation[] = [];
  
  // 1. 팀 수 기반 기본 추천
  if (teamCount <= 4) {
    recommendations.push({
      format: "round_robin",
      reason: "팀 수가 적어 풀리그가 가장 적합합니다.",
      estimatedMatches: (teamCount * (teamCount - 1)) / 2,
      estimatedDays: Math.ceil((teamCount * (teamCount - 1)) / 2 / (venues.length * 3)),
      feasibility: "feasible",
      operationalScore: 100,
    });
  } else if (teamCount <= 6) {
    recommendations.push({
      format: "round_robin",
      reason: "6팀 이하이므로 풀리그를 추천합니다.",
      estimatedMatches: (teamCount * (teamCount - 1)) / 2,
      estimatedDays: Math.ceil((teamCount * (teamCount - 1)) / 2 / (venues.length * 3)),
      feasibility: calculateFeasibility(teamCount, availableDays),
      operationalScore: 95,
    });
  } else if (teamCount === 8) {
    recommendations.push({
      format: "knockout",
      reason: "8팀이므로 8강 토너먼트가 적합합니다.",
      estimatedMatches: 7,
      estimatedDays: 3,
      feasibility: "feasible",
      operationalScore: 90,
    });
  } else if (teamCount <= 12) {
    // 조별리그 + 토너먼트 추천
    const groups = 3;
    const teamsPerGroup = Math.ceil(teamCount / groups);
    const advancingTeams = 2;
    
    recommendations.push({
      format: "hybrid",
      reason: `${groups}개 조 조별리그 후 ${advancingTeams * groups}강 토너먼트가 적합합니다.`,
      estimatedMatches: calculateHybridMatches(teamCount, groups, advancingTeams),
      estimatedDays: calculateHybridDays(teamCount, groups, advancingTeams, venues.length),
      feasibility: "feasible",
      operationalScore: 95,
      config: {
        groups,
        teamsPerGroup,
        advancingTeams,
      },
    });
  } else if (teamCount <= 16) {
    // 4개 조 조별리그 + 8강 토너먼트
    const groups = 4;
    const teamsPerGroup = Math.ceil(teamCount / groups);
    const advancingTeams = 2;
    
    recommendations.push({
      format: "hybrid",
      reason: `${groups}개 조 조별리그 후 ${advancingTeams * groups}강 토너먼트가 가장 적합합니다.`,
      estimatedMatches: calculateHybridMatches(teamCount, groups, advancingTeams),
      estimatedDays: calculateHybridDays(teamCount, groups, advancingTeams, venues.length),
      feasibility: "feasible",
      operationalScore: 100,
      config: {
        groups,
        teamsPerGroup,
        advancingTeams,
      },
    });
  } else {
    // 대규모는 조별리그 필수
    const groups = Math.ceil(teamCount / 4);
    const teamsPerGroup = Math.ceil(teamCount / groups);
    const advancingTeams = 2;
    
    recommendations.push({
      format: "hybrid",
      reason: `대규모 대회이므로 ${groups}개 조 조별리그 후 토너먼트를 추천합니다.`,
      estimatedMatches: calculateHybridMatches(teamCount, groups, advancingTeams),
      estimatedDays: calculateHybridDays(teamCount, groups, advancingTeams, venues.length),
      feasibility: calculateFeasibility(teamCount, availableDays),
      operationalScore: 90,
      config: {
        groups,
        teamsPerGroup,
        advancingTeams,
      },
    });
  }
  
  // 2. 기간 고려 최적화
  recommendations.forEach(rec => {
    if (rec.estimatedDays > availableDays) {
      rec.feasibility = "impossible";
      rec.operationalScore -= 50;
    } else if (rec.estimatedDays > availableDays * 0.8) {
      rec.feasibility = "tight";
      rec.operationalScore -= 20;
    }
  });
  
  // 3. 운영 편의성 점수 계산
  recommendations.forEach(rec => {
    rec.operationalScore = calculateOperationalScore(rec, venues, availableDays);
  });
  
  // 점수순 정렬
  return recommendations.sort((a, b) => b.operationalScore - a.operationalScore);
}

function calculateHybridMatches(
  teamCount: number,
  groups: number,
  advancingTeams: number
): number {
  const teamsPerGroup = Math.ceil(teamCount / groups);
  
  // 조별 경기 수
  const groupMatches = groups * (teamsPerGroup * (teamsPerGroup - 1)) / 2;
  
  // 토너먼트 경기 수
  const knockoutTeams = groups * advancingTeams;
  const knockoutMatches = knockoutTeams - 1;
  
  return groupMatches + knockoutMatches;
}

function calculateHybridDays(
  teamCount: number,
  groups: number,
  advancingTeams: number,
  venueCount: number
): number {
  const matches = calculateHybridMatches(teamCount, groups, advancingTeams);
  const matchesPerDay = venueCount * 3; // 경기장당 하루 3경기 가정
  return Math.ceil(matches / matchesPerDay);
}

function calculateOperationalScore(
  recommendation: FormatRecommendation,
  venues: Venue[],
  availableDays: number
): number {
  let score = 100;
  
  // 기간 여유도
  const daysMargin = availableDays - recommendation.estimatedDays;
  if (daysMargin < 0) {
    score -= 50; // 기간 부족
  } else if (daysMargin < 2) {
    score -= 20; // 여유 부족
  } else {
    score += 10; // 여유 있음
  }
  
  // 경기 수 적정성
  const avgMatchesPerDay = recommendation.estimatedMatches / recommendation.estimatedDays;
  const maxMatchesPerDay = venues.length * 3;
  if (avgMatchesPerDay > maxMatchesPerDay) {
    score -= 30; // 하루 경기 수 과다
  }
  
  // 포맷 복잡도
  if (recommendation.format === "hybrid") {
    score += 10; // 조별리그+토너먼트는 운영 편의성 높음
  } else if (recommendation.format === "round_robin") {
    score += 5; // 풀리그는 단순함
  }
  
  return Math.max(0, Math.min(100, score));
}
```

### 추천 결과 예시

```json
{
  "teamCount": 16,
  "availableDays": 10,
  "recommendations": [
    {
      "format": "hybrid",
      "reason": "16팀이므로 4개 조 조별리그 후 8강 토너먼트가 가장 적합합니다.",
      "estimatedMatches": 28,
      "estimatedDays": 4,
      "feasibility": "feasible",
      "operationalScore": 100,
      "config": {
        "groups": 4,
        "teamsPerGroup": 4,
        "advancingTeams": 2
      }
    },
    {
      "format": "round_robin",
      "reason": "풀리그도 가능하나 경기 수가 많아 기간이 부족할 수 있습니다.",
      "estimatedMatches": 120,
      "estimatedDays": 40,
      "feasibility": "impossible",
      "operationalScore": 30
    }
  ]
}
```

---

## 4️⃣ 조 편성 알고리즘

### 랜덤 추첨

```typescript
function randomDraw(teams: Team[]): Team[] {
  const shuffled = [...teams];
  
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}
```

### 시드 기반 배정

```typescript
interface SeedingRule {
  type: "previous_rank" | "region" | "custom";
  priority: number;
}

function seedBasedDraw(
  teams: Team[],
  groups: number,
  seedingRules: SeedingRule[]
): Group[] {
  // 1. 시드 점수 계산
  const seededTeams = teams.map(team => ({
    ...team,
    seedScore: calculateSeedScore(team, seedingRules),
  })).sort((a, b) => b.seedScore - a.seedScore);
  
  // 2. 포트 시스템으로 분배
  const groupsArray: Group[] = [];
  for (let i = 0; i < groups; i++) {
    groupsArray.push({
      id: `group-${String.fromCharCode(65 + i)}`,
      name: `${String.fromCharCode(65 + i)}조`,
      teams: [],
    });
  }
  
  // 포트별 배정
  seededTeams.forEach((team, index) => {
    const groupIndex = index % groups;
    groupsArray[groupIndex].teams.push(team);
  });
  
  return groupsArray;
}

function calculateSeedScore(team: Team, rules: SeedingRule[]): number {
  let score = 0;
  
  rules.forEach(rule => {
    switch (rule.type) {
      case "previous_rank":
        if (team.previousRank) {
          score += (100 - team.previousRank) * rule.priority;
        }
        break;
      case "region":
        // 지역 기반 시드 (같은 지역 분산)
        score += team.regionCode * rule.priority;
        break;
      case "custom":
        if (team.customSeed) {
          score += team.customSeed * rule.priority;
        }
        break;
    }
  });
  
  return score;
}
```

### 지역 분산 배정

```typescript
function regionBalancedDraw(
  teams: Team[],
  groups: number
): Group[] {
  // 지역별로 팀 분류
  const teamsByRegion = new Map<string, Team[]>();
  teams.forEach(team => {
    const region = team.region || "기타";
    if (!teamsByRegion.has(region)) {
      teamsByRegion.set(region, []);
    }
    teamsByRegion.get(region)!.push(team);
  });
  
  // 조 초기화
  const groupsArray: Group[] = [];
  for (let i = 0; i < groups; i++) {
    groupsArray.push({
      id: `group-${String.fromCharCode(65 + i)}`,
      name: `${String.fromCharCode(65 + i)}조`,
      teams: [],
    });
  }
  
  // 지역별로 순환 배정
  let groupIndex = 0;
  const maxIterations = Math.max(...Array.from(teamsByRegion.values()).map(t => t.length));
  
  for (let i = 0; i < maxIterations; i++) {
    teamsByRegion.forEach((regionTeams, region) => {
      if (i < regionTeams.length) {
        groupsArray[groupIndex % groups].teams.push(regionTeams[i]);
        groupIndex++;
      }
    });
  }
  
  return groupsArray;
}
```

---

## 5️⃣ 리그전 생성 알고리즘

### Round Robin 알고리즘

```typescript
function generateRoundRobin(teams: Team[], homeAndAway: boolean = true): Match[] {
  const matches: Match[] = [];
  const teamCount = teams.length;
  
  // 홀수 팀 처리
  const isOdd = teamCount % 2 === 1;
  const workingTeams = isOdd ? [...teams, { id: "BYE", name: "BYE" }] : teams;
  const n = workingTeams.length;
  
  // 라운드 수 계산
  const totalRounds = homeAndAway ? (n - 1) * 2 : n - 1;
  
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
        const isHomeAwaySwap = homeAndAway && round > (n - 1);
        
        matches.push({
          id: `match-${matchNumber}`,
          round,
          homeTeamId: isHomeAwaySwap ? awayTeam.id : homeTeam.id,
          awayTeamId: isHomeAwaySwap ? homeTeam.id : awayTeam.id,
          homeTeamName: isHomeAwaySwap ? awayTeam.name : homeTeam.name,
          awayTeamName: isHomeAwaySwap ? homeTeam.name : awayTeam.name,
          matchNumber: matchNumber++,
          status: "scheduled",
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

### 예시: 4팀 Round Robin

```
라운드 1:
  팀1 vs 팀4
  팀2 vs 팀3

라운드 2:
  팀1 vs 팀3
  팀4 vs 팀2

라운드 3:
  팀1 vs 팀2
  팀3 vs 팀4
```

---

## 6️⃣ 토너먼트 브래킷 생성

### 브래킷 생성 알고리즘

```typescript
interface BracketMatch {
  id: string;
  round: number;
  roundName: string;
  matchNumber: number;
  homeTeamId?: string;
  awayTeamId?: string;
  homeSource: string; // "A1" 또는 이전 매치 ID
  awaySource: string;
  nextMatchId?: string;
  status: "scheduled" | "live" | "completed";
  homeScore?: number;
  awayScore?: number;
}

function generateKnockoutBracket(
  teams: Team[],
  options: {
    seeded: boolean;
    thirdPlaceMatch: boolean;
  }
): BracketMatch[] {
  const bracketMatches: BracketMatch[] = [];
  const teamCount = teams.length;
  const rounds = Math.ceil(Math.log2(teamCount));
  
  // 시드 배정
  const seededTeams = options.seeded
    ? seedTeams(teams)
    : randomDraw(teams);
  
  // 첫 라운드 매치 생성
  let currentRoundMatches: BracketMatch[] = [];
  let matchNumber = 1;
  
  for (let i = 0; i < seededTeams.length; i += 2) {
    const match: BracketMatch = {
      id: `match-${matchNumber}`,
      round: 1,
      roundName: getRoundName(rounds, 1),
      matchNumber: matchNumber++,
      homeTeamId: seededTeams[i]?.id,
      awayTeamId: seededTeams[i + 1]?.id,
      homeSource: getTeamSource(seededTeams[i]),
      awaySource: getTeamSource(seededTeams[i + 1]),
      nextMatchId: undefined,
      status: "scheduled",
    };
    
    currentRoundMatches.push(match);
    bracketMatches.push(match);
  }
  
  // 다음 라운드 생성
  for (let round = 2; round <= rounds; round++) {
    const nextRoundMatches: BracketMatch[] = [];
    const matchesInRound = currentRoundMatches.length / 2;
    
    for (let i = 0; i < matchesInRound; i++) {
      const prevMatch1 = currentRoundMatches[i * 2];
      const prevMatch2 = currentRoundMatches[i * 2 + 1];
      
      const nextMatchId = round < rounds
        ? `match-${matchNumber + matchesInRound - i}`
        : undefined;
      
      const match: BracketMatch = {
        id: `match-${matchNumber}`,
        round,
        roundName: getRoundName(rounds, round),
        matchNumber: matchNumber++,
        homeSource: prevMatch1.id,
        awaySource: prevMatch2.id,
        nextMatchId,
        status: "scheduled",
      };
      
      nextRoundMatches.push(match);
      bracketMatches.push(match);
    }
    
    currentRoundMatches = nextRoundMatches;
  }
  
  // 3/4위전 추가
  if (options.thirdPlaceMatch && rounds >= 2) {
    const semiFinalMatches = bracketMatches.filter(m => m.round === rounds - 1);
    if (semiFinalMatches.length === 2) {
      const thirdPlaceMatch: BracketMatch = {
        id: `match-${matchNumber}`,
        round: rounds,
        roundName: "3/4위전",
        matchNumber: matchNumber++,
        homeSource: semiFinalMatches[0].id + "-loser",
        awaySource: semiFinalMatches[1].id + "-loser",
        status: "scheduled",
      };
      bracketMatches.push(thirdPlaceMatch);
    }
  }
  
  return bracketMatches;
}

function getRoundName(totalRounds: number, round: number): string {
  const roundNames: Record<number, string> = {
    1: "16강",
    2: "8강",
    3: "4강",
    4: "결승",
  };
  
  const roundIndex = totalRounds - round + 1;
  return roundNames[roundIndex] || `${round}라운드`;
}

function getTeamSource(team: Team | undefined): string {
  if (!team) return "TBD";
  // 조별리그에서 진출한 경우 "A1", "B2" 형식
  if (team.groupPosition) {
    return `${team.groupId}${team.groupPosition}`;
  }
  return team.id;
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

## 7️⃣ 경기 일정 자동 생성

### 일정 최적화 엔진

```typescript
interface ScheduleConstraint {
  maxMatchesPerDay: number;
  maxMatchesPerTeamPerDay: number;
  minRestMinutes: number;
  venueTimeSlots: Array<{
    venueId: string;
    venueName: string;
    availableTimes: string[]; // ["09:00", "10:30", "14:00", ...]
  }>;
  weekendOnly: boolean;
}

async function generateMatchSchedule(
  matches: Match[],
  constraints: ScheduleConstraint,
  startDate: Date,
  endDate: Date
): Promise<ScheduledMatch[]> {
  const scheduledMatches: ScheduledMatch[] = [];
  const teamScheduleMap = new Map<string, Date[]>(); // 팀별 경기 일정
  const venueScheduleMap = new Map<string, Date[]>(); // 경기장별 일정
  
  // 날짜 범위 계산
  const availableDates = getAvailableDates(startDate, endDate, constraints.weekendOnly);
  
  // 경기를 우선순위별로 정렬
  const prioritizedMatches = prioritizeMatches(matches);
  
  for (const match of prioritizedMatches) {
    let assigned = false;
    
    // 가능한 날짜와 시간대 탐색
    for (const date of availableDates) {
      if (assigned) break;
      
      // 팀별 제약 확인
      const homeTeamDates = teamScheduleMap.get(match.homeTeamId) || [];
      const awayTeamDates = teamScheduleMap.get(match.awayTeamId) || [];
      
      // 같은 날 경기 수 확인
      const homeTeamMatchesOnDate = homeTeamDates.filter(d => 
        isSameDay(d, date)
      ).length;
      const awayTeamMatchesOnDate = awayTeamDates.filter(d => 
        isSameDay(d, date)
      ).length;
      
      if (
        homeTeamMatchesOnDate >= constraints.maxMatchesPerTeamPerDay ||
        awayTeamMatchesOnDate >= constraints.maxMatchesPerTeamPerDay
      ) {
        continue; // 하루 최대 경기 수 초과
      }
      
      // 휴식 시간 확인
      const lastHomeMatch = homeTeamDates[homeTeamDates.length - 1];
      const lastAwayMatch = awayTeamDates[awayTeamDates.length - 1];
      
      if (lastHomeMatch && getMinutesDiff(lastHomeMatch, date) < constraints.minRestMinutes) {
        continue;
      }
      if (lastAwayMatch && getMinutesDiff(lastAwayMatch, date) < constraints.minRestMinutes) {
        continue;
      }
      
      // 경기장 및 시간대 배정
      for (const venueSlot of constraints.venueTimeSlots) {
        const venueDates = venueScheduleMap.get(venueSlot.venueId) || [];
        const availableTimes = venueSlot.availableTimes.filter(time => {
          const matchDateTime = combineDateAndTime(date, time);
          return !venueDates.some(d => isOverlapping(d, matchDateTime, 90)); // 90분 경기 가정
        });
        
        if (availableTimes.length > 0) {
          // 첫 번째 가능한 시간대 선택
          const selectedTime = availableTimes[0];
          const matchDateTime = combineDateAndTime(date, selectedTime);
          
          // 배정
          scheduledMatches.push({
            ...match,
            matchDate: matchDateTime,
            venueId: venueSlot.venueId,
            venueName: venueSlot.venueName,
            matchTime: selectedTime,
            status: "scheduled",
          });
          
          // 스케줄 맵 업데이트
          teamScheduleMap.set(match.homeTeamId, [...homeTeamDates, matchDateTime]);
          teamScheduleMap.set(match.awayTeamId, [...awayTeamDates, matchDateTime]);
          venueScheduleMap.set(venueSlot.venueId, [...venueDates, matchDateTime]);
          
          assigned = true;
          break;
        }
      }
    }
    
    if (!assigned) {
      console.warn(`경기 배정 실패: ${match.homeTeamName} vs ${match.awayTeamName}`);
    }
  }
  
  return scheduledMatches;
}

function prioritizeMatches(matches: Match[]): Match[] {
  return matches.sort((a, b) => {
    // 조별 경기를 우선 (토너먼트보다 먼저)
    if (a.groupId && !b.groupId) return -1;
    if (!a.groupId && b.groupId) return 1;
    
    // 라운드 순서
    if (a.round !== b.round) return a.round - b.round;
    
    // 매치 번호
    return a.matchNumber - b.matchNumber;
  });
}

function getAvailableDates(
  start: Date,
  end: Date,
  weekendOnly: boolean
): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  
  while (current <= end) {
    if (weekendOnly) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        dates.push(new Date(current));
      }
    } else {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

function isOverlapping(date1: Date, date2: Date, durationMinutes: number): boolean {
  const diff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60);
  return diff < durationMinutes;
}
```

---

## 8️⃣ 경기 결과 자동 반영

### 결과 처리 플로우

```typescript
async function processMatchResult(
  matchId: string,
  result: MatchResult
): Promise<void> {
  // 1. 경기 결과 업데이트
  await updateMatch(matchId, {
    status: "completed",
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    events: result.events,
    lineups: result.lineups,
  });
  
  // 2. 조별 순위 업데이트 (조별리그인 경우)
  if (result.groupId) {
    await updateGroupStandings(result.groupId);
  }
  
  // 3. 토너먼트 브래킷 업데이트 (토너먼트인 경우)
  if (result.bracketMatchId) {
    await updateBracket(result.bracketMatchId, result);
  }
  
  // 4. 선수 통계 업데이트
  await updatePlayerStats(matchId, result);
  
  // 5. 팀 통계 업데이트
  await updateTeamStats(matchId, result);
  
  // 6. Activity Feed 생성
  await createMatchActivity(matchId, result);
  
  // 7. 알림 발송
  await sendMatchResultNotifications(matchId, result);
}

async function updateBracket(
  bracketMatchId: string,
  result: MatchResult
): Promise<void> {
  const bracketMatch = await getBracketMatch(bracketMatchId);
  
  // 승자 결정
  const winnerId = result.homeScore > result.awayScore
    ? result.homeTeamId
    : result.awayTeamId;
  
  const loserId = result.homeScore > result.awayScore
    ? result.awayTeamId
    : result.homeTeamId;
  
  // 다음 라운드 매치 업데이트
  if (bracketMatch.nextMatchId) {
    const nextMatch = await getBracketMatch(bracketMatch.nextMatchId);
    
    // 홈/어웨이 팀 배정
    if (nextMatch.homeSource === bracketMatchId) {
      nextMatch.homeTeamId = winnerId;
    } else if (nextMatch.awaySource === bracketMatchId) {
      nextMatch.awayTeamId = winnerId;
    }
    
    await updateBracketMatch(nextMatch.id, nextMatch);
    
    // 다음 매치가 준비되었는지 확인 (양쪽 팀이 모두 확정되면)
    if (nextMatch.homeTeamId && nextMatch.awayTeamId) {
      await scheduleBracketMatch(nextMatch.id);
    }
  }
  
  // 3/4위전 처리
  if (bracketMatch.roundName === "4강" && result.tournament.thirdPlaceMatch) {
    const thirdPlaceMatch = await findThirdPlaceMatch(bracketMatch.tournamentId);
    if (thirdPlaceMatch) {
      // 패자 팀 배정
      if (thirdPlaceMatch.homeSource.includes("loser")) {
        thirdPlaceMatch.homeTeamId = loserId;
      } else if (thirdPlaceMatch.awaySource.includes("loser")) {
        thirdPlaceMatch.awayTeamId = loserId;
      }
      await updateBracketMatch(thirdPlaceMatch.id, thirdPlaceMatch);
    }
  }
}
```

---

## 9️⃣ 순위 계산 로직

### 순위 계산 알고리즘

```typescript
interface TeamStanding {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string[]; // ["W", "W", "L", "D", "W"]
  headToHead?: Record<string, number>; // 상대전적
}

async function calculateStandings(
  groupId: string,
  matches: Match[]
): Promise<TeamStanding[]> {
  const teamStats = new Map<string, TeamStanding>();
  
  // 초기화
  const teams = await getGroupTeams(groupId);
  teams.forEach(team => {
    teamStats.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
      headToHead: {},
    });
  });
  
  // 완료된 경기 결과 반영
  matches
    .filter(m => m.status === "completed" && m.groupId === groupId)
    .forEach(match => {
      const homeStats = teamStats.get(match.homeTeamId)!;
      const awayStats = teamStats.get(match.awayTeamId)!;
      
      homeStats.played++;
      awayStats.played++;
      
      homeStats.goalsFor += match.homeScore || 0;
      homeStats.goalsAgainst += match.awayScore || 0;
      awayStats.goalsFor += match.awayScore || 0;
      awayStats.goalsAgainst += match.homeScore || 0;
      
      // 승점 계산
      if (match.homeScore! > match.awayScore!) {
        homeStats.wins++;
        homeStats.points += 3;
        homeStats.form.push("W");
        awayStats.losses++;
        awayStats.form.push("L");
      } else if (match.homeScore! < match.awayScore!) {
        awayStats.wins++;
        awayStats.points += 3;
        awayStats.form.push("W");
        homeStats.losses++;
        homeStats.form.push("L");
      } else {
        homeStats.draws++;
        homeStats.points += 1;
        homeStats.form.push("D");
        awayStats.draws++;
        awayStats.points += 1;
        awayStats.form.push("D");
      }
      
      // 상대전적 기록
      homeStats.headToHead![match.awayTeamId] = (homeStats.headToHead![match.awayTeamId] || 0) + 
        (match.homeScore! > match.awayScore! ? 1 : match.homeScore! === match.awayScore! ? 0 : -1);
      awayStats.headToHead![match.homeTeamId] = (awayStats.headToHead![match.homeTeamId] || 0) + 
        (match.awayScore! > match.homeScore! ? 1 : match.awayScore! === match.homeScore! ? 0 : -1);
    });
  
  // 골득실 계산
  teamStats.forEach(stats => {
    stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
    // 최근 5경기만 표시
    stats.form = stats.form.slice(-5);
  });
  
  // 순위 정렬
  const standings = Array.from(teamStats.values()).sort((a, b) => {
    // 1순위: 승점
    if (b.points !== a.points) return b.points - a.points;
    
    // 2순위: 골득실
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    
    // 3순위: 득점
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    
    // 4순위: 상대전적
    const headToHead = a.headToHead![b.teamId] || 0;
    if (headToHead !== 0) return -headToHead;
    
    // 5순위: 승수
    return b.wins - a.wins;
  });
  
  // 순위 업데이트
  standings.forEach((stats, index) => {
    stats.rank = index + 1;
  });
  
  return standings;
}
```

---

## 🔟 AI 운영 보조 기능

### 일정 충돌 감지

```typescript
interface Conflict {
  type: "too_many_matches" | "venue_time_conflict" | "insufficient_rest";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  matches: string[];
}

async function detectScheduleConflicts(
  tournamentId: string
): Promise<Conflict[]> {
  const matches = await getTournamentMatches(tournamentId);
  const conflicts: Conflict[] = [];
  
  // 1. 같은 팀 하루 3경기 이상
  const teamMatchesByDate = new Map<string, Map<string, Match[]>>();
  matches.forEach(match => {
    [match.homeTeamId, match.awayTeamId].forEach(teamId => {
      const dateKey = formatDate(match.matchDate);
      if (!teamMatchesByDate.has(teamId)) {
        teamMatchesByDate.set(teamId, new Map());
      }
      const dateMap = teamMatchesByDate.get(teamId)!;
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(match);
    });
  });
  
  teamMatchesByDate.forEach((dateMap, teamId) => {
    dateMap.forEach((matches, date) => {
      if (matches.length > 2) {
        conflicts.push({
          type: "too_many_matches",
          severity: "high",
          message: `${getTeamName(teamId)}가 ${date}에 ${matches.length}경기를 배정받았습니다.`,
          matches: matches.map(m => m.id),
        });
      }
    });
  });
  
  // 2. 같은 경기장 시간 중복
  const venueMatchesByTime = new Map<string, Map<string, Match[]>>();
  matches.forEach(match => {
    const venueId = match.venueId;
    const timeKey = formatDateTime(match.matchDate);
    if (!venueMatchesByTime.has(venueId)) {
      venueMatchesByTime.set(venueId, new Map());
    }
    const timeMap = venueMatchesByTime.get(venueId)!;
    if (!timeMap.has(timeKey)) {
      timeMap.set(timeKey, []);
    }
    timeMap.get(timeKey)!.push(match);
  });
  
  venueMatchesByTime.forEach((timeMap, venueId) => {
    timeMap.forEach((matches, time) => {
      if (matches.length > 1) {
        conflicts.push({
          type: "venue_time_conflict",
          severity: "critical",
          message: `${getVenueName(venueId)}에서 ${time}에 ${matches.length}경기가 중복 배정되었습니다.`,
          matches: matches.map(m => m.id),
        });
      }
    });
  });
  
  // 3. 휴식 시간 부족
  matches.forEach(match => {
    const homeTeamMatches = getTeamMatches(match.homeTeamId);
    const awayTeamMatches = getTeamMatches(match.awayTeamId);
    
    const lastHomeMatch = homeTeamMatches
      .filter(m => m.matchDate < match.matchDate)
      .sort((a, b) => b.matchDate.getTime() - a.matchDate.getTime())[0];
    
    const lastAwayMatch = awayTeamMatches
      .filter(m => m.matchDate < match.matchDate)
      .sort((a, b) => b.matchDate.getTime() - a.matchDate.getTime())[0];
    
    if (lastHomeMatch) {
      const restMinutes = getMinutesDiff(lastHomeMatch.matchDate, match.matchDate);
      if (restMinutes < 90) {
        conflicts.push({
          type: "insufficient_rest",
          severity: "medium",
          message: `${getTeamName(match.homeTeamId)}의 휴식 시간이 ${restMinutes}분으로 부족합니다.`,
          matches: [lastHomeMatch.id, match.id],
        });
      }
    }
    
    if (lastAwayMatch) {
      const restMinutes = getMinutesDiff(lastAwayMatch.matchDate, match.matchDate);
      if (restMinutes < 90) {
        conflicts.push({
          type: "insufficient_rest",
          severity: "medium",
          message: `${getTeamName(match.awayTeamId)}의 휴식 시간이 ${restMinutes}분으로 부족합니다.`,
          matches: [lastAwayMatch.id, match.id],
        });
      }
    }
  });
  
  return conflicts;
}
```

### 결과 누락 감지

```typescript
async function detectMissingResults(
  tournamentId: string
): Promise<MissingResult[]> {
  const today = new Date();
  const matches = await getTournamentMatches(tournamentId);
  
  const missingResults: MissingResult[] = [];
  
  // 오늘 완료 예정인 경기 중 결과 미입력
  const todayMatches = matches.filter(m => 
    isSameDay(m.matchDate, today) &&
    m.status === "scheduled" &&
    getTimeFromDate(m.matchDate) < getCurrentTime()
  );
  
  todayMatches.forEach(match => {
    missingResults.push({
      matchId: match.id,
      matchName: `${match.homeTeamName} vs ${match.awayTeamName}`,
      scheduledTime: getTimeFromDate(match.matchDate),
      hoursSinceScheduled: getHoursDiff(match.matchDate, today),
    });
  });
  
  // 어제 완료 예정이었던 경기 중 결과 미입력
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const yesterdayMatches = matches.filter(m =>
    isSameDay(m.matchDate, yesterday) &&
    m.status === "scheduled"
  );
  
  yesterdayMatches.forEach(match => {
    missingResults.push({
      matchId: match.id,
      matchName: `${match.homeTeamName} vs ${match.awayTeamName}`,
      scheduledTime: getTimeFromDate(match.matchDate),
      hoursSinceScheduled: getHoursDiff(match.matchDate, today),
      isOverdue: true,
    });
  });
  
  return missingResults;
}
```

---

## 1️⃣1️⃣ 관리자 UI 구조

### 라우팅 구조

```
/admin/tournaments
  ├─ /new (대회 생성)
  ├─ /[tournamentId]
  │   ├─ /index (대회 개요)
  │   ├─ /draw (조 추첨)
  │   ├─ /schedule (일정 생성)
  │   ├─ /bracket (대진표)
  │   └─ /operations (운영 현황)
```

### 주요 페이지

#### 대회 생성 페이지
- 기본 정보 입력
- AI 포맷 추천 표시
- 포맷 선택
- 운영 옵션 설정

#### 조 추첨 페이지
- AI 추천 조 편성 표시
- 수동 조 편성
- 시드 배정 옵션
- 추첨 실행

#### 일정 생성 페이지
- AI 생성 일정 표시
- 충돌 감지 결과
- 수동 조정
- 일정 확정

#### 대진표 페이지
- 조별 순위 표시
- 토너먼트 브래킷 시각화
- 결과 입력
- 다음 라운드 자동 연결

---

## 1️⃣2️⃣ 데이터 구조

### 추가 컬렉션

#### groups

```
federations/{federationId}/tournaments/{tournamentId}/groups/{groupId}
```

```typescript
{
  id: string;
  tournamentId: string;
  name: string; // "A조", "B조"
  teamIds: string[];
  advancingTeams: number;
  standings: TeamStanding[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### brackets

```
federations/{federationId}/tournaments/{tournamentId}/brackets/{bracketId}
```

```typescript
{
  id: string;
  tournamentId: string;
  round: number;
  roundName: string;
  matchNumber: number;
  homeTeamId?: string;
  awayTeamId?: string;
  homeSource: string;
  awaySource: string;
  nextMatchId?: string;
  status: "scheduled" | "live" | "completed";
  homeScore?: number;
  awayScore?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### scheduleJobs

```
federations/{federationId}/tournaments/{tournamentId}/scheduleJobs/{jobId}
```

```typescript
{
  id: string;
  tournamentId: string;
  status: "pending" | "processing" | "completed" | "failed";
  constraints: ScheduleConstraint;
  generatedMatches: number;
  conflicts: Conflict[];
  createdAt: Timestamp;
  completedAt?: Timestamp;
}
```

---

## ✅ AI Tournament Engine 요약

### 핵심 기능

1. **AI 포맷 추천**: 팀 수와 기간을 고려한 최적 포맷 제안
2. **자동 조 편성**: 시드 배정 및 지역 분산
3. **대진표 자동 생성**: Round Robin, Knockout, Hybrid 지원
4. **일정 최적화**: 경기장, 시간, 휴식 시간 고려
5. **결과 자동 반영**: 순위, 브래킷, 통계 자동 업데이트
6. **운영 보조**: 충돌 감지, 결과 누락 감지, 공지 자동 생성

### 경쟁력

이 엔진이 완성되면 YAGO는:
- **LeagueApps** (리그 운영)
- **Challonge** (토너먼트 브래킷)
- **SportEngine** (스포츠 관리)
- **AI 운영** (자동화)

를 합친 플랫폼이 됩니다.

---

**작성일**: 2024년  
**상태**: ✅ AI 자동 대진표 생성 엔진 완료

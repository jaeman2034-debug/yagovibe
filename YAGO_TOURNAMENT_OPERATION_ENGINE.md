# ⚽ YAGO VIBE SPORTS - AI 기반 대진표 생성 + 경기 운영 시스템

> **작성일**: 2024년  
> **목적**: 대회 엔진 - 참가팀 등록부터 결과 반영까지 전 과정 자동화

---

## 📋 목차

1. [시스템 개요](#1-시스템-개요)
2. [대회 유형별 지원](#2-대회-유형별-지원)
3. [대회 생성 입력](#3-대회-생성-입력)
4. [AI 포맷 추천 엔진](#4-ai-포맷-추천-엔진)
5. [조 편성 및 대진표 생성](#5-조-편성-및-대진표-생성)
6. [경기 일정 자동 배정](#6-경기-일정-자동-배정)
7. [경기 결과 자동 반영](#7-경기-결과-자동-반영)
8. [AI 운영 보조 기능](#8-ai-운영-보조-기능)
9. [관리자 화면 구조](#9-관리자-화면-구조)
10. [데이터 모델](#10-데이터-모델)

---

## 1️⃣ 시스템 개요

### 전체 플로우

```
참가팀 등록
  ↓
조 편성 (AI 추천)
  ↓
대진표 생성 (AI 자동)
  ↓
경기 일정 배정 (AI 최적화)
  ↓
경기장/시간 배정
  ↓
결과 입력
  ↓
순위/토너먼트 자동 반영
  ↓
홈페이지 자동 업데이트
```

### 핵심 원칙

1. **AI 초안 생성 + 관리자 검수**: AI가 제안하고 관리자가 최종 결정
2. **운영 친화적**: 실제 협회 운영에 최적화된 포맷 추천
3. **자동화 우선**: 반복 작업은 최대한 자동화
4. **종목별 템플릿**: 축구/풋살/야구/농구 등 종목별 규칙 적용

---

## 2️⃣ 대회 유형별 지원

### A. 리그전 (Round Robin)

**예시**:
- K7 리그
- 주말리그
- 유소년 정규리그

**방식**:
- 단일 라운드 로빈
- 홈앤어웨이
- 조별 리그

**생성 로직**:
```typescript
interface LeagueFormat {
  type: "round_robin";
  homeAndAway: boolean;
  groups?: number; // 조별 리그인 경우
  teamsPerGroup?: number;
}
```

---

### B. 토너먼트 (Knockout)

**예시**:
- 노원구청장기
- 협회장배
- 유소년 컵대회

**방식**:
- 16강 / 8강 / 4강 / 결승
- 3/4위전 선택
- 시드 배정

**생성 로직**:
```typescript
interface TournamentFormat {
  type: "knockout";
  rounds: number; // 16강=4, 8강=3, 4강=2
  thirdPlaceMatch: boolean;
  seeded: boolean;
  seedingRules?: SeedingRule[];
}
```

---

### C. 조별리그 + 토너먼트 (Hybrid)

**가장 많이 사용되는 형태**

**예시**:
- 조별 예선 (4개 조, 각 4팀)
- 상위 2팀 진출
- 8강 토너먼트

**생성 로직**:
```typescript
interface HybridFormat {
  type: "hybrid";
  groupStage: {
    groups: number;
    teamsPerGroup: number;
    format: "round_robin";
    advancingTeams: number; // 조별 진출팀 수
  };
  knockoutStage: {
    format: "knockout";
    rounds: number;
  };
}
```

---

### D. 혼합형 (Mixed)

**예시**:
- 부별 예선은 리그
- 결선은 토너먼트
- 일부 부는 풀리그
- 일부 부는 녹아웃

**생성 로직**:
```typescript
interface MixedFormat {
  type: "mixed";
  divisions: Array<{
    divisionName: string;
    format: "round_robin" | "knockout" | "hybrid";
    teams: string[];
  }>;
}
```

---

## 3️⃣ 대회 생성 입력

### 기본 정보

```typescript
interface TournamentBasicInfo {
  name: string;
  sportType: "football" | "futsal" | "basketball" | "baseball" | ...;
  category: "adult" | "youth" | "mixed";
  gender: "men" | "women" | "mixed";
  ageGroups: string[]; // ["U12", "U15", "성인"]
  startDate: Date;
  endDate: Date;
  registrationStart: Date;
  registrationEnd: Date;
  venues: Venue[]; // 경기장 목록
  expectedTeams: number;
}
```

### 운영 옵션

```typescript
interface TournamentOptions {
  format: "round_robin" | "knockout" | "hybrid" | "mixed";
  
  // 리그전 옵션
  leagueOptions?: {
    homeAndAway: boolean;
    groups?: number;
    teamsPerGroup?: number;
  };
  
  // 토너먼트 옵션
  tournamentOptions?: {
    rounds: number;
    thirdPlaceMatch: boolean;
    seeded: boolean;
    seedingRules?: SeedingRule[];
  };
  
  // 조별리그 옵션
  hybridOptions?: {
    groupStage: GroupStageConfig;
    knockoutStage: KnockoutStageConfig;
  };
  
  // 경기 규칙
  matchRules: {
    allowDraw: boolean;
    penaltyShootout: boolean;
    matchDuration: number; // 분
    breakDuration: number; // 분
  };
}
```

### 일정 옵션

```typescript
interface ScheduleOptions {
  maxMatchesPerDay: number;
  maxMatchesPerTeamPerDay: number;
  minRestMinutes: number; // 팀 휴식 최소 간격
  venueTimeSlots: Array<{
    venueId: string;
    availableTimes: string[]; // ["09:00", "10:30", "14:00", ...]
  }>;
  weekendOnly: boolean;
  preferredTimes: {
    youth: "morning"; // 유소년은 오전
    adult: "afternoon"; // 성인은 오후
  };
}
```

---

## 4️⃣ AI 포맷 추천 엔진

### 추천 로직

```typescript
async function recommendFormat(
  teams: Team[],
  options: TournamentBasicInfo
): Promise<FormatRecommendation[]> {
  const teamCount = teams.length;
  
  const recommendations: FormatRecommendation[] = [];
  
  // 1. 팀 수 기반 기본 추천
  if (teamCount <= 6) {
    recommendations.push({
      format: "round_robin",
      reason: "팀 수가 적어 풀리그가 가장 적합합니다.",
      estimatedMatches: (teamCount * (teamCount - 1)) / 2,
      estimatedDays: Math.ceil((teamCount * (teamCount - 1)) / 2 / 3),
    });
  } else if (teamCount <= 8) {
    recommendations.push({
      format: "knockout",
      reason: "8팀 이하이므로 토너먼트가 적합합니다.",
      estimatedMatches: teamCount - 1,
      estimatedDays: Math.ceil(Math.log2(teamCount)),
    });
  } else if (teamCount <= 16) {
    // 조별리그 + 토너먼트 추천
    const groups = 4;
    const teamsPerGroup = Math.ceil(teamCount / groups);
    const advancingTeams = 2;
    
    recommendations.push({
      format: "hybrid",
      reason: `${groups}개 조 조별리그 후 ${advancingTeams * groups}강 토너먼트가 적합합니다.`,
      estimatedMatches: calculateHybridMatches(teamCount, groups, advancingTeams),
      estimatedDays: calculateHybridDays(teamCount, groups, advancingTeams),
      hybridConfig: {
        groups,
        teamsPerGroup,
        advancingTeams,
      },
    });
  } else {
    // 대규모는 조별리그 필수
    const groups = Math.ceil(teamCount / 4);
    recommendations.push({
      format: "hybrid",
      reason: `대규모 대회이므로 ${groups}개 조 조별리그 후 토너먼트를 추천합니다.`,
      estimatedMatches: calculateHybridMatches(teamCount, groups, 2),
      estimatedDays: calculateHybridDays(teamCount, groups, 2),
      hybridConfig: {
        groups,
        teamsPerGroup: Math.ceil(teamCount / groups),
        advancingTeams: 2,
      },
    });
  }
  
  // 2. 기간 고려 최적화
  const availableDays = Math.ceil(
    (options.endDate.getTime() - options.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  recommendations.forEach(rec => {
    rec.feasibility = rec.estimatedDays <= availableDays ? "feasible" : "tight";
  });
  
  // 3. 운영 편의성 점수
  recommendations.forEach(rec => {
    rec.operationalScore = calculateOperationalScore(rec, options);
  });
  
  // 점수순 정렬
  return recommendations.sort((a, b) => b.operationalScore - a.operationalScore);
}

function calculateOperationalScore(
  recommendation: FormatRecommendation,
  options: TournamentBasicInfo
): number {
  let score = 100;
  
  // 기간 여유도
  const daysMargin = options.endDate.getTime() - options.startDate.getTime();
  const daysNeeded = recommendation.estimatedDays;
  if (daysNeeded > daysMargin) {
    score -= 50; // 기간 부족 시 감점
  }
  
  // 경기 수 적정성
  const avgMatchesPerDay = recommendation.estimatedMatches / daysNeeded;
  if (avgMatchesPerDay > options.venues.length * 3) {
    score -= 30; // 하루 경기 수 과다 시 감점
  }
  
  // 포맷 복잡도
  if (recommendation.format === "hybrid") {
    score += 10; // 조별리그+토너먼트는 운영 편의성 높음
  }
  
  return score;
}
```

### 추천 결과 예시

```json
{
  "recommendations": [
    {
      "format": "hybrid",
      "reason": "16팀이므로 4개 조 조별리그 후 8강 토너먼트가 가장 적합합니다.",
      "estimatedMatches": 28,
      "estimatedDays": 7,
      "feasibility": "feasible",
      "operationalScore": 95,
      "hybridConfig": {
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
      "feasibility": "tight",
      "operationalScore": 60
    }
  ]
}
```

---

## 5️⃣ 조 편성 및 대진표 생성

### 조 편성 로직

```typescript
interface Group {
  id: string;
  name: string;
  teams: Team[];
  matches: Match[];
}

async function createGroups(
  teams: Team[],
  config: HybridConfig
): Promise<Group[]> {
  const groups: Group[] = [];
  const shuffledTeams = [...teams];
  
  // 시드 배정이 있는 경우
  if (config.seeded) {
    const seededTeams = seedTeams(teams);
    return distributeSeededTeams(seededTeams, config.groups);
  }
  
  // 랜덤 추첨
  shuffleArray(shuffledTeams);
  
  // 조별 분배 (시드 배정 방식)
  for (let i = 0; i < config.groups; i++) {
    const groupTeams: Team[] = [];
    
    // 포트 시스템: 각 조에 순차적으로 배정
    for (let j = 0; j < config.teamsPerGroup; j++) {
      const teamIndex = i + j * config.groups;
      if (teamIndex < shuffledTeams.length) {
        groupTeams.push(shuffledTeams[teamIndex]);
      }
    }
    
    groups.push({
      id: `group-${String.fromCharCode(65 + i)}`, // A, B, C, D
      name: `${String.fromCharCode(65 + i)}조`,
      teams: groupTeams,
      matches: [],
    });
  }
  
  return groups;
}

function seedTeams(teams: Team[]): Team[] {
  // 이전 성적, 지역, 특이사항을 고려한 시드 배정
  return teams.sort((a, b) => {
    // 시드 점수 계산
    const scoreA = calculateSeedScore(a);
    const scoreB = calculateSeedScore(b);
    return scoreB - scoreA;
  });
}

function calculateSeedScore(team: Team): number {
  let score = 0;
  
  // 이전 성적
  if (team.previousRank) {
    score += (100 - team.previousRank) * 10;
  }
  
  // 지역 분산 (같은 지역 팀과 조기 대결 회피)
  // 이 부분은 조 편성 시 고려
  
  return score;
}

function distributeSeededTeams(
  seededTeams: Team[],
  groupCount: number
): Group[] {
  const groups: Group[] = [];
  
  // 포트 시스템으로 분배
  for (let i = 0; i < groupCount; i++) {
    groups.push({
      id: `group-${String.fromCharCode(65 + i)}`,
      name: `${String.fromCharCode(65 + i)}조`,
      teams: [],
      matches: [],
    });
  }
  
  // 시드 순서대로 조에 분배
  seededTeams.forEach((team, index) => {
    const groupIndex = index % groupCount;
    groups[groupIndex].teams.push(team);
  });
  
  return groups;
}
```

### 조별 대진표 생성

```typescript
async function generateGroupMatches(
  groups: Group[],
  options: TournamentOptions
): Promise<Match[]> {
  const allMatches: Match[] = [];
  
  for (const group of groups) {
    // Round Robin 알고리즘 적용
    const groupMatches = generateRoundRobin(
      group.teams,
      {
        homeAndAway: options.leagueOptions?.homeAndAway ?? false,
      }
    );
    
    // 그룹 정보 추가
    groupMatches.forEach(match => {
      match.groupId = group.id;
      match.groupName = group.name;
    });
    
    allMatches.push(...groupMatches);
    group.matches = groupMatches;
  }
  
  return allMatches;
}
```

### 토너먼트 브래킷 생성

```typescript
async function generateKnockoutBracket(
  advancingTeams: Team[],
  options: TournamentOptions
): Promise<BracketMatch[]> {
  const bracketMatches: BracketMatch[] = [];
  const rounds = Math.ceil(Math.log2(advancingTeams.length));
  
  // 첫 라운드 매치 생성
  let currentRoundMatches: BracketMatch[] = [];
  let matchNumber = 1;
  
  for (let i = 0; i < advancingTeams.length; i += 2) {
    const match: BracketMatch = {
      id: `match-${matchNumber}`,
      round: 1,
      roundName: getRoundName(rounds, 1),
      matchNumber: matchNumber++,
      homeTeamId: advancingTeams[i]?.id,
      awayTeamId: advancingTeams[i + 1]?.id,
      homeSource: `group-${getGroupOfTeam(advancingTeams[i])}-1`,
      awaySource: `group-${getGroupOfTeam(advancingTeams[i + 1])}-2`,
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
      
      const match: BracketMatch = {
        id: `match-${matchNumber}`,
        round,
        roundName: getRoundName(rounds, round),
        matchNumber: matchNumber++,
        homeSource: prevMatch1.id,
        awaySource: prevMatch2.id,
        nextMatchId: round < rounds ? `match-${matchNumber + matchesInRound - i}` : undefined,
        status: "scheduled",
      };
      
      nextRoundMatches.push(match);
      bracketMatches.push(match);
    }
    
    currentRoundMatches = nextRoundMatches;
  }
  
  // 3/4위전 추가
  if (options.tournamentOptions?.thirdPlaceMatch) {
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
  const roundNames = {
    1: "16강",
    2: "8강",
    3: "4강",
    4: "결승",
  };
  
  const roundIndex = totalRounds - round + 1;
  return roundNames[roundIndex as keyof typeof roundNames] || `${round}라운드`;
}
```

---

## 6️⃣ 경기 일정 자동 배정

### 일정 최적화 엔진

```typescript
interface ScheduleConstraint {
  maxMatchesPerDay: number;
  maxMatchesPerTeamPerDay: number;
  minRestMinutes: number;
  venueTimeSlots: VenueTimeSlot[];
  weekendOnly: boolean;
}

async function assignMatchSchedule(
  matches: Match[],
  constraints: ScheduleConstraint,
  options: TournamentBasicInfo
): Promise<ScheduledMatch[]> {
  const scheduledMatches: ScheduledMatch[] = [];
  const teamScheduleMap = new Map<string, Date[]>(); // 팀별 경기 일정
  const venueScheduleMap = new Map<string, Date[]>(); // 경기장별 일정
  
  // 날짜 범위 계산
  const startDate = options.startDate;
  const endDate = options.endDate;
  const availableDates = getAvailableDates(startDate, endDate, constraints.weekendOnly);
  
  // 경기를 우선순위별로 정렬
  const prioritizedMatches = prioritizeMatches(matches, options);
  
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
          teamScheduleMap.set(match.homeTeamId, [
            ...homeTeamDates,
            matchDateTime,
          ]);
          teamScheduleMap.set(match.awayTeamId, [
            ...awayTeamDates,
            matchDateTime,
          ]);
          venueScheduleMap.set(venueSlot.venueId, [
            ...venueDates,
            matchDateTime,
          ]);
          
          assigned = true;
          break;
        }
      }
    }
    
    if (!assigned) {
      // 배정 실패 시 경고
      console.warn(`경기 배정 실패: ${match.homeTeamName} vs ${match.awayTeamName}`);
    }
  }
  
  return scheduledMatches;
}

function prioritizeMatches(
  matches: Match[],
  options: TournamentBasicInfo
): Match[] {
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
```

---

## 7️⃣ 경기 결과 자동 반영

### 결과 입력 후 자동 처리

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

async function updateGroupStandings(groupId: string): Promise<void> {
  const group = await getGroup(groupId);
  const matches = await getGroupMatches(groupId);
  
  // 각 팀의 통계 계산
  const teamStats = new Map<string, TeamStats>();
  
  group.teams.forEach(team => {
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
    });
  });
  
  // 완료된 경기 결과 반영
  matches
    .filter(m => m.status === "completed")
    .forEach(match => {
      const homeStats = teamStats.get(match.homeTeamId)!;
      const awayStats = teamStats.get(match.awayTeamId)!;
      
      homeStats.played++;
      awayStats.played++;
      
      homeStats.goalsFor += match.homeScore;
      homeStats.goalsAgainst += match.awayScore;
      awayStats.goalsFor += match.awayScore;
      awayStats.goalsAgainst += match.homeScore;
      
      if (match.homeScore > match.awayScore) {
        homeStats.wins++;
        homeStats.points += 3;
        awayStats.losses++;
      } else if (match.homeScore < match.awayScore) {
        awayStats.wins++;
        awayStats.points += 3;
        homeStats.losses++;
      } else {
        homeStats.draws++;
        homeStats.points += 1;
        awayStats.draws++;
        awayStats.points += 1;
      }
    });
  
  // 골득실 계산
  teamStats.forEach(stats => {
    stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
  });
  
  // 순위 정렬
  const standings = Array.from(teamStats.values()).sort((a, b) => {
    // 1순위: 승점
    if (b.points !== a.points) return b.points - a.points;
    // 2순위: 골득실
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    // 3순위: 득점
    return b.goalsFor - a.goalsFor;
  });
  
  // 순위 업데이트
  standings.forEach((stats, index) => {
    stats.rank = index + 1;
  });
  
  // Firestore 업데이트
  await updateGroupStandingsInFirestore(groupId, standings);
  
  // 진출팀 확인 (조별리그 + 토너먼트인 경우)
  const advancingTeams = standings.slice(0, group.advancingTeams || 2);
  await checkAndCreateKnockoutMatches(group, advancingTeams);
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
}
```

---

## 8️⃣ AI 운영 보조 기능

### A. 일정 충돌 감지

```typescript
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

### B. 규정 위반 감지

```typescript
async function detectRuleViolations(
  matchId: string,
  lineups: Lineup[]
): Promise<Violation[]> {
  const violations: Violation[] = [];
  const match = await getMatch(matchId);
  
  // 1. 연령 초과 선수
  lineups.forEach(lineup => {
    lineup.players.forEach(player => {
      if (player.age > match.maxAge) {
        violations.push({
          type: "age_violation",
          severity: "high",
          message: `${player.name}의 나이가 규정을 초과했습니다.`,
          playerId: player.id,
        });
      }
    });
  });
  
  // 2. 징계 선수 출전
  const suspendedPlayers = await getSuspendedPlayers(match.tournamentId);
  lineups.forEach(lineup => {
    lineup.players.forEach(player => {
      if (suspendedPlayers.some(sp => sp.playerId === player.id)) {
        violations.push({
          type: "suspension_violation",
          severity: "critical",
          message: `${player.name}는 징계 중인 선수입니다.`,
          playerId: player.id,
        });
      }
    });
  });
  
  // 3. 미등록 선수
  const registeredPlayers = await getRegisteredPlayers(match.tournamentId);
  lineups.forEach(lineup => {
    lineup.players.forEach(player => {
      if (!registeredPlayers.some(rp => rp.id === player.id)) {
        violations.push({
          type: "registration_violation",
          severity: "high",
          message: `${player.name}는 등록되지 않은 선수입니다.`,
          playerId: player.id,
        });
      }
    });
  });
  
  return violations;
}
```

### C. 공지 자동 생성

```typescript
async function generateAutoNotice(
  type: "schedule_change" | "result_update" | "advancement",
  data: any
): Promise<Notice> {
  let title = "";
  let content = "";
  
  switch (type) {
    case "schedule_change":
      title = "경기 일정 변경 안내";
      content = `
우천으로 인해 ${formatDate(data.originalDate)} 경기 일정이 변경되었습니다.

변경 일정:
${data.matches.map((m: Match) => 
  `${formatDate(m.matchDate)} ${m.matchTime} ${m.venueName}\n${m.homeTeamName} vs ${m.awayTeamName}`
).join("\n")}

문의: ${data.contactPhone}
      `;
      break;
      
    case "result_update":
      title = "경기 결과 업데이트";
      content = `
${data.match.homeTeamName} ${data.match.homeScore} : ${data.match.awayScore} ${data.match.awayTeamName}

득점자:
${data.goals.map((g: any) => `${g.playerName} (${g.minute}분)`).join("\n")}
      `;
      break;
      
    case "advancement":
      title = "다음 라운드 진출팀 확정";
      content = `
${data.groupName} 조별리그가 완료되었습니다.

진출팀:
${data.advancingTeams.map((t: Team) => `${t.rank}위 ${t.name}`).join("\n")}

다음 라운드 일정은 추후 공지하겠습니다.
      `;
      break;
  }
  
  return {
    title,
    content,
    category: "tournament",
    isPinned: type === "schedule_change",
    createdAt: new Date(),
  };
}
```

### D. 결과 누락 감지

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
    m.matchTime < getCurrentTime()
  );
  
  todayMatches.forEach(match => {
    missingResults.push({
      matchId: match.id,
      matchName: `${match.homeTeamName} vs ${match.awayTeamName}`,
      scheduledTime: match.matchTime,
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
      scheduledTime: match.matchTime,
      hoursSinceScheduled: getHoursDiff(match.matchDate, today),
      isOverdue: true,
    });
  });
  
  return missingResults;
}
```

---

## 9️⃣ 관리자 화면 구조

### 메뉴 구조

```
/admin/tournaments
  ├─ /new (대회 생성)
  ├─ /{id}
  │   ├─ /format (포맷 설정)
  │   ├─ /teams (참가팀 관리)
  │   ├─ /draw (조 추첨)
  │   ├─ /schedule (일정 생성)
  │   ├─ /bracket (대진표 보기)
  │   ├─ /results (결과 입력)
  │   ├─ /operations (운영 현황)
  │   └─ /reports (리포트)
```

### 주요 페이지

#### `/admin/tournaments/new`

```typescript
// 대회 생성 페이지
interface TournamentCreatePage {
  // Step 1: 기본 정보
  basicInfo: TournamentBasicInfo;
  
  // Step 2: 포맷 선택 (AI 추천 포함)
  formatRecommendations: FormatRecommendation[];
  selectedFormat: Format;
  
  // Step 3: 운영 옵션
  options: TournamentOptions;
  
  // Step 4: 일정 옵션
  scheduleOptions: ScheduleOptions;
}
```

#### `/admin/tournaments/{id}/draw`

```typescript
// 조 추첨 페이지
interface DrawPage {
  // AI 추천 조 편성
  recommendedGroups: Group[];
  
  // 수동 조 편성
  manualGroups: Group[];
  
  // 시드 배정 옵션
  seedingOptions: SeedingOptions;
}
```

#### `/admin/tournaments/{id}/schedule`

```typescript
// 일정 생성 페이지
interface SchedulePage {
  // AI 생성 일정
  aiGeneratedSchedule: ScheduledMatch[];
  
  // 충돌 감지 결과
  conflicts: Conflict[];
  
  // 수동 조정
  manualAdjustments: ScheduleAdjustment[];
}
```

---

## 🔟 데이터 모델

### 추가 컬렉션

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
  homeSource: string; // "A1" 또는 이전 매치 ID
  awaySource: string;
  nextMatchId?: string;
  status: "scheduled" | "live" | "completed";
  homeScore?: number;
  awayScore?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### groups

```
federations/{federationId}/tournaments/{tournamentId}/groups/{groupId}
```

```typescript
{
  id: string;
  tournamentId: string;
  name: string;
  teamIds: string[];
  advancingTeams: number;
  standings: TeamStanding[];
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

## ✅ 시스템 요약

### 핵심 기능

1. **AI 포맷 추천**: 팀 수와 기간을 고려한 최적 포맷 제안
2. **자동 조 편성**: 시드 배정 및 포트 시스템
3. **대진표 자동 생성**: Round Robin, Knockout, Hybrid 지원
4. **일정 최적화**: 경기장, 시간, 휴식 시간 고려
5. **결과 자동 반영**: 순위, 브래킷, 통계 자동 업데이트
6. **운영 보조**: 충돌 감지, 규정 위반 감지, 공지 자동 생성

### 확장성

- 종목별 템플릿 지원 (축구/풋살/야구/농구)
- 협회별 커스터마이징 가능
- 새로운 대회 포맷 추가 용이

---

**작성일**: 2024년  
**상태**: ✅ AI 기반 대진표 생성 + 경기 운영 시스템 완료

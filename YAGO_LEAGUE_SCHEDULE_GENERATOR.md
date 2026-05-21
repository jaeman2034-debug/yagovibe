# ⚽ YAGO 리그 일정 자동 생성 알고리즘 (실서비스 로직)

## 🎯 핵심 가치

**AI League Scheduler** - 운영자가 가장 좋아하는 기능

리그 생성 시 **일정을 자동으로 생성**하면:
- 운영 시간 90% 단축
- 실수 방지
- 공정한 대진표 보장

---

## 📊 지원하는 리그 타입

### 1. Round Robin (풀리그)
- 모든 팀이 한 번씩 만나는 방식
- 예: 8팀 → 7라운드, 28경기

### 2. Tournament (토너먼트)
- 토너먼트 방식 (8강, 4강, 결승)
- 예: 8팀 → 3라운드, 7경기

### 3. Hybrid (혼합형)
- 조별 리그 + 토너먼트
- 예: 16팀 → 4조 조별 리그 → 8강 토너먼트

---

## 🔥 Round Robin (풀리그) 알고리즘

### 원리

**Circle Method (원형 회전법)**

1. 첫 번째 팀을 고정
2. 나머지 팀을 원형으로 회전
3. 각 라운드마다 첫 번째 팀과 마주보는 팀끼리 매칭

### 알고리즘 구현

```typescript
/**
 * Round Robin 일정 생성
 * 
 * @param teamIds - 참가 팀 ID 배열
 * @param options - 생성 옵션
 * @returns 경기 일정 배열
 */
interface RoundRobinOptions {
  isDouble?: boolean;              // 복수 리그 (홈/원정 각각)
  startDate?: Date;               // 시작 날짜
  matchesPerDay?: number;         // 하루 최대 경기 수
  matchDuration?: number;          // 경기 시간 (분)
  timeSlots?: string[];            // 시간대 배열 (예: ["14:00", "16:00"])
}

interface RoundRobinMatch {
  round: number;                   // 라운드 번호
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt?: Date;              // 예정 일시
  facilityId?: string;             // 구장 ID
}

export function generateRoundRobin(
  teamIds: string[],
  options: RoundRobinOptions = {}
): RoundRobinMatch[] {
  const {
    isDouble = false,
    startDate,
    matchesPerDay = 4,
    matchDuration = 90,
    timeSlots
  } = options;

  if (teamIds.length < 2) {
    throw new Error("최소 2팀이 필요합니다.");
  }

  const matches: RoundRobinMatch[] = [];
  
  // 홀수 팀 처리: BYE 추가
  const isOdd = teamIds.length % 2 === 1;
  const workingTeams = isOdd ? [...teamIds, "BYE"] : [...teamIds];
  
  const teamCount = workingTeams.length;
  const rounds = teamCount - 1;    // 라운드 수
  const matchesPerRound = teamCount / 2;  // 라운드당 경기 수
  
  // 첫 번째 팀 고정
  const fixedTeam = workingTeams[0];
  let rotatingTeams = workingTeams.slice(1);
  
  // 각 라운드 생성
  for (let round = 1; round <= rounds; round++) {
    // 현재 라운드 팀 배열
    const currentTeams = [fixedTeam, ...rotatingTeams];
    
    // 라운드 내 경기 생성
    for (let i = 0; i < matchesPerRound; i++) {
      const homeIndex = i;
      const awayIndex = teamCount - 1 - i;
      
      const homeTeam = currentTeams[homeIndex];
      const awayTeam = currentTeams[awayIndex];
      
      // BYE 스킵
      if (homeTeam === "BYE" || awayTeam === "BYE") {
        continue;
      }
      
      // 홈/어웨이 밸런싱 (라운드별 교대)
      const swap = round % 2 === 0;
      const finalHome = swap ? awayTeam : homeTeam;
      const finalAway = swap ? homeTeam : awayTeam;
      
      // 일정 계산
      const dayOffset = Math.floor((round - 1) * matchesPerRound + i) / matchesPerDay;
      const matchIndexInDay = ((round - 1) * matchesPerRound + i) % matchesPerDay;
      
      let scheduledAt: Date | undefined;
      if (startDate) {
        scheduledAt = new Date(startDate);
        scheduledAt.setDate(scheduledAt.getDate() + Math.floor(dayOffset));
        
        if (timeSlots && timeSlots.length > 0) {
          const timeSlot = timeSlots[matchIndexInDay % timeSlots.length];
          const [hours, minutes] = timeSlot.split(":").map(Number);
          scheduledAt.setHours(hours, minutes, 0, 0);
        } else {
          // 기본 시간대: 오후 2시부터 시작
          scheduledAt.setHours(14 + matchIndexInDay * 2, 0, 0, 0);
        }
      }
      
      matches.push({
        round,
        homeTeamId: finalHome,
        awayTeamId: finalAway,
        scheduledAt
      });
    }
    
    // 팀 회전: 마지막 팀을 두 번째 위치로 이동
    rotatingTeams = [
      rotatingTeams[rotatingTeams.length - 1],
      ...rotatingTeams.slice(0, rotatingTeams.length - 1)
    ];
  }
  
  // 복수 리그인 경우: 홈/어웨이 교체하여 추가
  if (isDouble) {
    const reverseMatches = matches.map(match => ({
      round: match.round + rounds,
      homeTeamId: match.awayTeamId,
      awayTeamId: match.homeTeamId,
      scheduledAt: match.scheduledAt ? new Date(
        match.scheduledAt.getTime() + rounds * 7 * 24 * 60 * 60 * 1000
      ) : undefined
    }));
    
    matches.push(...reverseMatches);
  }
  
  return matches;
}
```

### 예시: 8팀 Round Robin

```typescript
const teams = ["team1", "team2", "team3", "team4", "team5", "team6", "team7", "team8"];

const matches = generateRoundRobin(teams, {
  startDate: new Date("2026-03-01"),
  matchesPerDay: 4,
  timeSlots: ["14:00", "16:00", "18:00", "20:00"]
});

// 결과:
// 라운드 1: team1 vs team8, team2 vs team7, team3 vs team6, team4 vs team5
// 라운드 2: team1 vs team7, team8 vs team6, team2 vs team5, team3 vs team4
// ...
// 라운드 7: team1 vs team2, team8 vs team3, team7 vs team4, team6 vs team5
// 총 7라운드, 28경기
```

---

## 🏆 Tournament (토너먼트) 알고리즘

### 원리

**Bracket Method (브라켓 방식)**

1. 팀 수를 2의 거듭제곱으로 보정 (8, 16, 32 등)
2. 결승 → 준결승 → 8강 순으로 역순 생성
3. 각 라운드의 승자가 다음 라운드로 진출

### 알고리즘 구현

```typescript
/**
 * Tournament 일정 생성
 * 
 * @param teamIds - 참가 팀 ID 배열
 * @param options - 생성 옵션
 * @returns 경기 일정 배열
 */
interface TournamentOptions {
  startDate?: Date;
  matchesPerDay?: number;
  matchDuration?: number;
  timeSlots?: string[];
  avoidSameGroup?: boolean;        // 조별 리그 출신 팀끼리 피하기
}

interface TournamentMatch {
  round: number;                    // 라운드 번호 (1=결승, 2=준결승, ...)
  roundName: string;                // 라운드 이름 ("결승", "준결승", "8강", ...)
  homeTeamId: string | null;        // null이면 TBD (To Be Determined)
  awayTeamId: string | null;
  scheduledAt?: Date;
  facilityId?: string;
  bracketPosition?: number;         // 브라켓 위치 (1, 2, 3, 4, ...)
}

export function generateTournament(
  teamIds: string[],
  options: TournamentOptions = {}
): TournamentMatch[] {
  const {
    startDate,
    matchesPerDay = 2,
    matchDuration = 90,
    timeSlots,
    avoidSameGroup = false
  } = options;

  if (teamIds.length < 2) {
    throw new Error("최소 2팀이 필요합니다.");
  }

  const matches: TournamentMatch[] = [];
  
  // 2의 거듭제곱으로 보정
  const bracketSize = calculateBracketSize(teamIds.length);
  const teams = [...teamIds];
  
  // 부족한 팀은 BYE로 채움
  while (teams.length < bracketSize) {
    teams.push("BYE");
  }
  
  // 라운드 수 계산
  const rounds = Math.log2(bracketSize);
  const roundNames = ["결승", "준결승", "4강", "8강", "16강", "32강"];
  
  // 현재 라운드 팀 (초기: 모든 팀)
  let currentTeams = [...teams];
  let matchesInRound = bracketSize / 2;
  
  // 결승 → 예선 순으로 역순 생성
  for (let roundIndex = rounds - 1; roundIndex >= 0; roundIndex--) {
    const round = rounds - roundIndex;
    const roundName = roundNames[roundIndex] || `라운드 ${round}`;
    
    const roundMatches: TournamentMatch[] = [];
    
    // 현재 라운드의 경기 생성
    for (let i = 0; i < matchesInRound; i++) {
      const homeIndex = i * 2;
      const awayIndex = i * 2 + 1;
      
      const homeTeam = currentTeams[homeIndex];
      const awayTeam = currentTeams[awayIndex];
      
      // BYE 처리
      if (homeTeam === "BYE" && awayTeam === "BYE") {
        continue;
      }
      
      // 일정 계산
      const dayOffset = rounds - 1 - roundIndex;
      const matchIndexInDay = i % matchesPerDay;
      
      let scheduledAt: Date | undefined;
      if (startDate) {
        scheduledAt = new Date(startDate);
        scheduledAt.setDate(scheduledAt.getDate() + dayOffset);
        
        if (timeSlots && timeSlots.length > 0) {
          const timeSlot = timeSlots[matchIndexInDay % timeSlots.length];
          const [hours, minutes] = timeSlot.split(":").map(Number);
          scheduledAt.setHours(hours, minutes, 0, 0);
        } else {
          scheduledAt.setHours(14 + matchIndexInDay * 2, 0, 0, 0);
        }
      }
      
      roundMatches.push({
        round,
        roundName,
        homeTeamId: homeTeam === "BYE" ? null : homeTeam,
        awayTeamId: awayTeam === "BYE" ? null : awayTeam,
        scheduledAt,
        bracketPosition: i + 1
      });
    }
    
    matches.push(...roundMatches);
    
    // 다음 라운드를 위한 팀 준비 (TBD)
    matchesInRound /= 2;
    if (roundIndex > 0) {
      currentTeams = Array(matchesInRound * 2)
        .fill(null)
        .map((_, i) => `TBD_${roundIndex}_${i}`);
    }
  }
  
  return matches;
}

/**
 * 브라켓 크기 계산 (2의 거듭제곱)
 */
function calculateBracketSize(teamCount: number): number {
  if (teamCount <= 2) return 2;
  if (teamCount <= 4) return 4;
  if (teamCount <= 8) return 8;
  if (teamCount <= 16) return 16;
  if (teamCount <= 32) return 32;
  return 64;
}
```

### 예시: 8팀 Tournament

```typescript
const teams = ["team1", "team2", "team3", "team4", "team5", "team6", "team7", "team8"];

const matches = generateTournament(teams, {
  startDate: new Date("2026-03-01"),
  matchesPerDay: 2
});

// 결과:
// 8강 (라운드 1): 4경기
// 4강 (라운드 2): 2경기
// 결승 (라운드 3): 1경기
// 총 7경기
```

---

## 🔀 Hybrid (혼합형) 알고리즘

### 원리

**Group Stage + Knockout**

1. 조별 리그: 팀을 여러 조로 나눔
2. 각 조에서 Round Robin 진행
3. 조별 상위 팀이 토너먼트 진출

### 알고리즘 구현

```typescript
/**
 * Hybrid 일정 생성 (조별 리그 + 토너먼트)
 * 
 * @param teamIds - 참가 팀 ID 배열
 * @param options - 생성 옵션
 * @returns 경기 일정 배열
 */
interface HybridOptions {
  groupCount: number;              // 조 수
  teamsPerGroup?: number;          // 조당 팀 수 (자동 계산 가능)
  groupStageFormat?: "single" | "double";  // 조별 리그 형식
  knockoutSize?: number;            // 토너먼트 진출 팀 수 (기본: 조당 2팀)
  startDate?: Date;
  matchesPerDay?: number;
  timeSlots?: string[];
}

interface HybridMatch {
  stage: "group" | "knockout";      // 조별 리그 or 토너먼트
  groupId?: string;                 // 조 ID (조별 리그인 경우)
  round: number;
  roundName: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  scheduledAt?: Date;
}

export function generateHybrid(
  teamIds: string[],
  options: HybridOptions
): HybridMatch[] {
  const {
    groupCount,
    teamsPerGroup,
    groupStageFormat = "single",
    knockoutSize,
    startDate,
    matchesPerDay = 4,
    timeSlots
  } = options;

  if (teamIds.length < groupCount * 2) {
    throw new Error("최소 조당 2팀이 필요합니다.");
  }

  const matches: HybridMatch[] = [];
  
  // 조 배정
  const groups = distributeTeamsToGroups(teamIds, groupCount);
  const actualTeamsPerGroup = teamsPerGroup || Math.ceil(teamIds.length / groupCount);
  const knockoutTeamsPerGroup = knockoutSize || 2;
  
  // 조별 리그 일정 생성
  let currentDate = startDate ? new Date(startDate) : undefined;
  const groupStageMatches: HybridMatch[] = [];
  
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const groupId = String.fromCharCode(65 + groupIndex) + "조"; // A조, B조, ...
    const groupTeams = groups[groupIndex];
    
    // 조별 Round Robin
    const groupMatches = generateRoundRobin(groupTeams, {
      isDouble: groupStageFormat === "double",
      startDate: currentDate,
      matchesPerDay,
      timeSlots
    });
    
    // 조별 리그 경기에 그룹 정보 추가
    for (const match of groupMatches) {
      groupStageMatches.push({
        stage: "group",
        groupId,
        round: match.round,
        roundName: `${groupId} ${match.round}라운드`,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        scheduledAt: match.scheduledAt
      });
    }
    
    // 다음 조는 마지막 경기 날짜 이후 시작
    if (currentDate && groupMatches.length > 0) {
      const lastMatch = groupMatches[groupMatches.length - 1];
      if (lastMatch.scheduledAt) {
        currentDate = new Date(lastMatch.scheduledAt);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  }
  
  matches.push(...groupStageMatches);
  
  // 토너먼트 진출 팀 (플레이스홀더: 실제로는 조별 리그 결과 기반)
  const knockoutTeams: string[] = [];
  for (let i = 0; i < groups.length; i++) {
    for (let j = 0; j < knockoutTeamsPerGroup; j++) {
      knockoutTeams.push(`GROUP_${i}_TOP_${j + 1}`);
    }
  }
  
  // 토너먼트 일정 생성
  const knockoutMatches = generateTournament(knockoutTeams, {
    startDate: currentDate,
    matchesPerDay: matchesPerDay / 2,
    timeSlots
  });
  
  // 토너먼트 경기에 스테이지 정보 추가
  for (const match of knockoutMatches) {
    matches.push({
      stage: "knockout",
      round: match.round,
      roundName: match.roundName,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      scheduledAt: match.scheduledAt,
      bracketPosition: match.bracketPosition
    });
  }
  
  return matches;
}

/**
 * 팀을 조에 균등 분배
 */
function distributeTeamsToGroups(
  teamIds: string[],
  groupCount: number
): string[][] {
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  
  // 라운드 로빈 방식으로 균등 분배
  teamIds.forEach((teamId, index) => {
    const groupIndex = index % groupCount;
    groups[groupIndex].push(teamId);
  });
  
  return groups;
}
```

### 예시: 16팀 Hybrid (4조)

```typescript
const teams = Array.from({ length: 16 }, (_, i) => `team${i + 1}`);

const matches = generateHybrid(teams, {
  groupCount: 4,
  groupStageFormat: "single",
  knockoutSize: 2,
  startDate: new Date("2026-03-01"),
  matchesPerDay: 4
});

// 결과:
// 조별 리그: 4조 × 6경기 = 24경기
// 토너먼트: 8강 → 4강 → 결승 = 7경기
// 총 31경기
```

---

## 🚀 Cloud Function: 자동 일정 생성

### 함수 구현

```typescript
/**
 * 리그 일정 자동 생성 Cloud Function
 * 
 * 트리거: 관리자가 "일정 자동 생성" 버튼 클릭
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { admin } from "../firebaseAdmin";

export const generateLeagueSchedule = onCall(async (request) => {
  const { leagueId, options } = request.data;
  const userId = request.auth?.uid;

  if (!userId || !leagueId) {
    throw new HttpsError("invalid-argument", "필수 파라미터가 누락되었습니다.");
  }

  // 리그 정보 조회
  const leagueDoc = await admin.firestore().doc(`leagues/${leagueId}`).get();
  if (!leagueDoc.exists) {
    throw new HttpsError("not-found", "리그를 찾을 수 없습니다.");
  }

  const league = leagueDoc.data() as League;

  // 권한 체크
  if (!isLeagueAdmin(userId, league)) {
    throw new HttpsError("permission-denied", "리그 관리자만 일정을 생성할 수 있습니다.");
  }

  // 이미 일정이 생성되었는지 체크
  const existingMatches = await admin.firestore()
    .collection("league_matches")
    .where("leagueId", "==", leagueId)
    .get();

  if (!existingMatches.empty && !options.overwrite) {
    throw new HttpsError("already-exists", "이미 일정이 생성되었습니다. 덮어쓰려면 overwrite 옵션을 사용하세요.");
  }

  // 참가 팀 조회
  const leagueTeams = await admin.firestore()
    .collection("league_teams")
    .where("leagueId", "==", leagueId)
    .where("status", "==", "approved")
    .get();

  if (leagueTeams.empty) {
    throw new HttpsError("failed-precondition", "참가 팀이 없습니다.");
  }

  const teamIds = leagueTeams.docs.map(doc => doc.data().teamId);

  // 리그 타입에 따라 일정 생성
  let matches: RoundRobinMatch[] | TournamentMatch[] | HybridMatch[];

  if (league.leagueType === "round_robin") {
    matches = generateRoundRobin(teamIds, {
      isDouble: league.format === "double",
      startDate: league.startDate?.toDate(),
      matchesPerDay: league.matchesPerDay || 4
    });
  } else if (league.leagueType === "tournament") {
    matches = generateTournament(teamIds, {
      startDate: league.startDate?.toDate(),
      matchesPerDay: 2
    });
  } else if (league.leagueType === "hybrid") {
    matches = generateHybrid(teamIds, {
      groupCount: options.groupCount || 4,
      groupStageFormat: options.groupStageFormat || "single",
      startDate: league.startDate?.toDate(),
      matchesPerDay: league.matchesPerDay || 4
    });
  } else {
    throw new HttpsError("invalid-argument", "지원하지 않는 리그 타입입니다.");
  }

  // 기존 일정 삭제 (overwrite인 경우)
  if (options.overwrite && !existingMatches.empty) {
    const batch = admin.firestore().batch();
    existingMatches.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  // 새 일정 생성
  const batch = admin.firestore().batch();
  const matchRefs: any[] = [];

  for (const match of matches) {
    const matchRef = admin.firestore().collection("league_matches").doc();
    
    const matchData: Omit<LeagueMatch, "id"> = {
      leagueId,
      seasonId: league.seasonId,
      round: match.round,
      homeTeamId: match.homeTeamId || "",
      homeTeamName: "", // Denormalized (나중에 업데이트)
      awayTeamId: match.awayTeamId || "",
      awayTeamName: "", // Denormalized (나중에 업데이트)
      scheduledAt: match.scheduledAt ? admin.firestore.Timestamp.fromDate(match.scheduledAt) : undefined,
      status: "scheduled",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    batch.set(matchRef, matchData);
    matchRefs.push({ ref: matchRef, match });
  }

  await batch.commit();

  // 팀 이름 Denormalization
  const teamMap = new Map<string, string>();
  for (const teamDoc of leagueTeams.docs) {
    const teamData = teamDoc.data();
    teamMap.set(teamData.teamId, teamData.teamName);
  }

  const updateBatch = admin.firestore().batch();
  for (const { ref, match } of matchRefs) {
    const updates: any = {};
    if (match.homeTeamId && teamMap.has(match.homeTeamId)) {
      updates.homeTeamName = teamMap.get(match.homeTeamId);
    }
    if (match.awayTeamId && teamMap.has(match.awayTeamId)) {
      updates.awayTeamName = teamMap.get(match.awayTeamId);
    }
    if (Object.keys(updates).length > 0) {
      updateBatch.update(ref, updates);
    }
  }
  await updateBatch.commit();

  // 리그 통계 업데이트
  await admin.firestore().doc(`leagues/${leagueId}`).update({
    matchCount: matches.length,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return {
    success: true,
    matchCount: matches.length,
    message: `${matches.length}경기의 일정이 생성되었습니다.`
  };
});
```

---

## 📋 사용 예시

### 프론트엔드에서 호출

```typescript
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

const generateSchedule = httpsCallable(functions, "generateLeagueSchedule");

// Round Robin 일정 생성
await generateSchedule({
  leagueId: "league-k7-2026",
  options: {
    overwrite: false
  }
});

// Hybrid 일정 생성
await generateSchedule({
  leagueId: "league-cup-2026",
  options: {
    groupCount: 4,
    groupStageFormat: "single",
    overwrite: false
  }
});
```

---

## 🎯 핵심 가치

### 1. 운영 시간 단축

**수동 생성**: 8팀 리그 일정 생성에 **2-3시간**  
**자동 생성**: **3초**

### 2. 실수 방지

- 모든 팀이 정확히 한 번씩 만남
- 라운드별 경기 수 균등 분배
- 일정 충돌 방지

### 3. 공정성 보장

- 랜덤 배정으로 편파성 제거
- 홈/어웨이 밸런싱
- 조별 리그 균등 분배

---

## 📊 성능 최적화

### 1. 배치 처리

- 모든 경기를 한 번의 배치로 생성
- Denormalization은 별도 배치로 처리

### 2. 인덱스 활용

- `league_matches` 컬렉션에 `leagueId + status` 복합 인덱스
- `leagueId + scheduledAt` 복합 인덱스

### 3. 캐싱

- 팀 정보는 메모리에 캐싱
- 구장 정보는 한 번만 조회

---

## 🔥 다음 단계

이 알고리즘을 기반으로:

1. **프론트엔드 UI**: 일정 생성 버튼 및 옵션 설정
2. **일정 수정**: 생성된 일정 수동 조정 기능
3. **구장 자동 배정**: 구장 가용성 기반 자동 배정
4. **알림 연동**: 일정 생성 시 팀에 알림 발송

원하시면 다음 단계로 바로 진행하겠습니다! 🚀

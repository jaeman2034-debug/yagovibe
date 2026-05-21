# 🔥 팀 경기 기록 시스템 설계 (Step 2)

**생성일**: 2025-01-XX  
**목적**: 팀 중심 경기 기록 및 통계 시스템 구축  
**상태**: 📋 설계 단계

---

## 🎯 목표

스포츠 플랫폼의 핵심 기능인 **팀 경기 기록 및 통계 시스템**을 구축합니다.

**핵심 가치**:
- 팀의 모든 경기 기록을 한 곳에서 관리
- 승/무/패 통계 자동 계산
- 팀 랭킹 및 성적 비교
- 리그/토너먼트와의 연동

---

## 📊 Firestore 데이터 모델

### 1. team_games 컬렉션

**경로**: `team_games/{gameId}`

**역할**: 팀의 모든 경기 기록 저장

```typescript
interface TeamGame {
  // 기본 정보
  id: string;                    // 문서 ID
  sportType: "soccer" | "basketball" | "baseball" | string;
  
  // 팀 정보
  homeTeamId: string;            // 홈팀 ID
  homeTeamName: string;          // 홈팀 이름 (denormalized)
  awayTeamId: string;            // 원정팀 ID
  awayTeamName: string;          // 원정팀 이름 (denormalized)
  
  // 경기 정보
  gameType: "friendly" | "league" | "tournament" | "practice";
  leagueId?: string;             // 리그 ID (리그 경기인 경우)
  tournamentId?: string;         // 토너먼트 ID (대회 경기인 경우)
  roundId?: string;              // 라운드 ID (대회 경기인 경우)
  
  // 일정 정보
  scheduledAt: Timestamp;        // 예정 일시
  playedAt?: Timestamp;          // 실제 경기 일시
  location?: string;             // 경기장 이름
  facilityId?: string;           // 시설 ID
  
  // 경기 결과
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed";
  homeScore?: number;            // 홈팀 득점
  awayScore?: number;            // 원정팀 득점
  winnerTeamId?: string;         // 승리 팀 ID (completed일 때)
  resultType?: "win" | "draw" | "loss"; // 홈팀 기준 결과
  
  // 메타데이터
  createdBy: string;             // 생성자 UID
  recordedBy?: string;          // 결과 기록자 UID
  recordedAt?: Timestamp;       // 결과 기록 시각
  notes?: string;               // 메모
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**인덱스**:
```json
{
  "indexes": [
    {
      "collectionGroup": "team_games",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "homeTeamId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduledAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "team_games",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "awayTeamId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduledAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "team_games",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "leagueId", "order": "ASCENDING" },
        { "fieldPath": "scheduledAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

### 2. teams.stats (Denormalized)

**경로**: `teams/{teamId}.stats`

**역할**: 팀 통계를 빠르게 조회하기 위한 denormalized 필드

```typescript
interface TeamStats {
  // 경기 수
  totalGames: number;            // 전체 경기 수
  completedGames: number;       // 완료된 경기 수
  scheduledGames: number;       // 예정된 경기 수
  
  // 승부 결과
  wins: number;                  // 승
  draws: number;                 // 무
  losses: number;                // 패
  
  // 득실점
  goalsFor: number;              // 득점 (soccer 기준)
  goalsAgainst: number;          // 실점 (soccer 기준)
  goalDifference: number;        // 득실차 (goalsFor - goalsAgainst)
  
  // 승률
  winRate: number;               // 승률 (wins / completedGames)
  
  // 연속 기록
  currentStreak: {
    type: "win" | "draw" | "loss" | null;
    count: number;
  };
  
  // 최근 성적 (최근 5경기)
  recentForm: Array<"W" | "D" | "L">;  // 예: ["W", "W", "L", "D", "W"]
  
  // 시즌별 통계 (선택적)
  seasonStats?: {
    [season: string]: {
      games: number;
      wins: number;
      draws: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
    };
  };
  
  // 마지막 업데이트
  lastUpdatedAt: Timestamp;
}
```

**업데이트 시점**:
- 경기 결과 기록 시 (Cloud Function)
- 경기 취소/연기 시
- 경기 상태 변경 시

---

## 🔄 Cloud Functions

### onTeamGameCompleted

**Trigger**: `team_games/{gameId}` 문서 업데이트  
**조건**: `status`가 `"completed"`로 변경되고 `homeScore`, `awayScore`가 설정됨

**동작**:
1. 홈팀과 원정팀의 `teams.stats` 업데이트
2. 승/무/패 계산
3. 득실점 업데이트
4. 연속 기록 업데이트
5. 최근 성적 업데이트

**코드 구조**:
```typescript
export const onTeamGameCompleted = functions.firestore
  .document("team_games/{gameId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // completed 상태로 변경되었는지 확인
    if (before.status !== "completed" && after.status === "completed") {
      const { homeTeamId, awayTeamId, homeScore, awayScore } = after;
      
      // 홈팀 통계 업데이트
      await updateTeamStats(homeTeamId, {
        homeScore,
        awayScore,
        isHome: true,
      });
      
      // 원정팀 통계 업데이트
      await updateTeamStats(awayTeamId, {
        homeScore,
        awayScore,
        isHome: false,
      });
    }
  });
```

---

## 📁 서비스 레이어

### teamGameService.ts

```typescript
/**
 * 팀 경기 서비스
 */

import { collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TeamGame } from "@/types/teamGame";

/**
 * 경기 생성
 */
export async function createTeamGame(input: {
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: Date;
  location?: string;
  gameType?: "friendly" | "league" | "tournament";
  leagueId?: string;
  tournamentId?: string;
  createdBy: string;
}): Promise<string> {
  // 팀 정보 조회 (denormalized)
  const [homeTeamDoc, awayTeamDoc] = await Promise.all([
    getDoc(doc(db, "teams", input.homeTeamId)),
    getDoc(doc(db, "teams", input.awayTeamId)),
  ]);
  
  if (!homeTeamDoc.exists() || !awayTeamDoc.exists()) {
    throw new Error("TEAM_NOT_FOUND");
  }
  
  const gameData = {
    homeTeamId: input.homeTeamId,
    homeTeamName: homeTeamDoc.data().name,
    awayTeamId: input.awayTeamId,
    awayTeamName: awayTeamDoc.data().name,
    sportType: homeTeamDoc.data().sportType || "soccer",
    gameType: input.gameType || "friendly",
    leagueId: input.leagueId || null,
    tournamentId: input.tournamentId || null,
    scheduledAt: Timestamp.fromDate(input.scheduledAt),
    location: input.location || null,
    status: "scheduled",
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const gameRef = await addDoc(collection(db, "team_games"), gameData);
  return gameRef.id;
}

/**
 * 경기 결과 기록
 */
export async function recordGameResult(
  gameId: string,
  result: {
    homeScore: number;
    awayScore: number;
    playedAt?: Date;
    recordedBy: string;
  }
): Promise<void> {
  const gameRef = doc(db, "team_games", gameId);
  const gameDoc = await getDoc(gameRef);
  
  if (!gameDoc.exists()) {
    throw new Error("GAME_NOT_FOUND");
  }
  
  const gameData = gameDoc.data();
  const { homeTeamId, awayTeamId } = gameData;
  
  // 승리 팀 결정
  let winnerTeamId: string | null = null;
  let resultType: "win" | "draw" | "loss" | null = null;
  
  if (result.homeScore > result.awayScore) {
    winnerTeamId = homeTeamId;
    resultType = "win";
  } else if (result.homeScore < result.awayScore) {
    winnerTeamId = awayTeamId;
    resultType = "loss";
  } else {
    resultType = "draw";
  }
  
  await updateDoc(gameRef, {
    status: "completed",
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    winnerTeamId,
    resultType,
    playedAt: result.playedAt ? Timestamp.fromDate(result.playedAt) : serverTimestamp(),
    recordedBy: result.recordedBy,
    recordedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * 팀의 경기 목록 조회
 */
export async function getTeamGames(
  teamId: string,
  options?: {
    status?: "scheduled" | "completed" | "all";
    limit?: number;
  }
): Promise<TeamGame[]> {
  const constraints = [
    where("homeTeamId", "==", teamId),
    where("awayTeamId", "==", teamId),
  ];
  
  // OR 쿼리는 Firestore에서 직접 지원하지 않으므로
  // 두 쿼리를 병렬로 실행 후 합침
  const [homeGames, awayGames] = await Promise.all([
    getDocs(query(
      collection(db, "team_games"),
      where("homeTeamId", "==", teamId),
      ...(options?.status && options.status !== "all" 
        ? [where("status", "==", options.status)] 
        : []),
      orderBy("scheduledAt", "desc"),
      ...(options?.limit ? [limit(options.limit)] : [])
    )),
    getDocs(query(
      collection(db, "team_games"),
      where("awayTeamId", "==", teamId),
      ...(options?.status && options.status !== "all" 
        ? [where("status", "==", options.status)] 
        : []),
      orderBy("scheduledAt", "desc"),
      ...(options?.limit ? [limit(options.limit)] : [])
    )),
  ]);
  
  const allGames = [
    ...homeGames.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    ...awayGames.docs.map(doc => ({ id: doc.id, ...doc.data() })),
  ];
  
  // 중복 제거 및 정렬
  const uniqueGames = Array.from(
    new Map(allGames.map(game => [game.id, game])).values()
  );
  
  return uniqueGames.sort((a, b) => {
    const aTime = a.scheduledAt?.toMillis() || 0;
    const bTime = b.scheduledAt?.toMillis() || 0;
    return bTime - aTime;
  }) as TeamGame[];
}
```

---

## 🎨 UI 컴포넌트

### 1. TeamGamesPage

**경로**: `/teams/:teamId/games`

**기능**:
- 팀의 모든 경기 목록 표시
- 경기 상태별 필터링 (예정/완료/취소)
- 경기 결과 입력 (팀장/관리자만)
- 경기 상세 정보

### 2. TeamStatsPage

**경로**: `/teams/:teamId/stats`

**기능**:
- 팀 통계 대시보드
- 승률, 득실점 차트
- 최근 성적 그래프
- 시즌별 통계

### 3. GameResultForm

**기능**:
- 경기 결과 입력 폼
- 득점 입력
- 승리 팀 자동 계산
- 통계 자동 업데이트

---

## 🔐 권한 정책

### 경기 생성
- **권한**: 팀 소속 필수 (owner/admin/member 모두 가능)
- **검증**: `guardTeamAccess` 사용

### 경기 결과 기록
- **권한**: 팀장/관리자만 (owner/admin)
- **검증**: `CaptainOnlyRoute` 또는 `isCaptain()` 체크

### 경기 조회
- **권한**: 공개 (인증 불필요)
- **제한**: 팀 정보는 공개, 상세 통계는 팀원만

---

## 📈 통계 계산 로직

### updateTeamStats 함수

```typescript
async function updateTeamStats(
  teamId: string,
  gameResult: {
    homeScore: number;
    awayScore: number;
    isHome: boolean;
  }
): Promise<void> {
  const teamRef = doc(db, "teams", teamId);
  const teamDoc = await getDoc(teamRef);
  
  if (!teamDoc.exists()) {
    throw new Error("TEAM_NOT_FOUND");
  }
  
  const currentStats = teamDoc.data().stats || {
    totalGames: 0,
    completedGames: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    winRate: 0,
    currentStreak: { type: null, count: 0 },
    recentForm: [],
  };
  
  // 득실점 계산
  const teamScore = gameResult.isHome ? gameResult.homeScore : gameResult.awayScore;
  const opponentScore = gameResult.isHome ? gameResult.awayScore : gameResult.homeScore;
  
  // 승부 결과
  let result: "win" | "draw" | "loss";
  if (teamScore > opponentScore) {
    result = "win";
  } else if (teamScore < opponentScore) {
    result = "loss";
  } else {
    result = "draw";
  }
  
  // 통계 업데이트
  const newStats = {
    ...currentStats,
    totalGames: currentStats.totalGames + 1,
    completedGames: currentStats.completedGames + 1,
    wins: result === "win" ? currentStats.wins + 1 : currentStats.wins,
    draws: result === "draw" ? currentStats.draws + 1 : currentStats.draws,
    losses: result === "loss" ? currentStats.losses + 1 : currentStats.losses,
    goalsFor: currentStats.goalsFor + teamScore,
    goalsAgainst: currentStats.goalsAgainst + opponentScore,
    goalDifference: (currentStats.goalsFor + teamScore) - (currentStats.goalsAgainst + opponentScore),
    winRate: (result === "win" ? currentStats.wins + 1 : currentStats.wins) / (currentStats.completedGames + 1),
    // 연속 기록 업데이트
    currentStreak: updateStreak(currentStats.currentStreak, result),
    // 최근 성적 업데이트 (최대 5개)
    recentForm: [
      result === "win" ? "W" : result === "draw" ? "D" : "L",
      ...currentStats.recentForm.slice(0, 4),
    ],
    lastUpdatedAt: serverTimestamp(),
  };
  
  await updateDoc(teamRef, {
    stats: newStats,
    updatedAt: serverTimestamp(),
  });
}

function updateStreak(
  currentStreak: { type: "win" | "draw" | "loss" | null; count: number },
  result: "win" | "draw" | "loss"
): { type: "win" | "draw" | "loss" | null; count: number } {
  if (currentStreak.type === result) {
    return { type: result, count: currentStreak.count + 1 };
  } else {
    return { type: result, count: 1 };
  }
}
```

---

## 🚀 구현 순서

### Phase 1: 데이터 모델 및 서비스
1. `team_games` 컬렉션 타입 정의
2. `teamGameService.ts` 구현
3. `teams.stats` 타입 정의

### Phase 2: Cloud Functions
1. `onTeamGameCompleted` 함수 구현
2. 통계 업데이트 로직 구현
3. 배포 및 테스트

### Phase 3: UI 구현
1. `/teams/:teamId/games` 페이지
2. `/teams/:teamId/stats` 페이지
3. 경기 결과 입력 폼

### Phase 4: 통합 및 최적화
1. 기존 `matches` 컬렉션과의 연동
2. 토너먼트 경기와의 연동
3. 성능 최적화

---

## 📝 다음 단계

**Step 1 완료 후** 이 설계를 기반으로 구현을 시작합니다.

예상 작업 시간:
- Phase 1: 1일
- Phase 2: 1일
- Phase 3: 2일
- Phase 4: 1일

**총 예상 시간**: 5일

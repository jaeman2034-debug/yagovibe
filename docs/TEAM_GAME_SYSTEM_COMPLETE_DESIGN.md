# 🔥 팀 경기 기록 시스템 완전 설계 (Step 2)

**생성일**: 2025-01-XX  
**목적**: 스포츠 플랫폼 핵심 기능 - 팀 경기 기록 및 통계 시스템  
**상태**: 📋 구현 준비 완료

---

## 🎯 핵심 가치

스포츠 플랫폼의 **핵심 사용자 활동**인 경기 기록을 체계적으로 관리합니다.

**사용자 흐름**:
```
팀 생성 → 팀원 모집 → 경기 생성 → 경기 결과 입력 → 통계 축적 → 랭킹
```

---

## 📊 Firestore 데이터 모델

### 1. team_games 컬렉션

**경로**: `team_games/{gameId}`

**역할**: 모든 팀 경기 기록 저장 (친선경기, 연습경기, 리그, 토너먼트 포함)

```typescript
interface TeamGame {
  // 기본 식별자
  id: string;                    // 문서 ID (자동 생성)
  
  // 종목 정보
  sportType: "football" | "basketball" | "baseball" | string;
  
  // 팀 정보 (denormalized for performance)
  homeTeamId: string;            // 홈팀 ID
  homeTeamName: string;          // 홈팀 이름 (캐시)
  awayTeamId: string;            // 원정팀 ID
  awayTeamName: string;          // 원정팀 이름 (캐시)
  
  // 경기 유형
  gameType: "friendly" | "practice" | "league" | "tournament";
  leagueId?: string;             // 리그 ID (리그 경기인 경우)
  tournamentId?: string;          // 토너먼트 ID (대회 경기인 경우)
  roundId?: string;              // 라운드 ID (대회 경기인 경우)
  
  // 일정 정보
  scheduledAt: Timestamp;        // 예정 일시 (필수)
  playedAt?: Timestamp;          // 실제 경기 일시 (결과 기록 시)
  location?: string;             // 경기장 이름
  facilityId?: string;           // 시설 ID (선택)
  address?: string;              // 경기장 주소
  
  // 경기 결과
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed";
  homeScore?: number;            // 홈팀 득점
  awayScore?: number;            // 원정팀 득점
  winnerTeamId?: string;         // 승리 팀 ID (completed일 때)
  resultType?: "win" | "draw" | "loss"; // 홈팀 기준 결과
  
  // 메타데이터
  createdBy: string;             // 생성자 UID
  recordedBy?: string;           // 결과 기록자 UID
  recordedAt?: Timestamp;        // 결과 기록 시각
  notes?: string;                // 메모 (선택)
  
  // 타임스탬프
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**인덱스** (firestore.indexes.json):
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
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduledAt", "order": "ASCENDING" }
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
  totalGames: number;            // 전체 경기 수 (예정 + 완료)
  completedGames: number;        // 완료된 경기 수
  scheduledGames: number;        // 예정된 경기 수
  
  // 승부 결과
  wins: number;                  // 승
  draws: number;                 // 무
  losses: number;                // 패
  
  // 득실점 (soccer 기준, 다른 종목은 적절히 변환)
  goalsFor: number;              // 득점
  goalsAgainst: number;          // 실점
  goalDifference: number;        // 득실차 (goalsFor - goalsAgainst)
  
  // 승률
  winRate: number;               // 승률 (wins / completedGames, 0-1 범위)
  
  // 연속 기록
  currentStreak: {
    type: "win" | "draw" | "loss" | null;
    count: number;
  };
  
  // 최근 성적 (최근 5경기)
  recentForm: Array<"W" | "D" | "L">;  // 예: ["W", "W", "L", "D", "W"]
  
  // 마지막 업데이트
  lastUpdatedAt: Timestamp;
}
```

**초기값**:
```typescript
const initialStats: TeamStats = {
  totalGames: 0,
  completedGames: 0,
  scheduledGames: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  winRate: 0,
  currentStreak: { type: null, count: 0 },
  recentForm: [],
  lastUpdatedAt: serverTimestamp(),
};
```

---

## 🔄 Cloud Functions

### onTeamGameCompleted

**Trigger**: `team_games/{gameId}` 문서 업데이트  
**조건**: `status`가 `"completed"`로 변경되고 `homeScore`, `awayScore`가 설정됨

**파일**: `functions/src/team/onTeamGameCompleted.ts`

```typescript
/**
 * 🔥 팀 경기 완료 시 통계 자동 업데이트
 * 
 * Trigger: team_games/{gameId} onUpdate
 * 
 * Actions:
 * 1. 홈팀 stats 업데이트
 * 2. 원정팀 stats 업데이트
 * 3. 연속 기록 업데이트
 * 4. 최근 성적 업데이트
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();
const logger = functions.logger;

export const onTeamGameCompleted = functions.firestore
  .document("team_games/{gameId}")
  .onUpdate(async (change, context) => {
    const { gameId } = context.params;
    const before = change.before.data();
    const after = change.after.data();

    // completed 상태로 변경되었는지 확인
    if (before.status === "completed" && after.status === "completed") {
      // 이미 처리된 경기 (중복 처리 방지)
      logger.info("ℹ️ [onTeamGameCompleted] 이미 완료된 경기:", { gameId });
      return;
    }

    if (before.status !== "completed" && after.status === "completed") {
      const { homeTeamId, awayTeamId, homeScore, awayScore } = after;

      // 점수 검증
      if (typeof homeScore !== "number" || typeof awayScore !== "number") {
        logger.error("❌ [onTeamGameCompleted] 점수가 유효하지 않음:", {
          gameId,
          homeScore,
          awayScore,
        });
        return;
      }

      logger.info("🔄 [onTeamGameCompleted] 경기 완료 감지:", {
        gameId,
        homeTeamId,
        awayTeamId,
        homeScore,
        awayScore,
      });

      try {
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

        logger.info("✅ [onTeamGameCompleted] 통계 업데이트 완료:", { gameId });
      } catch (error: any) {
        logger.error("❌ [onTeamGameCompleted] 통계 업데이트 실패:", {
          gameId,
          error: error.message,
          stack: error.stack,
        });
        // 에러 발생해도 경기 결과는 기록됨 (통계만 실패)
      }
    }
  });

/**
 * 팀 통계 업데이트
 */
async function updateTeamStats(
  teamId: string,
  gameResult: {
    homeScore: number;
    awayScore: number;
    isHome: boolean;
  }
): Promise<void> {
  const teamRef = db.doc(`teams/${teamId}`);
  const teamDoc = await teamRef.get();

  if (!teamDoc.exists()) {
    logger.warn("⚠️ [updateTeamStats] 팀 문서가 없음:", { teamId });
    return;
  }

  const teamData = teamDoc.data()!;
  const currentStats = teamData.stats || {
    totalGames: 0,
    completedGames: 0,
    scheduledGames: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    winRate: 0,
    currentStreak: { type: null, count: 0 },
    recentForm: [],
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
  const newWins = result === "win" ? currentStats.wins + 1 : currentStats.wins;
  const newDraws = result === "draw" ? currentStats.draws + 1 : currentStats.draws;
  const newLosses = result === "loss" ? currentStats.losses + 1 : currentStats.losses;
  const newCompletedGames = currentStats.completedGames + 1;
  const newGoalsFor = currentStats.goalsFor + teamScore;
  const newGoalsAgainst = currentStats.goalsAgainst + opponentScore;

  // 연속 기록 업데이트
  const newStreak = updateStreak(currentStats.currentStreak, result);

  // 최근 성적 업데이트 (최대 5개)
  const resultSymbol = result === "win" ? "W" : result === "draw" ? "D" : "L";
  const newRecentForm = [resultSymbol, ...currentStats.recentForm.slice(0, 4)];

  const newStats: TeamStats = {
    ...currentStats,
    completedGames: newCompletedGames,
    wins: newWins,
    draws: newDraws,
    losses: newLosses,
    goalsFor: newGoalsFor,
    goalsAgainst: newGoalsAgainst,
    goalDifference: newGoalsFor - newGoalsAgainst,
    winRate: newCompletedGames > 0 ? newWins / newCompletedGames : 0,
    currentStreak: newStreak,
    recentForm: newRecentForm,
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await teamRef.update({
    stats: newStats,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info("✅ [updateTeamStats] 팀 통계 업데이트 완료:", {
    teamId,
    result,
    newStats: {
      wins: newWins,
      draws: newDraws,
      losses: newLosses,
      winRate: newStats.winRate,
    },
  });
}

/**
 * 연속 기록 업데이트
 */
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

**index.ts에 추가**:
```typescript
export { onTeamGameCompleted } from "./team/onTeamGameCompleted";
```

---

## 📁 서비스 레이어

### src/services/teamGameService.ts

```typescript
/**
 * 🔥 팀 경기 서비스
 * 
 * 역할:
 * - 경기 생성
 * - 경기 결과 기록
 * - 경기 목록 조회
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  getDoc,
  Timestamp,
  serverTimestamp,
  limit as firestoreLimit,
} from "firebase/firestore";
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
  gameType?: "friendly" | "practice" | "league" | "tournament";
  leagueId?: string;
  tournamentId?: string;
  createdBy: string;
  notes?: string;
}): Promise<string> {
  // 팀 정보 조회 (denormalized)
  const [homeTeamDoc, awayTeamDoc] = await Promise.all([
    getDoc(doc(db, "teams", input.homeTeamId)),
    getDoc(doc(db, "teams", input.awayTeamId)),
  ]);

  if (!homeTeamDoc.exists() || !awayTeamDoc.exists()) {
    throw new Error("팀을 찾을 수 없습니다.");
  }

  const homeTeamData = homeTeamDoc.data();
  const awayTeamData = awayTeamDoc.data();

  const gameData: Omit<TeamGame, "id"> = {
    sportType: homeTeamData.sportType || "football",
    homeTeamId: input.homeTeamId,
    homeTeamName: homeTeamData.name,
    awayTeamId: input.awayTeamId,
    awayTeamName: awayTeamData.name,
    gameType: input.gameType || "friendly",
    leagueId: input.leagueId || null,
    tournamentId: input.tournamentId || null,
    scheduledAt: Timestamp.fromDate(input.scheduledAt),
    location: input.location || null,
    status: "scheduled",
    createdBy: input.createdBy,
    notes: input.notes || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const gameRef = await addDoc(collection(db, "team_games"), gameData);

  // scheduledGames 증가
  await Promise.all([
    updateDoc(doc(db, "teams", input.homeTeamId), {
      "stats.scheduledGames": (homeTeamData.stats?.scheduledGames || 0) + 1,
      "stats.totalGames": (homeTeamData.stats?.totalGames || 0) + 1,
      updatedAt: serverTimestamp(),
    }),
    updateDoc(doc(db, "teams", input.awayTeamId), {
      "stats.scheduledGames": (awayTeamData.stats?.scheduledGames || 0) + 1,
      "stats.totalGames": (awayTeamData.stats?.totalGames || 0) + 1,
      updatedAt: serverTimestamp(),
    }),
  ]);

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
    throw new Error("경기를 찾을 수 없습니다.");
  }

  const gameData = gameDoc.data() as TeamGame;
  const { homeTeamId, awayTeamId, status } = gameData;

  if (status === "completed") {
    throw new Error("이미 기록된 경기입니다.");
  }

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

  // Cloud Function이 자동으로 stats 업데이트
  // scheduledGames 감소, completedGames 증가는 Cloud Function에서 처리
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
  const statusFilter = options?.status && options.status !== "all" 
    ? [where("status", "==", options.status)]
    : [];

  // 홈팀 경기 조회
  const homeGamesQuery = query(
    collection(db, "team_games"),
    where("homeTeamId", "==", teamId),
    ...statusFilter,
    orderBy("scheduledAt", "desc"),
    ...(options?.limit ? [firestoreLimit(options.limit)] : [])
  );

  // 원정팀 경기 조회
  const awayGamesQuery = query(
    collection(db, "team_games"),
    where("awayTeamId", "==", teamId),
    ...statusFilter,
    orderBy("scheduledAt", "desc"),
    ...(options?.limit ? [firestoreLimit(options.limit)] : [])
  );

  const [homeGamesSnap, awayGamesSnap] = await Promise.all([
    getDocs(homeGamesQuery),
    getDocs(awayGamesQuery),
  ]);

  const allGames: TeamGame[] = [
    ...homeGamesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamGame)),
    ...awayGamesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamGame)),
  ];

  // 중복 제거 (이론적으로는 없어야 하지만 안전을 위해)
  const uniqueGames = Array.from(
    new Map(allGames.map(game => [game.id, game])).values()
  );

  // 날짜순 정렬
  return uniqueGames.sort((a, b) => {
    const aTime = a.scheduledAt?.toMillis() || 0;
    const bTime = b.scheduledAt?.toMillis() || 0;
    return bTime - aTime;
  });
}

/**
 * 경기 상세 조회
 */
export async function getTeamGame(gameId: string): Promise<TeamGame | null> {
  const gameDoc = await getDoc(doc(db, "team_games", gameId));
  
  if (!gameDoc.exists()) {
    return null;
  }

  return { id: gameDoc.id, ...gameDoc.data() } as TeamGame;
}
```

---

## 📝 타입 정의

### src/types/teamGame.ts

```typescript
import { Timestamp } from "firebase/firestore";

export interface TeamGame {
  id: string;
  sportType: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  gameType: "friendly" | "practice" | "league" | "tournament";
  leagueId?: string | null;
  tournamentId?: string | null;
  roundId?: string | null;
  scheduledAt: Timestamp;
  playedAt?: Timestamp;
  location?: string | null;
  facilityId?: string | null;
  address?: string | null;
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed";
  homeScore?: number;
  awayScore?: number;
  winnerTeamId?: string | null;
  resultType?: "win" | "draw" | "loss" | null;
  createdBy: string;
  recordedBy?: string | null;
  recordedAt?: Timestamp | null;
  notes?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TeamStats {
  totalGames: number;
  completedGames: number;
  scheduledGames: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  winRate: number;
  currentStreak: {
    type: "win" | "draw" | "loss" | null;
    count: number;
  };
  recentForm: Array<"W" | "D" | "L">;
  lastUpdatedAt: Timestamp;
}
```

---

## 🎨 UI 컴포넌트 구조

### 1. TeamGamesPage

**경로**: `/teams/:teamId/games`

**파일**: `src/pages/team/TeamGamesPage.tsx`

**기능**:
- 팀의 모든 경기 목록 표시
- 경기 상태별 필터링 (예정/완료/전체)
- 경기 결과 입력 (팀장/관리자만)
- 경기 상세 정보 모달

### 2. TeamStatsPage

**경로**: `/teams/:teamId/stats`

**파일**: `src/pages/team/TeamStatsPage.tsx`

**기능**:
- 팀 통계 대시보드
- 승률, 득실점 차트
- 최근 성적 그래프
- 연속 기록 표시

### 3. GameCreateForm

**파일**: `src/components/team/GameCreateForm.tsx`

**기능**:
- 경기 생성 폼
- 상대팀 선택
- 일정 선택
- 경기장 선택

### 4. GameResultForm

**파일**: `src/components/team/GameResultForm.tsx`

**기능**:
- 경기 결과 입력 폼
- 득점 입력
- 승리 팀 자동 계산
- 통계 자동 업데이트 (Cloud Function)

---

## 🔐 권한 정책

### 경기 생성
- **권한**: 팀 소속 필수 (owner/admin/member 모두 가능)
- **검증**: `useMyTeams` 훅으로 팀 소속 확인

### 경기 결과 기록
- **권한**: 팀장/관리자만 (owner/admin)
- **검증**: `teams/{teamId}/members/{uid}.role` 확인

### 경기 조회
- **권한**: 공개 (인증 불필요)
- **제한**: 팀 정보는 공개, 상세 통계는 팀원만

---

## 🚀 구현 순서

### Phase 1: 데이터 모델 및 서비스 (1일)
1. ✅ `src/types/teamGame.ts` 타입 정의
2. ✅ `src/services/teamGameService.ts` 구현
3. ✅ Firestore 인덱스 생성

### Phase 2: Cloud Functions (1일)
1. ✅ `functions/src/team/onTeamGameCompleted.ts` 구현
2. ✅ `functions/src/index.ts`에 export 추가
3. ✅ 배포 및 테스트

### Phase 3: UI 구현 (2일)
1. ✅ `/teams/:teamId/games` 페이지
2. ✅ `/teams/:teamId/stats` 페이지
3. ✅ 경기 생성/결과 입력 폼

### Phase 4: 통합 및 최적화 (1일)
1. ✅ 기존 팀 페이지와 연동
2. ✅ 성능 최적화
3. ✅ 에러 처리 강화

**총 예상 시간**: 5일

---

## 📋 완료 기준

- [ ] 경기 생성 정상 작동
- [ ] 경기 결과 기록 정상 작동
- [ ] 통계 자동 업데이트 정상 작동
- [ ] 경기 목록 조회 정상 작동
- [ ] 통계 페이지 정상 표시
- [ ] 권한 체크 정상 작동

---

## 🎯 다음 단계

이 설계를 기반으로 구현을 시작합니다.

**Step 2 완료 후**:
- ✅ 팀 경기 기록 시스템 완성
- 🚀 Step 3: 협회 시스템 완성 또는 리그 시스템

---

## 📝 참고사항

### 기존 시스템과의 차별화

- **토너먼트 경기**: `tournaments` 컬렉션 사용 (별도 시스템)
- **팀 경기**: `team_games` 컬렉션 사용 (팀 중심 기록)
- **연동**: 토너먼트 경기는 `team_games`에도 기록 가능 (선택적)

### 확장 가능성

- 시즌별 통계 추가
- 선수별 통계 추가
- 경기 상세 기록 (득점자, 어시스트 등)
- 리그 랭킹 시스템 연동

# 🔥 팀 경기 기록 시스템 구현 가이드 (Step 2)

**생성일**: 2025-01-XX  
**목적**: 스포츠 플랫폼 핵심 기능 - 팀 경기 기록 및 통계 시스템  
**상태**: 📋 구현 준비 완료

---

## 🎯 핵심 원칙

```
Team = 주체
Game = 활동 기록
Stats = 누적 결과
Match = 상대 찾기/매칭
Tournament Match = 대회 경기
```

**핵심 설계**:
- `team_games` = 모든 실제 경기 기록의 공통 표준 레이어
- `teams.stats` = 팀 누적 성적 자동 계산 (denormalized)
- 완료 시 전체 재계산 방식 (안정성 우선)

---

## 📊 Firestore 데이터 모델

### 1. team_games 컬렉션

**경로**: `team_games/{gameId}`

**역할**: 모든 실제 경기 기록 저장소 (공통 표준 레이어)

```typescript
interface TeamGame {
  // 기본 식별자
  id: string;                    // 문서 ID (자동 생성)
  
  // 종목 정보
  sportType: "football" | "basketball" | "baseball" | string;
  
  // 경기 유형
  gameType: "friendly" | "league" | "tournament" | "scrimmage";
  
  // 소스 정보 (기존 시스템과의 연결)
  sourceType: "manual" | "match" | "tournament";  // 생성 경로
  sourceId?: string | null;                       // matches/{id} 또는 tournament_match/{id}
  
  // 팀 정보 (denormalized for performance)
  homeTeamId: string;            // 홈팀 ID
  homeTeamName: string;          // 홈팀 이름 (캐시)
  awayTeamId: string;            // 원정팀 ID
  awayTeamName: string;          // 원정팀 이름 (캐시)
  
  // 일정 정보
  scheduledAt: Timestamp;        // 예정 일시 (필수)
  playedAt?: Timestamp;          // 실제 경기 일시 (결과 기록 시)
  location?: string | null;      // 경기장 이름
  address?: string | null;       // 경기장 주소
  
  // 경기 결과
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed";
  homeScore?: number;            // 홈팀 득점
  awayScore?: number;            // 원정팀 득점
  winnerTeamId?: string | null;  // 승리 팀 ID (무승부면 null)
  resultType?: "home-win" | "away-win" | "draw" | null;  // 결과 타입
  
  // 메타데이터
  createdBy: string;             // 생성자 UID
  recordedBy?: string | null;    // 결과 기록자 UID
  recordedAt?: Timestamp | null; // 결과 기록 시각
  notes?: string | null;         // 메모 (선택)
  
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
    },
    {
      "collectionGroup": "team_games",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sourceType", "order": "ASCENDING" },
        { "fieldPath": "sourceId", "order": "ASCENDING" }
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
  games: number;                  // 전체 완료 경기 수
  wins: number;                   // 승
  draws: number;                  // 무
  losses: number;                 // 패
  
  // 득실점
  goalsFor: number;               // 득점
  goalsAgainst: number;           // 실점
  goalDiff: number;               // 득실차 (goalsFor - goalsAgainst)
  
  // 승률
  winRate: number;                // 승률 (wins / games, 0-1 범위)
  
  // 최근 결과
  lastResult: "win" | "draw" | "loss" | null;  // 마지막 경기 결과
  
  // 연속 기록
  streakType: "win" | "loss" | "draw" | "none";  // 연승/연패/연무
  streakCount: number;            // 연속 횟수
  
  // 마지막 업데이트
  lastUpdatedAt: Timestamp;
}
```

**초기값**:
```typescript
const initialStats: TeamStats = {
  games: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDiff: 0,
  winRate: 0,
  lastResult: null,
  streakType: "none",
  streakCount: 0,
  lastUpdatedAt: serverTimestamp(),
};
```

---

## 🔄 Cloud Functions

### onTeamGameWrite

**파일**: `functions/src/team/onTeamGameWrite.ts`

**Trigger**: `team_games/{gameId}` onWrite (create/update/delete 모두 감지)

**역할**: 경기 상태 변경 시 관련 팀 통계 재계산

```typescript
/**
 * 🔥 팀 경기 기록 변경 시 통계 자동 재계산
 * 
 * Trigger: team_games/{gameId} onWrite
 * 
 * 핵심 원칙: 완료 시 전체 재계산 (안정성 우선)
 * 
 * Actions:
 * 1. 경기 생성/수정/삭제 감지
 * 2. 관련 팀(homeTeamId, awayTeamId) 통계 재계산
 * 3. teams.stats 업데이트
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();
const logger = functions.logger;

export const onTeamGameWrite = functions.firestore
  .document("team_games/{gameId}")
  .onWrite(async (change, context) => {
    const { gameId } = context.params;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    logger.info("🔄 [onTeamGameWrite] 경기 기록 변경 감지:", {
      gameId,
      beforeStatus: before?.status,
      afterStatus: after?.status,
      eventType: before ? (after ? "update" : "delete") : "create",
    });

    try {
      // 삭제된 경우
      if (!after && before) {
        const { homeTeamId, awayTeamId } = before;
        logger.info("🗑️ [onTeamGameWrite] 경기 삭제 감지, 통계 재계산:", {
          gameId,
          homeTeamId,
          awayTeamId,
        });

        await Promise.all([
          rebuildTeamStats(homeTeamId),
          rebuildTeamStats(awayTeamId),
        ]);

        return;
      }

      // 생성/수정된 경우
      if (after) {
        const { homeTeamId, awayTeamId, status } = after;

        // completed 상태인 경기만 통계에 반영
        if (status === "completed") {
          logger.info("✅ [onTeamGameWrite] 완료 경기 감지, 통계 재계산:", {
            gameId,
            homeTeamId,
            awayTeamId,
          });

          await Promise.all([
            rebuildTeamStats(homeTeamId),
            rebuildTeamStats(awayTeamId),
          ]);
        } else {
          // scheduled → cancelled 등 상태 변경 시에도 재계산
          // (이전에 completed였다가 취소된 경우 대비)
          if (before?.status === "completed" && status !== "completed") {
            logger.info("🔄 [onTeamGameWrite] 완료 → 취소 변경, 통계 재계산:", {
              gameId,
              homeTeamId,
              awayTeamId,
            });

            await Promise.all([
              rebuildTeamStats(homeTeamId),
              rebuildTeamStats(awayTeamId),
            ]);
          }
        }
      }
    } catch (error: any) {
      logger.error("❌ [onTeamGameWrite] 통계 재계산 실패:", {
        gameId,
        error: error.message,
        stack: error.stack,
      });
      // 에러 발생해도 경기 기록은 유지 (통계만 실패)
    }
  });

/**
 * 팀 통계 재계산 (완료된 경기만 집계)
 */
async function rebuildTeamStats(teamId: string): Promise<void> {
  const teamRef = db.doc(`teams/${teamId}`);
  const teamDoc = await teamRef.get();

  if (!teamDoc.exists()) {
    logger.warn("⚠️ [rebuildTeamStats] 팀 문서가 없음:", { teamId });
    return;
  }

  logger.info("🔄 [rebuildTeamStats] 통계 재계산 시작:", { teamId });

  // 해당 팀의 완료된 경기만 조회
  const [homeGamesSnap, awayGamesSnap] = await Promise.all([
    db.collection("team_games")
      .where("homeTeamId", "==", teamId)
      .where("status", "==", "completed")
      .get(),
    db.collection("team_games")
      .where("awayTeamId", "==", teamId)
      .where("status", "==", "completed")
      .get(),
  ]);

  const allGames = [
    ...homeGamesSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), isHome: true })),
    ...awayGamesSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), isHome: false })),
  ];

  // 중복 제거 (이론적으로는 없어야 하지만 안전을 위해)
  const uniqueGames = Array.from(
    new Map(allGames.map(game => [game.id, game])).values()
  );

  // 날짜순 정렬 (최신순)
  uniqueGames.sort((a, b) => {
    const aTime = a.playedAt?.toMillis() || a.scheduledAt?.toMillis() || 0;
    const bTime = b.playedAt?.toMillis() || b.scheduledAt?.toMillis() || 0;
    return bTime - aTime;
  });

  // 통계 계산
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  const results: Array<"win" | "draw" | "loss"> = [];

  for (const game of uniqueGames) {
    const isHome = game.isHome;
    const teamScore = isHome ? (game.homeScore || 0) : (game.awayScore || 0);
    const opponentScore = isHome ? (game.awayScore || 0) : (game.homeScore || 0);

    // 점수가 없으면 스킵
    if (typeof teamScore !== "number" || typeof opponentScore !== "number") {
      continue;
    }

    goalsFor += teamScore;
    goalsAgainst += opponentScore;

    if (teamScore > opponentScore) {
      wins++;
      results.push("win");
    } else if (teamScore < opponentScore) {
      losses++;
      results.push("loss");
    } else {
      draws++;
      results.push("draw");
    }
  }

  const games = uniqueGames.length;
  const goalDiff = goalsFor - goalsAgainst;
  const winRate = games > 0 ? wins / games : 0;

  // 최근 결과
  const lastResult = results.length > 0 ? results[0] : null;

  // 연속 기록 계산
  const streak = calculateStreak(results);

  const newStats: TeamStats = {
    games,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDiff,
    winRate,
    lastResult,
    streakType: streak.type,
    streakCount: streak.count,
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await teamRef.update({
    stats: newStats,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info("✅ [rebuildTeamStats] 통계 재계산 완료:", {
    teamId,
    games,
    wins,
    draws,
    losses,
    winRate: winRate.toFixed(3),
    streakType: streak.type,
    streakCount: streak.count,
  });
}

/**
 * 연속 기록 계산
 */
function calculateStreak(
  results: Array<"win" | "draw" | "loss">
): { type: "win" | "loss" | "draw" | "none"; count: number } {
  if (results.length === 0) {
    return { type: "none", count: 0 };
  }

  const firstResult = results[0];
  let count = 1;

  for (let i = 1; i < results.length; i++) {
    if (results[i] === firstResult) {
      count++;
    } else {
      break;
    }
  }

  return {
    type: firstResult,
    count,
  };
}
```

**index.ts에 추가**:
```typescript
export { onTeamGameWrite } from "./team/onTeamGameWrite";
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
 * - 경기 수정
 * - 경기 완료 처리
 * - 경기 취소
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
  deleteDoc,
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
  address?: string;
  gameType?: "friendly" | "league" | "tournament" | "scrimmage";
  sourceType?: "manual" | "match" | "tournament";
  sourceId?: string | null;
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

  // 같은 팀끼리 경기 불가
  if (input.homeTeamId === input.awayTeamId) {
    throw new Error("같은 팀끼리는 경기를 생성할 수 없습니다.");
  }

  const gameData: Omit<TeamGame, "id"> = {
    sportType: homeTeamData.sportType || "football",
    gameType: input.gameType || "friendly",
    sourceType: input.sourceType || "manual",
    sourceId: input.sourceId || null,
    homeTeamId: input.homeTeamId,
    homeTeamName: homeTeamData.name,
    awayTeamId: input.awayTeamId,
    awayTeamName: awayTeamData.name,
    scheduledAt: Timestamp.fromDate(input.scheduledAt),
    location: input.location || null,
    address: input.address || null,
    status: "scheduled",
    createdBy: input.createdBy,
    notes: input.notes || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const gameRef = await addDoc(collection(db, "team_games"), gameData);

  return gameRef.id;
}

/**
 * 경기 결과 기록 (완료 처리)
 */
export async function completeTeamGame(
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
  const { status, homeTeamId, awayTeamId } = gameData;

  if (status === "completed") {
    throw new Error("이미 기록된 경기입니다.");
  }

  // 승리 팀 결정
  let winnerTeamId: string | null = null;
  let resultType: "home-win" | "away-win" | "draw" | null = null;

  if (result.homeScore > result.awayScore) {
    winnerTeamId = homeTeamId;
    resultType = "home-win";
  } else if (result.homeScore < result.awayScore) {
    winnerTeamId = awayTeamId;
    resultType = "away-win";
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
}

/**
 * 경기 취소
 */
export async function cancelTeamGame(
  gameId: string,
  reason?: string
): Promise<void> {
  const gameRef = doc(db, "team_games", gameId);
  const gameDoc = await getDoc(gameRef);

  if (!gameDoc.exists()) {
    throw new Error("경기를 찾을 수 없습니다.");
  }

  await updateDoc(gameRef, {
    status: "cancelled",
    notes: reason || null,
    updatedAt: serverTimestamp(),
  });

  // Cloud Function이 자동으로 stats 재계산
}

/**
 * 경기 수정
 */
export async function updateTeamGame(
  gameId: string,
  updates: {
    scheduledAt?: Date;
    location?: string;
    address?: string;
    notes?: string;
  }
): Promise<void> {
  const gameRef = doc(db, "team_games", gameId);
  const gameDoc = await getDoc(gameRef);

  if (!gameDoc.exists()) {
    throw new Error("경기를 찾을 수 없습니다.");
  }

  const updateData: any = {
    updatedAt: serverTimestamp(),
  };

  if (updates.scheduledAt) {
    updateData.scheduledAt = Timestamp.fromDate(updates.scheduledAt);
  }
  if (updates.location !== undefined) {
    updateData.location = updates.location || null;
  }
  if (updates.address !== undefined) {
    updateData.address = updates.address || null;
  }
  if (updates.notes !== undefined) {
    updateData.notes = updates.notes || null;
  }

  await updateDoc(gameRef, updateData);
}

/**
 * 팀의 경기 목록 조회
 */
export async function getTeamGames(
  teamId: string,
  options?: {
    status?: "scheduled" | "completed" | "all";
    gameType?: "friendly" | "league" | "tournament" | "scrimmage" | "all";
    limit?: number;
  }
): Promise<TeamGame[]> {
  const statusFilter = options?.status && options.status !== "all" 
    ? [where("status", "==", options.status)]
    : [];

  const gameTypeFilter = options?.gameType && options.gameType !== "all"
    ? [where("gameType", "==", options.gameType)]
    : [];

  // 홈팀 경기 조회
  const homeGamesQuery = query(
    collection(db, "team_games"),
    where("homeTeamId", "==", teamId),
    ...statusFilter,
    ...gameTypeFilter,
    orderBy("scheduledAt", "desc"),
    ...(options?.limit ? [firestoreLimit(options.limit)] : [])
  );

  // 원정팀 경기 조회
  const awayGamesQuery = query(
    collection(db, "team_games"),
    where("awayTeamId", "==", teamId),
    ...statusFilter,
    ...gameTypeFilter,
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

  // 중복 제거
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

/**
 * 경기 삭제
 */
export async function deleteTeamGame(gameId: string): Promise<void> {
  const gameRef = doc(db, "team_games", gameId);
  const gameDoc = await getDoc(gameRef);

  if (!gameDoc.exists()) {
    throw new Error("경기를 찾을 수 없습니다.");
  }

  await deleteDoc(gameRef);

  // Cloud Function이 자동으로 stats 재계산
}
```

---

## 📝 타입 정의

### src/types/teamGame.ts

```typescript
import { Timestamp } from "firebase/firestore";

/**
 * 팀 경기 기록
 */
export interface TeamGame {
  id: string;
  sportType: string;
  gameType: "friendly" | "league" | "tournament" | "scrimmage";
  sourceType: "manual" | "match" | "tournament";
  sourceId?: string | null;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  scheduledAt: Timestamp;
  playedAt?: Timestamp;
  location?: string | null;
  address?: string | null;
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed";
  homeScore?: number;
  awayScore?: number;
  winnerTeamId?: string | null;
  resultType?: "home-win" | "away-win" | "draw" | null;
  createdBy: string;
  recordedBy?: string | null;
  recordedAt?: Timestamp | null;
  notes?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * 팀 통계 (denormalized)
 */
export interface TeamStats {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  winRate: number;
  lastResult: "win" | "draw" | "loss" | null;
  streakType: "win" | "loss" | "draw" | "none";
  streakCount: number;
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
- 경기 유형별 필터링 (친선/리그/토너먼트)
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
- 경기 유형 선택

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
- **권한**: 팀 소속 필수 (owner/admin만)
- **검증**: `useMyTeams` + `role === "owner" || role === "admin"`

### 경기 결과 기록
- **권한**: 팀장/관리자만 (owner/admin)
- **검증**: `teams/{teamId}/members/{uid}.role` 확인

### 경기 조회
- **권한**: 공개 (인증 불필요)
- **제한**: 팀 정보는 공개, 상세 통계는 팀원만

---

## 🚀 구현 순서

### Phase G1: 기본 경기 기록 (2일)
1. ✅ `src/types/teamGame.ts` 타입 정의
2. ✅ `src/services/teamGameService.ts` 구현
3. ✅ Firestore 인덱스 생성
4. ✅ `/teams/:teamId/games` 페이지
5. ✅ `/teams/:teamId/games/create` 페이지

### Phase G2: 완료 처리 + 통계 (2일)
1. ✅ `functions/src/team/onTeamGameWrite.ts` 구현
2. ✅ `rebuildTeamStats` 함수 구현
3. ✅ `functions/src/index.ts`에 export 추가
4. ✅ 배포 및 테스트
5. ✅ `/teams/:teamId/stats` 페이지

### Phase G3: 기존 시스템 연동 (1일)
1. ✅ `matches` 연결 (sourceType: "match")
2. ✅ `tournament` 연결 (sourceType: "tournament")
3. ✅ 통합 테스트

**총 예상 시간**: 5일

---

## 📋 완료 기준

- [ ] 경기 생성 정상 작동
- [ ] 경기 결과 기록 정상 작동
- [ ] 통계 자동 업데이트 정상 작동
- [ ] 경기 목록 조회 정상 작동
- [ ] 통계 페이지 정상 표시
- [ ] 권한 체크 정상 작동
- [ ] matches/tournament 연동 정상 작동

---

## 🎯 다음 단계

이 설계를 기반으로 구현을 시작합니다.

**Step 2 완료 후**:
- ✅ 팀 경기 기록 시스템 완성
- 🚀 Step 3: 협회 시스템 완성 또는 리그 시스템

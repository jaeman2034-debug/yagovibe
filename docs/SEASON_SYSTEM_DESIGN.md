# 🔥 Season System 설계

**생성일**: 2025-01-XX  
**목적**: 시즌별 통계 분리 및 시즌 관리 시스템  
**우선순위**: ⭐ 매우 중요

---

## 🎯 핵심 목표

### 문제
현재 구조에서는 모든 경기가 `teams.stats`에 합쳐집니다.

```
2024 경기 + 2025 경기 + 2026 경기 → teams.stats
```

**문제점**:
- 시즌별 통계 분리 불가
- 시즌별 랭킹 불가
- 과거 데이터와 현재 데이터 혼재

### 해결
**Season Layer** 추가로 시즌별 통계 분리

```
2024 시즌 → season_stats/2024
2025 시즌 → season_stats/2025
2026 시즌 → season_stats/2026
```

---

## 📊 Firestore 데이터 모델

### 1. seasons 컬렉션

**경로**: `seasons/{seasonId}`

```typescript
interface Season {
  id: string;
  name: string; // "2026 시즌"
  sportType: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: "upcoming" | "active" | "completed";
  description?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

### 2. team_games에 seasonId 추가

**기존 구조**:
```typescript
team_games/{gameId}
{
  // ... 기존 필드
}
```

**확장 구조**:
```typescript
team_games/{gameId}
{
  // ... 기존 필드
  seasonId?: string; // 시즌 ID (선택적, 하위 호환)
}
```

**하위 호환성**: `seasonId`가 없으면 현재 시즌으로 처리

---

### 3. 시즌별 통계

**경로**: `teams/{teamId}/season_stats/{seasonId}`

```typescript
interface SeasonStats {
  seasonId: string;
  teamId: string;
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

**전체 통계와의 관계**:
- `teams.stats` = 전체 통계 (모든 시즌 합산)
- `teams/season_stats/{seasonId}` = 시즌별 통계

---

## 🔄 Cloud Functions

### onTeamGameWrite 확장

**기존**: `teams.stats`만 업데이트

**확장**: 시즌별 통계도 업데이트

```typescript
// 기존 로직
await rebuildTeamStats(teamId);

// 추가 로직
if (gameData.seasonId) {
  await rebuildSeasonStats(teamId, gameData.seasonId);
}
```

---

### rebuildSeasonStats()

```typescript
async function rebuildSeasonStats(
  teamId: string,
  seasonId: string
): Promise<void> {
  // 해당 시즌의 완료된 경기만 조회
  const gamesSnap = await db.collection("team_games")
    .where("homeTeamId", "==", teamId)
    .where("status", "==", "completed")
    .where("seasonId", "==", seasonId)
    .get();
  
  // ... 통계 계산 (기존 rebuildTeamStats와 동일)
  
  // season_stats에 저장
  await db.doc(`teams/${teamId}/season_stats/${seasonId}`).set(stats);
}
```

---

## 🎨 UI 구조

### 시즌 선택기

**위치**: 랭킹 페이지, 통계 페이지

**기능**:
- 시즌 선택 드롭다운
- "전체" 옵션 (모든 시즌 합산)

---

### 시즌별 랭킹

**경로**: `/sports/:sportType/ranking?season=2026`

**기능**:
- 선택한 시즌의 랭킹만 표시
- 시즌별 통계 조회

---

### 시즌별 통계

**경로**: `/teams/:teamId/stats?season=2026`

**기능**:
- 선택한 시즌의 통계만 표시
- 시즌별 성적 그래프

---

## 🔄 마이그레이션 전략

### 기존 데이터 처리

**문제**: 기존 `team_games`에는 `seasonId`가 없음

**해결**:
1. 기본 시즌 생성 ("2024 시즌", "2025 시즌" 등)
2. 기존 경기는 `scheduledAt` 기준으로 시즌 자동 할당
3. 기존 통계는 "전체"로 유지

---

## 📋 구현 순서

### Phase S1: 기본 구조
1. ✅ `seasons` 컬렉션 타입 정의
2. ✅ `team_games.seasonId` 필드 추가
3. ✅ `season_stats` 서브컬렉션 타입 정의

### Phase S2: Cloud Function 확장
1. ✅ `onTeamGameWrite`에 시즌별 통계 추가
2. ✅ `rebuildSeasonStats()` 함수 구현

### Phase S3: UI 구현
1. ✅ 시즌 선택기 컴포넌트
2. ✅ 시즌별 랭킹 페이지
3. ✅ 시즌별 통계 페이지

---

## 🎯 완료 기준

- [ ] 시즌 생성/조회
- [ ] team_games에 seasonId 연결
- [ ] 시즌별 통계 자동 계산
- [ ] 시즌별 랭킹 조회
- [ ] 기존 데이터 마이그레이션

---

## 📝 참고 문서

- `docs/TEAM_GAME_SYSTEM_IMPLEMENTATION.md` - 경기 시스템 구현 가이드
- `src/types/teamGame.ts` - team_games 타입 정의

---

## 🎉 평가

**Season System**은 **데이터 안정성과 확장성**을 위한 핵심 구조입니다.

이 시스템이 들어가면:
- ✅ 시즌별 통계 분리
- ✅ 시즌별 랭킹
- ✅ 과거 데이터 보존
- ✅ 리그 시즌 관리

**플랫폼 완성도가 한 단계 올라갑니다.** ⚽

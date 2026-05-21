# 🧠 YAGO VIBE SPORTS - Stats + Ranking Engine 완전 설계

> **작성일**: 2024년  
> **목적**: 경기 → 기록 → 통계 → 랭킹 흐름을 완성하는 핵심 엔진

---

## 📋 목차

1. [Stats + Ranking Engine 개념](#1-stats--ranking-engine-개념)
2. [Firestore Stats 구조](#2-firestore-stats-구조)
3. [Ranking 구조](#3-ranking-구조)
4. [Stats 업데이트 흐름](#4-stats-업데이트-흐름)
5. [Cloud Functions 트리거](#5-cloud-functions-트리거)
6. [Ranking 계산 로직](#6-ranking-계산-로직)
7. [UI 구조](#7-ui-구조)
8. [시스템 연결](#8-시스템-연결)
9. [실제 구현 코드](#9-실제-구현-코드)

---

## 1️⃣ Stats + Ranking Engine 개념

### Stats + Ranking Engine 역할

경기에서 발생한 데이터가 자동으로 누적됩니다:

```
Match
  ↓
Match Events
  ↓
Player Stats
  ↓
Team Stats
  ↓
Ranking
```

### 경기 → 기록 → 통계 → 순위

경기 하나가 완료되면:
1. **경기 이벤트** 기록
2. **선수 통계** 자동 업데이트
3. **팀 통계** 자동 업데이트
4. **랭킹** 자동 재계산
5. **대회 순위** 자동 업데이트

---

## 2️⃣ Firestore Stats 구조

### 2-1. Player Stats

```
players/{playerId}/stats/{seasonId}
```

**문서 스키마**:
```typescript
{
  seasonId: string; // "2024" 또는 "2024-spring"
  matches: number; // 출전 경기 수
  goals: number; // 득점
  assists: number; // 어시스트
  yellowCards: number; // 경고
  redCards: number; // 퇴장
  minutesPlayed: number; // 출전 시간 (분)
  cleanSheets?: number; // 클린시트 (GK)
  saves?: number; // 세이브 (GK)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2-2. Team Stats

```
teams/{teamId}/stats/{seasonId}
```

**문서 스키마**:
```typescript
{
  seasonId: string;
  matches: number; // 경기 수
  wins: number; // 승
  draws: number; // 무
  losses: number; // 패
  goalsFor: number; // 득점
  goalsAgainst: number; // 실점
  goalDifference: number; // 득실차
  points: number; // 승점 (wins * 3 + draws * 1)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2-3. Tournament Team Stats

```
tournaments/{tournamentId}/teamStats/{teamId}
```

**문서 스키마**:
```typescript
{
  teamId: string;
  teamName: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  rank: number; // 순위
  updatedAt: Timestamp;
}
```

---

## 3️⃣ Ranking 구조

### 3-1. Team Ranking

```
rankings/{seasonId}/teams/{teamId}
```

**문서 스키마**:
```typescript
{
  seasonId: string;
  teamId: string;
  teamName: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  rank: number; // 순위 (1, 2, 3, ...)
  previousRank?: number; // 이전 순위
  rankChange?: number; // 순위 변동 (+1, -1, 0)
  updatedAt: Timestamp;
}
```

### 3-2. Player Ranking (득점)

```
rankings/{seasonId}/players/goals/{playerId}
```

**문서 스키마**:
```typescript
{
  seasonId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  goals: number;
  assists: number;
  matches: number;
  rank: number; // 득점 순위
  updatedAt: Timestamp;
}
```

### 3-3. Player Ranking (어시스트)

```
rankings/{seasonId}/players/assists/{playerId}
```

**문서 스키마**:
```typescript
{
  seasonId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  assists: number;
  goals: number;
  matches: number;
  rank: number; // 어시스트 순위
  updatedAt: Timestamp;
}
```

---

## 4️⃣ Stats 업데이트 흐름

### 4-1. 경기 이벤트 → Stats 업데이트

```
경기 이벤트 기록
  ↓
matches/{matchId}/events/{eventId} 생성
  ↓
Cloud Function 트리거
  ↓
Player Stats 업데이트
  ↓
Team Stats 업데이트
  ↓
Ranking 재계산
```

### 4-2. 골 기록 시

```typescript
// 골 기록
{
  type: "goal",
  playerId: "player123",
  teamId: "team1",
  minute: 35
}

// 자동 업데이트
players/{playerId}/stats/{seasonId}
  → goals: +1
  → matches: +1 (첫 출전인 경우)

teams/{teamId}/stats/{seasonId}
  → goalsFor: +1

rankings/{seasonId}/players/goals/{playerId}
  → goals: +1
  → rank: 재계산
```

### 4-3. 어시스트 기록 시

```typescript
// 어시스트 기록
{
  type: "goal",
  playerId: "player123",
  assistPlayerId: "player456",
  teamId: "team1"
}

// 자동 업데이트
players/{assistPlayerId}/stats/{seasonId}
  → assists: +1

rankings/{seasonId}/players/assists/{assistPlayerId}
  → assists: +1
  → rank: 재계산
```

### 4-4. 경기 완료 시

```typescript
// 경기 완료
{
  status: "completed",
  score: { home: 3, away: 2 }
}

// 자동 업데이트
teams/{homeTeamId}/stats/{seasonId}
  → matches: +1
  → wins: +1
  → goalsFor: +3
  → goalsAgainst: +2
  → points: +3

teams/{awayTeamId}/stats/{seasonId}
  → matches: +1
  → losses: +1
  → goalsFor: +2
  → goalsAgainst: +3
  → points: +0

rankings/{seasonId}/teams/{teamId}
  → 모든 필드 업데이트
  → rank: 재계산
```

---

## 5️⃣ Cloud Functions 트리거

### 5-1. 경기 이벤트 생성 시 Stats 업데이트

```typescript
// functions/src/stats/onMatchEventCreated.ts
export const onMatchEventCreated = onDocumentCreated(
  "matches/{matchId}/events/{eventId}",
  async (event) => {
    const { matchId, eventId } = event.params;
    const eventData = event.data?.data();
    
    // 경기 정보 조회
    const matchRef = db.doc(`matches/${matchId}`);
    const matchSnap = await matchRef.get();
    const matchData = matchSnap.data();
    
    const seasonId = getSeasonId(matchData.date);
    
    // 골인 경우
    if (eventData.type === "goal") {
      // 선수 통계 업데이트
      const playerStatsRef = db.doc(`players/${eventData.playerId}/stats/${seasonId}`);
      await playerStatsRef.set({
        goals: admin.firestore.FieldValue.increment(1),
        matches: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      
      // 팀 통계 업데이트
      const teamStatsRef = db.doc(`teams/${eventData.teamId}/stats/${seasonId}`);
      await teamStatsRef.set({
        goalsFor: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      
      // 어시스트인 경우
      if (eventData.assistPlayerId) {
        const assistStatsRef = db.doc(`players/${eventData.assistPlayerId}/stats/${seasonId}`);
        await assistStatsRef.set({
          assists: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      
      // 랭킹 재계산
      await recalculatePlayerRanking(seasonId, "goals");
      if (eventData.assistPlayerId) {
        await recalculatePlayerRanking(seasonId, "assists");
      }
    }
    
    // 경고/퇴장인 경우
    if (eventData.type === "yellow_card" || eventData.type === "red_card") {
      const cardType = eventData.type === "yellow_card" ? "yellowCards" : "redCards";
      const playerStatsRef = db.doc(`players/${eventData.playerId}/stats/${seasonId}`);
      await playerStatsRef.set({
        [cardType]: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  }
);
```

### 5-2. 경기 완료 시 Stats 및 Ranking 업데이트

```typescript
// functions/src/stats/onMatchCompleted.ts
export const onMatchCompleted = onDocumentUpdated(
  "matches/{matchId}",
  async (event) => {
    const { matchId } = event.params;
    const before = event.data.before.data();
    const after = event.data.after.data();
    
    // 경기가 완료된 경우만 처리
    if (before.status !== "completed" && after.status === "completed") {
      const seasonId = getSeasonId(after.date);
      const { homeTeamId, awayTeamId, score } = after;
      
      // 홈팀 통계 업데이트
      await updateTeamMatchStats(
        homeTeamId,
        seasonId,
        score.home,
        score.away,
        true // isHome
      );
      
      // 원정팀 통계 업데이트
      await updateTeamMatchStats(
        awayTeamId,
        seasonId,
        score.away,
        score.home,
        false // isHome
      );
      
      // 랭킹 재계산
      await recalculateTeamRanking(seasonId);
      
      // 대회 순위 업데이트 (대회 경기인 경우)
      if (after.tournamentId) {
        await updateTournamentStandings(after.tournamentId);
      }
    }
  }
);

async function updateTeamMatchStats(
  teamId: string,
  seasonId: string,
  goalsFor: number,
  goalsAgainst: number,
  isHome: boolean
) {
  const teamStatsRef = db.doc(`teams/${teamId}/stats/${seasonId}`);
  const teamStatsSnap = await teamStatsRef.get();
  const currentStats = teamStatsSnap.data() || {};
  
  const result = goalsFor > goalsAgainst ? "win" : 
                 goalsFor < goalsAgainst ? "loss" : "draw";
  
  const updates: any = {
    matches: admin.firestore.FieldValue.increment(1),
    goalsFor: admin.firestore.FieldValue.increment(goalsFor),
    goalsAgainst: admin.firestore.FieldValue.increment(goalsAgainst),
    goalDifference: admin.firestore.FieldValue.increment(goalsFor - goalsAgainst),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  if (result === "win") {
    updates.wins = admin.firestore.FieldValue.increment(1);
    updates.points = admin.firestore.FieldValue.increment(3);
  } else if (result === "draw") {
    updates.draws = admin.firestore.FieldValue.increment(1);
    updates.points = admin.firestore.FieldValue.increment(1);
  } else {
    updates.losses = admin.firestore.FieldValue.increment(1);
  }
  
  await teamStatsRef.set(updates, { merge: true });
}
```

---

## 6️⃣ Ranking 계산 로직

### 6-1. 팀 순위 계산

```typescript
// functions/src/stats/recalculateTeamRanking.ts
export async function recalculateTeamRanking(seasonId: string) {
  // 모든 팀 통계 조회
  const teamsRef = db.collectionGroup("stats")
    .where("seasonId", "==", seasonId);
  const teamsSnap = await teamsRef.get();
  
  const teams = teamsSnap.docs.map(doc => ({
    teamId: doc.ref.parent.parent?.id,
    ...doc.data()
  }));
  
  // 정렬 기준:
  // 1. 승점 (points) 내림차순
  // 2. 득실차 (goalDifference) 내림차순
  // 3. 득점 (goalsFor) 내림차순
  teams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
  
  // 랭킹 업데이트
  const batch = db.batch();
  teams.forEach((team, index) => {
    const rank = index + 1;
    const rankingRef = db.doc(`rankings/${seasonId}/teams/${team.teamId}`);
    
    const previousRank = team.rank || rank;
    const rankChange = previousRank - rank; // 양수면 상승, 음수면 하락
    
    batch.set(rankingRef, {
      ...team,
      rank,
      previousRank,
      rankChange,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  
  await batch.commit();
}
```

### 6-2. 선수 랭킹 계산 (득점)

```typescript
// functions/src/stats/recalculatePlayerRanking.ts
export async function recalculatePlayerRanking(
  seasonId: string,
  category: "goals" | "assists"
) {
  // 모든 선수 통계 조회
  const playersRef = db.collectionGroup("stats")
    .where("seasonId", "==", seasonId);
  const playersSnap = await playersRef.get();
  
  const players = playersSnap.docs.map(doc => ({
    playerId: doc.ref.parent.parent?.id,
    ...doc.data()
  }));
  
  // 정렬 기준: category 값 내림차순
  players.sort((a, b) => {
    const aValue = a[category] || 0;
    const bValue = b[category] || 0;
    return bValue - aValue;
  });
  
  // 랭킹 업데이트
  const batch = db.batch();
  players.forEach((player, index) => {
    const rank = index + 1;
    const rankingRef = db.doc(`rankings/${seasonId}/players/${category}/${player.playerId}`);
    
    batch.set(rankingRef, {
      seasonId,
      playerId: player.playerId,
      [category]: player[category] || 0,
      matches: player.matches || 0,
      rank,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  
  await batch.commit();
}
```

---

## 7️⃣ UI 구조

### 7-1. Team Stats 페이지

```
/stats/team
```

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ 팀 통계                                  │
│                                          │
│ ┌───────────────────────────────────┐  │
│ │ 노원FC                              │  │
│ │                                     │  │
│ │ 경기: 10                            │  │
│ │ 승: 6  무: 2  패: 2                 │  │
│ │ 득점: 18  실점: 9                   │  │
│ │ 승점: 20                            │  │
│ └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 7-2. Player Stats 페이지

```
/stats/player
```

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ 선수 기록                                │
│                                          │
│ ┌───────────────────────────────────┐  │
│ │ 홍길동 (FW) - 노원FC                │  │
│ │                                     │  │
│ │ 경기: 12                            │  │
│ │ 득점: 8                             │  │
│ │ 도움: 3                             │  │
│ │ 경고: 2                             │  │
│ └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 7-3. Team Ranking 페이지

```
/stats/rank
```

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ 팀 순위                                  │
│                                          │
│ ┌───────────────────────────────────┐  │
│ │ 순위 │ 팀명    │ 경기 │ 승점 │ 득실차 │  │
│ ├───────────────────────────────────┤  │
│ │  1   │ 노원FC  │  10  │  20  │  +9   │  │
│ │  2   │ 상계FC  │  10  │  18  │  +5   │  │
│ │  3   │ 도봉FC  │  10  │  16  │  +3   │  │
│ └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 7-4. Player Ranking 페이지

```
/stats/player-rank
```

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ 득점 랭킹                                │
│                                          │
│ ┌───────────────────────────────────┐  │
│ │ 순위 │ 선수명  │ 팀명    │ 득점 │ 경기 │  │
│ ├───────────────────────────────────┤  │
│ │  1   │ 홍길동  │ 노원FC  │  12  │  10  │  │
│ │  2   │ 김철수  │ 상계FC  │  10  │  10  │  │
│ │  3   │ 박민수  │ 도봉FC  │   8  │  10  │  │
│ └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 8️⃣ 시스템 연결

### 8-1. 전체 플랫폼 흐름

```
Team
  ├ Chat
  ├ Event
  ├ Notice
  ├ Match
  │     ├ Lineups
  │     └ Events
  │           ↓
  │     Stats (자동 업데이트)
  │           ↓
  │     Ranking (자동 재계산)
  │
  └ Activity Feed
```

### 8-2. 경기 → 통계 → 랭킹 흐름

```
경기 생성
  ↓
경기 이벤트 기록
  ↓
Player Stats 업데이트
  ↓
Team Stats 업데이트
  ↓
Ranking 재계산
  ↓
UI 자동 반영
```

---

## 9️⃣ 실제 구현 코드

### 9-1. Stats Service

```typescript
// src/services/statsService.ts
export async function getTeamStats(
  teamId: string,
  seasonId: string
): Promise<TeamStats | null> {
  const statsRef = doc(db, "teams", teamId, "stats", seasonId);
  const statsSnap = await getDoc(statsRef);
  
  if (!statsSnap.exists()) {
    return null;
  }
  
  return {
    id: statsSnap.id,
    ...statsSnap.data()
  } as TeamStats;
}

export async function getPlayerStats(
  playerId: string,
  seasonId: string
): Promise<PlayerStats | null> {
  const statsRef = doc(db, "players", playerId, "stats", seasonId);
  const statsSnap = await getDoc(statsRef);
  
  if (!statsSnap.exists()) {
    return null;
  }
  
  return {
    id: statsSnap.id,
    ...statsSnap.data()
  } as PlayerStats;
}
```

### 9-2. Ranking Service

```typescript
// src/services/rankingService.ts
export async function getTeamRanking(
  seasonId: string,
  limit?: number
): Promise<TeamRanking[]> {
  const rankingRef = collection(db, "rankings", seasonId, "teams");
  let q = query(rankingRef, orderBy("rank", "asc"));
  
  if (limit) {
    q = query(q, limit(limit));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as TeamRanking[];
}

export async function getPlayerRanking(
  seasonId: string,
  category: "goals" | "assists",
  limit?: number
): Promise<PlayerRanking[]> {
  const rankingRef = collection(db, "rankings", seasonId, "players", category);
  let q = query(rankingRef, orderBy("rank", "asc"));
  
  if (limit) {
    q = query(q, limit(limit));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as PlayerRanking[];
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시 구현)
- [ ] Stats 타입 정의
- [ ] Ranking 타입 정의
- [ ] Stats Service 구현
- [ ] Ranking Service 구현
- [ ] Cloud Functions 트리거 구현

### Phase 2 (다음)
- [ ] Team Stats 페이지
- [ ] Player Stats 페이지
- [ ] Team Ranking 페이지
- [ ] Player Ranking 페이지

### Phase 3 (확장)
- [ ] Stats 대시보드
- [ ] Ranking 차트
- [ ] 시즌별 통계
- [ ] 통계 내보내기

---

**작성일**: 2024년  
**상태**: ✅ Stats + Ranking Engine 설계 완료

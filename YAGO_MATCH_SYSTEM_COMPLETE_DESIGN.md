# ⚽ YAGO VIBE SPORTS - Match System (경기 시스템) 완전 설계

> **작성일**: 2024년  
> **목적**: Team + Player + Stats + Tournament + Activity Feed를 연결하는 핵심 엔진

---

## 📋 목차

1. [Match System 개념](#1-match-system-개념)
2. [Firestore 구조](#2-firestore-구조)
3. [Match 타입 정의](#3-match-타입-정의)
4. [Cloud Functions 트리거](#4-cloud-functions-트리거)
5. [UI 구조](#5-ui-구조)
6. [Stats 자동 생성](#6-stats-자동-생성)
7. [Activity Feed 연결](#7-activity-feed-연결)
8. [Tournament 연결](#8-tournament-연결)
9. [실제 구현 코드](#9-실제-구현-코드)

---

## 1️⃣ Match System 개념

### Match System 역할

경기 시스템은 **스포츠 플랫폼의 핵심 도메인**입니다.

경기 하나가 생성되면 다음이 연결됩니다:

```
Match
 ├ Teams (홈팀/원정팀)
 ├ Players (선수 라인업)
 ├ Lineup (선발/교체)
 ├ Score (점수)
 ├ Events (경기 이벤트: 골, 어시스트, 카드 등)
 ├ Stats (자동 통계 생성)
 ├ Activity Feed (활동 피드)
 └ Chat (경기 채팅)
```

### Match = 플랫폼 데이터 허브

경기 하나가 생성되면:
1. **팀 통계** 자동 업데이트
2. **선수 통계** 자동 업데이트
3. **대회 순위** 자동 업데이트
4. **Activity Feed** 자동 생성
5. **랭킹** 자동 계산

---

## 2️⃣ Firestore 구조

### 2-1. Matches 컬렉션

```
matches/{matchId}
```

**문서 스키마**:
```typescript
{
  // 팀 정보
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  
  // 대회 정보 (선택적)
  tournamentId?: string;
  tournamentName?: string;
  
  // 일정 정보
  date: Timestamp;
  location: string;
  venueId?: string;
  
  // 경기 상태
  status: "scheduled" | "live" | "completed" | "cancelled";
  
  // 점수
  score: {
    home: number;
    away: number;
  };
  
  // 메타데이터
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 2-2. Match Lineups 서브컬렉션

```
matches/{matchId}/lineups/{playerId}
```

**문서 스키마**:
```typescript
{
  teamId: string;
  playerId: string;
  playerName: string;
  position: "GK" | "DF" | "MF" | "FW";
  number: number;
  isStarter: boolean; // 선발/교체
  substitutionMinute?: number; // 교체 시간
  substitutionPlayerId?: string; // 교체된 선수
}
```

### 2-3. Match Events 서브컬렉션

```
matches/{matchId}/events/{eventId}
```

**문서 스키마**:
```typescript
{
  type: "goal" | "assist" | "yellow_card" | "red_card" | "substitution";
  minute: number;
  teamId: string;
  playerId: string;
  playerName: string;
  
  // 골 관련
  assistPlayerId?: string;
  assistPlayerName?: string;
  
  // 교체 관련
  substitutionPlayerId?: string;
  substitutionPlayerName?: string;
  
  createdAt: Timestamp;
}
```

### 2-4. Team Matches 서브컬렉션

```
teams/{teamId}/matches/{matchId}
```

**문서 스키마**:
```typescript
{
  matchId: string;
  opponentTeamId: string;
  opponentTeamName: string;
  isHome: boolean; // 홈/원정
  date: Timestamp;
  score: {
    team: number;
    opponent: number;
  };
  result: "win" | "draw" | "loss";
  status: "scheduled" | "live" | "completed";
}
```

---

## 3️⃣ Match 타입 정의

### 3-1. Match 타입

```typescript
// src/types/match.ts
import { Timestamp } from "firebase/firestore";

export type MatchStatus = "scheduled" | "live" | "completed" | "cancelled";

export type MatchEventType = 
  | "goal" 
  | "assist" 
  | "yellow_card" 
  | "red_card" 
  | "substitution";

export interface Match {
  id: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  tournamentId?: string;
  tournamentName?: string;
  date: Timestamp;
  location: string;
  venueId?: string;
  status: MatchStatus;
  score: {
    home: number;
    away: number;
  };
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface MatchLineup {
  id: string;
  teamId: string;
  playerId: string;
  playerName: string;
  position: "GK" | "DF" | "MF" | "FW";
  number: number;
  isStarter: boolean;
  substitutionMinute?: number;
  substitutionPlayerId?: string;
}

export interface MatchEvent {
  id: string;
  type: MatchEventType;
  minute: number;
  teamId: string;
  playerId: string;
  playerName: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  substitutionPlayerId?: string;
  substitutionPlayerName?: string;
  createdAt: Timestamp;
}
```

---

## 4️⃣ Cloud Functions 트리거

### 4-1. 경기 생성 시 Activity 생성

```typescript
// functions/src/match/onMatchCreated.ts
export const onMatchCreated = onDocumentCreated(
  "matches/{matchId}",
  async (event) => {
    const { matchId } = event.params;
    const matchData = event.data?.data();
    
    // 홈팀 Activity 생성
    await db.collection(`teams/${matchData.homeTeamId}/activities`).add({
      type: "match",
      title: `${matchData.homeTeamName} vs ${matchData.awayTeamName} 경기 생성`,
      createdBy: matchData.createdBy,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      referenceId: matchId,
      summary: `${matchData.date.toDate().toLocaleDateString("ko-KR")} ${matchData.location}`,
      metadata: {
        matchScore: "경기 예정",
      },
    });
    
    // 원정팀 Activity 생성
    await db.collection(`teams/${matchData.awayTeamId}/activities`).add({
      type: "match",
      title: `${matchData.awayTeamName} vs ${matchData.homeTeamName} 경기 생성`,
      createdBy: matchData.createdBy,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      referenceId: matchId,
      summary: `${matchData.date.toDate().toLocaleDateString("ko-KR")} ${matchData.location}`,
      metadata: {
        matchScore: "경기 예정",
      },
    });
  }
);
```

### 4-2. 경기 이벤트 생성 시 Stats 업데이트

```typescript
// functions/src/match/onMatchEventCreated.ts
export const onMatchEventCreated = onDocumentCreated(
  "matches/{matchId}/events/{eventId}",
  async (event) => {
    const { matchId, eventId } = event.params;
    const eventData = event.data?.data();
    
    // 골인 경우
    if (eventData.type === "goal") {
      // 선수 통계 업데이트
      const playerStatsRef = db.doc(`players/${eventData.playerId}/stats/match`);
      await playerStatsRef.set({
        goals: admin.firestore.FieldValue.increment(1),
        matches: admin.firestore.FieldValue.increment(1),
      }, { merge: true });
      
      // 어시스트인 경우
      if (eventData.assistPlayerId) {
        const assistStatsRef = db.doc(`players/${eventData.assistPlayerId}/stats/match`);
        await assistStatsRef.set({
          assists: admin.firestore.FieldValue.increment(1),
        }, { merge: true });
      }
      
      // 팀 통계 업데이트
      const teamStatsRef = db.doc(`teams/${eventData.teamId}/stats/match`);
      await teamStatsRef.set({
        goalsFor: admin.firestore.FieldValue.increment(1),
      }, { merge: true });
    }
  }
);
```

### 4-3. 경기 완료 시 Stats 및 Ranking 업데이트

```typescript
// functions/src/match/onMatchCompleted.ts
export const onMatchCompleted = onDocumentUpdated(
  "matches/{matchId}",
  async (event) => {
    const { matchId } = event.params;
    const before = event.data.before.data();
    const after = event.data.after.data();
    
    // 경기가 완료된 경우만 처리
    if (before.status !== "completed" && after.status === "completed") {
      const { homeTeamId, awayTeamId, score } = after;
      
      // 홈팀 통계 업데이트
      await updateTeamMatchStats(homeTeamId, score.home, score.away, true);
      
      // 원정팀 통계 업데이트
      await updateTeamMatchStats(awayTeamId, score.away, score.home, false);
      
      // 대회 순위 업데이트 (대회 경기인 경우)
      if (after.tournamentId) {
        await updateTournamentStandings(after.tournamentId);
      }
    }
  }
);
```

---

## 5️⃣ UI 구조

### 5-1. 경기 목록 페이지

```
/matches
```

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ 경기                                     │
│                                          │
│ [ 경기 생성 ]                            │
├─────────────────────────────────────────┤
│ 예정 경기                                │
│ ┌───────────────────────────────────┐  │
│ │ 노원FC  vs  상계FC                  │  │
│ │ 2024-03-20 15:00 · 마들스타디움    │  │
│ │ [상세보기]                          │  │
│ └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│ 진행 중                                  │
│ ┌───────────────────────────────────┐  │
│ │ 노원FC  2 : 1  상계FC  [LIVE]      │  │
│ │ 2024-03-15 15:00 · 마들스타디움    │  │
│ │ [관람하기]                          │  │
│ └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│ 완료                                     │
│ ┌───────────────────────────────────┐  │
│ │ 노원FC  3 : 2  상계FC              │  │
│ │ 2024-03-10 15:00                  │  │
│ │ [상세보기]                          │  │
│ └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 5-2. 경기 상세 페이지

```
/matches/{matchId}
```

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ MATCH                                    │
│                                          │
│ 노원FC  3 : 2  상계FC                    │
│ 2024-03-15 15:00 · 마들스타디움         │
│ [종료]                                   │
├─────────────────────────────────────────┤
│ [ 개요 ] [ 라인업 ] [ 이벤트 ] [ 통계 ]  │
├─────────────────────────────────────────┤
│ Tab Content                              │
│                                          │
│ (개요/라인업/이벤트/통계 내용)           │
│                                          │
└─────────────────────────────────────────┘
```

### 5-3. 경기 이벤트 타임라인

```
Match Events

⚽ 홍길동 (23') - 노원FC
   어시스트: 김철수

🟨 박민수 (45') - 상계FC

⚽ 이영희 (56') - 노원FC
   어시스트: 정수진

🟨 최민수 (70') - 노원FC

⚽ 강지훈 (89') - 상계FC
```

---

## 6️⃣ Stats 자동 생성

### 6-1. 선수 통계 업데이트

경기 이벤트가 기록되면 자동으로 선수 통계가 업데이트됩니다:

```typescript
// 골 기록
players/{playerId}/stats/match
{
  goals: 10,
  assists: 4,
  matches: 12,
  yellowCards: 2,
  redCards: 0,
  minutes: 1080
}
```

### 6-2. 팀 통계 업데이트

경기 완료 시 팀 통계가 자동 업데이트됩니다:

```typescript
// 팀 통계
teams/{teamId}/stats/match
{
  matches: 10,
  wins: 7,
  draws: 2,
  losses: 1,
  goalsFor: 20,
  goalsAgainst: 10,
  points: 23
}
```

### 6-3. 대회 순위 업데이트

대회 경기 완료 시 순위가 자동 업데이트됩니다:

```typescript
// 대회 순위
tournaments/{tournamentId}/standings/{teamId}
{
  teamId: "team1",
  played: 10,
  wins: 7,
  draws: 2,
  losses: 1,
  goalsFor: 20,
  goalsAgainst: 10,
  points: 23,
  rank: 1
}
```

---

## 7️⃣ Activity Feed 연결

### 7-1. 경기 생성 시 Activity 생성

경기가 생성되면 두 팀 모두 Activity Feed에 표시됩니다:

```typescript
// 홈팀 Activity
{
  type: "match",
  title: "노원FC vs 상계FC 경기 생성",
  referenceId: "match123",
  metadata: {
    matchScore: "경기 예정"
  }
}

// 원정팀 Activity
{
  type: "match",
  title: "상계FC vs 노원FC 경기 생성",
  referenceId: "match123",
  metadata: {
    matchScore: "경기 예정"
  }
}
```

### 7-2. 경기 완료 시 Activity 생성

경기가 완료되면 결과 Activity가 생성됩니다:

```typescript
// 홈팀 Activity
{
  type: "match",
  title: "노원FC 3 : 2 상계FC 승리",
  referenceId: "match123",
  metadata: {
    matchScore: "3 : 2"
  }
}
```

---

## 8️⃣ Tournament 연결

### 8-1. 대회 경기

대회 경기는 `tournamentId`로 연결됩니다:

```typescript
{
  matchId: "match123",
  tournamentId: "tournament2025",
  tournamentName: "2025 노원구 리그",
  homeTeamId: "team1",
  awayTeamId: "team2",
  // ...
}
```

### 8-2. 대회 순위 자동 업데이트

대회 경기 완료 시 순위가 자동 업데이트됩니다:

```typescript
// 대회 순위표
tournaments/{tournamentId}/standings
{
  team1: { rank: 1, points: 23 },
  team2: { rank: 2, points: 20 },
  // ...
}
```

---

## 9️⃣ 실제 구현 코드

### 9-1. Match Service

```typescript
// src/services/matchService.ts
export async function createMatch(params: {
  homeTeamId: string;
  awayTeamId: string;
  date: Date;
  location: string;
  tournamentId?: string;
}): Promise<string> {
  // Match 생성
  const matchRef = await addDoc(collection(db, "matches"), {
    homeTeamId: params.homeTeamId,
    awayTeamId: params.awayTeamId,
    date: Timestamp.fromDate(params.date),
    location: params.location,
    tournamentId: params.tournamentId,
    status: "scheduled",
    score: { home: 0, away: 0 },
    createdAt: serverTimestamp(),
  });
  
  // 팀 Matches 서브컬렉션에 추가
  await addDoc(
    collection(db, "teams", params.homeTeamId, "matches"),
    { matchId: matchRef.id, isHome: true, ... }
  );
  
  await addDoc(
    collection(db, "teams", params.awayTeamId, "matches"),
    { matchId: matchRef.id, isHome: false, ... }
  );
  
  return matchRef.id;
}
```

### 9-2. Match Event Service

```typescript
// src/services/matchEventService.ts
export async function createMatchEvent(params: {
  matchId: string;
  type: MatchEventType;
  minute: number;
  teamId: string;
  playerId: string;
  assistPlayerId?: string;
}): Promise<string> {
  const eventRef = await addDoc(
    collection(db, "matches", params.matchId, "events"),
    {
      type: params.type,
      minute: params.minute,
      teamId: params.teamId,
      playerId: params.playerId,
      assistPlayerId: params.assistPlayerId,
      createdAt: serverTimestamp(),
    }
  );
  
  // 점수 업데이트 (골인 경우)
  if (params.type === "goal") {
    const matchRef = doc(db, "matches", params.matchId);
    const matchSnap = await getDoc(matchRef);
    const matchData = matchSnap.data();
    
    const isHome = matchData?.homeTeamId === params.teamId;
    await updateDoc(matchRef, {
      [`score.${isHome ? "home" : "away"}`]: increment(1),
    });
  }
  
  return eventRef.id;
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시 구현)
- [ ] Match 타입 정의
- [ ] Match Service 구현
- [ ] Match 목록 페이지
- [ ] Match 상세 페이지
- [ ] Match 생성 페이지

### Phase 2 (다음)
- [ ] Match Lineup 관리
- [ ] Match Event 기록
- [ ] Match Event 타임라인
- [ ] Cloud Functions 트리거

### Phase 3 (확장)
- [ ] Stats 자동 생성
- [ ] Ranking 자동 업데이트
- [ ] Activity Feed 연결
- [ ] Tournament 연결

---

**작성일**: 2024년  
**상태**: ✅ Match System 설계 완료

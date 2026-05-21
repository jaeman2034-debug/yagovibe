# 🏛️ YAGO VIBE SPORTS - Federation + League System 완전 설계

> **작성일**: 2024년  
> **목적**: 생활체육 팀 플랫폼 → 협회/리그 운영 플랫폼으로 확장

---

## 📋 목차

1. [Federation System 개념](#1-federation-system-개념)
2. [Firestore 구조](#2-firestore-구조)
3. [League UI 구조](#3-league-ui-구조)
4. [Federation 관리자 기능](#4-federation-관리자-기능)
5. [League Match Flow](#5-league-match-flow)
6. [League Ranking 계산](#6-league-ranking-계산)
7. [전체 도메인 연결](#7-전체-도메인-연결)
8. [실제 구현 코드](#8-실제-구현-코드)

---

## 1️⃣ Federation System 개념

### Federation System 역할

Federation은 **종목 협회 또는 리그 운영 조직**입니다.

예시:
- 대한축구협회
- 서울시 농구 협회
- YAGO Amateur League
- 노원구 축구협회

### 플랫폼 구조

```
Federation
  ↓
League
  ↓
Tournament
  ↓
Teams
  ↓
Matches
```

즉 **협회 → 리그 → 팀 → 경기** 구조입니다.

---

## 2️⃣ Firestore 구조

### 2-1. Federations 컬렉션

```
federations/{federationId}
```

**문서 스키마**:
```typescript
{
  name: string; // "YAGO Soccer Federation"
  slug: string; // "yago-soccer-federation"
  sport: string; // "soccer" | "basketball" | "baseball"
  region: string; // "Seoul" | "Gyeonggi"
  description?: string;
  logoUrl?: string;
  ownerId: string; // Federation 관리자
  adminIds: string[]; // Federation 관리자 목록
  status: "active" | "inactive" | "suspended";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 2-2. Leagues 서브컬렉션

```
federations/{federationId}/leagues/{leagueId}
```

**문서 스키마**:
```typescript
{
  name: string; // "Seoul Amateur League"
  slug: string; // "seoul-amateur-league"
  season: string; // "2025" 또는 "2025-spring"
  sport: string;
  federationId: string;
  status: "draft" | "registration" | "active" | "completed";
  startDate: Timestamp;
  endDate: Timestamp;
  teamCount: number; // 참가 팀 수
  matchCount: number; // 총 경기 수
  format: "round_robin" | "knockout" | "group_stage";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 2-3. League Teams 서브컬렉션

```
leagues/{leagueId}/teams/{teamId}
```

**문서 스키마**:
```typescript
{
  teamId: string;
  teamName: string;
  joinedAt: Timestamp;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string; // 승인한 관리자 ID
  approvedAt?: Timestamp;
}
```

### 2-4. League Matches 서브컬렉션

```
leagues/{leagueId}/matches/{matchId}
```

**참고**: 이건 기존 `matches/{matchId}`와 연결됩니다.

**문서 스키마**:
```typescript
{
  matchId: string; // matches/{matchId} 참조
  leagueId: string;
  round: number; // 라운드 번호
  groupId?: string; // 조별 리그인 경우
  scheduledDate: Timestamp;
  status: "scheduled" | "live" | "completed";
}
```

### 2-5. League Standings 서브컬렉션

```
leagues/{leagueId}/standings/{teamId}
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
  points: number; // wins * 3 + draws * 1
  rank: number; // 순위
  previousRank?: number;
  rankChange?: number; // 순위 변동
  updatedAt: Timestamp;
}
```

---

## 3️⃣ League UI 구조

### 3-1. League 목록 페이지

```
/leagues
```

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ 리그                                      │
│                                          │
│ [ 리그 생성 ] (Federation Admin만)      │
├─────────────────────────────────────────┤
│ 진행 중인 리그                            │
│ ┌───────────────────────────────────┐  │
│ │ 서울 아마추어 리그                  │  │
│ │ 2025 시즌 · 12팀 · 36경기         │  │
│ │ [리그 보기]                        │  │
│ └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│ 예정 리그                                │
│ ┌───────────────────────────────────┐  │
│ │ 2025 봄 리그                       │  │
│ │ 모집중 · 3월 시작                  │  │
│ │ [리그 보기]                        │  │
│ └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 3-2. League 상세 페이지

```
/leagues/{leagueId}
```

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ LEAGUE                                   │
│                                          │
│ 서울 아마추어 리그                        │
│ 2025 시즌 · 진행중                       │
├─────────────────────────────────────────┤
│ [ 개요 ] [ 참가팀 ] [ 경기일정 ] [ 순위 ] │
├─────────────────────────────────────────┤
│ Tab Content                              │
│                                          │
│ (개요/참가팀/경기일정/순위 내용)         │
│                                          │
└─────────────────────────────────────────┘
```

### 3-3. League Standings 페이지

```
/leagues/{leagueId}/standings
```

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ 리그 순위                                 │
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

---

## 4️⃣ Federation 관리자 기능

### 4-1. Federation Admin 권한

```
Federation Admin
  ├─ 리그 생성
  ├─ 팀 승인/거부
  ├─ 경기 일정 생성
  ├─ 통계 관리
  ├─ 심판 관리
  └─ 리그 설정
```

### 4-2. Federation Admin 페이지

```
/federations/{federationId}/admin
```

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ Federation 관리                          │
│                                          │
│ [ 리그 관리 ] [ 팀 승인 ] [ 경기 관리 ]  │
│ [ 통계 ] [ 설정 ]                        │
├─────────────────────────────────────────┤
│ Tab Content                              │
│                                          │
│ (리그 관리/팀 승인/경기 관리 내용)      │
│                                          │
└─────────────────────────────────────────┘
```

### 4-3. 팀 승인 시스템

```
/leagues/{leagueId}/admin/teams
```

**UI**:
```
┌─────────────────────────────────────────┐
│ 팀 승인 대기                              │
│                                          │
│ ┌───────────────────────────────────┐  │
│ │ 노원FC                             │  │
│ │ 신청일: 2024-03-15                │  │
│ │ [승인] [거부]                      │  │
│ └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 5️⃣ League Match Flow

### 5-1. 경기 흐름

```
League Match 생성
  ↓
League Match Schedule
  ↓
Match Events 기록
  ↓
Stats Update (자동)
  ↓
League Ranking Update (자동)
```

### 5-2. 경기 일정 생성

```typescript
// Federation Admin이 경기 일정 생성
const matchSchedule = {
  leagueId: "league123",
  round: 1,
  matches: [
    { homeTeamId: "team1", awayTeamId: "team2", date: "2025-03-20" },
    { homeTeamId: "team3", awayTeamId: "team4", date: "2025-03-20" },
  ]
};

// 각 경기 생성
for (const match of matchSchedule.matches) {
  const matchId = await createMatch({
    ...match,
    leagueId: "league123",
    tournamentId: undefined, // League는 Tournament와 별개
  });
  
  // League Matches에 추가
  await addDoc(
    collection(db, "leagues", "league123", "matches"),
    { matchId, round: 1, status: "scheduled" }
  );
}
```

---

## 6️⃣ League Ranking 계산

### 6-1. 순위 계산 로직

```typescript
// 순위 계산 기준
1. 승점 (points) 내림차순
   - 승: 3점
   - 무: 1점
   - 패: 0점

2. 득실차 (goalDifference) 내림차순
   - goalDifference = goalsFor - goalsAgainst

3. 득점 (goalsFor) 내림차순
```

### 6-2. Cloud Function: League Ranking 업데이트

```typescript
// functions/src/league/onLeagueMatchCompleted.ts
export const onLeagueMatchCompleted = onDocumentUpdated(
  "matches/{matchId}",
  async (event) => {
    const { matchId } = event.params;
    const after = event.data.after.data();
    
    // League 경기인 경우만 처리
    if (!after.leagueId) return;
    
    // 경기가 완료된 경우
    if (after.status === "completed") {
      const { homeTeamId, awayTeamId, score } = after;
      
      // 홈팀 순위 업데이트
      await updateLeagueStanding(
        after.leagueId,
        homeTeamId,
        score.home,
        score.away,
        true // isHome
      );
      
      // 원정팀 순위 업데이트
      await updateLeagueStanding(
        after.leagueId,
        awayTeamId,
        score.away,
        score.home,
        false // isHome
      );
      
      // 순위 재계산
      await recalculateLeagueRanking(after.leagueId);
    }
  }
);

async function updateLeagueStanding(
  leagueId: string,
  teamId: string,
  goalsFor: number,
  goalsAgainst: number,
  isHome: boolean
) {
  const standingRef = db.doc(`leagues/${leagueId}/standings/${teamId}`);
  const standingSnap = await standingRef.get();
  const current = standingSnap.data() || {};
  
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
  
  await standingRef.set(updates, { merge: true });
}

async function recalculateLeagueRanking(leagueId: string) {
  const standingsRef = db.collection(`leagues/${leagueId}/standings`);
  const standingsSnap = await standingsRef.get();
  
  const standings = standingsSnap.docs.map(doc => ({
    teamId: doc.id,
    ...doc.data()
  }));
  
  // 정렬: points → goalDifference → goalsFor
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
  
  // 순위 업데이트
  const batch = db.batch();
  standings.forEach((standing, index) => {
    const rank = index + 1;
    const standingRef = db.doc(`leagues/${leagueId}/standings/${standing.teamId}`);
    
    const previousRank = standing.rank || rank;
    const rankChange = previousRank - rank;
    
    batch.update(standingRef, {
      rank,
      previousRank,
      rankChange,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  
  await batch.commit();
}
```

---

## 7️⃣ 전체 도메인 연결

### 7-1. 플랫폼 전체 구조

```
User
  ↓
Team
  ├─ Members
  ├─ Chat
  ├─ Events
  ├─ Notices
  ├─ Matches
  │     ├─ Lineups
  │     └─ Events
  │           ↓
  │     Stats (자동 업데이트)
  │           ↓
  │     Ranking (자동 재계산)
  │
  └─ Activity Feed
        ↓
Player
  ↓
Stats
  ↓
Ranking
  ↓
Tournament
  ↓
League
  ↓
Federation
```

### 7-2. 데이터 관계

```
Federation
  ├─ Leagues
  │     ├─ Teams
  │     ├─ Matches
  │     └─ Standings
  └─ Admins

League
  ├─ Teams (참가 팀)
  ├─ Matches (리그 경기)
  └─ Standings (리그 순위)

Match
  ├─ League (리그 경기인 경우)
  ├─ Tournament (대회 경기인 경우)
  ├─ Teams (홈/원정 팀)
  ├─ Lineups (라인업)
  └─ Events (경기 이벤트)
```

---

## 8️⃣ 실제 구현 코드

### 8-1. Federation 타입 정의

```typescript
// src/types/federation.ts
import { Timestamp } from "firebase/firestore";

export interface Federation {
  id: string;
  name: string;
  slug: string;
  sport: string;
  region: string;
  description?: string;
  logoUrl?: string;
  ownerId: string;
  adminIds: string[];
  status: "active" | "inactive" | "suspended";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface League {
  id: string;
  name: string;
  slug: string;
  season: string;
  sport: string;
  federationId: string;
  status: "draft" | "registration" | "active" | "completed";
  startDate: Timestamp;
  endDate: Timestamp;
  teamCount: number;
  matchCount: number;
  format: "round_robin" | "knockout" | "group_stage";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface LeagueTeam {
  id: string;
  teamId: string;
  teamName: string;
  joinedAt: Timestamp;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: Timestamp;
}

export interface LeagueStanding {
  id: string;
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
  rank: number;
  previousRank?: number;
  rankChange?: number;
  updatedAt: Timestamp;
}
```

### 8-2. Federation Service

```typescript
// src/services/federationService.ts
export async function createLeague(params: {
  federationId: string;
  name: string;
  season: string;
  startDate: Date;
  endDate: Date;
  format: "round_robin" | "knockout" | "group_stage";
}): Promise<string> {
  const leagueRef = await addDoc(
    collection(db, "federations", params.federationId, "leagues"),
    {
      name: params.name,
      slug: generateSlug(params.name),
      season: params.season,
      sport: "soccer", // Federation에서 가져오기
      federationId: params.federationId,
      status: "registration",
      startDate: Timestamp.fromDate(params.startDate),
      endDate: Timestamp.fromDate(params.endDate),
      teamCount: 0,
      matchCount: 0,
      format: params.format,
      createdAt: serverTimestamp(),
    }
  );
  
  return leagueRef.id;
}

export async function joinLeague(
  leagueId: string,
  teamId: string,
  teamName: string
): Promise<string> {
  const leagueTeamRef = await addDoc(
    collection(db, "leagues", leagueId, "teams"),
    {
      teamId,
      teamName,
      joinedAt: serverTimestamp(),
      status: "pending",
    }
  );
  
  return leagueTeamRef.id;
}

export async function approveLeagueTeam(
  leagueId: string,
  teamId: string,
  adminId: string
): Promise<void> {
  const leagueTeamRef = doc(db, "leagues", leagueId, "teams", teamId);
  await updateDoc(leagueTeamRef, {
    status: "approved",
    approvedBy: adminId,
    approvedAt: serverTimestamp(),
  });
  
  // League teamCount 증가
  const leagueRef = doc(db, "leagues", leagueId);
  await updateDoc(leagueRef, {
    teamCount: increment(1),
  });
  
  // League Standing 초기화
  await setDoc(
    doc(db, "leagues", leagueId, "standings", teamId),
    {
      teamId,
      teamName: (await getDoc(leagueTeamRef)).data()?.teamName,
      matches: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      rank: 0,
      updatedAt: serverTimestamp(),
    }
  );
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시 구현)
- [ ] Federation 타입 정의
- [ ] League 타입 정의
- [ ] Federation Service 구현
- [ ] League Service 구현
- [ ] League 목록 페이지
- [ ] League 상세 페이지

### Phase 2 (다음)
- [ ] League Standings 페이지
- [ ] Federation Admin 페이지
- [ ] 팀 승인 시스템
- [ ] Cloud Functions 트리거

### Phase 3 (확장)
- [ ] 경기 일정 자동 생성
- [ ] League 통계 대시보드
- [ ] Multi-League 지원

---

**작성일**: 2024년  
**상태**: ✅ Federation + League System 설계 완료

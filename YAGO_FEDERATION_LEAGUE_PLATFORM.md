# 🏛 YAGO VIBE SPORTS - 협회 리그 중심 플랫폼 구조

> **작성일**: 2024년  
> **목적**: Federation → League → Team → Match → Player → Stats 구조 설계

---

## 📋 목차

1. [협회 리그 중심 플랫폼 개념](#1-협회-리그-중심-플랫폼-개념)
2. [플랫폼 중심 구조](#2-플랫폼-중심-구조)
3. [Firestore 구조](#3-firestore-구조)
4. [협회 관리자 시스템](#4-협회-관리자-시스템)
5. [리그 관리자 UI](#5-리그-관리자-ui)
6. [경기 흐름](#6-경기-흐름)
7. [핵심 페이지 구조](#7-핵심-페이지-구조)

---

## 1️⃣ 협회 리그 중심 플랫폼 개념

### 플랫폼 중심 구조

```
Federation (협회)
      ↓
League (리그)
      ↓
Team (팀)
      ↓
Match (경기)
      ↓
Player (선수)
      ↓
Stats / Ranking
```

### 협회 → 리그 → 팀 → 경기 → 선수 → 통계

이 구조가 **플랫폼 핵심**입니다.

---

## 2️⃣ 플랫폼 중심 구조

### 2-1. Federation (협회)

협회는 **플랫폼 운영 주체**입니다.

예:
```
서울시 축구 협회
YAGO 풋살 리그
대한 야구 협회
```

### 2-2. League (리그)

협회 아래에 **리그가 생성됩니다.**

예:
```
2025 서울 풋살 리그
2025 YAGO 축구 리그
```

### 2-3. Team (팀)

리그에 참가하는 팀

### 2-4. Match (경기)

리그 경기

### 2-5. Player (선수)

팀 소속 선수

### 2-6. Stats / Ranking

통계 및 순위

---

## 3️⃣ Firestore 구조

### 3-1. Federations 컬렉션

```
federations/{federationId}
```

**문서 스키마**:
```typescript
{
  name: string; // "Seoul Amateur Soccer Federation"
  nameEn?: string;
  sport: string; // "soccer"
  sportId: string;
  region: string; // "Seoul"
  description?: string;
  logoUrl?: string;
  adminUids: string[]; // 협회 관리자 UID 목록
  superAdminUids: string[]; // 최고 관리자 UID 목록
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3-2. Leagues 서브컬렉션

```
federations/{federationId}/leagues/{leagueId}
```

**문서 스키마**:
```typescript
{
  name: string; // "Seoul Futsal League 2025"
  season: string; // "2025"
  sport: string; // "soccer"
  sportId: string;
  format: "round_robin" | "knockout" | "group_stage";
  startDate: Timestamp;
  endDate: Timestamp;
  status: "draft" | "registration" | "active" | "completed" | "cancelled";
  teamCount: number;
  matchCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3-3. League Teams 서브컬렉션

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
  registrationFee?: number;
  paidAt?: Timestamp;
}
```

### 3-4. League Matches 서브컬렉션

```
leagues/{leagueId}/matches/{matchId}
```

**문서 스키마**:
```typescript
{
  matchId: string; // matches/{matchId} 참조
  round: number; // 라운드 번호
  scheduledDate: Timestamp;
  status: "scheduled" | "live" | "finished" | "cancelled";
}
```

### 3-5. League Standings 서브컬렉션

```
leagues/{leagueId}/standings/{teamId}
```

**문서 스키마**:
```typescript
{
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
  rank: number;
  updatedAt: Timestamp;
}
```

---

## 4️⃣ 협회 관리자 시스템

### 4-1. 협회 관리자 UI

```
/federations/{federationId}/admin
```

**기능**:
```
리그 생성
팀 승인
경기 일정 생성
순위 관리
선수 등록
공지사항 관리
```

### 4-2. 협회 대시보드

```
┌─────────────────────────────────────────┐
│ 협회 관리 대시보드                          │
│                                          │
│ 서울시 축구 협회                           │
│                                          │
│ [ 리그 생성 ]                             │
│                                          │
│ 활성 리그: 3                              │
│ 참가 팀: 36                               │
│ 진행 경기: 120                            │
│                                          │
│ [ 리그 목록 ]                             │
│ - 2025 서울 풋살 리그                     │
│ - 2025 YAGO 축구 리그                     │
│ - 2025 유소년 리그                         │
└─────────────────────────────────────────┘
```

---

## 5️⃣ 리그 관리자 UI

### 5-1. 리그 페이지

```
/leagues/{leagueId}
```

**화면**:
```
┌─────────────────────────────────────────┐
│ LEAGUE                                    │
│                                          │
│ Seoul Futsal League 2025                 │
│                                          │
│ Season: 2025                             │
│ Status: In Progress                      │
│                                          │
│ Teams: 12                                │
│ Matches: 66                              │
│                                          │
│ [ 참가 팀 ] [ 경기 일정 ] [ 순위 ] [ 통계 ] │
└─────────────────────────────────────────┘
```

### 5-2. 리그 대시보드

```
┌─────────────────────────────────────────┐
│ 2025 Seoul League                        │
│                                          │
│ Teams: 12                                │
│ Matches: 66                              │
│ Season: In Progress                      │
│                                          │
│ 최근 경기                                 │
│ Tigers 3 : 2 Lions                       │
│ Eagles 1 : 1 Wolves                      │
│                                          │
│ 순위 상위 5팀                             │
│ 1. Tigers (20 pts)                      │
│ 2. Lions (18 pts)                        │
│ 3. Eagles (16 pts)                       │
└─────────────────────────────────────────┘
```

---

## 6️⃣ 경기 흐름

### 6-1. 리그 운영 흐름

```
리그 생성
      ↓
팀 참가 신청
      ↓
팀 승인
      ↓
경기 일정 자동 생성 (Round Robin)
      ↓
경기 진행
      ↓
경기 기록 입력
      ↓
통계 자동 업데이트
      ↓
순위 자동 업데이트
```

### 6-2. 경기 일정 생성

```
Round Robin Scheduler

12팀 리그

Round 1
A vs B
C vs D
E vs F
...

Round 2
A vs C
B vs D
E vs G
...
```

---

## 7️⃣ 핵심 페이지 구조

### 7-1. 전체 라우팅 구조

```
/sports
/sports/{sportId}

/federations
/federations/{federationId}
/federations/{federationId}/admin
/federations/{federationId}/leagues

/leagues
/leagues/{leagueId}
/leagues/{leagueId}/teams
/leagues/{leagueId}/matches
/leagues/{leagueId}/standings
/leagues/{leagueId}/stats

/teams
/teams/{teamId}

/matches
/matches/{matchId}

/players
/players/{playerId}

/stats
```

### 7-2. 협회 페이지

```
/federations/{federationId}
```

**UI**:
```
┌─────────────────────────────────────────┐
│ 서울시 축구 협회                           │
│                                          │
│ [ 리그 목록 ]                             │
│                                          │
│ 2025 서울 풋살 리그                       │
│ 12팀 · 66경기 · 진행중                    │
│                                          │
│ 2025 YAGO 축구 리그                       │
│ 8팀 · 28경기 · 진행중                     │
└─────────────────────────────────────────┘
```

### 7-3. 리그 페이지

```
/leagues/{leagueId}
```

**UI**:
```
┌─────────────────────────────────────────┐
│ Seoul Futsal League 2025                │
│                                          │
│ [ 참가 팀 ] [ 경기 일정 ] [ 순위 ] [ 통계 ] │
│                                          │
│ Tab Content                              │
└─────────────────────────────────────────┘
```

---

## 💰 수익 모델

### 협회 리그 플랫폼 수익 모델

```
리그 참가비
팀 등록비
선수 등록비
리그 관리 SaaS
```

예:
```
팀 등록: 5만원
리그 참가: 50만원
```

즉:
```
SaaS + League Management
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] Federations 컬렉션
- [ ] Leagues 서브컬렉션
- [ ] League Teams 서브컬렉션
- [ ] League Standings 서브컬렉션
- [ ] 협회 관리자 UI

### Phase 2 (다음)
- [ ] 리그 관리자 UI
- [ ] 리그 대시보드
- [ ] 경기 일정 관리

### Phase 3 (확장)
- [ ] 자동 경기 일정 생성 (Round Robin)
- [ ] 순위 자동 계산
- [ ] 리포트 생성

---

**작성일**: 2024년  
**상태**: ✅ 협회 리그 중심 플랫폼 구조 완료

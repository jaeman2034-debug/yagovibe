# 🗄️ 노원구 축구협회 Firestore Database Schema 완전 설계

> **완성형 데이터 모델 - 플랫폼의 모든 기능 기반**

---

## 📋 목차

1. [전체 데이터 아키텍처](#1-전체-데이터-아키텍처)
2. [Association Domain](#2-association-domain)
3. [Team Domain](#3-team-domain)
4. [Player Domain](#4-player-domain)
5. [Tournament Domain](#5-tournament-domain)
6. [Match Domain](#6-match-domain)
7. [Stats Domain](#7-stats-domain)
8. [Social Domain](#8-social-domain)
9. [Content Domain](#9-content-domain)
10. [Admin Domain](#10-admin-domain)
11. [인덱스 설계](#11-인덱스-설계)
12. [보안 규칙](#12-보안-규칙)
13. [데이터 관계도](#13-데이터-관계도)

---

## 1️⃣ 전체 데이터 아키텍처

### 컬렉션 구조

```
Firestore Root
├─ associations/              # 협회
├─ users/                     # 사용자
├─ teams/                     # 팀
│   └─ members/               # 팀 멤버 (서브컬렉션)
├─ players/                   # 선수
├─ tournaments/               # 리그/대회
├─ matches/                   # 경기
├─ match_events/              # 경기 이벤트 (Timeline)
├─ match_lineups/             # 경기 라인업
├─ match_stats/               # 경기 통계
├─ standings/                 # 리그 순위
├─ team_stats/                # 팀 통계
├─ player_stats/              # 선수 통계
├─ media/                     # 미디어
├─ comments/                  # 댓글
├─ likes/                     # 좋아요
├─ follows/                   # 팔로우
├─ shares/                    # 공유
├─ activities/                # Activity Feed
├─ notifications/              # 알림
├─ notices/                   # 공지
├─ facilities/                # 시설
├─ membership_requests/        # 회원 가입 신청
├─ organization_members/      # 협회 멤버
└─ admin_logs/                # 관리자 로그
```

### 도메인 분류

```
6개 주요 도메인
 ├─ Association Domain (협회)
 ├─ Team Domain (팀)
 ├─ Player Domain (선수)
 ├─ Tournament Domain (리그)
 ├─ Match Domain (경기)
 ├─ Stats Domain (통계)
 ├─ Social Domain (소셜)
 ├─ Content Domain (콘텐츠)
 └─ Admin Domain (관리)
```

---

## 2️⃣ Association Domain

### 2-1. associations 컬렉션

**경로**: `associations/{associationId}`

```typescript
interface Association {
  id: string;
  
  // 기본 정보
  name: string;                    // "노원구 축구협회"
  slug: string;                    // "nowon-football" (URL용)
  region: string;                  // "서울 노원구"
  description?: string;             // 협회 소개
  
  // 로고/이미지
  logoUrl?: string;
  bannerUrl?: string;
  
  // 관리자
  adminUids: string[];              // 협회 관리자 UID 배열
  superAdminUids?: string[];        // 슈퍼 관리자 UID 배열
  
  // 설정
  config?: {
    plan?: "free" | "pro";          // 플랜
    features?: string[];            // 활성화된 기능
  };
  
  // 통계 (Denormalized)
  teamCount?: number;               // 등록 팀 수
  playerCount?: number;             // 등록 선수 수
  matchCount?: number;              // 총 경기 수
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**예시**:
```typescript
{
  id: "assoc-nowon-football",
  name: "노원구 축구협회",
  slug: "nowon-football",
  region: "서울 노원구",
  description: "노원구 지역 축구 협회입니다.",
  logoUrl: "https://...",
  adminUids: ["uid1", "uid2"],
  teamCount: 24,
  playerCount: 340,
  matchCount: 72,
  createdAt: Timestamp,
}
```

---

### 2-2. organization_members 컬렉션

**경로**: `organization_members/{memberId}`

```typescript
interface OrganizationMember {
  id: string;                      // memberId
  associationId: string;
  userId: string;
  
  // 역할
  role: "admin" | "member";         // 협회 내 역할
  
  // 메타데이터
  joinedAt: Timestamp;
  createdAt: Timestamp;
}
```

**또는 서브컬렉션**: `associations/{associationId}/members/{userId}`

```typescript
// associations/{associationId}/members/{userId}
{
  userId: string;
  role: "admin" | "member";
  joinedAt: Timestamp;
}
```

---

### 2-3. membership_requests 컬렉션

**경로**: `membership_requests/{requestId}`

```typescript
interface MembershipRequest {
  id: string;
  teamId: string;
  associationId: string;
  
  // 상태
  status: "pending" | "approved" | "rejected";
  
  // 신청 정보
  requestedAt: Timestamp;
  requestedBy: string;              // 신청한 사용자 UID
  memo?: string;                    // 신청 메모
  
  // 승인/거절 정보
  reviewedAt?: Timestamp;
  reviewedBy?: string;              // 검토한 관리자 UID
  rejectionReason?: string;         // 거절 사유
}
```

---

## 3️⃣ Team Domain

### 3-1. teams 컬렉션

**경로**: `teams/{teamId}`

```typescript
interface Team {
  id: string;
  
  // 기본 정보
  name: string;                     // "노원FC"
  shortName?: string;                // "노원"
  region: string;                    // "서울 노원구"
  sportType: "football";             // 종목
  
  // 협회 소속
  associationId?: string;            // 협회 ID (member/pending일 때만)
  membership: "non-member" | "pending" | "member" | "academy";
  
  // 로고/이미지
  logoUrl?: string;
  bannerUrl?: string;
  
  // 소유자
  ownerUid: string;                  // 팀장 UID
  owners?: string[];                 // 소유자 UID 배열 (다중 소유자 지원)
  
  // 상태
  status: "active" | "inactive";
  
  // 통계 (Denormalized)
  memberCount?: number;              // 멤버 수
  matchCount?: number;              // 경기 수
  winCount?: number;                // 승 수
  lossCount?: number;               // 패 수
  drawCount?: number;               // 무 수
  
  // 소셜 (Denormalized)
  followersCount?: number;           // 팔로워 수
  likesCount?: number;               // 좋아요 수
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  approvedAt?: Timestamp;            // 승인 시각
  approvedBy?: string;              // 승인한 관리자 UID
}
```

**예시**:
```typescript
{
  id: "team-nowon-fc",
  name: "노원FC",
  region: "서울 노원구",
  sportType: "football",
  associationId: "assoc-nowon-football",
  membership: "member",
  logoUrl: "https://...",
  ownerUid: "uid1",
  status: "active",
  memberCount: 25,
  matchCount: 12,
  winCount: 8,
  lossCount: 2,
  drawCount: 2,
  followersCount: 124,
  createdAt: Timestamp,
  approvedAt: Timestamp,
}
```

---

### 3-2. teams/{teamId}/members 서브컬렉션

**경로**: `teams/{teamId}/members/{userId}`

**⚠️ 중요**: 문서 ID는 반드시 `userId`와 일치해야 함

```typescript
interface TeamMember {
  userId: string;                    // 문서 ID와 동일
  teamId: string;                   // Denormalized
  
  // 역할
  role: "owner" | "admin" | "member";
  
  // 상태
  status: "active" | "inactive";
  
  // 메타데이터
  joinedAt: Timestamp;
  createdAt: Timestamp;
}
```

**예시**:
```typescript
// teams/team-nowon-fc/members/uid1
{
  userId: "uid1",
  teamId: "team-nowon-fc",
  role: "owner",
  status: "active",
  joinedAt: Timestamp,
  createdAt: Timestamp,
}
```

---

## 4️⃣ Player Domain

### 4-1. players 컬렉션

**경로**: `players/{playerId}`

```typescript
interface Player {
  id: string;
  
  // 기본 정보
  name: string;                     // "홍길동"
  userId?: string;                   // users/{uid} 연결 (선택)
  
  // 협회/팀 소속
  associationId: string;
  teamId?: string;                   // 현재 소속 팀
  teamName?: string;                 // Denormalized
  
  // 선수 정보
  position?: string;                  // "FW", "MF", "DF", "GK"
  jerseyNumber?: number;             // 등번호
  birthDate?: Timestamp;             // 생년월일
  photoUrl?: string;                 // 프로필 사진
  
  // 상태
  status: "pending" | "approved" | "rejected";
  
  // 통계 (Denormalized)
  goals?: number;                    // 총 득점
  assists?: number;                  // 총 어시스트
  matches?: number;                  // 출전 경기 수
  yellowCards?: number;              // 경고
  redCards?: number;                 // 퇴장
  
  // 소셜 (Denormalized)
  followersCount?: number;           // 팔로워 수
  likesCount?: number;               // 좋아요 수
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  approvedAt?: Timestamp;            // 승인 시각
  approvedBy?: string;              // 승인한 관리자 UID
}
```

**예시**:
```typescript
{
  id: "player-123",
  name: "홍길동",
  userId: "uid1",
  associationId: "assoc-nowon-football",
  teamId: "team-nowon-fc",
  teamName: "노원FC",
  position: "FW",
  jerseyNumber: 9,
  photoUrl: "https://...",
  status: "approved",
  goals: 15,
  assists: 8,
  matches: 12,
  followersCount: 45,
  createdAt: Timestamp,
  approvedAt: Timestamp,
}
```

---

## 5️⃣ Tournament Domain

### 5-1. tournaments 컬렉션

**경로**: `tournaments/{tournamentId}`

```typescript
interface Tournament {
  id: string;
  
  // 기본 정보
  name: string;                     // "2026 노원구 리그"
  shortName?: string;                // "노원구 리그"
  associationId: string;
  
  // 시즌
  season: string;                    // "2026"
  seasonId?: string;                 // "2026"
  
  // 형식
  format: "round_robin" | "knockout" | "group_stage" | "league";
  
  // 일정
  startDate: Timestamp;
  endDate: Timestamp;
  
  // 상태
  status: "draft" | "registration" | "active" | "completed" | "cancelled";
  
  // 참가팀
  teamIds?: string[];                // 참가 팀 ID 목록
  teamCount?: number;                // Denormalized
  
  // 우승/준우승
  champion?: {
    teamId: string;
    teamName: string;
  };
  runnerUp?: {
    teamId: string;
    teamName: string;
  };
  
  // 메타데이터
  createdBy: string;                 // 생성자 UID
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**예시**:
```typescript
{
  id: "tournament-2026-nowon-league",
  name: "2026 노원구 리그",
  associationId: "assoc-nowon-football",
  season: "2026",
  format: "round_robin",
  startDate: Timestamp,
  endDate: Timestamp,
  status: "active",
  teamIds: ["team1", "team2", "team3"],
  teamCount: 12,
  createdBy: "uid1",
  createdAt: Timestamp,
}
```

---

## 6️⃣ Match Domain

### 6-1. matches 컬렉션

**경로**: `matches/{matchId}`

```typescript
interface Match {
  id: string;
  
  // 협회/리그
  associationId: string;
  tournamentId?: string;            // 리그일 경우
  tournamentName?: string;           // Denormalized
  roundLabel?: string;                // "3R", "결승"
  
  // 팀 정보
  homeTeamId: string;
  homeTeamName: string;               // Denormalized
  homeTeamLogoUrl?: string;          // Denormalized
  awayTeamId: string;
  awayTeamName: string;               // Denormalized
  awayTeamLogoUrl?: string;          // Denormalized
  
  // 경기 정보
  date: string;                      // "2026-03-15"
  time?: string;                     // "15:00"
  scheduledAt?: Timestamp;           // 날짜+시간 결합
  venueId?: string;
  venueName?: string;                // Denormalized
  
  // 경기 결과
  homeScore?: number;
  awayScore?: number;
  status: "scheduled" | "live" | "completed" | "cancelled";
  
  // 실시간 정보
  currentMinute?: number;            // 현재 경기 시간
  addedTime?: number;                // 추가 시간
  
  // 시간
  startedAt?: Timestamp;             // 경기 시작 시각
  endedAt?: Timestamp;               // 경기 종료 시각
  
  // 심판
  referees?: {
    main?: string;                   // 주심
    assistant1?: string;             // 부심1
    assistant2?: string;              // 부심2
  };
  
  // 소셜 (Denormalized)
  likesCount?: number;
  commentsCount?: number;
  
  // 메타데이터
  createdBy?: string;                 // 생성자 UID
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**예시**:
```typescript
{
  id: "match-2026-03-15-nowon-vs-sanggye",
  associationId: "assoc-nowon-football",
  tournamentId: "tournament-2026-nowon-league",
  tournamentName: "2026 노원구 리그",
  roundLabel: "3R",
  homeTeamId: "team-nowon-fc",
  homeTeamName: "노원FC",
  awayTeamId: "team-sanggye-fc",
  awayTeamName: "상계FC",
  date: "2026-03-15",
  time: "15:00",
  scheduledAt: Timestamp,
  venueName: "마들스타디움",
  homeScore: 2,
  awayScore: 1,
  status: "completed",
  startedAt: Timestamp,
  endedAt: Timestamp,
  likesCount: 24,
  commentsCount: 5,
  createdAt: Timestamp,
}
```

---

### 6-2. match_events 컬렉션

**경로**: `match_events/{eventId}`

```typescript
interface MatchEvent {
  id: string;
  matchId: string;
  
  // 이벤트 정보
  type: "goal" | "assist" | "yellow_card" | "red_card" | "substitution" | "penalty_goal" | "own_goal" | "penalty_missed" | "var_goal" | "var_cancelled";
  minute: number;                    // 경기 시간
  addedTime?: number;                 // 추가 시간 (예: 45+2)
  
  // 선수 정보
  playerId: string;
  playerName: string;                 // Denormalized
  playerNumber?: number;              // Denormalized
  teamId: string;
  teamName: string;                   // Denormalized
  
  // 추가 정보
  assistPlayerId?: string;           // 어시스트 선수 (득점일 경우)
  assistPlayerName?: string;         // Denormalized
  
  // 교체 정보
  playerOutId?: string;               // 교체 아웃 (substitution일 경우)
  playerOutName?: string;             // Denormalized
  playerInId?: string;                // 교체 인
  playerInName?: string;              // Denormalized
  
  // 설명
  description?: string;               // 추가 설명
  
  // 메타데이터
  recordedBy: string;                 // 기록한 사람 (관리자/심판)
  createdAt: Timestamp;
}
```

**예시**:
```typescript
{
  id: "event-123",
  matchId: "match-2026-03-15-nowon-vs-sanggye",
  type: "goal",
  minute: 23,
  playerId: "player-123",
  playerName: "홍길동",
  playerNumber: 9,
  teamId: "team-nowon-fc",
  teamName: "노원FC",
  assistPlayerId: "player-456",
  assistPlayerName: "김철수",
  recordedBy: "uid-admin",
  createdAt: Timestamp,
}
```

---

### 6-3. match_lineups 컬렉션

**경로**: `match_lineups/{lineupId}`

```typescript
interface MatchLineup {
  id: string;
  matchId: string;
  teamId: string;
  teamName: string;                  // Denormalized
  
  // 포메이션
  formation?: string;                 // "4-4-2", "4-3-3"
  
  // 선발 명단
  starters: Array<{
    playerId: string;
    playerName: string;               // Denormalized
    position: string;                 // "GK", "DF", "MF", "FW"
    jerseyNumber: number;
  }>;
  
  // 교체 명단
  substitutes: Array<{
    playerId: string;
    playerName: string;                // Denormalized
    position: string;
    jerseyNumber: number;
  }>;
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**예시**:
```typescript
{
  id: "lineup-123",
  matchId: "match-2026-03-15-nowon-vs-sanggye",
  teamId: "team-nowon-fc",
  teamName: "노원FC",
  formation: "4-4-2",
  starters: [
    {
      playerId: "player-123",
      playerName: "홍길동",
      position: "FW",
      jerseyNumber: 9,
    },
    // ...
  ],
  substitutes: [
    {
      playerId: "player-789",
      playerName: "이철수",
      position: "MF",
      jerseyNumber: 7,
    },
  ],
  createdAt: Timestamp,
}
```

---

### 6-4. match_stats 컬렉션

**경로**: `match_stats/{matchId}`

```typescript
interface MatchStats {
  id: string;
  matchId: string;
  
  // 점유율
  possession: {
    home: number;                     // 55
    away: number;                     // 45
  };
  
  // 슛
  shots: {
    home: number;
    away: number;
  };
  
  // 유효슛
  shotsOnTarget: {
    home: number;
    away: number;
  };
  
  // 코너킥
  corners: {
    home: number;
    away: number;
  };
  
  // 파울
  fouls: {
    home: number;
    away: number;
  };
  
  // 오프사이드
  offsides: {
    home: number;
    away: number;
  };
  
  // 메타데이터
  updatedAt: Timestamp;
}
```

---

## 7️⃣ Stats Domain

### 7-1. standings 컬렉션

**경로**: `standings/{standingId}`

```typescript
interface Standing {
  id: string;                         // tournamentId_teamId 조합
  tournamentId: string;
  teamId: string;
  teamName: string;                   // Denormalized
  
  // 경기 기록
  played: number;                      // 경기 수
  win: number;                         // 승
  draw: number;                        // 무
  loss: number;                        // 패
  
  // 득실
  goalsFor: number;                    // 득점
  goalsAgainst: number;                // 실점
  goalDiff: number;                    // 득실차
  
  // 승점
  points: number;                      // 승점
  
  // 최근 5경기
  form?: ("W" | "D" | "L")[];         // ["W", "W", "D", "L", "W"]
  
  // 순위
  rank?: number;                       // 순위 (계산된 값)
  
  // 메타데이터
  updatedAt: Timestamp;
}
```

**예시**:
```typescript
{
  id: "tournament-2026-nowon-league_team-nowon-fc",
  tournamentId: "tournament-2026-nowon-league",
  teamId: "team-nowon-fc",
  teamName: "노원FC",
  played: 10,
  win: 7,
  draw: 2,
  loss: 1,
  goalsFor: 20,
  goalsAgainst: 10,
  goalDiff: 10,
  points: 23,
  form: ["W", "W", "D", "L", "W"],
  rank: 1,
  updatedAt: Timestamp,
}
```

---

### 7-2. team_stats 컬렉션

**경로**: `team_stats/{teamId}`

```typescript
interface TeamStats {
  id: string;
  teamId: string;
  associationId: string;
  
  // 경기 기록
  matches: number;                    // 총 경기 수
  wins: number;                       // 승
  draws: number;                       // 무
  losses: number;                      // 패
  
  // 득실
  goals: number;                       // 총 득점
  conceded: number;                    // 총 실점
  goalDiff: number;                    // 득실차
  
  // 승률
  winRate?: number;                    // 승률 (%)
  
  // 메타데이터
  updatedAt: Timestamp;
}
```

---

### 7-3. player_stats 컬렉션

**경로**: `player_stats/{playerId}`

```typescript
interface PlayerStats {
  id: string;
  playerId: string;
  associationId: string;
  
  // 경기 기록
  matches: number;                    // 출전 경기 수
  starts: number;                     // 선발 출전
  minutes: number;                     // 총 출전 시간 (분)
  
  // 득점/어시스트
  goals: number;                       // 총 득점
  assists: number;                     // 총 어시스트
  goalContributions: number;           // 득점 기여 (득점 + 어시스트)
  
  // 경고/퇴장
  yellowCards: number;                 // 경고
  redCards: number;                    // 퇴장
  
  // 평균
  goalsPerMatch?: number;              // 경기당 득점
  assistsPerMatch?: number;            // 경기당 어시스트
  
  // 메타데이터
  updatedAt: Timestamp;
}
```

---

## 8️⃣ Social Domain

### 8-1. likes 컬렉션

**경로**: `likes/{likeId}`

**⚠️ 중요**: `likeId = userId_entityType_entityId` (중복 방지)

```typescript
interface Like {
  id: string;                          // userId_entityType_entityId
  userId: string;
  entityType: "media" | "match" | "team" | "player" | "post" | "event" | "activity";
  entityId: string;
  
  // 메타데이터
  createdAt: Timestamp;
}
```

**예시**:
```typescript
{
  id: "uid1_media_media123",
  userId: "uid1",
  entityType: "media",
  entityId: "media-123",
  createdAt: Timestamp,
}
```

---

### 8-2. comments 컬렉션

**경로**: `comments/{commentId}`

```typescript
interface Comment {
  id: string;
  entityType: "media" | "match" | "team" | "player" | "post" | "event" | "activity";
  entityId: string;
  userId: string;
  
  // 사용자 정보 (Denormalized)
  userName?: string;
  userPhotoUrl?: string;
  
  // 댓글 내용
  text: string;
  parentId?: string | null;           // 대댓글 (부모 댓글 ID)
  
  // 통계 (Denormalized)
  likesCount?: number;                // 댓글 좋아요 수
  repliesCount?: number;              // 답글 수
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**예시**:
```typescript
{
  id: "comment-123",
  entityType: "match",
  entityId: "match-2026-03-15-nowon-vs-sanggye",
  userId: "uid1",
  userName: "홍길동",
  userPhotoUrl: "https://...",
  text: "멋진 경기였습니다!",
  parentId: null,
  likesCount: 5,
  repliesCount: 2,
  createdAt: Timestamp,
}
```

---

### 8-3. follows 컬렉션

**경로**: `follows/{followId}`

**⚠️ 중요**: `followId = followerId_targetType_targetId` (중복 방지)

```typescript
interface Follow {
  id: string;                          // followerId_targetType_targetId
  followerId: string;
  targetType: "team" | "player" | "user" | "event";
  targetId: string;
  
  // 메타데이터
  createdAt: Timestamp;
}
```

**예시**:
```typescript
{
  id: "uid1_team_team-nowon-fc",
  followerId: "uid1",
  targetType: "team",
  targetId: "team-nowon-fc",
  createdAt: Timestamp,
}
```

---

### 8-4. shares 컬렉션

**경로**: `shares/{shareId}`

```typescript
interface Share {
  id: string;
  userId: string;
  entityType: "media" | "match" | "team" | "player" | "post" | "event" | "activity";
  entityId: string;
  shareType: "external" | "internal";  // "twitter", "kakao", "feed"
  sharedTo?: string;                   // "twitter", "kakao", "user_id"
  
  // 메타데이터
  createdAt: Timestamp;
}
```

---

## 9️⃣ Content Domain

### 9-1. media 컬렉션

**경로**: `media/{mediaId}`

```typescript
interface Media {
  id: string;
  
  // 엔티티 연결
  entityType: "match" | "team" | "player" | "event";
  entityId: string;
  entityName?: string;                 // Denormalized
  
  // 미디어 정보
  type: "photo" | "video";
  url: string;                         // 원본 URL
  thumbnailUrl?: string;                // 썸네일 URL
  fileName?: string;
  fileSize?: number;                    // 파일 크기 (bytes)
  mimeType?: string;                    // "image/jpeg", "video/mp4"
  
  // 업로드 정보
  uploadedBy: string;                  // 업로더 UID
  uploadedByName?: string;             // Denormalized
  
  // 협회
  associationId?: string;
  
  // 상태
  status?: "pending" | "approved" | "rejected";
  
  // 통계 (Denormalized)
  views?: number;                       // 조회수
  likesCount?: number;                  // 좋아요 수
  commentsCount?: number;               // 댓글 수
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  approvedAt?: Timestamp;              // 승인 시각
  approvedBy?: string;                 // 승인한 관리자 UID
}
```

**예시**:
```typescript
{
  id: "media-123",
  entityType: "match",
  entityId: "match-2026-03-15-nowon-vs-sanggye",
  entityName: "노원FC vs 상계FC",
  type: "photo",
  url: "https://storage.googleapis.com/...",
  thumbnailUrl: "https://storage.googleapis.com/...",
  uploadedBy: "uid1",
  associationId: "assoc-nowon-football",
  status: "approved",
  views: 150,
  likesCount: 24,
  commentsCount: 5,
  createdAt: Timestamp,
}
```

---

### 9-2. activities 컬렉션

**경로**: `associations/{associationId}/activities/{activityId}`

또는 전역: `activities/{activityId}` (associationId 필드 포함)

```typescript
interface AssociationActivity {
  id: string;
  
  // 기본 정보
  type: "match_result" | "goal_scored" | "hat_trick" | "media_uploaded" | "team_created" | "player_joined" | "follow_created" | "comment_created" | "tournament_started" | "tournament_completed" | "award_announced";
  associationId: string;
  
  // Actor (활동 주체)
  actorType: "team" | "player" | "user" | "system";
  actorId: string;
  actorName: string;                  // Denormalized
  actorPhotoUrl?: string;              // Denormalized
  
  // Entity (활동 대상)
  entityType: "match" | "player" | "team" | "media" | "tournament" | "award" | "user";
  entityId: string;
  entityName?: string;                 // Denormalized
  
  // 메시지
  message: string;                     // "노원FC가 상계FC를 2:1로 승리했습니다"
  summary?: string;                    // 추가 정보
  
  // 메타데이터
  metadata?: {
    homeScore?: number;
    awayScore?: number;
    goalCount?: number;
    minute?: number;
    [key: string]: any;
  };
  
  // 썸네일
  thumbnailUrl?: string;
  
  // 링크
  linkUrl?: string;                    // 클릭 시 이동할 URL
  
  // 가시성
  visibility: "public" | "team" | "private";
  
  // 통계 (Denormalized)
  likeCount: number;
  commentCount: number;
  
  // 시간
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**예시**:
```typescript
{
  id: "activity-123",
  type: "goal_scored",
  associationId: "assoc-nowon-football",
  actorType: "player",
  actorId: "player-123",
  actorName: "홍길동",
  actorPhotoUrl: "https://...",
  entityType: "match",
  entityId: "match-2026-03-15-nowon-vs-sanggye",
  entityName: "노원FC vs 상계FC",
  message: "홍길동이 23분에 득점했습니다",
  summary: "노원FC 23분",
  metadata: {
    goalCount: 1,
    minute: 23,
    matchId: "match-2026-03-15-nowon-vs-sanggye",
  },
  thumbnailUrl: "https://...",
  linkUrl: "/a/nowon-football/matches/match-2026-03-15-nowon-vs-sanggye",
  visibility: "public",
  likeCount: 12,
  commentCount: 3,
  createdAt: Timestamp,
}
```

---

### 9-3. notifications 컬렉션

**경로**: `notifications/{notificationId}`

```typescript
interface Notification {
  id: string;
  userId: string;
  
  // 알림 타입
  type: "LIKE_RECEIVED" | "COMMENT_RECEIVED" | "COMMENT_REPLY" | "FOLLOW_RECEIVED" | "MATCH_RESULT" | "GOAL_SCORED" | "MEDIA_UPLOADED" | "TEAM_APPROVED" | "PLAYER_APPROVED" | "MATCH_STARTED" | "MATCH_COMPLETED";
  
  // 알림 내용
  title: string;                       // "새로운 좋아요!"
  message: string;                     // "홍길동님이 사진에 좋아요를 눌렀습니다"
  
  // 링크
  linkUrl?: string;                    // 클릭 시 이동할 URL
  target?: {
    screen: string;                    // "match", "team", "player"
    id?: string;                       // 엔티티 ID
  };
  
  // 페이로드
  payload?: {
    [key: string]: any;
  };
  
  // 읽음 상태
  isRead: boolean;
  
  // 메타데이터
  createdAt: Timestamp;
  readAt?: Timestamp;
}
```

**예시**:
```typescript
{
  id: "notification-123",
  userId: "uid1",
  type: "LIKE_RECEIVED",
  title: "새로운 좋아요!",
  message: "홍길동님이 사진에 좋아요를 눌렀습니다",
  linkUrl: "/a/nowon-football/media/media-123",
  target: {
    screen: "media",
    id: "media-123",
  },
  isRead: false,
  createdAt: Timestamp,
}
```

---

### 9-4. notices 컬렉션

**경로**: `associations/{associationId}/notices/{noticeId}`

또는 전역: `notices/{noticeId}` (associationId 필드 포함)

```typescript
interface Notice {
  id: string;
  associationId: string;
  
  // 기본 정보
  title: string;                       // "2026 리그 참가 등록 안내"
  content: string;                     // 공지 내용
  category?: string;                   // "announcement", "event", "rule"
  
  // 중요도
  isPinned?: boolean;                  // 고정 공지
  priority?: "low" | "normal" | "high" | "urgent";
  
  // 첨부
  attachments?: Array<{
    name: string;
    url: string;
  }>;
  
  // 작성자
  authorId: string;                   // 작성자 UID
  authorName?: string;                // Denormalized
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  publishedAt?: Timestamp;            // 게시 시각
}
```

---

### 9-5. facilities 컬렉션

**경로**: `associations/{associationId}/facilities/{facilityId}`

또는 전역: `facilities/{facilityId}` (associationId 필드 포함)

```typescript
interface Facility {
  id: string;
  associationId: string;
  
  // 기본 정보
  name: string;                       // "마들스타디움"
  address: string;                    // "서울 노원구 마들로..."
  type: "football" | "futsal" | "basketball" | "baseball";
  
  // 위치
  latitude?: number;
  longitude?: number;
  
  // 시설 정보
  capacity?: number;                   // 수용 인원
  surface?: string;                   // "잔디", "인조잔디"
  
  // 이미지
  photoUrl?: string;
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

## 🔟 Admin Domain

### 10-1. admin_logs 컬렉션

**경로**: `admin_logs/{logId}`

```typescript
interface AdminLog {
  id: string;
  associationId: string;
  
  // 작업 정보
  action: string;                     // "team_approved", "player_approved", "match_created"
  entityType: "team" | "player" | "match" | "tournament" | "notice" | "media";
  entityId: string;
  
  // 실행자
  adminId: string;                    // 관리자 UID
  adminName?: string;                 // Denormalized
  
  // 변경 내용
  changes?: {
    before?: any;
    after?: any;
  };
  
  // 메타데이터
  createdAt: Timestamp;
}
```

---

## 11️⃣ 인덱스 설계

### 11-1. 필수 인덱스 목록

**파일**: `firestore.indexes.json`

```json
{
  "indexes": [
    // Associations
    {
      "collectionGroup": "associations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "slug", "order": "ASCENDING" }
      ]
    },
    
    // Teams
    {
      "collectionGroup": "teams",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "associationId", "order": "ASCENDING" },
        { "fieldPath": "membership", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "teams",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "associationId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    
    // Players
    {
      "collectionGroup": "players",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "associationId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "players",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "associationId", "order": "ASCENDING" },
        { "fieldPath": "teamId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    
    // Tournaments
    {
      "collectionGroup": "tournaments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "associationId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "startDate", "order": "DESCENDING" }
      ]
    },
    
    // Matches
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "associationId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" },
        { "fieldPath": "time", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "associationId", "order": "ASCENDING" },
        { "fieldPath": "tournamentId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "homeTeamId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "awayTeamId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    
    // Match Events
    {
      "collectionGroup": "match_events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "matchId", "order": "ASCENDING" },
        { "fieldPath": "minute", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "match_events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "matchId", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "minute", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "match_events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "playerId", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    
    // Standings
    {
      "collectionGroup": "standings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tournamentId", "order": "ASCENDING" },
        { "fieldPath": "points", "order": "DESCENDING" },
        { "fieldPath": "goalDiff", "order": "DESCENDING" }
      ]
    },
    
    // Media
    {
      "collectionGroup": "media",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "entityType", "order": "ASCENDING" },
        { "fieldPath": "entityId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "media",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "associationId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    
    // Comments
    {
      "collectionGroup": "comments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "entityType", "order": "ASCENDING" },
        { "fieldPath": "entityId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    
    // Likes
    {
      "collectionGroup": "likes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "entityType", "order": "ASCENDING" },
        { "fieldPath": "entityId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "likes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    
    // Follows
    {
      "collectionGroup": "follows",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "followerId", "order": "ASCENDING" },
        { "fieldPath": "targetType", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "follows",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "targetType", "order": "ASCENDING" },
        { "fieldPath": "targetId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    
    // Activities
    {
      "collectionGroup": "activities",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "associationId", "order": "ASCENDING" },
        { "fieldPath": "visibility", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "activities",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "associationId", "order": "ASCENDING" },
        { "fieldPath": "actorType", "order": "ASCENDING" },
        { "fieldPath": "actorId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "activities",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "associationId", "order": "ASCENDING" },
        { "fieldPath": "entityType", "order": "ASCENDING" },
        { "fieldPath": "entityId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    
    // Notifications
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "isRead", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    
    // Notices
    {
      "collectionGroup": "notices",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "associationId", "order": "ASCENDING" },
        { "fieldPath": "isPinned", "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## 12️⃣ 보안 규칙

### 12-1. Firestore Security Rules

**파일**: `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper Functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAssociationAdmin(associationId) {
      return isAuthenticated() &&
        exists(/databases/$(database)/documents/associations/$(associationId)) &&
        get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids is list &&
        request.auth.uid in get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids;
    }
    
    function isTeamOwner(teamId) {
      return isAuthenticated() &&
        exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role == "owner";
    }
    
    function isTeamAdmin(teamId) {
      return isAuthenticated() &&
        exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ["owner", "admin"];
    }
    
    function isTeamMember(teamId) {
      return isAuthenticated() &&
        exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
    }
    
    // Associations
    match /associations/{associationId} {
      allow read: if true; // 공개 읽기
      allow write: if isAssociationAdmin(associationId);
      
      // Activities
      match /activities/{activityId} {
        allow read: if true; // 공개 읽기
        allow create: if isAuthenticated(); // 인증된 사용자만 생성 가능
        allow update, delete: if false; // Cloud Functions만 수정/삭제
      }
      
      // Notices
      match /notices/{noticeId} {
        allow read: if true; // 공개 읽기
        allow write: if isAssociationAdmin(associationId);
      }
      
      // Facilities
      match /facilities/{facilityId} {
        allow read: if true; // 공개 읽기
        allow write: if isAssociationAdmin(associationId);
      }
      
      // Members
      match /members/{userId} {
        allow read: if true; // 공개 읽기
        allow write: if isAssociationAdmin(associationId);
      }
    }
    
    // Users
    match /users/{userId} {
      allow read: if true; // 공개 읽기
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }
    
    // Teams
    match /teams/{teamId} {
      allow read: if true; // 공개 읽기
      allow create: if isAuthenticated(); // 인증된 사용자만 생성
      allow update: if isTeamAdmin(teamId) || isAssociationAdmin(resource.data.associationId);
      allow delete: if isTeamOwner(teamId) || isAssociationAdmin(resource.data.associationId);
      
      // Team Members
      match /members/{userId} {
        allow read: if true; // 공개 읽기
        allow create: if false; // Cloud Functions만 생성
        allow update: if isTeamAdmin(teamId) || request.auth.uid == userId;
        allow delete: if isTeamOwner(teamId) || request.auth.uid == userId;
      }
    }
    
    // Players
    match /players/{playerId} {
      allow read: if true; // 공개 읽기
      allow create: if isAuthenticated(); // 인증된 사용자만 생성
      allow update: if request.auth.uid == resource.data.userId || isAssociationAdmin(resource.data.associationId);
      allow delete: if isAssociationAdmin(resource.data.associationId);
    }
    
    // Tournaments
    match /tournaments/{tournamentId} {
      allow read: if true; // 공개 읽기
      allow write: if isAssociationAdmin(resource.data.associationId);
    }
    
    // Matches
    match /matches/{matchId} {
      allow read: if true; // 공개 읽기
      allow create: if isAuthenticated(); // 인증된 사용자만 생성
      allow update: if isAssociationAdmin(resource.data.associationId) || isTeamAdmin(resource.data.homeTeamId) || isTeamAdmin(resource.data.awayTeamId);
      allow delete: if isAssociationAdmin(resource.data.associationId);
    }
    
    // Match Events
    match /match_events/{eventId} {
      allow read: if true; // 공개 읽기
      allow create: if isAuthenticated(); // 인증된 사용자만 생성 (관리자/심판)
      allow update, delete: if false; // Cloud Functions만 수정/삭제
    }
    
    // Match Lineups
    match /match_lineups/{lineupId} {
      allow read: if true; // 공개 읽기
      allow write: if isAuthenticated(); // 인증된 사용자만
    }
    
    // Match Stats
    match /match_stats/{matchId} {
      allow read: if true; // 공개 읽기
      allow write: if isAuthenticated(); // 인증된 사용자만
    }
    
    // Standings
    match /standings/{standingId} {
      allow read: if true; // 공개 읽기
      allow write: if false; // Cloud Functions만 수정
    }
    
    // Team Stats
    match /team_stats/{teamId} {
      allow read: if true; // 공개 읽기
      allow write: if false; // Cloud Functions만 수정
    }
    
    // Player Stats
    match /player_stats/{playerId} {
      allow read: if true; // 공개 읽기
      allow write: if false; // Cloud Functions만 수정
    }
    
    // Media
    match /media/{mediaId} {
      allow read: if true; // 공개 읽기
      allow create: if isAuthenticated(); // 인증된 사용자만 생성
      allow update: if request.auth.uid == resource.data.uploadedBy || isAssociationAdmin(resource.data.associationId);
      allow delete: if request.auth.uid == resource.data.uploadedBy || isAssociationAdmin(resource.data.associationId);
    }
    
    // Comments
    match /comments/{commentId} {
      allow read: if true; // 공개 읽기
      allow create: if isAuthenticated(); // 인증된 사용자만 생성
      allow update: if request.auth.uid == resource.data.userId;
      allow delete: if request.auth.uid == resource.data.userId;
    }
    
    // Likes
    match /likes/{likeId} {
      allow read: if true; // 공개 읽기
      allow create: if isAuthenticated() && request.auth.uid == request.resource.data.userId;
      allow delete: if isAuthenticated() && request.auth.uid == resource.data.userId;
    }
    
    // Follows
    match /follows/{followId} {
      allow read: if true; // 공개 읽기
      allow create: if isAuthenticated() && request.auth.uid == request.resource.data.followerId;
      allow delete: if isAuthenticated() && request.auth.uid == resource.data.followerId;
    }
    
    // Shares
    match /shares/{shareId} {
      allow read: if true; // 공개 읽기
      allow create: if isAuthenticated() && request.auth.uid == request.resource.data.userId;
    }
    
    // Activities
    match /activities/{activityId} {
      allow read: if true; // 공개 읽기
      allow create: if isAuthenticated(); // 인증된 사용자만 생성
      allow update, delete: if false; // Cloud Functions만 수정/삭제
    }
    
    // Notifications
    match /notifications/{notificationId} {
      allow read: if isAuthenticated() && request.auth.uid == resource.data.userId;
      allow create: if false; // Cloud Functions만 생성
      allow update: if isAuthenticated() && request.auth.uid == resource.data.userId;
      allow delete: if isAuthenticated() && request.auth.uid == resource.data.userId;
    }
    
    // Notices
    match /notices/{noticeId} {
      allow read: if true; // 공개 읽기
      allow write: if isAssociationAdmin(resource.data.associationId);
    }
    
    // Facilities
    match /facilities/{facilityId} {
      allow read: if true; // 공개 읽기
      allow write: if isAssociationAdmin(resource.data.associationId);
    }
    
    // Membership Requests
    match /membership_requests/{requestId} {
      allow read: if isAuthenticated(); // 인증된 사용자만 읽기
      allow create: if isAuthenticated(); // 인증된 사용자만 생성
      allow update: if isAssociationAdmin(resource.data.associationId);
      allow delete: if isAssociationAdmin(resource.data.associationId);
    }
    
    // Admin Logs
    match /admin_logs/{logId} {
      allow read: if isAuthenticated(); // 인증된 사용자만 읽기
      allow write: if false; // Cloud Functions만 생성
    }
  }
}
```

---

## 13️⃣ 데이터 관계도

### 13-1. 전체 데이터 관계

```
Association (협회)
│
├─ Teams (팀)
│   ├─ Members (팀 멤버)
│   ├─ Team Stats (팀 통계)
│   └─ Media (팀 미디어)
│
├─ Players (선수)
│   ├─ Player Stats (선수 통계)
│   └─ Media (선수 미디어)
│
├─ Tournaments (리그)
│   ├─ Matches (경기)
│   │   ├─ Match Events (경기 이벤트)
│   │   ├─ Match Lineups (라인업)
│   │   └─ Match Stats (경기 통계)
│   │
│   └─ Standings (순위)
│
├─ Activities (활동 피드)
│
├─ Notices (공지)
│
└─ Facilities (시설)
```

### 13-2. Social 관계

```
Users
│
├─ Likes (좋아요)
│   └─ Media, Match, Team, Player, Activity
│
├─ Comments (댓글)
│   └─ Media, Match, Team, Player, Activity
│
├─ Follows (팔로우)
│   └─ Team, Player, User
│
└─ Shares (공유)
    └─ Media, Match, Team, Player, Activity
```

### 13-3. 통계 집계 관계

```
Match Events
  ↓ (Cloud Function)
Player Stats
Team Stats
Standings
Leaderboards
```

---

## ✅ 스키마 체크리스트

### Phase 1: 핵심 컬렉션
- [ ] `associations` 컬렉션
- [ ] `teams` 컬렉션
- [ ] `players` 컬렉션
- [ ] `tournaments` 컬렉션
- [ ] `matches` 컬렉션

### Phase 2: Match 관련
- [ ] `match_events` 컬렉션
- [ ] `match_lineups` 컬렉션
- [ ] `match_stats` 컬렉션

### Phase 3: Stats 관련
- [ ] `standings` 컬렉션
- [ ] `team_stats` 컬렉션
- [ ] `player_stats` 컬렉션

### Phase 4: Social 관련
- [ ] `likes` 컬렉션
- [ ] `comments` 컬렉션
- [ ] `follows` 컬렉션
- [ ] `shares` 컬렉션

### Phase 5: Content 관련
- [ ] `media` 컬렉션
- [ ] `activities` 컬렉션
- [ ] `notifications` 컬렉션
- [ ] `notices` 컬렉션
- [ ] `facilities` 컬렉션

### Phase 6: Admin 관련
- [ ] `membership_requests` 컬렉션
- [ ] `organization_members` 컬렉션
- [ ] `admin_logs` 컬렉션

### Phase 7: 인덱스 및 보안
- [ ] Firestore 인덱스 설정
- [ ] Firestore Security Rules 설정

---

## 📚 주요 쿼리 패턴

### 협회 팀 목록

```typescript
query(
  collection(db, "teams"),
  where("associationId", "==", associationId),
  where("membership", "==", "member"),
  orderBy("createdAt", "desc")
)
```

### 승인 대기 팀

```typescript
query(
  collection(db, "teams"),
  where("associationId", "==", associationId),
  where("membership", "==", "pending"),
  orderBy("createdAt", "desc")
)
```

### 오늘 경기

```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayString = format(today, "yyyy-MM-dd");

query(
  collection(db, "matches"),
  where("associationId", "==", associationId),
  where("date", "==", todayString),
  where("status", "in", ["scheduled", "live"]),
  orderBy("time", "asc")
)
```

### 경기 이벤트 (Timeline)

```typescript
query(
  collection(db, "match_events"),
  where("matchId", "==", matchId),
  orderBy("minute", "asc"),
  orderBy("createdAt", "asc")
)
```

### Activity Feed

```typescript
query(
  collection(db, "associations", associationId, "activities"),
  where("visibility", "==", "public"),
  orderBy("createdAt", "desc"),
  limit(20)
)
```

### 리그 순위

```typescript
query(
  collection(db, "standings"),
  where("tournamentId", "==", tournamentId),
  orderBy("points", "desc"),
  orderBy("goalDiff", "desc")
)
```

---

**작성일**: 2024년  
**상태**: ✅ 설계 완료 (개발 시작 가능)

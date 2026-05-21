# YAGO v1 - 최소 데이터 모델 (Startup 버전)

## 🎯 목표

**3~4주 안에 플랫폼을 출시할 수 있는 최소한의 데이터 구조**

**전략**: 12개 테이블 → 7개 테이블로 축소

---

## 📊 v1 핵심 원칙

### 1. 필수 기능만
- Organization 생성
- League 운영
- Team 관리
- Match 일정/결과
- Standings 자동 계산

### 2. 제외할 기능 (v2로 미룸)
- Player Identity System (복잡도 높음)
- Match Events 상세 (기본 득점만)
- Player Stats 상세 (팀 통계만)
- Season 관리 (단일 시즌만)
- Announcements (기본 공지만)

---

## 🗂️ v1 Core Collections (7개)

```
1. organizations
2. leagues
3. teams
4. league_teams (리그 참가)
5. matches
6. standings
7. announcements
```

---

## 📋 v1 데이터 모델 상세

### 1. Organizations (조직)

**Collection**: `organizations`

**v1에서 필수만 포함**

```typescript
interface Organization {
  id: string;
  slug: string;
  name: string;
  type: "federation" | "academy" | "club";
  sport: string;
  
  // UI Assets
  logoUrl?: string;
  heroImageUrl?: string;
  description?: string;
  
  // Template
  templateId: string;
  
  // Metadata
  ownerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**v1에서 제외**:
- `status` (항상 active로 가정)
- 복잡한 권한 시스템

---

### 2. Leagues (리그)

**Collection**: `leagues`

**v1 단순화**: Season 없이 직접 연결

```typescript
interface League {
  id: string;
  organizationId: string;
  
  name: string;
  slug: string;
  sport: string;
  description?: string;
  
  format: "round_robin" | "tournament";
  
  // Dates (Season 대신 직접)
  startDate: Timestamp;
  endDate: Timestamp;
  
  // Stats
  teamCount: number;
  matchCount: number;
  completedMatchCount: number;
  
  status: "draft" | "active" | "completed";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**v1에서 제외**:
- `seasonId` (Season 테이블 제거)
- `hybrid` format (v2로)

---

### 3. Teams (팀)

**Collection**: `teams`

**v1 단순화**

```typescript
interface Team {
  id: string;
  organizationId: string;
  
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  
  managerId?: string;           // 팀장 UID
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**v1에서 제외**:
- `memberCount` (denormalized stats)
- `status` (항상 active)

---

### 4. League Teams (리그 참가 팀)

**Collection**: `league_teams`

**Purpose**: 리그와 팀의 다대다 관계

```typescript
interface LeagueTeam {
  id: string;
  leagueId: string;
  teamId: string;
  organizationId: string;
  
  // Team Info (denormalized)
  teamName: string;
  teamLogoUrl?: string;
  
  registeredAt: Timestamp;
  createdAt: Timestamp;
}
```

**v1에서 제외**:
- `status` (pending/approved) - 바로 승인으로 가정

---

### 5. Matches (경기)

**Collection**: `matches`

**v1 단순화**: 기본 정보만

```typescript
interface Match {
  id: string;
  organizationId: string;
  leagueId: string;
  
  // Teams
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;          // denormalized
  awayTeamName: string;           // denormalized
  
  // Schedule
  scheduledAt: Timestamp;
  facilityName?: string;
  
  // Result
  status: "scheduled" | "completed" | "cancelled";
  homeScore?: number;
  awayScore?: number;
  playedAt?: Timestamp;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**v1에서 제외**:
- `matchEvents` (상세 이벤트)
- `matchPlayerStats` (선수 통계)
- `matchReportId` (AI 리포트)
- `in_progress`, `postponed` status

---

### 6. Standings (순위표)

**Collection**: `standings`

**v1 핵심**: 자동 계산만

```typescript
interface Standing {
  id: string;
  leagueId: string;
  teamId: string;
  organizationId: string;
  
  // Team Info (denormalized)
  teamName: string;
  teamLogoUrl?: string;
  
  // Stats
  games: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  
  // Rank
  rank: number;
  
  lastUpdatedAt: Timestamp;
  createdAt: Timestamp;
}
```

**v1에서 제외**:
- `previousRank`, `rankChange` (순위 변동 추적)

---

### 7. Announcements (공지)

**Collection**: `announcements`

**v1 기본 공지만**

```typescript
interface Announcement {
  id: string;
  organizationId: string;
  
  title: string;
  content: string;
  thumbnailUrl?: string;
  
  authorId: string;
  authorName?: string;            // denormalized
  
  publishedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**v1에서 제외**:
- `visibility` (항상 public)
- `targetTeamIds` (팀별 공지)
- `status` (draft/published)

---

## 🔗 v1 관계도 (단순화)

```
Organization (1)
  ├─ League (N)
  │   ├─ LeagueTeam (N)
  │   │   └─ Team (1)
  │   │
  │   ├─ Match (N)
  │   │   └─ Team (2: home/away)
  │   │
  │   └─ Standing (N)
  │       └─ Team (1)
  │
  └─ Announcement (N)
```

**v1에서 제외된 관계**:
- Season → League
- Player → PlayerMembership → Team
- Match → MatchEvent
- Match → MatchPlayerStat

---

## 📊 v1 데이터 흐름 (단순화)

### 1. Organization 생성

```
Organization Builder
  ↓
organizations/{id} 생성
  ↓
완료
```

### 2. League 생성

```
Admin Dashboard
  ↓
leagues/{id} 생성
  ↓
완료
```

### 3. 팀 등록

```
Admin Dashboard
  ↓
teams/{id} 생성
  ↓
league_teams/{id} 생성 (리그 참가)
  ↓
완료
```

### 4. 경기 일정 생성

```
Admin Dashboard
  ↓
matches/{id} 생성
  ↓
완료
```

### 5. 경기 결과 입력

```
Admin Dashboard
  ↓
matches/{id} 업데이트 (점수만)
  ↓
standings/{id} 자동 계산 (Cloud Function)
  ↓
완료
```

---

## ⚡ v1 Cloud Functions (최소)

### 1. Standings 자동 계산

```typescript
// onMatchResultWrite
export const onMatchResultWrite = functions.firestore
  .document("matches/{matchId}")
  .onUpdate(async (snap, context) => {
    const match = snap.after.data();
    
    if (match.status === "completed" && match.homeScore !== undefined) {
      // Standings 업데이트
      await updateStandings(match.leagueId, {
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeScore: match.homeScore,
        awayScore: match.awayScore
      });
    }
  });
```

**v1에서 제외**:
- Activity 자동 생성
- Player Stats 집계
- AI 리포트 생성

---

## 🎯 v1 기능 범위

### ✅ 포함 기능

1. **Organization Builder**
   - Wizard UI
   - Template 선택
   - Organization 생성

2. **League 운영**
   - 리그 생성
   - 팀 등록
   - 경기 일정 생성
   - 결과 입력

3. **Standings**
   - 자동 계산
   - 순위표 표시

4. **Public Website**
   - Organization Home
   - League Page
   - Teams Page
   - Matches Page

5. **Admin Dashboard**
   - 기본 관리 기능

### ❌ v2로 미룸

1. **Player Identity System**
   - Player 테이블
   - PlayerMembership
   - Player Profile

2. **Match 상세**
   - Match Events
   - Match Player Stats
   - AI 리포트

3. **Season 관리**
   - Season 테이블
   - 다중 시즌

4. **고급 기능**
   - AI Copilot
   - Activity Feed
   - 복잡한 권한 시스템

---

## 📈 v1 → v2 마이그레이션 전략

### Phase 1: v1 출시 (3~4주)
- 7개 테이블로 MVP 출시
- 기본 리그 운영 기능

### Phase 2: v2 확장 (2~3주)
- Player 테이블 추가
- Match Events 추가
- Season 테이블 추가

### 마이그레이션 방법

```typescript
// v1 데이터는 그대로 유지
// v2 테이블만 추가

// 예: Player 추가 시
// 기존 matches 데이터는 그대로
// 새로운 player_memberships 테이블만 추가
```

---

## 🔐 v1 Security Rules (단순화)

### Organizations

```javascript
match /organizations/{orgId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == resource.data.ownerId;
}
```

### Leagues

```javascript
match /organizations/{orgId}/leagues/{leagueId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == get(/databases/$(database)/documents/organizations/$(orgId)).data.ownerId;
}
```

**v1에서 제외**:
- 복잡한 Organization Role 시스템
- Team Role 시스템

---

## 📊 v1 인덱스 (최소)

### 필수 인덱스만

```javascript
// organizations
- slug (unique)

// leagues
- organizationId
- organizationId + slug (composite, unique)

// teams
- organizationId
- organizationId + slug (composite, unique)

// league_teams
- leagueId
- teamId
- leagueId + teamId (composite, unique)

// matches
- organizationId
- leagueId
- leagueId + scheduledAt (composite)

// standings
- leagueId
- leagueId + points (composite, descending)

// announcements
- organizationId
- organizationId + publishedAt (composite, descending)
```

---

## ✅ v1 구현 체크리스트

### Week 1: 기본 구조
- [ ] Organizations 테이블
- [ ] Leagues 테이블
- [ ] Teams 테이블
- [ ] League Teams 테이블

### Week 2: Match 시스템
- [ ] Matches 테이블
- [ ] Standings 테이블
- [ ] Standings 자동 계산 Cloud Function

### Week 3: UI 구현
- [ ] Organization Builder
- [ ] Admin Dashboard
- [ ] League Page
- [ ] Public Website

### Week 4: 폴리싱
- [ ] Announcements
- [ ] 테스트
- [ ] 배포

---

## 🚀 v1 개발 우선순위

### Must Have (v1)
1. Organization 생성
2. League 생성
3. 팀 등록
4. 경기 일정
5. 결과 입력
6. 순위표

### Nice to Have (v1.5)
1. 공지사항
2. 기본 통계

### Future (v2)
1. Player 시스템
2. Match 상세
3. AI 기능

---

## 💡 v1 핵심 전략

### 1. 단순함 우선
- 복잡한 기능은 v2로
- MVP에 집중

### 2. 빠른 출시
- 3~4주 목표
- 완벽보다 빠른 출시

### 3. 확장 가능한 구조
- v2 추가 시 기존 데이터 유지
- 점진적 확장

---

## 📊 v1 vs v2 비교

| 기능 | v1 | v2 |
|------|----|----|
| Organizations | ✅ | ✅ |
| Leagues | ✅ | ✅ |
| Teams | ✅ | ✅ |
| Matches | ✅ (기본) | ✅ (상세) |
| Standings | ✅ | ✅ |
| Players | ❌ | ✅ |
| Match Events | ❌ | ✅ |
| Seasons | ❌ | ✅ |
| AI Features | ❌ | ✅ |

---

## 🎯 v1 목표

**3~4주 안에 실제 사용 가능한 리그 운영 플랫폼 출시**

이 구조로 시작하면:
- 빠른 개발
- 명확한 범위
- 확장 가능한 기반

---

이 v1 최소 모델로 **빠르게 MVP를 출시**하고, 사용자 피드백을 받아 **v2로 확장**하는 전략이 가장 현실적입니다! 🚀

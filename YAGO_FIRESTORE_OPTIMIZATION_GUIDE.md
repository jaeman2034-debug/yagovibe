# 🔥 YAGO VIBE SPORTS - Firestore 최적화 구조 가이드

> **작성일**: 2024년  
> **목적**: 실제 개발에 바로 쓰는 Firestore 컬렉션 구조 및 최적화 전략

---

## 📋 핵심 원칙

1. **팀 활동은 팀 하위** - `teams/{teamId}/...`
2. **경기 엔진은 전역 matches** - `matches/{matchId}`
3. **대회/리그는 협회 하위** - `federations/{federationId}/leagues/{leagueId}`
4. **통계/랭킹은 집계 컬렉션 분리** - `rankings/{seasonId}/...`

---

## 🗄️ 핵심 컬렉션 구조

### Core Collections

```
users/{userId}
  - displayName, email, role, photoUrl, createdAt

teams/{teamId}
  - name, region, sportType, ownerId, members[], createdAt

teams/{teamId}/members/{uid}
  - role: "owner" | "admin" | "member", joinedAt

teams/{teamId}/events/{eventId}
  - title, description, date, location, createdBy, attendees[]

teams/{teamId}/notices/{noticeId}
  - title, content, authorId, isPinned, createdAt

teams/{teamId}/activities/{activityId}
  - type, title, createdBy, referenceId, createdAt

teams/{teamId}/matches/{matchId}
  - matchId (참조), isHome, result, date
```

### Match System

```
matches/{matchId}
  - homeTeamId, awayTeamId, date, location, status, score, leagueId?, tournamentId?

matches/{matchId}/lineups/{playerId}
  - teamId, playerId, position, number, isStarter

matches/{matchId}/events/{eventId}
  - type, minute, teamId, playerId, assistPlayerId?
```

### Stats & Ranking

```
players/{playerId}
  - name, teamId, position, number, status

players/{playerId}/stats/{seasonId}
  - matches, goals, assists, yellowCards, redCards, minutesPlayed

teams/{teamId}/stats/{seasonId}
  - matches, wins, draws, losses, goalsFor, goalsAgainst, points

rankings/{seasonId}/teams/{teamId}
  - teamId, points, goalDifference, rank, previousRank

rankings/{seasonId}/players/{category}/{playerId}
  - playerId, goals/assists, rank
```

### Tournament System

```
tournaments/{tournamentId}
  - name, season, format, startDate, endDate, status

tournaments/{tournamentId}/teams/{teamId}
  - teamId, joinedAt, status

tournaments/{tournamentId}/matches/{matchId}
  - matchId (참조), round, groupId

tournaments/{tournamentId}/standings/{teamId}
  - teamId, matches, wins, points, rank
```

### Federation & League

```
federations/{federationId}
  - name, slug, sport, region, ownerId, adminIds[]

federations/{federationId}/leagues/{leagueId}
  - name, season, status, startDate, endDate, format

leagues/{leagueId}/teams/{teamId}
  - teamId, status, joinedAt, approvedBy

leagues/{leagueId}/matches/{matchId}
  - matchId (참조), round, status

leagues/{leagueId}/standings/{teamId}
  - teamId, matches, wins, points, rank
```

### Chat System

```
chatRooms/{roomId}
  - type: "team" | "match" | "direct", members[], lastMessage, lastMessageAt

chatRooms/{roomId}/messages/{messageId}
  - type: "text" | "image" | "event" | "notice", senderId, text, createdAt
```

### Academy System

```
academies/{academyId}
  - name, sport, region, ownerId, status

academies/{academyId}/players/{playerId}
  - playerId, joinedAt, status

academies/{academyId}/coaches/{coachId}
  - coachId, role, joinedAt

academies/{academyId}/programs/{programId}
  - name, description, schedule, duration
```

---

## 🔍 인덱스 전략

### 필수 복합 인덱스

```javascript
// teams/{teamId}/activities
- createdAt (desc)

// matches
- status + date (desc)
- leagueId + status + date (desc)
- tournamentId + status + date (desc)

// players/{playerId}/stats
- seasonId + goals (desc)
- seasonId + assists (desc)

// rankings/{seasonId}/teams
- points (desc), goalDifference (desc), goalsFor (desc)

// chatRooms/{roomId}/messages
- createdAt (desc)
```

---

## 📊 Denormalization 전략

### 1. 팀 이름 중복 저장

```typescript
// matches/{matchId}
{
  homeTeamId: "team1",
  homeTeamName: "노원FC", // 중복 저장
  awayTeamId: "team2",
  awayTeamName: "상계FC", // 중복 저장
}
```

**이유**: 경기 목록 조회 시 팀 정보 조회 불필요

### 2. 선수 이름 중복 저장

```typescript
// matches/{matchId}/events/{eventId}
{
  playerId: "player1",
  playerName: "홍길동", // 중복 저장
}
```

**이유**: 경기 이벤트 타임라인 조회 시 선수 정보 조회 불필요

### 3. 통계 집계 문서

```typescript
// teams/{teamId}/stats/{seasonId}
{
  matches: 10,
  wins: 6,
  points: 20,
  // 매 경기마다 계산하지 않고 집계 문서에 저장
}
```

**이유**: 통계 조회 성능 최적화

---

## 🚀 쿼리 최적화 패턴

### 1. 페이지네이션

```typescript
// ✅ 좋은 예: limit + startAfter
const firstPage = query(
  collection(db, "matches"),
  where("status", "==", "completed"),
  orderBy("date", "desc"),
  limit(20)
);

const lastDoc = snapshot.docs[snapshot.docs.length - 1];
const nextPage = query(
  collection(db, "matches"),
  where("status", "==", "completed"),
  orderBy("date", "desc"),
  startAfter(lastDoc),
  limit(20)
);
```

### 2. 필요한 필드만 조회

```typescript
// ✅ 좋은 예: 필요한 필드만 조회
const matchRef = doc(db, "matches", matchId);
const matchSnap = await getDoc(matchRef);
const { homeTeamName, awayTeamName, score, date } = matchSnap.data();
```

### 3. 서브컬렉션 활용

```typescript
// ✅ 좋은 예: 서브컬렉션으로 데이터 분리
const activitiesRef = collection(db, "teams", teamId, "activities");
const q = query(activitiesRef, orderBy("createdAt", "desc"), limit(20));
```

---

## 💾 캐싱 전략

### 1. React Query 캐싱

```typescript
// 통계/랭킹은 5분 캐싱
useQuery({
  queryKey: ["teamStats", teamId, seasonId],
  queryFn: () => getTeamStats(teamId, seasonId),
  staleTime: 5 * 60 * 1000, // 5분
});
```

### 2. 로컬 상태 캐싱

```typescript
// 팀 정보는 세션 동안 캐싱
const [teamCache, setTeamCache] = useState<Map<string, Team>>(new Map());
```

---

## ⚠️ 주의사항

### 1. 컬렉션 그룹 쿼리 제한

```typescript
// ❌ 나쁜 예: collectionGroup은 비용이 높음
const allStats = query(
  collectionGroup(db, "stats"),
  where("seasonId", "==", "2025")
);

// ✅ 좋은 예: 특정 팀/선수의 stats만 조회
const teamStats = query(
  collection(db, "teams", teamId, "stats"),
  where("seasonId", "==", "2025")
);
```

### 2. 실시간 구독 최소화

```typescript
// ❌ 나쁜 예: 모든 경기에 실시간 구독
matches.forEach(match => {
  onSnapshot(doc(db, "matches", match.id), ...);
});

// ✅ 좋은 예: 필요한 경기만 실시간 구독
onSnapshot(doc(db, "matches", currentMatchId), ...);
```

---

**작성일**: 2024년  
**상태**: ✅ Firestore 최적화 가이드 완료

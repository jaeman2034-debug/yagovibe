# ⚡ YAGO SPORTS Firestore 최적 구조 (성능 기준)

> **작성일**: 2024년  
> **목적**: 성능 최적화를 위한 Firestore 데이터베이스 구조 설계

---

## 📋 목차

1. [최적화 원칙](#1-최적화-원칙)
2. [컬렉션 구조 최적화](#2-컬렉션-구조-최적화)
3. [인덱스 전략](#3-인덱스-전략)
4. [비정규화 전략](#4-비정규화-전략)
5. [쿼리 최적화](#5-쿼리-최적화)
6. [캐싱 전략](#6-캐싱-전략)

---

## 1️⃣ 최적화 원칙

### 핵심 원칙

1. **읽기 최적화**: 자주 읽는 데이터는 비정규화
2. **쓰기 최소화**: 불필요한 쓰기 방지
3. **인덱스 활용**: 복합 쿼리 최적화
4. **서브컬렉션 활용**: 관련 데이터 그룹화
5. **집계 데이터**: 실시간 계산 대신 사전 계산

---

## 2️⃣ 컬렉션 구조 최적화

### 2-1. 최적화된 컬렉션 구조

```
Firestore Root
│
├─ users/{userId} ⚡ (읽기 최적화)
│   └─ 캐시된 프로필 정보 포함
│
├─ teams/{teamId} ⚡ (비정규화)
│   ├─ members/{memberId} (서브컬렉션)
│   ├─ events/{eventId} (서브컬렉션)
│   ├─ notices/{noticeId} (서브컬렉션)
│   ├─ blog_posts/{postId} (서브컬렉션)
│   └─ activities/{activityId} (서브컬렉션)
│
├─ teamSchedules/{scheduleId} ⚡ (인덱스 최적화)
│   └─ teamId + dateTime 복합 인덱스
│
├─ matches/{matchId} ⚡ (비정규화)
│   ├─ events/{eventId} (서브컬렉션)
│   ├─ lineups/{lineupId} (서브컬렉션)
│   └─ stats/{statId} (서브컬렉션)
│
├─ tournaments/{tournamentId} ⚡ (집계 데이터 포함)
│   ├─ teams/{teamId} (서브컬렉션)
│   ├─ standings/{standingId} (서브컬렉션 - 사전 계산)
│   └─ matches/{matchId} (서브컬렉션)
│
├─ players/{playerId} ⚡ (집계 통계 포함)
│   └─ stats/{statId} (서브컬렉션)
│
├─ academies/{academyId} ⚡
│   ├─ players/{playerId} (서브컬렉션)
│   ├─ coaches/{coachId} (서브컬렉션)
│   └─ programs/{programId} (서브컬렉션)
│
├─ chatRooms/{roomId} ⚡ (lastMessage 비정규화)
│   └─ messages/{messageId} (서브컬렉션)
│
├─ activities/{activityId} ⚡ (피드 최적화)
│   └─ teamId + createdAt 복합 인덱스
│
└─ notifications/{notificationId} ⚡ (읽기 최적화)
    └─ userId + isRead + createdAt 복합 인덱스
```

---

## 3️⃣ 인덱스 전략

### 3-1. 필수 복합 인덱스

```json
{
  "indexes": [
    {
      "collectionGroup": "teams",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "region", "order": "ASCENDING" },
        { "fieldPath": "sportType", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "teams",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "visibility", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "teamSchedules",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teamId", "order": "ASCENDING" },
        { "fieldPath": "dateTime", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "teamSchedules",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "dateTime", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "homeTeamId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "awayTeamId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tournamentId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "activities",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "visibility", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "activities",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teamId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "isRead", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 4️⃣ 비정규화 전략

### 4-1. 팀 데이터 비정규화

```typescript
// teams/{teamId}
{
  // ✅ 비정규화: 팀 정보에 소유자 정보 포함
  ownerUid: string;
  owners: string[]; // 중복 저장 (빠른 권한 체크)
  
  // ✅ 비정규화: 집계 통계 포함
  stats: {
    totalMembers: number;
    totalMatches: number;
    totalEvents: number;
  };
  
  // ✅ 비정규화: 마지막 활동 시간
  lastActivityAt: Timestamp;
}
```

### 4-2. 경기 데이터 비정규화

```typescript
// matches/{matchId}
{
  // ✅ 비정규화: 팀 이름 포함 (팀 조회 없이 표시)
  homeTeamName: string;
  awayTeamName: string;
  
  // ✅ 비정규화: 점수 포함
  homeScore: number;
  awayScore: number;
  
  // ✅ 비정규화: 상태 포함
  status: "scheduled" | "live" | "completed";
}
```

### 4-3. 채팅방 데이터 비정규화

```typescript
// chatRooms/{roomId}
{
  // ✅ 비정규화: 마지막 메시지 정보 포함
  lastMessage: {
    text: string;
    senderId: string;
    senderName: string; // 비정규화
    createdAt: Timestamp;
  };
  
  // ✅ 비정규화: 읽지 않은 메시지 수
  unreadCount: number;
}
```

### 4-4. 활동 피드 데이터 비정규화

```typescript
// activities/{activityId}
{
  // ✅ 비정규화: 작성자 정보 포함
  authorId: string;
  authorName: string; // 비정규화
  authorPhotoUrl?: string; // 비정규화
  
  // ✅ 비정규화: 팀 정보 포함
  teamId?: string;
  teamName?: string; // 비정규화
  
  // ✅ 비정규화: 카운터 포함
  likeCount: number;
  commentCount: number;
}
```

---

## 5️⃣ 쿼리 최적화

### 5-1. 최적화된 쿼리 패턴

#### 팀 목록 조회 (지역 + 종목 필터)

```typescript
// ✅ 최적화: 복합 인덱스 활용
const teamsQuery = query(
  collection(db, "teams"),
  where("region", "==", region),
  where("sportType", "==", sportType),
  where("visibility", "==", "public"),
  where("status", "==", "active"),
  orderBy("createdAt", "desc"),
  limit(20)
);
```

#### 팀 일정 조회 (날짜 범위)

```typescript
// ✅ 최적화: teamId + dateTime 인덱스 활용
const schedulesQuery = query(
  collection(db, "teamSchedules"),
  where("teamId", "==", teamId),
  where("dateTime", ">=", startDate),
  where("dateTime", "<=", endDate),
  orderBy("dateTime", "asc")
);
```

#### 활동 피드 조회 (팀별)

```typescript
// ✅ 최적화: teamId + createdAt 인덱스 활용
const activitiesQuery = query(
  collection(db, "activities"),
  where("teamId", "==", teamId),
  where("visibility", "in", ["public", "team"]),
  orderBy("createdAt", "desc"),
  limit(20)
);
```

#### 알림 조회 (읽지 않은 알림)

```typescript
// ✅ 최적화: userId + isRead + createdAt 인덱스 활용
const notificationsQuery = query(
  collection(db, "notifications"),
  where("userId", "==", userId),
  where("isRead", "==", false),
  orderBy("createdAt", "desc"),
  limit(20)
);
```

---

## 6️⃣ 캐싱 전략

### 6-1. 클라이언트 캐싱

```typescript
// React Query를 활용한 캐싱
const { data: teams } = useQuery({
  queryKey: ["teams", region, sportType],
  queryFn: () => getTeams({ region, sportType }),
  staleTime: 5 * 60 * 1000, // 5분
  cacheTime: 30 * 60 * 1000, // 30분
});
```

### 6-2. 집계 데이터 캐싱

```typescript
// teams/{teamId}
{
  // ✅ 사전 계산된 통계 (Cloud Functions로 업데이트)
  stats: {
    totalMembers: number;
    totalMatches: number;
    wins: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  };
  
  // ✅ 마지막 업데이트 시간
  statsUpdatedAt: Timestamp;
}
```

### 6-3. 순위 데이터 캐싱

```typescript
// tournaments/{tournamentId}/standings/{teamId}
{
  // ✅ 사전 계산된 순위
  rank: number;
  points: number;
  goalDiff: number;
  
  // ✅ 마지막 업데이트 시간
  updatedAt: Timestamp;
}
```

---

## 7️⃣ 성능 최적화 팁

### 7-1. 읽기 최적화

1. **필요한 필드만 조회**: `select()` 사용
2. **페이지네이션**: `limit()` + `startAfter()` 사용
3. **서브컬렉션 활용**: 관련 데이터 그룹화
4. **비정규화**: 자주 조회하는 데이터 중복 저장

### 7-2. 쓰기 최적화

1. **배치 쓰기**: `batch()` 사용
2. **트랜잭션**: 일관성 보장
3. **Cloud Functions**: 집계 데이터 자동 업데이트
4. **비동기 처리**: 중요하지 않은 업데이트는 큐에 추가

### 7-3. 쿼리 최적화

1. **인덱스 활용**: 복합 쿼리 최적화
2. **필터 순서**: 가장 선택적인 필터 먼저
3. **범위 쿼리 최소화**: `in` 쿼리 제한
4. **서브컬렉션 활용**: 관련 데이터 그룹화

---

## 8️⃣ Cloud Functions 최적화

### 8-1. 집계 함수

```typescript
// 경기 완료 시 통계 업데이트
export const onMatchCompleted = functions.firestore
  .document("matches/{matchId}")
  .onUpdate(async (snap, context) => {
    const match = snap.after.data();
    
    if (match.status === "completed") {
      // ✅ 팀 통계 업데이트
      await updateTeamStats(match.homeTeamId, match);
      await updateTeamStats(match.awayTeamId, match);
      
      // ✅ 선수 통계 업데이트
      await updatePlayerStats(match);
      
      // ✅ 대회 순위 업데이트
      if (match.tournamentId) {
        await updateTournamentStandings(match.tournamentId);
      }
    }
  });
```

### 8-2. 카운터 함수

```typescript
// 활동 피드 좋아요 카운터
export const onActivityLike = functions.firestore
  .document("activities/{activityId}/likes/{likeId}")
  .onWrite(async (change, context) => {
    const activityId = context.params.activityId;
    const increment = change.after.exists ? 1 : -1;
    
    await admin.firestore()
      .collection("activities")
      .doc(activityId)
      .update({
        likeCount: admin.firestore.FieldValue.increment(increment)
      });
  });
```

---

## 9️⃣ 모니터링 및 최적화

### 9-1. 성능 모니터링

```typescript
// 쿼리 성능 추적
const startTime = performance.now();
const snapshot = await getDocs(query);
const endTime = performance.now();

console.log(`Query time: ${endTime - startTime}ms`);
```

### 9-2. 비용 최적화

1. **읽기 최소화**: 캐싱 활용
2. **쓰기 최소화**: 배치 처리
3. **인덱스 관리**: 필요한 인덱스만 생성
4. **서브컬렉션 활용**: 관련 데이터 그룹화

---

## ✅ 최적화 체크리스트

### 읽기 최적화
- [x] 비정규화 데이터 포함
- [x] 복합 인덱스 생성
- [x] 페이지네이션 구현
- [x] 클라이언트 캐싱

### 쓰기 최적화
- [x] 배치 쓰기 사용
- [x] 트랜잭션 활용
- [x] Cloud Functions 자동화
- [x] 비동기 처리

### 쿼리 최적화
- [x] 인덱스 전략 수립
- [x] 필터 순서 최적화
- [x] 서브컬렉션 활용
- [x] 범위 쿼리 최소화

---

**작성일**: 2024년  
**상태**: ✅ Firestore 최적 구조 완료

# ⚡ YAGO SPORTS Firestore 쿼리 최적화 (실전 기준)

> **작성일**: 2024년  
> **목적**: 실제 개발에서 사용할 수 있는 쿼리 최적화 가이드

---

## 📋 목차

1. [쿼리 최적화 원칙](#1-쿼리-최적화-원칙)
2. [주요 쿼리 패턴](#2-주요-쿼리-패턴)
3. [인덱스 전략](#3-인덱스-전략)
4. [비정규화 전략](#4-비정규화-전략)
5. [실제 쿼리 코드](#5-실제-쿼리-코드)

---

## 1️⃣ 쿼리 최적화 원칙

### 핵심 원칙

1. **인덱스 활용**: 모든 쿼리는 인덱스 사용
2. **필터 순서**: 가장 선택적인 필터 먼저
3. **범위 쿼리 최소화**: `in` 쿼리 제한 (최대 10개)
4. **페이지네이션**: `limit()` + `startAfter()` 사용
5. **서브컬렉션 활용**: 관련 데이터 그룹화

---

## 2️⃣ 주요 쿼리 패턴

### 2-1. 팀 목록 조회 (지역 + 종목)

```typescript
// ✅ 최적화: 복합 인덱스 활용
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";

export async function getTeamsByRegionAndSport(
  region: string,
  sportType: string,
  limitCount: number = 20
) {
  const teamsRef = collection(db, "teams");
  const q = query(
    teamsRef,
    where("region", "==", region),
    where("sportType", "==", sportType),
    where("visibility", "==", "public"),
    where("status", "==", "active"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
```

**필수 인덱스**:
```json
{
  "collectionGroup": "teams",
  "fields": [
    { "fieldPath": "region", "order": "ASCENDING" },
    { "fieldPath": "sportType", "order": "ASCENDING" },
    { "fieldPath": "visibility", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

### 2-2. 팀 일정 조회 (날짜 범위)

```typescript
// ✅ 최적화: teamId + dateTime 인덱스 활용
export async function getTeamSchedules(
  teamId: string,
  startDate: Date,
  endDate: Date
) {
  const schedulesRef = collection(db, "teamSchedules");
  const startTimestamp = Timestamp.fromDate(startDate);
  const endTimestamp = Timestamp.fromDate(endDate);
  
  const q = query(
    schedulesRef,
    where("teamId", "==", teamId),
    where("dateTime", ">=", startTimestamp),
    where("dateTime", "<=", endTimestamp),
    orderBy("dateTime", "asc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
```

**필수 인덱스**:
```json
{
  "collectionGroup": "teamSchedules",
  "fields": [
    { "fieldPath": "teamId", "order": "ASCENDING" },
    { "fieldPath": "dateTime", "order": "ASCENDING" }
  ]
}
```

---

### 2-3. 경기 목록 조회 (팀별)

```typescript
// ✅ 최적화: homeTeamId + date 인덱스 활용
export async function getTeamMatches(
  teamId: string,
  limitCount: number = 20
) {
  const matchesRef = collection(db, "matches");
  
  // 홈팀 경기
  const homeQuery = query(
    matchesRef,
    where("homeTeamId", "==", teamId),
    orderBy("date", "desc"),
    limit(limitCount)
  );
  
  // 원정팀 경기
  const awayQuery = query(
    matchesRef,
    where("awayTeamId", "==", teamId),
    orderBy("date", "desc"),
    limit(limitCount)
  );
  
  const [homeSnap, awaySnap] = await Promise.all([
    getDocs(homeQuery),
    getDocs(awayQuery)
  ]);
  
  const matches = [
    ...homeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    ...awaySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  ];
  
  // 날짜순 정렬
  return matches.sort((a, b) => {
    const dateA = a.date?.toMillis() || 0;
    const dateB = b.date?.toMillis() || 0;
    return dateB - dateA;
  }).slice(0, limitCount);
}
```

---

### 2-4. 활동 피드 조회 (팀별)

```typescript
// ✅ 최적화: teamId + createdAt 인덱스 활용
export async function getTeamActivities(
  teamId: string,
  limitCount: number = 20
) {
  const activitiesRef = collection(db, "activities");
  const q = query(
    activitiesRef,
    where("teamId", "==", teamId),
    where("visibility", "in", ["public", "team"]),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
```

**필수 인덱스**:
```json
{
  "collectionGroup": "activities",
  "fields": [
    { "fieldPath": "teamId", "order": "ASCENDING" },
    { "fieldPath": "visibility", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

### 2-5. 알림 조회 (읽지 않은 알림)

```typescript
// ✅ 최적화: userId + isRead + createdAt 인덱스 활용
export async function getUnreadNotifications(
  userId: string,
  limitCount: number = 20
) {
  const notificationsRef = collection(db, "notifications");
  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    where("isRead", "==", false),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
```

**필수 인덱스**:
```json
{
  "collectionGroup": "notifications",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "isRead", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

### 2-6. 대회 순위 조회

```typescript
// ✅ 최적화: tournamentId + points 인덱스 활용
export async function getTournamentStandings(
  tournamentId: string
) {
  const standingsRef = collection(
    db,
    "tournaments",
    tournamentId,
    "standings"
  );
  const q = query(
    standingsRef,
    orderBy("points", "desc"),
    orderBy("goalsFor", "desc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc, index) => ({
    id: doc.id,
    rank: index + 1,
    ...doc.data()
  }));
}
```

---

### 2-7. 선수 통계 조회 (대회별)

```typescript
// ✅ 최적화: tournamentId + goals 인덱스 활용
export async function getPlayerStatsByTournament(
  tournamentId: string,
  limitCount: number = 20
) {
  const playersRef = collection(db, "players");
  
  // 모든 선수 조회 후 통계 집계
  // 또는 별도 통계 컬렉션 사용
  const statsRef = collection(db, "player_stats");
  const q = query(
    statsRef,
    where("tournamentId", "==", tournamentId),
    orderBy("goals", "desc"),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
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
      "collectionGroup": "activities",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teamId", "order": "ASCENDING" },
        { "fieldPath": "visibility", "order": "ASCENDING" },
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
  // ✅ 비정규화: 소유자 정보 중복 저장
  ownerUid: string;
  owners: string[]; // 빠른 권한 체크용
  
  // ✅ 비정규화: 집계 통계 포함
  stats: {
    totalMembers: number;
    totalMatches: number;
    wins: number;
    losses: number;
  };
  
  // ✅ 비정규화: 마지막 활동 시간
  lastActivityAt: Timestamp;
}
```

### 4-2. 경기 데이터 비정규화

```typescript
// matches/{matchId}
{
  // ✅ 비정규화: 팀 이름 포함
  homeTeamName: string;
  awayTeamName: string;
  
  // ✅ 비정규화: 점수 포함
  homeScore: number;
  awayScore: number;
  
  // ✅ 비정규화: 상태 포함
  status: "scheduled" | "live" | "completed";
}
```

### 4-3. 활동 피드 비정규화

```typescript
// activities/{activityId}
{
  // ✅ 비정규화: 작성자 정보 포함
  authorId: string;
  authorName: string;
  authorPhotoUrl?: string;
  
  // ✅ 비정규화: 팀 정보 포함
  teamId?: string;
  teamName?: string;
  
  // ✅ 비정규화: 카운터 포함
  likeCount: number;
  commentCount: number;
}
```

---

## 5️⃣ 실제 쿼리 코드

### 5-1. React Query 훅

```typescript
// src/hooks/useTeams.ts
import { useQuery } from "@tanstack/react-query";
import { getTeamsByRegionAndSport } from "@/services/teamService";

export function useTeams(region?: string, sportType?: string) {
  return useQuery({
    queryKey: ["teams", region, sportType],
    queryFn: () => getTeamsByRegionAndSport(region!, sportType!),
    enabled: !!region && !!sportType,
    staleTime: 5 * 60 * 1000, // 5분
    cacheTime: 30 * 60 * 1000, // 30분
  });
}
```

### 5-2. 실시간 쿼리 훅

```typescript
// src/hooks/useTeamSchedules.ts
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useTeamSchedules(teamId: string) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!teamId) return;
    
    const schedulesRef = collection(db, "teamSchedules");
    const q = query(
      schedulesRef,
      where("teamId", "==", teamId),
      orderBy("dateTime", "asc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSchedules(data);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [teamId]);
  
  return { schedules, loading };
}
```

---

## 6️⃣ 쿼리 성능 팁

### 6-1. 읽기 최소화

1. **필요한 필드만 조회**: `select()` 사용 (제한적)
2. **페이지네이션**: `limit()` + `startAfter()` 사용
3. **캐싱**: React Query 활용
4. **서브컬렉션 활용**: 관련 데이터 그룹화

### 6-2. 쓰기 최소화

1. **배치 쓰기**: `batch()` 사용
2. **트랜잭션**: 일관성 보장
3. **Cloud Functions**: 집계 데이터 자동 업데이트

### 6-3. 쿼리 최적화

1. **인덱스 활용**: 모든 쿼리는 인덱스 사용
2. **필터 순서**: 가장 선택적인 필터 먼저
3. **범위 쿼리 최소화**: `in` 쿼리 제한 (최대 10개)
4. **서브컬렉션 활용**: 관련 데이터 그룹화

---

**작성일**: 2024년  
**상태**: ✅ 쿼리 최적화 가이드 완료

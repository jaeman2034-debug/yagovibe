# 🔥 YAGO VIBE SPORTS - Firestore 인덱스 + 쿼리 최적 구조

> **작성일**: 2024년  
> **목적**: 실제 개발에 바로 쓰는 Firestore 인덱스 및 쿼리 최적화 가이드

---

## 📋 필수 복합 인덱스

### 1. Teams Activities

```javascript
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "activities",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**사용 쿼리**:
```typescript
query(
  collection(db, "teams", teamId, "activities"),
  orderBy("createdAt", "desc"),
  limit(20)
)
```

---

### 2. Matches by Status and Date

```javascript
{
  "indexes": [
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**사용 쿼리**:
```typescript
query(
  collection(db, "matches"),
  where("status", "==", "completed"),
  orderBy("date", "desc"),
  limit(20)
)
```

---

### 3. Matches by League

```javascript
{
  "indexes": [
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "leagueId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**사용 쿼리**:
```typescript
query(
  collection(db, "matches"),
  where("leagueId", "==", leagueId),
  where("status", "==", "scheduled"),
  orderBy("date", "asc")
)
```

---

### 4. Matches by Tournament

```javascript
{
  "indexes": [
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tournamentId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    }
  ]
}
```

**사용 쿼리**:
```typescript
query(
  collection(db, "matches"),
  where("tournamentId", "==", tournamentId),
  where("status", "==", "scheduled"),
  orderBy("date", "asc")
)
```

---

### 5. Team Rankings

```javascript
{
  "indexes": [
    {
      "collectionGroup": "teams",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "points", "order": "DESCENDING" },
        { "fieldPath": "goalDifference", "order": "DESCENDING" },
        { "fieldPath": "goalsFor", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**사용 쿼리**:
```typescript
query(
  collection(db, "rankings", seasonId, "teams"),
  orderBy("points", "desc"),
  orderBy("goalDifference", "desc"),
  orderBy("goalsFor", "desc")
)
```

---

### 6. Player Rankings (Goals)

```javascript
{
  "indexes": [
    {
      "collectionGroup": "players",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "goals", "order": "DESCENDING" },
        { "fieldPath": "matches", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**사용 쿼리**:
```typescript
query(
  collection(db, "rankings", seasonId, "players", "goals"),
  orderBy("goals", "desc"),
  limit(10)
)
```

---

### 7. Players by Team

```javascript
{
  "indexes": [
    {
      "collectionGroup": "players",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teamId", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    }
  ]
}
```

**사용 쿼리**:
```typescript
query(
  collection(db, "players"),
  where("teamId", "==", teamId),
  orderBy("name", "asc")
)
```

---

### 8. Teams by Sport and Region

```javascript
{
  "indexes": [
    {
      "collectionGroup": "teams",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sportType", "order": "ASCENDING" },
        { "fieldPath": "region", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    }
  ]
}
```

**사용 쿼리**:
```typescript
query(
  collection(db, "teams"),
  where("sportType", "==", "soccer"),
  where("region", "==", "Seoul"),
  orderBy("name", "asc")
)
```

---

### 9. Chat Messages

```javascript
{
  "indexes": [
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**사용 쿼리**:
```typescript
query(
  collection(db, "chatRooms", roomId, "messages"),
  orderBy("createdAt", "desc"),
  limit(50)
)
```

---

### 10. Tournament Teams

```javascript
{
  "indexes": [
    {
      "collectionGroup": "teams",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "joinedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**사용 쿼리**:
```typescript
query(
  collection(db, "tournaments", tournamentId, "teams"),
  where("status", "==", "approved"),
  orderBy("joinedAt", "desc")
)
```

---

## 🚀 쿼리 최적화 패턴

### 1. 페이지네이션

```typescript
// ✅ 좋은 예: limit + startAfter
export async function getMatchesPaginated(
  lastDoc: DocumentSnapshot | null,
  limitCount: number = 20
): Promise<{ matches: Match[]; lastDoc: DocumentSnapshot | null }> {
  const matchesRef = collection(db, "matches");
  let q = query(
    matchesRef,
    where("status", "==", "completed"),
    orderBy("date", "desc"),
    limit(limitCount)
  );
  
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }
  
  const snapshot = await getDocs(q);
  const matches = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Match[];
  
  const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
  
  return { matches, lastDoc: newLastDoc };
}
```

---

### 2. 필요한 필드만 조회

```typescript
// ✅ 좋은 예: 필요한 필드만 조회
export async function getMatchSummary(matchId: string): Promise<MatchSummary | null> {
  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);
  
  if (!matchSnap.exists()) {
    return null;
  }
  
  const data = matchSnap.data();
  return {
    id: matchSnap.id,
    homeTeamName: data.homeTeamName,
    awayTeamName: data.awayTeamName,
    score: data.score,
    date: data.date,
    status: data.status,
  };
}
```

---

### 3. 서브컬렉션 활용

```typescript
// ✅ 좋은 예: 서브컬렉션으로 데이터 분리
export async function getTeamActivities(
  teamId: string,
  limitCount: number = 20
): Promise<Activity[]> {
  const activitiesRef = collection(db, "teams", teamId, "activities");
  const q = query(
    activitiesRef,
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Activity[];
}
```

---

### 4. 배치 읽기

```typescript
// ✅ 좋은 예: 여러 문서를 한 번에 읽기
export async function getMultipleTeams(teamIds: string[]): Promise<Team[]> {
  const teamRefs = teamIds.map(id => doc(db, "teams", id));
  const teamSnaps = await getDocs(query(collection(db, "teams"), where(documentId(), "in", teamIds)));
  
  return teamSnaps.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Team[];
}
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

---

### 2. 실시간 구독 최소화

```typescript
// ❌ 나쁜 예: 모든 경기에 실시간 구독
matches.forEach(match => {
  onSnapshot(doc(db, "matches", match.id), ...);
});

// ✅ 좋은 예: 필요한 경기만 실시간 구독
if (match.status === "live") {
  onSnapshot(doc(db, "matches", matchId), ...);
}
```

---

### 3. 인덱스 생성 순서

Firestore는 복합 인덱스를 자동으로 생성하지만, 명시적으로 정의하는 것이 좋습니다.

**firestore.indexes.json** 파일 생성:

```json
{
  "indexes": [
    {
      "collectionGroup": "activities",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "leagueId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## 📊 인덱스 배포

### Firebase CLI로 배포:

```bash
firebase deploy --only firestore:indexes
```

---

## ✅ 인덱스 체크리스트

필수 인덱스:
- [ ] Teams Activities (createdAt desc)
- [ ] Matches (status + date)
- [ ] Matches by League (leagueId + status + date)
- [ ] Matches by Tournament (tournamentId + status + date)
- [ ] Team Rankings (points + goalDifference + goalsFor)
- [ ] Player Rankings (goals desc)
- [ ] Players by Team (teamId + name)
- [ ] Teams by Sport/Region (sportType + region + name)
- [ ] Chat Messages (createdAt desc)
- [ ] Tournament Teams (status + joinedAt)

---

**작성일**: 2024년  
**상태**: ✅ Firestore 인덱스 + 쿼리 최적 구조 완료

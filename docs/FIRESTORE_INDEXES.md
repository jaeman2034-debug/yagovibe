# 🔥 Firestore Indexes (YAGO SPORTS)

## 📋 필수 인덱스 목록

Firebase Console → Firestore → Indexes에서 다음 인덱스를 추가하세요.

---

## 1. Recruits (팀원 모집)

### 인덱스 1: 상태 + 생성일
```
Collection: recruits
Fields:
  - status (Ascending)
  - createdAt (Descending)
Query Mode: Collection
```

**사용 쿼리**:
```typescript
query(
  collection(db, "recruits"),
  where("status", "==", "open"),
  orderBy("createdAt", "desc")
)
```

### 인덱스 2: 팀 ID + 상태
```
Collection: recruits
Fields:
  - teamId (Ascending)
  - status (Ascending)
  - createdAt (Descending)
Query Mode: Collection
```

**사용 쿼리**:
```typescript
query(
  collection(db, "recruits"),
  where("teamId", "==", teamId),
  where("status", "==", "open"),
  orderBy("createdAt", "desc")
)
```

---

## 2. Matches (경기 매칭)

### 인덱스 1: 상태 + 날짜 + 시간
```
Collection: matches
Fields:
  - status (Ascending)
  - date (Ascending)
  - time (Ascending)
Query Mode: Collection
```

**사용 쿼리**:
```typescript
query(
  collection(db, "matches"),
  where("status", "==", "open"),
  where("date", ">=", startOfDay),
  where("date", "<=", endOfDay),
  orderBy("date", "asc"),
  orderBy("time", "asc")
)
```

### 인덱스 2: 지역 + 상태
```
Collection: matches
Fields:
  - region (Ascending)
  - status (Ascending)
  - date (Ascending)
Query Mode: Collection
```

**사용 쿼리**:
```typescript
query(
  collection(db, "matches"),
  where("region", "==", region),
  where("status", "==", "open"),
  orderBy("date", "asc")
)
```

---

## 3. Guest Players (용병)

### 인덱스 1: 상태 + 날짜 + 시간
```
Collection: guest_players
Fields:
  - status (Ascending)
  - date (Ascending)
  - time (Ascending)
Query Mode: Collection
```

**사용 쿼리**:
```typescript
query(
  collection(db, "guest_players"),
  where("status", "==", "open"),
  where("date", ">=", startOfDay),
  where("date", "<=", endOfDay),
  orderBy("date", "asc"),
  orderBy("time", "asc")
)
```

### 인덱스 2: 지역 + 상태 + 날짜
```
Collection: guest_players
Fields:
  - region (Ascending)
  - status (Ascending)
  - date (Ascending)
Query Mode: Collection
```

**사용 쿼리**:
```typescript
query(
  collection(db, "guest_players"),
  where("region", "==", region),
  where("status", "==", "open"),
  orderBy("date", "asc")
)
```

---

## 4. Activities (Activity Feed)

### 인덱스 1: 공개성 + 생성일
```
Collection: activities
Fields:
  - visibility (Ascending)
  - createdAt (Descending)
Query Mode: Collection
```

**사용 쿼리**:
```typescript
query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  orderBy("createdAt", "desc")
)
```

### 인덱스 2: 타입 + 공개성 + 생성일
```
Collection: activities
Fields:
  - type (Ascending)
  - visibility (Ascending)
  - createdAt (Descending)
Query Mode: Collection
```

**사용 쿼리**:
```typescript
query(
  collection(db, "activities"),
  where("type", "in", ["market_created", "recruit_created", "match_created"]),
  where("visibility", "==", "public"),
  orderBy("createdAt", "desc")
)
```

---

## 5. Team Members (역인덱스)

### 인덱스 1: 사용자 ID + 상태
```
Collection: team_members
Fields:
  - userId (Ascending)
  - status (Ascending)
  - createdAt (Descending)
Query Mode: Collection
```

**사용 쿼리**:
```typescript
query(
  collection(db, "team_members"),
  where("userId", "==", userId),
  where("status", "==", "active"),
  orderBy("createdAt", "desc")
)
```

---

## 6. Applications (지원/신청)

### 인덱스 1: Recruit Applications - 모집 ID + 생성일
```
Collection: recruit_applications
Fields:
  - recruitId (Ascending)
  - createdAt (Descending)
Query Mode: Collection
```

### 인덱스 2: Match Requests - 매칭 ID + 생성일
```
Collection: match_requests
Fields:
  - matchId (Ascending)
  - createdAt (Descending)
Query Mode: Collection
```

### 인덱스 3: Guest Applications - 용병 ID + 생성일
```
Collection: guest_applications
Fields:
  - guestId (Ascending)
  - createdAt (Descending)
Query Mode: Collection
```

---

## 7. Notifications

### 인덱스 1: 사용자 ID + 읽음 상태 + 생성일
```
Collection: notifications
Fields:
  - userId (Ascending)
  - isRead (Ascending)
  - createdAt (Descending)
Query Mode: Collection
```

**사용 쿼리**:
```typescript
query(
  collection(db, "notifications"),
  where("userId", "==", userId),
  where("isRead", "==", false),
  orderBy("createdAt", "desc")
)
```

---

## 🚀 인덱스 생성 방법

### 방법 1: Firebase Console
1. Firebase Console → Firestore → Indexes
2. "Create Index" 클릭
3. 컬렉션 선택
4. 필드 추가 및 정렬 순서 설정
5. "Create" 클릭

### 방법 2: firestore.indexes.json
```json
{
  "indexes": [
    {
      "collectionGroup": "recruits",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## ⚠️ 주의사항

1. **인덱스 생성 시간**: 대용량 컬렉션은 인덱스 생성에 시간이 걸릴 수 있음
2. **인덱스 비용**: 복합 인덱스는 저장 공간을 사용
3. **자동 생성**: Firestore가 필요한 인덱스를 자동으로 제안 (에러 메시지 확인)

---

## ✅ 체크리스트

배포 전 다음 인덱스가 모두 생성되었는지 확인:

- [ ] Recruits: status + createdAt
- [ ] Recruits: teamId + status + createdAt
- [ ] Matches: status + date + time
- [ ] Matches: region + status + date
- [ ] Guest Players: status + date + time
- [ ] Guest Players: region + status + date
- [ ] Activities: visibility + createdAt
- [ ] Activities: type + visibility + createdAt
- [ ] Team Members: userId + status + createdAt
- [ ] Notifications: userId + isRead + createdAt

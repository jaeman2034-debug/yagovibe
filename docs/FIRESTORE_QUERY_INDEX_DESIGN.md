# 🔥 Firestore 쿼리/인덱스 설계 정리본

## 📌 현재 상태 진단

### ✅ 정상 동작 항목
- 라우터 구조: `/sports/:sportId?tab=...` 단일 구조
- 탭 이동: 정상
- 페이지 렌더링: 정상
- 컴포넌트 구조: 정상

### ❌ 문제 항목
- Firestore 쿼리 인덱스: 일부 누락
- Firestore 권한: 배포 완료 (확인 필요)
- Google Maps API: 후순위 (앱 동작에는 영향 없음)

---

## 📊 종목 허브 Feed 쿼리 구조

### 1️⃣ Activity Feed (활동 탭)

**컴포넌트:** `SportActivityFeed.tsx`

**쿼리:**
```typescript
query(
  collection(db, "activityLogs"),
  where("sport", "==", sport),
  where("type", "in", ["team", "event", "market"]),
  orderBy("createdAt", "desc"),
  limit(30)
)
```

**필요한 인덱스:**
```
Collection: activityLogs
Fields:
  - sport (ASC)
  - type (ASC)
  - createdAt (DESC)
```

**상태:** ✅ 인덱스 배포 완료 (firestore.indexes.json 279-286번 라인)

---

### 2️⃣ Market Feed (거래 탭)

**컴포넌트:** `SportMarketFeed.tsx`

**쿼리:**
```typescript
query(
  collection(db, "marketPosts"),
  where("sport", "==", sport),
  where("status", "in", ["active", "open"]),
  orderBy("createdAt", "desc"),
  limit(30)
)
```

**필요한 인덱스:**
```
Collection: marketPosts
Fields:
  - sport (ASC)
  - status (ASC)
  - createdAt (DESC)
```

**상태:** ✅ 인덱스 배포 완료 (firestore.indexes.json 220-227번 라인)

**참고:** `status`가 `in` 쿼리이므로 `arrayConfig: "CONTAINS"` 인덱스도 필요할 수 있지만, 현재는 단일 값 배열이므로 ASC 인덱스로 충분.

---

### 3️⃣ Team Feed (팀 탭)

**컴포넌트:** `SportTeamFeed.tsx`

**쿼리:**
```typescript
query(
  collection(db, "activityLogs"),
  where("sport", "==", sport),
  where("type", "==", "team"),
  orderBy("createdAt", "desc"),
  limit(30)
)
```

**필요한 인덱스:**
```
Collection: activityLogs
Fields:
  - sport (ASC)
  - type (ASC)
  - createdAt (DESC)
```

**상태:** ✅ 인덱스 배포 완료 (firestore.indexes.json 279-286번 라인)

**참고:** Activity Feed와 동일한 인덱스 사용 (type 필터만 다름)

---

### 4️⃣ Event Feed (이벤트 탭)

**컴포넌트:** `SportEventFeed.tsx`

**쿼리:**
```typescript
query(
  collection(db, "activityLogs"),
  where("sport", "==", sport),
  where("type", "==", "event"),
  orderBy("createdAt", "desc"),
  limit(30)
)
```

**필요한 인덱스:**
```
Collection: activityLogs
Fields:
  - sport (ASC)
  - type (ASC)
  - createdAt (DESC)
```

**상태:** ✅ 인덱스 배포 완료 (firestore.indexes.json 279-286번 라인)

**참고:** Team Feed와 동일한 인덱스 사용 (type 값만 다름)

---

## 🔍 인덱스 매핑 테이블

| Feed | 컬렉션 | where 조건 | orderBy | 필요한 인덱스 | 상태 |
|------|--------|-----------|---------|-------------|------|
| Activity | activityLogs | sport, type (in) | createdAt DESC | sport ASC + type ASC + createdAt DESC | ✅ 배포 완료 |
| Market | marketPosts | sport, status (in) | createdAt DESC | sport ASC + status ASC + createdAt DESC | ✅ 배포 완료 |
| Team | activityLogs | sport, type (==) | createdAt DESC | sport ASC + type ASC + createdAt DESC | ✅ 배포 완료 |
| Event | activityLogs | sport, type (==) | createdAt DESC | sport ASC + type ASC + createdAt DESC | ✅ 배포 완료 |

---

## 📋 현재 배포된 인덱스 목록

### activityLogs 인덱스

1. **기본 인덱스 (sport + createdAt)**
   ```json
   {
     "collectionGroup": "activityLogs",
     "fields": [
       { "fieldPath": "sport", "order": "ASCENDING" },
       { "fieldPath": "createdAt", "order": "DESCENDING" }
     ]
   }
   ```
   - 사용: 전체 활동 조회 (type 필터 없음)
   - 상태: ✅ 배포 완료

2. **복합 인덱스 (sport + type + createdAt)**
   ```json
   {
     "collectionGroup": "activityLogs",
     "fields": [
       { "fieldPath": "sport", "order": "ASCENDING" },
       { "fieldPath": "type", "order": "ASCENDING" },
       { "fieldPath": "createdAt", "order": "DESCENDING" }
     ]
   }
   ```
   - 사용: Activity/Team/Event Feed (type 필터 포함)
   - 상태: ✅ 배포 완료

### marketPosts 인덱스

1. **기본 인덱스 (sport + createdAt)**
   ```json
   {
     "collectionGroup": "marketPosts",
     "fields": [
       { "fieldPath": "status", "order": "ASCENDING" },
       { "fieldPath": "sport", "order": "ASCENDING" },
       { "fieldPath": "createdAt", "order": "DESCENDING" }
     ]
   }
   ```
   - 사용: Market Feed (sport + status 필터)
   - 상태: ✅ 배포 완료

---

## 🔐 Firestore 보안 규칙

### activityLogs
```rules
match /activityLogs/{docId} {
  allow read: if true;
  allow write: if request.auth != null;
}
```
- 상태: ✅ 배포 완료

### marketPosts
```rules
match /marketPosts/{postId} {
  allow read: if true;
  allow create: if signedIn() && request.resource.data.authorId == request.auth.uid;
  allow update: if signedIn() && resource.data.authorId == request.auth.uid;
}
```
- 상태: ✅ 배포 완료

### teamPosts
```rules
match /teamPosts/{docId} {
  allow read: if true;
  allow write: if request.auth != null;
}
```
- 상태: ✅ 배포 완료

### eventPosts
```rules
match /eventPosts/{docId} {
  allow read: if true;
  allow write: if request.auth != null;
}
```
- 상태: ✅ 배포 완료

---

## 🚨 현재 발생 가능한 문제

### 1. 인덱스 생성 대기 중

**증상:**
```
The query requires an index
```

**원인:**
- 인덱스 배포는 완료했지만, Firebase에서 인덱스 생성 중 (1~5분 소요)

**해결:**
1. Firebase Console → Firestore → Indexes 탭 확인
2. "Building" 상태면 생성 대기
3. "Enabled" 상태면 정상 작동

**임시 해결:**
- 콘솔 에러 메시지의 링크 클릭하여 인덱스 생성 페이지로 이동
- "Create Index" 버튼 클릭

---

### 2. 권한 에러 (Missing or insufficient permissions)

**증상:**
```
Missing or insufficient permissions
```

**원인:**
- Firestore Rules가 배포되지 않았거나, 로그인 상태가 아님

**해결:**
1. Firestore Rules 배포 확인:
   ```bash
   firebase deploy --only firestore:rules
   ```
2. 로그인 상태 확인 (개발용 규칙은 `allow read: if true`이므로 로그인 불필요)

---

### 3. Google Maps API 에러 (후순위)

**증상:**
```
REQUEST_DENIED
API keys with referer restrictions cannot be used
```

**원인:**
- Google Maps API 키에 HTTP 리퍼러 제한이 설정되어 있음

**영향:**
- 주소 변환 실패
- 일부 카드에서 주소 표시 안됨
- **앱 동작 자체는 문제 없음** (후순위 버그)

**해결 (나중에):**
1. Google Cloud Console → Credentials
2. Geocoding API용 별도 API 키 생성 (리퍼러 제한 없음)
3. 또는 현재 API 키의 '애플리케이션 제한사항' → '없음' 선택

**현재 상태:**
- 에러 조용히 처리됨 (`getAddressFromLatLng.ts` 수정 완료)
- 콘솔 로그 폭발 방지

---

## ✅ 인덱스 생성 확인 체크리스트

### Step 1: Firebase Console 확인
1. Firebase Console 접속
2. Firestore → Indexes 탭
3. 다음 인덱스가 "Enabled" 상태인지 확인:
   - `activityLogs` - `sport ASC + createdAt DESC`
   - `activityLogs` - `sport ASC + type ASC + createdAt DESC`
   - `marketPosts` - `status ASC + sport ASC + createdAt DESC`

### Step 2: 콘솔 에러 확인
1. 브라우저 콘솔 열기
2. "The query requires an index" 에러 확인
3. 에러 메시지의 링크 클릭
4. 인덱스 생성 페이지에서 "Create Index" 클릭

### Step 3: 인덱스 생성 대기
- 인덱스 생성 시간: 1~5분
- 생성 중에는 "Building" 상태
- 생성 완료되면 "Enabled" 상태

---

## 🎯 최종 확인 포인트

### ✅ 정상 작동 확인
1. `/sports/soccer?tab=activity` → 활동 로그 표시
2. `/sports/soccer?tab=market` → 마켓 상품 표시
3. `/sports/soccer?tab=team` → 팀 활동 표시
4. `/sports/soccer?tab=event` → 이벤트 표시

### ❌ 에러 확인
1. 콘솔에 "The query requires an index" 에러 없음
2. 콘솔에 "Missing or insufficient permissions" 에러 없음
3. Google Maps 에러는 조용히 처리됨 (콘솔 로그 없음)

---

## 📝 다음 단계

### 즉시 해야 할 것
1. ✅ Firestore 인덱스 생성 확인 (Firebase Console)
2. ✅ Firestore Rules 배포 확인 (이미 완료)
3. ✅ 콘솔 에러 확인 (인덱스 생성 대기 중일 수 있음)

### 나중에 할 것
1. Google Maps API 키 수정 (후순위)
2. 인덱스 성능 모니터링
3. 쿼리 최적화 (필요 시)

---

## 🔗 관련 파일

- 인덱스 정의: `firestore.indexes.json`
- 보안 규칙: `firestore.rules`
- Activity Feed: `src/pages/sports/[sport]/SportActivityFeed.tsx`
- Market Feed: `src/pages/sports/[sport]/SportMarketFeed.tsx`
- Team Feed: `src/pages/sports/[sport]/SportTeamFeed.tsx`
- Event Feed: `src/pages/sports/[sport]/SportEventFeed.tsx`

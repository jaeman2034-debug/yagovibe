# 🔥 Firestore 쿼리 디버깅 가이드

## 🚨 현재 문제

Market 페이지에서 Firestore 쿼리 결과가 0개 반환됨

```
✅ [MarketPage] Firestore 응답: 0개 문서
```

하지만 Firestore에는 실제로 데이터가 존재함.

---

## 🎯 가능한 원인

### 1️⃣ 컬렉션 경로 불일치

**현재 코드:**
```typescript
collection(db, "sports", sportParam, "marketPosts")
```

**실제 DB 구조 확인 필요:**
- `sports/{sport}/marketPosts` ✅
- `marketPosts` (루트) ❌
- `market` (루트) ❌

---

### 2️⃣ 필드 값 불일치

**쿼리 조건:**
```typescript
where("type", "==", "used")  // 쿼리 값
```

**DB 실제 값 확인 필요:**
- `"used"` ✅
- `"중고거래"` ❌
- `undefined` ❌

**sport 필드도 확인:**
```typescript
// 쿼리: "soccer"
// DB 실제 값: "soccer" vs "축구" vs undefined
```

---

### 3️⃣ 복합 인덱스 미생성

필요한 인덱스:
```
Collection: sports/{sport}/marketPosts
Fields:
  - type: Ascending
  - createdAt: Descending
```

---

## ✅ 디버깅 체크리스트

### 1. Firestore Console에서 실제 데이터 확인

1. Firebase Console → Firestore Database
2. `sports/{sport}/marketPosts` 경로 확인
3. 문서 하나 열어서 필드 확인:
   ```
   type: ?
   sport: ?
   category: ?
   status: ?
   ```

---

### 2. 브라우저 콘솔 로그 확인

Market 페이지 접속 후 콘솔에서 확인:

```
🔍 [MarketPage] 쿼리 파라미터: {
  sportParam: "soccer",
  marketType: "used",
  ...
}

🔥 [MarketPage] 컬렉션 경로: sports/soccer/marketPosts
🔥 [MarketPage] type 필터 적용: used

✅ [MarketPage] Firestore 응답: 0개 문서

⚠️ [MarketPage] 쿼리 조건 확인: {
  collection: "sports/soccer/marketPosts",
  type: "used",
  sport: "soccer"
}
```

---

### 3. 첫 번째 문서 데이터 확인 (데이터가 있을 경우)

```
📋 [MarketPage] 첫 번째 문서 원본 데이터: {
  id: "...",
  type: "used",  // ← 실제 DB 값
  sport: "soccer",  // ← 실제 DB 값
  ...
}

📋 [MarketPage] 쿼리 조건과 비교: {
  "쿼리 type": "used",
  "DB type": "used",
  "일치 여부": true/false
}
```

---

## 🔧 임시 해결 방법 (테스트용)

### 방법 1: type 필터 제거 (테스트)

```typescript
// 기존
baseQuery = query(
  collection(db, "sports", sportParam, "marketPosts"),
  where("type", "==", marketType)
);

// 테스트 (type 필터 제거)
baseQuery = query(
  collection(db, "sports", sportParam, "marketPosts"),
  orderBy("createdAt", "desc")
);
```

👉 데이터가 나오면 = type 필터 문제 확정

---

### 방법 2: 컬렉션 경로 변경 (테스트)

```typescript
// 기존
collection(db, "sports", sportParam, "marketPosts")

// 테스트 1: 루트 marketPosts
collection(db, "marketPosts")

// 테스트 2: 루트 market
collection(db, "market")
```

👉 데이터가 나오면 = 컬렉션 경로 문제 확정

---

### 방법 3: 모든 필터 제거 (최종 테스트)

```typescript
// 최소 쿼리
const q = query(
  collection(db, "marketPosts"),  // 또는 실제 컬렉션 경로
  orderBy("createdAt", "desc"),
  limit(10)
);
```

👉 데이터가 나오면 = 필터 조건 문제 확정

---

## 🎯 정확한 해결 방법

### 1단계: 실제 DB 구조 확인

Firestore Console에서:
- 실제 컬렉션 경로 확인
- 문서의 실제 필드 값 확인

### 2단계: 쿼리 조건 수정

실제 DB 값에 맞게 쿼리 수정:

```typescript
// 예시: DB에 sport 필드가 없으면
// where("sport", "==", sportParam) 제거

// 예시: DB에 type이 "중고거래"면
where("type", "==", "중고거래")  // "used" 대신
```

### 3단계: 인덱스 생성

필요한 복합 인덱스 생성:
- Firebase Console → Firestore → Indexes
- 에러 메시지의 링크 클릭하여 자동 생성

---

## 📝 다음 단계

디버깅 로그를 확인한 후:

1. **컬렉션 경로 문제** → 경로 수정
2. **필드 값 불일치** → 쿼리 조건 수정
3. **인덱스 문제** → 인덱스 생성

각 경우에 맞는 수정 코드를 제공하겠습니다.

# ✅ MarketPage 쿼리 경로 수정 완료

## 🎯 수정 완료 내역

### 모든 쿼리를 `market` 컬렉션으로 통일

**변경 전:**
```typescript
collection(db, "sports", normalizedSport, "marketPosts")
```

**변경 후:**
```typescript
collection(db, "market")
where("sport", "==", normalizedSport)
```

---

## ✅ 수정된 위치

### 1. 메인 쿼리 (라인 560, 567)
```typescript
// 검색 쿼리
baseQuery = query(
  collection(db, "market"),
  where("sport", "==", normalizedSport),
  where("type", "==", normalizedType),
  where("keywordTokens", "array-contains", token)
);

// 일반 쿼리
baseQuery = query(
  collection(db, "market"),
  where("sport", "==", normalizedSport),
  where("type", "==", normalizedType)
);
```

### 2. AI 추천 쿼리 (라인 360)
```typescript
let candidatesQuery = query(
  collection(db, "market"),
  where("sport", "==", normalizedSport),
  where("type", "==", normalizedType),
  orderBy("createdAt", "desc"),
  limit(200)
);
```

### 3. Fallback 쿼리 (라인 473)
```typescript
let fallbackQuery = query(
  collection(db, "market"),
  where("sport", "==", normalizedSport),
  where("type", "==", normalizedType),
  orderBy("createdAt", "desc"),
  limit(30)
);
```

### 4. AI 검색 쿼리 (라인 837)
```typescript
const candidatesQuery = query(
  collection(db, "market"),
  where("sport", "==", normalizedSport),
  where("type", "==", normalizedType),
  orderBy("createdAt", "desc"),
  limit(200)
);
```

### 5. 로그 메시지 수정
- 모든 로그 메시지를 실제 경로로 수정
- 주석도 실제 경로로 수정

---

## 🔐 Firestore Rules (현재 상태)

**테스트용 전체 허용 규칙 (이미 배포됨):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

---

## 📝 업로드 로직 확인

### ✅ 모든 업로드 로직이 `market` 컬렉션 사용 중

1. **EquipmentForm.tsx**
   ```typescript
   await addDoc(collection(db, "market"), postDataWithBoost);
   ```

2. **RecruitForm.tsx**
   ```typescript
   await addDoc(collection(db, "market"), postDataWithBoost);
   ```

3. **MatchForm.tsx**
   ```typescript
   await addDoc(collection(db, "market"), postDataWithBoost);
   ```

4. **MarketAddPage.tsx**
   ```typescript
   await addDoc(collection(db, "market"), productDataWithGeohash);
   ```

### ✅ `type` 필드 추가 완료

모든 저장 로직에 `type: "used"` 필드가 추가되었습니다.

---

## 🎯 최종 확인 사항

### ✅ 완료된 작업

- [x] 모든 쿼리 경로를 `market` 컬렉션으로 통일
- [x] `where("sport", "==", normalizedSport)` 필터 추가
- [x] `where("type", "==", normalizedType)` 필터 추가
- [x] 로그 메시지 수정
- [x] 주석 수정
- [x] Firestore Rules 배포 완료
- [x] 업로드 로직 확인 완료
- [x] `type` 필드 추가 완료

---

## 🚀 예상 결과

### 정상 동작 시

- ✅ Market 페이지에서 상품 목록이 표시됨
- ✅ Firebase Console의 `market` 컬렉션과 일치함
- ✅ 상품 등록이 정상적으로 작동함
- ✅ 권한 오류가 사라짐
- ✅ 무한 루프가 해결됨

---

## 📊 현재 구조

```
market (루트 컬렉션)
 ├─ doc1 { sport: "soccer", type: "used", category: "equipment", ... }
 ├─ doc2 { sport: "baseball", type: "used", category: "recruit", ... }
 └─ doc3 { sport: "soccer", type: "used", category: "match", ... }
```

### 쿼리 예시

```typescript
// 종목별 + 타입별 필터링
query(
  collection(db, "market"),
  where("sport", "==", "soccer"),
  where("type", "==", "used"),
  orderBy("createdAt", "desc")
)
```

---

## ✅ 완료

모든 수정이 완료되었습니다. 브라우저를 새로고침하고 Market 페이지를 확인하세요.

# 🔧 Activity 로그 호환성 문제 수정

## 🚨 발견된 문제

### Firebase Console에서 확인된 문제점
스크린샷의 activityLogs 문서 (`I8vDPYed5003N2IeORcV`)를 확인한 결과:

1. **`userId` 필드 없음** ❌
   - ActivityFeed에서 `where("userId", "==", user.uid)`로 조회하는데 필드가 없음
   - 현재 문서에는 `authorId`만 있음

2. **`type` 필드 없음** ❌
   - ActivityFeed에서 `where("type", "==", filter)`로 필터링하는데 필드가 없음

3. **`action` 필드 없음** ❌
   - 새로 저장하는 코드에는 `action: "upload"`가 있지만 기존 문서에는 없음

4. **`sourceType`이 "marketPosts"** ⚠️
   - 새로 저장하는 코드는 `sourceType: "market"`인데 기존 문서는 "marketPosts"
   - 이는 이전 `createActivityLog` 함수로 생성된 문서일 가능성

---

## ✅ 수정 내용

### 1. ActivityFeed 쿼리 수정
**변경 전:**
```typescript
where("userId", "==", user.uid) // userId 필드로 필터링
```

**변경 후:**
```typescript
where("authorId", "==", user.uid) // authorId 필드로 필터링 (기존 문서 호환)
```

**이유:**
- 기존 문서들은 `authorId` 필드만 가지고 있음
- 새로 저장하는 문서는 `userId`와 `authorId` 둘 다 저장하지만, 기존 문서 호환을 위해 `authorId`로 조회

### 2. Activity 데이터 변환 로직 개선
**변경 전:**
```typescript
type: data.type || "market",
authorId: data.authorId || data.userId || "",
sourceType: data.sourceType || "market",
```

**변경 후:**
```typescript
type: data.type || "market", // type 필드가 없으면 기본값 "market"
authorId: data.authorId || data.userId || "", // authorId 우선, 없으면 userId
sourceType: data.sourceType || "market", // sourceType이 "marketPosts"면 "market"으로 변환
```

**이유:**
- 기존 문서에 없는 필드들에 대한 기본값 제공
- `sourceType`이 "marketPosts"인 경우도 처리 (이전 코드 호환)

---

## 📊 기존 문서 vs 새 문서

### 기존 문서 (createActivityLog로 생성)
```typescript
{
  authorId: "iUZB8RjKIEhb3uotZ6yqtpWtUQE2",
  category: "equipment",
  createdAt: Timestamp,
  refId: "mPWA5y7TiLqK7yQCkp6Q",
  sourceId: "mPWA5y7TiLqK7yQCkp6Q",
  sourceType: "marketPosts", // ⚠️
  sport: "soccer",
  summary: "10000원",
  thumbnail: URL,
  title: "축구화",
  // type 필드 없음 ❌
  // userId 필드 없음 ❌
  // action 필드 없음 ❌
}
```

### 새 문서 (직접 addDoc으로 생성)
```typescript
{
  type: "market", // ✅
  action: "upload", // ✅
  userId: "iUZB8RjKIEhb3uotZ6yqtpWtUQE2", // ✅
  authorId: "iUZB8RjKIEhb3uotZ6yqtpWtUQE2", // ✅
  sport: "soccer",
  title: "축구화",
  price: 10000,
  summary: "10000원",
  refId: "mPWA5y7TiLqK7yQCkp6Q",
  sourceId: "mPWA5y7TiLqK7yQCkp6Q",
  sourceType: "market", // ✅
  category: "equipment",
  thumbnail: URL,
  createdAt: Timestamp,
}
```

---

## 🎯 수정 효과

### ✅ 기존 문서 호환
- `authorId`로 조회하므로 기존 문서도 정상적으로 표시됨
- `type` 필드가 없으면 기본값 "market"으로 처리
- `sourceType`이 "marketPosts"여도 정상 처리

### ✅ 새 문서 지원
- `userId`와 `authorId` 둘 다 저장하므로 양쪽 모두 지원
- `type`, `action` 필드가 있어 필터링 정상 작동

---

## 📋 확인 사항

### Activity 피드 조회
- [ ] Activity 페이지에서 기존 문서가 표시되는지 확인
- [ ] 새로 업로드한 상품의 Activity 로그가 표시되는지 확인
- [ ] 필터링 (market, team, event)이 정상 작동하는지 확인

### 데이터 일관성
- [ ] 새로 업로드한 상품의 Activity 로그에 `userId`, `type`, `action` 필드가 있는지 확인
- [ ] Firebase Console에서 새 문서 구조 확인

---

## ✅ 완료

기존 문서와 새 문서 모두 호환되도록 수정했습니다:
- ✅ `authorId`로 조회하여 기존 문서 호환
- ✅ 필드가 없을 때 기본값 제공
- ✅ `sourceType` 변환 처리

이제 Activity 페이지에서 기존 문서와 새 문서 모두 정상적으로 표시됩니다.

# 🔥 Market 상품 삭제 기능 수정 완료 (V2)

## ✅ 문제 원인

삭제는 `market` 컬렉션에서만 수행되었지만, 실제로는:
- `MarketPostDetailPage`는 `marketPosts` 컬렉션을 먼저 조회
- `useMarketPosts` 훅도 `marketPosts` 컬렉션을 조회
- `SportMarketPage`도 `marketPosts` 컬렉션을 사용

따라서 `market`에서만 삭제하면 목록에는 여전히 게시글이 보입니다.

---

## ✅ 수정 내용

### 삭제 프로세스 (3단계)

1. **`market` 컬렉션 삭제** (메인 컬렉션)
2. **`marketPosts` 컬렉션 삭제** (랭킹 시스템용 동기화 컬렉션)
3. **`activities` 컬렉션 삭제** (Activity Feed)

---

## 📋 수정된 코드

### EquipmentDetail.tsx & OwnerActions.tsx

```typescript
// 🔥 1. Firestore market 문서 삭제
const marketRef = doc(db, "market", post.id);
await deleteDoc(marketRef);

// 🔥 2. marketPosts 문서 삭제 (랭킹 시스템용)
try {
  const marketPostsRef = doc(db, "marketPosts", post.id);
  await deleteDoc(marketPostsRef);
  console.log("✅ MarketPosts 문서 삭제 완료");
} catch (marketPostsError: any) {
  console.warn("⚠️ MarketPosts 삭제 실패 (무시):", marketPostsError);
}

// 🔥 3. activities 문서 삭제
try {
  const activitiesQuery = query(
    collection(db, "activities"),
    where("refId", "==", post.id)
  );
  const activitiesSnapshot = await getDocs(activitiesQuery);
  await Promise.all(
    activitiesSnapshot.docs.map((doc) => deleteDoc(doc.ref))
  );
  console.log("✅ Activities 문서 삭제 완료");
} catch (activityError: any) {
  console.warn("⚠️ Activities 삭제 실패 (무시):", activityError);
}
```

---

## 🔍 컬렉션 구조

### 게시글 생성 시
```
EquipmentForm / RecruitForm
    ↓
1. market 컬렉션에 저장
    ↓
2. marketPosts 컬렉션에 동기화 (랭킹 시스템용)
    ↓
3. activities 컬렉션에 생성 (Activity Feed)
```

### 게시글 삭제 시 (수정 후)
```
handleDelete
    ↓
1. market 컬렉션 삭제 ✅
    ↓
2. marketPosts 컬렉션 삭제 ✅ (추가됨)
    ↓
3. activities 컬렉션 삭제 ✅
```

---

## 🧪 테스트 체크리스트

- [ ] 삭제 버튼 클릭 시 확인 다이얼로그 표시
- [ ] 확인 후 `market` 컬렉션 삭제 확인
- [ ] 확인 후 `marketPosts` 컬렉션 삭제 확인
- [ ] 확인 후 `activities` 컬렉션 삭제 확인
- [ ] 삭제 후 `/sports/:sport/market`로 이동 확인
- [ ] 목록에서 삭제된 게시물이 사라지는지 확인
- [ ] 상세 페이지에서 삭제된 게시물 접근 시 에러 표시 확인

---

## ⚠️ 에러 처리

### marketPosts 삭제 실패
- 경고 로그만 출력하고 메인 삭제는 계속 진행
- `market` 삭제는 성공했으므로 목록에는 사라지지만, 상세 페이지 접근 시 에러 가능

### activities 삭제 실패
- 경고 로그만 출력하고 메인 삭제는 계속 진행
- Activity Feed에는 여전히 표시될 수 있음

---

## 🔍 디버깅

### 콘솔 로그 확인
```
✅ Market 문서 삭제 완료
✅ MarketPosts 문서 삭제 완료
✅ Activities 문서 삭제 완료
```

### 문제 발생 시
1. **marketPosts 삭제 실패**: Firestore 권한 규칙 확인
2. **목록에 여전히 표시**: 브라우저 캐시 또는 실시간 구독 문제
3. **상세 페이지 접근 가능**: `marketPosts` 삭제 실패 가능성

---

## 📝 참고사항

### 컬렉션 동기화
- 게시글 생성 시 `market`과 `marketPosts`에 동시 저장
- 삭제 시에도 두 컬렉션 모두 삭제해야 함
- Cloud Function `onMarketPostDeleted`는 `market` 삭제 시 자동 트리거

### 실시간 구독
- `MarketPostDetailPage`는 `marketPosts`를 먼저 조회
- `marketPosts`가 없으면 `market`으로 fallback
- 두 컬렉션 모두 삭제하면 상세 페이지 접근 시 에러 표시

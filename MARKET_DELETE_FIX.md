# 🔥 Market 상품 삭제 기능 수정 완료

## ✅ 수정 내용

### 1. EquipmentDetail.tsx
- `updateDoc` (soft delete) → `deleteDoc` (실제 문서 삭제)로 변경
- `activities` 컬렉션에서 `refId === post.id`인 문서도 함께 삭제
- 삭제 후 `/sports/:sport/market`로 이동

### 2. OwnerActions.tsx
- `updateDoc` (soft delete) → `deleteDoc` (실제 문서 삭제)로 변경
- `activities` 컬렉션에서 `refId === post.id`인 문서도 함께 삭제
- 삭제 후 `/sports/:sport/market`로 이동 (레거시 `/app/market` 경로 수정)

---

## 📋 삭제 프로세스

### 1. Firestore market 문서 삭제
```typescript
const postRef = doc(db, "market", post.id);
await deleteDoc(postRef);
```

### 2. activities 문서 삭제 (선택적)
```typescript
const activitiesQuery = query(
  collection(db, "activities"),
  where("refId", "==", post.id)
);
const activitiesSnapshot = await getDocs(activitiesQuery);

const deletePromises = activitiesSnapshot.docs.map((activityDoc) =>
  deleteDoc(activityDoc.ref)
);
await Promise.all(deletePromises);
```

### 3. 목록 페이지로 이동
```typescript
const targetSport = post.sport || sport || "soccer";
navigate(`/sports/${targetSport}/market`);
```

---

## 🔐 권한 체크

### 삭제 버튼 표시 조건
- `EquipmentDetail.tsx`: `isOwner` 변수로 판매자만 표시
- `OwnerActions.tsx`: 작성자 전용 컴포넌트 (이미 권한 체크됨)

### 권한 확인 로직
```typescript
const isOwner = useMemo(() => {
  if (!post || !user?.uid || !post.authorId) return false;
  return user.uid === post.authorId;
}, [post, user?.uid]);
```

---

## ⚠️ 에러 처리

### 권한 오류
```typescript
if (error.code === "permission-denied") {
  errorMessage = "권한이 없습니다. 로그인 상태를 확인해주세요.";
}
```

### 문서 없음 오류
```typescript
if (error.code === "not-found") {
  errorMessage = "게시글을 찾을 수 없습니다.";
}
```

---

## 🧪 테스트 체크리스트

- [ ] 판매자가 삭제 버튼을 볼 수 있는지 확인
- [ ] 구매자가 삭제 버튼을 볼 수 없는지 확인
- [ ] 삭제 버튼 클릭 시 확인 다이얼로그 표시 확인
- [ ] 확인 후 Firestore market 문서 삭제 확인
- [ ] activities 문서도 함께 삭제되는지 확인
- [ ] 삭제 후 `/sports/:sport/market`로 이동하는지 확인
- [ ] 목록에서 삭제된 게시물이 사라지는지 확인
- [ ] 권한 오류 시 적절한 에러 메시지 표시 확인

---

## 🔍 디버깅

### 콘솔 로그
- `✅ Market 문서 삭제 완료`
- `✅ Activities 문서 삭제 완료`
- `❌ 삭제 오류` (에러 발생 시)

### 확인 사항
1. **Firebase 권한 규칙**: `market` 컬렉션에 삭제 권한이 있는지 확인
2. **인증 상태**: 사용자가 로그인되어 있는지 확인
3. **작성자 일치**: `user.uid === post.authorId` 확인

---

## 🚀 Cloud Function 연동

### onMarketPostDeleted
- `market` 문서 삭제 시 자동 트리거
- 관련 데이터 정리 (marketJoins, notifications 등)
- 채팅방에 삭제 안내 메시지

**참고**: Cloud Function은 `deleteDoc` 실행 시 자동으로 트리거됩니다.

---

## 📝 참고사항

### Soft Delete vs Hard Delete
- **이전**: `updateDoc`으로 `status: "hidden"` 설정 (soft delete)
- **현재**: `deleteDoc`으로 실제 문서 삭제 (hard delete)

### Activities 삭제
- `activities` 삭제 실패해도 메인 삭제는 계속 진행
- 에러는 경고 로그로만 기록

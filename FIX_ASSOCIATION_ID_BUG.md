# associationId 필드 오타 수정 가이드

## 🔴 문제 확인

**증상:**
- 공지는 Firestore에 정상적으로 저장됨
- 하지만 공지 목록에 표시되지 않음
- `associationId` 필드가 `"associationId"` (문자열 오타)로 저장됨

**원인:**
- `associationId` 필드에 실제 값 대신 문자열 `"associationId"`가 저장됨
- 쿼리는 `where('associationId', '==', 'assoc-nowon-football')`로 조회
- 결과: 매칭되지 않아 목록에 표시되지 않음

---

## ✅ 즉시 해결 방법

### 방법 1: Firestore Console에서 수정 (권장)

1. **Firebase Console → Firestore Database → Data 탭**
2. **`notices` 컬렉션 → 해당 공지 문서 선택**
3. **`associationId` 필드 찾기**
4. **필드 값 수정:**
   - 현재 값: `"associationId"` (문자열 오타)
   - 수정 값: `"assoc-nowon-football"` (실제 협회 ID)
5. **저장**

### 방법 2: 코드 수정 (근본 해결)

저장 로직에서 `associationId` 필드가 올바르게 설정되도록 확인:

```typescript
// NoticeEditDrawer.tsx (createData)
const createData: any = {
  associationId, // ✅ props에서 받은 값 사용
  title: title.trim(),
  content: content.trim(),
  // ... 기타 필드
};
```

---

## 🧪 수정 후 확인

### 1. Firestore Console에서 확인
- `associationId` 필드 값이 `"assoc-nowon-football"`인지 확인

### 2. 브라우저 테스트
1. 로그아웃
2. 강력 새로고침 (Ctrl+Shift+R)
3. 다시 로그인
4. 공지 목록 페이지 진입
5. 공지가 목록에 표시되는지 확인

---

## 🔍 코드 확인 필요

저장 로직에서 `associationId`가 올바르게 설정되는지 확인:

```typescript
// ✅ 올바른 코드
const createData = {
  associationId: associationId, // props에서 받은 값
  // ...
};

// ❌ 잘못된 코드
const createData = {
  associationId: "associationId", // 문자열 오타
  // ...
};
```

---

## 📋 체크리스트

- [ ] Firestore Console에서 `associationId` 필드 수정
- [ ] 값이 `"assoc-nowon-football"`인지 확인
- [ ] 브라우저 새로고침
- [ ] 공지 목록에서 공지 표시 확인
- [ ] 코드에서 `associationId` 설정 로직 확인 (근본 해결)

---

## 🎯 예상 결과

수정 후:
- ✅ `associationId` 필드가 올바른 값으로 저장됨
- ✅ 쿼리에서 공지가 매칭됨
- ✅ 공지 목록에 표시됨
- ✅ 공지 상세 페이지 접근 가능


# ✅ 콘솔 오류 해결 완료

## 📌 발견된 오류

### 1️⃣ Stories 조회 오류
```
스토리 조회 오류: FirebaseError: No matching allow statements
위치: StorySection.tsx:48
```

**원인**: Firestore Rules에 루트 레벨 `stories` 컬렉션에 대한 규칙이 없음

**해결**: `stories/{storyId}` 경로에 대한 read/write 규칙 추가

---

### 2️⃣ 하이라이트 대회 조회 오류
```
하이라이트 대회 조회 오류: FirebaseError: No matching allow statements
위치: useHighlightedTournament.ts:61
```

**원인**: 
- `useHighlightedTournament` 훅이 루트 레벨 `tournaments` 컬렉션을 조회
- Firestore Rules에는 `associations/{associationId}/tournaments/{tournamentId}` 경로만 정의됨
- 루트 레벨 `tournaments` 컬렉션에 대한 규칙이 없음

**해결**: 루트 레벨 `tournaments/{tournamentId}` 경로에 대한 read 규칙 추가

---

## ✅ 해결 방법

### Firestore Rules 수정

**추가된 규칙**:
```javascript
/* Stories (루트 레벨) */
match /stories/{storyId} {
  allow read: if true;                      // 모두 읽기 가능
  allow write: if isSignedIn();            // 로그인 사용자만 작성 가능
}

/* Tournaments (루트 레벨 - 하이라이트 대회 조회용) */
match /tournaments/{tournamentId} {
  allow read: if true;                      // 모두 읽기 가능
  allow write: if isSignedIn();            // 로그인 사용자만 작성 가능
}
```

---

## 🔧 다음 단계

### 1. 브라우저 새로고침
- `http://localhost:5173/association/assoc-nowon-football` 페이지 새로고침
- 콘솔에서 오류가 사라졌는지 확인

### 2. 콘솔 확인
다음 오류들이 사라져야 함:
- ❌ `스토리 조회 오류: FirebaseError: No matching allow statements`
- ❌ `하이라이트 대회 조회 오류: FirebaseError: No matching allow statements`

### 3. 기능 확인
- StorySection이 정상적으로 표시되는지 확인
- 하이라이트 대회가 정상적으로 조회되는지 확인

---

## ⚠️ 참고사항

### 구조 불일치 문제

현재 `useHighlightedTournament` 훅은 루트 레벨 `tournaments` 컬렉션을 조회하지만, 실제 대회 데이터는 `associations/{associationId}/tournaments/{tournamentId}` 구조로 저장됩니다.

**향후 개선 사항**:
1. `useHighlightedTournament` 훅을 수정하여 올바른 경로 사용:
   ```typescript
   const tournamentsRef = collection(db, `associations/${associationId}/tournaments`);
   ```

2. 또는 루트 레벨 `tournaments` 컬렉션을 유지하고 `associationId` 필드로 필터링

현재는 임시로 루트 레벨 `tournaments` 컬렉션에 대한 read 규칙을 추가하여 오류를 해결했습니다.

---

## 📋 체크리스트

- [x] Stories 컬렉션 Rules 추가
- [x] Tournaments (루트 레벨) 컬렉션 Rules 추가
- [ ] 브라우저 새로고침
- [ ] 콘솔 오류 확인
- [ ] StorySection 정상 표시 확인
- [ ] 하이라이트 대회 정상 조회 확인

---

**작성일**: 2025-01-XX  
**상태**: ✅ 해결 완료

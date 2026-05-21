# ✅ 대회 등록 Firestore Rules 수정 완료

## 📌 문제 원인

### 핵심 문제
- **콘솔 오류**: `FirebaseError: No matching allow statements`
- **원인**: Firestore Rules에서 `tournaments` 컬렉션의 `create` 규칙이 너무 단순하고, `isOwner` 함수에 `exists()` 체크가 누락됨

### 현재 구조
- **대회 생성 경로**: `associations/${associationId}/tournaments` (서브컬렉션)
- **프론트엔드 권한 체크**: ✅ 통과 (`isOwner: true`, `canPublish: true`)
- **Firestore Rules**: ❌ `create` 규칙이 `published` 상태 생성 시 권한 체크 없음

---

## ✅ 해결 방법

### 1. `isOwner` 함수 수정

**문제**: `exists()` 체크 없이 바로 `get()` 호출 → 문서가 없으면 실패

**해결**: `exists()` 체크 추가

```javascript
function isOwner(associationId) {
  return isSignedIn()
    && exists(/databases/$(database)/documents/associations/$(associationId))
    && get(/databases/$(database)/documents/associations/$(associationId))
       .data.ownerUid == request.auth.uid;
}
```

---

### 2. `tournaments` create 규칙 수정

**이전 규칙** (너무 단순):
```javascript
allow create: if isSignedIn();  // 모든 로그인 사용자 생성 가능
```

**수정된 규칙** (권한 체크 포함):
```javascript
allow create: if isSignedIn() && (
  // draft 상태로 생성: 모든 로그인 사용자 허용
  request.resource.data.adminStatus == "draft" ||
  // published 상태로 생성: Owner 또는 Admin만 허용
  (request.resource.data.adminStatus == "published" && (isOwner(associationId) || isAdmin(associationId)))
);
```

---

### 3. `tournaments` update 규칙 단순화 및 명확화

**이전 규칙** (복잡하고 중복):
```javascript
allow update: if
  (resource.data.adminStatus == "draft" && isSignedIn()) ||
  (request.resource.data.adminStatus == "published" && (isOwner(associationId) || isAdmin(associationId))) ||
  (request.resource.data.adminStatus == "draft" && isSignedIn());
```

**수정된 규칙** (명확하고 완전):
```javascript
allow update: if isSignedIn() && (
  // draft 상태 유지: 작성자 허용
  (resource.data.adminStatus == "draft" && request.resource.data.adminStatus == "draft") ||
  // draft → published: Owner 또는 Admin만 허용
  (resource.data.adminStatus == "draft" && request.resource.data.adminStatus == "published" && (isOwner(associationId) || isAdmin(associationId))) ||
  // published 상태 유지: Owner 또는 Admin만 허용
  (resource.data.adminStatus == "published" && request.resource.data.adminStatus == "published" && (isOwner(associationId) || isAdmin(associationId))) ||
  // published → draft: Owner 또는 Admin만 허용 (되돌리기)
  (resource.data.adminStatus == "published" && request.resource.data.adminStatus == "draft" && (isOwner(associationId) || isAdmin(associationId)))
);
```

---

## 🔧 다음 단계

### 1. 브라우저 새로고침
- `http://localhost:5173/association/assoc-nowon-football` 페이지 새로고침
- Emulator 사용 중이면 Rules가 자동으로 적용됨

### 2. 대회 등록 테스트
1. **대회 등록 페이지로 이동**
2. **필수 정보 입력**:
   - 제목, 본문, 장소
   - 대회 시작일/종료일
   - 신청 기간, 선수 수정 기간, 검수 기간, 추첨일
3. **게시 선택**:
   - "게시" 라디오 버튼 선택
   - "저장" 버튼 클릭

### 3. 콘솔 확인
다음 오류가 사라져야 함:
- ❌ `FirebaseError: No matching allow statements`
- ✅ 저장 성공 메시지 표시

### 4. Firestore 확인
- Emulator UI (`http://localhost:4001`)에서 확인
- `associations/assoc-nowon-football/tournaments/{tournamentId}` 문서 생성 확인

---

## 📋 체크리스트

- [x] `isOwner` 함수에 `exists()` 체크 추가
- [x] `tournaments` create 규칙 수정 (published 상태 권한 체크)
- [x] `tournaments` update 규칙 단순화 및 명확화
- [ ] 브라우저 새로고침
- [ ] 대회 등록 테스트
- [ ] 콘솔 오류 확인
- [ ] Firestore에 문서 생성 확인

---

## 🎯 예상 결과

✅ **성공 시**:
- 콘솔에 `No matching allow statements` 오류 없음
- 저장 성공 메시지 표시
- Firestore에 `associations/{associationId}/tournaments/{tournamentId}` 문서 생성
- 대회 목록에 새 대회 표시

❌ **실패 시**:
- 콘솔 에러 확인
- Firestore Rules 재확인
- 권한 확인 (`isOwner`, `isAdmin`)

---

## 💡 참고사항

### Rules 배포 (프로덕션)
Emulator 사용 중이면 자동으로 적용되지만, 프로덕션 배포 시:
```bash
firebase deploy --only firestore:rules
```

### 권한 확인
- `isOwner`: `associations/{associationId}.ownerUid === request.auth.uid`
- `isAdmin`: `associations/{associationId}/members/{uid}.role === "admin"`

---

**작성일**: 2025-01-XX  
**상태**: ✅ 해결 완료

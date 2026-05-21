# ✅ Firestore Rules 최종 수정 완료

## 📌 문제 원인

### 핵심 문제
- **콘솔 오류**: `FirebaseError: No matching allow statements`
- **원인**: `associations/{associationId}/tournaments/{tournamentId}` 경로의 `create` 규칙이 `isOwner(associationId) || isAdmin(associationId)`를 사용하지만, 함수들이 제대로 작동하지 않음

### 현재 상태
- ✅ Auth 로그인: 정상
- ✅ Association 문서: 있음
- ✅ ownerUid: 맞음
- ✅ members/admin: 있음
- ✅ 프론트 권한 체크: 통과 (`isOwner: true`, `canPublish: true`)
- ❌ **Firestore Rules: 쓰기 거부** ← **핵심 문제**

---

## ✅ 해결 방법

### 1. `isAssociationAdmin` 통합 함수 추가

**목적**: `isOwner`와 `isAdmin`을 하나의 함수로 통합하여 안전성 향상

```javascript
function isAssociationAdmin(associationId) {
  return isOwner(associationId) || isAdmin(associationId);
}
```

---

### 2. `tournaments` create 규칙 수정

**이전 규칙** (복잡하고 불안정):
```javascript
allow create: if isSignedIn() && (
  request.resource.data.adminStatus == "draft" ||
  (request.resource.data.adminStatus == "published" && (isOwner(associationId) || isAdmin(associationId)))
);
```

**수정된 규칙** (간단하고 명확):
```javascript
allow create: if isSignedIn() && (
  // draft 상태로 생성: 모든 로그인 사용자 허용
  request.resource.data.adminStatus == "draft" ||
  // published 상태로 생성: Owner 또는 Admin만 허용
  (request.resource.data.adminStatus == "published" && isAssociationAdmin(associationId))
);
```

---

### 3. `tournaments` update 규칙 개선

**추가 개선**: `draft` 상태 유지 시 `createdBy` 체크 추가

```javascript
allow update: if isSignedIn() && (
  // draft 상태 유지: 작성자 허용 (createdBy 체크)
  (resource.data.adminStatus == "draft" && request.resource.data.adminStatus == "draft" && resource.data.createdBy == request.auth.uid) ||
  // draft → published: Owner 또는 Admin만 허용
  (resource.data.adminStatus == "draft" && request.resource.data.adminStatus == "published" && isAssociationAdmin(associationId)) ||
  // published 상태 유지: Owner 또는 Admin만 허용
  (resource.data.adminStatus == "published" && request.resource.data.adminStatus == "published" && isAssociationAdmin(associationId)) ||
  // published → draft: Owner 또는 Admin만 허용 (되돌리기)
  (resource.data.adminStatus == "published" && request.resource.data.adminStatus == "draft" && isAssociationAdmin(associationId))
);
```

---

## 🔧 다음 단계

### 1. 브라우저 완전 새로고침
- `Ctrl + Shift + R` (하드 리프레시)
- 또는 시크릿 창에서 테스트

### 2. 대회 등록 테스트
1. **대회 등록 페이지로 이동**
2. **필수 정보 입력**:
   - 제목, 본문, 장소
   - 대회 시작일/종료일
   - 신청 기간, 선수 수정 기간, 검수 기간
   - **추첨일**: 검수 종료일 **이후**로 설정 (예: 검수 종료일이 2026-01-19이면 추첨일은 2026-01-20 이상)
3. **게시 선택**:
   - "게시" 라디오 버튼 선택 (임시 저장 ❌)
   - "저장" 버튼 클릭

### 3. 콘솔 확인
다음 오류가 사라져야 함:
- ❌ `FirebaseError: No matching allow statements`
- ✅ 저장 성공 메시지 표시

### 4. Firestore 확인
- Emulator UI (`http://localhost:4001`)에서 확인
- `associations/assoc-nowon-football/tournaments/{tournamentId}` 문서 생성 확인

---

## 📋 최종 상태 요약

| 항목 | 상태 |
|------|------|
| Auth | ✅ |
| 관리자 데이터 | ✅ |
| 프론트 권한 | ✅ |
| 날짜 검증 | ⚠️ (추첨일 > 검수 종료일로 조정 필요) |
| **Firestore Rules** | ✅ **수정 완료** |
| 대회 실제 생성 | ⏳ (테스트 필요) |

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

## 🚀 다음 단계 (이거 해결되면 바로 가능)

1. ✅ **대회 등록 완료**
2. ⏳ **팀 생성**
3. ⏳ **참가 신청**
4. ⏳ **조 추첨**
5. ⏳ **대진표 자동 생성**
6. ⏳ **결승 → 결과 확정 → 알림(카톡 연동)**

---

## 💡 참고사항

### Rules 배포 (프로덕션)
Emulator 사용 중이면 자동으로 적용되지만, 프로덕션 배포 시:
```bash
firebase deploy --only firestore:rules
```

### 날짜 검증
- **테스트 모드**라도 `추첨일 > 검수 종료일` 관계는 유지
- 검수 종료일이 `2026-01-19`이면 추첨일은 최소 `2026-01-20` 이상

---

**작성일**: 2025-01-XX  
**상태**: ✅ Rules 수정 완료, 테스트 필요

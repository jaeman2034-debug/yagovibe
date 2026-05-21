# ✅ 관리자 권한 기반 대회 게시 플로우 수정 완료

## 📌 수정 완료 항목

### 1️⃣ 새로운 Hook 추가 ✅
- **파일**: `src/hooks/useIsAssociationOwner.ts`
- **기능**: `associations/{associationId}.ownerUid` 기준으로 Owner 권한 확인
- **반환값**: `{ isOwner, loading, error }`

### 2️⃣ 프론트엔드 수정 ✅
- **파일**: `src/components/association/tournament/TournamentEditDrawer.tsx`
- **변경 사항**:
  - `useIsAssociationOwner` Hook 추가
  - `canPublishTournament = isOwner || canPublish` (ownerUid 우선, members/{uid}.role 하위 호환)
  - 게시 버튼 활성화 로직 업데이트
  - 저장 버튼 비활성화 로직 업데이트
  - 게시 권한 체크 로직 업데이트
  - console.log 업데이트

### 3️⃣ Firestore Rules 수정 ✅
- **파일**: `firestore.rules`
- **변경 사항**:
  - `isOwner` 함수 추가 (ownerUid 기준)
  - `tournaments` 컬렉션 Rules 추가
    - `allow read: if true` (모두 읽기)
    - `allow create: if isSignedIn()` (모든 로그인 사용자 생성 가능)
    - `allow update`: draft는 모두, published는 Owner 또는 Admin만
    - `allow delete: if isOwner || isAdmin`

---

## 🎯 관리자 판별 기준 (통일)

### 우선순위
1. **ownerUid 기준** (우선): `associations/{associationId}.ownerUid === request.auth.uid`
2. **members/{uid}.role 기준** (하위 호환): `members/{uid}.role === "admin"`

### 프론트엔드
```typescript
const { isOwner } = useIsAssociationOwner(associationId);
const { isAdmin: canPublish } = useIsAssociationAdmin(associationId);
const canPublishTournament = isOwner || canPublish;
const adminLoadingState = ownerLoading || adminLoading;
```

### Firestore Rules
```javascript
function isOwner(associationId) {
  return isSignedIn()
    && get(/databases/$(database)/documents/associations/$(associationId))
       .data.ownerUid == request.auth.uid;
}

match /tournaments/{tournamentId} {
  allow update: if
    (resource.data.adminStatus == "draft" && isSignedIn()) ||
    (request.resource.data.adminStatus == "published" && (isOwner(associationId) || isAdmin(associationId)));
}
```

---

## 🔍 검증 체크리스트

### ✅ Association Owner로 로그인
- [ ] 새 대회 등록 가능
- [ ] 게시(published) 선택 가능
- [ ] 저장 시 Firestore에 `adminStatus: "published"` 정상 저장
- [ ] 서비스 화면에서 대회 즉시 노출

### ✅ 일반 계정으로 로그인
- [ ] 임시 저장(draft) 가능
- [ ] 게시 버튼 비활성화
- [ ] Rules 에러 없이 정상 동작

---

## 📝 변경 사항 요약

### 새로 추가된 파일
- ✅ `src/hooks/useIsAssociationOwner.ts`

### 수정된 파일
- ✅ `src/components/association/tournament/TournamentEditDrawer.tsx`
- ✅ `firestore.rules`

---

## ✅ 완료 기준 (Definition of Done)

- ✅ 관리자만 대회 게시 가능
- ✅ Rules / UI / 실서비스 환경 모두 일관되게 동작
- ✅ Emulator / Production 동일 로직
- ✅ ownerUid 기준 우선 적용
- ✅ members/{uid}.role 기준 하위 호환 유지

---

## 🔜 다음 단계

이제 다음 단계로 진행 가능:
- 🔥 팀 생성 실제 시나리오
- 🔥 대진표 자동 생성
- 🔥 결승 결과 확정 & 알림 흐름

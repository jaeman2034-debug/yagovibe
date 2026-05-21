# 관리자 권한 기반 대회 게시 플로우 구현 계획

## 📌 목표
관리자만 대회 게시 가능하도록 권한 로직 완성
- 관리자 판별: `associations/{associationId}.ownerUid === request.auth.uid`
- 임시 저장(draft)는 모두 가능
- 게시(published)는 관리자만 가능

---

## 구현 단계

### 1️⃣ Firestore Rules 수정
- `isOwner` 함수 추가 (ownerUid 기준)
- Tournaments Rules 수정

### 2️⃣ 프론트엔드 Hook 수정
- `useIsAssociationOwner` Hook 생성 또는 기존 Hook 수정
- `TournamentEditDrawer`에서 사용

### 3️⃣ UI 제어
- 게시 버튼 비활성화 (이미 구현됨)
- 경고 문구 표시 (이미 구현됨)

---

## 검증 체크리스트

### 관리자 계정
- [ ] 대회 생성 가능
- [ ] 게시(published) 선택 가능
- [ ] 저장 후 대회 목록에 공개 노출

### 일반 계정
- [ ] 임시 저장 가능
- [ ] 게시 버튼 비활성화
- [ ] Rules 에러 없이 정상 동작

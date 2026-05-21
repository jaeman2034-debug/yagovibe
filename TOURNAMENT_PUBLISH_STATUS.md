# 관리자 권한 기반 대회 게시 플로우 - 현재 상태 및 구현 계획

## 📌 현재 상태

### 구현 완료
- ✅ 대회 생성 UI 정상 동작
- ✅ Firestore / Hosting 배포 완료
- ✅ 게시(published) 버튼이 관리자 권한 없으면 비활성화 (의도된 설계)
- ✅ UI에서 관리자 권한 체크 로직 (`useIsAssociationAdmin`)

### 확인 필요
- ⚠️ 현재 로그인 유저는 관리자(admin)로 인식되지 않음
- ⚠️ Firestore Rules에 `tournaments` 컬렉션 Rules 없음
- ⚠️ 프론트엔드에서 `members/{uid}.role` 기준 사용 중 (사용자 요청: `ownerUid` 기준)

---

## 🎯 목표

관리자만 대회 게시 가능하도록 권한 로직 완성
- 관리자 판별: `associations/{associationId}.ownerUid === request.auth.uid`
- 임시 저장 → 게시 전환 플로우 검증
- 실서비스 기준으로 동작

---

## 📝 구현 계획

### 1️⃣ Firestore Rules 수정
- `isOwner` 함수 추가 (ownerUid 기준)
- `tournaments` 컬렉션 Rules 추가
  - draft는 모든 로그인 사용자
  - published는 관리자만

### 2️⃣ 프론트엔드 Hook 추가
- `useIsAssociationOwner` Hook 생성 (ownerUid 기준)
- `TournamentEditDrawer`에서 사용

### 3️⃣ 검증
- 관리자 계정: 게시 가능
- 일반 계정: 임시 저장만 가능

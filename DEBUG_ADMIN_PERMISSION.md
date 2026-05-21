# 🔍 관리자 권한 토글 활성화 안 되는 원인 진단 가이드

## 📌 현재 상태
- "게시" 라디오 버튼이 비활성화됨
- "⚠️ 관리자 권한이 필요합니다." 메시지 표시
- `canPublishTournament = false` 상태

---

## 🔍 원인 진단 체크리스트

### 1️⃣ Hook 동작 확인
- [ ] `useIsAssociationOwner` Hook이 실행되는지 확인
- [ ] 콘솔 로그에 `[useIsAssociationOwner] ownerUid 기준 확인` 로그가 있는지 확인
- [ ] `isOwner` 값이 `true`인지 확인

### 2️⃣ Association 문서 확인
- [ ] `associations/{associationId}` 문서에 `ownerUid` 필드가 있는지 확인
- [ ] `ownerUid` 값이 현재 로그인한 사용자 UID와 일치하는지 확인

### 3️⃣ 콘솔 로그 확인
- [ ] 브라우저 콘솔에서 `[useIsAssociationOwner]` 로그 확인
- [ ] `userUid`, `ownerUid`, `isOwner` 값 확인

---

## 🛠️ 디버깅 방법

### 콘솔 로그 확인
1. 브라우저 개발자 도구 열기 (F12)
2. Console 탭 확인
3. `[useIsAssociationOwner] ownerUid 기준 확인` 로그 찾기
4. 로그에서 다음 값 확인:
   - `userUid`: 현재 로그인한 사용자 UID
   - `ownerUid`: Association 문서의 ownerUid
   - `isOwner`: 권한 확인 결과

### Firestore 확인
1. Firebase Console → Firestore Database
2. `associations/{associationId}` 문서 확인
3. `ownerUid` 필드 존재 여부 확인
4. `ownerUid` 값과 현재 로그인한 사용자 UID 일치 여부 확인

---

## 🔧 예상 원인

### 원인 1: ownerUid 필드가 없음
- **증상**: Association 문서에 `ownerUid` 필드가 없음
- **해결**: Association 문서에 `ownerUid` 필드 추가

### 원인 2: ownerUid 값이 일치하지 않음
- **증상**: `ownerUid` 값이 현재 로그인한 사용자 UID와 다름
- **해결**: Association 문서의 `ownerUid` 값을 현재 사용자 UID로 업데이트

### 원인 3: Hook이 실행되지 않음
- **증상**: 콘솔에 `[useIsAssociationOwner]` 로그가 없음
- **해결**: Hook이 제대로 import되고 사용되는지 확인

---

## 📝 확인 절차

1. 브라우저 콘솔 확인
2. Firestore Console 확인
3. 로그 값 확인
4. 원인 파악
5. 수정 진행

# 🔍 관리자 권한 토글 활성화 안 되는 원인 진단 가이드

## 📌 현재 상태
- "게시" 라디오 버튼이 비활성화됨
- "⚠️ 관리자 권한이 필요합니다." 메시지 표시
- `canPublishTournament = false` 상태

---

## 🔍 원인 진단 체크리스트

### 1️⃣ Hook 동작 확인
- [ ] 브라우저 콘솔에 `[useIsAssociationOwner] ownerUid 기준 확인` 로그 확인
- [ ] 로그에서 다음 값 확인:
  - `userUid`: 현재 로그인한 사용자 UID
  - `ownerUid`: Association 문서의 ownerUid
  - `isOwner`: 권한 확인 결과 (true/false)

### 2️⃣ Association 문서 확인 (Firestore Console)
- [ ] `associations/{associationId}` 문서 열기
- [ ] `ownerUid` 필드 존재 여부 확인
- [ ] `ownerUid` 값 확인
- [ ] 현재 로그인한 사용자 UID와 일치하는지 확인

### 3️⃣ 프론트엔드 디버깅 로그 확인
- [ ] 브라우저 콘솔에 `[TournamentEditDrawer] 권한 확인 상태` 로그 확인
- [ ] 로그에서 다음 값 확인:
  - `isOwner`: true/false
  - `canPublish`: true/false
  - `canPublishTournament`: true/false
  - `ownerLoading`: true/false
  - `adminLoading`: true/false

---

## 🛠️ 예상 원인 및 해결 방법

### 원인 1: ownerUid 필드가 없음
**증상**:
- 콘솔 로그: `ownerUid: undefined` 또는 `null`
- `isOwner: false`

**해결**:
1. Firebase Console → Firestore Database
2. `associations/{associationId}` 문서 선택
3. `ownerUid` 필드 추가 (타입: string, 값: 현재 로그인한 사용자 UID)

### 원인 2: ownerUid 값이 일치하지 않음
**증상**:
- 콘솔 로그: `userUid: "abc123"`, `ownerUid: "xyz789"` (다름)
- `isOwner: false`

**해결**:
1. Firebase Console → Firestore Database
2. `associations/{associationId}` 문서 선택
3. `ownerUid` 필드 값을 현재 로그인한 사용자 UID로 업데이트

### 원인 3: Hook이 로딩 중
**증상**:
- 콘솔 로그: `ownerLoading: true`
- `canPublishTournament: false` (로딩 중)

**해결**:
- 잠시 대기 후 다시 확인 (로딩이 완료되면 자동으로 업데이트됨)

### 원인 4: Association 문서가 없음
**증상**:
- 콘솔 로그: `[useIsAssociationOwner] 협회 문서가 존재하지 않음`
- `isOwner: false`

**해결**:
1. Firebase Console → Firestore Database
2. `associations/{associationId}` 문서 생성
3. `ownerUid` 필드 추가

---

## 📝 확인 절차 (순서대로)

1. **브라우저 콘솔 확인**
   - F12 → Console 탭
   - `[useIsAssociationOwner]` 로그 찾기
   - `userUid`, `ownerUid`, `isOwner` 값 확인

2. **Firestore Console 확인**
   - Firebase Console → Firestore Database → Data
   - `associations/{associationId}` 문서 확인
   - `ownerUid` 필드 확인

3. **값 일치 확인**
   - 현재 로그인한 사용자 UID 확인
   - Association 문서의 `ownerUid` 값 확인
   - 두 값이 일치하는지 확인

4. **원인 파악 및 수정**
   - 위의 예상 원인 중 해당하는 것 확인
   - 해결 방법 적용

---

## 🔧 디버깅 코드 추가

`TournamentEditDrawer.tsx`에 디버깅 로그가 추가되었습니다:
- `[TournamentEditDrawer] 권한 확인 상태` 로그로 권한 상태 확인 가능

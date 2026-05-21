# 🔧 관리자 권한 / 대회 게시 문제 최종 해결 가이드

## 📌 현재 상황 (사용자 확인 완료)

### Firestore 구조
```
associations/{associationId}
  - name: "노원구축구협회"
  - ownerUid: (없거나 값이 일치하지 않음)
  - status: "active"
  - createdAt: Timestamp
```

### 로그인 유저 정보
- UID: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin`

### 콘솔 로그 상태
```javascript
{
  adminLoading: false,
  canPublish: false,
  canPublishTournament: false,
  isOwner: false,  // ❌ false가 문제
  associationId: "assoc-nowon-football",
  userUid: "qGq5XmuXRBsRZ0qJFE0yqtZY5Hin"
}
```

---

## 🔍 문제의 핵심 원인

1. **Association 문서에 `ownerUid` 필드가 없거나 값이 일치하지 않음**
   - `useIsAssociationOwner` Hook은 `association.ownerUid === user.uid`를 확인
   - 현재 `isOwner: false` → `ownerUid` 값이 `userUid`와 일치하지 않음

2. **권한 훅이 복잡하게 섞여 있음**
   - `useIsAssociationOwner` (ownerUid 기준)
   - `useIsAssociationAdmin` (members/{uid}.role 기준)
   - 두 개가 혼재되어 있음

---

## ✅ 해결 방법 (2가지 중 선택)

### 방법 A: ownerUid 기준으로 통일 (권장 ⭐)

**장점**: 단순하고 명확함  
**단점**: 없음

#### STEP 1: Association 문서에 ownerUid 설정
1. Firebase Console → Firestore Database → Data
2. `associations/assoc-nowon-football` 문서 선택
3. 필드 추가/수정:
   - 필드명: `ownerUid`
   - 타입: `string`
   - 값: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin`
4. 저장

#### STEP 2: 권한 훅 단순화 (이미 구현됨)
- `useIsAssociationOwner` Hook이 이미 `ownerUid` 기준으로 확인
- `TournamentEditDrawer.tsx`에서 `canPublishTournament = isOwner || canPublish` 사용
- `ownerUid`만 설정하면 `isOwner = true`가 됨

#### STEP 3: Firestore Rules 확인 (이미 구현됨)
- `isOwner` 함수가 이미 Rules에 추가되어 있음
- `tournaments` Rules에서 `isOwner(associationId)` 사용

---

### 방법 B: members 구조 추가 (하위 호환)

**장점**: 여러 관리자 지정 가능  
**단점**: 구조가 복잡함

#### STEP 1: members 서브컬렉션 생성
1. Firebase Console → Firestore Database → Data
2. `associations/assoc-nowon-football` → "Start collection" 클릭
3. 컬렉션 ID: `members`
4. 문서 ID: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` (현재 사용자 UID)
5. 필드 추가:
   - `role`: `string`, 값: `"owner"`
   - `createdAt`: `timestamp`, 값: `now`
6. 저장

#### STEP 2: 권한 훅 수정
- `useIsAssociationAdmin` Hook이 `members/{uid}.role === "admin"` 확인
- `role: "owner"`를 추가로 인식하도록 수정 필요
- 또는 `useIsAssociationOwner`를 `members/{uid}.role === "owner"` 기준으로 변경

---

## 🎯 권장 해결 방법: 방법 A (ownerUid만 설정)

**가장 간단하고 빠른 해결책:**

1. ✅ Association 문서에 `ownerUid` 필드만 추가
2. ✅ 기존 코드 그대로 사용 (수정 불필요)
3. ✅ 즉시 해결

---

## 📝 확인 절차

### 1. Association 문서 확인
- Firebase Console → Firestore Database
- `associations/assoc-nowon-football` 문서 확인
- `ownerUid` 필드 확인 (값: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin`)

### 2. 브라우저 콘솔 확인
- F12 → Console
- `[useIsAssociationOwner] ownerUid 기준 확인` 로그 확인
- `isOwner: true` 확인

### 3. UI 확인
- 대회 등록 페이지 열기
- "게시" 라디오 버튼 활성화 확인
- "⚠️ 관리자 권한이 필요합니다." 메시지 제거 확인

---

## 🔧 추가 작업 (선택사항)

### 날짜 검증 오류 해결
현재 "날짜 검증 오류가 있어 저장할 수 없습니다" 메시지가 표시됨

**임시 해결**:
- 테스트 모드에서 날짜 검증 bypass 로직 추가
- 또는 모든 날짜 필드를 입력

---

## ✅ 완료 기준

- [ ] `associations/assoc-nowon-football.ownerUid = "qGq5XmuXRBsRZ0qJFE0yqtZY5Hin"` 설정
- [ ] 콘솔 로그: `isOwner: true`
- [ ] "게시" 토글 활성화
- [ ] 대회 `published` 상태로 저장 성공
- [ ] 메인 화면에서 "진행 중 대회" 노출

---

## 💬 한 줄 요약

**"association 문서에 `ownerUid` 필드만 추가하면 즉시 해결됨. 기존 코드는 이미 `ownerUid` 기준으로 구현되어 있음."**

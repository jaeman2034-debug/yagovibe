# 🔧 관리자 권한 / 대회 게시 문제 최종 해결 가이드

## 📌 현재 상황 (사용자 확인 완료)

### Firestore 구조
```
associations/assoc-nowon-football
  - name: "노원구축구협회"
  - ownerUid: (없거나 값이 일치하지 않음) ❌
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
  isOwner: false,  // ❌ 이게 문제
  associationId: "assoc-nowon-football",
  userUid: "qGq5XmuXRBsRZ0qJFE0yqtZY5Hin"
}
```

---

## 🔍 문제의 핵심 원인

**Association 문서에 `ownerUid` 필드가 없거나 값이 일치하지 않음**

- `useIsAssociationOwner` Hook은 `association.ownerUid === user.uid`를 확인
- 현재 `isOwner: false` → `ownerUid` 값이 `userUid`와 일치하지 않음
- 코드는 이미 `ownerUid` 기준으로 구현되어 있음

---

## ✅ 해결 방법 (가장 간단하고 빠름)

### 방법 A: ownerUid 필드만 추가 (권장 ⭐)

**장점**: 단순하고 빠름, 기존 코드 수정 불필요

#### STEP 1: Association 문서에 ownerUid 설정

1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트 선택

2. **Firestore Database → Data 탭**
   - `associations` 컬렉션 클릭
   - `assoc-nowon-football` 문서 클릭

3. **ownerUid 필드 추가/수정**
   - "필드 추가" 클릭 (또는 기존 필드 수정)
   - 필드명: `ownerUid`
   - 타입: `string`
   - 값: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` (현재 로그인한 사용자 UID)
   - 저장

#### STEP 2: 확인 (자동 완료)

- `useIsAssociationOwner` Hook이 이미 구현되어 있음
- `TournamentEditDrawer.tsx`에서 `canPublishTournament = isOwner || canPublish` 사용
- `ownerUid`만 설정하면 `isOwner = true`가 됨

---

## 📝 확인 절차

### 1. Firebase Console 확인
- `associations/assoc-nowon-football` 문서 확인
- `ownerUid` 필드 확인 (값: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin`)

### 2. 브라우저 콘솔 확인 (F12 → Console)
- `[useIsAssociationOwner] ownerUid 기준 확인` 로그 확인
- `isOwner: true` 확인
- `canPublishTournament: true` 확인

### 3. UI 확인
- 대회 등록 페이지 열기
- "게시" 라디오 버튼 활성화 확인
- "⚠️ 관리자 권한이 필요합니다." 메시지 제거 확인

---

## 🎯 완료 기준

- [x] `associations/assoc-nowon-football.ownerUid = "qGq5XmuXRBsRZ0qJFE0yqtZY5Hin"` 설정
- [ ] 콘솔 로그: `isOwner: true`
- [ ] "게시" 토글 활성화
- [ ] 대회 `published` 상태로 저장 성공
- [ ] 메인 화면에서 "진행 중 대회" 노출

---

## 💬 한 줄 요약

**"association 문서에 `ownerUid` 필드만 추가하면 즉시 해결됨. 기존 코드는 이미 `ownerUid` 기준으로 구현되어 있음."**

---

## 🔧 추가 작업 (선택사항)

### 방법 B: members 구조 추가 (여러 관리자 지정 가능)

**필요시 나중에 추가 가능:**
- `associations/{associationId}/members/{userUid}` 문서 생성
- `role: "owner"` 또는 `role: "admin"` 설정
- `useIsAssociationAdmin` Hook이 `members/{uid}.role === "admin"` 확인

**하지만 현재는 방법 A가 가장 간단하고 빠름**

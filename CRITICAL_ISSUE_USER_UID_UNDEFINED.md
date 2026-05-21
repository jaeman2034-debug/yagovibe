# 🚨 긴급 문제: userUid가 undefined

## 📌 현재 상황 (콘솔 로그 기준)

```javascript
{
  adminLoading: false,
  adminLoadingState: false,
  associationId: "assoc-nowon-football",  // ✅ 정확함
  canPublish: false,                       // ❌ 문제
  canPublishTournament: false,              // ❌ 문제
  isOwner: false,                          // ❌ 문제
  ownerLoading: false,
  userUid: undefined,                      // 🚨 가장 큰 문제!
}
```

---

## 🔍 핵심 문제점

### 문제 1: userUid가 undefined (가장 중요)

**증상**:
- 콘솔 로그: `userUid: undefined`
- 이전에 확인한 사용자 UID: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin`

**영향**:
- `useIsAssociationOwner` Hook이 `user?.uid`가 없어서 `isOwner: false` 반환
- `useIsAssociationAdmin` Hook이 `user?.uid`가 없어서 `canPublish: false` 반환
- 모든 권한 확인 로직이 실패함

**원인 가능성**:
1. 사용자가 로그인하지 않음
2. Auth 상태가 아직 로드 중 (loading: true)
3. `useAuth` Hook이 제대로 동작하지 않음
4. Auth Emulator 연결 문제

---

### 문제 2: Firestore Rules 에러

**증상**:
- 콘솔에 `FirebaseError: No matching allow statements` 에러 다수

**원인**:
- `userUid: undefined` → 인증되지 않은 사용자로 간주
- Firestore Rules가 인증된 사용자만 허용하도록 설정됨
- 인증 정보가 없어서 모든 접근이 거부됨

---

## ✅ 해결 방법

### STEP 1: 로그인 상태 확인 (가장 중요)

1. **브라우저에서 로그인 확인**
   - 페이지 상단에 사용자 정보가 표시되는지 확인
   - 로그아웃 상태라면 로그인 필요

2. **Auth Emulator 확인**
   - `http://localhost:4001` → Authentication 탭
   - 사용자 `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` 존재하는지 확인

3. **브라우저 콘솔에서 Auth 상태 확인**
   ```javascript
   // 콘솔에 입력
   const { auth } = await import('/src/lib/firebase.js');
   console.log('Current user:', auth.currentUser);
   console.log('User UID:', auth.currentUser?.uid);
   ```

---

### STEP 2: Auth Provider 확인

1. **AuthProvider가 제대로 동작하는지 확인**
   - `src/context/AuthProvider.tsx` 확인
   - `onAuthStateChanged` 리스너가 제대로 등록되었는지 확인

2. **로딩 상태 확인**
   - `useAuth` Hook의 `loading` 상태 확인
   - `loading: true`인 동안은 `user`가 `null`일 수 있음

---

### STEP 3: 로그인 후 권한 데이터 추가

**`userUid`가 정상적으로 로드된 후에만** 다음 단계 진행:

1. **Association 문서에 ownerUid 추가**
   - `associations/assoc-nowon-football` 문서
   - `ownerUid`: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin`

2. **members 문서 생성**
   - `associations/assoc-nowon-football/members/qGq5XmuXRBsRZ0qJFE0yqtZY5Hin`
   - `role`: `"admin"`
   - `status`: `"active"`

---

## 🔍 디버깅 체크리스트

### 1. 로그인 상태 확인
- [ ] 브라우저에서 로그인되어 있는지 확인
- [ ] Auth Emulator에 사용자 존재하는지 확인
- [ ] 콘솔에서 `auth.currentUser` 확인

### 2. Auth Provider 확인
- [ ] `useAuth` Hook이 제대로 import되었는지 확인
- [ ] `loading` 상태가 `false`인지 확인
- [ ] `user` 객체가 존재하는지 확인

### 3. 권한 데이터 확인 (userUid가 정상일 때만)
- [ ] `associations/assoc-nowon-football.ownerUid` 확인
- [ ] `associations/assoc-nowon-football/members/{userUid}` 확인

---

## 💬 요약

**가장 큰 문제**: `userUid: undefined`

**해결 순서**:
1. ✅ 먼저 로그인 상태 확인 및 수정
2. ✅ `userUid`가 정상적으로 로드되는지 확인
3. ✅ 그 다음 Firestore에 권한 데이터 추가

**`userUid`가 `undefined`인 상태에서는 Firestore에 권한 데이터를 추가해도 의미가 없습니다.**

---

## 🛠️ 즉시 확인할 것

1. **페이지 새로고침 후 콘솔 확인**
   - `userUid`가 여전히 `undefined`인지 확인

2. **로그인 페이지로 이동**
   - 로그인 후 다시 대회 등록 페이지로 이동

3. **Auth Emulator 확인**
   - `http://localhost:4001` → Authentication → Users
   - 사용자 존재 여부 확인

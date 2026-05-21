# 🔧 userUid가 undefined인 문제 해결

## 📌 현재 상황

콘솔 로그:
```javascript
{
  userUid: undefined,  // ❌ 문제!
  isOwner: false,
  canPublish: false,
  canPublishTournament: false
}
```

---

## 🔍 원인 분석

### 가능한 원인들

1. **AuthProvider가 초기화되지 않음**
   - `onAuthStateChanged` 리스너가 등록되지 않음
   - `user` 상태가 업데이트되지 않음

2. **로그인 상태가 아직 로드되지 않음**
   - `authLoading: true` 상태
   - `user`가 아직 `null`

3. **Auth Emulator 연결 문제**
   - Emulator가 실행되지 않음
   - 연결 설정이 잘못됨

---

## ✅ 해결 방법

### STEP 1: 콘솔에서 Auth 상태 확인

콘솔에 다음 코드 입력:

```javascript
// Auth 상태 직접 확인
const { auth } = await import('/src/lib/firebase.js');
console.log('auth.currentUser:', auth.currentUser);
console.log('auth.currentUser?.uid:', auth.currentUser?.uid);

// AuthProvider 상태 확인
// (이건 직접 접근 불가하므로 콘솔 로그 확인)
```

### STEP 2: 콘솔 로그 확인

다음 로그가 있는지 확인:
- `[AuthProvider] onAuthStateChanged 리스너 등록`
- `[AuthProvider] onAuthStateChanged 콜백 실행`
- `[AuthProvider] 초기 인증 상태 확인 완료`

이 로그들이 없다면:
- AuthProvider가 제대로 마운트되지 않음
- 또는 로그인 상태가 아직 확인되지 않음

### STEP 3: 로그인 상태 재확인

1. **로그인 페이지로 이동**
2. **다시 로그인**
3. **대회 등록 페이지로 이동**
4. **콘솔에서 `userUid` 확인**

---

## 🔧 코드 수정 완료

`TournamentEditDrawer.tsx`에 다음 수정을 적용했습니다:
- `authLoading` 상태 확인 추가
- 디버깅 로그에 `user` 객체와 `authLoading` 추가

이제 콘솔에서 더 자세한 정보를 확인할 수 있습니다.

---

## 📝 확인 절차

1. **브라우저 콘솔 확인**
   - `[AuthProvider] onAuthStateChanged 콜백 실행` 로그 확인
   - `hasUser: true`인지 확인
   - `userUid` 값 확인

2. **auth.currentUser 직접 확인**
   - 위의 확인 코드 실행
   - `auth.currentUser?.uid` 값 확인

3. **페이지 새로고침**
   - F5 또는 새로고침
   - 권한 확인 로그 다시 확인

---

## 💬 요약

**현재 문제**:
- `userUid: undefined` - `useAuth()`에서 `user`가 `null`

**확인 필요**:
1. 콘솔에 `[AuthProvider] onAuthStateChanged 콜백 실행` 로그가 있는지
2. `auth.currentUser`가 존재하는지
3. 로그인 상태가 제대로 로드되었는지

**다음 단계**:
1. 콘솔에서 Auth 상태 확인 코드 실행
2. 결과 공유
3. 필요시 로그인 재시도

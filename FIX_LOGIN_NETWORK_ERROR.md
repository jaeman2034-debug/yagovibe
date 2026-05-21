# 🔧 로그인 네트워크 오류 해결 가이드

## 📌 현재 상황

콘솔 로그:
```
FirebaseError: Firebase: Error (auth/network-request-failed)
TypeError: Failed to fetch
```

**의미**: Firebase Auth 서버에 연결할 수 없음

---

## 🔍 원인 분석

### 가능한 원인들

1. **Auth Emulator가 실행되지 않음**
   - `firebase emulators:start`가 실행되지 않음
   - 또는 Emulator가 중단됨

2. **Auth Emulator 연결 설정 문제**
   - 코드에서 Emulator 연결이 안 됨
   - 포트가 다름

3. **네트워크 연결 문제**
   - 실제 Firebase 프로젝트에 연결 시도
   - 인터넷 연결 문제

---

## ✅ 해결 방법

### STEP 1: Auth Emulator 실행 확인

터미널에서 확인:
```bash
firebase emulators:start
```

**확인 사항**:
- `auth: Emulator running at http://localhost:9099` 메시지 확인
- Emulator가 실행 중인지 확인

### STEP 2: Auth Emulator 연결 코드 확인

`src/lib/firebase.ts`에서 다음 코드 확인:
```typescript
if (import.meta.env.DEV) {
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

**확인 사항**:
- 이 코드가 있는지
- 포트가 9099인지
- `import.meta.env.DEV`가 `true`인지

### STEP 3: 브라우저 콘솔에서 확인

콘솔에 다음 코드 입력:
```javascript
// Firebase Auth 설정 확인
const { auth } = await import('/src/lib/firebase.js');
console.log('Auth 설정:', {
  app: auth.app.name,
  projectId: auth.app.options.projectId,
  authDomain: auth.app.options.authDomain,
  // Emulator 연결 여부는 직접 확인 불가
});
```

---

## 🔧 즉시 해결 방법

### 방법 1: Auth Emulator 재시작

1. **기존 Emulator 종료**
   ```bash
   # 터미널에서 Ctrl+C로 종료
   ```

2. **Emulator 재시작**
   ```bash
   firebase emulators:start
   ```

3. **로그인 재시도**

### 방법 2: 브라우저 새로고침

1. **하드 리프레시**
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **로그인 재시도**

### 방법 3: Auth Emulator 연결 코드 확인

`src/lib/firebase.ts`에서 Emulator 연결 코드가 제대로 있는지 확인

---

## 📝 확인 절차

1. **터미널 확인**
   - `firebase emulators:start` 실행 중인지
   - `auth: Emulator running at http://localhost:9099` 메시지 확인

2. **브라우저 콘솔 확인**
   - `[firebase.ts] localhost 감지 - Firebase Emulator Mode 활성화` 로그 확인
   - `✅ Auth Emulator: http://localhost:9099` 메시지 확인

3. **로그인 재시도**
   - 페이지 새로고침
   - 로그인 재시도

---

## 💬 요약

**문제**: `auth/network-request-failed` - Firebase Auth 서버 연결 실패

**원인**: Auth Emulator가 실행되지 않았거나 연결 설정 문제

**해결**:
1. `firebase emulators:start` 실행 확인
2. 브라우저 새로고침
3. 로그인 재시도

**다음 단계**:
1. 터미널에서 Emulator 실행 상태 확인
2. 브라우저 새로고침
3. 로그인 재시도

터미널에서 `firebase emulators:start`가 실행 중인지 확인해주세요.

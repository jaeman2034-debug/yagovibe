# 🔧 Firebase 인증 문제 해결 가이드

## 📋 문제: 게스트 로그인 버튼 작동 안함

### 원인 분석

1. **브라우저 콘솔에서 `import.meta.env` 직접 실행 오류**
   - `import.meta`는 ES 모듈에서만 사용 가능
   - 브라우저 콘솔에서는 직접 실행 불가능
   - ✅ 해결: 디버깅 함수 사용 (`checkFirebaseConfig()`, `getFirebaseEnv()`)

2. **Firebase Auth 익명 로그인 설정 누락**
   - Firebase Console에서 익명 로그인 활성화 필요

## ✅ 해결 방법

### 1️⃣ Firebase Console에서 익명 로그인 활성화

1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트 선택

2. **Authentication 설정**
   - 왼쪽 메뉴 > **"Authentication"** 클릭
   - **"Sign-in method"** 탭 선택

3. **익명 로그인 활성화**
   - **"Anonymous"** (익명) 옵션 찾기
   - 클릭하여 활성화
   - **"Enable"** 토글 활성화
   - **"Save"** 클릭

### 2️⃣ .env.local 파일 확인

프로젝트 루트(`yago-vibe-spt/`)에 `.env.local` 파일이 있는지 확인:

```env
VITE_FIREBASE_API_KEY=실제_API_키
VITE_FIREBASE_AUTH_DOMAIN=실제-프로젝트.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=실제-프로젝트-id
VITE_FIREBASE_STORAGE_BUCKET=실제-프로젝트.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=실제_숫자_ID
VITE_FIREBASE_APP_ID=1:실제숫자:web:실제앱ID
VITE_FIREBASE_VAPID_KEY=BBq4syaG4toS6RjeBlb4SW9sGTDxBsJILjvSiSBHAiFAhspsFHKUcJtzSDsyFp00K65l60YHIyT-BnZIg-BqBlQ
```

**⚠️ 중요:**
- 모든 값이 실제 Firebase Console의 값과 일치해야 함
- 플레이스홀더 값(`your-firebase-api-key` 등)이 있으면 안 됨
- `=` 뒤에 공백 없어야 함

### 3️⃣ 개발 서버 재시작

`.env.local` 수정 후 **반드시** 서버 재시작:

```bash
# 서버 중지 (Ctrl + C)
npm run dev
```

### 4️⃣ 브라우저 콘솔에서 확인

브라우저 콘솔(F12)에서 다음 명령어 실행:

```javascript
// ✅ 올바른 방법: 디버깅 함수 사용
checkFirebaseConfig();

// ✅ 환경 변수 확인 (import.meta.env 대체)
getFirebaseEnv();

// ❌ 잘못된 방법: 직접 import.meta.env 실행
// import.meta.env.VITE_FIREBASE_API_KEY  // SyntaxError 발생!
```

### 5️⃣ 게스트 로그인 테스트

1. **StartScreen 페이지 접속** (`/start`)
2. **"게스트로 둘러보기 →" 버튼 클릭**
3. **브라우저 콘솔 확인** (F12 > Console 탭)

**예상 로그:**
```
👀 게스트 모드 진입 시도...
🔐 Firebase 익명 로그인 시도 중...
📋 Auth 인스턴스: ✅ 로드됨
✅ 게스트 로그인 성공! [사용자 UID]
🏠 /home 페이지로 이동...
```

**오류 발생 시:**
```
❌ 게스트 로그인 실패: [오류 정보]
오류 상세: { code: "...", message: "..." }
```

## 🐛 일반적인 오류 및 해결

### 오류: `auth/api-key-not-valid`

**원인:** Firebase API 키가 잘못되었거나 `.env.local`에 올바르게 설정되지 않음

**해결:**
1. Firebase Console에서 실제 API 키 확인
2. `.env.local` 파일 업데이트
3. 개발 서버 재시작
4. 브라우저에서 `checkFirebaseConfig()` 실행하여 확인

### 오류: `auth/operation-not-allowed`

**원인:** Firebase Console에서 익명 로그인이 활성화되지 않음

**해결:**
1. Firebase Console > Authentication > Sign-in method
2. Anonymous 옵션 찾기
3. Enable 토글 활성화
4. Save 클릭

### 오류: `Cannot use 'import.meta' outside a module`

**원인:** 브라우저 콘솔에서 `import.meta.env`를 직접 실행

**해결:**
- ✅ `getFirebaseEnv()` 함수 사용
- ✅ `checkFirebaseConfig()` 함수 사용
- ❌ `import.meta.env` 직접 실행 금지

### 페이지 이동이 안됨

**원인:** React Router의 `navigate`가 작동하지 않음

**해결:**
- 현재 코드는 `window.location.href`를 사용하도록 수정됨
- 더 직접적인 페이지 이동 방식 사용

## ✅ 확인 체크리스트

게스트 로그인 기능이 정상 작동하는지 확인:

- [ ] Firebase Console에서 익명 로그인 활성화됨
- [ ] `.env.local` 파일에 실제 Firebase 설정 값 입력됨
- [ ] 개발 서버 재시작 완료
- [ ] 브라우저 콘솔에서 `checkFirebaseConfig()` 실행 → 모든 설정 ✅
- [ ] 게스트 버튼 클릭 시 콘솔에 "✅ 게스트 로그인 성공!" 메시지 출력
- [ ] `/home` 페이지로 정상 이동됨
- [ ] 음성 안내가 재생됨

## 📝 디버깅 팁

### 브라우저 콘솔에서 사용 가능한 함수

```javascript
// Firebase 설정 검증
checkFirebaseConfig();

// 환경 변수 확인 (import.meta.env 대체)
getFirebaseEnv();

// Firebase Auth 인스턴스 확인
console.log(auth);  // React DevTools에서 확인 가능
```

### 네트워크 탭에서 확인

1. 브라우저 개발자 도구 > Network 탭
2. 게스트 버튼 클릭
3. Firebase 요청 확인:
   - `identitytoolkit.googleapis.com` - 인증 요청
   - 요청이 실패하면 상태 코드와 응답 확인

---

**모든 설정이 완료되면 게스트 로그인이 정상적으로 작동합니다!** 🎉


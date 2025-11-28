# 🔍 Google 로그인 문제 최종 체크리스트

## ✅ 이미 확인된 사항
- [x] 리디렉션 URI: `__/auth/handler` (언더스코어 2개) ✅
- [x] JavaScript 원본: `http://localhost:5173` ✅
- [x] 코드: client_id 설정 제거됨 ✅
- [x] 코드: 중복 setCustomParameters 제거됨 ✅

## 🔍 추가로 확인해야 할 사항

### 1️⃣ Firebase Console - Google 로그인 활성화 확인

**Firebase Console > Authentication > Sign-in method**

- [ ] **Google** 제공업체가 **"사용 설정됨"** 상태인지 확인
- [ ] **Project support email**이 실제 Gmail 주소로 설정되어 있는지 확인
  - 예: `your-email@gmail.com`
  - `@gmail.com`이 아닌 이메일도 가능하지만 Gmail이 가장 안정적

### 2️⃣ Firebase Console - Authorized Domains 확인

**Firebase Console > Authentication > Settings > Authorized domains**

다음 도메인들이 모두 포함되어 있는지 확인:
- [ ] `localhost`
- [ ] `127.0.0.1`
- [ ] `yagovibe.com`
- [ ] `www.yagovibe.com`
- [ ] `yago-vibe-spt.firebaseapp.com` (자동 추가됨)
- [ ] `yago-vibe-spt.web.app` (자동 추가됨)

**없으면 추가:**
- "Add domain" 클릭
- 도메인 입력
- "Add" 클릭

### 3️⃣ Google Cloud Console - OAuth 동의 화면 확인

**Google Cloud Console > APIs & Services > OAuth consent screen**

- [ ] **사용자 유형** 선택됨 (외부 또는 내부)
- [ ] **앱 정보** 입력됨 (앱 이름, 사용자 지원 이메일 등)
- [ ] **테스트 사용자** (외부인 경우): 본인 이메일 추가됨
- [ ] **범위** (Scopes): `email`, `profile`, `openid` 포함됨

### 4️⃣ Google Cloud Console - API 활성화 확인

**Google Cloud Console > APIs & Services > 라이브러리**

- [ ] **Identity Toolkit API** 활성화됨
- [ ] **Google+ API** (필요한 경우) 활성화됨

### 5️⃣ 브라우저 설정 확인

- [ ] **팝업 차단 해제**
  - Chrome 주소창 오른쪽 팝업 차단 아이콘 클릭
  - "항상 localhost:5173의 팝업 허용" 선택
- [ ] **쿠키 허용**
  - Chrome 설정 > 개인정보 및 보안 > 쿠키 및 기타 사이트 데이터
  - localhost 허용 확인
- [ ] **캐시 삭제**
  - Ctrl + Shift + Delete
  - 캐시된 이미지 및 파일 삭제

### 6️⃣ 환경 변수 확인

**.env.local** 파일 확인:
- [ ] `VITE_FIREBASE_API_KEY` 설정되어 있음
- [ ] `VITE_FIREBASE_APP_ID` 설정되어 있음
- [ ] 모든 값이 실제 Firebase Console 값과 일치함

### 7️⃣ 개발 서버 재시작

- [ ] 서버 중지 (Ctrl + C)
- [ ] `npm run dev` 재시작
- [ ] 브라우저 강력 새로고침 (Ctrl + Shift + R)

## 🚨 "The requested action is invalid" 오류의 다른 원인

### 원인 1: OAuth 동의 화면 미설정
- **증상**: 팝업이 열리지만 "The requested action is invalid" 표시
- **해결**: OAuth 동의 화면에서 앱 정보 입력 및 테스트 사용자 추가

### 원인 2: API 키 제한 설정
- **증상**: 특정 도메인에서만 작동하지 않음
- **해결**: Google Cloud Console > APIs & Services > Credentials > API 키
  - 애플리케이션 제한사항: "HTTP 리퍼러(웹사이트)" 선택
  - 웹사이트 제한사항에 `http://localhost:5173/*` 추가

### 원인 3: Firebase 프로젝트와 Google Cloud 프로젝트 불일치
- **증상**: 설정은 다 맞는데 작동 안 함
- **해결**: Firebase Console > Project Settings > General
  - Google Cloud 프로젝트 번호 확인
  - Google Cloud Console 상단 프로젝트와 일치하는지 확인

### 원인 4: 브라우저 쿠키/로컬 스토리지 차단
- **증상**: 팝업은 열리지만 로그인 후 상태 유지 안 됨
- **해결**: 브라우저 설정에서 쿠키 및 사이트 데이터 허용

## 🔥 즉시 테스트 방법

1. **시크릿 모드에서 테스트**
   - Chrome 시크릿 모드 (Ctrl + Shift + N)
   - http://localhost:5173 접속
   - Google 로그인 시도

2. **콘솔 로그 확인**
   - 브라우저 개발자 도구 (F12) > Console
   - Google 로그인 버튼 클릭 시 나타나는 오류 메시지 확인
   - Network 탭에서 실패한 요청 확인

3. **Firebase Auth 상태 확인**
   ```javascript
   // 브라우저 콘솔에서 실행
   import { auth } from './src/lib/firebase';
   console.log('Current user:', auth.currentUser);
   ```

## 📋 최종 확인 순서

1. Firebase Console > Authentication > Sign-in method > Google 활성화 확인
2. Firebase Console > Authentication > Settings > Authorized domains 확인
3. Google Cloud Console > OAuth consent screen 설정 확인
4. Google Cloud Console > APIs & Services > 라이브러리 > Identity Toolkit API 활성화 확인
5. 브라우저 팝업 차단 해제
6. 개발 서버 재시작
7. 시크릿 모드에서 테스트

## 💡 디버깅 팁

브라우저 콘솔에서 다음을 확인하세요:

```javascript
// Firebase 설정 확인
console.log('Firebase Config:', {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? '✅' : '❌',
  authDomain: 'yago-vibe-spt.firebaseapp.com',
  projectId: 'yago-vibe-spt'
});

// 현재 인증 상태
import { auth } from './src/lib/firebase';
auth.onAuthStateChanged((user) => {
  console.log('Auth State:', user ? '✅ 로그인됨' : '❌ 로그아웃됨');
});
```


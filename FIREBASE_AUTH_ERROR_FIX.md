# 🔥 Firebase 인증 오류 "The requested action is invalid" 해결 가이드

## 🚨 오류 원인

**"The requested action is invalid."** 오류는 다음과 같은 경우에 발생합니다:

### 1순위: Firebase API 키가 잘못되었거나 누락됨 (가장 흔한 원인)

**증상**:
- 팝업 창에 "The requested action is invalid." 메시지 표시
- URL에 `apiKey=AlzaS...` (잘못된 키 또는 잘린 키) 포함

**원인**:
- `.env.local` 또는 `.env.production` 파일에 Firebase API 키가 제대로 설정되지 않음
- API 키가 잘못되었거나 다른 프로젝트의 키임
- 환경 변수가 빌드 시점에 제대로 주입되지 않음

### 2순위: Firebase Console에서 Google 로그인 미활성화

**원인**:
- Firebase Console > Authentication > Sign-in method에서 Google 로그인이 활성화되지 않음

### 3순위: OAuth 동의 화면 설정 문제

**원인**:
- Google Cloud Console에서 OAuth 동의 화면이 제대로 설정되지 않음
- 승인된 리디렉션 URI가 설정되지 않음

## ✅ 해결 방법

### Step 1: Firebase API 키 확인 및 수정

1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트 선택 (`yago-vibe-spt`)

2. **프로젝트 설정 확인**
   - 왼쪽 상단 ⚙️ 아이콘 클릭
   - **"프로젝트 설정"** 클릭
   - 아래로 스크롤하여 **"내 앱"** 섹션 확인
   - 웹 앱(🌐) 아이콘 클릭

3. **Firebase SDK snippet 확인**
   - **"Firebase SDK snippet"** 탭 선택
   - `apiKey` 값 복사

4. **`.env.local` 파일 업데이트**
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy실제_복사한_키
   VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=yago-vibe-spt
   VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-spt.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=실제_숫자_ID
   VITE_FIREBASE_APP_ID=1:실제숫자:web:실제앱ID
   ```

5. **개발 서버 재시작**
   ```bash
   # 서버 중지 (Ctrl + C)
   npm run dev
   ```

### Step 2: Firebase Console에서 Google 로그인 활성화

1. **Firebase Console > Authentication**
   - 왼쪽 메뉴 > **"Authentication"** 클릭
   - **"Sign-in method"** 탭 선택

2. **Google 로그인 활성화**
   - **"Google"** 옵션 찾기
   - 클릭하여 활성화
   - **"Enable"** 토글 활성화
   - **"Save"** 클릭

### Step 3: OAuth 동의 화면 설정 (필요한 경우)

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트 선택 (`yago-vibe-spt`)

2. **OAuth 동의 화면 설정**
   - **API 및 서비스** > **OAuth 동의 화면**
   - 사용자 유형 선택 (외부 또는 내부)
   - 앱 정보 입력
   - **승인된 리디렉션 URI** 추가:
     ```
     http://localhost:5173/__/auth/handler
     https://yago-vibe-spt.firebaseapp.com/__/auth/handler
     https://www.yagovibe.com/__/auth/handler
     ```

### Step 4: 브라우저 캐시 삭제

1. **개발자 도구 열기** (F12)
2. **Application 탭** 선택
3. **Storage** > **Clear site data** 클릭
4. **Service Workers** > **Unregister** 클릭
5. **하드 리프레시** (Ctrl + Shift + R)

## 🔍 디버깅

### 브라우저 콘솔에서 확인:

```javascript
// Firebase 설정 확인
console.log('Firebase API Key:', import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 10) + '...');
console.log('Firebase Auth Domain:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
console.log('Firebase Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
```

### 확인 사항:

1. ✅ Firebase API 키가 올바르게 로드되는지
2. ✅ Firebase Console에서 Google 로그인이 활성화되어 있는지
3. ✅ OAuth 동의 화면이 제대로 설정되어 있는지
4. ✅ 브라우저 캐시가 삭제되었는지

## 📝 체크리스트

- [ ] `.env.local` 파일에 올바른 Firebase API 키 설정
- [ ] 개발 서버 재시작
- [ ] Firebase Console에서 Google 로그인 활성화
- [ ] OAuth 동의 화면 설정 (필요한 경우)
- [ ] 브라우저 캐시 삭제
- [ ] 하드 리프레시 후 다시 테스트


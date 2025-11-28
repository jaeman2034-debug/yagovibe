# 🔧 Firebase Authentication 설정 가이드

## ❌ 오류: `auth/operation-not-allowed`

이 오류는 Firebase Console에서 로그인 방법이 활성화되지 않아 발생합니다.

## ✅ 해결 방법

### 1️⃣ Firebase Console 접속

1. **Firebase Console 열기**
   - https://console.firebase.google.com 접속
   - 프로젝트 **"yago-vibe-spt"** 선택

2. **Authentication 메뉴로 이동**
   - 왼쪽 메뉴에서 **"Authentication"** 클릭
   - 상단 탭에서 **"Sign-in method"** 선택

### 2️⃣ 이메일/비밀번호 로그인 활성화

1. **Email/Password 찾기**
   - Sign-in providers 목록에서 **"Email/Password"** 클릭

2. **활성화**
   - **"Enable"** 토글을 **ON**으로 변경
   - **"Email link (passwordless sign-in)"**는 선택 사항 (필요시 활성화)
   - **"Save"** 클릭

### 3️⃣ Google 로그인 활성화

1. **Google 찾기**
   - Sign-in providers 목록에서 **"Google"** 클릭

2. **활성화**
   - **"Enable"** 토글을 **ON**으로 변경
   - **Project support email** 선택 (프로젝트 이메일)
   - **"Save"** 클릭

### 4️⃣ Authorized domains 확인

1. **Settings 탭으로 이동**
   - Authentication > **"Settings"** 탭 클릭

2. **Authorized domains 확인**
   - 다음 도메인들이 목록에 있는지 확인:
     - `localhost`
     - `yagovibe.com`
     - `www.yagovibe.com`
     - `yago-vibe-spt.firebaseapp.com`
     - `yago-vibe-spt.web.app`

3. **도메인 추가 (없는 경우)**
   - **"Add domain"** 클릭
   - 도메인 입력 후 **"Add"** 클릭

### 5️⃣ 테스트

1. **브라우저 새로고침**
   - 로그인 페이지를 강력 새로고침 (Ctrl + Shift + R)

2. **로그인 시도**
   - 이메일/비밀번호로 로그인 시도
   - Google 로그인 버튼 클릭 시도

## 🚨 중요: API 키 HTTP Referrer 제한 해결

콘솔에 다음 오류가 보이면:
```
API_KEY_HTTP_REFERRER_BLOCKED
Requests from referer https://yago-vibe-spt.firebaseapp.com/ are blocked
```

이것은 Google Cloud Console에서 API 키의 HTTP referrer 제한 때문입니다.

### 해결 방법:

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트 **"yago-vibe-spt"** 선택

2. **API 키 설정**
   - 왼쪽 메뉴 > **"APIs & Services"** > **"Credentials"** 클릭
   - **"API keys"** 섹션에서 Firebase API 키 찾기 (또는 "Browser key" 찾기)

3. **API 키 편집**
   - API 키 클릭하여 편집
   - **"Application restrictions"** 섹션 확인
   - **"HTTP referrers (web sites)"** 선택되어 있는지 확인

4. **허용된 도메인 추가**
   - **"Website restrictions"** 섹션에서 **"Add an item"** 클릭
   - 다음 도메인들을 하나씩 추가:
     ```
     http://localhost:*
     http://127.0.0.1:*
     https://yago-vibe-spt.firebaseapp.com/*
     https://yago-vibe-spt.web.app/*
     https://www.yagovibe.com/*
     https://yagovibe.com/*
     ```
   - 각 도메인 추가 후 **"Save"** 클릭

5. **브라우저 새로고침**
   - 개발 서버 재시작
   - 브라우저 강력 새로고침 (Ctrl + Shift + R)

## 🔍 추가 확인 사항

### Google 로그인 설정 (OAuth)

Google 로그인을 사용하려면:

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트 **"yago-vibe-spt"** 선택

2. **OAuth 동의 화면 설정**
   - 왼쪽 메뉴 > **"APIs & Services"** > **"OAuth consent screen"**
   - 사용자 유형 선택 (외부 또는 내부)
   - 앱 정보 입력
   - **"Save and Continue"** 클릭

3. **승인된 리디렉션 URI 확인**
   - **"Credentials"** 탭으로 이동
   - OAuth 2.0 Client ID 클릭
   - **"Authorized redirect URIs"**에 다음 추가:
     ```
     https://yago-vibe-spt.firebaseapp.com/__/auth/handler
     http://localhost:5173/__/auth/handler
     ```

## 📋 체크리스트

- [ ] Firebase Console > Authentication > Sign-in method
- [ ] Email/Password 활성화됨
- [ ] Google 활성화됨
- [ ] Authorized domains에 localhost 포함
- [ ] Google Cloud Console > OAuth 동의 화면 설정 완료
- [ ] Authorized redirect URIs 설정 완료

## 🚨 여전히 오류가 발생하는 경우

1. **브라우저 캐시 삭제**
   - Ctrl + Shift + Delete
   - 캐시된 이미지 및 파일 삭제

2. **개발 서버 재시작**
   ```bash
   # 서버 중지 (Ctrl + C)
   npm run dev
   ```

3. **Firebase 프로젝트 확인**
   - Firebase Console에서 프로젝트가 활성화되어 있는지 확인
   - 결제 정보가 필요할 수 있음 (Blaze 플랜)

4. **콘솔 로그 확인**
   - 브라우저 개발자 도구 (F12) > Console 탭
   - 추가 오류 메시지 확인


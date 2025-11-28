# 🔧 Google 로그인 문제 종합 해결 가이드

## ❌ 현재 오류: "The requested action is invalid"

이 오류는 Google OAuth 설정 불일치로 발생합니다.

## ✅ 종합 체크리스트

### 1️⃣ Firebase Console 설정 확인

#### Authentication > Sign-in method
- [ ] **Google** 제공업체가 **"사용 설정됨"** 상태인지 확인
- [ ] **Project support email**이 실제 Gmail 주소로 설정되어 있는지 확인
- [ ] **이메일/비밀번호**도 활성화되어 있는지 확인

#### Authentication > Settings > Authorized domains
다음 도메인들이 모두 포함되어 있는지 확인:
- [ ] `localhost`
- [ ] `127.0.0.1`
- [ ] `yagovibe.com`
- [ ] `www.yagovibe.com`
- [ ] `yago-vibe-spt.firebaseapp.com`
- [ ] `yago-vibe-spt.web.app`

### 2️⃣ Google Cloud Console OAuth 설정 확인

#### APIs & Services > Credentials > OAuth 2.0 Client IDs

**Web client (1266...로 시작)** 선택 후:

#### 승인된 JavaScript 원본
다음 URI들이 모두 포함되어 있는지 확인:
- [ ] `http://localhost`
- [ ] `http://localhost:5173` ⚠️ **필수!**
- [ ] `http://localhost:5000`
- [ ] `https://yago-vibe-spt.firebaseapp.com`
- [ ] `https://www.yagovibe.com`
- [ ] `https://yagovibe.com`

#### 승인된 리디렉션 URI
다음 URI들이 모두 포함되어 있는지 확인:
- [ ] `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
- [ ] `http://localhost:5173/__/auth/handler` ⚠️ **필수!**
- [ ] `https://yago-vibe-spt.web.app/__/auth/handler`

**⚠️ 중요:** 
- URI 끝에 `/`가 있으면 안 됨
- `__/auth/handler` (언더스코어 2개)
- 저장 후 **2-3분 대기** (설정 반영 시간)

### 3️⃣ 코드 확인

#### firebase.ts
- [ ] `client_id` 설정이 **제거**되어 있는지 확인
- [ ] `prompt: "select_account"`만 설정되어 있는지 확인

#### LoginPage.tsx
- [ ] `setCustomParameters` 중복 호출이 **제거**되어 있는지 확인
- [ ] `signInWithPopup`만 사용하는지 확인

### 4️⃣ 환경 변수 확인

#### .env.local
- [ ] `VITE_FIREBASE_API_KEY` 설정되어 있는지
- [ ] `VITE_FIREBASE_APP_ID` 설정되어 있는지
- [ ] `VITE_GOOGLE_CLIENT_ID`는 **더 이상 필요 없음** (제거해도 됨)

### 5️⃣ 브라우저 설정 확인

- [ ] 팝업 차단 해제 (localhost:5173 허용)
- [ ] 쿠키 허용
- [ ] 캐시 삭제 후 테스트

## 🔥 즉시 해결 방법

### Step 1: Google Cloud Console 설정

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트 "yago-vibe-spt" 선택

2. **OAuth 클라이언트 편집**
   - APIs & Services > Credentials
   - OAuth 2.0 Client IDs > Web client 클릭

3. **승인된 JavaScript 원본에 추가**
   ```
   http://localhost:5173
   ```

4. **승인된 리디렉션 URI 확인**
   ```
   http://localhost:5173/__/auth/handler
   ```
   (이미 있으면 OK, 없으면 추가)

5. **저장** 클릭

6. **2-3분 대기** (설정 반영 시간)

### Step 2: Firebase Console 확인

1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트 "yago-vibe-spt" 선택

2. **Authentication > Sign-in method**
   - Google: **사용 설정됨** 확인
   - Project support email: 실제 Gmail 주소 확인

3. **Authentication > Settings > Authorized domains**
   - `localhost` 포함 확인
   - `yagovibe.com` 포함 확인

### Step 3: 개발 서버 재시작

```bash
# 서버 중지 (Ctrl + C)
npm run dev
```

### Step 4: 브라우저 테스트

1. **시크릿 모드에서 테스트** (캐시 영향 제거)
   - Chrome 시크릿 모드 (Ctrl + Shift + N)
   - http://localhost:5173 접속

2. **팝업 차단 해제**
   - 주소창 오른쪽 팝업 차단 아이콘 클릭
   - "항상 localhost:5173의 팝업 허용" 선택

3. **Google 로그인 테스트**
   - Google 로그인 버튼 클릭
   - 팝업이 정상적으로 열리는지 확인

## 🚨 여전히 안 되는 경우

### 추가 확인 사항

1. **Firebase 프로젝트와 Google Cloud 프로젝트 일치 확인**
   - Firebase Console > Project Settings > General
   - Google Cloud Console 상단 프로젝트 선택
   - 두 프로젝트가 동일한지 확인

2. **OAuth 동의 화면 설정 확인**
   - Google Cloud Console > APIs & Services > OAuth consent screen
   - 사용자 유형: 외부 또는 내부
   - 테스트 사용자에 본인 이메일 추가 (외부인 경우)

3. **API 활성화 확인**
   - Google Cloud Console > APIs & Services > 라이브러리
   - "Identity Toolkit API" 활성화 확인

4. **콘솔 로그 확인**
   - 브라우저 개발자 도구 (F12) > Console
   - 오류 메시지 자세히 확인
   - Network 탭에서 실패한 요청 확인

## 📋 최종 체크리스트 요약

- [ ] Google Cloud Console: `http://localhost:5173` 추가됨
- [ ] Google Cloud Console: `http://localhost:5173/__/auth/handler` 추가됨
- [ ] Firebase Console: Google 로그인 활성화됨
- [ ] Firebase Console: Authorized domains에 localhost 포함
- [ ] firebase.ts: client_id 설정 제거됨
- [ ] LoginPage.tsx: 중복 setCustomParameters 제거됨
- [ ] 개발 서버 재시작 완료
- [ ] 브라우저 팝업 차단 해제
- [ ] 시크릿 모드에서 테스트 완료

## 💡 참고사항

- Google OAuth 설정 변경은 **2-3분에서 몇 시간**까지 걸릴 수 있습니다
- 설정 변경 후 **반드시 브라우저 캐시 삭제** 또는 **시크릿 모드**에서 테스트하세요
- `__/auth/handler`는 Firebase가 자동으로 생성하는 경로입니다 (언더스코어 2개 주의!)


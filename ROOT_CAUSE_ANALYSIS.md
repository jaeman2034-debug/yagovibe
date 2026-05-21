# 🔍 오류 원인 분석

## ❌ 오류 메시지

```
auth/requests-to-this-api-identitytoolkit-method-google.cloud.identitytoolkit.v1.projectconfigservice.getprojectconfig-are-blocked
```

## 🎯 핵심 원인

이 오류는 **Google Cloud Console의 Browser key (Firebase API Key)의 HTTP 리퍼러 제한** 때문입니다.

### 왜 이 오류가 발생하는가?

1. **Firebase Auth가 Identity Toolkit API를 호출**
   - Google 로그인 시도 시 Firebase는 `identitytoolkit.googleapis.com`에 요청을 보냅니다
   - 이 요청에는 **HTTP Referer 헤더**가 포함됩니다 (`localhost:5173`)

2. **Browser key의 HTTP 리퍼러 제한이 이 요청을 차단**
   - Google Cloud Console의 Browser key 설정에서 `localhost:5173`이 허용되지 않음
   - 따라서 Identity Toolkit API 호출이 차단됨

3. **OAuth 설정과는 별개**
   - OAuth 2.0 Client ID는 로그인 흐름을 제어
   - Browser key는 API 호출 권한을 제어
   - **두 개는 완전히 별개입니다!**

## ✅ 해결 방법 (단계별)

### Step 1: 실제 사용되는 API 키 확인

1. **브라우저 콘솔 (F12) → Console 탭**
2. 다음 로그 찾기:
   ```
   🔍 [firebase.ts] ⚠️ 실제 사용되는 Firebase API 키 (전체): AIzaSy...
   ```
3. **이 API 키를 복사하세요**

### Step 2: Google Cloud Console에서 Browser key 찾기

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트: `yago-vibe-spt` 선택

2. **APIs & Services → Credentials**
   - 왼쪽 메뉴 → **"APIs & Services"** → **"Credentials"**

3. **"API keys" 섹션에서 Browser key 찾기**
   - 브라우저 콘솔에 출력된 API 키와 일치하는 키 찾기
   - 키 이름: 보통 `Browser key (auto created by Google Service)` 또는 `Firebase Web App API Key`

### Step 3: Browser key의 HTTP 리퍼러 제한 수정

**Browser key를 클릭**하여 편집:

1. **"Application restrictions"** 섹션
   - **"HTTP referrers (web sites)"** 선택 확인

2. **"Website restrictions"** 섹션
   - 다음 도메인 **모두 추가** (각각 별도 줄):
   ```
   http://localhost:5173/*
   http://127.0.0.1:5173/*
   https://yago-vibe-spt.web.app/*
   https://yago-vibe-spt.firebaseapp.com/*
   https://yagovibe.com/*
   https://www.yagovibe.com/*
   ```

3. **"API restrictions"** 섹션
   - **"Don't restrict key"** 선택 (권장)
   - 또는 **"Restrict key"** 선택 시:
     - ✅ Identity Toolkit API
     - ✅ Firebase Authentication API
     - ✅ Maps JavaScript API (지도 사용 시)
     - ✅ Geocoding API (지도 사용 시)
     - ✅ Places API (지도 사용 시)

4. **"Save"** 클릭

### Step 4: 변경사항 적용 대기

- Google Cloud Console 변경사항은 **1-2분** 정도 걸립니다
- 기다린 후 테스트하세요

### Step 5: 브라우저 캐시 삭제 및 테스트

1. **브라우저 캐시 완전 삭제**
   - 개발자 도구 (F12) → **Application** 탭
   - **Storage** → **Clear site data**
   - 모든 항목 선택 후 **Clear site data** 클릭

2. **하드 리프레시**
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

3. **시크릿 모드에서 테스트** (권장)
   - 시크릿 모드 (Ctrl + Shift + N)
   - `http://localhost:5173/login` 접속
   - Google 로그인 시도

## 🔍 추가 확인 사항

### Firebase Console의 "Authorized domains" 확인

1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트: `yago-vibe-spt` 선택

2. **Authentication → Settings → Authorized domains**
   - 다음 도메인 **모두 있어야 함**:
     - ✅ `localhost`
     - ✅ `127.0.0.1`
     - ✅ `yago-vibe-spt.web.app`
     - ✅ `yago-vibe-spt.firebaseapp.com`
     - ✅ `yagovibe.com`
     - ✅ `www.yagovibe.com`

### 환경 변수 확인

`.env.local` 파일 확인:

```env
VITE_FIREBASE_API_KEY=AIzaSy실제_키
```

이 값이:
- ✅ Firebase Console의 API Key와 일치하는지
- ✅ Google Cloud Console의 Browser key와 일치하는지

확인하세요!

## 📝 체크리스트

- [ ] 브라우저 콘솔에서 실제 사용되는 API 키 확인
- [ ] Google Cloud Console에서 Browser key 찾기
- [ ] Browser key의 HTTP 리퍼러 제한에 `localhost:5173/*` 추가
- [ ] Browser key의 API 제한사항에서 "키 제한 안함" 또는 Identity Toolkit API 포함 확인
- [ ] Firebase Console의 Authorized domains에 `localhost` 추가 확인
- [ ] `.env.local`의 `VITE_FIREBASE_API_KEY` 값 확인
- [ ] 개발 서버 재시작
- [ ] 브라우저 캐시 삭제
- [ ] 시크릿 모드에서 테스트

## 💡 핵심 포인트

**OAuth 설정 ≠ Browser key 설정**

- **OAuth 2.0 Client ID**: 로그인 흐름 제어 (이미 완벽함 ✅)
- **Browser key (Firebase API Key)**: API 호출 권한 제어 (이것이 문제! ❌)

**두 개는 완전히 별개이므로 각각 설정해야 합니다!**


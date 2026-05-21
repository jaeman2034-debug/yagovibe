# 🔧 Identity Toolkit API 차단 오류 해결 가이드

## ❌ 오류 메시지

```
auth/requests-to-this-api-identitytoolkit-method-google.cloud.identitytoolkit.v1.projectconfigservice.getprojectconfig-are-blocked
```

## 🔍 원인 분석

이 오류는 **Firebase API 키 (Browser key)**의 설정 문제입니다. OAuth 설정은 완벽하지만, **API 키 자체의 제한**이 문제입니다.

## ✅ 해결 방법

### 1️⃣ 실제 사용되는 API 키 확인

브라우저 콘솔(F12)에서 다음 로그를 확인하세요:

```
🔍 [firebase.ts] ⚠️ 실제 사용되는 Firebase API 키 (전체): AIzaSy...
```

**이 API 키가 Google Cloud Console의 "Browser key"와 일치하는지 확인하세요!**

### 2️⃣ Google Cloud Console에서 API 키 확인

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트: `yago-vibe-spt` 선택

2. **APIs & Services → Credentials**
   - 왼쪽 메뉴 → **"APIs & Services"** → **"Credentials"**

3. **Browser key 찾기**
   - **"API keys"** 섹션에서 Firebase 프로젝트의 Browser key 찾기
   - 키 이름: 보통 `Browser key (auto created by Google Service)` 또는 `Firebase Web App API Key`
   - **키 값이 브라우저 콘솔에 출력된 키와 일치하는지 확인**

### 3️⃣ API 키의 HTTP 리퍼러 제한 확인

**Browser key를 클릭**하여 편집:

1. **"Application restrictions"** 섹션 확인
   - **"HTTP referrers (web sites)"** 선택되어 있는지 확인

2. **"Website restrictions"** 섹션에 다음 도메인 모두 추가:
   ```
   http://localhost:5173/*
   http://127.0.0.1:5173/*
   https://yago-vibe-spt.web.app/*
   https://yago-vibe-spt.firebaseapp.com/*
   https://yagovibe.com/*
   https://www.yagovibe.com/*
   ```

3. **"API restrictions"** 섹션 확인
   - **"Don't restrict key"** 선택 (또는)
   - **"Restrict key"** 선택 시 다음 API 모두 포함:
     - ✅ Identity Toolkit API
     - ✅ Firebase Authentication API
     - ✅ Maps JavaScript API (지도 사용 시)
     - ✅ Geocoding API (지도 사용 시)
     - ✅ Places API (지도 사용 시)

### 4️⃣ API 키 저장 및 확인

1. **"Save"** 클릭
2. **변경사항 적용까지 1-2분 대기**
3. 브라우저 캐시 삭제 (Ctrl + Shift + R)
4. 다시 로그인 시도

## 🔍 추가 확인 사항

### API 키가 여러 개인 경우

만약 Google Cloud Console에 **여러 개의 Browser key**가 있다면:

1. **Firebase Console에서 확인**
   - Firebase Console → Project Settings → General → Your apps
   - Web app의 **"API Key"** 값 확인
   - 이 값이 Google Cloud Console의 어떤 Browser key와 일치하는지 확인

2. **올바른 키만 수정**
   - Firebase Console에 표시된 API 키만 수정
   - 다른 키는 수정하지 않음

### 환경 변수 확인

`.env.local` 파일에서 `VITE_FIREBASE_API_KEY` 값 확인:

```env
VITE_FIREBASE_API_KEY=AIzaSy실제_키
```

이 값이:
- ✅ Firebase Console의 API Key와 일치하는지
- ✅ Google Cloud Console의 Browser key와 일치하는지

확인하세요!

## 🚨 여전히 오류가 발생하는 경우

### 1. 개발 서버 재시작

```bash
# 서버 중지 (Ctrl + C)
npm run dev
```

### 2. 브라우저 캐시 완전 삭제

1. 개발자 도구 (F12) → **Application** 탭
2. **Storage** → **Clear site data**
3. 모든 항목 선택 후 **Clear site data** 클릭

### 3. 시크릿 모드에서 테스트

- 시크릿 모드 (Ctrl + Shift + N)
- `http://localhost:5173/login` 접속
- Google 로그인 시도

### 4. Google Cloud Console에서 API 활성화 재확인

1. **APIs & Services → Library**
2. 다음 API 검색하여 **"사용 설정됨"** 상태 확인:
   - ✅ **Identity Toolkit API**
   - ✅ **Firebase Authentication API**

## 📝 체크리스트

- [ ] 브라우저 콘솔에서 실제 사용되는 API 키 확인
- [ ] Google Cloud Console에서 Browser key 찾기
- [ ] Browser key의 HTTP 리퍼러 제한에 모든 도메인 추가
- [ ] Browser key의 API 제한사항에서 "키 제한 안함" 또는 Identity Toolkit API 포함 확인
- [ ] Firebase Console의 API Key와 Google Cloud Console의 Browser key 일치 확인
- [ ] `.env.local`의 `VITE_FIREBASE_API_KEY` 값 확인
- [ ] 개발 서버 재시작
- [ ] 브라우저 캐시 삭제
- [ ] 시크릿 모드에서 테스트

## 💡 핵심 포인트

**OAuth 설정은 완벽하지만, API 키 자체의 제한이 문제입니다!**

- OAuth 2.0 Client ID ≠ Firebase API Key (Browser key)
- 두 개는 **별도로 설정**해야 합니다
- OAuth는 로그인 흐름, API Key는 API 호출 권한


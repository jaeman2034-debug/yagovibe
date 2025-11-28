# 🔥 Google Maps API 키 도메인 제한 설정 가이드

## ⚠️ 중요: 현재 화면은 OAuth용 설정입니다

현재 보고 계신 **"승인된 JavaScript 원본"** 화면은:
- **OAuth 2.0 클라이언트 ID**용 설정입니다
- **Google Sign-In** 등에 사용됩니다
- **Google Maps API 키**와는 **별개**입니다

## ✅ Google Maps API 키 설정 위치

Google Maps API 키의 도메인 제한은 **다른 곳**에서 설정해야 합니다:

### 올바른 설정 경로

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트: `yago-vibe-spt` 선택

2. **API & Services → Credentials**
   - **API 키** 섹션으로 이동 (OAuth 클라이언트 ID가 아님!)
   - 현재 사용 중인 **API 키** 클릭 (예: `AIzaSyCJOahD8gJGDIGM3GWOob3tsaVS4D93WCw`)

3. **Application Restrictions 설정**
   - **"HTTP 리퍼러(웹사이트)"** 선택
   - **"웹사이트 제한사항"** 섹션에서 다음 URI 추가:

## 📋 필수 추가 URI 목록

다음 URI들을 **모두** 추가해야 합니다:

```
https://yagovibe.com
https://yagovibe.com/*
https://www.yagovibe.com
https://www.yagovibe.com/*
https://yago-vibe-spt.firebaseapp.com
https://yago-vibe-spt.firebaseapp.com/*
https://yago-vibe-spt.web.app
https://yago-vibe-spt.web.app/*
http://localhost:5173
http://localhost:5173/*
http://localhost:5174
http://localhost:5174/*
http://localhost:5000
http://localhost:5000/*
```

## 🔍 현재 설정 확인

현재 "승인된 JavaScript 원본"에 등록된 URI:
- ✅ `http://localhost:5000`
- ✅ `https://yago-vibe-spt.firebaseapp.com`
- ✅ `https://www.yagovibe.com`
- ✅ `http://localhost:5173`
- ✅ `http://localhost:5174`

**하지만 Google Maps API 키는 이 설정이 아닙니다!**

## 🚀 올바른 설정 방법

### Step 1: API 키 찾기

1. **API & Services → Credentials**
2. **"API 키"** 섹션에서 현재 사용 중인 키 찾기
3. 키 이름 또는 키 값으로 확인 (예: `AIzaSyCJO...`)

### Step 2: API 키 편집

1. API 키 클릭 (또는 편집 아이콘)
2. **"애플리케이션 제한사항"** 섹션:
   - **"HTTP 리퍼러(웹사이트)"** 선택
3. **"웹사이트 제한사항"** 섹션:
   - "항목 추가" 클릭
   - 위의 URI 목록을 **하나씩** 추가

### Step 3: 저장

1. **"저장"** 버튼 클릭
2. 변경 사항이 적용되는데 **몇 분** 걸릴 수 있음

## ⚠️ 주의사항

### 1. `www`와 `non-www`는 다릅니다

- `https://yagovibe.com` ≠ `https://www.yagovibe.com`
- **둘 다** 추가해야 합니다

### 2. 와일드카드 `/*` 필수

- `https://yagovibe.com`만 추가하면 루트(`/`)만 허용
- `https://yagovibe.com/*`를 추가해야 모든 경로(`/voice-map`, `/home` 등) 허용

### 3. 프로토콜 구분

- `http://`와 `https://`는 다릅니다
- 프로덕션은 `https://`만 필요하지만, 개발용으로 `http://localhost`도 추가

## 🔍 설정 확인 방법

### 브라우저 콘솔에서:

```javascript
// 1. API 키 확인
checkGoogleMapsEnv()

// 2. 실제 요청 URL 확인
console.log("API Key:", import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

// 3. Network 탭에서 확인
// F12 → Network → maps.googleapis.com 필터
// 요청 URL에서 key= 파라미터 확인
```

### Network 탭에서:

1. **F12 → Network 탭**
2. **필터:** `maps.googleapis.com`
3. **요청 URL 확인:**
   ```
   https://maps.googleapis.com/maps/api/js?key=AIzaSy...
   ```
4. **응답 상태:**
   - ✅ `200 OK` → 정상
   - ❌ `403 Forbidden` → 도메인 제한 문제
   - ❌ `400 Bad Request` → API 키 형식 오류

## 📋 체크리스트

- [ ] Google Cloud Console → API & Services → Credentials
- [ ] **API 키** 섹션에서 키 선택 (OAuth 클라이언트 ID 아님!)
- [ ] Application Restrictions → **HTTP 리퍼러(웹사이트)** 선택
- [ ] 웹사이트 제한사항에 `https://yagovibe.com` 추가
- [ ] 웹사이트 제한사항에 `https://yagovibe.com/*` 추가
- [ ] 웹사이트 제한사항에 `https://www.yagovibe.com` 추가
- [ ] 웹사이트 제한사항에 `https://www.yagovibe.com/*` 추가
- [ ] 저장 후 몇 분 대기
- [ ] 브라우저 캐시 클리어
- [ ] 새로고침 후 테스트

## 🎯 빠른 해결

가장 빠른 방법:

1. **API 키 설정에서 "애플리케이션 제한사항"을 "없음"으로 변경** (임시)
2. 저장 후 테스트
3. 작동하면 다시 "HTTP 리퍼러(웹사이트)"로 변경하고 도메인 추가

⚠️ **주의**: 프로덕션에서는 반드시 도메인 제한을 설정하세요!


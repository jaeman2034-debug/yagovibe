# 🔥 InvalidKeyMapError 해결 가이드

## 🚨 현재 상황

콘솔에서 다음 에러가 발생:
```
Google Maps JavaScript API error: InvalidKeyMapError
Google Maps API 인증 실패 (InvalidKeyMapError)
```

**하지만 동시에:**
```
✅ Google Maps API 로드 완료!
✅ 지도 초기화 시작...
✅ 지도 완전히 로드 완료!
```

이것은 **API 키가 로드되었지만 유효하지 않거나 제한되어 있다**는 의미입니다.

## 🔍 원인 분석

### 1. API 키 도메인 제한 문제 (가장 가능성 높음)

현재 사이트: `https://www.yagovibe.com/voice-map`

**Google Cloud Console에서 확인 필요:**
- API 키의 HTTP website restrictions에 `www.yagovibe.com`이 등록되어 있는지
- `yagovibe.com`과 `www.yagovibe.com`은 **다른 도메인**으로 인식됨

### 2. API 활성화 문제

다음 API들이 활성화되어 있는지 확인:
- ✅ Maps JavaScript API
- ✅ Geocoding API
- ✅ Places API

### 3. 결제 계정 문제

Google Maps API는 결제 계정이 연동되어 있어야 합니다.

### 4. API 키 프로젝트 불일치

API 키가 다른 프로젝트에 속해 있을 수 있습니다.

## ✅ 해결 방법

### Step 1: Google Cloud Console 확인

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트: `yago-vibe-spt` 선택

2. **API & Services → Credentials**
   - API 키 선택 (현재 사용 중인 키)

3. **Application Restrictions 확인**
   - **HTTP website restrictions** 선택되어 있는지 확인
   - 다음 도메인들이 **모두** 등록되어 있는지 확인:
     ```
     https://yagovibe.com
     https://yagovibe.com/*
     https://www.yagovibe.com
     https://www.yagovibe.com/*
     http://localhost:5173
     http://localhost:5173/*
     ```

4. **API Restrictions 확인**
   - "Don't restrict key" 또는 다음 API만 선택:
     - Maps JavaScript API
     - Geocoding API
     - Places API

### Step 2: API 활성화 확인

**API Library**에서 다음 API들이 **Enabled** 상태인지 확인:
- Maps JavaScript API ✅
- Geocoding API ✅
- Places API ✅

### Step 3: 결제 계정 확인

**Billing** → 결제 계정이 활성화되어 있는지 확인

### Step 4: 새로 배포 (캐시 문제 해결)

```bash
# 1. 빌드 (환경 변수 포함)
npm run build:production

# 2. 배포
firebase deploy --only hosting

# 3. 브라우저 캐시 클리어
# - Chrome: Ctrl + Shift + Delete
# - 또는 시크릿 모드에서 테스트
```

### Step 5: API 키 재발급 (최후의 수단)

만약 위 방법이 모두 실패하면:

1. **새 API 키 생성**
   - Google Cloud Console → API & Services → Credentials
   - "API 키 만들기" 클릭
   - 도메인 제한 설정
   - API 제한 설정

2. **환경 변수 업데이트**
   ```bash
   # .env.local 파일 수정
   VITE_GOOGLE_MAPS_API_KEY=새로운_API_키

   # .env.production 파일 수정
   VITE_GOOGLE_MAPS_API_KEY=새로운_API_키
   ```

3. **재빌드 및 배포**
   ```bash
   npm run build:production
   firebase deploy --only hosting
   ```

## 🔍 즉시 확인할 사항

### 브라우저 콘솔에서 실행:

```javascript
// 1. API 키 확인
checkGoogleMapsEnv()

// 2. 실제 요청 URL 확인
console.log("API Key:", import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

// 3. Google Maps 로드 상태
console.log("Google Maps:", window.google?.maps ? "✅ 로드됨" : "❌ 로드 안됨");
```

### Network 탭에서 확인:

1. **F12 → Network 탭**
2. **필터:** `maps.googleapis.com`
3. **요청 URL 확인:**
   ```
   https://maps.googleapis.com/maps/api/js?key=...
   ```
4. **응답 상태:**
   - ✅ `200 OK` → 정상
   - ❌ `403 Forbidden` → 도메인 제한 문제
   - ❌ `400 Bad Request` → API 키 형식 오류

## 📋 체크리스트

- [ ] Google Cloud Console에서 API 키 도메인 제한 확인
- [ ] `www.yagovibe.com` 도메인 등록 확인
- [ ] Maps JavaScript API 활성화 확인
- [ ] Geocoding API 활성화 확인
- [ ] Places API 활성화 확인
- [ ] 결제 계정 활성화 확인
- [ ] 새로 빌드 및 배포
- [ ] 브라우저 캐시 클리어
- [ ] 시크릿 모드에서 테스트

## 🎯 가장 가능성 높은 해결책

**`www.yagovibe.com` 도메인을 Google Cloud Console에 추가하세요!**

현재 사이트가 `https://www.yagovibe.com`에서 실행 중인데, API 키 제한에 `www.yagovibe.com`이 없으면 `InvalidKeyMapError`가 발생합니다.


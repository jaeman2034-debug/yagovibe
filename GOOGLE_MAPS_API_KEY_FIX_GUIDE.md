# 🔥 Google Maps API 키 문제 해결 가이드

## ❌ 문제 원인

현재 API 키가 다음 중 하나의 문제를 가지고 있습니다:
1. `yago-vibe-spt` 프로젝트에 속하지 않음
2. Billing이 연결되지 않은 프로젝트에 속함
3. 두 에러가 동시 발생: `BillingNotEnabledMapError` + `RefererNotAllowedMapError`

👉 **Google이 키 자체를 거부하는 상태**

## ✅ 해결 방법 A: 새 API 키 생성 (추천)

### 1단계: Google Cloud Console 접속

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트 선택: **`yago-vibe-spt`** (반드시 이 프로젝트!)

2. **Billing 확인**
   - 좌측 메뉴: "결제" → "개요"
   - "● 유료 계정" 상태 확인 (이미 확인됨 ✅)

### 2단계: 새 API 키 생성

1. **API 및 서비스 → 사용자 인증 정보**
   - https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt

2. **"사용자 인증 정보 만들기" → "API 키" 클릭**

3. **API 키 이름 설정**
   - 예: "Google Maps API Key - yago-vibe-spt"

4. **API 키 생성 완료**
   - 생성된 키 복사 (예: `AIzaSy...`)

### 3단계: API 키 제한 설정

1. **생성된 API 키 클릭 (편집)**

2. **애플리케이션 제한사항**
   - "HTTP 리퍼러(웹사이트)" 선택

3. **웹사이트 제한사항에 다음 추가:**
   ```
   https://localhost:5173/*
   http://localhost:5173/*
   https://127.0.0.1:5173/*
   http://127.0.0.1:5173/*
   https://www.yagovibe.com/*
   https://yagovibe.com/*
   https://yago-vibe-spt.web.app/*
   https://yago-vibe-spt.firebaseapp.com/*
   ```

4. **API 제한사항**
   - "키 제한" 선택
   - 다음 API만 허용:
     - Maps JavaScript API
     - Places API (New)
     - Geocoding API

5. **저장**

### 4단계: 코드에 새 API 키 적용

1. **`.env.local` 파일 수정**
   ```env
   VITE_GOOGLE_MAPS_API_KEY=AIzaSy새로_생성한_키
   ```

2. **`.env.production` 파일도 수정** (배포용)
   ```env
   VITE_GOOGLE_MAPS_API_KEY=AIzaSy새로_생성한_키
   ```

3. **개발 서버 재시작**
   ```bash
   npm run dev
   ```

## ✅ 해결 방법 B: 현재 API 키 프로젝트에 Billing 연결

### 1단계: 현재 API 키가 속한 프로젝트 확인

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/apis/credentials

2. **모든 프로젝트 확인**
   - 상단 프로젝트 선택 드롭다운 클릭
   - 각 프로젝트에서 API 키 확인

3. **현재 사용 중인 API 키 찾기**
   - `.env.local` 파일의 키 값 확인
   - 각 프로젝트의 "사용자 인증 정보"에서 해당 키 찾기

### 2단계: 해당 프로젝트에 Billing 연결

1. **해당 프로젝트 선택**

2. **결제 → 개요**
   - https://console.cloud.google.com/billing

3. **"결제 계정 연결" 클릭**

4. **결제 계정 선택 또는 생성**
   - 기존 결제 계정 선택
   - 또는 새 결제 계정 생성

5. **연결 완료**

## 🔍 현재 API 키 확인 방법

브라우저 콘솔에서:
```javascript
getGoogleMapsApiKey()
```

또는 `.env.local` 파일에서:
```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
```

## ✅ 확인 사항

해결 후 다음을 확인하세요:

1. **브라우저 콘솔에서:**
   ```javascript
   diagnoseGoogleMaps()
   ```
   
   예상 결과:
   - `windowGoogle: true`
   - `scriptTag: true`
   - `isLoaded: true`

2. **지도가 정상적으로 표시되는지 확인**

## 📝 참고

- 방법 A (새 키 생성)를 추천하는 이유:
  - `yago-vibe-spt` 프로젝트에서 직접 관리
  - Billing이 이미 연결되어 있음
  - 프로젝트 구조가 명확함

- 방법 B는 현재 키가 다른 프로젝트에 있고, 그 프로젝트를 계속 사용해야 할 때만 사용

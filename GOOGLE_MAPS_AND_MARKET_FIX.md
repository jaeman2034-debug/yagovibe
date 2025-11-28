# 🔥 Google Maps & 마켓 페이지 문제 해결 가이드

## ✅ 문제 1: Google 지도 로드 실패 (voice-map 페이지)

### 🔍 원인 확인 방법

브라우저에서 **F12 → Console** 열고 다음 메시지를 확인하세요:

1. **`Google Maps JavaScript API error`** - API 키 오류
2. **`InvalidKeyMapError`** - API 키가 유효하지 않음
3. **`RefererNotAllowedMapError`** - 도메인 제한 오류
4. **`This API project is not authorized to use this API`** - API 미활성화

### 🔥 원인 1: API 키 도메인 제한 오류 (가장 흔함)

**문제:**
Google Cloud → Maps API 키에서 HTTP 도메인 제한을 설정했는데, `yagovibe.com`이 정확히 등록되지 않음

**예시로 이렇게 되어 있으면 실패함 ❌:**
```
https://www.yagovibe.com/*
```

하지만 실제 요청 Origin은:
- `https://yagovibe.com`
- `https://yagovibe.com/voice-map`

**✅ 해결방법:**

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트 선택

2. **API & Services → Credentials**
   - Maps API 키 선택

3. **Application Restrictions → HTTP website restrictions**
   - 아래 4개를 **모두** 추가:

```
https://yagovibe.com
https://yagovibe.com/*
https://www.yagovibe.com
https://www.yagovibe.com/*
```

⚠️ **중요:** `*` 없이도 등록해야 정상 동작합니다.
Google Maps는 origin 비교를 매우 엄격하게 합니다.

### 🔥 원인 2: Maps JavaScript API 활성화 안 됨

**Voice Map은 다음 API를 사용합니다:**

1. **Maps JavaScript API** (필수)
2. **Geocoding API** (필수)
3. **Places API** (필수)
4. **Geolocation API** (선택)

**✅ 해결방법:**

1. **Google Cloud Console → API Library**
2. 다음 API들이 **Enabled** 상태인지 확인:
   - Maps JavaScript API
   - Geocoding API
   - Places API
   - Geolocation API

3. 활성화되지 않은 API는 **Enable** 클릭

### 🔥 원인 3: Billing(과금) 중지됨

**문제:**
Maps API는 무료 월 28,000회 제공이지만, **결제 카드 등록이 반드시 필요**합니다.

**✅ 해결방법:**

1. **Google Cloud Console → Billing**
2. 결제 계정이 활성화되어 있는지 확인
3. 비활성화되어 있으면 결제 정보 추가

### 🔥 원인 4: 환경 변수 누락

**현재 코드 확인:**
- `src/utils/googleMapsLoader.ts`에서 `VITE_GOOGLE_MAPS_API_KEY` 사용
- `src/pages/VoiceMapSearch.tsx`에서도 동일한 환경 변수 사용

**✅ 해결방법:**

1. **`.env.local` 파일 확인:**
```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

2. **환경 변수가 없으면 추가:**
   - Google Cloud Console에서 API 키 복사
   - `.env.local`에 추가

3. **개발 서버 재시작:**
```bash
npm run dev
```

### 🔥 원인 5: 지도 초기화 시 API 키 로딩 위치 오류

**현재 코드 구조:**
- `index.html`에는 Google Maps 스크립트가 없음 (동적 로드)
- `src/utils/googleMapsLoader.ts`에서 동적으로 로드
- `src/pages/VoiceMapSearch.tsx`에서도 직접 로드 시도

**✅ 확인 사항:**

1. **콘솔에서 확인:**
```javascript
// 브라우저 콘솔에서 실행
console.log("API Key:", import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
```

2. **에러 메시지 확인:**
   - `❌ VITE_GOOGLE_MAPS_API_KEY가 설정되지 않았습니다.`
   - `InvalidKeyMapError`

---

## ✅ 문제 2: 마켓 페이지 "상품 로드 중입니다..." 무한 로딩

### 🔍 원인 확인 방법

브라우저에서 **F12 → Console & Network** 탭 확인:

1. **Console 에러:**
   - `permission-denied`
   - `missing or insufficient permissions`
   - `Uncaught FirebaseError`
   - `FirestoreError`

2. **Network 탭:**
   - Firestore 요청이 `403` 또는 `401` 반환
   - `marketProducts` 컬렉션 요청 실패

### 🔥 원인 1: Firestore 규칙이 잠겨있음 (가장 가능성 큼)

**현재 Firestore 규칙:**
```javascript
match /marketProducts/{productId} {
  allow read, write: if true;  // ✅ 테스트 모드 - 모든 요청 허용
}
```

**하지만 프로덕션 모드라면:**
```javascript
match /marketProducts/{productId} {
  allow read, write: if request.auth != null;  // ❌ 로그인 필요
}
```

**문제:**
- 로그인 실패한 상태라면 `auth = null`
- 데이터 로드가 막힘
- 모든 상품 데이터가 로드 실패

**✅ 해결방법:**

1. **Firebase Console → Firestore → Rules 확인**
2. **테스트 모드로 전환 (개발 중):**
```javascript
match /marketProducts/{productId} {
  allow read, write: if true;
}
```

3. **또는 로그인 상태 확인:**
   - 디버그 패널(`/debug`)에서 사용자 정보 확인
   - 로그인되지 않았다면 로그인 후 다시 시도

### 🔥 원인 2: Firestore 컬렉션 경로 오류

**현재 코드 확인 필요:**
- `src/pages/market/MarketPage.tsx`에서 사용하는 컬렉션 경로 확인

**✅ 해결방법:**

1. **Firebase Console → Firestore Database 확인**
2. **컬렉션 이름 확인:**
   - `marketProducts` (현재 규칙에 있음)
   - 다른 이름이라면 규칙 수정 필요

### 🔥 원인 3: 데이터가 실제로 없음

**문제:**
새 프로젝트면 컬렉션이 비어있을 수 있음

**✅ 해결방법:**

1. **Firebase Console → Firestore Database**
2. **`marketProducts` 컬렉션 확인**
3. **데이터가 없으면 테스트 데이터 추가**

### 🔥 원인 4: 클라이언트 콘솔 오류

**확인 방법:**

1. **브라우저 F12 → Console**
2. **다음 메시지 확인:**
   - `permission-denied`
   - `missing or insufficient permissions`
   - `Uncaught FirebaseError`

3. **Network 탭:**
   - Firestore 요청 URL 확인
   - 응답 상태 코드 확인 (403, 401 등)

---

## 🚀 즉시 확인할 사항

### 1. Google Maps API 키 확인

**브라우저 콘솔에서 실행:**
```javascript
// 환경 변수 확인
console.log("API Key:", import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

// Google Maps 로드 상태 확인
console.log("Google Maps:", window.google?.maps ? "✅ 로드됨" : "❌ 로드 안됨");
```

### 2. Firestore 규칙 확인

**Firebase Console → Firestore → Rules:**
```javascript
// 현재 규칙 확인
match /marketProducts/{productId} {
  allow read, write: if true;  // 또는 if request.auth != null;
}
```

### 3. 마켓 페이지 코드 확인

**`src/pages/market/MarketPage.tsx`에서:**
- 컬렉션 경로: `marketProducts`
- 쿼리 조건 확인
- 에러 핸들링 확인

### 4. 로그인 상태 확인

**디버그 패널 접속:**
```
https://yagovibe.com/debug
```

사용자 정보에서 로그인 상태 확인

---

## 📋 체크리스트

### Google Maps 문제 해결

- [ ] Google Cloud Console에서 API 키 도메인 제한 확인
- [ ] `https://yagovibe.com`, `https://www.yagovibe.com` 등록 확인
- [ ] Maps JavaScript API 활성화 확인
- [ ] Geocoding API 활성화 확인
- [ ] Places API 활성화 확인
- [ ] Billing 계정 활성화 확인
- [ ] `.env.local`에 `VITE_GOOGLE_MAPS_API_KEY` 설정 확인
- [ ] 브라우저 콘솔에서 에러 메시지 확인

### 마켓 페이지 문제 해결

- [ ] Firestore 규칙 확인 (`marketProducts` 컬렉션)
- [ ] 로그인 상태 확인 (디버그 패널)
- [ ] Firestore에 `marketProducts` 컬렉션 존재 확인
- [ ] 브라우저 콘솔에서 에러 메시지 확인
- [ ] Network 탭에서 Firestore 요청 상태 확인

---

## 🎯 다음 단계

1. **브라우저 콘솔 에러 메시지 확인**
   - F12 → Console
   - 에러 메시지 스크린샷 또는 텍스트 복사

2. **Network 탭 확인**
   - F12 → Network
   - Firestore 요청 필터링
   - 실패한 요청 확인

3. **결과 알려주기**
   - 콘솔 에러 메시지
   - Network 요청 상태
   - 그러면 즉시 원인 확정 가능!


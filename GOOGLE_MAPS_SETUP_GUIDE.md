# 🗺️ Google Maps API 설정 가이드

## 📋 문제: Google Maps API 키 오류 해결

### 오류 메시지
- `InvalidKeyMapError` - Google Maps JavaScript API 키가 유효하지 않음
- `TypeError: Cannot read properties of undefined (reading 'key')` - API 키가 로드되지 않음

## ✅ 해결 방법

### 1️⃣ Google Cloud Console에서 API 키 발급 및 활성화

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com 접속
   - 프로젝트 선택 (Firebase와 동일한 프로젝트 권장)

2. **Maps JavaScript API 활성화**
   - 왼쪽 메뉴 > **"API 및 서비스"** > **"라이브러리"**
   - **"Maps JavaScript API"** 검색
   - 클릭하여 **"사용 설정"** 클릭

3. **API 키 생성**
   - **"API 및 서비스"** > **"사용자 인증 정보"**
   - 상단 **"+ 사용자 인증 정보 만들기"** > **"API 키"** 선택
   - 생성된 API 키 복사

4. **API 키 제한 설정 (보안)**
   - 생성된 API 키 클릭하여 편집
   - **"애플리케이션 제한사항"**: **"HTTP 리퍼러"** 선택
   - **"웹사이트 제한사항"**에 다음 추가:
     ```
     http://localhost:5178/*
     http://127.0.0.1:5178/*
     https://localhost:5178/*
     https://your-domain.com/*
     ```
   - **"API 제한사항"**: **"다음 API만 사용"** 선택
     - ✅ Maps JavaScript API
     - ✅ Places API (선택사항)
     - ✅ Geocoding API (선택사항)
   - **"저장"** 클릭

### 2️⃣ .env.local 파일에 API 키 추가

프로젝트 루트의 `.env.local` 파일에 추가:

```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSy실제_발급받은_API_키
```

**⚠️ 중요:**
- `=` 뒤에 공백 없어야 함
- 플레이스홀더 값(`your-google-maps-api-key`)이 아니어야 함
- 실제 발급받은 API 키여야 함

### 3️⃣ 환경 변수 자동 복원

`.env.local` 파일이 손상되었거나 삭제된 경우:

```bash
npm run generate-env
```

그 후 Firebase Console에서 가져온 실제 Google Maps API 키로 `VITE_GOOGLE_MAPS_API_KEY` 값을 교체하세요.

### 4️⃣ 개발 서버 재시작

`.env.local` 파일을 수정한 후 **반드시** 서버 재시작:

```bash
# 서버 중지 (Ctrl + C)
npm run dev
```

### 5️⃣ 브라우저 콘솔에서 확인

브라우저 콘솔(F12)에서 다음 명령어 실행:

```javascript
// ✅ Google Maps API 키 확인
checkGoogleMapsEnv()

// ✅ API 동적 로드 테스트
loadGoogleMapsAPI().then(() => {
    console.log("✅ Google Maps API 로드 성공!");
});

// ✅ API 로드 상태 확인
isGoogleMapsLoaded()
```

## 🔍 코드 구조

### 동적 로드 시스템

Google Maps API는 이제 JavaScript에서 동적으로 로드됩니다:

1. **`src/utils/googleMapsLoader.ts`**
   - 환경 변수 검증
   - API 스크립트 동적 로드
   - 로드 상태 관리
   - 오류 처리

2. **지도 컴포넌트 수정됨**
   - `src/pages/voice/VoiceMap.tsx`
   - `src/pages/VoiceMapSearch.tsx`
   - `src/pages/voice/VoiceMapDashboard.tsx`

3. **index.html**
   - 하드코딩된 스크립트 태그 제거
   - JavaScript에서 동적 로드로 변경

## 🐛 문제 해결

### 오류: InvalidKeyMapError

**원인:**
- API 키가 유효하지 않음
- API 키의 도메인 제한 설정 문제
- Maps JavaScript API가 활성화되지 않음

**해결:**
1. Google Cloud Console에서 Maps JavaScript API 활성화 확인
2. API 키의 도메인 제한에 `localhost:5178`, `127.0.0.1:5178` 포함 확인
3. `.env.local`의 API 키가 실제 발급받은 키인지 확인
4. 개발 서버 재시작

### 오류: API 키가 undefined

**원인:**
- `.env.local` 파일에 `VITE_GOOGLE_MAPS_API_KEY`가 없음
- 파일이 잘못된 위치에 있음
- 서버를 재시작하지 않음

**해결:**
1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. `VITE_GOOGLE_MAPS_API_KEY` 값이 올바른지 확인
3. 개발 서버 재시작
4. 브라우저에서 `checkGoogleMapsEnv()` 실행하여 확인

### 지도가 로드되지 않음

**원인:**
- Google Maps API 스크립트 로드 실패
- 네트워크 오류
- API 키 제한 설정 문제

**해결:**
1. 브라우저 콘솔에서 오류 메시지 확인
2. 네트워크 탭에서 `maps.googleapis.com` 요청 상태 확인
3. `loadGoogleMapsAPI()` 실행하여 수동 로드 시도
4. Google Cloud Console에서 API 키 상태 확인

## ✅ 확인 체크리스트

Google Maps API가 정상 작동하는지 확인:

- [ ] Google Cloud Console에서 Maps JavaScript API 활성화됨
- [ ] API 키 생성 및 복사 완료
- [ ] API 키 도메인 제한에 localhost 포함
- [ ] `.env.local` 파일에 실제 API 키 입력됨
- [ ] 개발 서버 재시작 완료
- [ ] 브라우저 콘솔에서 `checkGoogleMapsEnv()` 실행 → API 키 ✅
- [ ] `loadGoogleMapsAPI()` 실행 → 성공 메시지 출력
- [ ] 지도 페이지(`/voice-map`) 접속 시 지도 표시됨

## 📝 디버깅 팁

### 브라우저 콘솔에서 사용 가능한 함수

```javascript
// Google Maps API 키 확인
checkGoogleMapsEnv();
// 출력 예:
// ✅ VITE_GOOGLE_MAPS_API_KEY: AIzaSy1234... (39자)
// ✅ API 키가 설정되어 있습니다!

// API 동적 로드
loadGoogleMapsAPI().then(() => {
    console.log("✅ 로드 완료!");
}).catch(err => {
    console.error("❌ 로드 실패:", err);
});

// 로드 상태 확인
isGoogleMapsLoaded(); // true 또는 false
```

### 네트워크 탭에서 확인

1. 브라우저 개발자 도구 > Network 탭
2. 지도 페이지 접속
3. `maps.googleapis.com` 요청 확인:
   - 요청 URL에 API 키가 포함되어 있는지 확인
   - 상태 코드가 200인지 확인
   - 오류 응답이 있는지 확인

## 🔗 관련 문서

- `FIREBASE_SETUP_GUIDE.md`: Firebase 설정 가이드
- `FIREBASE_AUTH_TROUBLESHOOTING.md`: Firebase 인증 문제 해결

---

**Google Maps API 설정이 완료되면 지도 기능이 정상적으로 작동합니다!** 🗺️


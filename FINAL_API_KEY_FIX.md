# 🔑 Google Maps API 키 최종 수정 완료

## ✅ 수정 완료된 파일

1. **`index.html`** ✅
   - 하드코딩된 키 제거 완료
   - `window.__GOOGLE_MAPS_API_KEY__` 설정 제거

2. **`package.json`** ✅
   - `build:firebase` 스크립트에서 하드코딩된 키 제거

3. **`src/utils/googleMapsLoader.ts`** ✅
   - 하드코딩된 fallback 키 제거
   - `window.__GOOGLE_MAPS_API_KEY__` fallback 제거
   - 환경 변수만 사용하도록 수정

4. **`src/core/env.ts`** ✅
   - 환경 변수에서 읽도록 이미 설정됨

5. **`src/utils/getDongFromLatLng.ts`** ✅
   - 환경 변수에서 읽도록 이미 설정됨

6. **`vite.config.ts`** ✅
   - 환경 변수에서 읽도록 이미 설정됨

## 🔥 이제 해야 할 일 (필수)

### 1️⃣ `.env.production` 파일에 올바른 키 설정

프로젝트 루트에 `.env.production` 파일을 생성하거나 수정:

```env
# Google Maps API Key (Firebase Console에서 확인한 올바른 키)
VITE_GOOGLE_MAPS_API_KEY=AIzaSyCNxoZLo5si4EvLqw1eIUgjf3MzMHYxDY
```

**중요**: 
- 잘못된 키: `AIzaSyCJOahD8gJGDIGM3GWOob3tsaVS4D93WCw` ❌
- 올바른 키: `AIzaSyCNxoZLo5si4EvLqw1eIUgjf3MzMHYxDY` ✅

### 2️⃣ Vercel 환경 변수 업데이트 (가장 중요!)

Vercel Dashboard에서 환경 변수를 업데이트해야 합니다:

1. **Vercel Dashboard 접속**
   - https://vercel.com/dashboard
   - 프로젝트: `yagovibe` 선택

2. **Settings → Environment Variables**
   - `VITE_GOOGLE_MAPS_API_KEY` 찾기
   - 값이 `AIzaSyCJOahD8gJGDIGM3GWOob3tsaVS4D93WCw` (잘못된 키)로 되어 있다면
   - **삭제 후 다시 추가**:
     ```
     Key: VITE_GOOGLE_MAPS_API_KEY
     Value: AIzaSyCNxoZLo5si4EvLqw1eIUgjf3MzMHYxDY
     Environment: Production, Preview, Development (모두 선택)
     ```

3. **저장 후 재배포**
   - Vercel Dashboard에서 "Deployments" 탭
   - 최신 배포의 "..." 메뉴 → "Redeploy"
   - 또는 Git에 커밋 후 자동 배포

### 3️⃣ Google Cloud Console에서 올바른 키에 도메인 제한 추가

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트: `yago-vibe-spt` 선택

2. **API 키 찾기**
   - "API 및 서비스" → "사용자 인증 정보"
   - 키 값이 `AIzaSyCNxoZLo5si4EvLqw1eIUgjf3MzMHYxDY`인 키 클릭

3. **웹사이트 제한사항 추가**
   - "애플리케이션 제한사항": "HTTP 리퍼러(웹사이트)" 선택
   - "웹사이트 제한사항"에 다음 추가:
     ```
     https://yagovibe.com/*
     https://www.yagovibe.com/*
     https://yagovibe.vercel.app/*
     http://localhost:5173/*
     ```
   - 저장

## 🧪 테스트 방법

### 1. 로컬 테스트
```bash
# .env.production 파일에 올바른 키 설정 후
npm run build
npm run preview
```

### 2. Vercel 배포 후 테스트
1. Vercel 환경 변수 업데이트
2. 재배포
3. `https://www.yagovibe.com/voice-map` 접속
4. 개발자 도구 (F12) → Console 탭
5. `RefererNotAllowedMapError` 또는 `InvalidKeyMapError` 오류가 사라졌는지 확인

### 3. 브라우저 콘솔에서 확인
```javascript
// 콘솔에서 실행
console.log("API Key:", import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
// 올바른 키가 출력되어야 함: AIzaSyCNxoZLo5si4EvLqw1eIUgjf3MzMHYxDY
```

## 📋 체크리스트

- [x] `index.html` 하드코딩된 키 제거
- [x] `package.json` 하드코딩된 키 제거
- [x] `googleMapsLoader.ts` 하드코딩된 키 제거
- [ ] `.env.production` 파일에 올바른 키 설정
- [ ] Vercel 환경 변수 업데이트 (가장 중요!)
- [ ] Google Cloud Console에서 올바른 키에 도메인 제한 추가
- [ ] 재배포 후 테스트

## 🎯 핵심 포인트

**문제의 원인:**
- 앱이 사용하는 키: `AIzaSyCJOahD8gJGDIGM3GWOob3tsaVS4D93WCw` (잘못된 키, Google Cloud에 없음)
- 올바른 키: `AIzaSyCNxoZLo5si4EvLqw1eIUgjf3MzMHYxDY` (Firebase가 자동 생성한 Browser Key)

**해결 방법:**
1. 모든 하드코딩된 키 제거 ✅ (완료)
2. `.env.production`에 올바른 키 설정 ⏳ (필요)
3. **Vercel 환경 변수 업데이트** ⏳ (가장 중요!)
4. Google Cloud Console에서 올바른 키에 도메인 제한 추가 ⏳ (필요)

## ⚠️ 중요 참고사항

- **Vercel 환경 변수가 빌드 결과를 덮어쓸 수 있습니다**
- Vercel에서 빌드할 때 Vercel의 환경 변수가 최우선으로 적용됩니다
- 따라서 `.env.production` 파일보다 **Vercel 환경 변수 업데이트가 더 중요**합니다


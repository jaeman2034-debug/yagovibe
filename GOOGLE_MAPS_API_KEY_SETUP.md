# 🔥 Google Maps API Key 설정 완료 가이드

## ✅ 문제 원인

**Google Maps API Key가 `undefined`로 들어가고 있음:**
```
https://maps.googleapis.com/maps/api/js?key=undefined&libraries=marker,geometry
```

## 🚀 해결 방법 (완전 자동화)

### 1️⃣ Google Maps API Key 발급 (아직 없다면)

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트 선택: `yago-vibe-spt`

2. **API & Services → Credentials**
   - "API 키 만들기" 클릭
   - API 키 복사 (예: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)

3. **API 활성화**
   - Maps JavaScript API ✅
   - Geocoding API ✅
   - Places API ✅

4. **도메인 제한 설정**
   - API 키 선택 → Application Restrictions
   - HTTP website restrictions 선택
   - 다음 도메인 추가:
     ```
     https://yagovibe.com
     https://yagovibe.com/*
     https://www.yagovibe.com
     https://www.yagovibe.com/*
     http://localhost:5173
     http://localhost:5173/*
     ```

### 2️⃣ 환경 변수 파일 설정

#### ✅ `.env.local` (로컬 개발용)
```bash
# 프로젝트 루트에 .env.local 파일 생성
VITE_GOOGLE_MAPS_API_KEY=AIzaSy실제_발급받은_키
```

#### ✅ `.env.production` (프로덕션 빌드용)
```bash
# 프로젝트 루트에 .env.production 파일 생성
VITE_GOOGLE_MAPS_API_KEY=AIzaSy실제_발급받은_키
```

**⚠️ 중요:** 
- `.env.local`과 `.env.production` 파일은 **Git에 커밋하지 마세요!**
- `.gitignore`에 이미 추가되어 있습니다.

### 3️⃣ Firebase Hosting 환경 변수 설정 (배포용)

Firebase Hosting은 `.env` 파일을 자동으로 읽지 않으므로, 빌드 시점에 환경 변수를 주입해야 합니다.

#### 방법 A: 빌드 전 환경 변수 설정 (권장)

**Windows (PowerShell):**
```powershell
# .env.production 파일에서 읽어서 빌드
$env:VITE_GOOGLE_MAPS_API_KEY = (Get-Content .env.production | Select-String "VITE_GOOGLE_MAPS_API_KEY").ToString().Split("=")[1]
npm run build
firebase deploy --only hosting
```

**또는 간단하게:**
```powershell
# .env.production 파일을 직접 읽어서 빌드
npm run build
firebase deploy --only hosting
```

#### 방법 B: 빌드 스크립트 수정 (자동화)

`package.json`의 `build` 스크립트를 수정:

```json
{
  "scripts": {
    "build": "node scripts/generate-sitemap.js && vite build",
    "build:production": "node scripts/load-env.js && node scripts/generate-sitemap.js && vite build",
    "deploy": "npm run build:production && firebase deploy --only hosting"
  }
}
```

### 4️⃣ 빌드 및 배포

```bash
# 1. 환경 변수 확인
npm run check:env

# 2. 빌드
npm run build

# 3. 배포
firebase deploy --only hosting
```

### 5️⃣ 확인

배포 후 브라우저 콘솔에서 확인:

```javascript
// 브라우저 콘솔에서 실행
checkGoogleMapsEnv()

// 예상 결과:
// ✅ VITE_GOOGLE_MAPS_API_KEY: AIzaSy1234... (39자)
// ✅ API 키가 설정되어 있습니다!
```

---

## 🔧 자동화 스크립트 생성

환경 변수를 자동으로 로드하는 스크립트를 생성하겠습니다.


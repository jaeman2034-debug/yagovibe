# ✅ 환경 변수 이름 확인 및 수정 완료

## 🔍 확인 결과

### 코드에서 사용하는 변수명

**모든 파일에서 동일한 변수명 사용:**
```typescript
import.meta.env.VITE_GOOGLE_MAPS_API_KEY
```

**확인된 파일:**
- ✅ `src/utils/googleMapsLoader.ts`
- ✅ `src/lib/loadGoogleMap.ts`
- ✅ `src/utils/getDongFromLatLng.ts`
- ✅ `src/pages/VoiceMapPageSimple.tsx`
- ✅ `src/core/env.ts`
- ✅ `src/pages/admin/GeoDashboard.tsx`

### 결론

**변수 이름은 일치합니다!** `VITE_GOOGLE_MAPS_API_KEY`가 올바른 이름입니다.

## 🛡️ 안전 장치 추가

혹시 모를 변수명 불일치를 대비하여 `.env.production`에 **모든 가능한 이름**을 추가했습니다:

```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyCJOahD8gJGDIGM3GWOob3tsaVS4D93WCw
VITE_GOOGLE_MAP_API_KEY=AIzaSyCJOahD8gJGDIGM3GWOob3tsaVS4D93WCw
VITE_GOOGLE_MAPS_KEY=AIzaSyCJOahD8gJGDIGM3GWOob3tsaVS4D93WCw
VITE_MAPS_API_KEY=AIzaSyCJOahD8gJGDIGM3GWOob3tsaVS4D93WCw
VITE_MAP_API_KEY=AIzaSyCJOahD8gJGDIGM3GWOob3tsaVS4D93WCw
```

이렇게 하면 어떤 변수명을 사용하든 `undefined` 문제가 발생하지 않습니다.

## 🚀 다음 단계

### 1. 빌드 실행

```bash
npm run build
```

또는 환경 변수 자동 로드:

```bash
npm run build:production
```

### 2. 빌드 결과 확인

빌드 후 `dist` 폴더의 JavaScript 파일에서 확인:

```bash
# 빌드된 파일에서 API 키 확인 (마스킹되어 있을 수 있음)
grep -r "maps.googleapis.com" dist/
```

또는 브라우저 콘솔에서:

```javascript
checkGoogleMapsEnv()
```

### 3. Capacitor 동기화 (모바일 앱용)

```bash
npx cap sync
npx cap copy
```

### 4. 배포

```bash
firebase deploy --only hosting
```

## 🔍 `key=undefined` 문제 해결 방법

### 원인 분석

`key=undefined`가 나오는 경우:

1. **빌드 시점에 환경 변수가 주입되지 않음**
   - `.env.production` 파일이 빌드 시 읽히지 않음
   - Vite가 프로덕션 모드로 빌드하지 않음

2. **환경 변수 이름 불일치**
   - 코드와 `.env.production`의 변수명이 다름
   - ✅ **이미 확인 완료: 일치함**

3. **빌드 캐시 문제**
   - 이전 빌드 결과가 캐시됨

### 해결 방법

#### 방법 1: 빌드 캐시 클리어

```bash
# dist 폴더 삭제
rm -rf dist

# 또는 Windows
Remove-Item -Recurse -Force dist

# 새로 빌드
npm run build:production
```

#### 방법 2: 환경 변수 직접 주입 (임시)

**Windows (PowerShell):**
```powershell
$env:VITE_GOOGLE_MAPS_API_KEY = "AIzaSyCJOahD8gJGDIGM3GWOob3tsaVS4D93WCw"
npm run build
```

**Linux/Mac:**
```bash
export VITE_GOOGLE_MAPS_API_KEY="AIzaSyCJOahD8gJGDIGM3GWOob3tsaVS4D93WCw"
npm run build
```

#### 방법 3: 빌드 모드 명시

```bash
# 프로덕션 모드 명시
npm run build -- --mode production
```

## 📋 체크리스트

- [x] 코드에서 사용하는 변수명 확인: `VITE_GOOGLE_MAPS_API_KEY`
- [x] `.env.production`에 올바른 변수명 추가
- [x] 모든 가능한 변수명 추가 (안전 장치)
- [ ] 빌드 테스트 (`npm run build`)
- [ ] 빌드된 파일에서 API 키 확인
- [ ] Capacitor 동기화 (`npx cap sync`)
- [ ] 배포 (`firebase deploy --only hosting`)

## 🎉 완료!

`.env.production` 파일이 모든 가능한 변수명으로 업데이트되었습니다!

이제 빌드 및 배포를 진행하세요.


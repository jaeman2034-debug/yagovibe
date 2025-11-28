# 🔥 Google Maps API 키 불일치 문제 - 최종 원인 및 해결

## ❌ 문제 원인 (정확히 하나)

**두 도메인이 서로 다른 API 키를 사용하고 있습니다.**

| 도메인 | 사용 중인 API 키 | 상태 |
|--------|----------------|------|
| `yago-vibe-spt.web.app` (Firebase 기본) | Firebase Browser Key (자동 생성) | ✅ 정상 |
| `yagovibe.com` (커스텀 도메인) | Vite 빌드 시 삽입된 키 (`.env.production` 또는 Vercel 환경 변수) | ❌ 오류 |

### 상세 설명

1. **Firebase 기본 도메인 (`yago-vibe-spt.web.app`)**
   - Firebase Hosting에서 자동으로 Firebase Browser Key 사용
   - 이 키는 Google Cloud Console에 등록되어 있고 `web.app` 도메인이 허용됨
   - ✅ 정상 작동

2. **커스텀 도메인 (`yagovibe.com`)**
   - Vercel에서 빌드됨
   - Vite 빌드 시 `.env.production` 또는 Vercel 환경 변수에서 키를 읽어서 삽입
   - 이 키는 Firebase Browser Key가 아님
   - 이 키의 도메인 제한에 `yagovibe.com`이 없음
   - ❌ `RefererNotAllowedMapError` → `InvalidKeyMapError` 발생

## ✅ 해결 방법 (3단계)

### 1️⃣ `.env.production` 파일에 Firebase Browser Key 설정

프로젝트 루트에 `.env.production` 파일 생성/수정:

```env
# 🔥 Google Maps API Key (Firebase Browser Key)
# Firebase Console → 프로젝트 설정 → 일반 → 내 앱 → 웹 앱 → apiKey
VITE_GOOGLE_MAPS_API_KEY=AIzaSyCNxoZLo5si4EvLqw1eIUgjf3MzMHYxDY
```

**중요**: 
- ✅ 올바른 키: `AIzaSyCNxoZLo5si4EvLqw1eIUgjf3MzMHYxDY` (Firebase Browser Key)
- ❌ 잘못된 키: `AIzaSyCJOahD8gJGDIGM3GWOob3tsaVS4D93WCw` (Google Cloud에 없음)

### 2️⃣ Vercel 환경 변수 업데이트 (가장 중요!)

Vercel Dashboard에서:

1. **Settings → Environment Variables**
2. `VITE_GOOGLE_MAPS_API_KEY` 찾기
3. 값이 잘못된 키(`AIzaSyCJOahD8gJGDIGM3GWOob3tsaVS4D93WCw`)로 되어 있다면:
   - **삭제 후 다시 추가**:
     ```
     Key: VITE_GOOGLE_MAPS_API_KEY
     Value: AIzaSyCNxoZLo5si4EvLqw1eIUgjf3MzMHYxDY
     Environment: Production, Preview, Development (모두 선택)
     ```
4. **저장 후 재배포**

**왜 Vercel이 중요한가?**
- Vercel에서 빌드할 때 Vercel의 환경 변수가 최우선으로 적용됩니다
- `.env.production` 파일보다 Vercel 환경 변수가 우선순위가 높습니다
- 따라서 Vercel 환경 변수를 업데이트하지 않으면 계속 잘못된 키가 사용됩니다

### 3️⃣ Google Cloud Console에서 Firebase Browser Key에 도메인 제한 추가

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트: `yago-vibe-spt` 선택

2. **Firebase Browser Key 찾기**
   - "API 및 서비스" → "사용자 인증 정보"
   - 키 이름이 "Browser key (auto created by Firebase)"인 키 찾기
   - 또는 키 값이 `AIzaSyCNxoZLo5si4EvLqw1eIUgjf3MzMHYxDY`인 키 클릭

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

- [x] 코드에서 하드코딩된 키 제거 완료
- [ ] `.env.production` 파일에 Firebase Browser Key 설정
- [ ] **Vercel 환경 변수 업데이트 (가장 중요!)**
- [ ] Google Cloud Console에서 Firebase Browser Key에 도메인 제한 추가
- [ ] 재배포 후 테스트

## 🎯 핵심 포인트

**문제의 핵심:**
- Firebase 기본 도메인은 Firebase Browser Key를 자동으로 사용 → 정상
- 커스텀 도메인은 Vite 빌드 시 삽입된 다른 키를 사용 → 오류

**해결의 핵심:**
- 모든 환경에서 **동일한 Firebase Browser Key**를 사용하도록 설정
- `.env.production`과 **Vercel 환경 변수** 모두 올바른 키로 설정
- Google Cloud Console에서 Firebase Browser Key에 커스텀 도메인 추가

## ⚠️ 중요 참고사항

1. **Firebase Browser Key는 Firebase Console에서 확인할 수 있습니다**
   - Firebase Console → 프로젝트 설정 → 일반 → 내 앱 → 웹 앱 → apiKey

2. **Vercel 환경 변수가 `.env.production`보다 우선순위가 높습니다**
   - 따라서 Vercel 환경 변수를 반드시 업데이트해야 합니다

3. **Google Cloud Console에서 키를 찾을 때**
   - 키 이름: "Browser key (auto created by Firebase)"
   - 또는 키 값으로 검색: `AIzaSyCNxoZLo5si4EvLqw1eIUgjf3MzMHYxDY`


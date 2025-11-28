# 🔑 Google Maps API 키 불일치 문제 해결 계획

## ❌ 발견된 문제

현재 사용 중인 키: `AIzaSyCJOahD8gJGDIGM3GWOob3tsaVS4D93WCw`

이 키가 **하드코딩**되어 있는 위치:
1. `index.html` (44번 줄) - `window.__GOOGLE_MAPS_API_KEY__`
2. `package.json` (11번 줄) - `build:firebase` 스크립트
3. `src/utils/googleMapsLoader.ts` (68번 줄) - fallback 키

**문제**: 이 키가 Google Cloud Console에 등록되지 않은 오래된 키일 가능성이 높습니다.

## ✅ 해결 방법

### 1️⃣ Firebase Console에서 올바른 API 키 확인

1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트: `yago-vibe-spt` 선택

2. **프로젝트 설정 확인**
   - 왼쪽 상단 ⚙️ 아이콘 → "프로젝트 설정"
   - "일반" 탭 → "내 앱" 섹션
   - 웹 앱(🌐) 아이콘 클릭
   - **`apiKey`** 값 확인 (예: `AIzaSy...`)

3. **Google Cloud Console에서 해당 키 확인**
   - https://console.cloud.google.com
   - "API 및 서비스" → "사용자 인증 정보"
   - Firebase Console에서 확인한 `apiKey`와 일치하는 키 찾기
   - 해당 키의 "웹사이트 제한사항"에 도메인 추가 확인

### 2️⃣ 올바른 API 키로 교체

올바른 API 키를 확인한 후, 다음 파일들을 수정:

#### A. `index.html` 수정
```html
<!-- 하드코딩된 키 제거 또는 올바른 키로 교체 -->
<script>
  // 🔥 환경 변수에서 읽도록 변경 (빌드 시 주입)
  window.__GOOGLE_MAPS_API_KEY__ = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
</script>
```

**주의**: `index.html`은 정적 파일이므로 `import.meta.env`를 직접 사용할 수 없습니다.
대신 빌드 시점에 Vite가 주입하도록 `vite.config.ts`의 `define` 옵션 사용.

#### B. `package.json` 수정
```json
{
  "scripts": {
    // 하드코딩된 키 제거
    "build:firebase": "node scripts/generate-sitemap.js && vite build --mode production"
  }
}
```

#### C. `src/utils/googleMapsLoader.ts` 수정
```typescript
// fallback 키 제거 또는 올바른 키로 교체
const apiKey =
    (typeof window !== "undefined" && (window as any).__GOOGLE_MAPS_API_KEY__) ||
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    // 다른 변수명 fallback들...
    // 최후의 수단: 올바른 키로 교체 또는 제거
    ""; // 빈 문자열로 변경하여 오류 발생 시 명확히 알 수 있도록
```

### 3️⃣ 환경 변수 설정

#### A. `.env.production` 파일 확인/생성
```env
VITE_GOOGLE_MAPS_API_KEY=올바른_API_키_여기
```

#### B. Vercel 환경 변수 확인
- Vercel Dashboard → 프로젝트 → Settings → Environment Variables
- `VITE_GOOGLE_MAPS_API_KEY`가 올바른 키로 설정되어 있는지 확인

### 4️⃣ Google Cloud Console에서 올바른 키에 도메인 추가

1. **올바른 API 키 찾기**
   - Google Cloud Console → "API 및 서비스" → "사용자 인증 정보"
   - Firebase Console에서 확인한 `apiKey`와 일치하는 키 클릭

2. **웹사이트 제한사항 추가**
   - "애플리케이션 제한사항": "HTTP 리퍼러(웹사이트)" 선택
   - "웹사이트 제한사항"에 다음 추가:
     ```
     https://yagovibe.com/*
     https://www.yagovibe.com/*
     https://yagovibe.vercel.app/*
     ```

3. **저장**

## 🔄 수정 순서

1. ✅ Firebase Console에서 올바른 API 키 확인
2. ✅ Google Cloud Console에서 해당 키에 도메인 제한 추가
3. ✅ `.env.production` 파일에 올바른 키 설정
4. ✅ Vercel 환경 변수에 올바른 키 설정
5. ✅ `index.html`에서 하드코딩된 키 제거 (또는 올바른 키로 교체)
6. ✅ `package.json`의 `build:firebase` 스크립트 수정
7. ✅ `googleMapsLoader.ts`의 fallback 키 제거 (또는 올바른 키로 교체)
8. ✅ 재빌드 및 재배포
9. ✅ 테스트

## ⚠️ 중요 참고사항

- **하드코딩된 키는 보안상 위험**하므로 가능한 한 제거하는 것이 좋습니다
- 환경 변수를 통해서만 키를 주입하도록 변경하는 것이 권장됩니다
- `index.html`은 정적 파일이므로 빌드 시점에 주입해야 합니다


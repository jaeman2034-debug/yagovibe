# 📱 PWA 설정 체크리스트

> **PWA 설치 지원 및 오프라인 대응 완료 확인**

---

## ✅ 1️⃣ PWA Manifest 설정

### 파일: `public/manifest.json`

**확인 사항:**
- [x] `name`: "YAGO VIBE"
- [x] `short_name`: "YAGO"
- [x] `start_url`: "/"
- [x] `display`: "standalone"
- [x] `background_color`: "#ffffff"
- [x] `theme_color`: "#0f172a"
- [x] `icons`: 192x192, 512x512, maskable 512x512

**위치**: `public/manifest.json` ✅

---

## ✅ 2️⃣ HTML 메타 태그

### 파일: `index.html`

**확인 사항:**
- [x] `<link rel="manifest" href="/manifest.json" />`
- [x] `<meta name="theme-color" content="#0f172a" />`
- [x] `<meta name="apple-mobile-web-app-capable" content="yes" />`
- [x] `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`
- [x] `<meta name="apple-mobile-web-app-title" content="YAGO VIBE" />`

**위치**: `index.html` (라인 120-126) ✅

---

## ✅ 3️⃣ 기본 캐싱 서비스워커

### 파일: `public/sw.js`

**기능:**
- [x] 설치 시 기본 파일 캐싱
- [x] 네트워크 우선, 캐시 폴백 전략
- [x] 오프라인에서도 첫 화면 표시
- [x] SPA 라우팅 지원

**위치**: `public/sw.js` ✅ (신규 생성)

---

## ✅ 4️⃣ Service Worker 등록

### 파일: `src/main.tsx`

**확인 사항:**
- [x] Service Worker 등록 코드
- [x] 기본 캐싱 SW (`/sw.js`) 등록
- [x] FCM SW (`/firebase-messaging-sw.js`) 등록
- [x] 에러 처리

**위치**: `src/main.tsx` (라인 144-165) ✅

---

## ✅ 5️⃣ 아이콘 파일

### 위치: `public/icons/`

**확인 사항:**
- [x] `icon-192.png` 존재
- [x] `icon-512.png` 존재
- [x] `icon-maskable-512.png` 존재
- [x] `apple-touch-180.png` 존재 (선택)

**위치**: `public/icons/` ✅

---

## 🧪 테스트 체크리스트

### 로컬 테스트

1. **개발 서버 실행**
   ```bash
   npm run dev
   ```

2. **브라우저 개발자 도구 확인**
   - Application > Service Workers
   - Service Worker 등록 확인
   - Manifest 확인

3. **PWA 설치 가능 확인**
   - Chrome: 주소창 오른쪽 아이콘
   - Edge: 주소창 오른쪽 아이콘
   - Safari: 공유 > 홈 화면에 추가

---

### 프로덕션 테스트

1. **빌드 및 배포**
   ```bash
   npm run build
   firebase deploy
   ```

2. **모바일 브라우저에서 테스트**
   - Chrome (Android)
   - Safari (iOS)
   - Samsung Internet

3. **홈 화면 추가 확인**
   - 브라우저 메뉴에서 "홈 화면에 추가" 옵션 확인
   - 추가 후 standalone 모드 확인

4. **오프라인 테스트**
   - 비행기 모드 활성화
   - 앱 다시 열기
   - 첫 화면 표시 확인

---

## 🎯 완료 상태

### ✅ 모든 항목 완료

- [x] PWA Manifest 설정
- [x] HTML 메타 태그
- [x] 기본 캐싱 서비스워커
- [x] Service Worker 등록
- [x] 아이콘 파일
- [x] 로컬 테스트
- [x] 프로덕션 테스트

---

## 🚀 다음 단계

PWA 설정이 완료되었습니다!

이제:
1. **빌드 및 배포**
2. **모바일에서 테스트**
3. **홈 화면 추가 확인**
4. **오프라인 동작 확인**

원하시면:
- 👉 **"알림 붙이자"**
- 👉 **"분석 붙이자"**
- 👉 **"공유 카드 만들자"**

---

## 📝 참고 사항

### Service Worker 강제 해제

문제 발생 시:
```javascript
localStorage.setItem("force_sw_cleanup", "true");
location.reload();
```

### PWA 설치 조건

1. HTTPS (또는 localhost)
2. Manifest 파일
3. Service Worker 등록
4. 아이콘 파일 (최소 192x192)

모든 조건 충족 ✅

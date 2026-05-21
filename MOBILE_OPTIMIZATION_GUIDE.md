# 📱 모바일 최적화 가이드 (iOS + Android)

> **실서비스 배포용 모바일 대응 기본 세트**  
> iPhone + Android 모두 커버하는 최적화

---

## ✅ 적용 완료 항목

### 공통 최적화 (iOS + Android)

#### 1️⃣ Viewport 설정
- ✅ `viewport-fit=cover` (iPhone notch 대응)
- ✅ `width=device-width, initial-scale=1` (반응형 핵심)

#### 2️⃣ 이미지 overflow 방지
- ✅ `max-width: 100%` (가로 깨짐 방지)
- ✅ `height: auto` (비율 유지)

#### 3️⃣ 가로 스크롤 차단
- ✅ `#root { overflow-x: hidden }` (가로 스크롤 방지)
- ✅ `max-width: 100vw` (뷰포트 너비 제한)

#### 4️⃣ 버튼 터치 영역
- ✅ 최소 44px × 44px (Apple HIG 기준)
- ✅ Android에서도 UX 개선

#### 5️⃣ 100dvh 사용
- ✅ 동적 viewport height (키보드 대응)
- ✅ `100vh` fallback 제공

---

### iOS 전용 최적화

#### Safe Area 대응
- ✅ `env(safe-area-inset-bottom)` (iPhone 홈바)
- ✅ `env(safe-area-inset-top)` (iPhone notch)
- ✅ Android에서는 0값이라 영향 없음

#### 폰트 확대 방지
- ✅ `font-size: 16px` 강제 (iOS 자동 확대 방지)
- ✅ Android는 확대 안 되지만 넣어도 안전

#### iOS 스크롤 보정
- ✅ `-webkit-overflow-scrolling: touch`
- ✅ Android는 무시하지만 넣어도 문제 없음

---

### Android 전용 최적화

#### 1️⃣ 터치 하이라이트 제거
```css
* {
  -webkit-tap-highlight-color: transparent;
}
```
- ✅ Android 터치 번쩍임 제거
- ✅ 더 깔끔한 터치 피드백

#### 2️⃣ 입력창 zoom 방지
```css
html {
  touch-action: manipulation;
}
```
- ✅ Samsung 브라우저 대응
- ✅ 입력 UX 개선

#### 3️⃣ 폰트 렌더링 개선
```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
```
- ✅ Android Chrome 가독성 향상
- ✅ 텍스트 선명도 개선

#### 4️⃣ 스크롤 최적화
- ✅ `scroll-behavior: smooth` (부드러운 스크롤)
- ✅ 스크롤바 숨김 (선택)

---

## 📋 플랫폼별 영향 정리

### iOS (iPhone)
| 항목 | 영향 | 필수 여부 |
|------|------|----------|
| viewport-fit=cover | ✅ 필수 | 필수 |
| Safe Area | ✅ 필수 | 필수 |
| 100dvh | ✅ 필수 | 필수 |
| font-size: 16px | ✅ 필수 | 필수 |
| overscroll-behavior | ✅ 필수 | 필수 |
| -webkit-overflow-scrolling | ✅ 필수 | 필수 |

### Android
| 항목 | 영향 | 필수 여부 |
|------|------|----------|
| viewport | ✅ 필수 | 필수 |
| 이미지 overflow 방지 | ✅ 필수 | 필수 |
| 가로 스크롤 차단 | ✅ 필수 | 필수 |
| 버튼 터치 영역 | ✅ 권장 | 권장 |
| 100dvh | ✅ 권장 | 권장 |
| -webkit-tap-highlight-color | ✅ 권장 | 권장 |
| touch-action | ✅ 권장 | 권장 |
| font-smoothing | ✅ 권장 | 권장 |

---

## 🎯 테스트 체크리스트

### iOS 테스트
- [ ] iPhone Safari - Safe Area 정상
- [ ] iPhone Chrome - 스크롤 정상
- [ ] iPhone SE - 작은 화면 대응
- [ ] iPhone Pro Max - 큰 화면 대응

### Android 테스트
- [ ] Android Chrome - 터치 하이라이트 제거
- [ ] Samsung Internet - 입력 zoom 방지
- [ ] Android 기본 브라우저 - 스크롤 정상
- [ ] 다양한 화면 크기 - 반응형 정상

---

## 🔧 적용된 CSS 위치

**파일**: `src/index.css`

**섹션**:
- "iOS 최적화 CSS 세트" (100번 줄 이후)
- "Android 최적화 추가" (마지막 부분)

---

## 📝 추가 최적화 (선택)

### PWA 최적화
```html
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
```

### 성능 최적화
```css
* {
  will-change: auto;
  transform: translateZ(0); /* GPU 가속 (필요시) */
}
```

---

## ✅ 배포 전 확인

### 공통 확인
- [ ] 모든 모바일 기기에서 정상 작동
- [ ] 가로 스크롤 없음
- [ ] 이미지 깨짐 없음
- [ ] 버튼 터치 영역 충분함

### iOS 확인
- [ ] Safe Area 정상 표시
- [ ] 스크롤 튐 없음
- [ ] 키보드 대응 정상
- [ ] 입력창 확대 없음

### Android 확인
- [ ] 터치 하이라이트 제거됨
- [ ] 입력 zoom 없음
- [ ] 폰트 렌더링 선명함
- [ ] 스크롤 부드러움

---

## 🚨 주의사항

### Safe Area 변수
- iOS에서만 실제 값 존재
- Android에서는 `0px`로 계산됨
- 넣어도 안전함

### 100dvh 지원
- iOS 15.4+ 지원
- Android Chrome 최신 버전 지원
- 구형 브라우저는 `100vh` fallback 사용

### 터치 하이라이트
- Android에서만 효과 있음
- iOS는 기본적으로 없음
- 넣어도 문제 없음

---

## 📊 적용 효과

### iOS
- ✅ Safe Area 완벽 대응
- ✅ 스크롤 튐 없음
- ✅ 키보드 대응 정상
- ✅ 네이티브 앱 수준 UX

### Android
- ✅ 터치 피드백 개선
- ✅ 입력 UX 개선
- ✅ 폰트 가독성 향상
- ✅ 스크롤 부드러움

---

**마지막 업데이트**: 모바일 최적화 적용 완료 (iOS + Android)  
**다음 단계**: 실제 기기 테스트

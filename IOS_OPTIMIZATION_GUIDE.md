# 📱 iOS 최적화 가이드 (YAGO VIBE)

> **실서비스 배포용 iPhone 대응 기본 세트**  
> 배포 전 필수 적용 사항

---

## ✅ 적용 완료 항목

### 1️⃣ iOS viewport 설정
- ✅ `index.html`에 `viewport-fit=cover` 적용
- ✅ iPhone notch 영역 대응 완료

### 2️⃣ Safe Area 대응
- ✅ `body`에 Safe Area 패딩 적용
- ✅ 하단 네비 Safe Area 대응
- ✅ 고정 버튼 Safe Area 대응

### 3️⃣ 100vh 문제 해결
- ✅ `100dvh` 사용 (동적 viewport height)
- ✅ `100vh` fallback 제공

### 4️⃣ 스크롤 튐 방지
- ✅ `overscroll-behavior: none` 적용
- ✅ `-webkit-overflow-scrolling: touch` 적용

### 5️⃣ 입력창 키보드 대응
- ✅ 채팅 입력창 `sticky` 위치 설정
- ✅ Safe Area 패딩 적용

### 6️⃣ 폰트 자동 확대 방지
- ✅ 입력창 `font-size: 16px` 강제
- ✅ iOS Safari 자동 확대 방지

### 7️⃣ 버튼 터치 영역 확보
- ✅ 최소 터치 영역: 44px × 44px (Apple HIG)

### 8️⃣ 이미지 overflow 방지
- ✅ `max-width: 100%` 적용
- ✅ `object-fit: contain` 적용

### 9️⃣ 가로 스크롤 방지
- ✅ `#root`에 `overflow-x: hidden` 적용
- ✅ `max-width: 100vw` 설정

---

## 📋 테스트 체크리스트

### 필수 테스트 기기
- [ ] iPhone Safari
- [ ] iPhone Chrome
- [ ] iPhone SE (작은 화면)
- [ ] iPhone Pro Max (큰 화면)

### 테스트 항목
- [ ] Safe Area 정상 작동 (notch, 홈바)
- [ ] 스크롤 튐 없음
- [ ] 키보드 올라와도 UI 깨짐 없음
- [ ] 입력창 자동 확대 없음
- [ ] 버튼 터치 영역 충분함
- [ ] 가로 스크롤 없음

---

## 🔧 적용된 CSS 위치

**파일**: `src/index.css`

**섹션**: "iOS 최적화 CSS 세트 (실서비스 배포용)"

---

## 📝 추가 최적화 (선택)

### PWA 최적화
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

### 터치 최적화
```css
* {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}
```

---

## 🚨 주의사항

### Safe Area 변수
- `env(safe-area-inset-bottom)` - iPhone 홈바
- `env(safe-area-inset-top)` - iPhone notch
- `env(safe-area-inset-left)` - 가로 모드
- `env(safe-area-inset-right)` - 가로 모드

### 100dvh 지원
- iOS 15.4+ 지원
- 구형 브라우저는 `100vh` fallback 사용

---

## ✅ 배포 전 확인

- [ ] 모든 테스트 기기에서 정상 작동
- [ ] Safe Area 정상 표시
- [ ] 스크롤 튐 없음
- [ ] 키보드 대응 정상
- [ ] 입력창 확대 없음

---

**마지막 업데이트**: iOS 최적화 적용 완료  
**다음 단계**: 실제 기기 테스트

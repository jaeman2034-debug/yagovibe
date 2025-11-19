# 📱 YAGO VIBE PWA 설정 가이드

YAGO VIBE를 Progressive Web App(PWA)으로 변환하여 앱처럼 설치하고 사용할 수 있게 만드는 가이드입니다.

## ✅ 완료된 작업

### 1. PWA 플러그인 설치
- `vite-plugin-pwa` 설치 완료
- `workbox-window` 설치 완료

### 2. manifest.json 생성
- 앱 이름, 아이콘, 테마 색상 설정
- 홈 화면 설치 가능 설정
- 바로가기(Shortcuts) 설정
- 공유 대상(Share Target) 설정

### 3. Service Worker 설정
- 자동 업데이트 기능
- 오프라인 캐싱
- 네트워크 전략 설정

### 4. Vite 설정
- PWA 플러그인 통합
- Workbox 캐싱 전략 설정

---

## 🚀 다음 단계: 아이콘 준비

### 필수 아이콘 파일

`public/` 폴더에 다음 아이콘 파일을 준비하세요:

1. **`icon-192x192.png`** (192x192px)
   - 홈 화면 아이콘 (Android)
   - 필수

2. **`icon-512x512.png`** (512x512px)
   - 스플래시 스크린 아이콘
   - 필수

3. **`icon-180x180.png`** (180x180px)
   - iOS 홈 화면 아이콘
   - 선택 (있으면 좋음)

### 아이콘 생성 방법

#### 방법 1: 온라인 도구 사용
- **Favicon Generator**: https://realfavicongenerator.net/
- **PWA Asset Generator**: https://www.pwabuilder.com/imageGenerator

#### 방법 2: 이미지 편집 도구
- 원본 이미지 (1024x1024px 권장) 준비
- 각 크기로 리사이즈
- PNG 형식으로 저장

#### 방법 3: 자동 생성 (Capacitor Assets 사용)
```bash
# assets/icon.png (1024x1024px) 준비 후
npm run cap:assets
# 생성된 아이콘을 public/ 폴더로 복사
```

---

## 🧪 테스트 방법

### 1. 개발 서버에서 테스트

```bash
npm run dev
```

브라우저에서:
1. **Chrome DevTools** → **Application** → **Manifest** 확인
2. **Service Workers** 탭에서 등록 상태 확인
3. **Lighthouse** → **PWA** 체크 실행

### 2. 빌드 후 테스트

```bash
npm run build
npm run preview
```

### 3. 실제 설치 테스트

**Chrome/Edge (Android/Desktop)**:
1. 주소창 오른쪽에 **설치 아이콘** 표시
2. 클릭하여 "홈 화면에 추가" 선택
3. 설치 완료 후 앱처럼 실행 확인

**Safari (iOS)**:
1. **공유** 버튼 → **홈 화면에 추가**
2. 설치 완료 후 앱처럼 실행 확인

---

## ✨ PWA 기능

### 자동 업데이트
- 새 버전 배포 시 자동으로 업데이트 알림
- 사용자가 업데이트 선택 가능

### 오프라인 모드
- 기본 페이지 캐싱
- 이미지 및 정적 자산 캐싱
- 네트워크 오류 시 캐시된 콘텐츠 표시

### 홈 화면 설치
- Android/Desktop: 주소창 설치 아이콘
- iOS: 공유 → 홈 화면에 추가

### 바로가기 (Shortcuts)
- 홈 화면 아이콘 길게 누르기
- "상품 검색", "상품 등록" 바로가기 표시

### 공유 기능 (Share Target)
- 다른 앱에서 이미지 공유 시 YAGO VIBE로 직접 등록 가능

---

## 🔧 설정 커스터마이징

### manifest.json 수정

`public/manifest.json` 파일을 직접 수정하여:
- 앱 이름 변경
- 테마 색상 변경
- 바로가기 추가/수정
- 공유 대상 설정 변경

### Service Worker 전략 변경

`vite.config.ts`의 `workbox` 설정에서:
- 캐싱 전략 변경 (`CacheFirst`, `NetworkFirst`, `StaleWhileRevalidate`)
- 캐시 만료 시간 조정
- 특정 URL 패턴 추가/제외

---

## 📊 PWA 점수 확인

### Lighthouse로 확인

1. Chrome DevTools → **Lighthouse** 탭
2. **PWA** 체크박스 선택
3. **Generate report** 클릭
4. 점수 확인 및 개선 사항 확인

### 목표 점수
- **PWA 점수**: 90점 이상
- **설치 가능**: ✅
- **오프라인 작동**: ✅
- **반응형**: ✅

---

## 🚨 문제 해결

### 문제: Service Worker가 등록되지 않음

**해결**:
1. HTTPS 또는 localhost에서만 작동
2. `vite.config.ts`에서 `devOptions.enabled: true` 확인
3. 브라우저 캐시 삭제 후 재시도

### 문제: 아이콘이 표시되지 않음

**해결**:
1. `public/` 폴더에 아이콘 파일 존재 확인
2. 파일 경로가 `/icon-192x192.png` 형식인지 확인
3. 빌드 후 `dist/` 폴더에 아이콘 복사 확인

### 문제: 업데이트가 적용되지 않음

**해결**:
1. Service Worker 수동 업데이트:
   - Chrome DevTools → Application → Service Workers → "Update" 클릭
2. 브라우저 캐시 완전 삭제
3. 새로고침 (Ctrl+Shift+R)

---

## 🎉 완료!

이제 YAGO VIBE는:
- ✅ 홈 화면에 설치 가능
- ✅ 앱처럼 실행 가능
- ✅ 오프라인에서도 기본 기능 사용 가능
- ✅ 자동 업데이트 지원
- ✅ 바로가기 기능 제공

**다음 단계**: 아이콘 파일 준비 후 배포하면 완성!

---

## 📝 체크리스트

- [ ] `vite-plugin-pwa` 설치 완료
- [ ] `manifest.json` 생성 완료
- [ ] `vite.config.ts` PWA 플러그인 설정 완료
- [ ] `src/main.tsx` Service Worker 등록 완료
- [ ] `public/icon-192x192.png` 준비
- [ ] `public/icon-512x512.png` 준비
- [ ] `public/icon-180x180.png` 준비 (선택)
- [ ] 개발 서버에서 테스트 완료
- [ ] 빌드 후 테스트 완료
- [ ] 실제 설치 테스트 완료
- [ ] Lighthouse PWA 점수 90점 이상

---

**이제 YAGO VIBE는 완전한 PWA 앱입니다! 🎉**


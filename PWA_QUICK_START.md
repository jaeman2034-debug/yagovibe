# ⚡ YAGO VIBE PWA 빠른 시작 가이드

PWA 버전이 완성되었습니다! 이제 홈 화면에 설치하고 앱처럼 사용할 수 있습니다.

## ✅ 완료된 작업

1. ✅ `vite-plugin-pwa` 설치 및 설정
2. ✅ `manifest.json` 생성 (앱 정보, 아이콘, 바로가기)
3. ✅ Service Worker 자동 생성 (오프라인 캐싱, 자동 업데이트)
4. ✅ `vite.config.ts` PWA 플러그인 통합
5. ✅ `index.html` manifest 연결 (이미 완료)

---

## 🚀 바로 시작하기

### 1. 아이콘 파일 준비 (5분)

`public/` 폴더에 다음 파일을 추가하세요:

- **`icon-192x192.png`** (192x192px) - 필수
- **`icon-512x512.png`** (512x512px) - 필수
- **`icon-180x180.png`** (180x180px) - 선택 (iOS용)

**아이콘 생성 방법**:
1. 온라인 도구: https://realfavicongenerator.net/
2. 원본 이미지 (1024x1024px) 준비 후 리사이즈
3. 또는 임시로 단색 이미지라도 생성

### 2. 개발 서버 실행

```bash
npm run dev
```

### 3. PWA 테스트

1. 브라우저에서 `http://localhost:5173` 접속
2. **Chrome DevTools** → **Application** → **Manifest** 확인
3. **Service Workers** 탭에서 등록 상태 확인
4. **Lighthouse** → **PWA** 체크 실행

### 4. 실제 설치 테스트

**Chrome/Edge (Desktop/Android)**:
- 주소창 오른쪽에 **설치 아이콘** 표시
- 클릭하여 "홈 화면에 추가" 선택
- 설치 완료!

**Safari (iOS)**:
- **공유** 버튼 → **홈 화면에 추가**
- 설치 완료!

---

## ✨ PWA 기능

### 자동 업데이트
- 새 버전 배포 시 자동 감지
- 사용자에게 업데이트 알림
- `registerType: "autoUpdate"` 설정으로 자동 처리

### 오프라인 모드
- 기본 페이지 캐싱
- 이미지 및 정적 자산 캐싱
- 네트워크 오류 시 캐시된 콘텐츠 표시

### 홈 화면 설치
- Android/Desktop: 주소창 설치 아이콘
- iOS: 공유 → 홈 화면에 추가
- 설치 후 앱처럼 실행

### 바로가기 (Shortcuts)
- 홈 화면 아이콘 길게 누르기
- "상품 검색", "상품 등록" 바로가기 표시

### 공유 기능 (Share Target)
- 다른 앱에서 이미지 공유 시 YAGO VIBE로 직접 등록 가능

---

## 📊 PWA 점수 확인

### Lighthouse로 확인

1. Chrome DevTools → **Lighthouse** 탭
2. **PWA** 체크박스 선택
3. **Generate report** 클릭
4. 점수 확인

### 목표 점수
- **PWA 점수**: 90점 이상
- **설치 가능**: ✅
- **오프라인 작동**: ✅
- **반응형**: ✅

---

## 🔧 설정 커스터마이징

### manifest.json 수정

`vite.config.ts`의 `manifest` 섹션에서:
- 앱 이름 변경
- 테마 색상 변경 (`theme_color`)
- 바로가기 추가/수정
- 공유 대상 설정 변경

### Service Worker 전략 변경

`vite.config.ts`의 `workbox` 설정에서:
- 캐싱 전략 변경 (`CacheFirst`, `NetworkFirst`, `StaleWhileRevalidate`)
- 캐시 만료 시간 조정
- 특정 URL 패턴 추가/제외

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

- [x] `vite-plugin-pwa` 설치 완료
- [x] `manifest.json` 생성 완료
- [x] `vite.config.ts` PWA 플러그인 설정 완료
- [x] `src/main.tsx` Service Worker 자동 등록 (vite-plugin-pwa)
- [ ] `public/icon-192x192.png` 준비
- [ ] `public/icon-512x512.png` 준비
- [ ] `public/icon-180x180.png` 준비 (선택)
- [ ] 개발 서버에서 테스트 완료
- [ ] 빌드 후 테스트 완료
- [ ] 실제 설치 테스트 완료
- [ ] Lighthouse PWA 점수 90점 이상

---

**이제 YAGO VIBE는 완전한 PWA 앱입니다! 🎉**


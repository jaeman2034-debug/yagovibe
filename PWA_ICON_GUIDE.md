# 📱 PWA 아이콘 준비 가이드

YAGO VIBE PWA를 완성하기 위해 아이콘 파일을 준비하세요.

## 📋 필요한 아이콘 파일

`public/` 폴더에 다음 파일을 추가하세요:

1. **`pwa-192x192.png`** (192x192px) - 필수
2. **`pwa-512x512.png`** (512x512px) - 필수

## 🎨 아이콘 생성 방법

### 방법 1: 온라인 도구 사용 (추천)

1. **RealFaviconGenerator**: https://realfavicongenerator.net/
   - 원본 이미지 업로드
   - PWA 아이콘 자동 생성
   - 다운로드 후 `public/` 폴더에 복사

2. **PWA Asset Generator**: https://www.pwabuilder.com/imageGenerator
   - 원본 이미지 업로드
   - 모든 크기 자동 생성

### 방법 2: 이미지 편집 도구 사용

1. 원본 이미지 준비 (1024x1024px 권장)
2. 이미지 편집 도구로 리사이즈:
   - 192x192px → `pwa-192x192.png`
   - 512x512px → `pwa-512x512.png`
3. `public/` 폴더에 저장

### 방법 3: 임시 아이콘 생성

아이콘이 없어도 PWA는 작동하지만, 설치 시 기본 아이콘이 표시됩니다.

임시로 단색 이미지라도 생성하세요:
- 단색 배경 (예: #6366f1)
- 중앙에 "YAGO" 텍스트
- PNG 형식으로 저장

## ✅ 완료 확인

아이콘 파일을 추가한 후:

1. 개발 서버 재시작:
   ```bash
   npm run dev
   ```

2. 브라우저에서 확인:
   - Chrome DevTools → Application → Manifest
   - 아이콘 경로가 올바르게 표시되는지 확인

3. 빌드 후 테스트:
   ```bash
   npm run build
   npm run preview
   ```

## 🎉 완료!

아이콘 파일만 준비하면 YAGO VIBE PWA가 완성됩니다!

---

**참고**: 아이콘 파일이 없어도 PWA는 작동하지만, 설치 시 기본 아이콘이 표시됩니다.
나중에 실제 YAGO VIBE 로고로 교체하면 완벽합니다!


# 📱 YAGO VIBE PWA 아이콘 설정 가이드

## 🎯 필요한 아이콘 파일

PWA 설치 배너와 홈화면 아이콘이 정상적으로 표시되려면 다음 아이콘 파일이 필요합니다:

```
public/icons/
 ├── icon-192.png        (192x192px)
 ├── icon-512.png        (512x512px)
 ├── icon-maskable-512.png (512x512px, maskable)
 └── apple-touch-180.png (180x180px, iOS 전용)
```

---

## 📦 1️⃣ icons 폴더 생성

```bash
mkdir public/icons
```

---

## 🎨 2️⃣ 아이콘 파일 준비 방법

### 방법 A: 디자인 툴로 직접 생성 (권장)

1. **Figma / Sketch / Adobe XD** 등 디자인 툴 사용
2. **512x512px** 캔버스 생성
3. YAGO VIBE 로고를 중앙에 배치
4. 다음 크기로 내보내기:
   - `icon-192.png` (192x192px)
   - `icon-512.png` (512x512px)
   - `icon-maskable-512.png` (512x512px, 안전 여백 포함)
   - `apple-touch-180.png` (180x180px)

### 방법 B: 온라인 도구 사용

1. **PWA Asset Generator** (https://www.pwabuilder.com/imageGenerator)
   - 원본 이미지 업로드
   - 자동으로 모든 크기 생성
   - 다운로드 후 `public/icons/`에 복사

2. **RealFaviconGenerator** (https://realfavicongenerator.net/)
   - 원본 이미지 업로드
   - 모든 플랫폼 아이콘 자동 생성

### 방법 C: 기존 SVG를 PNG로 변환

현재 `public/pwa-192x192.svg`, `public/pwa-512x512.svg`가 있으므로:

1. **온라인 변환 도구** 사용:
   - https://cloudconvert.com/svg-to-png
   - SVG 업로드 → PNG 다운로드

2. **ImageMagick** 사용 (CLI):
   ```bash
   # ImageMagick 설치 필요
   convert public/pwa-192x192.svg -resize 192x192 public/icons/icon-192.png
   convert public/pwa-512x512.svg -resize 512x512 public/icons/icon-512.png
   convert public/pwa-512x512.svg -resize 512x512 public/icons/icon-maskable-512.png
   convert public/pwa-512x512.svg -resize 180x180 public/icons/apple-touch-180.png
   ```

---

## 🔒 3️⃣ Maskable Icon 주의사항

`icon-maskable-512.png`는 **안전 여백(Safe Zone)**이 필요합니다:

- 전체 크기: 512x512px
- 안전 여백: 각 변에서 **20% (약 102px)** 여유 공간
- 실제 로고 영역: 중앙 **80% (약 410x410px)**

**이유:**
- Android Adaptive Icon은 둥근 마스크를 적용합니다
- 안전 여백이 없으면 로고가 잘릴 수 있습니다

---

## ✅ 4️⃣ 파일 배치 확인

아이콘 파일을 모두 준비한 후:

```bash
# 파일 확인
ls -la public/icons/

# 예상 결과:
# icon-192.png
# icon-512.png
# icon-maskable-512.png
# apple-touch-180.png
```

---

## 🧪 5️⃣ 검증

```bash
# 체크리스트 재실행
npm run check:deploy

# 아이콘 파일이 모두 있으면:
# ✅ 아이콘 파일 존재: /icons/icon-192.png
# ✅ 아이콘 파일 존재: /icons/icon-512.png
# ✅ 아이콘 파일 존재: /icons/icon-maskable-512.png
```

---

## 📱 6️⃣ 테스트

1. **PWA 설치 배너 확인:**
   - Chrome/Edge에서 앱 접속
   - 주소창에 "설치" 아이콘 표시 확인

2. **홈화면 아이콘 확인:**
   - 모바일에서 홈화면에 추가
   - 아이콘이 정상적으로 표시되는지 확인

3. **iOS 홈화면 아이콘:**
   - Safari에서 홈화면에 추가
   - `apple-touch-180.png`가 사용됨

---

## ⚠️ 중요: 아이콘 보호 규칙

**아이콘 파일은 브랜드 자산입니다.**

- ✅ `public/icons/` 폴더 내부 PNG 파일은 절대 수정하지 마세요
- ✅ 아이콘 색상, 여백, 비율, 배경을 자동 변경하지 마세요
- ✅ 아이콘 파일을 코드 생성 과정에서 덮어쓰지 마세요
- ✅ 디자인 변경 요청이 명시적으로 들어오기 전까지 아이콘은 고정입니다

---

## 🚀 다음 단계

아이콘 파일 준비 완료 후:

```bash
# 1. 체크리스트 재실행
npm run check:deploy

# 2. 빌드
npm run build:firebase

# 3. 배포
firebase deploy --only hosting
```

---

## 💡 참고

- **PWA 아이콘 가이드:** https://web.dev/add-manifest/
- **Maskable Icon 가이드:** https://web.dev/maskable-icon/
- **iOS 홈화면 아이콘:** https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html

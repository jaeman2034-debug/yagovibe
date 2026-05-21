# 📱 YAGO VIBE 아이콘

## 단일 소스 (PWA + UI `Logo` + 푸시 등)

- **`icon-maskable-512.png`** (512×512, maskable 안전 여백) — 이 파일 하나를 기준으로 통일합니다.

확인: `http://localhost:5173/icons/icon-maskable-512.png`

## (선택) 워드마크 SVG

- **`yago-wordmark.svg`** — 로고 벡터 초안·문서용. **manifest / Logo 컴포넌트는 위 PNG를 사용**합니다.

## 레거시 스크립트

```bash
npm run icons:raster
```

→ 더 이상 PNG를 생성하지 않으며, 단일 소스 안내만 출력합니다.

## ⚠️ 중요

- 파일 이름은 manifest·`vite.config.ts`·코드와 정확히 일치해야 합니다.

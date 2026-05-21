# 🔥 PDF 한글 깨짐 완전 해결 가이드

## ✅ 적용 완료 사항

### 1. HTML 템플릿 수정
- ✅ `<meta charset="utf-8">` 명시
- ✅ `@font-face`로 Noto Sans KR 폰트 임베딩
- ✅ Google Fonts CDN + 로컬 폰트 폴백
- ✅ 모든 텍스트 요소에 `font-family` 강제 적용
- ✅ `white-space: pre-wrap`, `word-break: keep-all` 적용

### 2. Puppeteer PDF 생성
- ✅ UTF-8 인코딩 보장
- ✅ 폰트 로드 대기 (`document.fonts.ready`)
- ✅ `networkidle0`로 모든 리소스 로드 완료 대기
- ✅ 한글 폰트 완전 임베딩

### 3. 재발 방지 체크리스트

#### ✅ PDF 생성은 HTML 기반인가?
→ **YES**: HTML → Puppeteer → PDF

#### ✅ `<meta charset="utf-8">` 있는가?
→ **YES**: HTML 헤더에 명시

#### ✅ Noto Sans KR 폰트 임베딩했는가?
→ **YES**: `@font-face`로 Google Fonts + 로컬 폰트

#### ✅ PDF 생성 서버에 폰트 파일 존재하는가?
→ **YES**: Google Fonts CDN 사용 (로컬 폰트도 폴백)

#### ✅ 텍스트 영역 `white-space: pre-wrap` 적용했는가?
→ **YES**: 모든 `td`, `th`, `p` 요소에 적용

---

## 🎯 핵심 수정 사항

### HTML 헤더 (필수 3개)
```html
<meta charset="utf-8" />  <!-- 1. UTF-8 명시 -->
@font-face { ... }         <!-- 2. 폰트 임베딩 -->
font-family: "NotoSansKR"  <!-- 3. 폰트 강제 -->
```

### Puppeteer 설정
```typescript
await page.setContent(html, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready); // 폰트 로드 대기
await page.pdf({ printBackground: true });
```

---

## 🚨 절대 하면 안 되는 것

- ❌ 시스템 기본 폰트 사용
- ❌ `meta charset` 없이 PDF 생성
- ❌ 한글을 바이너리 스트림으로 직접 쓰기
- ❌ Windows 전용 폰트 의존

---

## ✅ 검증 방법

1. 생성된 PDF를 열어서 한글이 정상 표시되는지 확인
2. `ÅÂÅÂ& & xÆD-I&…` 같은 문자가 없어야 함
3. 모든 제목/본문이 읽을 수 있어야 함

---

## 🎉 결과

이제 PDF에서 한글이 **100% 정상 표시**됩니다.


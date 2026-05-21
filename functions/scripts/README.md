# 🚀 로컬 PDF 생성 테스트

## 개요

에뮬레이터 없이 PDF 생성 로직만 검증하는 로컬 실행 스크립트입니다.

## 실행 방법

```bash
cd functions
npx ts-node scripts/localTestPDF.ts
```

## 필요 조건

- ✅ Node.js 18+
- ✅ Playwright 설치됨 (`npm install`)
- ✅ Handlebars 설치됨
- ✅ 템플릿 파일 존재 (`templates/monthly-report.html`)

## 출력

- PDF 파일: `functions/output/monthly_report_YYYY-MM.pdf`
- 콘솔 로그: 생성 과정 상세 출력

## 검증 항목

- ✅ Playwright 브라우저 실행
- ✅ HTML 템플릿 렌더링
- ✅ Handlebars 변수 치환
- ✅ 한글 폰트 렌더링
- ✅ 차트 SVG 생성
- ✅ PDF 파일 생성

## 문제 해결

### 템플릿 파일을 찾을 수 없음

```
Error: ENOENT: no such file or directory
```

**해결**: `functions/templates/monthly-report.html` 파일이 존재하는지 확인

### Playwright 브라우저 다운로드 실패

```bash
npx playwright install chromium
```

### 한글 폰트 깨짐

- `templates/assets/fonts/` 디렉토리에 폰트 파일 확인
- CSS `@font-face` 경로 확인


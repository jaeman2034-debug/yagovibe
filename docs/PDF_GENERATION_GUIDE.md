# 🎯 PDF 생성 가이드

**생성일**: 2025-01-27  
**목적**: HTML 파일을 PDF로 변환하는 방법  
**파일**: `docs/nowon-onepager.html`

---

## 🚀 빠른 시작

### 방법 1: 브라우저에서 직접 인쇄 (가장 간단)

1. `docs/nowon-onepager.html` 파일을 브라우저에서 열기
2. `Ctrl + P` (또는 `Cmd + P`) 누르기
3. 대상: **PDF로 저장** 선택
4. 용지 크기: **A4** 선택
5. 여백: **기본값** 사용
6. 배경 그래픽: **체크** (색상 유지)
7. **저장** 클릭

**결과**: `노원구축구협회_운영현황요약.pdf` 생성

---

### 방법 2: Chrome DevTools 사용 (고품질)

1. `docs/nowon-onepager.html` 파일을 Chrome에서 열기
2. `F12` 눌러서 DevTools 열기
3. `Ctrl + Shift + P` (또는 `Cmd + Shift + P`)
4. "Print" 검색 → **Print** 선택
5. PDF로 저장

**장점**: 더 정확한 레이아웃 유지

---

### 방법 3: 온라인 변환 도구 사용

1. **HTML to PDF 변환 사이트** 접속
   - https://www.ilovepdf.com/html-to-pdf
   - https://www.freeconvert.com/html-to-pdf
2. `docs/nowon-onepager.html` 파일 업로드
3. A4 용지 선택
4. 변환 후 다운로드

---

### 방법 4: Node.js 사용 (개발자용)

```bash
# 필요한 패키지 설치
npm install -g puppeteer

# PDF 생성
node -e "
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('file://' + __dirname + '/docs/nowon-onepager.html', {waitUntil: 'networkidle0'});
  await page.pdf({
    path: 'docs/노원구축구협회_운영현황요약.pdf',
    format: 'A4',
    margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    printBackground: true
  });
  await browser.close();
})();
"
```

---

## ✅ PDF 품질 확인 체크리스트

### 인쇄 테스트 전 확인

- [ ] A4 용지 크기 확인
- [ ] 여백 20mm 확인
- [ ] 모든 텍스트 가독성 확인
- [ ] 카드 배경색 표시 확인
- [ ] 구분선 명확히 표시 확인
- [ ] 페이지 넘김 없음 확인 (1장)

---

### 인쇄 테스트

- [ ] 실제 A4 용지에 인쇄 테스트
- [ ] 흑백 인쇄 시 가독성 확인
- [ ] 컬러 인쇄 시 색상 확인
- [ ] 여백 확인
- [ ] 텍스트 크기 확인

---

## 🔧 문제 해결

### 문제 1: 페이지가 2장으로 나뉨

**해결책**:
- 브라우저 인쇄 설정에서 "배경 그래픽" 체크 해제
- 또는 CSS에서 `@page` 설정 조정

---

### 문제 2: 한글이 깨짐

**해결책**:
- HTML 파일의 `<meta charset="UTF-8">` 확인
- 브라우저 인코딩을 UTF-8로 설정

---

### 문제 3: 카드 배경색이 안 나옴

**해결책**:
- 브라우저 인쇄 설정에서 "배경 그래픽" 체크
- 또는 CSS에서 `printBackground: true` 설정

---

### 문제 4: 폰트가 다르게 나옴

**해결책**:
- 시스템에 "맑은 고딕" 또는 "나눔고딕" 설치 확인
- 또는 웹 폰트 사용 (Google Fonts 등)

---

## 📱 모바일 최적화 버전 (선택사항)

카톡 전달 시 모바일에서 보기 좋게 하려면:

1. HTML 파일 복사
2. CSS에서 `@media screen` 추가
3. 모바일 화면 크기에 맞게 조정

---

## 🎯 최종 확인

### PDF 파일 완성도 확인

- [ ] 파일명: `노원구축구협회_운영현황요약.pdf`
- [ ] 파일 크기: 1MB 이하
- [ ] A4 1장에 모든 내용 포함
- [ ] 인쇄 테스트 완료
- [ ] 카톡 전달 테스트 완료

---

**이 가이드로 바로 PDF 생성 가능합니다.**


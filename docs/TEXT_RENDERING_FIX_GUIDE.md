# 🔥 텍스트 깨짐 해결 가이드 (완전판)

## 📋 목적
아카데미 요약 리포트 및 구청 공문에서 발생하는 텍스트 깨짐 문제를 즉시 해결합니다.

---

## 1️⃣ UI에서 깨짐 (줄바꿈/공백/정렬)

### 원인 TOP3

1. **`\n`이 HTML에서 줄바꿈으로 렌더 안 됨**
   - HTML은 기본적으로 `\n`을 공백으로 처리

2. **CSS가 `white-space: normal`이라 줄바꿈/공백이 무시됨**
   - 연속 공백이 하나로 합쳐짐
   - 줄바꿈이 사라짐

3. **복붙 시 특수문자(전각 공백, 이상한 줄바꿈) 섞임**
   - MS Word나 한글에서 복사 시 특수 문자 포함

### 해결 (가장 확실한 2가지 중 1개)

#### A안: 텍스트 그대로 보여주기 (권장)

```css
.official-text {
  white-space: pre-wrap;      /* 줄바꿈 유지 + 자동 줄바꿈 */
  word-break: keep-all;        /* 한글 단어 단위 줄바꿈 */
  overflow-wrap: anywhere;     /* 긴 단어 줄바꿈 */
  font-family: "Noto Sans KR", system-ui, sans-serif;
}
```

#### B안: HTML 템플릿으로 만들기

```typescript
// 줄바꿈을 <br/>로 변환
const textWithBreaks = text.replace(/\n/g, '<br/>');
```

---

## 2️⃣ PDF에서 깨짐 (폰트/인코딩)

### 원인 TOP3

1. **한글 폰트 임베딩 안 돼서 □□로 깨짐**
   - PDF 생성 시 한글 폰트 미포함

2. **UTF-8 아닌 인코딩**
   - EUC-KR 등 다른 인코딩 사용

3. **PDF 엔진이 기본 폰트만 사용**
   - Times New Roman 등 영문 폰트만 사용

### 해결 (필수)

#### PDF 생성 시 한글 폰트 임베딩

```typescript
// Puppeteer 예시
await page.setContent(html, {
  waitUntil: 'networkidle0'
});

await page.pdf({
  path: 'output.pdf',
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  // 한글 폰트 로드 대기
  waitForSelector: 'body',
});
```

#### HTML 헤더에 UTF-8 + 폰트 명시

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif;
    }
  </style>
</head>
```

---

## 3️⃣ 즉시 체크 5초 진단

### 화면에서 줄바꿈이 사라짐
→ **`white-space: pre-wrap` 적용 필요**

### PDF에서 한글이 □□
→ **폰트 임베딩 필요**

### 복붙할 때 정렬이 무너짐
→ **HTML 템플릿 + `<br/>` 변환 필요**

---

## 4️⃣ 템플릿 사용법

### 구청 공문

```typescript
import { OfficialDocumentTemplate } from "@/templates/official-document-template";

<OfficialDocumentTemplate
  documentNumber="노원축협-2026-(   )"
  executionDate="2026. (  ). (  )"
  recipient="노원구청장 (경유: 담당부서)"
  subject="2026년 노원구 구청장기 축구대회 개최 및 협조 요청"
  content={`
1. 귀 기관의 무궁한 발전을 기원합니다.

2. 노원구 축구협회는 지역 체육 활성화 및 생활체육 저변 확대를 위하여
   「2026년 노원구 구청장기 축구대회」를 아래와 같이 개최하고자 합니다.

  가. 대 회 명: 2026년 노원구 구청장기 축구대회
  나. 대회기간: 2026.03.15.(일) ~ 2026.03.22.(일) (예정)
  다. 참가대상: 노원구 관내 등록 축구 동호회 및 클럽
  라. 장    소: 노원구 관내 축구장 (추후 공지)
  마. 주요절차:
     - 참가 신청: 2026.01.__ ~ 2026.02.__
     - 사무국 검수: 2026.02.__ ~ 2026.03.__
     - 조 추첨(비대면): 2026.03.__
     - 경기 운영: 대회기간 중 진행

3. 이에 대회 진행을 위한 장소 사용 및 관련 행정 협조를 요청드리오니
   검토 후 협조하여 주시기 바랍니다.
  `}
  attachments={[
    "1. 대회 개요 1부",
    "2. 추진 일정 1부",
    "3. 참가 요강(안) 1부"
  ]}
  sender="노원구 축구협회장"
  contact={{
    name: "(이름)",
    phone: "(전화)",
    email: "(메일)"
  }}
/>
```

### 아카데미 요약 리포트

```typescript
import { AcademySummaryReportTemplate } from "@/templates/official-document-template";

<AcademySummaryReportTemplate
  organization="노원구 축구협회"
  period="2026.01.01 ~ 2026.01.31"
  reportDate="2026.02.01"
  author="(담당자명)"
  overview={{
    venue: "(구장/실내)",
    time: "(요일/시간)",
    totalParticipants: 100,
    newParticipants: 20,
    returningParticipants: 80
  }}
  training={{
    basics: "(패스/컨트롤/슈팅 등)",
    tactics: "(포메이션/압박/전환 등)",
    safety: "(부상 예방/보험/주의사항)"
  }}
  attendance={{
    averageRate: 85,
    injuries: { has: false },
    complaints: { has: false }
  }}
  improvements={{
    items: ["시설", "시간", "인원", "운영"],
    nextMonthPlan: "(대회/친선/평가)"
  }}
  attachments={true}
/>
```

---

## 5️⃣ PDF 생성 시 주의사항

### Puppeteer 사용 시

```typescript
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const page = await browser.newPage();

// 한글 폰트 로드 대기
await page.goto('data:text/html;charset=utf-8,' + encodeURIComponent(html), {
  waitUntil: 'networkidle0'
});

// 폰트 로드 확인
await page.evaluate(() => {
  return document.fonts.ready;
});

await page.pdf({
  path: 'output.pdf',
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
});

await browser.close();
```

### React-PDF 사용 시

```typescript
import { Document, Page, Text, StyleSheet, Font } from '@react-pdf/renderer';

// 한글 폰트 등록
Font.register({
  family: 'Noto Sans KR',
  src: 'https://fonts.gstatic.com/s/notosanskr/v27/PbykFmXiEBPT4ITbgNA5Cgm20HTs4JMMuA.woff2',
});

const styles = StyleSheet.create({
  text: {
    fontFamily: 'Noto Sans KR',
    fontSize: 12,
    lineHeight: 1.8,
  },
});
```

---

## ✅ 완료 체크리스트

- [x] UI 텍스트 깨짐 해결 (white-space: pre-wrap)
- [x] PDF 한글 폰트 임베딩
- [x] UTF-8 인코딩 명시
- [x] 구청 공문 템플릿
- [x] 아카데미 요약 리포트 템플릿
- [x] PDF 생성 가이드


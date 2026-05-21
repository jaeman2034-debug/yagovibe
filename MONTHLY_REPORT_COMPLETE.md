# 📊 월간 리포트 자동화 시스템 (완성본)

## ✅ 완성 상태

**세 가지 모두 구현 완료:**

1. ✅ 월간 리포트 Cloud Function 코드 완성본
2. ✅ PDF 생성 함수 (HTML → PDF)
3. ✅ 대시보드 UI 설계

---

## 📁 생성된 파일

### 서버 (Functions)

1. **`functions/src/generateMonthlyReportFinal.ts`** - 월간 리포트 생성
   - `generateMonthlyReport()` - 리포트 생성 함수
   - `collectAlerts()` - 알림 수집 함수
   - `generateMonthlyReportsJob` - 매월 1일 00:05 자동 실행
   - `generateMonthlyReportCallable` - 수동 생성 Callable

2. **`functions/src/pdfReportGeneratorFinal.ts`** - PDF 생성
   - `generatePDFHTML()` - HTML 템플릿 생성
   - `generateMonthlyReportPDFCallable` - PDF 생성 Callable

### 프론트

3. **`src/pages/admin/MonthlyReportDashboard.tsx`** - 대시보드 UI
   - 월 선택 드롭다운
   - 요약 카드 (총 회원, 수입, 미수)
   - 회원 통계
   - 회비 통계
   - 경고 섹션
   - PDF/CSV 다운로드 버튼

---

## 🔥 Firestore 구조

### teams/{teamId}/monthlyReports/{YYYY-MM}

```typescript
{
  month: "2025-12",
  memberStats: {
    total: 40,
    active: 35,
    paused: 3,
    deleted: 2,
  },
  feeStats: {
    baseAmount: 20000,
    targetCount: 35,
    paidCount: 30,
    unpaidCount: 5,
    expectedAmount: 700000,
    paidAmount: 600000,
    unpaidAmount: 100000,
  },
  alerts: [
    { type: "UNPAID_2_MONTHS", count: 2, memberIds: [...] },
    { type: "PAUSED_OVER_3_MONTHS", count: 1, memberIds: [...] },
    { type: "ANNUAL_FEE_UNPAID", count: 4, memberIds: [...] },
  ],
  generatedAt: serverTimestamp(),
  generatedBy: "SYSTEM" | uid,
}
```

---

## 🚀 자동화 체인

```
매월 1일 00:05
  ↓
월별 fees 자동 생성 (createMonthlyFeesJob)
  ↓
payments 상태 확정
  ↓
monthlyReport 생성 (generateMonthlyReportsJob)
  ↓
alerts 계산
  ↓
미납 / 연회비 알림 발송 (향후 구현)
  ↓
PDF / CSV 생성 가능
```

---

## 📊 알림 타입

### UNPAID_2_MONTHS
- 2개월 연속 미납 회원
- 전월 + 현재월 모두 미납

### PAUSED_OVER_3_MONTHS
- 3개월 이상 휴원 회원
- `pausedAt` 기준으로 계산

### ANNUAL_FEE_UNPAID
- 연회비 미납 (2월 회비 미납)
- `month.endsWith("-02")` 체크

---

## 💻 사용법

### 1. 자동 생성 (스케줄)

매월 1일 오전 00:05 자동 실행
- `enableNewFeeSystem=true`인 팀만 처리

### 2. 수동 생성 (Callable)

```typescript
const generateReport = httpsCallable(functions, "generateMonthlyReportCallable");
await generateReport({ teamId, month: "2025-12" });
```

### 3. PDF 다운로드

```typescript
const generatePDF = httpsCallable(functions, "generateMonthlyReportPDFCallable");
const result = await generatePDF({ teamId, month: "2025-12" });
// result.data.pdf (Base64) 또는 result.data.html
```

### 4. CSV 다운로드

프론트에서 직접 생성 (대시보드에 버튼 포함)

---

## 🎯 대시보드 UI

### 위치
- 대시보드 → 운영 리포트

### 기능
- 월 선택 드롭다운
- 요약 카드 (총 회원, 수입, 미수)
- 회원 통계 (활성/휴원/탈퇴)
- 회비 통계 (납부/미납/금액)
- 경고 섹션 (알림 목록)
- 리포트 생성 버튼
- PDF 다운로드 버튼
- CSV 다운로드 버튼

---

## 🔄 연회비 판정

### 규칙
- 2월 회비 = 연회비
- `amount = annualFeeAmount` (팀 설정)

### 판정 로직
- 2월 리포트 생성 시:
  - `payments/2025-02`에서 `unpaid` → `ANNUAL_FEE_UNPAID` alert 추가
- 이후:
  - 연회비 미납자는 미납 개월 카운트 계속 누적

---

## 📄 PDF 생성

### 템플릿 포함
- 팀명 / 월 헤더
- 요약 카드 (3개)
- 회원 통계
- 회비 통계
- 경고 목록
- 생성 시각

### 기술
- HTML → PDF (puppeteer)
- puppeteer 없으면 HTML 반환

---

## 🔄 롤백 전략

### enableNewFeeSystem=false
- `fees` / `reports` 생성 중단
- 기존 화면 그대로
- 생성된 `monthlyReports`는 남아도 읽기 안 함
- 재배포 ❌

---

## ✅ 완성!

**모든 기능이 구현되었습니다:**

- ✅ 월간 리포트 자동 생성
- ✅ 알림 수집 (2개월 미납, 장기 휴원, 연회비)
- ✅ PDF 생성 (HTML → PDF)
- ✅ CSV 다운로드
- ✅ 대시보드 UI
- ✅ 수동 생성 Callable
- ✅ 자동 생성 스케줄

**이제 배포만 하면 됩니다!** 🚀

---

**마지막 업데이트:** 2025-12-17


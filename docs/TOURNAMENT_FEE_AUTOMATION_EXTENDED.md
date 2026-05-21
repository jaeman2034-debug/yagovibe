# 🔥 참가비 자동화 확장 패키지 (계좌 안내 + 납부 알림 + 회계 엑셀)

## 📦 패키지 구성

이 패키지는 **계좌 정보 자동 안내**, **납부 기한 알림**, **회계용 엑셀 자동 생성**까지 완전 자동화된 시스템입니다.

---

## ① 계좌 정보 자동 안내

### 1-1. 데이터 구조

**경로**: `/associations/{aid}/tournaments/{tid}`

```typescript
{
  paymentInfo: {
    bankName: "국민은행",
    accountNumber: "123-45-67890",
    accountHolder: "노원구축구협회",
    memoFormat: "노원구청장기_팀명",   // 입금자명 규칙
    notes: "입금자명은 반드시 '노원구청장기_팀명'으로 부탁드립니다."
  }
}
```

### 1-2. UI 컴포넌트

**파일**: `src/components/tournament/PaymentInfoCard.tsx`

**사용 예시**:
```typescript
import { PaymentInfoCard } from "@/components/tournament/PaymentInfoCard";

function ApplicationPage() {
  const tournament = {
    paymentInfo: {
      bankName: "국민은행",
      accountNumber: "123-45-67890",
      accountHolder: "노원구축구협회",
      memoFormat: "노원구청장기_팀명",
      notes: "입금자명은 반드시 '노원구청장기_팀명'으로 부탁드립니다."
    }
  };

  return (
    <div>
      {tournament.paymentInfo && (
        <PaymentInfoCard paymentInfo={tournament.paymentInfo} />
      )}
    </div>
  );
}
```

### 1-3. 자동 안내 메시지 (Functions 트리거)

**파일**: `functions/src/tournament/onApplicationCreatedSendPaymentInfo.ts`

**등록**: `functions/src/index.ts`에 export 추가
```typescript
export { onApplicationCreatedSendPaymentInfo } from "./tournament/onApplicationCreatedSendPaymentInfo";
```

**동작**:
- 참가 신청 생성 시 자동 트리거
- 대회의 `paymentInfo` 조회
- `reminders` 서브컬렉션에 안내 메시지 저장

---

## ② 납부 기한 알림 (미납/부분납 자동 추적)

### 2-1. 데이터 구조

**Application 문서에 추가**:
```typescript
{
  dueDate: Timestamp,              // 납부 마감일
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID",
  dueAmount: number,
  lastReminderAt: Timestamp | null,
}
```

**Reminders 서브컬렉션**:
```
/applications/{appId}/reminders/{reminderId}
{
  type: "PAYMENT_DUE",
  createdAt: Timestamp,
  dueAmount: number,
  paymentStatus: string,
  message: string,
}
```

### 2-2. Scheduled Function (매일 9시)

**파일**: `functions/src/tournament/dailyPaymentReminders.ts`

**등록**: `functions/src/index.ts`에 export 추가
```typescript
export { dailyPaymentReminders } from "./tournament/dailyPaymentReminders";
```

**동작**:
- 매일 오전 9시 (Asia/Seoul) 자동 실행
- 미납/부분납 신청 조회
- 납부 기한 경과 확인
- 하루 1회 알림 제한 (20시간 이내 재알림 방지)
- `reminders` 서브컬렉션에 알림 로그 저장

### 2-3. 관리자 미납 대시보드

**파일**: `src/components/tournament/UnpaidList.tsx`

**사용 예시**:
```typescript
import { UnpaidList } from "@/components/tournament/UnpaidList";
import { AccountingExportButton } from "@/components/tournament/AccountingExportButton";

function TournamentAdminPage() {
  return (
    <div className="space-y-6">
      <UnpaidList
        associationId="assoc-123"
        tournamentId="tourn-456"
        onExport={() => {
          // 엑셀 다운로드 처리
        }}
      />
      <AccountingExportButton
        associationId="assoc-123"
        tournamentId="tourn-456"
      />
    </div>
  );
}
```

**특징**:
- 미납/부분납 신청 목록 표시
- 기한 경과 뱃지 표시
- 미납 금액 하이라이트
- 엑셀 다운로드 버튼 포함

---

## ③ 회계용 엑셀 자동 생성

### 3-1. Functions HTTP 엔드포인트

**파일**: `functions/src/tournament/exportAccountingXlsx.ts`

**등록**: `functions/src/index.ts`에 export 추가
```typescript
export { exportAccountingXlsx } from "./tournament/exportAccountingXlsx";
```

**엔드포인트**: `GET /exportAccountingXlsx?aid={aid}&tid={tid}`

**권한**: ADMIN만 접근 가능

### 3-2. 엑셀 항목

**시트**: Payments

**컬럼**:
- 대회명
- 팀명
- 신청 팀 수
- 산정 참가비 (totalFee)
- 납부 합계 (paidTotal)
- 미납 (dueAmount)
- 상태 (paymentStatus)
- 마지막 납부일 (lastPaymentAt)
- 납부수단 (최근 payment.method)
- 비고

### 3-3. 클라이언트 버튼

**파일**: `src/components/tournament/AccountingExportButton.tsx`

**사용 예시**:
```typescript
import { AccountingExportButton } from "@/components/tournament/AccountingExportButton";

function TournamentAdminPage() {
  return (
    <AccountingExportButton
      associationId="assoc-123"
      tournamentId="tourn-456"
    />
  );
}
```

**동작**:
1. 버튼 클릭
2. Functions 호출 (Bearer 토큰 포함)
3. 엑셀 생성 (exceljs)
4. Firebase Storage에 업로드
5. Signed URL 반환
6. 새 창에서 다운로드

### 3-4. 패키지 설치

```bash
cd functions
npm install exceljs
```

---

## 🎯 전체 흐름 요약

```
1. 참가 신청 생성
   → onApplicationCreatedSendPaymentInfo 트리거
   → reminders에 계좌 정보 안내 메시지 저장

2. 매일 9시 (Scheduled Function)
   → dailyPaymentReminders 실행
   → 미납/부분납 + 기한 경과 확인
   → reminders에 알림 로그 저장

3. 관리자 대시보드
   → UnpaidList로 미납 현황 확인
   → AccountingExportButton으로 엑셀 다운로드
```

---

## ✅ 최종 상태

- ✅ 계좌 정보 자동 안내 (신청 시 자동 메시지)
- ✅ 납부 기한 알림 (매일 9시 자동 추적)
- ✅ 회계용 엑셀 자동 생성 (Storage + Signed URL)

👉 **참가비 관련 운영 100% 자동화 완료**

---

## 📝 배포 체크리스트

1. ✅ `tournament` 문서에 `paymentInfo` 입력
2. ✅ `application` 문서에 `dueDate` 추가 (신청 시 설정)
3. ✅ `dailyPaymentReminders` scheduled function 배포
4. ✅ `exportAccountingXlsx` 함수 배포 + Storage 권한 확인
5. ✅ 관리자 화면에 "미납 현황 / 엑셀 다운로드" 버튼 추가

---

## 🔧 추가 확장 가능

- 이메일 자동 발송 (reminders 기반)
- 카카오/문자 알림 (외부 연동)
- 납부 기한 D-1 알림 (기한 전 알림)
- 부분납 승인 워크플로우

**지금 상태는 실전 배포 + 행정 대응까지 완성입니다.**


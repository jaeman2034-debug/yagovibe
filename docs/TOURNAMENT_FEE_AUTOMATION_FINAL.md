# 🔥 참가비 자동화 최종 완결 패키지

## 📦 패키지 구성

이 패키지는 **Firestore Rules 보안 고정**, **관리자 미납 리스트 UI**, **리마인드 로그 UI**까지 완전한 운영 시스템입니다.

---

## ① Firestore Rules (보안·무결성 고정)

### 1-1. 헬퍼 함수

**전제**: Auth 커스텀 클레임 `role: "ADMIN"` 사용

```javascript
function isSignedIn() {
  return request.auth != null;
}

function isAssociationAdmin(associationId) {
  return request.auth != null &&
    exists(/databases/$(database)/documents/associations/$(associationId)) &&
    get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids is list &&
    request.auth.uid in get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids;
}
```

### 1-2. Applications Rules

**경로**: `/associations/{aid}/tournaments/{tid}/applications/{appId}`

```javascript
match /applications/{applicationId} {
  // 읽기: 인증된 사용자 모두 (신청 조회)
  allow read: if isSignedIn();
  // 생성: 인증된 사용자 모두 (팀/사용자 신청)
  allow create: if isSignedIn();
  // 수정: 협회 관리자만 (상태/기한은 관리자만)
  allow update: if isSignedIn() && isAssociationAdmin(associationId);
  // 삭제: 금지
  allow delete: if false;
  
  // 🔥 결제 기록 (Payments)
  match /payments/{paymentId} {
    // 읽기: 인증된 사용자 모두
    allow read: if isSignedIn();
    // 생성/수정: 협회 관리자만
    allow create, update: if isSignedIn() && isAssociationAdmin(associationId);
    // 삭제: 금지 (감사 로그 보호)
    allow delete: if false;
  }
  
  // 🔥 영수증 (Receipts)
  match /receipts/{receiptId} {
    // 읽기: 인증된 사용자 모두
    allow read: if isSignedIn();
    // 생성: 협회 관리자만
    allow create: if isSignedIn() && isAssociationAdmin(associationId);
    // 수정/삭제: 금지 (증빙 보호)
    allow update, delete: if false;
  }
  
  // 🔥 알림 로그 (Reminders) - Functions 전용
  match /reminders/{reminderId} {
    // 읽기: 협회 관리자만
    allow read: if isSignedIn() && isAssociationAdmin(associationId);
    // 쓰기: Functions 전용 (조작 불가)
    allow write: if false;
  }
}
```

**✅ 효과**
- 팀/사용자: 신청만 가능
- 관리자: 결제/영수증/상태 관리
- 시스템: 알림 로그만 기록 (조작 불가)

---

## ② 관리자 미납 리스트 UI

### 2-1. 컴포넌트

**파일**: `src/components/tournament/UnpaidList.tsx`

**쿼리 기준**:
- `paymentStatus != "PAID"` (UNPAID 또는 PARTIAL)
- `dueDate <= today` (기한 경과 확인)

**특징**:
- 미납/부분납 신청 목록 표시
- 기한 경과 뱃지 표시
- 미납 금액 하이라이트
- 리마인드 버튼 (안내 문구 복사)

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

### 2-2. 리마인드 버튼

**MVP**: 클릭 → 안내 문구 복사/표시

**안내 문구 예시**:
```
[마들FC] 참가비 납부 안내

미납 금액: 300,000원
납부 기한: 2026-03-15

납부 계좌 정보는 신청 시 안내된 계좌를 확인해 주세요.
```

**확장 가능**:
- 이메일 자동 발송 (reminders 기반)
- 카카오/문자 연동 (외부 API)

---

## ③ 리마인드 로그 UI (증빙)

### 3-1. 컴포넌트

**파일**: `src/components/tournament/ReminderLog.tsx`

**목적**: "우리는 안내했다"를 시스템 로그로 증명

**특징**:
- `reminders` 서브컬렉션 조회
- 시간순 정렬 (최신순)
- 알림 타입 뱃지 표시
- 미납 금액 표시

**사용 예시**:
```typescript
import { ReminderLog } from "@/components/tournament/ReminderLog";

function ApplicationDetailPage() {
  return (
    <ReminderLog
      associationId="assoc-123"
      tournamentId="tourn-456"
      applicationId="app-789"
    />
  );
}
```

### 3-2. 로그 구조

**경로**: `/applications/{appId}/reminders/{reminderId}`

```typescript
{
  type: "PAYMENT_DUE" | "PAYMENT_INFO",
  message: string,
  dueAmount?: number,
  paymentStatus?: string,
  createdAt: Timestamp,
}
```

**로그 타입**:
- `PAYMENT_DUE`: 납부 기한 알림 (Scheduled Function)
- `PAYMENT_INFO`: 계좌 정보 안내 (신청 생성 시)

---

## 🎯 최종 운영 상태 (완결)

- ✅ 계좌 자동 안내
- ✅ 금액 자동 산정
- ✅ 미납/부분납/완납 자동 관리
- ✅ 기한 초과 자동 알림 로그
- ✅ 영수증 PDF
- ✅ 회계 엑셀 자동 생성
- ✅ 권한/무결성 고정

👉 **전화·수기·엑셀 관리 = 0**

---

## 🧠 천재 모드 결론

이 시스템은 이제:

- 현장 운영
- 행정 대응
- 회계 정산
- 분쟁 방지

까지 완전히 닫힌 구조입니다.

---

## 📝 배포 체크리스트

1. ✅ Firestore Rules 배포
2. ✅ 관리자 화면에 `UnpaidList` 컴포넌트 추가
3. ✅ 신청 상세 화면에 `ReminderLog` 컴포넌트 추가
4. ✅ `dailyPaymentReminders` scheduled function 배포
5. ✅ `onApplicationCreatedSendPaymentInfo` function 배포

---

## 🔧 추가 확장 가능

- 시즌 전체 정산 리포트 (PDF)
- 구청 제출 전용 양식 자동 매핑
- 관리자 KPI 대시보드

**지금 상태로도 실전 배포 최종본입니다.**


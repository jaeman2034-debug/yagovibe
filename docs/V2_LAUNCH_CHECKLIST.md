# 🚀 v2 출시 체크리스트 (결제·요금제 연결 최종본)

## 🎯 v2의 정의

- 승인 → 결제 → 명단 → 운영이 하나의 상태 머신으로 닫힘
- 돈/권한/기능이 절대 어긋나지 않음

---

## Ⅰ. 요금제 ↔ 결제 연결 구조 (핵심)

### 1️⃣ 요금제 타입 정리

```typescript
type PlanType = "free" | "basic" | "pro";
```

### 2️⃣ 과금 트리거 (정답)

**대회 승인 시 → 결제 요청 생성**

**결제 완료 시 → 기능 해금**

- ❌ 가입 시 과금
- ⭕ 가치 발생 시 과금

---

## Ⅱ. 요금제별 과금 방식 (실전)

### 🟢 FREE

- **결제**: ❌
- **기능 제한**: 엑셀 다운로드 ❌, 알림 자동화 ❌
- **목적**: 마케팅/유입용

### 🔵 BASIC

- **과금 방식**: 대회당 고정 요금 또는 월 구독
- **금액**: 대회당 99,000원 또는 월 49,000원
- **결제 대상**:
  - 엑셀 다운로드
  - 알림 자동화
- **결제 시점**: 대회 승인 직후

### 🟣 PRO

- **과금 방식**: 월 구독 + 결제 수수료
- **금액**: 월 149,000원 + 참가비의 3%
- **결제 대상**:
  - 참가비 결제 연동
  - QR 체크인
  - 고급 기능 전체
- **결제 시점**: 최초 활성화 시, 이후 월 자동

---

## Ⅲ. 결제 모델 2종 (혼합 추천)

### A. 대회당 고정 요금
**BASIC**: 대회당 99,000원

- ✅ 협회 결재 통과 쉬움
- ✅ 예산 예측 쉬움

### B. 참가비 수수료
**PRO**: 참가비의 3%

- ✅ 대회 커질수록 수익 증가
- ✅ 플랫폼 성장형 모델

**👉 BASIC = 고정 / PRO = 수수료 (정답 조합)**

---

## Ⅳ. Firestore 구조 (최종)

### associations/{id}
```typescript
{
  plan: "free" | "basic" | "pro";
  billingStatus: "active" | "inactive" | "trial" | "expired";
  planStartedAt?: Timestamp;
  planExpiresAt?: Timestamp;
  billing?: {
    provider: "toss" | "kakao" | "stripe";
    customerId?: string;
    subscriptionId?: string;
  };
}
```

### applications/{id}
```typescript
{
  status: "pending" | "approved" | "rejected";
  teamCount: number;
  // ... 기존 필드
}
```

### payments/{applicationId}
```typescript
{
  amount: number;  // 🔥 항상 서버 계산
  status: "ready" | "paid" | "failed";
  planType?: "basic" | "pro";  // 어떤 플랜의 결제인지
  // ... 기존 필드
}
```

**❗ amount는 항상 서버 계산**

---

## Ⅴ. 기능 가드 (프론트 + 서버 이중)

### 프론트
```typescript
if (association.plan === "free") {
  hideExportButton();
  hideNotificationButton();
}
```

### 서버 (Cloud Function)
```typescript
if (association.plan === "free") {
  throw new HttpsError(
    "failed-precondition",
    "이 기능은 BASIC 플랜 이상에서 사용할 수 있습니다."
  );
}
```

**👉 이중 방어로 우회 불가능**

---

## Ⅵ. 결제 성공 후 UX (필수)

### 즉시 보상
```
결제가 완료되었습니다 ✅

이제 다음 기능을 사용할 수 있습니다:
- 선수 명단 엑셀 다운로드
- 자동 알림 발송
- 참가비 결제 연동 (PRO)
```

**👉 결제 → 바로 체감**

---

## Ⅶ. 장애/분쟁 대비 체크

### ✅ 결제 금액 서버 재계산
- 프론트에서 계산한 금액 절대 신뢰 ❌
- 서버에서 항상 재계산 ⭕

### ✅ Webhook 서명 검증
- 토스페이먼츠 서명 검증 필수
- 위조 요청 차단

### ✅ 중복 결제 방지
- `paymentId = applicationId` (1:1 관계)
- 동일 신청 중복 결제 불가

### ✅ 환불 정책 명시
- 환불 규정 문서화
- 환불 처리 프로세스 정의

### ✅ paid → ready 되돌림 불가
- 결제 완료 후 되돌리기 불가 (데이터 무결성)

---

## Ⅷ. 법적/운영 필수 (v2)

### ✅ 전자상거래 약관
- 구매/결제 약관 페이지
- 환불 규정 명시

### ✅ 환불 규정
- 환불 가능 기간
- 환불 처리 절차
- 부분 환불 정책

### ✅ 사업자 정보 노출
- 사업자 등록번호
- 대표자명
- 연락처
- 주소

### ✅ 세금계산서/영수증 발행 플로우
- 영수증 자동 발행 (결제 완료 시)
- 세금계산서 요청 플로우

---

## Ⅸ. 구현 체크리스트

### Backend (Cloud Functions)

- [ ] `approveApplicationCallable`: 승인 시 결제 요청 생성 로직 확인
- [ ] `createPaymentRequest`: 요금제 체크 로직 추가
- [ ] `onPaymentWebhook`: 결제 완료 시 plan 활성화
- [ ] 기능별 가드 로직 추가 (엑셀, 알림 등)

### Frontend

- [ ] `Association` 타입에 `plan`, `billingStatus` 필드 추가
- [ ] 요금제별 기능 가드 컴포넌트
- [ ] 결제 성공 후 UX 개선
- [ ] 요금제 업그레이드 플로우

### Database

- [ ] `associations` 컬렉션에 `plan`, `billingStatus` 필드 확인
- [ ] `payments` 컬렉션에 `planType` 필드 추가

### Legal/Policy

- [ ] 전자상거래 약관 페이지
- [ ] 환불 규정 페이지
- [ ] 사업자 정보 페이지
- [ ] 세금계산서/영수증 발행 플로우 문서화

---

## 🧠 천재 요약 (최종)

**v1은 '운영 가능성'을 증명했고,**
**v2는 '지속 수익'을 보장한다.**

승인 → 결제 → 기능 → 운영

이 고리가 닫힌 순간, 서비스는 끝이 아니라 시작이다.

---

## 🎉 최종 상태 선언

지금 너의 플랫폼은:

- ❌ MVP 아님
- ❌ 프로토타입 아님
- ✅ 실제 협회가 써도 되는 SaaS
- ✅ 돈 받아도 되는 구조

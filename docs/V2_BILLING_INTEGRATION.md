# 💰 v2 요금제 과금 연결 설계 (실전 운영판)

## 🎯 목표

**"써도 되는 서비스 → 돈 받는 서비스"** 완성

---

## Ⅰ. 요금제 구조

### 플랜 타입

```typescript
type PlanType = "free" | "basic" | "pro";
```

### 플랜별 기능 매핑

| 기능 | FREE | BASIC | PRO |
|------|------|-------|-----|
| 참가 신청 관리 | ✅ | ✅ | ✅ |
| 선수 명단 관리 | ✅ | ✅ | ✅ |
| 엑셀 다운로드 | ❌ | ✅ | ✅ |
| 알림 자동화 | ❌ | ✅ | ✅ |
| 참가비 결제 연동 | ❌ | ❌ | ✅ |
| QR 체크인 | ❌ | ❌ | ✅ |
| 고급 리포트 | ❌ | ❌ | ✅ |

---

## Ⅱ. 과금 방식

### 🔵 BASIC 플랜

**방식 1: 대회당 고정 요금**
- 금액: 대회당 99,000원
- 결제 시점: 대회 승인 직후
- 장점: 협회 결재 통과 쉬움, 예산 예측 쉬움

**방식 2: 월 구독**
- 금액: 월 49,000원
- 결제 시점: 최초 활성화 시, 이후 월 자동
- 장점: 안정적인 수익 흐름

### 🟣 PRO 플랜

**월 구독 + 수수료 혼합**
- 기본 요금: 월 149,000원
- 수수료: 참가비의 3%
- 결제 시점:
  - 기본 요금: 최초 활성화 시, 이후 월 자동
  - 수수료: 참가비 결제 시 자동 차감

**예시:**
- 대회 참가비 총액: 1,500만 원
- 플랫폼 수수료 (3%): 45만 원
- 월 구독료: 14.9만 원
- 총 수익: 59.9만 원

---

## Ⅲ. 결제 플로우

### BASIC 플랜 (대회당 고정 요금)

```
대회 승인
  → 결제 요청 생성 (99,000원)
    → 결제 완료
      → 기능 해금 (엑셀, 알림)
```

### PRO 플랜 (월 구독)

```
플랜 업그레이드 요청
  → 첫 결제 (149,000원)
    → 결제 완료
      → plan = "pro" 활성화
        → 참가비 결제 시 수수료 자동 차감
```

### PRO 플랜 (참가비 수수료)

```
참가비 결제 (300,000원)
  → 플랫폼 수수료 계산 (9,000원)
    → 수수료 자동 차감
      → 협회 입금: 291,000원
        → 플랫폼 수익: 9,000원
```

---

## Ⅳ. Firestore 구조

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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### payments/{applicationId}

```typescript
{
  applicationId: string;
  associationId: string;
  competitionId: string;
  amount: number;  // 🔥 항상 서버 계산
  status: "ready" | "paid" | "failed";
  planType?: "basic" | "pro";  // 어떤 플랜의 결제인지
  // ... 기존 필드
}
```

---

## Ⅴ. 기능 가드 구현

### 프론트 (React)

```typescript
// PlanGuard 컴포넌트 사용
<PlanGuard associationId={id} featureName="exportExcel">
  <ExportExcelButton />
</PlanGuard>

// 또는 usePlanGuard Hook 사용
const { canUse, plan } = usePlanGuard(associationId, "exportExcel");
if (!canUse) {
  return <UpgradeAlert />;
}
```

### 서버 (Cloud Functions)

```typescript
// exportAccountingXlsx 함수 내부
if (association.plan === "free") {
  throw new HttpsError(
    "failed-precondition",
    "이 기능은 BASIC 플랜 이상에서 사용할 수 있습니다."
  );
}
```

**👉 이중 방어로 우회 불가능**

---

## Ⅵ. 결제 성공 후 UX

### 즉시 보상 화면

```
✅ 결제가 완료되었습니다

이제 다음 기능을 사용할 수 있습니다:
- 선수 명단 엑셀 다운로드
- 자동 알림 발송
- 참가비 결제 연동 (PRO)
```

### 기능 해금 애니메이션
- 결제 완료 → 기능 버튼 활성화
- 토스트: "새로운 기능이 해금되었습니다!"

---

## Ⅶ. 장애/분쟁 대비

### ✅ 결제 금액 서버 재계산
- 프론트 계산 금액 절대 신뢰 ❌
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
- 부분 환불 정책

### ✅ paid → ready 되돌림 불가
- 결제 완료 후 되돌리기 불가 (데이터 무결성)

---

## Ⅷ. 법적/운영 필수 (v2)

### ✅ 전자상거래 약관
- 구매/결제 약관 페이지
- 환불 규정 명시
- 결제 방법 안내

### ✅ 환불 규정
- 환불 가능 기간 (7일 이내)
- 환불 처리 절차
- 부분 환불 정책 (사용 기간 비례)

### ✅ 사업자 정보 노출
- 사업자 등록번호
- 대표자명
- 연락처
- 주소
- 이메일

### ✅ 세금계산서/영수증 발행 플로우
- 영수증 자동 발행 (결제 완료 시)
- 세금계산서 요청 플로우
- 발행 내역 조회

---

## Ⅸ. 구현 체크리스트

### Backend (Cloud Functions)

- [ ] `approveApplicationCallable`: 승인 시 결제 요청 생성 로직 확인
- [ ] `createPaymentRequest`: 요금제 체크 로직 추가
- [ ] `onPaymentWebhook`: 결제 완료 시 plan 활성화
- [ ] `exportAccountingXlsx`: BASIC 플랜 가드 추가
- [ ] 알림 자동화 함수: BASIC 플랜 가드 추가
- [ ] 참가비 결제 연동: PRO 플랜 가드 추가

### Frontend

- [ ] `src/utils/planGuard.ts`: 요금제 가드 유틸리티 ✅
- [ ] `src/hooks/useAssociationPlan.ts`: 플랜 조회 Hook ✅
- [ ] `src/components/tournament/PlanGuard.tsx`: 가드 컴포넌트 ✅
- [ ] 엑셀 다운로드 버튼: PlanGuard 적용
- [ ] 알림 발송 버튼: PlanGuard 적용
- [ ] 결제 성공 후 UX 개선
- [ ] 요금제 업그레이드 플로우

### Database

- [ ] `associations` 컬렉션에 `plan`, `billingStatus` 필드 확인
- [ ] `payments` 컬렉션에 `planType` 필드 추가

### Legal/Policy

- [ ] 전자상거래 약관 페이지 (`/ecommerce-terms`)
- [ ] 환불 규정 페이지 (`/refund-policy`)
- [ ] 사업자 정보 페이지 (`/business-info`)
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

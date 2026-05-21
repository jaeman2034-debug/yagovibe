# 💳 v2 결제 연동 설계 문서

## 🎯 목표

승인되면 자동으로 결제 단계 진입
- 운영자: 입금 확인 ❌ (자동화)
- 팀장: 헷갈림 ❌ (명확한 플로우)
- 시스템: 금액/상태 불일치 0 (서버 검증)

## 1️⃣ 결제의 위치 (아키텍처 핵심)

### 정답 흐름

```
참가 신청 (pending)
  → 관리자 승인 (approved)
    → 결제 요청 생성 (ready)
      → 결제 완료 (paid)
        → 선수 명단 제출 가능
```

**👉 결제는 '승인 이후'에만 존재**

## 2️⃣ 결제 단일 기준 (절대 규칙)

- 결제 금액은 오직 `teamCount → calcTotalFee()` 결과만 사용
- ❌ DB에 totalFee 저장
- ⭕ 결제 요청 시 서버에서 재계산

## 3️⃣ Firestore 데이터 모델 (v2)

### 경로
```
associations/{associationId}/tournaments/{tournamentId}/payments/{applicationId}
```

### 필드 구조
```typescript
{
  applicationId: string;        // applicationId와 동일 (1:1 관계)
  associationId: string;
  competitionId: string;        // tournamentId
  teamName: string;
  amount: number;              // 🔥 서버 계산값만 사용
  status: "ready" | "paid" | "failed" | "cancelled";
  method: "card" | "transfer" | "virtual_account" | null;
  paymentKey?: string | null;  // 토스페이먼츠 결제 키
  orderId: string;             // "app_{applicationId}"
  receiptUrl?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  paidAt?: Timestamp | null;
}
```

**👉 paymentId = applicationId (1:1 권장)**
→ 중복 결제 구조 원천 차단

## 4️⃣ 승인 Cloud Function 확장

### `approveApplicationCallable`

승인 완료 직후 자동으로 결제 요청 생성:

```typescript
// 승인 완료 직후
const amount = calcTotalFee(application.teamCount, feePolicy);

await db.collection("payments").doc(applicationId).set({
  applicationId,
  associationId: application.associationId,
  competitionId: application.competitionId,
  amount,
  status: "ready",  // 🔥 결제 대기 상태
  method: null,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
});
```

**👉 승인 = 결제 단계 진입**

## 5️⃣ 팀장 UX (결제 화면)

### 승인 후 팀장 화면에 자동 노출

```
참가 신청이 승인되었습니다 ✅

참가비: 300,000원
결제 기한: 2024-03-20

[ 참가비 결제하기 ]
```

### 버튼 노출 조건
- `application.status === "approved"`
- `payment.status === "ready"`

## 6️⃣ PG 선택

### v2 최적: 토스페이먼츠

- 카드 + 계좌이체
- Webhook 안정성
- 국내 UX 최강

(카카오페이는 v2.1에서 추가)

## 7️⃣ 결제 처리 흐름 (보안 정답)

### ❌ 프론트에서 paid 처리
→ 위조 가능 ❌

### ⭕ 정답 구조
```
프론트: 결제 요청
  → PG 결제창
    → PG Webhook
      → Cloud Function 검증
        → payments.status = "paid"
```

## 8️⃣ Webhook Cloud Function

### `onPaymentWebhook`

```typescript
export const onPaymentWebhook = functions.https.onRequest(
  async (req, res) => {
    const { orderId, amount, paymentKey } = req.body;

    // 1️⃣ 토스 서버에 결제 검증
    const verified = await verifyWithToss(paymentKey, amount);
    if (!verified) return res.status(400).send("Invalid");

    // 2️⃣ Firestore 업데이트
    await db.collection("payments").doc(orderId).update({
      status: "paid",
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.send("OK");
  }
);
```

## 9️⃣ 결제 완료 후 자동 해금

`paid` 상태가 되면:
- 선수 명단 제출 버튼 활성
- 어드민에 "결제 완료" 표시
- (선택) 자동 영수증 메일 발송

## 🔟 실패/취소 UX

### 결제 실패
```
결제가 완료되지 않았습니다.
다시 시도하시거나 협회로 문의해주세요.
```

👉 상태는 `ready` 유지

## 🔐 보안 필수 체크

- `amount`: 서버 계산값만 신뢰
- Webhook IP / Signature 검증
- `paid → ready` 되돌림 ❌

## 📁 주요 파일

### Frontend
- `src/types/payment.ts` - Payment 타입 정의
- `src/components/tournament/PaymentButton.tsx` - 결제 버튼 컴포넌트
- `src/hooks/usePayment.ts` - 결제 정보 조회 Hook
- `src/components/tournament/ApplicationList.tsx` - 결제 버튼 통합
- `src/pages/my/applications/components/RosterFooterActions.tsx` - 결제 완료 후 명단 제출 가능

### Backend
- `functions/src/tournament/approveApplication.ts` - 승인 시 결제 요청 자동 생성
- `functions/src/tournament/createPaymentRequest.ts` - 결제 요청 생성 (토스페이먼츠 연동)
- `functions/src/tournament/onPaymentWebhook.ts` - 결제 완료 Webhook 처리

## 🧠 천재 요약

결제는 '기능'이 아니라 '상태 머신'이다.

승인 → 결제 → 명단 → 운영

이 흐름이 끊기지 않으면 사고가 없다.

# 💳 결제 연동 설계 (v2 - 실전 수익화)

## 📋 개요

참가 신청 승인 후 결제를 처리하는 시스템입니다.

**핵심 원칙:**
- 결제는 "참가 신청의 연장선"
- 승인 이후에만 결제 가능
- Webhook 기반 안전한 처리
- 결제 완료 후 자동으로 다음 단계 연결

---

## 🎯 결제 플로우

### 전체 흐름

```
① 참가 신청 (pending)
   ↓
② 협회 승인 (approved)
   ↓
③ 결제 요청 (payment.status = "ready")
   ↓
④ 결제 완료 (payment.status = "paid")
   ↓
⑤ 선수 명단 제출 가능 (rosterStatus = "draft")
   ↓
⑥ 선수 명단 제출 (rosterStatus = "submitted")
   ↓
⑦ 운영 확정 (locked)
```

---

## 🗄️ Firestore 데이터 구조

### Payment 문서

**경로:** `associations/{associationId}/tournaments/{tournamentId}/applications/{applicationId}/payments/{paymentId}`

```typescript
interface Payment {
  id: string;
  applicationId: string;
  associationId: string;
  tournamentId: string;
  
  // 결제 정보
  amount: number;              // 결제 금액 (totalFee)
  status: "ready" | "paid" | "failed" | "cancelled";
  method?: "card" | "transfer" | "kakao" | "toss";
  
  // PG 연동 정보
  paymentKey?: string;          // 토스페이먼츠 paymentKey
  orderId?: string;            // 주문 ID (applicationId 기반)
  
  // 결제 완료 정보
  paidAt?: Timestamp;
  paidBy?: string;             // 결제한 사용자 UID
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Application 문서 업데이트

```typescript
interface TournamentApplication {
  // ... 기존 필드
  
  // 결제 상태 (Functions가 자동 집계)
  paymentStatus?: "UNPAID" | "PAID" | "PARTIAL";
  paidTotal?: number;
  dueAmount?: number;
  lastPaymentAt?: Timestamp;
}
```

---

## 🔧 Cloud Functions

### 1. 결제 요청 생성 (`createPaymentRequest`)

```typescript
export const createPaymentRequest = onCall(async (request) => {
  const { associationId, tournamentId, applicationId } = request.data;
  
  // 1. 권한 확인 (팀장만)
  // 2. Application 조회 (approved 확인)
  // 3. Payment 문서 생성 (status: "ready")
  // 4. 토스페이먼츠 결제 요청 생성
  // 5. 결제 URL 반환
});
```

### 2. 결제 완료 Webhook (`onPaymentWebhook`)

```typescript
export const onPaymentWebhook = onRequest(async (req, res) => {
  const { paymentKey, orderId, amount, status } = req.body;
  
  // 1. 토스페이먼츠 서버에 결제 검증
  // 2. Payment 문서 업데이트 (status: "paid")
  // 3. Application.paymentStatus 자동 업데이트 (트리거)
  // 4. 결제 완료 알림 (선택)
  
  res.send("OK");
});
```

---

## 🎨 프론트엔드 UX

### 승인 후 화면

**위치:** 마이페이지 → 참가 내역

**표시 조건:**
- `status === "approved"`
- `paymentStatus !== "PAID"`

**UI:**
```
✅ 참가 신청이 승인되었습니다.

참가비: 300,000원
결제 기한: 3월 12일까지

[ 참가비 결제하기 ]
```

### 결제 완료 후

**자동 변경:**
- 결제 버튼 → "✅ 결제 완료"
- "📝 선수 명단 등록하기" 버튼 활성화

---

## 🔐 보안 고려사항

1. **Webhook 검증 필수:** 토스페이먼츠 서버에서 온 요청만 처리
2. **금액 검증:** Webhook의 `amount`와 Firestore의 `totalFee` 일치 확인
3. **중복 결제 방지:** `payment.status === "paid"`인 경우 재결제 차단
4. **프론트엔드 금지:** 프론트엔드에서 직접 `status = "paid"` 설정 금지

---

## 📊 상태 머신

| 단계 | Application | Payment | UX |
|------|-------------|---------|-----|
| 신청 | pending | - | 대기 중 |
| 승인 | approved | - | 결제 버튼 표시 |
| 결제 시도 | approved | ready | 결제창 열림 |
| 결제 완료 | approved | paid | 선수 명단 버튼 활성 |
| 명단 제출 | approved | paid | 제출 완료 |
| 운영 확정 | locked | paid | 읽기 전용 |

---

## 🚀 구현 순서

1. **Payment 인터페이스 보완** (토스페이먼츠 필드 추가)
2. **결제 요청 Cloud Function** (`createPaymentRequest`)
3. **결제 완료 Webhook** (`onPaymentWebhook`)
4. **프론트엔드: 결제 버튼** (승인 후 표시)
5. **결제 완료 후 자동 연결** (선수 명단 버튼 활성화)

---

**🔥 이 구조가 완성되면 참가 신청 → 승인 → 결제 → 명단 → 운영이 완전히 자동화됩니다.**

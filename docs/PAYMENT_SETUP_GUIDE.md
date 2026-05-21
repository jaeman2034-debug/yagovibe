# 💳 Stripe 결제 연동 설정 가이드

## 🎯 목표

**"Stripe 키만 넣으면 바로 실결제 테스트 가능한 수준"**으로 설정 완료.

---

## 1️⃣ Stripe 대시보드 설정

### Test Mode 활성화
1. [Stripe 대시보드](https://dashboard.stripe.com) 로그인
2. 좌측 상단 "Test mode" 토글 ON 확인

### Product 생성
1. Products > Add product
2. **Name**: `AI 팀 블로그 Pro`
3. **Description**: `팀 홍보를 AI가 자동으로 관리하는 Pro 플랜`
4. Save

### Price 생성 (월간)
1. Product 페이지에서 "Add price" 클릭
2. **Price**: `19,000 KRW`
3. **Billing period**: `Monthly (recurring)`
4. **Price ID** 복사 (`price_xxx`) → 저장

### Price 생성 (연간, 선택)
1. 동일 Product에서 "Add price" 클릭
2. **Price**: `180,000 KRW` (월 15,000원)
3. **Billing period**: `Yearly (recurring)`
4. **Price ID** 복사 (`price_yyy`) → 저장

---

## 2️⃣ Firebase Functions 환경 변수 설정

### 방법 1: Firebase Config (권장)

```bash
firebase functions:config:set \
  stripe.secret="sk_test_xxx" \
  stripe.price_team_pro_month="price_xxx" \
  stripe.price_team_pro_year="price_yyy" \
  stripe.webhook_secret="whsec_xxx" \
  app.base_url="https://your-app-url.com"
```

### 방법 2: .env 파일 (로컬 개발)

`functions/.env` 파일 생성:

```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PRICE_TEAM_PRO_MONTH=price_xxx
STRIPE_PRICE_TEAM_PRO_YEAR=price_yyy
STRIPE_WEBHOOK_SECRET=whsec_xxx
APP_BASE_URL=https://localhost:5173
```

> ⚠️ `.env` 파일은 `.gitignore`에 추가되어 있어야 합니다.

---

## 3️⃣ Stripe Webhook 설정

### Functions 배포 후 Webhook URL 확인

```bash
firebase deploy --only functions:stripeWebhook
```

배포 후 URL 형식:
```
https://asia-northeast3-<project-id>.cloudfunctions.net/stripeWebhook
```

### Webhook 엔드포인트 등록

1. Stripe 대시보드 > Developers > Webhooks
2. "Add endpoint" 클릭
3. **Endpoint URL**: 위 URL 입력
4. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. "Add endpoint" 클릭
6. **Signing secret** 복사 (`whsec_xxx`) → 환경 변수에 저장

---

## 4️⃣ Functions 코드에서 환경 변수 사용

### Config 방식 (Firebase Functions Config)

```typescript
// functions/src/createCheckoutSession.ts
const stripe = new Stripe(functions.config().stripe.secret, {
  apiVersion: "2023-10-16",
});
const PRICE_MONTH = functions.config().stripe.price_team_pro_month;
const APP_BASE_URL = functions.config().app.base_url;
```

### .env 방식 (로컬 개발)

```typescript
// functions/src/createCheckoutSession.ts
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16",
});
const PRICE_MONTH = process.env.STRIPE_PRICE_TEAM_PRO_MONTH as string;
const APP_BASE_URL = process.env.APP_BASE_URL || "https://localhost:5173";
```

> ⚠️ 현재 코드는 `process.env` 방식으로 작성되어 있습니다.  
> 배포 시 Firebase Config로 전환하거나, 환경 변수를 Functions에 직접 설정해야 합니다.

---

## 5️⃣ Functions 배포

```bash
cd functions
npm install stripe  # Stripe 패키지 설치 확인
npm run build
firebase deploy --only functions:createCheckoutSession,functions:stripeWebhook,functions:createBillingPortalSession
```

---

## 6️⃣ 테스트 카드

### 성공 카드
```
카드 번호: 4242 4242 4242 4242
만료일: 12/34
CVC: 123
```

### 실패 카드 (테스트용)
```
카드 번호: 4000 0000 0000 0002 (카드 거부)
만료일: 12/34
CVC: 123
```

---

## 7️⃣ 실결제 테스트 체크리스트

자세한 내용은 [`docs/PAYMENT_TEST_CHECKLIST.md`](./PAYMENT_TEST_CHECKLIST.md) 참고.

### 빠른 체크리스트
- [ ] Stripe Test Mode 활성화
- [ ] Product & Price 생성 완료
- [ ] Webhook 엔드포인트 등록
- [ ] Functions 환경 변수 설정
- [ ] Functions 배포 완료
- [ ] Firestore 보안 규칙 배포 완료
- [ ] 테스트 카드로 결제 성공 확인
- [ ] Webhook 수신 확인
- [ ] Firestore 업데이트 확인
- [ ] Pro 기능 활성화 확인

---

## 8️⃣ Production 전환 (실제 결제)

### Live Mode 전환
1. Stripe 대시보드에서 "Live mode" 토글 ON
2. Live API Key 복사 (`sk_live_xxx`)
3. Live Price ID 확인 (Test와 다를 수 있음)
4. Live Webhook 엔드포인트 등록
5. 환경 변수 업데이트 후 재배포

### 주의사항
- ⚠️ Test Mode와 Live Mode는 완전히 분리됩니다
- ⚠️ Live Mode에서는 실제 결제가 발생합니다
- ⚠️ Webhook 엔드포인트도 Live Mode용으로 별도 등록 필요

---

## 9️⃣ 문제 해결

### Webhook 수신 안 됨
- [ ] Webhook URL이 정확한지 확인
- [ ] Functions 로그 확인: `firebase functions:log --only stripeWebhook`
- [ ] Stripe 대시보드 > Webhooks > Events에서 이벤트 전송 확인

### 결제 세션 생성 실패
- [ ] 환경 변수 설정 확인
- [ ] Stripe API Key 유효성 확인
- [ ] Price ID 정확성 확인
- [ ] Functions 로그 확인: `firebase functions:log --only createCheckoutSession`

### Firestore 업데이트 안 됨
- [ ] Firestore 보안 규칙 확인
- [ ] Webhook 서명 검증 확인
- [ ] Functions 로그에서 에러 확인

---

## 🔥 다음 단계

체크리스트 통과 후:
- [ ] 초기 10팀 확보 전략 실행
- [ ] 가격 A/B 테스트 준비
- [ ] 실제 매출 모니터링


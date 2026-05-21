# 💳 Stripe 결제 연동 설정 가이드

## 0️⃣ 사전 준비 (체크리스트)

### 1. Stripe 계정 생성
- [ ] [Stripe Dashboard](https://dashboard.stripe.com) 가입
- [ ] 테스트 모드 활성화

### 2. Products / Prices 생성

#### Stripe Dashboard → Products
1. **Product 생성**
   - Name: "Team Pro"
   - Description: "팀 운영을 위한 Pro 플랜"

2. **Price 생성 (Monthly)**
   - Type: Recurring
   - Price: 29,000원 (KRW)
   - Billing period: Monthly
   - Price ID: `price_xxxxx` (복사해두기)

3. **Price 생성 (Yearly)**
   - Type: Recurring
   - Price: 290,000원 (KRW)
   - Billing period: Yearly
   - Price ID: `price_xxxxx` (복사해두기)

### 3. Webhook 엔드포인트 설정

#### Stripe Dashboard → Developers → Webhooks
1. **엔드포인트 추가**
   - Endpoint URL: `https://asia-northeast3-your-project.cloudfunctions.net/stripeWebhook`
   - 설명: 팀 플랜 업데이트

2. **이벤트 선택**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

3. **Signing secret 복사**
   - Webhook 설정 → Signing secret
   - `whsec_xxxxx` (복사해두기)

### 4. API 키 확인

#### Stripe Dashboard → Developers → API keys
- **Secret key**: `sk_test_xxxxx` (테스트) / `sk_live_xxxxx` (프로덕션)
- **Publishable key**: `pk_test_xxxxx` (테스트) / `pk_live_xxxxx` (프로덕션)

## 1️⃣ Firebase Functions 환경 변수 설정

### Firebase Console 설정
```bash
# Firebase Functions 환경 변수 설정
firebase functions:config:set \
  stripe.secret_key="sk_test_xxxxx" \
  stripe.webhook_secret="whsec_xxxxx" \
  stripe.price_team_pro_month="price_xxxxx" \
  stripe.price_team_pro_year="price_xxxxx" \
  app.base_url="https://your-domain.com"
```

### 또는 .env 파일 (로컬 개발)
```bash
# functions/.env
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_TEAM_PRO_MONTH=price_xxxxx
STRIPE_PRICE_TEAM_PRO_YEAR=price_xxxxx
APP_BASE_URL=http://localhost:5173
```

## 2️⃣ 로컬 테스트 (Stripe CLI)

### Stripe CLI 설치
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (Chocolatey)
choco install stripe

# 또는 직접 다운로드
# https://stripe.com/docs/stripe-cli
```

### 로그인 및 Webhook 포워딩
```bash
# 1. Stripe CLI 로그인
stripe login

# 2. Webhook 포워딩 (로컬 Functions 실행 중)
stripe listen --forward-to http://localhost:5001/your-project/asia-northeast3/stripeWebhook

# 3. Webhook Secret 확인 (터미널에 표시됨)
# 예: whsec_xxxxx (로컬 테스트용)
```

### 테스트 이벤트 트리거
```bash
# Checkout 완료 이벤트
stripe trigger checkout.session.completed

# 구독 생성 이벤트
stripe trigger customer.subscription.created
```

## 3️⃣ 프로덕션 배포

### 1. Functions 배포
```bash
firebase deploy --only functions:stripeWebhook,functions:createCheckoutSession
```

### 2. Webhook 엔드포인트 업데이트
- Stripe Dashboard → Webhooks
- 엔드포인트 URL을 프로덕션 URL로 변경
- Signing secret 확인 (변경되지 않음)

### 3. 프로덕션 키로 전환
```bash
# 프로덕션 환경 변수 설정
firebase functions:config:set \
  stripe.secret_key="sk_live_xxxxx" \
  stripe.webhook_secret="whsec_xxxxx" \
  app.base_url="https://your-domain.com"
```

## 4️⃣ 테스트 카드

### Stripe 테스트 카드
- **카드 번호**: `4242 4242 4242 4242`
- **유효기간**: 미래 날짜 (예: 12/34)
- **CVC**: 아무 숫자 (예: 123)
- **우편번호**: 아무 숫자 (예: 12345)

### 기타 테스트 시나리오
- **결제 실패**: `4000 0000 0000 0002`
- **인증 필요**: `4000 0027 6000 3184`
- **3D Secure**: `4000 0025 0000 3155`

## 5️⃣ 모니터링

### Firebase Functions 로그
```bash
# 전체 로그
firebase functions:log

# 특정 함수 로그
firebase functions:log --only stripeWebhook
firebase functions:log --only createCheckoutSession
```

### Stripe Dashboard
- **Payments**: 결제 내역 확인
- **Customers**: 고객 정보 확인
- **Subscriptions**: 구독 상태 확인
- **Webhooks**: Webhook 이벤트 로그 확인

## 6️⃣ 문제 해결

### Webhook 서명 검증 실패
- **원인**: Webhook Secret 불일치
- **해결**: Firebase Functions 환경 변수 확인

### 플랜 변경 안 됨
- **원인**: Webhook 이벤트 미수신
- **해결**: Stripe Dashboard → Webhooks → 이벤트 로그 확인

### 결제 성공 후 플랜 미반영
- **원인**: refreshTeam() 실패
- **해결**: BillingSuccessPage 로그 확인

---

**설정 완료**: Stripe 결제 시스템 준비 완료! 🎉

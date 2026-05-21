# 💳 Stripe 결제 연동 완료 (실서비스 기준)

## ✅ 구현 완료 사항

### 1️⃣ Checkout Session 생성 (`functions/src/createCheckoutSession.ts`)
- ✅ 관리자 권한 체크
- ✅ Stripe Customer 생성/재사용
- ✅ Checkout 세션 생성
- ✅ `teamId`, `adminUid` 메타데이터 포함

### 2️⃣ Stripe Webhook (`functions/src/stripeWebhook.ts`)
- ✅ 서명 검증
- ✅ `customer.subscription.created` / `updated` 처리
- ✅ `customer.subscription.deleted` 처리
- ✅ 트랜잭션으로 원자성 보장
- ✅ 플랜 변경 + AuditLog 자동 기록

### 3️⃣ 클라이언트 Upgrade 플로우
- ✅ `UpgradePage`: Stripe Checkout 세션 생성 요청
- ✅ `BillingSuccessPage`: 결제 성공 후 플랜 즉시 갱신
- ✅ `BillingCancelPage`: 결제 취소 처리

## 🔄 전체 플로우 (한 눈에)

```
1. 사용자: Pro 기능 접근 시도
   ↓
2. TeamGuard: 플랜 체크 → Free면 /upgrade로 리디렉션
   ↓
3. UpgradePage: "Pro로 업그레이드" 버튼 클릭
   ↓
4. createCheckoutSession: Stripe Checkout 세션 생성
   ↓
5. Stripe: 결제 처리
   ↓
6. stripeWebhook (customer.subscription.created):
   - teams/{teamId}.plan = "pro" (트랜잭션)
   - teams/{teamId}/subscription/current 업데이트
   - AuditLog 기록 (PLAN_CHANGED)
   ↓
7. BillingSuccessPage:
   - refreshTeam() 호출
   - 플랜 즉시 반영
   - /t/:teamId로 리디렉션
   ↓
8. Pro 기능 사용 가능
```

## 🔐 핵심 원칙

### 결제 성공 = 플랜 상태 전이
- ✅ 결제 성공 → `teams.plan = "pro"`
- ✅ 결제 실패/취소 → 상태 변화 ❌
- ✅ 모든 변화는 서버에서만

### 트랜잭션으로 원자성 보장
```typescript
await db.runTransaction(async (transaction) => {
  // 1. 팀 문서 읽기
  // 2. 구독 정보 업데이트
  // 3. 플랜 변경 (필요한 경우만)
  // 4. AuditLog는 트랜잭션 외부에서 (실패해도 플랜 변경은 성공)
});
```

### 중복 이벤트 안전
- ✅ 트랜잭션으로 idempotent
- ✅ 플랜 변경 전 oldPlan 체크

## 📋 환경 변수 설정

### Firebase Functions 환경 변수
```bash
# Stripe 설정
STRIPE_SECRET_KEY=sk_live_...           # 또는 sk_test_... (개발)
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs (Stripe Dashboard에서 생성)
STRIPE_PRICE_TEAM_PRO_MONTH=price_...   # 월간 구독
STRIPE_PRICE_TEAM_PRO_YEAR=price_...    # 연간 구독

# 앱 URL
APP_BASE_URL=https://your-domain.com    # 프로덕션
```

### Stripe Dashboard 설정
1. **Products / Prices 생성**
   - Product: "Team Pro"
   - Price (monthly): 월 29,000원
   - Price (yearly): 연 290,000원 (선택)

2. **Webhook 엔드포인트 설정**
   - URL: `https://your-region-your-project.cloudfunctions.net/stripeWebhook`
   - 이벤트:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`

3. **Webhook Secret 복사**
   - Webhook 설정 → Signing secret 복사
   - Firebase Functions 환경 변수에 설정

## 🧪 테스트

### 로컬 테스트 (Stripe CLI)
```bash
# 1. Stripe CLI 설치
brew install stripe/stripe-cli/stripe

# 2. 로그인
stripe login

# 3. Webhook 포워딩 (로컬 Functions)
stripe listen --forward-to http://localhost:5001/your-project/asia-northeast3/stripeWebhook

# 4. Webhook Secret 확인 (터미널에 표시됨)
# 5. 테스트 이벤트 트리거
stripe trigger checkout.session.completed
```

### E2E 테스트 체크리스트
- [ ] Free 팀 → Upgrade 버튼 클릭
- [ ] Stripe Checkout 페이지 이동 확인
- [ ] 테스트 카드로 결제 (4242 4242 4242 4242)
- [ ] 결제 성공 후 BillingSuccessPage 이동
- [ ] 플랜 즉시 "pro"로 변경 확인
- [ ] AuditLog에 PLAN_CHANGED 기록 확인
- [ ] Pro 기능 접근 가능 확인

## ⚡ UX 즉시 반영 전략

### 결제 완료 후
- ✅ `refreshTeam()` 호출
- ✅ 플랜 즉시 반영
- ✅ Pro 기능 즉시 사용 가능

### ❌ 넣지 않은 것
- ❌ 다시 로그인
- ❌ 새로고침
- ❌ "영업 문의"
- ❌ "나중에 연락"

## 🔐 Firestore Rules (재확인)

```javascript
match /teams/{teamId} {
  allow read: if isActiveMember(teamId);
  allow write: if false; // plan 변경은 서버 only
}
```

## 📊 모니터링

### 로그 확인
```bash
# Firebase Functions 로그
firebase functions:log

# 특정 함수 로그
firebase functions:log --only stripeWebhook
```

### 주요 로그 메시지
- ✅ `✅ [createCheckoutSession] team=${teamId} session=${session.id}`
- ✅ `✅ [stripeWebhook] Subscription created team=${teamId} status=${status}`
- ✅ `✅ [writeAuditLog] Audit log 기록 완료`

## 🎯 최종 상태

이제 서비스는:
- ✅ 팀/권한 ✔
- ✅ 멀티 팀 ✔
- ✅ 멀티 플랜 ✔
- ✅ 온보딩 ✔
- ✅ AuditLogs ✔
- ✅ 결제/업그레이드 ✔

**👉 진짜로 "돈 받을 수 있는 SaaS" 상태다.**

---

**구현 완료**: Stripe 결제 연동 100% 완성! 🎉

**다음 단계**: Admin/Owner 운영 대시보드 또는 Usage 기반 과금 설계

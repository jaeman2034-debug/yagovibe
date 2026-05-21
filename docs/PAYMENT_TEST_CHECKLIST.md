# 💳 실결제 테스트 체크리스트 (Release Gate)

## 🎯 목표

**"관리자가 결제 → 즉시 Pro 활성화 → 해지 → Free 복귀"**  
이 사이클이 한 번에 끊김 없이 돌아가면 통과.

---

## 1️⃣ 사전 세팅 (5분 컷)

### Stripe 대시보드

#### Test Mode ON
- [ ] Stripe 대시보드에서 Test Mode 활성화
- [ ] Test API Key 확인 (`sk_test_...`)

#### Product 생성
- [ ] Product: "AI 팀 블로그 Pro" 생성
- [ ] Description: "팀 홍보를 AI가 자동으로 관리하는 Pro 플랜"

#### Price 생성
- [ ] Price 1: 월 ₩19,000 (monthly) - `price_xxx` 저장
- [ ] (선택) Price 2: 연 ₩180,000 (yearly) - `price_yyy` 저장

#### Webhook 엔드포인트 등록
- [ ] Functions 배포 후 Webhook URL 확인: `https://<region>-<project>.cloudfunctions.net/stripeWebhook`
- [ ] Stripe 대시보드 > Developers > Webhooks > Add endpoint
- [ ] URL 입력 후 Signing Secret 복사 (`whsec_...`)
- [ ] 이벤트 선택:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_failed`

### Firebase Functions 환경 변수

```bash
# Firebase Functions Config 설정
firebase functions:config:set \
  stripe.secret="sk_test_xxx" \
  stripe.price_team_pro_month="price_xxx" \
  stripe.price_team_pro_year="price_yyy" \
  stripe.webhook_secret="whsec_xxx" \
  app.base_url="https://your-app-url.com"
```

또는 `.env` 파일 (로컬 개발용):
```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PRICE_TEAM_PRO_MONTH=price_xxx
STRIPE_PRICE_TEAM_PRO_YEAR=price_yyy
STRIPE_WEBHOOK_SECRET=whsec_xxx
APP_BASE_URL=https://localhost:5173
```

### Functions 배포

```bash
cd functions
npm install stripe  # Stripe 패키지 설치 확인
npm run build
firebase deploy --only functions:createCheckoutSession,functions:stripeWebhook,functions:createBillingPortalSession
```

### Firestore 보안 규칙

- [ ] `firestore.rules`에 `teams/{teamId}/subscription/current` 규칙 추가 확인
- [ ] 읽기: 팀 멤버 모두 가능
- [ ] 쓰기: Functions에서만 가능 (`allow write: if false;`)
- [ ] 배포: `firebase deploy --only firestore:rules`

---

## 2️⃣ 권한 테스트 (가장 중요)

### A. 관리자(admin/manager)

- [ ] 팀 대시보드 > 📝 팀 블로그 탭 진입
- [ ] [Pro 시작하기] 버튼 노출 확인
- [ ] 버튼 클릭 → `/pricing/team-blog` 페이지 이동 확인
- [ ] 결제 버튼 클릭 → Stripe Checkout 페이지 이동 확인

**통과 기준**: 관리자는 결제 플로우 전체 접근 가능

### B. 일반 멤버(member)

- [ ] 일반 멤버로 로그인
- [ ] 팀 대시보드 > 📝 팀 블로그 탭 진입
- [ ] [Pro 시작하기] 버튼 **미노출** 확인
- [ ] `/pricing/team-blog` URL 직접 접근 시 차단 확인

**통과 기준**: 일반 멤버는 결제 버튼/페이지 접근 불가

---

## 3️⃣ 결제 성공 플로우

### 테스트 카드 (Stripe Test Mode)

```
카드 번호: 4242 4242 4242 4242
만료일: 12/34
CVC: 123
```

### 체크리스트

#### Checkout 단계
- [ ] 결제 버튼 클릭 → Stripe Checkout 페이지 이동
- [ ] 테스트 카드 입력
- [ ] 결제 완료 → `/billing/success?teamId=xxx&session_id=xxx` 리다이렉트

#### Webhook 수신 확인
- [ ] Firebase Functions 로그 확인:
  ```bash
  firebase functions:log --only stripeWebhook
  ```
- [ ] `checkout.session.completed` 이벤트 수신 확인
- [ ] `customer.subscription.created` 이벤트 수신 확인

#### Firestore 업데이트 확인
- [ ] `teams/{teamId}/subscription/current` 문서 확인:
  ```json
  {
    "plan": "pro",
    "status": "active",
    "stripeCustomerId": "cus_xxx",
    "stripeSubscriptionId": "sub_xxx",
    "currentPeriodEnd": Timestamp,
    "updatedAt": Timestamp
  }
  ```
- [ ] `teams/{teamId}.plan = "pro"` 동기화 확인

#### 즉시 Pro 기능 활성화
- [ ] 페이지 새로고침 없이도 Pro 상태 반영 확인
- [ ] 블로그 관리 탭에서 Pro 배지 표시 확인
- [ ] 주간 요약 생성 버튼 활성화 확인
- [ ] 무제한 후기 생성 가능 확인
- [ ] YAGO 브랜딩 제거 확인 (Pro 플랜일 때)

**통과 기준**: 새로고침 없이도 Pro 상태 즉시 반영

---

## 4️⃣ 결제 실패 / 중단

### A. Checkout 취소

- [ ] Checkout 페이지에서 "뒤로 가기" 또는 취소 버튼 클릭
- [ ] `/billing/cancel?teamId=xxx` 리다이렉트 확인
- [ ] "괜찮아요 🙂 다음 자동 글이 생성될 때 다시 알려드릴게요" 메시지 확인
- [ ] `teams/{teamId}/subscription/current` 문서 확인 → `plan: "free"` 유지

**통과 기준**: 취소 시 기존 상태 유지, 압박 없는 메시지

### B. 결제 실패 (카드 에러)

- [ ] 테스트 카드: `4000 0000 0000 0002` (카드 거부)
- [ ] 결제 시도 → 에러 메시지 확인
- [ ] `invoice.payment_failed` Webhook 수신 확인
- [ ] `teams/{teamId}/subscription/current.status = "past_due"` 확인
- [ ] Pro 기능 비활성화 또는 유예 처리 확인

**통과 기준**: 결제 실패 시 적절한 상태 처리

---

## 5️⃣ 해지 테스트 (신뢰 핵심)

### Stripe Customer Portal

- [ ] 팀 대시보드 > 블로그 탭에서 "구독 관리" 버튼 클릭
- [ ] `createBillingPortalSession` 호출 확인
- [ ] Stripe Customer Portal 페이지 이동 확인
- [ ] "구독 취소" 버튼 클릭
- [ ] 해지 확인

### 해지 후 확인

- [ ] `customer.subscription.deleted` Webhook 수신 확인
- [ ] Firestore 업데이트 확인:
  ```json
  {
    "plan": "free",
    "status": "canceled",
    "stripeSubscriptionId": "sub_xxx",
    "updatedAt": Timestamp
  }
  ```
- [ ] `teams/{teamId}.plan = "free"` 동기화 확인
- [ ] Pro 기능 OFF 확인 (주간 요약 버튼 비활성화 등)
- [ ] **기존 블로그 글은 유지** 확인 (중요!)

**통과 기준**: 해지해도 데이터는 남고, 신뢰는 유지

---

## 6️⃣ Analytics 확인

### 확인할 이벤트

- [ ] `upgrade_click` - 업그레이드 버튼 클릭
- [ ] `checkout_started` - Checkout 세션 생성
- [ ] `checkout_success` - 결제 성공
- [ ] `checkout_canceled` - 결제 취소
- [ ] `subscription_canceled` - 구독 해지

### Firebase Analytics 대시보드

- [ ] Firebase Console > Analytics > Events에서 이벤트 확인
- [ ] 전환 퍼널이 숫자로 보임:
  ```
  upgrade_click → checkout_started → checkout_success
  ```

**통과 기준**: 전환 퍼널이 숫자로 보임

---

## 7️⃣ UX 최종 점검 (돈 쓰는 사람 기준)

### 가격 문구 명확성
- [ ] "월 19,000원 / 팀" 명확히 표시
- [ ] "연간 결제 시 월 15,000원" 옵션 표시
- [ ] "커피 한 잔 값으로..." 같은 비유 사용

### 신뢰 문구
- [ ] "언제든 해지 가능" 표시
- [ ] "카드 1번 등록" 표시
- [ ] "숨겨진 비용 없음" 표시

### 결제 후 체감
- [ ] 결제 완료 후 "뭐가 달라졌는지" 바로 느껴지는가?
- [ ] Pro 배지/기능이 즉시 보이는가?
- [ ] 관리자 입장에서 후회 포인트 없음

**통과 기준**: 가격/신뢰/체감 모두 명확

---

## 🟢 Release 판정 기준 (All or Nothing)

아래 3개 전부 만족하면 정식 오픈 OK:

### ✅ 1. 관리자만 결제 가능
- [ ] 일반 멤버는 결제 버튼 미노출
- [ ] 직접 URL 접근 시 차단
- [ ] 권한 체크 완벽

### ✅ 2. 결제/해지 시 상태 즉시 반영
- [ ] 결제 성공 → 즉시 Pro 활성화
- [ ] 해지 → 즉시 Free 복귀
- [ ] 새로고침 없이도 반영

### ✅ 3. Pro 가치가 체감됨
- [ ] 주간 요약 자동 생성 가능
- [ ] 무제한 후기 생성 가능
- [ ] 브랜딩 제거 확인
- [ ] 관리자가 "이거 쓸 만하다" 느낌

---

## 🚀 배포 후 체크리스트

### Production Stripe 설정
- [ ] Live Mode로 전환
- [ ] Live API Key로 환경 변수 업데이트
- [ ] Live Webhook 엔드포인트 등록
- [ ] 실제 결제 테스트 (소액)

### 모니터링
- [ ] Functions 로그 모니터링 설정
- [ ] Webhook 실패 알림 설정
- [ ] 결제 실패율 추적

---

## 📝 테스트 시나리오 (실행 순서)

1. **권한 테스트** (5분)
   - 관리자/일반 멤버 각각 테스트

2. **결제 성공 테스트** (10분)
   - Checkout → Webhook → Firestore → UI 확인

3. **해지 테스트** (5분)
   - Customer Portal → 해지 → Free 복귀 확인

4. **Analytics 확인** (5분)
   - Firebase Analytics 대시보드 확인

**총 소요 시간: 약 25분**

---

## 🔥 다음 단계

체크리스트 통과 후:
- [ ] 초기 10팀 확보 전략 실행
- [ ] 가격 A/B 테스트 준비
- [ ] 실제 매출 모니터링


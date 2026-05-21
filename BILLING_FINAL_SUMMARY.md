# 🔥 Billing / Upgrade UX 완료 (최종 정리)

## ✅ 완료된 모든 작업

### 1. Upgrade 페이지
- `/t/:teamId/upgrade` - Pro 업그레이드 페이지
- 현재 플랜 vs Pro 플랜 비교
- 즉시성 강조 ("지금 업그레이드하면 바로 적용됩니다")
- Stripe Checkout으로 리디렉션

### 2. 결제 성공/취소 페이지
- `/billing/success` - 결제 성공 시 플랜 즉시 갱신
- `/billing/cancel` - 결제 취소 처리

### 3. TeamGuard 업그레이드 리디렉션
- Pro 필요 시 → `/t/:teamId/upgrade?from=...`로 자동 리디렉션
- Paywall 대신 Upgrade 페이지 사용

### 4. Pro 전용 라우트 보호
- `/sports/:type/team/attendance` → Pro 필요
- `/team/:teamId/fee` → Pro 필요
- `/sports/:type/team/audit` → Pro 필요

### 5. 결제 플로우 (완전 자동화)
```
1. 사용자: Pro 기능 접근 시도
   ↓
2. TeamGuard: 플랜 체크 → Free면 /upgrade로 리디렉션
   ↓
3. UpgradePage: Stripe Checkout 세션 생성
   ↓
4. Stripe: 결제 처리
   ↓
5. stripeWebhook: 
   - teams/{teamId}.plan = "pro" 업데이트
   - AuditLog 기록 (PLAN_CHANGED)
   ↓
6. BillingSuccessPage:
   - refreshTeam() 호출
   - 플랜 즉시 반영
   - /t/:teamId로 리디렉션
   ↓
7. Pro 기능 사용 가능
```

## 🎯 핵심 원칙

### 플랜 변경은 상태 전이
- ❌ "결제 페이지 하나 만들자"
- ✅ 플랜은 `teams.plan`의 상태 전이
- ✅ 결제는 그 전이를 허용하는 트리거

### 서버 중심
- ✅ 플랜 변경은 오직 서버만
- ✅ 클라이언트 직접 변경 ❌

### 즉시 반영
- ✅ 결제 완료 → 즉시 플랜 반영
- ✅ 새로고침/재로그인 불필요

## 📋 체크리스트 (100% 완료)

- [x] Pro 전용 라우트에 플랜 가드 적용
- [x] `/t/:teamId/upgrade` 페이지 생성
- [x] 결제 성공 → plan 업데이트 (Webhook)
- [x] AuditLogs에 PLAN_CHANGED 기록
- [x] 결제 후 즉시 UX 반영
- [x] createCheckoutSession에 adminUid 메타데이터 추가

## 🚀 다음 단계

1. **Stripe 환경 변수 설정**
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_TEAM_PRO_MONTH`
   - `STRIPE_PRICE_TEAM_PRO_YEAR`
   - `APP_BASE_URL`

2. **Webhook 엔드포인트 테스트**
   - Stripe CLI로 로컬 테스트
   - 프로덕션 엔드포인트 설정

3. **E2E 테스트**
   - Free → Pro 업그레이드 플로우
   - 결제 성공 시 플랜 즉시 반영 확인
   - AuditLog 기록 확인

---

**구현 완료**: 수익화 백본 100% 완성! 🎉

**상태**: "진짜 SaaS 백본 완성" ✅

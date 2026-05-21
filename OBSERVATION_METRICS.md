# 📊 핵심 지표 관측 가이드

## 🎯 관측 목표

**주관적 피드백 ❌, 행동 지표만 ⭕**

## 1️⃣ 온보딩 지표

### 신규 로그인 → 팀 생성까지 걸린 시간

**측정 방법:**
1. Firebase Analytics 이벤트 추가
2. `login` → `team_created` 이벤트 시간 차이 계산

**목표:**
- 2분 이내: ✅ 우수
- 2~5분: ⚠️ 보통
- 5분 이상: ❌ 개선 필요

**확인 포인트:**
- `useMyTeams` 쿼리 속도
- `CreateTeamIntro` 표시 → 팀 생성 버튼 클릭까지 시간
- `TeamCreate` 페이지 폼 입력 시간

### 허브 페이지 체류 시간

**측정:**
- Analytics → Behavior → Page Timings
- `/sports-hub` 평균 체류 시간

**이탈률:**
- 즉시 이탈 (< 10초): ❌ 온보딩 개선 필요
- 10~60초: ⚠️ 관심 있으나 전환 안 됨
- 60초 이상: ✅ 탐색 중

## 2️⃣ Free 유저 행동

### 막히는 지점

**확인 경로:**
1. AuditLogs에서 `MEMBER_ADDED` 이후 액션 없음
2. Usage 카드에서 한도 도달 확인
3. TeamGuard에서 `needUpgrade` 리디렉션 빈도

**가장 많이 막히는 지점:**
- [ ] Usage: MEMBER_LIMIT (멤버 5명 초과)
- [ ] Usage: ACTION_LIMIT (액션 1,000 초과)
- [ ] Usage: STORAGE_LIMIT (저장 500MB 초과)
- [ ] Plan Guard: Pro 전용 기능 접근

### Free → Upgrade 페이지 진입률

**측정:**
- `/t/:teamId/upgrade` 페이지 조회 수
- 진입 경로:
  - Usage 경고 (UsageCard → Upgrade 버튼)
  - 플랜 가드 (TeamGuard → `/upgrade` 리디렉션)
  - 직접 접근

**목표:**
- 진입률 10% 이상: ✅ 좋음
- 진입률 5~10%: ⚠️ 보통
- 진입률 5% 미만: ❌ 유도 개선 필요

## 3️⃣ 결제 전환

### Upgrade 페이지 → Checkout 진입률

**측정:**
- Analytics: `upgrade_click` 이벤트
- Stripe Checkout 세션 생성 수

**계산:**
```
진입률 = (Checkout 세션 생성) / (Upgrade 페이지 조회)
```

**목표:**
- 30% 이상: ✅ 우수
- 15~30%: ⚠️ 보통
- 15% 미만: ❌ 카피/UX 개선 필요

### Checkout → 결제 성공률

**측정:**
- Stripe Dashboard → Payments
- 성공: `succeeded`
- 실패: `failed`, `canceled`

**계산:**
```
성공률 = (succeeded) / (succeeded + failed + canceled)
```

**목표:**
- 80% 이상: ✅ 우수
- 60~80%: ⚠️ 보통
- 60% 미만: ❌ 결제 플로우 개선 필요

**실패 사유 확인:**
- Stripe Dashboard → Payments → 실패 내역
- 주요 실패 사유: 카드 거부, 인증 실패 등

### 결제 성공 → Pro 반영 시간

**측정:**
1. Stripe Webhook 수신 시간 (`stripeWebhook` 함수 로그)
2. 프론트 반영 시간 (`BillingSuccessPage` → `refreshTeam` 완료)

**목표:**
- Webhook 수신: 5초 이내
- 프론트 반영: 10초 이내

**확인 포인트:**
- Webhook 지연 확인 (Stripe Dashboard → Webhooks)
- `refreshTeam` 성능 확인

## 4️⃣ Usage 압박 효과

### Usage 카드 조회 수

**측정:**
- `/t/:teamId/admin` 페이지 조회 수
- UsageCard 컴포넌트 마운트 수

**확인:**
- Admin Dashboard 접근률
- Usage 카드 조회 빈도

### 한도 80% 도달 후 Upgrade 페이지 진입률

**측정:**
- Usage 카드에서 "업그레이드" 버튼 클릭 수
- 한도 80% 이상 사용자 중 Upgrade 페이지 진입률

**계산:**
```
진입률 = (80% 도달 후 Upgrade 진입) / (80% 도달 사용자)
```

**목표:**
- 20% 이상: ✅ 압박 효과 있음
- 10~20%: ⚠️ 보통
- 10% 미만: ❌ 경고 메시지 개선 필요

### 한도 도달 → 결제 전환률

**측정:**
- 한도 100% 도달 사용자 중 결제 완료 수

**계산:**
```
전환률 = (100% 도달 후 결제 완료) / (100% 도달 사용자)
```

**목표:**
- 10% 이상: ✅ 효과적
- 5~10%: ⚠️ 보통
- 5% 미만: ❌ 한도/가격 조정 검토

## 5️⃣ 비용 모니터링

### Firestore Reads 일일 사용량

**확인:**
- Firebase Console → Firestore → Usage
- 일일 읽기 횟수

**목표:**
- Free 유저 1인당: 100 reads/일 이하
- 총 일일 reads: 10,000 이하 (100명 기준)

**급증 패턴 확인:**
- 특정 기능 사용 시 reads 급증 여부
- 인덱스 미사용 쿼리 확인

### Cloud Functions 비용

**확인:**
- GCP Console → Cloud Functions → Metrics
- 실행 시간, 실행 횟수

**확인 포인트:**
- Cold start 빈도
- 실행 시간 최적화 필요 여부

### Stripe Webhook 안전성

**확인:**
- Stripe Dashboard → Webhooks → Event logs
- 재시도 빈도
- 실패 이벤트 확인

**확인 포인트:**
- 중복 이벤트 처리 안전성
- 트랜잭션 idempotency

## 📈 지표 대시보드 (권장)

### Firebase Analytics 대시보드
1. 사용자 → 플랜별 사용자 수
2. 이벤트 → 핵심 이벤트 추적
3. 전환 → 결제 전환 추적

### Stripe Dashboard
1. Payments → 결제 성공률
2. Customers → 구독 현황
3. Webhooks → 이벤트 로그

### Firestore Console
1. Usage → Reads/Writes
2. Indexes → 사용량
3. Rules → 실행 통계

## 🎯 관측 후 의사결정 기준

### 안정화 72시간 후

**데이터 수집 완료 후:**
1. 각 지표 목표 달성 여부 확인
2. 가장 큰 문제점 1개 식별
3. A/B/C 중 가장 효과적인 방법 선택

**선택 기준:**
- **전환률이 낮으면**: A (Trial 7일 Pro)
- **한도가 적절하지 않으면**: B (가격/한도 실험)
- **바이럴 효과가 필요하면**: C (Growth 루프)

---

**관측 시작**: 행동 지표만 수집, 주관적 피드백 제외 ✅

# 🧘 안정화 모드 ON (권장 72시간)

## 🎯 목표

- ❌ 구조 변경
- ❌ 기능 추가
- ✅ 관측·검증·미세조정

## ✅ 24~72시간 체크리스트 (실행용)

### 1️⃣ 필수 헬스 체크 (하루 1회)

#### Firebase Hosting
- [ ] SSL Certificate active 확인
- [ ] Custom Domain 설정 확인
- [ ] CDN 캐싱 정상 작동

#### 접속 테스트
- [ ] 웹 브라우저 접속 OK
- [ ] 모바일 브라우저 접속 OK
- [ ] 카카오 인앱 브라우저 접속 OK

#### 결제 플로우
- [ ] 결제 성공 → 즉시 Pro 반영 확인
- [ ] Stripe Webhook 수신 확인
- [ ] AuditLogs에 PLAN_CHANGED 기록 확인

#### AuditLogs
- [ ] TEAM_CREATED 기록 확인
- [ ] MEMBER_ADDED 기록 확인
- [ ] ROLE_CHANGED 기록 확인
- [ ] PLAN_CHANGED 기록 확인

#### Usage 증가 로직
- [ ] 팀 생성 시 Usage 초기화 확인
- [ ] 멤버 추가 시 membersCount 증가 확인
- [ ] Admin Dashboard에서 Usage 카드 정상 표시 확인

### 2️⃣ 핵심 지표 관측 (숫자만 본다)

#### 온보딩 지표
- [ ] 신규 로그인 → 팀 생성까지 걸린 시간
  - 목표: 2분 이내
  - 측정: `useMyTeams` 쿼리 → 팀 생성 완료까지
  
- [ ] 허브 페이지 체류 시간
  - 평균: ___ 분
  - 이탈률: ___ %

#### Free 유저 행동
- [ ] Free 유저의 막히는 지점
  - Usage 가드 (MEMBER_LIMIT / ACTION_LIMIT / STORAGE_LIMIT)
  - 플랜 가드 (Pro 전용 기능 접근)
  - 가장 많이 막히는 지점: ___

- [ ] Free → Upgrade 페이지 진입률
  - 진입 경로: Usage 경고 / 플랜 가드 / 직접 접근
  - 진입률: ___ %

#### 결제 전환
- [ ] Upgrade 페이지 → Checkout 진입률
  - 클릭률: ___ %
  
- [ ] Checkout → 결제 성공률
  - 성공률: ___ %
  - 실패 사유 (Stripe Dashboard 확인)

- [ ] 결제 성공 → Pro 반영 시간
  - Webhook 수신 시간: 평균 ___ 초
  - 프론트 반영 시간: 평균 ___ 초

#### Usage 압박 효과
- [ ] Usage 카드 조회 수 (Admin Dashboard)
- [ ] 한도 80% 도달 후 Upgrade 페이지 진입률
- [ ] 한도 도달 → 결제 전환률

**팁**: 주관적 피드백 ❌, 행동 지표만 ⭕

### 3️⃣ 알람/비용 가드 (필수)

#### GCP 예산 알림
```bash
# GCP Console → Billing → Budgets & alerts
# 예산 한도 설정 (예: 월 $100)
# 50%, 90%, 100% 알림 설정
```

- [ ] GCP 예산 알림 설정 완료
- [ ] 알림 이메일 확인

#### Firestore 비용 모니터링
- [ ] Firestore reads 일일 사용량 확인
  - 목표: 1일 10,000 reads 이하 (Free 유저 기준)
  - 급증 패턴 확인

- [ ] Firestore 인덱스 비용 확인
  - 복합 인덱스 사용량 확인

#### Webhook 안전성
- [ ] Stripe Webhook 재시도 로그 확인
- [ ] 중복 이벤트 처리 확인
  - `customer.subscription.created` 중복 처리 안전성
  - 트랜잭션 idempotency 확인

#### Cloud Functions 비용
- [ ] Functions 실행 시간 확인
- [ ] Cold start 빈도 확인

## 🔧 안정화 중 허용되는 "미세조정"

### ✅ 허용
- Usage 한도 숫자 조정 (`src/types/usage.ts`)
- Upgrade 카피 1~2줄 수정 (`src/pages/billing/UpgradePage.tsx`)
- 스켈레톤/로딩 타이밍 (`src/components/onboarding/AppSkeleton.tsx`)
- 에러 메시지 개선
- CSS/스타일 미세 조정

### ❌ 금지
- 라우팅 구조 변경
- 권한 시스템 변경
- 결제 플로우 변경
- Firestore 구조 변경
- AuditLogs 구조 변경

## 📊 지표 수집 방법

### Firebase Analytics 설정
```typescript
// 이미 구현됨: src/lib/analytics.ts
// 추적 이벤트:
// - paywall_impression
// - upgrade_click
// - upgrade_cancel
```

### Firebase Console 확인
1. Analytics → Events
2. Real-time 사용자
3. 사용자 속성 (플랜별 분류)

### Stripe Dashboard 확인
1. Payments → 결제 성공률
2. Customers → 구독 현황
3. Webhooks → 이벤트 로그

### Firestore Console 확인
1. Usage → Reads/Writes
2. Indexes → 사용량
3. Rules → 실행 통계

## ⏭ 안정화 후 자동 다음 수 (천재가 고름)

안정화 72시간 후, 아래 중 하나만 선택:

### A) Trial 7일 Pro (전환율 최대)
- 7일 무료 체험 제공
- 전환율 최대화
- 지금 구조에 붙이기 쉬움

### B) 가격/한도 실험 (가장 빠른 수익 최적화)
- Free 한도 ↓ (예: 멤버 5 → 3명)
- Pro 한도 ↑ (예: 액션 50,000 → 100,000)
- 코드 변경 거의 없음

### C) Growth 루프 (팀 초대 → 가치 증가)
- 팀 초대 시 가치 증가
- 멤버 수 제한 → Pro 전환 촉진
- 바이럴 효과

## 🏁 한 줄 결론

**지금은 더 만드는 게 아니라, 잘 돌아가는지 확인할 타이밍이다.**

---

**안정화 모드 시작**: 관측·검증·미세조정만 허용 ✅

준비되면 말해:
- "A 가자" → Trial 7일 Pro 설계
- "B 가자" → 가격/한도 실험 설계
- "C 가자" → Growth 루프 설계
- "데이터 나왔다" → 데이터 기반 최적화

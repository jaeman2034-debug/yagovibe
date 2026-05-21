# 📊 운영 대시보드 v2 - 매일 봐야 하는 6개 위젯

> **목표**: 체크리스트 없이도 운영이 굴러가게

---

## 위젯 1: Story CTR (스토리 클릭률)

### 계산식
```
CTR = (storyClick / storyImp) * 100
```

### 임계값
- **정상**: ≥ 2%
- **주의**: 1.5% ~ 2%
- **위험**: < 1.5%

### 대응 액션
- **위험**: 즉시 저CTR 스토리 2개 교체 (운영 픽)
- **주의**: 1개 교체 후 모니터링
- **정상**: 유지

### API
```bash
GET /api/admin/dashboard/summary?region=seoul&date=2025-02-03
→ kpi.storyCtr 확인
```

---

## 위젯 2: Booking CR (예약 전환율)

### 계산식
```
CR = (paymentSuccess / reserveCreate) * 100
```

### 임계값
- **정상**: ≥ 15%
- **주의**: 10% ~ 15%
- **위험**: < 10%

### 대응 액션
- **위험**: 결제 플로우 점검 (웹훅/LOCK/UI)
- **주의**: 결제 시작 화면 문구 단순화
- **정상**: 유지

### API
```bash
GET /api/admin/dashboard/kpi?region=seoul&date=2025-02-03
→ bookingCr 확인
```

---

## 위젯 3: PayFail (결제 실패 건수)

### 계산식
```
PayFail = paymentFail (일별 건수)
```

### 임계값
- **정상**: ≤ 5건
- **주의**: 5 ~ 10건
- **위험**: > 10건

### 대응 액션
- **위험**: 결제 작업 중단, 원인 분류 (웹훅/락/이탈)
- **주의**: LOCK 해제 로직 점검
- **정상**: 유지

### API
```bash
GET /api/admin/dashboard/summary?region=seoul&date=2025-02-03
→ kpi.payFail 확인
```

---

## 위젯 4: SeedRate (시드 사용률)

### 계산식
```
SeedRate = (seedStoryCount / totalStoryCount) * 100
```

### 임계값
- **정상**: ≤ 10%
- **주의**: 10% ~ 20%
- **위험**: > 20%

### 대응 액션
- **위험**: 협회 동기화 확인 + 운영 스토리 즉시 추가
- **주의**: 협회 API 상태 확인
- **정상**: 유지

### API
```bash
GET /api/admin/dashboard/health?region=seoul&date=2025-02-03
→ seedRate 확인
```

---

## 위젯 5: Story Fill Rate (스토리 채움률)

### 계산식
```
FillRate = (activeStoryCount / 5) * 100
```

### 임계값
- **정상**: 100% (5/5)
- **주의**: 80% ~ 100% (4/5)
- **위험**: < 80% (< 4개)

### 대응 액션
- **위험**: 즉시 seed로 채우기 (절대 빈 슬롯 금지)
- **주의**: 운영 스토리 1개 추가
- **정상**: 유지

### API
```bash
GET /api/admin/dashboard/health?region=seoul&date=2025-02-03
→ storyFillRate 확인
→ activeStories 확인
```

---

## 위젯 6: Revenue (일별 매출)

### 계산식
```
Revenue = paymentSuccess * averageAmount
```

### 임계값
- **정상**: 전일 대비 증가 or 유지
- **주의**: 전일 대비 -20%
- **위험**: 전일 대비 -50%

### 대응 액션
- **위험**: 구장/슬롯 공급 확인 + 할인 캠페인 검토
- **주의**: 예약 플로우 점검
- **정상**: 유지

### API
```bash
GET /api/admin/dashboard/kpi?region=seoul&date=2025-02-03
→ revenue 확인

# 트렌드 확인
GET /api/admin/dashboard/kpi/trend?region=seoul&days=7
```

---

## 📋 매일 30분 운영 체크리스트

### 1. 대시보드 v2 접속
```
GET /api/admin/dashboard/summary?region=seoul&date=오늘
```

### 2. 6개 위젯 확인
- [ ] Story CTR ≥ 2%?
- [ ] Booking CR ≥ 15%?
- [ ] PayFail ≤ 5건?
- [ ] SeedRate ≤ 10%?
- [ ] Story Fill Rate = 100%?
- [ ] Revenue 전일 대비?

### 3. 위험 신호 대응
- **위험 신호 발견 시**: 즉시 대응 액션 실행
- **주의 신호 발견 시**: 모니터링 + 다음날 확인

### 4. 하루 1개 변경 원칙
- 여러 개 동시 변경 금지
- 변경 후 24시간 모니터링

---

## 🚨 자동 알림 규칙

### 30분마다 자동 체크
- CTR < 1% → 즉시 알림
- PayFail > 10건 → 즉시 알림
- Story Fill Rate < 50% → 즉시 알림
- SeedRate > 20% → 즉시 알림

### 알림 채널 (실제 운영 시)
- Slack #alerts
- Email (운영팀)
- SMS (긴급)

---

## 📈 주간 리포트 템플릿

### 1주차 리포트
```
Story CTR: X.XX% (목표: ≥2%)
Booking CR: X.XX% (목표: ≥15%)
Revenue: XXX,XXX원
PayFail: X건 (목표: ≤5건)
SeedRate: X.XX% (목표: ≤10%)

성과 좋은 스토리 출처: [운영/협회/사용자]
AB 실험 현황: [RUNNING/WIN]
다음 주 목표: [구체적 목표 1개]
```

---

## ✅ 성공 기준

### Day 1-7 (1주차)
- 모든 지표가 "수치"로 보임
- 하나의 실험이 "결론" 남김

### Day 8-14 (2주차)
- 다음 지역으로 복제 가능한 "운영 레시피" 완성
- 지표가 안정적으로 수집됨

# 🔥 CS 자동화 3단계 최종 플레이북

**목표**: CS 자동화 85% 달성, 분쟁 80% 감축, 채팅 99% 유지  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 CS 자동화 3단계 최종 시스템

### 분쟁 자동 분류 정확도

**목표**: ≥95% (94% → 95%로 상향)  
**측정**: 휴먼 리뷰 샘플 대비 자동 분류 일치율  
**재학습 조건**: 오차 2% 이상 (정확도 < 93%)

```typescript
const CLASSIFICATION_ACCURACY_TARGET = 0.95; // 95%
const CLASSIFICATION_ERROR_THRESHOLD = 0.02; // 오차 2%
```

---

### 템플릿 응답 시간

**목표**: 3초 이내  
**측정**: 분쟁 생성 시점부터 자동 답변 발송까지  
**알람 임계값**: > 3초

```typescript
const TEMPLATE_SEND_TIMEOUT_MS = 3000; // 3초
```

---

### 반복 문의 → 스레드 병합

**조건**:
- 동일 사용자 7일 이내 재문의
- 제목/내용 유사도 ≥85%

**처리**:
1. ✅ 부모 분쟁에 스레드로 연결
2. ✅ 이전 대화 내역 자동 연결
3. ✅ 스레드 카운트 증가

---

### 고위험만 상담원 연결

**조건**:
- 우선순위 CRITICAL 또는 HIGH
- 분류 신뢰도 < 95%
- 분쟁 유형이 FRAUD 또는 ACCOUNT_ABUSE

---

## 🚨 에스크로 강제 룰

### 고가 + 저평판 + 미인증 → 자동 강제

**조건**: 가격 이상 + 저평판 + 미인증 사용자  
**처리**: 즉시 에스크로 강제  
**위험도 증가**: +30%

---

### 분쟁 이력 2회↑ → 전면 강제

**조건**: 구매자 또는 판매자 30일 내 분쟁 2회 이상  
**처리**: 즉시 에스크로 강제  
**위험도 증가**: +30%

```typescript
if (buyerDisputeCount.size >= 2 || sellerDisputeCount.size >= 2) {
  factors.repeatedDisputeHistory = true;
  riskScore += 0.30; // 30% 추가 증가
  forceEscrow = true; // 전면 강제
}
```

---

### 환불 분쟁 80%↓ 목표

**측정 방법**:
```typescript
const disputeRate = totalRefundDisputes / totalRefundRequests;
const reductionRate = 1 - disputeRate; // 감축률
// 목표: reductionRate >= 0.80 (80% 감축)
```

**자동 환불 조건**:
- 품질불량/상태불량
- 배송지연 (24시간 이내)
- 사기/기만
- 노쇼

**목표**: 환불 분쟁 80% 감축  
**측정 주기**: 매일 00:00 (Asia/Seoul)

---

## ⏰ SLA 에스컬레이션 최종

### 1단계: 60초 무응답 → 봇 자동 응답

**조건**: 분쟁 생성 후 60초 경과 (70초 → 60초)  
**처리**: 봇 자동 응답 템플릿 발송  
**목표**: 모든 분쟁에 60초 이내 응답

```typescript
const SLA_BOT_RESPONSE_SECONDS = 60; // 60초
```

---

### 2단계: 6분 → 상담원 연결

**조건**: 분쟁 생성 후 6분 경과  
**처리**: 상담원 큐에 등록, 조사 단계로 전환  
**목표**: 고위험 분쟁 6분 이내 상담원 연결

```typescript
const SLA_AGENT_ESCALATION_MINUTES = 6; // 6분
```

---

### 3단계: 20분 → 리드 에스컬레이션

**조건**: 조사 시작 후 20분 경과  
**처리**: 리드 큐에 등록, CRITICAL 우선순위 설정  
**목표**: 장기 미해결 분쟁 20분 이내 리드 에스컬레이션

```typescript
const SLA_LEAD_ESCALATION_MINUTES = 20; // 20분
```

---

### 4단계: 20분 → 쿠폰 지급

**조건**: 분쟁 생성 후 20분 경과  
**처리**: 쿠폰 지급 설정, 사용자에게 쿠폰 안내  
**쿠폰 금액**: 기본 3,000원

```typescript
const SLA_COUPON_MINUTES = 20; // 20분
```

---

### 5단계: 60분 → 보상 트리거

**조건**: 분쟁 생성 후 60분 경과  
**처리**: 보상 트리거 설정, 사용자에게 보상 안내  
**보상 금액**: 기본 5,000원

```typescript
const SLA_COMPENSATION_MINUTES = 60; // 60분
```

---

## 🎁 보상 트리거 시스템

### 오분류 → 우선 처리

**조건**: 휴먼 리뷰에서 오분류 감지  
**처리**:
1. ✅ `csPriorityQueue`에 HIGH 우선순위로 등록
2. ✅ 분쟁 문서 우선순위 HIGH로 업데이트
3. ✅ 오분류 플래그 설정

```typescript
if (autoClassifiedType !== humanReviewedType) {
  // 우선 처리 큐에 등록
  await db.collection("csPriorityQueue").add({
    disputeId,
    priority: "HIGH",
    reason: "MISCLASSIFICATION",
  });
}
```

---

### 반복 분쟁 → 중재 개입

**조건**: 30일 내 분쟁 3회 이상  
**처리**:
1. ✅ `mediationQueue`에 등록
2. ✅ 분쟁 문서 CRITICAL 우선순위 설정
3. ✅ 사용자에게 중재 안내

```typescript
const REPEATED_DISPUTE_THRESHOLD = 3; // 3회 이상

if (recentDisputes.size >= REPEATED_DISPUTE_THRESHOLD) {
  // 중재 큐에 등록
  await db.collection("mediationQueue").add({
    disputeId,
    userId,
    disputeCount: recentDisputes.size,
    reason: "REPEATED_DISPUTES",
  });
}
```

---

## 📊 자동화 과신 대응

### 5% 샘플 휴먼 리뷰

**샘플링 비율**: 5%  
**목적**: 자동 분류 정확도 검증  
**처리**: `humanReviewQueue` 컬렉션에 등록

```typescript
const HUMAN_REVIEW_SAMPLE_RATE = 0.05; // 5%
```

---

### 만족도 4.6↓ → 문구 개편

**조건**: 만족도 ≤ 4.6 (4.5 → 4.6로 상향)  
**처리**: `templateRevisionQueue` 컬렉션에 개편 요청 등록  
**목표**: 만족도 ≥ 4.6 유지

```typescript
const SATISFACTION_THRESHOLD = 4.6;

if (satisfaction <= SATISFACTION_THRESHOLD) {
  // 문구 개편 요청 등록
}
```

---

### 오분류 2%↑ → 룰 재학습

**조건**: 오분류율 ≥ 2%  
**처리**: `classificationRetrain` 컬렉션에 재학습 요청 등록  
**목표**: 오분류율 < 2% 유지

```typescript
const MISCLASSIFICATION_THRESHOLD = 0.02; // 2%

if (misclassificationRate >= MISCLASSIFICATION_THRESHOLD) {
  // 재학습 요청 등록
}
```

---

## 📈 모니터링 지표 (일일 체크)

### 1. CS 평균 응답 시간

**목표**: ≤60초 (70초 → 60초로 강화)  
**측정**: 분쟁 생성부터 첫 응답까지  
**알람 임계값**: > 60초

```typescript
const avgResponseTime = totalResponseTime / totalDisputes.size;
// 목표: ≤60초
```

---

### 2. 자동 처리 비율

**목표**: ≥85% (80% → 85%로 상향)  
**측정**: 자동 처리된 분쟁 비율  
**알람 임계값**: < 85%

```typescript
const autoProcessRate = (autoProcessedDisputes.size / totalDisputes.size) * 100;
// 목표: ≥85%
```

---

### 3. 분쟁 전환율

**목표**: ≤0.8% (1.0% → 0.8%로 하향)  
**측정**: 거래 대비 분쟁 발생 비율  
**알람 임계값**: > 0.8%

```typescript
const disputeRate = (totalDisputes.size / totalTrades.size) * 100;
// 목표: ≤0.8%
```

---

### 4. 분류 정확도

**목표**: ≥95% (94% → 95%로 상향)  
**측정**: 휴먼 리뷰 샘플 대비 일치율  
**알람 임계값**: < 95%

```typescript
const accuracy = correctClassifications / totalReviews;
// 목표: ≥95%
```

---

### 5. 환불 분쟁 감축률

**목표**: ≥80% 감축  
**측정**: 환불 요청 대비 환불 분쟁 비율  
**알람 임계값**: 감축률 < 80%

```typescript
const reductionRate = 1 - (totalRefundDisputes / totalRefundRequests);
// 목표: reductionRate >= 0.80 (80% 감축)
```

---

## 🚨 알람 조건

### 1. CS 평균 응답 시간 > 60초

```typescript
if (avgResponseTime > 60) {
  await sendAlert({
    type: "CS_RESPONSE_TIME_ALERT",
    metric: "avg_response_time",
    value: avgResponseTime,
    threshold: 60,
    message: "CS 평균 응답 시간이 목표치를 초과했습니다.",
  });
}
```

---

### 2. 자동 처리 비율 < 85%

```typescript
if (autoProcessRate < 85) {
  await sendAlert({
    type: "AUTO_PROCESS_RATE_ALERT",
    metric: "auto_process_rate",
    value: autoProcessRate,
    threshold: 85,
    message: "자동 처리 비율이 목표치를 하회했습니다.",
  });
}
```

---

### 3. 분쟁 전환율 > 0.8%

```typescript
if (disputeRate > 0.8) {
  await sendAlert({
    type: "DISPUTE_RATE_ALERT",
    metric: "dispute_rate",
    value: disputeRate,
    threshold: 0.8,
    message: "분쟁 전환율이 목표치를 초과했습니다.",
  });
}
```

---

### 4. 분류 정확도 < 95%

```typescript
if (accuracy < 95) {
  await sendAlert({
    type: "CLASSIFICATION_ACCURACY_ALERT",
    metric: "classification_accuracy",
    value: accuracy,
    threshold: 95,
    message: "분류 정확도가 목표치를 하회했습니다. 재학습이 필요합니다.",
  });
}
```

---

### 5. 환불 분쟁 감축률 < 80%

```typescript
if (reductionRate < 0.80) {
  await sendAlert({
    type: "REFUND_DISPUTE_REDUCTION_ALERT",
    metric: "refund_dispute_reduction",
    value: reductionRate,
    threshold: 0.80,
    message: "환불 분쟁 감축률이 목표치를 하회했습니다.",
  });
}
```

---

## 🔧 운영 체크리스트

### 일일 체크 (매일 00:00)

- [ ] CS 평균 응답 시간 확인 (목표: ≤60초)
- [ ] 자동 처리 비율 확인 (목표: ≥85%)
- [ ] 분쟁 전환율 확인 (목표: ≤0.8%)
- [ ] 분류 정확도 확인 (목표: ≥95%)
- [ ] 환불 분쟁 감축률 확인 (목표: ≥80%)

### 주간 체크 (매주 월요일)

- [ ] 환불 분쟁 통계 리포트 확인
- [ ] 만족도 리포트 확인
- [ ] 문구 개편 필요 여부 검토
- [ ] 분류 규칙 재학습 필요 여부 검토
- [ ] 보상 트리거 동작 확인

### 월간 체크 (매월 1일)

- [ ] CS 자동화 효과 종합 분석
- [ ] 분류 규칙 재학습
- [ ] 운영 규칙 개선

---

## 📝 로그 포맷

### 오분류 우선 처리 로그

```json
{
  "event": "MISCLASSIFICATION_PRIORITY",
  "reviewId": "review_123",
  "disputeId": "dispute_123",
  "autoClassifiedType": "NO_SHOW",
  "humanReviewedType": "PRICE_DISAGREEMENT",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 반복 분쟁 중재 개입 로그

```json
{
  "event": "REPEATED_DISPUTE_MEDIATION",
  "disputeId": "dispute_123",
  "userId": "user_123",
  "disputeCount": 3,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 환불 자동 처리 로그

```json
{
  "event": "REFUND_AUTO_APPROVED",
  "requestId": "refund_123",
  "userId": "user_123",
  "tradeId": "trade_123",
  "reason": "품질불량",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 쿠폰 지급 로그

```json
{
  "event": "COUPON_ISSUED",
  "disputeId": "dispute_123",
  "couponAmount": 3000,
  "reason": "SLA_20MIN_DELAY",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## 🚀 배포 체크리스트

### 배포 전 확인

- [ ] `onDisputeAutoClassify` 함수 코드 검증
- [ ] `onDisputeThreadMerge` 함수 코드 검증
- [ ] `slaEscalationScheduler` 스케줄러 코드 검증
- [ ] `onSatisfactionUpdated` 함수 코드 검증
- [ ] `onMisclassificationDetected` 함수 코드 검증
- [ ] `onRefundRequestCreated` 함수 코드 검증
- [ ] `refundDisputeStatsJob` 스케줄러 코드 검증
- [ ] `onMisclassificationPriority` 함수 코드 검증
- [ ] `onRepeatedDisputeMediation` 함수 코드 검증
- [ ] 분류 정확도 목표 95% 검증
- [ ] SLA 시간 설정 검증 (60초, 6분, 20분, 20분 쿠폰, 60분 보상)

### 배포 후 모니터링

- [ ] 첫 24시간 내 자동 분류 정확도 확인
- [ ] 템플릿 즉시 발송 시간 확인 (3초 이내)
- [ ] SLA 에스컬레이션 동작 확인
- [ ] 스레드 병합 동작 확인
- [ ] 쿠폰 지급 동작 확인
- [ ] 보상 트리거 동작 확인
- [ ] 환불 자동 처리 동작 확인
- [ ] 오분류 우선 처리 동작 확인
- [ ] 반복 분쟁 중재 개입 동작 확인

---

**CS 자동화 3단계 최종 플레이북 완성**

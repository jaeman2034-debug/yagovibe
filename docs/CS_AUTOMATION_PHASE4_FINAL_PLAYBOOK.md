# 🔥 CS 자동화 4단계 완전 플레이북

**목표**: CS 자동화 90% 달성, 분쟁 85% 감축, 채팅 99% 유지  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 CS 자동화 4단계 완전 시스템

### 분쟁 자동 분류 정확도

**목표**: ≥96% (95% → 96%로 상향)  
**측정**: 휴먼 리뷰 샘플 대비 자동 분류 일치율  
**재학습 조건**: 오차 1.5% 이상 (정확도 < 94.5%)

```typescript
const CLASSIFICATION_ACCURACY_TARGET = 0.96; // 96%
const CLASSIFICATION_ERROR_THRESHOLD = 0.015; // 오차 1.5%
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

### 동일 이슈 → 스레드 병합

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
- 분류 신뢰도 < 96%
- 분쟁 유형이 FRAUD 또는 ACCOUNT_ABUSE

---

## 🚨 에스크로 강제(최종)

### 고가 + 저평판 + 미인증 → 자동 강제

**조건**: 가격 이상 + 저평판 + 미인증 사용자  
**처리**: 즉시 에스크로 강제  
**위험도 증가**: +30%

---

### 분쟁 이력 1회↑ → 강제

**조건**: 구매자 또는 판매자 30일 내 분쟁 1회 이상 (2회 → 1회로 강화)  
**처리**: 즉시 에스크로 강제  
**위험도 증가**: +30%

```typescript
const buyerRepeatedDisputes = buyerDisputeCount.size >= 1; // 2회 → 1회
const sellerRepeatedDisputes = sellerDisputeCount.size >= 1; // 2회 → 1회

if (buyerRepeatedDisputes || sellerRepeatedDisputes) {
  factors.repeatedDisputeHistory = true;
  riskScore += 0.30; // 30% 추가 증가
  forceEscrow = true; // 전면 강제
}
```

---

### 환불 분쟁 85%↓ 목표

**측정 방법**:
```typescript
const disputeRate = totalRefundDisputes / totalRefundRequests;
const reductionRate = 1 - disputeRate; // 감축률
// 목표: reductionRate >= 0.85 (85% 감축)
```

**자동 환불 조건**:
- 품질불량/상태불량
- 배송지연 (24시간 이내)
- 사기/기만
- 노쇼

**목표**: 환불 분쟁 85% 감축 (80% → 85%로 상향)  
**측정 주기**: 매일 00:00 (Asia/Seoul)

---

## ⏰ SLA 에스컬레이션 최종

### 1단계: 45초 무응답 → 봇 자동 응답

**조건**: 분쟁 생성 후 45초 경과 (60초 → 45초)  
**처리**: 봇 자동 응답 템플릿 발송  
**목표**: 모든 분쟁에 45초 이내 응답

```typescript
const SLA_BOT_RESPONSE_SECONDS = 45; // 45초
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

## 💰 비용 최적화 루프

### 반복 문의 → FAQ 학습

**조건**: 30일 내 동일/유사 문의 3회 이상  
**처리**: `faqLearningQueue` 컬렉션에 FAQ 학습 요청 등록  
**목표**: 반복 문의 자동 응답으로 전환

```typescript
const FAQ_LEARNING_THRESHOLD = 3; // 3회 이상

if (similarCount >= FAQ_LEARNING_THRESHOLD) {
  // FAQ 학습 요청 등록
  await db.collection("faqLearningQueue").add({
    disputeId,
    title,
    description,
    similarCount,
    reason: "REPEATED_INQUIRY",
  });
}
```

---

### 오분류 → 룰 보정

**조건**: 오분류율 ≥ 1.5% (2% → 1.5%로 강화)  
**처리**: `ruleCorrectionQueue` 컬렉션에 룰 보정 요청 등록  
**목표**: 오분류율 < 1.5% 유지

```typescript
const RULE_CORRECTION_THRESHOLD = 0.015; // 1.5%

if (misclassificationRate >= RULE_CORRECTION_THRESHOLD) {
  // 룰 보정 요청 등록
  await db.collection("ruleCorrectionQueue").add({
    misclassificationRate,
    threshold: RULE_CORRECTION_THRESHOLD,
    reason: "MISCLASSIFICATION_ABOVE_THRESHOLD",
  });
}
```

---

### 고위험 → 우선 큐

**조건**: 우선순위 CRITICAL 또는 HIGH, 또는 FRAUD/ACCOUNT_ABUSE  
**처리**: `csPriorityQueue` 컬렉션에 HIGH 우선순위로 등록  
**목표**: 고위험 분쟁 즉시 처리

```typescript
const isHighRisk = 
  priority === "CRITICAL" || 
  priority === "HIGH" || 
  type === "FRAUD" || 
  type === "ACCOUNT_ABUSE";

if (isHighRisk) {
  // 우선 큐에 등록
  await db.collection("csPriorityQueue").add({
    disputeId,
    priority: "HIGH",
    type,
    reason: "HIGH_RISK",
  });
}
```

---

## 📊 자동화 과잉으로 신뢰 하락 대응

### 5% 샘플 휴먼 리뷰

**샘플링 비율**: 5%  
**목적**: 자동 분류 정확도 검증  
**처리**: `humanReviewQueue` 컬렉션에 등록

```typescript
const HUMAN_REVIEW_SAMPLE_RATE = 0.05; // 5%
```

---

### 만족도 4.7↓ → 문구 개편

**조건**: 만족도 ≤ 4.7 (4.6 → 4.7로 상향)  
**처리**: `templateRevisionQueue` 컬렉션에 개편 요청 등록  
**목표**: 만족도 ≥ 4.7 유지

```typescript
const SATISFACTION_THRESHOLD = 4.7;

if (satisfaction <= SATISFACTION_THRESHOLD) {
  // 문구 개편 요청 등록
}
```

---

### 오분류 1.5%↑ → 재학습

**조건**: 오분류율 ≥ 1.5% (2% → 1.5%로 강화)  
**처리**: `classificationRetrain` 컬렉션에 재학습 요청 등록  
**목표**: 오분류율 < 1.5% 유지

```typescript
const MISCLASSIFICATION_THRESHOLD = 0.015; // 1.5%

if (misclassificationRate >= MISCLASSIFICATION_THRESHOLD) {
  // 재학습 요청 등록
}
```

---

## 📈 모니터링 지표 (일일 체크)

### 1. CS 평균 응답 시간

**목표**: ≤45초 (60초 → 45초로 강화)  
**측정**: 분쟁 생성부터 첫 응답까지  
**알람 임계값**: > 45초

```typescript
const avgResponseTime = totalResponseTime / totalDisputes.size;
// 목표: ≤45초
```

---

### 2. 자동 처리 비율

**목표**: ≥90% (85% → 90%로 상향)  
**측정**: 자동 처리된 분쟁 비율  
**알람 임계값**: < 90%

```typescript
const autoProcessRate = (autoProcessedDisputes.size / totalDisputes.size) * 100;
// 목표: ≥90%
```

---

### 3. 분쟁 전환율

**목표**: ≤0.6% (0.8% → 0.6%로 하향)  
**측정**: 거래 대비 분쟁 발생 비율  
**알람 임계값**: > 0.6%

```typescript
const disputeRate = (totalDisputes.size / totalTrades.size) * 100;
// 목표: ≤0.6%
```

---

### 4. 분류 정확도

**목표**: ≥96% (95% → 96%로 상향)  
**측정**: 휴먼 리뷰 샘플 대비 일치율  
**알람 임계값**: < 96%

```typescript
const accuracy = correctClassifications / totalReviews;
// 목표: ≥96%
```

---

### 5. 환불 분쟁 감축률

**목표**: ≥85% 감축 (80% → 85%로 상향)  
**측정**: 환불 요청 대비 환불 분쟁 비율  
**알람 임계값**: 감축률 < 85%

```typescript
const reductionRate = 1 - (totalRefundDisputes / totalRefundRequests);
// 목표: reductionRate >= 0.85 (85% 감축)
```

---

## 🚨 알람 조건

### 1. CS 평균 응답 시간 > 45초

```typescript
if (avgResponseTime > 45) {
  await sendAlert({
    type: "CS_RESPONSE_TIME_ALERT",
    metric: "avg_response_time",
    value: avgResponseTime,
    threshold: 45,
    message: "CS 평균 응답 시간이 목표치를 초과했습니다.",
  });
}
```

---

### 2. 자동 처리 비율 < 90%

```typescript
if (autoProcessRate < 90) {
  await sendAlert({
    type: "AUTO_PROCESS_RATE_ALERT",
    metric: "auto_process_rate",
    value: autoProcessRate,
    threshold: 90,
    message: "자동 처리 비율이 목표치를 하회했습니다.",
  });
}
```

---

### 3. 분쟁 전환율 > 0.6%

```typescript
if (disputeRate > 0.6) {
  await sendAlert({
    type: "DISPUTE_RATE_ALERT",
    metric: "dispute_rate",
    value: disputeRate,
    threshold: 0.6,
    message: "분쟁 전환율이 목표치를 초과했습니다.",
  });
}
```

---

### 4. 분류 정확도 < 96%

```typescript
if (accuracy < 96) {
  await sendAlert({
    type: "CLASSIFICATION_ACCURACY_ALERT",
    metric: "classification_accuracy",
    value: accuracy,
    threshold: 96,
    message: "분류 정확도가 목표치를 하회했습니다. 재학습이 필요합니다.",
  });
}
```

---

### 5. 환불 분쟁 감축률 < 85%

```typescript
if (reductionRate < 0.85) {
  await sendAlert({
    type: "REFUND_DISPUTE_REDUCTION_ALERT",
    metric: "refund_dispute_reduction",
    value: reductionRate,
    threshold: 0.85,
    message: "환불 분쟁 감축률이 목표치를 하회했습니다.",
  });
}
```

---

## 🔧 운영 체크리스트

### 일일 체크 (매일 00:00)

- [ ] CS 평균 응답 시간 확인 (목표: ≤45초)
- [ ] 자동 처리 비율 확인 (목표: ≥90%)
- [ ] 분쟁 전환율 확인 (목표: ≤0.6%)
- [ ] 분류 정확도 확인 (목표: ≥96%)
- [ ] 환불 분쟁 감축률 확인 (목표: ≥85%)

### 주간 체크 (매주 월요일)

- [ ] 환불 분쟁 통계 리포트 확인
- [ ] 만족도 리포트 확인
- [ ] 문구 개편 필요 여부 검토
- [ ] 분류 규칙 재학습 필요 여부 검토
- [ ] FAQ 학습 필요 여부 검토
- [ ] 룰 보정 필요 여부 검토
- [ ] 보상 트리거 동작 확인

### 월간 체크 (매월 1일)

- [ ] CS 자동화 효과 종합 분석
- [ ] 분류 규칙 재학습
- [ ] 운영 규칙 개선
- [ ] 비용 최적화 효과 분석

---

## 📝 로그 포맷

### 반복 문의 FAQ 학습 로그

```json
{
  "event": "REPEATED_INQUIRY_FAQ",
  "disputeId": "dispute_123",
  "similarCount": 3,
  "threshold": 3,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 오분류 룰 보정 로그

```json
{
  "event": "MISCLASSIFICATION_RULE_CORRECTION",
  "reviewId": "review_123",
  "misclassificationRate": 0.016,
  "threshold": 0.015,
  "autoClassifiedType": "NO_SHOW",
  "humanReviewedType": "PRICE_DISAGREEMENT",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 고위험 우선 큐 등록 로그

```json
{
  "event": "HIGH_RISK_PRIORITY_QUEUE",
  "disputeId": "dispute_123",
  "priority": "HIGH",
  "type": "FRAUD",
  "reason": "HIGH_RISK",
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
- [ ] `onRepeatedInquiryFAQ` 함수 코드 검증
- [ ] `onMisclassificationRuleCorrection` 함수 코드 검증
- [ ] `onHighRiskPriorityQueue` 함수 코드 검증
- [ ] 분류 정확도 목표 96% 검증
- [ ] SLA 시간 설정 검증 (45초, 6분, 20분, 20분 쿠폰, 60분 보상)

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
- [ ] 반복 문의 FAQ 학습 동작 확인
- [ ] 오분류 룰 보정 동작 확인
- [ ] 고위험 우선 큐 동작 확인

---

**CS 자동화 4단계 완전 플레이북 완성**

# 🔥 CS 자동화 3단계 플레이북

**목표**: CS 자동화 80% 달성, 분쟁 확률 80%↓, 분류 정확도 ≥94%  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 CS 자동화 3단계 시스템

### 분쟁 자동 분류 정확도

**목표**: ≥94% (92% → 94%로 상향)  
**측정**: 휴먼 리뷰 샘플 대비 자동 분류 일치율  
**재학습 조건**: 오차 2% 이상 (정확도 < 92%)

```typescript
const CLASSIFICATION_ACCURACY_TARGET = 0.94; // 94%
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

### 고위험만 상담원 연결

**조건**:
- 우선순위 CRITICAL 또는 HIGH
- 분류 신뢰도 < 94%
- 분쟁 유형이 FRAUD 또는 ACCOUNT_ABUSE

---

### 동일 이슈 재문의 → 스레드 병합

**조건**:
- 동일 사용자 7일 이내 재문의
- 제목/내용 유사도 ≥85%

**처리**:
1. ✅ 부모 분쟁에 스레드로 연결
2. ✅ 이전 대화 내역 자동 연결
3. ✅ 스레드 카운트 증가

---

## 🚨 에스크로 강제 고도화

### 반복 분쟁 이력 → 전면 강제

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

### 분쟁 확률 80%↓ 목표

**측정 방법**:
```typescript
const disputeRate = (totalDisputes.size / totalTrades.size) * 100;
// 목표: ≤80% (기존 대비)
```

**목표**: 분쟁 확률 80% 감축  
**측정 주기**: 매주 월요일 00:00 (Asia/Seoul)

---

## ⏰ SLA 에스컬레이션 최종

### 1단계: 70초 무응답 → 봇 자동 응답

**조건**: 분쟁 생성 후 70초 경과 (90초 → 70초)  
**처리**: 봇 자동 응답 템플릿 발송  
**목표**: 모든 분쟁에 70초 이내 응답

```typescript
const SLA_BOT_RESPONSE_SECONDS = 70; // 70초
```

---

### 2단계: 6분 → 상담원 연결

**조건**: 분쟁 생성 후 6분 경과 (8분 → 6분)  
**처리**: 상담원 큐에 등록, 조사 단계로 전환  
**목표**: 고위험 분쟁 6분 이내 상담원 연결

```typescript
const SLA_AGENT_ESCALATION_MINUTES = 6; // 6분
```

---

### 3단계: 20분 → 리드 에스컬레이션

**조건**: 조사 시작 후 20분 경과 (25분 → 20분)  
**처리**: 리드 큐에 등록, CRITICAL 우선순위 설정  
**목표**: 장기 미해결 분쟁 20분 이내 리드 에스컬레이션

```typescript
const SLA_LEAD_ESCALATION_MINUTES = 20; // 20분
```

---

### 4단계: 60분 → 보상 트리거

**조건**: 분쟁 생성 후 60분 경과  
**처리**: 보상 트리거 설정, 사용자에게 보상 안내  
**보상 금액**: 기본 5,000원

```typescript
const SLA_COMPENSATION_MINUTES = 60; // 60분
```

---

## 📊 자동 응답 신뢰 하락 대응

### 5% 샘플 휴먼 리뷰

**샘플링 비율**: 5%  
**목적**: 자동 분류 정확도 검증  
**처리**: `humanReviewQueue` 컬렉션에 등록

```typescript
const HUMAN_REVIEW_SAMPLE_RATE = 0.05; // 5%
```

---

### 만족도 4.5↓ 시 문구 리비전

**조건**: 만족도 ≤ 4.5  
**처리**: `templateRevisionQueue` 컬렉션에 리비전 요청 등록  
**목표**: 만족도 ≥ 4.5 유지

```typescript
const SATISFACTION_THRESHOLD = 4.5;

if (satisfaction <= SATISFACTION_THRESHOLD) {
  // 문구 리비전 요청 등록
}
```

---

### 오분류 2%↑ → 룰 재학습

**조건**: 오분류율 ≥ 2% (3% → 2%로 강화)  
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

**목표**: ≤70초 (90초 → 70초로 강화)  
**측정**: 분쟁 생성부터 첫 응답까지  
**알람 임계값**: > 70초

```typescript
const avgResponseTime = totalResponseTime / totalDisputes.size;
// 목표: ≤70초
```

---

### 2. 자동 처리 비율

**목표**: ≥80% (70% → 80%로 상향)  
**측정**: 자동 처리된 분쟁 비율  
**알람 임계값**: < 80%

```typescript
const autoProcessRate = (autoProcessedDisputes.size / totalDisputes.size) * 100;
// 목표: ≥80%
```

---

### 3. 분쟁 전환율

**목표**: ≤1.0% (1.2% → 1.0%로 하향)  
**측정**: 거래 대비 분쟁 발생 비율  
**알람 임계값**: > 1.0%

```typescript
const disputeRate = (totalDisputes.size / totalTrades.size) * 100;
// 목표: ≤1.0%
```

---

### 4. 분류 정확도

**목표**: ≥94% (92% → 94%로 상향)  
**측정**: 휴먼 리뷰 샘플 대비 일치율  
**알람 임계값**: < 94%

```typescript
const accuracy = correctClassifications / totalReviews;
// 목표: ≥94%
```

---

## 🚨 알람 조건

### 1. CS 평균 응답 시간 > 70초

```typescript
if (avgResponseTime > 70) {
  await sendAlert({
    type: "CS_RESPONSE_TIME_ALERT",
    metric: "avg_response_time",
    value: avgResponseTime,
    threshold: 70,
    message: "CS 평균 응답 시간이 목표치를 초과했습니다.",
  });
}
```

---

### 2. 자동 처리 비율 < 80%

```typescript
if (autoProcessRate < 80) {
  await sendAlert({
    type: "AUTO_PROCESS_RATE_ALERT",
    metric: "auto_process_rate",
    value: autoProcessRate,
    threshold: 80,
    message: "자동 처리 비율이 목표치를 하회했습니다.",
  });
}
```

---

### 3. 분쟁 전환율 > 1.0%

```typescript
if (disputeRate > 1.0) {
  await sendAlert({
    type: "DISPUTE_RATE_ALERT",
    metric: "dispute_rate",
    value: disputeRate,
    threshold: 1.0,
    message: "분쟁 전환율이 목표치를 초과했습니다.",
  });
}
```

---

### 4. 분류 정확도 < 94%

```typescript
if (accuracy < 94) {
  await sendAlert({
    type: "CLASSIFICATION_ACCURACY_ALERT",
    metric: "classification_accuracy",
    value: accuracy,
    threshold: 94,
    message: "분류 정확도가 목표치를 하회했습니다. 재학습이 필요합니다.",
  });
}
```

---

## 🔧 운영 체크리스트

### 일일 체크 (매일 00:00)

- [ ] CS 평균 응답 시간 확인 (목표: ≤70초)
- [ ] 자동 처리 비율 확인 (목표: ≥80%)
- [ ] 분쟁 전환율 확인 (목표: ≤1.0%)
- [ ] 분류 정확도 확인 (목표: ≥94%)

### 주간 체크 (매주 월요일)

- [ ] 분쟁 확률 감축율 확인 (목표: 80%↓)
- [ ] 만족도 리포트 확인
- [ ] 문구 리비전 필요 여부 검토
- [ ] 분류 규칙 재학습 필요 여부 검토

### 월간 체크 (매월 1일)

- [ ] CS 자동화 효과 종합 분석
- [ ] 분류 규칙 재학습
- [ ] 운영 규칙 개선

---

## 📝 로그 포맷

### 스레드 병합 로그

```json
{
  "event": "DISPUTE_THREAD_MERGED",
  "disputeId": "dispute_123",
  "parentDisputeId": "dispute_111",
  "similarity": 0.87,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 보상 트리거 로그

```json
{
  "event": "COMPENSATION_TRIGGERED",
  "disputeId": "dispute_123",
  "compensationAmount": 5000,
  "reason": "SLA_60MIN_EXCEEDED",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 만족도 낮음 로그

```json
{
  "event": "LOW_SATISFACTION_DETECTED",
  "disputeId": "dispute_123",
  "satisfaction": 4.2,
  "threshold": 4.5,
  "templateRevisionRequested": true,
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
- [ ] 분류 정확도 목표 94% 검증
- [ ] SLA 시간 설정 검증 (70초, 6분, 20분, 60분)

### 배포 후 모니터링

- [ ] 첫 24시간 내 자동 분류 정확도 확인
- [ ] 템플릿 즉시 발송 시간 확인 (3초 이내)
- [ ] SLA 에스컬레이션 동작 확인
- [ ] 스레드 병합 동작 확인
- [ ] 보상 트리거 동작 확인
- [ ] 만족도 모니터링 동작 확인

---

**CS 자동화 3단계 플레이북 완성**

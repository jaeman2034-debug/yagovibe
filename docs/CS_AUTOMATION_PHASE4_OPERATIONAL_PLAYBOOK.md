# 🔥 CS 자동화 4단계 완전 운영 플레이북

**목표**: CS 자동화 92% 달성, 분쟁 90% 감축, 채팅 99% 유지  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 CS 자동화 4단계 완전 운영 시스템

### 분쟁 자동 분류 정확도

**목표**: ≥97% (96% → 97%로 상향)  
**측정**: 휴먼 리뷰 샘플 대비 자동 분류 일치율  
**재학습 조건**: 오차 1% 이상 (정확도 < 96%)

```typescript
const CLASSIFICATION_ACCURACY_TARGET = 0.97; // 97%
const CLASSIFICATION_ERROR_THRESHOLD = 0.01; // 오차 1%
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
- 분류 신뢰도 < 97%
- 분쟁 유형이 FRAUD 또는 ACCOUNT_ABUSE

---

## 🚨 에스크로 강제(최종)

### 고가 + 저평판 + 미인증 → 자동 강제

**조건**: 가격 이상 + 저평판 + 미인증 사용자  
**처리**: 즉시 에스크로 강제  
**위험도 증가**: +30%

---

### 분쟁 이력 1회↑ → 강제

**조건**: 구매자 또는 판매자 30일 내 분쟁 1회 이상  
**처리**: 즉시 에스크로 강제  
**위험도 증가**: +30%

---

### 환불 분쟁 90%↓ 목표

**측정 방법**:
```typescript
const disputeRate = totalRefundDisputes / totalRefundRequests;
const reductionRate = 1 - disputeRate; // 감축률
// 목표: reductionRate >= 0.90 (90% 감축)
```

**자동 환불 조건**:
- 품질불량/상태불량
- 배송지연 (24시간 이내)
- 사기/기만
- 노쇼

**목표**: 환불 분쟁 90% 감축 (85% → 90%로 상향)  
**측정 주기**: 매일 00:00 (Asia/Seoul)

---

## ⏰ SLA 에스컬레이션 최종

### 1단계: 40초 무응답 → 봇 자동 응답

**조건**: 분쟁 생성 후 40초 경과 (45초 → 40초)  
**처리**: 봇 자동 응답 템플릿 발송  
**목표**: 모든 분쟁에 40초 이내 응답

```typescript
const SLA_BOT_RESPONSE_SECONDS = 40; // 40초
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

## 🔄 품질 피드백 루프

### CS 로그 → FAQ 자동 갱신

**조건**: 30일 내 동일/유사 문의 5회 이상  
**처리**: `faqAutoUpdateQueue` 컬렉션에 FAQ 자동 갱신 요청 등록  
**목표**: 반복 문의 자동 응답으로 전환

```typescript
const FAQ_UPDATE_THRESHOLD = 5; // 5회 이상

if (similarCount >= FAQ_UPDATE_THRESHOLD) {
  // FAQ 자동 갱신 요청 등록
  await db.collection("faqAutoUpdateQueue").add({
    inquiry,
    response: mostCommonResponse,
    similarCount,
    reason: "REPEATED_INQUIRY",
  });
}
```

---

### 반복 키워드 → 템플릿 생성

**조건**: 7일 내 동일 키워드 3회 이상  
**처리**: `templateGenerationQueue` 컬렉션에 템플릿 생성 요청 등록  
**목표**: 반복 키워드 기반 자동 템플릿 생성

```typescript
const TEMPLATE_GENERATION_THRESHOLD = 3; // 3회 이상

if (repeatedKeywords.length > 0) {
  // 템플릿 생성 요청 등록
  await db.collection("templateGenerationQueue").add({
    keywords: repeatedKeywords,
    title,
    description,
    reason: "REPEATED_KEYWORDS",
  });
}
```

---

### SLA 초과 → 원인 리포트

**조건**: SLA 초과율 ≥ 10%  
**처리**: `slaExceedReports` 컬렉션에 원인 리포트 생성  
**목표**: SLA 초과 원인 분석 및 개선

```typescript
const SLA_EXCEED_THRESHOLD = 0.1; // 10%

if (exceedRate >= SLA_EXCEED_THRESHOLD) {
  // 원인 리포트 생성
  await db.collection("slaExceedReports").add({
    date: yesterdayStart,
    totalDisputes,
    slaExceeded,
    exceedRate,
    exceedReasons,
    status: "PENDING_REVIEW",
  });
}
```

---

## 📊 자동화 오탐으로 과제재 대응

### 5% 샘플 휴먼 리뷰

**샘플링 비율**: 5%  
**목적**: 자동 분류 정확도 검증  
**처리**: `humanReviewQueue` 컬렉션에 등록

```typescript
const HUMAN_REVIEW_SAMPLE_RATE = 0.05; // 5%
```

---

### 만족도 4.7↓ → 문구 개편

**조건**: 만족도 ≤ 4.7  
**처리**: `templateRevisionQueue` 컬렉션에 개편 요청 등록  
**목표**: 만족도 ≥ 4.7 유지

```typescript
const SATISFACTION_THRESHOLD = 4.7;

if (satisfaction <= SATISFACTION_THRESHOLD) {
  // 문구 개편 요청 등록
}
```

---

### 오분류 1%↑ → 룰 재학습

**조건**: 오분류율 ≥ 1% (1.5% → 1%로 강화)  
**처리**: `classificationRetrain` 컬렉션에 재학습 요청 등록  
**목표**: 오분류율 < 1% 유지

```typescript
const MISCLASSIFICATION_THRESHOLD = 0.01; // 1%

if (misclassificationRate >= MISCLASSIFICATION_THRESHOLD) {
  // 재학습 요청 등록
}
```

---

## 📈 모니터링 지표 (일일 체크)

### 1. CS 평균 응답 시간

**목표**: ≤40초 (45초 → 40초로 강화)  
**측정**: 분쟁 생성부터 첫 응답까지  
**알람 임계값**: > 40초

```typescript
const avgResponseTime = totalResponseTime / totalDisputes.size;
// 목표: ≤40초
```

---

### 2. 자동 처리 비율

**목표**: ≥92% (90% → 92%로 상향)  
**측정**: 자동 처리된 분쟁 비율  
**알람 임계값**: < 92%

```typescript
const autoProcessRate = (autoProcessedDisputes.size / totalDisputes.size) * 100;
// 목표: ≥92%
```

---

### 3. 분쟁 전환율

**목표**: ≤0.5% (0.6% → 0.5%로 하향)  
**측정**: 거래 대비 분쟁 발생 비율  
**알람 임계값**: > 0.5%

```typescript
const disputeRate = (totalDisputes.size / totalTrades.size) * 100;
// 목표: ≤0.5%
```

---

### 4. 분류 정확도

**목표**: ≥97% (96% → 97%로 상향)  
**측정**: 휴먼 리뷰 샘플 대비 일치율  
**알람 임계값**: < 97%

```typescript
const accuracy = correctClassifications / totalReviews;
// 목표: ≥97%
```

---

### 5. 환불 분쟁 감축률

**목표**: ≥90% 감축 (85% → 90%로 상향)  
**측정**: 환불 요청 대비 환불 분쟁 비율  
**알람 임계값**: 감축률 < 90%

```typescript
const reductionRate = 1 - (totalRefundDisputes / totalRefundRequests);
// 목표: reductionRate >= 0.90 (90% 감축)
```

---

## 🚨 알람 조건

### 1. CS 평균 응답 시간 > 40초

```typescript
if (avgResponseTime > 40) {
  await sendAlert({
    type: "CS_RESPONSE_TIME_ALERT",
    metric: "avg_response_time",
    value: avgResponseTime,
    threshold: 40,
    message: "CS 평균 응답 시간이 목표치를 초과했습니다.",
  });
}
```

---

### 2. 자동 처리 비율 < 92%

```typescript
if (autoProcessRate < 92) {
  await sendAlert({
    type: "AUTO_PROCESS_RATE_ALERT",
    metric: "auto_process_rate",
    value: autoProcessRate,
    threshold: 92,
    message: "자동 처리 비율이 목표치를 하회했습니다.",
  });
}
```

---

### 3. 분쟁 전환율 > 0.5%

```typescript
if (disputeRate > 0.5) {
  await sendAlert({
    type: "DISPUTE_RATE_ALERT",
    metric: "dispute_rate",
    value: disputeRate,
    threshold: 0.5,
    message: "분쟁 전환율이 목표치를 초과했습니다.",
  });
}
```

---

### 4. 분류 정확도 < 97%

```typescript
if (accuracy < 97) {
  await sendAlert({
    type: "CLASSIFICATION_ACCURACY_ALERT",
    metric: "classification_accuracy",
    value: accuracy,
    threshold: 97,
    message: "분류 정확도가 목표치를 하회했습니다. 재학습이 필요합니다.",
  });
}
```

---

### 5. 환불 분쟁 감축률 < 90%

```typescript
if (reductionRate < 0.90) {
  await sendAlert({
    type: "REFUND_DISPUTE_REDUCTION_ALERT",
    metric: "refund_dispute_reduction",
    value: reductionRate,
    threshold: 0.90,
    message: "환불 분쟁 감축률이 목표치를 하회했습니다.",
  });
}
```

---

## 🔧 운영 체크리스트

### 일일 체크 (매일 00:00)

- [ ] CS 평균 응답 시간 확인 (목표: ≤40초)
- [ ] 자동 처리 비율 확인 (목표: ≥92%)
- [ ] 분쟁 전환율 확인 (목표: ≤0.5%)
- [ ] 분류 정확도 확인 (목표: ≥97%)
- [ ] 환불 분쟁 감축률 확인 (목표: ≥90%)

### 주간 체크 (매주 월요일)

- [ ] 환불 분쟁 통계 리포트 확인
- [ ] 만족도 리포트 확인
- [ ] 문구 개편 필요 여부 검토
- [ ] 분류 규칙 재학습 필요 여부 검토
- [ ] FAQ 자동 갱신 필요 여부 검토
- [ ] 템플릿 생성 필요 여부 검토
- [ ] SLA 초과 원인 리포트 확인
- [ ] 룰 보정 필요 여부 검토
- [ ] 보상 트리거 동작 확인

### 월간 체크 (매월 1일)

- [ ] CS 자동화 효과 종합 분석
- [ ] 분류 규칙 재학습
- [ ] 운영 규칙 개선
- [ ] 비용 최적화 효과 분석
- [ ] 품질 피드백 루프 효과 분석

---

## 📝 로그 포맷

### CS 로그 FAQ 자동 갱신 로그

```json
{
  "event": "CS_LOG_FAQ_UPDATE",
  "logId": "log_123",
  "inquiry": "환불 요청",
  "similarCount": 5,
  "threshold": 5,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 반복 키워드 템플릿 생성 로그

```json
{
  "event": "REPEATED_KEYWORD_TEMPLATE",
  "disputeId": "dispute_123",
  "keywords": ["환불", "지연", "품질"],
  "threshold": 3,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### SLA 초과 원인 리포트 로그

```json
{
  "event": "SLA_EXCEED_REPORT",
  "date": "2024-01-01",
  "totalDisputes": 100,
  "slaExceeded": 12,
  "exceedRate": 0.12,
  "exceedReasons": {
    "BOT_RESPONSE_DELAY": 8,
    "AGENT_ASSIGNMENT_DELAY": 4
  },
  "threshold": 0.1,
  "timestamp": "2024-01-02T00:00:00Z"
}
```

---

## 🚀 배포 체크리스트

### 배포 전 확인

- [ ] 모든 CS 자동화 함수 코드 검증
- [ ] 분류 정확도 목표 97% 검증
- [ ] SLA 시간 설정 검증 (40초, 6분, 20분, 20분 쿠폰, 60분 보상)
- [ ] 품질 피드백 루프 함수 코드 검증
- [ ] FAQ 자동 갱신 로직 검증
- [ ] 템플릿 생성 로직 검증
- [ ] SLA 초과 원인 리포트 로직 검증

### 배포 후 모니터링

- [ ] 첫 24시간 내 자동 분류 정확도 확인
- [ ] 템플릿 즉시 발송 시간 확인 (3초 이내)
- [ ] SLA 에스컬레이션 동작 확인
- [ ] 품질 피드백 루프 동작 확인
- [ ] FAQ 자동 갱신 동작 확인
- [ ] 템플릿 생성 동작 확인
- [ ] SLA 초과 원인 리포트 생성 확인

---

**CS 자동화 4단계 완전 운영 플레이북 완성**

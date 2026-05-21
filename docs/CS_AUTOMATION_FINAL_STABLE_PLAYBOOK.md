# 🔥 CS 자동화 최종 안정 운영 플레이북

**목표**: CS 자동화 98% 달성, 분쟁 93% 감축, 채팅 99% 유지  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 CS 자동화 최종 안정 시스템

### 분쟁 자동 분류 정확도

**목표**: ≥98.5% (98% → 98.5%로 상향)  
**측정**: 휴먼 리뷰 샘플 대비 자동 분류 일치율  
**재학습 조건**: 오차 0.7% 이상 (정확도 < 97.8%)

```typescript
const CLASSIFICATION_ACCURACY_TARGET = 0.985; // 98.5%
const CLASSIFICATION_ERROR_THRESHOLD = 0.007; // 오차 0.7%
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
- 분류 신뢰도 < 98.5%
- 분쟁 유형이 FRAUD 또는 ACCOUNT_ABUSE

---

## 🚨 에스크로 강제(운영 표준)

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

### 환불 분쟁 93%↓ 유지

**측정 방법**:
```typescript
const disputeRate = totalRefundDisputes / totalRefundRequests;
const reductionRate = 1 - disputeRate; // 감축률
// 목표: reductionRate >= 0.93 (93% 감축)
```

**자동 환불 조건**:
- 품질불량/상태불량
- 배송지연 (24시간 이내)
- 사기/기만
- 노쇼

**목표**: 환불 분쟁 93% 감축 (92% → 93%로 상향)  
**측정 주기**: 매일 00:00 (Asia/Seoul)

---

## ⏰ SLA 에스컬레이션 최종

### 1단계: 20초 무응답 → 봇 자동 응답

**조건**: 분쟁 생성 후 20초 경과 (25초 → 20초)  
**처리**: 봇 자동 응답 템플릿 발송  
**목표**: 모든 분쟁에 20초 이내 응답

```typescript
const SLA_BOT_RESPONSE_SECONDS = 20; // 20초
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

## 📊 운영 대시보드 트리거

### 분쟁률 0.3%↑ → 경고

**조건**: 최근 1시간 내 분쟁률 ≥ 0.3%  
**처리**: `operationalAlerts` 컬렉션에 경고 등록  
**심각도**: WARNING

```typescript
const DISPUTE_RATE_WARNING_THRESHOLD = 0.3; // 0.3%

if (disputeRate >= DISPUTE_RATE_WARNING_THRESHOLD) {
  await db.collection("operationalAlerts").add({
    type: "DISPUTE_RATE_WARNING",
    metric: "dispute_rate",
    value: disputeRate,
    threshold: DISPUTE_RATE_WARNING_THRESHOLD,
    severity: "WARNING",
    status: "ACTIVE",
  });
}
```

**실행 주기**: 10분마다

---

### SLA 20초 초과 → 알람

**조건**: 최근 5분 내 봇 응답 20초 초과 분쟁 존재  
**처리**: `operationalAlerts` 컬렉션에 알람 등록  
**심각도**: HIGH

```typescript
const SLA_EXCEED_ALERT_THRESHOLD = 20; // 20초

if (elapsedSeconds > SLA_EXCEED_ALERT_THRESHOLD) {
  await db.collection("operationalAlerts").add({
    type: "SLA_EXCEED_ALERT",
    metric: "sla_exceed_count",
    value: slaExceededCount,
    threshold: SLA_EXCEED_ALERT_THRESHOLD,
    severity: "HIGH",
    status: "ACTIVE",
  });
}
```

**실행 주기**: 5분마다

---

### 특정 카테고리 급등 → 검수

**조건**: 최근 1시간 내 특정 카테고리 게시글이 시간당 평균의 2배 이상  
**처리**: 
1. ✅ 해당 카테고리의 최근 게시글에 `inspectionRequired: true` 설정
2. ✅ `inspectionQueue`에 등록
3. ✅ `operationalAlerts`에 알람 등록

```typescript
const CATEGORY_SURGE_THRESHOLD = 2.0; // 2배 이상

if (surgeRatio >= CATEGORY_SURGE_THRESHOLD) {
  // 검수 필수 설정
  await db.collection("market").doc(postId).update({
    inspectionRequired: true,
    inspectionReason: "CATEGORY_SURGE",
    surgeRatio,
  });
}
```

**실행 주기**: 1시간마다

---

## 📊 오탐 제재로 CS 재증가 대응

### 5% 샘플 휴먼 리뷰

**샘플링 비율**: 5%  
**목적**: 자동 분류 정확도 검증  
**처리**: `humanReviewQueue` 컬렉션에 등록

```typescript
const HUMAN_REVIEW_SAMPLE_RATE = 0.05; // 5%
```

---

### 만족도 4.8↓ → 문구 개편

**조건**: 만족도 ≤ 4.8  
**처리**: `templateRevisionQueue` 컬렉션에 개편 요청 등록  
**목표**: 만족도 ≥ 4.8 유지

```typescript
const SATISFACTION_THRESHOLD = 4.8;

if (satisfaction <= SATISFACTION_THRESHOLD) {
  // 문구 개편 요청 등록
}
```

---

### 오분류 0.7%↑ → 룰 재학습

**조건**: 오분류율 ≥ 0.7% (0.8% → 0.7%로 강화)  
**처리**: `classificationRetrain` 컬렉션에 재학습 요청 등록  
**목표**: 오분류율 < 0.7% 유지

```typescript
const MISCLASSIFICATION_THRESHOLD = 0.007; // 0.7%

if (misclassificationRate >= MISCLASSIFICATION_THRESHOLD) {
  // 재학습 요청 등록
}
```

---

## 📈 모니터링 지표 (일일 체크)

### 1. CS 평균 응답 시간

**목표**: ≤20초 (25초 → 20초로 강화)  
**측정**: 분쟁 생성부터 첫 응답까지  
**알람 임계값**: > 20초

```typescript
const avgResponseTime = totalResponseTime / totalDisputes.size;
// 목표: ≤20초
```

---

### 2. 자동 처리 비율

**목표**: ≥98% (97% → 98%로 상향)  
**측정**: 자동 처리된 분쟁 비율  
**알람 임계값**: < 98%

```typescript
const autoProcessRate = (autoProcessedDisputes.size / totalDisputes.size) * 100;
// 목표: ≥98%
```

---

### 3. 분쟁 전환율

**목표**: ≤0.25% (0.3% → 0.25%로 하향)  
**측정**: 거래 대비 분쟁 발생 비율  
**알람 임계값**: > 0.25%

```typescript
const disputeRate = (totalDisputes.size / totalTrades.size) * 100;
// 목표: ≤0.25%
```

---

### 4. 분류 정확도

**목표**: ≥98.5% (98% → 98.5%로 상향)  
**측정**: 휴먼 리뷰 샘플 대비 일치율  
**알람 임계값**: < 98.5%

```typescript
const accuracy = correctClassifications / totalReviews;
// 목표: ≥98.5%
```

---

### 5. 환불 분쟁 감축률

**목표**: ≥93% 감축 (92% → 93%로 상향)  
**측정**: 환불 요청 대비 환불 분쟁 비율  
**알람 임계값**: 감축률 < 93%

```typescript
const reductionRate = 1 - (totalRefundDisputes / totalRefundRequests);
// 목표: reductionRate >= 0.93 (93% 감축)
```

---

## 🚨 알람 조건

### 1. CS 평균 응답 시간 > 20초

```typescript
if (avgResponseTime > 20) {
  await sendAlert({
    type: "CS_RESPONSE_TIME_ALERT",
    metric: "avg_response_time",
    value: avgResponseTime,
    threshold: 20,
    message: "CS 평균 응답 시간이 목표치를 초과했습니다.",
  });
}
```

---

### 2. 자동 처리 비율 < 98%

```typescript
if (autoProcessRate < 98) {
  await sendAlert({
    type: "AUTO_PROCESS_RATE_ALERT",
    metric: "auto_process_rate",
    value: autoProcessRate,
    threshold: 98,
    message: "자동 처리 비율이 목표치를 하회했습니다.",
  });
}
```

---

### 3. 분쟁 전환율 > 0.25%

```typescript
if (disputeRate > 0.25) {
  await sendAlert({
    type: "DISPUTE_RATE_ALERT",
    metric: "dispute_rate",
    value: disputeRate,
    threshold: 0.25,
    message: "분쟁 전환율이 목표치를 초과했습니다.",
  });
}
```

---

### 4. 분류 정확도 < 98.5%

```typescript
if (accuracy < 98.5) {
  await sendAlert({
    type: "CLASSIFICATION_ACCURACY_ALERT",
    metric: "classification_accuracy",
    value: accuracy,
    threshold: 98.5,
    message: "분류 정확도가 목표치를 하회했습니다. 재학습이 필요합니다.",
  });
}
```

---

### 5. 환불 분쟁 감축률 < 93%

```typescript
if (reductionRate < 0.93) {
  await sendAlert({
    type: "REFUND_DISPUTE_REDUCTION_ALERT",
    metric: "refund_dispute_reduction",
    value: reductionRate,
    threshold: 0.93,
    message: "환불 분쟁 감축률이 목표치를 하회했습니다.",
  });
}
```

---

## 🔧 운영 체크리스트

### 일일 체크 (매일 00:00)

- [ ] CS 평균 응답 시간 확인 (목표: ≤20초)
- [ ] 자동 처리 비율 확인 (목표: ≥98%)
- [ ] 분쟁 전환율 확인 (목표: ≤0.25%)
- [ ] 분류 정확도 확인 (목표: ≥98.5%)
- [ ] 환불 분쟁 감축률 확인 (목표: ≥93%)

### 주간 체크 (매주 월요일)

- [ ] 환불 분쟁 통계 리포트 확인
- [ ] 만족도 리포트 확인
- [ ] 수익 보호 통계 리포트 확인
- [ ] 운영 대시보드 알람 확인
- [ ] 에스크로 상시 설정 계정 수 확인
- [ ] 검수 필수 상품 수 확인
- [ ] SLA 초과 보상 쿠폰 지급액 확인
- [ ] 카테고리 급등 이력 확인
- [ ] 문구 개편 필요 여부 검토
- [ ] 분류 규칙 재학습 필요 여부 검토

### 월간 체크 (매월 1일)

- [ ] CS 자동화 효과 종합 분석
- [ ] 분류 규칙 재학습
- [ ] 운영 규칙 개선
- [ ] 비용 최적화 효과 분석
- [ ] 품질 피드백 루프 효과 분석
- [ ] 지식 자동 확장 효과 분석
- [ ] 품질-비용 최적 루프 효과 분석
- [ ] 수익 보호 루프 효과 분석
- [ ] 운영 대시보드 트리거 효과 분석

---

## 📝 로그 포맷

### 분쟁률 경고 로그

```json
{
  "event": "DISPUTE_RATE_WARNING",
  "type": "DISPUTE_RATE_WARNING",
  "metric": "dispute_rate",
  "value": 0.35,
  "threshold": 0.3,
  "totalTrades": 1000,
  "totalDisputes": 3.5,
  "severity": "WARNING",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### SLA 초과 알람 로그

```json
{
  "event": "SLA_EXCEED_ALERT",
  "type": "SLA_EXCEED_ALERT",
  "metric": "sla_exceed_count",
  "value": 5,
  "threshold": 20,
  "severity": "HIGH",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 카테고리 급등 검수 로그

```json
{
  "event": "CATEGORY_SURGE_ALERT",
  "type": "CATEGORY_SURGE_ALERT",
  "metric": "category_surge",
  "categories": ["전자제품", "명품"],
  "threshold": 2.0,
  "severity": "MEDIUM",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## 🚀 배포 체크리스트

### 배포 전 확인

- [ ] 모든 CS 자동화 함수 코드 검증
- [ ] 분류 정확도 목표 98.5% 검증
- [ ] SLA 시간 설정 검증 (20초, 6분, 20분, 20분 쿠폰, 60분 보상)
- [ ] 운영 대시보드 트리거 함수 코드 검증
- [ ] 분쟁률 경고 로직 검증
- [ ] SLA 초과 알람 로직 검증
- [ ] 카테고리 급등 검수 로직 검증

### 배포 후 모니터링

- [ ] 첫 24시간 내 자동 분류 정확도 확인
- [ ] 템플릿 즉시 발송 시간 확인 (3초 이내)
- [ ] SLA 에스컬레이션 동작 확인
- [ ] 운영 대시보드 트리거 동작 확인
- [ ] 분쟁률 경고 동작 확인
- [ ] SLA 초과 알람 동작 확인
- [ ] 카테고리 급등 검수 동작 확인

---

**CS 자동화 최종 안정 운영 플레이북 완성**

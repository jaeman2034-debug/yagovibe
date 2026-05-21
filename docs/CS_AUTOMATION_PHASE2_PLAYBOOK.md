# 🔥 CS 자동화 2단계 플레이북

**목표**: CS 처리 70% 자동화, 분쟁 자동 분류 정확도 ≥92%, SLA 강화  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 분쟁 자동 분류 시스템

### 분류 정확도 목표

**목표**: ≥92%  
**측정**: 휴먼 리뷰 샘플 대비 자동 분류 일치율  
**재학습 조건**: 오차 3% 이상 (정확도 < 89%)

```typescript
const CLASSIFICATION_ACCURACY_TARGET = 0.92; // 92%
const CLASSIFICATION_ERROR_THRESHOLD = 0.03; // 오차 3%
```

---

### 분류 규칙 (12종)

#### 1. 노쇼 (NO_SHOW)
- **키워드**: "노쇼", "불참", "안나옴", "연락안됨", "약속안지킴"
- **신뢰도**: 95%
- **우선순위**: HIGH

#### 2. 가격 분쟁 (PRICE_DISAGREEMENT)
- **키워드**: "가격", "돈", "비싸", "싸", "협의", "가격변경"
- **신뢰도**: 93%
- **우선순위**: MEDIUM

#### 3. 상품 상태 (ITEM_CONDITION)
- **키워드**: "상태", "품질", "손상", "깨짐", "고장", "불량"
- **신뢰도**: 92%
- **우선순위**: MEDIUM

#### 4. 결제 문제 (PAYMENT_ISSUE)
- **키워드**: "결제", "카드", "환불", "입금", "출금", "결제오류"
- **신뢰도**: 94%
- **우선순위**: HIGH

#### 5. 배송 문제 (DELIVERY_ISSUE)
- **키워드**: "배송", "택배", "배달", "수령", "미수령"
- **신뢰도**: 91%
- **우선순위**: MEDIUM

#### 6. 배송 지연 (DELIVERY_DELAY)
- **키워드**: "배송지연", "늦음", "늦게", "지연"
- **신뢰도**: 90%
- **우선순위**: MEDIUM

#### 7. 환불 요청 (REFUND_REQUEST)
- **키워드**: "환불", "돌려줘", "돌려달라", "환불요청"
- **신뢰도**: 92%
- **우선순위**: MEDIUM

#### 8. 거래 취소 (TRADE_CANCELLATION)
- **키워드**: "취소", "거래취소", "취소요청"
- **신뢰도**: 91%
- **우선순위**: MEDIUM

#### 9. 품질 문제 (QUALITY_ISSUE)
- **키워드**: "품질", "불량품", "품질문제", "불량"
- **신뢰도**: 90%
- **우선순위**: MEDIUM

#### 10. 사기 (FRAUD)
- **키워드**: "사기", "사기당함", "속임수", "기만"
- **신뢰도**: 98%
- **우선순위**: CRITICAL

#### 11. 계정 남용 (ACCOUNT_ABUSE)
- **키워드**: "계정", "남용", "악용", "부정"
- **신뢰도**: 97%
- **우선순위**: CRITICAL

#### 12. 기타 (OTHER)
- **키워드**: 매칭 실패 시
- **신뢰도**: 70%
- **우선순위**: LOW

---

## ⚡ 템플릿 즉시 발송 (3초 이내)

### 목표

**응답 시간**: 3초 이내  
**측정**: 분쟁 생성 시점부터 자동 답변 발송까지  
**알람 임계값**: > 3초

```typescript
const TEMPLATE_SEND_TIMEOUT_MS = 3000; // 3초
```

---

### 처리 흐름

1. 분쟁 생성 감지
2. 자동 분류 실행 (키워드 매칭)
3. 템플릿 선택 (12종 중 1개)
4. 즉시 사용자 알림 발송
5. 분쟁 문서 업데이트

---

## 🎯 고위험만 상담원 연결

### 고위험 판정 조건

**조건 1**: 우선순위 CRITICAL 또는 HIGH  
**조건 2**: 분류 신뢰도 < 92%  
**조건 3**: 분쟁 유형이 FRAUD 또는 ACCOUNT_ABUSE

```typescript
const HIGH_RISK_THRESHOLD = 0.7; // 고위험 임계값 70%

const isHighRisk = 
  priority === "CRITICAL" || 
  priority === "HIGH" || 
  confidence < CLASSIFICATION_ACCURACY_TARGET;
```

---

### 상담원 연결 처리

**자동 처리**:
1. ✅ `csQueue` 컬렉션에 등록
2. ✅ 우선순위 설정 (CRITICAL 또는 HIGH)
3. ✅ 분류 신뢰도 기록
4. ✅ 상태: PENDING

---

## ⏰ SLA 에스컬레이션 강화

### 1단계: 90초 무응답 → 봇 자동 응답

**조건**: 분쟁 생성 후 90초 경과  
**처리**: 봇 자동 응답 템플릿 발송  
**목표**: 모든 분쟁에 90초 이내 응답

```typescript
const SLA_BOT_RESPONSE_SECONDS = 90;
```

---

### 2단계: 8분 → 상담원 연결

**조건**: 분쟁 생성 후 8분 경과  
**처리**: 상담원 큐에 등록, 조사 단계로 전환  
**목표**: 고위험 분쟁 8분 이내 상담원 연결

```typescript
const SLA_AGENT_ESCALATION_MINUTES = 8;
```

---

### 3단계: 25분 → 리드 에스컬레이션

**조건**: 조사 시작 후 25분 경과  
**처리**: 리드 큐에 등록, CRITICAL 우선순위 설정  
**목표**: 장기 미해결 분쟁 25분 이내 리드 에스컬레이션

```typescript
const SLA_LEAD_ESCALATION_MINUTES = 25;
```

---

## 📊 자동 분류 오차 모니터링

### 5% 샘플 휴먼 리뷰

**샘플링 비율**: 5%  
**목적**: 자동 분류 정확도 검증  
**처리**: `humanReviewQueue` 컬렉션에 등록

```typescript
const HUMAN_REVIEW_SAMPLE_RATE = 0.05; // 5%
```

---

### 오차 3%↑ → 룰 재학습

**조건**: 정확도 < 89% (목표 92% - 오차 3%)  
**처리**: `classificationRetrain` 컬렉션에 재학습 요청 등록  
**목표**: 정확도 ≥92% 유지

```typescript
const CLASSIFICATION_ERROR_THRESHOLD = 0.03; // 오차 3%

if (accuracy < (CLASSIFICATION_ACCURACY_TARGET - CLASSIFICATION_ERROR_THRESHOLD)) {
  // 재학습 요청 등록
}
```

---

## 📈 모니터링 지표 (일일 체크)

### 1. CS 평균 응답 시간

**목표**: ≤90초  
**측정**: 분쟁 생성부터 첫 응답까지  
**알람 임계값**: > 90초

```typescript
const avgResponseTime = totalResponseTime / totalDisputes.size;
// 목표: ≤90초
```

---

### 2. 분쟁 전환율

**목표**: ≤1.2%  
**측정**: 거래 대비 분쟁 발생 비율  
**알람 임계값**: > 1.2%

```typescript
const disputeRate = (totalDisputes.size / totalTrades.size) * 100;
// 목표: ≤1.2%
```

---

### 3. 자동 처리 비율

**목표**: ≥70%  
**측정**: 자동 처리된 분쟁 비율  
**알람 임계값**: < 70%

```typescript
const autoProcessRate = (autoProcessedDisputes.size / totalDisputes.size) * 100;
// 목표: ≥70%
```

---

### 4. 분류 정확도

**목표**: ≥92%  
**측정**: 휴먼 리뷰 샘플 대비 일치율  
**알람 임계값**: < 92%

```typescript
const accuracy = correctClassifications / totalReviews;
// 목표: ≥92%
```

---

## 🚨 알람 조건

### 1. CS 평균 응답 시간 > 90초

```typescript
if (avgResponseTime > 90) {
  await sendAlert({
    type: "CS_RESPONSE_TIME_ALERT",
    metric: "avg_response_time",
    value: avgResponseTime,
    threshold: 90,
    message: "CS 평균 응답 시간이 목표치를 초과했습니다.",
  });
}
```

---

### 2. 분쟁 전환율 > 1.2%

```typescript
if (disputeRate > 1.2) {
  await sendAlert({
    type: "DISPUTE_RATE_ALERT",
    metric: "dispute_rate",
    value: disputeRate,
    threshold: 1.2,
    message: "분쟁 전환율이 목표치를 초과했습니다.",
  });
}
```

---

### 3. 자동 처리 비율 < 70%

```typescript
if (autoProcessRate < 70) {
  await sendAlert({
    type: "AUTO_PROCESS_RATE_ALERT",
    metric: "auto_process_rate",
    value: autoProcessRate,
    threshold: 70,
    message: "자동 처리 비율이 목표치를 하회했습니다.",
  });
}
```

---

### 4. 분류 정확도 < 92%

```typescript
if (accuracy < 92) {
  await sendAlert({
    type: "CLASSIFICATION_ACCURACY_ALERT",
    metric: "classification_accuracy",
    value: accuracy,
    threshold: 92,
    message: "분류 정확도가 목표치를 하회했습니다. 재학습이 필요합니다.",
  });
}
```

---

## 🔧 운영 체크리스트

### 일일 체크 (매일 00:00)

- [ ] CS 평균 응답 시간 확인 (목표: ≤90초)
- [ ] 분쟁 전환율 확인 (목표: ≤1.2%)
- [ ] 자동 처리 비율 확인 (목표: ≥70%)
- [ ] 분류 정확도 확인 (목표: ≥92%)

### 주간 체크 (매주 월요일)

- [ ] 분류 정확도 리포트 확인
- [ ] 재학습 필요 여부 검토
- [ ] 분류 규칙 개선 필요 여부 검토
- [ ] 사용자 피드백 반영

### 월간 체크 (매월 1일)

- [ ] CS 자동화 효과 종합 분석
- [ ] 분류 규칙 재학습
- [ ] 운영 규칙 개선

---

## 📝 로그 포맷

### 분쟁 자동 분류 로그

```json
{
  "event": "DISPUTE_AUTO_CLASSIFIED",
  "disputeId": "dispute_123",
  "type": "NO_SHOW",
  "confidence": 0.95,
  "priority": "HIGH",
  "responseTime": 1200,
  "needsHumanReview": false,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### SLA 에스컬레이션 로그

```json
{
  "event": "SLA_ESCALATED",
  "disputeId": "dispute_123",
  "escalationLevel": "BOT",
  "escalationTime": 90,
  "timestamp": "2024-01-01T12:01:30Z"
}
```

### 분류 정확도 리포트 로그

```json
{
  "event": "CLASSIFICATION_ACCURACY_REPORT",
  "date": "2024-01-01",
  "totalReviews": 100,
  "correctClassifications": 93,
  "accuracy": 0.93,
  "targetAccuracy": 0.92,
  "meetsTarget": true,
  "timestamp": "2024-01-02T00:00:00Z"
}
```

---

## 🚀 배포 체크리스트

### 배포 전 확인

- [ ] `onDisputeAutoClassify` 함수 코드 검증
- [ ] `slaEscalationScheduler` 스케줄러 코드 검증
- [ ] `onHumanReviewUpdated` 함수 코드 검증
- [ ] `classificationAccuracyReport` 스케줄러 코드 검증
- [ ] 분류 규칙 12종 검증
- [ ] SLA 시간 설정 검증

### 배포 후 모니터링

- [ ] 첫 24시간 내 자동 분류 정확도 확인
- [ ] 템플릿 즉시 발송 시간 확인 (3초 이내)
- [ ] SLA 에스컬레이션 동작 확인
- [ ] 휴먼 리뷰 샘플링 동작 확인
- [ ] 사용자 피드백 수집

---

**CS 자동화 2단계 플레이북 완성**

# 🔥 CS 자동화 수익 보호 루프 플레이북

**목표**: CS 자동화 97% 유지, 분쟁 92% 감축, 수익률 3% 안정  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 CS 자동화 안정 운영 시스템

### 분쟁 자동 분류 정확도

**목표**: ≥98% (유지)  
**측정**: 휴먼 리뷰 샘플 대비 자동 분류 일치율  
**재학습 조건**: 오차 0.8% 이상 (정확도 < 97.2%)

```typescript
const CLASSIFICATION_ACCURACY_TARGET = 0.98; // 98%
const CLASSIFICATION_ERROR_THRESHOLD = 0.008; // 오차 0.8%
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
- 분류 신뢰도 < 98%
- 분쟁 유형이 FRAUD 또는 ACCOUNT_ABUSE

---

## 🚨 에스크로 강제(운영 모드)

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

### 환불 분쟁 92%↓ 유지

**측정 방법**:
```typescript
const disputeRate = totalRefundDisputes / totalRefundRequests;
const reductionRate = 1 - disputeRate; // 감축률
// 목표: reductionRate >= 0.92 (92% 감축)
```

**자동 환불 조건**:
- 품질불량/상태불량
- 배송지연 (24시간 이내)
- 사기/기만
- 노쇼

**목표**: 환불 분쟁 92% 감축 유지  
**측정 주기**: 매일 00:00 (Asia/Seoul)

---

## 💰 수익 보호 루프

### 분쟁 반복 계정 → 에스크로 상시

**조건**: 30일 내 분쟁 2회 이상  
**처리**: 사용자 문서에 `escrowAlwaysRequired: true` 설정  
**효과**: 해당 계정의 모든 거래에 에스크로 필수

```typescript
const DISPUTE_REPEAT_THRESHOLD = 2; // 2회 이상

if (recentDisputes.size >= DISPUTE_REPEAT_THRESHOLD) {
  // 에스크로 상시 설정
  await db.collection("users").doc(userId).update({
    escrowAlwaysRequired: true,
    escrowAlwaysRequiredAt: FieldValue.serverTimestamp(),
    disputeCount: recentDisputes.size,
  });
}
```

**에스크로 강제 체크**:
```typescript
const buyerEscrowAlways = buyerSnap.data()?.escrowAlwaysRequired === true;
const sellerEscrowAlways = sellerSnap.data()?.escrowAlwaysRequired === true;

if (buyerEscrowAlways || sellerEscrowAlways) {
  return {
    forceEscrow: true,
    reason: "분쟁 반복 계정으로 인해 에스크로 거래가 항상 필수입니다.",
  };
}
```

---

### 고위험 상품 → 검수 필수

**조건**: 고위험 상품 점수 ≥ 70%  
**점수 계산**:
- 고가 상품 (50만원 이상): +30%
- 고위험 카테고리 (전자제품, 명품, 자동차): +20%
- 저평판 판매자 (평점 < 3.5): +20%
- 신규 판매자 (거래 < 5회): +30%

**처리**: 
1. ✅ 게시글에 `inspectionRequired: true` 설정
2. ✅ `inspectionQueue`에 등록
3. ✅ 검수 완료 전 거래 제한

```typescript
const HIGH_RISK_PRODUCT_THRESHOLD = 0.7; // 70%

let riskScore = 0;
if (isHighPrice) riskScore += 0.3;
if (isHighRiskCategory) riskScore += 0.2;
if (sellerReputation < 3.5) riskScore += 0.2;
if (sellerTradeCount < 5) riskScore += 0.3;

if (riskScore >= HIGH_RISK_PRODUCT_THRESHOLD) {
  // 검수 필수 설정
  await db.collection("market").doc(postId).update({
    inspectionRequired: true,
    inspectionStatus: "PENDING",
  });
}
```

---

### SLA 초과 → 보상 쿠폰

**조건**: 
- 봇 응답 25초 초과
- 상담원 연결 6분 초과

**처리**: 
1. ✅ 분쟁 문서에 `slaExceedCouponIssued: true` 설정
2. ✅ 보상 쿠폰 5,000원 지급
3. ✅ 사용자에게 쿠폰 안내 알림

```typescript
const SLA_EXCEED_COUPON_AMOUNT = 5000; // 5,000원

if (slaExceeded && !after.slaExceedCouponIssued) {
  await db.collection("disputes").doc(disputeId).update({
    slaExceedCouponIssued: true,
    slaExceedCouponAmount: SLA_EXCEED_COUPON_AMOUNT,
  });
}
```

---

## 📈 모니터링 지표 (일일 체크)

### 1. CS 평균 응답 시간

**목표**: ≤25초 (유지)  
**측정**: 분쟁 생성부터 첫 응답까지  
**알람 임계값**: > 25초

```typescript
const avgResponseTime = totalResponseTime / totalDisputes.size;
// 목표: ≤25초
```

---

### 2. 자동 처리 비율

**목표**: ≥97% (유지)  
**측정**: 자동 처리된 분쟁 비율  
**알람 임계값**: < 97%

```typescript
const autoProcessRate = (autoProcessedDisputes.size / totalDisputes.size) * 100;
// 목표: ≥97%
```

---

### 3. 분쟁 전환율

**목표**: ≤0.3% (유지)  
**측정**: 거래 대비 분쟁 발생 비율  
**알람 임계값**: > 0.3%

```typescript
const disputeRate = (totalDisputes.size / totalTrades.size) * 100;
// 목표: ≤0.3%
```

---

### 4. 수익률

**목표**: 3% 유지  
**측정**: 거래 수수료 대비 운영 비용  
**알람 임계값**: < 3%

```typescript
const revenueRate = (totalRevenue / totalTransactionAmount) * 100;
// 목표: ≥3%
```

---

### 5. 환불 분쟁 감축률

**목표**: ≥92% 감축 유지  
**측정**: 환불 요청 대비 환불 분쟁 비율  
**알람 임계값**: 감축률 < 92%

```typescript
const reductionRate = 1 - (totalRefundDisputes / totalRefundRequests);
// 목표: reductionRate >= 0.92 (92% 감축)
```

---

## 🚨 알람 조건

### 1. CS 평균 응답 시간 > 25초

```typescript
if (avgResponseTime > 25) {
  await sendAlert({
    type: "CS_RESPONSE_TIME_ALERT",
    metric: "avg_response_time",
    value: avgResponseTime,
    threshold: 25,
    message: "CS 평균 응답 시간이 목표치를 초과했습니다.",
  });
}
```

---

### 2. 자동 처리 비율 < 97%

```typescript
if (autoProcessRate < 97) {
  await sendAlert({
    type: "AUTO_PROCESS_RATE_ALERT",
    metric: "auto_process_rate",
    value: autoProcessRate,
    threshold: 97,
    message: "자동 처리 비율이 목표치를 하회했습니다.",
  });
}
```

---

### 3. 분쟁 전환율 > 0.3%

```typescript
if (disputeRate > 0.3) {
  await sendAlert({
    type: "DISPUTE_RATE_ALERT",
    metric: "dispute_rate",
    value: disputeRate,
    threshold: 0.3,
    message: "분쟁 전환율이 목표치를 초과했습니다.",
  });
}
```

---

### 4. 수익률 < 3%

```typescript
if (revenueRate < 3) {
  await sendAlert({
    type: "REVENUE_RATE_ALERT",
    metric: "revenue_rate",
    value: revenueRate,
    threshold: 3,
    message: "수익률이 목표치를 하회했습니다.",
  });
}
```

---

### 5. 환불 분쟁 감축률 < 92%

```typescript
if (reductionRate < 0.92) {
  await sendAlert({
    type: "REFUND_DISPUTE_REDUCTION_ALERT",
    metric: "refund_dispute_reduction",
    value: reductionRate,
    threshold: 0.92,
    message: "환불 분쟁 감축률이 목표치를 하회했습니다.",
  });
}
```

---

## 🔧 운영 체크리스트

### 일일 체크 (매일 00:00)

- [ ] CS 평균 응답 시간 확인 (목표: ≤25초)
- [ ] 자동 처리 비율 확인 (목표: ≥97%)
- [ ] 분쟁 전환율 확인 (목표: ≤0.3%)
- [ ] 수익률 확인 (목표: ≥3%)
- [ ] 환불 분쟁 감축률 확인 (목표: ≥92%)

### 주간 체크 (매주 월요일)

- [ ] 환불 분쟁 통계 리포트 확인
- [ ] 만족도 리포트 확인
- [ ] 수익 보호 통계 리포트 확인
- [ ] 에스크로 상시 설정 계정 수 확인
- [ ] 검수 필수 상품 수 확인
- [ ] SLA 초과 보상 쿠폰 지급액 확인
- [ ] 문구 개편 필요 여부 검토
- [ ] 분류 규칙 재학습 필요 여부 검토
- [ ] FAQ 자동 확장 필요 여부 검토
- [ ] 템플릿 생성 필요 여부 검토
- [ ] SLA 초과 원인 분석 리포트 확인
- [ ] 룰 보정 필요 여부 검토
- [ ] 보상 트리거 동작 확인
- [ ] 지식 자동 확장 동작 확인
- [ ] 품질-비용 최적 루프 동작 확인
- [ ] 수익 보호 루프 동작 확인

### 월간 체크 (매월 1일)

- [ ] CS 자동화 효과 종합 분석
- [ ] 분류 규칙 재학습
- [ ] 운영 규칙 개선
- [ ] 비용 최적화 효과 분석
- [ ] 품질 피드백 루프 효과 분석
- [ ] 지식 자동 확장 효과 분석
- [ ] 품질-비용 최적 루프 효과 분석
- [ ] 수익 보호 루프 효과 분석

---

## 📝 로그 포맷

### 분쟁 반복 계정 에스크로 상시 설정 로그

```json
{
  "event": "ESCROW_ALWAYS_REQUIRED",
  "userId": "user_123",
  "action": "ESCROW_ALWAYS_REQUIRED",
  "reason": "DISPUTE_REPEAT",
  "disputeCount": 2,
  "threshold": 2,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 고위험 상품 검수 필수 설정 로그

```json
{
  "event": "INSPECTION_REQUIRED",
  "postId": "post_123",
  "sellerId": "user_123",
  "action": "INSPECTION_REQUIRED",
  "reason": "HIGH_RISK_PRODUCT",
  "riskScore": 0.75,
  "threshold": 0.7,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### SLA 초과 보상 쿠폰 지급 로그

```json
{
  "event": "SLA_EXCEED_COUPON",
  "disputeId": "dispute_123",
  "userId": "user_123",
  "action": "SLA_EXCEED_COUPON",
  "reason": "BOT_RESPONSE_DELAY",
  "couponAmount": 5000,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 수익 보호 통계 리포트 로그

```json
{
  "event": "REVENUE_PROTECTION_STATS",
  "date": "2024-01-01",
  "escrowAlwaysRequiredCount": 5,
  "inspectionRequiredCount": 12,
  "slaExceedCouponCount": 8,
  "totalCouponAmount": 40000,
  "timestamp": "2024-01-02T00:00:00Z"
}
```

---

## 🚀 배포 체크리스트

### 배포 전 확인

- [ ] 모든 CS 자동화 함수 코드 검증
- [ ] 분류 정확도 목표 98% 검증
- [ ] SLA 시간 설정 검증 (25초, 6분, 20분, 20분 쿠폰, 60분 보상)
- [ ] 수익 보호 루프 함수 코드 검증
- [ ] 에스크로 상시 설정 로직 검증
- [ ] 고위험 상품 검수 필수 로직 검증
- [ ] SLA 초과 보상 쿠폰 로직 검증
- [ ] 수익 보호 통계 집계 로직 검증

### 배포 후 모니터링

- [ ] 첫 24시간 내 자동 분류 정확도 확인
- [ ] 템플릿 즉시 발송 시간 확인 (3초 이내)
- [ ] SLA 에스컬레이션 동작 확인
- [ ] 수익 보호 루프 동작 확인
- [ ] 에스크로 상시 설정 동작 확인
- [ ] 고위험 상품 검수 필수 설정 동작 확인
- [ ] SLA 초과 보상 쿠폰 지급 동작 확인
- [ ] 수익 보호 통계 집계 동작 확인

---

**CS 자동화 수익 보호 루프 플레이북 완성**

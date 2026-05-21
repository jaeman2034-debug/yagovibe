# 🔥 분쟁 사전 차단 플레이북

**목표**: 분쟁 확률 40%↓, 에스크로 강제로 거래 안전성 향상  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 분쟁 예측 규칙

### 1. 가격 이상 (15% 증가)

**조건**: 게시물에 `priceAnomaly: true` 플래그  
**판정**: 가격 가이드 대비 ±20% 이상 편차  
**위험도**: +15%

```typescript
if (post.priceAnomaly === true) {
  riskScore += 0.15;
}
```

---

### 2. 저평판 (20% 증가)

**조건**: 구매자 또는 판매자 평판 < 3.0  
**판정**: `users/{uid}.reputation < 3.0`  
**위험도**: +20%

```typescript
if (buyerReputation < 3.0 || sellerReputation < 3.0) {
  riskScore += 0.20;
}
```

---

### 3. 노쇼 이력 (25% 증가)

**조건**: 구매자 또는 판매자 노쇼 이력 존재  
**판정**: `trades` 컬렉션에서 `status: "NO_SHOW"` 이력  
**위험도**: +25%

```typescript
if (buyerNoShowCount.size > 0 || sellerNoShowCount.size > 0) {
  riskScore += 0.25;
}
```

---

### 4. 분쟁 이력 (20% 증가)

**조건**: 구매자 또는 판매자 30일 내 분쟁 이력  
**판정**: `disputes` 컬렉션에서 최근 30일 내 분쟁  
**위험도**: +20%

```typescript
if (buyerDisputeCount.size > 0 || sellerDisputeCount.size > 0) {
  riskScore += 0.20;
}
```

---

### 5. 미인증 사용자 (15% 증가)

**조건**: 구매자 또는 판매자 미인증  
**판정**: `faceToFaceVerified` 또는 `realNameVerified` 없음  
**위험도**: +15%

```typescript
if (!buyerVerified || !sellerVerified) {
  riskScore += 0.15;
}
```

---

### 6. 고가 거래 (10% 증가)

**조건**: 거래 금액 >= 50만원  
**판정**: `price >= 500000`  
**위험도**: +10%

```typescript
if (price >= 500000) {
  riskScore += 0.10;
}
```

---

### 7. 신규 사용자 (10% 증가)

**조건**: 구매자 또는 판매자 가입 30일 이내  
**판정**: `createdAt`이 30일 이내  
**위험도**: +10%

```typescript
if (buyerCreatedAt > thirtyDaysAgo || sellerCreatedAt > thirtyDaysAgo) {
  riskScore += 0.10;
}
```

---

## 🚨 에스크로 강제 조건

### 조건 1: 분쟁 위험도 60% 이상

**판정**: `riskScore >= 0.6`  
**처리**: 즉시 에스크로 강제

```typescript
if (riskScore >= 0.6) {
  forceEscrow = true;
  reason = "분쟁 위험도 60% 이상으로 에스크로 거래가 필수입니다.";
}
```

---

### 조건 2: 가격 이상 + 저평판 조합

**판정**: `priceAnomaly === true && lowReputation === true`  
**처리**: 즉시 에스크로 강제

```typescript
if (factors.priceAnomaly && factors.lowReputation) {
  forceEscrow = true;
  reason = "가격 이상 및 저평판 조합으로 에스크로 거래가 필수입니다.";
}
```

---

### 조건 3: 노쇼 이력 + 미인증 사용자 조합

**판정**: `noShowHistory === true && unverifiedUser === true`  
**처리**: 즉시 에스크로 강제

```typescript
if (factors.noShowHistory && factors.unverifiedUser) {
  forceEscrow = true;
  reason = "노쇼 이력 및 미인증 사용자 조합으로 에스크로 거래가 필수입니다.";
}
```

---

### 조건 4: 고가 거래 + 신규 사용자 조합

**판정**: `highPrice === true && newUser === true`  
**처리**: 즉시 에스크로 강제

```typescript
if (factors.highPrice && factors.newUser) {
  forceEscrow = true;
  reason = "고가 거래 및 신규 사용자 조합으로 에스크로 거래가 필수입니다.";
}
```

---

## 💬 사용자 문구

### 경고 배너 (30% 이상)

**구매자/판매자 공통**:
```
제목: 거래 주의 안내
내용: 이 거래의 분쟁 위험도가 {riskScore}%입니다. 에스크로 거래를 권장합니다.
```

---

### 에스크로 강제 (60% 이상 또는 특정 조합)

**구매자/판매자 공통**:
```
제목: 에스크로 거래 필수
내용: {reason}
```

**예시**:
- "분쟁 위험도 65%로 에스크로 거래가 필수입니다."
- "가격 이상 및 저평판 조합으로 에스크로 거래가 필수입니다."
- "노쇼 이력 및 미인증 사용자 조합으로 에스크로 거래가 필수입니다."
- "고가 거래 및 신규 사용자 조합으로 에스크로 거래가 필수입니다."

---

## 📈 모니터링 지표 (일일 체크)

### 1. 분쟁 예측 정확도

```typescript
// 목표: ≥70%
const dayStart = Timestamp.fromDate(
  new Date(new Date().setHours(0, 0, 0, 0))
);

const totalTrades = await db
  .collection("trades")
  .where("createdAt", ">=", dayStart)
  .get();

const predictedDisputes = totalTrades.docs.filter((doc) => {
  const trade = doc.data();
  return trade.disputeRiskScore >= 0.4;
}).length;

const actualDisputes = await db
  .collection("disputes")
  .where("createdAt", ">=", dayStart)
  .get();

// 예측된 분쟁 중 실제 분쟁 발생 비율
const accuracy = (actualDisputes.size / predictedDisputes) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: < 70%

---

### 2. 에스크로 강제율

```typescript
// 목표: 20-30%
const forcedEscrowTrades = await db
  .collection("trades")
  .where("forceEscrow", "==", true)
  .where("createdAt", ">=", dayStart)
  .get();

const escrowRate = (forcedEscrowTrades.size / totalTrades.size) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: < 20% 또는 > 30%

---

### 3. 분쟁 감축율

```typescript
// 목표: 40% 감축
const previousWeekDisputes = await db
  .collection("disputes")
  .where("createdAt", ">=", Timestamp.fromDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)))
  .where("createdAt", "<", Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
  .get();

const currentWeekDisputes = await db
  .collection("disputes")
  .where("createdAt", ">=", Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
  .get();

const reductionRate = ((previousWeekDisputes.size - currentWeekDisputes.size) / previousWeekDisputes.size) * 100;
```

**측정 주기**: 매주 월요일 00:00 (Asia/Seoul)  
**알람 임계값**: < 40%

---

## 🚨 알람 조건

### 1. 분쟁 예측 정확도 < 70%

```typescript
if (accuracy < 70) {
  await sendAlert({
    type: "DISPUTE_PREDICTION_ACCURACY_ALERT",
    metric: "prediction_accuracy",
    value: accuracy,
    threshold: 70,
    message: "분쟁 예측 정확도가 목표치를 하회했습니다.",
  });
}
```

---

### 2. 에스크로 강제율 < 20% 또는 > 30%

```typescript
if (escrowRate < 20 || escrowRate > 30) {
  await sendAlert({
    type: "ESCROW_RATE_ALERT",
    metric: "escrow_rate",
    value: escrowRate,
    threshold: [20, 30],
    message: "에스크로 강제율이 목표 범위를 벗어났습니다.",
  });
}
```

---

### 3. 분쟁 감축율 < 40%

```typescript
if (reductionRate < 40) {
  await sendAlert({
    type: "DISPUTE_REDUCTION_ALERT",
    metric: "reduction_rate",
    value: reductionRate,
    threshold: 40,
    message: "분쟁 감축율이 목표치를 하회했습니다.",
  });
}
```

---

## 🔧 운영 체크리스트

### 일일 체크 (매일 00:00)

- [ ] 분쟁 예측 정확도 확인 (목표: ≥70%)
- [ ] 에스크로 강제율 확인 (목표: 20-30%)
- [ ] 분쟁 감축율 확인 (목표: ≥40%)

### 주간 체크 (매주 월요일)

- [ ] 분쟁 예측 규칙 조정 필요 여부 검토
- [ ] 에스크로 강제 조건 조정 필요 여부 검토
- [ ] 사용자 피드백 반영

### 월간 체크 (매월 1일)

- [ ] 분쟁 사전 차단 효과 종합 분석
- [ ] 운영 규칙 개선

---

## 📝 운영 로그 형식

### 분쟁 예측 로그

```json
{
  "event": "DISPUTE_RISK_PREDICTED",
  "tradeId": "trade_123",
  "buyerId": "user_456",
  "sellerId": "user_789",
  "riskScore": 0.65,
  "factors": {
    "priceAnomaly": true,
    "lowReputation": true,
    "noShowHistory": false,
    "disputeHistory": false,
    "unverifiedUser": true,
    "highPrice": false,
    "newUser": false
  },
  "forceEscrow": true,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 에스크로 강제 로그

```json
{
  "event": "ESCROW_FORCED",
  "tradeId": "trade_123",
  "buyerId": "user_456",
  "sellerId": "user_789",
  "reason": "가격 이상 및 저평판 조합으로 에스크로 거래가 필수입니다.",
  "riskScore": 0.65,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

**분쟁 사전 차단 플레이북 완성**

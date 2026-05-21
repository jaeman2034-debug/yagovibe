# 🔥 분쟁 예측 모델 플레이북

**목표**: 위험 조합 규칙 기반 분쟁 예측, 에스크로 강제, CS 워크플로 자동화  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 위험 조합 규칙

### 1. 저평판 + 고가 + 미인증

**조건**:
- 구매자 또는 판매자 평판 < 3.0
- 거래 금액 >= 50만원
- 구매자 또는 판매자 미인증

**위험도**: 80%  
**에스크로 강제**: ✅  
**CS 우선 큐**: ✅

```typescript
{
  name: "저평판 + 고가 + 미인증",
  factors: ["lowReputation", "highPrice", "unverifiedUser"],
  weight: 0.8,
  escrowRequired: true,
  csPriority: true,
}
```

---

### 2. 가격 이상 + 노쇼 이력

**조건**:
- 게시물 가격 이상 플래그
- 구매자 또는 판매자 노쇼 이력

**위험도**: 70%  
**에스크로 강제**: ✅  
**CS 우선 큐**: ❌

```typescript
{
  name: "가격 이상 + 노쇼 이력",
  factors: ["priceAnomaly", "noShowHistory"],
  weight: 0.7,
  escrowRequired: true,
  csPriority: false,
}
```

---

### 3. 분쟁 이력 + 신규 사용자

**조건**:
- 구매자 또는 판매자 30일 내 분쟁 이력
- 구매자 또는 판매자 가입 30일 이내

**위험도**: 65%  
**에스크로 강제**: ✅  
**CS 우선 큐**: ❌

```typescript
{
  name: "분쟁 이력 + 신규 사용자",
  factors: ["disputeHistory", "newUser"],
  weight: 0.65,
  escrowRequired: true,
  csPriority: false,
}
```

---

### 4. 저평판 + 미인증 + 신규 사용자

**조건**:
- 구매자 또는 판매자 평판 < 3.0
- 구매자 또는 판매자 미인증
- 구매자 또는 판매자 가입 30일 이내

**위험도**: 75%  
**에스크로 강제**: ✅  
**CS 우선 큐**: ✅

```typescript
{
  name: "저평판 + 미인증 + 신규 사용자",
  factors: ["lowReputation", "unverifiedUser", "newUser"],
  weight: 0.75,
  escrowRequired: true,
  csPriority: true,
}
```

---

### 5. 고가 + 미인증 + 신규 사용자

**조건**:
- 거래 금액 >= 50만원
- 구매자 또는 판매자 미인증
- 구매자 또는 판매자 가입 30일 이내

**위험도**: 70%  
**에스크로 강제**: ✅  
**CS 우선 큐**: ❌

```typescript
{
  name: "고가 + 미인증 + 신규 사용자",
  factors: ["highPrice", "unverifiedUser", "newUser"],
  weight: 0.7,
  escrowRequired: true,
  csPriority: false,
}
```

---

### 6. 가격 이상 + 저평판 + 분쟁 이력

**조건**:
- 게시물 가격 이상 플래그
- 구매자 또는 판매자 평판 < 3.0
- 구매자 또는 판매자 30일 내 분쟁 이력

**위험도**: 85%  
**에스크로 강제**: ✅  
**CS 우선 큐**: ✅

```typescript
{
  name: "가격 이상 + 저평판 + 분쟁 이력",
  factors: ["priceAnomaly", "lowReputation", "disputeHistory"],
  weight: 0.85,
  escrowRequired: true,
  csPriority: true,
}
```

---

## 🚨 에스크로 강제 조건

### 조건 1: 위험 조합 매칭

**판정**: 위험 조합 중 하나 이상 매칭  
**처리**: 즉시 에스크로 강제

```typescript
const escrowRequired = matchedCombinations.some((c) => c.escrowRequired);
```

---

### 조건 2: 총 위험도 60% 이상

**판정**: `totalRiskScore >= 0.6`  
**처리**: 즉시 에스크로 강제

```typescript
if (totalRiskScore >= ESCROW_FORCE_THRESHOLD) {
  escrowRequired = true;
}
```

---

## 📋 CS 워크플로

### 1. CS 우선 큐 등록

**조건**: 위험 조합 매칭 또는 총 위험도 70% 이상

**처리**:
1. ✅ `csQueue` 컬렉션에 등록
2. ✅ 우선순위: CRITICAL (80% 이상) 또는 HIGH (70% 이상)
3. ✅ 상태: PENDING

```typescript
if (csPriority) {
  await db.collection("csQueue").add({
    tradeId,
    priority: riskLevel === "CRITICAL" ? "CRITICAL" : "HIGH",
    riskLevel,
    createdAt: FieldValue.serverTimestamp(),
    status: "PENDING",
  });
}
```

---

### 2. 위험도별 자동 조치

**CRITICAL (80% 이상)**:
- 즉시 관리자 알림
- CS 우선 큐 등록 (CRITICAL)
- 에스크로 강제

**HIGH (60-80%)**:
- CS 담당자 알림
- CS 우선 큐 등록 (HIGH)
- 에스크로 강제

**MEDIUM (40-60%)**:
- 경고 배너 표시
- 에스크로 권장

**LOW (40% 미만)**:
- 일반 처리

---

## 💬 사용자 문구

### CRITICAL (80% 이상)

```
⚠️ 이 거래는 매우 높은 분쟁 위험도({riskScore}%)를 가지고 있습니다. 
에스크로 거래가 필수이며, CS 우선 처리됩니다.
```

---

### HIGH (60-80%)

**에스크로 강제 시**:
```
⚠️ 이 거래는 높은 분쟁 위험도({riskScore}%)를 가지고 있습니다. 
에스크로 거래를 강력히 권장합니다.
```

**에스크로 강제 없을 시**:
```
⚠️ 이 거래는 높은 분쟁 위험도({riskScore}%)를 가지고 있습니다. 
주의하여 거래하시기 바랍니다.
```

---

### MEDIUM (40-60%)

**에스크로 강제 시**:
```
이 거래는 중간 분쟁 위험도를 가지고 있습니다. 
에스크로 거래를 권장합니다.
```

**에스크로 강제 없을 시**:
```
이 거래는 중간 분쟁 위험도를 가지고 있습니다. 
안전한 거래를 위해 에스크로를 고려해보세요.
```

---

### LOW (40% 미만)

```
이 거래는 낮은 분쟁 위험도를 가지고 있습니다. 
안전한 거래를 위해 에스크로를 고려해보세요.
```

---

## 📈 모니터링 지표 (일일 체크)

### 1. 위험 조합 매칭율

```typescript
// 목표: 15-25%
const dayStart = Timestamp.fromDate(
  new Date(new Date().setHours(0, 0, 0, 0))
);

const totalTrades = await db
  .collection("trades")
  .where("createdAt", ">=", dayStart)
  .get();

const matchedTrades = totalTrades.docs.filter((doc) => {
  const trade = doc.data();
  return trade.matchedRiskCombinations && trade.matchedRiskCombinations.length > 0;
}).length;

const matchRate = (matchedTrades / totalTrades.size) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: < 15% 또는 > 25%

---

### 2. 에스크로 강제율

```typescript
// 목표: 25-35%
const forcedEscrowTrades = await db
  .collection("trades")
  .where("forceEscrow", "==", true)
  .where("createdAt", ">=", dayStart)
  .get();

const escrowRate = (forcedEscrowTrades.size / totalTrades.size) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: < 25% 또는 > 35%

---

### 3. CS 우선 큐 등록율

```typescript
// 목표: 5-10%
const csPriorityTrades = await db
  .collection("trades")
  .where("csPriority", "==", true)
  .where("createdAt", ">=", dayStart)
  .get();

const csPriorityRate = (csPriorityTrades.size / totalTrades.size) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: < 5% 또는 > 10%

---

### 4. 분쟁 감축율

```typescript
// 목표: 50% 감축
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
**알람 임계값**: < 50%

---

## 🚨 알람 조건

### 1. 위험 조합 매칭율 < 15% 또는 > 25%

```typescript
if (matchRate < 15 || matchRate > 25) {
  await sendAlert({
    type: "RISK_COMBINATION_MATCH_RATE_ALERT",
    metric: "match_rate",
    value: matchRate,
    threshold: [15, 25],
    message: "위험 조합 매칭율이 목표 범위를 벗어났습니다.",
  });
}
```

---

### 2. 에스크로 강제율 < 25% 또는 > 35%

```typescript
if (escrowRate < 25 || escrowRate > 35) {
  await sendAlert({
    type: "ESCROW_RATE_ALERT",
    metric: "escrow_rate",
    value: escrowRate,
    threshold: [25, 35],
    message: "에스크로 강제율이 목표 범위를 벗어났습니다.",
  });
}
```

---

### 3. 분쟁 감축율 < 50%

```typescript
if (reductionRate < 50) {
  await sendAlert({
    type: "DISPUTE_REDUCTION_ALERT",
    metric: "reduction_rate",
    value: reductionRate,
    threshold: 50,
    message: "분쟁 감축율이 목표치를 하회했습니다.",
  });
}
```

---

## 🔧 운영 체크리스트

### 일일 체크 (매일 00:00)

- [ ] 위험 조합 매칭율 확인 (목표: 15-25%)
- [ ] 에스크로 강제율 확인 (목표: 25-35%)
- [ ] CS 우선 큐 등록율 확인 (목표: 5-10%)

### 주간 체크 (매주 월요일)

- [ ] 분쟁 감축율 확인 (목표: ≥50%)
- [ ] 위험 조합 규칙 조정 필요 여부 검토
- [ ] 사용자 피드백 반영

### 월간 체크 (매월 1일)

- [ ] 분쟁 예측 모델 효과 종합 분석
- [ ] 운영 규칙 개선

---

## 📝 운영 로그 형식

### 위험 조합 매칭 로그

```json
{
  "event": "RISK_COMBINATION_MATCHED",
  "tradeId": "trade_123",
  "buyerId": "user_456",
  "sellerId": "user_789",
  "matchedCombinations": [
    "저평판 + 고가 + 미인증",
    "가격 이상 + 저평판 + 분쟁 이력"
  ],
  "totalRiskScore": 0.85,
  "riskLevel": "CRITICAL",
  "escrowRequired": true,
  "csPriority": true,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### CS 우선 큐 등록 로그

```json
{
  "event": "CS_PRIORITY_QUEUE_REGISTERED",
  "tradeId": "trade_123",
  "priority": "CRITICAL",
  "riskLevel": "CRITICAL",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

**분쟁 예측 모델 플레이북 완성**

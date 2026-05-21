# 🔥 CS 자동화 룰셋 운영 플레이북

**목표**: 분쟁 처리 속도 향상, SLA 준수, 자동화로 운영 효율 극대화  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 분쟁 3단 워크플로

### 1단계: 초기 접수 (INITIAL)

**자동 처리**:
1. ✅ 분쟁 생성 시 자동 접수 처리
2. ✅ 자동 답변 템플릿 적용
3. ✅ SLA 첫 응답 시간 설정 (30분)
4. ✅ 사용자에게 접수 알림 발송

**처리 시간**: 즉시  
**SLA**: 30분 이내 첫 응답

---

### 2단계: 조사 중 (INVESTIGATION)

**자동 처리**:
1. ✅ 첫 응답 SLA 초과 시 자동 전환
2. ✅ 조사 시작 시간 기록
3. ✅ SLA 해결 시간 설정 (24시간)
4. ✅ 사용자에게 조사 중 알림 발송

**처리 시간**: 첫 응답 후 30분  
**SLA**: 24시간 이내 해결

---

### 3단계: 해결 완료 (RESOLUTION)

**자동 처리**:
1. ✅ 해결 완료 시간 기록
2. ✅ 사용자에게 해결 완료 알림 발송
3. ✅ 분쟁 상태 종료 처리

**처리 시간**: 조사 완료 후 즉시  
**SLA**: 24시간 이내 해결

---

## 💬 자동 답변 템플릿

### 노쇼 (NO_SHOW)

**초기 접수**:
```
노쇼 신고가 접수되었습니다. 30분 이내에 확인 후 조치하겠습니다.
```

**조사 중**:
```
노쇼 사유를 확인 중입니다. 상대방에게 연락을 시도하고 있습니다.
```

**해결 완료**:
```
노쇼가 확인되었습니다. 보증금 환불 및 평판 조정이 진행됩니다.
```

---

### 가격 분쟁 (PRICE_DISAGREEMENT)

**초기 접수**:
```
가격 분쟁이 접수되었습니다. 채팅 내역 및 가격 협의 내용을 확인 중입니다.
```

**조사 중**:
```
가격 협의 내역을 검토 중입니다. 채팅 로그를 확인하여 원인을 파악하겠습니다.
```

**해결 완료**:
```
가격 분쟁이 해결되었습니다. 합의된 가격으로 거래가 진행됩니다.
```

---

### 상품 상태 (ITEM_CONDITION)

**초기 접수**:
```
상품 상태 분쟁이 접수되었습니다. 사진 및 설명을 확인 중입니다.
```

**조사 중**:
```
상품 상태를 검토 중입니다. 사진 비교 및 설명 대조를 진행하겠습니다.
```

**해결 완료**:
```
상품 상태 분쟁이 해결되었습니다. 환불 또는 가격 조정이 진행됩니다.
```

---

### 결제 문제 (PAYMENT_ISSUE)

**초기 접수**:
```
결제 문제가 접수되었습니다. 결제 내역을 확인 중입니다.
```

**조사 중**:
```
결제 내역을 검토 중입니다. 결제 시스템 로그를 확인하겠습니다.
```

**해결 완료**:
```
결제 문제가 해결되었습니다. 환불 또는 재결제가 진행됩니다.
```

---

### 배송 문제 (DELIVERY_ISSUE)

**초기 접수**:
```
배송 문제가 접수되었습니다. 배송 추적 정보를 확인 중입니다.
```

**조사 중**:
```
배송 추적 정보를 검토 중입니다. 배송사와 연락하여 상황을 파악하겠습니다.
```

**해결 완료**:
```
배송 문제가 해결되었습니다. 재배송 또는 환불이 진행됩니다.
```

---

## ⏰ SLA 규칙

### 첫 응답 SLA

**목표**: 30분 이내 첫 응답  
**측정**: 분쟁 생성 시점부터 자동 답변 발송까지  
**초과 시**: 자동으로 조사 단계로 전환

```typescript
const SLA_FIRST_RESPONSE_MINUTES = 30;
```

---

### 해결 SLA

**목표**: 24시간 이내 해결  
**측정**: 조사 시작 시점부터 해결 완료까지  
**초과 시**: 에스컬레이션 조건 체크

```typescript
const SLA_RESOLUTION_HOURS = 24;
```

---

### 에스컬레이션 SLA

**목표**: 48시간 이내 해결  
**측정**: 분쟁 생성 시점부터 해결 완료까지  
**초과 시**: 자동 에스컬레이션

```typescript
const SLA_ESCALATION_HOURS = 48;
```

---

## 🚨 에스컬레이션 조건

### 1. 시간 기반 에스컬레이션

**조건**: 분쟁 생성 후 48시간 초과  
**우선순위**: 10 (최고)  
**처리**: 즉시 관리자에게 에스컬레이션

```typescript
if (hoursSinceCreation >= 48) {
  escalateDispute(disputeId, "TIME_EXCEEDED", 10);
}
```

---

### 2. 재시도 기반 에스컬레이션

**조건**: 3회 재시도 후  
**우선순위**: 9  
**처리**: 관리자에게 에스컬레이션

```typescript
if (retryCount >= 3) {
  escalateDispute(disputeId, "RETRY_EXCEEDED", 9);
}
```

---

### 3. 우선순위 기반 에스컬레이션

**조건**: 우선순위 8 이상  
**우선순위**: 원래 우선순위 유지  
**처리**: 즉시 관리자에게 에스컬레이션

```typescript
if (priority >= 8) {
  escalateDispute(disputeId, "HIGH_PRIORITY", priority);
}
```

---

### 4. 금액 기반 에스컬레이션

**조건**: 분쟁 금액 100만원 이상  
**우선순위**: 8  
**처리**: 관리자에게 에스컬레이션

```typescript
if (amount >= 1000000) {
  escalateDispute(disputeId, "HIGH_AMOUNT", 8);
}
```

---

### 5. 반복 분쟁 기반 에스컬레이션

**조건**: 동일 사용자 30일 내 3회 이상 분쟁  
**우선순위**: 7  
**처리**: 관리자에게 에스컬레이션

```typescript
if (userDisputes.size >= 3) {
  escalateDispute(disputeId, "REPEATED_DISPUTES", 7);
}
```

---

## 📈 모니터링 지표 (일일 체크)

### 1. 첫 응답 SLA 준수율

```typescript
// 목표: ≥95%
const dayStart = Timestamp.fromDate(
  new Date(new Date().setHours(0, 0, 0, 0))
);

const totalDisputes = await db
  .collection("disputes")
  .where("createdAt", ">=", dayStart)
  .get();

const slaCompliant = totalDisputes.docs.filter((doc) => {
  const dispute = doc.data();
  const createdAt = dispute.createdAt?.toDate();
  const autoResponseAt = dispute.autoResponseAt?.toDate();
  if (!createdAt || !autoResponseAt) return false;
  const minutes = (autoResponseAt.getTime() - createdAt.getTime()) / (1000 * 60);
  return minutes <= 30;
}).length;

const slaComplianceRate = (slaCompliant / totalDisputes.size) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: < 95%

---

### 2. 해결 SLA 준수율

```typescript
// 목표: ≥90%
const resolvedDisputes = await db
  .collection("disputes")
  .where("stage", "==", "RESOLUTION")
  .where("createdAt", ">=", dayStart)
  .get();

const slaCompliant = resolvedDisputes.docs.filter((doc) => {
  const dispute = doc.data();
  const investigationStartedAt = dispute.investigationStartedAt?.toDate();
  const resolvedAt = dispute.resolvedAt?.toDate();
  if (!investigationStartedAt || !resolvedAt) return false;
  const hours = (resolvedAt.getTime() - investigationStartedAt.getTime()) / (1000 * 60 * 60);
  return hours <= 24;
}).length;

const slaComplianceRate = (slaCompliant / resolvedDisputes.size) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: < 90%

---

### 3. 에스컬레이션율

```typescript
// 목표: ≤5%
const escalatedDisputes = await db
  .collection("disputes")
  .where("stage", "==", "ESCALATED")
  .where("createdAt", ">=", dayStart)
  .get();

const escalationRate = (escalatedDisputes.size / totalDisputes.size) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: > 5%

---

## 🚨 알람 조건

### 1. 첫 응답 SLA 준수율 < 95%

```typescript
if (slaComplianceRate < 95) {
  await sendAlert({
    type: "SLA_FIRST_RESPONSE_ALERT",
    metric: "sla_compliance_rate",
    value: slaComplianceRate,
    threshold: 95,
    message: "첫 응답 SLA 준수율이 목표치를 하회했습니다.",
  });
}
```

---

### 2. 해결 SLA 준수율 < 90%

```typescript
if (slaComplianceRate < 90) {
  await sendAlert({
    type: "SLA_RESOLUTION_ALERT",
    metric: "sla_resolution_rate",
    value: slaComplianceRate,
    threshold: 90,
    message: "해결 SLA 준수율이 목표치를 하회했습니다.",
  });
}
```

---

### 3. 에스컬레이션율 > 5%

```typescript
if (escalationRate > 5) {
  await sendAlert({
    type: "ESCALATION_RATE_ALERT",
    metric: "escalation_rate",
    value: escalationRate,
    threshold: 5,
    message: "에스컬레이션율이 목표치를 초과했습니다.",
  });
}
```

---

## 🔧 운영 체크리스트

### 일일 체크 (매일 00:00)

- [ ] 첫 응답 SLA 준수율 확인 (목표: ≥95%)
- [ ] 해결 SLA 준수율 확인 (목표: ≥90%)
- [ ] 에스컬레이션율 확인 (목표: ≤5%)

### 주간 체크 (매주 월요일)

- [ ] SLA 규칙 조정 필요 여부 검토
- [ ] 자동 답변 템플릿 개선 필요 여부 검토
- [ ] 사용자 피드백 반영

### 월간 체크 (매월 1일)

- [ ] CS 자동화 효과 종합 분석
- [ ] 운영 규칙 개선

---

## 📝 운영 로그 형식

### 분쟁 생성 로그

```json
{
  "event": "DISPUTE_CREATED",
  "disputeId": "dispute_123",
  "userId": "user_456",
  "type": "NO_SHOW",
  "stage": "INITIAL",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### SLA 초과 로그

```json
{
  "event": "SLA_EXCEEDED",
  "disputeId": "dispute_123",
  "slaType": "FIRST_RESPONSE",
  "exceededMinutes": 35,
  "timestamp": "2024-01-01T12:35:00Z"
}
```

### 에스컬레이션 로그

```json
{
  "event": "DISPUTE_ESCALATED",
  "disputeId": "dispute_123",
  "reason": "TIME_EXCEEDED",
  "priority": 10,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

**CS 자동화 룰셋 운영 플레이북 완성**

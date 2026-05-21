# 🔥 CS 자동화 룰셋 최종 통합 플레이북

**목표**: 분쟁 처리 속도 극대화, SLA 엄격 준수, 완전 자동화로 운영 효율 극대화  
**배포 상태**: ✅ 프로덕션 준비 완료 (v2 기준)

---

## 📊 분쟁 3단 워크플로 (최종)

### 1단계: 초기 접수 (INITIAL)

**자동 처리**:
1. ✅ 분쟁 생성 시 즉시 접수 처리
2. ✅ 자동 답변 템플릿 즉시 발송
3. ✅ SLA 첫 응답 시간 설정 (20분)
4. ✅ 사용자에게 접수 알림 발송
5. ✅ 우선순위 자동 설정

**처리 시간**: 즉시 (0분)  
**SLA**: 20분 이내 첫 응답  
**자동 전환**: SLA 초과 시 자동으로 조사 단계로 전환

---

### 2단계: 조사 중 (INVESTIGATION)

**자동 처리**:
1. ✅ 첫 응답 SLA 초과 시 자동 전환
2. ✅ 조사 시작 시간 기록
3. ✅ SLA 해결 시간 설정 (18시간)
4. ✅ 사용자에게 조사 중 알림 발송
5. ✅ 관련 증거 자동 수집

**처리 시간**: 첫 응답 후 자동 전환  
**SLA**: 18시간 이내 해결  
**자동 전환**: SLA 초과 시 자동으로 에스컬레이션

---

### 3단계: 해결 완료 (RESOLUTION)

**자동 처리**:
1. ✅ 해결 완료 시간 기록
2. ✅ 사용자에게 해결 완료 알림 발송
3. ✅ 분쟁 상태 종료 처리
4. ✅ 평판/제재 자동 적용

**처리 시간**: 조사 완료 후 즉시  
**SLA**: 18시간 이내 해결

---

### 4단계: 에스컬레이션 (ESCALATED)

**자동 처리**:
1. ✅ SLA 초과 시 자동 에스컬레이션
2. ✅ 관리자에게 즉시 알림 발송
3. ✅ 사용자에게 에스컬레이션 알림 발송
4. ✅ 우선순위 최고로 설정

**처리 시간**: SLA 초과 시 즉시  
**SLA**: 36시간 이내 해결

---

## 💬 자동 답변 템플릿 (완전)

### 노쇼 (NO_SHOW)

**초기 접수**:
```
노쇼 신고가 접수되었습니다. 20분 이내에 확인 후 조치하겠습니다.
```

**조사 중**:
```
노쇼 사유를 확인 중입니다. 상대방에게 연락을 시도하고 있습니다.
```

**해결 완료**:
```
노쇼가 확인되었습니다. 보증금 환불 및 평판 조정이 진행됩니다.
```

**에스컬레이션**:
```
노쇼 사유 확인이 지연되고 있습니다. 관리자에게 에스컬레이션되었습니다.
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

**에스컬레이션**:
```
가격 분쟁 해결이 지연되고 있습니다. 관리자에게 에스컬레이션되었습니다.
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

**에스컬레이션**:
```
상품 상태 분쟁 해결이 지연되고 있습니다. 관리자에게 에스컬레이션되었습니다.
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

**에스컬레이션**:
```
결제 문제 해결이 지연되고 있습니다. 관리자에게 에스컬레이션되었습니다.
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

**에스컬레이션**:
```
배송 문제 해결이 지연되고 있습니다. 관리자에게 에스컬레이션되었습니다.
```

---

### 사기 (FRAUD)

**초기 접수**:
```
사기 신고가 접수되었습니다. 즉시 조사에 착수하겠습니다.
```

**조사 중**:
```
사기 신고를 조사 중입니다. 관련 증거를 수집하고 있습니다.
```

**해결 완료**:
```
사기 신고가 확인되었습니다. 계정 정지 및 법적 조치가 진행됩니다.
```

**에스컬레이션**:
```
사기 신고 조사가 지연되고 있습니다. 관리자에게 즉시 에스컬레이션되었습니다.
```

---

### 계정 남용 (ACCOUNT_ABUSE)

**초기 접수**:
```
계정 남용 신고가 접수되었습니다. 즉시 조사에 착수하겠습니다.
```

**조사 중**:
```
계정 남용을 조사 중입니다. 관련 증거를 수집하고 있습니다.
```

**해결 완료**:
```
계정 남용이 확인되었습니다. 계정 정지 및 제재가 진행됩니다.
```

**에스컬레이션**:
```
계정 남용 조사가 지연되고 있습니다. 관리자에게 즉시 에스컬레이션되었습니다.
```

---

## ⏰ SLA 규칙 (최종)

### 첫 응답 SLA

**목표**: 20분 이내 첫 응답  
**측정**: 분쟁 생성 시점부터 자동 답변 발송까지  
**초과 시**: 자동으로 조사 단계로 전환  
**목표 준수율**: ≥98%

```typescript
const SLA_FIRST_RESPONSE_MINUTES = 20;
```

---

### 해결 SLA

**목표**: 18시간 이내 해결  
**측정**: 조사 시작 시점부터 해결 완료까지  
**초과 시**: 에스컬레이션 조건 체크  
**목표 준수율**: ≥95%

```typescript
const SLA_RESOLUTION_HOURS = 18;
```

---

### 에스컬레이션 SLA

**목표**: 36시간 이내 해결  
**측정**: 분쟁 생성 시점부터 해결 완료까지  
**초과 시**: 자동 에스컬레이션  
**목표 에스컬레이션율**: ≤3%

```typescript
const SLA_ESCALATION_HOURS = 36;
```

---

## 🚨 에스컬레이션 조건 (최종)

### 조건 1: 시간 기반 에스컬레이션

**판정**: 분쟁 생성 후 36시간 초과  
**우선순위**: 10 (최고)  
**처리**: 즉시 관리자에게 에스컬레이션

```typescript
if (investigationHours >= 36) {
  escalateDispute(disputeId, "TIME_EXCEEDED", 10);
}
```

---

### 조건 2: 재시도 기반 에스컬레이션

**판정**: 3회 재시도 후  
**우선순위**: 9  
**처리**: 관리자에게 에스컬레이션

```typescript
if (retryCount >= 3) {
  escalateDispute(disputeId, "RETRY_EXCEEDED", 9);
}
```

---

### 조건 3: 우선순위 기반 에스컬레이션

**판정**: 우선순위 8 이상  
**우선순위**: 원래 우선순위 유지  
**처리**: 즉시 관리자에게 에스컬레이션

```typescript
if (priority >= 8) {
  escalateDispute(disputeId, "HIGH_PRIORITY", priority);
}
```

---

### 조건 4: 금액 기반 에스컬레이션

**판정**: 분쟁 금액 100만원 이상  
**우선순위**: 8  
**처리**: 관리자에게 에스컬레이션

```typescript
if (amount >= 1000000) {
  escalateDispute(disputeId, "HIGH_AMOUNT", 8);
}
```

---

### 조건 5: 반복 분쟁 기반 에스컬레이션

**판정**: 동일 사용자 30일 내 3회 이상 분쟁  
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

**목표**: ≥98%  
**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: < 98%

```typescript
const slaComplianceRate = (slaCompliant / totalDisputes.size) * 100;
```

---

### 2. 해결 SLA 준수율

**목표**: ≥95%  
**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: < 95%

```typescript
const slaComplianceRate = (slaCompliant / resolvedDisputes.size) * 100;
```

---

### 3. 에스컬레이션율

**목표**: ≤3%  
**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: > 3%

```typescript
const escalationRate = (escalatedDisputes.size / totalDisputes.size) * 100;
```

---

### 4. 평균 해결 시간

**목표**: ≤15시간  
**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: > 15시간

```typescript
const avgResolutionHours = totalResolutionTime / resolvedDisputes.size;
```

---

## 🚨 알람 조건

### 1. 첫 응답 SLA 준수율 < 98%

```typescript
if (slaComplianceRate < 98) {
  await sendAlert({
    type: "SLA_FIRST_RESPONSE_ALERT",
    metric: "sla_compliance_rate",
    value: slaComplianceRate,
    threshold: 98,
    message: "첫 응답 SLA 준수율이 목표치를 하회했습니다.",
  });
}
```

---

### 2. 해결 SLA 준수율 < 95%

```typescript
if (slaComplianceRate < 95) {
  await sendAlert({
    type: "SLA_RESOLUTION_ALERT",
    metric: "sla_resolution_rate",
    value: slaComplianceRate,
    threshold: 95,
    message: "해결 SLA 준수율이 목표치를 하회했습니다.",
  });
}
```

---

### 3. 에스컬레이션율 > 3%

```typescript
if (escalationRate > 3) {
  await sendAlert({
    type: "ESCALATION_RATE_ALERT",
    metric: "escalation_rate",
    value: escalationRate,
    threshold: 3,
    message: "에스컬레이션율이 목표치를 초과했습니다.",
  });
}
```

---

## 🔧 운영 체크리스트

### 일일 체크 (매일 00:00)

- [ ] 첫 응답 SLA 준수율 확인 (목표: ≥98%)
- [ ] 해결 SLA 준수율 확인 (목표: ≥95%)
- [ ] 에스컬레이션율 확인 (목표: ≤3%)
- [ ] 평균 해결 시간 확인 (목표: ≤15시간)

### 주간 체크 (매주 월요일)

- [ ] SLA 규칙 조정 필요 여부 검토
- [ ] 자동 답변 템플릿 개선 필요 여부 검토
- [ ] 사용자 피드백 반영
- [ ] 분쟁 유형별 처리 시간 분석

### 월간 체크 (매월 1일)

- [ ] CS 자동화 효과 종합 분석
- [ ] 운영 규칙 개선
- [ ] 분쟁 감축율 확인 (목표: 70% 감축)

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
  "priority": "NORMAL",
  "slaFirstResponse": "2024-01-01T12:20:00Z",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### SLA 초과 로그

```json
{
  "event": "SLA_EXCEEDED",
  "disputeId": "dispute_123",
  "slaType": "FIRST_RESPONSE",
  "exceededMinutes": 25,
  "timestamp": "2024-01-01T12:25:00Z"
}
```

### 에스컬레이션 로그

```json
{
  "event": "DISPUTE_ESCALATED",
  "disputeId": "dispute_123",
  "reason": "TIME_EXCEEDED",
  "priority": 10,
  "investigationHours": 36.5,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## 🎯 분쟁 감축 목표

### 목표: 70% 감축

**측정 방법**:
```typescript
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

**목표**: ≥70% 감축  
**측정 주기**: 매주 월요일 00:00 (Asia/Seoul)

---

## 🚀 배포 체크리스트

### 배포 전 확인

- [ ] `onDisputeCreatedV2` 함수 활성화
- [ ] `onDisputeUpdatedV2` 함수 활성화
- [ ] `checkSLASchedulerV2` 스케줄러 활성화 (5분마다)
- [ ] 자동 답변 템플릿 검증
- [ ] SLA 규칙 검증
- [ ] 에스컬레이션 조건 검증

### 배포 후 모니터링

- [ ] 첫 24시간 내 SLA 준수율 확인
- [ ] 자동 답변 발송 확인
- [ ] 에스컬레이션 동작 확인
- [ ] 사용자 피드백 수집

---

**CS 자동화 룰셋 최종 통합 플레이북 완성**

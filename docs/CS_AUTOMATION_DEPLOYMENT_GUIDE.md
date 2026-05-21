# 🔥 CS 자동화 풀세트 배포 가이드

**목표**: 분쟁 비용 최종 압축, 완전 자동화로 운영 효율 극대화  
**배포 상태**: ✅ 프로덕션 준비 완료  
**템플릿 종류**: 12종

---

## 📦 배포 구성 요소

### 1. Cloud Functions

#### `onDisputeCreatedV2`
- **트리거**: `disputes/{disputeId}` 문서 생성 시
- **역할**: 분쟁 생성 시 즉시 초기 접수 처리
- **자동 처리**: 
  - 자동 답변 템플릿 발송 (12종)
  - SLA 첫 응답 시간 설정 (20분)
  - 사용자 알림 발송

#### `onDisputeUpdatedV2`
- **트리거**: `disputes/{disputeId}` 문서 업데이트 시
- **역할**: 분쟁 단계 변경 시 자동 처리
- **자동 처리**:
  - 단계별 자동 답변 발송
  - SLA 시간 업데이트
  - 사용자 알림 발송

#### `checkSLASchedulerV2`
- **트리거**: 5분마다 실행
- **역할**: SLA 체크 및 자동 에스컬레이션
- **자동 처리**:
  - 첫 응답 SLA 초과 → 자동 조사 단계 전환
  - 해결 SLA 초과 → 자동 에스컬레이션

---

## 📊 자동 답변 템플릿 12종

### 템플릿 목록

1. **노쇼 (NO_SHOW)**
2. **가격 분쟁 (PRICE_DISAGREEMENT)**
3. **상품 상태 (ITEM_CONDITION)**
4. **결제 문제 (PAYMENT_ISSUE)**
5. **배송 문제 (DELIVERY_ISSUE)**
6. **배송 지연 (DELIVERY_DELAY)** - 신규
7. **환불 요청 (REFUND_REQUEST)** - 신규
8. **거래 취소 (TRADE_CANCELLATION)** - 신규
9. **품질 문제 (QUALITY_ISSUE)** - 신규
10. **사기 (FRAUD)**
11. **계정 남용 (ACCOUNT_ABUSE)**
12. **기타 (OTHER)**

### 각 템플릿 구조

```typescript
{
  initial: string;        // 초기 접수 메시지
  investigation: string;  // 조사 중 메시지
  resolution: string;     // 해결 완료 메시지
  escalation?: string;    // 에스컬레이션 메시지 (선택)
}
```

---

## ⏰ SLA 규칙

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

## 🚨 에스컬레이션 조건

### 조건 1: 시간 기반 에스컬레이션

**판정**: 분쟁 생성 후 36시간 초과  
**우선순위**: 10 (최고)  
**처리**: 즉시 관리자에게 에스컬레이션

---

### 조건 2: 재시도 기반 에스컬레이션

**판정**: 3회 재시도 후  
**우선순위**: 9  
**처리**: 관리자에게 에스컬레이션

---

### 조건 3: 우선순위 기반 에스컬레이션

**판정**: 우선순위 8 이상  
**우선순위**: 원래 우선순위 유지  
**처리**: 즉시 관리자에게 에스컬레이션

---

### 조건 4: 금액 기반 에스컬레이션

**판정**: 분쟁 금액 100만원 이상  
**우선순위**: 8  
**처리**: 관리자에게 에스컬레이션

---

### 조건 5: 반복 분쟁 기반 에스컬레이션

**판정**: 동일 사용자 30일 내 3회 이상 분쟁  
**우선순위**: 7  
**처리**: 관리자에게 에스컬레이션

---

## 🚀 배포 절차

### 1단계: 코드 배포

```bash
# Firebase Functions 배포
cd functions
npm run build
firebase deploy --only functions:onDisputeCreatedV2
firebase deploy --only functions:onDisputeUpdatedV2
firebase deploy --only functions:checkSLASchedulerV2
```

---

### 2단계: Firestore 구조 확인

**필수 컬렉션**:
- `disputes/{disputeId}` - 분쟁 문서
- `csQueue/{queueId}` - CS 우선 큐
- `ops_logs/{logId}` - 운영 로그

**필수 필드**:
```typescript
{
  type: DisputeType;              // 분쟁 유형
  stage: DisputeStage;            // 분쟁 단계
  userId: string;                 // 사용자 ID
  postId?: string;                // 게시글 ID (선택)
  priority?: string;              // 우선순위
  slaFirstResponse?: Timestamp;  // 첫 응답 SLA
  slaResolution?: Timestamp;      // 해결 SLA
  autoResponse?: string;          // 자동 답변
  autoResponseAt?: Timestamp;     // 자동 답변 시간
  investigationStartedAt?: Timestamp; // 조사 시작 시간
  resolvedAt?: Timestamp;         // 해결 시간
  escalatedAt?: Timestamp;        // 에스컬레이션 시간
  escalationReason?: string;      // 에스컬레이션 사유
}
```

---

### 3단계: 알림 시스템 연동

**필수 연동**:
- `notify()` 함수 - 사용자 알림 발송
- 관리자 알림 시스템 - 에스컬레이션 알림

---

### 4단계: 모니터링 설정

**필수 모니터링**:
- 첫 응답 SLA 준수율 (목표: ≥98%)
- 해결 SLA 준수율 (목표: ≥95%)
- 에스컬레이션율 (목표: ≤3%)
- 평균 해결 시간 (목표: ≤15시간)

---

## 📈 모니터링 대시보드

### 일일 체크 (매일 00:00)

```typescript
// 첫 응답 SLA 준수율
const slaComplianceRate = (slaCompliant / totalDisputes.size) * 100;
// 목표: ≥98%

// 해결 SLA 준수율
const resolutionComplianceRate = (resolvedCompliant / resolvedDisputes.size) * 100;
// 목표: ≥95%

// 에스컬레이션율
const escalationRate = (escalatedDisputes.size / totalDisputes.size) * 100;
// 목표: ≤3%

// 평균 해결 시간
const avgResolutionHours = totalResolutionTime / resolvedDisputes.size;
// 목표: ≤15시간
```

---

## 🎯 분쟁 감축 목표

### 목표: 75% 감축

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

**목표**: ≥75% 감축  
**측정 주기**: 매주 월요일 00:00 (Asia/Seoul)

---

## 🔧 트러블슈팅

### 문제 1: 자동 답변이 발송되지 않음

**원인**: `notify()` 함수 오류 또는 FCM 토큰 없음  
**해결**: 
1. `notify()` 함수 로그 확인
2. 사용자 FCM 토큰 확인
3. 알림 권한 확인

---

### 문제 2: SLA 체크가 작동하지 않음

**원인**: 스케줄러 미배포 또는 시간대 설정 오류  
**해결**:
1. `checkSLASchedulerV2` 배포 확인
2. 시간대 설정 확인 (Asia/Seoul)
3. 스케줄러 로그 확인

---

### 문제 3: 에스컬레이션이 작동하지 않음

**원인**: 에스컬레이션 조건 미충족 또는 관리자 알림 미연동  
**해결**:
1. 에스컬레이션 조건 로그 확인
2. 관리자 알림 시스템 연동 확인
3. 우선순위 설정 확인

---

## 📝 배포 체크리스트

### 배포 전

- [ ] `onDisputeCreatedV2` 함수 코드 검증
- [ ] `onDisputeUpdatedV2` 함수 코드 검증
- [ ] `checkSLASchedulerV2` 스케줄러 코드 검증
- [ ] 자동 답변 템플릿 12종 검증
- [ ] SLA 규칙 검증
- [ ] 에스컬레이션 조건 검증
- [ ] Firestore 구조 확인
- [ ] 알림 시스템 연동 확인

### 배포 후

- [ ] 첫 24시간 내 SLA 준수율 확인
- [ ] 자동 답변 발송 확인 (12종 템플릿)
- [ ] 에스컬레이션 동작 확인
- [ ] 사용자 피드백 수집
- [ ] 템플릿별 효과 분석
- [ ] 모니터링 대시보드 확인

---

## 🎯 성공 지표

### 주간 목표

- 첫 응답 SLA 준수율: ≥98%
- 해결 SLA 준수율: ≥95%
- 에스컬레이션율: ≤3%
- 평균 해결 시간: ≤15시간
- 분쟁 감축율: ≥75%

---

**CS 자동화 풀세트 배포 가이드 완성**

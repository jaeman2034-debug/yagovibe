# Step 65: Multi-Tenant Org Rollout & Billing Guard

다중 조직/테넌트 구조에서 요금제·쿼터·SLA를 기반으로 기능 토글, 속도 제한, 우선순위 큐를 적용하고, 정책 상속(Org → Tenant/Project) 및 과금 메터링을 구현합니다.

## 📋 목표

1. 다중 조직/테넌트 구조 지원
2. 요금제 기반 기능 토글 및 속도 제한
3. 우선순위 큐 및 SLA 보호
4. 정책 상속 (Org → Tenant → Team)
5. 사용량 메터링 및 과금 계산

## 🗄️ 데이터 모델

### orgs/{orgId}

```typescript
{
  name: string;
  planId: "free" | "pro" | "enterprise";
  limits: {
    rpm: number;
    rpd: number;
    storageGb: number;
    seats: number;
    priority: number;
  };
  features: {
    graphCopilot: boolean;
    insights: boolean;
    governance: boolean;
  };
  policyRef: string; // policies/{id}
  billing: {
    customerId?: string;
    defaultPayment?: string;
  };
}
```

### tenants/{tenantId}

```typescript
{
  orgId: string;
  name: string;
  planOverride?: {
    planId: string;
    limits: any;
    features: any;
  };
  policyRef?: string; // policies/{id}
}
```

### usage/{yyyyMMdd}/{orgId}

```typescript
{
  rpm: number;
  rpd: number;
  tokens: number;
  storageBytes: number;
  endpoints: {
    opsRouter: number;
    graphCopilot: number;
    // ...
  };
  updatedAt: Timestamp;
}
```

### plans/{planId}

```typescript
{
  limits: {
    rpm: number;
    rpd: number;
    storageGb: number;
    seats: number;
    priority: number;
  };
  features: {
    graphCopilot: boolean;
    insights: boolean;
    governance: boolean;
  };
}
```

### featureOverrides/{orgId}

```typescript
{
  flags: {
    [key: string]: boolean;
  };
}
```

## ⚙️ Functions 구현

### 1. billingGuard (Billing & Quota Guard 미들웨어)

**파일**: `functions/src/step65.billingGuard.ts`

**함수**:
- `getOrgContext(orgId)`: 조직 컨텍스트 조회
- `checkFeature(orgId, key)`: 기능 활성화 확인
- `rateLimit(orgId, endpoint, rpm)`: 분당 속도 제한
- `enforceBilling(orgId, endpoint)`: 요금제 기반 제한 적용
- `checkQuota(orgId, endpoint)`: 일일 쿼터 확인

**사용 예**:
```typescript
import { enforceBilling, checkFeature } from './step65.billingGuard';

await checkFeature(orgId, 'graphCopilot');
await enforceBilling(orgId, 'graphCopilot');
```

### 2. usageIngest (사용량 메터링)

**파일**: `functions/src/step65.usageIngest.ts`

- **엔드포인트**: `POST /usageIngest`
- **Body**: `{ orgId: string, endpoint: string, tokens?: number }`
- **기능**: 사용량 수집 및 Firestore 저장

### 3. billingDaily (일일 과금 계산)

**파일**: `functions/src/step65.billingDaily.ts`

- **스케줄**: 매일 00:10
- **기능**:
  - 전날 사용량 집계
  - 토큰 단가 기반 과금 계산
  - `billingDaily` 컬렉션에 기록
  - Slack 알림 (선택)

### 4. priorityQueue (우선순위 큐)

**파일**: `functions/src/step65.priorityQueue.ts`

**함수**:
- `pickQueueForOrg(orgId)`: 조직별 우선순위 큐 선택
- `getQueuePriority(orgId)`: 큐 우선순위 숫자 반환
- `dispatchToQueue(orgId, endpoint, payload)`: Cloud Tasks 큐에 디스패치

**우선순위 매핑**:
- `enterprise` → `q-prio1` (priority: 1)
- `pro` → `q-prio2` (priority: 2)
- `free` → `q-prio3` (priority: 3)

### 5. policyInherit (정책 상속)

**파일**: `functions/src/step65.policyInherit.ts`

**함수**:
- `resolvePolicy({ orgId, tenantId?, teamId? })`: 정책 상속 해석

**원칙**:
- 낮은 레벨에서만 상향(permit) 가능
- 상위의 차단은 하위에서 해제 불가
- allow는 OR, deny는 AND로 적용

### 6. orgManagement (조직 관리 API)

**파일**: `functions/src/step65.orgManagement.ts`

**엔드포인트**:
- `GET /listOrgs`: 조직 목록 조회
- `POST /setOrgPlan`: 조직 요금제 설정
- `GET /getOrgContext?orgId=ORG_ID`: 조직 컨텍스트 조회
- `GET /getUsageStats?orgId=ORG_ID&days=7`: 사용량 통계 조회

## 🖥️ Frontend - OrgBillingCenter

**파일**: `src/pages/admin/OrgBillingCenter.tsx`

### 기능

- 조직 목록 테이블 (Org, Plan, RPM, RPD, Priority, Actions)
- 조직 상세 정보 (기본 정보, 제한, 기능, 사용량 통계)
- 요금제 변경 (Pro/Enterprise)
- Step 43 Role System 연동 (Owner/SecOps만 접근)

### 접근 경로

```
/app/admin/org-billing
(Owner/SecOps 권한 필요)
```

## 📊 테스트 시나리오

### 시나리오 1: Free 조직에서 graphCopilot 호출

```typescript
// Free 요금제는 graphCopilot 비활성화
await checkFeature("free-org-id", "graphCopilot");
// → Error: feature_disabled:graphCopilot
```

### 시나리오 2: Pro 조직 rpm=120 설정 후 130회 호출

```typescript
// Pro 요금제 rpm=120
for (let i = 0; i < 130; i++) {
  try {
    await enforceBilling("pro-org-id", "graphCopilot");
  } catch (error) {
    if (error.message === "rate_limited") {
      console.log(`Rate limited at ${i + 1}th call`);
    }
  }
}
// → 120회까지 성공, 121회부터 rate_limited
```

### 시나리오 3: Enterprise 조직에서 큐 선택

```typescript
const queueName = await pickQueueForOrg("enterprise-org-id");
// → "q-prio1"
```

### 시나리오 4: Org 정책 차단 후 Tenant에서 해제 시도

```typescript
// Org 정책에서 blockOps: ["retuning"]
// Tenant 정책에서 unblockOps: ["retuning"] 시도
// → 상속 규칙상 불가 (상위 차단은 하위에서 해제 불가)
```

## 🔧 배포 절차

### 1. Functions 배포

```bash
firebase deploy --only functions:usageIngest,functions:billingDaily,functions:listOrgs,functions:setOrgPlan,functions:getOrgContextAPI,functions:getUsageStats
```

### 2. 프론트엔드 접근

```
/app/admin/org-billing
(Owner/SecOps 권한 필요)
```

### 3. 초기 데이터 설정

**plans 컬렉션에 기본 요금제 추가**:
```javascript
// plans/free
{
  limits: { rpm: 60, rpd: 1000, storageGb: 1, seats: 5, priority: 3 },
  features: { graphCopilot: false, insights: true, governance: false }
}

// plans/pro
{
  limits: { rpm: 120, rpd: 5000, storageGb: 10, seats: 20, priority: 2 },
  features: { graphCopilot: true, insights: true, governance: false }
}

// plans/enterprise
{
  limits: { rpm: 500, rpd: 50000, storageGb: 100, seats: 100, priority: 1 },
  features: { graphCopilot: true, insights: true, governance: true }
}
```

## 📈 모니터링 & 경보

### 과금 급증 감지

- usage 일간 토큰 사용량 급등률 > 50% → Slack 경보

### RateLimit 초과 빈번

- ratelimits/* 429 비율 > 5% → 플랜 업그레이드 제안

### 큐 지연 증가

- prio3 평균 처리시간 > Xms → 탄력 확장 권고

## 🎨 확장 아이디어

### 1. Stripe 연동

- `billingDaily` → Stripe Usage Records 적재
- 결제 실패 시 plan 자동 다운그레이드
- 영수증/세금계산서 메일 발송

### 2. 실시간 쿼터 모니터링

- 사용량 대시보드
- 쿼터 초과 예고 알림

### 3. 자동 스케일링

- 사용량 기반 자동 플랜 업그레이드 제안
- 과사용 시 자동 다운그레이드

## 🐛 문제 해결

### 문제 1: 기능 체크 실패

**원인**: featureOverrides 미설정 또는 planId 오류

**해결**:
- `orgs/{orgId}` 문서 확인
- `plans/{planId}` 문서 확인
- `featureOverrides/{orgId}` 문서 확인

### 문제 2: 속도 제한 실패

**원인**: ratelimits 컬렉션 권한 오류

**해결**:
- Firestore Rules 확인
- Functions에서만 쓰기 가능하도록 설정

### 문제 3: 정책 상속 오류

**원인**: 정책 문서 경로 오류

**해결**:
- `orgs/{orgId}.policyRef` 확인
- `tenants/{tenantId}.policyRef` 확인

## 📚 다음 단계

- Step 66: Stripe 결제 연동
- Step 67: 실시간 쿼터 모니터링
- Step 68: 자동 스케일링


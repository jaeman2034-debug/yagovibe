# Step 64: Global AI Governance Portal + Policy-as-Code Engine

품질·윤리·보안·데이터보호 정책을 코드화(Policy-as-Code)하고, Portal에서 통합 관리/배포/감사합니다. GitOps로 정책을 버전 관리하고, 점진적 롤아웃/승인/드리프트 탐지를 자동화합니다.

## 📋 목표

1. Policy-as-Code YAML 스키마 정의
2. GitOps로 정책 버전 관리
3. 점진적 롤아웃/승인/드리프트 탐지 자동화
4. Governance Portal 통합 관리/배포/감사

## 🧩 전체 아키텍처

```
[Git Repo: /policies/*.yaml]  ← PR/Review/Sign
        │
        ├─(CI) policyCompiler → Firestore policies/{id}
        │
        ├─ governanceEnforcer (Functions Middleware)
        │     └─ 모든 엔드포인트: opsRouterV2 / graphCopilot / tuningLoop / export…
        │
        ├─ rolloutManager (canary %) / driftWatcher (desired vs runtime)
        │
        └─ Governance Portal (React): Policies / Rollouts / Overrides / Audit / Integrations
```

## 🗄️ 데이터 스키마

### policies/{policyId}

```typescript
{
  id: string;
  version: string;
  owners: string[];
  scope: {
    teams: string[];
    services: string[];
  };
  thresholds: {
    passRate: { op: string; value: number };
    copilotReliability: { op: string; value: number };
    regressionCount: { op: string; value: number };
    avgLatencyMs: { op: string; value: number };
  };
  actions: {
    onBreach: Array<{
      when: string;
      do: string[];
      blockOps?: string[];
    }>;
    onRecover: Array<{
      do: string[];
      unblockOps?: string[];
    }>;
  };
  privacy: {
    pii: { mask: string[]; exportRetentionDays: number };
  };
  retention: {
    auditLogs: number;
    insightReports: number;
  };
  rollout: {
    strategy: string;
    stages: Array<{
      percent: number;
      minHours: number;
    }>;
  };
  compiledAt: Timestamp;
  compiledBy: string;
  yamlSource?: string;
}
```

### policies/rollout

```typescript
{
  idx: number;
  percent: number;
  updatedAt: Timestamp;
  approvedBy: string;
}
```

### policies/runtimeOps

```typescript
{
  disabled: string[];
  updatedAt: Timestamp;
}
```

## ⚙️ Functions 구현

### 1. policyCompiler (Policy-as-Code 컴파일러)

**파일**: `functions/src/step64.policyCompiler.ts`

- **엔드포인트**: `POST /policyCompiler`
- **Body**: `{ yamlText: string, signature?: string, compiledBy?: string }`
- **기능**:
  - YAML 파싱
  - 서명 검증 (GPG/Keyless Sigstore - TODO)
  - Firestore 저장
  - 감사 로그 기록

### 2. governanceEnforcer (정책 미들웨어)

**파일**: `functions/src/step64.governanceEnforcer.ts`

- **함수**: `enforce(service: string, teamId?: string, action?: string)`
- **기능**:
  - 서비스 범위 체크
  - 팀 스코프 체크
  - 차단된 Ops 확인
  - 임계값 체크 (선택)

**사용 예**:
```typescript
import { enforce } from './step64.governanceEnforcer';

await enforce("ops", req.body?.teamId, intent);
```

### 3. rolloutManager (점진 배포 관리)

**파일**: `functions/src/step64.rolloutManager.ts`

- **엔드포인트**: `POST /rolloutAdvance`
- **Body**: `{ approvedBy?: string }`
- **기능**:
  - 회귀 검사 (governance 데이터 확인)
  - 다음 단계 계산
  - 최소 시간 체크
  - 롤아웃 상태 업데이트
  - 감사 로그 기록

### 4. driftWatcher (정책 드리프트 탐지)

**파일**: `functions/src/step64.driftWatcher.ts`

- **스케줄**: 매시간 실행
- **기능**:
  - desired vs runtime 비교
  - 드리프트 감지 (blockOps, unblockOps, rollout)
  - 알림 생성
  - Slack 알림 (선택)

### 5. getPolicy/getRollout/getRuntimeOps (조회 API)

**파일**: `functions/src/step64.getPolicy.ts`

- **엔드포인트**:
  - `GET /getPolicy?id=default-governance`
  - `GET /getRollout`
  - `GET /getRuntimeOps`

## 🖥️ Frontend - GovernancePortal

**파일**: `src/pages/admin/GovernancePortal.tsx`

### 기능

- Policy 정보 표시 (기본 정보, 범위, 임계값, 액션)
- Rollout 상태 표시 (현재 단계, 적용 퍼센트, 단계별 진행 상황)
- Runtime Overrides 표시 (차단된 Ops)
- Rollout Advance 버튼
- 보안/감사 가드라인 표시

### 접근 경로

```
/app/admin/governance-portal
(Owner/SecOps 권한 필요)
```

## 📝 Policy-as-Code YAML 예시

```yaml
id: default-governance
version: 2025.11.04
owners: [security@yago-vibe.com]
scope:
  teams: ["*"]
  services: [ops, insights, kg, exports]
thresholds:
  passRate: { op: ">=", value: 0.92 }
  copilotReliability: { op: ">=", value: 0.88 }
  regressionCount: { op: "<=", value: 3 }
  avgLatencyMs: { op: "<=", value: 500 }
actions:
  onBreach:
    - when: regressionCount > 3
      do: [blockOps: [retuning, deploy_model], alert: slack]
    - when: passRate < 0.9
      do: [alert: [slack, email]]
  onRecover:
    - do: [unblockOps: [retuning, deploy_model]]
privacy:
  pii: { mask: [email, phone], exportRetentionDays: 180 }
retention:
  auditLogs: 180
  insightReports: 365
rollout:
  strategy: canary
  stages:
    - { percent: 10, minHours: 4 }
    - { percent: 50, minHours: 8 }
    - { percent: 100, minHours: 12 }
```

## 🔒 보안/감사 가드라인

### Git-signed 정책

- GPG/Keyless Sigstore 서명 검증 (TODO)
- 서명 없이는 컴파일 거부

### 다중 승인 (4-eyes)

- `rolloutAdvance`는 최소 2명의 승인 필요 (TODO)
- 현재는 단일 승인으로 구현

### 감사 로그

- 모든 차단/해제 이벤트는 `auditLogs`에 기록
- Step 62 Trace Logger 재사용

### 팀/서비스 스코프

- 정책 오남용 방지
- 필수 필드: `scope.teams`, `scope.services`

## 🔧 배포 절차

### 1. 패키지 설치

```bash
cd functions
npm install js-yaml
npm install --save-dev @types/js-yaml
```

### 2. Functions 배포

```bash
firebase deploy --only functions:policyCompiler,functions:rolloutAdvance,functions:driftWatcher,functions:getPolicy,functions:getRollout,functions:getRuntimeOps
```

### 3. 프론트엔드 접근

```
/app/admin/governance-portal
(Owner/SecOps 권한 필요)
```

## 📊 사용 시나리오

### 시나리오 1: Policy 컴파일

1. Git Repo에 YAML 정책 작성
2. CI/CD에서 `policyCompiler` 호출
3. Firestore `policies/{id}` 저장
4. 자동 적용

### 시나리오 2: 점진적 롤아웃

1. Governance Portal 접근
2. Rollout 상태 확인
3. "다음 단계로" 버튼 클릭
4. 회귀 검사 통과 시 롤아웃 진행
5. 최소 시간 대기 후 다음 단계

### 시나리오 3: 정책 드리프트 탐지

1. 매시간 자동 실행
2. desired vs runtime 비교
3. 드리프트 감지 시 알림 생성
4. Slack 알림 발송

## 🎨 확장 아이디어

### 1. 다중 승인 워크플로우

- 최소 2명의 승인 필요
- 승인 대기 큐

### 2. 자동 롤백

- 회귀 감지 시 자동 롤백
- 이전 단계로 복원

### 3. 정책 템플릿

- 공통 정책 템플릿 제공
- 팀별 맞춤형 정책 생성

## 🐛 문제 해결

### 문제 1: YAML 파싱 실패

**원인**: YAML 형식 오류

**해결**:
- YAML 문법 검증
- 에러 메시지 개선

### 문제 2: 롤아웃 진행 실패

**원인**: 회귀 감지 또는 최소 시간 미달

**해결**:
- Governance 데이터 확인
- 최소 시간 체크 로직 확인

### 문제 3: 정책 드리프트 감지 오류

**원인**: desired vs runtime 비교 로직 오류

**해결**:
- 비교 로직 검증
- 테스트 케이스 추가

## 📚 다음 단계

- Step 65: 다중 승인 워크플로우
- Step 66: 자동 롤백
- Step 67: 정책 템플릿


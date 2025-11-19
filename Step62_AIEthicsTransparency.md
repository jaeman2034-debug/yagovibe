# Step 62: AI Ethics & Transparency Layer (Explainability & Audit Trail)

Copilot/인사이트/튜닝/정책 결정의 근거(Why)·과정(How)·주체(Who)를 추적·설명하고, 개인정보/보안/규정 준수 관점의 감사 가능성(Auditability)을 보장합니다.

## 📋 목표

1. 모든 AI 결정/행동의 불변 로그 생성
2. 결정 근거 설명 (Why-Chain)
3. 모델 정보 및 한계 공개 (Model Card)
4. PII 보호 및 동의 태깅
5. 감사 추적 및 증거 번들 생성

## 🧩 전체 구조

```
[All Actions/Decisions]
   ├─ opsRouterV2 / graphCopilot / tuningLoop / policyEngine / publishInsight
   └─
[Trace Logger (Middleware)]
   ├─ Immutable Log (Firestore: auditLogs/*, Cloud Logging, GCS hash)
   ├─ Evidence Bundle (input, params, model, prompt, output, roles)
   └─ PII Redaction + Consent Tag
      ↓
[Explain Service]
   ├─ Why-Chain Builder (rule/graph refs)
   ├─ Model Card Resolver (version, data, limits)
   └─ Risk/Compliance Checker (policy match)
      ↓
[Transparency UI]
   ├─ Decision Timeline & Diff
   ├─ Model Cards & Prompts
   └─ Export (PDF/JSON/CSV)
```

## 🗄️ 데이터 스키마

### auditLogs/{id}

```typescript
{
  ts: Timestamp;
  actor: {
    uid: string;
    role: string;
    name?: string;
  };
  subject: {
    teamId?: string;
    reportId?: string;
    [key: string]: any;
  };
  action: string; // 'retuning' | 'insight_publish' | 'policy_fire' | ...
  input: {
    text?: string;
    params?: any;
    promptId?: string;
  };
  output: {
    message?: string;
    score?: number;
    decisions?: any[];
  };
  model: {
    name?: string;
    version?: string;
    sha?: string;
    temperature?: number;
    provider?: string;
  };
  policy: {
    matchedRules?: any[];
    risk?: 'low' | 'med' | 'high';
  };
  pii: {
    redacted: boolean;
    fields: string[];
  };
  consent: {
    basis: 'contract' | 'consent' | 'legitimate';
    scope: string[];
  };
  integrity: {
    sha256: string;
    createdAt: Timestamp;
    gcsUri?: string;
  };
  links: {
    evidenceBundle?: string;
    kgNodes?: any[];
  };
}
```

### modelCards/{modelId}

```typescript
{
  name: string;
  version: string;
  provider: string;
  trainingDataSummary: string;
  evals: any;
  limitations: string[];
  intendedUse: string[];
  prohibitedUse: string[];
  safety: {
    biasNotes: string;
    knownFailureModes: string[];
  };
  contacts: {
    ownerEmail: string;
  };
}
```

## ⚙️ Functions 구현

### 1. Trace Logger (미들웨어)

**파일**: `functions/src/trace/traceLogger.ts`

- **기능**:
  - 모든 AI 결정/행동의 불변 로그 생성
  - SHA256 해시로 무결성 보장
  - Firestore `auditLogs` 컬렉션에 저장

**사용 예**:
```typescript
import { writeAuditLog } from './trace/traceLogger';

await writeAuditLog({
  actor: { uid, role },
  subject: { teamId },
  action: intent,
  input: { text },
  output: { message: out.message },
  model: { name: 'rules+LLM', version: process.env.MODEL_VER },
  policy: { matchedRules: [], risk: 'med' },
  pii: { redacted: true, fields: ['email'] },
  consent: { basis: 'legitimate', scope: ['ops'] },
});
```

### 2. PII 마스킹 유틸

**파일**: `functions/src/trace/pii.ts`

- **기능**:
  - 이메일, 전화번호, 주민등록번호, 신용카드 번호 마스킹
  - PII 필드 자동 감지
  - 동의 태깅 (법적 근거 및 범위)

### 3. Explain Service

**파일**: `functions/src/step62.explain.ts`

- **엔드포인트**: `GET /getDecisionExplain?logId=LOG_ID`
- **기능**:
  - Why-Chain 구성 (정책/그래프 링크)
  - Model Card 조회
  - 결정 해석 제공

### 4. List Audit Logs

**파일**: `functions/src/step62.listAudit.ts`

- **엔드포인트**: `GET /listAudit?limit=100&teamId=TEAM_ID&action=ACTION`
- **기능**: 감사 로그 목록 조회 (필터링 지원)

### 5. Evidence Export

**파일**: `functions/src/step62.evidenceExport.ts`

- **엔드포인트**: `GET /exportAuditForSubject?uid=USER_UID&format=json|csv`
- **기능**: 데이터 주체 요청(DSAR) 대응 증거 번들 생성

## 🖥️ Frontend - Transparency

**파일**: `src/pages/admin/Transparency.tsx`

### 기능

- 감사 로그 테이블 (시간, 행위, 팀, 주체, 위험도, 무결성)
- 결정 해석 상세 (Why-Chain, Model Card, 입력/출력)
- 보안/규정 준수 정보 (PII 보호, 동의, 무결성)
- 증거 번들 내보내기 (JSON/CSV)

### 접근 경로

```
/app/admin/transparency
(Owner/SecOps 권한 필요)
```

## 🔒 보안/권한

### Step 43 Role System 연동

**Frontend (Transparency.tsx)**:
- `useRoleAccess` 훅 사용
- Owner/SecOps 권한 확인
- 권한 없음 시 접근 차단 UI 표시

**Firestore Rules**:
- `auditLogs`: Owner 또는 SecOps만 읽기 가능, Functions에서만 쓰기 가능
- `modelCards`: 인증된 사용자 모두 읽기 가능, 관리자만 쓰기 가능

## 📊 규정 준수 가드라인

### 최소 수집 (데이터 다이어트)

- 목적 외 필드 로그 금지
- PII 즉시 마스킹

### 일시/지역 보존 정책

- 기본 180일
- 팀/법령에 따른 차등 적용

### 권한 분리

- Audit 로그는 Owner/SecOps만 조회 가능
- Functions에서만 쓰기 가능

### Integrity 보장

- SHA256 해시로 무결성 검증
- 주기적 GCS 증거 번들 스냅샷 (Write-Once 권장)

### Prompt/Model Card 공개

- 사용자에게 요약본 제공
- 민감 Prompt는 마스킹

### DSAR/Export

- 개인 데이터 열람/삭제 요청 흐름
- API 제공: `/exportAuditForSubject`

## 🔧 배포 절차

### 1. Functions 배포

```bash
firebase deploy --only functions:getDecisionExplain,functions:listAudit,functions:exportAuditForSubject
```

### 2. 프론트엔드 접근

```
/app/admin/transparency
(Owner/SecOps 권한 필요)
```

## 📊 사용 시나리오

### 시나리오 1: 결정 추적

1. AI 결정/행동 발생
2. `writeAuditLog` 호출
3. 불변 로그 생성 (SHA256 해시)
4. Transparency 대시보드에서 조회

### 시나리오 2: 결정 해석

1. Transparency 대시보드에서 로그 선택
2. "해석" 버튼 클릭
3. Why-Chain 및 Model Card 확인
4. 입력/출력 및 정책 정보 확인

### 시나리오 3: DSAR 대응

1. 데이터 주체 요청 접수
2. `/exportAuditForSubject?uid=USER_UID` 호출
3. JSON/CSV 형식으로 증거 번들 생성
4. 법적 요구사항에 따라 제공

## 🎨 확장 아이디어

### 1. 자동 보존 정책

- 기간 만료 시 자동 삭제
- 중요 로그는 영구 보존

### 2. 실시간 모니터링

- 위험도 높은 결정 실시간 알림
- 정책 위반 자동 감지

### 3. 시각화

- 결정 흐름 그래프
- 시간별 위험도 추이

## 🐛 문제 해결

### 문제 1: 로그가 생성되지 않음

**원인**: `writeAuditLog` 호출 누락

**해결**:
- Functions 코드에서 `writeAuditLog` 호출 확인
- Firestore 쓰기 권한 확인

### 문제 2: 결정 해석이 표시되지 않음

**원인**: Why-Chain 구성 실패

**해결**:
- 정책/그래프 링크 확인
- Model Card 문서 존재 확인

### 문제 3: PII 마스킹 실패

**원인**: 패턴 매칭 오류

**해결**:
- PII 패턴 정규식 확인
- 테스트 데이터로 검증

## 📚 다음 단계

- Step 63: Compliance Export & DSAR Automation
- Step 64: Real-time Risk Monitoring
- Step 65: Automated Retention Policy


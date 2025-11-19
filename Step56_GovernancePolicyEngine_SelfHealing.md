# Step 56: 실시간 정책 감시 및 자율 복구 (Self-Healing) 시스템

Copilot 및 품질 제어 생태계 전체에 대해 실시간 정책 감시, 자동 경고, 자율 복구 기능을 구현합니다.

## 📋 목표

시스템이 스스로 "위험 신호"를 감지하고, 자동으로 조치(차단·튜닝·알림)를 수행합니다.

## 🧩 시스템 개요

```
[governance/{daily}] → (Trigger)
     ↓
[Functions: governancePolicyEngine]
     ├─ 정책 룰셋 로드 (Firestore: policies/governance)
     ├─ 지표 검사 (passRate < threshold 등)
     ├─ 경고/차단/복구 실행
     └─ Slack · Email · OpsCenter 노출
```

## ⚙️ 1) 정책 문서 구조 (Firestore)

### policies/governance

```typescript
{
  "policyId": "default-governance",
  "rules": [
    { "metric": "passRate", "operator": "<", "value": 0.9, "action": "alert" },
    { "metric": "copilotReliability", "operator": "<", "value": 0.85, "action": "alert" },
    { "metric": "regressionCount", "operator": ">", "value": 3, "action": "block_risky_ops" },
    { "metric": "avgLatency", "operator": ">", "value": 500, "action": "tune_system" },
    { "metric": "passRate", "operator": "<", "value": 0.7, "action": "block_all" },
    { "metric": "regressionCount", "operator": ">", "value": 10, "action": "block_all" }
  ],
  "actions": {
    "alert": { "notifySlack": true, "notifyEmail": true },
    "block_risky_ops": { "disableIntent": ["retuning", "deploy_model", "bulk_alert"] },
    "tune_system": { "invoke": "tuningLoop" }
  }
}
```

### policies/runtimeOps

```typescript
{
  "disabled": ["retuning", "deploy_model"], // 차단된 명령 목록
  "updatedAt": Timestamp,
  "reason": "Governance Policy: regressionCount > 3"
}
```

## 🧠 2) Functions - governancePolicyEngine

**파일**: `functions/src/step56.governancePolicyEngine.ts`

### 기능

- **트리거**: `governance/{date}` 문서 생성/업데이트 시 자동 실행
- **정책 로드**: `policies/governance` 문서에서 룰셋 로드
- **규칙 평가**: 각 규칙에 대해 지표 비교 실행
- **자동 조치**:
  1. **alert**: Slack/Email 알림
  2. **block_risky_ops**: 위험 명령 차단 (`policies/runtimeOps.disabled` 업데이트)
  3. **tune_system**: 자동 튜닝 함수 호출 (`tuningLoop`)
  4. **block_all**: 모든 명령 차단 (긴급 상황)
- **감사 로그**: `alerts` 컬렉션에 기록

### 비교 연산자

- `<`: 미만
- `>`: 초과
- `<=`: 이하
- `>=`: 이상
- `==`: 동일

## 🖥️ 3) Governance Panel (OpsCenter 확장)

**파일**: `src/components/GovernancePanel.tsx`

### 기능

- **실시간 상태 표시**: Pass Rate, Reliability, Regressions, Avg Latency
- **색상 구분**: 
  - 초록: 정상 (Pass Rate >= 95%, Reliability >= 90%)
  - 노랑: 경고 (Pass Rate < 95%, Reliability < 90%)
  - 빨강: 위험 (Pass Rate < 90%, Reliability < 85%, Regressions > 3)
- **차단된 명령 표시**: `runtimeOps.disabled` 목록 표시
- **최근 실패 케이스**: Top Fail Cases 배지 표시

### OpsCenter 통합

`src/pages/admin/OpsCenter.tsx`에 GovernancePanel이 자동으로 표시됩니다.

## 🔁 4) OpsRouter 연동

**파일**: `functions/src/step53.opsRouterV2.ts`

### 차단 로직

1. `policies/runtimeOps.disabled` 조회
2. `"*"` 포함 시 모든 명령 차단
3. 특정 `intent` 포함 시 해당 명령 차단
4. 차단 시 `blocked: true` 응답 반환

### 응답 형식

```json
{
  "needConfirm": false,
  "message": "⚠️ \"retuning\" 명령이 Governance Policy에 의해 차단되었습니다.",
  "blocked": true,
  "reason": "Governance Policy: regressionCount > 3"
}
```

## 🧩 5) Self-Healing 전략 요약

| 유형 | 조건 | 조치 |
|------|------|------|
| **품질 저하** | passRate < 0.9 | Slack/Email 경보 |
| **Copilot 실패율 상승** | copilotReliability < 0.85 | AI Copilot 재기동 + 운영자 알림 |
| **Regression 누적** | regressionCount > 3 | block_risky_ops 정책 발동 |
| **Latency 과다** | avgLatency > 500 | tuningLoop 호출 (Step 48) |
| **긴급 상황** | passRate < 0.7 또는 regressionCount > 10 | 모든 명령 차단 (block_all) |

## 📊 API 엔드포인트

### GET /getRuntimeOps

**설명**: 차단된 명령 목록 조회

**응답**:
```json
{
  "disabled": ["retuning", "deploy_model"],
  "updatedAt": { "seconds": 1234567890, "nanoseconds": 0 },
  "reason": "Governance Policy: regressionCount > 3"
}
```

### GET /initGovernancePolicy

**설명**: 정책 문서 초기화 (수동 실행용)

**응답**:
```json
{
  "success": true,
  "message": "Governance Policy가 초기화되었습니다.",
  "policy": { ... }
}
```

## 🔧 배포 절차

### 1. Functions 배포

```bash
firebase deploy --only functions:governancePolicyEngine,functions:getRuntimeOps,functions:initGovernancePolicy
```

### 2. 정책 문서 초기화

```bash
# 브라우저에서 실행
GET https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/initGovernancePolicy
```

또는 Firebase Console에서 수동으로 `policies/governance` 문서 생성

### 3. 환경 변수 설정

```bash
firebase functions:config:set \
  slack.webhook_url="YOUR_SLACK_WEBHOOK_URL" \
  smtp.user="YOUR_EMAIL" \
  smtp.pass="YOUR_PASSWORD" \
  alert.email_to="admin@yago-vibe.com"
```

### 4. 프론트엔드 접근

```
/app/admin/ops-center 경로로 접근
(관리자 권한 필요)
```

## 📈 사용 시나리오

### 시나리오 1: 품질 저하 감지

1. `qaAggregator`가 일별 통계 집계
2. `governance/{date}` 문서 생성
3. `governancePolicyEngine` 트리거
4. `passRate < 0.9` 규칙 트리거
5. Slack/Email 알림 발송
6. `alerts` 컬렉션에 기록

### 시나리오 2: 위험 명령 차단

1. `regressionCount > 3` 규칙 트리거
2. `block_risky_ops` 액션 실행
3. `policies/runtimeOps.disabled` 업데이트
4. `opsRouterV2`에서 차단된 명령 거부
5. GovernancePanel에 차단 상태 표시

### 시나리오 3: 자동 튜닝

1. `avgLatency > 500` 규칙 트리거
2. `tune_system` 액션 실행
3. `tuningLoop` 함수 호출
4. 시스템 파라미터 자동 조정

## 🎨 확장 아이디어

### 1. 정책 관리 UI

- 정책 룰셋 편집 인터페이스
- 실시간 규칙 테스트
- 정책 히스토리 관리

### 2. 지능형 임계값 조정

- 과거 데이터 기반 자동 임계값 조정
- 계절성/트렌드 반영
- ML 기반 이상 탐지

### 3. 복구 전략 커스터마이징

- 복구 액션 우선순위 설정
- 복구 스크립트 등록
- 복구 성공률 모니터링

## 🐛 문제 해결

### 문제 1: governancePolicyEngine이 실행되지 않음

**원인**: `governance/{date}` 문서가 생성되지 않음

**해결**:
- `qaAggregator` 함수 수동 실행
- `governance` 컬렉션에 데이터 확인

### 문제 2: 알림이 발송되지 않음

**원인**: 환경 변수가 설정되지 않음

**해결**:
```bash
firebase functions:config:get
# 환경 변수 확인 및 설정
```

### 문제 3: 차단이 해제되지 않음

**원인**: `policies/runtimeOps.disabled`가 수동으로 업데이트되지 않음

**해결**:
- Firebase Console에서 `policies/runtimeOps` 문서 수정
- 또는 정책 규칙 임계값 조정

## 📚 다음 단계

- Step 57: 정책 관리 UI
- Step 58: 지능형 임계값 조정
- Step 59: 복구 전략 커스터마이징


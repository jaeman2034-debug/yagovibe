# Step 48: Closed-Loop Tuning (자동 보정 루프)

Step 47에서 감지된 Root Cause 결과를 바탕으로 ASR/TTS/NLU 파라미터를 실시간으로 자동 최적화하여 품질 문제를 스스로 보정하는 '자율 튜닝 루프(Autonomous Tuning Loop)'를 구축합니다.

## 📋 시스템 개요

```
[RootCauseCard 생성 (Step 47)]
     ↓
[Closed-Loop Controller (Functions: tuningLoop)]
     ├─ 읽기: teams/{teamId}/latestRootCause
     ├─ 판단: rule-based + reinforcement score
     ├─ 실행: updateASRConfig / updateTTSConfig / updateNLUWeights
     └─ 기록: tuningLogs/{ts}
```

**핵심 컨셉**: 오류를 '사후 감지'에 머물지 않고, 시스템이 스스로 파라미터를 보정하여 다음 세션에서 같은 오류를 줄입니다.

## 🚀 구현 사항

### 1. Functions - tuningLoop 스케줄러

**파일**: `functions/src/step48.tuningLoop.ts`

- **스케줄**: 6시간마다 실행
- **기능**:
  - 모든 팀의 `latestRootCause` 조회
  - Root Cause에 따라 보정 액션 결정
  - ASR/TTS/NLU 파라미터 자동 조정
  - 튜닝 로그 저장
  - 피드백 학습 (reinforcement score)

### 2. 보정 정책 관리

**Firestore 컬렉션**: `policies/{policyId}`

정책 문서 예시:

```json
{
  "policyId": "default",
  "thresholds": {
    "snr": 12,
    "speed_high": 180,
    "speed_low": 60,
    "gaps": 10,
    "overlaps": 8
  },
  "actions": {
    "snr_low": {
      "module": "ASR",
      "param": "noise_suppression",
      "value": "strong"
    },
    "speed_high": {
      "module": "ASR",
      "param": "vad_aggressiveness",
      "value": "high"
    },
    "speed_low": {
      "module": "ASR",
      "param": "vad_aggressiveness",
      "value": "low"
    },
    "keyword_bias": {
      "module": "NLU",
      "param": "entity_weight_balance",
      "value": "rebalance"
    },
    "silence_high": {
      "module": "TTS",
      "param": "silence_trim",
      "value": "enable"
    },
    "overlap_high": {
      "module": "TTS",
      "param": "timestamp_alignment",
      "value": "strict"
    }
  }
}
```

### 3. 각 모듈의 API 엔드포인트

| 모듈 | API 엔드포인트 | 조정 파라미터 | 설명 |
|------|---------------|--------------|------|
| ASR | `/config/asr` | `noise_suppression`, `vad_aggressiveness` | STT 전처리 파라미터 조정 |
| TTS | `/config/tts` | `silence_trim`, `speed_rate`, `timestamp_alignment` | 발화 길이 및 무성구간 보정 |
| NLU | `/config/nlu` | `entity_weight_balance`, `keyword_rebalance` | 엔티티 편향 보정 |

**환경 변수**:
- `ASR_API_URL`: ASR 서비스 API URL
- `TTS_API_URL`: TTS 서비스 API URL
- `NLU_API_URL`: NLU 서비스 API URL
- `ENABLE_TUNING_API`: `true`로 설정 시 실제 API 호출 (기본: 비활성화)

### 4. 피드백 학습 (Reinforcement Score)

**함수**: `evaluateTuningFeedback`

- 튜닝 이후 생성된 리포트들의 평균 점수 계산
- 기준 점수와 비교하여 `deltaScore` 계산
- Reinforcement score: 개선 시 +1, 악화 시 -1
- 튜닝 로그에 피드백 저장

**자동 평가**: Step 47의 `rootcauseAnalyzer`에서 Root Cause 분석 후 자동으로 피드백 평가 실행

### 5. 대시보드 통합

**컴포넌트**: `src/components/TuningCard.tsx`

- 최근 보정 시각 표시
- 수정된 파라미터 목록 (모듈별 색상 구분)
- 보정 효과 (deltaScore, reinforcement score)
- 품질 점수 변화 추이 그래프

**통합 위치**: `Step42_AIInsightsDashboard.tsx`

## 📊 보정 액션 매핑

| Root Cause | 보정 액션 | 모듈 | 파라미터 | 값 |
|-----------|----------|------|---------|-----|
| 노이즈/SNR 저하 | `snr_low` | ASR | `noise_suppression` | `strong` |
| 발화 속도 과다 | `speed_high` | ASR | `vad_aggressiveness` | `high` |
| 발화 속도 저하 | `speed_low` | ASR | `vad_aggressiveness` | `low` |
| 키워드 편중 | `keyword_bias` | NLU | `entity_weight_balance` | `rebalance` |
| 무성 구간 과다 | `silence_high` | TTS | `silence_trim` | `enable` |
| 타임스탬프 중첩 | `overlap_high` | TTS | `timestamp_alignment` | `strict` |

## 🔧 배포 절차

### 1. Functions 배포

```bash
cd functions
npm install node-fetch
cd ..
firebase deploy --only functions:tuningLoop
```

### 2. 환경 변수 설정 (선택)

```bash
# Functions 환경 변수 설정
firebase functions:config:set \
  asr.api_url="https://asr-service.example.com/config/asr" \
  tts.api_url="https://tts-service.example.com/config/tts" \
  nlu.api_url="https://nlu-service.example.com/config/nlu"
```

또는 `.env` 파일 사용:

```env
ASR_API_URL=https://asr-service.example.com/config/asr
TTS_API_URL=https://tts-service.example.com/config/tts
NLU_API_URL=https://nlu-service.example.com/config/nlu
ENABLE_TUNING_API=true  # 실제 API 호출 활성화
```

### 3. 기본 정책 생성 (Firestore)

```bash
# Firebase Console에서 수동 생성 또는
# Firestore에 policies/default 문서 생성
```

또는 Functions에서 초기화:

```typescript
// functions/src/initPolicy.ts
await db.collection("policies").doc("default").set(getDefaultPolicy());
```

## 📈 데이터 구조

### tuningLogs 컬렉션

```typescript
{
  teamId: string;
  createdAt: Date;
  decisions: Array<{
    action: {
      module: "ASR" | "TTS" | "NLU";
      param: string;
      value: string;
      reason?: string;
    };
    score: number;
    timestamp: Date;
  }>;
  policyId: string;
  feedback?: {
    deltaScore: number;
    avgScore: number;
    baselineScore: number;
    reinforcementScore: number;
    evaluatedAt: Date;
  };
}
```

### teams/{teamId}.lastTuning

```typescript
{
  lastTuning: {
    decisions: Array<TuningAction>;
    appliedAt: Date;
  };
  lastTunedAt: Date;
}
```

## 🎯 사용 시나리오

### 시나리오 1: SNR 저하 감지

1. Step 47에서 "마이크 노이즈/SNR 저하" Root Cause 감지
2. `tuningLoop` 실행 (6시간마다)
3. ASR 모듈의 `noise_suppression` 파라미터를 `strong`으로 조정
4. 다음 리포트에서 SNR 개선 확인
5. 피드백 학습: `deltaScore > 0.05` → `reinforcementScore = +1`

### 시나리오 2: 발화 속도 과다

1. "발화 속도 과다" Root Cause 감지
2. ASR 모듈의 `vad_aggressiveness`를 `high`로 조정
3. 발화 속도 정규화
4. 품질 점수 개선 추적

## 🔍 모니터링

### Functions 로그

```bash
firebase functions:log --only tuningLoop
```

### 튜닝 이력 조회

```typescript
const tuningLogs = await db
  .collection("tuningLogs")
  .where("teamId", "==", teamId)
  .orderBy("createdAt", "desc")
  .limit(10)
  .get();
```

### 피드백 통계

```typescript
const logs = await db
  .collection("tuningLogs")
  .where("teamId", "==", teamId)
  .where("feedback.reinforcementScore", ">", 0)
  .get();
```

## 🐛 문제 해결

### 튜닝이 실행되지 않을 때

1. **스케줄 확인**: `every 6 hours` 설정 확인
2. **Root Cause 확인**: `teams/{teamId}.latestRootCause` 존재 여부
3. **로그 확인**: `firebase functions:log --only tuningLoop`

### API 호출 실패

1. **환경 변수 확인**: `ASR_API_URL`, `TTS_API_URL`, `NLU_API_URL` 설정
2. **ENABLE_TUNING_API 확인**: `true`로 설정되어 있는지 확인
3. **로깅 확인**: API 호출 실패해도 로그는 저장됨 (나중에 수동 적용 가능)

### 피드백이 계산되지 않을 때

1. **튜닝 로그 확인**: `tuningLogs` 컬렉션에 데이터 존재 여부
2. **리포트 확인**: 튜닝 이후 생성된 리포트 존재 여부
3. **자동 평가 확인**: Step 47에서 자동으로 호출되는지 확인

## 📚 다음 단계

- Step 49: BigQuery ML 기반 정책 추천 모델
- Step 50: A/B 테스트 기반 보정 효과 검증
- Step 51: 실시간 튜닝 대시보드 (WebSocket)


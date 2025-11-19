# Step 49: Digital Twin Simulator (예측 시뮬레이터 & 디지털 트윈)

Step 48에서 자동으로 조정된 파라미터(ASR/TTS/NLU 등)의 효과를 가상 세션(Digital Twin) 환경에서 시뮬레이션하고, 품질 예측을 시각화하는 예측 시뮬레이터를 구축합니다.

## 📋 개념 구조

```
[tuningLogs/{ts}] → (Trigger)
     ↓
[Functions: digitalTwinSimulator]
     ├─ 호출 → Cloud Run: quality-predictor (ML inference)
     ├─ 시뮬레이션 입력: tuning params + lastRootCause + audio/text features
     ├─ 결과: 예상 Score / Coverage / 개선율(Δ)
     └─ 저장: teams/{teamId}/simulations/{ts}
```

**Digital Twin**: 실제 팀 세션의 복제 환경을 생성해, 변경된 파라미터가 향후 품질에 미치는 영향을 예측

**Core Engine**: LightGBM 또는 TensorFlow 모델로 학습된 품질 예측기 (또는 간단한 선형 회귀)

## 🚀 구현 사항

### 1. Cloud Run ML 예측 API

**파일**: `step49-quality-predictor/app.py`

- **FastAPI 기반 REST API**
- **엔드포인트**:
  - `POST /predict`: 단일 시나리오 예측
  - `POST /predict_batch`: 여러 시나리오 일괄 예측 (멀티 시나리오 비교)
  - `GET /health`: 헬스 체크

- **입력 특징**:
  - `snr_db`: SNR (dB)
  - `speech_blocks_per_min`: 발화 블록 수 (분당)
  - `coverage`: 커버리지 (0-1)
  - `gaps`: Gaps 개수
  - `overlaps`: Overlaps 개수
  - `vad_aggressiveness`: "low", "medium", "high"
  - `noise_suppression`: "weak", "normal", "strong"

- **출력**:
  - `predicted_score`: 예상 품질 점수 (0.0 ~ 1.0)
  - `confidence`: 예측 신뢰도 (0.0 ~ 1.0)
  - `model_used`: "actual" (실제 모델) 또는 "linear" (간단한 선형 회귀)

- **모델 로드**:
  - 실제 모델 파일 (`model_quality_predictor.pkl`)이 있으면 사용
  - 없으면 간단한 선형 회귀 사용 (가중치 기반)

### 2. Functions - 시뮬레이터 (Digital Twin)

**파일**: `functions/src/step49.digitalTwin.ts`

- **트리거**: `onDocumentCreated("tuningLogs/{logId}")`
- **기능**:
  - 튜닝 로그 생성 시 자동 실행
  - 팀의 최근 Root Cause 읽기
  - 튜닝 파라미터 추출
  - ML 예측 API 호출
  - 시뮬레이션 결과 저장 (`teams/{teamId}/simulations`)
  - 팀 문서에 최근 시뮬레이션 요약 저장

### 3. 프론트엔드 컴포넌트

**파일**: `src/components/SimulationResultCard.tsx`

- **표시 내용**:
  - 예상 품질 점수
  - 예측 신뢰도
  - 기준 점수와 비교 (delta)
  - 적용된 파라미터 목록
  - 입력 특징 (SNR, Blocks/min, Coverage, Gaps, Overlaps)

### 4. 대시보드 통합

- **Step42_AIInsightsDashboard**: 최근 3개 시뮬레이션 결과 표시
- **TeamInsightsDashboard**: 최근 시뮬레이션 요약 표시

## 📊 데이터 구조

### simulations 컬렉션

```typescript
{
  createdAt: Date;
  params: {
    vad_aggressiveness?: string;
    noise_suppression?: string;
    // ... 기타 파라미터
  };
  payload: {
    snr_db: number;
    speech_blocks_per_min: number;
    coverage: number;
    gaps: number;
    overlaps: number;
    vad_aggressiveness: string;
    noise_suppression: string;
  };
  predicted: {
    predicted_score: number;
    confidence?: number;
    model_used?: string;
  };
  rootRef: {
    reportId: string;
    summary: string;
    causes: Array<...>;
  };
}
```

### teams/{teamId}.latestSimulation

```typescript
{
  latestSimulation: {
    predictedScore: number;
    confidence: number;
    createdAt: Date;
  };
}
```

## 🔧 배포 절차

### 1. Cloud Run 서비스 배포

```bash
export PROJECT_ID="your-project"
export REGION="asia-northeast3"

cd step49-quality-predictor

# Docker 이미지 빌드
gcloud builds submit --tag gcr.io/$PROJECT_ID/quality-predictor:latest

# Cloud Run에 배포
gcloud run deploy quality-predictor \
  --image gcr.io/$PROJECT_ID/quality-predictor:latest \
  --region=$REGION \
  --allow-unauthenticated \
  --cpu=1 \
  --memory=1Gi \
  --timeout=60
```

### 2. 모델 파일 추가 (선택)

실제 ML 모델을 사용하려면:

```bash
# 모델 파일을 Docker 이미지에 포함
# Dockerfile에 추가:
# COPY model_quality_predictor.pkl ./

# 또는 Cloud Run 환경 변수로 모델 경로 설정
gcloud run services update quality-predictor \
  --set-env-vars MODEL_PATH=/path/to/model.pkl
```

### 3. Functions 배포

```bash
cd functions
npm install node-fetch
cd ..
firebase deploy --only functions:digitalTwinSimulator
```

### 4. 환경 변수 설정

```bash
# Firebase Functions 환경 변수 설정
firebase functions:config:set \
  predictor.url="https://quality-predictor-asia-northeast3-xxxxx.run.app"
```

또는 `.env` 파일:

```env
PREDICTOR_URL=https://quality-predictor-asia-northeast3-xxxxx.run.app
```

## 📈 사용 시나리오

### 시나리오 1: 튜닝 후 예측

1. Step 48에서 튜닝 로그 생성
2. `digitalTwinSimulator` 트리거
3. ML 예측 API 호출
4. 시뮬레이션 결과 저장
5. 대시보드에 예상 품질 점수 표시

### 시나리오 2: 멀티 시나리오 비교

```typescript
// 여러 파라미터 조합 비교
const scenarios = [
  { noise_suppression: "weak", vad_aggressiveness: "low" },
  { noise_suppression: "normal", vad_aggressiveness: "medium" },
  { noise_suppression: "strong", vad_aggressiveness: "high" },
];

// predict_batch API 호출
const results = await fetch(`${PREDICTOR_URL}/predict_batch`, {
  method: "POST",
  body: JSON.stringify(scenarios),
});
```

## 🎨 확장 아이디어

### 1. 멀티 시나리오 비교

- 여러 파라미터 조합을 한 번에 비교
- 그래프로 시각화 (예: `noise_suppression` 값별 예측 점수)

### 2. Heatmap 시각화

- 파라미터별 품질 민감도 시각화
- 예: `vad_aggressiveness` vs `noise_suppression` 매트릭스

### 3. 자동 개선 피드백 루프

- 실제 품질 점수와 예측치의 차이를 학습
- 모델 재학습 및 보정
- BigQuery ML로 모델 자동 업데이트

### 4. A/B 테스트 통합

- 시뮬레이션 결과를 A/B 테스트 계획에 반영
- 예측 점수가 높은 파라미터 조합을 우선 적용

## 🔍 모니터링

### Functions 로그

```bash
firebase functions:log --only digitalTwinSimulator
```

### Cloud Run 로그

```bash
gcloud run services logs read quality-predictor --region=$REGION
```

### 시뮬레이션 이력 조회

```typescript
const simulations = await db
  .collection(`teams/${teamId}/simulations`)
  .orderBy("createdAt", "desc")
  .limit(10)
  .get();
```

## 🐛 문제 해결

### 예측 API 호출 실패

1. **URL 확인**: `PREDICTOR_URL` 환경 변수 확인
2. **헬스 체크**: `/health` 엔드포인트 확인
3. **타임아웃**: Cloud Run 타임아웃 설정 확인

### 모델이 로드되지 않을 때

- 간단한 선형 회귀 사용 (기본값)
- 모델 파일 경로 확인: `MODEL_PATH` 환경 변수
- Docker 이미지에 모델 파일 포함 여부 확인

### 시뮬레이션이 생성되지 않을 때

1. **트리거 확인**: `tuningLogs` 문서 생성 여부
2. **Root Cause 확인**: `teams/{teamId}.latestRootCause` 존재 여부
3. **로그 확인**: Functions 로그에서 에러 확인

## 📚 다음 단계

- Step 50: 실제 ML 모델 학습 파이프라인 (BigQuery ML)
- Step 51: A/B 테스트 기반 보정 효과 검증
- Step 52: 실시간 시뮬레이션 대시보드 (WebSocket)


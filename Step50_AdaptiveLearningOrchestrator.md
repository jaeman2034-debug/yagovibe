# Step 50: Adaptive Learning Orchestrator (자율 품질 제어 재학습 파이프라인)

Step 49의 시뮬레이션 결과와 실제 품질 데이터를 비교하여, 품질 예측 모델(ML)과 파라미터 조정 정책을 자동 재학습 및 최적화하는 자율 품질 제어 오케스트레이터를 구축합니다.

## 📋 전체 아키텍처 개요

```
[BigQuery: quality_stream + simulations]
        ↓ (매일)
[Dataflow/Vertex AI Pipeline: Adaptive Trainer]
        ↓
[Model Registry] (GCS: yago-models/quality-predictor/)
        ↓
[Functions: deployUpdatedModel]
        ↓
[Cloud Run: quality-predictor 업데이트 자동화]
```

**Adaptive Trainer**: 품질 스트림 + 시뮬레이션 결과를 병합하여 Δscore(예측 오차)를 계산하고, 회귀/강화 모델을 재학습

**Orchestrator**: 주기적 실행(하루 1회) → 모델 평가 → 기준 성능 상회 시 자동 배포

## 🚀 구현 사항

### 1. Dataflow Adaptive Trainer 파이프라인

**파일**: `dataflow/step50_adaptive_trainer.py`

- **기능**:
  - BigQuery에서 실제 품질 데이터와 시뮬레이션 결과 조인
  - LightGBM 모델 재학습
  - 모델 평가 (RMSE, MAE)
  - GCS 버킷에 모델 업로드

- **데이터 소스**:
  - `yago_reports.quality_stream`: 실제 품질 점수
  - `yago_reports.simulations`: 시뮬레이션 예측 결과

- **학습 특징**:
  - `coverage`, `gaps`, `overlaps`
  - `vad_aggressiveness` (범주형)
  - `noise_suppression` (범주형)

- **타겟**: `actual` (실제 품질 점수)

### 2. Functions - deployUpdatedModel

**파일**: `functions/src/step50.deployModel.ts`

- **스케줄**: 24시간마다 실행
- **기능**:
  - GCS 버킷에서 최신 모델 파일 찾기
  - Cloud Run 서비스에 모델 재로드 요청
  - 배포 이력 저장 (선택)

### 3. Cloud Run - reload-model 엔드포인트

**파일**: `step49-quality-predictor/app.py` (추가)

- **엔드포인트**: `POST /reload-model`
- **기능**:
  - GCS에서 모델 다운로드
  - 메모리에 모델 재로드
  - 모델 업데이트 확인

### 4. BigQuery 테이블 스키마

**파일**: `scripts/create_bigquery_simulations_table.sql`

- **테이블**: `yago_reports.simulations`
- **필드**:
  - `predicted_score`, `confidence`
  - `params_*`: 튜닝 파라미터
  - `payload_*`: 입력 특징
  - `created_at`, `event_ts`

### 5. 대시보드 시각화

**파일**: `src/components/AdaptiveLearningCard.tsx`

- **표시 내용**:
  - 자율 모드 상태 배지 ("Autonomous Mode: ✅")
  - 최근 모델 버전 목록 (RMSE, MAE 포함)
  - 예측 정확도 추이 그래프 (RMSE, MAE)

## 📊 데이터 흐름

```
1. BigQuery 데이터 수집
   ├─ quality_stream (실제 품질 점수)
   └─ simulations (예측 결과)
   ↓
2. Dataflow Adaptive Trainer 실행
   ├─ 데이터 조인
   ├─ 모델 재학습 (LightGBM)
   ├─ 모델 평가 (RMSE, MAE)
   └─ GCS에 업로드
   ↓
3. Functions deployUpdatedModel 실행 (24시간마다)
   ├─ GCS에서 최신 모델 찾기
   └─ Cloud Run에 재로드 요청
   ↓
4. Cloud Run 모델 업데이트
   └─ /reload-model 엔드포인트로 모델 재로드
```

## 🔧 배포 절차

### 1. BigQuery 테이블 생성

```bash
# SQL 스크립트 실행
bq query --use_legacy_sql=false < scripts/create_bigquery_simulations_table.sql
```

### 2. GCS 버킷 생성

```bash
gsutil mb -p $PROJECT_ID -l asia-northeast3 gs://yago-models
```

### 3. Dataflow 파이프라인 배포

```bash
export PROJECT_ID="your-project"
export REGION="asia-northeast3"
export GCS_BUCKET="gs://your-bucket/dataflow"

python3 dataflow/step50_adaptive_trainer.py \
  --project $PROJECT_ID \
  --region $REGION \
  --runner DataflowRunner \
  --temp_location $GCS_BUCKET/temp \
  --staging_location $GCS_BUCKET/staging \
  --model_bucket yago-models
```

### 4. Cloud Run 서비스 업데이트

```bash
cd step49-quality-predictor

# requirements.txt에 requests 추가 확인
# app.py에 /reload-model 엔드포인트 추가 확인

gcloud builds submit --tag gcr.io/$PROJECT_ID/quality-predictor:latest
gcloud run deploy quality-predictor \
  --image gcr.io/$PROJECT_ID/quality-predictor:latest \
  --region=asia-northeast3 \
  --allow-unauthenticated
```

### 5. Functions 배포

```bash
firebase deploy --only functions:deployUpdatedModel
```

### 6. 환경 변수 설정

```bash
firebase functions:config:set \
  cloud_run.predictor_url="https://quality-predictor-asia-northeast3-xxxxx.run.app" \
  model.bucket="yago-models"
```

## 📈 운영 포인트

| 항목 | 설명 |
|------|------|
| 데이터 소스 | BigQuery `quality_stream`, `simulations` |
| 모델 형식 | LightGBM (`.pkl`) / TensorFlow SavedModel (확장 가능) |
| 주기 | 매일 1회 (onSchedule) |
| 평가 지표 | RMSE, MAE, Δscore trend |
| 모델 저장소 | GCS `yago-models/quality-predictor/` |
| 자동 배포 | 최신 모델 자동 배포 (24시간마다) |

## 🎯 평가 지표

### RMSE (Root Mean Square Error)

```
RMSE = sqrt(mean((actual - predicted)^2))
```

### MAE (Mean Absolute Error)

```
MAE = mean(abs(actual - predicted))
```

### Δscore Trend

```
Δscore = actual - predicted
```

## 🔍 모니터링

### Dataflow 작업 상태

```bash
gcloud dataflow jobs list --project=$PROJECT_ID --region=$REGION
```

### GCS 모델 목록

```bash
gsutil ls gs://yago-models/quality-predictor/
```

### Functions 로그

```bash
firebase functions:log --only deployUpdatedModel
```

### Cloud Run 로그

```bash
gcloud run services logs read quality-predictor --region=$REGION
```

## 🐛 문제 해결

### 모델 학습 실패

1. **데이터 부족**: 최소 10개 데이터 필요
2. **BigQuery 권한**: 쿼리 권한 확인
3. **GCS 권한**: 버킷 쓰기 권한 확인

### 모델 배포 실패

1. **GCS 접근**: 버킷 공개 설정 또는 서비스 계정 권한
2. **Cloud Run URL**: 환경 변수 확인
3. **타임아웃**: 모델 다운로드 시간 고려

### BigQuery 조인 실패

1. **테이블 존재**: `quality_stream`, `simulations` 테이블 확인
2. **데이터 일치**: `report_id` 일치 여부 확인
3. **시간 범위**: 7일 이내 데이터 존재 여부 확인

## 📚 다음 단계

- Step 51: A/B 테스트 기반 보정 효과 검증
- Step 52: 실시간 모델 성능 모니터링 대시보드
- Step 53: 멀티 모델 앙상블 및 자동 선택


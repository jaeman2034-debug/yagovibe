# Step 40: BigQuery ML 기반 품질 점수 예측

BigQuery ML 회귀 모델로 다음 주 품질 점수를 예측하고, ChatGPT로 자연어 리포트를 생성하여 Slack/Notion/Sheets에 전달합니다.

## 구성 요소

### 1. BigQuery ML 모델
- **모델명**: `yago_reports.quality_forecast`
- **모델 타입**: Linear Regression
- **입력**: `coverage`, `avgDur`, `gaps`, `overlaps`
- **출력**: `overallScore` 예측

### 2. 예측 함수
- **함수**: `predictQualityTrend`
- **트리거**: 매주 월요일 10:00 (Asia/Seoul)
- **동작**: 
  1. 최근 7일간 평균값 계산
  2. BigQuery ML 모델로 예측
  3. ChatGPT로 자연어 리포트 생성
  4. Slack 발송
  5. Firestore 저장

## 설치 및 설정

### 1. BigQuery ML 모델 생성

#### 방법 1: BigQuery Console

1. [BigQuery Console](https://console.cloud.google.com/bigquery) 접속
2. 새 쿼리 작성
3. `scripts/create_quality_forecast_model.sql` 내용 실행

#### 방법 2: bq 명령어

```bash
bq query --use_legacy_sql=false < scripts/create_quality_forecast_model.sql
```

#### 방법 3: 직접 실행

```sql
CREATE OR REPLACE MODEL `yago_reports.quality_forecast`
OPTIONS(
  model_type='linear_reg',
  input_label_cols=['overallScore']
) AS
SELECT
  EXTRACT(DATE FROM created_at) AS date,
  coverage,
  avgDur,
  gaps,
  overlaps,
  overallScore
FROM `yago_reports.quality_metrics`
WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY);
```

### 2. 모델 평가 (선택)

```sql
-- 모델 성능 확인
SELECT * FROM ML.EVALUATE(MODEL `yago_reports.quality_forecast`);

-- 학습 정보 확인
SELECT * FROM ML.TRAINING_INFO(MODEL `yago_reports.quality_forecast`);
```

### 3. 환경 변수 설정

```bash
# OpenAI API Key (필수)
firebase functions:config:set \
  openai.api_key="sk-xxxxxxxxxxxxx"

# Slack Webhook (선택)
firebase functions:config:set \
  slack.webhook_url="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

### 4. Functions 배포

```bash
cd functions
firebase deploy --only functions:predictQualityTrend
```

## 사용 방법

### 자동 실행

매주 월요일 10:00 (Asia/Seoul)에 자동으로 실행됩니다.

### 수동 실행

```bash
# Firebase Console에서 수동 실행
# 또는 Cloud Scheduler에서 트리거
```

### 수동 예측 테스트

```sql
-- BigQuery에서 직접 예측 실행
SELECT
  predicted_overallScore AS forecast_score
FROM ML.PREDICT(
  MODEL `yago_reports.quality_forecast`,
  (SELECT
    0.95 AS coverage,
    2.5 AS avgDur,
    2 AS gaps,
    1 AS overlaps)
);
```

## Slack 예시 출력

```
📊 *YAGO VIBE 다음 주 품질 예측 리포트*

예측 점수: 0.952 (전주 대비 +0.012 상승)

• 예상 평균 점수 0.95 (+0.01 상승)
• 문장 길이 안정성 양호, Coverage 98% 유지 예상
• 주요 리스크: 길이 편차 증가 → 긴 발화 관리 필요
• 개선 권장: 노이즈 제거 및 정확한 시작 타임스탬프 보정
```

## Firestore 저장 구조

```
quality_predictions/{id}
{
  forecastScore: 0.952,
  coverage: 0.95,
  avgDur: 2.5,
  gaps: 2,
  overlaps: 1,
  recentAvgScore: 0.94,
  scoreChange: 0.012,
  aiSummary: "AI 생성 리포트 텍스트...",
  createdAt: Timestamp
}
```

## 모델 재학습

모델은 자동으로 업데이트되지 않으므로, 정기적으로 재학습이 필요합니다:

```sql
-- 90일간 최신 데이터로 재학습
CREATE OR REPLACE MODEL `yago_reports.quality_forecast`
OPTIONS(
  model_type='linear_reg',
  input_label_cols=['overallScore']
) AS
SELECT
  EXTRACT(DATE FROM created_at) AS date,
  coverage,
  avgDur,
  gaps,
  overlaps,
  overallScore
FROM `yago_reports.quality_metrics`
WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY);
```

**권장 주기**: 월 1회 또는 데이터가 1000건 이상 누적될 때

## 아키텍처

```
[Cloud Scheduler]
      ↓ (매주 월요일 10:00)
[predictQualityTrend]
      ↓
[BigQuery ML 예측]
      ↓
[ChatGPT 분석 요약]
      ↓
[Slack 발송]
      ↓
[Firestore 저장]
```

## 모델 성능 개선

### 1. 더 많은 데이터 수집
- 최소 90일 이상 데이터 권장
- 1000건 이상 데이터 수집

### 2. 특성 엔지니어링
- 시간별 패턴 추가 (시간대별 품질 차이)
- 요일별 패턴 추가
- 이동 평균 추가

### 3. 모델 타입 변경
```sql
-- AutoML 시도
OPTIONS(
  model_type='automl_regressor',
  budget_hours=1.0
)
```

## 문제 해결

### 모델이 없다는 오류

```bash
# 모델 생성 확인
bq show -m yago_reports.quality_forecast

# 모델 생성 스크립트 실행
bq query --use_legacy_sql=false < scripts/create_quality_forecast_model.sql
```

### 예측 결과가 부정확한 경우

```sql
-- 모델 평가 확인
SELECT * FROM ML.EVALUATE(MODEL `yago_reports.quality_forecast`);

-- 더 많은 데이터로 재학습
-- 또는 모델 타입 변경 고려
```

### BigQuery ML API 활성화

```bash
# BigQuery ML API 활성화
gcloud services enable bigqueryml.googleapis.com
```

## 비용 예상

### BigQuery ML
- 모델 학습: 약 $5-10 (1회)
- 예측: 약 $0.01/1000 예측
- 주간 비용: 약 $0.01

### OpenAI API
- 주간 리포트당 약 $0.01

### 총 주간 비용
- 약 $0.02-0.03

## 다음 단계

✅ Step 41: 실시간 모니터링 대시보드 (예고)
- Grafana/Data Studio 연동
- 실시간 알림 (품질 점수 임계치 초과 시)
- 예측 결과 시각화


-- Step 40: BigQuery ML 품질 예측 모델 생성
-- 이 스크립트를 BigQuery Console에서 실행하거나 bq 명령어로 실행

-- 모델 생성 (90일간 데이터로 학습)
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

-- 모델 평가 (선택)
-- SELECT * FROM ML.EVALUATE(MODEL `yago_reports.quality_forecast`);

-- 모델 정보 확인
-- SELECT * FROM ML.TRAINING_INFO(MODEL `yago_reports.quality_forecast`);


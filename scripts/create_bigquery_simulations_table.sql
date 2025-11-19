-- Step 50: BigQuery simulations 테이블 생성
-- 시뮬레이션 결과를 BigQuery에 적재하여 모델 재학습에 활용

CREATE TABLE IF NOT EXISTS `yago_reports.simulations` (
    insert_id STRING,
    team_id STRING,
    report_id STRING,
    predicted_score FLOAT64,
    confidence FLOAT64,
    params_noise_suppression STRING,
    params_vad_aggressiveness STRING,
    params_silence_trim STRING,
    params_timestamp_alignment STRING,
    payload_snr_db FLOAT64,
    payload_speech_blocks_per_min FLOAT64,
    payload_coverage FLOAT64,
    payload_gaps INT64,
    payload_overlaps INT64,
    created_at TIMESTAMP,
    event_ts TIMESTAMP,
) PARTITION BY DATE(created_at)
CLUSTER BY team_id, report_id;

-- 인덱스 생성 (선택적)
CREATE INDEX IF NOT EXISTS idx_simulations_report_id 
ON `yago_reports.simulations`(report_id);

-- Functions에서 시뮬레이션 결과를 BigQuery에 적재하는 트리거 추가 필요
-- (Step 49의 digitalTwinSimulator에서 BigQuery에 적재)


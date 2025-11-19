-- Step 45: BigQuery 스트리밍 테이블 생성

-- 스키마 생성
CREATE SCHEMA IF NOT EXISTS `yago_reports`
OPTIONS(
  description="YAGO VIBE 리포트 데이터 스키마"
);

-- 스트리밍 테이블 생성
CREATE TABLE IF NOT EXISTS `yago_reports.quality_stream` (
  insert_id      STRING    NOT NULL,  -- 중복 제거 키 (UNIQUE)
  team_id        STRING    NOT NULL,
  report_id      STRING    NOT NULL,
  event_ts       TIMESTAMP NOT NULL,  -- qualityReport.createdAt
  overallScore   FLOAT64,
  coverage       FLOAT64,
  gaps           INT64,
  overlaps       INT64,
  avgDur         FLOAT64,
  source         STRING,              -- "stream"
  load_ts        TIMESTAMP           -- 적재 시간 (DEFAULT CURRENT_TIMESTAMP())
) PARTITION BY DATE(event_ts)
CLUSTER BY team_id, report_id
OPTIONS(
  description="실시간 품질 리포트 스트리밍 테이블"
);

-- UNIQUE 제약 조건 (insert_id 기반 중복 제거)
-- BigQuery에서는 UNIQUE 제약 조건을 직접 지원하지 않으므로,
-- Storage Write API의 insertId 기능과 Dataflow에서 중복 제거를 사용

-- 인덱스 생성 (클러스터링으로 대체)
-- BigQuery는 클러스터링된 테이블을 사용하므로 별도 인덱스 불필요

-- 뷰 생성 (최근 24시간 데이터)
CREATE OR REPLACE VIEW `yago_reports.quality_stream_recent` AS
SELECT *
FROM `yago_reports.quality_stream`
WHERE event_ts >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
ORDER BY event_ts DESC;

-- 뷰 생성 (팀별 최근 집계)
CREATE OR REPLACE VIEW `yago_reports.quality_stream_team_summary` AS
SELECT
  team_id,
  DATE(event_ts) as date,
  COUNT(*) as count,
  AVG(overallScore) as avg_score,
  AVG(coverage) as avg_coverage,
  SUM(gaps) as total_gaps,
  SUM(overlaps) as total_overlaps,
  AVG(avgDur) as avg_duration
FROM `yago_reports.quality_stream`
WHERE event_ts >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY team_id, DATE(event_ts)
ORDER BY team_id, date DESC;


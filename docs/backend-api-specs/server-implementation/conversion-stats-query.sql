-- 🔥 B단계: 외부 브라우저 전환 효과 측정 SQL 쿼리
-- 
-- 목적: 인앱 유지 vs 외부 전환 그룹 비교
-- 지표: 성공률, 평균 latency, isSlow 비율, 재시도 성공률
-- 
-- 전제 조건:
-- - ai_analysis_logs 테이블에 meta_flow_id, meta_environment 필드가 있어야 함
-- - ai_analysis_events 테이블에 이벤트 로그가 저장되어야 함

-- ============================================
-- 1️⃣ 전환 그룹 식별 쿼리
-- ============================================

-- 전환 그룹 분류:
-- - 'converted': 외부 브라우저로 전환 (flowId 있음, environment='EXTERNAL_BROWSER')
-- - 'stayed': 인앱 브라우저 유지 (env_is_kakao_in_app=true, flowId 없음 또는 environment='INAPP_BROWSER')

-- 전체 통계 (전환 전/후 비교)
SELECT 
  -- 그룹 구분
  CASE 
    WHEN meta_environment = 'EXTERNAL_BROWSER' AND meta_flow_id IS NOT NULL THEN 'converted'
    WHEN env_is_kakao_in_app = true AND (meta_flow_id IS NULL OR meta_environment = 'INAPP_BROWSER') THEN 'stayed'
    ELSE 'other'
  END as conversion_group,
  
  -- 기본 통계
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE result_success = true) as success,
  COUNT(*) FILTER (WHERE result_success = false) as failed,
  
  -- 성공률
  ROUND(
    (COUNT(*) FILTER (WHERE result_success = true)::numeric / COUNT(*)::numeric) * 100,
    2
  ) as success_rate,
  
  -- 평균 latency (성공한 요청만)
  ROUND(
    AVG(result_latency) FILTER (WHERE result_success = true),
    0
  ) as avg_latency_ms,
  
  -- P95 latency (성공한 요청만)
  ROUND(
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY result_latency) 
    FILTER (WHERE result_success = true),
    0
  ) as p95_latency_ms,
  
  -- 느린 요청 비율
  COUNT(*) FILTER (WHERE result_is_slow = true) as slow_requests,
  ROUND(
    (COUNT(*) FILTER (WHERE result_is_slow = true)::numeric / COUNT(*)::numeric) * 100,
    2
  ) as slow_rate,
  
  -- 재시도 성공률 (retryCount > 0인 경우)
  COUNT(*) FILTER (WHERE result_retry_count > 0) as retry_attempts,
  COUNT(*) FILTER (WHERE result_retry_count > 0 AND result_success = true) as retry_successes,
  CASE 
    WHEN COUNT(*) FILTER (WHERE result_retry_count > 0) > 0 THEN
      ROUND(
        (COUNT(*) FILTER (WHERE result_retry_count > 0 AND result_success = true)::numeric / 
         COUNT(*) FILTER (WHERE result_retry_count > 0)::numeric) * 100,
        2
      )
    ELSE 0
  END as retry_success_rate

FROM ai_analysis_logs
WHERE 
  timestamp >= $1  -- 시작 시각 (ms)
  AND timestamp <= $2  -- 종료 시각 (ms)
  AND env_is_kakao_in_app = true  -- 카카오 인앱만 비교
GROUP BY conversion_group
ORDER BY conversion_group;

-- ============================================
-- 2️⃣ 전환 ROI 계산 쿼리
-- ============================================

WITH conversion_stats AS (
  SELECT 
    CASE 
      WHEN meta_environment = 'EXTERNAL_BROWSER' AND meta_flow_id IS NOT NULL THEN 'converted'
      WHEN env_is_kakao_in_app = true AND (meta_flow_id IS NULL OR meta_environment = 'INAPP_BROWSER') THEN 'stayed'
      ELSE 'other'
    END as conversion_group,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE result_success = true) as success,
    COUNT(*) FILTER (WHERE result_success = false) as failed
  FROM ai_analysis_logs
  WHERE 
    timestamp >= $1
    AND timestamp <= $2
    AND env_is_kakao_in_app = true
  GROUP BY conversion_group
),
stay_stats AS (
  SELECT 
    total,
    success,
    failed,
    (success::numeric / total::numeric) * 100 as success_rate
  FROM conversion_stats
  WHERE conversion_group = 'stayed'
),
convert_stats AS (
  SELECT 
    total,
    success,
    failed,
    (success::numeric / total::numeric) * 100 as success_rate
  FROM conversion_stats
  WHERE conversion_group = 'converted'
)
SELECT 
  s.total as stayed_total,
  s.success as stayed_success,
  s.success_rate as stayed_success_rate,
  c.total as converted_total,
  c.success as converted_success,
  c.success_rate as converted_success_rate,
  ROUND(c.success_rate - s.success_rate, 2) as roi_percentage_points,
  ROUND(((c.success_rate - s.success_rate) / s.success_rate) * 100, 2) as roi_percentage
FROM stay_stats s
CROSS JOIN convert_stats c;

-- ============================================
-- 3️⃣ 전환 이벤트 통계 (CTA 클릭 → 외부 전환 성공률)
-- ============================================

-- 이벤트 테이블이 있다고 가정 (별도 테이블 또는 JSONB 컬럼)
-- 예시: ai_analysis_events 테이블 구조
-- CREATE TABLE ai_analysis_events (
--   id UUID PRIMARY KEY,
--   event_type VARCHAR(50) NOT NULL,
--   flow_id VARCHAR(255),
--   meta JSONB,
--   timestamp BIGINT NOT NULL,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- CTA 클릭 수
SELECT COUNT(*) as cta_clicks
FROM ai_analysis_events
WHERE 
  event_type = 'AI_EXTERNAL_BROWSER_CTA_CLICK'
  AND timestamp >= $1
  AND timestamp <= $2;

-- 외부 브라우저 진입 수 (전환 성공)
SELECT COUNT(DISTINCT flow_id) as external_landings
FROM ai_analysis_events
WHERE 
  event_type = 'AI_EXTERNAL_BROWSER_LANDED'
  AND timestamp >= $1
  AND timestamp <= $2;

-- CTA 클릭 → 외부 전환 성공률 (JOIN 필요)
WITH cta_clicks AS (
  SELECT flow_id, timestamp as click_time
  FROM ai_analysis_events
  WHERE 
    event_type = 'AI_EXTERNAL_BROWSER_CTA_CLICK'
    AND timestamp >= $1
    AND timestamp <= $2
),
external_landings AS (
  SELECT DISTINCT flow_id, timestamp as landing_time
  FROM ai_analysis_events
  WHERE 
    event_type = 'AI_EXTERNAL_BROWSER_LANDED'
    AND timestamp >= $1
    AND timestamp <= $2
)
SELECT 
  COUNT(DISTINCT c.flow_id) as total_clicks,
  COUNT(DISTINCT e.flow_id) as successful_conversions,
  CASE 
    WHEN COUNT(DISTINCT c.flow_id) > 0 THEN
      ROUND(
        (COUNT(DISTINCT e.flow_id)::numeric / COUNT(DISTINCT c.flow_id)::numeric) * 100,
        2
      )
    ELSE 0
  END as conversion_rate
FROM cta_clicks c
LEFT JOIN external_landings e ON c.flow_id = e.flow_id 
  AND e.landing_time >= c.click_time 
  AND e.landing_time <= c.click_time + (24 * 60 * 60 * 1000);  -- 24시간 내

-- ============================================
-- 4️⃣ 주간 리포트용 통합 통계 쿼리
-- ============================================

-- 모든 지표를 한 번에 조회 (주간 리포트 생성용)
WITH conversion_stats AS (
  SELECT 
    CASE 
      WHEN meta_environment = 'EXTERNAL_BROWSER' AND meta_flow_id IS NOT NULL THEN 'converted'
      WHEN env_is_kakao_in_app = true AND (meta_flow_id IS NULL OR meta_environment = 'INAPP_BROWSER') THEN 'stayed'
      ELSE 'other'
    END as conversion_group,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE result_success = true) as success,
    AVG(result_latency) FILTER (WHERE result_success = true) as avg_latency,
    COUNT(*) FILTER (WHERE result_is_slow = true) as slow_requests,
    COUNT(*) FILTER (WHERE result_retry_count > 0 AND result_success = true) as retry_successes,
    COUNT(*) FILTER (WHERE result_retry_count > 0) as retry_attempts
  FROM ai_analysis_logs
  WHERE 
    timestamp >= $1
    AND timestamp <= $2
    AND env_is_kakao_in_app = true
  GROUP BY conversion_group
),
stay_stats AS (
  SELECT * FROM conversion_stats WHERE conversion_group = 'stayed'
),
convert_stats AS (
  SELECT * FROM conversion_stats WHERE conversion_group = 'converted'
)
SELECT 
  -- 인앱 유지 그룹
  s.total as stayed_total,
  s.success as stayed_success,
  ROUND((s.success::numeric / s.total::numeric) * 100, 2) as stayed_success_rate,
  ROUND(s.avg_latency, 0) as stayed_avg_latency_ms,
  ROUND((s.slow_requests::numeric / s.total::numeric) * 100, 2) as stayed_slow_rate,
  CASE 
    WHEN s.retry_attempts > 0 THEN
      ROUND((s.retry_successes::numeric / s.retry_attempts::numeric) * 100, 2)
    ELSE 0
  END as stayed_retry_success_rate,
  
  -- 외부 전환 그룹
  c.total as converted_total,
  c.success as converted_success,
  ROUND((c.success::numeric / c.total::numeric) * 100, 2) as converted_success_rate,
  ROUND(c.avg_latency, 0) as converted_avg_latency_ms,
  ROUND((c.slow_requests::numeric / c.total::numeric) * 100, 2) as converted_slow_rate,
  CASE 
    WHEN c.retry_attempts > 0 THEN
      ROUND((c.retry_successes::numeric / c.retry_attempts::numeric) * 100, 2)
    ELSE 0
  END as converted_retry_success_rate,
  
  -- ROI 계산
  ROUND(
    (c.success::numeric / c.total::numeric) * 100 - (s.success::numeric / s.total::numeric) * 100,
    2
  ) as roi_percentage_points
FROM stay_stats s
CROSS JOIN convert_stats c;

-- ============================================
-- 5️⃣ 인덱스 최적화 (전환 분석용)
-- ============================================

-- 전환 분석 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_logs_conversion ON ai_analysis_logs(
  env_is_kakao_in_app,
  meta_environment,
  meta_flow_id,
  timestamp DESC
) WHERE env_is_kakao_in_app = true;

-- 이벤트 로그 인덱스 (CTA 클릭, 외부 전환 추적)
CREATE INDEX IF NOT EXISTS idx_ai_events_flow ON ai_analysis_events(
  event_type,
  flow_id,
  timestamp DESC
) WHERE event_type IN ('AI_EXTERNAL_BROWSER_CTA_CLICK', 'AI_EXTERNAL_BROWSER_LANDED');


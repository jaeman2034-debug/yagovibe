-- 🔥 AI 분석 로깅 DB 스키마 (PostgreSQL)
-- 스키마 버전: v1.0
-- 작성일: 2024

-- 테이블 생성
CREATE TABLE IF NOT EXISTS ai_analysis_logs (
    -- 기본 키
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 🔥 메타 정보 (인덱싱 필수)
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    timestamp BIGINT NOT NULL, -- 클라이언트 타임스탬프 (ms)
    
    -- 🔥 환경 정보 (집계용)
    env_is_kakao_in_app BOOLEAN NOT NULL,
    env_is_mobile BOOLEAN NOT NULL,
    env_platform VARCHAR(50) NOT NULL, -- 'android' | 'ios' | 'windows' | 'mac' | 'linux' | 'unknown'
    env_user_agent TEXT, -- 전체 User Agent (디버깅용)
    
    -- 🔥 요청 정보
    request_endpoint TEXT NOT NULL,
    request_file_size INTEGER NOT NULL,
    request_file_type VARCHAR(100) NOT NULL,
    request_has_auth BOOLEAN NOT NULL,
    
    -- 🔥 결과 정보 (집계용)
    result_success BOOLEAN NOT NULL,
    result_error_code VARCHAR(50),
    result_latency INTEGER NOT NULL, -- ms
    result_retry_count INTEGER NOT NULL DEFAULT 0,
    result_http_status INTEGER,
    result_is_slow BOOLEAN DEFAULT FALSE, -- 4초 이상 요청 플래그
    
    -- 🔥 B단계: 전환 추적 필드
    meta_flow_id VARCHAR(255), -- flowId (인앱 → 외부 전환 추적)
    meta_environment VARCHAR(50), -- 'INAPP_BROWSER' | 'EXTERNAL_BROWSER'
    
    -- 🔥 서버 메타 (자동 생성)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version VARCHAR(10) NOT NULL DEFAULT 'v1'
);

-- 🔥 기본 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_logs_timestamp ON ai_analysis_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_analysis_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_logs_session_id ON ai_analysis_logs(session_id);

-- 🔥 집계 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_logs_success_env ON ai_analysis_logs(result_success, env_is_kakao_in_app, env_is_mobile);
CREATE INDEX IF NOT EXISTS idx_ai_logs_latency ON ai_analysis_logs(result_latency) WHERE result_success = true;
CREATE INDEX IF NOT EXISTS idx_ai_logs_slow_requests ON ai_analysis_logs(result_is_slow) WHERE result_is_slow = true;
CREATE INDEX IF NOT EXISTS idx_ai_logs_error_code ON ai_analysis_logs(result_error_code) WHERE result_error_code IS NOT NULL;

-- 🔥 주간 리포트용 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_logs_weekly_stats ON ai_analysis_logs(
    timestamp DESC,
    result_success,
    env_is_kakao_in_app,
    env_is_mobile
);

-- 🔥 시간 범위 쿼리 최적화 인덱스 (통계 조회용)
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_analysis_logs(created_at DESC);

-- 주석 추가
COMMENT ON TABLE ai_analysis_logs IS 'AI 분석 요청 로그 (v1)';
COMMENT ON COLUMN ai_analysis_logs.id IS '서버 생성 UUID (PK)';
COMMENT ON COLUMN ai_analysis_logs.session_id IS '세션 식별자 (인덱스)';
COMMENT ON COLUMN ai_analysis_logs.user_id IS '사용자 ID (인덱스, 옵션)';
COMMENT ON COLUMN ai_analysis_logs.timestamp IS '클라이언트 타임스탬프 (ms, UTC)';
COMMENT ON COLUMN ai_analysis_logs.result_is_slow IS '4초 이상 요청 플래그';
COMMENT ON COLUMN ai_analysis_logs.meta_flow_id IS 'B단계: 인앱 → 외부 브라우저 전환 추적 flowId';
COMMENT ON COLUMN ai_analysis_logs.meta_environment IS 'B단계: 환경 구분 (INAPP_BROWSER / EXTERNAL_BROWSER)';
COMMENT ON COLUMN ai_analysis_logs.version IS '스키마 버전 (v1)';

-- 파티셔닝 (선택사항, 데이터량이 많을 경우)
-- CREATE TABLE ai_analysis_logs_2024_01 PARTITION OF ai_analysis_logs
--     FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');


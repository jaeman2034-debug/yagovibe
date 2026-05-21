-- 🔥 B단계: AI 분석 이벤트 로그 테이블 (CTA 클릭, 외부 전환 등)
-- 
-- 이벤트 타입:
-- - AI_EXTERNAL_BROWSER_CTA_CLICK: 외부 브라우저 전환 CTA 클릭
-- - AI_EXTERNAL_BROWSER_LANDED: 외부 브라우저 진입

CREATE TABLE IF NOT EXISTS ai_analysis_events (
    -- 기본 키
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 이벤트 정보
    event_type VARCHAR(100) NOT NULL,
    flow_id VARCHAR(255), -- flowId (CTA 클릭 → 외부 전환 연결)
    
    -- 이벤트 메타 (JSONB로 확장 가능)
    meta JSONB,
    
    -- 타임스탬프
    timestamp BIGINT NOT NULL, -- 클라이언트 타임스탬프 (ms)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 환경 정보 (선택)
    env_is_kakao_in_app BOOLEAN,
    user_id VARCHAR(255)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_events_type ON ai_analysis_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ai_events_flow_id ON ai_analysis_events(flow_id) WHERE flow_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_events_timestamp ON ai_analysis_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_events_flow ON ai_analysis_events(
    event_type,
    flow_id,
    timestamp DESC
) WHERE event_type IN ('AI_EXTERNAL_BROWSER_CTA_CLICK', 'AI_EXTERNAL_BROWSER_LANDED');

-- 주석
COMMENT ON TABLE ai_analysis_events IS 'AI 분석 관련 이벤트 로그 (CTA 클릭, 외부 전환 등)';
COMMENT ON COLUMN ai_analysis_events.event_type IS '이벤트 타입 (AI_EXTERNAL_BROWSER_CTA_CLICK, AI_EXTERNAL_BROWSER_LANDED 등)';
COMMENT ON COLUMN ai_analysis_events.flow_id IS 'flowId (인앱 → 외부 전환 추적)';


#!/bin/bash
# Step 45: Pub/Sub 메시지 테스트 스크립트

PROJECT_ID="${GCP_PROJECT:-your-project}"

# 테스트 메시지 생성
TEST_MESSAGE='{
  "insert_id": "test-'$(date +%s)'",
  "team_id": "TEST_TEAM",
  "report_id": "test-report-'$(date +%s)'",
  "event_ts": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
  "overallScore": 0.95,
  "coverage": 0.98,
  "gaps": 0,
  "overlaps": 0,
  "avgDur": 2.5,
  "source": "test"
}'

echo "📨 테스트 메시지 발행 중..."
echo "$TEST_MESSAGE" | gcloud pubsub topics publish yago-quality-events \
  --project=$PROJECT_ID

echo "✅ 메시지 발행 완료"
echo ""
echo "📋 확인 방법:"
echo "1. Dataflow 로그 확인: Cloud Console > Dataflow > Jobs"
echo "2. BigQuery 데이터 확인:"
echo "   bq query --use_legacy_sql=false 'SELECT * FROM yago_reports.quality_stream WHERE insert_id LIKE \"test-%\" ORDER BY load_ts DESC LIMIT 10'"


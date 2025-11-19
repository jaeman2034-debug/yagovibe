#!/bin/bash
# Step 45: Dataflow 파이프라인 배포 스크립트

set -e

# 환경 변수 설정
PROJECT_ID="${GCP_PROJECT:-your-project}"
REGION="${GCP_REGION:-asia-northeast3}"
GCS_BUCKET="${GCS_BUCKET:-gs://your-bucket/dataflow}"

echo "🚀 Step 45 배포 시작..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "GCS Bucket: $GCS_BUCKET"

# 1. BigQuery 테이블 생성
echo "📊 BigQuery 테이블 생성 중..."
bq query --use_legacy_sql=false < scripts/create_bigquery_table.sql || {
    echo "⚠️ BigQuery 테이블 생성 실패 (이미 존재할 수 있음)"
}

# 2. Pub/Sub 리소스 생성
echo "📨 Pub/Sub 리소스 생성 중..."

# 토픽 생성
gcloud pubsub topics create yago-quality-events \
  --project=$PROJECT_ID 2>/dev/null || echo "⚠️ 토픽이 이미 존재합니다"

# DLQ 토픽 생성
gcloud pubsub topics create yago-quality-events-dlq \
  --project=$PROJECT_ID 2>/dev/null || echo "⚠️ DLQ 토픽이 이미 존재합니다"

# 구독 생성
gcloud pubsub subscriptions create yago-quality-sub \
  --topic=yago-quality-events \
  --ack-deadline=60 \
  --dead-letter-topic=yago-quality-events-dlq \
  --dead-letter-max-delivery-attempts=10 \
  --project=$PROJECT_ID 2>/dev/null || echo "⚠️ 구독이 이미 존재합니다"

# DLQ 구독 생성 (모니터링용)
gcloud pubsub subscriptions create yago-quality-events-dlq-sub \
  --topic=yago-quality-events-dlq \
  --project=$PROJECT_ID 2>/dev/null || echo "⚠️ DLQ 구독이 이미 존재합니다"

# 3. Functions 배포
echo "⚡ Functions 배포 중..."
cd functions
npm install @google-cloud/pubsub
cd ..

firebase deploy --only functions:publishQualityEvent || {
    echo "❌ Functions 배포 실패"
    exit 1
}

# 4. Dataflow 파이프라인 배포
echo "🔄 Dataflow 파이프라인 배포 중..."

# Python 패키지 설치
python3 -m pip install -r dataflow/requirements.txt

# 파이프라인 실행
python3 dataflow/step45_stream.py \
  --project $PROJECT_ID \
  --region $REGION \
  --runner DataflowRunner \
  --staging_location $GCS_BUCKET/staging \
  --temp_location $GCS_BUCKET/temp \
  --input_subscription projects/$PROJECT_ID/subscriptions/yago-quality-sub \
  --bq_table yago_reports.quality_stream \
  --max_num_workers 10 \
  --num_workers 1

echo "✅ Step 45 배포 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. Dataflow 작업 상태 확인: gcloud dataflow jobs list --project=$PROJECT_ID"
echo "2. BigQuery 데이터 확인: bq query --use_legacy_sql=false 'SELECT * FROM yago_reports.quality_stream_recent LIMIT 10'"
echo "3. Pub/Sub 메시지 확인: gcloud pubsub subscriptions pull yago-quality-sub --project=$PROJECT_ID"


#!/bin/bash
# Step 46: 이상 탐지 파이프라인 배포 스크립트

set -e

# 환경 변수 설정
PROJECT_ID="${GCP_PROJECT:-your-project}"
REGION="${GCP_REGION:-asia-northeast3}"
GCS_BUCKET="${GCS_BUCKET:-gs://your-bucket/dataflow}"

echo "🚀 Step 46 배포 시작..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "GCS Bucket: $GCS_BUCKET"

# 1. Pub/Sub 토픽 생성
echo "📨 Pub/Sub 토픽 생성 중..."
gcloud pubsub topics create yago-anomaly-events \
  --project=$PROJECT_ID 2>/dev/null || echo "⚠️ 토픽이 이미 존재합니다"

# 2. Python 패키지 설치
echo "📦 Python 패키지 설치 중..."
python3 -m pip install apache-beam[gcp]==2.56.0

# 3. Dataflow 이상 탐지 파이프라인 배포
echo "🔄 Dataflow 이상 탐지 파이프라인 배포 중..."
python3 dataflow/step46_anomaly.py \
  --project $PROJECT_ID \
  --region $REGION \
  --runner DataflowRunner \
  --staging_location $GCS_BUCKET/staging \
  --temp_location $GCS_BUCKET/temp \
  --input_subscription projects/$PROJECT_ID/subscriptions/yago-quality-sub \
  --output_topic projects/$PROJECT_ID/topics/yago-anomaly-events \
  --z_threshold 2.5 \
  --cov_min 0.9 \
  --gaps_max 10 \
  --overlaps_max 8 \
  --window_size 900 \
  --window_period 300 \
  --max_num_workers 10 \
  --num_workers 1

# 4. Functions 배포
echo "⚡ Functions 배포 중..."
cd functions
npm install node-fetch nodemailer
cd ..

firebase deploy --only functions:ingestAnomalyAlert || {
    echo "❌ Functions 배포 실패"
    exit 1
}

echo "✅ Step 46 배포 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. Dataflow 작업 상태 확인: gcloud dataflow jobs list --project=$PROJECT_ID"
echo "2. 이상 탐지 테스트: Pub/Sub에 테스트 메시지 발행"
echo "3. 알림 확인: Slack/Email에서 이상 탐지 알림 확인"


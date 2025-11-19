#!/bin/bash
# Step 47: Root Cause 분석 시스템 배포 스크립트

set -e

# 환경 변수 설정
PROJECT_ID="${GCP_PROJECT:-your-project}"
REGION="${GCP_REGION:-asia-northeast3}"

echo "🚀 Step 47 배포 시작..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"

# 1. Cloud Run 서비스 배포
echo "📦 Cloud Run 서비스 배포 중..."
cd step47-audio-features

# Docker 이미지 빌드
echo "🔨 Docker 이미지 빌드 중..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/step47-audio-features:latest

# Cloud Run에 배포
echo "🚀 Cloud Run에 배포 중..."
gcloud run deploy step47-audio-features \
  --image gcr.io/$PROJECT_ID/step47-audio-features:latest \
  --region=$REGION \
  --allow-unauthenticated \
  --cpu=1 \
  --memory=2Gi \
  --timeout=300 \
  --max-instances=20 \
  --concurrency=10

# 서비스 URL 가져오기
SERVICE_URL=$(gcloud run services describe step47-audio-features \
  --region=$REGION \
  --format="value(status.url)")

echo "✅ Cloud Run 서비스 배포 완료: $SERVICE_URL"

cd ..

# 2. Functions 환경 변수 설정
echo "⚙️ Functions 환경 변수 설정 중..."
echo "AUDIO_FEATURES_URL=$SERVICE_URL/analyze"

# Firebase Functions 환경 변수 설정 (v2는 .env 파일 사용)
if [ -f "functions/.env" ]; then
    echo "AUDIO_FEATURES_URL=$SERVICE_URL/analyze" >> functions/.env
else
    echo "⚠️ functions/.env 파일이 없습니다. 수동으로 설정하세요:"
    echo "AUDIO_FEATURES_URL=$SERVICE_URL/analyze"
fi

# 3. Functions 배포
echo "⚡ Functions 배포 중..."
cd functions
npm install node-fetch
cd ..

firebase deploy --only functions:rootcauseAnalyzer || {
    echo "❌ Functions 배포 실패"
    exit 1
}

echo "✅ Step 47 배포 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. Cloud Run 서비스 확인: $SERVICE_URL/health"
echo "2. Functions 로그 확인: firebase functions:log --only rootcauseAnalyzer"
echo "3. 테스트: qualityReports 문서 생성 후 Root Cause 카드 확인"


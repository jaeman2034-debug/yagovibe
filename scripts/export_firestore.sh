#!/bin/bash
# Step 45: Firestore Export 스크립트
# teams 컬렉션을 GCS로 Export

set -e

PROJECT_ID="${GCP_PROJECT:-your-project}"
EXPORT_BUCKET="${EXPORT_BUCKET:-gs://your-bucket/firestore-export}"
EXPORT_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EXPORT_PATH="$EXPORT_BUCKET/$EXPORT_TIMESTAMP"

echo "📦 Firestore Export 시작..."
echo "Project: $PROJECT_ID"
echo "Export Path: $EXPORT_PATH"

# Firestore Export 실행
gcloud firestore export $EXPORT_PATH \
  --collection-ids=teams \
  --project=$PROJECT_ID

echo "✅ Firestore Export 완료!"
echo "Export 경로: $EXPORT_PATH"
echo ""
echo "📋 다음 단계:"
echo "1. Export 완료 확인:"
echo "   gsutil ls $EXPORT_PATH"
echo "2. 백필 배치 실행:"
echo "   export EXPORT_PATH=$EXPORT_PATH"
echo "   bash scripts/backfill_step45.sh"


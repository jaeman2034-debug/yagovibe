#!/bin/bash
# Step 45: 백필 배치 작업 스크립트
# Firestore Export → BigQuery 배치 적재

set -e

# 환경 변수 설정
PROJECT_ID="${GCP_PROJECT:-your-project}"
REGION="${GCP_REGION:-asia-northeast3}"
GCS_BUCKET="${GCS_BUCKET:-gs://your-bucket}"
EXPORT_PATH="${EXPORT_PATH:-gs://your-bucket/firestore-export}"

echo "🔄 Step 45 백필 배치 작업 시작..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Export Path: $EXPORT_PATH"

# 1. Firestore Export 확인
echo "📦 Firestore Export 확인 중..."
if ! gsutil ls "$EXPORT_PATH" > /dev/null 2>&1; then
    echo "❌ Firestore Export를 찾을 수 없습니다: $EXPORT_PATH"
    echo ""
    echo "Firestore Export 실행:"
    echo "  gcloud firestore export gs://your-bucket/firestore-export \\"
    echo "    --collection-ids=teams \\"
    echo "    --project=$PROJECT_ID"
    exit 1
fi

# 2. qualityReports 파일 패턴 찾기
echo "🔍 qualityReports 파일 찾는 중..."
QUALITY_FILES=$(gsutil ls "$EXPORT_PATH/**/*qualityReports*.json" 2>/dev/null || echo "")

if [ -z "$QUALITY_FILES" ]; then
    echo "⚠️ qualityReports 파일을 찾을 수 없습니다."
    echo "전체 Export 파일을 사용합니다: $EXPORT_PATH/**/*.json"
    INPUT_PATTERN="$EXPORT_PATH/**/*.json"
else
    echo "✅ qualityReports 파일 발견"
    INPUT_PATTERN="$EXPORT_PATH/**/*qualityReports*.json"
fi

# 3. Python 패키지 설치
echo "📦 Python 패키지 설치 중..."
python3 -m pip install -r dataflow/requirements.txt

# 4. Dataflow 배치 파이프라인 실행
echo "🔄 Dataflow 배치 파이프라인 실행 중..."
python3 dataflow/step45_backfill.py \
  --project $PROJECT_ID \
  --region $REGION \
  --runner DataflowRunner \
  --staging_location $GCS_BUCKET/dataflow/staging \
  --temp_location $GCS_BUCKET/dataflow/temp \
  --input_pattern "$INPUT_PATTERN" \
  --bq_table yago_reports.quality_stream \
  --max_num_workers 10 \
  --num_workers 2

echo "✅ 백필 배치 작업 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. BigQuery 데이터 확인:"
echo "   bq query --use_legacy_sql=false 'SELECT COUNT(*) as count, source FROM yago_reports.quality_stream GROUP BY source'"
echo "2. 백필 데이터 확인:"
echo "   bq query --use_legacy_sql=false 'SELECT * FROM yago_reports.quality_stream WHERE source=\"backfill\" ORDER BY load_ts DESC LIMIT 10'"


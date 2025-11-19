# Step 45: Dataflow 파이프라인

## 개요

Apache Beam을 사용한 실시간 스트리밍 파이프라인으로, Pub/Sub에서 BigQuery로 데이터를 스트리밍합니다.

## 파일 구조

- `step45_stream.py`: 메인 파이프라인 스크립트
- `requirements.txt`: Python 패키지 의존성

## 설치

```bash
python3 -m pip install -r requirements.txt
```

## 실행

```bash
export PROJECT_ID="your-project"
export REGION="asia-northeast3"
export GCS_BUCKET="gs://your-bucket/dataflow"

python3 step45_stream.py \
  --project $PROJECT_ID \
  --region $REGION \
  --runner DataflowRunner \
  --staging_location $GCS_BUCKET/staging \
  --temp_location $GCS_BUCKET/temp \
  --input_subscription projects/$PROJECT_ID/subscriptions/yago-quality-sub \
  --bq_table yago_reports.quality_stream \
  --max_num_workers 10 \
  --num_workers 1
```

## 모니터링

- Cloud Console > Dataflow > Jobs에서 작업 상태 확인
- 로그 확인: Cloud Console > Dataflow > Jobs > Logs

## 중지

```bash
gcloud dataflow jobs cancel JOB_ID \
  --project=$PROJECT_ID \
  --region=$REGION
```


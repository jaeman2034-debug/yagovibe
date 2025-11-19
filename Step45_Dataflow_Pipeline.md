# Step 45: 대용량 분산 파이프라인 (Firestore → Pub/Sub → Dataflow → BigQuery 스트리밍)

실시간 스트리밍 처리로 대용량 데이터를 처리하며, 탄력 확장, 정확-한번 처리(idempotent), 초 단위 지연 최소화를 확보합니다.

## 📋 아키텍처

```
Firestore (qualityReports writes)
   └── Functions Publisher (onWrite) → Pub/Sub topic: yago-quality-events
                                    ↓
                           Dataflow (Apache Beam)
                              ↳ 변환/검증/중복제거/윈도잉
                              ↳ BigQuery Storage Write API → yago_reports.quality_stream
                              ↳ (옵션) GCS raw backup
```

## 🚀 빠른 시작

### 1단계: BigQuery 테이블 생성

```bash
# BigQuery Console에서 실행하거나
bq query --use_legacy_sql=false < scripts/create_bigquery_table.sql

# 또는 직접 실행
bq mk --dataset yago_reports
bq mk --table \
  --time_partitioning_field event_ts \
  --clustering_fields team_id,report_id \
  yago_reports.quality_stream \
  scripts/create_bigquery_table.sql
```

### 2단계: Pub/Sub 리소스 생성

```bash
export PROJECT_ID="your-project"
export REGION="asia-northeast3"

# 토픽 생성
gcloud pubsub topics create yago-quality-events \
  --project=$PROJECT_ID

# Dead Letter Queue 토픽
gcloud pubsub topics create yago-quality-events-dlq \
  --project=$PROJECT_ID

# 구독 생성 (Dataflow 전용)
gcloud pubsub subscriptions create yago-quality-sub \
  --topic=yago-quality-events \
  --ack-deadline=60 \
  --dead-letter-topic=yago-quality-events-dlq \
  --dead-letter-max-delivery-attempts=10 \
  --project=$PROJECT_ID
```

### 3단계: Functions 배포

```bash
cd functions
npm install @google-cloud/pubsub
# 또는
pnpm add @google-cloud/pubsub

# 환경 변수 설정 (선택적)
firebase functions:config:set pubsub.topic="yago-quality-events"

# 배포
firebase deploy --only functions:publishQualityEvent
```

### 4단계: Dataflow 파이프라인 배포

```bash
export PROJECT_ID="your-project"
export REGION="asia-northeast3"
export GCS_BUCKET="gs://your-bucket/dataflow"

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
```

## 📊 데이터 흐름

### 1. Firestore 이벤트

```
teams/{teamId}/reports/{reportId}/qualityReports/{ts}
```

### 2. Functions Publisher

- 이벤트 감지
- 메트릭 추출
- `insert_id` 생성: `${teamId}-${reportId}-${ts}`
- Pub/Sub 메시지 발행

### 3. Pub/Sub

- 토픽: `yago-quality-events`
- 구독: `yago-quality-sub`
- DLQ: `yago-quality-events-dlq`

### 4. Dataflow 파이프라인

1. **ReadFromPubSub**: Pub/Sub 구독에서 메시지 읽기
2. **ParseValidate**: JSON 파싱 및 검증
3. **DedupInsertId**: insert_id 기반 중복 제거
4. **WriteToBQ**: BigQuery Storage Write API로 쓰기

### 5. BigQuery

- 테이블: `yago_reports.quality_stream`
- 파티션: `DATE(event_ts)`
- 클러스터링: `team_id, report_id`

## 🔧 운영 가드레일

### 정확-한번 처리 (Idempotent)

1. **insert_id 기반 중복 제거**
   - Functions에서 생성: `${teamId}-${reportId}-${ts}`
   - Dataflow에서 메모리 캐시로 중복 제거 (TTL 1시간)
   - BigQuery Storage Write API의 insertId 기능 활용

2. **중복 제거 전략**
   - 메모리 캐시 (소규모): 현재 구현
   - Redis/Spanner/Bigtable (대규모): 운영 환경 권장

### DLQ 모니터링

```bash
# DLQ 메시지 확인
gcloud pubsub subscriptions pull yago-quality-events-dlq-sub \
  --project=$PROJECT_ID \
  --limit=10

# DLQ 구독 생성 (모니터링용)
gcloud pubsub subscriptions create yago-quality-events-dlq-sub \
  --topic=yago-quality-events-dlq \
  --project=$PROJECT_ID
```

### Cloud Monitoring 알림 설정

1. Cloud Console > Monitoring > Alerting
2. 새 정책 생성
3. 메트릭: `pubsub.googleapis.com/subscription/num_undelivered_messages`
4. 조건: `yago-quality-sub` 구독의 미배달 메시지 > 100
5. 알림 채널: Email/Slack

### 스키마 진화

새로운 필드를 추가할 때:

1. **BigQuery 테이블 업데이트**
   ```sql
   ALTER TABLE `yago_reports.quality_stream`
   ADD COLUMN new_field STRING;
   ```

2. **Beam 스키마 업데이트**
   ```python
   SCHEMA = {
       'fields': [
           # ... 기존 필드
           {'name': 'new_field', 'type': 'STRING', 'mode': 'NULLABLE'},
       ]
   }
   ```

3. **Functions Publisher 업데이트**
   ```typescript
   const payload = {
       // ... 기존 필드
       new_field: value,
   };
   ```

4. **파이프라인 재배포**

### 비용 및 성능 최적화

1. **워커 수 조정**
   - 최소: 1개 (비용 절감)
   - 최대: 10개 (자동 확장)
   - 자동 확장 활성화

2. **메시지 처리 지연**
   - 목표: 초 단위
   - 모니터링: Pub/Sub 지연 메트릭 확인

3. **비용 최적화**
   - 최소 워커 수 사용
   - 자동 확장으로 트래픽에 따라 조정
   - GCS 임시 파일 자동 정리

## 🐛 장애 대응 Runbook

### Pub/Sub DLQ 적재 증가

**증상**: DLQ에 메시지가 계속 쌓임

**원인 진단**:
1. Functions 로그 확인: `firebase functions:log --only publishQualityEvent`
2. 메시지 페이로드 확인: DLQ에서 메시지 pull하여 확인
3. 스키마 불일치 확인

**해결 방법**:
- Functions 코드 오류 수정
- 스키마 업데이트
- BigQuery 권한 확인

### Dataflow 워커 에러 증가

**증상**: 워커가 계속 실패

**원인 진단**:
1. Dataflow 로그 확인: Cloud Console > Dataflow > Jobs > Logs
2. 스테이징 버킷 권한 확인
3. 네트워킹 확인 (VPC, 방화벽)

**해결 방법**:
- GCS 버킷 권한 수정
- 네트워크 설정 확인
- 워커 수 조정

### BigQuery 쓰기 오류

**증상**: BigQuery에 데이터가 쓰이지 않음

**원인 진단**:
1. 테이블 권한 확인
2. 스키마 확인
3. Storage Write API 할당량 확인

**해결 방법**:
- 서비스 계정 권한 부여
- 스키마 업데이트
- 할당량 증가 요청

## 📦 백필 (Backfill) 배치 잡

### 기존 Firestore 데이터 Export

```bash
# 방법 1: 자동 스크립트
bash scripts/export_firestore.sh

# 방법 2: 수동 실행
gcloud firestore export gs://your-bucket/firestore-export/TIMESTAMP \
  --collection-ids=teams \
  --project=$PROJECT_ID
```

### 배치 파이프라인 실행

```bash
# 방법 1: 자동 스크립트
export EXPORT_PATH="gs://your-bucket/firestore-export/20240101_120000"
bash scripts/backfill_step45.sh

# 방법 2: 수동 실행
python3 dataflow/step45_backfill.py \
  --project $PROJECT_ID \
  --region $REGION \
  --runner DataflowRunner \
  --staging_location $GCS_BUCKET/staging \
  --temp_location $GCS_BUCKET/temp \
  --input_pattern "gs://your-bucket/firestore-export/**/*qualityReports*.json" \
  --bq_table yago_reports.quality_stream \
  --max_num_workers 10 \
  --num_workers 2
```

### 백필 가이드

자세한 내용은 `Step45_백필가이드.md` 참조

## 🔍 모니터링

### Pub/Sub 메트릭

- `pubsub.googleapis.com/subscription/num_undelivered_messages`: 미배달 메시지 수
- `pubsub.googleapis.com/subscription/oldest_unacked_message_age`: 가장 오래된 미확인 메시지 나이

### Dataflow 메트릭

- `dataflow.googleapis.com/job/current_num_workers`: 현재 워커 수
- `dataflow.googleapis.com/job/elapsed_time`: 작업 경과 시간
- `dataflow.googleapis.com/job/elements_produced_count`: 처리된 요소 수

### BigQuery 메트릭

- `bigquery.googleapis.com/streaming/insert_row_count`: 스트리밍 삽입 행 수
- `bigquery.googleapis.com/streaming/insert_request_count`: 스트리밍 삽입 요청 수

## 📚 다음 단계 (Step 46 예고)

- 실시간 규칙 엔진 + 이상 탐지 (Anomaly Detection)
- Dataflow에 Sliding Window + Z-score/ESD 적용
- 임계치 대신 통계적 이상 감지로 Slack 알림/자동 티켓 생성 (Jira/Notion)

## 🛠️ 유용한 명령어

### Pub/Sub 메시지 수동 발행 (테스트)

```bash
echo '{"insert_id":"test-1","team_id":"TEST","report_id":"test-report","event_ts":"2024-01-01T00:00:00Z","overallScore":0.95,"coverage":0.98,"gaps":0,"overlaps":0,"avgDur":2.5,"source":"stream"}' | \
gcloud pubsub topics publish yago-quality-events \
  --project=$PROJECT_ID
```

### Dataflow 작업 상태 확인

```bash
gcloud dataflow jobs list \
  --project=$PROJECT_ID \
  --region=$REGION \
  --status=active
```

### BigQuery 데이터 확인

```sql
-- 최근 24시간 데이터
SELECT * FROM `yago_reports.quality_stream_recent`
ORDER BY event_ts DESC
LIMIT 100;

-- 팀별 집계
SELECT * FROM `yago_reports.quality_stream_team_summary`
ORDER BY team_id, date DESC;
```


# Step 45: 대용량 분산 파이프라인 구현 요약

## ✅ 구현 완료 사항

### 1. BigQuery 테이블 생성
- 파일: `scripts/create_bigquery_table.sql`
- 테이블: `yago_reports.quality_stream`
- 파티션: `DATE(event_ts)`
- 클러스터링: `team_id, report_id`
- 뷰: 최근 24시간, 팀별 집계

### 2. Functions Publisher
- 파일: `functions/src/step45.publisher.ts`
- 트리거: `teams/{teamId}/reports/{reportId}/qualityReports/{ts}` 생성 시
- 기능: Firestore 이벤트를 Pub/Sub로 발행
- idempotent key: `${teamId}-${reportId}-${ts}`

### 3. Dataflow 파이프라인
- 파일: `dataflow/step45_stream.py`
- 기능:
  - Pub/Sub 메시지 읽기
  - JSON 파싱 및 검증
  - insert_id 기반 중복 제거
  - BigQuery Storage Write API로 쓰기

### 4. 배포 스크립트
- `scripts/deploy_step45.sh`: 전체 배포 자동화
- `scripts/test_pubsub_message.sh`: Pub/Sub 메시지 테스트

## 📦 생성된 파일

1. `scripts/create_bigquery_table.sql` - BigQuery 테이블 생성
2. `functions/src/step45.publisher.ts` - Firestore → Pub/Sub Publisher
3. `dataflow/step45_stream.py` - Dataflow 파이프라인
4. `dataflow/requirements.txt` - Python 패키지 의존성
5. `dataflow/README.md` - Dataflow 사용 가이드
6. `scripts/deploy_step45.sh` - 배포 스크립트
7. `scripts/test_pubsub_message.sh` - 테스트 스크립트
8. `Step45_Dataflow_Pipeline.md` - 전체 가이드

## 🚀 빠른 배포

### 방법 1: 자동 배포 스크립트

```bash
export GCP_PROJECT="your-project"
export GCP_REGION="asia-northeast3"
export GCS_BUCKET="gs://your-bucket/dataflow"

bash scripts/deploy_step45.sh
```

### 방법 2: 수동 배포

```bash
# 1. BigQuery 테이블
bq query --use_legacy_sql=false < scripts/create_bigquery_table.sql

# 2. Pub/Sub 리소스
gcloud pubsub topics create yago-quality-events
gcloud pubsub subscriptions create yago-quality-sub --topic=yago-quality-events

# 3. Functions
cd functions && npm install @google-cloud/pubsub
firebase deploy --only functions:publishQualityEvent

# 4. Dataflow
python3 dataflow/step45_stream.py --project=... --region=...
```

## 🔍 테스트

### Pub/Sub 메시지 테스트

```bash
bash scripts/test_pubsub_message.sh
```

### BigQuery 데이터 확인

```sql
-- 최근 24시간 데이터
SELECT * FROM `yago_reports.quality_stream_recent`
ORDER BY event_ts DESC LIMIT 10;

-- 팀별 집계
SELECT * FROM `yago_reports.quality_stream_team_summary`;
```

## 📊 데이터 흐름

```
Firestore (qualityReports 생성)
    ↓
Functions Publisher (onDocumentWritten)
    ↓
Pub/Sub (yago-quality-events)
    ↓
Dataflow (Apache Beam)
    ├─ ParseValidate
    ├─ DedupInsertId
    └─ WriteToBQ
    ↓
BigQuery (yago_reports.quality_stream)
```

## 🛡️ 운영 가드레일

### 정확-한번 처리
- insert_id 기반 중복 제거 (메모리 캐시)
- BigQuery Storage Write API insertId 기능
- DLQ를 통한 실패 처리

### 모니터링
- Pub/Sub: 미배달 메시지 수
- Dataflow: 워커 수, 처리량
- BigQuery: 스트리밍 삽입 수

### 장애 대응
- DLQ 모니터링 및 알림
- Dataflow 로그 확인
- BigQuery 권한/스키마 확인

## 💰 비용 최적화

- 최소 워커: 1개
- 최대 워커: 10개 (자동 확장)
- 메시지 처리 지연: 초 단위

## 📚 다음 단계

Step 46: 실시간 규칙 엔진 + 이상 탐지 (Anomaly Detection)


# Step 45: 백필 배치 작업 가이드

기존 Firestore 데이터를 BigQuery로 마이그레이션하는 배치 작업입니다.

## 📋 개요

### 백필 프로세스

```
Firestore Export (GCS)
    ↓
Dataflow Batch Pipeline
    ├─ Firestore Export JSON 파싱
    ├─ 문서 변환 및 검증
    ├─ insert_id 기반 중복 제거
    └─ BigQuery 배치 적재
    ↓
BigQuery (yago_reports.quality_stream)
```

## 🚀 빠른 시작

### 방법 1: 자동 스크립트 사용

```bash
# 1. Firestore Export
export GCP_PROJECT="your-project"
export EXPORT_BUCKET="gs://your-bucket/firestore-export"
bash scripts/export_firestore.sh

# 2. 백필 배치 실행
export EXPORT_PATH="gs://your-bucket/firestore-export/20240101_120000"
bash scripts/backfill_step45.sh
```

### 방법 2: 수동 실행

```bash
# 1. Firestore Export
gcloud firestore export gs://your-bucket/firestore-export/20240101_120000 \
  --collection-ids=teams \
  --project=your-project

# 2. Python 패키지 설치
python3 -m pip install -r dataflow/requirements.txt

# 3. Dataflow 배치 파이프라인 실행
python3 dataflow/step45_backfill.py \
  --project your-project \
  --region asia-northeast3 \
  --runner DataflowRunner \
  --staging_location gs://your-bucket/dataflow/staging \
  --temp_location gs://your-bucket/dataflow/temp \
  --input_pattern "gs://your-bucket/firestore-export/20240101_120000/**/*qualityReports*.json" \
  --bq_table yago_reports.quality_stream \
  --max_num_workers 10 \
  --num_workers 2
```

## 📊 Firestore Export 형식

### Export 구조

```
gs://bucket/firestore-export/TIMESTAMP/
  ├── all_namespaces/
  │   └── all_kinds/
  │       └── teams/
  │           └── teams.export_metadata
  └── ...
```

### 문서 형식

```json
{
  "documents": [
    {
      "name": "projects/PROJECT/databases/(default)/documents/teams/TEAM_ID/reports/REPORT_ID/qualityReports/TIMESTAMP",
      "fields": {
        "metrics": {
          "mapValue": {
            "fields": {
              "overallScore": {"doubleValue": 0.95},
              "coverage": {"doubleValue": 0.98},
              "gaps": {"integerValue": 0},
              "overlaps": {"integerValue": 0},
              "avgDur": {"doubleValue": 2.5}
            }
          }
        },
        "createdAt": {
          "timestampValue": "2024-01-01T00:00:00.000000Z"
        }
      },
      "updateTime": "2024-01-01T00:00:00.000000Z"
    }
  ]
}
```

## 🔧 파이프라인 상세

### 1. ReadFromGCS

GCS에서 Firestore Export JSON 파일 읽기

```python
| 'ReadFromGCS' >> beam.io.ReadFromText(
    args.input_pattern,
    coder=beam.coders.StrUtf8Coder()
)
```

### 2. ParseFirestoreExport

Firestore Export JSON을 파이프라인 형식으로 변환

- 문서 경로에서 `teamId`, `reportId`, `timestamp` 추출
- `metrics` 필드 파싱
- `createdAt` 추출 (없으면 `updateTime` 사용)
- `insert_id` 생성: `${teamId}-${reportId}-${timestamp}`

### 3. DeduplicateByInsertId

insert_id 기반 중복 제거 (메모리 기반)

### 4. WriteToBQ

BigQuery에 배치 적재 (FILE_LOADS 방식)

## 📝 실행 옵션

### 필수 옵션

- `--project`: GCP 프로젝트 ID
- `--input_pattern`: GCS 입력 파일 패턴
- `--temp_location`: GCS 임시 파일 위치
- `--staging_location`: GCS 스테이징 위치

### 선택 옵션

- `--region`: GCP 리전 (기본값: asia-northeast3)
- `--bq_table`: BigQuery 테이블 (기본값: yago_reports.quality_stream)
- `--max_num_workers`: 최대 워커 수 (기본값: 10)
- `--num_workers`: 초기 워커 수 (기본값: 2)

## 🔍 모니터링

### Dataflow 작업 상태

```bash
gcloud dataflow jobs list \
  --project=$PROJECT_ID \
  --region=$REGION \
  --status=active
```

### BigQuery 데이터 확인

```sql
-- 백필 데이터 개수 확인
SELECT COUNT(*) as count, source
FROM `yago_reports.quality_stream`
GROUP BY source;

-- 백필 데이터 샘플
SELECT *
FROM `yago_reports.quality_stream`
WHERE source = 'backfill'
ORDER BY load_ts DESC
LIMIT 10;

-- 중복 체크
SELECT insert_id, COUNT(*) as cnt
FROM `yago_reports.quality_stream`
GROUP BY insert_id
HAVING cnt > 1;
```

## 🐛 문제 해결

### Export 파일을 찾을 수 없을 때

1. **Export 경로 확인**
   ```bash
   gsutil ls gs://your-bucket/firestore-export/
   ```

2. **Export 재실행**
   ```bash
   bash scripts/export_firestore.sh
   ```

### 파싱 오류가 발생할 때

1. **파일 형식 확인**
   ```bash
   gsutil cat gs://your-bucket/firestore-export/.../file.json | head -100
   ```

2. **스키마 불일치 확인**
   - Firestore 문서 구조 확인
   - 파이프라인 파싱 로직 확인

### BigQuery 쓰기 오류

1. **권한 확인**: 서비스 계정에 BigQuery 쓰기 권한 확인
2. **스키마 확인**: 테이블 스키마와 파이프라인 스키마 일치 확인
3. **할당량 확인**: BigQuery 할당량 확인

## 💰 비용 최적화

### 배치 작업 최적화

- **워커 수 조정**: 데이터 크기에 따라 조정 (2-10개)
- **파일 분할**: 큰 파일은 여러 개로 분할하여 병렬 처리
- **GCS 임시 파일 자동 정리**: Dataflow가 자동으로 정리

### 예상 비용

- **Firestore Export**: 무료 (일일 Export 제한)
- **Dataflow**: 워커 시간당 약 $0.056
- **BigQuery**: 스토리지 및 쿼리 비용

## 📚 참고 사항

### 스트리밍 vs 배치

- **스트리밍**: 실시간 데이터 처리 (Step 45 메인 파이프라인)
- **배치**: 기존 데이터 마이그레이션 (백필)

### 중복 방지

- 백필과 스트리밍 모두 `insert_id` 기반 중복 제거
- BigQuery Storage Write API의 insertId 기능 활용
- 배치 작업은 `source='backfill'`로 구분

### 데이터 일관성

- 백필은 기존 데이터의 스냅샷
- 스트리밍은 실시간 데이터
- 두 데이터를 함께 쿼리하여 전체 데이터 확인 가능


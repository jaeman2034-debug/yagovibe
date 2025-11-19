# Step 37: BigQuery 적재 + 주간 품질 리포트 자동 생성

Step 36에서 생성된 품질 리포트를 BigQuery로 적재하고, 주간 통계 요약을 Slack/메일로 자동 발송합니다.

## 구성 요소

### 1. BigQuery 스키마

**Dataset**: `yago_reports`  
**Table**: `quality_metrics`

| 필드 | 타입 | 설명 |
|------|------|------|
| `report_id` | STRING | Firestore 문서 ID |
| `created_at` | TIMESTAMP | 품질 리포트 생성 시각 |
| `coverage` | FLOAT | 문장 커버리지 비율 |
| `gaps` | INT64 | 공백 구간 수 |
| `overlaps` | INT64 | 중복/역전 구간 수 |
| `avgDur` | FLOAT | 평균 문장 길이(초) |
| `overallScore` | FLOAT | 종합 점수 |
| `source` | STRING | 생성된 위치 (CloudTasks or Manual) |

### 2. Firebase Functions

#### `syncQualityToBigQuery`
- **트리거**: `reports/{reportId}/qualityReports/{reportTs}` 생성 시
- **동작**: Firestore 데이터를 BigQuery에 자동 적재

#### `sendWeeklyQualityReport`
- **트리거**: 매주 월요일 09:00 (Asia/Seoul)
- **동작**: BigQuery에서 최근 7일간 통계 조회 → Slack/Email 발송

## 설치 및 배포

### 1. 패키지 설치

```bash
cd functions
npm install @google-cloud/bigquery
```

### 2. BigQuery Dataset 및 Table 생성

```bash
# BigQuery Dataset 생성
bq mk --dataset --location=asia-northeast3 yago_reports

# Table 생성
bq mk --table \
  --schema=report_id:STRING,created_at:TIMESTAMP,coverage:FLOAT,gaps:INT64,overlaps:INT64,avgDur:FLOAT,overallScore:FLOAT,source:STRING \
  yago_reports:quality_metrics
```

또는 BigQuery Console에서:
1. Dataset 생성: `yago_reports` (위치: `asia-northeast3`)
2. Table 생성: `quality_metrics`
3. 스키마 설정:
   - `report_id` (STRING, REQUIRED)
   - `created_at` (TIMESTAMP, REQUIRED)
   - `coverage` (FLOAT)
   - `gaps` (INT64)
   - `overlaps` (INT64)
   - `avgDur` (FLOAT)
   - `overallScore` (FLOAT)
   - `source` (STRING)

### 3. Functions 배포

```bash
firebase deploy --only functions:syncQualityToBigQuery,functions:sendWeeklyQualityReport
```

### 4. 환경 변수 설정 (선택)

Slack/Email 발송을 위해 환경 변수 설정:

```bash
# Firebase Functions 환경 변수 설정
firebase functions:config:set \
  slack.webhook_url="<SLACK_WEBHOOK_URL>" \
  smtp.user="your-email@gmail.com" \
  smtp.pass="your-app-password" \
  mail.to="admin@yago-vibe.com"

# 또는 .env 파일 사용 (로컬 개발)
# SLACK_WEBHOOK_URL=<SLACK_WEBHOOK_URL>
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# MAIL_TO=admin@yago-vibe.com
```

**참고**: Gmail 앱 비밀번호 사용:
1. Google 계정 → 보안 → 2단계 인증 활성화
2. 앱 비밀번호 생성 → 16자리 비밀번호 사용

## 사용 방법

### 자동 동기화

`reports/{reportId}/qualityReports/{reportTs}` 문서가 생성되면 자동으로 BigQuery에 적재됩니다.

### 주간 리포트

매주 월요일 09:00 (Asia/Seoul)에 자동으로 실행됩니다.

**수동 실행**:
```bash
# Firebase Console에서 수동 실행
# 또는 Cloud Scheduler에서 트리거
```

## Slack 예시 출력

```
🧠 *주간 품질 리포트 (YAGO VIBE)*

리포트 수: 82
평균 점수: 0.93
평균 커버리지: 97.4%
평균 길이: 2.44s
Gaps: 7 / Overlaps: 3
```

## Email 예시

**제목**: YAGO VIBE 주간 품질 리포트

**본문**:
```
🧠 주간 품질 리포트 (YAGO VIBE)

리포트 수: 82
평균 점수: 0.93
평균 커버리지: 97.4%
평균 길이: 2.44s
Gaps: 7 / Overlaps: 3
```

## 아키텍처

```
[Cloud Scheduler]
      ↓ (매주 월요일 9시)
[sendWeeklyQualityReport]
      ↓
[BigQuery]
      ↑ (실시간 동기화)
[syncQualityToBigQuery]
      ↑
[Firestore: reports/{id}/qualityReports/{ts}]
      ↑
[processReportTask (Step36)]
```

## BigQuery 쿼리 예시

### 최근 7일간 평균 점수

```sql
SELECT
  AVG(overallScore) as avg_score,
  AVG(coverage) as avg_coverage,
  COUNT(*) as count
FROM `yago_reports.quality_metrics`
WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
```

### 일별 품질 트렌드

```sql
SELECT
  DATE(created_at) as date,
  AVG(overallScore) as avg_score,
  COUNT(*) as count
FROM `yago_reports.quality_metrics`
WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY date
ORDER BY date DESC
```

### 저품질 리포트 찾기

```sql
SELECT
  report_id,
  overallScore,
  coverage,
  gaps,
  overlaps
FROM `yago_reports.quality_metrics`
WHERE overallScore < 0.8 OR coverage < 0.9
ORDER BY created_at DESC
LIMIT 10
```

## 문제 해결

### BigQuery 권한 오류

```bash
# BigQuery API 활성화
gcloud services enable bigquery.googleapis.com

# Functions 서비스 계정에 BigQuery 권한 부여
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com \
  --role=roles/bigquery.dataEditor
```

### 스케줄러 실행 확인

```bash
# Cloud Scheduler 작업 확인
gcloud scheduler jobs list

# 로그 확인
firebase functions:log --only sendWeeklyQualityReport
```

### BigQuery 데이터 확인

```bash
# 테이블 데이터 조회
bq query --use_legacy_sql=false \
  "SELECT * FROM \`yago_reports.quality_metrics\` ORDER BY created_at DESC LIMIT 10"
```

## 다음 단계 (Step 38 예고)

✅ Step 38: Notion/Google Sheets 연동 → 리포트 자동 시각화 대시보드 생성
- 주간 품질 트렌드
- 팀별 통계
- BigQuery → Notion/Sheets API를 통해 실시간 대시보드 자동 생성


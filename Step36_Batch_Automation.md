# Step 36: 배치 자동화 (Cloud Run Job + Cloud Tasks) + 실패 재시도 & 품질 리포트

리포트 처리(정렬/메타 생성/품질 측정)를 대량 자동화하고, 실패 시 재시도하며, 실행 결과를 품질 리포트로 Firestore에 저장합니다.

## 구성 요소

### 1. Firebase Functions
- `enqueueReportProcessing`: 리포트 ID 리스트를 Cloud Tasks로 분산 큐잉
- `processReportTask`: 리포트 1건 품질 측정 → `reports/{id}/qualityReports/{ts}` 저장

### 2. Cloud Tasks 큐
- 자동 재시도 (지수 백오프)
- 최대 시도 횟수: 5회
- 동시 처리: 최대 5개

### 3. Cloud Run Job
- 최근 24시간 내 업데이트된 리포트 스캔
- 처리 필요한 리포트 자동 큐잉
- Cloud Scheduler로 매시간 실행

### 4. 품질 메트릭
- Coverage: 문장 커버리지
- Gaps: 0.4초 이상 공백
- Overlaps: 시간 겹침
- AvgDur: 평균 문장 길이
- OverallScore: 종합 점수 (0-1)

## 설치 단계

### 1. Functions 배포

```bash
cd functions
npm install @google-cloud/tasks
npm run build
firebase deploy --only functions:enqueueReportProcessing,functions:processReportTask
```

### 2. Cloud Tasks 큐 생성 (1회)

```bash
gcloud tasks queues create report-processing \
  --location=asia-northeast3 \
  --max-attempts=5 \
  --max-dispatches-per-second=5 \
  --max-concurrent-dispatches=5 \
  --min-backoff=5s \
  --max-backoff=600s
```

### 3. Cloud Run Job 빌드 및 배포

```bash
# 프로젝트 ID 설정
export PROJECT_ID="yago-vibe-spt"

# 컨테이너 이미지 빌드
gcloud builds submit step36-runjob --tag gcr.io/$PROJECT_ID/step36-runjob:latest

# Cloud Run Job 생성
gcloud run jobs create step36-runjob \
  --image gcr.io/$PROJECT_ID/step36-runjob:latest \
  --region=asia-northeast3 \
  --set-env-vars=PROJECT_ID=$PROJECT_ID,LOCATION=asia-northeast3,FUNCTIONS_ORIGIN=https://asia-northeast3-$PROJECT_ID.cloudfunctions.net \
  --max-retries=1

# Cloud Scheduler로 매시간 실행
gcloud scheduler jobs create http step36-runjob-hourly \
  --schedule="0 * * * *" \
  --time-zone="Asia/Seoul" \
  --uri="https://asia-northeast3-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/$PROJECT_ID/jobs/step36-runjob:run" \
  --oauth-service-account-email=$PROJECT_ID-compute@developer.gserviceaccount.com \
  --http-method=POST

# 권한 부여
gcloud run jobs add-iam-policy-binding step36-runjob \
  --member=serviceAccount:$PROJECT_ID-compute@developer.gserviceaccount.com \
  --role=roles/run.invoker \
  --region=asia-northeast3
```

## 사용 방법

### 프런트엔드에서 품질 리포트 표시

```tsx
import QualitySummaryCard from "@/components/QualitySummaryCard";

<QualitySummaryCard reportId="REPORT_DOC_ID" />
```

### 수동으로 리포트 처리 큐잉

```bash
curl -X POST https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/enqueueReportProcessing \
  -H "Content-Type: application/json" \
  -d '{"reportIds": ["report-id-1", "report-id-2"]}'
```

## Firestore 구조

### 품질 리포트 저장 위치
```
reports/{reportId}/qualityReports/{timestamp}
{
  createdAt: Timestamp,
  metrics: {
    sentences: number,
    segments: number,
    coverage: number,
    gaps: number,
    overlaps: number,
    avgDur: number,
    overallScore: number
  },
  status: "OK"
}
```

### 리포트 인덱스 업데이트
```
reports/{reportId}
{
  lastQualityScore: number,
  lastProcessedAt: Timestamp
}
```

## 품질 점수 계산

- **Coverage (60%)**: 문장 커버리지 비율
- **Gaps/Overlaps 패널티 (30%)**: 시간 겹침 및 공백 패널티
- **평균 길이 안정성 (10%)**: 이상적인 문장 길이(2.5초) 기준

## 운영 플로우

1. **Cloud Run Job** (매시간) → Firestore 스캔 → 후보 리포트 수집
2. **enqueueReportProcessing** → Cloud Tasks로 분산 큐잉
3. **Cloud Tasks** → 각 Task가 `processReportTask` 호출
4. **processReportTask** → 품질 측정 → `qualityReports`에 저장
5. **프런트엔드** → `QualitySummaryCard`가 최신 지표 표시

## 실패 재시도

- Cloud Tasks 큐에서 자동 재시도 (최대 5회)
- 지수 백오프: 5초 ~ 600초
- 실패 시 Stackdriver 로그 확인

## 확장 포인트

1. **Step 35 정렬 파이프라인 연동**: `processReportTask` 내부에 Step35 호출 추가
2. **임계치 알람**: `coverage < 0.8` 등 미달 시 Slack/이메일 알림
3. **BigQuery 적재**: 품질 지표를 BigQuery에 저장 후 주간 리포트 생성

## 문제 해결

### Cloud Tasks 권한 오류
```bash
# Cloud Tasks API 활성화
gcloud services enable cloudtasks.googleapis.com

# Functions 서비스 계정에 Cloud Tasks 권한 부여
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com \
  --role=roles/cloudtasks.enqueuer
```

### Cloud Run Job 실행 실패
```bash
# 로그 확인
gcloud run jobs executions list --job=step36-runjob --region=asia-northeast3

# 수동 실행 테스트
gcloud run jobs execute step36-runjob --region=asia-northeast3
```


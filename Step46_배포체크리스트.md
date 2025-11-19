# Step 46: 배포 체크리스트

## ✅ 구현 완료 사항

### 1. Dataflow 확장 파이프라인
- **파일**: `dataflow/step46_anomaly.py`
- **기능**: 
  - ✅ 15분 창/5분 슬라이딩 윈도우에서 Z-score 이상 탐지
  - ✅ MAD (Median Absolute Deviation) 기반 이상 탐지
  - ✅ 규칙 기반 보조 조건 (coverage/gaps/overlaps)
  - ✅ Pub/Sub `yago-anomaly-events`로 이상 이벤트 발행

### 2. Cloud Functions 수신기
- **파일**: `functions/src/step46.ingestAnomaly.ts`
- **기능**:
  - ✅ Pub/Sub 메시지 수신 (`yago-anomaly-events`)
  - ✅ Firestore `teams/{teamId}/alerts`에 저장
  - ✅ Slack/Email 즉시 알림
  - ✅ (옵션) Notion/Jira 티켓 생성

### 3. 대시보드 연동
- **TeamInsightsDashboard**: `type: 'anomaly'` 알림 강조 표시
- **AIInsightsDashboard**: 리포트별 실시간 경고 배너

## 📋 배포 절차

### 1단계: 환경 변수 설정

```bash
export PROJECT_ID="your-project"
export REGION="asia-northeast3"
export GCS_BUCKET="gs://your-bucket/dataflow"
```

### 2단계: Pub/Sub 토픽 생성

```bash
gcloud pubsub topics create yago-anomaly-events \
  --project=$PROJECT_ID
```

### 3단계: Dataflow 파이프라인 실행

```bash
python3 dataflow/step46_anomaly.py \
  --project $PROJECT_ID \
  --region asia-northeast3 \
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
  --window_period 300
```

**참고**: 
- `--window_size 900`: 15분 윈도우 (초 단위)
- `--window_period 300`: 5분마다 슬라이딩 (초 단위)
- `--input_subscription`: Step 45에서 생성한 구독 사용

### 4단계: Functions 배포

```bash
cd functions
npm install node-fetch nodemailer
cd ..
firebase deploy --only functions:ingestAnomalyAlert
```

### 5단계: 환경 변수 설정 (Functions)

```bash
# Firebase Functions 환경 변수 설정
firebase functions:config:set \
  slack.webhook_url="https://hooks.slack.com/services/YOUR/WEBHOOK/URL" \
  smtp.user="your-email@gmail.com" \
  smtp.pass="your-app-password" \
  mail.to="admin@yago-vibe.com"

# 또는 .env 파일 사용 (Firebase Functions v2)
# .env 파일에 추가:
# SLACK_WEBHOOK_URL=...
# SMTP_USER=...
# SMTP_PASS=...
# MAIL_TO=...
```

### 6단계: (선택) Notion/Jira 연동

```bash
# Notion
firebase functions:config:set \
  notion.token="secret_..." \
  notion.anomaly_db="database_id"

# Jira
firebase functions:config:set \
  jira.url="https://your-domain.atlassian.net" \
  jira.user="your-email" \
  jira.token="your-api-token" \
  jira.project="PROJ"
```

## 🔍 배포 검증

### 1. Dataflow 작업 상태 확인

```bash
gcloud dataflow jobs list \
  --project=$PROJECT_ID \
  --region=$REGION \
  --filter="name:step46"
```

### 2. Pub/Sub 메시지 확인

```bash
# 이상 이벤트 토픽 구독 생성 (테스트용)
gcloud pubsub subscriptions create test-anomaly-sub \
  --topic=yago-anomaly-events \
  --project=$PROJECT_ID

# 메시지 확인
gcloud pubsub subscriptions pull test-anomaly-sub \
  --project=$PROJECT_ID \
  --limit=5
```

### 3. Functions 로그 확인

```bash
firebase functions:log --only ingestAnomalyAlert
```

### 4. Firestore 알림 확인

```bash
# Firebase Console에서 확인:
# Firestore > teams > {teamId} > alerts 컬렉션
```

### 5. Slack/Email 알림 확인

- Slack 워크스페이스에서 알림 수신 확인
- Email 수신함에서 알림 확인

## 🐛 문제 해결

### Dataflow 파이프라인이 시작되지 않을 때

1. **구독 확인**: `yago-quality-sub` 구독이 존재하는지 확인
2. **권한 확인**: Dataflow 서비스 계정에 Pub/Sub 권한 확인
3. **GCS 버킷 확인**: 스테이징/임시 위치 접근 권한 확인

### Functions가 트리거되지 않을 때

1. **토픽 확인**: `yago-anomaly-events` 토픽이 존재하는지 확인
2. **배포 확인**: `firebase functions:list`로 함수 확인
3. **로그 확인**: `firebase functions:log`로 에러 확인

### 알림이 발송되지 않을 때

1. **환경 변수 확인**: Slack/Email 설정 확인
2. **중복 억제 확인**: 캐시로 인한 스킵 여부 확인
3. **로그 확인**: Functions 로그에서 에러 확인

## 📊 모니터링

### Dataflow 메트릭

- 처리된 메시지 수
- 이상 감지 횟수
- 워커 수 및 처리량

### Functions 메트릭

- 호출 횟수
- 알림 발송 성공/실패
- Firestore 쓰기 성공/실패

### 비용 모니터링

- Dataflow 워커 시간
- Pub/Sub 메시지 수
- Functions 호출 횟수

## ✅ 최종 확인

배포 후 다음을 확인하세요:

- [ ] Dataflow 파이프라인이 실행 중
- [ ] Pub/Sub 메시지가 정상적으로 발행됨
- [ ] Functions가 이상 이벤트를 수신함
- [ ] Firestore에 알림이 저장됨
- [ ] Slack/Email 알림이 발송됨
- [ ] 대시보드에 이상 탐지 알림이 표시됨

## 🚀 빠른 배포 (자동 스크립트)

```bash
bash scripts/deploy_step46.sh
```


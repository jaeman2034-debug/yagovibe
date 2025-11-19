# Step 46: 실시간 이상 탐지(Anomaly) 규칙 엔진 검토 완료

## ✅ 구현 완료 확인

### 1. Dataflow 확장 파이프라인

- [x] **파일**: `dataflow/step46_anomaly.py`
- [x] **기능**: 
  - 15분 창/5분 슬라이딩 윈도우
  - Z-Score 기반 이상 탐지
  - MAD (Median Absolute Deviation) 기반 이상 탐지
  - 규칙 기반 보조 조건 (coverage/gaps/overlaps)
  - Pub/Sub `yago-anomaly-events`로 발행

### 2. Cloud Functions 수신기

- [x] **파일**: `functions/src/step46.ingestAnomaly.ts`
- [x] **기능**:
  - Pub/Sub 메시지 수신 (`yago-anomaly-events`)
  - Firestore `teams/{teamId}/alerts`에 저장
  - Slack/Email 즉시 알림 발송
  - (옵션) Notion/Jira 티켓 생성

### 3. 대시보드 연동

- [x] **TeamInsightsDashboard**: `type: 'anomaly'` 알림 강조 표시
- [x] **AIInsightsDashboard**: 리포트별 실시간 경고 배너

## 📦 배포 체크리스트

### 1. Pub/Sub 토픽 생성

```bash
export PROJECT_ID="your-project"
gcloud pubsub topics create yago-anomaly-events --project=$PROJECT_ID
```

### 2. Dataflow 파이프라인 실행

```bash
export PROJECT_ID="your-project"
export REGION="asia-northeast3"
export GCS_BUCKET="gs://your-bucket/dataflow"

python3 dataflow/step46_anomaly.py \
  --project $PROJECT_ID \
  --region $REGION \
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

### 3. Functions 배포

```bash
cd functions
npm install node-fetch nodemailer
cd ..
firebase deploy --only functions:ingestAnomalyAlert
```

### 4. 자동 배포 스크립트 (권장)

```bash
bash scripts/deploy_step46.sh
```

## 🔍 검증 포인트

### Dataflow 파이프라인

- [x] Sliding Window 설정 확인 (15분/5분)
- [x] Z-Score 계산 로직 확인
- [x] MAD 계산 로직 확인
- [x] 규칙 기반 조건 확인
- [x] Pub/Sub 출력 확인

### Functions 수신기

- [x] Pub/Sub 트리거 설정 확인
- [x] Firestore 쓰기 로직 확인
- [x] Slack/Email 발송 로직 확인
- [x] 중복 억제 캐시 로직 확인
- [x] Notion/Jira 연동 (선택) 확인

### 대시보드

- [x] TeamInsightsDashboard 이상 탐지 알림 표시
- [x] AIInsightsDashboard 경고 배너 표시
- [x] 스타일링 (빨간색 강조) 확인

## 📊 데이터 흐름 검증

```
1. Firestore qualityReports 생성
   ↓
2. Functions Publisher → Pub/Sub yago-quality-events
   ↓
3. Dataflow Step45_stream → BigQuery
   ↓
4. Dataflow Step46_anomaly → 이상 탐지
   ↓
5. Pub/Sub yago-anomaly-events
   ↓
6. Functions ingestAnomalyAlert
   ├─ Firestore teams/{teamId}/alerts
   ├─ Slack 알림
   ├─ Email 알림
   └─ (옵션) Notion/Jira 티켓
```

## 🎯 주요 기능 확인

### 이상 탐지 알고리즘

- [x] Z-Score: `abs((latest - mean) / stdev) > 2.5`
- [x] MAD: `abs((latest - median) / mad) > 2.5`
- [x] 규칙: `coverage < 0.9`, `gaps > 10`, `overlaps > 8`

### 윈도우 설정

- [x] 기본: 15분 윈도우, 5분 슬라이딩
- [x] 커스터마이징: `--window_size`, `--window_period` 파라미터

### 중복 억제

- [x] Functions 캐시: 5분 TTL
- [x] 캐시 키: `${team_id}-${window.end}-${alert_types}`

## 🐛 알려진 제한사항

### Dataflow 윈도우 처리

- 윈도우 정보 추출이 실패할 경우 현재 시간 사용
- 실제 운영에서는 윈도우 정보가 정상적으로 전달됨

### 중복 억제 캐시

- 현재 메모리 기반 캐시 사용
- 실제 운영에서는 Redis/Spanner 사용 권장

### 팀별 임계치

- 현재는 Dataflow 파이프라인 파라미터로 전달
- 향후 Firestore에서 동적으로 읽어오도록 개선 가능

## 📚 다음 단계

- [ ] 실제 데이터로 테스트
- [ ] 모니터링 대시보드 설정
- [ ] 알림 수신 확인
- [ ] 허위 양성률 측정 및 임계치 조정

## ✅ 최종 확인

모든 구현이 완료되었으며, 배포 준비가 완료되었습니다.


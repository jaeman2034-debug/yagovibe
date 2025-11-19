# Step 46: 실시간 이상 탐지(Anomaly) 규칙 엔진 + 자동 알림/티켓 생성

스트리밍 품질 데이터에 대해 실시간 윈도우 통계 기반 이상 탐지를 수행하고, 이상 이벤트를 Slack/Email로 즉시 통보하며 Firestore와 Notion/Jira에 티켓으로 적재합니다.

## 📋 아키텍처

```
Pub/Sub: yago-quality-events
    ├─ Dataflow: Step45_stream (기존)
    │     ├─ BigQuery Storage Write (quality_stream)
    │     └─ (NEW) Sliding Window Anomaly → Pub/Sub: yago-anomaly-events
    └─▸ (NEW) Functions: ingestAnomalyAlert
            ├─ Firestore alerts (teams/{teamId}/alerts)
            ├─ Slack/Email 알림
            └─ (옵션) Notion/Jira 티켓 생성
```

## 🚀 빠른 시작

### 1단계: Pub/Sub 토픽 생성

```bash
export PROJECT_ID="your-project"
export REGION="asia-northeast3"

# 이상 이벤트 토픽 생성
gcloud pubsub topics create yago-anomaly-events \
  --project=$PROJECT_ID
```

### 2단계: Dataflow 이상 탐지 파이프라인 배포

```bash
export GCS_BUCKET="gs://your-bucket/dataflow"

# Python 패키지 설치
python3 -m pip install apache-beam[gcp]==2.56.0

# 파이프라인 실행
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

### 3단계: Functions 배포

```bash
cd functions
npm install node-fetch nodemailer
firebase deploy --only functions:ingestAnomalyAlert
```

## 📊 이상 탐지 알고리즘

### 1. Z-Score 기반 이상 탐지

```python
z_score = abs((latest_score - mean) / stdev)
if z_score > threshold:
    # 이상 감지
```

- **임계치**: 기본값 2.5 (약 99% 신뢰구간)
- **최소 데이터**: 3개 이상 필요

### 2. MAD (Median Absolute Deviation) 기반 이상 탐지

```python
mad_score = abs((latest_score - median) / mad)
if mad_score > threshold:
    # 이상 감지
```

- **임계치**: 기본값 2.5
- **최소 데이터**: 5개 이상 필요
- **장점**: 이상치에 더 강건함

### 3. 규칙 기반 보조 조건

- **커버리지 저하**: `coverage < cov_min` (기본 0.9)
- **Gaps 과다**: `gaps > gaps_max` (기본 10)
- **Overlaps 과다**: `overlaps > overlaps_max` (기본 8)

## 🔧 윈도우 설정

### Sliding Window 파라미터

- **size**: 윈도우 크기 (초 단위, 기본 900초 = 15분)
- **period**: 윈도우 주기 (초 단위, 기본 300초 = 5분)

### 예시

```python
# 15분 윈도우, 5분마다 슬라이딩
Window(size=900, period=300)

# 60분 윈도우, 10분마다 슬라이딩
Window(size=3600, period=600)
```

## 🎯 팀별 임계치 커스터마이징

### Firestore 설정

```typescript
// teams/{teamId} 문서에 추가
{
  thresholds: {
    anomaly: {
      z: 2.5,          // Z-Score 임계치
      coverageMin: 0.9, // 커버리지 최소값
      gapsMax: 10,      // Gaps 최대값
      overlapsMax: 8,   // Overlaps 최대값
    }
  }
}
```

### Functions에서 동적 적용

Functions의 `ingestAnomalyAlert`에서 팀 문서를 읽어 임계치를 동적으로 적용할 수 있습니다 (현재는 Dataflow 파라미터로 전달).

## 📨 알림 발송

### Slack 알림

```
🚨 *이상 감지* (팀: 소흘 FC)
보고서: report-123
시각: 2024-01-15T14:30:00Z
윈도우: 2024-01-15T14:15:00Z ~ 2024-01-15T14:30:00Z (n=10)
평균: 0.95, 표준편차: 0.05

• score_anomaly: Score Z-score 2.85 > 2.5 (mean=0.95, latest=0.80)
• coverage_low: coverage 85.0% < 90%
```

### Email 알림

- **제목**: `[YAGO] 이상 감지: 소흘 FC`
- **본문**: Slack 메시지와 동일 (마크다운 제거)

### Notion 티켓 (선택)

- 데이터베이스에 페이지 생성
- 제목, 팀, 리포트, 타입, 상태, 이벤트 시간 포함

### Jira 티켓 (선택)

- 이슈 생성
- Summary: `이상 감지: 소흘 FC - score_anomaly`
- Description: 전체 알림 내용
- Labels: `anomaly`, `auto-generated`

## 🔍 대시보드 연동

### TeamInsightsDashboard

- **최근 이상 탐지 알림** 섹션 추가
- 빨간색 배지로 강조 표시
- 윈도우 정보 (n=count) 표시

### AIInsightsDashboard

- **이상 탐지 경고** 배너 추가
- 리포트 ID와 매칭된 이상 탐지 알림만 표시
- 최대 3개 표시

## 🛡️ 운영 팁

### 중복 억제

Functions에서 `(team_id, type, window.end)` 기반 캐시로 최근 5분 내 동일 알림 방지:

```typescript
const cacheKey = `${team_id}-${window.end}-${alerts.map(a => a.type).join(',')}`;
```

### 허위 양성(Noise) 완화

1. **z-threshold 완화**: 2.5 → 3.0
2. **min-count 조건**: 윈도우 내 n≥10 필요
3. **EMA 기반**: 지수이동평균 사용 (향후 구현)

### 비용 제어

- **Dataflow**: 최소 워커 1개, 자동 확장
- **Pub/Sub**: 최소 요금 확인
- **Functions**: 호출 횟수 모니터링

## 📊 모니터링

### Dataflow 메트릭

- 처리된 메시지 수
- 이상 감지 횟수
- 워커 수 및 처리량

### Functions 메트릭

- 호출 횟수
- 알림 발송 성공/실패
- Firestore 쓰기 성공/실패

### Firestore 쿼리

```typescript
// 최근 이상 탐지 알림
const q = query(
  collection(db, "teams", teamId, "alerts"),
  where("type", "==", "anomaly"),
  orderBy("createdAt", "desc"),
  limit(10)
);
```

## 🐛 문제 해결

### 이상 탐지가 작동하지 않을 때

1. **윈도우 크기 확인**: 너무 작으면 데이터 부족
2. **임계치 확인**: 너무 높으면 이상 감지 안 됨
3. **데이터 확인**: Pub/Sub 메시지가 올바른지 확인

### 알림이 발송되지 않을 때

1. **Functions 로그 확인**: `firebase functions:log --only ingestAnomalyAlert`
2. **환경 변수 확인**: Slack/Email 설정 확인
3. **중복 억제 확인**: 캐시로 인한 스킵 여부 확인

## 📚 다음 단계

- Step 47: EMA 기반 이상 탐지 (지수이동평균)
- Step 48: 머신러닝 기반 이상 탐지 (AutoML)
- Step 49: 이상 탐지 대시보드 (시각화)


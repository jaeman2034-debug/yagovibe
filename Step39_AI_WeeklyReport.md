# Step 39: AI 기반 주간 품질 요약 리포트 자동 생성

BigQuery에서 집계된 품질 데이터를 기반으로 ChatGPT가 자동으로 요약 리포트를 생성하고, PDF/Slack/Email로 배포합니다.

## 구성 요소

### 1. AI 리포트 생성
- **함수**: `generateWeeklySummary`
- **트리거**: 매주 월요일 09:30 (Asia/Seoul)
- **동작**: 
  1. BigQuery에서 최근 7일간 데이터 집계
  2. ChatGPT로 자연어 요약 생성
  3. PDF 생성
  4. Slack/Email 자동 발송

### 2. 리포트 내용
- 종합 요약 (전주 대비 변화)
- 주요 이슈 (갭/오버랩 원인 추정)
- 개선 제안
- 결론 (한 문장)

## 설치 및 배포

### 1. 패키지 설치

```bash
cd functions
npm install openai pdf-lib
```

### 2. 환경 변수 설정

```bash
# OpenAI API Key
firebase functions:config:set \
  openai.api_key="sk-xxxxxxxxxxxxx"

# Slack Webhook (선택)
firebase functions:config:set \
  slack.webhook_url="<SLACK_WEBHOOK_URL>"

# Email 설정 (선택)
firebase functions:config:set \
  smtp.user="your-email@gmail.com" \
  smtp.pass="your-app-password" \
  mail.to="admin@yago-vibe.com"
```

### 3. Functions 배포

```bash
firebase deploy --only functions:generateWeeklySummary
```

## 사용 방법

### 자동 실행

매주 월요일 09:30 (Asia/Seoul)에 자동으로 실행됩니다.

### 수동 실행

```bash
# Firebase Console에서 수동 실행
# 또는 Cloud Scheduler에서 트리거
```

## Slack 예시 출력

```
🧠 *YAGO VIBE 주간 AI 리포트*

이번 주 평균 점수는 0.94로 지난주 대비 0.02 상승했습니다.

주요 이슈:
• 갭 발생은 대부분 발화 길이 불균형에서 기인했습니다
• 평균 커버리지가 97.4%로 양호한 수준을 유지했습니다

개선 제안:
• 다음 주에는 평균 문장 길이를 2.5초 이하로 유지하는 개선이 필요합니다
• 오버랩 구간을 줄이기 위해 타임스탬프 정확도를 향상시켜야 합니다

결론: 전반적으로 품질이 개선되었으며, 지속적인 모니터링이 필요합니다.
```

## Email 예시

**제목**: YAGO VIBE 주간 AI 품질 리포트

**본문**: AI 리포트 텍스트

**첨부**: `WeeklyReport_YYYY-MM-DD.pdf`

## PDF 리포트 형식

- 제목: "YAGO VIBE 주간 품질 리포트"
- 생성일: 자동 추가
- 본문: AI 생성 리포트 (줄바꿈 처리)
- A4 크기, 다중 페이지 지원

## 아키텍처

```
[Cloud Scheduler]
      ↓ (매주 월요일 9:30)
[generateWeeklySummary]
      ↓
[BigQuery 데이터 집계]
      ↓
[ChatGPT 분석 요약]
      ↓
[PDF 생성]
      ↓
[Slack / Email 발송]
```

## BigQuery 쿼리

```sql
SELECT
    DATE(created_at) AS date,
    AVG(overallScore) AS avg_score,
    AVG(coverage) AS avg_coverage,
    SUM(gaps) AS total_gaps,
    SUM(overlaps) AS total_overlaps,
    COUNT(*) AS count
FROM `yago_reports.quality_metrics`
WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY date 
ORDER BY date ASC
```

## 문제 해결

### OpenAI API 오류

```bash
# API Key 확인
echo $OPENAI_API_KEY

# Functions 환경 변수 확인
firebase functions:config:get
```

### PDF 생성 오류

```bash
# pdf-lib 패키지 확인
cd functions
npm list pdf-lib
```

### Slack/Email 발송 실패

```bash
# 로그 확인
firebase functions:log --only generateWeeklySummary

# 환경 변수 확인
firebase functions:config:get
```

## 비용 예상

### OpenAI API
- `gpt-4o-mini`: 약 $0.15 / 1M input tokens, $0.60 / 1M output tokens
- 주간 리포트당 약 $0.01-0.02 예상

### Firebase Functions
- 실행 시간: 약 5-10초
- 메모리: 256MB
- 주간 비용: 약 $0.01

## 다음 단계

✅ Step 40: 실시간 모니터링 대시보드 (예고)
- Grafana/Data Studio 연동
- 실시간 알림 (품질 점수 임계치 초과 시)
- 자동 리포트 생성 및 배포


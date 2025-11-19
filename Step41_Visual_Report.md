# Step 41: 시각화 품질 리포트 자동 생성

BigQuery 예측 결과와 최근 4주 트렌드를 그래프 이미지로 자동 시각화하고, ChatGPT Vision API를 이용해 AI 스타일의 요약 이미지를 생성하여 Slack/Notion/Email로 전송합니다.

## 구성 요소

### 1. 그래프 이미지 생성
- **도구**: chartjs-node-canvas
- **데이터**: 최근 4주간 Score & Coverage 트렌드
- **형식**: PNG 이미지 (800x400)

### 2. AI 요약 이미지 생성
- **도구**: OpenAI Images API (DALL-E 3)
- **스타일**: 대시보드 스타일, 블루/그린 톤
- **내용**: 메트릭 요약, 트렌드 차트, 짧은 메모

### 3. 자동 발송
- Slack: 그래프 이미지 + AI 요약 이미지 URL
- Email: HTML 형식 + 이미지 첨부

## 설치 및 배포

### 1. 패키지 설치

```bash
cd functions
npm install chartjs-node-canvas chart.js
```

**참고**: Windows에서 `canvas` 패키지 빌드 오류가 발생할 수 있지만, Firebase Functions는 Linux 환경에서 실행되므로 배포 시 자동으로 설치됩니다.

### 2. 환경 변수 설정

```bash
firebase functions:config:set \
  openai.api_key="sk-xxxxxxxxxxxxx" \
  slack.webhook_url="https://hooks.slack.com/services/..." \
  smtp.user="your-email@gmail.com" \
  smtp.pass="your-app-password" \
  mail.to="admin@yago-vibe.com"
```

### 3. Functions 배포

```bash
firebase deploy --only functions:generateVisualQualityReport
```

## 사용 방법

### 자동 실행

매주 월요일 10:30 (Asia/Seoul)에 자동으로 실행됩니다.

### 수동 실행

```bash
# Firebase Console에서 수동 실행
# 또는 Cloud Scheduler에서 트리거
```

## Slack 예시 출력

```
📊 *YAGO VIBE AI 품질 시각화 리포트*

• Score 상승세 유지 (평균 0.94)
• Coverage 안정적 (98.1% 이상)
• 다음 주 예측: 0.95 (+0.01)

📈 트렌드 차트 및 AI 요약 이미지 첨부
```

## Email 예시

- **제목**: "YAGO VIBE AI 품질 시각화 리포트"
- **본문**: HTML 형식 (메트릭 + 그래프 이미지 + AI 요약 이미지)
- **첨부**: 
  - `quality_trend_chart.png` (트렌드 차트)
  - `ai_summary.png` (AI 요약 이미지)

## 그래프 구성

### 데이터
- **X축**: 날짜 (MM-DD 형식)
- **Y축 (왼쪽)**: Score (0-1)
- **Y축 (오른쪽)**: Coverage (%) (0-100)

### 스타일
- Score: 파란색 라인 (`#1d4ed8`)
- Coverage: 초록색 라인 (`#10b981`)
- 그라데이션 채우기

## AI 이미지 생성

DALL-E 3 모델을 사용하여 다음을 포함한 대시보드 스타일 이미지 생성:
- 메트릭 요약 카드
- 트렌드 차트 시각화
- 짧은 메모 ("Quality improving" 등)
- 블루/그린 톤 색상 팔레트

## 아키텍처

```
[Cloud Scheduler]
      ↓ (매주 월요일 10:30)
[generateVisualQualityReport]
      ↓
[BigQuery 데이터 로드]
      ↓
[Chart.js 그래프 생성]
      ↓
[OpenAI Images API]
      ↓
[Slack / Email 발송]
```

## 문제 해결

### Canvas 패키지 빌드 오류 (Windows)

Windows에서 로컬 빌드 오류는 무시해도 됩니다. Firebase Functions는 Linux 환경에서 실행되므로 배포 시 자동으로 설치됩니다.

```bash
# 배포만 진행
firebase deploy --only functions:generateVisualQualityReport
```

### Chart.js 렌더링 오류

```bash
# chart.js 버전 확인
cd functions
npm list chart.js

# 재설치
npm install chart.js@^4.5.1
```

### OpenAI Images API 오류

```bash
# API Key 확인
echo $OPENAI_API_KEY

# DALL-E 3 사용 가능 여부 확인
# (DALL-E 3은 일부 계정에서만 사용 가능)
```

### 이미지 다운로드 실패

OpenAI Images API는 생성된 이미지 URL이 일정 시간 후 만료될 수 있습니다. 가능한 빠르게 다운로드하도록 구현되어 있습니다.

## 비용 예상

### OpenAI Images API (DALL-E 3)
- $0.040 / 이미지 (1024x512)
- 주간 비용: 약 $0.04

### Firebase Functions
- 실행 시간: 약 10-15초
- 메모리: 512MB
- 주간 비용: 약 $0.01

### 총 주간 비용
- 약 $0.05-0.06

## 대안 방법

### Canvas 없이 SVG 생성

canvas 빌드 문제가 지속될 경우, SVG 생성 라이브러리 사용:

```bash
npm install chart.js svg2img
```

### 이미지 업로드 대신 URL 전송

Slack Webhook에 이미지를 직접 업로드하는 대신, Cloud Storage에 업로드 후 URL 전송:

```typescript
// Firebase Storage에 업로드
const bucket = admin.storage().bucket();
const file = bucket.file(`reports/charts/${Date.now()}.png`);
await file.save(chartBuffer, { contentType: "image/png" });
const url = await file.getSignedUrl({ action: "read", expires: "03-01-2500" });
```

## 다음 단계

✅ Step 42: 실시간 모니터링 대시보드 (예고)
- Grafana/Data Studio 연동
- 실시간 알림 (품질 점수 임계치 초과 시)
- 예측 결과 시각화


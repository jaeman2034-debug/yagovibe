# 🚀 Firebase Functions 설정 가이드

## 📋 개요
YAGO VIBE 프로젝트의 Firebase Functions 설정 및 배포 가이드입니다.

## 🛠️ 설정 단계

### 1️⃣ Firebase CLI 설치 및 로그인
```bash
# Firebase CLI 설치
npm install -g firebase-tools

# Firebase 로그인
firebase login

# 프로젝트 초기화 (이미 완료됨)
firebase init functions
```

### 2️⃣ 환경 변수 설정
```bash
# Slack Webhook URL 설정
firebase functions:config:set slack.webhook="<SLACK_WEBHOOK_URL>"

# Slack Bot Token 설정 (파일 업로드용)
firebase functions:config:set slack.bot_token="xoxb-your-bot-token"

# OpenAI API Key 설정
firebase functions:config:set openai.api_key="sk-your-openai-api-key"
```

### 3️⃣ 로컬 개발 서버 실행
```bash
# Firebase Functions 에뮬레이터 실행
firebase emulators:start --only functions

# 또는 functions만 실행
cd functions
npm run serve
```

### 4️⃣ 배포
```bash
# 전체 배포
firebase deploy

# Functions만 배포
firebase deploy --only functions

# 특정 함수만 배포
firebase deploy --only functions:vibeReport
```

## 🔗 엔드포인트

### 로컬 개발 환경
- **테스트 함수**: `http://localhost:5001/yago-vibe-spt/us-central1/testFunction`
- **리포트 생성**: `http://localhost:5001/yago-vibe-spt/us-central1/generateReport`
- **통합 리포트**: `http://localhost:5001/yago-vibe-spt/us-central1/vibeReport`
- **독립 API**: `http://localhost:5001/yago-vibe-spt/us-central1/generateReportAPI`

### 프로덕션 환경
- **테스트 함수**: `https://us-central1-yago-vibe-spt.cloudfunctions.net/testFunction`
- **리포트 생성**: `https://us-central1-yago-vibe-spt.cloudfunctions.net/generateReport`
- **통합 리포트**: `https://us-central1-yago-vibe-spt.cloudfunctions.net/vibeReport`
- **독립 API**: `https://us-central1-yago-vibe-spt.cloudfunctions.net/generateReportAPI`

## 📱 사용법

### 웹에서 호출
```javascript
// 이번주 리포트 (통합 API)
fetch('https://us-central1-yago-vibe-spt.cloudfunctions.net/vibeReport?period=thisweek&source=web')

// 지난주 리포트 (통합 API)
fetch('https://us-central1-yago-vibe-spt.cloudfunctions.net/vibeReport?period=lastweek&source=web')

// 독립 API (Slack 없이도 사용 가능)
fetch('https://us-central1-yago-vibe-spt.cloudfunctions.net/generateReportAPI?period=thisweek&format=json')
```

### Slack에서 호출
Slack 슬래시 명령어 설정:
- **Command**: `/vibe_report`
- **Request URL**: `https://us-central1-yago-vibe-spt.cloudfunctions.net/vibeReport?source=slack`
- **Short Description**: `YAGO VIBE 리포트 요청`

### n8n에서 호출
```json
{
  "method": "GET",
  "url": "https://us-central1-yago-vibe-spt.cloudfunctions.net/generateReportAPI",
  "params": {
    "period": "thisweek",
    "format": "json"
  }
}
```

### Postman에서 테스트
```bash
# 독립 API 테스트
GET https://us-central1-yago-vibe-spt.cloudfunctions.net/generateReportAPI?period=thisweek&format=json

# 통합 API 테스트
GET https://us-central1-yago-vibe-spt.cloudfunctions.net/vibeReport?period=thisweek&source=web
```

## 🎯 함수별 기능

### `vibeReport` (통합 리포트 함수)
- **기능**: 모든 플랫폼에서 호출 가능한 통합 리포트 함수
- **지원 플랫폼**: Slack, 웹, 모바일, n8n
- **매개변수**:
  - `period`: "thisweek", "lastweek", "2week", "3week"
  - `source`: "slack", "web", "mobile", "n8n"

### `generateReportAPI` (독립 API 함수)
- **기능**: Slack 없이도 사용 가능한 독립 API
- **특징**: 자동 Slack Webhook 전송 포함
- **매개변수**:
  - `period`: "thisweek", "lastweek", "2week", "3week"
  - `format`: "json" (기본값)
- **사용**: 웹앱, n8n, Postman, 모바일 앱

### `generateReport` (PDF 생성 함수)
- **기능**: PDF 생성 및 Slack 전송
- **사용**: 일일 리포트 자동 생성

### `testFunction` (테스트 함수)
- **기능**: Firebase Functions 상태 확인
- **사용**: 배포 후 테스트

## 🔧 트러블슈팅

### 1️⃣ 로컬 에뮬레이터 연결 실패
```bash
# 포트 확인
firebase emulators:start --only functions --debug

# 포트 변경
firebase emulators:start --only functions --port=5002
```

### 2️⃣ 환경 변수 확인
```bash
# 설정된 환경 변수 확인
firebase functions:config:get

# 환경 변수 삭제
firebase functions:config:unset slack.webhook
```

### 3️⃣ 배포 실패
```bash
# 로그 확인
firebase functions:log

# 특정 함수 로그
firebase functions:log --only vibeReport
```

## 📊 모니터링

### Firebase Console
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택
3. Functions 탭에서 함수 상태 확인

### 로그 모니터링
```bash
# 실시간 로그 확인
firebase functions:log --follow

# 특정 함수 로그만 확인
firebase functions:log --only vibeReport --follow
```

## 🚀 확장 가능성

### 추가 함수 예시
```javascript
// 월간 리포트 함수
exports.monthlyReport = functions.https.onRequest(async (req, res) => {
  // 월간 리포트 로직
});

// 실시간 알림 함수
exports.realtimeNotification = functions.firestore
  .document('voice_logs/{logId}')
  .onCreate(async (snap, context) => {
    // 실시간 알림 로직
  });
```

### 외부 API 연동
```javascript
// 외부 서비스 연동 예시
const externalAPI = require('external-api');

exports.externalIntegration = functions.https.onRequest(async (req, res) => {
  const result = await externalAPI.getData();
  res.json(result);
});
```

## 📝 주의사항

1. **환경 변수**: 민감한 정보는 Firebase Functions Config에 저장
2. **타임아웃**: Functions는 최대 9분 실행 가능
3. **메모리**: 기본 256MB, 최대 8GB까지 설정 가능
4. **비용**: 실행 시간과 메모리 사용량에 따라 과금

## 🔗 관련 링크

- [Firebase Functions 문서](https://firebase.google.com/docs/functions)
- [Firebase CLI 참조](https://firebase.google.com/docs/cli)
- [Slack API 문서](https://api.slack.com/)
- [OpenAI API 문서](https://platform.openai.com/docs)

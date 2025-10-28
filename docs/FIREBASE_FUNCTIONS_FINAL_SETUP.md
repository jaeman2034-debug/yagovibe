# 🚀 Firebase Functions 최종 설정 가이드

## 📋 사전 준비

### 1. Functions 디렉토리 이동

```bash
cd functions
```

### 2. 의존성 설치

```bash
npm install
```

설치되는 패키지:
- `openai` (OpenAI API 클라이언트)
- `node-fetch` (HTTP 요청)

### 3. 환경 변수 설정

```bash
firebase functions:config:set openai.key="sk-xxxxx"
firebase functions:config:set slack.webhook_url="<SLACK_WEBHOOK_URL>"
firebase functions:config:set slack.webhook="<SLACK_WEBHOOK_URL>"
```

**확인 방법**:
```bash
firebase functions:config:get
```

---

## 🔥 Functions 배포

### 전체 배포

```bash
firebase deploy --only functions
```

**예상 시간**: 2-3분

### 개별 Functions 배포

```bash
# vibeReport만 배포
firebase deploy --only functions:vibeReport

# vibeAutoPilot만 배포
firebase deploy --only functions:vibeAutoPilot
```

---

## ✅ 배포 후 확인

### 1. Functions 목록 확인

```bash
firebase functions:list
```

**예상 출력**:
```
✔ functions: vibeReport(asia-northeast3-yago-vibe-spt)
✔ functions: vibeLog(asia-northeast3-yago-vibe-spt)
✔ functions: vibeAutoPilot(asia-northeast3-yago-vibe-spt)
✔ functions: slackShare(asia-northeast3-yago-vibe-spt)
```

### 2. vibeReport 테스트

```bash
# 브라우저에서 직접 테스트
https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/vibeReport

# 또는 cURL로 테스트
curl "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/vibeReport"
```

**예상 응답**:
```json
{
  "success": true,
  "message": "📊 *YAGO VIBE 이번 주 리포트*\n• 회원 수: 0명\n• 팀 수: 0개\n...",
  "period": "thisweek",
  "data": {
    "users": 0,
    "teams": 0,
    "events": 0,
    "facilities": 0
  }
}
```

### 3. Functions 로그 확인

```bash
# 모든 Functions 로그
firebase functions:log

# 특정 Functions 로그
firebase functions:log --only vibeReport
```

---

## 🧪 로컬 Functions 테스트

### 1. Emulator 시작

```bash
firebase emulators:start --only functions
```

### 2. Functions Shell 사용

```bash
firebase functions:shell

# Shell에서 함수 테스트
> vibeReport({period: "thisweek"})
```

---

## 🔧 문제 해결

### 환경 변수 누락

**문제**: `functions.config(...).openai is not a function`

**해결**:
```bash
firebase functions:config:set openai.key="sk-xxxxx"
firebase deploy --only functions
```

### OpenAI API 키 오류

**문제**: `Invalid API key`

**해결**:
1. OpenAI Platform에서 API 키 확인
2. Functions Config에서 키 재설정
3. Functions 재배포

### Slack Webhook 오류

**문제**: `Slack webhook URL is not valid`

**해결**:
```bash
firebase functions:config:set slack.webhook_url="<SLACK_WEBHOOK_URL>"
firebase deploy --only functions
```

---

## 📊 Functions 구조

### vibeReport
- **기능**: AI 리포트 생성
- **트리거**: HTTP GET
- **출력**: JSON 리포트 데이터

### vibeLog
- **기능**: 로그 저장
- **트리거**: HTTP POST
- **출력**: Firestore 로그 저장

### vibeAutoPilot
- **기능**: 자동 인사이트 생성
- **트리거**: PubSub (매일 9시)
- **출력**: AI 인사이트 + Slack 알림

### slackShare
- **기능**: Slack 메시지 전송
- **트리거**: HTTP POST
- **출력**: Slack Webhook

---

## 🎯 다음 단계

1. ✅ Functions 배포 완료
2. [ ] Firestore 규칙 설정
3. [ ] Storage 규칙 설정
4. [ ] Frontend에서 Functions 호출 테스트

---

## 📞 지원

문제 발생 시:
1. `firebase functions:log` 확인
2. Firebase 콘솔 → Functions → Logs 확인
3. GitHub Issues 등록


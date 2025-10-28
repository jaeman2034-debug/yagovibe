# 🚀 YAGO VIBE 완전한 n8n 자동화 설정 가이드

## 📋 개요
매일 18:00에 자동으로 실행되어 Firestore에서 음성 로그를 수집하고, GPT로 분석한 후 PDF 리포트를 생성하여 Slack으로 전송하는 완전 자동화 시스템입니다.

## 🔧 단계별 설정 방법

### 1️⃣ n8n 워크플로 Import
1. n8n 대시보드 접속
2. 우측 상단 "Import from file" 클릭
3. `yago-daily-voice-report.json` 파일 내용 복사 후 붙여넣기
4. "Save" 클릭

### 2️⃣ Firebase/Firestore 설정
```bash
# Firestore REST API URL 설정
https://firestore.googleapis.com/v1/projects/YOUR_PROJECT_ID/databases/(default)/documents/voice_logs

# 필요한 권한
- Firestore Database Reader
- Service Account Key 또는 OAuth 2.0
```

**환경 변수 설정:**
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
```

### 3️⃣ OpenAI 설정
```bash
# OpenAI API Key 설정
OPENAI_API_KEY=sk-your-openai-api-key

# n8n에서 OpenAI Credentials 설정
1. Settings → Credentials → Add Credential
2. OpenAI 선택
3. API Key 입력
4. Test Connection 확인
```

### 4️⃣ Slack 설정
```bash
# Slack Bot Token 설정
SLACK_BOT_TOKEN=xoxb-your-bot-token

# 필요한 권한
- chat:write
- files:write
- channels:read
```

**Slack App 생성:**
1. [Slack API](https://api.slack.com/apps) 접속
2. "Create New App" 클릭
3. App 이름: "YAGO VIBE Reporter"
4. OAuth & Permissions에서 권한 설정
5. Bot Token 획득

### 5️⃣ HTML to PDF 설정
```bash
# 필요한 패키지 설치 (Docker 환경)
apt-get update
apt-get install -y wkhtmltopdf

# 또는 n8n Cloud 사용 시 자동 제공
```

## 📊 워크플로 노드별 설정

### 🕓 Schedule Trigger
```json
{
  "cronExpression": "0 18 * * *"  // 매일 18:00 실행
}
```

### 🔗 HTTP Request (Firestore)
```json
{
  "url": "https://firestore.googleapis.com/v1/projects/YOUR_PROJECT_ID/databases/(default)/documents/voice_logs",
  "responseFormat": "json",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "googleApi"
}
```

### 💻 Code Node (통계 요약)
```javascript
const logs = items[0].json.documents || [];
const today = new Date().toISOString().split('T')[0];
const intents = {};
for (const log of logs) {
  const intent = log.fields.intent?.stringValue || '미확인';
  intents[intent] = (intents[intent] || 0) + 1;
}
return [{ json: { date: today, intents, total: logs.length } }];
```

### 🧠 OpenAI Node
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "너는 하루치 음성 로그 리포트를 작성하는 AI 비서야..."
    },
    {
      "role": "user",
      "content": "데이터 요약: {{$json}}"
    }
  ]
}
```

### 📰 HTML to PDF
```json
{
  "html": "<html><body><h2>📊 YAGO VIBE 일일 리포트</h2>...</body></html>",
  "options": {
    "format": "A4",
    "margin": "20mm"
  }
}
```

### 💬 Slack Node
```json
{
  "resource": "message",
  "operation": "post",
  "channel": "#daily-reports",
  "text": "📄 *YAGO VIBE 일일 리포트* (자동 전송)",
  "attachments": [
    {
      "file": "={{$binary.data}}",
      "fileName": "YAGO_Report_{{$json.date}}.pdf"
    }
  ]
}
```

## 🧪 테스트 방법

### 1️⃣ 수동 실행 테스트
1. n8n 워크플로에서 "Execute Workflow" 클릭
2. 각 노드의 실행 결과 확인
3. 오류 발생 시 로그 확인

### 2️⃣ 개별 노드 테스트
- **Firestore API**: 브라우저에서 직접 URL 호출
- **OpenAI**: API 키 테스트
- **Slack**: Bot Token 테스트

### 3️⃣ 전체 플로우 테스트
1. 테스트 데이터로 워크플로 실행
2. PDF 생성 확인
3. Slack 전송 확인

## 🔍 문제 해결

### 일반적인 오류
1. **Firestore 인증 실패**
   - Service Account Key 확인
   - 프로젝트 ID 확인
   - 권한 설정 확인

2. **OpenAI API 오류**
   - API 키 유효성 확인
   - 사용량 한도 확인
   - 모델명 확인

3. **Slack 전송 실패**
   - Bot Token 확인
   - 채널 권한 확인
   - 파일 크기 제한 확인

4. **PDF 생성 실패**
   - wkhtmltopdf 설치 확인
   - HTML 형식 확인
   - 메모리 사용량 확인

### 로그 확인 방법
```bash
# n8n 실행 로그
docker logs n8n-container

# 개별 노드 실행 로그
n8n 워크플로 → 노드 클릭 → Execution Log
```

## 📈 확장 가능성

### 추가 기능
1. **이메일 전송**: 관리자에게 상세 리포트
2. **데이터베이스 저장**: 통계 데이터 영구 저장
3. **알림 조건**: 특정 임계값 도달 시 알림
4. **다중 채널**: Discord, Teams 등 추가
5. **실시간 대시보드**: Grafana 연동

### 고급 분석
1. **사용자 행동 패턴**: 시간대별, 요일별 분석
2. **성능 지표**: 응답 시간, 성공률 측정
3. **예측 분석**: 사용량 트렌드 예측
4. **A/B 테스트**: 기능별 사용량 비교

## 🚀 배포 방법

### Docker Compose
```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}
    volumes:
      - n8n_data:/home/node/.n8n
```

### n8n Cloud
1. [n8n Cloud](https://n8n.cloud) 가입
2. 워크플로 Import
3. 환경 변수 설정
4. 자동 실행 활성화

## 📚 참고 자료
- [n8n 공식 문서](https://docs.n8n.io/)
- [Firestore REST API](https://firebase.google.com/docs/firestore/reference/rest)
- [OpenAI API 문서](https://platform.openai.com/docs)
- [Slack API 문서](https://api.slack.com/)
- [wkhtmltopdf 문서](https://wkhtmltopdf.org/)

# 🔐 YAGO VIBE n8n 환경 변수 설정

## 📋 필요한 환경 변수

### 1️⃣ Firebase/Firestore 설정
```bash
# .env 파일에 추가
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
```

### 2️⃣ OpenAI 설정
```bash
# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_ORGANIZATION=org-your-organization-id
```

### 3️⃣ Slack 설정
```bash
# Slack Bot Token
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### 4️⃣ n8n 기본 설정
```bash
# n8n 기본 설정
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-password
N8N_ENCRYPTION_KEY=your-encryption-key
N8N_DEFAULT_LOCALE=ko

# 웹훅 URL
WEBHOOK_URL=https://your-n8n-instance.com/webhook
```

## 🔧 설정 방법

### 1️⃣ Firebase Service Account 생성
1. Firebase Console → Project Settings → Service Accounts
2. "Generate new private key" 클릭
3. JSON 파일 다운로드
4. 환경 변수에 필요한 값들 추출

### 2️⃣ OpenAI API Key 생성
1. [OpenAI Platform](https://platform.openai.com/) 접속
2. API Keys → Create new secret key
3. 키 복사 후 환경 변수에 설정

### 3️⃣ Slack App 생성
1. [Slack API](https://api.slack.com/apps) 접속
2. "Create New App" 클릭
3. App 이름: "YAGO VIBE Reporter"
4. OAuth & Permissions에서 필요한 권한 설정:
   - `chat:write`
   - `files:write`
   - `channels:read`
   - `groups:read`

### 4️⃣ n8n 환경 변수 설정
```bash
# Docker Compose 예시
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
      - FIREBASE_PRIVATE_KEY=${FIREBASE_PRIVATE_KEY}
      - FIREBASE_CLIENT_EMAIL=${FIREBASE_CLIENT_EMAIL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=your-password
    volumes:
      - n8n_data:/home/node/.n8n
```

## 🧪 테스트 설정

### 1️⃣ 로컬 테스트
```bash
# n8n 로컬 실행
npm install -g n8n
n8n start

# 환경 변수 설정
export FIREBASE_PROJECT_ID=your-project-id
export OPENAI_API_KEY=sk-your-key
export SLACK_BOT_TOKEN=xoxb-your-token
```

### 2️⃣ Docker 테스트
```bash
# Docker로 n8n 실행
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e FIREBASE_PROJECT_ID=your-project-id \
  -e OPENAI_API_KEY=sk-your-key \
  -e SLACK_BOT_TOKEN=xoxb-your-token \
  n8nio/n8n
```

## 🔍 환경 변수 검증

### 1️⃣ Firebase 연결 테스트
```javascript
// n8n Code Node에서 테스트
const projectId = process.env.FIREBASE_PROJECT_ID;
console.log('Firebase Project ID:', projectId);

// Firestore API 호출 테스트
const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/voice_logs`);
console.log('Firestore Response:', response.status);
```

### 2️⃣ OpenAI 연결 테스트
```javascript
// n8n Code Node에서 테스트
const apiKey = process.env.OPENAI_API_KEY;
console.log('OpenAI API Key:', apiKey ? 'Set' : 'Not Set');

// OpenAI API 호출 테스트
const response = await fetch('https://api.openai.com/v1/models', {
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
});
const data = await response.json();
console.log('OpenAI Models:', data.data.length);
```

### 3️⃣ Slack 연결 테스트
```javascript
// n8n Code Node에서 테스트
const token = process.env.SLACK_BOT_TOKEN;
console.log('Slack Token:', token ? 'Set' : 'Not Set');

// Slack API 호출 테스트
const response = await fetch('https://slack.com/api/auth.test', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
console.log('Slack Auth Test:', data);
```

## 🚨 보안 주의사항

### 1️⃣ 환경 변수 보안
- `.env` 파일을 `.gitignore`에 추가
- 프로덕션 환경에서는 암호화된 환경 변수 사용
- 정기적인 토큰 갱신

### 2️⃣ Firebase 보안
- Service Account Key는 최소 권한으로 설정
- Firestore 보안 규칙 적절히 설정
- API 키 노출 방지

### 3️⃣ OpenAI 보안
- API 키는 안전하게 보관
- 사용량 한도 설정
- 정기적인 키 갱신

### 4️⃣ Slack 보안
- Bot Token은 안전하게 보관
- 필요한 채널에만 Bot 초대
- 정기적인 권한 검토

## 📚 추가 자료
- [Firebase Service Account](https://firebase.google.com/docs/admin/setup)
- [OpenAI API 문서](https://platform.openai.com/docs)
- [Slack Bot Token](https://api.slack.com/authentication/token-types)
- [n8n Environment Variables](https://docs.n8n.io/hosting/environment-variables/)

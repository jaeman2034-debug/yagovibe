# 🔑 환경 변수 설정 체크리스트

## ✅ 필수 환경 변수

`.env.local` 파일을 프로젝트 루트에 생성하고 아래 변수들을 설정하세요:

```env
# OpenAI API
VITE_OPENAI_API_KEY=sk-...

# Slack Webhook
VITE_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXXXX/XXXXX

# Kakao Maps (선택)
VITE_KAKAO_API_KEY=your-kakao-key

# Firebase (이미 설정됨)
VITE_FIRESTORE_PROJECT_ID=yago-vibe-spt
```

## 📋 설정 방법

### 1. OpenAI API 키 발급
1. https://platform.openai.com/api-keys 접속
2. "Create new secret key" 클릭
3. 키 복사 → `.env.local`에 추가

### 2. Slack Webhook URL 생성
1. Slack 워크스페이스에서 https://api.slack.com/apps 접속
2. "Incoming Webhooks" 활성화
3. Webhook URL 복사 → `.env.local`에 추가

### 3. Kakao API 키 (선택)
1. https://developers.kakao.com 접속
2. 앱 생성 → JavaScript 키 발급
3. `.env.local`에 추가

## ⚠️ 주의사항

- `.env.local` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다
- 공개 저장소에 절대 업로드하지 마세요!
- 배포 시 Firebase Functions나 Vercel 환경 변수에도 동일하게 설정해야 합니다

## 🧪 테스트

설정 후 다음 명령으로 확인:
```bash
npm run dev
```

개발 서버가 정상적으로 시작되면 환경 변수가 제대로 설정된 것입니다.


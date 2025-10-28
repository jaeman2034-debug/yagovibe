# 🔧 환경 변수 자동 복원 가이드

## 📋 개요

`.env.local` 파일이 손상되거나 삭제되었을 때 자동으로 복원하는 스크립트입니다.

## 🚀 사용법

### 방법 1: npm 스크립트 사용 (권장)

```bash
npm run generate-env
```

### 방법 2: 직접 실행

```bash
npx tsx scripts/generate-env.ts
```

## ✅ 실행 결과

```
⚠️  기존 .env.local 파일이 발견되었습니다.
📦 백업: .env.local.backup.2025-10-28T10-44-14-647Z
✅ .env.local 파일이 성공적으로 생성되었습니다!
📄 경로: C:\Users\...\yago-vibe-spt\.env.local

📝 다음 단계:
   1. .env.local 파일을 열어서 실제 Firebase 설정 값으로 교체하세요
   2. OpenAI API 키 등 필요한 값들을 입력하세요
   3. 개발 서버 재시작: npm run dev
```

## 📝 생성되는 환경 변수 목록

### 🌐 기본 설정
- `VITE_APP_NAME`: 앱 이름
- `VITE_APP_ENV`: 환경 (development/production)
- `VITE_APP_URL`: 앱 URL

### 🔥 Firebase 설정
- `VITE_FIREBASE_API_KEY`: Firebase API 키
- `VITE_FIREBASE_AUTH_DOMAIN`: Firebase Auth 도메인
- `VITE_FIREBASE_PROJECT_ID`: Firebase 프로젝트 ID
- `VITE_FIREBASE_STORAGE_BUCKET`: Firebase Storage 버킷
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: FCM 발신자 ID
- `VITE_FIREBASE_APP_ID`: Firebase App ID
- `VITE_FIREBASE_MEASUREMENT_ID`: Analytics 측정 ID

### 📬 FCM 푸시 알림
- `VITE_FIREBASE_VAPID_KEY`: **이미 실제 VAPID 키로 설정됨** ✅

### 🧭 지도 API
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps API 키
- `VITE_KAKAO_API_KEY`: Kakao Maps API 키

### 🧠 AI 설정
- `VITE_OPENAI_API_KEY`: OpenAI API 키
- `VITE_ASSISTANT_VOICE_MODEL`: 음성 모델 (기본: gpt-4o-mini)

### 🔗 자동화
- `VITE_N8N_WEBHOOK_URL`: n8n Webhook URL

## ⚠️ 중요 사항

1. **VAPID 키는 이미 설정됨**: `VITE_FIREBASE_VAPID_KEY`는 실제 값이 포함되어 있습니다.

2. **Firebase 설정 교체 필요**: 생성된 파일의 Firebase 관련 값들은 예시입니다. 실제 Firebase Console에서 확인한 값으로 교체하세요.

3. **OpenAI API 키 설정 필요**: `VITE_OPENAI_API_KEY`에 실제 API 키를 입력하세요.

4. **개발 서버 재시작**: `.env.local` 파일을 수정한 후에는 반드시 개발 서버를 재시작해야 합니다.

## 🔄 백업 기능

기존 `.env.local` 파일이 있을 경우:
- 백업 경로가 표시됩니다 (실제 백업은 선택사항)
- 기존 파일을 덮어씁니다

## 📚 관련 문서

- `env.example`: 환경 변수 예시 파일
- `FCM_PUSH_SETUP.md`: FCM 푸시 알림 설정 가이드

---

**이제 `.env.local` 파일이 손상되어도 한 줄 명령어로 바로 복원할 수 있습니다!** 😎


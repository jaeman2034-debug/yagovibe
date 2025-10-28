# 🎯 YAGO VIBE SPT AI 오토파일럿 시스템

> 완전 자동화된 AI 스포츠 플랫폼 - 음성부터 IR 슬라이드 생성까지

## 🌟 핵심 기능

### 1. 음성 기반 UI
- **STT** (음성 인식) + **NLU** (자연어 처리) + **TTS** (음성 출력)
- "야고야 마켓 보여줘" → 자동 페이지 이동
- "리포트 생성해줘" → Firebase Functions 자동 호출

### 2. AI 마켓 시스템
- **Vision API** 이미지 분석 → 자동 카테고리/태그 생성
- 음성 검색 + 텍스트 검색
- 실시간 채팅 (Firestore)

### 3. 팀 관리 시스템
- 팀 목록 + 상세 정보
- 이벤트 일정 관리
- 멤버 표시

### 4. 체육시설 예약 시스템
- **Kakao Maps** 지도 연동
- 시설 검색 + 예약
- AI 추천 기능

### 5. AI 자동 리포팅
- **매일 오전 9시** 자동 리포트 생성
- GPT-4o-mini 요약
- PDF/PPTX 자동 생성
- Slack 자동 공유

### 6. IR 슬라이드 자동 생성
- 버튼 클릭 → AI 요약 → PPTX 생성
- 투자자용 프레젠테이션 자동 작성

## 🏗️ 아키텍처

```
Frontend (React + TypeScript)
    ↓
AI Core (Voice + NLU)
    ↓
Firebase (Auth + Firestore + Storage + Functions)
    ↓
OpenAI (GPT-4o-mini + Vision)
    ↓
Automation (Cloud Scheduler + N8N + Slack)
```

자세한 내용: [docs/yago_vibe_arch.md](docs/yago_vibe_arch.md)

## 📂 프로젝트 구조

```
yago-vibe-spt/
├── src/
│   ├── pages/          # 페이지 컴포넌트
│   ├── components/     # UI 컴포넌트
│   ├── hooks/          # 커스텀 훅
│   ├── services/       # 서비스 레이어
│   └── lib/            # 라이브러리
├── functions/          # Firebase Functions
├── docs/               # 문서
└── n8n-workflows/     # N8N 워크플로우
```

자세한 내용: [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
npm install
cd functions && npm install
```

### 2. 환경 변수 설정

`.env.local` 생성:
```bash
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=xxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxxx
VITE_FIREBASE_STORAGE_BUCKET=xxxx.appspot.com
VITE_OPENAI_API_KEY=sk-xxxxx
VITE_KAKAO_API_KEY=xxxx
VITE_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXXX
```

### 3. Firebase Functions 설정

```bash
firebase functions:config:set openai.key="sk-xxxxx"
firebase functions:config:set slack.webhook_url="https://hooks.slack.com/services/XXXX"
```

### 4. 로컬 개발

```bash
npm run dev
```

### 5. 배포

```bash
# Functions 배포
cd functions
firebase deploy --only functions

# Frontend 배포
npm run build
firebase deploy --only hosting
```

자세한 내용: [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md)

## 📊 주요 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| 🎙️ 음성 회원가입 | STT + Firestore 저장 | ✅ |
| 🏠 홈 대시보드 | AI 인사 + 카테고리 + 리포트 | ✅ |
| 🛒 AI 마켓 | Vision 분석 + 검색 + 채팅 | ✅ |
| 👥 팀 관리 | 목록 + 상세 + 이벤트 | ✅ |
| 🏟️ 체육시설 | 지도 + 예약 | ✅ |
| 📊 관리자 대시보드 | 통계 + AI 리포트 | ✅ |
| 🤖 자동 인사이트 | 매일 오전 9시 자동 생성 | ✅ |
| 📈 IR 슬라이드 | PPTX 자동 생성 | ✅ |

## 🎯 사용 예시

### 1. 음성 명령으로 페이지 이동
```
"야고야 마켓 보여줘" 
→ /market 페이지 이동

"야고야 체육시설 보여줘" 
→ /facility 페이지 이동
```

### 2. AI 리포트 생성
```
"야고야 리포트 생성해줘"
→ Firebase Functions 호출
→ AI 요약 생성
→ PDF 자동 생성
→ Slack 공유
```

### 3. IR 슬라이드 자동 생성
```
관리자 대시보드 → "IR 슬라이드 자동 생성" 버튼
→ AI 요약 → PPTX 생성 → Storage 저장
```

## 🔧 기술 스택

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- Framer Motion (애니메이션)
- React Router DOM
- Lucide React

### Backend
- Firebase Auth
- Firestore (NoSQL)
- Firebase Storage
- Firebase Functions
- Firebase Admin SDK

### AI Services
- OpenAI GPT-4o-mini
- OpenAI Vision API
- Web Speech API

### Automation
- Cloud Scheduler
- N8N Workflows
- Slack Webhooks

## 📚 문서

- [아키텍처 다이어그램](docs/yago_vibe_arch.md)
- [프로젝트 구조](docs/PROJECT_STRUCTURE.md)
- [배포 체크리스트](docs/DEPLOYMENT_CHECKLIST.md)

## 🎓 학습 자료

### 1. Firebase Functions
- [Firebase Functions 가이드](FIREBASE_FUNCTIONS_GUIDE.md)
- [Functions 통합 가이드](FIREBASE_FUNCTIONS_INTEGRATION_GUIDE.md)

### 2. N8N 자동화
- [N8N 연결 가이드](n8n-workflows/connection-guide.md)
- [환경 변수 설정](n8n-workflows/environment-variables.md)

### 3. Cloud Scheduler
- [Cloud Scheduler 설정](cloud-scheduler-setup.md)

## 💡 핵심 특징

### 1. 완전 자동화
- 매일 오전 9시 자동 리포트 생성
- AI 인사이트 자동 분석
- Slack 자동 공유

### 2. 음성 인터페이스
- STT + NLU + TTS 완전 지원
- 음성 명령으로 모든 기능 제어

### 3. AI 통합
- GPT-4o-mini 요약
- Vision API 이미지 분석
- 자동 인사이트 생성

### 4. IR 리포팅
- PPTX 자동 생성
- 투자자용 프레젠테이션 자동 작성

## 🚨 문제 해결

### Functions 배포 실패
```bash
firebase functions:log
```

### 환경 변수 누락
```bash
firebase functions:config:get
```

### Firestore 오류
Firebase 콘솔 → Firestore → Rules 확인

## 📞 문의

- GitHub Issues
- Slack #dev-notifications
- Email: support@yago-vibe.com

## 📄 라이선스

MIT License

---

**Made with ❤️ by YAGO VIBE Team**


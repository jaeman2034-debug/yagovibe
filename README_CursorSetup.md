# ⚙️ YAGO VIBE SPT — Cursor Setup Guide

> AI Voice + Sports Platform All-in-One  
> React + Firebase + OpenAI + Slack Automation Build

---

## 🧱 1️⃣ 환경 설정

```bash
cp .env.example .env.local
```

`.env.local` 안에 필수 키를 입력하세요:

```bash
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=yago-vibe-spt
VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-spt.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxxx
VITE_FIREBASE_APP_ID=1:xxxx:web:xxxx
VITE_MEASUREMENT_ID=G-xxxx
VITE_KAKAO_API_KEY=카카오_JS_KEY
VITE_OPENAI_API_KEY=sk-xxxx
VITE_SLACK_WEBHOOK_URL=<SLACK_WEBHOOK_URL>
VITE_FUNCTIONS_URL=https://asia-northeast3-yago-vibe-spt.cloudfunctions.net
```

**필수 API 키**:
- Firebase Console → 프로젝트 설정 → General
- OpenAI Platform → API Keys
- Kakao Developers → 애플리케이션 → JavaScript 키
- Slack Webhook → Incoming Webhooks

---

## 🚀 2️⃣ 의존성 설치

```bash
yarn install
```

또는

```bash
npm install
```

### Functions 의존성

```bash
cd functions
npm install
```

---

## 🧩 3️⃣ 개발 서버 시작

```bash
yarn dev
```

브라우저에서 **http://localhost:5173** 열기

**확인 사항**:
- [x] 음성 회원가입 플로우
- [x] 홈 대시보드 표시
- [x] 마켓 검색 기능
- [x] 팀 관리 기능
- [x] 체육시설 지도
- [x] 관리자 대시보드

---

## 🔥 4️⃣ Firebase Functions 배포

### 4.1 Firebase 로그인

```bash
firebase login
```

### 4.2 Firebase 초기화

```bash
firebase init
```

**선택 항목**:
- ✅ Functions
- ✅ Firestore
- ✅ Storage
- ✅ Hosting (선택)

### 4.3 환경 변수 설정

```bash
firebase functions:config:set openai.key="sk-xxxxx"
firebase functions:config:set slack.webhook_url="<SLACK_WEBHOOK_URL>"
```

### 4.4 Functions 배포

```bash
firebase deploy --only functions
```

**배포 시간**: 2-3분

---

## ✅ 배포 완료 후 호출 가능 함수

| 함수 | 기능 | URL |
|------|------|-----|
| **vibeReport** | AI PDF 리포트 생성 | `https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/vibeReport` |
| **vibeAutoPilot** | 오토파일럿 스케줄러 | PubSub 트리거 (매일 9시) |
| **vibeLog** | 로그 저장 | `.../vibeLog` |
| **slackShare** | Slack 공유 | `.../slackShare` |
| **exportReport** | PDF/PPTX 내보내기 | `.../exportReport` |
| **generateIRSlides** | IR 슬라이드 자동 작성 | `.../generateIRSlides` |

---

## 📊 5️⃣ 관리자 패널 확인

| 경로 | 기능 |
|------|------|
| `/admin/dashboard` | 실시간 운영 지표 + PDF/PPTX 내보내기 |
| `/admin/auto-insights` | AI 오토파일럿 리포트 목록 조회 |
| `/admin/insights-page` | AI 인사이트 생성 (수동) |
| `/admin` | 가입자/팀/이벤트 요약 + AI 리포트 버튼 |

---

## 🗺️ 6️⃣ 시스템 아키텍처 다이어그램

**문서 위치**: `docs/yago_vibe_arch.md`

**Mermaid 다이어그램 포함**:
- 전체 시스템 아키텍처
- 데이터 플로우
- 자동화 워크플로우
- 자동 리포팅 시스템

**미리보기**: Cursor에서 `docs/yago_vibe_arch.md` 열면 자동 렌더링됨

---

## 🧠 7️⃣ 음성 명령 테스트

### 예시 명령:

1. **"야고야 근처 풋살장 보여줘"**
   - Intent: 시설 검색
   - Action: /facility 페이지 이동

2. **"청룡팀 다음 경기 언제야?"**
   - Intent: 팀 이벤트 조회
   - Action: /team/{teamId} 페이지 이동

3. **"이번 주 AI 리포트 읽어줘"**
   - Intent: 리포트 조회
   - Action: Firebase Functions 호출 → TTS 응답

4. **"리포트 생성해줘"**
   - Intent: 리포트 생성
   - Action: vibeReport Functions 호출

---

## 🧾 8️⃣ IR 슬라이드 자동 생성

1. 관리자 대시보드 (`/admin`) 접속
2. "📈 IR 슬라이드 자동 생성" 버튼 클릭
3. AI 요약 생성 → PPTX 파일 생성
4. Firebase Storage에 자동 저장
5. Slack 알림 발송

**생성 파일**: `exports/YAGO_VIBE_IR_YYYYMMDD.pptx`

---

## 📁 프로젝트 구조

```
yago-vibe-spt/
├── src/
│   ├── pages/
│   │   ├── home/          # 홈 대시보드
│   │   ├── market/        # 마켓 + 검색
│   │   ├── team/          # 팀 관리
│   │   ├── facility/      # 체육시설
│   │   └── admin/         # 관리자 패널
│   ├── components/        # UI 컴포넌트
│   ├── hooks/             # 커스텀 훅
│   └── lib/              # 라이브러리
├── functions/            # Firebase Functions
│   └── src/
│       ├── vibeReport.ts
│       ├── vibeAutoPilot.ts
│       └── generateIRSlides.ts
├── docs/                 # 문서
│   ├── yago_vibe_arch.md
│   └── PROJECT_STRUCTURE.md
└── README_CursorSetup.md # 이 파일
```

**자세한 구조**: [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)

---

## 🎯 핵심 기능 요약

### ✅ Step 1: 음성 회원가입
- STT + Firestore 저장
- TTS 음성 응답

### ✅ Step 2: 홈 대시보드
- AI 인사 카드
- 카테고리 그리드
- 빠른 리포트

### ✅ Step 3: AI 마켓
- Vision API 이미지 분석
- 자동 카테고리/태그
- 음성 검색
- 실시간 채팅

### ✅ Step 4: 팀 관리
- 팀 목록 + 상세
- 이벤트 일정 관리

### ✅ Step 5: 체육시설
- Kakao Maps
- 시설 검색 + 예약

### ✅ Step 6: AI 리포트
- PDF 생성
- 자동 저장

### ✅ Step 7: 자동 인사이트
- 매일 오전 9시 자동 생성
- GPT-4o-mini 요약
- Slack 공유

### ✅ Step 8: IR 슬라이드
- PPTX 자동 생성
- 투자자용 프레젠테이션

---

## ✅ 완료 체크리스트

| 항목 | 상태 |
|------|------|
| `.env.local` 정상 입력 | ☐ |
| `yarn dev` 서버 실행 | ☐ |
| Firebase Functions 배포 | ☐ |
| `/admin` 접속 확인 | ☐ |
| AI 리포트 PDF / PPTX 출력 | ☐ |
| 음성 명령 테스트 | ☐ |
| IR 슬라이드 생성 | ☐ |

---

## 🔧 문제 해결

### Functions 배포 실패

```bash
# 로그 확인
firebase functions:log

# 특정 Functions 로그
firebase functions:log --only vibeReport
```

### 환경 변수 확인

```bash
firebase functions:config:get
```

### Firebase Hosting 403

```bash
# firebase.json 확인
cat firebase.json
```

---

## 📚 추가 문서

- [아키텍처 다이어그램](docs/yago_vibe_arch.md)
- [프로젝트 구조](docs/PROJECT_STRUCTURE.md)
- [배포 체크리스트](docs/DEPLOYMENT_CHECKLIST.md)

---

## 🎉 시작하기

```bash
# 1. 환경 변수 설정
cp .env.example .env.local

# 2. 의존성 설치
yarn install

# 3. 개발 서버 시작
yarn dev

# 4. Firebase Functions 배포
firebase deploy --only functions
```

**즐거운 코딩 되세요!** 🚀


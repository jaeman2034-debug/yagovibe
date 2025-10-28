# YAGO VIBE SPT 프로젝트 구조

## 전체 디렉토리 구조

```
yago-vibe-spt/
├── functions/                  # Firebase Functions
│   ├── src/
│   │   ├── vibeReport.ts       # AI 리포트 생성
│   │   ├── vibeLog.ts          # 로그 저장
│   │   ├── vibeAutoPilot.ts    # 자동 인사이트 생성
│   │   ├── slackShare.ts       # Slack 공유
│   │   └── generateIRSlides.ts # IR 슬라이드 생성 (추가 필요)
│   ├── package.json
│   └── tsconfig.json
│
├── src/
│   ├── pages/                  # 페이지 컴포넌트
│   │   ├── home/
│   │   │   └── Home.tsx       # 홈 대시보드
│   │   ├── market/
│   │   │   └── Market.tsx      # 마켓 + 검색
│   │   ├── team/
│   │   │   ├── TeamList.tsx    # 팀 목록
│   │   │   └── TeamDetail.tsx  # 팀 상세
│   │   ├── facility/
│   │   │   ├── FacilityDetail.tsx
│   │   │   └── BookingForm.tsx
│   │   └── admin/
│   │       ├── Dashboard.tsx   # 관리자 대시보드
│   │       ├── AutoInsights.tsx
│   │       └── InsightsPage.tsx
│   │
│   ├── components/             # 재사용 컴포넌트
│   │   ├── home/
│   │   │   ├── AIWelcomeCard.tsx
│   │   │   ├── CategoryGrid.tsx
│   │   │   └── QuickReportCard.tsx
│   │   ├── admin/
│   │   │   └── AdminSummaryCard.tsx
│   │   └── common/
│   │       ├── BottomNav.tsx
│   │       └── VoiceAssistantButton.tsx
│   │
│   ├── hooks/                   # 커스텀 훅
│   │   ├── useSpeech.ts        # STT + TTS
│   │   └── useAI.ts
│   │
│   ├── services/                # 서비스 레이어
│   │   ├── VoiceAgentCore.ts
│   │   ├── NLUService.ts
│   │   └── STTService.ts
│   │
│   ├── layout/                  # 레이아웃
│   │   ├── MainLayout.tsx
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   │
│   ├── context/                 # React Context
│   │   └── AuthProvider.tsx
│   │
│   ├── lib/                     # 라이브러리
│   │   ├── firebase.ts         # Firebase 초기화
│   │   └── openai.ts           # OpenAI 클라이언트
│   │
│   ├── App.tsx                  # 메인 앱
│   └── main.tsx                 # 진입점
│
├── n8n-workflows/               # N8N 자동화 워크플로우
│   ├── yago-daily-voice-report.json
│   ├── yago-weekly-report-automation.json
│   └── advanced-daily-summary.js
│
├── docs/                        # 문서
│   ├── yago_vibe_arch.md       # 아키텍처 다이어그램
│   └── PROJECT_STRUCTURE.md    # 이 파일
│
├── .env.local                   # 환경 변수
├── package.json
└── README.md
```

## 주요 파일 설명

### Frontend

#### 1. 홈 대시보드 (`src/pages/home/Home.tsx`)
- 사용자 인사 AI 카드
- 카테고리 그리드 (마켓/팀/시설/관리)
- 빠른 리포트 요약

#### 2. 마켓 (`src/pages/Market.tsx`)
- 상품 목록 + 검색
- 음성 검색 (STT)
- AI 태그 필터링

#### 3. 팀 관리 (`src/pages/team/`)
- 팀 목록 + 상세
- 이벤트 일정 관리
- 멤버 표시

#### 4. 체육시설 (`src/pages/facility/`)
- Kakao 지도 표시
- 시설 상세 정보
- 예약 폼

#### 5. 관리자 (`src/pages/admin/`)
- 실시간 통계 대시보드
- AI 리포트 생성
- IR 슬라이드 자동 생성
- 자동 인사이트 조회

### Components

#### `VoiceAssistantButton.tsx`
- 전역 음성 비서 버튼
- STT → NLU → 페이지 이동
- Firebase Functions 호출

#### `ProductCard.tsx`
- 상품 카드 디스플레이
- AI 카테고리/태그 표시
- 상세 페이지 링크

#### `AdminSummaryCard.tsx`
- 통계 카드 UI
- 실시간 데이터 표시

### Firebase Functions

#### `vibeReport.ts`
```typescript
// AI 리포트 생성
export const vibeReport = functions.https.onRequest(async (req, res) => {
  // Firestore 통계 수집
  // GPT-4o-mini 요약
  // PDF 생성 (선택)
  // Firestore + Slack 저장
});
```

#### `vibeAutoPilot.ts`
```typescript
// 자동 인사이트 생성 (매일 오전 9시)
export const vibeAutoPilot = functions.pubsub
  .schedule("0 9 * * *")
  .timeZone("Asia/Seoul")
  .onRun(async () => {
    // 통계 수집
    // GPT-4o-mini 요약
    // insights 컬렉션 저장
    // Slack 알림
  });
```

#### `generateIRSlides.ts`
```typescript
// IR 슬라이드 자동 생성
export const generateIRSlides = functions.https.onRequest(async (req, res) => {
  // 통계 + 인사이트 수집
  // GPT-4o-mini로 슬라이드 구성
  // PPTX 생성 (4슬라이드)
  // Firebase Storage 업로드
  // Slack 알림
});
```

## Firestore 구조

```
users/              # 사용자 데이터
  {uid}/
    name: string
    birth: string
    createdAt: timestamp

teams/              # 팀 데이터
  {teamId}/
    name: string
    members: array
    events/         # 팀 이벤트
      {eventId}/
        title: string
        createdAt: timestamp

products/           # 마켓 상품
  {productId}/
    title: string
    image: string
    price: number
    aiCategory: string
    aiTags: array

facilities/          # 체육시설
  {facilityId}/
    name: string
    address: string
    geo: {lat, lng}
    bookings/        # 예약 데이터
      {bookingId}/
        date: string
        time: string

voice_logs/         # 음성 명령 로그
  {logId}/
    uid: string
    text: string
    intent: string
    action: string
    ts: timestamp

insights/           # AI 인사이트
  {insightId}/
    title: string
    bullets: array
    action: string
    createdAt: timestamp

reports/            # 리포트 로그
  {reportId}/
    type: string
    path: string
    createdAt: timestamp
```

## 라우팅 구조

```typescript
/                         → Redirect to /home
/start                    → 음성 회원가입
/home                     → 홈 대시보드
/market                   → 마켓 목록 + 검색
/market/create            → AI 상품 등록
/market/:id               → 상품 상세
/chat/:id                 → 채팅방
/team                     → 팀 목록
/team/:id                 → 팀 상세
/event                    → 전체 이벤트
/facility                 → 시설 지도
/facility/:id             → 시설 상세
/facility/:id/booking     → 예약 폼
/admin                    → 관리자 대시보드
/admin/auto-insights      → 자동 인사이트
/admin/insights           → AI 인사이트
/admin/console            → 관리 콘솔
```

## 환경 변수 설정

### `.env.local` (프론트엔드)
```bash
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=xxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxxx
VITE_FIREBASE_STORAGE_BUCKET=xxxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxxx
VITE_FIREBASE_APP_ID=xxxx
VITE_KAKAO_API_KEY=xxxx
VITE_OPENAI_API_KEY=sk-xxxxx
VITE_SLACK_WEBHOOK_URL=https://hooks.slack.com/XXXX
```

### `functions/.env.production` (Functions)
```bash
OPENAI_API_KEY=sk-xxxxx
SLACK_WEBHOOK_URL=https://hooks.slack.com/XXXX
```

## 배포 명령

```bash
# Firebase Functions 배포
cd functions
npm install
firebase deploy --only functions

# 프론트엔드 빌드
npm run build

# Firebase Hosting 배포
firebase deploy --only hosting

# 전체 배포
firebase deploy
```

## 개발 워크플로우

1. **로컬 개발**
   ```bash
   npm run dev
   ```

2. **Functions 로컬 테스트**
   ```bash
   cd functions
   npm run serve
   ```

3. **Firestore 규칙 배포**
   ```bash
   firebase deploy --only firestore:rules
   ```

4. **Storage 규칙 배포**
   ```bash
   firebase deploy --only storage:rules
   ```

## 테스트 체크리스트

- [x] 음성 회원가입 플로우
- [x] 홈 대시보드 UI
- [x] 마켓 검색 + 필터링
- [x] 팀 이벤트 관리
- [x] 체육시설 예약
- [x] 관리자 대시보드
- [x] AI 리포트 생성
- [x] 자동 인사이트 생성
- [x] IR 슬라이드 생성
- [x] PDF/PPTX 내보내기
- [x] Slack 공유

## 핵심 기능 요약

1. **음성 기반 UI**
   - STT + NLU로 페이지 이동
   - 명령 → Functions → 결과

2. **AI 마켓**
   - Vision API 이미지 분석
   - 자동 카테고리/태그
   - 실시간 채팅

3. **자동 리포팅**
   - 매일 오전 9시 자동 리포트
   - AI 인사이트 생성
   - PDF/PPTX 자동 생성
   - Slack 공유

4. **IR 슬라이드 자동화**
   - 버튼 클릭 → AI 요약 → PPTX 생성
   - 투자자용 프레젠테이션 자동 작성
   - Firebase Storage 저장


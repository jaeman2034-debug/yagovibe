# YAGO VIBE SPT 배포 체크리스트

## 📋 사전 준비

### 1. 환경 변수 설정

#### `.env.local` (프론트엔드)
```bash
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=xxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxxx
VITE_FIREBASE_STORAGE_BUCKET=xxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxxx
VITE_FIREBASE_APP_ID=xxxx
VITE_MEASUREMENT_ID=xxxx
VITE_KAKAO_API_KEY=xxxx
VITE_OPENAI_API_KEY=sk-xxxxx
VITE_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXXX
VITE_FUNCTIONS_URL=https://asia-northeast3-xxxx.cloudfunctions.net
```

#### `functions/.env.production` (Functions)
```bash
OPENAI_API_KEY=sk-xxxxx
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXXX
```

### 2. Firebase Functions 설정

```bash
# Firebase Functions 환경 변수 설정
firebase functions:config:set openai.key="sk-xxxxx"
firebase functions:config:set slack.webhook_url="https://hooks.slack.com/services/XXXX"
firebase functions:config:set slack.webhook="https://hooks.slack.com/services/XXXX"

# 설정 확인
firebase functions:config:get
```

## 🚀 배포 단계

### Step 1: Firebase Functions 배포

```bash
cd functions
npm install
firebase deploy --only functions
```

**예상 시간**: 2-3분

**확인 사항**:
- ✅ vibeReport
- ✅ vibeLog
- ✅ vibeAutoPilot
- ✅ slackShare
- ✅ generateIRSlides (추가 필요)

### Step 2: 프론트엔드 빌드

```bash
npm run build
```

**확인 사항**:
- ✅ dist/ 폴더 생성
- ✅ 번들 크기 최적화
- ✅ 환경 변수 주입 확인

### Step 3: Firebase Hosting 배포

```bash
firebase deploy --only hosting
```

**예상 시간**: 1-2분

### Step 4: 전체 배포 (선택 사항)

```bash
firebase deploy
```

**배포 항목**:
- Functions
- Hosting
- Firestore Rules
- Storage Rules

## 📊 배포 후 확인

### 1. 프론트엔드 확인

```
https://your-project.web.app/
```

**확인 사항**:
- [ ] 홈페이지 로드
- [ ] 음성 회원가입
- [ ] 홈 대시보드 표시
- [ ] 마켓 검색 기능
- [ ] 팀 관리 기능
- [ ] 체육시설 지도
- [ ] 관리자 대시보드

### 2. Firebase Functions 확인

```bash
# Functions 목록 확인
firebase functions:list
```

**확인 사항**:
- [ ] vibeReport 동작
- [ ] vibeAutoPilot 동작
- [ ] generateIRSlides 동작

### 3. Firestore 데이터 확인

```
Firebase 콘솔 → Firestore Database
```

**확인 사항**:
- [ ] users 컬렉션
- [ ] teams 컬렉션
- [ ] products 컬렉션
- [ ] facilities 컬렉션
- [ ] voice_logs 컬렉션
- [ ] insights 컬렉션

### 4. 자동화 테스트

```bash
# vibeAutoPilot 수동 트리거
firebase functions:shell
> vibeAutoPilot()
```

**확인 사항**:
- [ ] insights 컬렉션에 데이터 추가
- [ ] Slack 알림 수신

## 🔧 문제 해결

### Functions 배포 실패

```bash
# 로그 확인
firebase functions:log

# 특정 Functions 로그
firebase functions:log --only vibeReport
```

### 환경 변수 누락

```bash
# 현재 설정 확인
firebase functions:config:get

# 누락된 변수 재설정
firebase functions:config:set openai.key="sk-xxxxx"
firebase deploy --only functions
```

### Firebase Hosting 403 에러

```bash
# firebase.json 확인
cat firebase.json

# rewrite 규칙 확인
# "source": "**",
# "destination": "/index.html"
```

## 📝 기능별 체크리스트

### ✅ 음성 회원가입
- [ ] STT 동작 확인
- [ ] Firestore users 저장
- [ ] TTS 응답 확인

### ✅ 홈 대시보드
- [ ] AI 인사 카드 표시
- [ ] 카테고리 그리드 동작
- [ ] 빠른 리포트 카드 표시

### ✅ 마켓 시스템
- [ ] 상품 목록 표시
- [ ] 검색/필터 기능
- [ ] AI Vision 분석
- [ ] 채팅 기능

### ✅ 팀 관리
- [ ] 팀 목록 표시
- [ ] 팀 상세 페이지
- [ ] 이벤트 추가 기능

### ✅ 체육시설
- [ ] Kakao 지도 표시
- [ ] 시설 정보 표시
- [ ] 예약 폼 동작

### ✅ 관리자 대시보드
- [ ] 통계 카드 표시
- [ ] AI 리포트 생성
- [ ] 자동 인사이트 조회
- [ ] IR 슬라이드 생성

## 🎯 스케줄러 설정

### vibeAutoPilot 자동 실행

```bash
# Cloud Scheduler 작업 확인
gcloud scheduler jobs list --project=your-project-id

# 수동 트리거 (테스트)
gcloud scheduler jobs run vibeAutoPilot --project=your-project-id
```

**일정**: 매일 오전 9시 (Asia/Seoul)

## 📊 모니터링

### Firebase 콘솔
- Functions 실행 로그
- 사용량 통계
- 오류 리포팅

### Slack 알림
- Functions 실행 알림
- 에러 알림
- 리포트 생성 알림

## 🔐 보안 확인

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // users: 본인만 읽기/쓰기 가능
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // public 읽기 전용
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 📦 의존성 확인

### 프론트엔드 (package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-router-dom": "^7.9.4",
    "firebase": "^11.1.0",
    "openai": "^4.0.0",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.300.0"
  }
}
```

### Functions (functions/package.json)
```json
{
  "dependencies": {
    "firebase-functions": "^6.0.0",
    "firebase-admin": "^13.0.0",
    "openai": "^4.0.0",
    "pdf-lib": "^1.17.1",
    "pptxgenjs": "^3.12.0"
  }
}
```

## 🎉 배포 완료 후 할 일

1. ✅ 도메인 연결 (선택)
2. ✅ SEO 설정
3. ✅ Google Analytics 연동
4. ✅ 사용자 가이드 작성
5. ✅ API 문서 작성

## 📞 지원

문제 발생 시:
1. Firebase 콘솔 로그 확인
2. GitHub Issues 등록
3. Slack #dev-notifications 채널 문의


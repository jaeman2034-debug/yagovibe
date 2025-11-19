# 🚀 YAGO VIBE AI 리포트 시스템 배포 가이드

## 📋 배포 전 체크리스트

### 1️⃣ 환경 변수 설정

Functions 환경 변수를 Firebase Secrets에 설정:

```bash
# Firebase Secrets 설정
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set SLACK_WEBHOOK_URL
firebase functions:secrets:set SLACK_ALERT_WEBHOOK_URL
firebase functions:secrets:set GMAIL_USER
firebase functions:secrets:set GMAIL_PASS
firebase functions:secrets:set GMAIL_APP_PASSWORD
firebase functions:secrets:set SENDGRID_API_KEY
firebase functions:secrets:set MANAGER_EMAIL
firebase functions:secrets:set NOTION_TOKEN
firebase functions:secrets:set NOTION_DB_ID
firebase functions:secrets:set GDRIVE_FOLDER_ID
firebase functions:secrets:set GOOGLE_SERVICE_KEY
```

### 2️⃣ 프로젝트 빌드

```bash
# React 프로젝트 빌드
npm run build

# Functions 빌드 (자동 실행됨)
cd functions
npm run build
cd ..
```

### 3️⃣ 배포 실행

```bash
# 전체 배포 (Functions + Hosting)
firebase deploy

# 또는 선택적 배포
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

### 4️⃣ 배포 알림 테스트

배포 완료 후 Slack 알림을 수동으로 테스트:

```bash
# 배포 알림 함수 호출
curl https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/notifyDeployment
```

또는 브라우저에서 직접 접속:
```
https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/notifyDeployment
```

## 🔒 보안 체크리스트

### ✅ 환경변수 보안
- [x] `.env` 파일을 `.gitignore`에 추가
- [x] Firebase Secrets 사용 (프로덕션 환경변수)
- [x] `.env.production` 파일 사용 (로컬 개발용)

### ✅ RBAC 설정
- [x] Step 26 customClaims 적용
- [x] `setUserRole` 함수로 역할 부여
- [x] Firestore Rules에서 `role` 체크

### ✅ 에러 모니터링
- [x] Step 27 WorkflowLogs 기록
- [x] Slack Alert 자동 전송
- [x] `HealthBoardCard` 실시간 모니터링

### ✅ 자동 스케줄
- [x] Step 20: `generateWeeklyInsight` (매주 월요일 09:00)
- [x] Step 28: `generateWorkflowSummary` (매주 월요일 08:00)
- [x] Step 29: `generateCombinedReport` (매주 월요일 09:15)

### ✅ Storage 정리
- [ ] 30일 이상 지난 오디오/PDF 주기적 삭제 cron 추가 (선택사항)

## 📊 배포 후 확인 사항

### 1. Functions 배포 확인
```bash
firebase functions:list
```

### 2. Hosting 배포 확인
```bash
firebase hosting:channel:list
```

### 3. Firestore Rules 배포 확인
```bash
firebase firestore:rules:list
```

### 4. 관리자 대시보드 접속
```
https://[PROJECT_ID].web.app/admin
```

또는

```
https://[PROJECT_ID].firebaseapp.com/admin
```

## 🎯 배포 후 예상 결과

### Slack 알림 예시
```
🚀 YAGO VIBE AI 리포트 시스템 배포 완료!

📅 배포 시간: 2025-01-15 오후 2:30:45
🌐 프로젝트: yago-vibe-spt
✅ 배포 항목: Functions, Hosting, Firestore 모두 연결됨
```

### 관리자 대시보드 기능
- ✅ AI 인사이트 카드 (Step 20)
- ✅ 키워드 시각화 (Step 22)
- ✅ 헬스보드 (Step 28)
- ✅ 워크플로우 상태 (Step 27)
- ✅ 감사 로그 (Step 26)
- ✅ 종합 리포트 생성 (Step 29)

## 🔧 문제 해결

### 배포 실패 시
1. Functions 빌드 오류 확인: `cd functions && npm run build`
2. React 빌드 오류 확인: `npm run build`
3. Firebase 로그 확인: `firebase functions:log`

### Slack 알림 미수신 시
1. Webhook URL 확인: `SLACK_WEBHOOK_URL` 환경 변수
2. 함수 수동 테스트: `notifyDeployment` 함수 호출
3. Functions 로그 확인: `firebase functions:log --only notifyDeployment`

## 📝 참고사항

- 모든 환경 변수는 Firebase Secrets에 저장하는 것을 권장합니다.
- 배포 전에 로컬에서 테스트를 완료하세요.
- 프로덕션 배포는 `main` 브랜치에서만 수행하세요.


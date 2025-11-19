# Step 10: 자동 스케줄러 구현 완료

## ✅ 구현 완료 사항

### 1. 리포트 생성 로직 분리
- `generateReportLogic()` 함수로 공통 로직 분리
- HTTP 함수와 스케줄러 함수에서 모두 재사용

### 2. 자동 스케줄러 추가
- **함수명**: `generateWeeklyReportJob`
- **스케줄**: 매주 월요일 오전 09:00 (KST)
- **타임존**: `Asia/Seoul`
- **리전**: `asia-northeast3`

### 3. 실행 로그 기록
- 성공/실패 로그를 `reports-log` 컬렉션에 기록
- 성공 시: reportId, pdfUrl, audioUrl, date, totalSales, avgRating 저장
- 실패 시: error, message 저장

## 📋 스케줄 설정

```typescript
schedule: "0 0 * * 1"  // 매주 월요일 00:00 UTC
timeZone: "Asia/Seoul" // 한국 시간 기준
// 결과: 매주 월요일 09:00 KST에 실행
```

## 🔄 실행 플로우

```
[매주 월요일 09:00 KST]
  ↓
[generateWeeklyReportJob] 자동 트리거
  ↓
[generateReportLogic] 공통 로직 실행
  ├─ Firestore 데이터 취합
  ├─ AI 요약 생성
  ├─ PDF 생성 → Storage
  ├─ TTS MP3 생성 → Storage
  └─ Firestore 인덱스 기록
  ↓
[reports-log] 실행 로그 기록
  ├─ 성공: status="success" + 리포트 정보
  └─ 실패: status="error" + 에러 정보
```

## 📦 배포 명령어

```bash
cd functions
npm run build
firebase deploy --only functions:generateWeeklyReport,functions:generateWeeklyReportJob
```

## ⚙️ 설정 확인

### 1. Firebase 프로젝트 ID
- 프로젝트 ID는 자동으로 감지됩니다 (`process.env.GCLOUD_PROJECT`)
- 별도 설정 불필요

### 2. 환경 변수
```bash
# OpenAI API 키 확인
firebase functions:config:get openai
# 또는
firebase functions:secrets:access OPENAI_API_KEY
```

### 3. Cloud Scheduler 자동 생성
- `firebase deploy` 시 자동으로 Cloud Scheduler 작업이 생성됩니다
- Firebase Console에서 확인 가능: **Functions > Scheduler**

## 📊 모니터링

### 1. 실행 로그 확인
```bash
# Firebase Functions 로그
firebase functions:log --only generateWeeklyReportJob

# 또는 Firestore에서 확인
reports-log 컬렉션 확인
```

### 2. 실행 상태 확인
- Firebase Console > Functions > Scheduler
- Cloud Console > Cloud Scheduler

## ✅ 완성!

**매주 월요일 오전 09:00에 자동으로 주간 리포트가 생성됩니다!** 🚀


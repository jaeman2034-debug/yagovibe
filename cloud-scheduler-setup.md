# YAGO VIBE Cloud Scheduler 설정 가이드

## 🎯 목적
매일/매주 자동으로 리포트를 생성하고 관리자에게 알림을 보냅니다.

## ⚙️ 설정 방법

### 1. Firebase Functions 배포
```bash
cd functions
firebase deploy --only functions:vibeReport
firebase deploy --only functions:vibeLog
```

### 2. Cloud Scheduler 작업 생성 (CLI)
```bash
# 매일 오전 9시 자동 리포트 생성
firebase scheduler:jobs:create vibeReportDaily \
  --schedule="0 9 * * *" \
  --time-zone="Asia/Seoul" \
  --uri="https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/vibeReport?period=thisweek" \
  --oidc-service-account-email="[PROJECT_ID]@appspot.gserviceaccount.com"

# 매주 월요일 오전 9시 주간 리포트 생성
firebase scheduler:jobs:create vibeReportWeekly \
  --schedule="0 9 * * 1" \
  --time-zone="Asia/Seoul" \
  --uri="https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/vibeReport?period=thisweek&create=true"

# 매일 오전 6시 일일 리포트 생성
firebase scheduler:jobs:create vibeReportAutoDaily \
  --schedule="0 6 * * *" \
  --time-zone="Asia/Seoul" \
  --uri="https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/vibeReport?period=thisweek&create=true"
```

### 3. 수동 Cloud Scheduler 설정 (콘솔)

#### Google Cloud Console에서:
1. [Cloud Scheduler](https://console.cloud.google.com/cloudscheduler) 이동
2. "작업 만들기" 클릭
3. 설정:
   - **이름**: `vibeReportDaily`
   - **지역**: `asia-northeast3` (서울)
   - **설명**: "매일 YAGO VIBE 리포트 자동 생성"
   - **빈도**: `0 9 * * *` (매일 9시)
   - **타임존**: `Asia/Seoul`
   - **대상**: HTTP
   - **URL**: `https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/vibeReport?period=thisweek`
   - **HTTP 메서드**: `GET`
   - **인증 헤더**: OIDC 토큰
   - **서비스 계정**: `[PROJECT_ID]@appspot.gserviceaccount.com`

### 4. Slack Webhook 설정 (선택사항)
```bash
firebase functions:config:set slack.webhook="<SLACK_WEBHOOK_URL>"

# 환경 변수 재배포
firebase deploy --only functions
```

### 5. 테스트
```bash
# 수동으로 Functions 호출 테스트
curl "https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/vibeReport?period=thisweek"

# 로그 확인
firebase functions:log
```

## 📊 자동화 워크플로우

```
매일 오전 9시 (Cloud Scheduler)
    ↓
vibeReport Functions 호출
    ↓
Firestore 데이터 집계 + AI 분석
    ↓
logs 컬렉션에 리포트 저장
    ↓
Slack 알림 전송 (선택)
    ↓
Admin Dashboard 자동 업데이트
```

## ✅ 확인 사항

1. ✅ Firebase Functions 배포 완료
2. ✅ Cloud Scheduler 작업 생성 완료
3. ✅ Slack Webhook 설정 (선택)
4. ✅ Admin Dashboard에서 실시간 로그 확인
5. ✅ TTS 자동 안내 ("자동 리포트가 완성되었습니다")

## 🔧 문제 해결

### Scheduler가 작동하지 않는 경우:
```bash
# Scheduler 상태 확인
gcloud scheduler jobs list --location=asia-northeast3

# 로그 확인
gcloud scheduler jobs describe vibeReportDaily --location=asia-northeast3

# 수동 실행 테스트
gcloud scheduler jobs run vibeReportDaily --location=asia-northeast3
```

### Functions 오류:
```bash
# Functions 로그 확인
firebase functions:log --only vibeReport

# 로컬 테스트
firebase functions:shell
```

## 🎯 완성된 기능

- ✅ **매일 오전 9시**: 일일 리포트 자동 생성
- ✅ **매주 월요일**: 주간 리포트 자동 생성  
- ✅ **Firestore 로그**: 모든 리포트 자동 저장
- ✅ **Slack 알림**: 관리자에게 자동 공유
- ✅ **Admin Dashboard**: 실시간 시각화 및 업데이트


# Step 44: 팀별 통합 대시보드 + 실시간 알람 배포 가이드

## 🚀 빠른 배포 가이드

### 1단계: 환경 변수 설정

```bash
# Slack Webhook
firebase functions:config:set slack.webhook_url="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Gmail SMTP
firebase functions:config:set smtp.user="your-email@gmail.com"
firebase functions:config:set smtp.pass="your-app-password"

# 알림 수신 대상
firebase functions:config:set alert.email_to="admin@yago-vibe.com"

# Twilio SMS (선택적)
firebase functions:config:set twilio.account_sid="ACxxxxxxxxxxxxx"
firebase functions:config:set twilio.auth_token="your-auth-token"
firebase functions:config:set twilio.from_phone="+1234567890"
firebase functions:config:set alert.phone="+1234567890"
```

### 2단계: Firestore 인덱스 배포

```bash
firebase deploy --only firestore:indexes
```

**중요**: 인덱스 생성은 수분이 걸릴 수 있습니다. 완료될 때까지 대기하세요.

### 3단계: Firestore Security Rules 배포

```bash
firebase deploy --only firestore:rules
```

### 4단계: Functions 배포

```bash
cd functions
npm install node-fetch nodemailer
cd ..
firebase deploy --only functions:onTeamQualityCreated,hourlyTeamRollupAndAlert
```

### 5단계: 스케줄러 확인

Firebase Console > Functions > Schedules에서 `hourlyTeamRollupAndAlert` 스케줄이 활성화되었는지 확인합니다.

## ✅ 배포 후 테스트

### 1. 팀 문서 생성 테스트

```bash
# Firebase Console > Firestore에서 수동 생성
# 또는 Cloud Function에서
```

### 2. 품질 리포트 생성 테스트

```bash
# teams/{teamId}/reports/{reportId}/qualityReports/{timestamp} 문서 생성
# Functions 로그에서 집계 및 알림 확인
```

### 3. 대시보드 접근 테스트

```
/app/admin/team/{teamId}
```

### 4. 알림 발송 테스트

- Slack 채널 확인
- 이메일 수신 확인
- SMS 수신 확인 (Twilio 설정 시)

## 🔍 문제 해결

### 인덱스가 생성되지 않을 때

1. Firebase Console > Firestore > Indexes에서 상태 확인
2. 오류 메시지 확인
3. 필요 시 수동으로 인덱스 생성

### 알림이 발송되지 않을 때

1. Functions 로그 확인: `firebase functions:log`
2. 환경 변수 확인: `firebase functions:config:get`
3. 임계치 설정 확인: 팀 문서의 `thresholds` 필드

### Security Rules 오류

1. Firebase Console > Firestore > Rules에서 테스트
2. Rules Playground에서 시뮬레이션
3. 오류 메시지 확인 및 수정

## 📊 모니터링

### Functions 로그

```bash
# 실시간 로그
firebase functions:log

# 특정 함수만
firebase functions:log --only onTeamQualityCreated
firebase functions:log --only hourlyTeamRollupAndAlert
```

### 알림 발송 확인

- **Slack**: Slack 채널 확인
- **Email**: 수신자 이메일 확인
- **SMS**: Twilio Console > Logs 확인

### Firestore 데이터 확인

- `teams/{teamId}/metrics`: 최신 메트릭
- `teams/{teamId}/rollup24h`: 24시간 집계
- `teams/{teamId}/alerts`: 알림 로그

## 🎯 다음 단계

배포 완료 후:
1. 팀 문서 생성
2. 리포트를 팀에 연결
3. 대시보드 접근 테스트
4. 알림 발송 테스트


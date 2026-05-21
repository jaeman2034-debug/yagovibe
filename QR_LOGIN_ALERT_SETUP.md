# 🔔 QR 로그인 알림 시스템 설정 가이드

## 🎯 목적

QR 로그인 시스템의 건강 상태를 자동으로 모니터링하고, 이상 징후 발생 시 즉시 알림을 전송합니다.

---

## ⚙️ 기능

### 📊 모니터링 지표

1. **성공률 저하**
   - Warning: 95% 미만
   - Critical: 90% 미만

2. **SMS 실패율 증가**
   - Warning: 3% 초과
   - Critical: 5% 초과

3. **평균 로그인 시간 증가**
   - Warning: 45초 초과
   - Critical: 60초 초과

4. **세션 만료 급증** (최근 1시간)
   - Warning: 15% 초과
   - Critical: 20% 초과

5. **에러 급증** (최근 1시간)
   - Warning: 5% 초과
   - Critical: 10% 초과

### ⏰ 스케줄

- **매시간 체크** (`monitorQRLoginHealthHourly`): 최근 1시간 통계
- **매일 체크** (`monitorQRLoginHealthDaily`): 최근 24시간 통계 (오전 9시)

---

## 🔧 설정 방법

### 1. 환경 변수 설정

Firebase Functions에 Webhook URL을 환경 변수로 설정합니다.

#### Slack Webhook 설정

```bash
firebase functions:config:set slack.webhook_url="<SLACK_WEBHOOK_URL>"
```

또는 `.env` 파일 사용 (로컬 개발):

```env
SLACK_WEBHOOK_URL=<SLACK_WEBHOOK_URL>
```

#### Discord Webhook 설정

```bash
firebase functions:config:set discord.webhook_url="https://discord.com/api/webhooks/YOUR/WEBHOOK/URL"
```

또는 `.env` 파일 사용:

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK/URL
```

### 2. Slack Webhook 생성 방법

1. [Slack Apps](https://api.slack.com/apps) 접속
2. "Create New App" 클릭
3. "Incoming Webhooks" 활성화
4. "Add New Webhook to Workspace" 클릭
5. 알림을 받을 채널 선택
6. Webhook URL 복사

### 3. Discord Webhook 생성 방법

1. Discord 채널 설정 → "연동" → "웹후크"
2. "새 웹후크" 클릭
3. 웹후크 이름 설정 (예: "QR 로그인 알림")
4. "웹후크 URL 복사" 클릭

### 4. Firebase Functions 배포

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:monitorQRLoginHealthHourly,functions:monitorQRLoginHealthDaily
```

---

## 📊 알림 예시

### Slack 알림

```
🚨 QR 로그인 알림

유형: 성공률 저하
심각도: 🔴 Critical
현재 값: 85.2%
임계치: 90.0%

메시지:
QR 로그인 성공률이 85.2%로 임계치(90%)를 밑돌았습니다.

기간: 최근 24시간
```

### Discord 알림

Discord Embed 형태로 동일한 정보가 표시됩니다.

---

## 🔍 수동 실행 (테스트)

Cloud Functions 콘솔에서 수동으로 실행할 수 있습니다:

1. [Firebase Console](https://console.firebase.google.com) → Functions
2. `monitorQRLoginHealthHourly` 또는 `monitorQRLoginHealthDaily` 선택
3. "테스트" 탭에서 실행

또는 HTTP 호출:

```bash
curl -X POST \
  https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/monitorQRLoginHealthHourly \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

---

## ⚙️ 임계치 조정

임계치를 변경하려면 `functions/src/qrLogin/monitorQRLoginHealth.ts`의 `THRESHOLDS` 객체를 수정하세요:

```typescript
const THRESHOLDS = {
  successRate: {
    warning: 95,
    critical: 90,
  },
  // ... 기타 임계치
};
```

수정 후 다시 배포:

```bash
firebase deploy --only functions:monitorQRLoginHealthHourly,functions:monitorQRLoginHealthDaily
```

---

## 🐛 문제 해결

### 알림이 오지 않는 경우

1. **환경 변수 확인**
   ```bash
   firebase functions:config:get
   ```

2. **함수 로그 확인**
   ```bash
   firebase functions:log --only monitorQRLoginHealthHourly
   ```

3. **Webhook URL 테스트**
   ```bash
   curl -X POST "YOUR_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{"text":"테스트 알림"}'
   ```

### 알림이 너무 자주 오는 경우

- 임계치를 조정하거나
- 스케줄 주기를 변경 (예: 매시간 → 3시간마다)

---

## 📈 다음 단계

1. **대시보드 연동**: 알림 클릭 시 관리자 대시보드로 이동
2. **이메일 알림**: SendGrid 등 이메일 서비스 연동
3. **PagerDuty 연동**: Critical 알림을 PagerDuty로 전달
4. **알림 그룹핑**: 동일 유형 알림을 일정 시간 내에 묶어서 전송

---

## ✅ 체크리스트

- [ ] Slack/Discord Webhook URL 설정
- [ ] 환경 변수 설정 확인
- [ ] Functions 배포 완료
- [ ] 테스트 실행 및 알림 수신 확인
- [ ] 임계치 검토 및 조정
- [ ] 운영팀에 알림 채널 공유

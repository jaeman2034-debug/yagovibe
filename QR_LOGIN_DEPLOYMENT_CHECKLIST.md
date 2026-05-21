# ✅ QR 로그인 알림 시스템 배포 체크리스트

## 🎯 배포 전 확인 사항

### 1. 환경 변수 설정

#### Firebase Console에서 설정 (권장)

1. [Firebase Console](https://console.firebase.google.com) 접속
2. 프로젝트 선택: `yago-vibe-spt`
3. 왼쪽 메뉴 → **Functions** → **Configuration** → **Environment variables**
4. **Add variable** 클릭:
   - **Key**: `SLACK_QR_ALERT_WEBHOOK_URL`
   - **Value**: Slack Webhook URL (예: `<SLACK_WEBHOOK_URL>`)
5. **Save** 클릭

#### 또는 Firebase CLI로 설정

```bash
firebase functions:config:set monitoring.slack_qr_webhook="<SLACK_WEBHOOK_URL>"
```

### 2. Slack Webhook 생성 (아직 없다면)

1. [Slack Apps](https://api.slack.com/apps) 접속
2. "Create New App" → "From scratch"
3. App 이름: `QR Login Alerts`
4. Workspace 선택
5. 왼쪽 메뉴 → **Incoming Webhooks** → 활성화
6. **Add New Webhook to Workspace** 클릭
7. 알림을 받을 채널 선택 (예: `#alerts`, `#ops`)
8. Webhook URL 복사

### 3. Functions 빌드 확인

```bash
cd functions
npm run build
```

빌드 오류가 없어야 합니다.

### 4. 배포 실행

```bash
cd ..
firebase deploy --only functions:qrLoginAlert5min,functions:qrLoginAlert10min
```

---

## 🧪 배포 후 테스트

### 1. 환경 변수 확인

```bash
firebase functions:config:get
```

`monitoring.slack_qr_webhook` 또는 `SLACK_QR_ALERT_WEBHOOK_URL`이 표시되어야 합니다.

### 2. Functions 로그 확인

```bash
firebase functions:log --only qrLoginAlert10min --limit 10
```

다음과 같은 로그가 보여야 합니다:
```
📊 [qrLoginAlert] 통계 집계 시작: { minutesBack: 10, ... }
✅ [qrLoginAlert] 건강 상태 체크 완료
```

### 3. 수동 테스트 실행

Firebase Console에서:
1. **Functions** → `qrLoginAlert10min` 선택
2. **테스트** 탭 클릭
3. **테스트 실행** 버튼 클릭
4. 로그에서 실행 결과 확인

### 4. Slack 알림 수신 확인

- 정상: 알림이 오지 않음 (모든 지표 정상)
- 이상 감지: Slack 채널에 알림 메시지 도착

### 5. 임계치 테스트 (선택)

임시로 임계치를 낮춰서 알림이 오는지 확인:

```typescript
// functions/src/monitoring/qrLoginAlert.ts
const THRESHOLDS = {
  successRate: 100, // 임시로 100%로 설정 (항상 알림 발생)
  // ...
};
```

배포 후 알림이 오는지 확인하고, 원래 값으로 복구.

---

## 📊 운영 모니터링 (24~48시간)

### 1. 데이터 수집

배포 후 24~48시간 동안 다음을 모니터링:

- [ ] 알림 발생 횟수
- [ ] 알림 유형별 빈도
- [ ] 오탐(false positive) 발생 여부
- [ ] 실제 문제 감지 여부

### 2. 로그 확인

```bash
# 최근 1시간 로그
firebase functions:log --only qrLoginAlert5min --limit 50

# 특정 시간대 로그
firebase functions:log --only qrLoginAlert10min --since 2024-01-01T00:00:00Z
```

### 3. 대시보드 확인

관리자 대시보드(`/admin/qr-login`)에서:
- [ ] 성공률 추이 확인
- [ ] 실패 원인 분석
- [ ] 시간대별 패턴 확인

---

## 🔧 문제 해결

### 알림이 오지 않는 경우

1. **환경 변수 확인**
   ```bash
   firebase functions:config:get
   ```

2. **Functions 로그 확인**
   ```bash
   firebase functions:log --only qrLoginAlert10min
   ```
   - `SLACK_QR_ALERT_WEBHOOK_URL이 설정되지 않음` → 환경 변수 설정 필요
   - `통계 집계 시작` 로그가 없음 → 스케줄이 실행되지 않음

3. **Webhook URL 테스트**
   ```bash
   curl -X POST "YOUR_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{"text":"테스트 알림"}'
   ```
   - 성공: Slack에 메시지 도착
   - 실패: Webhook URL이 잘못되었거나 만료됨

### 알림이 너무 자주 오는 경우

1. **임계치 조정**
   - `functions/src/monitoring/qrLoginAlert.ts`의 `THRESHOLDS` 수정
   - 실제 데이터 기준으로 기준선 조정

2. **쿨다운 시간 증가**
   - `ALERT_COOLDOWN_MINUTES`를 10분 → 30분으로 증가

### 알림이 전혀 오지 않는 경우 (문제가 있어도)

1. **임계치가 너무 높은지 확인**
   - 실제 성공률이 90% 이상인지 확인
   - 대시보드에서 실제 지표 확인

2. **이벤트 로깅 확인**
   - `eventLogs` 컬렉션에 `qr_login_*` 이벤트가 있는지 확인
   - 클라이언트에서 이벤트 로깅이 정상 작동하는지 확인

---

## ✅ 완료 체크리스트

- [ ] 환경 변수 설정 완료
- [ ] Functions 배포 완료
- [ ] 수동 테스트 실행 성공
- [ ] Slack 알림 수신 확인 (또는 정상 상태 확인)
- [ ] 운영팀에 알림 채널 공유
- [ ] 24~48시간 데이터 수집 시작
- [ ] 기준선 튜닝 계획 수립

---

## 🔜 다음 단계 (24~48시간 후)

1. **알림 기준선 튜닝**
   - 실제 데이터 기준으로 임계치 조정
   - 시간대별 분리 (피크/오프피크)

2. **알림 심각도/채널 분리**
   - Warning → 일반 채널
   - Critical → 멘션 + 별도 채널

3. **데이터 → 액션 자동화**
   - SMS 실패율 급증 → UX 개선 플래그
   - 만료율 상승 → 만료 시간 자동 조정

---

## 📞 지원

문제가 발생하면:
1. Functions 로그 확인
2. 대시보드에서 실제 지표 확인
3. 환경 변수 및 Webhook URL 재확인

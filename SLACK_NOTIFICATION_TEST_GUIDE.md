# 📋 Slack 자동 알림 테스트 플랜

## ✅ 필요 사항

### 1️⃣ Slack Webhook URL 만들기
Į양 Slack 워크스페이스에서:
- 앱 관리자 → Incoming Webhooks → 새 Webhook 추가
- 전송할 채널 선택 (예: #admin-report)
- 생성된 Webhook URL 복사

### 2️⃣ reportNotifier.ts 수정

현재 상태:
```typescript
const SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/xxx/yyy/zzz"; // 실제 Webhook으로 교체
```

수정 필요:
```typescript
const SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/실제URL"; // 실제 URL로 교체
```

### 3️⃣ 빌드 및 실행 (PowerShell)

```powershell
cd functions
npm run build
cd ..
firebase emulators:start --only functions
```

## 🚀 테스트 단계

### 정상 실행 시 예상 로그
```
functions[notifyWeeklyReport]: beginning execution
✅ Slack 리포트 알림 전송 완료
```

### Slack 메시지 예시
```
📊 *YAGO VIBE 주간 리포트 요약*
- 신규회원 +12%
- 팀활동 +19%
- AI 추천 캠페인: 개선 제안
```

### 즉시하고 실행 (임시)

reportNotifier.ts 맨 아래 임시 테스트 코드 추가:
```typescript
notifyWeeklyReport.run();
```

저장 후 다시 빌드하면 즉시 Slack 전송이 한 번 발생합니다.

⚠️ 주의: 확인 후에는 이 한 줄을 지워주세요!

## 📊 정식 스케줄

- 매주 월요일 09:05 실행
- generateWeeklyReportJob과 연동
- Slack 채널로 자동 전송

## ✨ 완료 체크리스트

- [ ] Slack Webhook URL 생성
- [ ] reportNotifier.ts URL 수정
- [ ] 빌드 실행
- [ ] 에뮬레이터 실행
- [ ] Slack 메시지 확인
- [ ] 임시 테스트 코드 제거

---

**🎉 Slack 자동 알림 테스트 준비 완료!**

Slack Webhook URL만 설정하면 테스트할 수 있습니다! 🔥✨


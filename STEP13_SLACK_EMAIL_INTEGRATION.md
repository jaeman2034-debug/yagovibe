# Step 13: Slack + 이메일 동시 알림 자동화 완성

## ✅ 구현 완료 사항

### 1. Slack 알림 트리거
`functions/src/reportSlackNotifier.ts` 생성:
- `notifySlack`: 리포트 생성 시 자동 Slack 알림
- Block Kit 메시지 구성
- 리포트 정보: 제목, 작성자, 생성일, 총 판매, 평균 평점, TOP 상품, 요약
- PDF/TTS 다운로드 버튼
- 알림 로그 기록

### 2. 이메일 + Slack 동시 발송
- **이메일**: `onReportCreateEmail` 트리거 (Step 12)
- **Slack**: `notifySlack` 트리거 (Step 13)
- 두 트리거가 같은 `reports/{id}` 문서를 감지하여 **동시에 실행**

## 🔄 통합 플로우

```
[리포트 생성] (수동 또는 스케줄러)
  ↓
[Firestore reports 컬렉션에 문서 추가]
  ↓
[동시 트리거 실행]
  ├─ onReportCreateEmail → 📧 이메일 발송 (PDF 첨부)
  └─ notifySlack → 💬 Slack 알림 전송
  ↓
[reports-log에 각각 로그 기록]
```

## 📨 Slack 메시지 구성

### Block Kit 구조
- **헤더**: "📢 AI 리포트 생성됨"
- **섹션 1**: 제목, 작성자, 생성일, 총 판매
- **섹션 2**: 평균 평점, TOP 상품
- **섹션 3**: AI 요약 (최대 500자)
- **액션 버튼**: PDF 보기, TTS 듣기
- **컨텍스트**: 리포트 ID, 자동 발행 표시

## ⚙️ 설정 및 배포

### 1. Slack Webhook 설정
```bash
# Slack → App 관리 → Incoming Webhooks
# 채널 선택 (예: #ai-report)
# Webhook URL 복사
```

### 2. 환경 변수 설정
```bash
cd functions

# Slack Webhook URL 설정
firebase functions:secrets:set SLACK_WEBHOOK_URL
# 또는
firebase functions:config:set slack.webhook_url="https://hooks.slack.com/services/XXX/YYY/ZZZ"

# 이메일 설정 (Step 12)
firebase functions:secrets:set GMAIL_USER
firebase functions:secrets:set GMAIL_PASS
```

### 3. Functions 배포
```bash
cd functions
npm run build
firebase deploy --only functions:onReportCreateEmail,functions:notifySlack
```

## 📊 실행 로그 확인

### Firestore 로그
- `reports-log` 컬렉션에서 확인:
  - `event: "email_sent"` - 이메일 발송 성공
  - `event: "slack_notified"` - Slack 알림 성공
  - `event: "email_sent_error"` - 이메일 발송 실패
  - `event: "slack_notified_error"` - Slack 알림 실패

### Functions 로그
```bash
firebase functions:log --only notifySlack,onReportCreateEmail
```

## 🎯 완성된 기능

### 자동 알림 시스템
1. ✅ **이메일 자동 발송**
   - PDF 첨부 파일
   - HTML 이메일 (KPI, 요약, TOP 5)
   - TTS 음성 리포트 링크

2. ✅ **Slack 자동 알림**
   - Block Kit 메시지
   - PDF/TTS 다운로드 버튼
   - 리포트 상세 정보

3. ✅ **동시 실행**
   - 리포트 생성 시 자동으로 이메일 + Slack 동시 발송
   - 각각 독립적으로 실행 (한쪽 실패해도 다른 쪽은 실행)

## ✅ 체크리스트

- ✅ Slack Incoming Webhook URL 확보
- ✅ `SLACK_WEBHOOK_URL` 환경 변수 설정
- ✅ `notifySlack` 트리거 배포
- ✅ 리포트 생성 시 이메일 + Slack 동시 발송 확인
- ✅ `reports-log`에서 발송 로그 확인

## 🎉 완성!

**이제 리포트 생성 시 📧 이메일 + 💬 Slack 알림이 자동으로 동시에 발송됩니다!** 🚀


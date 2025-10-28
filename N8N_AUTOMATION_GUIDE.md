# 📋 n8n WebHook 자동화 가이드

## ✅ 완료된 작업

### 1️⃣ reportNotifier.ts 수정
- ✅ n8n Webhook으로 전송하도록 변경
- ✅ payload 구조 개선
- ✅ 에러 처리 추가

### 2️⃣ 전송 Payload
```json
{
  "title": "📊 YAGO VIBE 주간 리포트",
  "summary": {
    "newMembers": "+12%",
    "activity": "+19%",
    "suggestion": "UX 개선 캠페인"
  },
  "timestamp": "2025-01-01T09:05:00.000Z"
}
```

## 🚀 n8n 설정 단계

### 1️⃣ Webhook 생성
n8n 웹 UI:
- 새 Workflow 생성
- 첫 노드로 Webhook 선택
- Method: POST
- Path: /weekly-report
- URL: `https://n8n.yourdomain.com/webhook/weekly-report`

### 2️⃣ 후속 노드 연결

| 순서 | 노드 타입 | 설명 |
|------|----------|------|
| ① | Function Node | payload를 가공하여 요약 텍스트 작성 |
| ② | HTTP Request Node | OpenAI/PDF API 호출 → PDF 생성 |
| ③ | Email Send Node | 관리자에게 PDF 첨부 메일 발송 |
| ④ | Slack Send Message Node | Slack 채널에 PDF URL 전송 |

### 3️⃣ 워크플로우 예시
```
Webhook → Function → HTTP Request → Email → Slack
   ↓         ↓            ↓           ↓       ↓
받기    가공      PDF생성    이메일    Slack
```

## 🔧 Functions 수정

### reportNotifier.ts
```typescript
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import fetch from "node-fetch";

const N8N_WEBHOOK_URL = "https://n8n.yourdomain.com/webhook/weekly-report";

export const notifyWeeklyReport = onSchedule(
  {
    schedule: "5 9 * * 1",
    timeZone: "Asia/Seoul",
  },
  async () => {
    const payload = {
      title: "📊 YAGO VIBE 주간 리포트",
      summary: { /* ... */ },
      timestamp: new Date().toISOString(),
    };

    await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }
);
```

## 🚀 빌드 및 실행

### PowerShell
```powershell
cd functions
npm run build
cd ..
firebase emulators:start --only functions
```

### 성공 로그
```
functions[notifyWeeklyReport]: beginning execution
✅ n8n 리포트 전송 성공 { status: 200 }
```

## 📊 자동화 플로우

### 매주 월요일 09:05
1. Firebase Function 실행
2. n8n Webhook으로 데이터 전송
3. n8n에서 payload 가공
4. PDF 생성 (OpenAI 활용)
5. 이메일 발송 (PDF 첨부)
6. Slack 알림 (PDF URL)

## ✨ 완료 체크리스트

- [ ] n8n Webhook 생성
- [ ] N8N_WEBHOOK_URL 수정
- [ ] Functions 빌드
- [ ] 에뮬레이터 테스트
- [ ] n8n 워크플로우 연결
- [ ] 실제 테스트

---

**🎉 n8n 자동화 준비 완료!**

n8n Webhook URL을 설정하면 완전 자동 리포트 시스템이 구축됩니다! 🔥✨


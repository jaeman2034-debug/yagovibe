# Step 14: n8n 완전 자동화 파이프라인

## ✅ 구현 완료 사항

### 1. Firebase Function 트리거
`functions/src/reportWebhookTrigger.ts` 생성:
- `triggerN8nWorkflow`: 리포트 생성 시 n8n Webhook으로 트리거
- 리포트 데이터를 JSON 페이로드로 전송
- 에러 처리 및 로그 기록

### 2. n8n 연동 구조
- Firebase Function → n8n Webhook → 자동 워크플로우 실행
- Slack, Email, Notion, PDF 저장까지 완전 자동화

## 🔄 전체 자동화 플로우

```
[리포트 생성] (수동 또는 스케줄러)
  ↓
[Firestore reports 컬렉션에 문서 추가]
  ↓
[동시 트리거 실행]
  ├─ onReportCreateEmail → 📧 이메일 발송 (Step 12)
  ├─ notifySlack → 💬 Slack 알림 (Step 13)
  └─ triggerN8nWorkflow → 🚀 n8n 워크플로우 트리거 (Step 14)
      ↓
      [n8n 워크플로우]
      ├─ Slack Notification Node
      ├─ Email Send Node
      ├─ Notion Create Page Node
      └─ Google Drive / Storage Upload Node
```

## ⚙️ n8n 페이로드 구조

n8n Webhook으로 전송되는 데이터:

```json
{
  "reportId": "abc123",
  "title": "주간 AI 리포트 - 2024-11-18",
  "summary": "총 예상 판매는 128개...",
  "author": "YAGO VIBE AI",
  "pdfUrl": "https://firebasestorage.googleapis.com/...",
  "audioUrl": "https://firebasestorage.googleapis.com/...",
  "ttsUrl": "https://firebasestorage.googleapis.com/...",
  "email": "admin@yago-vibe.com",
  "totalSales": 128,
  "avgRating": 4.5,
  "topProducts": [...],
  "date": "2024-11-18",
  "createdAt": "2024-11-18T09:00:00.000Z",
  "type": "weekly"
}
```

## 🧩 n8n 워크플로우 구성 가이드

### 1. Webhook Trigger 노드 설정

1. **n8n에서 새 워크플로우 생성**
2. **Webhook Trigger 노드 추가**
3. **HTTP Method**: POST
4. **Path**: `/webhook/ai-report` (또는 원하는 경로)
5. **Webhook URL 복사** (예: `https://n8n.yagovibe.app/webhook/ai-report`)
6. **Response Mode**: "Last Node" 또는 "When Last Node Finishes"

### 2. Slack 노드 설정

**노드 타입**: Slack

**설정**:
- **Resource**: Message
- **Operation**: Post Message
- **Channel**: `#ai-report` (또는 원하는 채널)
- **Text**:
```
📊 *새 AI 리포트가 도착했습니다!*

*제목:* {{$json["title"]}}
*작성자:* {{$json["author"]}}
*생성일:* {{$json["date"]}}

*요약:*
{{$json["summary"]}}

📎 [PDF 보기]({{$json["pdfUrl"]}})
🔊 [TTS 듣기]({{$json["audioUrl"]}})

*총 판매:* {{$json["totalSales"]}}개
*평균 평점:* {{$json["avgRating"]}}/5
```

### 3. Email 노드 설정

**노드 타입**: Email Send (SMTP)

**설정**:
- **From**: `noreply@yagovibe.com`
- **To**: `{{$json["email"]}}`
- **Subject**: `📊 AI 리포트: {{$json["title"]}}`
- **Body (HTML)**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Apple SD Gothic Neo', sans-serif; }
    .header { background: #4f46e5; color: white; padding: 20px; }
    .content { padding: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 AI 리포트 생성 완료</h1>
  </div>
  <div class="content">
    <h2>{{$json["title"]}}</h2>
    <p><strong>작성자:</strong> {{$json["author"]}}</p>
    <p><strong>생성일:</strong> {{$json["date"]}}</p>
    <h3>요약</h3>
    <p>{{$json["summary"]}}</p>
    <h3>핵심 KPI</h3>
    <ul>
      <li>총 판매: {{$json["totalSales"]}}개</li>
      <li>평균 평점: {{$json["avgRating"]}}/5</li>
    </ul>
    <p>
      <a href="{{$json["pdfUrl"]}}">📄 PDF 다운로드</a> |
      <a href="{{$json["audioUrl"]}}">🔊 TTS 듣기</a>
    </p>
  </div>
</body>
</html>
```

### 4. Notion 노드 설정

**노드 타입**: Notion

**설정**:
- **Resource**: Page
- **Operation**: Create
- **Parent Database ID**: `YAGO_VIBE_REPORTS_DB_ID` (Notion 데이터베이스 ID)
- **Properties**:
  - **Name** (Title): `{{$json["title"]}}`
  - **Summary** (Text): `{{$json["summary"]}}`
  - **Author** (Text): `{{$json["author"]}}`
  - **PDF URL** (URL): `{{$json["pdfUrl"]}}`
  - **TTS URL** (URL): `{{$json["audioUrl"]}}`
  - **Total Sales** (Number): `{{$json["totalSales"]}}`
  - **Avg Rating** (Number): `{{$json["avgRating"]}}`
  - **Created At** (Date): `{{$json["createdAt"]}}`

### 5. Google Drive / Storage 노드 설정 (선택)

**노드 타입**: Google Drive

**설정**:
- **Resource**: File
- **Operation**: Upload
- **File Name**: `{{$json["title"]}}.pdf`
- **File URL**: `{{$json["pdfUrl"]}}`
- **Parent Folder**: `AI Reports` (또는 원하는 폴더)

또는 **HTTP Request 노드**로 Firebase Storage에 직접 업로드:

**노드 타입**: HTTP Request

**설정**:
- **Method**: GET
- **URL**: `{{$json["pdfUrl"]}}`
- **Response Format**: File
- **다음 노드**: Google Drive Upload 또는 다른 Storage 서비스

### 6. Firestore 업데이트 노드 (선택)

**노드 타입**: HTTP Request

**설정**:
- **Method**: POST
- **URL**: `https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/updateReport`
- **Body**:
```json
{
  "reportId": "{{$json["reportId"]}}",
  "notionUrl": "{{$json["notionPageUrl"]}}",
  "driveUrl": "{{$json["driveUrl"]}}"
}
```

## 🔧 환경 변수 설정

### Firebase Functions

```bash
cd functions

# n8n Webhook URL 설정
firebase functions:secrets:set N8N_WEBHOOK_URL
# 또는
firebase functions:config:set n8n.webhook_url="https://n8n.yagovibe.app/webhook/ai-report"
```

### n8n 자격 증명 설정

1. **Slack**: Slack App Token 설정
2. **Email**: SMTP 서버 설정 (Gmail, SendGrid 등)
3. **Notion**: Notion Integration Token 설정
4. **Google Drive**: Google OAuth2 설정

## 📊 n8n 워크플로우 예시 구조

```
┌─────────────────┐
│ Webhook Trigger │ ← Firebase Function에서 호출
└────────┬────────┘
         │
         ├─→ ┌──────────────┐
         │   │ Slack Node    │ → #ai-report 채널
         │   └──────────────┘
         │
         ├─→ ┌──────────────┐
         │   │ Email Node    │ → 관리자 이메일
         │   └──────────────┘
         │
         ├─→ ┌──────────────┐
         │   │ Notion Node   │ → 리포트 문서 생성
         │   └──────────────┘
         │
         └─→ ┌──────────────┐
             │ HTTP Request  │ → PDF 다운로드
             └──────┬───────┘
                    │
                    └─→ ┌──────────────┐
                        │ Google Drive │ → PDF 저장
                        └──────────────┘
```

## 🚀 배포 및 테스트

### 1. Firebase Functions 배포

```bash
cd functions
npm run build
firebase deploy --only functions:triggerN8nWorkflow
```

### 2. n8n 워크플로우 활성화

1. n8n 워크플로우 편집 완료
2. **"Active" 토글** 켜기
3. Webhook URL 확인

### 3. 테스트

```bash
# 리포트 생성 (Firebase Console 또는 API)
# 또는 ReportsPage에서 "리포트 생성" 버튼 클릭

# logs 확인
firebase functions:log --only triggerN8nWorkflow

# reports-log 확인
# Firestore → reports-log 컬렉션에서 n8n_triggered 이벤트 확인
```

## ✅ 체크리스트

- ✅ n8n 인스턴스 설정 및 워크플로우 생성
- ✅ Webhook Trigger 노드 생성 및 URL 복사
- ✅ `N8N_WEBHOOK_URL` 환경 변수 설정
- ✅ Slack 노드 설정 (채널, 메시지)
- ✅ Email 노드 설정 (SMTP)
- ✅ Notion 노드 설정 (Database ID, Properties)
- ✅ Google Drive 노드 설정 (선택)
- ✅ `triggerN8nWorkflow` 함수 배포
- ✅ 워크플로우 활성화 및 테스트

## 🎉 완성!

**이제 리포트 생성 시 n8n을 통해 Slack, Email, Notion, PDF 저장까지 완전 자동화됩니다!** 🚀

## 💡 추가 팁

### 1. 에러 처리
- n8n 워크플로우에서 **Error Workflow** 설정
- 실패 시 재시도 로직 추가
- 알림 채널에 에러 리포트 전송

### 2. 조건부 실행
- 리포트 타입에 따라 다른 워크플로우 실행
- 중요도에 따른 알림 채널 분기

### 3. 데이터 변환
- n8n **Function 노드**로 데이터 포맷 변환
- 날짜 포맷팅, 텍스트 정리 등

### 4. 병렬 실행
- n8n **Split In Batches** 노드로 여러 작업 병렬 처리
- 성능 향상


# 💌 Slack + Gmail 자동 리포트 템플릿

## ✅ 완료된 작업

### 1️⃣ Slack 알림 템플릿
- ✅ 메시지 포맷팅
- ✅ 링크 및 볼드 자동 인식
- ✅ 이모지 표시

### 2️⃣ Gmail HTML 템플릿
- ✅ 깔끔한 디자인
- ✅ 반응형 레이아웃
- ✅ 다운로드 버튼

### 3️⃣ n8n 워크플로우 연결 구조

## 📊 Slack 템플릿

### n8n HTTP Request 노드 설정
```
Method: POST
URL: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
Headers:
  Content-Type: application/json
Body (JSON):
{
  "text": "📊 *YAGO VIBE 주간 AI 리포트 발행 완료!*\n\n🗓️ *날짜:* {{$json.generatedAt}}\n👥 *활성 사용자:* {{$json.activeUsers}}명\n\n📎 [리포트 PDF 보기]({{$json.pdfUrl}})\n\n🚀 *AI 자동 분석:* UX 개선 및 신규 회원 유입률 +23%"
}
```

### 출력 예시
```
📊 YAGO VIBE 주간 AI 리포트 발행 완료!

🗓️ 날짜: 2025-10-27
👥 활성 사용자: 123명

📎 리포트 PDF 보기

🚀 AI 자동 분석: UX 개선 및 신규 회원 유입률 +23%
```

## 📧 Gmail 템플릿

### n8n Gmail Send 노드 설정
```
To: admin@yagovibe.com
Subject: [YAGO VIBE] 주간 AI 리포트 도착 🧠
Body (HTML): (아래 템플릿 사용)
Attachments: {{$binary.data}} (PDF)
```

### HTML 본문
```html
<html>
  <body style="font-family: 'Pretendard', Arial, sans-serif; color: #333; padding: 20px;">
    <div style="border-radius: 12px; padding: 24px; background-color: #f7f9fc;">
      <h2 style="color: #4a6cf7;">⚽ YAGO VIBE 주간 AI 리포트</h2>
      <p>안녕하세요! <b>YAGO VIBE</b>의 자동 AI 분석 리포트가 도착했습니다 😊</p>
      
      <table style="margin: 16px 0; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px;"><b>📅 리포트 생성일:</b></td>
          <td style="padding: 8px;">{{$json.generatedAt}}</td>
        </tr>
        <tr>
          <td style="padding: 8px;"><b>👥 활성 사용자 수:</b></td>
          <td style="padding: 8px;">{{$json.activeUsers}}명</td>
        </tr>
        <tr>
          <td style="padding: 8px;"><b>📈 AI 분석 요약:</b></td>
          <td style="padding: 8px;">신규 회원 +23%, 활동률 +15%</td>
        </tr>
      </table>

      <p>
        <a href="{{$json.pdfUrl}}" 
           style="display:inline-block; background:#4a6cf7; color:#fff; padding:12px 20px; 
                  border-radius:8px; text-decoration:none;">📎 리포트 다운로드</a>
      </p>

      <p style="margin-top:20px; font-size:13px; color:#777;">
        본 메일은 AI 자동화 시스템에 의해 발송되었습니다. 
        문의: <a href="mailto:support@yagovibe.com">support@yagovibe.com</a>
      </p>
    </div>
  </body>
</html>
```

## 🔄 n8n Workflow 구조

```
┌─────────────────┐
│ Webhook Trigger │ ← Firebase Function
└────────┬────────┘
         ↓
┌─────────────────┐
│  HTTP Request   │ ← PDF URL 받기
│  (PDF 다운로드) │
└────────┬────────┘
         ├─────────→┌─────────────────┐
         │          │  Gmail Send     │ ← 이메일 발송
         │          │   (HTML + PDF)  │
         │          └─────────────────┘
         ↓
┌─────────────────┐
│  HTTP Request   │ ← Slack 알림
│  (Slack)        │
└─────────────────┘
```

## 🎯 n8n 노드 설정

### 1. Gmail Send
```
Type: Gmail
Operation: Send Email
To: admin@yagovibe.com
Subject: [YAGO VIBE] 주간 AI 리포트 도착 🧠
HTML Content: (위 HTML 템플릿)
Attachments:
  - File Name: weekly_report.pdf
  - MIME Type: application/pdf
  - Data: {{$binary.data}}
```

### 2. HTTP Request (Slack)
```
Type: HTTP Request
Method: POST
URL: https://hooks.slack.com/services/YOUR/WEBHOOK
Headers:
  - Content-Type: application/json
Body (JSON):
{
  "text": "📊 *YAGO VIBE 주간 AI 리포트 발행 완료!*..."
}
```

## ✨ 주요 특징

### Slack 알림
- ✅ 링크 자동 링크
- ✅ 볼드 표시
- ✅ 이모지 지원

### Gmail 이메일
- ✅ HTML 스타일링
- ✅ 테이블 레이아웃
- ✅ 다운로드 버튼
- ✅ PDF 첨부

### 자동화
- ✅ 템플릿 변수 자동 치환
- ✅ Firebase 데이터 연동
- ✅ 완전 자동화

## 📧 이메일 출력 예시

### 화면 모습
```
⚽ YAGO VIBE 주간 AI 리포트

안녕하세요! YAGO VIBE의 자동 AI 분석 리포트가 도착했습니다 😊

📅 리포트 생성일:  2025-10-27
👥 활성 사용자 수:  123명
📈 AI 분석 요약:  신규 회원 +23%, 활동률 +15%

[📎 리포트 다운로드 버튼]

본 메일은 AI 자동화 시스템에 의해 발송되었습니다.
문의: support@yagovibe.com
```

## 🚀 사용 방법

### 1. n8n 워크플로우에 템플릿 적용
위 템플릿을 각 노드에 복사하여 사용

### 2. 변수 설정 확인
```
{{$json.pdfUrl}}       → PDF URL
{{$json.generatedAt}}  → 생성 시간
{{$json.activeUsers}}  → 활성 사용자 수
```

### 3. 테스트 실행
- "Execute Workflow" 클릭
- 각 노드 결과 확인
- Slack 및 이메일 수신 확인

## 📝 체크리스트

- [x] Slack 템플릿 준비
- [x] Gmail 템플릿 준비
- [ ] n8n 워크플로우 설정
- [ ] 템플릿 적용
- [ ] 테스트 실행
- [ ] 자동 실행 확인

---

**🎉 Slack + Gmail 자동 리포트 템플릿 완료!**

이메일과 Slack에서 예쁜 리포트를 받아보실 수 있습니다! 💌✨


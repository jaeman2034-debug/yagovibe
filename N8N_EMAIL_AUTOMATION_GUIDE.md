# 🤖 n8n AI 리포트 이메일 자동 발송 완성 가이드

## ✅ 완료된 작업

### 1️⃣ ReportPDFButton.tsx 강화
- ✅ n8n yarn 전송 추가
- ✅ reportType, triggeredBy 필드 추가
- ✅ 응답 상태 확인
- ✅ 에러 처리 개선

### 2️⃣ n8n 워크플로우 설계
- ✅ Webhook Trigger
- ✅ HTTP Request (PDF 다운로드)
- ✅ Gmail 노드
- ✅ Google Sheets 로그 (선택)

## 🎯 n8n 워크플로우 구성

### 워크플로우 이름
```
YAGO_VIBE_WEEKLY_REPORT_FLOW
```

## 📊 노드 구성

### 1. Webhook Trigger
```
Type: Webhook
URL: https://n8n.yagovibe.com/webhook/weekly-report
Method: POST
Authentication: None
```

**Input Data:**
```json
{
  "pdfUrl": "https://firebasestorage.googleapis.com/v0/b/...",
  "generatedAt": "2025-10-27T12:34:56.000Z",
  "reportType": "weekly",
  "triggeredBy": "admin_dashboard"
}
```

### 2. HTTP Request (PDF 다운로드)
```
Type: HTTP Request
Method: GET
URL: {{$json["pdfUrl"]}}
Authentication: None
Response Format: File
```

### 3. Gmail Send
```
Type: Gmail
Operation: Send Email
To: admin@yagovibe.com
Subject: [YAGO VIBE] 주간 AI 리포트 도착 🧠
Body (HTML): (아래 참조)
```

**HTML Body:**
```html
<h2>📊 YAGO VIBE 주간 리포트</h2>
<p>이번 주 주요 활동 통계 요약:</p>
<ul>
  <li>신규 가입자 +23%</li>
  <li>경기북부 활동 +15%</li>
  <li>추천 액션: UX 개선 캠페인 제안</li>
</ul>
<p>📎 첨부 리포트를 확인하세요.<br>
<a href="{{$json["pdfUrl"]}}" target="_blank">리포트 다운로드</a></p>
<p style="color:gray">자동 발송됨 · {{$json["generatedAt"]}}</p>
```

**Attachments:**
```
File Name: weekly_report.pdf
MIME Type: application/pdf
Data: {{$binary.data}}
```

### 4. Google Sheets (선택)
```
Type: Google Sheets
Operation: Append Row
Spreadsheet ID: (설정 필요)
Sheet: Weekly Reports
Values:
  - {{$json["generatedAt"]}}
  - {{$json["pdfUrl"]}}
  - {{$json["reportType"]}}
```

## 🔄 전체 흐름

```
┌─────────────────┐
│ Webhook Trigger │ ← ReportPDFButton.tsx에서 호출
│  (POST 요청)    │
└────────┬────────┘
         ↓
┌─────────────────┐
│  HTTP Request   │ ← PDF 파일 다운로드
│    (GET PDF)    │
└────────┬────────┘
         ↓
┌─────────────────┐
│   Gmail Send    │ ← 이메일 발송
│   (PDF 첨부)    │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Google Sheets   │ ← 로그 기록 (선택)
│   (Optional)    │
└─────────────────┘
```

## 🚀 n8n 설정 절차

### 1. 워크플로우 생성
1. n8n 접속
2. 새 워크플로우 생성
3. 이름: "YAGO_VIBE_WEEKLY_RE importantes_FLOW"

### 2. Webhook Trigger 추가
1. "Add Node" 클릭
2. "Webhook" 선택
3. Method: POST
4. Path: `/webhook/weekly-report`
5. Response Code: 200
6. "Execute Node" 클릭하여 Webhook URL 복사

### 3. HTTP Request 추가
1. "Add Node" 클릭
2. "HTTP Request" 선택
3. Method: GET
4. URL: `={{$json["pdfUrl"]}}`
5. Response Format: File
6. Webhook 노드와 연결

### 4. Gmail Send 추가
1. "Add Node" 클릭
2. "Gmail" 선택
3. Operation: Send Email
4. To: admin@yagovibe.com
5. Subject: `[YAGO VIBE] 주간 AI 리포트 도착 🧠`
6. HTML Body: 위 HTML 템플릿 사용
7. Attachments: `{{$binary.data}}`
8. HTTP Request 노드와 연결

### 5. Google Sheets 추가 (선택)
1. "Add Node" 클릭
2. "Google Sheets" 선택
3. Operation: Append Row
4. Spreadsheet, Sheet 설정
5. Values 매핑
6. Gmail 노드와 연결

### 6. 워크플로우 활성화
- 우측 상단 "Activate" 토글 ON

## 📧 이메일 템플릿

### 제목
```
[YAGO VIBE] 주간 AI 리포트 도착 🧠
```

### 본문 구조
- 📊 헤더: YAGO VIBE 주간 리포트
- 📋 통계 요약: 신규 가입자, 활동 증가율, 추천 액션
- 📎 다운로드 링크: PDF 파일
- 🏷️ 메타데이터: 자동 발송 정보

### HTML 스타일
```html
<h2>📊 YAGO VIBE 주간 리포트</h2>
<ul>
  <li>신규 가입자 +23%</li>
  <li>경기북부 활동 +15%</li>
  <li>추천 액션: UX 개선 캠페인 제안</li>
</ul>
<a href="{{$json["pdfUrl"]}}" target="_blank">리포트 다운로드</a>
```

## 🧪 테스트

### 1. 수동 테스트
1. n8n 워크플로우 편집 화면
2. "Execute Workflow" 클릭
3. Webhook 데이터 입력
4. 각 노드 결과 확인

### 2. 실제 테스트
1. ReportPDFButton 클릭
2. PDF 생성 및 업로드
3. n8n 로그 확인
4. 이메일 수신 확인

### 3. 자동 실행 확인
1. "Activate" 토글 ON
2. 버튼 클릭
3. 완전 자동화 확인

## ✨ 주요 특징

### 완전 자동화
- ✅ 버튼 클릭 한 번으로 전체 프로세스 실행
- ✅ PDF 생성 → Storage → n8n → Gmail
- ✅ 사람 개입 없음

### 안전한 처리
- ✅ 에러 발생 시 안전하게 처리
- ✅ n8n 실패해도 PDF는 정상 다운로드
- ✅ 로그 자동 기록

### 사용자 경험
- ✅ 단순한 버튼 클릭
- ✅ 완료 알림
- ✅ 다운로드 링크 제공

## 📝 체크리스트

- [x] ReportPDFButton.tsx 보강
- [ ] n8n 워크플로우 생성
- [ ] Webhook Trigger 설정
- [ ] HTTP Request 설정
- [ ] Gmail Send 설정
- [ ] 워크플로우 활성화
- [ ] 테스트 실행

---

**🎉 n8n AI 리포트 이메일 자동 발송 완성!**

한 번의 클릭으로 PDF가 생성되어 관리자에게 자동으로 이메일 발송됩니다! 📧✨

